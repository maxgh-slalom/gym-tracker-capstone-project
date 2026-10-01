/**
 * Hand-rolled inline SVG charts. No dependency, no CDN, no innerHTML.
 * Every chart is paired with a text summary by its caller (FR-054).
 */

const NS = 'http://www.w3.org/2000/svg';
const W = 640;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function scales(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series would give a zero-height range and divide by zero.
  const lo = min === max ? min - 1 : min;
  const hi = min === max ? max + 1 : max;
  return {
    y: (v) => H - PAD.bottom - ((v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom),
    lo,
    hi,
  };
}

function frame(svg, labels, scale) {
  svg.append(
    svgEl('line', { class: 'axis', x1: PAD.left, y1: PAD.top, x2: PAD.left, y2: H - PAD.bottom }),
    svgEl('line', {
      class: 'axis',
      x1: PAD.left,
      y1: H - PAD.bottom,
      x2: W - PAD.right,
      y2: H - PAD.bottom,
    }),
  );

  for (const value of [scale.lo, (scale.lo + scale.hi) / 2, scale.hi]) {
    const text = svgEl('text', { x: PAD.left - 6, y: scale.y(value) + 3, 'text-anchor': 'end' });
    text.textContent = Math.round(value * 10) / 10;
    svg.append(text);
  }

  if (labels.length) {
    const first = svgEl('text', { x: PAD.left, y: H - 8 });
    first.textContent = labels[0];
    const last = svgEl('text', { x: W - PAD.right, y: H - 8, 'text-anchor': 'end' });
    last.textContent = labels.at(-1);
    svg.append(first, last);
  }
}

function xAt(index, count) {
  if (count === 1) return (PAD.left + W - PAD.right) / 2;
  return PAD.left + (index / (count - 1)) * (W - PAD.left - PAD.right);
}

/**
 * Line chart with an optional per-point reference line, used for the stepped
 * calorie goal. Renders a single point as a dot rather than an empty polyline.
 */
export function lineChart({ labels, values, reference = null, ariaLabel }) {
  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    width: '100%',
    role: 'img',
    'aria-label': ariaLabel,
  });

  const all = reference ? values.concat(reference.filter((v) => v !== null)) : values;
  const scale = scales(all);
  frame(svg, labels, scale);

  if (values.length === 1) {
    svg.append(svgEl('circle', { class: 'point', cx: xAt(0, 1), cy: scale.y(values[0]), r: 4 }));
  } else {
    svg.append(
      svgEl('polyline', {
        class: 'series',
        points: values.map((v, i) => `${xAt(i, values.length)},${scale.y(v)}`).join(' '),
      }),
    );
  }

  if (reference) {
    const segments = [];
    let current = [];
    reference.forEach((v, i) => {
      if (v === null) {
        if (current.length) segments.push(current);
        current = [];
      } else {
        current.push(`${xAt(i, reference.length)},${scale.y(v)}`);
      }
    });
    if (current.length) segments.push(current);
    for (const segment of segments) {
      svg.append(svgEl('polyline', { class: 'goal-line', points: segment.join(' ') }));
    }
  }

  return svg;
}

export function barChart({ labels, values, ariaLabel }) {
  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    width: '100%',
    role: 'img',
    'aria-label': ariaLabel,
  });

  const scale = scales([0, ...values]);
  frame(svg, labels, scale);

  const slot = (W - PAD.left - PAD.right) / Math.max(values.length, 1);
  values.forEach((v, i) => {
    const y = scale.y(v);
    svg.append(
      svgEl('rect', {
        class: 'bar',
        x: PAD.left + i * slot + slot * 0.15,
        y,
        width: slot * 0.7,
        height: Math.max(H - PAD.bottom - y, 0),
      }),
    );
  });

  return svg;
}
