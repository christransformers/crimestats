import os

target_dir = './cloned-site'
original_domain = 'https://www.data.gov.au'
new_brand = 'nationalcrimestats.com.au'

for root, dirs, files in os.walk(target_dir):
    for file in files:
        if file.endswith(".html"):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Convert relative assets to absolute
            # Example: src="/themes/..." -> src="https://www.data.gov.au/themes/..."
            content = content.replace('src="/', f'src="{original_domain}/')
            content = content.replace('href="/', f'href="{original_domain}/')

            # Global Branding Swap
            content = content.replace('data.gov.au', new_brand)
            content = content.replace('Australian Government', 'Opsecai')

            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
