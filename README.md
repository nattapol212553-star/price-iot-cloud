# SMAT IoT Dashboard & Cloud ESP32 SDK

A complete IoT Dashboard platform built with React, TypeScript, and Firebase. This project allows you to create projects, manage datastreams, and build custom drag-and-drop dashboards to control and monitor ESP32 devices globally.

## Features
- **Project Management:** Create multiple IoT projects.
- **Datastreams:** Define virtual pins (Integer, Double, String, Enum) to communicate with your hardware.
- **Custom Dashboards:** Drag and drop widgets (Switches, Sliders, Number Inputs, Buttons, Gauges, LEDs, Charts) and map them to datastreams.
- **Eco Mode (Smart Data Saver):** A revolutionary hardware-software handshake protocol that filters redundant sensor data at the edge (ESP32), saving up to 95% of bandwidth and Firebase storage without losing graph resolution.

## 🚀 Getting Started

### 1. Web Application Setup
1. Run `npm install` to install dependencies.
2. Edit `src/firebase/config.ts` if you want to point to a different Firebase project.
3. Run `npm run dev` to start the development server.
4. Run `npm run build` followed by `firebase deploy --only hosting` to publish.

### 2. ESP32 Hardware Setup
The project includes a custom wrapper library for the ESP32 to seamlessly connect with this platform.
1. Copy the `CloudESP32_SDK` folder into your Arduino `libraries` folder.
2. Open your Arduino IDE and include `#include "CloudESP32.h"`.
3. Check `CloudESP32_SDK/examples/Basic_Switch` for a quickstart example.

---

# 🚀 CloudESP32 SDK - คู่มือการใช้งานฉบับสมบูรณ์ (Complete Guide)

ไลบรารีนี้ถูกออกแบบมาเพื่อใช้แทน **Blynk** โดยทำงานผ่าน **Firebase Realtime Database** ซึ่งถูกปรับแต่งมาให้ใช้งานง่ายเหมือนเขียน Blynk แต่ต้องระวังข้อจำกัดของ Firebase ที่ไม่เหมือน Blynk!

**⚠️ ข้อควรระวังสำหรับ AI และนักพัฒนา (CRITICAL WARNING):**
ห้ามส่งข้อมูลความถี่สูง (Spam) แยกทีละท่อ และห้ามส่งข้อมูลแบบ Async ด้วยตัวแปรชั่วคราว (Local Variable) เด็ดขาด เพราะจะทำให้บอร์ด ESP32 เกิดอาการ **Memory Crash (ความจำรวนและรีสตาร์ทตัวเอง)**

---

## 🛠️ ฟังก์ชันทั้งหมดที่มีให้ใช้งาน (All Available Functions)

### 1. การตั้งค่าเริ่มต้น (Initialization)
ใช้ใน `setup()` เพื่อเชื่อมต่อ WiFi และ Firebase
```cpp
Cloud.begin(ssid, pass, FIREBASE_API_KEY, FIREBASE_DB_URL, DEVICE_ID, DEVICE_TOKEN);
```

### 2. การรักษาการเชื่อมต่อ (Keep-Alive & Stream)
ต้องใส่ไว้บรรทัดแรกใน `loop()` เพื่อให้ระบบรอรับคำสั่งจากหน้าเว็บตลอดเวลา
```cpp
Cloud.run();
```

### 3. การรับคำสั่งจากหน้าเว็บ (Receiving Data)
ใช้มาโคร `CLOUD_WRITE(V_PIN)` ไว้นอก `loop()` เหมือนกับ `BLYNK_WRITE`
* **ข้อควรระวัง:** ภายในฟังก์ชันนี้ **ห้ามใช้คำสั่งส่งข้อมูลกลับไปหน้าเว็บ (virtualWrite) ทันที** เพราะจะทำให้ท่อรับ-ส่งข้อมูลชนกัน (Stream Collision)! ควรตั้งค่าตัวแปร `Flag` (เช่น `needsDashboardSync = true`) แล้วค่อยส่งข้อมูลใน `loop()`
```cpp
CLOUD_WRITE(V1) {
  int val = param.intValue; // ดึงค่าตัวเลข
  // String str = param.stringValue; // ดึงค่าข้อความ
  
  if (val == 1) {
    // ทำอะไรสักอย่าง
  }
  needsDashboardSync = true; // ทดป้ายไว้เพื่ออัปเดตเว็บทีหลัง
}
```

