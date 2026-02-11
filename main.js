// ═══════════════════════════════════════════════════════════════
// ADIMOLOGY — Fair Stock Calculator
// Full-featured vanilla JS matching MarketPulse Adimology
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = "adimology_history";
const THEME_KEY = "fair-stock-theme";

// ─── Utilities ──────────────────────────────────────────────────

function parseNum(v) {
  if (v == null) return 0;
  const s = String(v).replace(/[^0-9.]/g, "");
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function fmt(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("id-ID");
}

// ─── IDX Tick Size / Fraksi Logic ───────────────────────────────

function calculateFraksi(arb, ara) {
  const result = { f1: 0, f2: 0, f5: 0, f10: 0, f25: 0, total: 0 };
  if (arb <= 0 || ara <= 0 || ara <= arb) return result;

  if (arb < 200) {
    result.f1 = Math.max(0, Math.min(200, ara) - arb);
  }
  if (ara > 200) {
    result.f2 = Math.max(0, (Math.min(500, ara) - Math.max(200, arb)) / 2);
  }
  if (ara > 500) {
    result.f5 = Math.max(0, (Math.min(2000, ara) - Math.max(500, arb)) / 5);
  }
  if (ara > 2000) {
    result.f10 = Math.max(0, (Math.min(5000, ara) - Math.max(2000, arb)) / 10);
  }
  if (ara > 5000) {
    result.f25 = Math.max(0, (ara - Math.max(5000, arb)) / 25);
  }

  result.total = result.f1 + result.f2 + result.f5 + result.f10 + result.f25;
  return result;
}

function calculateTarget(startPrice, ticks) {
  if (ticks <= 0 || startPrice <= 0) return startPrice;

  if (startPrice < 500) {
    const f1Ticks = startPrice < 200 ? Math.min(ticks, 200 - startPrice) : 0;
    const remaining = ticks - f1Ticks;
    const priceAfterF1 = startPrice + f1Ticks;

    const f2Ticks = (remaining > 0 && priceAfterF1 < 500)
      ? Math.min(remaining, (500 - priceAfterF1) / 2)
      : 0;
    const rawResult = priceAfterF1 + 2 * f2Ticks;

    if (rawResult < 200) return rawResult;
    return Math.round(rawResult / 2) * 2;
  }

  if (startPrice < 2000) return startPrice + ticks * 5;
  if (startPrice < 5000) return startPrice + ticks * 10;
  return startPrice + ticks * 25;
}

function computeAll(buyLot, buyAvg, arbVal, araVal, tBid, tOffer) {
  if (buyLot <= 0 || buyAvg <= 0) return null;

  const totalBidOffer = tBid + tOffer;
  const fraksi = calculateFraksi(arbVal, araVal);

  if (fraksi.total <= 0 || totalBidOffer <= 0) return null;

  const avgBidOffer = totalBidOffer / fraksi.total;
  const powerFraksi = Math.floor(buyLot / avgBidOffer);
  const target5pct = Math.floor(buyAvg * 1.05);
  const targetLow = calculateTarget(target5pct, Math.floor(powerFraksi / 2));
  const targetHigh = calculateTarget(target5pct, powerFraksi);

  const pctLow = buyAvg > 0 ? ((targetLow - buyAvg) / buyAvg) * 100 : 0;
  const pctHigh = buyAvg > 0 ? ((targetHigh - buyAvg) / buyAvg) * 100 : 0;

  return {
    totalBidOffer,
    fraksi,
    avgBidOffer: Math.round(avgBidOffer * 100) / 100,
    powerFraksi,
    target5pct,
    targetLow,
    targetHigh,
    pctLow: Math.round(pctLow * 100) / 100,
    pctHigh: Math.round(pctHigh * 100) / 100,
  };
}

// ─── Power Level ────────────────────────────────────────────────

function getPowerLevel(p) {
  if (p >= 30) return { label: "EXTREME", colorClass: "c-red", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" };
  if (p >= 20) return { label: "VERY HIGH", colorClass: "c-orange", bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.3)" };
  if (p >= 10) return { label: "HIGH", colorClass: "c-amber", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)" };
  if (p >= 5) return { label: "MODERATE", colorClass: "c-blue", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.3)" };
  if (p >= 2) return { label: "LOW", colorClass: "c-cyan", bg: "rgba(34,211,238,0.1)", border: "rgba(34,211,238,0.3)" };
  return { label: "MINIMAL", colorClass: "c-zinc", bg: "rgba(63,63,70,0.15)", border: "rgba(63,63,70,0.3)" };
}

function getPowerColorForHistory(p) {
  if (p >= 20) return "c-orange";
  if (p >= 10) return "c-amber";
  if (p >= 5) return "c-blue";
  return "c-zinc";
}

function getPctColorForHistory(pct) {
  if (pct >= 10) return "c-emerald";
  if (pct >= 5) return "c-blue";
  return "c-zinc";
}

// ─── History Storage ────────────────────────────────────────────

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveHistory(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) { /* ignore */ }
}

// ─── Theme ──────────────────────────────────────────────────────

function initTheme() {
  const root = document.documentElement;
  const toggleBtn = document.getElementById("themeToggle");
  const sunIcon = document.querySelector(".sun-icon");
  const moonIcon = document.querySelector(".moon-icon");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (theme === "dark") {
      sunIcon.style.display = "block";
      moonIcon.style.display = "none";
      if (metaTheme) metaTheme.content = "#09090b";
    } else {
      sunIcon.style.display = "none";
      moonIcon.style.display = "block";
      if (metaTheme) metaTheme.content = "#f4f4f5";
    }
  }

  let current = localStorage.getItem(THEME_KEY);
  if (!current) {
    const hour = new Date().getHours();
    current = (hour < 7 || hour >= 19) ? "dark" : "light";
  }
  applyTheme(current);

  toggleBtn.addEventListener("click", () => {
    current = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(current);
  });
}

