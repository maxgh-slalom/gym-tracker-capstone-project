/** Workouts view: history, session detail, and a builder that both creates and edits. */

import { api } from '../api.js';
import { clear, el, emptyState, field, loading, table } from '../dom.js';
import { confirmDialog, infoDialog } from '../dialog.js';
import { runDemoReset } from '../demo.js';
import { kg, todayIso, volume } from '../format.js';
import { showError, showSuccess } from '../banner.js';

export const title = 'Workouts';

/** Null when building a new session, or the id of the session being edited. */
let editingId = null;
let draft = null;

export async function mount(container) {
  clear(container);
  container.append(el('h2', { text: 'Workouts' }), loading());

  const [{ sessions }, { exercises }] = await Promise.all([
    api.get('/api/workouts?limit=50'),
    api.get('/api/exercises'),
  ]);

  const reload = () => mount(container);

  clear(container);
  container.append(
    el('h2', { text: 'Workouts' }),
    builder(exercises, reload),
    history(sessions, exercises, reload),
  );
}

function resetDraft() {
  editingId = null;
  draft = null;
}

async function startEdit(id, reload) {
  try {
    const session = await api.get(`/api/workouts/${id}`);
    editingId = id;
    draft = {
      date: session.date,
      note: session.note ?? '',
      entries: session.entries.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets.map((s) => ({ ...s })),
      })),
    };
    await reload();
    document.getElementById('session-builder')?.scrollIntoView({ block: 'start' });
  } catch (err) {
    showError(err);
  }
}

function history(sessions, exercises, reload) {
  if (!sessions.length) {
    return el('div', { class: 'panel' }, [
      el('h3', { text: 'History' }),
      exercises.length
        ? emptyState('No workouts logged yet. Build a session above to start your history.')
        : emptyState(
            'No workouts logged yet, and the app holds no data at all.',
            'Load demo data',
            () => runDemoReset({ isEmpty: true }),
          ),
    ]);
  }

  const rows = sessions.map((s) =>
    el('tr', {}, [
      el('td', { text: s.date }),
      el('td', { text: s.exercises.join(', ') || '—' }),
      el('td', { text: String(s.setCount) }),
      el('td', { text: volume(s.totalVolume) }),
      el('td', { text: s.note ?? '' }),
      el('td', {}, [
        el('button', { text: 'View', onClick: () => openDetail(s.id) }),
        ' ',
        el('button', { text: 'Edit', onClick: () => startEdit(s.id, reload) }),
        ' ',
        el('button', {
          class: 'danger',
          text: 'Delete',
          onClick: async () => {
            const ok = await confirmDialog({
              title: 'Delete session',
              message: `Delete the session on ${s.date}? This cannot be undone.`,
              confirmLabel: 'Delete',
              danger: true,
            });
            if (!ok) return;
            if (editingId === s.id) resetDraft();
            api
              .del(`/api/workouts/${s.id}`)
              .then(() => showSuccess('Session deleted'))
              .then(reload)
              .catch(showError);
          },
        }),
      ]),
    ]),
  );

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'History' }),
    table(['Date', 'Exercises', 'Sets', 'Volume', 'Note', ''], rows),
  ]);
}

async function openDetail(id) {
  try {
    const session = await api.get(`/api/workouts/${id}`);
    const lines = session.entries.map((entry) => {
      const sets = entry.sets.map((s) => `${s.reps} × ${kg(s.weightKg)}`).join(', ');
      return `${entry.exerciseName}${entry.exerciseArchived ? ' (archived)' : ''}: ${sets}`;
    });
    await infoDialog({
      title: `Session on ${session.date}`,
      lines: [`Total volume ${volume(session.totalVolume)}`, ...lines],
    });
  } catch (err) {
    showError(err);
  }
}

