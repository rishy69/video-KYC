from retinaface import RetinaFace
from PIL import Image
from pprint import pprint
import os
from deepface import DeepFace

def cut_user(pp):

    
    resp = RetinaFace.detect_faces(pp)
    print("Detected")
    # pprint(resp)
    face_coor = []
    image = Image.open(pp)
    for i in range(1, len(resp) + 1):
        face_coor.append(resp[f"face_{i}"]["facial_area"])

        y1 = face_coor[i - 1][1]
        x1 = face_coor[i - 1][0]
        y2 = face_coor[i - 1][3]
        x2 = face_coor[i - 1][2]
        cropped_image = image.crop((x1, y1, x2, y2))
        kok = len(os.listdir("id"))
        print(kok)
        print((x1, y1, x2, y2))
        cropped_image.save(f"id/{kok+1}.jpg")
        print("HARI IS GAY ASF")


def compare_id_and_face(f1, f2):
    print(f"{f1}\n{f2}")
    backends = ["opencv", "ssd", "mtcnn", "retinaface", "mediapipe"]
    models = [
        "VGG-Face",
        "OpenFace",
        "Facenet",
        "DeepID",
        "DeepFace",
        "ArcFace",
    ]
    metrics = ["cosine", "euclidean", "euclidean_l2"]

    result = DeepFace.verify(
        img1_path=f1,
        img2_path=f2,
        detector_backend=backends[2],
        model_name=models[-1],
        enforce_detection=False,
        distance_metric=metrics[-1],
    )
    pprint(result)
    return result["verified"]


