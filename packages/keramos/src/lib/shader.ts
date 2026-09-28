// A glazed ceramic vessel, sphere-traced in a single fragment shader.
//
// The wall is a lathe SDF built from the profile texture, hollowed by a
// thinner copy of itself. Handles are quadratic Bezier tubes blended into the
// body. Lighting is a small studio: a window softbox (which follows the
// pointer), a cool rim strip, and a warm room. The glaze is a clear dielectric
// coat, gold is a rough-ish metal, and both reflect the same environment so
// they sit in the same room.

export const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vNdc;
void main() {
  vNdc = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

export const FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vNdc;
out vec4 outColor;

uniform sampler2D uProfile;   // R: radius, G: dR/dy
uniform sampler2D uColor;     // painted albedo (sRGB texture)
uniform sampler2D uMat;       // R: gold, G: gloss, B: relief
uniform vec2 uTexSize;
uniform float uProfileN;

uniform vec3 uCamPos;
uniform vec3 uCamF;
uniform vec3 uCamR;
uniform vec3 uCamU;
uniform vec2 uTan;            // tan(half fov) x,y
uniform float uPix;           // pixel footprint per unit distance

uniform float uRot;
uniform int uKind;            // 0 vessel, 1 plate
uniform float uTop;           // highest point, handles included
uniform vec4 uHandleStripe;   // rgb + amount: painted strokes down the handle sides
uniform float uWall;
uniform float uFloor;
uniform float uExtent;

uniform int uHandles;
uniform vec4 uHA[2];          // a.xy, c.xy
uniform vec4 uHB[2];          // b.xy, angle, radius
uniform float uHFlat[2];

uniform vec3 uWin;            // window azimuth, elevation, strength
uniform vec3 uInterior;
uniform float uInteriorGloss;
uniform vec3 uHandleCol;
uniform float uHandleGloss;
uniform vec3 uRimCol;
uniform float uRimGold;
uniform float uGlaze;         // overall clear-coat strength (1 glazed, ~0.6 burnished slip)
uniform float uRelief;

const float PI = 3.14159265;
const float TAU = 6.28318531;

vec2 prof(float y) {
  float f = clamp(y, 0.0, 1.0) * (uProfileN - 1.0);
  float i = floor(f);
  vec2 a = texelFetch(uProfile, ivec2(int(i), 0), 0).rg;
  vec2 b = texelFetch(uProfile, ivec2(int(min(i + 1.0, uProfileN - 1.0)), 0), 0).rg;
  return mix(a, b, f - i);
}

float lathe(vec3 p, float inset) {
  vec2 pr = prof(p.y);
  float rho = length(p.xz);
  return (rho - (pr.x - inset)) / sqrt(1.0 + pr.y * pr.y);
}

float dot2(vec2 v) { return dot(v, v); }

// Unsigned distance to a quadratic Bezier (Inigo Quilez).
float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C) {
  vec2 a = B - A;
  vec2 b = A - 2.0 * B + C;
  vec2 c = a * 2.0;
  vec2 d = A - pos;
  float kk = 1.0 / dot(b, b);
  float kx = kk * dot(a, b);
  float ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0;
  float kz = kk * dot(d, a);
  float res = 0.0;
  float p = ky - kx * kx;
  float p3 = p * p * p;
  float q = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
  float h = q * q + 4.0 * p3;
  if (h >= 0.0) {
    h = sqrt(h);
    vec2 x = (vec2(h, -h) - q) / 2.0;
    vec2 uv = sign(x) * pow(abs(x), vec2(1.0 / 3.0));
    float t = clamp(uv.x + uv.y - kx, 0.0, 1.0);
    res = dot2(d + (c + b * t) * t);
  } else {
    float z = sqrt(-p);
    float v = acos(q / (p * z * 2.0)) / 3.0;
    float m = cos(v);
    float n = sin(v) * 1.732050808;
    vec3 t = clamp(vec3(m + m, -n - m, n - m) * z - kx, 0.0, 1.0);
    res = min(dot2(d + (c + b * t.x) * t.x), dot2(d + (c + b * t.y) * t.y));
  }
  return sqrt(res);
}

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

