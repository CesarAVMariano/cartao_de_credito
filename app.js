/**
 * CrediView — Dashboard cartão (HTML/CSS/JS)
 * Dados mock 01/01/2026 — 31/03/2026
 */

const PERIODO_INICIO = new Date(2026, 0, 1);
const PERIODO_FIM = new Date(2026, 2, 31, 23, 59, 59, 999);

/* --- PRNG determinístico (mulberry32) --- */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260101);

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}


/* --- Estrutura de categorias (subcategorias e descrições) --- */
const CATEGORIAS = {
  Alimentação: {
    "Restaurante": ["Jantar em restaurante", "Almoço executivo", "Comida delivery"],
    "Supermercado": ["Compras mensais", "Hortifruti", "Bebidas e snacks"],
    Cafeteria: ["Café da manhã", "Café com cliente", "Lanche rápido"],
  },
  Transporte: {
    "Combustível": ["Abastecimento posto", "Gasolina", "Etanol"],
    Uber: ["Corrida ida", "Corrida volta", "Aeroporto"],
    "Transporte público": ["Bilhete metrô", "Ônibus", "Aplicativo de bike"],
  },
  Lazer: {
    Cinema: ["Ingressos cinema", "Cinema IMAX", "Lanche no cinema"],
    "Streaming e jogos": ["Assinatura streaming", "Jogo online", "DLC"],
    Viagem: ["Hotel fim de semana", "Passeio", "Hospedagem"],
  },
  Saúde: {
    Farmácia: ["Medicamentos", "Higiene pessoal", "Suplementos"],
    "Consulta médica": ["Consulta particular", "Exames", "Dentista"],
  },
  Compras: {
    "Eletrônicos": ["Acessório para notebook", "Cabo e adaptador", "Gadget"],
    Vestuário: ["Camiseta", "Tênis", "Casaco"],
    "Casa e decoração": ["Decoração", "Organizadores", "Iluminação"],
  },
  "Serviços e assinaturas": {
    Assinaturas: ["Assinatura software", "Cloud storage", "Ferramenta de design"],
    Utilidades: ["Luz", "Internet", "Telefonia móvel"],
  },
  Educação: {
    Cursos: ["Curso online", "Livro técnico", "Certificação"],
    "Material escolar": ["Apostilas", "Caderno", "Papelaria"],
  },
};

