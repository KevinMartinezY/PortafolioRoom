const sala = document.getElementById('sala');
const pantalla = document.getElementById('pantalla');
const proyeccion = document.getElementById('proyeccion');
const btnPlay = document.getElementById('btn-play');
const btnApagar = document.getElementById('btn-apagar');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const carruselEl = document.getElementById('carruselProyectos');

/* ---------- Carrusel automático (Bootstrap) ---------- */
const INTERVALO_MS = 4000;
const carrusel = window.bootstrap
  ? bootstrap.Carousel.getOrCreateInstance(carruselEl, { interval: INTERVALO_MS, ride: false, pause: 'hover' })
  : null;

btnPrev.addEventListener('click', () => carrusel && carrusel.prev());
btnNext.addEventListener('click', () => carrusel && carrusel.next());

/* ---------- Modo oscuro ---------- */
function setModoOscuro(activar) {
  sala.classList.toggle('oscuro', activar);
  sincronizarVideos();
  if (activar) {
    carrusel && carrusel.cycle();          // empieza a cambiar solo
    setTimeout(() => btnApagar.focus({ preventScroll: true }), 500);
  } else {
    if (carrusel) { carrusel.pause(); carrusel.to(0); }
    btnPlay.focus({ preventScroll: true });
  }
}

btnPlay.addEventListener('click', () => setModoOscuro(true));
btnApagar.addEventListener('click', () => setModoOscuro(false));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sala.classList.contains('oscuro')) setModoOscuro(false);
});

/* ---------- Ajuste en perspectiva de la proyección ----------
   Esquinas de la tela (TL, TR, BR, BL) como fracción de la caja .pantalla.
   Salen de medir sala.png; si cambias la imagen, vuelve a medirlas. */
const ESQUINAS = [
  [0.0045, 0.1527],
  [0.9955, 0.0000],
  [1.0000, 1.0000],
  [0.0000, 0.9635],
];

// Homografía que lleva el rectángulo (0,0)-(w,h) a las 4 esquinas "dst"
function homografia(w, h, dst) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  // Eliminación gaussiana 8x8
  const n = 8;
  for (let i = 0; i < n; i++) {
    let max = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[max][i])) max = r;
    [A[i], A[max]] = [A[max], A[i]]; [b[i], b[max]] = [b[max], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x; // a,b,c,d,e,f,g,h
}

function ajustarProyeccion() {
  const w = pantalla.clientWidth;
  const h = pantalla.clientHeight;
  if (!w || !h) return;
  const dst = ESQUINAS.map(([fx, fy]) => [fx * w, fy * h]);
  const [a, b, c, d, e, f, g, hh] = homografia(w, h, dst);
  proyeccion.style.transform =
    `matrix3d(${a},${d},0,${g}, ${b},${e},0,${hh}, 0,0,1,0, ${c},${f},0,1)`;
}

new ResizeObserver(ajustarProyeccion).observe(pantalla);
ajustarProyeccion();

function sincronizarVideos() {
  const estaOscuro = sala.classList.contains('oscuro');
  const itemActivo = carruselEl.querySelector('.carousel-item.active');

  carruselEl.querySelectorAll('video').forEach((video) => {
    const esVideoActivo = estaOscuro && itemActivo && itemActivo.contains(video);
    if (esVideoActivo) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}

carruselEl.addEventListener('slid.bs.carousel', sincronizarVideos);