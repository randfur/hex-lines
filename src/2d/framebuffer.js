export class Framebuffer {
  static createCanvasBacking(gl, width, height) {
    return new Framebuffer(gl, null, null, width, height);
  }

  static createTextureBacking(gl, width, height) {
    const glTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const glFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, glFramebuffer);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glTexture, 0);

    return new Framebuffer(gl, glFramebuffer, glTexture, width, height);
  }

  constructor(gl, glFramebuffer, glTexture, width, height) {
    this.gl = gl;
    this.glFramebuffer = glFramebuffer;
    this.glTexture = glTexture;
    this.width = width;
    this.height = height;
  }

  drawTo() {
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.glFramebuffer);
    this.gl.viewport(0, 0, this.width, this.height);
  }
}
