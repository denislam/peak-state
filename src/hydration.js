import { parseAmountToOz } from './parseAmount.js';

const round1 = (n) => Math.round(n * 10) / 10;

// Approximate fraction of a serving that is water, plus a default serving size
// (US fl oz) used when the description gives no explicit volume. Ordered with
// more-specific phrases first so "almond milk" wins over "milk", etc.
const BEVERAGES = [
  { re: /\balmond\s*milks?\b/, pct: 0.92, serving: 8, name: 'almond milk' },
  { re: /\boat\s*milks?\b/, pct: 0.88, serving: 8, name: 'oat milk' },
  { re: /\b(soy\s*milk|soymilk)s?\b/, pct: 0.90, serving: 8, name: 'soy milk' },
  { re: /\bcoconut\s*waters?\b/, pct: 0.95, serving: 11, name: 'coconut water' },
  { re: /\bsports?\s*drinks?\b|\bgatorade\b|\bpowerade\b|\belectrolytes?\b/, pct: 0.93, serving: 20, name: 'sports drink' },
  { re: /\b(milk\s*shake|milkshake|shake)s?\b/, pct: 0.72, serving: 12, name: 'milkshake' },
  { re: /\bsmoothies?\b/, pct: 0.80, serving: 16, name: 'smoothie' },
  { re: /\b(latte|cappuccino|mocha|flat\s*white)\b/, pct: 0.88, serving: 12, name: 'coffee drink' },
  { re: /\b(coffee|espresso|americano|cold\s*brew)\b/, pct: 0.98, serving: 12, name: 'coffee' },
  { re: /\b(tea|matcha|chai)\b/, pct: 0.99, serving: 8, name: 'tea' },
  { re: /\b(orange\s*juice|oj|juices?|lemonade|cider)\b/, pct: 0.88, serving: 8, name: 'juice' },
  { re: /\b(soda|pop|cola|coke|sprite|pepsi|seltzer|sparkling\s*water)\b/, pct: 0.92, serving: 12, name: 'soda' },
  { re: /\bbeers?\b/, pct: 0.95, serving: 12, name: 'beer' },
  { re: /\b(wine|champagne|prosecco)\b/, pct: 0.86, serving: 5, name: 'wine' },
  { re: /\b(broth|soup|stock|bouillon)\b/, pct: 0.92, serving: 8, name: 'broth' },
  { re: /\bkombuchas?\b/, pct: 0.93, serving: 12, name: 'kombucha' },
  { re: /\b(yogurts?|kefir)\b/, pct: 0.85, serving: 6, name: 'yogurt' },
  { re: /\bmilks?\b/, pct: 0.90, serving: 8, name: 'milk' },
  { re: /\bwaters?\b/, pct: 1.0, serving: 8, name: 'water' },
];

// Local hydration estimate from a description, reusing the volume parser and a
// water-content table. Returns { oz, item, assumed } or null when nothing is
// recognized — the caller can then fall back to the Claude API.
export function estimateHydrationLocal(input) {
  if (!input || !input.trim()) return null;
  const s = ' ' + input.toLowerCase() + ' ';
  const vol = parseAmountToOz(input); // explicit volume in fl oz, or null
  const bev = BEVERAGES.find(b => b.re.test(s));

  if (vol != null) {
    const pct = bev ? bev.pct : 1; // a bare volume is treated as plain water
    return { oz: round1(vol * pct), item: bev ? bev.name : null, assumed: false };
  }
  if (bev) {
    return { oz: round1(bev.serving * bev.pct), item: bev.name, assumed: true };
  }
  return null;
}
