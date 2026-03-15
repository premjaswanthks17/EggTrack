#include <HX711.h>
#define DT 4
#define SCK 5

HX711 scale;

// Note: You may need to tune this number for your specific load cell!
// Common values are between 100 and 2000.
float calibration_factor = 1250; 

void setup() {
  Serial.begin(115200);
  scale.begin(DT, SCK);
  
  Serial.println("Stabilizing scale...");
  delay(2000); // Wait 2 seconds for the HX711 chip to stabilize when powered on
  
  scale.set_scale(calibration_factor);
  scale.tare(); // Set the scale to 0 AFTER stabilizing
  Serial.println("Egg Weight Measurement System Ready");
}

void loop() {
  // Get an average of 10 readings to smooth out any electrical noise
  float weight = scale.get_units(10);

  // Auto zero correction - ignore drift when scale is empty
  if(weight > -5 && weight < 5)
  {
    weight = 0;
  }
  
  // Limit to project range
  if(weight > 1000)
  {
    weight = 1000;
  }

  // Print exact format that Python script expects
  Serial.print("Weight: ");
  Serial.print(weight, 1);
  Serial.println(" g");
  
  delay(500);
}
