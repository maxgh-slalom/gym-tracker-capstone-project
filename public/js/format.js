/** Display formatting. Mirrors FR-044 so the client never invents its own precision. */

export const kcal = (n) => (n === null || n === undefined ? '—' : `${Math.round(n)} kcal`);

export const mass = (n, unit = 'g') =>
  n === null || n === undefined ? '—' : `${Math.round(n * 10) / 10} ${unit}`;

export const kg = (n) => mass(n, 'kg');

export const volume = (n) => `${Math.round(n).toLocaleString()} kg`;

export function todayIso() {
  const now = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function shiftDays(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'full_body',
  'other',
];

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

export const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