function formatMoney(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* --- Gera transações no período --- */
function generateMockTransactions() {
  const list = [];
  const categorias = Object.keys(CATEGORIAS);
  // ~1 transação a cada 0.5–1.2 dias + extras para ter volume
  const targetCount = 165;

  for (let n = 0; n < targetCount; n++) {
    const t0 = PERIODO_INICIO.getTime();
    const t1 = PERIODO_FIM.getTime();
    const ts = t0 + rand() * (t1 - t0);
    const data = new Date(ts);

    const categoria = pick(categorias);
    const subs = Object.keys(CATEGORIAS[categoria]);
    const subcategoria = pick(subs);
    const descricoes = CATEGORIAS[categoria][subcategoria];
    const descricao = pick(descricoes);

    // Valores por tipo de categoria (faixas em R$)
    const base = {
      Alimentação: [15, 220],
      Transporte: [8, 180],
      Lazer: [25, 450],
      Saúde: [12, 320],
      Compras: [30, 1200],
      "Serviços e assinaturas": [40, 350],
      Educação: [20, 600],
    }[categoria];

    const [lo, hi] = base;
    const valor = Math.round((lo + rand() * (hi - lo)) * 100) / 100;

    list.push({ data, valor, categoria, subcategoria, descricao });
  }

  return list.sort((a, b) => a.data - b.data);
}

let allTransactions = generateMockTransactions();

/* --- Filtro + ordenação --- */
const state = {
  search: "",
  categoria: "",
  dataDe: "",
  dataAte: "",
  /** 'hist' = todo o histórico | { y, m: null|1..12 } | 'custom' */
  periodSeg: "hist",
  sortKey: "data",
  sortDir: "desc",
  chartCategoria: null,
  chartEvolucao: null,
  /** categoria selecionada no drill do gráfico de barras, ou null = visão por categoria */
  chartDrillCategoria: null,
};

function getDataExtent() {
  if (!allTransactions.length) {
    return { min: new Date(PERIODO_INICIO), max: new Date(PERIODO_FIM) };
  }
  let minT = allTransactions[0].data.getTime();
  let maxT = minT;
  for (const t of allTransactions) {
    const x = t.data.getTime();
    if (x < minT) minT = x;
    if (x > maxT) maxT = x;
  }
  const min = new Date(minT);
  const max = new Date(maxT);
  min.setHours(0, 0, 0, 0);
  max.setHours(0, 0, 0, 0);
  return { min, max };
}

function sameLocalDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isFullCalendarMonth(de, ate) {
  if (!de || !ate) return false;
  const y = de.getFullYear();
  const m = de.getMonth();
  if (ate.getFullYear() !== y || ate.getMonth() !== m) return false;
  if (de.getDate() !== 1) return false;
  const last = new Date(y, m + 1, 0);
  return sameLocalDay(ate, last);
}

function applyDataExtent() {
  const { min, max } = getDataExtent();
  const sDe = toISODate(min);
  const sAte = toISODate(max);
  const deEl = document.getElementById("filterDataDe");
  const ateEl = document.getElementById("filterDataAte");
  if (deEl && ateEl) {
    deEl.value = sDe;
    ateEl.value = sAte;
  }
  state.dataDe = sDe;
  state.dataAte = sAte;
  state.periodSeg = "hist";
  rebuildSegmentUI();
  updateDateInputBounds();
}

/** Ano anterior e ano atual (calendário) para a UI */
function getUiYears() {
  const y = new Date().getFullYear();
  return [y - 1, y];
}

function hasDataInYear(y) {
  return allTransactions.some((t) => t.data.getFullYear() === y);
}

function hasDataInMonth(y, month1to12) {
  const m0 = month1to12 - 1;
  return allTransactions.some(
    (t) => t.data.getFullYear() === y && t.data.getMonth() === m0
  );
}

/** Pelo menos um lançamento nesse mês (1–12), em qualquer ano */
function hasDataInMonthAllYears(month1to12) {
  const m0 = month1to12 - 1;
  return allTransactions.some((t) => t.data.getMonth() === m0);
}

function isFullYearOneCalendar(de, ate, y) {
  if (!de || !ate) return false;
  const a = new Date(y, 0, 1);
  const b = new Date(y, 11, 31);
  return sameLocalDay(de, a) && sameLocalDay(ate, b);
}

function isSingleMonthInYear(de, ate, y, month1to12) {
  if (!de || !ate) return false;
  if (de.getFullYear() !== y || ate.getFullYear() !== y) return false;
  if (de.getMonth() !== month1to12 - 1 || ate.getMonth() !== month1to12 - 1) return false;
  return isFullCalendarMonth(de, ate);
}

function applySegmentYear(y) {
  const ps = state.periodSeg;
  const mKeep = typeof ps === "object" && ps && ps.m != null ? ps.m : null;
  if (mKeep != null) {
    applySegmentYearMonth(y, mKeep);
    return;
  }
  const de = new Date(y, 0, 1);
  const ate = new Date(y, 11, 31);
  const sDe = toISODate(de);
  const sAte = toISODate(ate);
  const deEl = document.getElementById("filterDataDe");
  const ateEl = document.getElementById("filterDataAte");
  if (deEl && ateEl) {
    deEl.value = sDe;
    ateEl.value = sAte;
  }
  state.dataDe = sDe;
  state.dataAte = sAte;
  state.periodSeg = { y, m: null };
  rebuildSegmentUI();
  updateDateInputBounds();
}

function applySegmentYearMonth(y, month1to12) {
  const de = new Date(y, month1to12 - 1, 1);
  const ate = new Date(y, month1to12, 0);
  const sDe = toISODate(de);
  const sAte = toISODate(ate);
  const deEl = document.getElementById("filterDataDe");
  const ateEl = document.getElementById("filterDataAte");
  if (deEl && ateEl) {
    deEl.value = sDe;
    ateEl.value = sAte;
  }
  state.dataDe = sDe;
  state.dataAte = sAte;
  state.periodSeg = { y, m: month1to12 };
  rebuildSegmentUI();
  updateDateInputBounds();
}

function applySegmentYearWhole(y) {
  if (!hasDataInYear(y)) return;
  const de = new Date(y, 0, 1);
  const ate = new Date(y, 11, 31);
  const sDe = toISODate(de);
  const sAte = toISODate(ate);
  const deEl = document.getElementById("filterDataDe");
  const ateEl = document.getElementById("filterDataAte");
  if (deEl && ateEl) {
    deEl.value = sDe;
    ateEl.value = sAte;
  }
  state.dataDe = sDe;
  state.dataAte = sAte;
  state.periodSeg = { y, m: null };
  rebuildSegmentUI();
  updateDateInputBounds();
}

function applySegmentMonthOnly(month1to12) {
  const m0 = month1to12 - 1;
  const subset = allTransactions.filter((t) => t.data.getMonth() === m0);
  if (!subset.length) return;
  let minD = subset[0].data;
  let maxD = subset[0].data;
  for (const t of subset) {
    if (t.data < minD) minD = t.data;
    if (t.data > maxD) maxD = t.data;
  }
  const sDe = toISODate(minD);
  const sAte = toISODate(maxD);
  const deEl = document.getElementById("filterDataDe");
  const ateEl = document.getElementById("filterDataAte");
  if (deEl && ateEl) {
    deEl.value = sDe;
    ateEl.value = sAte;
  }
  state.dataDe = sDe;
  state.dataAte = sAte;
  state.periodSeg = { y: null, m: month1to12 };
  rebuildSegmentUI();
  updateDateInputBounds();
}

function syncPeriodSegFromDates() {
  if (!state.dataDe || !state.dataAte) {
    state.periodSeg = "custom";
    return;
  }
  const de = parseISODate(state.dataDe);
  const ate = parseISODate(state.dataAte);
  if (!de || !ate) {
    state.periodSeg = "custom";
    return;
  }
  const ext = getDataExtent();
  if (sameLocalDay(de, ext.min) && sameLocalDay(ate, ext.max)) {
    state.periodSeg = "hist";
    return;
  }
  for (const y of getUiYears()) {
    if (isFullYearOneCalendar(de, ate, y)) {
      state.periodSeg = { y, m: null };
      return;
    }
  }
  for (const y of getUiYears()) {
    for (let m = 1; m <= 12; m++) {
      if (isSingleMonthInYear(de, ate, y, m)) {
        state.periodSeg = { y, m };
        return;
      }
    }
  }
  state.periodSeg = "custom";
}

const MESES_ABREV = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function rebuildSegmentUI() {
  const histBtn = document.getElementById("segBtnHist");
  const segAnos = document.getElementById("segAnos");
  const segMeses = document.getElementById("segMeses");
  const segBtnAnoInteiro = document.getElementById("segBtnAnoInteiro");
  if (!histBtn || !segAnos || !segMeses) return;

  const hasAny = allTransactions.length > 0;
  histBtn.disabled = !hasAny;
  histBtn.classList.toggle("seg-btn--active", state.periodSeg === "hist");

  const yui = getUiYears();
  segAnos.innerHTML = "";
  for (const y of yui) {
    const can = hasDataInYear(y);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "seg-btn";
    btn.textContent = String(y);
    btn.dataset.segYear = String(y);
    btn.disabled = !can;
    const ps = state.periodSeg;
    const active = typeof ps === "object" && ps && ps.y === y;
    btn.classList.toggle("seg-btn--active", active);
    segAnos.appendChild(btn);
  }

  const ps = state.periodSeg;
  const selectedY = typeof ps === "object" && ps && ps.y != null ? ps.y : null;

  if (segBtnAnoInteiro) {
    if (selectedY == null) {
      segBtnAnoInteiro.hidden = true;
    } else {
      segBtnAnoInteiro.hidden = false;
      segBtnAnoInteiro.disabled = !hasDataInYear(selectedY);
      segBtnAnoInteiro.classList.toggle("seg-btn--active", ps.m === null);
    }
  }

  segMeses.innerHTML = "";
  for (let m = 1; m <= 12; m++) {
    const can =
      selectedY != null ? hasDataInMonth(selectedY, m) : hasDataInMonthAllYears(m);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "seg-btn seg-btn--sm";
    b.textContent = MESES_ABREV[m - 1];
    b.dataset.segMonth = String(m);
    b.title =
      selectedY != null
        ? new Date(selectedY, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        : `Todos os ${new Date(2000, m - 1, 1).toLocaleDateString("pt-BR", { month: "long" })} (qualquer ano)`;
    b.disabled = !can;
    const monthActive = typeof ps === "object" && ps && ps.m === m;
    b.classList.toggle("seg-btn--active", monthActive);
    segMeses.appendChild(b);
  }
}

function updateDateInputBounds() {
  const { min, max } = getDataExtent();
  const deEl = document.getElementById("filterDataDe");
  const ateEl = document.getElementById("filterDataAte");
  const sMin = toISODate(min);
  const sMax = toISODate(max);
  if (deEl) {
    deEl.min = sMin;
    deEl.max = sMax;
  }
  if (ateEl) {
    ateEl.min = sMin;
    ateEl.max = sMax;
  }
}

function getDateOnlyFilter() {
  const de = state.dataDe ? parseISODate(state.dataDe) : null;
  const ate = state.dataAte ? parseISODate(state.dataAte) : null;
  const ateOut = ate ? new Date(ate) : null;
  if (ateOut) ateOut.setHours(23, 59, 59, 999);
  return { de, ate: ateOut };
}

function matchesFilters(t) {
  if (state.categoria && t.categoria !== state.categoria) return false;
  const ps = state.periodSeg;
  if (typeof ps === "object" && ps && ps.m != null && (ps.y === null || ps.y === undefined)) {
    if (t.data.getMonth() !== ps.m - 1) return false;
  } else {
    const { de, ate } = getDateOnlyFilter();
    if (de && t.data < de) return false;
    if (ate && t.data > ate) return false;
  }
  const q = state.search.trim().toLowerCase();
  if (q) {
    const blob = [t.categoria, t.subcategoria, t.descricao, formatMoney(t.valor), toISODate(t.data)]
      .join(" ")
      .toLowerCase();
    if (!blob.includes(q)) return false;
  }
  return true;
}

function getFiltered() {
  return allTransactions.filter(matchesFilters);
}

/* --- Agregados --- */
function updateSummary(transactions) {
  const total = transactions.reduce((s, t) => s + t.valor, 0);
  const count = transactions.length;
  const avg = count > 0 ? total / count : 0;
  document.getElementById("cardTotal").textContent = formatMoney(total);
  document.getElementById("cardCount").textContent = String(count);
  document.getElementById("cardAvg").textContent = formatMoney(avg);
  const periodEl = document.getElementById("cardPeriod");
  if (periodEl) {
    const ps = state.periodSeg;
    if (typeof ps === "object" && ps && ps.m != null && (ps.y === null || ps.y === undefined)) {
      const nome = new Date(2000, ps.m - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
      periodEl.textContent = `Todos os ${nome} (todos os anos)`;
    } else {
      const { de, ate } = getDateOnlyFilter();
      if (de && ate) {
        periodEl.textContent = `Período ${de.toLocaleDateString("pt-BR")} a ${ate.toLocaleDateString("pt-BR")}`;
      } else {
        periodEl.textContent = "—";
      }
    }
  }
}

/* --- Série: total por categoria --- */
function aggregateByCategoria(transactions) {
  const m = new Map();
  for (const t of transactions) {
    m.set(t.categoria, (m.get(t.categoria) || 0) + t.valor);
  }
  const entries = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  return {
    labels: entries.map((e) => e[0]),
    values: entries.map((e) => e[1]),
  };
}

/* --- Série: total por subcategoria (apenas uma categoria) --- */
function aggregateBySubcategoria(transactions, categoria) {
  const m = new Map();
  for (const t of transactions) {
    if (t.categoria !== categoria) continue;
    const sub = (t.subcategoria && String(t.subcategoria).trim()) || "(sem subcategoria)";
    m.set(sub, (m.get(sub) || 0) + t.valor);
  }
  const entries = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  return {
    labels: entries.map((e) => e[0]),
    values: entries.map((e) => e[1]),
  };
}

function buildBarCategoryData() {
  const t = getFiltered();
  if (state.chartDrillCategoria) {
    return aggregateBySubcategoria(t, state.chartDrillCategoria);
  }
  return aggregateByCategoria(t);
}

function maybeResetChartDrill() {
  if (!state.chartDrillCategoria) return;
  const t = getFiltered();
  if (!t.some((x) => x.categoria === state.chartDrillCategoria)) {
    state.chartDrillCategoria = null;
  }
}

function updateCategoryPanelUI() {
  const title = document.getElementById("chartCategoriaTitle");
  const hint = document.getElementById("chartCategoriaHint");
  const back = document.getElementById("btnChartCategoriaBack");
  if (title) {
    title.textContent = state.chartDrillCategoria ? "Gasto por subcategoria" : "Gasto por categoria";
  }
  if (hint) {
    hint.textContent = state.chartDrillCategoria
      ? `Nível: ${state.chartDrillCategoria} — use «Voltar» para a visão geral.`
      : "Clique numa categoria na barra para ver subcategorias em detalhe.";
  }
  if (back) {
    back.hidden = !state.chartDrillCategoria;
  }
}

/* --- Série: gasto diário (todos os dias no intervalo visível) --- */
function getLineRange() {
  const { de, ate } = getDateOnlyFilter();
  const start = de || PERIODO_INICIO;
  const end = ate || PERIODO_FIM;
  if (start > end) return { start: end, end: start };
  return { start, end };
}

function aggregateByDay(transactions) {
  const { start, end } = getLineRange();
  const dayMap = new Map();
  for (const t of transactions) {
    const k = toISODate(t.data);
    dayMap.set(k, (dayMap.get(k) || 0) + t.valor);
  }
  const labels = [];
  const values = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(0, 0, 0, 0);
  while (d <= endD) {
    const key = toISODate(d);
    labels.push(key);
    values.push(Math.round((dayMap.get(key) || 0) * 100) / 100);
    d.setDate(d.getDate() + 1);
  }
  return { labels, values };
}

/* --- Chart.js helpers --- */
function chartTextColor() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "#9ab0a3" : "#4a5c52";
}
function chartGridColor() {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "rgba(255,255,255,0.06)"
    : "rgba(20, 82, 58, 0.1)";
}
function lineGradient(scriptable, colorTop) {
  const chart = scriptable.chart;
  const c = chart.ctx;
  const h = chart.height || 200;
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, colorTop);
  g.addColorStop(1, "rgba(34, 160, 107, 0.02)");
  return g;
}

function getBarColors() {
  const n = 8;
  const base = [
    "#0c3d2a",
    "#14523a",
    "#1a6b4a",
    "#22a06b",
    "#2eb87a",
    "#3dd38a",
    "#4ae598",
    "#6aedab",
  ];
  return (i) => base[i % base.length];
}

function ensureCharts() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const text = chartTextColor();
  const grid = chartGridColor();
  maybeResetChartDrill();
  const barData = buildBarCategoryData();
  const dayData = aggregateByDay(getFiltered());

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1100, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "rgba(12, 32, 24, 0.92)" : "rgba(255,255,255,0.95)",
        titleColor: isDark ? "#e8f2ec" : "#0f1612",
        bodyColor: isDark ? "#9ab0a3" : "#4a5c52",
        borderColor: "rgba(34, 160, 107, 0.3)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
        callbacks: {
          label: (c) => {
            const y = c.parsed.y !== undefined ? c.parsed.y : c.parsed;
            return ` ${formatMoney(y)}`;
          },
        },
      },
    },
  };

  const barTooltip = {
    ...commonOptions.plugins.tooltip,
    callbacks: {
      ...commonOptions.plugins.tooltip.callbacks,
      title: (items) => {
        if (!items || !items.length) return "";
        if (state.chartDrillCategoria) {
          return [String(items[0].label), `Categoria: ${state.chartDrillCategoria}`];
        }
        return String(items[0].label);
      },
    },
  };

  const barScales = {
    x: {
      ticks: { color: text, maxRotation: 45, minRotation: 0, font: { size: 11 } },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: text,
        callback: (v) => "R$ " + Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 }),
      },
      grid: { color: grid },
    },
  };

  const barInteractions = {
    onClick: (e, elements) => {
      if (state.chartDrillCategoria) return;
      if (!elements || !elements.length) return;
      const ch = state.chartCategoria;
      if (!ch) return;
      const idx = elements[0].index;
      const lab = ch.data.labels[idx];
      if (lab == null || lab === "") return;
      state.chartDrillCategoria = String(lab);
      ensureCharts();
    },
    onHover: (e, elements) => {
      const cvs = (e && e.native && e.native.target) || state.chartCategoria?.canvas;
      const onBar = !state.chartDrillCategoria && Array.isArray(elements) && elements.length > 0;
      if (cvs && cvs.style) cvs.style.cursor = onBar ? "pointer" : "default";
    },
  };

  if (state.chartCategoria) {
    state.chartCategoria.data.labels = barData.labels;
    state.chartCategoria.data.datasets[0].data = barData.values;
    state.chartCategoria.data.datasets[0].backgroundColor = barData.labels.map((_, i) => getBarColors()(i));
    state.chartCategoria.options.plugins.tooltip = barTooltip;
    state.chartCategoria.update();
    updateCategoryPanelUI();
  } else {
    const ctx = document.getElementById("chartCategoria");
    state.chartCategoria = new Chart(ctx, {
      type: "bar",
      data: {
        labels: barData.labels,
        datasets: [
          {
            data: barData.values,
            backgroundColor: barData.labels.map((_, i) => getBarColors()(i)),
            borderRadius: 16,
            borderSkipped: false,
            maxBarThickness: 48,
          },
        ],
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          tooltip: barTooltip,
        },
        onClick: barInteractions.onClick,
        onHover: barInteractions.onHover,
        scales: barScales,
      },
    });
    updateCategoryPanelUI();
  }

  if (state.chartEvolucao) {
    state.chartEvolucao.data.labels = dayData.labels;
    state.chartEvolucao.data.datasets[0].data = dayData.values;
    const c = isDark ? "rgba(61, 211, 138, 0.35)" : "rgba(34, 160, 107, 0.25)";
    state.chartEvolucao.data.datasets[0].backgroundColor = (ctx) => lineGradient(ctx, c);
    state.chartEvolucao.data.datasets[0].borderColor = isDark ? "#3dd38a" : "#22a06b";
    state.chartEvolucao.update();
  } else {
    const ctx2 = document.getElementById("chartEvolucao");
    const c = isDark ? "rgba(61, 211, 138, 0.35)" : "rgba(34, 160, 107, 0.25)";
    state.chartEvolucao = new Chart(ctx2, {
      type: "line",
      data: {
        labels: dayData.labels,
        datasets: [
          {
            data: dayData.values,
            fill: true,
            backgroundColor: (ctx) => lineGradient(ctx, c),
            borderColor: isDark ? "#3dd38a" : "#22a06b",
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: isDark ? "#3dd38a" : "#22a06b",
            pointBorderColor: isDark ? "#0a1812" : "#fff",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        ...commonOptions,
        interaction: { intersect: false, mode: "index" },
        scales: {
          x: {
            ticks: {
              color: text,
              maxTicksLimit: 12,
              callback: function (tickValue, index) {
                const labels = this.chart.data.labels;
                const s = String(labels[index] != null ? labels[index] : tickValue);
                const p = s.split("-");
                if (p.length < 3) return s;
                const [, m, d] = p;
                return `${d}/${m}`;
              },
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: text,
              callback: (v) =>
                "R$ " + Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 }),
            },
            grid: { color: grid },
          },
        },
      },
    });
  }
}

