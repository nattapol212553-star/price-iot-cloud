#include "CloudESP32.h"
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <cmath>

CloudESP32 Cloud;
CloudESP32* CloudESP32::instance = nullptr;

CloudESP32::CloudESP32() : _lastHeartbeatTime(0), _streamConnected(false), _wifiConnected(false), _ecoMode(false), _pendingPong(false) {
    instance = this;
}

CloudESP32::~CloudESP32() {}

void CloudESP32::begin(const char* ssid, const char* password, 
                       const char* apiKey, const char* dbUrl, 
                       const char* deviceId, const char* deviceToken) {
    Serial.println("\n[CloudESP32] Starting...");

    _deviceId = String(deviceId);
    _deviceToken = String(deviceToken);
    _basePath = "/projects/" + _deviceId;

    connectWiFi(ssid, password);

    // Authentication Strategy: Email/Password
    // Email is formatted as device{deviceId}@device.local to prevent invalid email errors (if ID starts with hyphen)
    // Password is the deviceToken
    // BUG FIX: Store email as class member to prevent dangling pointer.
    // Previously, email was a local String whose .c_str() became invalid after begin() returned.
    _email = "device" + _deviceId + "@device.local";

    config.api_key = apiKey;
    config.database_url = dbUrl;
    auth.user.email = _email.c_str();
    auth.user.password = _deviceToken.c_str();

    config.token_status_callback = tokenStatusCallback;

    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);

    Serial.println("[CloudESP32] Initializing Firebase...");
}

void CloudESP32::connectWiFi(const char* ssid, const char* password) {
    Serial.print("[CloudESP32] Connecting to WiFi: ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
    
    unsigned long startAttemptTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 15000) {
        delay(500);
        Serial.print(".");
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        _wifiConnected = true;
        Serial.println("\n[CloudESP32] WiFi Connected. IP: " + WiFi.localIP().toString());
    } else {
        _wifiConnected = false;
        Serial.println("\n[CloudESP32] WiFi connection timed out (15s). Will retry in background.");
    }
}

void CloudESP32::run() {
    if (WiFi.status() != WL_CONNECTED) {
        _wifiConnected = false;
        _streamConnected = false; // Issue #2 FIX: reset stream flag when WiFi drops
        return; // Auto-reconnect is handled by ESP32/Firebase library
    }

    if (!_wifiConnected) {
        _wifiConnected = true;
        Serial.println("[CloudESP32] WiFi Restored");
    }

    if (Firebase.ready()) {
        // Flush deferred handshake pong FIRST (before heartbeat uses fbdo)
        if (_pendingPong) {
            String pongPath = "/settings/" + _deviceId + "/ecoHandshake/pong";
            // Use synchronous set so we know it completes before clearing the flag
            Firebase.RTDB.setString(&fbdo, pongPath.c_str(), _pendingPongId);
            Serial.println("[CloudESP32] Handshake pong sent: " + _pendingPongId);
            _pendingPong   = false;
            _pendingPongId = "";
        }
        performHeartbeat();
        setupStream();
    }
}

void CloudESP32::performHeartbeat() {
    unsigned long currentMillis = millis();
    if (currentMillis - _lastHeartbeatTime >= HEARTBEAT_INTERVAL || _lastHeartbeatTime == 0) {
        _lastHeartbeatTime = currentMillis;
        
        // Write lastSeen = timestamp (ServerValue::TIMESTAMP)
        // We use RTDB setTimestamp instead of reading locally to prevent ESP32 RTC sync issues
        String path = _basePath + "/lastSeen";
        if (Firebase.RTDB.setTimestamp(&fbdo, path.c_str())) {
            // Serial.println("[CloudESP32] Heartbeat sent");
        } else {
            Serial.println("[CloudESP32] Heartbeat failed: " + fbdo.errorReason());
        }

        // Sync Eco Mode state from Firebase
        String ecoPath = "/settings/" + _deviceId + "/ecoMode";
        if (Firebase.RTDB.getBool(&fbdo, ecoPath.c_str())) {
            _ecoMode = fbdo.boolData();
        }
    }
}