// ─── PWA ────────────────────────────────────────────────────────

let deferredPrompt = null;

function initPWA() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }

  const installBtn = document.getElementById("installBtn");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.add("show");
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      installBtn.classList.remove("show");
    }
    deferredPrompt = null;
  });

  window.addEventListener("appinstalled", () => {
    installBtn.classList.remove("show");
    deferredPrompt = null;
  });
}

// ─── Rendering Helpers ──────────────────────────────────────────

function renderFraksiRows(fraksi, totalBidOffer, avgBidOffer) {
  const container = document.getElementById("fraksiRows");
  const totalEl = document.getElementById("fraksiTotal");
  const summaryEl = document.getElementById("fraksiSummary");

  const items = [
    { label: "Rp 1", value: fraksi.f1, cls: "f1" },
    { label: "Rp 2", value: fraksi.f2, cls: "f2" },
    { label: "Rp 5", value: fraksi.f5, cls: "f5" },
    { label: "Rp 10", value: fraksi.f10, cls: "f10" },
    { label: "Rp 25", value: fraksi.f25, cls: "f25" },
  ];

  totalEl.textContent = `Total: ${fraksi.total} ticks`;

  container.innerHTML = items.map((it) => {
    const pct = fraksi.total > 0 ? (it.value / fraksi.total) * 100 : 0;
    const w = Math.max(pct, it.value > 0 ? 2 : 0);
    return `<div class="fraksi-row">
      <span class="fraksi-label">${it.label}</span>
      <div class="fraksi-track"><div class="fraksi-fill ${it.cls}" style="width:${w}%"></div></div>
      <span class="fraksi-val">${it.value}</span>
      <span class="fraksi-pct">(${pct.toFixed(0)}%)</span>
    </div>`;
  }).join("");

  summaryEl.innerHTML = `
    <div><div class="fs-label">Total Bid+Offer</div><div class="fs-value">${fmt(totalBidOffer)} lot</div></div>
    <div><div class="fs-label">Avg per Tick</div><div class="fs-value">${fmt(avgBidOffer)} lot</div></div>
  `;
}

function renderPowerHero(result, emiten, broker, buyLot, buyAvg) {
  const powerValue = document.getElementById("powerValue");
  const powerBadge = document.getElementById("powerBadge");
  const powerLabel = document.getElementById("powerLabel");
  const powerMeta = document.getElementById("powerMeta");

  const level = getPowerLevel(result.powerFraksi);

  powerValue.textContent = result.powerFraksi;
  powerValue.className = "power-number " + level.colorClass;

  powerBadge.style.background = level.bg;
  powerBadge.style.borderColor = level.border;
  powerBadge.className = "power-badge " + level.colorClass;
  powerLabel.textContent = level.label;

  powerMeta.innerHTML = `
    <div>${(emiten || "—").toUpperCase()} / ${(broker || "—").toUpperCase()}</div>
    <div>Buy: ${fmt(buyLot)} lot @ ${fmt(buyAvg)}</div>
    <div>Avg Bid/Offer per tick: ${fmt(result.avgBidOffer)} lot</div>
  `;
}

