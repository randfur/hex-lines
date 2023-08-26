import {kLittleEndian, rgbaToUint32, logIf} from './utils.js';

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
    this.gl.shaderSource(vertexShader, `#version 300 es
      precision mediump float;

      uniform float width;
      uniform float height;
      uniform float pixelSize;
      // uniform mat3 transform;
      uniform mat4 cameraTransform;
      uniform float cameraPerspective;

      in vec3 startPosition;
      in float startSize;
      in uint startRGBA;

      in vec3 endPosition;
      in float endSize;
      in uint endRGBA;

      out vec4 vertexColour;

      struct HexLineVertex {
        vec2 offset;
        float progress;
      };

      const HexLineVertex kHexLineVertices[] = HexLineVertex[18](
        // Start hemihex.
        HexLineVertex(vec2(0, 0.5), 0.),
        HexLineVertex(vec2(0, -0.5), 0.),
        HexLineVertex(vec2(-sqrt(3.) / 4., -0.25), 0.),
        HexLineVertex(vec2(0, 0.5), 0.),
        HexLineVertex(vec2(-sqrt(3.) / 4., -0.25), 0.),
        HexLineVertex(vec2(-sqrt(3.) / 4., 0.25), 0.),

        // Bridge
        HexLineVertex(vec2(0, -0.5), 0.),
        HexLineVertex(vec2(0, 0.5), 0.),
        HexLineVertex(vec2(0, 0.5), 1.),
        HexLineVertex(vec2(0, -0.5), 0.),
        HexLineVertex(vec2(0, 0.5), 1.),
        HexLineVertex(vec2(0, -0.5), 1.),

        // End hemihex.
        HexLineVertex(vec2(0, 0.5), 1.),
        HexLineVertex(vec2(sqrt(3.) / 4., -0.25), 1.),
        HexLineVertex(vec2(0, -0.5), 1.),
        HexLineVertex(vec2(0, 0.5), 1.),
        HexLineVertex(vec2(sqrt(3.) / 4., 0.25), 1.),
        HexLineVertex(vec2(sqrt(3.) / 4., -0.25), 1.)
      );

      vec2 rotate(vec2 v, vec2 angle) {
        // v = ax + by
        // angle = cx + dy
        // bivector = x * angle
        //   = cxx + dxy
        //   = c + dxy
        // v * bivector = (ax + by) * (c + dxy)
        //   = acx + adxxy + bcy + bdyxy
        //   = acx + ady + bcy - bdx
        //   = (ac - bd)x + (ad + bc)y
        return vec2(
          v.x * angle.x - v.y * angle.y,
          v.x * angle.y + v.y * angle.x);
      }

      vec4 rgbaToColour(uint rgba) {
        return vec4(
          float((rgba >> (3 * 8)) & 0xffu) / 255.,
          float((rgba >> (2 * 8)) & 0xffu) / 255.,
          float((rgba >> (1 * 8)) & 0xffu) / 255.,
          float((rgba >> (0 * 8)) & 0xffu) / 255.);
      }

      void main() {
        vec3 transformedStartPosition = startPosition * cameraTransform;
        vec3 transformedEndPosition = endPosition * cameraTransform;

        vec2 angle = endPosition == startPosition ? vec2(cos(float(gl_InstanceID)), sin(float(gl_InstanceID))) : normalize(endPosition - startPosition);
        HexLineVertex hexLineVertex = kHexLineVertices[gl_VertexID];
        vec2 screenPosition =
          (
            mix(startPosition, endPosition, hexLineVertex.progress) +
            rotate(hexLineVertex.offset, angle) *
            mix(startSize, endSize, hexLineVertex.progress)
          ) / pixelSize;
        bool enabled = startSize > 0. && endSize > 0.;

        gl_Position = vec4(
          float(enabled) * screenPosition / vec2(width / 2., height / 2.),
          0,
          1);
        vertexColour = mix(rgbaToColour(startRGBA), rgbaToColour(endRGBA), hexLineVertex.progress);
      }
    `);
    this.gl.compileShader(vertexShader);
    logIf(this.gl.getShaderInfoLog(vertexShader));

    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragmentShader, `#version 300 es
      precision mediump float;

      in vec4 vertexColour;
      out vec4 fragmentColour;

      void main() {
        fragmentColour = vertexColour;
      }
    `);
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

    this.attributeLocations = Object.fromEntries([
      'startPosition',
      'startSize',
      'startRGBA',
      'endPosition',
      'endSize',
      'endRGBA',
    ].map(name => [name, this.gl.getAttribLocation(program, name)]));
  }

  // [ x, y, size, rgba, ... ]
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
      startRGBA,
      endPosition,
      endSize,
      endRGBA,
    } = this.hexLinesContext.attributeLocations;
    this.gl.enableVertexAttribArray(startPosition);
    this.gl.enableVertexAttribArray(startSize);
    this.gl.enableVertexAttribArray(startRGBA);
    this.gl.enableVertexAttribArray(endPosition);
    this.gl.enableVertexAttribArray(endSize);
    this.gl.enableVertexAttribArray(endRGBA);

    this.gl.vertexAttribPointer(startPosition, 2, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint3d, 0);
    this.gl.vertexAttribPointer(startSize, 1, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint3d, 2 * 4);
    this.gl.vertexAttribIPointer(startRGBA, 1, this.gl.UNSIGNED_INT, kBytesPerHexPoint3d, 3 * 4);
    this.gl.vertexAttribPointer(endPosition, 2, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint3d, kBytesPerHexPoint3d + 0);
    this.gl.vertexAttribPointer(endSize, 1, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint3d, kBytesPerHexPoint3d + 2 * 4);
    this.gl.vertexAttribIPointer(endRGBA, 1, this.gl.UNSIGNED_INT, kBytesPerHexPoint3d, kBytesPerHexPoint3d + 3 * 4);

    this.gl.vertexAttribDivisor(startPosition, 1);
    this.gl.vertexAttribDivisor(startSize, 1);
    this.gl.vertexAttribDivisor(startRGBA, 1);
    this.gl.vertexAttribDivisor(endPosition, 1);
    this.gl.vertexAttribDivisor(endSize, 1);
    this.gl.vertexAttribDivisor(endRGBA, 1);
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
