/** Bootstrap: hash router and the demo control. */

import { api } from './api.js';
import { hideBanner, showError, showSuccess } from './banner.js';
import { typedConfirmDialog } from './dialog.js';

const view = document.getElementById('view');
const demoButton = document.getElementById('demo-button');

const ROUTES = {
  '#/workouts': () => import('./views/workouts.view.js'),
  '#/exercises': () => import('./views/exercises.view.js'),
  '#/body-weight': () => import('./views/body-weight.view.js'),
  '#/nutrition': () => import('./views/nutrition.view.js'),
  '#/goals': () => import('./views/goals.view.js'),
  '#/progress': () => import('./views/progress.view.js'),
};

async function refreshDemoButton() {
  try {
    const health = await api.get('/api/health');
    demoButton.textContent = health.empty ? 'Load demo data' : 'Reset demo data';
    demoButton.dataset.empty = String(health.empty);
  } catch (err) {
    showError(err);
  }
}

// FR-041d: the typed, case-sensitive token is the guard on an irreversible action.
demoButton.addEventListener('click', async () => {
  const isEmpty = demoButton.dataset.empty === 'true';
  const confirmed = await typedConfirmDialog({
    title: isEmpty ? 'Load demo data' : 'Reset demo data',
    message: isEmpty
      ? 'This loads a demo data set covering eight weeks of workouts, body weight, meals, and goals.'
      : 'This permanently erases ALL data — both your own records and any previously loaded demo data — and reloads the demo set. It cannot be undone.',
    token: 'RESET',
  });
  if (!confirmed) return;

  try {
    const result = await api.post('/api/demo/reset', { confirm: 'RESET' });
    const { exercises, sessions, mealEntries } = result.counts;
    await refreshDemoButton();
    await route({ keepBanner: true });
    showSuccess(
      `Demo data loaded: ${exercises} exercises, ${sessions} sessions, ${mealEntries} meal entries.`,
    );
  } catch (err) {
    showError(err);
  }
});

function markActiveNav(hash) {
  for (const link of document.querySelectorAll('.app-nav a')) {
    link.classList.toggle('active', link.getAttribute('href') === hash);
  }
}

async function route({ keepBanner = false } = {}) {
  const hash = ROUTES[window.location.hash] ? window.location.hash : '#/workouts';
  if (window.location.hash !== hash) {
    window.location.hash = hash;
    return;
  }

  markActiveNav(hash);
  if (!keepBanner) hideBanner();

  try {
    const module = await ROUTES[hash]();
    await module.mount(view);
    document.title = `${module.title} — GymTracker`;
  } catch (err) {
    showError(err);
  }
}

window.addEventListener('hashchange', () => route());

// Deliberately not top-level await: the view modules import the banner, and awaiting
// their import here would deadlock module evaluation.
refreshDemoButton();
route();
