/** Nutrition view: day totals against the goals in effect, plus food search and logging. */

import { api } from '../api.js';
import { clear, el, emptyState, field, loading, table } from '../dom.js';
import { MEAL_SLOTS, kcal, mass, titleCase, todayIso } from '../format.js';
import { showError, showSuccess } from '../banner.js';

export const title = 'Nutrition';

let currentDate = todayIso();

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
    logger(reload),
    meals(day, reload),
  );
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

function logger(reload) {
  const search = field('Search foods', { type: 'search', placeholder: 'e.g. yogurt' });
  const results = el('div');

  search.input.addEventListener('input', () => {
    const term = search.input.value.trim();
    if (!term) {
      clear(results);
      return;
    }
    api
      .get(`/api/foods?search=${encodeURIComponent(term)}`)
      .then(({ foods, total }) => {
        clear(results);
        if (!foods.length) {
          results.append(el('p', { class: 'muted', text: `No foods match "${term}".` }));
          return;
        }
        results.append(
          el('p', { class: 'muted', text: `${foods.length} of ${total} match` }),
          table(
            ['Food', 'Portion', 'Calories', ''],
            foods.map((food) => foodRow(food, reload)),
          ),
        );
      })
      .catch(showError);
  });

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Log a food' }),
    el('div', { class: 'row' }, [search.wrapper]),
    results,
  ]);
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

  return el('tr', {}, [
    el('td', { text: food.name }),
    el('td', { text: `${food.portionName} (${food.portionGrams} g)` }),
    el('td', { text: kcal(food.calories) }),
    el('td', {}, [
      slot,
      ' ',
      amount,
      ' ',
      unit,
      ' ',
      el('button', {
        text: 'Add',
        onClick: () => {
          const value = Number(amount.value);
          const payload = {
            date: currentDate,
            mealSlot: slot.value,
            foodId: food.id,
            [unit.value === 'servings' ? 'servings' : 'grams']: value,
          };
          api
            .post('/api/meal-entries', payload)
            .then(() => showSuccess(`${food.name} added to ${slot.value}`))
            .then(reload)
            .catch(showError);
        },
      }),
    ]),
  ]);
}

function meals(day, reload) {
  const sections = MEAL_SLOTS.map((slot) => {
    const entries = day.meals[slot];
    if (!entries.length) {
      return el('div', {}, [
        el('h3', { text: titleCase(slot) }),
        el('p', { class: 'muted', text: 'Nothing logged.' }),
      ]);
    }
    const rows = entries.map((e) =>
      el('tr', {}, [
        el('td', {}, [e.foodName, ' ', e.foodArchived ? el('span', { class: 'tag', text: 'Archived' }) : null]),
        el('td', { text: `${e.servings} × portion (${mass(e.quantityG)})` }),
        el('td', { text: kcal(e.calories) }),
        el('td', { text: mass(e.proteinG) }),
        el('td', { text: mass(e.carbsG) }),
        el('td', { text: mass(e.fatG) }),
        el('td', {}, [
          el('button', {
            class: 'danger',
            text: 'Remove',
            onClick: () =>
              api
                .del(`/api/meal-entries/${e.id}`)
                .then(() => showSuccess('Entry removed'))
                .then(reload)
                .catch(showError),
          }),
        ]),
      ]),
    );
    return el('div', {}, [
      el('h3', { text: titleCase(slot) }),
      table(['Food', 'Amount', 'Calories', 'Protein', 'Carbs', 'Fat', ''], rows),
    ]);
  });

  const anyLogged = MEAL_SLOTS.some((slot) => day.meals[slot].length);
  return el('div', { class: 'panel' }, [
    el('h3', { text: `Meals on ${day.date}` }),
    anyLogged ? el('div', {}, sections) : emptyState('Nothing logged for this date yet. Search for a food above.'),
  ]);
}
