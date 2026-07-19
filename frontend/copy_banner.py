import shutil
import os

source = r"c:\Users\moham\OneDrive\Desktop\project\SCMS\SCMS-main\frontend\public\banner.png"
dest_dir = r"c:\Users\moham\OneDrive\Desktop\project\SCMS\SCMS-main\frontend\src\assets"
dest = os.path.join(dest_dir, "banner.png")

if not os.path.exists(dest_dir):
    os.makedirs(dest_dir)

shutil.copyfile(source, dest)
print("Copied successfully.")
