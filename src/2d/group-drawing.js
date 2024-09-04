import {TextureProgram} from './texture-program.js';
import {multiplyMaybeMat3} from './utils.js';

export class GroupDrawing {
  constructor({name=null, pixelSize=1, opacity=1, transform=null, children}) {
    this.name = name;
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
    nestedLayer.clear();
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
    nestedLayer.targetTexture();
    targetLayer.targetTextureWithFallback();
    TextureProgram.draw(gl, nestedLayer.texture, this.opacity);
    layerPoolMap.release(effectivePixelSize);
  }
}
