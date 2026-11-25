/*
 * Marmore Studio — animação de abertura da home
 * ------------------------------------------------------------
 * Duas imagens (Linha Luxo à esquerda, Linha Clássica à direita)
 * que se trocam com uma transição líquida em WebGL.
 *
 *  - Passe o mouse na metade esquerda/direita para trocar a imagem.
 *  - Em telas de toque, a troca acontece sozinha a cada AUTO_DELAY ms.
 *  - Sem WebGL, cai para a imagem estática (.mobile-img).
 *
 * Para trocar as imagens, edite IMAGES abaixo.
 */
(function () {
  'use strict';

  var IMAGES = ['assets/img/bg/luxury-bg.jpg', 'assets/img/bg/classic-bg.jpg'];
  var DURATION = 1400;     // ms de cada transição
  var AUTO_DELAY = 5000;   // ms entre trocas automáticas (toque)
  var DARKEN = 0.5;        // escurece as fotos para o texto aparecer
  var BG = [0.063, 0.055, 0.102]; // cor de fundo (#100e1a)

  var wrap = document.querySelector('.home-intro .canvas-wrap');
  if (!wrap) return;
  var canvas = wrap.querySelector('canvas');
  var hits = wrap.querySelectorAll('.hit-area');
  var labels = wrap.querySelectorAll('.hero-line');
  var indicator = document.querySelector('.home-intro .slide-indicator span');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touchOnly = window.matchMedia('(hover: none)').matches;

  var gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false }) ||
           canvas.getContext('experimental-webgl');
  if (!gl) { wrap.classList.add('no-webgl'); return; }

  // ---------- shaders ----------
  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex0, uTex1;',
    'uniform vec2 uRes, uSize0, uSize1, uMouse;',
    'uniform float uProgress, uTime, uMotion, uDarken;',
    'uniform vec3 uBg;',

    // ruído "value noise" + fbm para o fluxo líquido
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.0; a *= 0.5; }',
    '  return v;',
    '}',

    // equivalente a background-size: cover
    'vec2 cover(vec2 uv, vec2 img){',
    '  float rs = uRes.x / uRes.y, ri = img.x / img.y;',
    '  vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);',
    '  return (uv - 0.5) * s * 0.94 + 0.5;', // 0.94 = margem para o deslocamento
    '}',

    'void main(){',
    '  vec2 uv = vUv;',
    '  float p = uProgress;',
    '  float t = uTime;',

    // campo de fluxo com "domain warping" -> aparência de água
    '  vec2 q = uv * vec2(uRes.x / uRes.y, 1.0) * 2.2;',
    '  vec2 warp = vec2(fbm(q + vec2(0.0, t * 0.08)), fbm(q + vec2(5.2, 1.3) - t * 0.06));',
    '  float n = fbm(q + warp * 1.8 + t * 0.05);',

    // frente da onda: varre da esquerda para a direita, recortada pelo ruído
    '  float soft = 0.35;',
    '  float front = mix(uv.x, n, 0.55);',
    '  float m = clamp((p * (1.0 + soft) - front) / soft, 0.0, 1.0);',
    '  m = m * m * (3.0 - 2.0 * m);',
    '  float edge = 1.0 - abs(m * 2.0 - 1.0);',
    '  float swell = sin(p * 3.14159);',

    // deslocamento (refração) — forte na frente da onda, leve no repouso
    '  vec2 dir = (warp - 0.5) * 2.0;',
    '  float amt = (0.004 + 0.09 * edge * swell + 0.02 * swell) * uMotion;',
    '  vec2 par = (uMouse - 0.5) * 0.02 * uMotion;',
    '  vec2 uv0 = cover(uv + dir * amt * (1.0 - p) - par, uSize0);',
    '  vec2 uv1 = cover(uv - dir * amt * p - par * 1.3, uSize1);',

    // leve aberração cromática na borda líquida
    '  vec2 ca = dir * 0.006 * edge * uMotion;',
    '  vec3 c0 = vec3(texture2D(uTex0, uv0 + ca).r, texture2D(uTex0, uv0).g, texture2D(uTex0, uv0 - ca).b);',
    '  vec3 c1 = vec3(texture2D(uTex1, uv1 + ca).r, texture2D(uTex1, uv1).g, texture2D(uTex1, uv1 - ca).b);',
    '  vec3 col = mix(c0, c1, m);',

    // brilho fino ao longo da frente
    '  col += vec3(0.85, 0.72, 0.45) * pow(edge, 6.0) * 0.18 * swell;',

    '  col = mix(col, uBg, uDarken);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    console.warn('[home-hero]', e);
    wrap.classList.add('no-webgl');
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['uTex0', 'uTex1', 'uRes', 'uSize0', 'uSize1', 'uMouse', 'uProgress', 'uTime', 'uMotion', 'uDarken', 'uBg']
    .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform1i(U.uTex0, 0);
  gl.uniform1i(U.uTex1, 1);
  gl.uniform1f(U.uMotion, reduceMotion ? 0.0 : 1.0);
  gl.uniform1f(U.uDarken, DARKEN);
  gl.uniform3fv(U.uBg, BG);

  // ---------- texturas ----------
  function loadTexture(src, unit) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        // NPOT: sem mipmap, clamp nas bordas
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        resolve([img.naturalWidth, img.naturalHeight]);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // ---------- estado ----------
  var progress = 0, from = 0, target = 0, tweenStart = 0;
  var mouse = [0.5, 0.5], mouseSmooth = [0.5, 0.5];
  var visible = true, running = false, start = performance.now();

  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  function goTo(i) {
    if (i === target) return;
    from = progress;
    target = i;
    tweenStart = performance.now();
    labels.forEach(function (l, k) { l.classList.toggle('is-active', k === i); });
    loop();
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = wrap.clientWidth, h = wrap.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
  }

  function frame(now) {
    running = false;
    if (!visible) return;

    var k = Math.min(1, (now - tweenStart) / DURATION);
    progress = from + (target - from) * ease(k);

    mouseSmooth[0] += (mouse[0] - mouseSmooth[0]) * 0.06;
    mouseSmooth[1] += (mouse[1] - mouseSmooth[1]) * 0.06;

    gl.uniform1f(U.uProgress, progress);
    gl.uniform1f(U.uTime, reduceMotion ? 0 : (now - start) / 1000);
    gl.uniform2f(U.uMouse, mouseSmooth[0], 1 - mouseSmooth[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (indicator) indicator.style.transform = 'translateX(' + (60 * progress) + 'px)';

    // o líquido se mexe sempre (ondulação leve); com reduced-motion só durante a troca
    if (!reduceMotion || k < 1) loop();
  }
  function loop() {
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  // ---------- eventos ----------
  if (hits[0]) hits[0].addEventListener('mouseenter', function () { goTo(0); });
  if (hits[1]) hits[1].addEventListener('mouseenter', function () { goTo(1); });
  wrap.addEventListener('mousemove', function (e) {
    var r = wrap.getBoundingClientRect();
    mouse[0] = (e.clientX - r.left) / r.width;
    mouse[1] = (e.clientY - r.top) / r.height;
  });
  window.addEventListener('resize', function () { resize(); loop(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) loop();
    }).observe(wrap);
  }

  Promise.all([loadTexture(IMAGES[0], 0), loadTexture(IMAGES[1], 1)]).then(function (sizes) {
    gl.uniform2f(U.uSize0, sizes[0][0], sizes[0][1]);
    gl.uniform2f(U.uSize1, sizes[1][0], sizes[1][1]);
    resize();
    wrap.classList.add('is-webgl');
    loop();
    if (touchOnly && !reduceMotion) {
      setInterval(function () { if (visible) goTo(target === 0 ? 1 : 0); }, AUTO_DELAY);
    }
  }).catch(function (e) {
    console.warn('[home-hero] imagens não carregaram', e);
    wrap.classList.add('no-webgl');
  });
})();
