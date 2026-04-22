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
  sortKey: "data",
  sortDir: "desc",
  chartCategoria: null,
  chartEvolucao: null,
};

function getDateOnlyFilter() {
  const de = state.dataDe ? parseISODate(state.dataDe) : null;
  const ate = state.dataAte ? parseISODate(state.dataAte) : null;
  if (ate) ate.setHours(23, 59, 59, 999);
  return { de, ate };
}

function matchesFilters(t) {
  if (state.categoria && t.categoria !== state.categoria) return false;
  const { de, ate } = getDateOnlyFilter();
  if (de && t.data < de) return false;
  if (ate && t.data > ate) return false;
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
  const catData = aggregateByCategoria(getFiltered());
  const dayData = aggregateByDay(getFiltered());

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: "easeOutQuart" },
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

  if (state.chartCategoria) {
    state.chartCategoria.data.labels = catData.labels;
    state.chartCategoria.data.datasets[0].data = catData.values;
    state.chartCategoria.data.datasets[0].backgroundColor = catData.labels.map((_, i) => getBarColors()(i));
    state.chartCategoria.update();
  } else {
    const ctx = document.getElementById("chartCategoria");
    state.chartCategoria = new Chart(ctx, {
      type: "bar",
      data: {
        labels: catData.labels,
        datasets: [
          {
            data: catData.values,
            backgroundColor: catData.labels.map((_, i) => getBarColors()(i)),
            borderRadius: 16,
            borderSkipped: false,
            maxBarThickness: 48,
          },
        ],
      },
      options: {
        ...commonOptions,
        scales: {
          x: {
            ticks: { color: text, maxRotation: 45, minRotation: 0, font: { size: 11 } },
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
  a.download = "transacoes-credito-2026.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* --- Inicialização --- */
function init() {
  document.getElementById("filterDataDe").value = "2026-01-01";
  document.getElementById("filterDataAte").value = "2026-03-31";
  state.dataDe = "2026-01-01";
  state.dataAte = "2026-03-31";

  fillCategorySelect();
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

  document.getElementById("filterDataDe").addEventListener("change", (e) => {
    state.dataDe = e.target.value;
    refresh();
  });
  document.getElementById("filterDataAte").addEventListener("change", (e) => {
    state.dataAte = e.target.value;
    refresh();
  });

  document.getElementById("filterReset").addEventListener("click", () => {
    state.categoria = "";
    state.dataDe = "2026-01-01";
    state.dataAte = "2026-03-31";
    state.search = "";
    document.getElementById("filterCategoria").value = "";
    document.getElementById("filterDataDe").value = "2026-01-01";
    document.getElementById("filterDataAte").value = "2026-03-31";
    globalSearch.value = "";
    filterTexto.value = "";
    refresh();
  });

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
