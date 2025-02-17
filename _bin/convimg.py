#!/usr/bin/env python3

from PIL import Image
import numpy as np
import os
import cv2
import json
import sys


def get_brightness(color):
    """Calculate perceived brightness of a color using ITU-R BT.709 coefficients"""
    return 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]

PALETTES = {
    "GameBoy": [[15, 56, 15], [155, 188, 15], [139, 172, 15], [48, 98, 48]]
}

class PaletteConverter:
    def __init__(self, palette_name):
        self.palette = np.array(PALETTES[palette_name])

        # Sort palette by brightness
        brightnesses = [get_brightness(color) for color in self.palette]
        sorted_indices = np.argsort(brightnesses)
        self.palette = self.palette[sorted_indices]

        # Store palette brightness range
        self.palette_min_brightness = min(brightnesses)
        self.palette_max_brightness = max(brightnesses)

    def preprocess_image(self, img_array):
        """Optimize image contrast and brightness distribution"""
        # Convert to float for processing
        img_float = img_array.astype(float)

        # Calculate current image statistics
        img_brightnesses = np.array(
            [get_brightness(pixel) for pixel in img_float.reshape(-1, 3)]
        )
        current_min = np.min(img_brightnesses)
        current_max = np.max(img_brightnesses)

        # Compute target range based on palette
        target_range = self.palette_max_brightness - self.palette_min_brightness
        current_range = current_max - current_min

        # Apply contrast stretch to match palette range
        img_adjusted = np.zeros_like(img_float)
        for c in range(3):  # For each color channel
            channel = img_float[:, :, c]
            # Stretch to full range first
            channel_stretched = (
                (channel - np.min(channel)) / (np.max(channel) - np.min(channel)) * 255
            )
            # Then adjust to match palette range
            channel_adjusted = (
                channel_stretched * (target_range / 255.0) + self.palette_min_brightness
            )
            img_adjusted[:, :, c] = channel_adjusted

        # Apply adaptive histogram equalization for better local contrast
        img_lab = cv2.cvtColor(img_adjusted.astype(np.uint8), cv2.COLOR_RGB2LAB)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img_lab[:, :, 0] = clahe.apply(img_lab[:, :, 0])
        img_adjusted = cv2.cvtColor(img_lab, cv2.COLOR_LAB2RGB)

        # Ensure values are in valid range
        return np.clip(img_adjusted, 0, 255)

    def convert_without_dithering(self, image_path, output_path, size):
        """Convert image to use only palette colors without dithering"""
        # Load and convert image to numpy array
        img = Image.open(image_path)
        img_array = np.array(img)
        img_array = cv2.resize(img_array, (size, size))

        # Preprocess the image
        preprocessed = self.preprocess_image(img_array)

        # Reshape to 2D array of pixels
        height, width = preprocessed.shape[:2]
        pixels = preprocessed.reshape(-1, 3)

        # Sort input image colors by brightness
        img_brightnesses = np.array([get_brightness(pixel) for pixel in pixels])
        brightness_percentiles = np.percentile(img_brightnesses, [0, 33, 66, 100])

        # Create mapping between brightness ranges and palette colors
        def map_to_palette(pixel):
            brightness = get_brightness(pixel)
            if brightness <= brightness_percentiles[1]:
                return self.palette[0]
            elif brightness <= brightness_percentiles[2]:
                return self.palette[1]
            elif brightness <= brightness_percentiles[3]:
                return self.palette[2]
            else:
                return self.palette[3]

        # Apply mapping to each pixel
        converted_pixels = np.array([map_to_palette(pixel) for pixel in pixels])

        # Reshape back to image dimensions
        converted_image = converted_pixels.reshape(height, width, 3)

        # Save result
        Image.fromarray(converted_image.astype(np.uint8)).save(output_path, optimize=True, quality=85)

def main(config_file):
    with open(config_file, "r") as cf:
        converter = PaletteConverter("GameBoy")
        objects = json.load(cf)
        for obj in objects:
            img_filename = obj["img"]
            path = os.path.split(os.path.dirname(img_filename))[0]
            basename = os.path.basename(img_filename)
            filename = os.path.splitext(basename)[0]
            src = os.path.join("..", path, filename + ".jpg")
            dst = os.path.join("..", os.path.dirname(img_filename), filename + ".png")
            print(f"""Processing {src} -> {dst} ... """)
            converter.convert_without_dithering(src, dst, 128)


if __name__ == "__main__":
    main(sys.argv[1])
