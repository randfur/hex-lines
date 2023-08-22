export class HexLinesContext {
  constructor({canvas, pixelSize}) {
    this.canvas = canvas;
    this.gl = this.canvas.getContext('webgl2');

    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertexShader, `#version 300 es
      precision mediump float;

      const vec2 kVertices[] = vec2[3](
        vec2(0, 0),
        vec2(1, 0),
        vec2(0, 1)
      );

      void main() {
        gl_Position = vec4(kVertices[gl_VertexID], 0, 1);
      }
    `);
    this.gl.compileShader(vertexShader);
    console.log(this.gl.getShaderInfoLog(vertexShader));

    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragmentShader, `#version 300 es
      precision mediump float;

      out vec4 colour;

      void main() {
        colour = vec4(1, 0, 0, 1);
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
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);

    // TODO:
    // - Use pixelSize.
    // - Recreate hex line drawing.
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
