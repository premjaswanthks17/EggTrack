/**
 * EggTrack Finalized ESP32 Firmware
 * Standalone WiFi Scale with Direct Supabase Integration
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <HX711.h>
#include <ArduinoJson.h>

// ── USER CONFIGURATION ───────────────────────────────────
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* supabase_url = "https://wbjdzjjjtwtvbyhrpzyd.supabase.co/rest/v1/egg_readings";
const char* supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiamR6ampqdHd0dmJ5aHJwenlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDAwMTksImV4cCI6MjA4ODcxNjAxOX0.4jrxBn18aYUFed7JL58rmnVWeSMHCx16RtOQBQGmLfE";

#define DT 4
#define SCK 5
// ───────────────────────────────────────────────────────

HX711 scale;
float calibration_factor = 1250; // Tune this value!
float last_sent_weight = -99.0;
unsigned long last_send_time = 0;
const int send_cooldown = 3000; // 3 seconds between saves

void setup() {
  Serial.begin(115200);
  
  // Initialize Scale
  scale.begin(DT, SCK);
  scale.set_scale(calibration_factor);
  Serial.println("\n[SYSTEM] Stabilizing...");
  delay(1000);
  scale.tare();
  Serial.println("[SYSTEM] Scale Ready.");

  // Connect WiFi
  WiFi.begin(ssid, password);
  Serial.print("[WIFI] Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WIFI] Connected! IP: " + WiFi.localIP().toString());
}

String classify(float weight) {
  if (weight < 45) return "powder";
  if (weight < 55) return "market";
  return "retail";
}

void sendToSupabase(float weight, String grade) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(supabase_url);
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", "Bearer " + String(supabase_key));
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<200> doc;
  doc["weight_grams"] = weight;
  doc["grade"] = grade;
  doc["source"] = "esp32_wifi";
  doc["egg_count"] = 1;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    Serial.printf("[CLOUD] Saved: %.1fg | %s (Code: %d)\n", weight, grade.c_str(), httpResponseCode);
  } else {
    Serial.printf("[CLOUD] Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

void loop() {
  float weight = scale.get_units(10);

  // Auto-zero drift suppression
  if (weight > -3 && weight < 3) weight = 0;

  if (weight > 5) { // Egg detected
    String grade = classify(weight);
    Serial.printf("[SCALE] Detected %.1fg -> %s\n", weight, grade.c_str());

    bool weight_changed = abs(weight - last_sent_weight) > 2.0;
    bool cooldown_passed = (millis() - last_send_time) > send_cooldown;

    if (weight_changed && cooldown_passed) {
      sendToSupabase(weight, grade);
      last_sent_weight = weight;
      last_send_time = millis();
    }
  } else {
    if (last_sent_weight > 0) {
      Serial.println("[SCALE] Clear.");
      last_sent_weight = -99.0; // Reset for next detection
    }
  }

  delay(500);
}
