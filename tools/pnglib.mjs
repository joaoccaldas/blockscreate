/**
 * Minimal, dependency-free RGBA PNG encoder.
 *
 * Used by the asset generators so all game art is reproducible from committed
 * code (run `node tools/gen-sprites.mjs`) rather than depending on any external
 * image tool. Uses Node's built-in zlib for the IDAT deflate stream.
 */
import zlib from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/**
 * Encode an RGBA pixel buffer (Uint8Array, length w*h*4) to a PNG Buffer.
 */
export function encodePNG(rgba, width, height) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Filter byte 0 (None) prepended to each scanline.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.subarray ? raw.set(rgba.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1)
                  : Buffer.from(rgba.slice(y * stride, y * stride + stride)).copy(raw, y * (stride + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Tiny pixel canvas helper for hand-painting small sprites.
 */
export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4); // transparent
  }

  set(x, y, [r, g, b, a = 255]) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = a;
  }

  rect(x, y, w, h, color) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, color);
  }

  /** Filled circle/ellipse, handy for heads/bodies. */
  ellipse(cx, cy, rx, ry, color) {
    for (let yy = Math.floor(cy - ry); yy <= cy + ry; yy++)
      for (let xx = Math.floor(cx - rx); xx <= cx + rx; xx++) {
        const dx = (xx - cx) / rx;
        const dy = (yy - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(xx, yy, color);
      }
  }

  toPNG() {
    return encodePNG(this.data, this.w, this.h);
  }
}