function renderTargetCards(result, buyAvg) {
  document.getElementById("tcBuyAvg").textContent = fmt(buyAvg);
  document.getElementById("tcTarget5").textContent = fmt(result.target5pct);
  document.getElementById("tcTargetLow").textContent = fmt(result.targetLow);
  document.getElementById("tcTargetHigh").textContent = fmt(result.targetHigh);

  document.getElementById("tcTargetLowSub").textContent = `+${result.pctLow.toFixed(1)}% (½ power)`;
  document.getElementById("tcTargetHighSub").textContent = `+${result.pctHigh.toFixed(1)}% (full power)`;
}

function renderPriceBar(result, buyAvg, arbVal, araVal) {
  const container = document.getElementById("priceBarContainer");
  const card = document.getElementById("priceBarCard");

  if (arbVal <= 0 || araVal <= 0 || buyAvg <= 0) {
    card.style.display = "none";
    return;
  }
  card.style.display = "";

  const min = Math.min(arbVal, buyAvg) * 0.98;
  const max = Math.max(araVal, result.targetHigh) * 1.02;
  const range = max - min;
  if (range <= 0) { card.style.display = "none"; return; }

  const pct = (v) => ((v - min) / range) * 100;

  container.innerHTML = `
    <!-- ARB-ARA range -->
    <div class="price-bar-range" style="left:${pct(arbVal)}%;width:${pct(araVal) - pct(arbVal)}%"></div>

    <!-- Buy Avg marker -->
    <div class="price-bar-marker" style="left:${pct(buyAvg)}%;background:var(--text-secondary)">
      <div class="price-bar-label" style="top:-18px;left:50%;transform:translateX(-50%);color:var(--text-secondary)">Buy ${fmt(buyAvg)}</div>
    </div>

    <!-- Target 5% marker -->
    <div class="price-bar-marker" style="left:${pct(result.target5pct)}%;background:rgba(59,130,246,0.6)">
      <div class="price-bar-label" style="bottom:-18px;left:50%;transform:translateX(-50%);color:var(--blue-400)">T5% ${fmt(result.target5pct)}</div>
    </div>

    <!-- Target Low zone -->
    <div class="price-bar-zone" style="left:${pct(result.target5pct)}%;width:${Math.max(pct(result.targetLow) - pct(result.target5pct), 0.5)}%;background:rgba(16,185,129,0.15);border-left:2px solid rgba(16,185,129,0.5)"></div>

    <!-- Target High zone -->
    <div class="price-bar-zone" style="left:${pct(result.targetLow)}%;width:${Math.max(pct(result.targetHigh) - pct(result.targetLow), 0.5)}%;background:rgba(245,158,11,0.1);border-left:2px solid rgba(245,158,11,0.5)"></div>

    <!-- Target Low marker -->
    <div class="price-bar-marker" style="left:${pct(result.targetLow)}%;background:var(--emerald-500)">
      <div class="price-bar-label" style="top:-18px;left:50%;transform:translateX(-50%);color:var(--emerald-400)">Low ${fmt(result.targetLow)}</div>
    </div>

    <!-- Target High marker -->
    <div class="price-bar-marker" style="left:${Math.min(pct(result.targetHigh), 99)}%;background:var(--amber-500)">
      <div class="price-bar-label" style="top:-18px;left:50%;transform:translateX(-50%);color:var(--amber-400)">High ${fmt(result.targetHigh)}</div>
    </div>

    <!-- ARB label -->
    <div class="price-bar-label" style="bottom:-18px;left:${pct(arbVal)}%;color:rgba(248,113,113,0.6)">ARB ${fmt(arbVal)}</div>

    <!-- ARA label -->
    <div class="price-bar-label" style="bottom:-18px;left:${pct(araVal)}%;transform:translateX(-100%);color:rgba(74,222,128,0.6)">ARA ${fmt(araVal)}</div>
  `;
}