vec3 rotY(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

float handleDist(vec3 q, int i) {
  vec4 A = uHA[i];
  vec4 B = uHB[i];
  float ang = B.z;
  float c = cos(ang), s = sin(ang);
  float lx = c * q.x + s * q.z;
  float lz = -s * q.x + c * q.z;
  float dc = sdBezier(vec2(lx, q.y), A.xy, A.zw, B.xy);
  return length(vec2(dc, lz / uHFlat[i])) - B.w;
}

vec3 rotZ(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c * p.x + s * p.y, -s * p.x + c * p.y, p.z);
}

// Plate: face toward +z, radius 0.5. A shallow well, a rising cavetto, a flat rim.
float plateTop(float r) {
  float well = 0.014 + 0.005 * (r / 0.27) * (r / 0.27);
  float top = mix(well, 0.047, smoothstep(0.23, 0.37, r));
  top -= 0.014 * smoothstep(0.465, 0.5, r);
  return top;
}
float plateBot(float r) {
  return 0.004 + 0.028 * smoothstep(0.26, 0.45, r);
}
float plateSDF(vec3 q) {
  float r = length(q.xy);
  float e = 0.002;
  float slope = (plateTop(r + e) - plateTop(max(r - e, 0.0))) / (2.0 * e);
  float dt = (q.z - plateTop(r)) / sqrt(1.0 + slope * slope);
  float db = plateBot(r) - q.z;
  float de = r - 0.5;
  return max(max(dt, db), de);
}

// parts: x outer wall, y cavity (positive inside cavity wall), z handles
vec3 parts(vec3 p) {
  if (uKind == 1) return vec3(plateSDF(rotZ(p, uRot)), 1e3, 1e3);
  vec3 q = rotY(p, uRot);
  float outer = lathe(q, 0.0);
  outer = max(outer, -q.y);
  outer = max(outer, q.y - 1.0);
  float inner = lathe(q, uWall);
  inner = max(inner, uFloor - q.y);
  float hd = 1e3;
  for (int i = 0; i < 2; i++) {
    if (i >= uHandles) break;
    hd = min(hd, handleDist(q, i));
  }
  return vec3(outer, inner, hd);
}

float map(vec3 p) {
  vec3 d = parts(p);
  float solid = smin(d.x, d.z, 0.018);
  return max(solid, -d.y);
}

vec3 calcNormal(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float h = 0.0006;
  return normalize(
    k.xyy * map(p + k.xyy * h) +
    k.yyx * map(p + k.yyx * h) +
    k.yxy * map(p + k.yxy * h) +
    k.xxx * map(p + k.xxx * h));
}

float softShadow(vec3 ro, vec3 rd) {
  float res = 1.0;
  float t = 0.008;
  for (int i = 0; i < 48; i++) {
    float h = map(ro + rd * t);
    res = min(res, 10.0 * h / t);
    t += clamp(h, 0.006, 0.08);
    if (res < 0.002 || t > 1.6) break;
  }
  return clamp(res, 0.0, 1.0);
}

float calcAO(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.008 + 0.028 * float(i);
    float d = map(p + n * h);
    occ += (h - d) * sca;
    sca *= 0.82;
  }
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

float angDiff(float a, float b) {
  float d = mod(a - b + PI, TAU) - PI;
  return abs(d);
}

