// Água em WebGL: um canvas atrás do canvas 2D desenha o volume de água com shader
// (gradiente de profundidade, cáusticas animadas, raios de sol, névoa e brilho do abismo).
// Renderiza em resolução reduzida, porque água é desfocada mesmo: custo baixo em celular médio.
// Se o WebGL não existir ou cair, o jogo volta sozinho para o fundo 2D original.
const VS = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const FS = `precision mediump float;
varying vec2 v;
uniform vec2 uSize;      // tamanho da tela em unidades do jogo (360 x H)
uniform float uCam,uT,uGlow,uRay;
uniform vec3 uC0,uC1,uTint;
uniform vec2 uHook;      // posição do anzol em unidades de tela
float caustic(vec2 p,float t){
  vec2 i=p;float c=1.;
  for(int n=0;n<4;n++){float tt=t*(1.-(3.5/float(n+1)));
    i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
    c+=1./length(vec2(p.x/(sin(i.x+tt)/.005),p.y/(cos(i.y+tt)/.005)));}
  c/=4.;c=1.17-pow(c,1.4);return pow(abs(c),8.);
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec2 s=vec2(v.x,1.-v.y)*uSize;       // tela, origem em cima
  float wy=uCam+s.y;                    // y no mundo (0 = superfície)
  if(wy<0.){gl_FragColor=vec4(0.);return;}
  float d=wy/20.;                       // metros
  float k=pow(clamp(d/170.,0.,1.),.6);
  vec3 col=mix(uC0,uC1,k);
  // névoa de volume: massas de água mais claras e mais escuras que passam devagar
  float fog=noise(vec2(s.x*.012+uT*.03,wy*.006-uT*.02))*.6+noise(vec2(s.x*.03-uT*.05,wy*.017))*.4;
  col*=.9+.22*fog;
  // cáusticas presas ao mundo, sumindo com a profundidade
  float ca=caustic(mod(vec2(s.x,wy*.9)/46.,6.2831853)-250.,uT*.55);
  float shallow=exp(-d/22.);
  col+=uTint*ca*(.34*shallow+.05);
  // raios de sol inclinados saindo da superfície
  float a=s.x*.03+wy*.011;
  float ray=pow(max(0.,sin(a+sin(uT*.35+a*.6)*.9)*.5+.5),4.)+.6*pow(max(0.,sin(a*1.9-uT*.22)*.5+.5),6.);
  col+=uTint*ray*uRay*exp(-d/16.)*.2;
  // faixa clara logo abaixo da superfície
  col+=vec3(1.)*.16*exp(-wy/34.);
  // abismo: pulsos bioluminescentes ao fundo
  if(uGlow>0.){float g=noise(vec2(s.x*.02,wy*.02+uT*.15));col+=vec3(.1,.9,.8)*uGlow*smoothstep(.62,.9,g)*.22;}
  // halo de luz em volta do anzol nas profundezas
  float hd=length((s-uHook)/vec2(1.,1.15));
  col+=uTint*.1*smoothstep(170.,0.,hd)*smoothstep(25.,90.,d);
  gl_FragColor=vec4(col,1.);
}`;

export interface WaterFrame { cam: number; H: number; W: number; t: number; c0: string; c1: string; scene: number; hx: number; hy: number }

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const TINT: [number, number, number][] = [[.85, 1, .9], [.8, .95, 1], [.75, .92, 1], [.6, .75, 1]];
const RAYS = [1, .9, .35, .08];

export class Water {
  ok = false;
  private cv: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private quality = .55;

  constructor(before: HTMLElement) {
    this.cv = document.createElement('canvas');
    this.cv.id = 'gl';
    before.parentElement!.insertBefore(this.cv, before);
    this.cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.ok = false; this.cv.style.display = 'none'; });
    this.cv.addEventListener('webglcontextrestored', () => this.init());
    this.init();
  }

  private init() {
    try {
      const gl = this.cv.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
      if (!gl) return;
      const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
      const pr = gl.createProgram()!;
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link');
      gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['uSize', 'uCam', 'uT', 'uGlow', 'uRay', 'uC0', 'uC1', 'uTint', 'uHook']) this.u[n] = gl.getUniformLocation(pr, n);
      this.gl = gl; this.ok = true; this.cv.style.display = 'block';
    } catch (e) { this.ok = false; this.gl = null; this.cv.style.display = 'none'; }
  }

  setEnabled(on: boolean) { if (!on) { this.ok = false; this.cv.style.display = 'none'; } else if (!this.ok) this.init(); }

  resize(cssW: number, cssH: number) {
    const w = Math.max(64, Math.round(cssW * this.quality)), h = Math.max(64, Math.round(cssH * this.quality));
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
  }

  render(f: WaterFrame) {
    const gl = this.gl; if (!this.ok || !gl) return;
    const u = this.u, i = Math.min(3, f.scene);
    gl.viewport(0, 0, this.cv.width, this.cv.height);
    gl.uniform2f(u.uSize, f.W, f.H); gl.uniform1f(u.uCam, f.cam); gl.uniform1f(u.uT, f.t % 1000);
    gl.uniform1f(u.uGlow, i === 3 ? 1 : 0); gl.uniform1f(u.uRay, RAYS[i]);
    gl.uniform3fv(u.uC0, rgb(f.c0)); gl.uniform3fv(u.uC1, rgb(f.c1)); gl.uniform3fv(u.uTint, TINT[i]);
    gl.uniform2f(u.uHook, f.hx, f.hy);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
