import os
from bs4 import BeautifulSoup

source_dir = './crime-stats-clone'
kiwi_domain = "https://www.crimestats.co.nz"

# Define your text replacements
replacements = {
    "New Zealand": "Australia",
    "NZ": "AU",
    "Auckland": "Sydney",
    "Wellington": "Canberra"
}

for root, dirs, files in os.walk(source_dir):
    for file in files:
        if file.endswith(".html"):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f, 'html.parser')

            # 1. Convert Relative Asset Paths to Absolute
            # Targets: img (src), link (href), script (src), a (href)
            for tag in soup.find_all(['img', 'script', 'link', 'a']):
                attr = 'src' if tag.name in ['img', 'script'] else 'href'
                url = tag.get(attr)
                
                if url and not url.startswith(('http', '//', 'mailto:', 'tel:')):
                    # Prepend the original Kiwi domain to make it an absolute path
                    tag[attr] = f"{kiwi_domain}/{url.lstrip('/')}"

            # 2. Replace Human-Readable Text
            # We target the 'string' attribute of tags to avoid breaking HTML structure
            for element in soup.find_all(string=True):
                new_text = element
                for nz, au in replacements.items():
                    new_text = new_text.replace(nz, au)
                element.replace_with(new_text)

            with open(path, 'w', encoding='utf-8') as f:
                f.write(str(soup))