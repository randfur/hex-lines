import {kLittleEndian, rgbaToUint32, logIf} from './utils.js';
import {buildVertexShader, kFragmentShader} from './shaders.js';

export const kBytesPerHexPoint3d = 5 * 4;

export function setHexPoint3d(dataView, i, hexPoint3d) {
  if (hexPoint3d === null) {
    dataView.setFloat32(i * kBytesPerHexPoint3d + 8, 0, kLittleEndian);
    return;
  }
  const {position: {x, y, z}, size, colour} = hexPoint3d;
  dataView.setFloat32(i * kBytesPerHexPoint3d + 0, x, kLittleEndian);
  dataView.setFloat32(i * kBytesPerHexPoint3d + 4, y, kLittleEndian);
  dataView.setFloat32(i * kBytesPerHexPoint3d + 8, z, kLittleEndian);
  dataView.setFloat32(i * kBytesPerHexPoint3d + 12, size, kLittleEndian);
  dataView.setUint32(i * kBytesPerHexPoint3d + 16, rgbaToUint32(colour), kLittleEndian);
}

export function setHexPoints3d(dataView, hexPoints3d) {
  for (let i = 0; i < hexPoints3d.length; ++i) {
    setHexPoint3d(dataView, i, hexPoints3d[i]);
  }
}

export function hexPoints3dToArrayBuffer(hexPoints3d) {
  const buffer = new ArrayBuffer(hexPoints3d.length * kBytesPerHexPoint3d);
  setHexPoints3d(new DataView(buffer), hexPoints3d);
  return buffer;
}

export class HexLinesContext3d {
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

  // [ x, y, z, size, rgba, ... ]
  add(bufferData) {
    return new HexLinesHandle3d(this, bufferData);
  }
}

class HexLinesHandle3d {
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

  update(bufferData) {
    this.length = bufferData.byteLength / kBytesPerHexPoint3d;
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
