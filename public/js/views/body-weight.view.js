/** Body weight view: one entry per date, with the replacement notice inline (FR-013a). */

import { api } from '../api.js';
import { clear, el, emptyState, field, loading, table } from '../dom.js';
import { confirmDialog } from '../dialog.js';
import { kg, todayIso } from '../format.js';
import { showError, showSuccess } from '../banner.js';

export const title = 'Body Weight';

export async function mount(container) {
  clear(container);
  container.append(el('h2', { text: 'Body Weight' }), loading());

  const { entries } = await api.get('/api/body-weights');
  const reload = () => mount(container);

  clear(container);
  container.append(el('h2', { text: 'Body Weight' }), form(reload), history(entries, reload));
}

function form(reload) {
  const date = field('Date', { name: 'date', type: 'date', value: todayIso(), max: todayIso() });
  const weight = field('Weight (kg)', { name: 'weightKg', type: 'number', step: '0.1', min: '0.1' });
  const notice = el('p', { class: 'muted' });

  const node = el('form', {
    class: 'row',
    onSubmit: (e) => {
      e.preventDefault();
      api
        .put(`/api/body-weights/${date.input.value}`, { weightKg: Number(weight.input.value) })
        .then((res) => {
          notice.textContent = res.replaced
            ? `Replaced the previous value for ${res.date}.`
            : `Recorded ${kg(res.weightKg)} for ${res.date}.`;
          weight.input.value = '';
          showSuccess('Body weight saved');
        })
        .then(reload)
        .catch(showError);
    },
  });

  node.append(
    date.wrapper,
    weight.wrapper,
    el('button', { class: 'primary', type: 'submit', text: 'Save' }),
  );

  return el('div', { class: 'panel' }, [el('h3', { text: 'Record a weigh-in' }), node, notice]);
}

function history(entries, reload) {
  if (!entries.length) {
    return el('div', { class: 'panel' }, [
      el('h3', { text: 'History' }),
      emptyState('No weigh-ins recorded yet. Add one above to start tracking.'),
    ]);
  }

  const rows = entries.map((entry) =>
    el('tr', {}, [
      el('td', { text: entry.date }),
      el('td', { text: kg(entry.weightKg) }),
      el('td', {}, [
        el('button', {
          class: 'danger',
          text: 'Delete',
          onClick: async () => {
            const ok = await confirmDialog({
              title: 'Delete weigh-in',
              message: `Delete the entry for ${entry.date}? This cannot be undone.`,
              confirmLabel: 'Delete',
              danger: true,
            });
            if (!ok) return;
            api
              .del(`/api/body-weights/${entry.date}`)
              .then(() => showSuccess('Entry deleted'))
              .then(reload)
              .catch(showError);
          },
        }),
      ]),
    ]),
  );

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'History' }),
    table(['Date', 'Weight', ''], rows),
  ]);
}
