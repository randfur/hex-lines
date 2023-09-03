export function buildVertexShader({is3d}) {
  return `#version 300 es
precision mediump float;

uniform float width;
uniform float height;
uniform float pixelSize;
uniform mat${3 + is3d} transform;
uniform mat${3 + is3d} cameraTransform;
${is3d ? `
uniform float zMin;
uniform float zMax;
uniform float zDiv;
` : ''}

in vec${2 + is3d} startPosition;
in float startSize;
in uint startRgba;

in vec${2 + is3d} endPosition;
in float endSize;
in uint endRgba;

out vec4 vertexColour;

struct HexLineVertex {
  vec2 offset;
  float progress;
};

const HexLineVertex kHexLineVertices[] = HexLineVertex[18](
  // Start hemihex.
  HexLineVertex(vec2(0, 0.5), 0.),
  HexLineVertex(vec2(0, -0.5), 0.),
  HexLineVertex(vec2(-sqrt(3.) / 4., -0.25), 0.),
  HexLineVertex(vec2(0, 0.5), 0.),
  HexLineVertex(vec2(-sqrt(3.) / 4., -0.25), 0.),
  HexLineVertex(vec2(-sqrt(3.) / 4., 0.25), 0.),

  // Bridge
  HexLineVertex(vec2(0, -0.5), 0.),
  HexLineVertex(vec2(0, 0.5), 0.),
  HexLineVertex(vec2(0, 0.5), 1.),
  HexLineVertex(vec2(0, -0.5), 0.),
  HexLineVertex(vec2(0, 0.5), 1.),
  HexLineVertex(vec2(0, -0.5), 1.),

  // End hemihex.
  HexLineVertex(vec2(0, 0.5), 1.),
  HexLineVertex(vec2(sqrt(3.) / 4., -0.25), 1.),
  HexLineVertex(vec2(0, -0.5), 1.),
  HexLineVertex(vec2(0, 0.5), 1.),
  HexLineVertex(vec2(sqrt(3.) / 4., 0.25), 1.),
  HexLineVertex(vec2(sqrt(3.) / 4., -0.25), 1.)
);

vec2 rotate(vec2 v, vec2 angle) {
  // v = ax + by
  // angle = cx + dy
  // bivector = x * angle
  //   = cxx + dxy
  //   = c + dxy
  // v * bivector = (ax + by) * (c + dxy)
  //   = acx + adxxy + bcy + bdyxy
  //   = acx + ady + bcy - bdx
  //   = (ac - bd)x + (ad + bc)y
  return vec2(
    v.x * angle.x - v.y * angle.y,
    v.x * angle.y + v.y * angle.x);
}

${is3d ? `
float getZ(float z) {
  // a * zMin + b = -1
  // a * zMax + b = 1
  //
  // a * (zMax - zMin) = 2
  // a = 2 / (zMax - zMin)
  //
  // 2 / (zMax - zMin) * zMax + b = 1
  // b = 1 - 2 / (zMax - zMin) * zMax

  float a = 2. / (zMax - zMin);
  float b = 1. - 2. / (zMax - zMin) * zMax;
  return (a * z + b) / zDiv;
}

float getW(float z) {
  return z / zDiv;
}
` : ''}

vec2 getOffset(HexLineVertex hexLineVertex, vec2 start, vec2 end) {
  vec2 angle =
    start == end
    ? vec2(cos(float(gl_InstanceID)), sin(float(gl_InstanceID)))
    : normalize(end - start);
  return rotate(hexLineVertex.offset, angle) * mix(startSize, endSize, hexLineVertex.progress);
}

vec4 rgbaToColour(uint rgba) {
  return vec4(
    float((rgba >> (3 * 8)) & 0xffu) / 255.,
    float((rgba >> (2 * 8)) & 0xffu) / 255.,
    float((rgba >> (1 * 8)) & 0xffu) / 255.,
    float((rgba >> (0 * 8)) & 0xffu) / 255.);
}

void main() {
  HexLineVertex hexLineVertex = kHexLineVertices[gl_VertexID];

  vec${3 + is3d} startTransformedPosition = vec${3 + is3d}(startPosition, 1) * transform * cameraTransform;
  vec${3 + is3d} endTransformedPosition = vec${3 + is3d}(endPosition, 1) * transform * cameraTransform;
  vec${3 + is3d} transformedPosition = mix(startTransformedPosition, endTransformedPosition, hexLineVertex.progress);

  ${is3d ? `
  float startZ = getZ(startTransformedPosition.z);
  float endZ = getZ(endTransformedPosition.z);
  float startW = getW(startTransformedPosition.z);
  float endW = getW(endTransformedPosition.z);
  ` : ''}

  vec2 offset = getOffset(
    hexLineVertex,
    startTransformedPosition.xy${is3d ? ' / startW' : ''},
    endTransformedPosition.xy${is3d ? ' / endW' : ''}
  );

  float enabled = float(startSize > 0. && endSize > 0.);
  gl_Position = enabled * vec4(
    (transformedPosition.xy + offset) / vec2(width / 2., height / 2.) / pixelSize,
    ${is3d ? 'mix(startZ, endZ, hexLineVertex.progress)' : '0'},
    ${is3d ? 'mix(startW, endW, hexLineVertex.progress)' : '1'}
  );

  vertexColour = mix(
    rgbaToColour(startRgba),
    rgbaToColour(endRgba),
    hexLineVertex.progress
  );
  // vertexColour = vec4(vec3(1,1,1) * (mix(startZ, endZ, hexLineVertex.progress) + 2.) / 3., 1.);
}
`;
}

export const kFragmentShader = `#version 300 es
precision mediump float;

in vec4 vertexColour;
out vec4 fragmentColour;

void main() {
  fragmentColour = vertexColour;
}
`;
