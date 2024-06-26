import {LineProgram} from './line-program.js';
import {kPointByteLength} from './utils.js';

export class LineDrawing {
  constructor({lineBuffer}) {
    this.lineBuffer = lineBuffer;
  }

  draw(gl, framebufferPoolMap, targetFramebuffer, pixelSize) {
    this.lineBuffer.ensureUploaded();
    targetFramebuffer.drawTo();
    LineProgram.draw(
      gl,
      this.lineBuffer.glBuffer,
      Math.floor(this.lineBuffer.usedByteLength / kPointByteLength),
      targetFramebuffer.width,
      targetFramebuffer.height,
      pixelSize,
    );
  }
}