/* ================= Navigation ================= */
const deck = document.getElementById("deck");
const slides = [...document.querySelectorAll(".slide")];
const counter = document.getElementById("counter");
const progressBar = document.getElementById("progressBar");
let current = 0;

function fitDeck() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  deck.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function show(i) {
  current = Math.max(0, Math.min(slides.length - 1, i));
  slides.forEach((s, idx) => {
    s.classList.toggle("active", idx === current);
    s.classList.toggle("past", idx < current);
  });
  counter.textContent = `${current + 1} / ${slides.length}`;
  progressBar.style.width = `${((current + 1) / slides.length) * 100}%`;
  history.replaceState(null, "", `#${current + 1}`);
}

document.addEventListener("keydown", (e) => {
  const tag = e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); show(current + 1); }
  else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); show(current - 1); }
  else if (e.key === "Home") show(0);
  else if (e.key === "End") show(slides.length - 1);
  else if (e.key.toLowerCase() === "f") {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }
});

document.getElementById("prevBtn").onclick = () => show(current - 1);
document.getElementById("nextBtn").onclick = () => show(current + 1);

let touchX = null;
document.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
document.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  touchX = null;
});

window.addEventListener("resize", fitDeck);
fitDeck();
show((parseInt(location.hash.slice(1), 10) || 1) - 1);

/* ================= Python syntax highlighting ================= */
const PY_RE = /(#.*$)|("[^"\n]*"|'[^'\n]*')|\b(from|import|as|def|return|for|in|if|else|with|lambda|None|True|False)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_]\w*)(?=\()/gm;

document.querySelectorAll("code.py").forEach((el) => {
  const src = el.textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  el.innerHTML = src.replace(PY_RE, (m, com, str, kw, num, fn) => {
    if (com) return `<span class="tok-com">${com}</span>`;
    if (str) return `<span class="tok-str">${str}</span>`;
    if (kw) return `<span class="tok-kw">${kw}</span>`;
    if (num) return `<span class="tok-num">${num}</span>`;
    if (fn) return `<span class="tok-fn">${fn}</span>`;
    return m;
  });
});

/* ================= Title & people grids ================= */
(function titleDots() {
  const box = document.getElementById("titleDots");
  const minIdx = new Set([7, 23, 58, 81]);
  for (let i = 0; i < 100; i++) {
    const d = document.createElement("i");
    if (minIdx.has(i)) d.className = "min";
    box.appendChild(d);
  }
})();

(function peopleGrid() {
  const box = document.getElementById("peopleGrid");
  const minIdx = new Set([4, 17, 33, 46, 62, 78, 91]);
  for (let i = 0; i < 100; i++) {
    const d = document.createElement("i");
    if (minIdx.has(i)) d.className = "min";
    d.style.animationDelay = `${i * 8}ms`;
    box.appendChild(d);
  }
})();

/* ================= Accuracy paradox ================= */
(function accuracyParadox() {
  const slider = document.getElementById("churnRate");
  const fmt = (n) => n.toLocaleString("fr-FR");
  function update() {
    const p = +slider.value;
    const churners = Math.round(10000 * p / 100);
    document.getElementById("churnRateLabel").textContent = `${p} %`;
    document.getElementById("naiveAcc").textContent = `${100 - p} %`;
    document.getElementById("cmTN").textContent = fmt(10000 - churners);
    document.getElementById("cmFN").textContent = fmt(churners);
  }
  slider.addEventListener("input", update);
  update();
})();

/* ================= class_weight calculator ================= */
(function classWeight() {
  const total = document.getElementById("cwTotal");
  const minority = document.getElementById("cwMin");
  function update() {
    const n = Math.max(2, +total.value || 0);
    const n1 = Math.min(n - 1, Math.max(1, +minority.value || 0));
    const n0 = n - n1;
    const w0 = n / (2 * n0);
    const w1 = n / (2 * n1);
    document.getElementById("w0").textContent = w0.toFixed(3);
    document.getElementById("w1").textContent = w1.toFixed(3);
    const ratio = (w1 / w0).toFixed(1).replace(".0", "");
    document.getElementById("cwExplain").textContent =
      `Une erreur sur un churner coûte autant que ${ratio} erreurs sur des clients fidèles.`;
  }
  total.addEventListener("input", update);
  minority.addEventListener("input", update);
  update();
})();

/* ================= Random over / under sampling ================= */
(function resampling() {
  const N_MAJ = 48, N_MIN = 8;
  const field = document.getElementById("dotField");
  const text = document.getElementById("resampleText");
  const texts = {
    orig: `Jeu d'entraînement d'origine : <b class="c-maj">48 fidèles</b> pour <b class="c-min">8 churners</b>. Le modèle voit 6 fois plus de clients fidèles.`,
    over: `Les churners sont <b>dupliqués au hasard</b> jusqu'à l'équilibre. Les cercles vides sont des <b>copies exactes</b> : aucune information nouvelle, risque de mémorisation.`,
    under: `On <b>retire au hasard</b> 40 clients fidèles pour égaliser. Les points estompés sont des données <b>jetées</b>, avec l'information qu'elles portaient.`,
  };
  // Fixed random subset of majority kept for undersampling
  const keep = new Set();
  while (keep.size < N_MIN) keep.add(Math.floor(Math.random() * N_MAJ));

  function render(mode) {
    field.innerHTML = "";
    let maj = 0, min = 0;
    for (let i = 0; i < N_MAJ; i++) {
      const d = document.createElement("i");
      d.className = "dot maj";
      if (mode === "under" && !keep.has(i)) d.classList.add("ghost");
      else maj++;
      field.appendChild(d);
    }
    for (let i = 0; i < N_MIN; i++) {
      const d = document.createElement("i");
      d.className = "dot min";
      field.appendChild(d);
      min++;
    }
    if (mode === "over") {
      for (let i = 0; i < N_MAJ - N_MIN; i++) {
        const d = document.createElement("i");
        d.className = "dot min dup enter";
        d.style.animationDelay = `${i * 15}ms`;
        field.appendChild(d);
        min++;
      }
    }
    text.innerHTML = texts[mode];
    const max = Math.max(maj, min, N_MAJ);
    document.getElementById("barMaj").style.width = `${(maj / max) * 100}%`;
    document.getElementById("barMin").style.width = `${(min / max) * 100}%`;
    document.getElementById("cntMaj").textContent = maj;
    document.getElementById("cntMin").textContent = min;
  }

  document.querySelectorAll("#resampleTabs button").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#resampleTabs button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      render(b.dataset.mode);
    });
  });
  render("orig");
})();

