import serial
import time
import json
import urllib.request
import urllib.error
import sys

# ── CONFIGURATION ─────────────────────────────────────────
SUPABASE_URL = "https://wbjdzjjjtwtvbyhrpzyd.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiamR6ampqdHd0dmJ5aHJwenlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDAwMTksImV4cCI6MjA4ODcxNjAxOX0.4jrxBn18aYUFed7JL58rmnVWeSMHCx16RtOQBQGmLfE"
SERIAL_PORT  = "/dev/cu.usbserial-0001"   
BAUD_RATE    = 115200

# SETTINGS
MIN_CHANGE_THRESHOLD = 2.0 # grams to trigger new save
MIN_SAVE_INTERVAL    = 3.0 # seconds between saves
# ──────────────────────────────────────────────────────────

class EggBridge:
    def __init__(self):
        self.last_sent_weight = -999
        self.last_send_time = 0
        self.ser = None

    def connect(self):
        print(f"🔌 Searching for ESP32 on {SERIAL_PORT}...")
        try:
            self.ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
            time.sleep(2)
            print("✅ Connection Established.\n")
            return True
        except Exception as e:
            print(f"❌ Connection Failed: {e}")
            return False

    def classify(self, weight):
        if weight <= 0:   return "none"
        if weight < 50:   return "market"
        if weight <= 60:  return "retail"
        return "powder"

    def save_data(self, weight, grade):
        url = f"{SUPABASE_URL}/rest/v1/egg_readings"
        payload = {
            "weight_grams": weight,
            "grade": grade,
            "source": "iot_bridge_v2",
            "egg_count": 1
        }
        
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("apikey", SUPABASE_KEY)
        req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
        req.add_header("Prefer", "return=minimal")

        try:
            with urllib.request.urlopen(req, timeout=5) as res:
                timestamp = time.strftime("%H:%M:%S")
                print(f"  [{timestamp}] ✅ CLOUD SYNC — {weight}g | {grade.upper()}")
        except Exception as e:
            print(f"  ⚠️  SYNC ERROR: {e}")

    def run(self):
        if not self.connect():
            return

        print("⚖️  Monitoring Scale... (Ctrl+C to Stop)\n")
        
        while True:
            try:
                line = self.ser.readline().decode("utf-8").strip()
                if not line or "Weight:" not in line:
                    continue

                # Parse: "Weight: 63.3 g"
                try:
                    weight = float(line.split(":")[1].replace("g", "").strip())
                except:
                    continue

                grade = self.classify(weight)
                
                if weight < 2: # Scale empty
                    if self.last_sent_weight != -999:
                        print("⚖️  Scale cleared.")
                        self.last_sent_weight = -999
                    continue

                if grade != "none":
                    # Logic to prevent spamming
                    diff = abs(weight - self.last_sent_weight)
                    wait = time.time() - self.last_send_time
                    
                    if diff > MIN_CHANGE_THRESHOLD and wait > MIN_SAVE_INTERVAL:
                        self.save_data(weight, grade)
                        self.last_sent_weight = weight
                        self.last_send_time = time.time()
                    else:
                        sys.stdout.write(f"\r📦 Current: {weight}g ({grade})       ")
                        sys.stdout.flush()

            except serial.SerialException:
                print("\n❌ Lost Connection. Reconnecting...")
                time.sleep(2)
                self.connect()
            except KeyboardInterrupt:
                print("\n\n🛑 Shutdown initiated.")
                break
            except Exception as e:
                print(f"\n☠️  Fatal Error: {e}")
                break

        if self.ser: self.ser.close()

if __name__ == "__main__":
    bridge = EggBridge()
    bridge.run()
