import { useEffect, useRef, useState } from 'react'

/*
 * The Wealthsimple year-one hero, "waves" variant, as the app's load screen: a near-black floor,
 * a simplex-noise swell in cream that rolls under the wordmark, film grain on top. The wordmark is
 * drawn to a texture from text and rides the same warp as the field; where a band passes beneath it
 * the type flips to the floor colour so the wave seems to travel through the letters.
 */

const CONFIG = {
  nScale: 0.22,
  nOctaves: 1,
  nPersist: 0.1,
  nSpeed: 0.11,
  nWarp: 0.7,
  cycles: 2,
  brightness: 1,
  contrast: 1,
  crush: 5.95,
  mix: 0.55,
  grainScale: 1,
  grainGain: 0.11,
  logoSway: 0.01,
  logoFlipLo: 0.3,
  logoFlipHi: 0.75,
  fadeInMs: 1800,
}
const COL_BASE: [number, number, number] = [0.051, 0.051, 0.051]
const COL_CREAM: [number, number, number] = [0.894, 0.863, 0.835]
const MAX_DPR = 2
const WORDMARK = 'Couch Defector'

const VERT = `
attribute vec2 a_pos;
void main(){gl_Position=vec4(a_pos,0.,1.);}
`

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_scale;
uniform int   u_oct;
uniform float u_persist;
uniform float u_warp;
uniform float u_cycles;
uniform float u_bright;
uniform float u_ncontrast;
uniform float u_crush;
uniform float u_mix;
uniform float u_grainScale;
uniform float u_grainGain;
uniform float u_grainTime;
uniform vec3  u_colBase;
uniform vec3  u_colCream;
uniform float u_logoSway;
uniform float u_logoFlipLo;
uniform float u_logoFlipHi;
uniform float u_fade;
uniform sampler2D u_tex;
uniform float u_texReady;

// Ashima simplex noise.
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec2 rotate2(vec2 v){float c=0.8660254,s=0.5;return vec2(v.x*c-v.y*s,v.x*s+v.y*c);}
float fbm(vec3 p){
  float v=0.,a=1.,f=1.,m=0.;
  for(int i=0;i<6;i++){
    if(i>=u_oct)break;
    vec2 rxy=rotate2(p.xy*f);
    v+=snoise(vec3(rxy+vec2(17.3,4.1),p.z*f))*a;
    m+=a;a*=u_persist;f*=2.;
  }
  return v/m;
}
// Sine-free hash (Dave Hoskins): stays uniform at retina fragment coordinates.
float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float tri(float x){return fract(x)-.5;}
float dither(vec2 fc){return(tri(fc.x*.5)+tri(fc.y*.5))*(1./255.);}
float grain1(vec2 fc){
  vec2 gc=floor(fc/max(u_grainScale,1.0));
  return hash(gc+vec2(u_grainTime*7.3,u_grainTime*3.7));
}
vec2 texUv(vec2 uv){ return vec2(uv.x, 1.0 - uv.y); }

