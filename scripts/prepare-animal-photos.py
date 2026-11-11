"""Import the original 1.png–4.png animal photographs without repainting.
Usage: python scripts/prepare-animal-photos.py /path/to/extracted-1-zip
Requires Pillow. Reviewed silhouette masks are bundled; no model or network needed.
"""
from pathlib import Path
from PIL import Image
import base64, hashlib, io, json, sys, tempfile
from xml.sax.saxutils import escape

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'scripts/animal-photo-manifest.json').read_text())
source_dir = Path(sys.argv[1])
existing_groups = [
    ['cat-standing-gray', 'cat-standing-black', 'cat-standing-tabby', 'cat-standing-white', 'cat-standing-yellow'],
    ['cat-kitten-pink', 'cat-kitten-cream', 'cat-kitten-ginger', 'cat-kitten-black', 'cat-kitten-white'],
]
# Validate originals and masks before changing the live catalog.
for item in manifest:
    source = source_dir / f'{item["sheet"]}.png'
    mask = root / 'scripts/animal-photo-masks' / (item['slug'] + '.png')
    for file, expected in [(source, item['source_sha256']), (mask, item['mask_sha256'])]:
        if hashlib.sha256(file.read_bytes()).hexdigest() != expected:
            raise ValueError(f'Unexpected original or mask: {file}')

with tempfile.TemporaryDirectory(prefix='animal-photos-') as temp:
    outputs = []
    for item in manifest:
        original = Image.open(source_dir / f'{item["sheet"]}.png').convert('RGB').crop(item['rect'])
        mask = Image.open(root / 'scripts/animal-photo-masks' / (item['slug'] + '.png')).convert('L')
        if mask.size != original.size:
            raise ValueError('Mask dimensions differ from the original crop: ' + item['slug'])
        rgba = original.convert('RGBA')
        rgba.putalpha(mask)
        trim = rgba.getbbox()
        if trim is None:
            raise ValueError('Empty silhouette: ' + item['slug'])
        rgba = rgba.crop(trim)
        # RGB comes directly from the photograph. Only transparency and placement change.
        if rgba.convert('RGB').tobytes() != original.crop(trim).tobytes():
            raise ValueError('Source RGB changed: ' + item['slug'])
        png = io.BytesIO(); rgba.save(png, format='PNG', optimize=True)
        data = png.getvalue(); version = hashlib.sha256(data).hexdigest()[:12]
        scale = min(item['maxWidth']/rgba.width, item['maxHeight']/rgba.height)
        w, h = round(rgba.width*scale, 2), round(rgba.height*scale, 2)
        center, bottom = (505, 695) if item['group'] == 'dogs' else (515, 683)
        x, y = round(center-w/2, 2), round(bottom-h, 2)
        left, top = max(0, x-5), max(0, y-5)
        right, lower = min(600, x+w+5), min(720, y+h+5)
        box = ' '.join(str(round(v, 2)) for v in [left, top, right-left, lower-top])
        name = escape(item['name'])
        art = f'<image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,{base64.b64encode(data).decode()}"/>'
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-catalog-order="{item["order"]}" data-asset-version="{version}" data-preview-box="{box}"><title>{name}</title>{art}</svg>\n'
        file = Path(temp) / f'{item["slug"]}__200__{item["name"]}.svg'
        file.write_text(svg); outputs.append(file)
    if len(outputs) != 29:
        raise ValueError('Expected exactly 29 animals')
    # Existing cat images and permanent identifiers stay intact; only display order changes.
    import re
    for group_index, slugs in enumerate(existing_groups):
        for index, slug in enumerate(slugs):
            file = next((root / 'animals').glob(slug + '__*.svg'))
            svg = re.sub(r' data-catalog-order="[^"]*"', '', file.read_text())
            svg = svg.replace('<svg ', f'<svg data-catalog-order="{101+group_index*100+index}" ', 1)
            file.write_text(svg)
    for file in outputs:
        (root / 'animals' / file.name).write_bytes(file.read_bytes())
print('Added 29 original animal cutouts at 200 ₽; RGB preserved. Total: 39 animals.')
