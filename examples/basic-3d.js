import {HexContext3d} from '../src/hex-lines-3d.js';

async function main() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.append(canvas);

  const hexContext = new HexContext3d({
    canvas,
    pixelSize: 4,
    zDiv: 400,
  });
  const hexLines = hexContext.createLines();
  hexLines.addPoints([
    ...range(100).flatMap(i => {
      const x = (Math.random() - 0.5) * 1.5 * window.innerWidth;
      const y = (Math.random() - 0.5) * 1.5 * window.innerHeight;
      const z = (Math.random() - 0.5) * 1.5 * window.innerWidth;
      const hexPoint = {position: {x, y, z}, size: 20, colour: {r: 255, g: 255, b: 255, a: 255}};
      return [hexPoint, hexPoint, null];
    }),

    {position: {x: -200, y: 140, z: 0}, size: 20, colour: {r: 255, g: 0, b: 0, a: 255}},
    {position: {x: 200, y: -200, z: -300}, size: 20, colour: {r: 255, g: 255, b: 0, a: 255}},
    {position: {x: 400, y: -60, z: -400}, size: 20, colour: {r: 0, g: 255, b: 0, a: 255}},
    {position: {x: -130, y: -100, z: 400}, size: 20, colour: {r: 0, g: 200, b: 255, a: 255}},
    {position: {x: 30, y: 180, z: 600}, size: 20, colour: {r: 0, g: 0, b: 255, a: 255}},
    {position: {x: -230, y: -100, z: -400}, size: 20, colour: {r: 128, g: 0, b: 255, a: 255}},
    {position: {x: -200, y: 140, z: 0}, size: 20, colour: {r: 255, g: 0, b: 0, a: 255}},
    null,
    {position: {x: 190, y: -130, z: 0}, size: 50, colour: {r: 255, g: 255, b: 255, a: 255}},
    {position: {x: 190, y: -130, z: 0}, size: 50, colour: {r: 255, g: 255, b: 255, a: 255}},
    null,
  ]);

  while (true) {
    const time = await new Promise(requestAnimationFrame);
    const angle = time / 2000;
    hexContext.gl.uniformMatrix4fv(hexContext.uniformLocations.cameraTransform, hexContext.gl.FALSE, new Float32Array([
      Math.cos(angle), 0, Math.sin(angle), 0,
      0, 1, 0, 0,
      -Math.sin(angle), 0, Math.cos(angle), 900,
      0, 0, 0, 1,
    ])),
    hexLines.draw();
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