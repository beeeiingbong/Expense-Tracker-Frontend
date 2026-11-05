// All money from the API is in paise.
const groupIndian = (n) => {
  const s = String(n);
  if (s.length <= 3) return s;
  return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3);
};

export function formatINR(paise, { decimals } = {}) {
  const value = Math.round(Number(paise) || 0);
  const abs = Math.abs(value);
  const rupees = Math.floor(abs / 100);
  const pf = abs % 100;
  let out = '₹' + groupIndian(rupees);
  if (pf !== 0 || decimals) out += '.' + String(pf).padStart(2, '0');
  return value < 0 ? '-' + out : out;
}

const trim = (n) => String(Math.round(n * 10) / 10);
export function formatCompact(paise) {
  const r = Math.abs(Number(paise) || 0) / 100;
  const sign = paise < 0 ? '-' : '';
  if (r >= 1e7) return `${sign}₹${trim(r / 1e7)}Cr`;
  if (r >= 1e5) return `${sign}₹${trim(r / 1e5)}L`;
  if (r >= 1e3) return `${sign}₹${trim(r / 1e3)}K`;
  return `${sign}₹${Math.round(r)}`;
}

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export const shiftMonth = (m, delta) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return `${MONTHS[mo - 1]} ${y}`;
};
// ISO date to attach to an income created while viewing `month`.
export const dateForMonth = (month) => {
  if (month === currentMonth()) return new Date().toISOString();
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1, 9, 0, 0).toISOString();
};
export const formatWhen = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  let h = d.getHours();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
};
export const formatDay = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

export const withAlpha = (hex, a) => {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return `rgba(136,136,136,${a})`;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
export const sum = (arr, key) => arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);
