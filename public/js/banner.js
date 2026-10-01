/**
 * The single error/success surface (FR-038d, FR-038e).
 *
 * Lives apart from main.js so that view modules can import it without creating a
 * cycle back to the router.
 */

import { clear, el } from './dom.js';

const banner = document.getElementById('banner');
const view = document.getElementById('view');

function show(message, kind) {
  clear(banner);
  banner.className = `banner ${kind}`;
  banner.hidden = false;
  banner.append(
    el('span', { text: message }),
    el('button', { type: 'button', 'aria-label': 'Dismiss', text: '✕', onClick: hideBanner }),
  );
}

export function hideBanner() {
  banner.hidden = true;
  clear(banner);
}

/** Marks the offending input when the server named a field. */
export function showError(err) {
  show(err.field ? `${err.message} (${err.field})` : err.message, 'error');
  if (err.field) {
    const input = view.querySelector(`[name="${CSS.escape(err.field)}"]`);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
  }
  console.error(err);
}

export function showSuccess(message) {
  show(message, 'success');
}
