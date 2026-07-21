#include <Arduino.h>
#include <CloudESP32.h>

// 1. Setup your WiFi Credentials
#define WIFI_SSID "YourWiFi"
#define WIFI_PASSWORD "YourPass"

// 2. Setup Firebase Configuration
#define FIREBASE_API_KEY "YOUR_FIREBASE_API_KEY"
#define FIREBASE_DATABASE_URL "YOUR_FIREBASE_DATABASE_URL"

// 3. Setup Device Credentials (Copy from the Web Dashboard)
#define DEVICE_ID "YOUR_PROJECT_ID"
#define DEVICE_TOKEN "YOUR_DEVICE_TOKEN"

// Define Hardware Pins
const int LED_PIN = 2;

// -------------------------------------------------------------
// EVENT CALLBACK: This block runs automatically when you press 
// the switch on the web dashboard for Pin V1
// -------------------------------------------------------------
CLOUD_WRITE(V1) {
    bool state = param.boolData(); // Get boolean value from web
    
    Serial.print("Web Switch V1 changed to: ");
    Serial.println(state ? "ON" : "OFF");
    
    // Update the physical LED
    digitalWrite(LED_PIN, state);
    
    // Echo the state back to V0 to update an LED widget on the web
    Cloud.virtualWrite("V0", state);
}

void setup() {
    // Initialize Hardware
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
    
    // Initialize Cloud Connection
    // This connects to WiFi, logs into Firebase, and sets up real-time stream
    Cloud.begin(WIFI_SSID, WIFI_PASSWORD, 
                FIREBASE_API_KEY, FIREBASE_DATABASE_URL, 
                DEVICE_ID, DEVICE_TOKEN);
}

void loop() {
    // Must be called in loop() to handle Heartbeat and Streams.
    // Do NOT use delay() in your loop, as it will block this function.
    Cloud.run();
    
    // Example: Read a sensor every 5 seconds without blocking
    static unsigned long lastUpdate = 0;
    if (millis() - lastUpdate >= 5000) {
        lastUpdate = millis();
        
        // Read your sensor (e.g., DHT22)
        float temperature = 25.5; // Dummy value
        
        // Send to Web Dashboard
        Cloud.virtualWrite("V2", temperature);
    }
}
