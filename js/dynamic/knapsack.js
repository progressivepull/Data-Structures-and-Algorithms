/* global $, bootstrap */

/**
 * Knapsack (0/1) Memoization Visualizer
 * Folder: dynamic; File: knapsack.{html,css,js}
 *
 * Step events (types):
 *  - call: entering knap(i,w)
 *  - base: base case for (i,w)
 *  - hit: memoized value used
 *  - miss: memo not set (first time computing)
 *  - choose: considering take/skip after children
 *  - set: memo[i][w] assigned
 *  - return: return from (i,w)
 */

(function () {
  // ---------- DOM ----------
  const $weights = $('#weightsInput');
  const $values = $('#valuesInput');
  theCapacityInput = document.getElementById('capacityInput'); // used to avoid jQuery for min enforcement sometimes
  const $capacity = $('#capacityInput');

  const $setupBtn = $('#setupBtn');
  const $stepBtn = $('#stepBtn');

  const $statusText = $('#statusText');
  const $memoTableContainer = $('#memoTableContainer');

  const $summaryN = $('#summaryN');
  const $summaryW = $('#summaryW');
  const $summarySteps = $('#summarySteps');
  const $summaryAns = $('#summaryAns');

  const canvas = document.getElementById('vizCanvas');
  const ctx = canvas.getContext('2d');

  // ---------- State ----------
  let state = null; // will store inputs, memo, steps, cursor, etc.

  // ---------- Utilities ----------
  function parseCSVNumbers(s) {
    if (!s || !s.trim()) return [];
    return s
      .split(',')
      .map(x => x.trim())
      .filter(x => x.length)
      .map(x => Number(x))
      .filter(x => Number.isFinite(x));
  }

  function key(i, w) {
    return `${i}_${w}`;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  // ---------- Step Trace Builder (Memoized DFS) ----------
  function buildTrace(weights, values, W) {
    const n = weights.length;
    const memo = Array.from({ length: n + 1 }, () => Array(W + 1).fill(null));
    const steps = [];           // record of step events to replay
    const edges = [];           // edge list for recursion tree
    const seenNode = new Set(); // for node existence
    const parentOf = {};        // track parent to draw edges once

    // Build steps with actual recursion, but instrumented
    function knap(i, w, parentKey = null) {
      const k = key(i, w);
      if (!seenNode.has(k)) {
        seenNode.add(k);
        if (parentKey !== null) edges.push([parentKey, k]);
      }
      steps.push({ type: 'call', i, w });

      // base
      if (i === n || w === 0) {
        steps.push({ type: 'base', i, w, value: 0 });
        steps.push({ type: 'set', i, w, value: 0 });
        memo[i][w] = 0;
        steps.push({ type: 'return', i, w, value: 0 });
        return 0;
      }

      if (memo[i][w] !== null) {
        steps.push({ type: 'hit', i, w, value: memo[i][w] });
        steps.push({ type: 'return', i, w, value: memo[i][w] });
        return memo[i][w];
      } else {
        steps.push({ type: 'miss', i, w });
      }

      let notTake = knap(i + 1, w, k);
      let take = -Infinity;
      if (weights[i] <= w) {
        take = values[i] + knap(i + 1, w - weights[i], k);
      }
      const best = Math.max(notTake, take);
      steps.push({ type: 'choose', i, w, take, notTake, best });
      memo[i][w] = best;
      steps.push({ type: 'set', i, w, value: best });
      steps.push({ type: 'return', i, w, value: best });
      return best;
    }

    const ans = knap(0, W);
    return { n, W, memo, steps, edges, ans };
  }

  // ---------- Memo Table Rendering ----------
  function renderMemoTable(n, W) {
    // Build table skeleton
    const $table = $('<table class="memo-table table-sm"></table>');
    const $thead = $('<thead></thead>');
    const $tbody = $('<tbody></tbody>');
    const $hr = $('<tr></tr>');

    // Header row: w = 0..W
    $hr.append('<th class="sticky top left">i \\ w</th>');
    for (let w = 0; w <= W; w++) {
      $hr.append(`<th class="sticky top">${w}</th>`);
    }
    $thead.append($hr);
    $table.append($thead);

    // Body rows: i = 0..n
    for (let i = 0; i <= n; i++) {
      const $tr = $('<tr></tr>');
      $tr.append(`<th class="sticky left">${i}</th>`);
      for (let w = 0; w <= W; w++) {
        const id = `cell_${i}_${w}`;
        $tr.append(`<td id="${id}" class="cell-empty">·</td>`);
      }
      $tbody.append($tr);
    }
    $table.append($tbody);

    $memoTableContainer.empty().append($table);
  }

  function clearCellStates(i, w) {
    if (i === undefined || w === undefined) return;
    const $td = $(`#cell_${i}_${w}`);
    $td.removeClass('cell-active cell-hit');
  }

  function markActive(i, w) {
    const $td = $(`#cell_${i}_${w}`);
    $td.removeClass('cell-hit').addClass('cell-active');
  }

  function markHit(i, w, value) {
    const $td = $(`#cell_${i}_${w}`);
    $td
      .removeClass('cell-active')
      .addClass('cell-hit')
      .text(value);
  }

  function setMemoValue(i, w, value) {
    const $td = $(`#cell_${i}_${w}`);
    $td
      .removeClass('cell-empty cell-active cell-hit')
      .addClass('cell-computed')
      .text(value);
  }

  // ---------- Canvas Drawing ----------
  function drawTree() {
    if (!state) return;
    const { nodesLayout, nodeStates, edges, n, W } = state;

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid hint (optional): depths
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    for (let i = 0; i <= n; i++) {
      const y = nodesLayout.yForI(i);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();

    // edges
    ctx.save();
    ctx.strokeStyle = '#ced4da';
    ctx.lineWidth = 1;
    edges.forEach(([from, to]) => {
      const A = nodesLayout.pos[from];
      const B = nodesLayout.pos[to];
      if (!A || !B) return;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    });
    ctx.restore();

    // nodes
    const radius = 16;
    edges.forEach(() => {}); // noop to keep structure clear

    Object.keys(nodesLayout.pos).forEach(k => {
      const { x, y, i, w } = nodesLayout.pos[k];
      const st = nodeStates[k] || 'default';
      // color by state
      let fill = '#f8f9fa';
      let stroke = '#6c757d';
      if (st === 'active') { fill = '#e7f1ff'; stroke = '#0a58ca'; }
      if (st === 'hit')    { fill = '#fff3cd'; stroke = '#b08900'; }
      if (st === 'set')    { fill = '#e9f7ef'; stroke = '#0f5132'; }
      if (st === 'base')   { fill = '#f0f9ff'; stroke = '#087990'; }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = stroke;
      ctx.stroke();

      ctx.fillStyle = '#212529';
      ctx.font = '12px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`(${i},${w})`, x, y);
    });
  }

  function buildLayout(n, W, steps, edges) {
    // Collect all nodes referenced in edges and steps
    const pos = {};
    const uniq = new Set();
    edges.forEach(([a, b]) => { uniq.add(a); uniq.add(b); });
    steps.forEach(ev => uniq.add(key(ev.i, ev.w)));

    // Layer nodes by i (depth). Horizontal position by w
    const padding = { l: 60, r: 30, t: 40, b: 30 };
    const usableW = canvas.width - padding.l - padding.r;
    const usableH = canvas.height - padding.t - padding.b;
    const rowH = usableH / Math.max(1, n);

    function xForW(w) {
      if (W === 0) return padding.l + usableW / 2;
      return padding.l + (w / W) * usableW;
    }
    function yForI(i) {
      const y = padding.t + i * rowH;
      return y;
    }

    uniq.forEach(k => {
      const [si, sw] = k.split('_').map(Number);
      pos[k] = { x: xForW(sw), y: yForI(si), i: si, w: sw };
    });

    return {
      pos,
      xForW,
      yForI
    };
  }

  // ---------- Playback ----------
  function applyStep(ev) {
    const last = state.lastActive;
    if (last) clearCellStates(last.i, last.w);

    switch (ev.type) {
      case 'call':
        state.nodeStates[key(ev.i, ev.w)] = 'active';
        markActive(ev.i, ev.w);
        $statusText.html(
          `Call: <code>knap(${ev.i}, ${ev.w})</code> — entering state`
        );
        break;

      case 'base':
        state.nodeStates[key(ev.i, ev.w)] = 'base';
        $statusText.html(
          `Base Case at <code>(${ev.i}, ${ev.w})</code> → value = <strong>${ev.value}</strong>`
        );
        break;

      case 'hit':
        state.nodeStates[key(ev.i, ev.w)] = 'hit';
        markHit(ev.i, ev.w, ev.value);
        $statusText.html(
          `Memo Hit at <code>(${ev.i}, ${ev.w})</code> → reuse <strong>${ev.value}</strong>`
        );
        break;

      case 'miss':
        $statusText.html(
          `Memo Miss at <code>(${ev.i}, ${ev.w})</code> → computing children`
        );
        break;

      case 'choose':
        $statusText.html(
          `Choose at <code>(${ev.i}, ${ev.w})</code>: take=${fmt(ev.take)}, skip=${fmt(ev.notTake)} → best=<strong>${ev.best}</strong>`
        );
        break;

      case 'set':
        state.nodeStates[key(ev.i, ev.w)] = 'set';
        setMemoValue(ev.i, ev.w, ev.value);
        $statusText.html(
          `Memo Set <code>memo[${ev.i}][${ev.w}] = ${ev.value}</code>`
        );
        break;

      case 'return':
        $statusText.html(
          `Return from <code>(${ev.i}, ${ev.w})</code> with <strong>${ev.value}</strong>`
        );
        break;
    }

    state.lastActive = { i: ev.i, w: ev.w };
    drawTree();
  }

  function fmt(x) {
    return Number.isFinite(x) ? x : '−∞';
  }

  function stepOnce() {
    if (!state) return;
    if (state.cursor >= state.steps.length) {
      $statusText.html(
        `Finished. Optimal value = <strong>${state.ans}</strong>.`
      );
      $summaryAns.text(state.ans);
      return;
    }
    const ev = state.steps[state.cursor++];
    applyStep(ev);

    // Update summary
    $summarySteps.text(`${state.cursor}/${state.steps.length}`);
  }

  // ---------- Setup ----------
  function onSetup() {
    const weights = parseCSVNumbers($weights.val());
    const values = parseCSVNumbers($values.val());
    const Wraw = Number($capacity.val());
    const W = Number.isFinite(Wraw) ? clamp(Math.round(Wraw), 0, 50) : 0;

    if (weights.length !== values.length || weights.length === 0) {
      $statusText.html(
        `<span class="text-danger">Please provide equal-length, non-empty weight and value lists.</span>`
      );
      return;
    }

    if (!Number.isFinite(W)) {
      $statusText.html(`<span class="text-danger">Please provide a valid capacity (W).</span>`);
      return;
    }

    // Build trace
    const trace = buildTrace(weights, values, W);

    // Prepare layout and node states
    const nodesLayout = buildLayout(trace.n, trace.W, trace.steps, trace.edges);
    const nodeStates = {}; // key -> 'active' | 'hit' | 'set' | 'base' | default

    // Build memo table
    renderMemoTable(trace.n, trace.W);

    state = {
      weights, values,
      n: trace.n, W: trace.W,
      steps: trace.steps,
      edges: trace.edges,
      ans: trace.ans,
      memo: trace.memo,
      cursor: 0,
      lastActive: null,
      nodesLayout,
      nodeStates
    };

    // Summary
    $summaryN.text(state.n);
    $summaryW.text(state.W);
    $summarySteps.text(`0/${state.steps.length}`);
    $summaryAns.text('—');

    // Initial draw
    drawTree();
    $statusText.html('Setup complete. Press <strong>Step</strong> to begin.');
  }

  // ---------- Events ----------
  $setupBtn.on('click', onSetup);
  $stepBtn.on('click', stepOnce);

  // ---------- Demo Defaults ----------
  $(function initDefaults() {
    // Friendly defaults
    $weights.val('2,3,4,5');
    $values.val('3,4,5,8');
    $capacity.val('5');
  });
})();
