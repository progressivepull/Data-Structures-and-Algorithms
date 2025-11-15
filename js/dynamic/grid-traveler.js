// =============================
// File: ../js/dynamic/grid-traveler.js
// =============================
(function(){
  const $ = window.jQuery;

  const state = {
    m: 0, n: 0,
    blocked: new Set(), // keys: "r,c" (1-indexed)
    memo: new Map(),
    stack: [],          // manual recursion stack of frames
    current: null,      // current frame
    phase: 'idle',      // 'idle'|'step'|'done'

    // canvas
    canvas: null,
    ctx: null,
  };

  // Frame structure for simulation
  // { m, n, stage: 'enter'|'left'|'down'|'combine'|'memo-hit'|'base', leftVal:null, downVal:null }

  function setStatus(s){ $('#status').text(s); }

  function key(r,c){ return `${r},${c}`; }

  function parseBlocked(text){
    const set = new Set();
    const lines = text.split(/\n|\r/).map(s=>s.trim()).filter(Boolean);
    for(const line of lines){
      const [r,c] = line.split(/\s*,\s*/).map(Number);
      if(Number.isInteger(r) && Number.isInteger(c) && r>=1 && c>=1) set.add(key(r,c));
    }
    return set;
  }

  function setupFromInputs(){
    const m = clamp($('#rows').val(),1,50);
    const n = clamp($('#cols').val(),1,50);
    state.m = m; state.n = n;
    state.blocked = parseBlocked($('#blockList').val());
    resetAlgorithm();
  }

  function resetAlgorithm(){
    state.memo.clear();
    state.stack = [];
    state.current = null;
    state.phase = 'step';

    // seed initial frame
    pushFrame({m:state.m, n:state.n, stage:'enter', leftVal:null, downVal:null});
    updateTables();
    draw();
    setStatus('Initialized. Click Step to perform a memoized recursion step.');
  }

  function clamp(v,min,max){ v=parseInt(v,10); if(!Number.isInteger(v)) v=min; return Math.max(min, Math.min(max, v)); }

  function pushFrame(f){ state.stack.push(f); state.current = f; }
  function popFrame(){ const f = state.stack.pop(); state.current = state.stack[state.stack.length-1] || null; return f; }

  function step(){
    if(state.phase==='done' || state.stack.length===0){ setStatus('Completed.'); state.phase='done'; return; }

    const f = state.stack[state.stack.length-1];
    const k = key(f.m, f.n);

    // Base / invalid / blocked
    if(f.stage==='enter'){
      // base cases: (1,1) -> 1; any zero or negative dims -> 0; blocked -> 0
      if(f.m===1 && f.n===1 && !state.blocked.has(key(1,1))){
        f.stage = 'base';
        state.memo.set(k, 1);
        setStatus(`Base case at (1,1): 1 way.`);
        updateTables(); draw();
        return;
      }
      if(f.m<=0 || f.n<=0){
        f.stage = 'base';
        state.memo.set(k, 0);
        setStatus(`Out of bounds at (${f.m},${f.n}): 0 ways.`);
        updateTables(); draw();
        return;
      }
      if(state.blocked.has(k)){
        f.stage = 'base';
        state.memo.set(k, 0);
        setStatus(`Blocked cell at (${f.m},${f.n}): 0 ways.`);
        updateTables(); draw();
        return;
      }
      if(state.memo.has(k)){
        f.stage = 'memo-hit';
        setStatus(`Memo hit for (${f.m},${f.n}) = ${state.memo.get(k)}.`);
        draw();
        return;
      }
      // expand left (m-1,n) first
      f.stage = 'left';
      pushFrame({m:f.m-1, n:f.n, stage:'enter', leftVal:null, downVal:null});
      setStatus(`Exploring left subproblem (${f.m-1},${f.n}).`);
      draw(); updateTables();
      return;
    }

    if(f.stage==='left'){
      // child just finished -> record and go down
      const child = popFrame();
      const val = state.memo.get(key(child.m, child.n));
      f.leftVal = val;
      f.stage = 'down';
      pushFrame({m:f.m, n:f.n-1, stage:'enter', leftVal:null, downVal:null});
      setStatus(`Left (${child.m},${child.n}) = ${val}. Exploring down (${f.m},${f.n-1}).`);
      draw(); updateTables();
      return;
    }

    if(f.stage==='down'){
      const child = popFrame();
      const val = state.memo.get(key(child.m, child.n));
      f.downVal = val;
      f.stage = 'combine';
      setStatus(`Down (${child.m},${child.n}) = ${val}. Combining...`);
      draw(); updateTables();
      return;
    }

    if(f.stage==='combine'){
      const total = (f.leftVal||0) + (f.downVal||0);
      state.memo.set(k, total);
      popFrame(); // finish this frame
      setStatus(`Computed (${f.m},${f.n}) = ${total} (left + down).`);
      draw(); updateTables();
      if(state.stack.length===0){ state.phase='done'; setStatus(`Done. Ways from (${state.m},${state.n}) to (1,1): ${total}`); }
      return;
    }

    if(f.stage==='base' || f.stage==='memo-hit'){
      popFrame();
      updateTables();
      draw();
      if(state.stack.length===0){ state.phase='done'; setStatus('Done.'); }
      return;
    }
  }

  function autoRun(){ const tick=()=>{ if(state.phase==='done') return; step(); setTimeout(tick, 280); }; tick(); }

  // ---- Drawing ----
  function draw(){
    const ctx = state.ctx; if(!ctx) return;
    const W = state.canvas.width, H = state.canvas.height;
    ctx.clearRect(0,0,W,H);

    // Grid sizing
    const pad = 40;
    const m = state.m, n = state.n;
    const cellW = Math.max(18, Math.min(80, Math.floor((W - pad*2)/n)));
    const cellH = Math.max(18, Math.min(80, Math.floor((H - pad*2)/m)));
    const gridW = cellW*n, gridH = cellH*m;
    const x0 = (W-gridW)/2, y0=(H-gridH)/2;

    // draw cells
    for(let r=1; r<=m; r++){
      for(let c=1; c<=n; c++){
        const x = x0 + (c-1)*cellW;
        const y = y0 + (r-1)*cellH;
        const krc = key(r,c);
        const isBlocked = state.blocked.has(krc);
        const inMemo = state.memo.has(krc);
        const visiting = state.current && state.current.m===r && state.current.n===c && (state.current.stage!=='base');
        const isBase = state.current && state.current.m===r && state.current.n===c && state.current.stage==='base';

        // fill
        if(isBlocked){ fillRect(ctx,x,y,cellW,cellH, getCSS('--blocked')); }
        else if(isBase){ fillRect(ctx,x,y,cellW,cellH, getCSS('--base')); }
        else if(visiting){ fillRect(ctx,x,y,cellW,cellH, getCSS('--visiting')); }
        else if(inMemo){ fillRect(ctx,x,y,cellW,cellH, getCSS('--memo')); }

        // outline
        ctx.strokeStyle = getCSS('--grid-line');
        ctx.lineWidth = 1;
        ctx.strokeRect(x,y,cellW,cellH);

        // label
        ctx.fillStyle = '#111';
        ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const val = state.memo.get(krc);
        const text = val!=null? val : '';
        ctx.fillText(text, x + cellW/2, y + cellH/2);

        // coords
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.font = '10px ui-sans-serif, system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`(${r},${c})`, x+3, y+2);
      }
    }

    // axes hints
    ctx.fillStyle = '#555';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('→ increasing columns (n)', W/2, y0-12);
    ctx.save();
    ctx.translate(x0-16, H/2); ctx.rotate(-Math.PI/2);
    ctx.fillText('→ increasing rows (m)', 0,0);
    ctx.restore();
  }

  function fillRect(ctx,x,y,w,h,color){ ctx.save(); ctx.fillStyle=color; ctx.fillRect(x,y,w,h); ctx.restore(); }
  function getCSS(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#000'; }

  // ---- Tables ----
  function updateTables(){
    // stack (top at end)
    const $tb = $('#stackTable tbody'); $tb.empty();
    state.stack.forEach((f, i)=>{
      const label = stageLabel(f.stage);
      const badge = f.stage==='enter'? 'bg-secondary' : f.stage==='left'||f.stage==='down'? 'bg-info text-dark' : f.stage==='combine'? 'bg-primary' : f.stage==='base'? 'bg-warning text-dark' : f.stage==='memo-hit'? 'bg-success' : 'bg-secondary';
      $tb.append(`<tr><td>${i}</td><td>(${f.m},${f.n})</td><td><span class="badge ${badge}">${label}</span></td></tr>`);
    });

    // memo table
    const $mb = $('#memoTable tbody'); $mb.empty();
    const entries = Array.from(state.memo.entries());
    entries.sort((a,b)=>{
      const [ar,ac] = a[0].split(',').map(Number);
      const [br,bc] = b[0].split(',').map(Number);
      return ar-br || ac-bc;
    });
    for(const [k,v] of entries){
      $mb.append(`<tr><td>${k}</td><td>${v}</td></tr>`);
    }
  }

  function stageLabel(s){
    switch(s){
      case 'enter': return 'Enter';
      case 'left': return 'Solve (m-1,n)';
      case 'down': return 'Solve (m,n-1)';
      case 'combine': return 'Combine';
      case 'base': return 'Base';
      case 'memo-hit': return 'Memo hit';
      default: return s;
    }
  }

  // ---- Events ----
  $(function(){
    state.canvas = document.getElementById('stage');
    state.ctx = state.canvas.getContext('2d');

    $('#btnSetup').on('click', setupFromInputs);
    $('#btnStep').on('click', step);
    $('#btnAuto').on('click', autoRun);
    $('#btnReset').on('click', resetAlgorithm);

    // initial
    setupFromInputs();
    setStatus('Ready. Click Setup to initialize, then Step to advance.');

    window.addEventListener('resize', ()=> draw());
  });
})();
