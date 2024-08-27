import threading
from time import sleep


class VideoReciever:
    def __init__(self):
        self.running = False
        self.thread = None

    def recieve_frames(self, frame_data):
        if frame_data is not None and os.path.exists("imgs") and os.path.isdir("imgs"):
                img_data = base64.b64decode(frame_data.split(',')[1])
                img = Image.open(io.BytesIO(img_data))
                img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
                vv = len(os.listdir("imgs"))
                new_path = f"imgs/{vv}.jpg"
                cv2.imwrite(new_path, img)
                
                # Update the latest frame
                latest_frame = img
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

