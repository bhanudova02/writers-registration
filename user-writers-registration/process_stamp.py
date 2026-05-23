from PIL import Image, ImageDraw

# Open the image
img = Image.open('/home/mr-bhanu/.gemini/antigravity/brain/3afa1069-9ae1-473e-a1c1-71de6ffa103e/media__1779502635409.png').convert("RGBA")
width, height = img.size

# The center text is roughly in the middle, we can draw a white ellipse over it.
# Let's calculate the bounding box for the center area.
# Assuming the text is in the center 40% of the image.
cx, cy = width / 2, height / 2
radius = width * 0.22  # adjust this to cover the text but not the inner circle border

draw = ImageDraw.Draw(img)
draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(255, 255, 255, 255))

# Save to public folder
img.save('/home/mr-bhanu/Mr_Bhanu/Projects/Freelancing Projects/MovieScriptProject/writers-registration/user-writers-registration/public/stamp.png')
print("Saved to public/stamp.png")
