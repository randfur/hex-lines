import {HexLinesContext} from '../src/hex-lines.js';

function main() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerHeight;
  canvas.height = window.innerHeight;
  document.body.append(canvas);
  const hexContext = new HexLinesContext({
    canvas,
    pixelSize: 4,
  });
}

main();