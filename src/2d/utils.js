export const kPointByteLength = (
  4 + // x: f32
  4 + // y: f32
  4 + // size: f32
  1 + // r: u8
  1 + // g: u8
  1 + // b: u8
  1 + // padding
  0
);

export const identityMat3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

export function multiplyMat3(left, right, out) {
  // 0 1 2
  // 3 4 5
  // 6 7 8
  out[0] = left[0] * right[0] + left[1] * right[3] + left[2] * right[6];
  out[1] = left[0] * right[1] + left[1] * right[4] + left[2] * right[7];
  out[2] = left[0] * right[2] + left[1] * right[5] + left[2] * right[8];
  out[3] = left[3] * right[0] + left[4] * right[3] + left[5] * right[6];
  out[4] = left[3] * right[1] + left[4] * right[4] + left[5] * right[7];
  out[5] = left[3] * right[2] + left[4] * right[5] + left[5] * right[8];
  out[6] = left[6] * right[0] + left[7] * right[3] + left[8] * right[6];
  out[7] = left[6] * right[1] + left[7] * right[4] + left[8] * right[7];
  out[8] = left[6] * right[2] + left[7] * right[5] + left[8] * right[8];
}

export function multiplyMaybeMat3(mat3Pool, left, right) {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  const out = mat3Pool.aquire();
  multiplyMat3(left, right, out);
  return out;
}
