export const kLittleEndian = new DataView(new Uint16Array([1]).buffer).getUint8(0, true);

export function rgbaToUint32(r, g, b, a) {
  return ((r & 0xff) << (3 * 8)) |
    ((g & 0xff) << (2 * 8)) |
    ((b & 0xff) << (1 * 8)) |
    ((a & 0xff) << (0 * 8));
}

export function logIf(text) {
  if (text !== '') {
    console.log(text);
  }
}

export function createIdentityMatrix(is3d) {
  return new Float32Array(is3d ? [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ] : [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ]);
}
