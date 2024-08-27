from deepface import DeepFace
from pprint import pprint


def check_face(f1, f2):
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
    pprint(type(result['verified']))
    return result["verified"]


