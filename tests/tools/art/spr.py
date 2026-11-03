"""Dựng sprite pixel 16×16 bằng hình cơ bản + tự viền đen; xuất ảnh xem thử và JS."""
import json, math
from PIL import Image

PAL = {"k":"#1b1b2f","g":"#3ccb5e","G":"#2e8b3a","j":"#1f5f2a","f":"#b8e05a","b":"#8a4a22","B":"#5a3010",
       "y":"#ffd23f","Y":"#e9a800","o":"#ff9f1c","O":"#d9620a","p":"#ff7fa0","P":"#ffc4d6","r":"#ff4f6d",
       "R":"#c21f3a","w":"#ffffff","c":"#fff2b3","t":"#e2a46a","s":"#d4d4e0","S":"#8a8fa8","u":"#2f5fb0",
       "l":"#8fd3ff","e":"#f4efe6","v":"#c77dff","m":"#9aa0b5","n":"#3a3a55"}

class Spr:
    def __init__(s, w=16, h=16): s.w, s.h = w, h; s.g = [["."]*w for _ in range(h)]
    def px(s, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < s.w and 0 <= y < s.h: s.g[y][x] = c
    def rect(s, x, y, w, h, c):
        for j in range(h):
            for i in range(w): s.px(x+i, y+j, c)
    def line(s, x0, y0, x1, y1, c):
        x0, y0, x1, y1 = map(int, (x0, y0, x1, y1))
        dx, dy = abs(x1-x0), -abs(y1-y0); sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1; err = dx+dy
        while True:
            s.px(x0, y0, c)
            if x0 == x1 and y0 == y1: break
            e2 = 2*err
            if e2 >= dy: err += dy; x0 += sx
            if e2 <= dx: err += dx; y0 += sy
    def disc(s, cx, cy, r, c):
        for y in range(s.h):
            for x in range(s.w):
                if (x-cx)**2 + (y-cy)**2 <= r*r + 0.3: s.g[y][x] = c
    def ell(s, cx, cy, rx, ry, c):
        for y in range(s.h):
            for x in range(s.w):
                if ((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1.05: s.g[y][x] = c
    def dots(s, pts, c):
        for x, y in pts: s.px(x, y, c)
    def outline(s):
        out = [r[:] for r in s.g]
        for y in range(s.h):
            for x in range(s.w):
                if s.g[y][x] != ".": continue
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    xx, yy = x+dx, y+dy
                    if 0 <= xx < s.w and 0 <= yy < s.h and s.g[yy][xx] not in ".k":
                        out[y][x] = "k"; break
        s.g = out; return s
    def rows(s): return ["".join(r) for r in s.g]

def sheet(spr_map, path, scale=6):
    names = list(spr_map); n = max(len(v) for v in spr_map.values())
    img = Image.new("RGB", (n*18*scale, len(names)*20*scale), "#5ed35e")
    for j, nm in enumerate(names):
        for i, rows in enumerate(spr_map[nm]):
            for y, row in enumerate(rows):
                for x, ch in enumerate(row):
                    if ch == ".": continue
                    col = PAL[ch]
                    for a in range(scale):
                        for b in range(scale):
                            img.putpixel(((i*18+1+x)*scale+a, (j*20+4-(len(rows)-16)+y)*scale+b), tuple(int(col[k:k+2],16) for k in (1,3,5)))
    img.save(path)
