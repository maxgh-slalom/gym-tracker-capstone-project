/** Boundary validation primitives. Routes call these before any service runs (Constitution III). */

import { ValidationError } from '../errors.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = '1900-01-01'; // FR-037a

/** FR-048: "today" comes from the server clock, with no timezone conversion. */
export function todayIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isoDate(value, field, { maxToday = false } = {}) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new ValidationError(`${field} must be a date in YYYY-MM-DD format`, field);
  }
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  const isReal =
    parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
  if (!isReal) throw new ValidationError(`${field} is not a real calendar date`, field);
  if (value < MIN_DATE) {
    throw new ValidationError(`${field} must not be earlier than ${MIN_DATE}`, field);
  }
  if (maxToday && value > todayIso()) {
    throw new ValidationError(`${field} must not be in the future`, field);
  }
  return value;
}

/** FR-047: only `.` is a decimal separator, so comma-formatted input is rejected, not coerced. */
function toNumber(value, field) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ValidationError(`${field} must be a number`, field);
    return value;
  }
  if (typeof value === 'string') {
    if (!/^-?\d+(\.\d+)?$/.test(value.trim())) {
      throw new ValidationError(`${field} must be a number using '.' as the decimal separator`, field);
    }
    return Number(value.trim());
  }
  throw new ValidationError(`${field} must be a number`, field);
}

/** FR-046: applies to user input only; derived values keep full precision (FR-046a). */
export function decimals(value, field, places = 1) {
  const text = String(value);
  const dot = text.indexOf('.');
  if (dot !== -1 && text.length - dot - 1 > places) {
    throw new ValidationError(`${field} must have at most ${places} decimal place(s)`, field);
  }
  return value;
}

export function positiveNumber(value, field, { max = null } = {}) {
  const n = toNumber(value, field);
  if (n <= 0) throw new ValidationError(`${field} must be greater than zero`, field);
  if (max !== null && n > max) throw new ValidationError(`${field} must not exceed ${max}`, field);
  decimals(n, field);
  return n;
}

export function nonNegativeNumber(value, field, { max = null } = {}) {
  const n = toNumber(value, field);
  if (n < 0) throw new ValidationError(`${field} must not be negative`, field);
  if (max !== null && n > max) throw new ValidationError(`${field} must not exceed ${max}`, field);
  decimals(n, field);
  return n;
}

export function integer(value, field, { min = null, max = null } = {}) {
  const n = toNumber(value, field);
  if (!Number.isInteger(n)) throw new ValidationError(`${field} must be a whole number`, field);
  if (min !== null && n < min) throw new ValidationError(`${field} must be at least ${min}`, field);
  if (max !== null && n > max) throw new ValidationError(`${field} must not exceed ${max}`, field);
  return n;
}

export function oneOf(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`, field);
  }
  return value;
}

export function text(value, field, min, max) {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be text`, field);
  const trimmed = value.trim();
  if (trimmed.length < min) throw new ValidationError(`${field} must not be empty`, field);
  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be ${max} characters or fewer`, field);
  }
  return trimmed;
}

export function optionalText(value, field, max) {
  if (value === undefined || value === null || value === '') return null;
  return text(value, field, 0, max);
}

export function exactlyOneOf(body, fields, field) {
  const present = fields.filter((f) => body[f] !== undefined && body[f] !== null && body[f] !== '');
  if (present.length !== 1) {
    throw new ValidationError(`Provide exactly one of: ${fields.join(', ')}`, field);
  }
  return present[0];
}

export function requireArray(value, field, { min = 0 } = {}) {
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be a list`, field);
  if (value.length < min) {
    throw new ValidationError(`${field} must contain at least ${min} item(s)`, field);
  }
  return value;
}
