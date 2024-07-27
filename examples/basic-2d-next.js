import {HexLines2d} from '../src/2d/hex-lines-2d.js';
import {GroupDrawing} from '../src/2d/group-drawing.js';
import {LineDrawing} from '../src/2d/line-drawing.js';

const TAU = Math.PI * 2;

async function main() {
  const {hexLines2d, width, height} = HexLines2d.setupFullPageCanvas();

  const stars = (() => {
    const lineBuffer = hexLines2d.createLineBuffer();
    lineBuffer.addDots(
      range(200).map(i => {
        const radius = Math.random() * Math.max(width, height) / 2;
        const angle = Math.random() * TAU;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return {position: {x, y}, size: 20, colour: {r: 255, g: 255, b: 255}};
      }),
    );
    return new LineDrawing({lineBuffer});
  })();

  const shape = (() => {
    const lineBuffer = hexLines2d.createLineBuffer();
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
    return new GroupDrawing({
      opacity: 0.5,
      children: [
        new LineDrawing({lineBuffer}),
      ],
    });
  })();

  const drawing = new GroupDrawing({
    pixelSize: 4,
    children: [
      stars,
      shape,
    ],
  });


  while (true) {
    await new Promise(requestAnimationFrame);

    const angle = Math.PI * 2 * performance.now() / 5000;
    const c = Math.cos(angle)
    const d = -Math.sin(angle)
    const e = 0

    const f = Math.sin(angle)
    const g = Math.cos(angle)
    const h = 0

    const i = 0
    const j = 0
    const k = 1

    shape.transform = new Float32Array([
      c, d, e,
      f, g, h,
      i, j, k,
    ]);

    drawing.transform = new Float32Array([
      1, 0, Math.cos(performance.now() / 1000) * 200,
      0, 1, Math.sin(performance.now() / 1000) * 200,
      0, 0, 1,
    ]);

    hexLines2d.draw(drawing);
  }
}

function range(n) {
  const result = [];
  for (let i = 0; i < n; ++i) {
    result.push(i);
  }
  return result;
}

main();