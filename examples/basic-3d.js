import {HexLinesContext3d, hexPoints3dToArrayBuffer} from '../src/hex-lines-3d.js';

function main() {
  const canvas = document.createElement('canvas');
  const hexContext = new HexLinesContext3d({
    canvas,
    z: {
      near: 1,
      far: 1000,
      div: 800,
    },
    pixelSize: 4,
    antialias: true,
  }).add(hexPoints3dToArrayBuffer([
    {position: {x: -300, y: 100, z: 10}, size: 30, colour: {r: 255}},
    {position: {x: 300, y: 50, z: 50}, size: 30, colour: {r: 255, g: 255}},
    null,
  ])).draw();
}

main();