import {kLittleEndian, rgbaToUint32, logIf} from './utils.js';
import {buildVertexShader, kFragmentShader} from './shaders.js';

export class HexLinesContext {
  constructor({canvas, pixelSize=1, antialias=true, is3d=false, zMin=1, zMax=1000000, zDiv=800}) {
    this.canvas = canvas;
    this.pixelSize = pixelSize;
    this.is3d = is3d;

    this.canvas.width /= this.pixelSize;
    this.canvas.height /= this.pixelSize;
    this.canvas.style = `
      transform: scale(${this.pixelSize});
      transform-origin: top left;
      image-rendering: pixelated;
    `;
    this.gl = this.canvas.getContext('webgl2', {antialias});

    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertexShader, buildVertexShader({is3d: this.is3d}));
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
      ...(this.is3d ? [
        'cameraTransform',
        'zMin',
        'zMax',
        'zDiv',
      ] : []),
    ].map(name => [name, this.gl.getUniformLocation(program, name)]));
    this.gl.uniform1f(this.uniformLocations.width, this.canvas.width);
    this.gl.uniform1f(this.uniformLocations.height, this.canvas.height);
    this.gl.uniform1f(this.uniformLocations.pixelSize, this.pixelSize);
    if (this.is3d) {
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
    } else {
      this.gl.uniformMatrix3fv(this.uniformLocations.transform, this.gl.FALSE, new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
      ]));
    }

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
    return new HexLines(this);
  }
}

class HexLines  {
  constructor(hexLinesContext) {
    this.hexLinesContext = hexLinesContext;
    this.is3d = this.hexLinesContext.is3d;
    this.gl = this.hexLinesContext.gl;
    this.bytesPerHexPoint = (this.is3d ? 5 : 4) * 4;
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

    this.gl.vertexAttribPointer(startPosition, 2 + this.is3d, this.gl.FLOAT, this.gl.FALSE, this.bytesPerHexPoint, 0);
    this.gl.vertexAttribPointer(startSize, 1, this.gl.FLOAT, this.gl.FALSE, this.bytesPerHexPoint, (2 + this.is3d) * 4);
    this.gl.vertexAttribIPointer(startRgba, 1, this.gl.UNSIGNED_INT, this.bytesPerHexPoint, (3 + this.is3d) * 4);
    this.gl.vertexAttribPointer(endPosition, 2 + this.is3d, this.gl.FLOAT, this.gl.FALSE, this.bytesPerHexPoint, this.bytesPerHexPoint + 0);
    this.gl.vertexAttribPointer(endSize, 1, this.gl.FLOAT, this.gl.FALSE, this.bytesPerHexPoint, this.bytesPerHexPoint + (2 + this.is3d) * 4);
    this.gl.vertexAttribIPointer(endRgba, 1, this.gl.UNSIGNED_INT, this.bytesPerHexPoint, this.bytesPerHexPoint + (3 + this.is3d) * 4);

    this.gl.vertexAttribDivisor(startPosition, 1);
    this.gl.vertexAttribDivisor(startSize, 1);
    this.gl.vertexAttribDivisor(startRgba, 1);
    this.gl.vertexAttribDivisor(endPosition, 1);
    this.gl.vertexAttribDivisor(endSize, 1);
    this.gl.vertexAttribDivisor(endRgba, 1);
  }

  ensureCapacity(ensureLength) {
    const ensureByteLength = ensureLength * this.bytesPerHexPoint;
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

  addPointFlat(x, y, z, size, r, g, b, a) {
    this.dirty = true;
    this.ensureCapacity(this.length + 1);
    this.dataView.setFloat32(this.length * this.bytesPerHexPoint + 0, x, kLittleEndian);
    this.dataView.setFloat32(this.length * this.bytesPerHexPoint + 1 * 4, y, kLittleEndian);
    if (this.is3d) {
      this.dataView.setFloat32(this.length * this.bytesPerHexPoint + 2 * 4, z, kLittleEndian);
    }
    this.dataView.setFloat32(this.length * this.bytesPerHexPoint + (2 + this.is3d) * 4, size, kLittleEndian);
    this.dataView.setUint32(this.length * this.bytesPerHexPoint + (3 + this.is3d) * 4, rgbaToUint32(r, g, b, a), kLittleEndian);
    ++this.length;
  }

  addNull() {
    this.dirty = true;
    this.ensureCapacity(this.length + 1);
    this.dataView.setFloat32(this.length * this.bytesPerHexPoint + (2 + this.is3d) * 4, 0, kLittleEndian);
    ++this.length;
  }

  addPoint(hexPoint) {
    if (hexPoint === null) {
      this.addNull();
      return;
    }
    const {position: {x, y, z=0}, size, colour: {r, g, b, a}} = hexPoint;
    this.addPointFlat(x, y, z, size, r, g, b, a);
  }

  addPoints(hexPoints) {
    this.ensureCapacity(this.length + hexPoints.length);
    for (const hexPoint of hexPoints) {
      this.addPoint(hexPoint);
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
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.dataView, this.gl.DYNAMIC_DRAW, 0, this.length * this.bytesPerHexPoint);
      this.dirty = false;
    }
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 18, this.length - 1);
  }

  remove() {
    this.gl.deleteBuffer(this.buffer);
  }
}