/* --- Tabela: ordenar --- */
function sortTransactions(rows) {
  const key = state.sortKey;
  const dir = state.sortDir === "asc" ? 1 : -1;
  const copy = [...rows];
  copy.sort((a, b) => {
    let va;
    let vb;
    if (key === "data") {
      va = a.data.getTime();
      vb = b.data.getTime();
    } else if (key === "valor") {
      va = a.valor;
      vb = b.valor;
    } else {
      va = String(a[key]).toLowerCase();
      vb = String(b[key]).toLowerCase();
    }
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
  return copy;
}

function renderTable() {
  const rows = sortTransactions(getFiltered());
  const tb = document.getElementById("transactionsBody");
  tb.innerHTML = "";
  for (const t of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.data.toLocaleDateString("pt-BR")}</td>
      <td class="col-valor">${formatMoney(t.valor)}</td>
      <td>${escapeHtml(t.categoria)}</td>
      <td>${escapeHtml(t.subcategoria)}</td>
      <td>${escapeHtml(t.descricao)}</td>
    `;
    tb.appendChild(tr);
  }
  document.getElementById("tableCount").textContent = `Exibindo ${rows.length} de ${allTransactions.length} transação(ões) no banco de dados.`;
  updateThClasses();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function updateThClasses() {
  document.querySelectorAll(".th-btn").forEach((btn) => {
    const th = btn.closest("th");
    const k = btn.getAttribute("data-sort");
    th.classList.remove("sorted-asc", "sorted-desc");
    if (k === state.sortKey) {
      th.classList.add(state.sortDir === "asc" ? "sorted-asc" : "sorted-desc");
    }
  });
}

function refresh() {
  const filtered = getFiltered();
  updateSummary(filtered);
  ensureCharts();
  renderTable();
}

/* --- Preencher select de categorias --- */
function fillCategorySelect() {
  const sel = document.getElementById("filterCategoria");
  const set = new Set(allTransactions.map((t) => t.categoria));
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  sel.innerHTML = '<option value="">Todas</option>';
  for (const c of sorted) {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  }
  sel.value = state.categoria;
}

/* --- Tema --- */
function applyTheme() {
  const t = localStorage.getItem("crediview-theme");
  if (t === "dark" || (t === null && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  if (state.chartCategoria) {
    state.chartCategoria.destroy();
    state.chartCategoria = null;
  }
  if (state.chartEvolucao) {
    state.chartEvolucao.destroy();
    state.chartEvolucao = null;
  }
  refresh();
}

/* --- Importação CSV (compatível com export) --- */
function parseCSVLine(line, sep) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (!inQ && c === sep) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function mapHeaderIndices(header) {
  const h = header.map((x) => x.trim().replace(/^\uFEFF/, "").toLowerCase());
  const find = (names) => {
    for (const n of names) {
      const nn = n.replace(/\s/g, "");
      const i = h.findIndex((x) => {
        const xx = x.replace(/\s/g, "");
        return x === n || xx === nn;
      });
      if (i >= 0) return i;
    }
    return -1;
  };
  return {
    data: find(["data", "date"]),
    valor: find(["valor", "value", "amount", "total"]),
    categoria: find(["categoria", "category"]),
    subcategoria: find(["subcategoria", "subcategory", "sub-categoria"]),
    descricao: find(["descrição", "descricao", "description", "desc", "histórico", "historico"]),
  };
}

function parseDateCell(s) {
  const t = String(s).trim();
  if (!t) throw new Error("Data vazia");
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    return parseISODate(t.slice(0, 10));
  }
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    return new Date(+br[3], +br[2] - 1, +br[1]);
  }
  const d2 = new Date(t);
  if (!isNaN(d2.getTime())) return d2;
  throw new Error(`Data inválida: ${t}`);
}

function parseValorCell(s) {
  let t = String(s).trim();
  if (!t) return 0;
  t = t.replace(/[R$\s\u00A0]/g, "");
  if (t.includes(".") && t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (t.includes(",") && !t.includes(".")) {
    t = t.replace(",", ".");
  }
  const n = parseFloat(t);
  if (isNaN(n)) throw new Error(`Valor inválido: ${s}`);
  return Math.round(n * 100) / 100;
}

function importCSVText(text) {
  const raw = text.replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("O CSV precisa de cabeçalho e pelo menos uma linha de dados.");
  }
  const first = lines[0];
  const sep = first.split(";").length > first.split(",").length ? ";" : ",";
  const header = parseCSVLine(first, sep);
  const col = mapHeaderIndices(header);
  if (col.data < 0 || col.valor < 0) {
    throw new Error('Colunas obrigatórias: "Data" e "Valor". (Categorias e descrição são opcionais.)');
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i], sep);
    if (cells.length < Math.max(col.data, col.valor) + 1) continue;
    try {
      const data = parseDateCell(cells[col.data] || "");
      const valor = parseValorCell(cells[col.valor] || "0");
      const categoria = col.categoria >= 0 ? String(cells[col.categoria] || "").trim() || "Outros" : "Outros";
      const subcategoria = col.subcategoria >= 0 ? String(cells[col.subcategoria] || "").trim() : "";
      const descricao = col.descricao >= 0 ? String(cells[col.descricao] || "").trim() : "";
      rows.push({ data, valor, categoria, subcategoria, descricao });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Linha ${i + 1}: ${msg}`);
    }
  }
  if (!rows.length) {
    throw new Error("Nenhuma transação válida foi encontrada.");
  }
  allTransactions = rows.sort((a, b) => a.data - b.data);
  state.chartDrillCategoria = null;
  state.categoria = "";
  state.search = "";
  document.getElementById("filterCategoria").value = "";
  const gs = document.getElementById("globalSearch");
  const ft = document.getElementById("filterTexto");
  if (gs) gs.value = "";
  if (ft) ft.value = "";
  applyDataExtent();
  updateDateInputBounds();
  fillCategorySelect();
  refresh();
}

