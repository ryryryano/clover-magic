"""Turns the GIFs in assets/ into hooks/clips.ts: palette-indexed pixel frames.

Run from the mod folder: python3 tools/build_frames.py  (needs ffmpeg/ffprobe)
Each clip is cropped to the opaque area across all frames, box-averaged down
to SCALE source pixels per output pixel, and quantized to one shared palette.
"""
import json, subprocess, sys

SCALE = 304 / 48  # the idea mascot's opaque height lands on 48 pixels (24 rows)
COLORS = 63       # palette size; index 0 is transparent
ALPHABET = '.' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
# fly_out: the source plane pops out of existence mid-air at frame 13; the
# canvas gains `pad` columns on the right and the plane (every opaque pixel
# right of `from_x` in frame `src`) keeps flying by (dx, dy) per frame in
# `frames`, shrinking by `shrink` each frame as it recedes, and slides out
# across the new right edge.
CLIPS = [
    ('idea', 'Idea', 'assets/idea.gif', None),
    ('send', 'Send', 'assets/send.gif',
     {'pad': 20, 'src': 13, 'from_x': 348, 'frames': [14, 15], 'dx': 34, 'dy': -6, 'shrink': 0.8}),
]


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                          'stream=width,height,r_frame_rate', '-of', 'json', path],
                         capture_output=True, check=True).stdout
    s = json.loads(out)['streams'][0]
    num, den = s['r_frame_rate'].split('/')
    return s['width'], s['height'], round(1000 * int(den) / int(num))


def frames(path, w, h):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'],
                         capture_output=True, check=True).stdout
    size = w * h * 4
    return [raw[i:i + size] for i in range(0, len(raw), size)]


def fly_out(fs, w, h, spec):
    pad = spec['pad']
    nw = w + pad
    wide = []
    for f in fs:
        out = bytearray(nw * h * 4)
        for y in range(h):
            out[y * nw * 4:(y * nw + w) * 4] = f[y * w * 4:(y + 1) * w * 4]
        wide.append(out)
    src = fs[spec['src']]
    plane = {(x, y): src[(y * w + x) * 4:(y * w + x) * 4 + 4]
             for y in range(h) for x in range(spec['from_x'], w) if src[(y * w + x) * 4 + 3] > 127}
    xs = [x for x, _ in plane]
    ys = [y for _, y in plane]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    half_w, half_h = (max(xs) - min(xs)) / 2 + 1, (max(ys) - min(ys)) / 2 + 1
    for k, i in enumerate(spec['frames'], start=1):
        scale = spec['shrink'] ** k
        ncx, ncy = cx + spec['dx'] * k, cy + spec['dy'] * k
        # Each target pixel samples the plane at the matching unscaled spot.
        for ty in range(int(ncy - half_h * scale) - 1, int(ncy + half_h * scale) + 2):
            for tx in range(int(ncx - half_w * scale) - 1, int(ncx + half_w * scale) + 2):
                px = plane.get((round(cx + (tx - ncx) / scale), round(cy + (ty - ncy) / scale)))
                if px and 0 <= tx < nw and 0 <= ty < h:
                    wide[i][(ty * nw + tx) * 4:(ty * nw + tx) * 4 + 4] = px
    return wide, nw


def crop_box(fs, w, h):
    x0, y0, x1, y1 = w, h, 0, 0
    for f in fs:
        for y in range(h):
            for x in range(w):
                if f[(y * w + x) * 4 + 3] > 127:
                    x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
    return x0, y0, x1 + 1, y1 + 1


def shrink(f, w, box):
    x0, y0, x1, y1 = box
    ow, oh = round((x1 - x0) / SCALE), round((y1 - y0) / SCALE)
    out = []
    for oy in range(oh):
        row = []
        sy0, sy1 = y0 + int(oy * SCALE), min(y1, y0 + int((oy + 1) * SCALE))
        for ox in range(ow):
            sx0, sx1 = x0 + int(ox * SCALE), min(x1, x0 + int((ox + 1) * SCALE))
            r = g = b = n = total = 0
            for sy in range(sy0, sy1):
                for sx in range(sx0, sx1):
                    i = (sy * w + sx) * 4
                    total += 1
                    if f[i + 3] > 127:
                        r, g, b, n = r + f[i], g + f[i + 1], b + f[i + 2], n + 1
            row.append((r // n, g // n, b // n) if n and n * 2 >= total else None)
        out.append(row)
    return out


def median_cut(colors, k):
    boxes = [colors]
    while len(boxes) < k:
        boxes.sort(key=lambda bx: -len(bx))
        bx = boxes.pop(0)
        if len(bx) < 2:
            boxes.append(bx)
            break
        ch = max(range(3), key=lambda c: max(p[c] for p in bx) - min(p[c] for p in bx))
        bx.sort(key=lambda p: p[ch])
        mid = len(bx) // 2
        boxes += [bx[:mid], bx[mid:]]
    return [tuple(sum(p[c] for p in bx) // len(bx) for c in range(3)) for bx in boxes if bx]


def nearest(palette, c):
    return min(range(len(palette)), key=lambda i: sum((palette[i][k] - c[k]) ** 2 for k in range(3)))


def main():
    shrunk = []
    for key, title, path, fly in CLIPS:
        w, h, ms = probe(path)
        fs = frames(path, w, h)
        box = crop_box(fs, w, h)
        if fly:
            fs, w = fly_out(fs, w, h, fly)
            box = (box[0], box[1], w, box[3])  # keep the new room on the right
        shrunk.append((key, title, ms, [shrink(f, w, box) for f in fs]))
        print(f'{key}: {len(fs)} frames, crop {box}, out {len(shrunk[-1][3][0][0])}x{len(shrunk[-1][3][0])}', file=sys.stderr)

    every = [p for *_, fs in shrunk for f in fs for row in f for p in row if p]
    palette = median_cut(every, COLORS)
    memo = {}

    def index(p):
        if p is None:
            return '.'
        if p not in memo:
            memo[p] = ALPHABET[1 + nearest(palette, p)]
        return memo[p]

    clips = []
    for key, title, ms, fs in shrunk:
        clips.append({'key': key, 'title': title, 'frameMs': ms, 'width': len(fs[0][0]), 'height': len(fs[0]),
                      'frames': [''.join(index(p) for row in f for p in row) for f in fs]})

    hexes = ['#%02x%02x%02x' % c for c in palette]
    with open('hooks/clips.ts', 'w') as out:
        out.write('// Generated by tools/build_frames.py from assets/*.gif. Do not edit by hand.\n')
        out.write('// Each frame is width*height palette letters, row-major; "." is transparent.\n\n')
        out.write('export type Clip = { key: string; title: string; frameMs: number; width: number; height: number; frames: readonly string[] }\n\n')
        out.write(f'export const ALPHABET = {json.dumps(ALPHABET)}\n\n')
        out.write(f'export const PALETTE: readonly string[] = {json.dumps(hexes)}\n\n')
        out.write('export const CLIPS: readonly Clip[] = [\n')
        for c in clips:
            out.write('  {\n')
            for k in ('key', 'title', 'frameMs', 'width', 'height'):
                out.write(f'    {k}: {json.dumps(c[k])},\n')
            out.write('    frames: [\n')
            for fr in c['frames']:
                out.write(f'      {json.dumps(fr)},\n')
            out.write('    ],\n  },\n')
        out.write(']\n')


main()
