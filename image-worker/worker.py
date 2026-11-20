
import sys
import os
from PIL import Image, ImageFilter, ImageEnhance

image_path = sys.argv[1]
filename = sys.argv[2]
operation = sys.argv[3] if len(sys.argv) > 3 else "resize"

output_dir = os.environ.get("OUTPUT_DIR", "/app/uploads/processed")
os.makedirs(output_dir, exist_ok=True)

image = Image.open(image_path).convert("RGB")

if operation == "resize":
    image.thumbnail((800, 800))

elif operation == "grayscale":
    image = image.convert("L").convert("RGB")

elif operation == "blur":
    image = image.filter(ImageFilter.GaussianBlur(radius=5))

elif operation == "sharpen":
    image = image.filter(ImageFilter.SHARPEN)
    image = ImageEnhance.Sharpness(image).enhance(2)

output_path = os.path.join(output_dir, filename)
image.save(output_path, quality=90)

print(f"Successfully processed {filename} using {operation}")
