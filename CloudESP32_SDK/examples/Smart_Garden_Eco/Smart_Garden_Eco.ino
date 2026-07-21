// =====================================================================
//   Smart Garden System - CloudESP32 Edition (Anti-Crash & Batch Sync)
// =====================================================================

#include "DHT.h"
#include <Wire.h>
#include "RTClib.h"
#include <CloudESP32.h> // เปลี่ยนมาใช้คลาวด์เวอร์ชันใหม่

// --- [ตั้งค่า] ข้อมูลการเชื่อมต่อ Firebase & อุปกรณ์ ---
#define FIREBASE_API_KEY  "AIzaSyACUZS-I00EJkeFp4ZJoblAehJCeBKytZM"
#define FIREBASE_DB_URL   "https://smat-iot-by-pai-default-rtdb.asia-southeast1.firebasedatabase.app"
#define DEVICE_ID         "-OwIpp-hEF-OoA4yShdd"
#define DEVICE_TOKEN      "JMPh8CorgIlx0N8rVs8gKPzKXRGgySsDos0wbY3v8iazb7J76xLetaOc3AGECLjV"

char ssid[] = "Home_peach_2.4G";
char pass[] = "0907415478";

#define DHTPIN 4
#define DHTTYPE DHT22

// --- กำหนดขาอุปกรณ์ ---
int soilPin        = 34;
int mistLed        = 2;
int waterLed       = 26;
int waterStatusLed = 5;
int mistStatusLed  = 27;

DHT dht(DHTPIN, DHTTYPE);
RTC_DS3231 rtc;

const int ON  = LOW;
const int OFF = HIGH;

// --- CloudESP32 Global Objects & Flags ---
FirebaseData fbdo_batch;        // ออบเจกต์สำหรับส่งข้อมูล Batch JSON
bool needsDashboardSync = false; // Flag สำหรับแจ้งเตือนให้ลูปหลักอัปเดตหน้าเว็บทันที

// --- Session flags รดน้ำ ---
bool hasWateredMorningSession = false;
bool hasWateredEveningSession = false;

// --- ระบบพ่นหมอก ---
unsigned long lastMistTime              = 0;
const unsigned long mistDuration        = 60000;   // 1 นาที
const unsigned long mistCooldown        = 3600000; // 1 ชั่วโมง
bool isMistRunning                      = false;

// --- ระบบรดน้ำ ---
unsigned long waterStartTime            = 0;
bool isWateringRunning                  = false;

// --- Cloud Upload Interval (ส่งข้อมูลภาพรวมเซ็นเซอร์ทุก 2 นาทีเพื่อประหยัดโควต้า) ---
unsigned long lastCloudUpload           = 0;
const unsigned long cloudUploadInterval = 120000; // 2 นาที (120,000 ms)
bool isFirstBootSync                    = true;   // บังคับส่งรอบแรกทันที

// --- ระบบประหยัดการส่ง (Eco Mode / Transmission Saving) ---
// ถอดแบบเงื่อนไขมาจากไลบรารี CloudESP32: ข้ามการส่งถ้าค่าเปลี่ยน < 0.1 และเวลายังไม่เกิน 1 ชั่วโมง (3600000 ms)
float lastSentTemp                      = -999.0;
float lastSentHum                       = -999.0;
int   lastSentSoil                      = -999;
int   lastSentV1 = -1, lastSentV2 = -1, lastSentV15 = -1, lastSentV16 = -1;
unsigned long lastBatchSyncTime         = 0;
const unsigned long forceSyncInterval   = 3600000; // 1 ชั่วโมง (บังคับส่งค่าทั้งหมด)

// --- Serial Monitor (ทุก 1 วินาที) ---
unsigned long lastSerialPrint           = 0;
const unsigned long serialPrintInterval = 1000;   // 1 วินาทีพ่นหน้าจอครั้งหนึ่ง

// --- Manual request flags ---
bool blynkWaterRequest                  = false;
bool blynkMistRequest                   = false;

// --- Debounce state tracking ---
bool lastWaterOutputState               = false;
bool lastMistOutputState                = false;

