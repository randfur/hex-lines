import {HexLines2d} from '../src/2d/hex-lines-2d.js';
import {GroupDrawing} from '../src/2d/group-drawing.js';
import {LineDrawing} from '../src/2d/line-drawing.js';

const TAU = Math.PI * 2;

async function main() {
  const {hexLines2d, width, height} = HexLines2d.setupFullPageCanvas();

  const stars = (() => {
    const lineBuffer = hexLines2d.createLineBuffer();
    lineBuffer.addDots(
      range(2000).map(i => {
        const radius = Math.random() * Math.max(width, height) / 2;
        const angle = Math.random() * TAU;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return {position: {x, y}, size: 20, angle, colour: {r: 255, g: 255, b: 255}};
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
      {position: {x: 190, y: -120}, size: 50, colour: {r: 255, g: 255, b: 255}}
    );
    return new GroupDrawing({
      opacity: 0.5,
      children: [
        new LineDrawing({lineBuffer}),
      ],
    });
  })();

  const circles = [
    {r: 255, g: 0, b: 0},
    {r: 255, g: 255, b: 0},
    {r: 0, g: 0, b: 255},
  ].map(colour => {
    const lineBuffer = hexLines2d.createLineBuffer();
    lineBuffer.addDot({
      position: {x: 0, y: 0},
      size: 300,
      colour,
    });
    return new LineDrawing({lineBuffer});
  });

  const drawing = new GroupDrawing({
    pixelSize: 4,
    children: [
      stars,
      shape,
      ...circles.map(circle => new GroupDrawing({
        children: [circle],
        opacity: 0.5,
      })),
    ],
  });


  while (true) {
    const time = await new Promise(requestAnimationFrame);

    {
      const angle = TAU * time / 5000;
      const a = Math.cos(angle);
      const b = -Math.sin(angle);
      const c = 0;

      const d = Math.sin(angle);
      const e = Math.cos(angle);
      const f = 0;

      const g = 0;
      const h = 0;
      const i = 1;

      shape.transform = new Float32Array([
        a, b, c,
        d, e, f,
        g, h, i,
      ]);
    }

    for (const [i, circle] of enumerate(circles)) {
      const angle = -TAU * (time + 5000) / (4000 + i * 1234);
      const radius = 400;
      circle.transform = new Float32Array([
        1, 0, Math.cos(angle) * radius,
        0, 1, Math.sin(angle) * radius,
        0, 0, 1,
      ]);
    }

    {
      const angle = time / 1000;
      const radius = 100;
      drawing.transform = new Float32Array([
        1, 0, Math.cos(angle) * radius,
        0, 1, Math.sin(angle) * radius,
        0, 0, 1,
      ]);
    }

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

function* enumerate(list) {
  for (let i = 0; i < list.length; ++i) {
    yield [i, list[i]];
  }
}

main();