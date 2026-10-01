/** Nutrition view: day totals against the goals in effect, food catalog management, and meal logging. */

import { api } from '../api.js';
import { clear, el, emptyState, field, loading, table } from '../dom.js';
import { confirmDialog, formDialog } from '../dialog.js';
import { runDemoReset } from '../demo.js';
import { MEAL_SLOTS, kcal, mass, titleCase, todayIso } from '../format.js';
import { showError, showSuccess } from '../banner.js';

export const title = 'Nutrition';

let currentDate = todayIso();
let searchTerm = '';
let includeArchivedFoods = false;
let searchLimit = 25; // FR-017a: 25 by default, 100 on request

export async function mount(container) {
  clear(container);
  container.append(el('h2', { text: 'Nutrition' }), loading());

  const day = await api.get(`/api/nutrition/day/${currentDate}`);
  const reload = () => mount(container);

  clear(container);
  container.append(
    el('h2', { text: 'Nutrition' }),
    datePicker(reload),
    summary(day),
    catalog(reload),
    meals(day, reload),
  );

  if (searchTerm) await runSearch(reload);
}

function datePicker(reload) {
  const date = field('Date', { type: 'date', value: currentDate, max: todayIso() });
  date.input.addEventListener('change', () => {
    currentDate = date.input.value;
    reload().catch(showError);
  });
  return el('div', { class: 'panel' }, [el('div', { class: 'row' }, [date.wrapper])]);
}

function summary(day) {
  // FR-028a: say plainly that no goals applied rather than showing zeros.
  if (!day.comparison) {
    return el('div', { class: 'panel' }, [
      el('h3', { text: 'Totals' }),
      el('p', { text: 'No goals set for this date.' }),
      el('p', { class: 'muted' }, [
        'Totals are shown below. ',
        el('a', { href: '#/goals', text: 'Set goals' }),
        ' to compare against them.',
      ]),
      totalsCards(day.totals),
    ]);
  }

  const metrics = [
    ['Calories', 'calories', kcal],
    ['Protein', 'proteinG', (v) => mass(v)],
    ['Carbs', 'carbsG', (v) => mass(v)],
    ['Fat', 'fatG', (v) => mass(v)],
  ];

  const cards = metrics.map(([label, key, fmt]) => {
    const c = day.comparison[key];
    // FR-053: the over/under state is carried by text, not only by colour.
    const status = c.exceeded
      ? el('div', { class: 'over', text: `Over by ${fmt(Math.abs(c.remaining))}` })
      : el('div', { class: 'under', text: `${fmt(c.remaining)} remaining` });
    return el('div', { class: 'card' }, [
      el('div', { class: 'muted', text: label }),
      el('div', { class: 'value', text: fmt(c.consumed) }),
      el('div', { class: 'muted', text: `of ${fmt(c.goal)}` }),
      status,
    ]);
  });

  return el('div', { class: 'panel' }, [
    el('h3', { text: `Totals vs goals effective ${day.goals.effectiveDate}` }),
    el('div', { class: 'cards' }, cards),
  ]);
}

function totalsCards(totals) {
  return el('div', { class: 'cards' }, [
    card('Calories', kcal(totals.calories)),
    card('Protein', mass(totals.proteinG)),
    card('Carbs', mass(totals.carbsG)),
    card('Fat', mass(totals.fatG)),
  ]);
}

const card = (label, value) =>
  el('div', { class: 'card' }, [
    el('div', { class: 'muted', text: label }),
    el('div', { class: 'value', text: value }),
  ]);

// --- Food catalog -----------------------------------------------------------

let resultsNode = null;

function catalog(reload) {
  const search = field('Search foods', {
    type: 'search',
    placeholder: 'e.g. yogurt',
    value: searchTerm,
  });
  search.input.addEventListener('input', () => {
    searchTerm = search.input.value.trim();
    searchLimit = 25;
    runSearch(reload).catch(showError);
  });

  const archivedToggle = el('label', {}, [
    el('input', {
      type: 'checkbox',
      checked: includeArchivedFoods,
      onChange: (e) => {
        includeArchivedFoods = e.target.checked;
        runSearch(reload).catch(showError);
      },
    }),
    ' Include archived foods',
  ]);

  resultsNode = el('div');

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Food catalog' }),
    el('div', { class: 'row' }, [
      search.wrapper,
      archivedToggle,
      el('button', {
        type: 'button',
        text: 'Add custom food',
        onClick: () => addCustomFood(reload),
      }),
    ]),
    resultsNode,
  ]);
}