void main(){
  float aspect = u_res.x / u_res.y;
  vec2 uv = gl_FragCoord.xy / u_res;

  vec2 st = uv * vec2(aspect, 1.0) * u_scale + vec2(5.3, 2.7);
  float wx = fbm(vec3(st, u_time));
  float wy = fbm(vec3(st + vec2(3.7, 1.9), u_time + 1.3));
  vec2 warp = vec2(wx, wy) * u_warp;
  float n = fbm(vec3(st + warp, u_time + 0.7));
  n = n * 0.5 + 0.5;

  float cycled = abs(sin(n * u_cycles * 3.14159));
  cycled = (cycled - 0.5) * u_ncontrast + 0.5;
  cycled = clamp(cycled, 0.0, 1.0);
  cycled = pow(cycled, u_crush);
  cycled *= u_bright;
  cycled = clamp(cycled, 0.0, 1.0);

  vec3 col = mix(u_colBase, u_colCream, cycled * u_mix * u_fade);

  if (u_texReady > 0.5) {
    vec2 sway = warp * u_logoSway * u_fade * vec2(1.0 / aspect, 1.0);
    vec4 logo = texture2D(u_tex, texUv(uv + sway));
    float flip = smoothstep(u_logoFlipLo, u_logoFlipHi, cycled) * u_fade;
    vec3 logoCol = mix(vec3(1.0), u_colBase, flip);
    col = mix(col, logoCol, logo.a);
  }

  col += vec3(dither(gl_FragCoord.xy));
  if (u_grainGain > 0.0) {
    float g = grain1(gl_FragCoord.xy) * 2.0 - 1.0;
    col = clamp(col + g * u_grainGain * 0.5, 0.0, 1.0);
  }
  gl_FragColor = vec4(col, 1.0);
}
`

/** Draw the wordmark centred on a canvas the size of the framebuffer, white on transparent. */
function drawWordmark(target: HTMLCanvasElement, w: number, h: number, dpr: number) {
  target.width = w
  target.height = h
  const ctx = target.getContext('2d')
  if (!ctx) return false
  ctx.clearRect(0, 0, w, h)
  const maxW = Math.min(360 * dpr, w * 0.74)
  let size = 40 * dpr
  ctx.font = `700 ${size}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif`
  const measured = ctx.measureText(WORDMARK).width
  if (measured > maxW) {
    size = (size * maxW) / measured
    ctx.font = `700 ${size}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif`
  }
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(WORDMARK, w / 2, h / 2)
  return true
}

function mountShader(host: HTMLDivElement) {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', opacity: '0' } as CSSStyleDeclaration)
  host.appendChild(canvas)
  const drop = () => canvas.remove()
  const gl = (canvas.getContext('webgl', { antialias: false, alpha: false }) ??
    canvas.getContext('experimental-webgl', { antialias: false, alpha: false })) as WebGLRenderingContext | null
  if (!gl) {
    drop()
    return null
  }
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh)
      return null
    }
    return sh
  }
  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  const prog = gl.createProgram()
  if (!vs || !fs || !prog) {
    drop()
    return null
  }
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    drop()
    return null
  }
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'a_pos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const u = (name: string) => gl.getUniformLocation(prog, name)
  gl.uniform1f(u('u_scale'), CONFIG.nScale)
  gl.uniform1i(u('u_oct'), CONFIG.nOctaves | 0)
  gl.uniform1f(u('u_persist'), CONFIG.nPersist)
  gl.uniform1f(u('u_warp'), CONFIG.nWarp)
  gl.uniform1f(u('u_cycles'), CONFIG.cycles)
  gl.uniform1f(u('u_bright'), CONFIG.brightness)
  gl.uniform1f(u('u_ncontrast'), CONFIG.contrast)
  gl.uniform1f(u('u_crush'), CONFIG.crush)
  gl.uniform1f(u('u_mix'), CONFIG.mix)
  gl.uniform1f(u('u_grainGain'), CONFIG.grainGain)
  gl.uniform3f(u('u_colBase'), ...COL_BASE)
  gl.uniform3f(u('u_colCream'), ...COL_CREAM)
  gl.uniform1f(u('u_logoSway'), CONFIG.logoSway)
  gl.uniform1f(u('u_logoFlipLo'), CONFIG.logoFlipLo)
  gl.uniform1f(u('u_logoFlipHi'), CONFIG.logoFlipHi)
  gl.uniform1f(u('u_texReady'), 0)
  gl.uniform1f(u('u_fade'), 0)
  gl.uniform1i(u('u_tex'), 0)
  const uFade = u('u_fade')
  const uRes = u('u_res')
  const uTime = u('u_time')
  const uGrainTime = u('u_grainTime')
  const uGrainScale = u('u_grainScale')
  const uTexReady = u('u_texReady')

  const tex = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const scratch = document.createElement('canvas')

  let dpr = 1
  const uploadWordmark = () => {
    if (canvas.width === 0) return
    if (!drawWordmark(scratch, canvas.width, canvas.height, dpr)) return
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scratch)
    gl.uniform1f(uTexReady, 1)
  }
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const w = Math.max(1, Math.round(host.clientWidth * dpr))
    const h = Math.max(1, Math.round(host.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      uploadWordmark()
    }
    gl.viewport(0, 0, w, h)
    gl.uniform2f(uRes, w, h)
    gl.uniform1f(uGrainScale, CONFIG.grainScale * dpr)
  }

  const seed = Math.random() * 1000
  const speed = CONFIG.nSpeed * 0.003 * 60
  let frames = 0
  const easeOut = (x: number) => 1 - (1 - x) ** 3
  const draw = (ms: number, fade: number) => {
    gl.uniform1f(uTime, seed + (ms / 1000) * speed)
    gl.uniform1f(uGrainTime, frames % 100)
    gl.uniform1f(uFade, fade)
    frames++
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let raf = 0
  let t0 = -1
  const loop = (now: number) => {
    if (t0 < 0) t0 = now
    const t = now - t0
    draw(t, easeOut(Math.min(1, t / CONFIG.fadeInMs)))
    raf = requestAnimationFrame(loop)
  }
  const ro = new ResizeObserver(() => {
    resize()
    if (reduced) draw(0, 1)
  })
  ro.observe(host)
  resize()
  canvas.style.opacity = '1'
  if (reduced) draw(0, 1)
  else raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    drop()
  }
}

/**
 * Full-screen load shader.
 *
 * Local data is ready on the first render, so without a floor the screen would mount and unmount
 * inside a couple of frames and read as a flicker rather than a splash. It therefore holds for
 * MIN_VISIBLE_MS from mount, then lifts: a fade with a slight scale up, on a curve that starts
 * quickly and eases out, so it feels fast without snapping. The app underneath mounts as soon as
 * the data lands, so it is already painted by the time the dark screen clears.
 */
const MIN_VISIBLE_MS = 320
const EXIT_MS = 420
/** Quick off the mark, long settle. Snappier than ease-out without the jerk of a linear tail. */
const EXIT_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

type Phase = 'holding' | 'leaving' | 'gone'

export default function LoadingScreen({ done = false }: { done?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const shownAt = useRef(performance.now())
  const [phase, setPhase] = useState<Phase>('holding')
  const [fallback, setFallback] = useState(false)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!host.current) return
    const cleanup = mountShader(host.current)
    if (!cleanup) setFallback(true)
    return cleanup ?? undefined
  }, [])

  // Start leaving once the data is in and the floor has elapsed, whichever is later.
  useEffect(() => {
    if (!done || phase !== 'holding') return
    const id = window.setTimeout(() => setPhase('leaving'), Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt.current)))
    return () => window.clearTimeout(id)
  }, [done, phase])

  // Unmount only after the exit has actually played, so the shader is never torn down mid-fade.
  useEffect(() => {
    if (phase !== 'leaving') return
    const id = window.setTimeout(() => setPhase('gone'), reduced ? 160 : EXIT_MS)
    return () => window.clearTimeout(id)
  }, [phase, reduced])

  if (phase === 'gone') return null
  const leaving = phase === 'leaving'
  return (
    <div
      ref={host}
      role="img"
      aria-label="Couch Defector"
      aria-busy={!done}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#0d0d0d',
        overflow: 'hidden',
        opacity: leaving ? 0 : 1,
        // The lift: the screen pulls back a touch as it clears, so it reads as leaving rather than blinking.
        transform: leaving && !reduced ? 'scale(1.03)' : 'scale(1)',
        transformOrigin: 'center center',
        transition: reduced ? 'opacity 160ms linear' : `opacity ${EXIT_MS}ms ${EXIT_EASE}, transform ${EXIT_MS}ms ${EXIT_EASE}`,
        willChange: 'opacity, transform',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      {fallback && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 32,
          }}
        >
          {WORDMARK}
        </div>
      )}
    </div>
  )
}