// The room. Direction r is in world space; +z points back at the viewer.
vec3 envMap(vec3 r, float rough) {
  float el = asin(clamp(r.y, -1.0, 1.0));
  float az = atan(r.x, r.z);
  vec3 floorC = vec3(0.075, 0.062, 0.052);
  vec3 wall = vec3(0.36, 0.34, 0.31);
  vec3 ceil = vec3(0.55, 0.54, 0.52);
  vec3 col = mix(floorC, wall, smoothstep(-0.28, 0.12, r.y));
  col = mix(col, ceil, smoothstep(0.35, 0.95, r.y));
  // darker far side of the room so gold has something to contrast against
  col *= mix(0.55, 1.0, smoothstep(-0.2, 0.9, cos(az - uWin.x)));

  float w = 0.015 + rough * 0.55;
  float dx = angDiff(az, uWin.x);
  float dy = abs(el - uWin.y);
  float box = (1.0 - smoothstep(0.3 - w, 0.3 + w, dx)) * (1.0 - smoothstep(0.36 - w, 0.36 + w, dy));
  // window frame bars read clearly in a sharp glaze and dissolve in a rough one
  float barW = 0.012;
  float vbar = smoothstep(barW, barW + w * 0.6 + 0.004, dx);
  float hbar = smoothstep(barW, barW + w * 0.6 + 0.004, abs(el - uWin.y - 0.04));
  float mull = mix(1.0, vbar * hbar, 0.85 * (1.0 - smoothstep(0.0, 0.25, rough)));
  // brighter top of the window, like sky
  float sky = mix(0.8, 1.15, smoothstep(-0.36, 0.36, el - uWin.y));
  col += vec3(1.0, 0.975, 0.93) * uWin.z * box * mull * sky;

  // cool strip light from the other side
  float sAz = uWin.x + 2.35;
  float sw = 0.05 + rough * 0.4;
  float strip = (1.0 - smoothstep(0.05, 0.05 + sw, angDiff(az, sAz))) *
                (1.0 - smoothstep(0.55, 0.55 + sw + 0.2, abs(el - 0.15)));
  col += vec3(0.85, 0.92, 1.05) * 2.4 * strip;
  return col;
}

vec3 lightDir() {
  float az = uWin.x;
  float el = uWin.y;
  return normalize(vec3(sin(az) * cos(el), sin(el), cos(az) * cos(el)));
}

vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }

struct Surf {
  vec3 albedo;
  float gloss;
  float gold;
};

vec3 shade(vec3 p, vec3 n, vec3 rd, Surf s, float ao, float aa) {
  vec3 L = lightDir();
  vec3 V = -rd;
  float NoV = max(dot(n, V), 0.0);
  float sh = softShadow(p + n * 0.002, L);

  // Specular anti-aliasing: where the surface turns faster than a pixel can
  // resolve (a foot, a rim, a handle seen edge-on), widen the highlight so
  // it blurs across the pixel instead of breaking into stair-steps.
  float rough = max(mix(0.62, 0.012, s.gloss), aa);
  // ceramic body under the glaze scatters a little: wrapped diffuse
  float wrap = 0.25;
  float diff = max((dot(n, L) + wrap) / (1.0 + wrap), 0.0);
  vec3 keyC = vec3(1.0, 0.95, 0.88) * 1.8;
  vec3 fillL = normalize(vec3(0.8, 0.15, -0.3));
  vec3 fillC = vec3(0.62, 0.7, 0.85) * 0.34;
  float hemi = 0.5 + 0.5 * n.y;
  vec3 amb = mix(vec3(0.16, 0.12, 0.1), vec3(0.42, 0.42, 0.44), hemi);

  vec3 R = reflect(rd, n);
  vec3 env = envMap(R, rough);
  // reflections that point into the body are blocked by it
  float specOcc = clamp(pow(NoV + ao, 2.0) - 1.0 + ao, 0.0, 1.0);
  specOcc *= mix(0.35, 1.0, smoothstep(-0.2, 0.2, R.y) * 0.5 + 0.5 * sh);

  vec3 H = normalize(L + V);
  float NoH = max(dot(n, H), 0.0);
  float shin = min(mix(18.0, 2400.0, s.gloss * s.gloss), 2.0 / max(aa * aa, 1e-4));
  float spec = pow(NoH, shin) * (shin + 8.0) / 25.0;

  // dielectric glaze
  float F = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
  F *= uGlaze * mix(0.35, 1.0, s.gloss);
  vec3 diffuse = s.albedo * (keyC * diff * sh + fillC * max(dot(n, fillL), 0.0) + amb) * ao;
  vec3 glazeCol = diffuse * (1.0 - F) + env * F * specOcc + keyC * spec * sh * F * 0.8;

  // gold: metal, coloured reflection, a touch of burnish
  vec3 goldF0 = vec3(1.0, 0.73, 0.3);
  vec3 Fm = goldF0 + (1.0 - goldF0) * pow(1.0 - NoV, 5.0);
  // burnished gold: bright, but a touch soft, so the window never prints as a hard-edged shape
  float gRough = max(mix(0.42, 0.24, s.gloss), aa);
  vec3 genv = envMap(R, gRough);
  float gshin = min(mix(40.0, 260.0, s.gloss), 2.0 / max(aa * aa, 1e-4));
  float gspec = pow(NoH, gshin) * (gshin + 8.0) / 25.0;
  vec3 goldDiff = goldF0 * (keyC * diff * sh + amb) * ao * 0.3;
  vec3 goldCol = Fm * (genv * specOcc * 0.85 + keyC * gspec * sh * 0.6) + goldDiff;

  return mix(glazeCol, goldCol, s.gold);
}

