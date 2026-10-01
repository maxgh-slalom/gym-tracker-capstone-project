/** Bootstrap: hash router and the demo control. */

import { api } from './api.js';
import { hideBanner, showError, showSuccess } from './banner.js';
import { runDemoReset } from './demo.js';

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
demoButton.addEventListener('click', () => {
  runDemoReset({ isEmpty: demoButton.dataset.empty === 'true' });
});

// Fired by demo.js wherever the reset was triggered from, including empty states.
window.addEventListener('gymtracker:data-reset', async (event) => {
  const { exercises, sessions, mealEntries } = event.detail;
  await refreshDemoButton();
  await route({ keepBanner: true });
  showSuccess(
    `Demo data loaded: ${exercises} exercises, ${sessions} sessions, ${mealEntries} meal entries.`,
  );
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
