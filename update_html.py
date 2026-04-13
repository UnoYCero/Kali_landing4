import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace <video ... .mov ...></video> with <img ... .jpg ...>
def replacer(match):
    full_match = match.group(0)
    # Extract the file name
    src_match = re.search(r'src="([^"]+\.mov)"', full_match)
    if not src_match:
        return full_match
    
    src = src_match.group(1).replace('.mov', '.jpg')
    # Extract style if present
    style_match = re.search(r'style="([^"]+)"', full_match)
    style = f' style="{style_match.group(1)}"' if style_match else ''
    
    return f'<img src="{src}" alt=""{style} />'

html = re.sub(r'<video[^>]+src="[^"]+\.mov"[^>]*>(\s*</video>)?', replacer, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html")
