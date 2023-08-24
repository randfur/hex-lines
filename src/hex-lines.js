export class HexLinesContext {
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

      in vec2 startPosition;
      in float startSize;
      in uint startRGBA;

      in vec2 endPosition;
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

      vec2 screenToClip(vec2 v) {
        v /= vec2(width, height);
        v *= 2.;
        v -= vec2(1, 1);
        return vec2(v.x, -v.y);
      }

      void main() {
        vec2 angle = endPosition == startPosition ? vec2(0, 1) : normalize(endPosition - startPosition);
        HexLineVertex hexLineVertex = kHexLineVertices[gl_VertexID];
        vec2 screenPosition =
          (
            mix(startPosition, endPosition, hexLineVertex.progress) +
            rotate(hexLineVertex.offset, angle) *
            mix(startSize, endSize, hexLineVertex.progress)
          ) / pixelSize;
        bool enabled = startSize > 0. && endSize > 0.;

        gl_Position = vec4(float(enabled) * screenToClip(screenPosition), 0, 1);
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
    return new HexLinesHandle(this, bufferData);
  }
}

const kBytesPerHexPoint = 4 * 4;

class HexLinesHandle {
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

    this.gl.vertexAttribPointer(startPosition, 2, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint, 0);
    this.gl.vertexAttribPointer(startSize, 1, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint, 2 * 4);
    this.gl.vertexAttribIPointer(startRGBA, 1, this.gl.UNSIGNED_INT, kBytesPerHexPoint, 3 * 4);
    this.gl.vertexAttribPointer(endPosition, 2, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint, kBytesPerHexPoint + 0);
    this.gl.vertexAttribPointer(endSize, 1, this.gl.FLOAT, this.gl.FALSE, kBytesPerHexPoint, kBytesPerHexPoint + 2 * 4);
    this.gl.vertexAttribIPointer(endRGBA, 1, this.gl.UNSIGNED_INT, kBytesPerHexPoint, kBytesPerHexPoint + 3 * 4);

    this.gl.vertexAttribDivisor(startPosition, 1);
    this.gl.vertexAttribDivisor(startSize, 1);
    this.gl.vertexAttribDivisor(startRGBA, 1);
    this.gl.vertexAttribDivisor(endPosition, 1);
    this.gl.vertexAttribDivisor(endSize, 1);
    this.gl.vertexAttribDivisor(endRGBA, 1);
  }

  update(bufferData) {
    this.length = bufferData.byteLength / kBytesPerHexPoint;
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

const sharedArrayBuffer = new ArrayBuffer(4);
const sharedDataView = new DataView(sharedArrayBuffer);
export function rgbaToFloat32({r, g, b, a}) {
  sharedDataView.setUint32(0,
    ((r & 0xff) << (3 * 8)) |
    ((g & 0xff) << (2 * 8)) |
    ((b & 0xff) << (1 * 8)) |
    ((a & 0xff) << (0 * 8)));
  return sharedDataView.getFloat32(0);
}

function logIf(text) {
  if (text !== '') {
    console.log(text);
  }
}