void CloudESP32::setupStream() {
    if (!_streamConnected) {
        String streamPath = "/pins/" + _deviceId;
        if (!Firebase.RTDB.beginStream(&streamFbdo, streamPath.c_str())) {
            Serial.println("[CloudESP32] Stream begin error: " + streamFbdo.errorReason());
            return;
        }
        Firebase.RTDB.setStreamCallback(&streamFbdo, streamCallback, streamTimeoutCallback);
        _streamConnected = true;
        Serial.println("[CloudESP32] Stream initialized for " + streamPath);
    }
}

void CloudESP32::streamCallback(FirebaseStream data) {
    if (instance) {
        instance->handleStreamData(data);
    }
}

void CloudESP32::streamTimeoutCallback(bool timeout) {
    if (timeout) {
        Serial.println("[CloudESP32] Stream timeout, will auto-resume");
    }
}

void CloudESP32::handleStreamData(FirebaseStream& data) {
    // Determine which pin was updated.
    // path looks like "/V1" or "/" (if full dump)
    String path = data.dataPath();
    String pin = "";

    if (path == "/") {
        // Initial full-dump event — log it and return
        // Full parsing of initial state is not yet implemented
        Serial.println("[CloudESP32] Stream initial dump received (full state).");
        return;
    }

    if (path.startsWith("/")) {
        pin = path.substring(1); // Remove leading slash
    } else {
        return; // unexpected path format
    }

    // --- Eco Mode Handshake ---
    // ROOT CAUSE FIX: Writing Firebase directly inside a stream callback
    // collides with the fbdo socket used by performHeartbeat() and causes
    // a silent failure — the pong never reaches the database.
    // SOLUTION: Store the pingId and defer the actual Firebase write to
    // run() in the main loop (same pattern as the CLOUD_WRITE rule).
    if (pin == "_sys_handshake") {
        String type = data.dataType();
        if (type == "string")     _pendingPongId = data.stringData();
        else if (type == "int")   _pendingPongId = String(data.intData());
        else                      _pendingPongId = data.payload();
        _pendingPong = true; // Signal run() to flush the pong
        Serial.println("[CloudESP32] Handshake ping received, pong queued.");
        return;
    }

    // Find callback
    auto it = _callbacks.find(pin);
    if (it != _callbacks.end()) {
        // We have a callback registered
        FirebaseJsonData result;
        String type = data.dataType();
        // The value is in data.value() or we can parse if it's a JSON
        if (type == "boolean" || type == "int" || 
            type == "float" || type == "double" || 
            type == "string") {
            
            FirebaseJson json;
            if (type == "boolean") {
                // BUG FIX: data.payload() for a boolean stream value is the
                // text "true"/"false". String::toInt() only parses a leading
                // digit, so both "true" and "false" were being read as 0 —
                // every switch write reached the callback as `false`, no
                // matter what the dashboard actually sent. Use boolData()
                // instead, which the library returns correctly for boolean
                // stream events.
                json.set("v", data.boolData());
            } else if (type == "int") {
                json.set("v", data.payload().toInt());
            } else if (type == "float" || type == "double") {
                json.set("v", data.payload().toDouble());
            } else {
                json.set("v", data.payload());
            }
            
            json.get(result, "v");
            
            // Execute user callback
            it->second(result);
        }
    }
}

void CloudESP32::onWrite(const String& pin, WriteCallback callback) {
    _callbacks[pin] = callback;
}

// ----------------- Virtual Write Overloads -----------------

void CloudESP32::virtualWrite(const String& pin, int value) {
    if (Firebase.ready()) {
        String path = "/pins/" + _deviceId + "/" + pin;
        Firebase.RTDB.setIntAsync(&fbdo, path.c_str(), value);
    }
}

void CloudESP32::virtualWrite(const String& pin, float value) {
    if (Firebase.ready()) {
        String path = "/pins/" + _deviceId + "/" + pin;
        Firebase.RTDB.setFloatAsync(&fbdo, path.c_str(), value);
    }
}

void CloudESP32::virtualWrite(const String& pin, double value) {
    if (Firebase.ready()) {
        String path = "/pins/" + _deviceId + "/" + pin;
        Firebase.RTDB.setDoubleAsync(&fbdo, path.c_str(), value);
    }
}

void CloudESP32::virtualWrite(const String& pin, bool value) {
    if (Firebase.ready()) {
        String path = "/pins/" + _deviceId + "/" + pin;
        Firebase.RTDB.setBoolAsync(&fbdo, path.c_str(), value);
    }
}

