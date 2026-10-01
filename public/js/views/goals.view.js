/** Goals view: the effective-dated goal history. */

import { api } from '../api.js';
import { clear, el, emptyState, field, loading, table } from '../dom.js';
import { confirmDialog } from '../dialog.js';
import { runDemoReset } from '../demo.js';
import { kcal, mass, todayIso } from '../format.js';
import { showError, showSuccess } from '../banner.js';

export const title = 'Goals';

export async function mount(container) {
  clear(container);
  container.append(el('h2', { text: 'Goals' }), loading());

  const { goalSets } = await api.get('/api/goals');
  const reload = () => mount(container);

  clear(container);
  container.append(
    el('h2', { text: 'Goals' }),
    el('p', { class: 'muted' }, [
      'Goals are effective-dated: each day is compared against the goals in effect on that day, ',
      'so changing them never rewrites how past days are judged.',
    ]),
    form(reload),
    history(goalSets, reload),
  );
}

function form(reload) {
  const date = field('Effective from', { type: 'date', value: todayIso() });
  const calories = field('Calories', { type: 'number', min: '0', step: '1', value: '2400' });
  const protein = field('Protein (g)', { type: 'number', min: '0', step: '0.1', value: '180' });
  const carbs = field('Carbs (g)', { type: 'number', min: '0', step: '0.1', value: '240' });
  const fat = field('Fat (g)', { type: 'number', min: '0', step: '0.1', value: '70' });

  const node = el('form', {
    class: 'row',
    onSubmit: (e) => {
      e.preventDefault();
      api
        .put(`/api/goals/${date.input.value}`, {
          calories: Number(calories.input.value),
          proteinG: Number(protein.input.value),
          carbsG: Number(carbs.input.value),
          fatG: Number(fat.input.value),
        })
        .then(() => showSuccess('Goals saved'))
        .then(reload)
        .catch(showError);
    },
  });

  node.append(
    date.wrapper,
    calories.wrapper,
    protein.wrapper,
    carbs.wrapper,
    fat.wrapper,
    el('button', { class: 'primary', type: 'submit', text: 'Save goals' }),
  );

  return el('div', { class: 'panel' }, [el('h3', { text: 'Set goals' }), node]);
}

function history(goalSets, reload) {
  if (!goalSets.length) {
    return el('div', { class: 'panel' }, [
      el('h3', { text: 'Goal history' }),
      emptyState(
        'No goals set yet. Add a goal set above, or load the demo data to explore the app.',
        'Load demo data',
        () => runDemoReset({ isEmpty: true }),
      ),
    ]);
  }

  const rows = goalSets.map((g) =>
    el('tr', {}, [
      el('td', { text: g.effectiveDate }),
      el('td', { text: kcal(g.calories) }),
      el('td', { text: mass(g.proteinG) }),
      el('td', { text: mass(g.carbsG) }),
      el('td', { text: mass(g.fatG) }),
      el('td', {}, [
        el('button', {
          class: 'danger',
          text: 'Delete',
          onClick: async () => {
            const ok = await confirmDialog({
              title: 'Delete goal set',
              message: `Delete the goals effective ${g.effectiveDate}? Days they governed will fall back to the previous goal set. This cannot be undone.`,
              confirmLabel: 'Delete',
              danger: true,
            });
            if (!ok) return;
            api
              .del(`/api/goals/${g.effectiveDate}`)
              .then(() => showSuccess('Goal set deleted'))
              .then(reload)
              .catch(showError);
          },
        }),
      ]),
    ]),
  );

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Goal history' }),
    table(['Effective from', 'Calories', 'Protein', 'Carbs', 'Fat', ''], rows),
  ]);
}
