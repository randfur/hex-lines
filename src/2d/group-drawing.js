import {TextureProgram} from './texture-program.js';
import {multiplyMaybeMat3} from './utils.js';

export class GroupDrawing {
  constructor({pixelSize=1, opacity=1, transform=null, children}) {
    this.pixelSize = pixelSize;
    this.opacity = opacity;
    this.transform = transform;
    this.children = children;
  }

  draw(gl, layerPoolMap, mat3Pool, targetLayer, targetPixelSize, transform) {
    const composedTransform = multiplyMaybeMat3(mat3Pool, transform, this.transform);

    if (this.opacity === 1 && this.pixelSize <= targetPixelSize) {
      for (const child of this.children) {
        child.draw(
          gl,
          layerPoolMap,
          mat3Pool,
          targetLayer,
          targetPixelSize,
          composedTransform,
        );
      }
      return;
    }

    const effectivePixelSize = Math.max(this.pixelSize, targetPixelSize);
    const nestedLayer = layerPoolMap.aquire(effectivePixelSize);
    nestedLayer.targetRenderbuffer();
    gl.clear(gl.COLOR_BUFFER_BIT);
    nestedLayer.targetTextureWithFallback();
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (const child of this.children) {
      child.draw(
        gl,
        layerPoolMap,
        mat3Pool,
        nestedLayer,
        effectivePixelSize,
        composedTransform,
      );
    }
    console.log('want to blit', this);
    nestedLayer.maybeBlitRenderbufferToTexture();
    targetLayer.targetTextureWithFallback();
    TextureProgram.draw(gl, nestedLayer.texture, this.opacity);
    layerPoolMap.release(effectivePixelSize);
  }
}
