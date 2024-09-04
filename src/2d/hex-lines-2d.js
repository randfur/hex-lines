import {LineBuffer} from './line-buffer.js';
import {Pool, PoolMap} from '../utils.js';
import {Layer} from './layer.js';

export class HexLines2d {
  static setupFullPageCanvas() {
    document.body.style.cssText = `
      background-color: black;
      margin: 0px;
      padding: 0px;
      overflow: hidden;
    `;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.append(canvas);

    const gl = canvas.getContext('webgl2');
    const hexLines2d = new HexLines2d(gl, width, height);

    return {hexLines2d, width, height};
  }

  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.layerPoolMap = new PoolMap(
      pixelSize => Layer.createOffscreenBacking(
        this.gl,
        Math.floor(this.width / pixelSize),
        Math.floor(this.height / pixelSize),
      )
    );
    this.mat3Pool = new Pool(() => new Float32Array(9));
    this.canvasLayer = Layer.createCanvasBacking(this.gl, this.width, this.height);
  }

  createLineBuffer() {
    return new LineBuffer(this.gl);
  }

  clear() {
    this.gl.bindRenderbuffer(null);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  draw(drawing) {
    drawing.draw(this.gl, this.layerPoolMap, this.mat3Pool, this.canvasLayer, 1);
    this.mat3Pool.releaseAll();
  }
}
