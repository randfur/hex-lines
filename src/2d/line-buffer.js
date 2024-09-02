import {kLittleEndian} from '../utils.js';
import {kPointByteLength} from './utils.js';

export class LineBuffer {
  constructor(gl) {
    this.gl = gl;
    this.buffer = new ArrayBuffer(1024);
    this.dataView = new DataView(this.buffer);
    this.glBuffer = this.gl.createBuffer();
    this.usedByteLength = 0;
    this.dirty = true;
  }

  addLine(points) {
    this.dirty = true;
    let offset = this.usedByteLength;
    this.growUsage((points.length + 1) * kPointByteLength);
    for (const {position: {x, y}, size, colour: {r, g, b}} of points) {
      this.setPoint(offset, x, y, size, r, g, b);
      offset += kPointByteLength;
    }
    this.setNull(offset);
  }

  addDots(dots) {
    this.dirty = true;
    let offset = this.usedByteLength;
    this.growUsage(dots.length * kPointByteLength * 3);
    for (const {position: {x, y}, size, angle, colour: {r, g, b}} of dots) {
      this.setPoint(offset, x, y, size, r, g, b);
      offset += kPointByteLength;
      this.setPoint(offset, x, y, angle ?? 0, r, g, b);
      offset += kPointByteLength;
      this.setNull(offset);
      offset += kPointByteLength;
    }
  }

  addDot({position: {x, y}, size, angle, colour: {r, g, b}}) {
    this.dirty = true;
    const offset = this.usedByteLength;
    this.growUsage(kPointByteLength * 3);
    this.setPoint(offset + kPointByteLength * 0, x, y, size, r, g, b);
    this.setPoint(offset + kPointByteLength * 1, x, y, angle ?? 0, r, g, b);
    this.setNull(offset + kPointByteLength * 2);
  }

  addRawPointsData(pointsData) {
    // pointsData is a list of (x, y, size, rgb as u24) repeating.
    const kPointItemLength = 4;
    const startOffset = this.usedByteLength;
    const points = pointsData.length / kPointItemLength;
    this.growUsage(points * kPointByteLength);
    for (let i = 0; i < points; ++i) {
      const offset = i * kPointByteLength;
      this.dataView.setFloat32(offset + 0, pointsData[i * kPointItemLength + 0], kLittleEndian);
      this.dataView.setFloat32(offset + 4, pointsData[i * kPointItemLength + 1], kLittleEndian);
      this.dataView.setFloat32(offset + 8, pointsData[i * kPointItemLength + 2], kLittleEndian);
      this.dataView.setUint32(offset + 12, pointsData[i * kPointItemLength + 3] << 8, false);
    }
  }

  setPoint(offset, x, y, size, r, g, b) {
    this.dataView.setFloat32(offset + 0, x, kLittleEndian);
    this.dataView.setFloat32(offset + 4, y, kLittleEndian);
    this.dataView.setFloat32(offset + 8, size, kLittleEndian);
    this.dataView.setUint8(offset + 12, r);
    this.dataView.setUint8(offset + 13, g);
    this.dataView.setUint8(offset + 14, b);
  }

  setNull(offset) {
    this.dataView.setFloat32(offset + 8, undefined, kLittleEndian);
  }

  clear() {
    this.dirty = true;
    this.usedByteLength = 0;
  }

  growUsage(byteGrowth) {
    let targetByteLength = this.buffer.byteLength;
    while (targetByteLength < this.usedByteLength + byteGrowth) {
      targetByteLength *= 2;
    }
    if (targetByteLength > this.buffer.byteLength) {
      this.buffer = this.buffer.transfer(targetByteLength);
      this.dataView = new DataView(this.buffer);
    }
    this.usedByteLength += byteGrowth;
    this.dirty = true;
  }

  ensureUploaded() {
    if (!this.dirty) {
      return;
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new DataView(this.buffer, 0, this.usedByteLength),
      this.gl.STATIC_DRAW,
    );
    this.dirty = false;
  }

  delete() {
    this.gl.deleteBuffer(this.glBuffer);
    this.buffer = null;
    this.dataView = null;
    this.glBuffer = null;
    this.usedByteLength = 0;
  }
}