function builder(exercises, reload) {
  // FR-005a: with no active exercise the picker would be unusable, so say so instead.
  if (!exercises.length) {
    return el('div', { class: 'panel', id: 'session-builder' }, [
      el('h3', { text: 'Log a session' }),
      emptyState(
        'You need at least one active exercise before logging a session.',
        'Go to Exercises',
        () => {
          window.location.hash = '#/exercises';
        },
      ),
    ]);
  }

  if (!draft) draft = { date: todayIso(), note: '', entries: [] };

  const isEditing = editingId !== null;
  const date = field('Date', { name: 'date', type: 'date', value: draft.date, max: todayIso() });
  const note = field('Note (optional)', { name: 'note', maxlength: 500, value: draft.note });

  date.input.addEventListener('change', () => {
    draft.date = date.input.value;
  });
  note.input.addEventListener('input', () => {
    draft.note = note.input.value;
  });

  const entryList = el('div');

  function redrawEntries() {
    clear(entryList);
    if (!draft.entries.length) {
      entryList.append(el('p', { class: 'muted', text: 'No exercises added to this session yet.' }));
      return;
    }
    for (const [i, entry] of draft.entries.entries()) {
      const ex = exercises.find((e) => e.id === entry.exerciseId);
      const setRows = entry.sets.map((set, j) =>
        el('tr', {}, [
          el('td', { text: `Set ${j + 1}` }),
          el('td', {}, [editableNumber(set, 'reps')]),
          el('td', {}, [editableNumber(set, 'weightKg')]),
          el('td', {}, [
            el('button', {
              type: 'button',
              class: 'danger',
              text: 'Remove',
              onClick: () => {
                entry.sets.splice(j, 1);
                if (!entry.sets.length) draft.entries.splice(i, 1);
                redrawEntries();
              },
            }),
          ]),
        ]),
      );
      entryList.append(
        el('div', { class: 'card' }, [
          el('strong', { text: ex ? ex.name : `Exercise ${entry.exerciseId}` }),
          table(['', 'Reps', 'Weight (kg)', ''], setRows),
          setAdder(entry, redrawEntries),
        ]),
      );
    }
  }

  const picker = el(
    'select',
    { 'aria-label': 'Exercise to add' },
    exercises.map((e) => el('option', { value: e.id, text: e.name })),
  );

  const addExercise = el('button', {
    type: 'button',
    text: 'Add exercise',
    onClick: () => {
      const exerciseId = Number(picker.value);
      if (!draft.entries.some((e) => e.exerciseId === exerciseId)) {
        draft.entries.push({ exerciseId, sets: [] });
      }
      redrawEntries();
    },
  });

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      const payload = {
        date: draft.date,
        note: draft.note || undefined,
        entries: draft.entries.filter((entry) => entry.sets.length > 0),
      };
      const request = isEditing
        ? api.put(`/api/workouts/${editingId}`, payload)
        : api.post('/api/workouts', payload);

      request
        .then(() => {
          showSuccess(isEditing ? 'Session updated' : 'Session saved');
          resetDraft();
        })
        .then(reload)
        .catch(showError);
    },
  });

  form.append(
    el('div', { class: 'row' }, [date.wrapper, note.wrapper]),
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', { text: 'Exercise' }), picker]),
      addExercise,
    ]),
    entryList,
    el('div', { class: 'row' }, [
      el('button', {
        class: 'primary',
        type: 'submit',
        text: isEditing ? 'Save changes' : 'Save session',
      }),
      isEditing
        ? el('button', {
            type: 'button',
            text: 'Cancel edit',
            onClick: () => {
              resetDraft();
              reload().catch(showError);
            },
          })
        : null,
    ]),
  );

  redrawEntries();
  return el('div', { class: 'panel', id: 'session-builder' }, [
    el('h3', { text: isEditing ? 'Edit session' : 'Log a session' }),
    isEditing ? el('p', { class: 'muted', text: 'Saving replaces this session in full.' }) : null,
    form,
  ]);
}

/** Writes straight into the draft so an edited value survives the next redraw. */
function editableNumber(set, key) {
  const input = el('input', {
    type: 'number',
    min: key === 'reps' ? '1' : '0',
    step: key === 'reps' ? '1' : '0.5',
    value: String(set[key]),
    'aria-label': key === 'reps' ? 'Reps' : 'Weight in kilograms',
  });
  input.addEventListener('change', () => {
    set[key] = Number(input.value);
  });
  return input;
}

function setAdder(entry, redraw) {
  const reps = el('input', {
    type: 'number',
    min: '1',
    step: '1',
    value: '5',
    'aria-label': 'Reps for the new set',
  });
  const weight = el('input', {
    type: 'number',
    min: '0',
    step: '0.5',
    value: '0',
    'aria-label': 'Weight in kilograms for the new set',
  });
  return el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Reps' }), reps]),
    el('div', { class: 'field' }, [el('label', { text: 'Weight (kg)' }), weight]),
    el('button', {
      type: 'button',
      text: 'Add set',
      onClick: () => {
        entry.sets.push({ reps: Number(reps.value), weightKg: Number(weight.value) });
        redraw();
      },
    }),
  ]);
}