// --- Manual timeout (5 นาที) ---
unsigned long manualWaterStartTime      = 0;
const unsigned long manualWaterTimeout  = 300000;
bool isManualWaterRunning               = false;

unsigned long manualMistStartTime       = 0;
const unsigned long manualMistTimeout   = 300000;
bool isManualMistRunning                = false;

// --- Hardware error flags ---
bool dhtError                           = false;
bool isRtcWorking                       = false;

// --- Non-blocking DHT22 sampling ---
unsigned long lastDhtRead               = 0;
const unsigned long dhtReadInterval     = 3000;  // อ่านทุก 3 วินาที
float currentTemp                       = 25.0;
float currentHum                        = 99.0;

// ฟังก์ชันประกาศล่วงหน้าสำหรับรวบรวมการส่งข้อมูลขึ้นหน้าเว็บ
void syncDashboardState(DateTime now, float temp, float hum, int soilValue, bool periodic);

// =====================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(mistLed,        OUTPUT);
  pinMode(waterLed,       OUTPUT);
  pinMode(waterStatusLed, OUTPUT);
  pinMode(mistStatusLed,  OUTPUT);

  digitalWrite(mistLed,        OFF);
  digitalWrite(waterLed,       OFF);
  digitalWrite(waterStatusLed, HIGH);
  digitalWrite(mistStatusLed,  HIGH);

  dht.begin();

  if (!rtc.begin()) {
    Serial.println(">> ERROR: Couldn't find RTC! Auto-mode disabled. Manual Mode is ACTIVE.");
    isRtcWorking = false;
  } else {
    isRtcWorking = true;
    if (rtc.lostPower()) {
      Serial.println(">> RTC lost power, setting compilation time...");
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
  }

  // เริ่มต้นเชื่อมต่อ WiFi และ Firebase ผ่าน SDK ตัวใหม่
  Serial.println("Connecting to CloudESP32 System...");
  Cloud.begin(ssid, pass, FIREBASE_API_KEY, FIREBASE_DB_URL, DEVICE_ID, DEVICE_TOKEN);
}

// =====================================================================
void loop() {
  Cloud.run(); // ต้องอยู่บรรทัดแรกสุดของ loop() เสมอ!

  // อ่านค่าจากเซ็นเซอร์ DHT22 ทุก 3 วินาที
  if (millis() - lastDhtRead >= dhtReadInterval) {
    lastDhtRead   = millis();
    float t       = dht.readTemperature();
    float h       = dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
      currentTemp = t;
      currentHum  = h;
      dhtError    = false;
    } else {
      dhtError    = true;
    }
  }

  int soilValue = analogRead(soilPin);

  // ดึงเวลาปัจจุบันจาก RTC
  DateTime now = rtc.now();
  if (now.year() < 2026) {
    isRtcWorking = false;
    now = DateTime(2026, 1, 1, 0, 0, 0); // Fallback Time
  } else {
    isRtcWorking = true;
  }

  // รันระบบอัตโนมัติและแมนนวล
  if (isRtcWorking) {
    runAutomation(now, currentTemp, currentHum, soilValue);
  }
  runManualControl();

  // พ่นออกจอคอมพิวเตอร์ (ทุก 1 วินาที)
  printToSerial(now, currentTemp, currentHum, soilValue);

  // --- ส่วนบริหารการอัปเดตข้อมูลขึ้นหน้าเว็บ (Batch Sync) ---
  bool isPeriodicTime = (millis() - lastCloudUpload >= cloudUploadInterval);
  
  if (isPeriodicTime || isFirstBootSync || needsDashboardSync) {
    if (Firebase.ready()) {
      // เรียกฟังก์ชันซิงค์ข้อมูลชุดใหญ่ ปลอดภัยและไม่แรมนิวเคลียร์แครชแน่นอน
      syncDashboardState(now, currentTemp, currentHum, soilValue, isPeriodicTime || isFirstBootSync);
      
      if (isPeriodicTime || isFirstBootSync) {
        lastCloudUpload = millis();
        isFirstBootSync = false;
      }
      needsDashboardSync = false; // เคลียร์ Flag สถานะ
    }
  }
}

