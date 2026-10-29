import assert from "node:assert/strict";
import { test } from "node:test";
import { paypalDonateUrl, SUPPORT_LINKS } from "../src/lib/support.js";

test("SUPPORT_LINKS mantiene el orden café, PayPal y web", () => {
  assert.deepEqual(SUPPORT_LINKS.map((link) => link.id), ["coffee", "paypal", "web"]);
});

test("todos los enlaces de apoyo son https y tienen texto y título", () => {
  for (const link of SUPPORT_LINKS) {
    assert.equal(new URL(link.url).protocol, "https:");
    assert.ok(link.label && link.title);
  }
});

test("los enlaces apuntan a Buy Me a Coffee, PayPal y la web del autor", () => {
  const hosts = SUPPORT_LINKS.map((link) => new URL(link.url).hostname);
  assert.deepEqual(hosts, ["buymeacoffee.com", "www.paypal.com", "fredericksalazar.github.io"]);
});

test("paypalDonateUrl codifica el correo como destinatario de la donación", () => {
  const url = new URL(paypalDonateUrl("a+b@example.com"));
  assert.equal(url.pathname, "/donate/");
  assert.equal(url.searchParams.get("business"), "a+b@example.com");
  assert.match(url.search, /business=a%2Bb%40example\.com/);
});
