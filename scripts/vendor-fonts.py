"""Vendor the reader's existing Google Fonts and their OFL notices.

Uses the same families, weights and styles as the original app. Font files
are served locally so a complete offline installation needs no external CDN.
"""
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/fonts'
CSS_URL = 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&family=Jomolhari&display=swap'
LICENSES = {
    'EB-Garamond': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/OFL.txt',
    'Inter': 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt',
    'Jomolhari': 'https://raw.githubusercontent.com/google/fonts/main/ofl/jomolhari/OFL.txt',
}


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'})
    with urllib.request.urlopen(request, timeout=40) as response:
        return response.read()


DEST.mkdir(parents=True, exist_ok=True)
css = fetch(CSS_URL).decode()
downloaded = {}
for i, block in enumerate(re.findall(r'@font-face\s*\{[^}]+\}', css)):
    family = re.search(r"font-family: '([^']+)'", block).group(1).replace(' ', '-')
    weight = re.search(r'font-weight: ([^;]+)', block).group(1)
    style = re.search(r'font-style: ([^;]+)', block).group(1)
    url = re.search(r'url\(([^)]+)\)', block).group(1)
    if url in downloaded:
        continue
    extension = 'woff2' if '.woff2' in url else 'ttf'
    name = f'{family}-{style}-{len(downloaded)}.{extension}'
    downloaded[url] = name
    (DEST / name).write_bytes(fetch(url))
    css = css.replace(url, name)
    print(name, (DEST / name).stat().st_size)
for family, url in LICENSES.items():
    (DEST / (family + '-OFL.txt')).write_bytes(fetch(url))
(DEST / 'fonts.css').write_text('/* Vendored from Google Fonts; see the accompanying OFL notices. */\n' + css)
for file in [*DEST.glob('*.ttf'), *DEST.glob('*.woff2')]:
    if file.name not in downloaded.values():
        file.unlink()