void CloudESP32::virtualWrite(const String& pin, const String& value) {
    if (Firebase.ready()) {
        String path = "/pins/" + _deviceId + "/" + pin;
        Firebase.RTDB.setStringAsync(&fbdo, path.c_str(), value);
    }
}

void CloudESP32::virtualWrite(const String& pin, const char* value) {
    if (Firebase.ready()) {
        String path = "/pins/" + _deviceId + "/" + pin;
        Firebase.RTDB.setStringAsync(&fbdo, path.c_str(), value);
    }
}

void CloudESP32::updatePins(FirebaseJson* json) {
    if (Firebase.ready()) {
        String path = "/pins/" + _deviceId;
        // BUG FIX: Changed from updateNodeAsync to updateNode (synchronous).
        // Async variant reads json pointer later from a different task — if the caller
        // passed a stack-local FirebaseJson, the pointer is dangling → crash.
        Firebase.RTDB.updateNode(&fbdo, path.c_str(), json);
    }
}

// ----------------- History Logging -----------------

void CloudESP32::logHistory(const String& pin, int value) {
    unsigned long now = millis();
    auto lastLogIt = _lastHistoryLogTime.find(pin);
    unsigned long lastLogTime = (lastLogIt != _lastHistoryLogTime.end()) ? lastLogIt->second : 0;
    if (lastLogTime != 0 && (now - lastLogTime < MIN_HISTORY_INTERVAL)) {
        Serial.println("[CloudESP32] WARNING: logHistory() on " + pin + " called too fast! (Minimum 5 seconds). Ignored.");
        return;
    }

    // Eco Mode Filter
    if (_ecoMode) {
        bool hasLastValue = _lastSentValues.find(pin) != _lastSentValues.end();
        if (hasLastValue && fabs(value - _lastSentValues[pin]) < 0.1 && (lastLogTime != 0 && (now - lastLogTime) < 3600000)) {
            return;
        }
    }

    _lastHistoryLogTime[pin] = now;
    _lastSentValues[pin] = value;

    if (Firebase.ready()) {
        String path = "/history/" + _deviceId + "/" + pin;
        FirebaseJson json;
        json.set("value", value);
        json.set("timestamp/.sv", "timestamp"); // Tell Firebase to insert server timestamp
        Firebase.RTDB.pushJSON(&_historyFbdo, path.c_str(), &json); // Synchronous to prevent memory crash
    }
}

void CloudESP32::logHistory(const String& pin, float value) {
    unsigned long now = millis();
    auto lastLogIt = _lastHistoryLogTime.find(pin);
    unsigned long lastLogTime = (lastLogIt != _lastHistoryLogTime.end()) ? lastLogIt->second : 0;
    if (lastLogTime != 0 && (now - lastLogTime < MIN_HISTORY_INTERVAL)) {
        Serial.println("[CloudESP32] WARNING: logHistory() on " + pin + " called too fast! (Minimum 5 seconds). Ignored.");
        return;
    }

    if (_ecoMode) {
        bool hasLastValue = _lastSentValues.find(pin) != _lastSentValues.end();
        if (hasLastValue && fabs(value - _lastSentValues[pin]) < 0.1 && (lastLogTime != 0 && (now - lastLogTime) < 3600000)) return;
    }

    _lastHistoryLogTime[pin] = now;
    _lastSentValues[pin] = value;

    if (Firebase.ready()) {
        String path = "/history/" + _deviceId + "/" + pin;
        FirebaseJson json;
        json.set("value", value);
        json.set("timestamp/.sv", "timestamp");
        Firebase.RTDB.pushJSON(&_historyFbdo, path.c_str(), &json);
    }
}

void CloudESP32::logHistory(const String& pin, double value) {
    unsigned long now = millis();
    auto lastLogIt = _lastHistoryLogTime.find(pin);
    unsigned long lastLogTime = (lastLogIt != _lastHistoryLogTime.end()) ? lastLogIt->second : 0;
    if (lastLogTime != 0 && (now - lastLogTime < MIN_HISTORY_INTERVAL)) {
        Serial.println("[CloudESP32] WARNING: logHistory() on " + pin + " called too fast! (Minimum 5 seconds). Ignored.");
        return;
    }

    if (_ecoMode) {
        bool hasLastValue = _lastSentValues.find(pin) != _lastSentValues.end();
        if (hasLastValue && fabs(value - _lastSentValues[pin]) < 0.1 && (lastLogTime != 0 && (now - lastLogTime) < 3600000)) return;
    }

    _lastHistoryLogTime[pin] = now;
    _lastSentValues[pin] = value;

    if (Firebase.ready()) {
        String path = "/history/" + _deviceId + "/" + pin;
        FirebaseJson json;
        json.set("value", value);
        json.set("timestamp/.sv", "timestamp");
        Firebase.RTDB.pushJSON(&_historyFbdo, path.c_str(), &json);
    }
}

