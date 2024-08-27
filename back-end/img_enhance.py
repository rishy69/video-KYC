import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import cv2
import numpy as np

# Load the image

def enhance(img_path):
    img = mpimg.imread(img_path)

    # Apply a sharpening filter
    # Define a sharpening kernel
    sharpening_kernel = np.array([
        [0, -1, 0],
        [-1, 5.2, -1],
        [0, -1, 0]
    ])

    # Apply the sharpening filter
    sharpened_img = cv2.filter2D(img, -1, sharpening_kernel)

    # Save the sharpened image directly to a file
    plt.imsave(img_path, sharpened_img, cmap='gray')