// =====================================================================
// [ส่วนที่ 1] ระบบอัตโนมัติ 
// =====================================================================
void runAutomation(DateTime now, float temp, float hum, int soilValue) {
  int h = now.hour();
  int m = now.minute();

  // --- 1.1 รดน้ำอัตโนมัติ (7:00 และ 17:00) ---
  if ((h == 7 || h == 17) && m >= 0 && m <= 30 && !isWateringRunning && !isMistRunning) {
    if ((h == 7 && !hasWateredMorningSession) || (h == 17 && !hasWateredEveningSession)) {

      blynkWaterRequest    = false;
      isManualWaterRunning = false;
      lastWaterOutputState = false;

      digitalWrite(waterLed,       ON);
      digitalWrite(waterStatusLed, LOW);
      waterStartTime    = millis();
      isWateringRunning = true;

      if (h == 7)  hasWateredMorningSession = true;
      if (h == 17) hasWateredEveningSession = true;
      
      needsDashboardSync = true; // ยกป้ายไฟขออัปเดตหน้าเว็บด่วน
    }
  }

  if (isWateringRunning && (millis() - waterStartTime >= 60000)) {
    digitalWrite(waterLed,       OFF);
    digitalWrite(waterStatusLed, HIGH);
    isWateringRunning = false;
    
    needsDashboardSync = true; // ยกป้ายไฟขออัปเดตหน้าเว็บด่วน
  }

  if (h == 8)  hasWateredMorningSession = false;
  if (h == 18) hasWateredEveningSession = false;

  // --- 1.2 พ่นหมอกอัตโนมัติ (10:00 - 14:50) ---
  bool isMistTimeRange = (h >= 10 && h < 14) || (h == 14 && m <= 50);
  if (isMistTimeRange && !isMistRunning && !isWateringRunning) {
    if (lastMistTime == 0 || (millis() - lastMistTime >= mistCooldown)) {
      if (hum < 70 && temp > 31) {

        blynkMistRequest    = false;
        isManualMistRunning = false;
        lastMistOutputState = false;

        digitalWrite(mistLed,       ON);
        digitalWrite(mistStatusLed, LOW);
        lastMistTime  = millis();
        isMistRunning = true;
        
        needsDashboardSync = true; // ยกป้ายไฟขออัปเดตหน้าเว็บด่วน
      }
    }
  }

  if (isMistRunning && (millis() - lastMistTime >= mistDuration)) {
    digitalWrite(mistLed,       OFF);
    digitalWrite(mistStatusLed, HIGH);
    isMistRunning = false;
    
    needsDashboardSync = true; // ยกป้ายไฟขออัปเดตหน้าเว็บด่วน
  }
}

// =====================================================================
// [ส่วนที่ 2] CloudESP32 Callbacks (รับคำสั่งจากปุ่มบนหน้าเว็บ)
// =====================================================================
CLOUD_WRITE(V1) {
  int val = param.intValue; // ดึงค่าตัวเลขจากหน้าเว็บ
  
  // ป้องกันการกดซ้อนกันหรือกดปุ่มแทรกช่วงเวลาระบบออโต้กำลังทำงาน
  if (isWateringRunning || isMistRunning || blynkMistRequest) {
    needsDashboardSync = true; // ดีดปุ่มบนเว็บกลับไปเป็น 0
    return;
  }
  
  blynkWaterRequest = (val == 1);
  if (blynkWaterRequest) {
    manualWaterStartTime = millis();
    isManualWaterRunning = true;
  } else {
    isManualWaterRunning = false;
  }
  needsDashboardSync = true; // สั่งหลักให้ประมวลผลกล่อง JSON ทันที
}

CLOUD_WRITE(V2) {
  int val = param.intValue;
  
  if (isMistRunning || isWateringRunning || blynkWaterRequest) {
    needsDashboardSync = true; // ดีดปุ่มบนเว็บกลับไปเป็น 0
    return;
  }
  
  blynkMistRequest = (val == 1);
  if (blynkMistRequest) {
    manualMistStartTime = millis();
    isManualMistRunning = true;
  } else {
    isManualMistRunning = false;
  }
  needsDashboardSync = true; // สั่งหลักให้ประมวลผลกล่อง JSON ทันที
}

