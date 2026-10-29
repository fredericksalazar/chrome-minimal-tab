import assert from "node:assert/strict";
import { test } from "node:test";
import { BLUR, IMAGE_MAX_BYTES, checkImageFile, clampBlur, fitSize, imageCss, normalizeImage, toneFromPixels } from "../src/lib/backgrounds.js";

const DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const pixels = (...rgba) => Uint8ClampedArray.from(rgba.flat());

test("checkImageFile acepta imágenes y rechaza otros tipos o más de 20 MB", () => {
  assert.equal(checkImageFile({ type: "image/png", size: 1000 }), null);
  assert.equal(checkImageFile({ type: "image/webp", size: IMAGE_MAX_BYTES }), null);
  assert.equal(checkImageFile({ type: "application/pdf", size: 1000 }), "type");
  assert.equal(checkImageFile({ type: "", size: 1000 }), "type");
  assert.equal(checkImageFile({ type: "image/jpeg", size: IMAGE_MAX_BYTES + 1 }), "size");
  assert.equal(checkImageFile(undefined), "type");
});

test("fitSize reduce el lado mayor sin deformar ni ampliar", () => {
  assert.deepEqual(fitSize(5120, 2880, 2560), { width: 2560, height: 1440 });
  assert.deepEqual(fitSize(3000, 6000, 2560), { width: 1280, height: 2560 });
  assert.deepEqual(fitSize(800, 600, 2560), { width: 800, height: 600 });
});

test("toneFromPixels distingue imágenes claras y oscuras", () => {
  assert.equal(toneFromPixels(pixels([250, 250, 245, 255], [230, 240, 250, 255])), "light");
  assert.equal(toneFromPixels(pixels([20, 30, 60, 255], [90, 80, 70, 255])), "dark");
  // Los píxeles transparentes no cuentan
  assert.equal(toneFromPixels(pixels([0, 0, 0, 0], [255, 255, 255, 255])), "light");
  assert.equal(toneFromPixels(pixels()), "dark");
});

test("clampBlur ajusta la intensidad a su rango y usa 16 si no es un número", () => {
  assert.equal(clampBlur(10), 10);
  assert.equal(clampBlur("12.6"), 13);
  assert.equal(clampBlur(0), BLUR.min);
  assert.equal(clampBlur(99), BLUR.max);
  assert.equal(clampBlur("abc"), BLUR.initial);
});

test("imageCss cubre la página con la imagen centrada", () => {
  assert.equal(imageCss(DATA_URL), `url("${DATA_URL}") center / cover no-repeat`);
});

test("normalizeImage completa valores por defecto y descarta datos no válidos", () => {
  assert.deepEqual(normalizeImage({ dataUrl: DATA_URL }), {
    dataUrl: DATA_URL,
    tone: "dark",
    blur: false,
    blurAmount: BLUR.initial,
    active: false,
  });
  assert.deepEqual(normalizeImage({ dataUrl: DATA_URL, tone: "light", blur: true, blurAmount: 80, active: true }), {
    dataUrl: DATA_URL,
    tone: "light",
    blur: true,
    blurAmount: BLUR.max,
    active: true,
  });
  assert.equal(normalizeImage(undefined), null);
  assert.equal(normalizeImage({ dataUrl: "https://example.com/a.jpg" }), null);
  assert.equal(normalizeImage({ dataUrl: 'data:image/png;base64,AA")' }), null);
});