/* ================= SMOTE interactive demo ================= */
(function smoteDemo() {
  const canvas = document.getElementById("smoteCanvas");
  const ctx = canvas.getContext("2d");
  const W = 560, H = 420;
  ctx.scale(canvas.width / W, canvas.height / H);

  const css = getComputedStyle(document.documentElement);
  const C = {
    maj: css.getPropertyValue("--maj").trim(),
    min: css.getPropertyValue("--min").trim(),
    syn: css.getPropertyValue("--syn").trim(),
    text: css.getPropertyValue("--text").trim(),
    grid: "rgba(255,255,255,0.04)",
  };

  const phaseEl = document.getElementById("smotePhase");
  const formulaEl = document.getElementById("smoteFormula");
  const stepBtn = document.getElementById("smoteStep");
  const autoBtn = document.getElementById("smoteAuto");
  const kSlider = document.getElementById("kSlider");

  let maj, min, syn, k = 5;
  let phase, sel, neigh, target, lambda, animT, busy;

  const randn = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function init() {
    maj = Array.from({ length: 130 }, () => ({
      x: clamp(220 + randn() * 90, 15, W - 15),
      y: clamp(230 + randn() * 75, 15, H - 15),
    }));
    // Two small churner clusters to the right
    min = [
      ...Array.from({ length: 8 }, () => ({ x: 420 + randn() * 32, y: 130 + randn() * 30 })),
      ...Array.from({ length: 6 }, () => ({ x: 440 + randn() * 28, y: 300 + randn() * 28 })),
    ].map((p) => ({ x: clamp(p.x, 15, W - 15), y: clamp(p.y, 15, H - 15) }));
    syn = [];
    resetStep();
    phaseEl.innerHTML = `Cliquez sur <b>Étape suivante</b> pour démarrer. Les <b class="c-min">churners</b> sont très minoritaires face aux <b class="c-maj">clients fidèles</b>.`;
    formulaEl.innerHTML = `x<sub>new</sub> = x<sub>i</sub> + λ · (x<sub>zi</sub> − x<sub>i</sub>)`;
    updateCounts();
    draw();
  }

  function resetStep() {
    phase = 0; sel = null; neigh = []; target = null; lambda = null; animT = 0; busy = false;
  }

  function kNearest(p) {
    return min.filter((q) => q !== p)
      .sort((a, b) => dist(p, a) - dist(p, b))
      .slice(0, k);
  }

  function updateCounts() {
    document.getElementById("nMaj").textContent = maj.length;
    document.getElementById("nMin").textContent = min.length;
    document.getElementById("nSyn").textContent = syn.length;
  }

  function circle(p, r, fill, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function diamond(p, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y); ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r, p.y);
    ctx.closePath(); ctx.fill();
  }
  function ring(p, r, color, width = 2) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
  }
  function label(text, p, color) {
    ctx.font = "600 13px Inter, sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(text, p.x + 10, p.y - 10);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    maj.forEach((p) => circle(p, 4.5, C.maj, 0.45));
    syn.forEach((p) => diamond(p, 5, C.syn));

    if (sel && neigh.length) {
      // radius of neighbourhood
      const r = dist(sel, neigh[neigh.length - 1]);
      ctx.setLineDash([4, 5]);
      ring(sel, r, "rgba(255,255,255,0.25)", 1);
      neigh.forEach((q) => {
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sel.x, sel.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    min.forEach((p) => circle(p, 6, C.min));
    neigh.forEach((q) => ring(q, 10, "rgba(255,255,255,0.7)", 1.5));

    if (sel && target) {
      ctx.strokeStyle = C.syn; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sel.x, sel.y); ctx.lineTo(target.x, target.y); ctx.stroke();
      ring(target, 11, C.syn, 2.5);
      label("x_zi", target, C.syn);
      if (lambda !== null) {
        const t = Math.min(animT, lambda);
        const p = { x: sel.x + t * (target.x - sel.x), y: sel.y + t * (target.y - sel.y) };
        diamond(p, 8, C.syn);
      }
    }
    if (sel) {
      ring(sel, 12, C.text, 2.5);
      label("x_i", sel, C.text);
    }
  }

  function animateTo(done) {
    busy = true;
    const start = performance.now();
    const dur = 900;
    function frame(now) {
      animT = Math.min(1, (now - start) / dur) * lambda;
      draw();
      if (animT < lambda) requestAnimationFrame(frame);
      else { busy = false; done(); }
    }
    requestAnimationFrame(frame);
  }

  function step() {
    if (busy) return;
    if (phase === 0) {
      sel = min[Math.floor(Math.random() * min.length)];
      neigh = []; target = null; lambda = null;
      phaseEl.innerHTML = `<b>Étape 1.</b> On choisit au hasard un churner <b>x<sub>i</sub></b> (cerclé de blanc).`;
      phase = 1;
    } else if (phase === 1) {
      neigh = kNearest(sel);
      phaseEl.innerHTML = `<b>Étape 2.</b> On cherche ses <b>${k} plus proches voisins</b>, uniquement parmi les churners. Les clients fidèles sont ignorés.`;
      phase = 2;
    } else if (phase === 2) {
      target = neigh[Math.floor(Math.random() * neigh.length)];
      phaseEl.innerHTML = `<b>Étape 3.</b> On tire au hasard un de ces voisins : <b class="c-syn" style="color:var(--syn)">x<sub>zi</sub></b>. Le nouveau point sera placé sur le segment jaune.`;
      phase = 3;
    } else if (phase === 3) {
      lambda = Math.random();
      formulaEl.innerHTML = `x<sub>new</sub> = x<sub>i</sub> + <b style="color:var(--syn)">${lambda.toFixed(2)}</b> · (x<sub>zi</sub> − x<sub>i</sub>)`;
      phaseEl.innerHTML = `<b>Étape 4.</b> On tire λ = <b>${lambda.toFixed(2)}</b> dans [0, 1] et on crée le point synthétique à cette fraction du segment.`;
      stepBtn.disabled = true;
      animateTo(() => {
        syn.push({ x: sel.x + lambda * (target.x - sel.x), y: sel.y + lambda * (target.y - sel.y) });
        updateCounts();
        phaseEl.innerHTML = `<b>Point synthétique créé ✓</b> On recommence à partir d'un autre churner, ou on clique sur <b>Équilibrer</b> pour répéter jusqu'au ratio voulu.`;
        stepBtn.disabled = false;
        resetStep();
        draw();
      });
      return;
    }
    draw();
  }

  function generateOne() {
    const p = min[Math.floor(Math.random() * min.length)];
    const nn = kNearest(p);
    const q = nn[Math.floor(Math.random() * nn.length)];
    const l = Math.random();
    syn.push({ x: p.x + l * (q.x - p.x), y: p.y + l * (q.y - p.y) });
  }

  function balance() {
    if (busy) return;
    busy = true;
    resetStep(); busy = true;
    stepBtn.disabled = autoBtn.disabled = true;
    phaseEl.innerHTML = `Génération en boucle jusqu'à <b>autant de churners que de clients fidèles</b>. Les points restent <b>dans l'enveloppe</b> des churners existants.`;
    const timer = setInterval(() => {
      for (let i = 0; i < 3 && min.length + syn.length < maj.length; i++) generateOne();
      updateCounts();
      draw();
      if (min.length + syn.length >= maj.length) {
        clearInterval(timer);
        busy = false;
        stepBtn.disabled = autoBtn.disabled = false;
        phaseEl.innerHTML = `<b>Classes équilibrées.</b> Les nouveaux points remplissent l'espace <b>entre</b> les churners. Avec k grand, on relie les deux groupes et on crée des points dans une zone vide : c'est là que le bruit apparaît.`;
      }
    }, 30);
  }

  kSlider.addEventListener("input", () => {
    k = +kSlider.value;
    document.getElementById("kLabel").textContent = k;
    if (sel && phase >= 2) { neigh = kNearest(sel); if (target && !neigh.includes(target)) { target = null; phase = 2; } draw(); }
  });
  stepBtn.addEventListener("click", step);
  autoBtn.addEventListener("click", balance);
  document.getElementById("smoteReset").addEventListener("click", () => {
    if (busy) return;
    init();
  });

  init();
})();
