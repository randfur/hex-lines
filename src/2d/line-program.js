import {logIf} from '../utils.js';
import {kPointByteLength} from './utils.js';

export class LineProgram {
  static draw(gl, glBuffer, pointCount, width, height, pixelSize) {
    if (!this.glProgram) {
      this.glProgram = gl.createProgram();
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, `#version 300 es
        precision mediump float;

        uniform float width;
        uniform float height;
        uniform float pixelSize;

        in vec2 fromPosition;
        in float fromSize;
        in vec3 fromColour;

        in vec2 toPosition;
        in float toSize;
        in vec3 toColour;

        out vec3 vertexColour;

        struct Point {
          float progress;
          vec2 offset;
        };

        const Point points[] = Point[9](
          // First half hexagon.
          Point(0.0, vec2(-sqrt(3.0) / 4.0, 0.25)),
          Point(0.0, vec2(-sqrt(3.0) / 4.0, -0.25)),
          Point(0.0, vec2(0.0, 0.5)),
          Point(0.0, vec2(0.0, -0.5)),

          // Bridge.
          Point(1.0, vec2(0.0, 0.5)),
          Point(1.0, vec2(0.0, -0.5)),

          // Second half hexagon.
          Point(1.0, vec2(sqrt(3.0) / 4.0, 0.25)),
          Point(1.0, vec2(sqrt(3.0) / 4.0, -0.25)),

          // Degenerate triangle.
          Point(1.0, vec2(sqrt(3.0) / 4.0, -0.25))
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
            enabled * (position + offset) / (vec2(width, height) / 2.0) / pixelSize,
            0,
            1
          );

          vertexColour = mix(fromColour, toColour, point.progress) / 255.0;
        }
      `);
      gl.compileShader(vertexShader);
      logIf(gl.getShaderInfoLog(vertexShader));

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, `#version 300 es
        precision mediump float;

        in vec3 vertexColour;
        out vec4 fragmentColour;

        void main() {
          fragmentColour = vec4(vertexColour, 1.0);
        }
      `);
      gl.compileShader(fragmentShader);
      logIf(gl.getShaderInfoLog(fragmentShader));

      gl.attachShader(this.glProgram, vertexShader);
      gl.attachShader(this.glProgram, fragmentShader);
      gl.linkProgram(this.glProgram);
      logIf(gl.getProgramInfoLog(this.glProgram));

      this.uniformLocation = {
        width: gl.getUniformLocation(this.glProgram, 'width'),
        height: gl.getUniformLocation(this.glProgram, 'height'),
        pixelSize: gl.getUniformLocation(this.glProgram, 'pixelSize'),
      };

      gl.useProgram(this.glProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);

      this.attributeLocation = {};
      for (const attribute of ['fromPosition', 'fromSize', 'fromColour', 'toPosition', 'toSize', 'toColour']) {
        const location = gl.getAttribLocation(this.glProgram, attribute);
        this.attributeLocation[attribute] = location;
        gl.enableVertexAttribArray(location);
        gl.vertexAttribDivisor(location, 1);
      };
    }

    gl.useProgram(this.glProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);

    gl.vertexAttribPointer(this.attributeLocation.fromPosition, 2, gl.FLOAT, gl.FALSE, kPointByteLength, 0);
    gl.vertexAttribPointer(this.attributeLocation.fromSize, 1, gl.FLOAT, gl.FALSE, kPointByteLength, 8);
    gl.vertexAttribPointer(this.attributeLocation.fromColour, 3, gl.UNSIGNED_BYTE, gl.TRUE, kPointByteLength, 12);
    gl.vertexAttribPointer(this.attributeLocation.toPosition, 2, gl.FLOAT, gl.FALSE, kPointByteLength, 16);
    gl.vertexAttribPointer(this.attributeLocation.toSize, 1, gl.FLOAT, gl.FALSE, kPointByteLength, 24);
    gl.vertexAttribPointer(this.attributeLocation.toColour, 3, gl.UNSIGNED_BYTE, gl.TRUE, kPointByteLength, 28);

    gl.uniform1f(this.uniformLocation.width, width);
    gl.uniform1f(this.uniformLocation.height, height);
    gl.uniform1f(this.uniformLocation.pixelSize, pixelSize);

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 9, pointCount - 1);
  }
}
