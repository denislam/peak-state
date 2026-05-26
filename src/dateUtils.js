export const dateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const isSameDay = (a, b) => dateKey(a) === dateKey(b);

export const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const startOfWeek = (d) => {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
};
