/* Tooltip-like weight labels on edges use canvas, but keep a hint style here if needed */


// =============================
// File: ../js/graph/dijkstra.js
// Core logic and rendering for the Dijkstra visualizer. Place this file at: ../js/graph/dijkstra.js
// =============================
(function(){
  const $ = window.jQuery;
  const TWO_PI = Math.PI * 2;

  // --- State ---
  const state = {
    n: 0,
    nodes: [],              // {id, x, y}
    edges: [],              // {u,v,w}
    adj: [],                // adjacency list: [ {to, w} ] per node
    undirected: true,

    // Dijkstra
    source: 0,
    dist: [],               // distances
    prev: [],               // previous node in path
    settled: new Set(),     // finalized nodes
    frontier: new Set(),    // discovered nodes not yet settled
    pq: [],                 // simple array priority queue: [node]

    // Stepper
    stepPhase: 'idle',      // 'idle' | 'selectMin' | 'relax' | 'done'
    current: null,          // current node being processed
    neighborList: [],
    neighborIndex: 0,

    // Rendering
    canvas: null,
    ctx: null,
  };

  // --- Helpers ---
  const inf = () => Number.POSITIVE_INFINITY;

  function resetAlgorithm(){
    state.dist = Array(state.n).fill(inf());
    state.prev = Array(state.n).fill(null);
    state.settled.clear();
    state.frontier.clear();
    state.pq = [];
    state.stepPhase = 'selectMin';
    state.current = null;
    state.neighborList = [];
    state.neighborIndex = 0;
    if(state.n > 0){
      state.dist[state.source] = 0;
      state.frontier.add(state.source);
      state.pq.push(state.source);
    }
    updateDistTable();
    draw();
    setStatus('Initialized. Click "Step" to advance.');
  }

  function setStatus(msg){
    $('#status').text(msg);
  }

  function compareDist(a,b){
    const da = state.dist[a];
    const db = state.dist[b];
    if(da === db) return a - b;
    return da - db;
  }

  function pqExtractMin(){
    if(state.pq.length === 0) return null;
    state.pq.sort(compareDist);
    return state.pq.shift();
  }

  function pqMaybeAdd(v){
    if(!state.frontier.has(v) && !state.settled.has(v)){
      state.frontier.add(v);
      state.pq.push(v);
    }
  }

  function buildAdj(){
    state.adj = Array.from({length: state.n}, () => []);
    for(const e of state.edges){
      state.adj[e.u].push({to:e.v, w:e.w});
      if(state.undirected){
        state.adj[e.v].push({to:e.u, w:e.w});
      }
    }
  }

  function layoutCircular(){
    // Place nodes evenly on a circle
    const cx = state.canvas.width/2;
    const cy = state.canvas.height/2;
    const r = Math.min(cx, cy) - 80;
    state.nodes = Array.from({length: state.n}, (_,i)=>{
      const t = (i/state.n)*TWO_PI - Math.PI/2; // start at top
      return { id:i, x: cx + r*Math.cos(t), y: cy + r*Math.sin(t) };
    });
  }

  function parseEdgeList(text){
    const lines = text.split(/\n|\r/).map(s=>s.trim()).filter(Boolean);
    const edges = [];
    for(const line of lines){
      const parts = line.split(/\s+/);
      if(parts.length < 3) continue;
      const [uStr, vStr, wStr] = parts;
      const u = parseInt(uStr,10);
      const v = parseInt(vStr,10);
      const w = Number(wStr);
      if(Number.isInteger(u) && Number.isInteger(v) && Number.isFinite(w)){
        edges.push({u,v,w});
      }
    }
    return edges;
  }

  function toHex(n){
    return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2,'0');
  }

  function colorMix(a,b,t){
    // a,b as hex strings "#rrggbb"
    const ah=parseInt(a.slice(1),16), bh=parseInt(b.slice(1),16);
    const ar=(ah>>16)&255, ag=(ah>>8)&255, ab=ah&255;
    const br=(bh>>16)&255, bg=(bh>>8)&255, bb=bh&255;
    const r=ar+(br-ar)*t, g=ag+(bg-ag)*t, bl=ab+(bb-ab)*t;
    return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
  }

  // --- Drawing ---
  function draw(){
    const ctx = state.ctx; if(!ctx) return;
    const W = state.canvas.width, H = state.canvas.height;
    ctx.clearRect(0,0,W,H);

    // Edges
    for(const e of state.edges){
      drawEdge(e);
    }

    // Current relaxation edge highlight
    if(state.stepPhase === 'relax' && state.current != null){
      const u = state.current;
      const nb = state.neighborList[state.neighborIndex-1];
      if(nb){ drawEdge({u, v: nb.to, w: nb.w}, true); }
    }

    // Nodes
    for(const node of state.nodes){
      drawNode(node.id);
    }
  }

  function drawEdge(e, highlight=false){
    const ctx = state.ctx;
    const a = state.nodes[e.u];
    const b = state.nodes[e.v];
    if(!a || !b) return;
    const {x: x1, y: y1} = a; const {x: x2, y: y2} = b;

    const dx = x2-x1, dy = y2-y1;
    const dist = Math.hypot(dx,dy);
    if(dist === 0) return;
    const ux = dx/dist, uy = dy/dist;

    // shorten so it doesn't enter node circles
    const r = 24; // node radius
    const sx = x1 + ux*(r+2);
    const sy = y1 + uy*(r+2);
    const tx = x2 - ux*(r+2);
    const ty = y2 - uy*(r+2);

    ctx.save();
    ctx.lineWidth = highlight? 3 : 1.5;
    ctx.strokeStyle = highlight? getCSS('--current') : getCSS('--edge');
    ctx.beginPath();
    ctx.moveTo(sx,sy);
    ctx.lineTo(tx,ty);
    ctx.stroke();

    // arrow head for directed graphs only
    if(!state.undirected){
      const ah = 8;
      ctx.beginPath();
      ctx.moveTo(tx,ty);
      ctx.lineTo(tx - ux*ah - uy*ah*0.6, ty - uy*ah + ux*ah*0.6);
      ctx.lineTo(tx - ux*ah + uy*ah*0.6, ty - uy*ah - ux*ah*0.6);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }

    // weight label at midpoint
    const mx = (sx+tx)/2, my=(sy+ty)/2;
    const label = String(e.w);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    roundedRect(ctx, mx-12, my-10, 24, 20, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);

    ctx.restore();
  }

  function drawNode(id){
    const ctx = state.ctx;
    const p = state.nodes[id];
    const r = 24;

    const isSettled = state.settled.has(id);
    const isFrontier = state.frontier.has(id) && !isSettled;
    const isCurrent = state.current === id && state.stepPhase !== 'done';

    const fill = isSettled ? getCSS('--settled') : isCurrent ? getCSS('--current') : '#fff';
    const stroke = isFrontier ? getCSS('--frontier') : '#333';
    const lineWidth = isFrontier ? 3 : 1.5;

    ctx.save();
    // node body
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TWO_PI);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();

    // id label
    ctx.fillStyle = isSettled ? '#fff' : '#111';
    ctx.font = 'bold 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(id), p.x, p.y - 10);

    // dist label
    const d = state.dist[id];
    const ds = (d === Infinity ? '∞' : d.toString());
    ctx.fillStyle = '#333';
    ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial';
    ctx.fillText(ds, p.x, p.y + 10);

    ctx.restore();
  }

  function roundedRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  function getCSS(varName){
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#000';
  }

  function updateDistTable(){
    const $tb = $('#distTable tbody');
    $tb.empty();
    for(let i=0;i<state.n;i++){
      const d = state.dist[i];
      const prev = state.prev[i];
      const st = state.settled.has(i) ? 'settled' : state.frontier.has(i) ? 'frontier' : 'unseen';
      const label = st.charAt(0).toUpperCase() + st.slice(1);
      const badge = st==='settled'? 'bg-success' : st==='frontier' ? 'bg-warning text-dark' : 'bg-secondary';
      $tb.append(`
        <tr>
          <td><code>${i}</code></td>
          <td>${d===Infinity? '&infin;' : d}</td>
          <td>${prev==null? '—' : `<code>${prev}</code>`}</td>
          <td><span class="badge ${badge}">${label}</span></td>
        </tr>`);
    }
  }

  // --- Dijkstra step machine ---
  function step(){
    if(state.stepPhase === 'done' || state.n === 0){
      setStatus('Completed.');
      return;
    }

    if(state.stepPhase === 'selectMin'){
      const u = pqExtractMin();
      if(u == null){
        state.stepPhase = 'done';
        draw();
        updateDistTable();
        setStatus('No more nodes reachable. Done.');
        return;
      }
      if(state.settled.has(u)){
        // Skip already-settled duplicates in PQ
        return step();
      }
      state.current = u;
      state.settled.add(u);
      state.frontier.delete(u);
      state.neighborList = state.adj[u] || [];
      state.neighborIndex = 0;
      state.stepPhase = 'relax';
      draw();
      updateDistTable();
      setStatus(`Selected node ${u} with smallest distance ${state.dist[u]}.`);
      return;
    }

    if(state.stepPhase === 'relax'){
      const u = state.current;
      if(state.neighborIndex >= state.neighborList.length){
        // done with this node
        state.stepPhase = 'selectMin';
        state.current = null;
        draw();
        updateDistTable();
        setStatus('Finished relaxing neighbors. Selecting next min...');
        return;
      }

      const nb = state.neighborList[state.neighborIndex++];
      const v = nb.to, w = nb.w;
      const alt = state.dist[u] + w;
      const didRelax = alt < state.dist[v];
      if(didRelax){
        state.dist[v] = alt;
        state.prev[v] = u;
        pqMaybeAdd(v);
        draw(); // highlight current edge
        updateDistTable();
        setStatus(`Relaxed edge ${u}→${v} (w=${w}). New dist[${v}] = ${alt}.`);
      } else {
        draw();
        updateDistTable();
        setStatus(`Checked edge ${u}→${v} (w=${w}). No improvement.`);
      }
      return;
    }
  }

  function autoRun(){
    // Run until done with a small delay
    const tick = () => {
      if(state.stepPhase === 'done') return;
      step();
      setTimeout(tick, 300);
    };
    tick();
  }

  // --- Setup / Reset ---
  function setupFromInputs(){
    const n = clampInt($('#nodeCount').val(), 2, 50);
    const source = clampInt($('#sourceNode').val(), 0, n-1);
    const undirected = $('#undirected').is(':checked');

    const text = $('#edgeList').val();
    const edges = parseEdgeList(text).filter(e=> e.u>=0 && e.u<n && e.v>=0 && e.v<n && e.w>0);

    state.n = n;
    state.source = source;
    state.undirected = undirected;
    state.edges = edges;

    buildAdj();
    layoutCircular();
    resetAlgorithm();
  }

  function clampInt(val, min, max){
    let x = parseInt(val,10);
    if(!Number.isInteger(x)) x = min;
    return Math.max(min, Math.min(max, x));
  }

  function addEdgeFromInputs(){
    const u = parseInt($('#edgeU').val(),10);
    const v = parseInt($('#edgeV').val(),10);
    const w = Number($('#edgeW').val());
    if(Number.isInteger(u) && Number.isInteger(v) && Number.isFinite(w)){
      const line = `${u} ${v} ${w}`;
      const t = $('#edgeList').val();
      $('#edgeList').val((t? t+"\n" : '') + line);
    }
  }

  function clearEdges(){
    $('#edgeList').val('');
  }

  // --- Init DOM ---
  $(function(){
    state.canvas = document.getElementById('stage');
    state.ctx = state.canvas.getContext('2d');

    // Hook up events
    $('#btnSetup').on('click', setupFromInputs);
    $('#btnStep').on('click', step);
    $('#btnAuto').on('click', autoRun);
    $('#btnReset').on('click', () => { resetAlgorithm(); });
    $('#addEdge').on('click', addEdgeFromInputs);
    $('#clearEdges').on('click', clearEdges);

    // Initial auto-setup
    setupFromInputs();
    setStatus('Ready. Click Setup to initialize, then Step to advance.');

    // Resize handling (keep canvas logical size but scale to fit)
    const resize = () => { draw(); };
    window.addEventListener('resize', resize);
  });

  })();