### 4. การอัปเดตหน้าเว็บหลายๆ ค่าพร้อมกัน (JSON Batch Sync) - ⭐️ วิธีที่ปลอดภัยที่สุด
**ห้ามใช้** `Cloud.virtualWrite()` รัวๆ ติดกัน 4-5 บรรทัด ให้ใช้วิธี **"จัดกล่องพัสดุ (JSON)"** และส่งทีเดียวโดยใช้ `updateNode` (แบบรอส่งเสร็จ Synchronous) เพื่อป้องกันบอร์ดแครช
```cpp
void syncDashboardState() {
  FirebaseJson json;
  json.set("V1", 1);
  json.set("V2", 0);
  json.set("V15", 1);
  
  // 🚨 แนะนำให้ใช้คำสั่งนี้แทนการเขียน Firebase.RTDB.updateNode เอง
  Cloud.updatePins(&json); 
}
```
*(หมายเหตุ: ต้องประกาศ `FirebaseData fbdo_batch;` ไว้ด้านบนสุดของโค้ดด้วย)*

### 5. การส่งข้อมูลอัปเดตหน้าเว็บ (Single Update)
ใช้สำหรับส่งข้อมูลทีละ 1 ค่าเท่านั้น (เช่น อัปเดตอุณหภูมิทุก 2 นาที)
```cpp
Cloud.virtualWrite("V11", 25.5); // ส่งอุณหภูมิ
Cloud.virtualWrite("V15", 1);    // ส่งสถานะไฟ
```

### 6. การบันทึกประวัติ (History Logging)
ใช้สำหรับส่งข้อมูลไปเก็บเป็นกราฟย้อนหลัง (บันทึกได้จำกัดความถี่ที่ 5 วินาทีต่อครั้ง เพื่อป้องกันโควต้า Firebase เต็ม)
```cpp
Cloud.logHistory("V11", 25.5); // บันทึกกราฟอุณหภูมิ
Cloud.logHistory("V13", 80);   // บันทึกกราฟความชื้นดิน
```

### 7. โหมดพิเศษ: บันทึกประวัติความถี่สูง (High-Frequency History)
ใช้สำหรับโหมดวิเคราะห์ข้อมูล (เช่น อยากเก็บกราฟทุกๆ 1 วินาที)
```cpp
Cloud.logHistoryHighFreq("V11", 25.5); 
```

---

## 💡 สรุปโครงสร้างโค้ดที่ถูกต้อง (Best Practice Template)

```cpp
#include <CloudESP32.h>
FirebaseData fbdo_batch; 
bool needsDashboardSync = false;

void setup() {
  Cloud.begin(ssid, pass, api, url, device, token);
}

void loop() {
  Cloud.run();
  
  // โค้ดอัตโนมัติต่างๆ
  
  // ถ้ามีการกดสวิตช์ หรือต้องอัปเดตสถานะไฟ ให้ส่งแบบกล่อง JSON
  if (needsDashboardSync && Firebase.ready()) {
    FirebaseJson json;
    json.set("V1", 1);
    json.set("V15", 1);
    Cloud.updatePins(&json); // อัปเดตข้อมูลทีเดียวจบ ปลอดภัย 100%
    needsDashboardSync = false;
  }
}

CLOUD_WRITE(V1) {
  int val = param.intValue;
  // อัปเดตตัวแปรในระบบ
  needsDashboardSync = true; // แจ้งลูปหลักให้ส่งข้อมูล
}
```
---

## 🌱 Eco Mode (Smart Data Saver)
Eco Mode prevents the ESP32 from spamming the database with duplicate sensor values. 

**How it works:**
1. You click "Enable Eco Mode" on the Web Dashboard (Datastreams page).
2. The Web sends a secure `_sys_handshake` ping to the ESP32.
3. If the ESP32 has the latest SDK, it instantly replies (Pong).
4. The Web enables Eco Mode in Firebase settings.
5. The ESP32 starts filtering: It will ONLY send data if the value changes by more than `0.1` OR if 1 hour has passed (heartbeat).
6. The Web Charts automatically switch to `stepAfter` rendering to keep graphs accurate despite the sparse data.

*If your board does not respond to the handshake, the Web will block you from turning on Eco Mode to prevent data synchronization issues.*

## Architecture
- **Frontend:** React, TypeScript, TailwindCSS, Framer Motion, Recharts
- **Backend/DB:** Firebase Realtime Database, Firebase Authentication
- **Hardware:** ESP32 (Firebase-ESP-Client library)

## 🤖 For AI Assistants
If you are an AI assistant helping to maintain this project, please read the [AI_GUIDE.md](AI_GUIDE.md) file first. It contains a critical history of past bugs (e.g., ESP32 boolean parsing issues, React Hooks rules) and architectural decisions that you must know before modifying code.
