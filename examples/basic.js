import {HexLinesContext, rgbaToFloat32} from '../src/hex-lines.js';

function main() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  console.log(canvas.width, canvas.height);
  document.body.append(canvas);
  const hexContext = new HexLinesContext({
    canvas,
    pixelSize: 4,
  }).add(new Float32Array([
    200, 200, 20, rgbaToFloat32({r: 255, g: 0, b: 0, a: 255}),
    500, 440, 20, rgbaToFloat32({r: 255, g: 255, b: 0, a: 255}),
    600, 300, 20, rgbaToFloat32({r: 0, g: 255, b: 0, a: 255}),
    230, 340, 20, rgbaToFloat32({r: 0, g: 200, b: 255, a: 255}),
    330, 140, 20, rgbaToFloat32({r: 0, g: 0, b: 255, a: 255}),
    130, 340, 20, rgbaToFloat32({r: 128, g: 0, b: 255, a: 255}),
    200, 200, 20, rgbaToFloat32({r: 255, g: 0, b: 0, a: 255}),
    0, 0, 0, 0,
    490, 370, 50, rgbaToFloat32({r: 255, g: 255, b: 255, a: 255}),
    490, 370, 50, rgbaToFloat32({r: 255, g: 255, b: 255, a: 255}),
    0, 0, 0, 0,
  ])).draw();
}

main();