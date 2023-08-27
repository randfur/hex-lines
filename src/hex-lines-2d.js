import {kLittleEndian, rgbaToUint32, logIf} from './utils.js';
import {buildVertexShader, kFragmentShader} from './shaders.js';

export const kBytesPerHexPoint2d = 4 * 4;

export function setHexPoint2d(dataView, i, hexPoint2d) {
  if (hexPoint2d === null) {
    dataView.setFloat32(i * kBytesPerHexPoint2d + 8, 0, kLittleEndian);
    return;
  }
  const {position: {x, y}, size, colour} = hexPoint2d;
  dataView.setFloat32(i * kBytesPerHexPoint2d + 0, x, kLittleEndian);
  dataView.setFloat32(i * kBytesPerHexPoint2d + 4, y, kLittleEndian);
  dataView.setFloat32(i * kBytesPerHexPoint2d + 8, size, kLittleEndian);
  dataView.setUint32(i * kBytesPerHexPoint2d + 12, rgbaToUint32(colour), kLittleEndian);
}

export function setHexPoints2d(dataView, hexPoints2d) {
  for (let i = 0; i < hexPoints2d.length; ++i) {
    setHexPoint2d(dataView, i, hexPoints2d[i]);
  }
}

export function hexPoints2dToArrayBuffer(hexPoints2d) {
  const buffer = new ArrayBuffer(hexPoints2d.length * kBytesPerHexPoint2d);
  setHexPoints2d(new DataView(buffer), hexPoints2d);
  return buffer;
}

export class HexLinesContext2d {
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

  // [ x, y, size, rgba, ... ]
  add(bufferData) {
    return new HexLinesHandle2d(this, bufferData);
  }
}

class HexLinesHandle2d {
  constructor(hexLinesContext, bufferData) {
    this.hexLinesContext = hexLinesContext;
    this.gl = this.hexLinesContext.gl;
    this.vertexArray = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.vertexArray);

    this.buffer = this.gl.createBuffer();
    this.update(bufferData);

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

  update(bufferData) {
    this.length = bufferData.byteLength / kBytesPerHexPoint2d;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, bufferData, this.gl.DYNAMIC_DRAW);
  }

  draw() {
    this.gl.bindVertexArray(this.vertexArray);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 18, this.length - 1);
  }

  remove() {
    this.gl.deleteBuffer(this.buffer);
  }
}
