import cv2
import os
import glob

files = glob.glob('assets/img/*.mov')
for f in files:
    cap = cv2.VideoCapture(f)
    if not cap.isOpened():
        print("Failed to open", f)
        continue
    
    # Read the first frame
    ret, frame = cap.read()
    if ret:
        output_name = f.replace('.mov', '.jpg')
        cv2.imwrite(output_name, frame)
        print(f"Saved {output_name}")
    else:
        print("Failed to read frame from", f)
    
    cap.release()