// ----------------- High Frequency History Logging -----------------

void CloudESP32::logHistoryHighFreq(const String& pin, int value) {
    unsigned long now = millis();
    auto lastLogIt = _lastHistoryLogTime.find(pin);
    unsigned long lastLogTime = (lastLogIt != _lastHistoryLogTime.end()) ? lastLogIt->second : 0;
    if (lastLogTime != 0 && (now - lastLogTime < MIN_HIGH_FREQ_INTERVAL)) {
        Serial.println("[CloudESP32] WARNING: logHistoryHighFreq() on " + pin + " called too fast! (Minimum 1 second). Ignored.");
        return;
    }

    if (_ecoMode) {
        bool hasLastValue = _lastSentValues.find(pin) != _lastSentValues.end();
        if (hasLastValue && fabs(value - _lastSentValues[pin]) < 0.1 && (lastLogTime != 0 && (now - lastLogTime) < 3600000)) return;
    }

    _lastHistoryLogTime[pin] = now;
    _lastSentValues[pin] = value;

    if (Firebase.ready()) {
        String path = "/history/" + _deviceId + "/" + pin;
        FirebaseJson json;
        json.set("value", value);
        json.set("timestamp/.sv", "timestamp");
        Firebase.RTDB.pushJSON(&_historyFbdo, path.c_str(), &json);
    }
}

void CloudESP32::logHistoryHighFreq(const String& pin, float value) {
    unsigned long now = millis();
    auto lastLogIt = _lastHistoryLogTime.find(pin);
    unsigned long lastLogTime = (lastLogIt != _lastHistoryLogTime.end()) ? lastLogIt->second : 0;
    if (lastLogTime != 0 && (now - lastLogTime < MIN_HIGH_FREQ_INTERVAL)) {
        Serial.println("[CloudESP32] WARNING: logHistoryHighFreq() on " + pin + " called too fast! (Minimum 1 second). Ignored.");
        return;
    }

    if (_ecoMode) {
        bool hasLastValue = _lastSentValues.find(pin) != _lastSentValues.end();
        if (hasLastValue && fabs(value - _lastSentValues[pin]) < 0.1 && (lastLogTime != 0 && (now - lastLogTime) < 3600000)) return;
    }

    _lastHistoryLogTime[pin] = now;
    _lastSentValues[pin] = value;

    if (Firebase.ready()) {
        String path = "/history/" + _deviceId + "/" + pin;
        FirebaseJson json;
        json.set("value", value);
        json.set("timestamp/.sv", "timestamp");
        Firebase.RTDB.pushJSON(&_historyFbdo, path.c_str(), &json);
    }
}

void CloudESP32::logHistoryHighFreq(const String& pin, double value) {
    unsigned long now = millis();
    auto lastLogIt = _lastHistoryLogTime.find(pin);
    unsigned long lastLogTime = (lastLogIt != _lastHistoryLogTime.end()) ? lastLogIt->second : 0;
    if (lastLogTime != 0 && (now - lastLogTime < MIN_HIGH_FREQ_INTERVAL)) {
        Serial.println("[CloudESP32] WARNING: logHistoryHighFreq() on " + pin + " called too fast! (Minimum 1 second). Ignored.");
        return;
    }

    if (_ecoMode) {
        bool hasLastValue = _lastSentValues.find(pin) != _lastSentValues.end();
        if (hasLastValue && fabs(value - _lastSentValues[pin]) < 0.1 && (lastLogTime != 0 && (now - lastLogTime) < 3600000)) return;
    }

    _lastHistoryLogTime[pin] = now;
    _lastSentValues[pin] = value;

    if (Firebase.ready()) {
        String path = "/history/" + _deviceId + "/" + pin;
        FirebaseJson json;
        json.set("value", value);
        json.set("timestamp/.sv", "timestamp");
        Firebase.RTDB.pushJSON(&_historyFbdo, path.c_str(), &json);
    }
}
