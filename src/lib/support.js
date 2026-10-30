// Enlaces de apoyo al autor: simples URLs externas, sin SDK ni scripts de pago.
// Cambiar un destino es tocar solo esta lista.
const PAYPAL_EMAIL = "fredefass01@gmail.com";

// Política de privacidad publicada en la web del autor
export const PRIVACY_URL = "https://fredericksalazar.github.io/tilo/privacidad.html";

export function paypalDonateUrl(email) {
  const params = new URLSearchParams({ business: email, no_recurring: "0" });
  return `https://www.paypal.com/donate/?${params}`;
}

export const SUPPORT_LINKS = [
  {
    id: "coffee",
    label: "Invítame a un café",
    title: "Apoya Tilo en Buy Me a Coffee (voluntario)",
    url: "https://buymeacoffee.com/fredericksalazar",
  },
  {
    id: "paypal",
    label: "Donar con PayPal",
    title: "Haz una donación voluntaria con PayPal",
    url: paypalDonateUrl(PAYPAL_EMAIL),
  },
  {
    id: "web",
    label: "Mi web",
    title: "Web personal del autor",
    url: "https://fredericksalazar.github.io/",
  },
];
