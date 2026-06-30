import sys
import json
import cv2
import numpy as np
import os

def analyze_image(image_path):
    try:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        brightness = np.mean(hsv[:, :, 2])

        # Plate detection logic
        cropped_plate_path = None
        
        # Bilateral filter to reduce noise while preserving edges
        filtered = cv2.bilateralFilter(gray, 11, 17, 17)
        # Canny edge detection
        edged = cv2.Canny(filtered, 30, 200)
        
        # Find contours
        contours, _ = cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:30]
        
        plate_contour = None
        for c in contours:
            perimeter = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.018 * perimeter, True)
            
            # A rectangular polygon has 4 points
            if len(approx) == 4:
                x, y, w, h = cv2.boundingRect(c)
                aspect_ratio = w / float(h)
                
                # Rectangular aspect ratio constraints (Indian plates)
                if 1.5 <= aspect_ratio <= 6.0 and w > 100:
                    plate_contour = approx
                    break
                    
        if plate_contour is not None:
            x, y, w, h = cv2.boundingRect(plate_contour)
            
            # Add padding (15% horizontally, 10% vertically)
            padding_x = int(w * 0.15)
            padding_y = int(h * 0.10)
            
            y_start = max(0, y - padding_y)
            y_end = min(img.shape[0], y + h + padding_y)
            x_start = max(0, x - padding_x)
            x_end = min(img.shape[1], x + w + padding_x)
            
            cropped = img[y_start:y_end, x_start:x_end]
            
            # Construct output path
            dir_name = os.path.dirname(image_path)
            base_name = os.path.basename(image_path)
            name, ext = os.path.splitext(base_name)
            cropped_name = f"{name}_plate.png"
            cropped_plate_path = os.path.join(dir_name, cropped_name) if dir_name else cropped_name
            
            cv2.imwrite(cropped_plate_path, cropped)

        result = {
            "blur_score": round(float(laplacian_var), 2),
            "brightness_score": round(float(brightness), 2),
            "cropped_plate_path": cropped_plate_path
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