async function runSearch(reload) {
  if (!resultsNode) return;
  if (!searchTerm) {
    clear(resultsNode);
    resultsNode.append(el('p', { class: 'muted', text: 'Type to search the catalog.' }));
    return;
  }

  const query = new URLSearchParams({
    search: searchTerm,
    includeArchived: String(includeArchivedFoods),
    limit: String(searchLimit),
  });
  const { foods, total } = await api.get(`/api/foods?${query}`);

  clear(resultsNode);
  if (!foods.length) {
    resultsNode.append(el('p', { class: 'muted', text: `No foods match "${searchTerm}".` }));
    return;
  }

  resultsNode.append(
    el('p', { class: 'muted', text: `Showing ${foods.length} of ${total} matching foods` }),
    table(
      ['Food', 'Portion', 'Calories', 'Log', 'Manage'],
      foods.map((food) => foodRow(food, reload)),
    ),
  );

  // FR-017a: the 100-result maximum is reachable, not just configured.
  if (total > foods.length && searchLimit < 100) {
    resultsNode.append(
      el('button', {
        type: 'button',
        text: `Show up to 100 results`,
        onClick: () => {
          searchLimit = 100;
          runSearch(reload).catch(showError);
        },
      }),
    );
  }
}

function foodRow(food, reload) {
  const slot = el(
    'select',
    { 'aria-label': `Meal slot for ${food.name}` },
    MEAL_SLOTS.map((s) => el('option', { value: s, text: titleCase(s) })),
  );
  const unit = el('select', { 'aria-label': `Unit for ${food.name}` }, [
    el('option', { value: 'servings', text: 'servings' }),
    el('option', { value: 'grams', text: 'grams' }),
  ]);
  const amount = el('input', {
    type: 'number',
    min: '0.1',
    step: '0.1',
    value: '1',
    'aria-label': `Amount of ${food.name}`,
  });

  const logCell = food.archived
    ? el('span', { class: 'muted', text: 'Archived — restore to log' })
    : el('span', {}, [
        slot,
        ' ',
        amount,
        ' ',
        unit,
        ' ',
        el('button', {
          type: 'button',
          text: 'Add',
          onClick: () => {
            const payload = {
              date: currentDate,
              mealSlot: slot.value,
              foodId: food.id,
              [unit.value]: Number(amount.value),
            };
            api
              .post('/api/meal-entries', payload)
              .then(() => showSuccess(`${food.name} added to ${slot.value}`))
              .then(reload)
              .catch(showError);
          },
        }),
      ]);

  return el('tr', {}, [
    el('td', {}, [
      food.name,
      ' ',
      food.archived ? el('span', { class: 'tag', text: 'Archived' }) : null,
    ]),
    el('td', { text: `${food.portionName} (${food.portionGrams} g)` }),
    el('td', { text: kcal(food.calories) }),
    el('td', {}, [logCell]),
    el('td', {}, [
      el('button', { type: 'button', text: 'Edit', onClick: () => editFood(food, reload) }),
      ' ',
      el('button', {
        type: 'button',
        text: food.archived ? 'Restore' : 'Archive',
        onClick: () =>
          api
            .post(`/api/foods/${food.id}/${food.archived ? 'restore' : 'archive'}`)
            .then(() => showSuccess(`${food.name} ${food.archived ? 'restored' : 'archived'}`))
            .then(reload)
            .catch(showError),
      }),
    ]),
  ]);
}

async function addCustomFood(reload) {
  const values = await formDialog({
    title: 'Add a custom food',
    note: 'Nutrition values are for one reference portion.',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'portionName', label: 'Portion name (e.g. 1 cup)' },
      { name: 'portionGrams', label: 'Portion weight (g)', type: 'number', step: '0.1', min: '0.1' },
      { name: 'calories', label: 'Calories', type: 'number', step: '1', min: '0' },
      { name: 'proteinG', label: 'Protein (g)', type: 'number', step: '0.1', min: '0' },
      { name: 'carbsG', label: 'Carbs (g)', type: 'number', step: '0.1', min: '0' },
      { name: 'fatG', label: 'Fat (g)', type: 'number', step: '0.1', min: '0' },
    ],
    confirmLabel: 'Create food',
  });
  if (!values) return;

  api
    .post('/api/foods', {
      name: values.name,
      portionName: values.portionName,
      portionGrams: Number(values.portionGrams),
      calories: Number(values.calories),
      proteinG: Number(values.proteinG),
      carbsG: Number(values.carbsG),
      fatG: Number(values.fatG),
    })
    .then((food) => {
      searchTerm = food.name;
      showSuccess(`${food.name} added to the catalog`);
    })
    .then(reload)
    .catch(showError);
}

