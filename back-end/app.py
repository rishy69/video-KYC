from flask import Flask, request
from flask_socketio import SocketIO
import cv2
import numpy as np
from PIL import Image
import io
import base64
from ultralytics import YOLO
import threading
import os

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Load YOLO model
model = YOLO('yolov8s.pt')

# Global variables
latest_frame = None
new_path = ""

@socketio.on('video_frame')
def handle_frame(frame_data):
    global latest_frame, new_path
    # Decode the base64 image
    img_data = base64.b64decode(frame_data.split(',')[1])
    img = Image.open(io.BytesIO(img_data))
    img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    vv = len(os.listdir("imgs"))
    new_path = f"imgs/{vv}.jpg"
    cv2.imwrite(new_path, img)
    
    # Update the latest frame
    latest_frame = img

@socketio.on('uploaded_image')
def handle_uploaded_image(image_data):
    global new_path
    # Decode the base64 image
    img_data = base64.b64decode(image_data.split(',')[1])
    img = Image.open(io.BytesIO(img_data))
    img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    vv = len(os.listdir("uploads"))
    new_path = f"uploads/{vv}.jpg"
    cv2.imwrite(new_path, img)
    print(f"Image saved: {new_path}")

def display_stream():
    global latest_frame
    while True:
        if latest_frame is not None:
            cv2.imshow('Live Stream', latest_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    cv2.destroyAllWindows()

def detect_faces():
    global new_path

    while True:
        if new_path != '':
            results = model(new_path, classes=[0])
            new_img = cv2.imread(new_path)
            result = results[0]
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0]
                cv2.rectangle(new_img, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)

            # Save the annotated image
            ll = os.listdir("detected_images")
            detect_path = f"detected_images/{len(ll)}.jpg"
            cv2.imwrite(detect_path, new_img)
            new_path = ""  # Reset new_path after processing

if __name__ == '__main__':
    # Ensure necessary directories exist
    os.makedirs("imgs", exist_ok=True)
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("detected_images", exist_ok=True)

    # Start the display thread
    display_thread = threading.Thread(target=display_stream)
    display_thread.daemon = True
    display_thread.start()

    detect_thread = threading.Thread(target=detect_faces)
    detect_thread.daemon = True
    detect_thread.start()

    # Run the Flask-SocketIO app
    socketio.run(app, debug=True, use_reloader=False, port=5000)