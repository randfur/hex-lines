import {HexLinesContext, rgbaToFloat32} from '../src/hex-lines.js';

function main() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerHeight;
  canvas.height = window.innerHeight;
  document.body.append(canvas);
  const hexContext = new HexLinesContext({
    canvas,
    pixelSize: 4,
  }).add(new Float32Array([
    0, 0, 0, 0,
    -0.6, -0.4, 0.4, rgbaToFloat32({r: 255, g: 0, b: 0, a: 255}),
    0.3, 0.5, 0.3, rgbaToFloat32({r: 255, g: 255, b: 0, a: 255}),
    0, 0, 0, 0,
  ])).draw();
}

main();