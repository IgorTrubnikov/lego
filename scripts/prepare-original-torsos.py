"""Import twenty torsos from the uploaded original WebPs, without repainting.
Requires Pillow. Uses reviewed source-resolution alpha masks, never a model at import.
Usage: python scripts/prepare-original-torsos.py [--check]
"""
from pathlib import Path
from PIL import Image
from xml.sax.saxutils import escape
import base64, hashlib, io, json, re, sys, tempfile

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'scripts/original-torsos'
MANIFEST = json.loads((BASE / 'manifest.json').read_text())
ORDER = [n for group in json.loads((ROOT / 'scripts/plain-torsos/order.json').read_text())['groups'] for n in group['numbers']]


def render(item):
    original = Image.open(BASE / (item['sheet'] + '.webp')).convert('RGB')
    x, y, w, h = item['box']
    crop = original.crop((x, y, x+w, y+h))
    mask_path = BASE / 'masks' / f"{item['number']:02}.png"
    if hashlib.sha256(mask_path.read_bytes()).hexdigest() != item['maskSha256']:
        raise ValueError('Unexpected mask: ' + str(mask_path))
    mask = Image.open(mask_path).convert('L')
    if mask.size != crop.size:
        raise ValueError('Mask dimensions differ from original crop')
    rgba = crop.convert('RGBA')
    rgba.putalpha(mask)
    # This invariant prevents the earlier color cloning and edge repainting.
    if rgba.convert('RGB').tobytes() != crop.tobytes():
        raise ValueError('Source RGB changed')
    data = io.BytesIO(); rgba.save(data, format='PNG', optimize=True)
    return data.getvalue()


def main():
    for name, expected in MANIFEST['sources'].items():
        if hashlib.sha256((BASE / (name + '.webp')).read_bytes()).hexdigest() != expected:
            raise ValueError('Unexpected original source: ' + name)
    with tempfile.TemporaryDirectory(prefix='.original-torsos-', dir=ROOT) as temp:
        outputs = []
        for item in MANIFEST['items']:
            data = render(item)
            n, w, h, front = item['number'], item['box'][2], item['box'][3], item['front']
            hand_height = max(22, round((h-front)*322/w))
            file = f"catalog-{n:02}__0__{item['title']}.svg"
            if '--check' in sys.argv:
                svg = (ROOT / 'clothes' / file).read_text()
                embedded = base64.b64decode(re.search(r'href="data:image/png;base64,([^"]+)"', svg)[1])
                if embedded != data:
                    raise ValueError('Installed asset does not match untouched original: ' + file)
                continue
            art = (f'<defs><image id="original" width="{w}" height="{h}" href="data:image/png;base64,{base64.b64encode(data).decode()}"/>'
                   '<clipPath id="front"><rect x="139" y="317" width="322" height="193"/></clipPath>'
                   f'<clipPath id="hands"><rect x="139" y="510" width="322" height="{hand_height}"/></clipPath></defs>'
                   f'<g clip-path="url(#front)"><use href="#original" transform="translate(139 317) scale({322/w} {193/front})"/></g>'
                   f'<g clip-path="url(#hands)"><use href="#original" transform="translate(139 {510-hand_height*front/(h-front)}) scale({322/w} {hand_height/(h-front)})"/></g>')
            version = hashlib.sha256(art.encode()).hexdigest()[:12]
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" '
                   f'data-preview-box="133 311 334 {510+hand_height+6-311}" data-legs-top="510" data-catalog-order="{(ORDER.index(n)+1)*10}" '
                   f'data-asset-version="{version}"><title>{escape(item["title"])}</title>{art}</svg>\n')
            output = Path(temp) / file; output.write_text(svg); outputs.append(output)
        # All source checks, masks and outputs succeed before replacing old images.
        for output in outputs:
            output.replace(ROOT / 'clothes' / output.name)
    print('Verified 20 unmodified original RGB cutouts.' if '--check' in sys.argv else 'Replaced 20 torsos from original WebPs; no repainting.')


if __name__ == '__main__':
    main()
