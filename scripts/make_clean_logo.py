import os
from PIL import Image, ImageDraw, ImageOps

source_path = r'C:\Users\FERDY\.gemini\antigravity-ide\brain\935ecda0-3a77-4b66-ae67-f51608050846\catatkas_isolated_logo_1787203473994.jpg'
out_dir = r'd:\expoproject\assets\images'
dist_dir = r'd:\expoproject\dist'

img = Image.open(source_path).convert('RGB')
w, h = img.size

# Crop out the outer white margins to get only the green logo area
# The green squircle is roughly in [0.20*w, 0.20*h, 0.80*w, 0.80*h]
# Let's crop with precision
crop_box = (int(w * 0.205), int(h * 0.205), int(w * 0.795), int(h * 0.795))
cropped = img.crop(crop_box)

# Now resize to high-res 1024x1024 full bleed
final_logo = cropped.resize((1024, 1024), Image.Resampling.LANCZOS)

# Also create a pure solid emerald background with centered emblem
# Emerald color: #059669 (RGB: 5, 150, 105)
solid_icon = Image.new('RGB', (1024, 1024), (5, 150, 105))
# Place cropped content cleanly in the middle if needed, or use full-bleed final_logo
final_logo.save(os.path.join(out_dir, 'icon.png'), 'PNG')
final_logo.save(os.path.join(out_dir, 'android-icon-foreground.png'), 'PNG')
final_logo.save(os.path.join(out_dir, 'favicon.png'), 'PNG')
final_logo.save(os.path.join(out_dir, 'splash-icon.png'), 'PNG')

# Save to dist
final_logo.save(os.path.join(dist_dir, 'icon.png'), 'PNG')
final_logo.save(os.path.join(dist_dir, 'splash-icon.png'), 'PNG')

# Also generate favicon.ico
fav = final_logo.resize((64, 64), Image.Resampling.LANCZOS)
fav.save(os.path.join(dist_dir, 'favicon.ico'), 'ICO')

print("Clean 100% full bleed logo generated without white background!")
