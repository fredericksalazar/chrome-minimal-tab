// Enlaces de apoyo al autor: simples URLs externas, sin SDK ni scripts de pago.
// Cambiar un destino es tocar solo esta lista; los textos son support.<id> en src/i18n/.
const PAYPAL_EMAIL = "fredefass01@gmail.com";

// Política de privacidad publicada en la web del autor, una página por idioma
// (la española conserva su dirección original)
export function privacyUrl(language) {
  const page = language === "es" ? "privacidad" : `privacy-${language}`;
  return `https://fredericksalazar.github.io/tilo/${page}.html`;
}

export function paypalDonateUrl(email) {
  const params = new URLSearchParams({ business: email, no_recurring: "0" });
  return `https://www.paypal.com/donate/?${params}`;
}

export const SUPPORT_LINKS = [
  { id: "coffee", url: "https://buymeacoffee.com/fredericksalazar" },
  { id: "paypal", url: paypalDonateUrl(PAYPAL_EMAIL) },
  { id: "web", url: "https://fredericksalazar.github.io/" },
];
