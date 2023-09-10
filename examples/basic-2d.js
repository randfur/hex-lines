import {HexLinesContext} from '../src/hex-lines.js';

function main() {
  const {
    width,
    height,
    hexLinesContext,
  } = HexLinesContext.setupFullPageContext();

  const hexLines = hexLinesContext.createLines();
  hexLines.addPoints([
    ...range(20).flatMap(i => {
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const hexPoint = {position: {x, y}, size: 20, colour: {r: 255, g: 255, b: 255, a: 255}};
      return [hexPoint, hexPoint, null];
    }),

    {position: {x: -200, y: 140}, size: 20, colour: {r: 255, g: 0, b: 0, a: 255}},
    {position: {x: 200, y: -200}, size: 20, colour: {r: 255, g: 255, b: 0, a: 255}},
    {position: {x: 300, y: -60}, size: 20, colour: {r: 0, g: 255, b: 0, a: 255}},
    {position: {x: -130, y: -100}, size: 20, colour: {r: 0, g: 200, b: 255, a: 255}},
    {position: {x: 30, y: 180}, size: 20, colour: {r: 0, g: 0, b: 255, a: 255}},
    {position: {x: -330, y: -100}, size: 20, colour: {r: 128, g: 0, b: 255, a: 255}},
    {position: {x: -200, y: 140}, size: 20, colour: {r: 255, g: 0, b: 0, a: 255}},
    null,
    {position: {x: 190, y: -130}, size: 50, colour: {r: 255, g: 255, b: 255, a: 255}},
    {position: {x: 190, y: -130}, size: 50, colour: {r: 255, g: 255, b: 255, a: 255}},
    null,
  ]);

  hexLines.draw();
}

function range(n) {
  const result = [];
  for (let i = 0; i < n; ++i) {
    result.push(i);
  }
  return result;
}

main();