// =====================================================================
// [ส่วนที่ 3] Manual control + Timeout
// =====================================================================
void runManualControl() {
  if (isManualWaterRunning && (millis() - manualWaterStartTime >= manualWaterTimeout)) {
    blynkWaterRequest    = false;
    isManualWaterRunning = false;
    needsDashboardSync   = true;
  }

  if (isManualMistRunning && (millis() - manualMistStartTime >= manualMistTimeout)) {
    blynkMistRequest     = false;
    isManualMistRunning = false;
    needsDashboardSync   = true;
  }

  // ควบคุมฮาร์ดแวร์ Relay รดน้ำ
  if (!isWateringRunning) {
    bool desiredWater = blynkWaterRequest;
    if (desiredWater != lastWaterOutputState) {
      lastWaterOutputState = desiredWater;
      if (desiredWater) {
        digitalWrite(waterLed,       ON);
        digitalWrite(waterStatusLed, LOW);
      } else {
        digitalWrite(waterLed,       OFF);
        digitalWrite(waterStatusLed, HIGH);
      }
      needsDashboardSync = true;
    }
  }

  // ควบคุมฮาร์ดแวร์ Relay พ่นหมอก
  if (!isMistRunning) {
    bool desiredMist = blynkMistRequest;
    if (desiredMist != lastMistOutputState) {
      lastMistOutputState = desiredMist;
      if (desiredMist) {
        digitalWrite(mistLed,       ON);
        digitalWrite(mistStatusLed, LOW);
      } else {
        digitalWrite(mistLed,       OFF);
        digitalWrite(mistStatusLed, HIGH);
      }
      needsDashboardSync = true;
    }
  }
}

// =====================================================================
// [ส่วนที่ 4.1] พ่นข้อมูลออกหน้าจอคอมพิวเตอร์ (รันทุกๆ 1 วินาทีสดๆ)
// =====================================================================
void printToSerial(DateTime now, float temp, float hum, int soilValue) {
  if (millis() - lastSerialPrint >= serialPrintInterval) {
    lastSerialPrint = millis();

    int soilPercent = map(soilValue, 0, 4095, 100, 0);
    soilPercent     = constrain(soilPercent, 0, 100);

    Serial.println("[LIVE MONITOR 1s]");
    if (isRtcWorking) {
      char timeBuffer[16];
      sprintf(timeBuffer, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());
      Serial.print("Time: "); Serial.println(timeBuffer);
    } else {
      Serial.println("Time: [RTC ERROR - Fallback active]");
    }
    Serial.print("Temp: ");  Serial.print(temp, 1);  Serial.print(" C | ");
    Serial.print("Hum: ");   Serial.print(hum, 1);   Serial.print(" % | ");
    Serial.print("Soil Raw: "); Serial.print(soilValue);
    Serial.print(" (");      Serial.print(soilPercent); Serial.println("%)");
    Serial.print("DHT Status: "); Serial.println(dhtError ? "ERROR" : "OK");
    Serial.print("RTC Status: "); Serial.println(isRtcWorking ? "OK" : "ERROR");
    Serial.println("------------------------------------");
  }
}

