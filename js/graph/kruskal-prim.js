// =============================
// File: ../js/graph/kruskal-prim.js
// =============================
(function(){
  const $ = window.jQuery;
  const TWO_PI = Math.PI*2;

  const state = {
    n: 0,
    nodes: [],          // {id,x,y}
    edges: [],          // {u,v,w}
    sorted: [],         // indices of edges sorted by weight

    // Kruskal
    uf: null,           // union-find
    kIndex: 0,          // current position in sorted

    // Prim
    primSource: 0,
    inMST: new Set(),   // nodes inside MST
    primPQ: [],         // edges crossing the cut: [{u,v,w}]

    // Shared
    mstEdges: [],       // accepted edges
    rejected: new Set(),
    considerEdge: null, // {u,v,w}

    // stepper
    algo: 'kruskal',    // 'kruskal' | 'prim'
    phase: 'idle',      // 'idle'|'step'

    // render
    canvas: null,
    ctx: null,
  };

  // ---- Helpers ----
  const inf = () => Number.POSITIVE_INFINITY;
  const byWeight = (a,b) => a.w - b.w;

  function setStatus(s){ $('#status').text(s); }

  function clampInt(v,min,max){ v=parseInt(v,10); if(!Number.isInteger(v)) v=min; return Math.max(min, Math.min(max, v)); }

  function parseEdgeList(text){
    return text.split(/\n|\r/).map(s=>s.trim()).filter(Boolean).map(line=>{
      const [u,v,w] = line.split(/\s+/).map(Number);
      return (Number.isInteger(u)&&Number.isInteger(v)&&Number.isFinite(w))? {u,v,w}: null;
    }).filter(Boolean);
  }

  // ---- Union-Find ----
  function UF(n){
    const p = Array(n).fill(0).map((_,i)=>i);
    const r = Array(n).fill(0);
    function find(x){ return p[x]===x? x : (p[x]=find(p[x])); }
    function unite(a,b){ a=find(a); b=find(b); if(a===b) return false; if(r[a]<r[b]) [a,b]=[b,a]; p[b]=a; if(r[a]===r[b]) r[a]++; return true; }
    function same(a,b){ return find(a)===find(b); }
    return {find, unite, same};
  }

  // ---- Layout & Build ----
  function layoutCircular(){
    const cx = state.canvas.width/2, cy=state.canvas.height/2;
    const r = Math.min(cx,cy)-80;
    state.nodes = Array.from({length: state.n}, (_,i)=>{
      const t = (i/state.n)*TWO_PI - Math.PI/2; // start top
      return {id:i, x: cx + r*Math.cos(t), y: cy + r*Math.sin(t)};
    });
  }

  function buildSorted(){
    state.sorted = state.edges.map((e,i)=>({i, ...e})).sort(byWeight);
  }

  function resetCommon(){
    state.mstEdges = [];
    state.rejected.clear();
    state.considerEdge = null;
  }

  function resetKruskal(){
    state.uf = UF(state.n);
    state.kIndex = 0;
    resetCommon();
    state.phase = 'step';
    updateTables();
    draw();
    setStatus('Kruskal initialized. Click Step.');
  }

  function resetPrim(){
    resetCommon();
    state.inMST = new Set();
    state.primPQ = [];
    const s = state.primSource;
    state.inMST.add(s);
    // push all edges from s
    for(const e of state.edges){
      if(e.u===s || e.v===s) state.primPQ.push(e);
    }
    state.phase = 'step';
    updateTables();
    draw();
    setStatus(`Prim initialized at source ${s}. Click Step.`);
  }

  function setupFromInputs(){
    const n = clampInt($('#nodeCount').val(), 2, 50);
    const edges = parseEdgeList($('#edgeList').val()).filter(e=> e.u>=0 && e.v>=0 && e.u<n && e.v<n && e.w>0);

    state.n = n;
    state.edges = edges;
    buildSorted();

    // Prim source (only used when Prim selected)
    state.primSource = clampInt($('#sourceNode').val(), 0, n-1);

    layoutCircular();

    // choose algorithm
    state.algo = $('#algoPrim').is(':checked') ? 'prim' : 'kruskal';
    if(state.algo==='prim') resetPrim(); else resetKruskal();
  }

  // ---- Step logic ----
  function step(){
    if(state.phase!=='step') return;
    if(state.algo==='kruskal') return stepKruskal();
    return stepPrim();
  }

  function stepKruskal(){
    if(state.mstEdges.length === state.n-1){
      state.phase = 'done'; draw(); updateTables(); setStatus('MST complete.'); return;
    }
    if(state.kIndex >= state.sorted.length){ state.phase='done'; setStatus('No more edges.'); return; }

    const rec = state.sorted[state.kIndex++];
    const e = {u:rec.u, v:rec.v, w:rec.w};
    state.considerEdge = e;
    draw();

    if(!state.uf.same(e.u,e.v)){
      state.uf.unite(e.u,e.v);
      state.mstEdges.push(e);
      setStatus(`Kruskal: take edge ${e.u}–${e.v} (w=${e.w}).`);
    } else {
      state.rejected.add(edgeKey(e));
      setStatus(`Kruskal: reject edge ${e.u}–${e.v} (cycle).`);
    }
    updateTables();
    draw();
  }

  function stepPrim(){
    if(state.mstEdges.length === state.n-1){ state.phase='done'; draw(); updateTables(); setStatus('MST complete.'); return; }

    // choose minimum edge crossing the cut (u in MST, v not in MST)
    // filter to valid frontier
    state.primPQ = state.primPQ.filter(e => xor(state.inMST.has(e.u), state.inMST.has(e.v)) );
    if(state.primPQ.length===0){ state.phase='done'; setStatus('No crossing edges available.'); return; }

    state.primPQ.sort(byWeight);
    const e = state.primPQ.shift();
    state.considerEdge = e;
    const uIn = state.inMST.has(e.u);
    const vIn = state.inMST.has(e.v);

    if(uIn && !vIn){
      state.inMST.add(e.v);
      state.mstEdges.push(e);
      enqueueFrom(e.v);
      setStatus(`Prim: add ${e.u}–${e.v} (w=${e.w}), grow to node ${e.v}.`);
    } else if(!uIn && vIn){
      state.inMST.add(e.u);
      state.mstEdges.push(e);
      enqueueFrom(e.u);
      setStatus(`Prim: add ${e.u}–${e.v} (w=${e.w}), grow to node ${e.u}.`);
    } else {
      // both in or both out -> reject
      state.rejected.add(edgeKey(e));
      setStatus('Prim: edge not crossing cut, rejected.');
    }
    updateTables();
    draw();
  }

  function enqueueFrom(x){
    for(const e of state.edges){
      if(e.u===x || e.v===x) state.primPQ.push(e);
    }
  }

  function xor(a,b){ return (a?1:0) ^ (b?1:0); }
  function edgeKey(e){ return `${Math.min(e.u,e.v)}-${Math.max(e.u,e.v)}-${e.w}`; }

  // ---- Drawing ----
  function draw(){
    const ctx = state.ctx; if(!ctx) return;
    const W = state.canvas.width, H = state.canvas.height;
    ctx.clearRect(0,0,W,H);

    // draw all edges base
    for(const e of state.edges){ drawEdge(e, 'base'); }

    // highlight considered
    if(state.considerEdge) drawEdge(state.considerEdge, 'consider');

    // draw MST edges on top
    for(const e of state.mstEdges){ drawEdge(e, 'mst'); }

    // rejected overlay
    for(const e of state.edges){ if(state.rejected.has(edgeKey(e))) drawEdge(e, 'rejected'); }

    // nodes
    for(const n of state.nodes){ drawNode(n.id); }
  }

  function drawEdge(e, mode){
    const a = state.nodes[e.u], b = state.nodes[e.v]; if(!a||!b) return;
    const ctx = state.ctx;
    const dx=b.x-a.x, dy=b.y-a.y; const d=Math.hypot(dx,dy); if(!d) return;
    const ux=dx/d, uy=dy/d; const r=24; // node radius
    const x1=a.x+ux*(r+2), y1=a.y+uy*(r+2);
    const x2=b.x-ux*(r+2), y2=b.y-uy*(r+2);

    ctx.save();
    ctx.lineWidth = mode==='mst'? 4 : mode==='rejected'? 2.5 : mode==='consider'? 3 : 1.5;
    ctx.strokeStyle = mode==='mst'? getCSS('--mst') : mode==='rejected'? getCSS('--rejected') : mode==='consider'? getCSS('--consider') : getCSS('--edge');
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();

    // weight label
    const mx=(x1+x2)/2, my=(y1+y2)/2;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.35)';
    roundedRect(ctx, mx-12, my-10, 24, 20, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#333'; ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(e.w), mx, my);
    ctx.restore();
  }

  function drawNode(id){
    const p = state.nodes[id];
    const ctx = state.ctx; const r=24;

    const inPrim = state.inMST && state.inMST.has(id);

    ctx.save();
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TWO_PI);
    ctx.fillStyle = inPrim? getCSS('--frontier') : '#fff';
    ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#333'; ctx.stroke();

    ctx.fillStyle = '#111'; ctx.font = 'bold 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(id), p.x, p.y-10);

    ctx.restore();
  }

  function roundedRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function getCSS(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#000'; }

  // ---- Tables ----
  function updateTables(){
    // edges table
    const $tb = $('#edgeTable tbody'); $tb.empty();
    const list = state.algo==='kruskal' ? state.sorted.map(e=>({u:e.u,v:e.v,w:e.w})) : state.edges.slice().sort(byWeight);
    list.forEach((e,idx)=>{
      const key = edgeKey(e);
      const inMST = state.mstEdges.some(x=> x.u===e.u && x.v===e.v && x.w===e.w) || state.mstEdges.some(x=> x.u===e.v && x.v===e.u && x.w===e.w);
      const rejected = state.rejected.has(key);
      const isConsider = state.considerEdge && edgeKey(state.considerEdge)===key;
      const badge = inMST? 'bg-success' : rejected? 'bg-danger' : isConsider? 'bg-info text-dark' : 'bg-secondary';
      const label = inMST? 'In MST' : rejected? 'Rejected' : isConsider? 'Considering' : 'Unseen';
      $tb.append(`<tr><td>${idx}</td><td>${e.u}</td><td>${e.v}</td><td>${e.w}</td><td><span class="badge ${badge}">${label}</span></td></tr>`);
    });

    // mst list
    const $ul = $('#mstList'); $ul.empty();
    let total = 0;
    for(const e of state.mstEdges){ $ul.append(`<li>${e.u}–${e.v} (w=${e.w})</li>`); total += e.w; }
    $('#mstWeight').text(total);
  }

  // ---- Auto run ----
  function autoRun(){
    const tick = () => { if(state.phase==='done') return; step(); setTimeout(tick, 300); };
    tick();
  }

  // ---- Events ----
  function addEdgeFromInputs(){
    const u = parseInt($('#edgeU').val(),10), v=parseInt($('#edgeV').val(),10), w=Number($('#edgeW').val());
    if(Number.isInteger(u)&&Number.isInteger(v)&&Number.isFinite(w)){
      const t = $('#edgeList').val();
      $('#edgeList').val((t? t+"\n" : '') + `${u} ${v} ${w}`);
    }
  }
  function clearEdges(){ $('#edgeList').val(''); }

  $(function(){
    state.canvas = document.getElementById('stage');
    state.ctx = state.canvas.getContext('2d');

    $('#algoPrim').on('change',()=>{ $('#primSourceWrap').show(); });
    $('#algoKruskal').on('change',()=>{ $('#primSourceWrap').hide(); });

    $('#btnSetup').on('click', setupFromInputs);
    $('#btnStep').on('click', step);
    $('#btnAuto').on('click', autoRun);
    $('#btnReset').on('click', ()=>{ if(state.algo==='prim') resetPrim(); else resetKruskal(); });
    $('#addEdge').on('click', addEdgeFromInputs);
    $('#clearEdges').on('click', clearEdges);

    // initial
    setupFromInputs();
    setStatus('Ready. Choose algorithm, click Setup, then Step.');

    window.addEventListener('resize', ()=> draw());
  });
})();
