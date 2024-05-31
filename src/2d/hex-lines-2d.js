import {kLittleEndian, logIf} from '../utils.js';

const kPointByteLength = (
  4 + // x: f32
  4 + // y: f32
  4 + // size: f32
  1 + // r: u8
  1 + // g: u8
  1 + // b: u8
  0
);

export class HexLinesContext {
  static setupFullPageContext() {
    document.body.style.cssText = `
      background-color: black;
      margin: 0px;
      padding: 0px;
      overflow: hidden;
    `;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.append(canvas);

    const gl = canvas.getContext('webgl2');
    const context = new HexLinesContext(gl);

    return {context, width, height};
  }

  constructor(gl) {
    this.gl = gl;
  }

  createLineBuffer() {
    return new LineBuffer(this.gl);
  }

  clear() {
    this.gl.bindRenderbuffer(null);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  draw(drawing) {
    drawing.draw(this);
  }
}

export class LineDrawing {
  constructor({lineBuffer}) {
    this.lineBuffer = lineBuffer;
  }

  draw(context) {
    LineProgram.draw(context.gl);
  }
}

export class GroupDrawing {
  constructor({pixelSize=1, children}) {
    this.pixelSize = pixelSize;
    this.children = children;
  }

  draw(context) {
    for (const child of this.children) {
      child.draw(context);
    }
  }
}

class LineBuffer {
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
    for (const {position: {x, y}, size, colour: {r, g, b}} of dots) {
      this.setPoint(offset, x, y, size, r, g, b);
      offset += kPointByteLength;
      this.setPoint(offset, x, y, size, r, g, b);
      offset += kPointByteLength;
      this.setNull(offset);
      offset += kPointByteLength;
    }
  }

  addDot({position: {x, y}, size, colour: {r, g, b}}) {
    this.dirty = true;
    const offset = this.usedByteLength;
    this.growUsage(kPointByteLength * 3);
    this.setPoint(offset + kPointByteLength * 0, x, y, size, r, g, b);
    this.setPoint(offset + kPointByteLength * 1, x, y, size, r, g, b);
    this.setNull(offset + kPointByteLength * 2);
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
    this.dataView.setFloat32(offset + 8, 0, kLittleEndian);
  }

  clear() {
    this.dirty = true;
    this.usedByteLength = 0;
  }

  growUsage(byteLength) {
    if (this.usedByteLength + byteLength > this.buffer.byteLength) {
      this.buffer = this.buffer.transfer(this.buffer.byteLength * 2);
      this.dataView = new DataView(this.buffer);
    }
    this.usedByteLength += byteLength;
    this.dirty = true;
  }

  upload() {
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
}

class LineProgram {
  static glProgram = null;

  static draw(gl, glBuffer, width, height) {
    if (!this.glProgram) {
      this.glProgram = gl.createProgram();
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, `#version 300 es
        precision mediump float;

        uniform float width;
        uniform float height;

        in vec2 fromPosition;
        in float fromSize;
        in vec3 fromColour;

        in vec2 toPosition;
        in float toSize;
        in vec3 toColour;

        out vec3 colour;

        struct Point {
          float progress;
          vec2 offset;
        };

        const Point points[] = Point[9](
          // First half hexagon.
          Point(0.0, vec2(-sqrt(3.0) / 2.0, 0.5)),
          Point(0.0, vec2(-sqrt(3.0) / 2.0, -0.5)),
          Point(0.0, vec2(0.0, 1.0)),
          Point(0.0, vec2(0.0, -1.0)),

          // Bridge.
          Point(1.0, vec2(0.0, 1.0)),
          Point(1.0, vec2(0.0, -1.0)),

          // Second half hexagon.
          Point(1.0, vec2(sqrt(3.0) / 2.0, 0.5)),
          Point(1.0, vec2(sqrt(3.0) / 2.0, -0.5)),

          // Degenerate triangle.
          Point(1.0, vec2(sqrt(3.0) / 2.0, -0.5))
        );

        vec2 rotate(vec2 v, vec2 r) {
          /*
            (a, b) = v
            (c, d) = r

            v * (x * r) =
            (ax + by) * x * (cx + dy) =
            (ax + by) * (cxx + dxy) =
            (ax + by) * (c + dxy) =
            acx + adxxy + bcy + bdyxy =
            acx + ady + bcy - bdx =
            (ac - bd)x + (ad + bc)y
          */

          return vec2(
            v.x * r.x - v.y * r.y,
            v.x * r.y + v.y * r.x
          );
        }

        vec2 getRotation(vec2 from, vec2 to) {
          return from == to
            ? vec2(
                cos(float(gl_InstanceID) / 2.0),
                sin(float(gl_InstanceID) / 2.0)
              )
            : normalize(to - from);
        }

        void main() {
          Point point = points[gl_VertexID];
          float enabled = float(fromSize > 0.0 && toSize > 0.0);
          vec2 position = mix(fromPosition, toPosition, point.progress);
          vec2 offset = (
            mix(fromSize, toSize, point.progress) *
            rotate(
              point.offset,
              getRotation(fromPosition, toPosition)
            )
          );

          gl_Position = vec4(
            enabled * (position + offset) / vec2(width, height) / 2.0,
            0,
            1
          );

          colour = mix(fromColour, toColour, point.progress);
        }
      `);
      gl.compileShader(vertexShader);
      logIf(gl.getShaderInfoLog(vertexShader));
    }
  }
}