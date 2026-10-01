/** Exercises view: library, create, rename, archive/restore, guarded delete. */

import { api } from '../api.js';
import { clear, el, emptyState, field, loading, select, table } from '../dom.js';
import { confirmDialog, promptDialog } from '../dialog.js';
import { runDemoReset } from '../demo.js';
import { MUSCLE_GROUPS, titleCase } from '../format.js';
import { showError, showSuccess } from '../banner.js';

export const title = 'Exercises';

export async function mount(container) {
  clear(container);
  container.append(el('h2', { text: 'Exercises' }), loading());
  await render(container);
}

async function render(container) {
  let includeArchived = false;

  async function refresh() {
    const { exercises } = await api.get(`/api/exercises?includeArchived=${includeArchived}`);
    clear(container);
    container.append(el('h2', { text: 'Exercises' }), createForm(refresh), list(exercises, refresh));
  }

  function list(exercises, reload) {
    const toggle = el('label', { class: 'row' }, [
      el('input', {
        type: 'checkbox',
        checked: includeArchived,
        onChange: (e) => {
          includeArchived = e.target.checked;
          reload().catch(showError);
        },
      }),
      ' Show archived',
    ]);

    if (!exercises.length) {
      return el('div', { class: 'panel' }, [
        toggle,
        includeArchived
          ? emptyState(
              'No exercises yet. Create one above, or load the demo data to explore the app.',
              'Load demo data',
              () => runDemoReset({ isEmpty: true }),
            )
          : emptyState(
              'No active exercises. Create one above, or show archived exercises to restore one.',
            ),
      ]);
    }

    const rows = exercises.map((ex) =>
      el('tr', {}, [
        el('td', {}, [
          ex.name,
          ' ',
          ex.archived ? el('span', { class: 'tag', text: 'Archived' }) : null,
        ]),
        el('td', { text: titleCase(ex.muscleGroup) }),
        el('td', { text: String(ex.setCount) }),
        el('td', {}, [
          el('button', {
            text: 'Rename',
            onClick: () => renamePrompt(ex, reload),
          }),
          ' ',
          el('button', {
            text: ex.archived ? 'Restore' : 'Archive',
            onClick: () =>
              api
                .post(`/api/exercises/${ex.id}/${ex.archived ? 'restore' : 'archive'}`)
                .then(() => showSuccess(`${ex.name} ${ex.archived ? 'restored' : 'archived'}`))
                .then(reload)
                .catch(showError),
          }),
          ' ',
          el('button', {
            class: 'danger',
            text: 'Delete',
            onClick: () => confirmDelete(ex, reload),
          }),
        ]),
      ]),
    );

    return el('div', { class: 'panel' }, [
      toggle,
      table(['Name', 'Muscle group', 'Sets logged', ''], rows),
    ]);
  }

  async function renamePrompt(ex, reload) {
    const name = await promptDialog({
      title: 'Rename exercise',
      label: 'Name',
      value: ex.name,
    });
    if (!name || name === ex.name) return;
    api
      .patch(`/api/exercises/${ex.id}`, { name })
      .then(() => showSuccess('Exercise renamed'))
      .then(reload)
      .catch(showError);
  }

  // FR-038a/FR-038b: one confirmation, and it says plainly that there is no undo.
  async function confirmDelete(ex, reload) {
    const ok = await confirmDialog({
      title: 'Delete exercise',
      message: `Delete "${ex.name}" permanently? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    api
      .del(`/api/exercises/${ex.id}`)
      .then(() => showSuccess('Exercise deleted'))
      .then(reload)
      .catch(showError);
  }

  await refresh();
}

function createForm(reload) {
  const name = field('Name', { name: 'name', maxlength: 80 });
  const group = select(
    'Muscle group',
    MUSCLE_GROUPS.map((g) => ({ value: g, label: titleCase(g) })),
  );

  const form = el('form', {
    class: 'row',
    onSubmit: (e) => {
      e.preventDefault();
      api
        .post('/api/exercises', { name: name.input.value, muscleGroup: group.input.value })
        .then(() => {
          name.input.value = '';
          showSuccess('Exercise created');
        })
        .then(reload)
        .catch(showError);
    },
  });

  form.append(
    name.wrapper,
    group.wrapper,
    el('button', { class: 'primary', type: 'submit', text: 'Add exercise' }),
  );
  return el('div', { class: 'panel' }, [el('h3', { text: 'Add an exercise' }), form]);
}
