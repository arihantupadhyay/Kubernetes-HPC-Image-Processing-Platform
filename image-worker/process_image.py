
import sys
import os
import json
import time
from PIL import Image, ImageFilter, ImageEnhance

image_path = sys.argv[1]
filename = sys.argv[2]
operation = sys.argv[3] if len(sys.argv) > 3 else "resize"

output_dir = os.environ.get("OUTPUT_DIR", "processed")
os.makedirs(output_dir, exist_ok=True)

output_path = os.path.join(output_dir, filename)

start_time = time.perf_counter()

input_size = os.path.getsize(image_path)

with Image.open(image_path) as original:
    original.load()

    input_width, input_height = original.size
    input_format = original.format

    image = original.convert("RGB")

if operation == "resize":
    image.thumbnail((800, 800))

elif operation == "grayscale":
    image = image.convert("L").convert("RGB")

elif operation == "blur":
    image = image.filter(ImageFilter.GaussianBlur(radius=5))

elif operation == "sharpen":
    image = image.filter(ImageFilter.SHARPEN)
    image = ImageEnhance.Sharpness(image).enhance(2)

else:
    raise ValueError(f"Unsupported operation: {operation}")

image.save(output_path, quality=90)

processing_time = round(time.perf_counter() - start_time, 4)

output_width, output_height = image.size
output_size = os.path.getsize(output_path)

metrics = {
    "success": True,
    "filename": filename,
    "operation": operation,
    "input": {
        "width": input_width,
        "height": input_height,
        "format": input_format,
        "sizeBytes": input_size
    },
    "output": {
        "width": output_width,
        "height": output_height,
        "sizeBytes": output_size
    },
    "processingTimeSeconds": processing_time,
    "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
}

print(json.dumps(metrics))
