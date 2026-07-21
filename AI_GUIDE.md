# AI Assistant Context Guide (price-iot-cloud)

This document contains context for any AI assistant working on this project.

## Architecture Rules
1. **Source of Truth:** Firebase Realtime Database is the sole source of truth for both Web (React) and Hardware (ESP32).
2. **Web Framework:** React + TypeScript + Vite. Styling uses TailwindCSS with a specialized Cyberpunk/Dark UI theme (variables in `index.css`).
3. **ESP32 SDK:** Custom `CloudESP32_SDK` library. It maintains a persistent stream (`FirebaseStream`) to `/projects/{projectId}/devices/{deviceId}/stream` for bi-directional communication.

## Core Features
- **Widget System:** Dynamic React Grid Layout dashboards. Widgets read live values from `useDeviceStatus` and `usePinValue`.
  - **Supported Types:** Integer, Double, String, Enum, Boolean (0/1).
  - **Pin Limit:** V0 to V49 (Max 50 pins).
  - **Available Widgets:** Switch, LED, Gauge, Chart, MultiChart, Label, Slider, Number Input, Hold Button, Trigger Button (One-time pulse), Camera (Displays MJPEG streamUrl, does not use datastream).
- **Eco Mode (Smart Data Saver):** 
  - **Goal:** Reduce bandwidth and storage by 95% on the free Firebase tier.
  - **Handshake Logic:** Web writes a ping to `_sys_handshake`. ESP32 replies instantly to `settings/ecoHandshake`. The web waits 5s before enabling Eco Mode.
  - **Filtering Logic:** In `CloudESP32.cpp`, `logHistory` only fires if `abs(newValue - old) >= 0.1` or 1 hour heartbeat limit is reached.
  - **Graphing Logic:** Web uses `stepAfter` curve type in Recharts to accurately draw sparse data.

## 🐛 Known Bugs & Fixes History (CRITICAL CONTEXT)
Any AI working on this project MUST read these past solutions to avoid recreating old bugs:

1. **ESP32 Boolean Stream Parsing Bug (Critical):** 
   - *Issue:* When streaming boolean changes, Firebase sends the text `"true"` or `"false"`. Using `.toInt()` on this payload evaluates to `0` (false) regardless of the true state.
   - *Fix:* Must use `data.boolData()` explicitly when `data.dataType() == "boolean"`. This is already implemented in `CloudESP32.cpp` `handleStreamData()`.
2. **ESP32 Wi-Fi Reconnection (Stream Freezing):**
   - *Issue:* If the Wi-Fi router restarts, the Firebase stream hangs indefinitely.
   - *Fix:* In `CloudESP32::run()`, if `WiFi.status() != WL_CONNECTED`, we strictly set `_streamConnected = false;`. When Wi-Fi restores, `setupStream()` is forced to re-initialize the connection.
3. **React "Rules of Hooks" Violations:**
   - *Issue:* Early returns (e.g., `if (loading) return <Loading/>;`) placed before `useWidgets` or `useEffect` caused React crashes when navigating between projects.
   - *Fix:* ALL hooks must be called at the very top of the component, unconditionally.
4. **Firebase Listener Memory Leaks:**
   - *Issue:* `onValue` listeners in `HistoryChartWidget` and `MultiChartWidget` were accumulating, causing massive performance drops.
   - *Fix:* ALWAYS return the `unsubscribe` function in the `useEffect` cleanup phase.
5. **Sparse Data Graph Rendering:**
   - *Issue:* Recharts using `type="monotone"` drew diagonal lines when data points were far apart (e.g., in Eco Mode).
   - *Fix:* Switched to `type="stepAfter"` so the graph maintains the previous horizontal value until the exact moment a new value arrives.

## Deployment
- Web: `firebase deploy --only hosting`
- Hardware: Flash `CloudESP32_SDK` onto ESP32 directly via Arduino IDE.

---

# CloudESP32 SDK - AI Developer Guide (HARDWARE RULES)

**ATTENTION ALL AI AGENTS:** Read this document BEFORE attempting to write or modify Arduino code using the `CloudESP32` library. This library is designed to mimic `Blynk` but uses Firebase RTDB under the hood. Failure to follow these rules will result in ESP32 memory crashes and data collisions.

## 1. Similarities to Blynk
*   **Initialization:** Use `Cloud.begin(ssid, pass, api_key, db_url, device_id, device_token);` in `setup()`.
*   **Main Loop:** Use `Cloud.run();` inside `loop()` to keep the stream alive.
*   **Receiving Data:** Use the macro `CLOUD_WRITE(V_PIN)` exactly like `BLYNK_WRITE(V_PIN)`.
    *   Extract values using `param.intValue`, `param.floatValue`, `param.stringValue`.
    *   Example:
        ```cpp
        CLOUD_WRITE(V1) {
            int val = param.intValue;
            // Handle value
        }
        ```

## 2. CRITICAL DIFFERENCES (Read Carefully!)

### 🚨 A. Do NOT spam `Cloud.virtualWrite()`
Unlike Blynk's lightweight binary protocol, Firebase uses HTTP/HTTPS. Calling `Cloud.virtualWrite()` multiple times in rapid succession (e.g., updating 4 pins at once) will overload the ESP32's network stack, causing dropped packets or deadlock.
**Rule:** For single updates, `Cloud.virtualWrite()` is fine. For multiple updates, you MUST batch them using a `FirebaseJson` payload.

### 🚨 B. Do NOT write data inside `CLOUD_WRITE` (Stream Callback)
Calling Firebase write operations directly inside a `CLOUD_WRITE` block can cause the Stream socket to collide with the Write socket. 
**Rule:** Use a boolean flag (e.g., `needsDashboardSync = true`) inside `CLOUD_WRITE`, and perform the actual data sync in the main `loop()`.

### 🚨 C. NEVER use `updateNodeAsync` with local variables (CRITICAL MEMORY CRASH BUG)
If you batch data using `FirebaseJson`, do **NOT** use `Firebase.RTDB.updateNodeAsync()` if the `FirebaseJson` object is a local variable on the stack. 
When the function returns, the local variable is destroyed. When the async background task later attempts to read the pointer, it reads garbage memory, causing a **Core Panic and ESP32 Reboot**.

**❌ WRONG (Will crash ESP32):**
```cpp
void syncData() {
    FirebaseJson json;
    json.set("V1", 1);
    // CRASH: json will be destroyed, async task will read garbage memory
    Firebase.RTDB.updateNodeAsync(&fbdo_batch, path, &json); 
}
```

**✅ CORRECT (Synchronous - Safe - Using built-in SDK function):**
```cpp
void syncData() {
    FirebaseJson json;
    json.set("V1", 1);
    json.set("V2", 0);
    // SAFE: Automatically resolves the correct DB path and blocks until complete
    Cloud.updatePins(&json); 
}
```

## 3. Best Practice Architecture
When writing code for this SDK, structure it exactly like this:

1. Create a global `FirebaseData fbdo_batch;` object (if using custom RTDB commands, otherwise optional).
2. In `CLOUD_WRITE`, only update flags/variables and set `needsDashboardSync = true;`.
3. In `loop()`, check `if (needsDashboardSync && Firebase.ready())` and call a sync function.
4. In the sync function, build a `FirebaseJson` object and use `Cloud.updatePins(&json);` (Synchronous and path-safe).
