import {HexLinesContext} from '../src/hex-lines.js';

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
    -0.6, -0.4, 0.4, 1234,
    0.3, 0.5, 0.3, 5678,
    0, 0, 0, 0,
  ])).draw();
}

main();