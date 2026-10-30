// Panel de la prueba de velocidad: estados, barra animada y gráfica en vivo.
import { DOWNLOAD_MS, UPLOAD_MS, runSpeedTest } from "../lib/speedtest.js";
import { locale, t } from "./i18n.js";
import { onThemeChange } from "./theme.js";

const $ = (id) => document.getElementById(id);
const panel = $("speed-panel");
const button = $("speed-btn");
const badge = $("speed-badge");
const status = $("speed-status");
const big = $("speed-big");
const unit = $("speed-unit");
const phaseLabel = $("speed-phase");
const verified = $("speed-verified");
const act = $("speed-act");
const line = $("speed-line");
const area = $("speed-area");
const lane = $("speed-lane");
const nodeLocal = $("speed-node-local");
const nodeRemote = $("speed-node-remote");
const cards = [...panel.querySelectorAll(".speed-m")];
const values = Object.fromEntries(cards.map((card) => [card.dataset.metric, card.querySelector("b")]));

const COLORS = { latency: "#ba7517", download: "#378add", upload: "#1d9e75" };
const DURATIONS = { download: DOWNLOAD_MS, upload: UPLOAD_MS };
const PHASE_NAMES = { latency: t("speed.latency"), download: t("speed.download"), upload: t("speed.upload") };
// Métricas que se resaltan en cada fase o vista
const METRICS = { latency: ["latency", "jitter"], download: ["download"], upload: ["upload"] };
const RUNNING = ["latency", "download", "upload"];
const STATUS = {
  idle: t("speed.statusIdle"),
  latency: t("speed.statusLatency"),
  download: t("speed.statusDownload"),
  upload: t("speed.statusUpload"),
};
const ERRORS = { network: t("speed.errorNetwork"), "rate-limit": t("speed.errorRateLimit") };
const ACTIONS = { idle: t("speed.start"), result: t("speed.repeat"), error: t("speed.retry") };

const CHART_WIDTH = 328;
const LANE_INSET = 8;
const BAR_HEIGHT = 6;
const SEGMENT = 0.45;
const FLASH_GAP_MS = 160;

const state = {
  phase: "idle",
  controller: null,
  results: {},
  samples: { latency: [], download: [], upload: [] },
  speed: 0,
  sweep: 0,
  flashAt: 0,
};

const ctx = lane.getContext("2d");
let width = 0;
let height = 0;
let trackColor = "#888";
let frameId = 0;
let lastFrame = 0;

const isRunning = () => RUNNING.includes(state.phase);
const format = (n) => n.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: n >= 100 ? 0 : 1 });
const formatErrors = (n) => t.plural("speed.errors", n);
const formatCount = (count, errors) => t("speed.packets", { count: count.toLocaleString(locale), errors: formatErrors(errors) });

function verdict({ download }) {
  if (download >= 100) return t("speed.veryFast");
  if (download >= 25) return t("speed.fast");
  if (download >= 10) return t("speed.ok");
  return t("speed.slow");
}

function paintResults() {
  const { download, upload, latency, jitter } = state.results;
  values.download.textContent = download == null ? "—" : format(download);
  values.upload.textContent = upload == null ? "—" : format(upload);
  values.latency.textContent = latency == null ? "—" : Math.round(latency);
  values.jitter.textContent = jitter == null ? "—" : jitter.toFixed(1);
}

function highlight(phase) {
  const active = METRICS[phase] ?? [];
  cards.forEach((card) => card.classList.toggle("active", active.includes(card.dataset.metric)));
}

// Gráfica: eje X por tiempo (o por número de ping) y eje Y escalado al máximo
function drawChart(phase) {
  const samples = state.samples[phase] ?? [];
  if (!samples.length) {
    line.setAttribute("d", "");
    area.setAttribute("d", "");
    return;
  }
  const max = Math.max(...samples.map((s) => s.v), phase === "latency" ? 20 : 10) * 1.15;
  const points = samples.map((s, i) => {
    const progress = phase === "latency" ? i / 9 : s.t / DURATIONS[phase];
    return [Math.min(CHART_WIDTH, progress * CHART_WIDTH), 62 - (s.v / max) * 58];
  });
  const d = `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")}`;
  line.setAttribute("d", d);
  area.setAttribute("d", `${d} L${points.at(-1)[0].toFixed(1)} 63 L${points[0][0].toFixed(1)} 63 Z`);
}

function setPhase(phase) {
  state.phase = phase;
  state.sweep = 0;
  panel.dataset.phase = phase;
  if (isRunning()) state.samples[phase] = [];

  status.textContent = STATUS[phase] ?? "";
  phaseLabel.textContent = PHASE_NAMES[phase] ?? "";
  unit.textContent = phase === "latency" ? "ms" : "Mbps";
  act.textContent = isRunning() ? t("speed.stop") : ACTIONS[phase];
  highlight(phase);

  if (phase === "idle") {
    big.textContent = "0";
    verified.textContent = t("speed.noData");
    drawChart(null);
  } else if (isRunning()) {
    drawChart(phase);
  }
  updateBadge();
}

// En el resultado se puede alternar entre descarga, subida y latencia
function showView(view) {
  const { results } = state;
  big.textContent = view === "latency" ? Math.round(results.latency) : format(results[view]);
  unit.textContent = view === "latency" ? "ms" : "Mbps";
  phaseLabel.textContent = PHASE_NAMES[view];
  panel.style.setProperty("--speed-color", COLORS[view]);
  highlight(view);
  drawChart(view);
}

function updateBadge() {
  const show = panel.hidden && isRunning();
  badge.hidden = !show;
  if (show) badge.textContent = `${big.textContent} ${unit.textContent}`;
}

