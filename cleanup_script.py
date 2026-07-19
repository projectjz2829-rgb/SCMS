import os
import shutil

# Target directory is the current directory (project root)
root_dir = r"c:\Users\moham\OneDrive\Desktop\project\SCMS\SCMS-main"

files_to_delete = [
    "check_imports.py",
    "append_js.py",
    "download_assets.py",
    "test_db.py",
    "deploy_check.bat",
    "powershell.bat",
    "push_fixes.bat",
    "setup.bat",
    "bad",
    "figma-export.zip",
    "design.txt"
]

dirs_to_delete_exact = [
    "frontend_temp",
    "temp",
    "tmp",
    "backup",
    "draft",
    "old",
    "figma_export",
    ".pytest_cache",
    ".mypy_cache",
    ".cache",
    "__pycache__"
]

extensions_to_delete = [
    ".pyc",
    ".pyo",
    ".tmp",
    ".bak",
    ".log"
]

exact_names_to_delete = [
    "Thumbs.db",
    "Desktop.ini",
    ".DS_Store"
]

total_deleted = 0
total_size = 0

deleted_log = []

for dirpath, dirnames, filenames in os.walk(root_dir, topdown=False):
    # Phase 2 & Phase 3 & Phase 4 - Directory cleanup
    for d in dirnames:
        if d in dirs_to_delete_exact or d == "__pycache__":
            full_path = os.path.join(dirpath, d)
            try:
                # get size
                for r, ds, fs in os.walk(full_path):
                    for f in fs:
                        total_size += os.path.getsize(os.path.join(r, f))
                shutil.rmtree(full_path)
                deleted_log.append(f"Deleted Dir: {full_path}")
                total_deleted += 1
            except Exception as e:
                print(f"Failed to delete {full_path}: {e}")
                
    # Phase 1 & 2 - File cleanup
    for f in filenames:
        full_path = os.path.join(dirpath, f)
        
        should_delete = False
        
        # Check explicit root files
        if dirpath == root_dir and f in files_to_delete:
            should_delete = True
            
        # Check extensions
        if any(f.endswith(ext) for ext in extensions_to_delete):
            should_delete = True
            
        # Check exact names
        if f in exact_names_to_delete:
            should_delete = True
            
        if should_delete:
            try:
                total_size += os.path.getsize(full_path)
                os.remove(full_path)
                deleted_log.append(f"Deleted File: {full_path}")
                total_deleted += 1
            except Exception as e:
                print(f"Failed to delete {full_path}: {e}")

# Write log report
with open(os.path.join(root_dir, "cleanup_report.txt"), "w") as report:
    report.write(f"--- Cleanup Report ---\n")
    report.write(f"Total Files/Folders Deleted: {total_deleted}\n")
    report.write(f"Total Space Saved: {total_size / (1024 * 1024):.2f} MB\n\n")
    for log in deleted_log:
        report.write(log + "\n")

print(f"Cleanup completed. Deleted {total_deleted} items, saved {total_size / (1024 * 1024):.2f} MB.")
print("Check cleanup_report.txt for details.")
