import sys
import json
import cv2
import numpy as np

def analyze_image(image_path):
    try:
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")

        # 1. Blur Detection (Variance of Laplacian)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        # 2. Brightness Analysis (Average V channel in HSV)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        brightness = np.mean(hsv[:, :, 2])

        result = {
            "blur_score": round(float(laplacian_var), 2),
            "brightness_score": round(float(brightness), 2)
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}), file=sys.stderr)
        sys.exit(1)
    
    analyze_image(sys.argv[1])
