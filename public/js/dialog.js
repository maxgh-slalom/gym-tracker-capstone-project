/**
 * Modal dialogs built on the native <dialog> element.
 *
 * Replaces window.confirm/prompt, which are unsupported in embedded browser
 * contexts and cannot satisfy the labelling requirements in FR-050 and FR-052.
 */

import { el } from './dom.js';

function open(buildBody, { title, confirmLabel, danger, onConfirm, showCancel = true }) {
  return new Promise((resolve) => {
    const dialog = el('dialog', { class: 'modal', 'aria-label': title });
    const body = buildBody();

    const cancel = el('button', {
      type: 'button',
      text: 'Cancel',
      onClick: () => {
        dialog.close();
        resolve(null);
      },
    });

    const confirm = el('button', {
      type: 'submit',
      class: danger ? 'danger' : 'primary',
      text: confirmLabel,
    });

    const form = el('form', {
      method: 'dialog',
      onSubmit: (e) => {
        e.preventDefault();
        const result = onConfirm(body);
        if (result === undefined) return; // validation failed; keep the dialog open
        dialog.close();
        resolve(result);
      },
    });

    form.append(
      el('h3', { text: title }),
      body.node,
      el('div', { class: 'modal-actions' }, showCancel ? [cancel, confirm] : [confirm]),
    );

    dialog.append(form);
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
    body.focus?.();
  });
}

export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return open(
    () => ({ node: el('p', { text: message }) }),
    { title, confirmLabel, danger, onConfirm: () => true },
  ).then((result) => result === true);
}

export function promptDialog({ title, label, value = '', confirmLabel = 'Save' }) {
  return open(
    () => {
      const input = el('input', { id: 'modal-input', value });
      return {
        node: el('div', { class: 'field' }, [
          el('label', { for: 'modal-input', text: label }),
          input,
        ]),
        input,
        focus: () => input.select(),
      };
    },
    {
      title,
      confirmLabel,
      danger: false,
      onConfirm: (body) => body.input.value.trim() || undefined,
    },
  );
}

/**
 * Multi-field form dialog. `fields` entries may set `disabled` with a `note`,
 * which is how locked food nutrition values are surfaced (FR-024c).
 */
export function formDialog({ title, fields, confirmLabel = 'Save', note = null }) {
  return open(
    () => {
      const inputs = new Map();
      const rows = fields.map((f, i) => {
        const id = `modal-field-${i}`;
        const input = el('input', {
          id,
          type: f.type ?? 'text',
          value: f.value ?? '',
          step: f.step,
          min: f.min,
          disabled: f.disabled,
        });
        inputs.set(f.name, input);
        return el('div', { class: 'field' }, [
          el('label', { for: id, text: f.label }),
          input,
          f.note ? el('span', { class: 'muted', text: f.note }) : null,
        ]);
      });

      return {
        node: el('div', {}, [
          note ? el('p', { class: 'muted', text: note }) : null,
          el('div', { class: 'form-grid' }, rows),
        ]),
        inputs,
        focus: () => inputs.values().next().value?.focus(),
      };
    },
    {
      title,
      confirmLabel,
      danger: false,
      onConfirm: (body) => {
        const result = {};
        for (const [name, input] of body.inputs) {
          if (input.disabled) continue;
          result[name] = input.value;
        }
        return result;
      },
    },
  );
}

/** FR-041d: an irreversible action requires typing the exact token. */
export function typedConfirmDialog({ title, message, token }) {
  return open(
    () => {
      const input = el('input', { id: 'modal-input', 'aria-describedby': 'modal-hint' });
      const hint = el('p', { class: 'field-error', id: 'modal-hint' });
      return {
        node: el('div', {}, [
          el('p', { text: message }),
          el('div', { class: 'field' }, [
            el('label', { for: 'modal-input', text: `Type ${token} to confirm` }),
            input,
            hint,
          ]),
        ]),
        input,
        hint,
        focus: () => input.focus(),
      };
    },
    {
      title,
      confirmLabel: 'Erase and load',
      danger: true,
      onConfirm: (body) => {
        if (body.input.value !== token) {
          body.hint.textContent = `Enter exactly "${token}" to continue.`;
          body.input.setAttribute('aria-invalid', 'true');
          return undefined;
        }
        return true;
      },
    },
  ).then((result) => result === true);
}

/** Read-only; Close is the only action, so no Cancel is offered. */
export function infoDialog({ title, lines }) {
  return open(
    () => ({
      node: el(
        'div',
        {},
        lines.map((line) => el('p', { text: line })),
      ),
    }),
    { title, confirmLabel: 'Close', danger: false, onConfirm: () => true, showCancel: false },
  );
}
