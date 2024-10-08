const kMaxSamples = 5;

export class Layer {
  static createCanvasBacking(gl, width, height) {
    return new Layer({
      gl,
      width,
      height,
      textureFramebuffer: null,
      texture: null,
      renderbuffer: null,
      renderbufferFramebuffer: null,
    });
  }

  static createOffscreenBacking(gl, width, height) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const textureFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, textureFramebuffer);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    const renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    const samples = Math.min(gl.getParameter(gl.MAX_SAMPLES), kMaxSamples);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, width, height);

    const renderbufferFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, renderbufferFramebuffer);
    gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);

    return new Layer({
      gl,
      width,
      height,
      textureFramebuffer,
      texture,
      renderbuffer,
      renderbufferFramebuffer,
    });
  }

  constructor({gl, width, height, texture, textureFramebuffer, renderbuffer, renderbufferFramebuffer}) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.texture = texture;
    this.textureFramebuffer = textureFramebuffer;
    this.renderbuffer = renderbuffer;
    this.renderbufferFramebuffer = renderbufferFramebuffer;
    this.targetFramebuffer = null;
  }

  clear() {
    if (this.textureFramebuffer) {
      this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.textureFramebuffer);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.renderbufferFramebuffer);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.targetFramebuffer = null;
  }

  targetRenderbuffer() {
    if (this.textureFrameBuffer && this.targetFramebuffer === this.textureFramebuffer) {
      this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.textureFramebuffer);
      this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.renderbufferFramebuffer);
      this.gl.blitFramebuffer(0, 0, this.width, this.height, 0, 0, this.width, this.height, this.gl.COLOR_BUFFER_BIT, this.gl.NEAREST);
    }
    this.targetFramebuffer = this.renderbufferFramebuffer;
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.targetFramebuffer);
    this.gl.viewport(0, 0, this.width, this.height);
  }

  targetTexture() {
    console.assert(this.textureFramebuffer);
    if (this.renderbufferFramebuffer && this.targetFramebuffer === this.renderbufferFramebuffer) {
      this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.renderbufferFramebuffer);
      this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.textureFramebuffer);
      this.gl.blitFramebuffer(0, 0, this.width, this.height, 0, 0, this.width, this.height, this.gl.COLOR_BUFFER_BIT, this.gl.NEAREST);
    }
    this.targetFramebuffer = this.textureFramebuffer;
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.targetFramebuffer);
    this.gl.viewport(0, 0, this.width, this.height);
  }

  targetTextureWithFallback() {
    if (this.textureFramebuffer) {
      this.targetTexture();
    } else {
      this.targetRenderbuffer();
    }
  }
}
