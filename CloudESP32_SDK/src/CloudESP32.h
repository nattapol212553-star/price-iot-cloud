#ifndef CLOUD_ESP32_H
#define CLOUD_ESP32_H

#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <map>
#include <functional>

// Define callback type for onWrite
typedef std::function<void(FirebaseJsonData&)> WriteCallback;

class CloudESP32 {
public:
    CloudESP32();
    ~CloudESP32();

    // Initialization
    void begin(const char* ssid, const char* password, 
               const char* apiKey, const char* dbUrl, 
               const char* deviceId, const char* deviceToken);

    // Keep-alive and Stream handler (must be called in loop)
    void run();

    // Virtual Write methods
    void virtualWrite(const String& pin, int value);
    void virtualWrite(const String& pin, float value);
    void virtualWrite(const String& pin, double value);
    void virtualWrite(const String& pin, bool value);
    void virtualWrite(const String& pin, const String& value);
    void virtualWrite(const String& pin, const char* value);
    void updatePins(FirebaseJson* json);

    // History Logging methods
    void logHistory(const String& pin, int value);
    void logHistory(const String& pin, float value);
    void logHistory(const String& pin, double value);

    // Special High-Frequency History Logging methods (min 1 second)
    void logHistoryHighFreq(const String& pin, int value);
    void logHistoryHighFreq(const String& pin, float value);
    void logHistoryHighFreq(const String& pin, double value);

    // Event-driven callback registration
    void onWrite(const String& pin, WriteCallback callback);

private:
    // Firebase objects
    FirebaseData fbdo;
    FirebaseData _historyFbdo;
    FirebaseData streamFbdo;
    FirebaseAuth auth;
    FirebaseConfig config;

    String _deviceId;
    String _deviceToken;
    String _email;  // BUG FIX: stored as member to prevent dangling .c_str() pointer
    String _basePath;

    unsigned long _lastHeartbeatTime;
    const unsigned long HEARTBEAT_INTERVAL = 15000; // 15 seconds

    bool _streamConnected;
    bool _wifiConnected;
    bool _ecoMode;

    // Handshake deferred pong (must be sent from main loop, not from stream callback)
    bool    _pendingPong;
    String  _pendingPongId;

    // Eco Mode state
    std::map<String, double> _lastSentValues;

    // Callbacks registry
    std::map<String, WriteCallback> _callbacks;

    // History rate limiting
    std::map<String, unsigned long> _lastHistoryLogTime;
    const unsigned long MIN_HISTORY_INTERVAL = 5000; // 5 seconds standard
    const unsigned long MIN_HIGH_FREQ_INTERVAL = 1000; // 1 second for special mode



    // Internal methods
    void connectWiFi(const char* ssid, const char* password);
    void performHeartbeat();
    void setupStream();
    
    // Stream callback static router
    static void streamCallback(FirebaseStream data);
    static void streamTimeoutCallback(bool timeout);
    void handleStreamData(FirebaseStream& data);

    // Singleton instance pointer for static callbacks
    static CloudESP32* instance;
};

extern CloudESP32 Cloud;

// Helper macro for cleaner syntax
#define CLOUD_WRITE(pin) \
    void pin##_write_handler(FirebaseJsonData& param); \
    struct pin##_Registrar { \
        pin##_Registrar() { Cloud.onWrite(#pin, pin##_write_handler); } \
    } pin##_registrar; \
    void pin##_write_handler(FirebaseJsonData& param)

#endif // CLOUD_ESP32_H
