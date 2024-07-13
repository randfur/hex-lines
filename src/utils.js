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

export class Pool {
  constructor(create) {
    this.create = create;
    this.buffer = [];
    this.usedCount = 0;
  }

  aquire() {
    if (this.usedCount === this.buffer.length) {
      this.buffer.push(this.create());
    }
    return this.buffer[this.usedCount++];
  }

  release() {
    --this.usedCount;
  }

  releaseAll() {
    this.usedCount = 0;
  }
}

export class PoolMap {
  constructor(create) {
    this.create = create;
    this.poolMap = new Map();
  }

  aquire(key) {
    if (!this.poolMap.has(key)) {
      this.poolMap.set(key, new Pool(() => this.create(key)));
    }
    return this.poolMap.get(key).aquire();
  }

  release(key) {
    return this.poolMap.get(key).release();
  }
}

export function multiplyMat3(left, right, out) {

}
