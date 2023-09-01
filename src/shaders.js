export function buildVertexShader({is3d}) {
  return `#version 300 es
precision mediump float;

uniform float width;
uniform float height;
uniform float pixelSize;
uniform mat${3 + is3d} transform;
${is3d ? 'uniform mat4 cameraTransform;' : ''}

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

vec4 rgbaToColour(uint rgba) {
  return vec4(
    float((rgba >> (3 * 8)) & 0xffu) / 255.,
    float((rgba >> (2 * 8)) & 0xffu) / 255.,
    float((rgba >> (1 * 8)) & 0xffu) / 255.,
    float((rgba >> (0 * 8)) & 0xffu) / 255.);
}

vec2 getOffset(HexLineVertex hexLineVertex, vec2 start, vec2 end) {
  vec2 angle =
    start == end
    ? vec2(cos(float(gl_InstanceID)), sin(float(gl_InstanceID)))
    : normalize(end - start);
  return rotate(hexLineVertex.offset, angle) * mix(startSize, endSize, hexLineVertex.progress);
}

float getZ(vec4 v) {
  return v.z / 501.;
}
float getW(vec4 v) {
  return v.w * (v.z / 1000. + 0.) * 2.;
}

void main() {
  HexLineVertex hexLineVertex = kHexLineVertices[gl_VertexID];
  float enabled = float(startSize > 0. && endSize > 0.);

  ${is3d ? `
  vec4 startTransformedPosition = vec4(startPosition, 1) * transform * cameraTransform;
  vec4 endTransformedPosition = vec4(endPosition, 1) * transform * cameraTransform;
  vec4 transformedPosition = mix(startTransformedPosition, endTransformedPosition, hexLineVertex.progress);

  float startZ = getZ(startTransformedPosition);
  float startW = getW(startTransformedPosition);
  float endZ = getZ(endTransformedPosition);
  float endW = getW(endTransformedPosition);
  vec2 startScreenPosition = startTransformedPosition.xy / startW;
  vec2 endScreenPosition = endTransformedPosition.xy / endW;
  vec2 offset = getOffset(hexLineVertex, startScreenPosition, endScreenPosition);

  gl_Position = enabled * vec4(
    (transformedPosition.xy + offset) / vec2(width / 2., height / 2.) / pixelSize,
    mix(startZ, endZ, hexLineVertex.progress),
    mix(startW, endW, hexLineVertex.progress)
  );
  // gl_Position = enabled * vec4(
  //   startTransformedPosition.xy + offset * w,
  //   z,
  //   w * pixelSize
  // );
  ` : `
  vec2 startScreenPosition = (vec3(startPosition, 1) * transform).xy;
  vec2 endScreenPosition = (vec3(endPosition, 1) * transform).xy;
  vec2 angle =
    startScreenPosition.xy == endScreenPosition.xy
    ? vec2(cos(float(gl_InstanceID)), sin(float(gl_InstanceID)))
    : normalize(endScreenPosition.xy - startScreenPosition.xy);
  vec2 screenPosition =
    (
      mix(startScreenPosition, endScreenPosition, hexLineVertex.progress) +
      getOffset(hexLineVertex, startScreenPosition, endScreenPosition)
    ) / pixelSize;

  gl_Position = enabled * vec4(screenPosition / vec2(width / 2., height / 2.), 0, 1);
  `}

  vertexColour = mix(
    rgbaToColour(startRgba),
    rgbaToColour(endRgba),
    hexLineVertex.progress
  );
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
