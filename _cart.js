// Shared cart maths. Prices always come from products.json, never from the browser.
const products = require('../products.json');
const FREE_SHIP_OVER = 150; // USD
const SHIPPING = 9.99;      // USD
module.exports = function (items) {
  const lines = []; let sub = 0;
  for (const it of items || []) {
    const p = products.find(x => x.id === it.id);
    const qty = Math.min(Math.max(parseInt(it.qty) || 0, 0), 20);
    if (!p || !qty) continue;
    lines.push({ p, qty }); sub += p.price * qty;
  }
  const ship = !lines.length || sub >= FREE_SHIP_OVER ? 0 : SHIPPING;
  return { lines, sub, ship, total: sub + ship };
};
