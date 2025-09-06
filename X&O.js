// script.js — polished, modular Tic-Tac-Toe with AI (minimax), undo, confetti, and WebAudio winner sound
(() => {
  // DOM
  const cells = Array.from(document.querySelectorAll('.cell'));
  const modeSelect = document.getElementById('mode');
  const firstSelect = document.getElementById('first');
  const undoBtn = document.getElementById('undoBtn');
  const newBtn = document.getElementById('newBtn');
  const resetBtn = document.getElementById('resetBtn');
  const messageEl = document.getElementById('message');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const overlayNew = document.getElementById('overlayNew');
  const overlayReset = document.getElementById('overlayReset');
  const scoreXEl = document.getElementById('scoreX');
  const scoreOEl = document.getElementById('scoreO');
  const scoreDEl = document.getElementById('scoreD');
  const confettiCanvas = document.getElementById('confetti');

  // Game state
  let board = Array(9).fill(null); // 'X' | 'O' | null
  let current = 'X';
  let history = []; // {index, player}
  let isOver = false;
  let scores = { X:0, O:0, D:0 };

  // Win patterns
  const WIN = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  // Audio
  const audioCtx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;
  function playTone(freq=440, duration=0.12, type='sine') {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    o.stop(audioCtx.currentTime + duration + 0.02);
  }
  function playClick(player) { playTone(player === 'X' ? 620 : 420, 0.06, 'sine'); }
  function playWinner(player) { 
    // small melodic winner sequence
    playTone(player === 'X' ? 880 : 440, 0.16, 'triangle');
    setTimeout(()=> playTone(player === 'X' ? 1100 : 550, 0.12, 'sine'), 180);
  }

  // Utils
  function setMessage(txt) { messageEl.textContent = txt; }
  function saveScores() { try { localStorage.setItem('ttt_scores', JSON.stringify(scores)); } catch(e){} }
  function loadScores() { try { const s = JSON.parse(localStorage.getItem('ttt_scores')); if (s) scores = s; } catch(e){} }
  function renderScores() { scoreXEl.textContent = scores.X; scoreOEl.textContent = scores.O; scoreDEl.textContent = scores.D; }

  // Render board
  function renderBoard() {
    board.forEach((val, idx) => {
      const el = cells[idx];
      el.textContent = val ? val : '';
      el.classList.toggle('x', val === 'X');
      el.classList.toggle('o', val === 'O');
      el.disabled = !!val || isOver;
      el.setAttribute('aria-label', `cell ${idx+1} ${val ? val : 'empty'}`);
    });
  }

  // Check winner/draw
  function checkResult(s = board) {
    for (const p of WIN) {
      const [a,b,c] = p;
      if (s[a] && s[a] === s[b] && s[b] === s[c]) return { winner: s[a], pattern: p, draw: false };
    }
    if (s.every(Boolean)) return { winner: null, pattern: [], draw: true };
    return { winner: undefined, pattern: [], draw: false };
  }

  // Highlight winning pattern
  function highlight(pattern) {
    pattern.forEach(i => cells[i].classList.add('win'));
  }

  // Clear highlight
  function clearHighlights() {
    cells.forEach(c => c.classList.remove('win'));
  }

  // Play move
  function playMove(index, player, record = true) {
    board[index] = player;
    if (record) history.push({ index, player });
    renderBoard();
    playClick(player);
  }

  // Undo
  function undo() {
    if (!history.length || isOver) return;
    const last = history.pop();
    board[last.index] = null;
    current = last.player;
    isOver = false;
    clearHighlights();
    renderBoard();
    setMessage(`Undo — Player ${current}'s turn`);
  }

  // New round (clear board, keep scores)
  function newRound() {
    board = Array(9).fill(null);
    history = [];
    isOver = false;
    clearHighlights();
    current = 'X';
    renderBoard();
    setMessage(`New Round — ${current}'s turn`);
    // If AI should start
    if (isAIMode() && firstSelect.value === 'ai') {
      current = 'O';
      setTimeout(aiMove, 420);
    }
  }

  // Reset all scores + board
  function resetAll() {
    newRound();
    scores = { X:0, O:0, D:0 };
    saveScores(); renderScores();
  }

  // Result handling
  function handleResult(result) {
    isOver = true;
    if (result.winner) {
      highlight(result.pattern);
      scores[result.winner] += 1;
      renderScores(); saveScores();
      showOverlay(`${result.winner} Wins!`, `Player ${result.winner} won this round.`);
      playWinner(result.winner);
      if (result.winner === 'X') confettiBurst();
    } else if (result.draw) {
      scores.D += 1; renderScores(); saveScores();
      showOverlay(`It's a Draw`, `No winner this round.`);
      playTone(260, 0.12);
    }
  }

  // Overlay
  function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden','false');
  }
  function hideOverlay() {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden','true');
  }

  // AI helpers
  function isAIMode() { return modeSelect.value === 'ai-easy' || modeSelect.value === 'ai-hard'; }

  // Easy AI (random)
  function aiMoveEasy() {
    const avail = board.map((v,i)=> v ? null : i).filter(Number.isInteger);
    if (!avail.length) return;
    const choice = avail[Math.floor(Math.random()*avail.length)];
    playMove(choice, 'O');
    const r = checkResult();
    if (r.winner || r.draw) { handleResult(r); return; }
    current = 'X';
    setMessage(`Player X's turn`);
  }

  // Hard AI (minimax)
  function aiMoveHard() {
    const best = minimax(board.slice(), 'O').index;
    if (typeof best !== 'number') {
      aiMoveEasy(); return;
    }
    playMove(best, 'O');
    const r = checkResult();
    if (r.winner || r.draw) { handleResult(r); return; }
    current = 'X';
    setMessage(`Player X's turn`);
  }

  // aiMove wrapper
  function aiMove() {
    if (modeSelect.value === 'ai-easy') aiMoveEasy();
    else aiMoveHard();
  }

  // Minimax algorithm (no alpha-beta needed for 3x3)
  function minimax(newBoard, player) {
    const avail = newBoard.map((v,i)=> v ? null : i).filter(Number.isInteger);
    const res = checkResult(newBoard);
    if (res.winner === 'X') return { score: -10 };
    if (res.winner === 'O') return { score: 10 };
    if (res.draw) return { score: 0 };

    const moves = [];
    for (let i=0;i<avail.length;i++){
      const idx = avail[i];
      const move = { index: idx };
      newBoard[idx] = player;
      if (player === 'O') {
        const result = minimax(newBoard, 'X');
        move.score = result.score;
      } else {
        const result = minimax(newBoard, 'O');
        move.score = result.score;
      }
      newBoard[idx] = null;
      moves.push(move);
    }

    let bestMove;
    if (player === 'O') {
      // maximize
      let bestScore = -Infinity;
      for (let m of moves) {
        if (m.score > bestScore) { bestScore = m.score; bestMove = m; }
      }
    } else {
      // minimize
      let bestScore = +Infinity;
      for (let m of moves) {
        if (m.score < bestScore) { bestScore = m.score; bestMove = m; }
      }
    }
    return bestMove;
  }

  /* -------------------------
     Confetti (lightweight)
  ------------------------- */
  function confettiBurst() {
    const canvas = confettiCanvas;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = innerWidth;
    const H = canvas.height = innerHeight;
    const colors = ['#C49A6C','#EFD9B9','#8B5F3B','#FFD166','#F7E7D0'];
    const particles = [];
    for (let i=0;i<90;i++){
      particles.push({
        x: W/2 + (Math.random()-0.5)*160,
        y: H/3 + (Math.random()-0.5)*60,
        vx: (Math.random()-0.5)*8,
        vy: Math.random()*-8 - 2,
        w: Math.random()*8+4,
        h: Math.random()*6+4,
        col: colors[Math.floor(Math.random()*colors.length)],
        life: Math.random()*70+60,
        rot: Math.random()*Math.PI
      });
    }
    let raf;
    function frame(){
      ctx.clearRect(0,0,W,H);
      particles.forEach(p=>{
        p.x += p.vx; p.y += p.vy; p.vy += 0.24; p.life--; p.rot += 0.12;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore();
      });
      for (let i = particles.length-1;i>=0;i--) if (particles[i].life<=0) particles.splice(i,1);
      if (particles.length) raf = requestAnimationFrame(frame);
      else { ctx.clearRect(0,0,W,H); cancelAnimationFrame(raf); }
    }
    frame();
  }

  /* -------------------------
     Event wiring
  ------------------------- */
  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      if (isOver) return;
      const idx = parseInt(cell.dataset.index,10);
      // If AI mode and it's O's turn, ignore input
      if (isAIMode() && current === 'O') return;
      if (board[idx]) return; // invalid
      playMove(idx, current);
      const r = checkResult();
      if (r.winner || r.draw) { handleResult(r); return; }
      current = (current === 'X') ? 'O' : 'X';
      setMessage(`Player ${current}'s turn`);
      // AI move if applicable
      if (isAIMode() && current === 'O') {
        setTimeout(aiMove, modeSelect.value === 'ai-easy' ? 220 : 420);
      }
    });

    // keyboard accessibility
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); cell.click();
      }
    });
  });

  // Buttons
  undoBtn.addEventListener('click', undo);
  newBtn.addEventListener('click', newRound);
  resetBtn.addEventListener('click', resetAll);
  overlayNew.addEventListener('click', ()=>{ hideOverlay(); newRound(); });
  overlayReset.addEventListener('click', ()=>{ hideOverlay(); resetAll(); });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key,10) - 1; cells[idx]?.click();
    }
    if (e.key === 'u' || e.key === 'U') undo();
    if (e.key === 'n' || e.key === 'N') newRound();
    if (e.key === 'r' || e.key === 'R') resetAll();
  });

  // Mode change: reset board to avoid confusion
  modeSelect.addEventListener('change', () => {
    newRound();
    setMessage(`Mode: ${modeSelect.value}`);
  });
  firstSelect.addEventListener('change', () => newRound());

  // Helper to show/hide overlay
  function hideOverlay() { overlay.classList.add('hidden'); overlay.setAttribute('aria-hidden','true'); }
  function showOverlayTitle(title, text) { overlayTitle.textContent = title; overlayText.textContent = text; overlay.classList.remove('hidden'); overlay.setAttribute('aria-hidden','false'); }

  // Initialize app
  function init() {
    loadScores(); renderScores();
    newRound();
    hideOverlay();
    // If AI should start right away
    if (isAIMode() && firstSelect.value === 'ai') {
      current = 'O';
      setTimeout(aiMove, 500);
    }
    // prepare confetti canvas size
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    window.addEventListener('resize', () => { confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight; });
  }

  // expose small API for debugging
  window.__ttt = { getState: ()=> ({ board, current, isOver, history, scores }), resetAll, newRound };

  // Run init
  init();

  // small improvement: show overlay wrapper using showOverlayTitle to match naming
  function showOverlay(title, text) { showOverlayTitle(title, text); }

})();
