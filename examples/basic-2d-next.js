import {HexLinesContext, GroupDrawing, LineDrawing} from '../src/2d/hex-lines-2d.js';

async function main() {
  const {context, width, height} = HexLinesContext.setupFullPageContext();

  const lineBuffer = context.createLineBuffer();
  lineBuffer.addDots(
    range(20).map(i => {
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      return {position: {x, y}, size: 20, colour: {r: 255, g: 255, b: 255}};
    }),
  );
  lineBuffer.addLine([
    {position: {x: -200, y: 140}, size: 20, colour: {r: 255, g: 0, b: 0}},
    {position: {x: 200, y: -200}, size: 20, colour: {r: 255, g: 255, b: 0}},
    {position: {x: 300, y: -60}, size: 20, colour: {r: 0, g: 255, b: 0}},
    {position: {x: -130, y: -100}, size: 20, colour: {r: 0, g: 200, b: 255}},
    {position: {x: 30, y: 180}, size: 20, colour: {r: 0, g: 0, b: 255}},
    {position: {x: -330, y: -100}, size: 20, colour: {r: 128, g: 0, b: 255}},
    {position: {x: -200, y: 140}, size: 20, colour: {r: 255, g: 0, b: 0}},
  ]);
  lineBuffer.addDot(
    {position: {x: 190, y: -130}, size: 50, colour: {r: 255, g: 255, b: 255}}
  );

  const drawing = new GroupDrawing({
    pixelSize: 4,
    children: [
      new LineDrawing({lineBuffer}),
    ],
  });

  context.draw(drawing);
}

function range(n) {
  const result = [];
  for (let i = 0; i < n; ++i) {
    result.push(i);
  }
  return result;
}

main();