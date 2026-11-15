// The grey fog behind every page: one fragment shader on a half-resolution canvas.
// It drifts, thins where the pointer is, and takes the moon's colour near the moon.
const canvas = document.querySelector<HTMLCanvasElement>('canvas.fog')
const gl = canvas?.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' })

const VERTEX = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'
const FRAGMENT = `
uniform vec2 u_res;
uniform float u_time;
uniform vec4 u_moon;
uniform vec2 u_ptr;
uniform float u_gain;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 w = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(17.3, 9.1); a *= 0.5; }
  return v;
}
void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 p = px / u_res.y;
  float t = u_time;
  vec2 warp = vec2(fbm(p * 1.25 + vec2(t * 0.011, -t * 0.005)), fbm(p * 1.25 + vec2(-t * 0.008, t * 0.007) + 7.7));
  float f = fbm(p * 1.8 + warp * 1.7 + vec2(t * 0.017, 0.0));
  float bed = mix(1.0, 0.3, smoothstep(0.0, 0.95, p.y));
  float fog = smoothstep(0.36, 0.84, f) * bed;
  fog *= 1.0 - 0.62 * smoothstep(0.24, 0.0, distance(px, u_ptr) / u_res.y);
  float glow = 0.0;
  if (u_moon.z > 0.0) glow = exp(-max(distance(px, u_moon.xy) - u_moon.z, 0.0) / u_res.y * 5.0) * u_moon.w;
  vec3 tint = mix(vec3(0.62, 0.59, 0.68), vec3(0.82, 0.25, 0.34), clamp(glow, 0.0, 1.0) * 0.8);
  float a = clamp(fog * 0.36 * u_gain + glow * 0.1 * (0.35 + f), 0.0, 1.0);
  gl_FragColor = vec4(tint * a, a);
}`

if (canvas && gl) {
  const fine = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision ?? 0
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, source)
    gl.compileShader(s)
    return s
  }
  const program = gl.createProgram()!
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX))
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `precision ${fine > 0 ? 'highp' : 'mediump'} float;${FRAGMENT}`))
  gl.linkProgram(program)

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const corner = gl.getAttribLocation(program, 'p')
    gl.enableVertexAttribArray(corner)
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0)
    const at = (name: string) => gl.getUniformLocation(program, name)
    const [uRes, uTime, uMoon, uPtr, uGain] = [at('u_res'), at('u_time'), at('u_moon'), at('u_ptr'), at('u_gain')]

    const SCALE = 0.5
    const still = matchMedia('(prefers-reduced-motion: reduce)')
    const moon = document.querySelector<HTMLElement>('[data-moon]')
    const gain = document.body.dataset.fog === 'full' ? 1 : 0.62
    let moonLight = 1
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 }
    let last = 0
    let frame = 0

    const size = () => {
      canvas.width = Math.max(1, Math.ceil(innerWidth * SCALE))
      canvas.height = Math.max(1, Math.ceil(innerHeight * SCALE))
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (moon) moonLight = Number(getComputedStyle(moon).opacity) || 1
    }
    const draw = () => {
      pointer.x += (pointer.tx - pointer.x) * 0.09
      pointer.y += (pointer.ty - pointer.y) * 0.09
      gl.uniform2f(uRes, canvas.width, canvas.height)
      // The clock, not the page's age: the fog carries on from where it was on the last page.
      gl.uniform1f(uTime, still.matches ? 40 : (Date.now() % 3_600_000) / 1000)
      gl.uniform2f(uPtr, pointer.x * SCALE, (innerHeight - pointer.y) * SCALE)
      gl.uniform1f(uGain, gain)
      const box = moon?.getBoundingClientRect()
      if (box && box.bottom > -200 && box.top < innerHeight + 200) gl.uniform4f(uMoon, (box.left + box.width / 2) * SCALE, (innerHeight - box.top - box.height / 2) * SCALE, (box.width / 2) * SCALE, moonLight)
      else gl.uniform4f(uMoon, 0, 0, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (now - last < 31) return
      last = now
      draw()
    }
    const run = () => {
      cancelAnimationFrame(frame)
      if (document.hidden) return
      if (still.matches) draw()
      else frame = requestAnimationFrame(tick)
    }

    addEventListener('resize', () => { size(); if (still.matches) draw() })
    addEventListener('scroll', () => { if (still.matches) draw() }, { passive: true })
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return
      if (pointer.x < -9000) { pointer.x = e.clientX; pointer.y = e.clientY }
      pointer.tx = e.clientX
      pointer.ty = e.clientY
    }, { passive: true })
    document.addEventListener('visibilitychange', run)
    still.addEventListener('change', run)
    size()
    run()
    canvas.classList.add('on')
  }
}