function reset() {
  state.results = {};
  state.samples = { latency: [], download: [], upload: [] };
  state.speed = 0;
  panel.style.removeProperty("--speed-color");
  paintResults();
}

function stop() {
  state.controller?.abort();
  state.controller = null;
  reset();
  setPhase("idle");
}

function finish(result) {
  state.results = result;
  paintResults();
  setPhase("result");
  showView("download");
  status.textContent = verdict(result);
  verified.textContent = t("speed.integrity", { errors: formatErrors(result.errors) });
}

function fail(error) {
  console.warn("Prueba de velocidad fallida", error);
  setPhase("error");
  status.textContent = ERRORS[error.reason] ?? ERRORS.network;
}

async function start() {
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  reset();

  try {
    const result = await runSpeedTest({
      signal: controller.signal,
      onPhase: setPhase,
      onLatency(ms) {
        state.samples.latency.push({ t: 0, v: ms });
        state.results.latency = ms;
        big.textContent = Math.round(ms);
        drawChart("latency");
        updateBadge();
      },
      onSpeed(mbps, elapsed) {
        const { phase } = state;
        if (!(phase in DURATIONS)) return;
        state.speed = mbps;
        state.samples[phase].push({ t: Math.min(elapsed, DURATIONS[phase]), v: mbps });
        big.textContent = format(mbps);
        drawChart(phase);
        updateBadge();
      },
      onResult(partial) {
        Object.assign(state.results, partial);
        paintResults();
      },
      onVerified(count, errors) {
        verified.textContent = formatCount(count, errors);
      },
    });
    if (!controller.signal.aborted) finish(result);
  } catch (error) {
    if (!controller.signal.aborted) fail(error);
  } finally {
    if (state.controller === controller) state.controller = null;
  }
}

// Barra de progreso indeterminada entre los dos nodos
function resizeLane() {
  const rect = lane.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  width = rect.width;
  height = rect.height;
  lane.width = Math.round(width * ratio);
  lane.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function readTrackColor() {
  trackColor = getComputedStyle(panel).getPropertyValue("--muted").trim() || "#888";
}

function flash(node) {
  const now = performance.now();
  if (now - state.flashAt < FLASH_GAP_MS) return;
  state.flashAt = now;
  node.classList.remove("ok");
  void node.offsetWidth; // reinicia la animación CSS
  node.classList.add("ok");
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

function drawSweep(phase, y, length, dt) {
  // Con más velocidad, vueltas más rápidas
  const intensity = phase === "latency" ? 0 : Math.min(1, Math.log10(1 + state.speed) / 3);
  const period = phase === "latency" ? 1 : 1.5 - 0.6 * intensity;
  const previous = Math.floor(state.sweep);
  state.sweep += dt / period;
  const lap = Math.floor(state.sweep);

  // Descarga hacia ti, subida hacia el servidor y latencia de ida y vuelta
  const toRemote = phase === "upload" || (phase === "latency" && lap % 2 === 0);
  const progress = state.sweep - lap;
  const head = (phase === "latency" ? easeInOut(progress) : progress) * (1 + SEGMENT);
  const toX = (fraction) => LANE_INSET + (toRemote ? fraction : 1 - fraction) * length;
  const tail = toX(head - SEGMENT);
  const tip = toX(head);

  const gradient = ctx.createLinearGradient(tail, 0, tip, 0);
  gradient.addColorStop(0, rgba(COLORS[phase], 0));
  gradient.addColorStop(1, rgba(COLORS[phase], 1));
  ctx.fillStyle = gradient;
  ctx.fillRect(Math.min(tail, tip), y, Math.abs(tip - tail), BAR_HEIGHT);

  // Al terminar cada vuelta, el nodo de destino late una vez
  if (lap > previous) {
    const arrivedRemote = phase === "latency" ? previous % 2 === 0 : toRemote;
    flash(arrivedRemote ? nodeRemote : nodeLocal);
  }
}

function frame(time) {
  frameId = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (time - lastFrame) / 1000 || 0);
  lastFrame = time;
  const y = height / 2 - BAR_HEIGHT / 2;
  const length = width - LANE_INSET * 2;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(LANE_INSET, y, length, BAR_HEIGHT, BAR_HEIGHT / 2);
  ctx.clip();

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = trackColor;
  ctx.fillRect(LANE_INSET, y, length, BAR_HEIGHT);
  ctx.globalAlpha = 1;

  if (state.phase === "result") {
    ctx.fillStyle = rgba(COLORS.upload, 0.55);
    ctx.fillRect(LANE_INSET, y, length, BAR_HEIGHT);
  } else if (isRunning()) {
    drawSweep(state.phase, y, length, dt);
  }
  ctx.restore();
}

function openPanel() {
  panel.hidden = false;
  button.setAttribute("aria-expanded", "true");
  resizeLane();
  readTrackColor();
  lastFrame = performance.now();
  frameId = requestAnimationFrame(frame);
  updateBadge();
}

function closePanel() {
  panel.hidden = true;
  button.setAttribute("aria-expanded", "false");
  cancelAnimationFrame(frameId);
  updateBadge();
}

button.addEventListener("click", () => (panel.hidden ? openPanel() : closePanel()));
$("speed-close").addEventListener("click", closePanel);
act.addEventListener("click", () => (isRunning() ? stop() : start()));
cards.forEach((card) =>
  card.addEventListener("click", () => {
    if (state.phase === "result") showView(card.dataset.view);
  })
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panel.hidden) closePanel();
});
document.addEventListener("click", (event) => {
  if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) closePanel();
});
window.addEventListener("resize", () => {
  if (!panel.hidden) resizeLane();
});
onThemeChange(readTrackColor);

setPhase("idle");
