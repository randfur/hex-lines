export class HexLinesContext {
  constructor({canvas, pixelSize}) {
    this.canvas = canvas;
    this.gl = this.canvas.getContext('webgl2');

    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertexShader, `#version 300 es
      precision mediump float;

      uniform float width;
      uniform float height;
      uniform float pixelSize;
      uniform vec3 transform;

      in vec2 startPosition;
      in float startSize;
      in uint startRGBA;

      in vec2 endPosition;
      in float endSize;
      in uint endRGBA;

      out vec4 vertexColour;

      struct HexLineVertex {
        vec2 start;
        vec2 end;
        float progress;
      };

      const HexLineVertex kHexLineVertices[] = HexLineVertex[30](
        // Start hex.
        HexLineVertex(vec2(sqrt(3.) / 4., 0.25), vec2(0, 0), 0.),
        HexLineVertex(vec2(0, 0.5), vec2(0, 0), 0.),
        HexLineVertex(vec2(-sqrt(3.) / 4., 0.25), vec2(0, 0), 0.),
        HexLineVertex(vec2(-sqrt(3.) / 4., 0.25), vec2(0, 0), 0.),
        HexLineVertex(vec2(sqrt(3.) / 4., -0.25), vec2(0, 0), 0.),
        HexLineVertex(vec2(sqrt(3.) / 4., 0.25), vec2(0, 0), 0.),
        HexLineVertex(vec2(-sqrt(3.) / 4., 0.25), vec2(0, 0), 0.),
        HexLineVertex(vec2(-sqrt(3.) / 4., -0.25), vec2(0, 0), 0.),
        HexLineVertex(vec2(sqrt(3.) / 4., -0.25), vec2(0, 0), .0),
        HexLineVertex(vec2(sqrt(3.) / 4., -0.25), vec2(0, 0), 0.),
        HexLineVertex(vec2(-sqrt(3.) / 4., -0.25), vec2(0, 0), 0.),
        HexLineVertex(vec2(0, -0.5), vec2(0, 0), 0.),

        // Bridge
        HexLineVertex(vec2(0, -0.5), vec2(0, 0), 0.),
        HexLineVertex(vec2(0, 0.5), vec2(0, 0), 0.),
        HexLineVertex(vec2(0, 0), vec2(0, 0.5), 1.),
        HexLineVertex(vec2(0, -0.5), vec2(0, 0), 0.),
        HexLineVertex(vec2(0, 0), vec2(0, 0.5), 1.),
        HexLineVertex(vec2(0, 0), vec2(0, -0.5), 1.),

        // End hex.
        HexLineVertex(vec2(0, 0), vec2(sqrt(3.) / 4., 0.25), 1.),
        HexLineVertex(vec2(0, 0), vec2(0, 0.5), 1.),
        HexLineVertex(vec2(0, 0), vec2(-sqrt(3.) / 4., 0.25), 1.),
        HexLineVertex(vec2(0, 0), vec2(-sqrt(3.) / 4., 0.25), 1.),
        HexLineVertex(vec2(0, 0), vec2(sqrt(3.) / 4., -0.25), 1.),
        HexLineVertex(vec2(0, 0), vec2(sqrt(3.) / 4., 0.25), 1.),
        HexLineVertex(vec2(0, 0), vec2(-sqrt(3.) / 4., 0.25), 1.),
        HexLineVertex(vec2(0, 0), vec2(-sqrt(3.) / 4., -0.25), 1.),
        HexLineVertex(vec2(0, 0), vec2(sqrt(3.) / 4., -0.25), 1.),
        HexLineVertex(vec2(0, 0), vec2(sqrt(3.) / 4., -0.25), 1.),
        HexLineVertex(vec2(0, 0), vec2(-sqrt(3.) / 4., -0.25), 1.),
        HexLineVertex(vec2(0, 0), vec2(0, -0.5), 1.)
      );

      vec2 rotate(vec2 v, vec2 rotation) {
        return vec2(
          v.x * rotation.x - v.y * rotation.y,
          v.x * rotation.y + v.y * rotation.x);
      }

      vec4 rgbaToColour(uint rgba) {
        return vec4(1, 0, 0, 1);
      }

      void main() {
        vec2 rotation = normalize(endPosition - startPosition);
        HexLineVertex hexLineVertex = kHexLineVertices[gl_VertexID];
        gl_Position = vec4(
          mix(
            startPosition + rotate(hexLineVertex.start, rotation) * startSize,
            endPosition + rotate(hexLineVertex.end, rotation) * endSize,
            hexLineVertex.progress),
          0, 1);

        vertexColour = mix(rgbaToColour(startRGBA), rgbaToColour(endRGBA), hexLineVertex.progress);
      }
    `);
    this.gl.compileShader(vertexShader);
    console.log(this.gl.getShaderInfoLog(vertexShader));

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
    console.log(this.gl.getShaderInfoLog(fragmentShader));

    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    console.log(this.gl.getProgramInfoLog(program));
    this.gl.useProgram(program);

    // TODO:
    // - Use pixelSize.

    // Testing:
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 30);
  }

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
    // this.gl.enableVertexAttribArray(this.hexLinesContext.
    this.buffer = this.gl.createBuffer();
    this.update(bufferData);
  }

  update(bufferData) {
    this.length = bufferData.bytesLength / kBytesPerHexPoint;
    this.gl.bufferData(this.buffer, bufferData);
  }

  draw() {
    this.gl.bindVertexArray(this.vertexArray);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer, this.gl.DYNAMIC_DRAW);
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 30, this.length - 1);
  }

  remove() {
    this.gl.deleteBuffer(this.buffer);
  }
}
