/* 產生 App 圖示。
   圖案：三個亮起來的格子，被一條像「橋」的路線串起來 ——
   同時代表填格子（數獨/數織）和連起來（數橋），縮到 60px 還看得出來。

   自己畫點陣、自己壓 PNG，不裝任何套件。
   用法：node tools/make-icons.js
*/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..');

/* ---------- 幾何 ---------- */
const SS = 4;                    /* 超取樣倍率，用來做邊緣平滑 */

function roundRectInside(x, y, w, h, r, px, py) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx, qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

/* ---------- 版面（以 512 為基準，其他尺寸等比縮放）---------- */
const BASE = 512;
const CELL = 104, GAP = 26;
const GRID = CELL * 3 + GAP * 2;
const O = (BASE - GRID) / 2;
const RAD = 24;

function cellRect(row, col) {
  return { x: O + col * (CELL + GAP), y: O + row * (CELL + GAP), w: CELL, h: CELL };
}
function cellCenter(row, col) {
  const r = cellRect(row, col);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/* 亮起來的三格：左下 → 中 → 右上，一路往上爬 */
const LIT = [[2, 0], [1, 1], [0, 2]];

/* 連接路線：只走直角，跟數橋的橋一樣 */
const P = LIT.map(([r, c]) => cellCenter(r, c));
const ROUTE = [
  [P[0].x, P[0].y, P[1].x, P[0].y],
  [P[1].x, P[0].y, P[1].x, P[1].y],
  [P[1].x, P[1].y, P[2].x, P[1].y],
  [P[2].x, P[1].y, P[2].x, P[2].y]
];
const ROUTE_W = 13;

/* ---------- 顏色 ---------- */
const BG_TOP = [42, 68, 112];
const BG_BOT = [24, 38, 66];
const OUTLINE = [255, 255, 255];
const OUTLINE_A = 0.20;
const ROUTE_C = [235, 176, 68];
const ROUTE_A = 0.85;      /* 太淡會跟深藍混成髒髒的橄欖色，要夠亮才像一條線 */
const LIT_C = [242, 183, 74];

function mix(dst, src, a) {
  dst[0] = dst[0] * (1 - a) + src[0] * a;
  dst[1] = dst[1] * (1 - a) + src[1] * a;
  dst[2] = dst[2] * (1 - a) + src[2] * a;
}

/* 畫一張 size x size 的 RGBA */
function render(size, rounded) {
  const s = size * SS;
  const k = BASE / s;                       /* 畫布座標 → 版面座標 */
  const acc = Buffer.alloc(size * size * 4);

  const sub = new Float32Array(s * s * 4);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const px = (x + 0.5) * k, py = (y + 0.5) * k;
      let a = 1;
      if (rounded && !roundRectInside(0, 0, BASE, BASE, BASE * 0.22, px, py)) a = 0;

      const t = py / BASE;
      const col = [
        BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t,
        BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t,
        BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t
      ];

      /* 順序很重要：空格框 → 路線 → 亮起來的格子。
         路線畫在框上面才不會被切斷、看起來像髒污 */
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (LIT.some(([lr, lc]) => lr === r && lc === c)) continue;
          const R = cellRect(r, c);
          if (!roundRectInside(R.x, R.y, R.w, R.h, RAD, px, py)) continue;
          const SW = 11;
          const inInner = roundRectInside(R.x + SW, R.y + SW, R.w - SW * 2, R.h - SW * 2, RAD - SW, px, py);
          if (!inInner) mix(col, OUTLINE, OUTLINE_A);
        }
      }

      for (const [x1, y1, x2, y2] of ROUTE) {
        if (distToSeg(px, py, x1, y1, x2, y2) <= ROUTE_W) { mix(col, ROUTE_C, ROUTE_A); break; }
      }

      for (const [lr, lc] of LIT) {
        const R = cellRect(lr, lc);
        if (roundRectInside(R.x, R.y, R.w, R.h, RAD, px, py)) { mix(col, LIT_C, 1); break; }
      }

      const i = (y * s + x) * 4;
      sub[i] = col[0]; sub[i + 1] = col[1]; sub[i + 2] = col[2]; sub[i + 3] = a * 255;
    }
  }

  /* 降採樣 */
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const i = (((y * SS + dy) * s) + (x * SS + dx)) * 4;
          r += sub[i]; g += sub[i + 1]; b += sub[i + 2]; a += sub[i + 3];
        }
      }
      const n = SS * SS, o = (y * size + x) * 4;
      acc[o] = Math.round(r / n);
      acc[o + 1] = Math.round(g / n);
      acc[o + 2] = Math.round(b / n);
      acc[o + 3] = Math.round(a / n);
    }
  }
  return acc;
}

/* ---------- 最小 PNG 編碼 ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function png(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- SVG（給瀏覽器分頁圖示用，向量最銳利）---------- */
function svg() {
  let empty = '', lit = '';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const R = cellRect(r, c);
      if (LIT.some(([lr, lc]) => lr === r && lc === c)) {
        lit += `<rect x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}" rx="${RAD}" fill="rgb(${LIT_C.join(',')})"/>`;
      } else {
        empty += `<rect x="${R.x + 5.5}" y="${R.y + 5.5}" width="${R.w - 11}" height="${R.h - 11}" rx="${RAD - 5.5}" fill="none" stroke="#fff" stroke-opacity="${OUTLINE_A}" stroke-width="11"/>`;
      }
    }
  }
  const route = ROUTE.map(([x1, y1, x2, y2]) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgb(${ROUTE_C.join(',')})" stroke-opacity="${ROUTE_A}" stroke-width="${ROUTE_W * 2}" stroke-linecap="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BASE} ${BASE}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="rgb(${BG_TOP.join(',')})"/><stop offset="1" stop-color="rgb(${BG_BOT.join(',')})"/>` +
    `</linearGradient></defs>` +
    `<rect width="${BASE}" height="${BASE}" rx="${BASE * 0.22}" fill="url(#g)"/>` +
    empty + route + lit + '</svg>';
}

/* ---------- 產出 ---------- */
const jobs = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['apple-touch-icon.png', 180, false]   /* iOS 自己會切圓角，所以不要先切 */
];
for (const [name, size, rounded] of jobs) {
  fs.writeFileSync(path.join(OUT, name), png(render(size, rounded), size));
  console.log('wrote', name, size + 'x' + size);
}
fs.writeFileSync(path.join(OUT, 'icon.svg'), svg(), 'utf8');
console.log('wrote icon.svg');