// ─── History Rendering ──────────────────────────────────────────

function renderHistory(history, loadCallback, deleteCallback) {
  const emptyEl = document.getElementById("historyEmpty");
  const tableBody = document.getElementById("historyTableBody");
  const cardsEl = document.getElementById("historyCards");
  const countEl = document.getElementById("historyCount");
  const clearBtn = document.getElementById("clearHistoryBtn");

  countEl.textContent = `(${history.length})`;
  clearBtn.style.display = history.length > 0 ? "flex" : "none";

  if (!history.length) {
    emptyEl.style.display = "block";
    tableBody.innerHTML = "";
    cardsEl.innerHTML = "";
    return;
  }
  emptyEl.style.display = "none";

  // Desktop table
  tableBody.innerHTML = history.map((item, idx) => {
    const powerColor = getPowerColorForHistory(item.powerFraksi);
    const pctColor = getPctColorForHistory(item.pctHigh);
    return `<tr data-idx="${idx}">
      <td class="col-time">${item.timestamp}</td>
      <td class="col-emiten">${item.emiten}</td>
      <td class="col-broker">${item.broker}</td>
      <td class="right col-num">${fmt(item.buyLot)}</td>
      <td class="right col-num">${fmt(item.buyAvg)}</td>
      <td class="right" style="color:rgba(248,113,113,0.6)">${fmt(item.arb)}</td>
      <td class="right" style="color:rgba(74,222,128,0.6)">${fmt(item.ara)}</td>
      <td class="right"><span class="${powerColor}" style="font-weight:900">${item.powerFraksi}</span></td>
      <td class="right c-blue">${fmt(item.target5pct)}</td>
      <td class="right c-emerald" style="font-weight:700">${fmt(item.targetLow)}</td>
      <td class="right c-amber" style="font-weight:700">${fmt(item.targetHigh)}</td>
      <td class="right"><span class="${pctColor}" style="font-weight:700">+${item.pctHigh.toFixed(1)}%</span></td>
      <td class="center"><button class="btn-delete-row" data-del="${idx}"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
    </tr>`;
  }).join("");

  // Mobile cards
  cardsEl.innerHTML = history.map((item, idx) => {
    const powerColor = getPowerColorForHistory(item.powerFraksi);
    return `<div class="history-card-item" data-idx="${idx}">
      <div class="hc-top">
        <div class="hc-title">${item.emiten} <span style="font-weight:400;color:var(--text-muted);font-size:0.7rem">/ ${item.broker}</span></div>
        <div class="hc-time">${item.timestamp}</div>
      </div>
      <div class="hc-grid">
        <div class="hc-metric"><span class="hcm-label">Buy Lot</span><span class="hcm-value">${fmt(item.buyLot)}</span></div>
        <div class="hc-metric"><span class="hcm-label">Power</span><span class="hcm-value ${powerColor}">${item.powerFraksi}</span></div>
        <div class="hc-metric"><span class="hcm-label">Target 5%</span><span class="hcm-value c-blue">${fmt(item.target5pct)}</span></div>
        <div class="hc-metric"><span class="hcm-label">Target Low</span><span class="hcm-value c-emerald">${fmt(item.targetLow)}</span></div>
        <div class="hc-metric"><span class="hcm-label">Target High</span><span class="hcm-value c-amber">${fmt(item.targetHigh)}</span></div>
        <div class="hc-metric"><span class="hcm-label">%High</span><span class="hcm-value c-emerald">+${item.pctHigh.toFixed(1)}%</span></div>
      </div>
    </div>`;
  }).join("");

  // Event: click row to load
  tableBody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", (e) => {
      if (e.target.closest(".btn-delete-row")) return;
      loadCallback(parseInt(tr.dataset.idx));
    });
  });

  cardsEl.querySelectorAll(".history-card-item").forEach((card) => {
    card.addEventListener("click", () => {
      loadCallback(parseInt(card.dataset.idx));
    });
  });

  // Event: delete row
  tableBody.querySelectorAll(".btn-delete-row").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteCallback(parseInt(btn.dataset.del));
    });
  });
}

// ─── Main ───────────────────────────────────────────────────────

