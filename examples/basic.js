import {HexLinesContext, hexPointsToArrayBuffer} from '../src/hex-lines.js';

function main() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.append(canvas);

  const hexContext = new HexLinesContext({
    canvas,
    pixelSize: 4,
  }).add(hexPointsToArrayBuffer([
    {position: {x: 200, y: 200}, size: 20, colour: {r: 255, g: 0, b: 0, a: 255}},
    {position: {x: 500, y: 440}, size: 20, colour: {r: 255, g: 255, b: 0, a: 255}},
    {position: {x: 600, y: 300}, size: 20, colour: {r: 0, g: 255, b: 0, a: 255}},
    {position: {x: 230, y: 340}, size: 20, colour: {r: 0, g: 200, b: 255, a: 255}},
    {position: {x: 330, y: 140}, size: 20, colour: {r: 0, g: 0, b: 255, a: 255}},
    {position: {x: 130, y: 340}, size: 20, colour: {r: 128, g: 0, b: 255, a: 255}},
    {position: {x: 200, y: 200}, size: 20, colour: {r: 255, g: 0, b: 0, a: 255}},
    null,
    {position: {x: 490, y: 370}, size: 50, colour: {r: 255, g: 255, b: 255, a: 255}},
    {position: {x: 490, y: 370}, size: 50, colour: {r: 255, g: 255, b: 255, a: 255}},
    null,
  ])).draw();
}

main();