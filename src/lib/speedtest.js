// Motor de la prueba de velocidad sobre los endpoints públicos de Cloudflare.
// Latencia: pings mínimos. Descarga y subida: varias conexiones en paralelo durante
// unos segundos; se descarta el arranque y se mide la media del resto.
const BASE = "https://speed.cloudflare.com";
const MTU = 1460;
const PINGS = 10;
const PING_GAP_MS = 120;
const STREAMS = 4;
const WARMUP_MS = 1500;
const WINDOW_MS = 700;
const TICK_MS = 100;
const RETRY_MS = 400;
// Cloudflare responde 429 a descargas de 10 MB o más; con bloques pequeños no limita
const CHUNK_BYTES = 4_000_000;
const MIN_CHUNK_BYTES = 1_000_000;
const UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_ERRORS = 8;

export const DOWNLOAD_MS = 7000;
export const UPLOAD_MS = 5000;

// reason: "network" (sin conexión con el servidor) o "rate-limit" (429)
export class SpeedTestError extends Error {
  constructor(reason, message) {
    super(message);
    this.name = "SpeedTestError";
    this.reason = reason;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Jitter: variación media entre pings consecutivos
export function jitter(values) {
  if (values.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < values.length; i++) sum += Math.abs(values[i] - values[i - 1]);
  return sum / (values.length - 1);
}

export const toMbps = (bytes, ms) => (ms > 0 ? (bytes * 8) / (ms / 1000) / 1e6 : 0);

function checkResponse(response, stats) {
  if (response.ok) return;
  if (response.status === 429) stats.rateLimited = true;
  throw new Error(`HTTP ${response.status}`);
}

async function ping(signal, stats) {
  const start = performance.now();
  let response;
  try {
    response = await fetch(`${BASE}/__down?bytes=0&r=${Math.random()}`, { cache: "no-store", signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new SpeedTestError("network", "Sin conexión con el servidor de prueba");
  }
  if (response.status === 429) throw new SpeedTestError("rate-limit", "El servidor de prueba limitó las peticiones");
  checkResponse(response, stats);
  await response.arrayBuffer();
  return performance.now() - start;
}

// Velocidad instantánea sobre una ventana deslizante y media final sin el arranque
export function createMeter(now = () => performance.now()) {
  const start = now();
  const marks = [{ t: 0, bytes: 0 }];
  let total = 0;
  let warm = null;

  return {
    add(bytes) {
      total += bytes;
    },
    get total() {
      return total;
    },
    tick() {
      const t = now() - start;
      marks.push({ t, bytes: total });
      while (marks.length > 2 && t - marks[1].t > WINDOW_MS) marks.shift();
      if (warm === null && t >= WARMUP_MS) warm = { t, bytes: total };
      const first = marks[0];
      return { t, mbps: toMbps(total - first.bytes, t - first.t) };
    },
    average() {
      const from = warm ?? { t: 0, bytes: 0 };
      return toMbps(total - from.bytes, now() - start - from.t);
    },
  };
}

async function downloadWorker({ signal, meter, stats }) {
  while (!signal.aborted) {
    try {
      const response = await fetch(`${BASE}/__down?bytes=${stats.chunk}&r=${Math.random()}`, { cache: "no-store", signal });
      checkResponse(response, stats);
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        meter.add(value.length);
        stats.verifiedBytes += value.length;
      }
    } catch (error) {
      if (signal.aborted) return;
      console.warn("Descarga fallida", error);
      stats.errors++;
      stats.chunk = Math.max(MIN_CHUNK_BYTES, stats.chunk >> 1);
      await sleep(RETRY_MS);
    }
  }
}

// fetch no informa del progreso de subida, por eso se usa XMLHttpRequest.
// La subida cuenta como verificada cuando el servidor confirma la petición completa.
function uploadWorker(payload) {
  return ({ signal, meter, stats }) =>
    new Promise((resolve) => {
      let xhr = null;
      signal.addEventListener("abort", () => xhr?.abort(), { once: true });

      const send = () => {
        if (signal.aborted) return resolve();
        let sent = 0;
        xhr = new XMLHttpRequest();
        xhr.open("POST", `${BASE}/__up`);
        xhr.upload.onprogress = (event) => {
          meter.add(event.loaded - sent);
          sent = event.loaded;
        };
        xhr.onload = () => {
          if (xhr.status === 429) stats.rateLimited = true;
          if (xhr.status < 200 || xhr.status >= 300) return retry();
          stats.verifiedBytes += payload.size;
          send();
        };
        xhr.onerror = retry;
        xhr.onabort = resolve;
        xhr.send(payload);
      };
      const retry = async () => {
        if (signal.aborted) return resolve();
        stats.errors++;
        await sleep(RETRY_MS);
        send();
      };
      send();
    });
}

function createPayload() {
  const buffer = new Uint8Array(UPLOAD_BYTES);
  for (let offset = 0; offset < buffer.length; offset += 65536) {
    crypto.getRandomValues(buffer.subarray(offset, offset + 65536));
  }
  return new Blob([buffer]);
}

async function measure({ signal, duration, worker, stats, onSpeed, onVerified }) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  signal.addEventListener("abort", stop, { once: true });

  const meter = createMeter();
  const errorsBefore = stats.errors;
  const workers = Array.from({ length: STREAMS }, () => worker({ signal: controller.signal, meter, stats }));

  try {
    await new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        const { t, mbps } = meter.tick();
        onSpeed(mbps, t);
        onVerified(Math.floor(stats.verifiedBytes / MTU), stats.errors);

        // Solo se abandona si todo falla desde el principio; errores sueltos se reintentan
        const failing = stats.errors - errorsBefore > MAX_ERRORS && meter.total === 0;
        if (signal.aborted || failing || t >= duration) clearInterval(timer);
        if (failing) {
          reject(stats.rateLimited
            ? new SpeedTestError("rate-limit", "El servidor de prueba limitó las peticiones")
            : new SpeedTestError("network", "Sin conexión con el servidor de prueba"));
        } else if (signal.aborted || t >= duration) {
          resolve();
        }
      }, TICK_MS);
    });
    return meter.average();
  } finally {
    controller.abort();
    // Una conexión colgada no debe bloquear la prueba
    await Promise.race([Promise.allSettled(workers), sleep(1500)]);
    signal.removeEventListener("abort", stop);
  }
}

export async function runSpeedTest({ signal, onPhase, onLatency, onSpeed, onResult, onVerified }) {
  const stats = { verifiedBytes: 0, errors: 0, chunk: CHUNK_BYTES, rateLimited: false };

  onPhase("latency");
  const pings = [];
  await ping(signal, stats); // el primer ping incluye abrir la conexión y se descarta
  for (let i = 0; i < PINGS; i++) {
    const ms = await ping(signal, stats);
    pings.push(ms);
    onLatency(ms);
    await sleep(PING_GAP_MS);
  }
  const latency = median(pings);
  const jitterMs = jitter(pings);
  onResult({ latency, jitter: jitterMs });

  onPhase("download");
  const download = await measure({ signal, duration: DOWNLOAD_MS, worker: downloadWorker, stats, onSpeed, onVerified });
  signal.throwIfAborted();
  onResult({ download });

  onPhase("upload");
  const upload = await measure({ signal, duration: UPLOAD_MS, worker: uploadWorker(createPayload()), stats, onSpeed, onVerified });
  signal.throwIfAborted();
  onResult({ upload });

  return { latency, jitter: jitterMs, download, upload, packets: Math.floor(stats.verifiedBytes / MTU), errors: stats.errors };
}
