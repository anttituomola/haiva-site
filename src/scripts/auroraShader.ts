import * as THREE from 'three';

const container = document.getElementById('aurora-webgl');
if (!container) {
  throw new Error('Aurora container not found');
}

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const geometry = new THREE.PlaneGeometry(2, 2);

const uniforms = {
  u_time: { value: Math.random() * 200 },
  u_resolution: { value: new THREE.Vector2(1, 1) },
  u_seed: { value: new THREE.Vector2(Math.random() * 100, Math.random() * 100) },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  depthWrite: false,
  fragmentShader: `
    precision highp float;

    uniform float u_time;
    uniform vec2 u_resolution;

    uniform vec2 u_seed;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    // Rotate a 2D point by angle (radians)
    vec2 rot2d(vec2 p, float a) {
      float c = cos(a);
      float s = sin(a);
      return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    }

    // Aurora patch: spawns at a location with a random angle,
    // lives for a while, then fades out. Wavy and morphing.
    float auroraPatch(vec2 uv, float t, vec2 center, float life, float width, float angle) {
      // Rotate UV around the patch center
      vec2 local = rot2d(uv - center, angle);

      // Large S-curve that changes shape over time
      float bend = sin(local.y * 2.5 + t * 0.5 + center.x * 6.0) * 0.25
                 + sin(local.y * 1.2 - t * 0.3 + center.y * 4.0) * 0.18;
      // Medium undulation
      float warp1 = fbm(vec2(local.y * 3.5 + center.x * 4.0, t * 0.9)) * 0.15;
      // Fine ripple
      float warp2 = sin(local.y * 12.0 + t * 2.0 + center.x * 8.0) * 0.04;
      local.x += bend + warp1 + warp2;

      // The angle drifts over the patch's life
      float angleDrift = sin(t * 0.6 + center.x * 5.0) * 0.3 * life;
      local = rot2d(local, angleDrift);

      // "Across" the curtain: Gaussian envelope (wider = softer)
      float across = local.x / width;
      float envelope = exp(-across * across);

      // "Along" the curtain: ray structure that shifts over time
      float rays = fbm(vec2(local.y * 10.0 + center.x * 5.0, t * 0.8)) * 0.5
                 + fbm(vec2(local.y * 18.0 - center.y * 3.0, t * 1.2)) * 0.25;

      // Curtain extent along its length
      float len = 0.4 + width * 1.2;
      float along = smoothstep(-len, -len * 0.1, local.y)
                   * smoothstep(len * 0.7, len * 0.05, local.y);

      // Shimmer — brightness ripples along the curtain
      float shimmer = sin(local.y * 25.0 + t * 2.5 + center.x * 12.0) * 0.04
                    + sin(local.y * 40.0 - t * 3.2) * 0.02;
      along *= 1.0 + shimmer;

      // Life cycle: smooth fade in, sustain, fade out
      float fadeIn  = smoothstep(0.0, 0.15, life);
      float fadeOut = smoothstep(1.0, 0.8, life);
      float lifecycle = fadeIn * fadeOut;

      return envelope * (0.35 + rays) * along * lifecycle;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      float aspect = u_resolution.x / u_resolution.y;
      float t = u_time * 0.022;
      vec2 seed = u_seed;

      float intensity = 0.0;
      vec3 colorAccum = vec3(0.0);

      // Palette
      vec3 green  = vec3(0.1, 0.9, 0.55);
      vec3 teal   = vec3(0.15, 0.7, 0.9);
      vec3 violet = vec3(0.5, 0.25, 0.85);

      // Spawn multiple aurora patches at different times and locations.
      // Each patch cycles through its life independently.
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        // Each patch has its own cycle period and offset
        float period = 8.0 + fi * 3.5;
        float offset = hash(seed + fi) * period;
        float life = fract((t + offset) / period);

        // Random spawn location per cycle
        float cycle = floor((t + offset) / period);
        float cx = hash(vec2(cycle, fi + seed.x)) * 1.4 - 0.2;
        float cy = hash(vec2(fi + seed.y, cycle)) * 0.6 + 0.3;
        float w  = 0.06 + hash(vec2(cycle + fi, seed.x)) * 0.12;
        // Random angle per patch: full range from sweeping arcs to vertical curtains
        float angle = (hash(vec2(cycle * 3.7, fi + seed.y * 2.0)) - 0.5) * 2.5;

        float ap = auroraPatch(uv, t, vec2(cx, cy), life, w, angle);
        intensity += ap;

        // Vary hue per patch
        float hue = hash(vec2(cycle + 0.5, fi));
        vec3 apColor = mix(green, teal, hue);
        apColor = mix(apColor, violet, smoothstep(0.0, 0.06, uv.y - cy));
        colorAccum += apColor * ap;
      }

      // Normalize color
      vec3 base = intensity > 0.001 ? colorAccum / intensity : green;

      // Mouse interaction removed — wasn't aligning correctly

      // Soft glow
      float glow = smoothstep(0.0, 1.0, intensity) * 0.2;
      vec3 color = base * intensity + base * glow;
      color = pow(color, vec3(0.92));

      gl_FragColor = vec4(color, clamp((intensity + glow * 0.2) * 0.5, 0.0, 1.0));
    }
  `,
  vertexShader: `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const resize = () => {
  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.setViewport(0, 0, width, height);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  uniforms.u_resolution.value.set(width, height);
};

window.addEventListener('resize', resize);

resize();

renderer.domElement.style.opacity = '0.8';

const animate = () => {
  uniforms.u_time.value += 0.2;
  renderer.render(scene, camera);
  if (!prefersReduced) requestAnimationFrame(animate);
};

animate();
