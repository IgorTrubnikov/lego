"""Import the seven original WebP hairpieces in their ZIP entry order.

Usage: python scripts/prepare-additional-hair.py /path/to/original.zip
Requires Pillow. Original artwork is not repainted; only near-invisible alpha
noise (<=2/255), transparent margins, scale and placement are adjusted.
"""
from pathlib import Path
from PIL import Image
from xml.sax.saxutils import escape
import base64
import hashlib
import io
import json
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def prepare(archive_path):
    manifest = json.loads((ROOT / 'scripts/additional-hair-manifest.json').read_text())
    with zipfile.ZipFile(archive_path) as archive, tempfile.TemporaryDirectory(prefix='.additional-hair-', dir=ROOT) as temp:
        entries = [entry for entry in archive.infolist()
                   if not entry.is_dir() and not entry.filename.startswith('__MACOSX/')
                   and entry.filename.lower().endswith(('.webp', '.png'))]
        if [entry.filename for entry in entries] != [item['sourceName'] for item in manifest]:
            raise ValueError('Unexpected archive contents or entry order')
        outputs = []
        for item, entry in zip(manifest, entries):
            source = archive.read(entry)
            if hashlib.sha256(source).hexdigest() != item['sha256']:
                raise ValueError('Unexpected original: ' + entry.filename)
            image = Image.open(io.BytesIO(source)).convert('RGBA')
            image.putalpha(image.getchannel('A').point(lambda a: 0 if a <= 2 else a))
            if list(image.getbbox()) != item['bbox']:
                raise ValueError('Unexpected silhouette: ' + entry.filename)
            image = image.crop(item['bbox']).resize((item['width'], item['height']), Image.Resampling.LANCZOS)
            # Suppress only resampling noise outside the opaque silhouette.
            image.putalpha(image.getchannel('A').point(lambda a: 0 if a <= 2 else a))
            canvas = Image.new('RGBA', (600, 720))
            canvas.alpha_composite(image, (item['x'], item['y']))
            output = io.BytesIO()
            canvas.save(output, format='WEBP', lossless=True, exact=True)
            raster = output.getvalue()
            version = hashlib.sha256(raster).hexdigest()[:12]
            box = f"{item['x']-6} {item['y']-6} {item['width']+12} {item['height']+12}"
            label = f"{item['displayNumber']:02} · {item['name']}"
            if len(label) > 45:
                raise ValueError('Catalog label exceeds 45 characters: ' + label)
            art = f'<image width="600" height="720" href="data:image/webp;base64,{base64.b64encode(raster).decode()}"/>'
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" '
                   f'data-render-style="glossy-plastic" data-catalog-order="{item["catalogOrder"]}" '
                   f'data-asset-version="{version}" data-preview-box="{box}">'
                   f'<title>{escape(label)}</title>{art}</svg>\n')
            file = Path(temp) / f'{item["slug"]}__0__{label}.svg'
            file.write_text(svg)
            outputs.append(file)
        # All originals are checked and rendered before updating this collection.
        for item, output in zip(manifest, outputs):
            for old in (ROOT / 'haircuts').glob(item['slug'] + '__*.svg'):
                if old.name != output.name:
                    old.unlink()
        for file in outputs:
            file.replace(ROOT / 'haircuts' / file.name)
    print(f'Imported {len(outputs)} original hairpieces, numbered 56–62, at no extra charge.')


if __name__ == '__main__':
    prepare(sys.argv[1])
