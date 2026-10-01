/**
 * The demo reset flow, shared by the header button and by empty states.
 *
 * Lives apart from main.js so views can trigger it without importing the router
 * (which would recreate the cycle that banner.js exists to avoid).
 */

import { api } from './api.js';
import { showError } from './banner.js';
import { typedConfirmDialog } from './dialog.js';

export async function runDemoReset({ isEmpty }) {
  const confirmed = await typedConfirmDialog({
    title: isEmpty ? 'Load demo data' : 'Reset demo data',
    message: isEmpty
      ? 'This loads a demo data set covering eight weeks of workouts, body weight, meals, and goals.'
      : 'This permanently erases ALL data — both your own records and any previously loaded demo data — and reloads the demo set. It cannot be undone.',
    token: 'RESET',
  });
  if (!confirmed) return false;

  try {
    const result = await api.post('/api/demo/reset', { confirm: 'RESET' });
    window.dispatchEvent(new CustomEvent('gymtracker:data-reset', { detail: result.counts }));
    return true;
  } catch (err) {
    showError(err);
    return false;
  }
}
