export function buildVertexShader({is3d}) {
  return `#version 300 es
precision mediump float;

uniform float width;
uniform float height;
uniform float pixelSize;
uniform mat${3 + is3d} transform;
${is3d ? `
uniform mat4 cameraTransform;
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

struct HexPoint3d {
  vec3 position;
  float size;
  uint rgba;
};

struct HexLine3d {
  HexPoint3d start;
  HexPoint3d end;
};

struct HexPoint2d {
  vec2 position;
  float size;
  uint rgba;
};

struct HexLine2d {
  HexPoint2d start;
  HexPoint2d end;
};

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

${is3d ? `
HexPoint3d applyPointZDiv(HexPoint3d hexPoint3d) {
  hexPoint3d.position.x *= zDiv / hexPoint3d.position.z;
  hexPoint3d.position.y *= zDiv / hexPoint3d.position.z;
  hexPoint3d.size *= zDiv / hexPoint3d.position.z;
  return hexPoint3d;
}

HexLine3d applyLineZDiv(HexLine3d hexLine3d) {
  return HexLine3d(
    applyPointZDiv(hexLine3d.start),
    applyPointZDiv(hexLine3d.end));
}

HexLine3d clipZMin(HexPoint3d near, HexPoint3d far) {
  near.position = vec3(
    far.position.xy + (near.position.xy - far.position.xy) * (zMin - far.position.z) / (near.position.z - far.position.z),
    zMin
  );
  return HexLine3d(near, far);
}

float zToClipSpace(float z) {
  return mix(-1., 1., (z - zMin) / (zMax - zMin));
}

HexPoint3d ternaryHexPoint3d(bool condition, HexPoint3d a, HexPoint3d b) {
  return HexPoint3d(
    condition ? a.position : b.position,
    condition ? a.size : b.size,
    condition ? a.rgba : b.rgba);
}

HexLine3d ternaryHexLine3d(bool condition, HexLine3d a, HexLine3d b) {
  return HexLine3d(
    ternaryHexPoint3d(condition, a.start, b.start),
    ternaryHexPoint3d(condition, a.end, b.end));
}

HexLine3d apply3dTransforms(HexLine3d hexLine3d) {
  hexLine3d.start.position = (vec4(hexLine3d.start.position, 1) * transform * cameraTransform).xyz;
  hexLine3d.end.position = (vec4(hexLine3d.end.position, 1) * transform * cameraTransform).xyz;
  HexPoint3d near = ternaryHexPoint3d(hexLine3d.start.position.z < hexLine3d.end.position.z, hexLine3d.start, hexLine3d.end);
  HexPoint3d far = ternaryHexPoint3d(hexLine3d.start.position.z < hexLine3d.end.position.z, hexLine3d.end, hexLine3d.start);
  return ternaryHexLine3d(
    far.position.z <= zMin,
    HexLine3d(HexPoint3d(vec3(0, 0, 0), 0., 0u), HexPoint3d(vec3(0, 0, 0), 0., 0u)),
    applyLineZDiv(ternaryHexLine3d(
      near.position.z >= zMin || near.position.z == far.position.z,
      hexLine3d,
      clipZMin(near, far))));
}
`: ''}

vec4 getVertexClipPosition(HexLine${2 + is3d}d hexLine, HexLineVertex hexLineVertex) {
  ${!is3d ? `
  hexLine.start.position = (vec3(hexLine.start.position, 1) * transform).xy;
  hexLine.end.position = (vec3(hexLine.end.position, 1) * transform).xy;
  ` : ''}

  vec2 angle = hexLine.start.position.xy == hexLine.end.position.xy ? vec2(cos(float(gl_InstanceID)), sin(float(gl_InstanceID))) : normalize(hexLine.end.position.xy - hexLine.start.position.xy);
  vec2 clipXy =
    (
      mix(hexLine.start.position.xy, hexLine.end.position.xy, hexLineVertex.progress) +
      rotate(hexLineVertex.offset, angle) *
      mix(hexLine.start.size, hexLine.end.size, hexLineVertex.progress)
    ) / pixelSize / vec2(width / 2., height / 2.);
  bool enabled = hexLine.start.size > 0. && hexLine.end.size > 0.;

  ${is3d ? `
  float z = zToClipSpace(mix(
    hexLine.start.position.z,
    hexLine.end.position.z,
    hexLineVertex.progress));
  float w = 1.; // TODO: Figure out the right w here.
  ` : `
  float z = 0.;
  float w = 1.;
  `};

  return float(enabled) * vec4(
    clipXy * w,
    z,
    w);
}

vec4 getVertexColour(HexLine${2 + is3d}d hexLine, HexLineVertex hexLineVertex) {
  return mix(
    rgbaToColour(hexLine.start.rgba),
    rgbaToColour(hexLine.end.rgba),
    hexLineVertex.progress
  );
}

void main() {
  ${is3d ? `
  HexLine3d hexLine = apply3dTransforms(HexLine3d(
    HexPoint3d(startPosition, startSize, startRgba),
    HexPoint3d(endPosition, endSize, endRgba)
  ));
  ` : `
  HexLine2d hexLine = HexLine2d(
    HexPoint2d(startPosition, startSize, startRgba),
    HexPoint2d(endPosition, endSize, endRgba)
  );
  `}

  HexLineVertex hexLineVertex = kHexLineVertices[gl_VertexID];
  gl_Position = getVertexClipPosition(hexLine, hexLineVertex);
  vertexColour = getVertexColour(hexLine, hexLineVertex);
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