function main() {
  initTheme();
  initPWA();

  // DOM refs
  const elEmiten = document.getElementById("emiten");
  const elBroker = document.getElementById("brokerCode");
  const elBuyLot = document.getElementById("buyLot");
  const elBuyAvg = document.getElementById("buyAvg");
  const elArb = document.getElementById("arb");
  const elAra = document.getElementById("ara");
  const elTotalBid = document.getElementById("totalBid");
  const elTotalOffer = document.getElementById("totalOffer");
  const submitBtn = document.getElementById("submitBtn");
  const clearBtn = document.getElementById("clearHistoryBtn");
  const historyToggle = document.getElementById("historyToggle");
  const historySection = document.getElementById("historySection");
  const emptyState = document.getElementById("emptyState");
  const resultsArea = document.getElementById("resultsArea");
  const fraksiCard = document.getElementById("fraksiCard");

  const allInputs = [elEmiten, elBroker, elBuyLot, elBuyAvg, elArb, elAra, elTotalBid, elTotalOffer];

  let history = loadHistory();
  let currentResult = null;

  // ─── Live Calculation ─────────────────────────────────────────

  function liveCalc() {
    const buyLot = parseNum(elBuyLot.value);
    const buyAvg = parseNum(elBuyAvg.value);
    const arbVal = parseNum(elArb.value);
    const araVal = parseNum(elAra.value);
    const tBid = parseNum(elTotalBid.value);
    const tOffer = parseNum(elTotalOffer.value);

    currentResult = computeAll(buyLot, buyAvg, arbVal, araVal, tBid, tOffer);

    if (currentResult) {
      emptyState.style.display = "none";
      resultsArea.style.display = "";
      fraksiCard.style.display = "";
      submitBtn.disabled = false;

      renderPowerHero(currentResult, elEmiten.value, elBroker.value, buyLot, buyAvg);
      renderTargetCards(currentResult, buyAvg);
      renderPriceBar(currentResult, buyAvg, arbVal, araVal);
      renderFraksiRows(currentResult.fraksi, currentResult.totalBidOffer, currentResult.avgBidOffer);
    } else {
      emptyState.style.display = "";
      resultsArea.style.display = "none";
      fraksiCard.style.display = "none";
      submitBtn.disabled = true;
    }
  }

  allInputs.forEach((el) => el.addEventListener("input", liveCalc));

  // ─── Save to History ──────────────────────────────────────────

  submitBtn.addEventListener("click", () => {
    if (!currentResult) return;

    const entry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString("id-ID"),
      emiten: (elEmiten.value || "—").toUpperCase(),
      broker: (elBroker.value || "—").toUpperCase(),
      buyLot: parseNum(elBuyLot.value),
      buyAvg: parseNum(elBuyAvg.value),
      arb: parseNum(elArb.value),
      ara: parseNum(elAra.value),
      totalBid: parseNum(elTotalBid.value),
      totalOffer: parseNum(elTotalOffer.value),
      ...currentResult,
    };

    history = [entry, ...history].slice(0, 50);
    saveHistory(history);
    renderHistory(history, loadFromHistory, deleteFromHistory);
  });

  // ─── Load from History ────────────────────────────────────────

  function loadFromHistory(idx) {
    const item = history[idx];
    if (!item) return;
    elEmiten.value = item.emiten;
    elBroker.value = item.broker;
    elBuyLot.value = item.buyLot;
    elBuyAvg.value = item.buyAvg;
    elArb.value = item.arb;
    elAra.value = item.ara;
    elTotalBid.value = item.totalBid;
    elTotalOffer.value = item.totalOffer;
    liveCalc();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteFromHistory(idx) {
    history = history.filter((_, i) => i !== idx);
    saveHistory(history);
    renderHistory(history, loadFromHistory, deleteFromHistory);
  }

  // ─── Clear History ────────────────────────────────────────────

  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!history.length) return;
    if (confirm("Hapus semua riwayat?")) {
      history = [];
      saveHistory(history);
      renderHistory(history, loadFromHistory, deleteFromHistory);
    }
  });

  // ─── History Toggle ───────────────────────────────────────────

  historyToggle.addEventListener("click", (e) => {
    if (e.target.closest(".btn-clear")) return;
    historySection.classList.toggle("open");
  });

  // ─── Initial Render ───────────────────────────────────────────

  renderHistory(history, loadFromHistory, deleteFromHistory);
  liveCalc();
}

main();
