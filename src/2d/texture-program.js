import {logIf} from '../utils.js';

export class TextureProgram {
  static draw(gl, glTexture, opacity) {
    if (!this.program) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      this.program = gl.createProgram();

      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, `#version 300 es
        precision mediump float;

        const vec2 points[] = vec2[4](
          vec2(-1, 1),
          vec2(-1, -1),
          vec2(1, 1),
          vec2(1, -1)
        );

        out vec2 uv;

        void main() {
          uv = (points[gl_VertexID] + vec2(1.0, 1.0)) / 2.0;
          gl_Position = vec4(points[gl_VertexID], 0.0, 1.0);
        }
      `);
      gl.compileShader(vertexShader);
      logIf(gl.getShaderInfoLog(vertexShader));

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, `#version 300 es
        precision mediump float;

        uniform sampler2D texture2D;
        uniform float opacity;

        in vec2 uv;
        out vec4 colour;

        void main() {
          colour = texture(texture2D, uv);
          colour.a *= opacity;
          colour.rgb *= colour.a;
        }
      `);
      gl.compileShader(fragmentShader);
      logIf(gl.getShaderInfoLog(fragmentShader));

      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      gl.linkProgram(this.program);
      logIf(gl.getProgramInfoLog(this.program));

      this.uniformLocation = {
        texture2D: gl.getUniformLocation(this.program, 'texture2D'),
        opacity: gl.getUniformLocation(this.program, 'opacity'),
      };
    }

    gl.useProgram(this.program);
    gl.uniform1i(this.uniformLocation.texture2D, 0);
    gl.uniform1f(this.uniformLocation.opacity, opacity);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
