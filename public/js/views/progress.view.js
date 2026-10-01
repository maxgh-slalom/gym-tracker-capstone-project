/** Progress view: four trends over a user-chosen range, each paired with a text summary. */

import { api } from '../api.js';
import { barChart, lineChart } from '../chart.js';
import { clear, el, emptyState, field, loading, table } from '../dom.js';
import { kcal, kg, shiftDays, todayIso, volume } from '../format.js';
import { showError } from '../banner.js';

export const title = 'Progress';

const STORAGE_KEY = 'gymtracker.progressRange';

/** FR-030d: default to the last 90 days, remembering whatever the user last chose. */
function loadRange() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved?.from && saved?.to) return saved;
  } catch {
    // A corrupt preference is not worth failing over; fall through to the default.
  }
  return { from: shiftDays(todayIso(), -90), to: todayIso() };
}

let range = loadRange();
let exerciseId = '';

export async function mount(container) {
  clear(container);
  container.append(el('h2', { text: 'Progress' }), loading());

  const { exercises } = await api.get('/api/exercises?includeArchived=true');

  let data;
  try {
    const query = new URLSearchParams({ from: range.from, to: range.to });
    if (exerciseId) query.set('exerciseId', exerciseId);
    data = await api.get(`/api/progress?${query}`);
  } catch (err) {
    // FR-030b: a rejected range must not blank the view.
    showError(err);
    clear(container);
    container.append(el('h2', { text: 'Progress' }), controls(exercises, container));
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(range));

  clear(container);
  container.append(
    el('h2', { text: 'Progress' }),
    controls(exercises, container),
    bodyWeightBlock(data.bodyWeight),
    volumeBlock(data.volumeBySession, data.volumeByWeek),
    exerciseBlock(data.exerciseBest),
    caloriesBlock(data.caloriesVsGoal),
  );
}

function controls(exercises, container) {
  const from = field('From', { type: 'date', value: range.from });
  const to = field('To', { type: 'date', value: range.to, max: todayIso() });

  const picker = el('select', { 'aria-label': 'Exercise for the per-exercise trend' }, [
    el('option', { value: '', text: 'No exercise selected' }),
    ...exercises.map((e) =>
      el('option', { value: e.id, text: e.name, selected: String(e.id) === exerciseId }),
    ),
  ]);

  const apply = el('button', {
    class: 'primary',
    text: 'Apply',
    onClick: () => {
      range = { from: from.input.value, to: to.input.value };
      exerciseId = picker.value;
      mount(container).catch(showError);
    },
  });

  return el('div', { class: 'panel' }, [
    el('div', { class: 'row' }, [
      from.wrapper,
      to.wrapper,
      el('div', { class: 'field' }, [el('label', { text: 'Exercise' }), picker]),
      apply,
    ]),
  ]);
}

/** FR-054: every chart ships with the same data in text form. */
function block(heading, points, chartNode, summaryTable, emptyMessage) {
  if (!points.length) {
    return el('div', { class: 'panel' }, [el('h3', { text: heading }), emptyState(emptyMessage)]);
  }
  return el('div', { class: 'panel' }, [
    el('h3', { text: heading }),
    el('div', { class: 'chart-block' }, [
      chartNode,
      el('div', { class: 'chart-summary' }, summaryTable),
    ]),
  ]);
}

function bodyWeightBlock(bodyWeight) {
  const { points, netChangeKg } = bodyWeight;
  const heading =
    netChangeKg === null
      ? 'Body weight'
      : `Body weight (net change ${netChangeKg > 0 ? '+' : ''}${netChangeKg} kg)`;

  return block(
    heading,
    points,
    points.length
      ? lineChart({
          labels: points.map((p) => p.date),
          values: points.map((p) => p.weightKg),
          ariaLabel: 'Body weight over the selected range',
        })
      : null,
    table(
      ['Date', 'Weight'],
      points.map((p) => el('tr', {}, [el('td', { text: p.date }), el('td', { text: kg(p.weightKg) })])),
    ),
    'No body weight entries in this range. Record a weigh-in or widen the range.',
  );
}

function volumeBlock(bySession, byWeek) {
  const panels = [];

  panels.push(
    block(
      'Training volume per session',
      bySession.points,
      bySession.points.length
        ? lineChart({
            labels: bySession.points.map((p) => p.date),
            values: bySession.points.map((p) => p.volume),
            ariaLabel: 'Training volume per session',
          })
        : null,
      table(
        ['Date', 'Volume'],
        bySession.points.map((p) =>
          el('tr', {}, [el('td', { text: p.date }), el('td', { text: volume(p.volume) })]),
        ),
      ),
      'No sessions logged in this range.',
    ),
  );

  panels.push(
    block(
      'Training volume per week',
      byWeek.points,
      byWeek.points.length
        ? barChart({
            labels: byWeek.points.map((p) => p.weekStart),
            values: byWeek.points.map((p) => p.volume),
            ariaLabel: 'Training volume per week',
          })
        : null,
      table(
        ['Week starting', 'Volume'],
        byWeek.points.map((p) =>
          el('tr', {}, [el('td', { text: p.weekStart }), el('td', { text: volume(p.volume) })]),
        ),
      ),
      'No sessions logged in this range.',
    ),
  );

  return el('div', {}, panels);
}

function exerciseBlock(exerciseBest) {
  if (!exerciseBest) {
    return el('div', { class: 'panel' }, [
      el('h3', { text: 'Best weight per session' }),
      emptyState('Select an exercise above to see its heaviest weight over time.'),
    ]);
  }

  return block(
    `Best weight — ${exerciseBest.exerciseName}`,
    exerciseBest.points,
    exerciseBest.points.length
      ? lineChart({
          labels: exerciseBest.points.map((p) => p.date),
          values: exerciseBest.points.map((p) => p.bestWeightKg),
          ariaLabel: `Heaviest weight for ${exerciseBest.exerciseName}`,
        })
      : null,
    table(
      ['Date', 'Best'],
      exerciseBest.points.map((p) =>
        el('tr', {}, [el('td', { text: p.date }), el('td', { text: kg(p.bestWeightKg) })]),
      ),
    ),
    `No sets logged for ${exerciseBest.exerciseName} in this range.`,
  );
}

function caloriesBlock(caloriesVsGoal) {
  const points = caloriesVsGoal.points;
  return block(
    'Calories vs goal',
    points,
    points.length
      ? lineChart({
          labels: points.map((p) => p.date),
          values: points.map((p) => p.calories),
          reference: points.map((p) => p.goalCalories),
          ariaLabel: 'Daily calories against the goal in effect each day',
        })
      : null,
    table(
      ['Date', 'Calories', 'Goal'],
      points.map((p) =>
        el('tr', {}, [
          el('td', { text: p.date }),
          el('td', { text: kcal(p.calories) }),
          el('td', { text: p.goalCalories === null ? 'No goal' : kcal(p.goalCalories) }),
        ]),
      ),
    ),
    'No meals logged in this range.',
  );
}
