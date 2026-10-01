/**
 * DOM helpers. Everything here sets textContent and never innerHTML, so user
 * content can never be interpreted as markup (Principle V, FR-053).
 */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  node.replaceChildren();
}

let fieldSeq = 0;

/** FR-050/FR-052: label and error text are wired to the input, not merely placed near it. */
export function field(labelText, inputAttrs = {}) {
  const id = `f${(fieldSeq += 1)}`;
  const errorId = `${id}-error`;
  const input = el('input', { id, 'aria-describedby': errorId, ...inputAttrs });
  const error = el('span', { class: 'field-error', id: errorId, role: 'status' });
  const wrapper = el('div', { class: 'field' }, [
    el('label', { for: id, text: labelText }),
    input,
    error,
  ]);
  return { wrapper, input, error, name: inputAttrs.name ?? labelText };
}

export function select(labelText, options, attrs = {}) {
  const id = `f${(fieldSeq += 1)}`;
  const node = el('select', { id, ...attrs });
  for (const opt of options) {
    node.append(el('option', { value: opt.value, text: opt.label, selected: opt.selected }));
  }
  const wrapper = el('div', { class: 'field' }, [el('label', { for: id, text: labelText }), node]);
  return { wrapper, input: node };
}

export function table(headers, rows) {
  return el('table', {}, [
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { text: h })))),
    el('tbody', {}, rows),
  ]);
}

/** FR-034a: an empty state is an explanation plus the action that resolves it. */
export function emptyState(message, actionLabel, onAction) {
  return el('div', { class: 'empty' }, [
    el('p', { text: message }),
    actionLabel ? el('button', { class: 'primary', text: actionLabel, onClick: onAction }) : null,
  ]);
}

export function loading() {
  return el('div', { class: 'loading', text: 'Loading…' });
}
