/* BFS Visualizer — breadth-first.js
 * Uses jQuery + Bootstrap + Canvas
 * Directory structure:
 *  - ../lib/jquery-3.7.1.min.js
 *  - ../lib/bootstrap-5.3.8-dist/js/bootstrap.min.js
 *  - ../lib/bootstrap-5.3.8-dist/css/bootstrap.min.css
 *  - ../css/common.css
 *  - ../css/searching/breadth-first.css
 *  - ../js/searching/breadth-first.js   (this file)
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
  const $queueView = $('#queueView');
  const $visitedView = $('#visitedView');
  const $currentView = $('#currentView');

  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');

  // ====== Graph & BFS state ======
  let nodes = [];           // [{id, x, y, state}]
  let edges = [];           // [{u, v}]
  let adj = new Map();      // id -> Set(neighbors)

  let bfsQueue = [];        // array as queue
  let visited = new Set();  // visited set
  let discovered = new Set(); // discovered but not visited
  let current = null;       // current node being expanded
  let stepNo = 0;           // step counter
  let started = false;      // has setup been run?
  let finished = false;     // BFS finished?

  // Node visual states
  const STATE = {
    UNSEEN: 'UNSEEN',
    DISCOVERED: 'DISCOVERED',
    CURRENT: 'CURRENT',
    VISITED: 'VISITED'
  };

  // Layout constants
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

  function resetBFS() {
    bfsQueue = [];
    visited.clear();
    discovered.clear();
    current = null;
    stepNo = 0;
    started = false;
    finished = false;
    nodes.forEach(n => n.state = STATE.UNSEEN);
    updateStatePanel();
    draw();
  }

  function setupBFS() {
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

    // Initialize BFS state
    resetBFS();

    // Prime with start node on first Step or immediately if desired
    started = false;

    $step.prop('disabled', false);
    $reset.prop('disabled', false);

    draw();
  }

  function stepBFS() {
    if (finished) return;

    stepNo += 1;

    // First step: discover start
    if (!started) {
      const s = $start.val().trim();
      bfsQueue.push(s);
      discovered.add(s);
      setState(s, STATE.CURRENT);
      current = s;
      started = true;
      updateStatePanel();
      draw();
      return;
    }

    // Mark current as visited, enqueue neighbors
    if (current !== null) {
      // Current finishes expansion
      setState(current, STATE.VISITED);
      visited.add(current);
      discovered.delete(current);
    }

    // Pop next from queue
    // (On first step, current is already set; now we pop it and push neighbors)
    const u = bfsQueue.shift();

    // Add unseen neighbors
    if (u !== undefined) {
      const nbrs = Array.from(adj.get(u) || []).sort();

      nbrs.forEach(v => {
        if (!visited.has(v) && !discovered.has(v)) {
          discovered.add(v);
          bfsQueue.push(v);
          if (nodeById(v).state === STATE.UNSEEN) {
            setState(v, STATE.DISCOVERED);
          }
        }
      });
    }

    // Set new current (next in queue)
    if (bfsQueue.length > 0) {
      current = bfsQueue[0];
      setState(current, STATE.CURRENT);
    } else {
      current = null;
      finished = true;
      $step.prop('disabled', true);
    }

    updateStatePanel();
    draw();
  }

  function updateStatePanel() {
    $stepCount.text(stepNo);

    // Queue
    $queueView.empty();
    bfsQueue.forEach(id => {
      const badge = $('<span/>', { class: 'badge rounded-pill text-bg-info', text: id });
      $queueView.append(badge);
    });
    if (bfsQueue.length === 0) {
      $queueView.append($('<span class="text-muted">empty</span>'));
    }

    // Visited
    $visitedView.empty();
    if (visited.size === 0) {
      $visitedView.append($('<span class="text-muted">none</span>'));
    } else {
      Array.from(visited).sort().forEach(id => {
        const badge = $('<span/>', { class: 'badge rounded-pill text-bg-success', text: id });
        $visitedView.append(badge);
      });
    }

    // Current
    $currentView.text(current ? current : '—');
  }

  // ====== Drawing ======
  function colorFor(state) {
    switch (state) {
      case STATE.UNSEEN: return '#e9ecef';
      case STATE.DISCOVERED: return '#bee5eb';
      case STATE.CURRENT: return '#ffe08a';
      case STATE.VISITED: return '#b7f7c6';
      default: return '#e9ecef';
    }
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Draw edges first (light gray), highlight edges related to current
    ctx.lineWidth = 2;

    edges.forEach(({u, v}) => {
      const nu = nodeById(u);
      const nv = nodeById(v);
      if (!nu || !nv) return;

      let stroke = 'rgba(0,0,0,0.15)';
      let width = 2;

      if (current && (u === current || v === current)) {
        stroke = 'rgba(0,0,0,0.35)';
        width = 3;
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

  // Make canvas responsive in width (height fixed for clarity)
  function resizeCanvasToCSS() {
    // Keep CSS-driven width, maintain internal bitmap crispness
    const cssWidth = canvas.clientWidth;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * scale);
    canvas.height = Math.floor(560 * scale / 960 * cssWidth); // keep aspect ratio
    canvas.style.height = (canvas.height / scale) + 'px';
    canvas.style.width = (canvas.width / scale) + 'px';
    draw();
  }

  // ====== Events ======
  $setup.on('click', setupBFS);
  $step.on('click', stepBFS);
  $reset.on('click', function () {
    resetBFS();
    $step.prop('disabled', false);
  });

  // Enter key convenience
  [$nodes, $edges, $start].forEach($el => {
    $el.on('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setupBFS();
      }
    });
  });

  // Initial draw + resize binding
  window.addEventListener('resize', resizeCanvasToCSS);
  resizeCanvasToCSS();

})(jQuery);
