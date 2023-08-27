export buildVertexShader = ({is3d}) => `#version 300 es
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

${is3d ? `
struct HexPoint3d {
  vec3 position;
  float size;
  uint colour;
};

struct HexLine3d {
  HexPoint3d start;
  HexPoint3d end;
};
` : ''}

struct HexPoint2d {
  vec2 position;
  float size;
  uint colour;
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

HexPoint3d applyPointZDiv(HexPoint3d hexPoint3d) {
  hexPoint3d.position.x *= zDiv / hexPoint3d.z;
  hexPoint3d.position.y *= zDiv / hexPoint3d.z;
  hexPoint3d.size *= zDiv / hexPoint3d.z;
  return hexPoint3d;
}

HexLine3d applyLineZDiv(HexLine3d hexLine3d) {
  return HexLine3d(
    applyPointZDiv(HexLine3d.start),
    applyPointZDiv(HexLine3d.end));
}

HexLine3d clipZMin(HexPoint3d near, HexPoint3d far) {
  near.position = vec3(
    far.position.xy + (near.position.xy - far.position.xy) * (zMin - far.position.z) / (near.position.z - far.position.z),
    zMin
  );
  return HexLine3d(near, far);
}

float zToClipSpace(float z) {
  return mix(-1, 1, (hexPoint3d.position.z - zMin) / (zMax - zMin));
}

HexLine3d apply3dTransforms(HexLine3d hexLine3d) {
  hexLine3d.start.position *= transform * cameraTransform;
  hexLine3d.end.position *= transform * cameraTransform;
  HexPoint3d near = hexLine3d.start.position.z < hexLine3d.end.position.z ? hexLine3d.start : hexLine3d.end;
  HexPoint3d far = hexLine3d.start.position.z < hexLine3d.end.position.z ? hexLine3d.end : hexLine3d.start;
  return (
    far.position.z <= zMin
    ? HexLine3d(HexPoint3d(vec3(), 0., 0), HexPoint3d(vec3(), 0., 0))
    : applyLineZDiv(
      (near.position.z >= zMin || near.position.z == far.position.z)
      ? hexLine3d
      : clipZMin(near, far)
    )
  );
}

vec4 getVertexClipPosition(HexLine${2 + is3d}d hexLine, HexLineVertex hexLineVertex) {
  ${!is3d ? `
  hexLine.start.position *= transform;
  hexLine.end.position *= transform;
  ` : ''}
  vec2 angle = endPosition.xy == startPosition.xy ? vec2(cos(float(gl_InstanceID)), sin(float(gl_InstanceID))) : normalize(endPosition.xy - startPosition.xy);
  vec2 screenPosition =
    (
      mix(startPosition.xy, endPosition.xy, hexLineVertex.progress) +
      rotate(hexLineVertex.offset, angle) *
      mix(startSize, endSize, hexLineVertex.progress)
    ) / pixelSize;
  bool enabled = startSize > 0. && endSize > 0.;

  gl_Position = float(enabled) * vec4(
    screenPosition / vec2(width / 2., height / 2.),
    ${is3d ? 'zToClipSpace(mix(hexLine.start.position.z, hexLine.end.position.z, hexLineVertex.progress))' : '0'},
    1);

vec4 getVertexColour(HexLine${2 + is3d}d hexLine, HexLineVertex hexLineVertex) {
  return mix(
    rgbaToColour(hexLine.startRgba),
    rgbaToColour(hexLine.endRgba),
    hexLineVertex.progress
  );
}

void main() {
  ${is3d ? `
  HexLine2d hexLine = apply3dTransforms(HexLine3d(
    HexPoint3d(startPosition, startSize, startRgba),
    HexPoint3d(endPosition, endSize, endRgba)
  ));
  ` : `
  HexLine2d hexLine = HexLine2d(
    HexPoint2d(startPosition, startSize, startRgba),
    HexPoint2d(endPosition, endSize, endRgba)
  ));
  `}

  HexLineVertex hexLineVertex = kHexLineVertices[gl_VertexID];
  gl_Position = getVertexClipPosition(hexLine, hexLineVertex);
  vertexColour = getVertexColour(hexLine, hexLineVertex);
}
`;