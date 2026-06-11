// Best-effort natural-language → fluid-ounce parser for the water "custom"
// field, so a user can type how they'd say it ("one cup", "half a .5L bottle",
// "500 ml") with zero mental conversion. Returns a number of oz, or null when
// nothing recognizable is found.

const OZ = {
  ml: 0.033814,
  l: 33.814,
  oz: 1,
  cup: 8,
  glass: 8,
  mug: 10,
  bottle: 16.9,
  pint: 16,
  gallon: 128,
  can: 12,
  shot: 1.5,
  sip: 1,
};

const round1 = (n) => Math.round(n * 10) / 10;

export function parseAmountToOz(input) {
  if (!input || !input.trim()) return null;
  let s = ' ' + input.toLowerCase() + ' ';

  // "3/4" → 0.75
  s = s.replace(/(\d+)\s*\/\s*(\d+)/g, (_, a, b) => ` ${+a / +b} `);

  // Split numbers stuck to letters: "500ml" → "500 ml", ".5l" → ".5 l".
  s = s.replace(/(\d)\s*([a-z])/g, '$1 $2');

  // Fraction + word numbers (longest forms first).
  const words = [
    [/three[\s-]?quarters?/g, ' 0.75 '],
    [/\bquarters?\b/g, ' 0.25 '],
    [/\bhalf\b/g, ' 0.5 '],
    [/\b(?:a\s+)?couple(?:\s+of)?\b/g, ' 2 '],
    [/\bone\b/g, ' 1 '], [/\btwo\b/g, ' 2 '], [/\bthree\b/g, ' 3 '],
    [/\bfour\b/g, ' 4 '], [/\bfive\b/g, ' 5 '], [/\bsix\b/g, ' 6 '],
    [/\bseven\b/g, ' 7 '], [/\beight\b/g, ' 8 '], [/\bnine\b/g, ' 9 '],
    [/\bten\b/g, ' 10 '], [/\beleven\b/g, ' 11 '], [/\btwelve\b/g, ' 12 '],
  ];
  for (const [re, v] of words) s = s.replace(re, v);

  // Unit synonyms → canonical tokens (lone l / ml / oz are already canonical).
  s = s
    .replace(/\bfl\.?\s*oz\b/g, ' oz ')
    .replace(/\bfluid\s+ounces?\b/g, ' oz ')
    .replace(/\bounces?\b/g, ' oz ')
    .replace(/\bmilli\s*lit(?:er|re)s?\b/g, ' ml ')
    .replace(/\blit(?:er|re)s?\b/g, ' l ')
    .replace(/\bcups?\b/g, ' cup ')
    .replace(/\bglass(?:es)?\b/g, ' glass ')
    .replace(/\bmugs?\b/g, ' mug ')
    .replace(/\bbottles?\b/g, ' bottle ')
    .replace(/\bpints?\b/g, ' pint ')
    .replace(/\bgallons?\b/g, ' gallon ')
    .replace(/\bcans?\b/g, ' can ')
    .replace(/\bshots?\b/g, ' shot ')
    .replace(/\bsips?\b/g, ' sip ');

  const tokens = s.split(/\s+/).filter(Boolean);
  const numbers = [];
  const units = [];
  tokens.forEach((t, i) => {
    if (/^\d*\.?\d+$/.test(t)) numbers.push({ value: parseFloat(t), idx: i });
    else if (OZ[t] != null) units.push({ name: t, idx: i });
  });

  // No unit named: a bare number is read as oz.
  if (units.length === 0) {
    return numbers.length === 1 && numbers[0].value > 0 ? round1(numbers[0].value) : null;
  }

  // The first unit is primary; the number just before it is its size/quantity,
  // and any remaining numbers act as multipliers (e.g. "half" in "half a bottle").
  const primary = units[0];
  let sizeNum = 1, sizeIdx = -1;
  for (const n of numbers) {
    if (n.idx < primary.idx) { sizeNum = n.value; sizeIdx = n.idx; }
  }
  let mult = 1;
  for (const n of numbers) {
    if (n.idx !== sizeIdx) mult *= n.value;
  }

  const oz = sizeNum * OZ[primary.name] * mult;
  return oz > 0 ? round1(oz) : null;
}