void main() {
  vec3 ro = uCamPos;
  vec3 rd = normalize(uCamF + vNdc.x * uTan.x * uCamR + vNdc.y * uTan.y * uCamU);

  // bounding box
  vec3 bmin = uKind == 1 ? vec3(-0.51, -0.51, -0.01) : vec3(-uExtent, -0.001, -uExtent);
  vec3 bmax = uKind == 1 ? vec3(0.51, 0.51, 0.07) : vec3(uExtent, uTop + 0.01, uExtent);
  vec3 inv = 1.0 / rd;
  vec3 t0 = (bmin - ro) * inv;
  vec3 t1 = (bmax - ro) * inv;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  float tN = max(max(tmin.x, tmin.y), tmin.z);
  float tF = min(min(tmax.x, tmax.y), tmax.z);

  bool hit = false;
  float t = max(tN, 0.0);
  float bestR = 1e9;
  float bestT = t;
  if (tF > tN) {
    for (int i = 0; i < 220; i++) {
      vec3 p = ro + rd * t;
      float d = map(p);
      float ratio = d / (t * uPix);
      if (ratio < bestR) { bestR = ratio; bestT = t; }
      if (d < 0.00012 * t) { hit = true; break; }
      t += d * 0.82;
      if (t > tF) break;
    }
  }

  float alpha = 0.0;
  float coverT = hit ? t : bestT;
  if (hit) alpha = 1.0;
  else if (bestR < 1.0) alpha = clamp(1.0 - bestR, 0.0, 1.0);

  vec3 p = ro + rd * coverT;
  vec3 n = calcNormal(p);
  if (!hit) p -= n * map(p);

  // Texture coordinates computed in uniform control flow so derivatives exist.
  bool plate = uKind == 1;
  vec3 q = plate ? rotZ(p, uRot) : rotY(p, uRot);
  // painted texture runs left to right as seen from the front
  float u = plate ? q.x + 0.5 : 0.5 - atan(q.z, q.x) / TAU;
  vec2 uv = plate ? vec2(u, 0.5 - q.y) : vec2(u, 1.0 - q.y);
  vec2 uvAlt = vec2(plate ? u : fract(u + 0.5) - 0.5, uv.y);
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  vec2 dx2 = dFdx(uvAlt), dy2 = dFdy(uvAlt);
  if (abs(dx2.x) < abs(dx.x)) dx.x = dx2.x;
  if (abs(dy2.x) < abs(dy.x)) dy.x = dy2.x;
  // Texture sharpness from the true pixel footprint on the surface. Hardware
  // derivatives are exact on smooth surfaces but blow up where neighbouring
  // pixels land on different parts (rim and interior, handle and body), so
  // cap them at a couple of footprints.
  float foot = coverT * uPix / max(abs(dot(n, rd)), 0.2);
  vec2 fpUV = plate ? vec2(foot) : vec2(foot / (TAU * max(length(q.xz), 0.02)), foot);
  dx = clamp(dx, -2.5 * fpUV, 2.5 * fpUV);
  dy = clamp(dy, -2.5 * fpUV, 2.5 * fpUV);
  // how fast the normal turns across this pixel, for specular anti-aliasing
  vec3 dn = fwidth(n);
  float nVar = clamp(length(dn) * 0.9, 0.0, 0.45);

  vec3 col = vec3(0.0);
  if (alpha > 0.0) {
    vec3 prt = parts(p);
    float solid = smin(prt.x, prt.z, 0.018);
    bool isHandle = prt.z < prt.x - 0.001 && prt.z < 0.004;
    bool isInterior = -prt.y > solid - 0.0004 && !isHandle;
    bool isRimTop = !plate && !isInterior && !isHandle && q.y > 0.9985;
    bool plateFace = plate && rotZ(n, uRot).z > 0.25 && q.z > plateBot(length(q.xy)) + 0.004;

    Surf s;
    vec3 nn = n;
    if (plate && !plateFace) {
      s = Surf(toLinear(uInterior), uInteriorGloss, 0.0);
    } else if (isHandle) {
      vec3 hc = toLinear(uHandleCol);
      if (uHandleStripe.a > 0.0) {
        // black brush flourishes down both side faces of the handle
        float side = 0.0;
        float mid = 0.0;
        float best = 1e3;
        for (int i = 0; i < 2; i++) {
          if (i >= uHandles) break;
          float hd = handleDist(q, i);
          if (hd < best) {
            best = hd;
            float c = cos(uHB[i].z), sn = sin(uHB[i].z);
            float lz = -sn * q.x + c * q.z;
            side = abs(lz) / (uHB[i].w * uHFlat[i]);
            float lx = c * q.x + sn * q.z;
            float dc = sdBezier(vec2(lx, q.y), uHA[i].xy, uHA[i].zw, uHB[i].xy);
            mid = 1.0 - smoothstep(0.3, 0.42, dc / uHB[i].w);
          }
        }
        // a calligraphic stroke down the middle of each side face
        float stripe = smoothstep(0.55, 0.62, side) * mid * uHandleStripe.a;
        hc = mix(hc, toLinear(uHandleStripe.rgb), stripe);
      }
      s = Surf(hc, uHandleGloss, 0.0);
    } else if (isInterior) {
      bool lipBand = q.y > 0.988;
      s = Surf(toLinear(lipBand ? uRimCol : uInterior), uInteriorGloss, lipBand ? uRimGold : 0.0);
    } else if (isRimTop) {
      s = Surf(toLinear(uRimCol), 0.9, uRimGold);
    } else {
      // (includes the very bottom edge: shading it as the underside would
      // catch the ceiling and draw a bright line where the foot meets its shadow)
      if (!plate && q.y < 0.996) {
        // exact normal of the turned wall, from the smoothed profile slope,
        // instead of finite differences (which facet between samples)
        vec2 pr = prof(q.y);
        float rho = max(length(q.xz), 1e-4);
        vec3 nq = normalize(vec3(q.x / rho, -pr.y, q.z / rho));
        vec3 na = rotY(nq, -uRot);
        // keep the numeric normal where the wall meets a handle fillet
        float nearHandle = 1.0 - smoothstep(0.004, 0.03, prt.z - prt.x);
        n = normalize(mix(na, n, nearHandle));
        nn = n;
      }
      vec4 albedo = textureGrad(uColor, uv, dx, dy);
      vec4 m = textureGrad(uMat, uv, dx, dy);
      s = Surf(albedo.rgb, m.g, m.r);
      // relief: raised gold and thick pigment catch the light
      vec2 e = vec2(1.5 / uTexSize.x, 1.5 / uTexSize.y);
      float hL = textureGrad(uMat, uv - vec2(e.x, 0.0), dx, dy).b;
      float hR = textureGrad(uMat, uv + vec2(e.x, 0.0), dx, dy).b;
      float hD = textureGrad(uMat, uv + vec2(0.0, e.y), dx, dy).b;
      float hU = textureGrad(uMat, uv - vec2(0.0, e.y), dx, dy).b;
      if (plate) {
        float dhdx = (hR - hL) / (2.0 * e.x);
        float dhdy = (hU - hD) / (2.0 * e.y);
        vec3 T = rotZ(vec3(1.0, 0.0, 0.0), -uRot);
        vec3 B = rotZ(vec3(0.0, 1.0, 0.0), -uRot);
        nn = normalize(n - uRelief * (dhdx * T + dhdy * B));
      } else {
        float rq = max(length(q.xz), 0.02);
        float dhdu = (hR - hL) / (2.0 * e.x * TAU * rq);
        float dhdy = (hU - hD) / (2.0 * e.y);
        vec3 Tq = -normalize(vec3(-q.z, 0.0, q.x));
        vec3 T = rotY(Tq, -uRot);
        vec3 B = normalize(cross(n, T));
        nn = normalize(n - uRelief * (dhdu * T + dhdy * B));
      }
    }
    float ao = calcAO(p, n);
    if (isInterior) ao *= mix(0.2, 1.0, smoothstep(uFloor, 1.0, q.y));
    // the foot sits close to the table
    if (!plate) ao *= mix(0.55, 1.0, smoothstep(0.0, 0.05, q.y));
    col = shade(p, nn, rd, s, ao, nVar);
  }

  // Floor: contact shadow and cast shadow from the key light.
  float shA = 0.0;
  if (plate && alpha < 1.0 && rd.z < 0.0) {
    // the wall the plate hangs on
    float tw = (-0.006 - ro.z) / rd.z;
    vec3 wp = ro + rd * tw;
    vec3 L = lightDir();
    float castSh = 1.0 - softShadow(wp + vec3(0.0, 0.0, 0.001), L);
    float dd = map(wp);
    float contact = 1.0 - smoothstep(0.0, 0.03, dd);
    float fade = 1.0 - smoothstep(0.75, 0.98, max(abs(vNdc.x), abs(vNdc.y)));
    shA = clamp(castSh * 0.34 + contact * 0.2, 0.0, 0.6) * fade;
  } else if (rd.y < 0.0 && alpha < 1.0) {
    float tf = -ro.y / rd.y;
    vec3 fp = ro + rd * tf;
    float r = length(fp.xz);
    float fade = (1.0 - smoothstep(uExtent * 0.8, uExtent * 2.2, r)) * (1.0 - smoothstep(0.62, 0.98, abs(vNdc.x))) * smoothstep(-1.0, -0.8, vNdc.y);
    vec3 L = lightDir();
    float castSh = 1.0 - softShadow(fp + vec3(0.0, 0.001, 0.0), L);
    float dd = map(fp + vec3(0.0, 0.002, 0.0));
    float contact = 1.0 - smoothstep(0.0, 0.06, dd);
    float ambient = 1.0 - smoothstep(0.0, 0.22, dd);
    shA = clamp(castSh * 0.32 + contact * 0.38 + ambient * 0.16, 0.0, 0.78) * fade;
  }

  vec3 mapped = aces(col * 0.95);
  mapped = pow(mapped, vec3(1.0 / 2.2));
  float outA = alpha + shA * (1.0 - alpha);
  outColor = vec4(mapped * alpha, outA);
}`
