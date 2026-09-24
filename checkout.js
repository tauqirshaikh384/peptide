// Vercel serverless function: creates a Stripe Checkout page for the cart.
// Needs one environment variable in Vercel: STRIPE_SECRET_KEY
const products = require('../products.json');
const FREE_SHIP_OVER = 150; // USD
const SHIPPING = 9.99;      // USD

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ error: 'not_configured' });

  const items = (req.body && req.body.items) || [];
  const p = new URLSearchParams();
  let subtotal = 0, i = 0;
  for (const it of items) {
    const prod = products.find(x => x.id === it.id);
    const qty = Math.min(Math.max(parseInt(it.qty) || 0, 0), 20);
    if (!prod || !qty) continue;
    subtotal += prod.price * qty;
    p.append(`line_items[${i}][quantity]`, qty);
    p.append(`line_items[${i}][price_data][currency]`, 'usd');
    p.append(`line_items[${i}][price_data][unit_amount]`, Math.round(prod.price * 100));
    p.append(`line_items[${i}][price_data][product_data][name]`, `${prod.name} (${prod.size})`);
    i++;
  }
  if (!i) return res.status(400).json({ error: 'empty_cart' });
  if (subtotal < FREE_SHIP_OVER) {
    p.append(`line_items[${i}][quantity]`, 1);
    p.append(`line_items[${i}][price_data][currency]`, 'usd');
    p.append(`line_items[${i}][price_data][unit_amount]`, Math.round(SHIPPING * 100));
    p.append(`line_items[${i}][price_data][product_data][name]`, 'Shipping');
  }
  const origin = req.headers.origin || `https://${req.headers.host}`;
  p.append('mode', 'payment');
  p.append('shipping_address_collection[allowed_countries][0]', 'US');
  p.append('success_url', `${origin}/?order=success`);
  p.append('cancel_url', `${origin}/`);

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: p
  });
  const data = await r.json();
  if (!r.ok) return res.status(502).json({ error: 'stripe_error' });
  res.status(200).json({ url: data.url });
};