async function editFood(food, reload) {
  // FR-024c: once referenced, the fields that would rewrite history are disabled here
  // rather than rejected after the fact.
  const locked = food.entryCount > 0;
  const lockNote = locked ? 'Locked — entries already reference this food' : undefined;
  const plural = food.entryCount === 1 ? 'entry references' : 'entries reference';

  const values = await formDialog({
    title: `Edit ${food.name}`,
    note: locked
      ? `${food.entryCount} meal ${plural} this food, so its nutrition values are locked. Create a new food if those need to change.`
      : null,
    fields: [
      { name: 'name', label: 'Name', value: food.name },
      { name: 'portionName', label: 'Portion name', value: food.portionName },
      {
        name: 'portionGrams',
        label: 'Portion weight (g)',
        type: 'number',
        step: '0.1',
        value: food.portionGrams,
        disabled: locked,
        note: lockNote,
      },
      { name: 'calories', label: 'Calories', type: 'number', value: food.calories, disabled: locked, note: lockNote },
      { name: 'proteinG', label: 'Protein (g)', type: 'number', step: '0.1', value: food.proteinG, disabled: locked },
      { name: 'carbsG', label: 'Carbs (g)', type: 'number', step: '0.1', value: food.carbsG, disabled: locked },
      { name: 'fatG', label: 'Fat (g)', type: 'number', step: '0.1', value: food.fatG, disabled: locked },
    ],
  });
  if (!values) return;

  const patch = { name: values.name, portionName: values.portionName };
  if (!locked) {
    patch.portionGrams = Number(values.portionGrams);
    patch.calories = Number(values.calories);
    patch.proteinG = Number(values.proteinG);
    patch.carbsG = Number(values.carbsG);
    patch.fatG = Number(values.fatG);
  }

  api
    .patch(`/api/foods/${food.id}`, patch)
    .then(() => showSuccess('Food updated'))
    .then(reload)
    .catch(showError);
}

// --- Logged meals -----------------------------------------------------------

function meals(day, reload) {
  const anyLogged = MEAL_SLOTS.some((slot) => day.meals[slot].length);

  if (!anyLogged) {
    return el('div', { class: 'panel' }, [
      el('h3', { text: `Meals on ${day.date}` }),
      day.goals
        ? emptyState('Nothing logged for this date yet. Search the catalog above to add a food.')
        : emptyState(
            'Nothing logged for this date, and the app holds no data at all.',
            'Load demo data',
            () => runDemoReset({ isEmpty: true }),
          ),
    ]);
  }

  const sections = MEAL_SLOTS.map((slot) => {
    const entries = day.meals[slot];
    if (!entries.length) {
      return el('div', {}, [
        el('h3', { text: titleCase(slot) }),
        el('p', { class: 'muted', text: 'Nothing logged.' }),
      ]);
    }
    const rows = entries.map((e) => entryRow(e, reload));
    return el('div', {}, [
      el('h3', { text: titleCase(slot) }),
      table(['Food', 'Amount', 'Calories', 'Protein', 'Carbs', 'Fat', ''], rows),
    ]);
  });

  return el('div', { class: 'panel' }, [
    el('h3', { text: `Meals on ${day.date}` }),
    el('div', {}, sections),
  ]);
}

function entryRow(e, reload) {
  return el('tr', {}, [
    el('td', {}, [
      e.foodName,
      ' ',
      e.foodArchived ? el('span', { class: 'tag', text: 'Archived' }) : null,
    ]),
    el('td', { text: `${e.servings} × portion (${mass(e.quantityG)})` }),
    el('td', { text: kcal(e.calories) }),
    el('td', { text: mass(e.proteinG) }),
    el('td', { text: mass(e.carbsG) }),
    el('td', { text: mass(e.fatG) }),
    el('td', {}, [
      el('button', { type: 'button', text: 'Edit', onClick: () => editEntry(e, reload) }),
      ' ',
      el('button', {
        type: 'button',
        class: 'danger',
        text: 'Remove',
        onClick: async () => {
          // FR-038a: every destructive action is confirmed, this one included.
          const ok = await confirmDialog({
            title: 'Remove entry',
            message: `Remove ${e.foodName} from ${e.mealSlot} on ${e.date}? This cannot be undone.`,
            confirmLabel: 'Remove',
            danger: true,
          });
          if (!ok) return;
          api
            .del(`/api/meal-entries/${e.id}`)
            .then(() => showSuccess('Entry removed'))
            .then(reload)
            .catch(showError);
        },
      }),
    ]),
  ]);
}

async function editEntry(entry, reload) {
  const values = await formDialog({
    title: `Edit ${entry.foodName}`,
    note: 'Change the amount in servings, or move the entry to another meal.',
    fields: [
      { name: 'servings', label: 'Servings', type: 'number', step: '0.1', min: '0.1', value: entry.servings },
      { name: 'mealSlot', label: `Meal slot (${MEAL_SLOTS.join(', ')})`, value: entry.mealSlot },
    ],
  });
  if (!values) return;

  api
    .patch(`/api/meal-entries/${entry.id}`, {
      servings: Number(values.servings),
      mealSlot: values.mealSlot.trim().toLowerCase(),
    })
    .then(() => showSuccess('Entry updated'))
    .then(reload)
    .catch(showError);
}
