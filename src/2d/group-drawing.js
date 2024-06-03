import {TextureProgram} from './texture-program.js';

export class GroupDrawing {
  constructor({pixelSize=1, opacity=1, children}) {
    this.pixelSize = pixelSize;
    this.opacity = opacity;
    this.children = children;
  }

  draw(gl, framebufferPoolMap, targetFramebuffer, targetPixelSize) {
    if (this.opacity === 1 && this.pixelSize <= targetPixelSize) {
      for (const child of this.children) {
        child.draw(gl, framebufferPoolMap, targetFramebuffer, targetPixelSize);
      }
      return;
    }

    const effectivePixelSize = Math.max(this.pixelSize, targetPixelSize);
    const temporaryFramebuffer = framebufferPoolMap.aquire(effectivePixelSize);
    temporaryFramebuffer.drawTo();
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (const child of this.children) {
      child.draw(gl, framebufferPoolMap, temporaryFramebuffer, effectivePixelSize);
    }
    targetFramebuffer.drawTo();
    TextureProgram.draw(gl, temporaryFramebuffer.glTexture, this.opacity);
    framebufferPoolMap.release(effectivePixelSize);
  }
}
