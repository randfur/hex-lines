import {TextureProgram} from './texture-program.js';
import {multiplyMaybeMat3} from './utils.js';

export class GroupDrawing {
  constructor({pixelSize=1, opacity=1, transform=null, children}) {
    this.pixelSize = pixelSize;
    this.opacity = opacity;
    this.transform = transform;
    this.children = children;
  }

  draw(gl, framebufferPoolMap, mat3Pool, targetFramebuffer, targetPixelSize, transform) {
    const composedTransform = multiplyMaybeMat3(mat3Pool, transform, this.transform);

    if (this.opacity === 1 && this.pixelSize <= targetPixelSize) {
      for (const child of this.children) {
        child.draw(
          gl,
          framebufferPoolMap,
          mat3Pool,
          targetFramebuffer,
          targetPixelSize,
          composedTransform,
        );
      }
      return;
    }

    const effectivePixelSize = Math.max(this.pixelSize, targetPixelSize);
    const temporaryFramebuffer = framebufferPoolMap.aquire(effectivePixelSize);
    temporaryFramebuffer.drawTo();
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (const child of this.children) {
      child.draw(
        gl,
        framebufferPoolMap,
        mat3Pool,
        temporaryFramebuffer,
        effectivePixelSize,
        composedTransform,
      );
    }
    targetFramebuffer.drawTo();
    TextureProgram.draw(gl, temporaryFramebuffer.glTexture, this.opacity);
    framebufferPoolMap.release(effectivePixelSize);
  }
}
