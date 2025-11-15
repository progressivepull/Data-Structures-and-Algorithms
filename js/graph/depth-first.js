/* DFS Visualizer — breadth-first.js (intentionally named as requested)
 * Uses jQuery + Bootstrap + Canvas
 * Directory structure:
 *  - ../lib/jquery-3.7.1.min.js
 *  - ../lib/bootstrap-5.3.8-dist/js/bootstrap.min.js
 *  - ../lib/bootstrap-5.3.8-dist/css/bootstrap.min.css
 *  - ../css/common.css
 *  - ../css/graph/breadth-first.css
 *  - ../js/graph/breadth-first.js   (this file)
 */

(function ($) {
  'use strict';

  // ====== DOM refs ======
  const $nodes = $('#nodesInput');
  const $edges = $('#edgesInput');
  const $start = $('#startInput');
  const $randomize = $('#randomizeLayout');

  const $setup = $('#setupBtn');
  const $step = $('#stepBtn');
  const $reset = $('#resetBtn');

  const $stepCount = $('#stepCount');
  const $stackView = $('#stackView');
  const $doneView = $('#doneView');
  const $currentView = $('#currentView');

  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');

  // ====== Graph & DFS state ======
  let nodes = [];           // [{id, x, y, state}]
  let edges = [];           // [{u, v}]
  let adj = new Map();      // id -> Set(neighbors)

  // Stack holds frames of DFS
  // frame: { id, neighbors: string[], idx: number }
  let stack = [];
  let done = new Set();     // fully explored nodes
  let discovered = new Set(); // in-stack
  let current = null;       // current (top of stack)
  let stepNo = 0;
  let started = false;
  let finished = false;

  const STATE = {
    UNSEEN: 'UNSEEN',
    IN_STACK: 'IN_STACK',
    CURRENT: 'CURRENT',
    DONE: 'DONE'
  };

  const NODE_R = 20;

  // ====== Helpers ======
  function parseNodes(str) {
    return str
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function parseEdges(str) {
    return str
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(pair => {
        const [a, b] = pair.split('-').map(s => s.trim());
        if (!a || !b) return null;
        return { u: a, v: b };
      })
      .filter(Boolean);
  }

  function initAdj(list) {
    adj.clear();
    list.forEach(id => adj.set(id, new Set()));
    edges.forEach(({u, v}) => {
      if (adj.has(u) && adj.has(v)) {
        adj.get(u).add(v);
        adj.get(v).add(u); // undirected
      }
    });
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function layoutNodes(ids, randomize) {
    nodes = [];
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) * 0.35;

    ids.forEach((id, i) => {
      if (randomize) {
        nodes.push({
          id, x: rand(80, W - 80), y: rand(80, H - 80), state: STATE.UNSEEN
        });
      } else {
        const ang = (2 * Math.PI * i) / ids.length;
        nodes.push({
          id,
          x: cx + radius * Math.cos(ang),
          y: cy + radius * Math.sin(ang),
          state: STATE.UNSEEN
        });
      }
    });
  }

  function nodeById(id) {
    return nodes.find(n => n.id === id);
  }

  function setState(id, st) {
    const n = nodeById(id);
    if (n) n.state = st;
  }

  function resetDFS() {
    stack = [];
    done.clear();
    discovered.clear();
    current = null;
    stepNo = 0;
    started = false;
    finished = false;
    nodes.forEach(n => n.state = STATE.UNSEEN);
    updateStatePanel();
    draw();
  }

  function setupDFS() {
    const ids = parseNodes($nodes.val());
    const es = parseEdges($edges.val());
    const s = $start.val().trim();

    if (!ids.length) {
      alert('Please provide at least one node.');
      return;
    }
    if (!ids.includes(s)) {
      alert('Start node must be one of the nodes.');
      return;
    }

    edges = es;
    layoutNodes(ids, $randomize.is(':checked'));
    initAdj(ids);

    resetDFS();

    $step.prop('disabled', false);
    $reset.prop('disabled', false);

    draw();
  }

  // Push a frame onto the stack
  function pushFrame(id) {
    const nbrs = Array.from(adj.get(id) || []).sort();
    stack.push({ id, neighbors: nbrs, idx: 0 });
    discovered.add(id);
    setState(id, STATE.CURRENT);
    current = id;
  }

  function stepDFS() {
    if (finished) return;

    stepNo += 1;

    // First step: push start
    if (!started) {
      const s = $start.val().trim();
      pushFrame(s);
      started = true;
      updateStatePanel();
      draw();
      return;
    }

    // Main DFS step
    if (stack.length === 0) {
      finished = true;
      $step.prop('disabled', true);
      updateStatePanel();
      draw();
      return;
    }

    // Work with top frame
    let top = stack[stack.length - 1];

    // Scan for next unseen neighbor
    let advanced = false;
    while (top.idx < top.neighbors.length) {
      const v = top.neighbors[top.idx++];
      if (!discovered.has(v) && !done.has(v)) {
        // We have a new discovery: demote previous current to IN_STACK
        setState(top.id, STATE.IN_STACK);
        pushFrame(v);           // new top/current
        advanced = true;
        break;
      }
      // else: neighbor already seen/done; continue loop
    }

    if (!advanced) {
      // No more neighbors: this node is DONE; pop and backtrack
      setState(top.id, STATE.DONE);
      done.add(top.id);
      discovered.delete(top.id);
      stack.pop();

      if (stack.length > 0) {
        // New current is the new top
        const newTop = stack[stack.length - 1];
        setState(newTop.id, STATE.CURRENT);
        current = newTop.id;
      } else {
        current = null;
        finished = true;
        $step.prop('disabled', true);
      }
    }

    updateStatePanel();
    draw();
  }

  function updateStatePanel() {
    $stepCount.text(stepNo);

    // Stack view (left -> bottom, rightmost is top)
    $stackView.empty();
    if (stack.length === 0) {
      $stackView.append($('<span class="text-muted">empty</span>'));
    } else {
      stack.forEach((f, i) => {
        const isTop = (i === stack.length - 1);
        const cls = isTop ? 'text-bg-warning' : 'text-bg-info';
        const badge = $('<span/>', { class: `badge rounded-pill ${cls}`, text: f.id });
        $stackView.append(badge);
      });
    }

    // Done view
    $doneView.empty();
    if (done.size === 0) {
      $doneView.append($('<span class="text-muted">none</span>'));
    } else {
      Array.from(done).sort().forEach(id => {
        const badge = $('<span/>', { class: 'badge rounded-pill text-bg-success', text: id });
        $doneView.append(badge);
      });
    }

    // Current
    $currentView.text(current ? current : '—');
  }

  // ====== Drawing ======
  function colorFor(state) {
    switch (state) {
      case STATE.UNSEEN: return '#e9ecef';
      case STATE.IN_STACK: return '#bee5eb';
      case STATE.CURRENT: return '#ffe08a';
      case STATE.DONE: return '#b7f7c6';
      default: return '#e9ecef';
    }
  }

  function inStackEdge(u, v) {
    // highlight if u and v are consecutive on the stack path
    for (let i = 0; i < stack.length - 1; i++) {
      if ((stack[i].id === u && stack[i+1].id === v) ||
          (stack[i].id === v && stack[i+1].id === u)) {
        return true;
      }
    }
    return false;
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Draw edges (base)
    edges.forEach(({u, v}) => {
      const nu = nodeById(u);
      const nv = nodeById(v);
      if (!nu || !nv) return;

      // base style
      let stroke = 'rgba(0,0,0,0.15)';
      let width = 2;

      // emphasize if edge is on the current stack path
      if (inStackEdge(u, v)) {
        stroke = 'rgba(0,0,0,0.45)';
        width = 3;
      }

      // mildly emphasize edges touching current
      if (current && (u === current || v === current)) {
        stroke = 'rgba(0,0,0,0.35)';
        width = Math.max(width, 3);
      }

      ctx.beginPath();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.moveTo(nu.x, nu.y);
      ctx.lineTo(nv.x, nv.y);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(n => {
      // halo for current
      if (n.id === current) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 193, 7, .35)'; // amber halo
        ctx.fill();
      }

      // circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(n.state);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // label
      ctx.font = 'bold 14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
      ctx.fillStyle = '#212529';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.id, n.x, n.y);
    });
  }

  // Make canvas responsive in width (height scales)
  function resizeCanvasToCSS() {
    const cssWidth = canvas.clientWidth;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * scale);
    canvas.height = Math.floor(560 * scale / 960 * cssWidth);
    canvas.style.height = (canvas.height / scale) + 'px';
    canvas.style.width = (canvas.width / scale) + 'px';
    draw();
  }

  // ====== Events ======
  $setup.on('click', setupDFS);
  $step.on('click', stepDFS);
  $reset.on('click', function () {
    resetDFS();
    $step.prop('disabled', false);
  });

  // Enter key convenience
  [$nodes, $edges, $start].forEach($el => {
    $el.on('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setupDFS();
      }
    });
  });

  window.addEventListener('resize', resizeCanvasToCSS);
  resizeCanvasToCSS();

})(jQuery);
