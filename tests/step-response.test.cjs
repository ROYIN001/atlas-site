// Run with: node --test tests/step-response.test.cjs
// No browser or third-party dependencies; exercise the exact helper used by the UI.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = app.indexOf('function stepResponseData(');
const end = app.indexOf('\nfunction demoStep(', start);
assert.ok(start >= 0 && end > start, 'locate the production step-response helper');
const step = vm.runInNewContext(app.slice(start, end) + '\nstepResponseData;');

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Number.isFinite(actual), `non-finite value: ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `expected ${expected} ± ${tolerance}; received ${actual}`);
}

// Independent ODE integration: y'' + 2ξy' + y = 1, normalized time u=t/T.
// Fixed maximum step 0.001; no closed-form response is used by this reference.
function rk4At(xi, targets) {
  let u = 0, y = 0, v = 0;
  return targets.map(target => {
    while (u < target) {
      const dt = Math.min(0.001, target - u);
      if (u + dt === u) break;
      const acceleration = (position, velocity) => 1 - position - 2 * xi * velocity;
      const a1 = acceleration(y, v);
      const v2 = v + dt * a1 / 2, y2 = y + dt * v / 2;
      const a2 = acceleration(y2, v2);
      const v3 = v + dt * a2 / 2, y3 = y + dt * v2 / 2;
      const a3 = acceleration(y3, v3);
      const v4 = v + dt * a3, y4 = y + dt * v3;
      const a4 = acceleration(y4, v4);
      y += dt * (v + 2 * v2 + 2 * v3 + v4) / 6;
      v += dt * (a1 + 2 * a2 + 2 * a3 + a4) / 6;
      u += dt;
    }
    return y;
  });
}

test('F01: overdamped boundary reports physical settling and rise times', () => {
  const data = step(0.6, 2);
  near(data.ts, 6.8749679393955, 1e-10);
  near(data.rise, 4.9375411094408, 1e-10);
  near(data.over, 0);
  assert.equal(data.tp, null, 'monotone response has no finite peak time');
  assert.ok(data.tmax > data.ts && data.tmax > data.t90);
  assert.ok(Math.abs(data.pts.at(-1)[1] - 1) < 0.05);
});

test('truncated old horizon returns missing metrics, never its endpoint or negative rise', () => {
  const data = step(0.6, 2, 3.6);
  near(data.tmax, 3.6);
  near(data.pts.at(-1)[1], rk4At(2, [6])[0], 1e-9);
  near(data.pts.at(-1)[1], 0.78415, 5e-6);
  assert.equal(data.ts, null);
  assert.equal(data.t90, null);
  assert.equal(data.rise, null);
  assert.ok(data.t10 > 0);
  const early = step(0.6, 2, 0.01);
  assert.equal(early.t10, null);
  assert.equal(early.t90, null);
  assert.equal(early.rise, null);
});

test('critical damping matches the (1+u)exp(-u) reference', () => {
  const data = step(1, 1);
  near(data.ts, 4.74386451839058, 1e-10);
  near(data.rise, 3.35790856147782, 1e-10);
  assert.equal(data.over, 0);
  near((1 + data.ts) * Math.exp(-data.ts), 0.05);
  near((1 + data.t10) * Math.exp(-data.t10), 0.9);
  near((1 + data.t90) * Math.exp(-data.t90), 0.1);
});

test('default underdamped case identifies the final excursion, not first band entry', () => {
  const data = step(0.6, 0.3);
  near(data.ts, 6.08225684573843, 1e-10);
  near(data.rise, 0.792803987739618, 1e-10);
  near(data.over, 37.2326104926586, 1e-10);
  near(data.tp, Math.PI * 0.6 / Math.sqrt(1 - 0.3 ** 2));
  const values = rk4At(0.3, [data.ts / 0.6 - 1e-4, data.ts / 0.6, data.ts / 0.6 + 1e-4]);
  assert.ok(Math.abs(values[0] - 1) > 0.05);
  near(Math.abs(values[1] - 1), 0.05, 1e-8);
  assert.ok(Math.abs(values[2] - 1) < 0.05);
});

test('all supported slider combinations have finite, positive, scale-consistent metrics', () => {
  // ξ: 0.05–2.00 in 0.01 steps; T: 0.10–2.00 in 0.05 steps.
  for (let xiTick = 5; xiTick <= 200; xiTick++) {
    const xi = xiTick / 100;
    const normalized = step(1, xi);
    for (let tTick = 2; tTick <= 40; tTick++) {
      const T = tTick / 20;
      const data = step(T, xi);
      assert.ok(data.ts > 0 && data.ts <= data.tmax, `settling at ξ=${xi}, T=${T}`);
      assert.ok(data.t10 > 0 && data.t90 > data.t10 && data.t90 <= data.tmax);
      assert.ok(data.rise > 0 && Number.isFinite(data.over));
      near(data.ts / T, normalized.ts);
      near(data.rise / T, normalized.rise);
      assert.equal(data.pts.length, 901);
      near(data.pts[0][0], 0);
      near(data.pts[0][1], 0);
      assert.ok(data.pts.every(([t, y]) => Number.isFinite(t) && Number.isFinite(y)));
      assert.ok(Math.abs(data.pts.at(-1)[1] - 1) <= 0.05);
    }
  }
});

test('long lightly damped response is not cut off at 40 seconds', () => {
  const data = step(2, 0.05);
  assert.ok(data.ts > 100 && data.tmax > data.ts);
  near(data.ts, 119.774869316896, 1e-9);
});

test('independent RK4 agrees with plotted values and metric thresholds in all regimes', () => {
  for (const xi of [0.05, 0.3, 0.7, 0.99, 1, 1.01, 2]) {
    const data = step(1, xi);
    const samples = [0, 1, 20, 100, 300, 600, 900].map(i => data.pts[i]);
    const reference = rk4At(xi, samples.map(([u]) => u));
    samples.forEach(([, y], i) => near(y, reference[i], 1e-8));
    const thresholds = [
      { u: data.t10, y: 0.1 },
      { u: data.t90, y: 0.9 },
      { u: data.ts, band: 0.05 }
    ].sort((a, b) => a.u - b.u);
    const metricValues = rk4At(xi, thresholds.map(p => p.u));
    thresholds.forEach((point, i) => {
      if ('y' in point) near(metricValues[i], point.y, 1e-8);
      else near(Math.abs(metricValues[i] - 1), point.band, 1e-8);
    });
  }
});

test('settling remains inside the band after the plot, including near tangent extrema', () => {
  const tangentXi = Math.log(20) / Math.hypot(Math.PI, Math.log(20));
  for (const xi of [0.05, 0.3, tangentXi - 1e-8, tangentXi + 1e-8, 0.99, 1, 2]) {
    const data = step(1, xi);
    // The analytic solution is sampled through ten extra natural time units
    // beyond the chart; RK4 independently verifies no hidden later excursion.
    const targets = Array.from({ length: 2001 }, (_, i) =>
      data.ts + (data.tmax + 10 - data.ts) * i / 2000);
    for (const value of rk4At(xi, targets)) {
      assert.ok(Math.abs(value - 1) <= 0.05 + 1e-8, `late excursion at ξ=${xi}`);
    }
  }
});

test('response is continuous across critical damping', () => {
  const critical = step(1, 1);
  for (const xi of [1 - 1e-10, 1 + 1e-10]) {
    const data = step(1, xi);
    near(data.ts, critical.ts, 1e-8);
    near(data.rise, critical.rise, 1e-8);
    data.pts.forEach(([, y], i) => near(y, critical.pts[i][1], 1e-8));
  }
});

test('zero damping is explicitly non-settling, with a valid first 10–90% rise', () => {
  const data = step(0.6, 0);
  assert.equal(data.ts, null);
  near(data.over, 100);
  near(data.rise, 0.6 * (Math.acos(0.1) - Math.acos(0.9)));
  assert.ok(data.pts.every(([t, y]) => Number.isFinite(t) && Number.isFinite(y)));
});

test('invalid model parameters are rejected explicitly', () => {
  for (const args of [[0, 1], [-1, 1], [NaN, 1], [1, -0.1], [1, NaN], [1, Infinity], [1, 1, 0]]) {
    assert.throws(() => step(...args), { name: 'RangeError' });
  }
});