// =====================================================================
// [ส่วนที่ 4.2] รวบรวมข้อมูลแพ็กลงกล่อง JSON และส่งขึ้นคลาวด์ทีเดียว (Batch Sync & Eco Mode)
// =====================================================================
void syncDashboardState(DateTime now, float temp, float hum, int soilValue, bool periodic) {
  FirebaseJson json;
  bool hasChanges = false;
  unsigned long currentTime = millis();
  
  // กฎของ Eco Mode: บังคับอัปเดตข้อมูลทุกค่าเมื่อเวลาผ่านไป 1 ชั่วโมง (3600000 ms) เพื่อ Keep-Alive
  bool forceSync = (currentTime - lastBatchSyncTime >= forceSyncInterval) || isFirstBootSync;

  int soilPercent = map(soilValue, 0, 4095, 100, 0);
  soilPercent     = constrain(soilPercent, 0, 100);

  // 1. ตรวจสอบและรวบรวมสถานะของหน้าเว็บสวิตช์และสถานะไฟแอลอีดีแบบเรียลไทม์
  int v1_val  = isWateringRunning ? 0 : (blynkWaterRequest ? 1 : 0);
  int v2_val  = isMistRunning ? 0 : (blynkMistRequest ? 1 : 0);
  int v15_val = (isWateringRunning || blynkWaterRequest) ? 1 : 0;
  int v16_val = (isMistRunning || blynkMistRequest) ? 1 : 0;

  // ตรวจสอบการเปลี่ยนแปลงของสวิตช์/สถานะ หากมีการกดสวิตช์ถึงจะอัปเดตลง JSON
  if (v1_val != lastSentV1 || forceSync)   { json.set("V1", v1_val);   lastSentV1 = v1_val;   hasChanges = true; }
  if (v2_val != lastSentV2 || forceSync)   { json.set("V2", v2_val);   lastSentV2 = v2_val;   hasChanges = true; }
  if (v15_val != lastSentV15 || forceSync) { json.set("V15", v15_val); lastSentV15 = v15_val; hasChanges = true; }
  if (v16_val != lastSentV16 || forceSync) { json.set("V16", v16_val); lastSentV16 = v16_val; hasChanges = true; }

  // 2. แนบค่าตัวเลขเซ็นเซอร์และเวลาลงแพ็กเกจ (ใช้หลักการ Eco Mode)
  if (periodic || forceSync) {
    if (!dhtError) {
      // ตรวจสอบการเปลี่ยนแปลงของค่าทศนิยม อ้างอิงจากไลบรารีคือ ค่าต้องต่างกัน >= 0.1
      if (abs(temp - lastSentTemp) >= 0.1 || forceSync) {
        json.set("V11", temp);
        lastSentTemp = temp;
        hasChanges = true;
      }
      if (abs(hum - lastSentHum) >= 0.1 || forceSync) {
        json.set("V12", hum);
        lastSentHum = hum;
        hasChanges = true;
      }
    }
    
    // สำหรับค่าจำนวนเต็ม (ดิน) ตรวจสอบการเปลี่ยนแปลงที่ >= 1
    if (abs(soilPercent - lastSentSoil) >= 1 || forceSync) {
      json.set("V13", soilPercent);
      lastSentSoil = soilPercent;
      hasChanges = true;
    }
    
    // หากมีเซ็นเซอร์ตัวใดตัวหนึ่งเปลี่ยนแปลง หรือครบรอบ 1 ชั่วโมง ให้แนบสถานะและเวลาล่าสุดไปด้วย
    if (hasChanges || forceSync) {
      json.set("V20", dhtError ? 1 : 0);

      if (isRtcWorking) {
        char timeBlynkBuffer[20];
        sprintf(timeBlynkBuffer, "%02d:%02d:%02d น.", now.hour(), now.minute(), now.second());
        json.set("V14", timeBlynkBuffer);
      } else {
        json.set("V14", "RTC Error");
      }
    }
  }

  // ส่ง JSON ก้อนใหญ่เมื่อ "มีการเปลี่ยนแปลงเท่านั้น" หรือครบรอบ 1 ชั่วโมง (ประหยัด Data Traffic ได้มหาศาล)
  if (hasChanges || forceSync) {
    String path = "/projects/" + String(DEVICE_ID) + "/pins";
    Firebase.RTDB.updateNode(&fbdo_batch, path.c_str(), &json); 
    lastBatchSyncTime = currentTime;
  }

  // 3. บันทึกประวัติลงกราฟความถี่ต่ำ (ทุกๆ 2 นาที)
  // หมายเหตุ: ฟังก์ชัน Cloud.logHistory() มีการทำงานร่วมกับระบบ _ecoMode ในตัวไลบรารีอยู่แล้วครับ 
  if (periodic) {
    if (!dhtError) {
      Cloud.logHistory("V11", temp);
      Cloud.logHistory("V12", hum);
    }
    Cloud.logHistory("V13", soilPercent);
    Serial.println(">> SUCCESS: Cloud Batch Synced & Historical Graphs Tracked!");
  }
}
