#include <HX711.h>

/**
 * EggTrack Finalized ESP32 Serial Firmware
 * This code reads the HX711 scale and prints values to Serial 
 * in the format the Python IoT Bridge expects.
 */

// HX711 Pin Definitions
#define DT 4
#define SCK 5

HX711 scale;

// Calibration factor - tune this for your specific load cell!
float calibration_factor = 1250; 

void setup() {
  Serial.begin(115200);
  
  // Initialize scale
  scale.begin(DT, SCK);
  
  // Delay for sensor stability
  Serial.println("[SYSTEM] Stabilizing...");
  delay(2000); 
  
  scale.set_scale(calibration_factor);
  scale.tare(); // Zero the scale
  
  Serial.println("Egg Weight Measurement System Ready");
}

void loop() {
  // Get average of 10 readings for stability
  float weight = scale.get_units(10);

  // Auto-zero correction: Ignore minor sensor drift
  if(weight > -5 && weight < 5) {
    weight = 0;
  }

  // Safety limit for project range
  if(weight > 1000) {
    weight = 1000;
  }

  // CRITICAL: Output format for Python bridge
  Serial.print("Weight: ");
  Serial.print(weight, 1); // 1 decimal place
  Serial.println(" g");

  // Loop delay (500ms)
  delay(500);
}
