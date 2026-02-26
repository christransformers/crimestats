import os

# The domain you are pulling assets FROM
remote_base = "https://www.data.gov.au"

for root, dirs, files in os.walk("."):
    for file in files:
        if file.endswith(".html"):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Fix 1: Ensure all /themes/ or /sites/ paths go to the remote site
            content = content.replace('src="/', f'src="{remote_base}/')
            content = content.replace('href="/', f'href="{remote_base}/')
            
            # Fix 2: Clean up any double slashes created (e.g., https://site.com//themes)
            content = content.replace(f'{remote_base}//', f'{remote_base}/')

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
print("Path conversion complete.")