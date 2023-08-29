import {kLittleEndian, rgbaToUint32, logIf} from './utils.js';
import {buildVertexShader, kFragmentShader} from './shaders.js';

export const kBytesPerHexPoint2d = 4 * 4;

export class HexContext2d {
  constructor({canvas, pixelSize=1, antialias=true}) {
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
    this.gl.shaderSource(vertexShader, buildVertexShader({is3d: false}));
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

    this.uniformLocations = Object.fromEntries([
      'width',
      'height',
      'pixelSize',
      'transform',
    ].map(name => [name, this.gl.getUniformLocation(program, name)]));
    this.gl.uniform1f(this.uniformLocations.width, this.canvas.width);
    this.gl.uniform1f(this.uniformLocations.height, this.canvas.height);
    this.gl.uniform1f(this.uniformLocations.pixelSize, this.pixelSize);
    this.gl.uniformMatrix3fv(this.uniformLocations.transform, this.gl.FALSE, new Float32Array([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ]));

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
    return new HexLines2d(this);
  }
}

class HexLines2d  {
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

    this.gl.vertexAttribPointer(startPosition, 2, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint2d, 0);
    this.gl.vertexAttribPointer(startSize, 1, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint2d, 2 * 4);
    this.gl.vertexAttribIPointer(startRgba, 1, this.gl.UNSIGNED_INT, kBytesPerHexPoint2d, 3 * 4);
    this.gl.vertexAttribPointer(endPosition, 2, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint2d, kBytesPerHexPoint2d + 0);
    this.gl.vertexAttribPointer(endSize, 1, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint2d, kBytesPerHexPoint2d + 2 * 4);
    this.gl.vertexAttribIPointer(endRgba, 1, this.gl.UNSIGNED_INT, kBytesPerHexPoint2d, kBytesPerHexPoint2d + 3 * 4);

    this.gl.vertexAttribDivisor(startPosition, 1);
    this.gl.vertexAttribDivisor(startSize, 1);
    this.gl.vertexAttribDivisor(startRgba, 1);
    this.gl.vertexAttribDivisor(endPosition, 1);
    this.gl.vertexAttribDivisor(endSize, 1);
    this.gl.vertexAttribDivisor(endRgba, 1);
  }

  ensureCapacity(ensureLength) {
    const ensureByteLength = ensureLength * kBytesPerHexPoint2d;
    if (this.buffer.byteLength >= ensureByteLength) {
      return;
    }
    const newByteLength = Math.max(this.buffer.byteLength * 2, ensureByteLength);
    if (this.buffer.transfer) {
      this.buffer = this.buffer.transfer(newByteLength);
    } else {
      const newBuffer = new ArrayBuffer(newByteLength);
      new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
      this.buffer = newBuffer;
    }
    this.dataView = new DataView(this.buffer);
  }

  addPointFlat(x, y, size, r, g, b, a) {
    this.dirty = true;
    this.ensureCapacity(this.length + 1);
    this.dataView.setFloat32(this.length * kBytesPerHexPoint2d + 0, x, kLittleEndian);
    this.dataView.setFloat32(this.length * kBytesPerHexPoint2d + 4, y, kLittleEndian);
    this.dataView.setFloat32(this.length * kBytesPerHexPoint2d + 8, size, kLittleEndian);
    this.dataView.setUint32(this.length * kBytesPerHexPoint2d + 12, rgbaToUint32(r, g, b, a), kLittleEndian);
    ++this.length;
  }

  addNull() {
    this.dirty = true;
    this.ensureCapacity(this.length + 1);
    this.dataView.setFloat32(this.length * kBytesPerHexPoint2d + 8, 0, kLittleEndian);
    ++this.length;
  }

  addPoint(hexPoint2d) {
    if (hexPoint2d === null) {
      this.addNull();
      return;
    }
    const {position: {x, y}, size, colour: {r, g, b, a}} = hexPoint2d;
    this.addPointFlat(x, y, size, r, g, b, a);
  }

  addPoints(hexPoints2d) {
    this.ensureCapacity(this.length + hexPoints2d.length);
    for (const hexPoint2d of hexPoints2d) {
      this.addPoint(hexPoint2d);
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
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.dataView, this.gl.DYNAMIC_DRAW, 0, this.length * kBytesPerHexPoint2d);
      this.dirty = false;
    }
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 18, this.length - 1);
  }

  remove() {
    this.gl.deleteBuffer(this.buffer);
  }
}
