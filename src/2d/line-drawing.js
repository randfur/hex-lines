import {LineProgram} from './line-program.js';
import {kPointByteLength, multiplyMaybeMat3} from './utils.js';

export class LineDrawing {
  constructor({name=null, lineBuffer, transform=null}) {
    this.name = name;
    this.lineBuffer = lineBuffer;
    this.transform = transform;
  }

  draw(gl, layerPoolMap, mat3Pool, targetLayer, pixelSize, transform) {
    this.lineBuffer.ensureUploaded();
    targetLayer.targetRenderbuffer();
    LineProgram.draw(
      gl,
      this.lineBuffer.glBuffer,
      Math.floor(this.lineBuffer.usedByteLength / kPointByteLength),
      targetLayer.width,
      targetLayer.height,
      pixelSize,
      multiplyMaybeMat3(mat3Pool, transform, this.transform),
    );
  }
}
