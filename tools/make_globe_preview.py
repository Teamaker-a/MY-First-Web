import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
world = json.loads((ROOT / 'site/assets/data/world-countries.geojson').read_text(encoding='utf-8'))
size = 400
cx = cy = size / 2
radius = 176
scale = 1.52
center_lon = 105
center_lat = 32


def project(lon, lat):
    x = cx + (lon - center_lon) * scale
    y = cy - (lat - center_lat) * scale
    return x, y


def path_for(geometry):
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    chunks = []
    for polygon in polygons:
        for ring in polygon:
            points = [project(lon, lat) for lon, lat in ring]
            if len(points) < 3:
                continue
            d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in points) + ' Z'
            chunks.append(d)
    return ' '.join(chunks)


paths = []
for feature in world['features']:
    geometry = feature.get('geometry')
    if not geometry:
        continue
    d = path_for(geometry)
    if d:
        paths.append(d)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <defs>
    <radialGradient id="ocean" cx="42%" cy="35%" r="68%">
      <stop offset="0%" stop-color="#d8f3f7"/>
      <stop offset="55%" stop-color="#8fd2e6"/>
      <stop offset="100%" stop-color="#5daecb"/>
    </radialGradient>
    <radialGradient id="shade" cx="34%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".34"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity=".02"/>
      <stop offset="78%" stop-color="#0a1a33" stop-opacity=".12"/>
      <stop offset="100%" stop-color="#06122a" stop-opacity=".52"/>
    </radialGradient>
    <clipPath id="clip"><circle cx="{cx}" cy="{cy}" r="{radius}"/></clipPath>
  </defs>
  <circle cx="{cx}" cy="{cy}" r="{radius}" fill="url(#ocean)"/>
  <g clip-path="url(#clip)" fill="#f4e6bd" stroke="#d6b578" stroke-width="1.2" stroke-linejoin="round">
    <path d="{' '.join(paths)}"/>
  </g>
  <circle cx="{cx}" cy="{cy}" r="{radius}" fill="url(#shade)"/>
  <circle cx="{cx}" cy="{cy}" r="{radius}" fill="none" stroke="#cfeaff" stroke-opacity=".45" stroke-width="1.2"/>
</svg>
'''

out = ROOT / 'site/assets/images/globe-preview.svg'
out.write_text(svg, encoding='utf-8')
print('wrote', out, len(svg), 'bytes')
