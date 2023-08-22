import {HexLinesContext} from '../src/hex-lines.js';

function main() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.append(canvas);
  const hexContext = new HexLinesContext({
    canvas,
    pixelSize: 4,
  });
}

main();