import {LineProgram} from './line-program.js';
import {kPointByteLength, multiplyMaybeMat3} from './utils.js';

export class LineDrawing {
  constructor({lineBuffer, transform=null}) {
    this.lineBuffer = lineBuffer;
    this.transform = transform;
  }

  draw(gl, framebufferPoolMap, mat3Pool, targetFramebuffer, pixelSize, transform) {
    this.lineBuffer.ensureUploaded();
    targetFramebuffer.drawTo();
    LineProgram.draw(
      gl,
      this.lineBuffer.glBuffer,
      Math.floor(this.lineBuffer.usedByteLength / kPointByteLength),
      targetFramebuffer.width,
      targetFramebuffer.height,
      pixelSize,
      multiplyMaybeMat3(mat3Pool, transform, this.transform),
    );
  }
}
