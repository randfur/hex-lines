import {kLittleEndian, rgbaToUint32Flat, logIf} from './utils.js';
import {buildVertexShader, kFragmentShader} from './shaders.js';

export const kBytesPerHexPoint3d = 5 * 4;

export function setHexPoint3dFlat(dataView, i, x, y, z, size, r, g, b, a) {
  dataView.setFloat32(i * kBytesPerHexPoint3d + 0, x, kLittleEndian);
  dataView.setFloat32(i * kBytesPerHexPoint3d + 4, y, kLittleEndian);
  dataView.setFloat32(i * kBytesPerHexPoint3d + 8, z, kLittleEndian);
  dataView.setFloat32(i * kBytesPerHexPoint3d + 12, size, kLittleEndian);
  dataView.setUint32(i * kBytesPerHexPoint3d + 16, rgbaToUint32Flat(r, g, b, a), kLittleEndian);
}

export function clearHexPoint3d(dataView, i) {
  dataView.setFloat32(i * kBytesPerHexPoint3d + 12, 0, kLittleEndian);
}

export function setHexPoint3d(dataView, i, hexPoint3d) {
  if (hexPoint3d === null) {
    clearHexPoint3d(dataView, i);
    return;
  }
  const {position: {x, y, z}, size, colour: {r, g, b, a}} = hexPoint3d;
  setHexPoint3dFlat(dataView, i, x, y, z, size, r, g, b, a);
}

export function setHexPoints3d(dataView, hexPoints3d) {
  for (let i = 0; i < hexPoints3d.length; ++i) {
    setHexPoint3d(dataView, i, hexPoints3d[i]);
  }
}

export class HexContext3d {
  constructor({canvas, pixelSize=1, antialias=true, zMin=1, zMax=1000000, zDiv=800}) {
    this.canvas = canvas;
    this.pixelSize = pixelSize;

    this.canvas.width /= this.pixelSize;
    this.canvas.height /= this.pixelSize;
    this.canvas.style = `
      transform: scale(${this.pixelSize});
      transform-origin: top left;
      image-rendering: pixelated;
    `;
    this.gl = this.canvas.getContext('webgl2', {antialias});

    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertexShader, buildVertexShader({is3d: true}));
    this.gl.compileShader(vertexShader);
    logIf(this.gl.getShaderInfoLog(vertexShader));

    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragmentShader, kFragmentShader);
    this.gl.compileShader(fragmentShader);
    logIf(this.gl.getShaderInfoLog(fragmentShader));

    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    logIf(this.gl.getProgramInfoLog(program));
    this.gl.useProgram(program);

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LESS);

    this.uniformLocations = Object.fromEntries([
      'width',
      'height',
      'pixelSize',
      'transform',
      'cameraTransform',
      'zMin',
      'zMax',
      'zDiv',
    ].map(name => [name, this.gl.getUniformLocation(program, name)]));
    this.gl.uniform1f(this.uniformLocations.width, this.canvas.width);
    this.gl.uniform1f(this.uniformLocations.height, this.canvas.height);
    this.gl.uniform1f(this.uniformLocations.pixelSize, this.pixelSize);
    this.gl.uniformMatrix4fv(this.uniformLocations.transform, this.gl.FALSE, new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]));
    this.gl.uniformMatrix4fv(this.uniformLocations.cameraTransform, this.gl.FALSE, new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]));
    this.gl.uniform1f(this.uniformLocations.zMin, zMin);
    this.gl.uniform1f(this.uniformLocations.zMax, zMax);
    this.gl.uniform1f(this.uniformLocations.zDiv, zDiv);

    this.attributeLocations = Object.fromEntries([
      'startPosition',
      'startSize',
      'startRgba',
      'endPosition',
      'endSize',
      'endRgba',
    ].map(name => [name, this.gl.getAttribLocation(program, name)]));
  }

  createLines() {
    return new HexLines3d(this);
  }
}

class HexLines3d  {
  constructor(hexLinesContext) {
    this.hexLinesContext = hexLinesContext;
    this.gl = this.hexLinesContext.gl;
    this.vertexArray = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.vertexArray);
    this.buffer = new ArrayBuffer();
    this.dataView = new DataView(this.buffer);
    this.length = 0;
    this.glBuffer = this.gl.createBuffer();
    this.dirty = false;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glBuffer);
    const {
      startPosition,
      startSize,
      startRgba,
      endPosition,
      endSize,
      endRgba,
    } = this.hexLinesContext.attributeLocations;
    this.gl.enableVertexAttribArray(startPosition);
    this.gl.enableVertexAttribArray(startSize);
    this.gl.enableVertexAttribArray(startRgba);
    this.gl.enableVertexAttribArray(endPosition);
    this.gl.enableVertexAttribArray(endSize);
    this.gl.enableVertexAttribArray(endRgba);

    this.gl.vertexAttribPointer(startPosition, 3, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint3d, 0);
    this.gl.vertexAttribPointer(startSize, 1, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint3d, 3 * 4);
    this.gl.vertexAttribIPointer(startRgba, 1, this.gl.UNSIGNED_INT, kBytesPerHexPoint3d, 4 * 4);
    this.gl.vertexAttribPointer(endPosition, 3, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint3d, kBytesPerHexPoint3d + 0);
    this.gl.vertexAttribPointer(endSize, 1, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint3d, kBytesPerHexPoint3d + 3 * 4);
    this.gl.vertexAttribIPointer(endRgba, 1, this.gl.UNSIGNED_INT, kBytesPerHexPoint3d, kBytesPerHexPoint3d + 4 * 4);

    this.gl.vertexAttribDivisor(startPosition, 1);
    this.gl.vertexAttribDivisor(startSize, 1);
    this.gl.vertexAttribDivisor(startRgba, 1);
    this.gl.vertexAttribDivisor(endPosition, 1);
    this.gl.vertexAttribDivisor(endSize, 1);
    this.gl.vertexAttribDivisor(endRgba, 1);
  }

  ensureCapacity(length) {
    const byteLength = length * kBytesPerHexPoint3d;
    if (this.buffer.byteLength >= byteLength) {
      return;
    }
    const newLength = Math.max(this.buffer.byteLength * 2, byteLength);
    if (this.buffer.transfer) {
      this.buffer = this.buffer.transfer(newLength);
    } else {
      const newBuffer = new ArrayBuffer(newLength);
      new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
      this.buffer = newBuffer;
    }
    this.dataView = new DataView(this.buffer);
  }

  addPoint(hexPoint3d) {
    this.dirty = true;
    this.ensureCapacity(this.length + 1);
    setHexPoint3d(this.dataView, this.length, hexPoint3d);
    ++this.length;
  }

  addPoints(hexPoints3d) {
    this.dirty = true;
    this.ensureCapacity(this.length + hexPoints3d.length);
    for (const hexPoint3d of hexPoints3d) {
      setHexPoint3d(this.dataView, this.length, hexPoint3d);
      ++this.length;
    }
  }

  clear() {
    this.dirty = true;
    this.length = 0;
  }

  draw() {
    this.gl.bindVertexArray(this.vertexArray);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glBuffer);
    if (this.dirty) {
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.buffer, this.gl.DYNAMIC_DRAW);
      this.dirty = false;
    }
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 18, this.length - 1);
  }

  remove() {
    this.gl.deleteBuffer(this.buffer);
  }
}
