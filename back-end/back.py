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
import random
from ai_models import cut_user, compare_id_and_face
from pprint import pprint
from img_enhance import enhance
import base64
import shutil
from time import sleep


class FaceDetector:
    def __init__(self):
        self.running = False
        self.thread = None

    def detect_faces(self):
        global new_path, single_face_flag, one_face_count, correct_images, trying_counter
        while self.running:
            os.makedirs("imgs", exist_ok=True)
            os.makedirs("uploads", exist_ok=True)
            os.makedirs("id", exist_ok=True)
            if os.path.exists(new_path):

                print("__________________________________________________________________", new_path)
                results = model(new_path, classes=[0])  # 0 is the class ID for 'person' in COCO datasetcle 

                # Get the first result (assuming single image input)
                result = results[0]

                # Count the number of detected persons
                num_persons = len(result.boxes)

                if int(num_persons) == 1 and one_face_count <7:
                    single_face_flag = True
                    socketio.emit('face_detection_alert', {'message': 'One face succesfully detected'})
                    one_face_count+=1
                    correct_images.append(new_path)


                if int(num_persons) != 1 and one_face_count <7:
                    single_face_flag = False
                    socketio.emit('face_detection_alert', {'message': 'More than one face detected'})

                if one_face_count >=7:
                    pp = os.listdir("uploads")[-1]
                    id_path = f"uploads/{pp}"
                    # print(f"HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH: {id_path}")
                    # cut_user(id_path)
                    face_path = random.choice(correct_images)
                    socketio.emit('face_detection_alert', {'message': 'Hold on We are processing......'})

                    id_cut_path = os.listdir("id")[-1]
                    if os.path.exists(f"id/{id_cut_path}"):
                        pass
                    else:
                        sleep(0.5)
                    if os.path.exists(face_path):
                        pass
                    else:
                        sleep(0.5)
                    c_fl = compare_id_and_face(f"id/{id_cut_path}", face_path)
                    if c_fl == False:
                        trying_counter+=1
                        socketio.emit('face_detection_alert', {'message': 'FACE DOES NOT MATCH. PLEASE TRY AGAIN'})
                    elif c_fl == True:
                        face_base = encode_image_to_base64(face_path)
                        id_base = encode_image_to_base64(id_path)
                        socketio.emit('face_matched', {'message': 'FACE MATCHED', 'face_id': face_base, 'id_id': id_base})
                        shutil.rmtree("imgs")
                        shutil.rmtree("uploads")
                        shutil.rmtree("id")
                        break
                new_path = ""  # Reset new_path after processing


    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self.detect_faces)
            self.thread.start()

    def stop(self):
        if self.running:
            self.running = False
            if self.thread:
                self.thread.join()  # Wait for the thread to finish
            self.thread = None
    def is_running(self):
        return self.running

face_detector = FaceDetector()
def encode_image_to_base64(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')



app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Load YOLO model
model = YOLO('yolov8s.pt')

# Global variables
latest_frame = None
new_path = ""
single_face_flag = True
one_face_count = 0
trying_counter = 0
correct_images = []


@socketio.on('video_frame')
def handle_frame(frame_data):
    global latest_frame, new_path

    # Decode the base64 image
    if frame_data is not None and os.path.exists("imgs") and os.path.isdir("imgs"):
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
    os.makedirs("imgs", exist_ok=True)
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("id", exist_ok=True)

    # Decode the base64 image
    socketio.emit('face_detection_alert', {'message': 'Hold on we are processing the ID.'})
    img_data_id = base64.b64decode(image_data.split(',')[1])
    img_id = Image.open(io.BytesIO(img_data_id))
    img_id = cv2.cvtColor(np.array(img_id), cv2.COLOR_RGB2BGR)
    vv_id = len(os.listdir("uploads"))
    new_path_id = f"uploads/{vv_id}.jpg"
    cv2.imwrite(new_path_id, img_id)
    
    print(f"Image saved: {new_path_id}")
    pp = os.listdir("uploads")[-1]
    id_path = f"uploads/{pp}"
    print(f"HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH: {id_path}")
    if face_detector.is_running():
        face_detector.stop()
    cut_user(id_path)
    socketio.emit('face_detection_alert', {'message': 'done'})
    face_detector.start()

if __name__ == '__main__':
    # Ensure necessary directories exist
    os.makedirs("imgs", exist_ok=True)
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("id", exist_ok=True)

    

    # Run the Flask-SocketIO app
    socketio.run(app, debug=True, use_reloader=False, port=5000)