import random
import time
import requests

# ---- Firebase URL ----
FIREBASE_URL = "https://hydrsense-default-rtdb.asia-southeast1.firebasedatabase.app/loraData.json?auth=AIzaSyD3t1XScGrfq7zZJm2j3mqTe9tsPIrPEPw"

# ---- Function to simulate GPS ----
def generate_fake_gps():
    # Random Lat, Lon around Chennai (or adjust)
    lat = random.uniform(12.9000, 13.2000)
    lon = random.uniform(80.1000, 80.3000)
    return round(lat, 6), round(lon, 6)

# ---- Function to simulate Bluetooth typing ----
def generate_fake_bluetooth_message():
    fake_messages = [
        "Start_Pump",
        "Stop_Pump",
        "Low_Battery",
        "Emergency_Stop",
        "Manual_Check",
        "Valve_Open",
        "Valve_Close",
        "Reset_System",
        "Ping",
        "Activate_Sensor"
    ]
    return random.choice(fake_messages)

# ---- Function to send data to Firebase ----
def send_to_firebase(message):
    json_data = {
        "message": message
    }
    try:
        response = requests.put(FIREBASE_URL, json=json_data)
        if response.status_code == 200:
            print(f"✅ Uploaded to Firebase: {message}")
        else:
            print(f"❌ Upload failed. Status code: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Error sending to Firebase: {e}")

# ---- Main Simulation Loop ----
def main():
    print("🚀 Starting LoRa GPS + Bluetooth Sender Simulation...")

    while True:
        # Simulate GPS Update
        lat, lon = generate_fake_gps()

        # Simulate Bluetooth typed message
        typed_message = generate_fake_bluetooth_message()

        # Final combined message
        combined_message = f"Lat: {lat}, Lon: {lon} | Msg: {typed_message}"

        # Simulate LoRa sending (actually sending to Firebase)
        send_to_firebase(combined_message)

        # Wait for 2 seconds (similar to Arduino delay(2000))
        time.sleep(2)

if __name__ == "__main__":
    main()