/* --- Export CSV --- */
function exportCSV() {
  const rows = sortTransactions(getFiltered());
  const header = ["Data", "Valor", "Categoria", "Subcategoria", "Descrição"];
  const lines = [header.join(";")];
  for (const t of rows) {
    const line = [
      toISODate(t.data),
      t.valor.toFixed(2).replace(".", ","),
      t.categoria,
      t.subcategoria,
      t.descricao,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(";");
    lines.push(line);
  }
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "transacoes-cartao.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* --- Inicialização --- */
function init() {
  fillCategorySelect();
  applyDataExtent();
  if (typeof Chart !== "undefined") {
    Chart.defaults.font = { family: "'DM Sans', system-ui, sans-serif", size: 12, weight: "500" };
  }
  applyTheme();

  const globalSearch = document.getElementById("globalSearch");
  const filterTexto = document.getElementById("filterTexto");

  function onSearch() {
    state.search = globalSearch.value;
    if (filterTexto.value !== state.search) filterTexto.value = state.search;
    refresh();
  }
  function onSearchFilter() {
    state.search = filterTexto.value;
    if (globalSearch.value !== state.search) globalSearch.value = state.search;
    refresh();
  }

  globalSearch.addEventListener("input", onSearch);
  filterTexto.addEventListener("input", onSearchFilter);

  document.getElementById("filterCategoria").addEventListener("change", (e) => {
    state.categoria = e.target.value;
    refresh();
  });

  const onDateFilterChange = () => {
    const deEl = document.getElementById("filterDataDe");
    const ateEl = document.getElementById("filterDataAte");
    let dDe = deEl.value;
    let dAte = ateEl.value;
    if (dDe && dAte && dDe > dAte) {
      const t = dDe;
      dDe = dAte;
      dAte = t;
      deEl.value = dDe;
      ateEl.value = dAte;
    }
    state.dataDe = dDe;
    state.dataAte = dAte;
    syncPeriodSegFromDates();
    rebuildSegmentUI();
    refresh();
  };
  document.getElementById("filterDataDe").addEventListener("change", onDateFilterChange);
  document.getElementById("filterDataAte").addEventListener("change", onDateFilterChange);

  const segRoot = document.getElementById("segmentFilters");
  if (segRoot) {
    segRoot.addEventListener("click", (e) => {
      const t = e.target.closest(".seg-btn");
      if (!t || t.disabled) return;
      e.preventDefault();
      if (t.id === "segBtnHist" || t.dataset.segAction === "hist") {
        if (!allTransactions.length) return;
        applyDataExtent();
        refresh();
        return;
      }
      if (t.dataset.segAction === "year-only") {
        const ps = state.periodSeg;
        if (typeof ps === "object" && ps && ps.y != null) {
          applySegmentYearWhole(ps.y);
          refresh();
        }
        return;
      }
      if (t.dataset.segYear != null) {
        const y = parseInt(t.dataset.segYear, 10);
        if (!hasDataInYear(y)) return;
        applySegmentYear(y);
        refresh();
        return;
      }
      if (t.dataset.segMonth != null) {
        const m = parseInt(t.dataset.segMonth, 10);
        const ps0 = state.periodSeg;
        const ySel = typeof ps0 === "object" && ps0 && ps0.y != null ? ps0.y : null;
        if (ySel != null) {
          if (!hasDataInMonth(ySel, m)) return;
          applySegmentYearMonth(ySel, m);
        } else {
          if (!hasDataInMonthAllYears(m)) return;
          applySegmentMonthOnly(m);
        }
        refresh();
      }
    });
  }

  document.getElementById("filterReset").addEventListener("click", () => {
    state.categoria = "";
    state.search = "";
    state.chartDrillCategoria = null;
    document.getElementById("filterCategoria").value = "";
    globalSearch.value = "";
    filterTexto.value = "";
    applyDataExtent();
    updateDateInputBounds();
    refresh();
  });

  const btnBackCat = document.getElementById("btnChartCategoriaBack");
  if (btnBackCat) {
    btnBackCat.addEventListener("click", () => {
      state.chartDrillCategoria = null;
      ensureCharts();
    });
  }

  document.querySelectorAll(".th-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = btn.getAttribute("data-sort");
      if (state.sortKey === k) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = k;
        const descFirst = k === "data" || k === "valor" || k === "descricao";
        state.sortDir = descFirst ? "desc" : "asc";
      }
      renderTable();
    });
  });

  document.getElementById("themeToggle").addEventListener("click", () => {
    const d = document.documentElement.getAttribute("data-theme") === "dark";
    if (d) {
      localStorage.setItem("crediview-theme", "light");
    } else {
      localStorage.setItem("crediview-theme", "dark");
    }
    applyTheme();
  });

  document.getElementById("btnExport").addEventListener("click", exportCSV);

  const csvIn = document.getElementById("csvFileInput");
  document.getElementById("btnImport").addEventListener("click", () => {
    if (csvIn) csvIn.click();
  });
  if (csvIn) {
    csvIn.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          importCSVText(String(r.result || ""));
        } catch (err) {
          const m = err instanceof Error ? err.message : String(err);
          alert("Não foi possível importar: " + m);
        }
      };
      r.onerror = () => alert("Erro ao ler o arquivo.");
      r.readAsText(f, "UTF-8");
    });
  }

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      globalSearch.focus();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
