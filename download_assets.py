#!/usr/bin/env python3
"""
download_assets.py
Helper script to download Bootstrap and Bootstrap Icons CSS/JS/fonts
locally for offline support to fix character boxes [ ] rendering issues.
"""

import os
import urllib.request
import urllib.error

# Asset configuration mapping: URL -> Local Destination Path
ASSETS = {
    # Bootstrap 5.3 CSS & JS
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css": 
        os.path.join("frontend", "static", "css", "bootstrap.min.css"),
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js": 
        os.path.join("frontend", "static", "js", "bootstrap.bundle.min.js"),
        
    # Bootstrap Icons CSS & Fonts
    "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css": 
        os.path.join("frontend", "static", "css", "bootstrap-icons.css"),
    "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2": 
        os.path.join("frontend", "static", "css", "fonts", "bootstrap-icons.woff2"),
    "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff": 
        os.path.join("frontend", "static", "css", "fonts", "bootstrap-icons.woff"),

    # Chart.js 4.5.0 (used by admin/faculty/student dashboards for charts)
    "https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js":
        os.path.join("frontend", "static", "js", "chart.umd.min.js")
}

def main():
    print("=== SCMS Offline Asset Downloader ===")
    
    # Ensure current working directory has frontend/
    if not os.path.exists("frontend"):
        print("Error: Could not find 'frontend' directory in the current working directory.")
        print("Please run this script from the workspace root (scms/).")
        return
        
    for url, path in ASSETS.items():
        print(f"Downloading: {url} ...")
        # Ensure directories exist
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        try:
            # Add user-agent header to prevent potential CDN blocking
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req) as response:
                data = response.read()
                
            # Write out local file
            with open(path, "wb") as f:
                f.write(data)
            print(f"-> Saved to {path}\n")
            
        except urllib.error.URLError as e:
            print(f"Error downloading {url}: {e.reason}")
        except Exception as e:
            print(f"An unexpected error occurred: {str(e)}")
            
    print("=== Asset Download Completed Successfully ===")
    print("Please make sure you have internet access active while executing this script.")

if __name__ == "__main__":
    main()