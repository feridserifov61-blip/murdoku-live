(() => {
  const params = new URLSearchParams(window.location.search);
  const isOverlay = params.get('overlay') === '1';
  if (isOverlay) document.body.classList.add('overlay-mode');

  const socket = io({ query: { overlay: isOverlay ? '1' : '0' } });
  const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const el = {
    roundChip: document.getElementById('roundChip'),
    mapTitle: document.getElementById('mapTitle'),
    timerPill: document.getElementById('timerPill'),
    timeLeft: document.getElementById('timeLeft'),
    likePct: document.getElementById('likePct'),
    castGrid: document.getElementById('castGrid'),
    mapCanvas: document.getElementById('mapCanvas'),
    fxCanvas: document.getElementById('fxCanvas'),
    roundOverlay: document.getElementById('roundOverlay'),
    overlayBadge: document.getElementById('overlayBadge'),
    overlayCulprit: document.getElementById('overlayCulprit'),
    overlaySub: document.getElementById('overlaySub'),
    feedText: document.getElementById('feedText'),
    overlayMusicBadge: document.getElementById('overlayMusicBadge'),
    liveBadge: document.getElementById('liveBadge'),
    lbList: document.getElementById('lbList'),
    bgAudioEl: document.getElementById('bgAudioEl'),
    ytPlayerBox: document.getElementById('ytPlayerBox'),
    // Host studio
    obsUrlInput: document.getElementById('obsUrlInput'),
    btnCopyUrl: document.getElementById('btnCopyUrl'),
    secretCulprit: document.getElementById('secretCulprit'),
    secretCoords: document.getElementById('secretCoords'),
    tiktokUserInput: document.getElementById('tiktokUserInput'),
    btnConnect: document.getElementById('btnConnect'),
    btnDisconnect: document.getElementById('btnDisconnect'),
    hostStatus: document.getElementById('hostStatus'),
    btnRevealHint: document.getElementById('btnRevealHint'),
    btnNextPuzzle: document.getElementById('btnNextPuzzle'),
    btnToggleBots: document.getElementById('btnToggleBots'),
    btnResetScores: document.getElementById('btnResetScores'),
    testCmdInput: document.getElementById('testCmdInput'),
    btnSendTestCmd: document.getElementById('btnSendTestCmd'),
    cmdFeedback: document.getElementById('cmdFeedback'),
    musicNowLabel: document.getElementById('musicNowLabel'),
    btnMusicPlayPause: document.getElementById('btnMusicPlayPause'),
    btnMusicLoop: document.getElementById('btnMusicLoop'),
    musicVolume: document.getElementById('musicVolume'),
    volVal: document.getElementById('volVal'),
    chkOverlayMusic: document.getElementById('chkOverlayMusic'),
    musicFileInput: document.getElementById('musicFileInput'),
    btnUploadMusic: document.getElementById('btnUploadMusic'),
    uploadStatus: document.getElementById('uploadStatus'),
    musicUrlInput: document.getElementById('musicUrlInput'),
    btnApplyMusicUrl: document.getElementById('btnApplyMusicUrl'),
    urlStatus: document.getElementById('urlStatus')
  };

  if (el.obsUrlInput) el.obsUrlInput.value = `${window.location.origin}/?overlay=1`;

  // ==================== ILLUSTRATED SVG PORTRAIT GENERATOR ====================
  function renderPortraitSvg(actor, isWitness) {
    const bg = isWitness ? '#fecdd3' : '#dbeafe';
    const hairPath = actor.hairStyle === 'long' || actor.hairStyle === 'wavy'
      ? `<path d="M16 32 Q16 10 32 10 Q48 10 48 32 L50 50 L14 50 Z" fill="${actor.hair}"/>`
      : actor.hairStyle === 'bob'
      ? `<path d="M16 30 Q16 10 32 10 Q48 10 48 30 Q49 42 44 44 L20 44 Q15 42 16 30 Z" fill="${actor.hair}"/>`
      : actor.hairStyle === 'bun'
      ? `<circle cx="32" cy="10" r="7" fill="${actor.hair}"/><path d="M18 28 Q18 11 32 11 Q46 11 46 28 Z" fill="${actor.hair}"/>`
      : actor.hairStyle === 'quiff'
      ? `<path d="M18 27 Q17 12 32 10 Q47 11 46 27 Q40 18 24 20 Z" fill="${actor.hair}"/>`
      : `<path d="M18 28 Q18 11 32 11 Q46 11 46 28 Q40 19 32 19 Q24 19 18 28 Z" fill="${actor.hair}"/>`;

    const beardSvg = actor.beard
      ? `<path d="M21 34 Q21 47 32 48 Q43 47 43 34 Q39 38 32 38 Q25 38 21 34 Z" fill="${actor.hair}" opacity="0.9"/>`
      : '';

    const glassesSvg = actor.glasses
      ? `<rect x="21" y="25" width="9" height="6" rx="1.8" fill="rgba(255,255,255,0.28)" stroke="#0f172a" stroke-width="1.8"/>
         <rect x="34" y="25" width="9" height="6" rx="1.8" fill="rgba(255,255,255,0.28)" stroke="#0f172a" stroke-width="1.8"/>
         <line x1="30" y1="28" x2="34" y2="28" stroke="#0f172a" stroke-width="1.8"/>`
      : '';

    return `<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="${bg}"/>
      ${hairPath}
      <path d="M12 64 Q14 48 32 48 Q50 48 52 64 Z" fill="${actor.shirt}"/>
      <path d="M26 48 L32 54 L38 48 Z" fill="#ffffff" opacity="0.85"/>
      <rect x="27" y="40" width="10" height="10" rx="4" fill="${actor.skin}"/>
      <ellipse cx="32" cy="30" rx="12" ry="14" fill="${actor.skin}"/>
      ${beardSvg}
      <circle cx="26.5" cy="28" r="1.7" fill="#0f172a"/>
      <circle cx="37.5" cy="28" r="1.7" fill="#0f172a"/>
      ${glassesSvg}
      <path d="M28 36 Q32 38 36 36" fill="none" stroke="#9a3412" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }

  // ==================== ARCHITECTURAL 6x6 MAP ILLUSTRATOR ====================
  function drawObject(ctx, obj, cellX, cellY, cs, pad) {
    if (obj.hiddenPart) return;
    const span = obj.spanCols || 1;
    const w = cs * span;
    const h = cs;
    const x = cellX;
    const y = cellY;
    const t = obj.type;

    ctx.save();
    if (t === 'car') {
      const m = cs * 0.1;
      const cw = w - m * 2;
      const ch = h - m * 1.8;
      const cx = x + m;
      const cy = y + m * 0.9;
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath(); ctx.roundRect(cx + 2, cy + 3, cw, ch, cs * 0.2); ctx.fill();
      ctx.fillStyle = obj.color || '#818cf8';
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, cs * 0.22); ctx.fill(); ctx.stroke();
      // Windshield + roof + rear window
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.roundRect(cx + cw * 0.22, cy + ch * 0.14, cw * 0.52, ch * 0.72, cs * 0.1); ctx.fill();
      ctx.fillStyle = obj.color || '#818cf8';
      ctx.beginPath(); ctx.roundRect(cx + cw * 0.34, cy + ch * 0.2, cw * 0.3, ch * 0.6, cs * 0.06); ctx.fill();
      // Headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx + cw - 4, cy + ch * 0.18, 4, ch * 0.18);
      ctx.fillRect(cx + cw - 4, cy + ch * 0.64, 4, ch * 0.18);
    } else if (t === 'oil' || t === 'puddle') {
      ctx.fillStyle = t === 'oil' ? '#1e293b' : '#38bdf8';
      ctx.globalAlpha = t === 'oil' ? 0.92 : 0.72;
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5, y + h * 0.52, cs * 0.34, cs * 0.24, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + w * 0.3, y + h * 0.64, cs * 0.14, cs * 0.1, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t === 'oil' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(x + w * 0.44, y + h * 0.45, cs * 0.12, cs * 0.05, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (t === 'chair') {
      const m = cs * 0.18;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.roundRect(x + m + 2, y + m + 2, cs - m * 2, cs - m * 2, 6); ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(x + m, y + m, cs - m * 2, cs - m * 2, 6); ctx.fill(); ctx.stroke();
      // Backrest & armrests
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x + m + 3, y + m + 2, cs - m * 2 - 6, cs * 0.16);
      ctx.fillRect(x + m + 2, y + m + 4, cs * 0.12, cs * 0.45);
      ctx.fillRect(x + cs - m - cs * 0.12 - 2, y + m + 4, cs * 0.12, cs * 0.45);
    } else if (t === 'sofa') {
      const m = cs * 0.14;
      ctx.fillStyle = obj.color || '#38bdf8';
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.roundRect(x + m, y + m * 1.1, w - m * 2, h - m * 2.2, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(15,23,42,0.25)';
      ctx.fillRect(x + m + 4, y + m * 1.1 + 3, w - m * 2 - 8, h * 0.18);
    } else if (t === 'bed') {
      const m = cs * 0.12;
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.roundRect(x + m, y + m, w - m * 2, h - m * 2, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = obj.color || '#facc15';
      ctx.fillRect(x + m + w * 0.28, y + m + 2, w - m * 2 - w * 0.28 - 2, h - m * 2 - 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x + m + 4, y + m + 5, cs * 0.22, h * 0.32);
      ctx.fillRect(x + m + 4, y + h - m - h * 0.37, cs * 0.22, h * 0.32);
    } else if (t === 'rug') {
      const m = cs * 0.14;
      ctx.fillStyle = '#b91c1c';
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.roundRect(x + m, y + m, cs - m * 2, cs - m * 2, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
      ctx.strokeRect(x + m + 4, y + m + 4, cs - m * 2 - 8, cs - m * 2 - 8);
    } else if (t === 'safe_tile') {
      const m = cs * 0.18;
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x + m, y + m, cs - m * 2, cs - m * 2, 5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + cs * 0.5, y + cs * 0.5, cs * 0.16, 0, Math.PI * 2); ctx.stroke();
    } else if (t === 'table' || t === 'counter') {
      const m = cs * 0.1;
      ctx.fillStyle = t === 'counter' ? '#78350f' : '#475569';
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.roundRect(x + m, y + m, cs - m * 2, cs - m * 2, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = t === 'counter' ? '#d97706' : '#cbd5e1';
      ctx.fillRect(x + cs * 0.28, y + cs * 0.28, cs * 0.28, cs * 0.2);
    } else if (t === 'shelf') {
      const m = cs * 0.12;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.roundRect(x + m, y + m, cs - m * 2, cs - m * 2, 4); ctx.fill(); ctx.stroke();
      const colors = ['#38bdf8', '#facc15', '#f43f5e', '#4ade80'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(x + m + 4 + i * ((cs - m * 2 - 8) / 4), y + m + 4, (cs - m * 2 - 12) / 4, cs * 0.28);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + m + 4 + i * ((cs - m * 2 - 8) / 4), y + cs * 0.55, (cs - m * 2 - 12) / 4, cs * 0.24);
      }
    } else if (t === 'tv' || t === 'monitor') {
      const m = cs * 0.14;
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.roundRect(x + m, y + m, cs - m * 2, cs - m * 2, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = t === 'tv' ? '#0f172a' : '#0284c7';
      ctx.fillRect(x + m + 4, y + m + 4, cs - m * 2 - 8, cs * 0.45);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + m + 6, y + m + 6, cs * 0.2, 2);
    } else if (t === 'plant') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.arc(x + cs * 0.5 + 2, y + cs * 0.5 + 2, cs * 0.34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#15803d';
      for (let a = 0; a < 6; a++) {
        const ang = (a * Math.PI) / 3;
        ctx.beginPath();
        ctx.ellipse(x + cs * 0.5 + Math.cos(ang) * cs * 0.14, y + cs * 0.5 + Math.sin(ang) * cs * 0.14, cs * 0.18, cs * 0.09, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#4ade80';
      ctx.beginPath(); ctx.arc(x + cs * 0.5, y + cs * 0.5, cs * 0.12, 0, Math.PI * 2); ctx.fill();
    } else if (t === 'statue') {
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(x + cs * 0.5, y + cs * 0.5, cs * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(x + cs * 0.5, y + cs * 0.5, cs * 0.15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  let latestState = null;

  function drawMap() {
    const canvas = el.mapCanvas;
    if (!canvas || !latestState || !latestState.map) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const labelPad = Math.round(Math.min(w, h) * 0.085);
    const gridSize = Math.floor(Math.min(w - labelPad - 6, h - labelPad - 6));
    const cs = gridSize / 6;
    const ox = Math.round((w - gridSize + labelPad * 0.4) * 0.5);
    const oy = Math.round((h - gridSize + labelPad * 0.45) * 0.5);

    const map = latestState.map;

    // Column headers A..F & Row headers 1..6
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `900 ${Math.round(labelPad * 0.62)}px Montserrat, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 6; i++) {
      ctx.fillText(COLS[i], ox + (i + 0.5) * cs, oy - labelPad * 0.45);
      ctx.fillText(String(i + 1), ox - labelPad * 0.48, oy + (i + 0.5) * cs);
    }

    // 1. Room checkerboard floor tiles
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const rm = map.rooms[map.grid[r][c]];
        ctx.fillStyle = (r + c) % 2 === 0 ? rm.bg : rm.tile;
        ctx.fillRect(ox + c * cs, oy + r * cs, cs + 0.5, cs + 0.5);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox + c * cs, oy + r * cs, cs, cs);
      }
    }

    // 2. Objects
    (map.objects || []).forEach((obj) => {
      drawObject(ctx, obj, ox + obj.c * cs, oy + obj.r * cs, cs);
    });

    // 3. Room walls with open doorways
    const doorSet = new Set();
    (map.doors || []).forEach(([r1, c1, r2, c2]) => {
      doorSet.add(`${r1},${c1}|${r2},${c2}`);
      doorSet.add(`${r2},${c2}|${r1},${c1}`);
    });

    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = Math.max(3, cs * 0.085);
    ctx.lineCap = 'square';
    ctx.strokeRect(ox, oy, gridSize, gridSize);

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const cur = map.grid[r][c];
        if (c + 1 < 6 && map.grid[r][c + 1] !== cur && !doorSet.has(`${r},${c}|${r},${c + 1}`)) {
          ctx.beginPath();
          ctx.moveTo(ox + (c + 1) * cs, oy + r * cs);
          ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs);
          ctx.stroke();
        }
        if (r + 1 < 6 && map.grid[r + 1][c] !== cur && !doorSet.has(`${r},${c}|${r + 1},${c}`)) {
          ctx.beginPath();
          ctx.moveTo(ox + c * cs, oy + (r + 1) * cs);
          ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs);
          ctx.stroke();
        }
      }
    }

    // 4. Room Name Pills
    Object.values(map.rooms).forEach((rm) => {
      const [lr, lc] = rm.labelAt || [0, 0];
      const lx = ox + (lc + 0.5) * cs;
      const ly = oy + (lr + 0.85) * cs;
      ctx.font = `900 ${Math.max(9, Math.round(cs * 0.19))}px Montserrat, sans-serif`;
      const tw = ctx.measureText(rm.name).width + 10;
      const th = Math.max(13, cs * 0.27);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2, ly - th / 2, tw, th, 999);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rm.name, lx, ly + 0.5);
    });

    // 5. Sudoku X marks for placed rows/columns & Placed People Pins
    const people = [...(latestState.suspects || []), latestState.witness].filter(Boolean);
    const blockedRow = Array(6).fill(false);
    const blockedCol = Array(6).fill(false);
    const occupiedCell = new Set();

    people.forEach((p) => {
      if (p.placed) {
        blockedRow[p.placed.r] = true;
        blockedCol[p.placed.c] = true;
        occupiedCell.add(`${p.placed.r},${p.placed.c}`);
      }
    });

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if ((blockedRow[r] || blockedCol[c]) && !occupiedCell.has(`${r},${c}`)) {
          const cx = ox + (c + 0.5) * cs;
          const cy = oy + (r + 0.5) * cs;
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.lineWidth = 2;
          const d = cs * 0.16;
          ctx.beginPath();
          ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
          ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d);
          ctx.stroke();
        }
      }
    }

    const culpritIdx = latestState.revealedSolution ? latestState.revealedSolution.culpritIdx : -1;
    people.forEach((p, idx) => {
      if (!p.placed) return;
      const cx = ox + (p.placed.c + 0.5) * cs;
      const cy = oy + (p.placed.r + 0.5) * cs;
      const isWitness = idx === 5;
      const isCulprit = idx === culpritIdx;
      const rad = cs * 0.36;

      ctx.save();
      ctx.fillStyle = isCulprit ? '#dc2626' : (isWitness ? '#be123c' : p.shirt);
      ctx.strokeStyle = isCulprit ? '#fef08a' : '#ffffff';
      ctx.lineWidth = isCulprit ? 3 : 2.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.round(cs * 0.3)}px Montserrat, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isWitness ? 'Ş' : String(p.number), cx, cy - cs * 0.04);

      ctx.font = `800 ${Math.max(8, Math.round(cs * 0.17))}px Inter, sans-serif`;
      ctx.fillStyle = '#fef08a';
      ctx.fillText(p.name.slice(0, 6), cx, cy + cs * 0.22);
      ctx.restore();
    });
  }

  // ==================== CONFETTI & SFX ====================
  const confetti = [];
  function burstConfetti(n = 80) {
    const colors = ['#22c55e', '#f5c542', '#38bdf8', '#f43f5e', '#ffffff'];
    for (let i = 0; i < n; i++) {
      confetti.push({
        x: Math.random(), y: -0.05 - Math.random() * 0.2,
        vx: (Math.random() - 0.5) * 0.25, vy: 0.25 + Math.random() * 0.42,
        size: 5 + Math.random() * 6, color: colors[i % colors.length], life: 1
      });
    }
  }

  let lastTs = performance.now();
  function animLoop(now) {
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;
    const c = el.fxCanvas;
    const rect = c.getBoundingClientRect();
    if (rect.width > 0) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      for (let i = confetti.length - 1; i >= 0; i--) {
        const p = confetti[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.26;
        if (p.life <= 0 || p.y > 1.05) { confetti.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x * w, p.y * h, p.size, p.size * 1.3);
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(animLoop);
  }
  requestAnimationFrame(animLoop);

  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.08, delay = 0) {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + dur);
  }
  const Sfx = {
    place: () => { tone(523.25, 0.1, 'triangle', 0.09); tone(659.25, 0.14, 'sine', 0.08, 0.07); },
    wrong: () => tone(210, 0.14, 'sawtooth', 0.05),
    win: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.09))
  };

  // ==================== MUSIC CONTROLLER ====================
  let musicState = null;
  let presetTimer = null;
  let presetStep = 0;
  let currentAudioSrc = '';
  let ytApiRequested = false;
  let ytApiReady = false;
  let ytPlayer = null;
  let ytReady = false;
  let currentYtId = '';

  function stopPresetSynth() { if (presetTimer) { clearInterval(presetTimer); presetTimer = null; } }
  function startPresetSynth() {
    stopPresetSynth();
    const patterns = {
      detective: { ms: 460, scale: [196, 233.08, 261.63, 293.66, 261.63, 233.08, 220, 246.94], wave: 'triangle' },
      lofi:      { ms: 520, scale: [261.63, 329.63, 392.0, 493.88, 392.0, 329.63, 293.66, 349.23], wave: 'sine' },
      pulse:     { ms: 340, scale: [220, 261.63, 329.63, 261.63, 246.94, 293.66, 392.0, 293.66], wave: 'triangle' }
    };
    const cfg = patterns[(musicState && musicState.presetId) || 'detective'] || patterns.detective;
    presetTimer = setInterval(() => {
      if (!musicState || !musicState.playing || musicState.sourceType !== 'preset') return;
      if (isOverlay && !musicState.playOnOverlay) return;
      const c = getCtx();
      if (!c || c.state !== 'running') return;
      const vol = Math.max(0, Math.min(1, Number(musicState.volume ?? 0.4))) * 0.06;
      if (vol <= 0.001) return;
      const freq = cfg.scale[presetStep++ % cfg.scale.length];
      tone(freq, (cfg.ms / 1000) * 1.15, cfg.wave, vol);
    }, cfg.ms);
  }

  function ensureYoutubeApi() {
    if (window.YT && window.YT.Player) { ytApiReady = true; return; }
    if (ytApiRequested) return;
    ytApiRequested = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      ytApiReady = true;
      if (typeof prev === 'function') prev();
      syncYoutubePlayer();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  function syncYoutubePlayer() {
    if (!musicState || musicState.sourceType !== 'youtube' || !musicState.youtubeId) {
      if (el.ytPlayerBox) el.ytPlayerBox.classList.add('hidden');
      if (ytPlayer && ytReady && typeof ytPlayer.pauseVideo === 'function') try { ytPlayer.pauseVideo(); } catch (_) {}
      return;
    }
    const shouldPlayHere = !!musicState.playing && (!isOverlay || !!musicState.playOnOverlay);
    if (el.ytPlayerBox) el.ytPlayerBox.classList.toggle('hidden', !shouldPlayHere);
    if (!shouldPlayHere) {
      if (ytPlayer && ytReady && typeof ytPlayer.pauseVideo === 'function') try { ytPlayer.pauseVideo(); } catch (_) {}
      return;
    }
    ensureYoutubeApi();
    if (!ytApiReady) return;
    const vid = musicState.youtubeId;
    const volPct = Math.round(Math.max(0, Math.min(1, Number(musicState.volume ?? 0.4))) * 100);
    if (!ytPlayer) {
      currentYtId = vid;
      ytPlayer = new window.YT.Player('ytPlayerMount', {
        width: isOverlay ? '2' : '240', height: isOverlay ? '2' : '135', videoId: vid,
        playerVars: { autoplay: 1, controls: 1, rel: 0, playsinline: 1, loop: musicState.loop ? 1 : 0, playlist: vid, origin: window.location.origin },
        events: {
          onReady: (ev) => { ytReady = true; ev.target.setVolume(volPct); ev.target.unMute(); if (musicState.playing) ev.target.playVideo(); },
          onStateChange: (ev) => { if (ev.data === window.YT.PlayerState.ENDED && musicState.loop && musicState.playing) { ev.target.seekTo(0); ev.target.playVideo(); } },
          onError: () => { if (el.urlStatus) el.urlStatus.textContent = '⚠️ Bu YouTube videosu kənar saytda qapalıdır — başqa link və ya MP3 seç!'; }
        }
      });
      return;
    }
    if (!ytReady) return;
    ytPlayer.setVolume(volPct);
    if (vid !== currentYtId) { currentYtId = vid; ytPlayer.loadVideoById(vid); }
    else if (typeof ytPlayer.getPlayerState === 'function' && ytPlayer.getPlayerState() !== 1) ytPlayer.playVideo();
  }

  function syncAudioPlayback() {
    if (!musicState) return;
    const shouldPlayHere = !!musicState.playing && (!isOverlay || !!musicState.playOnOverlay);
    if (el.overlayMusicBadge) {
      el.overlayMusicBadge.classList.toggle('hidden', !musicState.playing);
      el.overlayMusicBadge.textContent = `🎵 ${musicState.title || 'Musiqi'}`;
    }
    if (musicState.sourceType === 'preset') {
      el.bgAudioEl.pause(); syncYoutubePlayer();
      if (shouldPlayHere) startPresetSynth(); else stopPresetSynth();
    } else if (musicState.sourceType === 'youtube') {
      stopPresetSynth(); el.bgAudioEl.pause(); syncYoutubePlayer();
    } else {
      stopPresetSynth(); syncYoutubePlayer();
      const src = musicState.audioSrc || '';
      if (src !== currentAudioSrc) { currentAudioSrc = src; el.bgAudioEl.src = src; }
      el.bgAudioEl.loop = !!musicState.loop;
      el.bgAudioEl.volume = Math.max(0, Math.min(1, Number(musicState.volume ?? 0.4)));
      if (shouldPlayHere && src) el.bgAudioEl.play().catch(() => {}); else el.bgAudioEl.pause();
    }
    if (el.musicNowLabel) el.musicNowLabel.textContent = `${musicState.playing ? '▶️ Çalır' : '⏸️ Dayandırılıb'}: ${musicState.title}`;
    if (el.btnMusicPlayPause) {
      el.btnMusicPlayPause.textContent = musicState.playing ? '⏸️ Dayandır' : '▶ Başlat';
      el.btnMusicPlayPause.className = musicState.playing ? 'btn btn-red' : 'btn btn-green';
    }
    if (el.btnMusicLoop) el.btnMusicLoop.textContent = `🔁 Təkrar: ${musicState.loop ? 'AÇIQ' : 'BAĞLI'}`;
    if (el.musicVolume) {
      const pct = Math.round((musicState.volume ?? 0.4) * 100);
      el.musicVolume.value = pct;
      if (el.volVal) el.volVal.textContent = `${pct}%`;
    }
    if (el.chkOverlayMusic) el.chkOverlayMusic.checked = !!musicState.playOnOverlay;
    document.querySelectorAll('.preset-btn').forEach((b) => {
      b.classList.toggle('active', musicState.sourceType === 'preset' && b.dataset.preset === musicState.presetId);
    });
  }

  window.addEventListener('pointerdown', () => getCtx());
  window.addEventListener('resize', drawMap);

  // ==================== STATE RENDERING ====================
  function renderState(st) {
    latestState = st;
    el.roundChip.textContent = `#${st.round}`;
    el.mapTitle.textContent = st.map ? st.map.title : 'XƏRİTƏ';
    el.timeLeft.textContent = st.timeLeft;
    el.timerPill.classList.toggle('urgent', st.phase === 'playing' && st.timeLeft <= 20);
    el.likePct.textContent = `${st.likeEnergy || 0}%`;

    // Render 6 Illustrated Suspect + Witness Cards
    const culpritIdx = st.revealedSolution ? st.revealedSolution.culpritIdx : -1;
    const people = [...(st.suspects || []), st.witness].filter(Boolean);
    el.castGrid.innerHTML = people.map((p, idx) => {
      const isWitness = idx === 5;
      const isPlaced = !!p.placed;
      const isCulprit = idx === culpritIdx;
      const cls = `cast-card${isWitness ? ' witness' : ''}${isPlaced ? ' placed' : ''}${isCulprit ? ' culprit-reveal' : ''}`;
      return `
        <div class="${cls}">
          <div class="portrait-box">
            ${renderPortraitSvg(p, isWitness)}
            <span class="portrait-num">${isWitness ? 'ŞAHİD' : p.number}</span>
          </div>
          <div class="cast-meta">
            <div class="cast-name-row">
              <span class="cast-name">${p.name}</span>
              ${isPlaced ? `<span class="coord-badge">✅ ${p.placed.coord}</span>` : ''}
            </div>
            <div class="cast-clue">${p.clueText}</div>
          </div>
        </div>
      `;
    }).join('');

    drawMap();

    // Win / Timeout overlay
    if (st.phase === 'won' && st.winner) {
      el.roundOverlay.className = 'round-overlay';
      el.overlayBadge.textContent = '🏆 OĞRU TAPILDI!';
      el.overlayCulprit.textContent = st.winner.culpritName;
      el.overlaySub.textContent = `${st.winner.nickname} • +${st.winner.points} xal${st.winner.streak > 1 ? ` (🔥×${st.winner.streak})` : ''}`;
    } else if (st.phase === 'timeout' && st.revealedSolution) {
      el.roundOverlay.className = 'round-overlay timeout';
      el.overlayBadge.textContent = '⏱️ VAXT BİTDİ!';
      el.overlayCulprit.textContent = `Oğru: ${st.revealedSolution.culpritName}`;
      el.overlaySub.textContent = 'Növbəti cinayət xəritəsi açılır...';
    } else {
      el.roundOverlay.className = 'round-overlay hidden';
    }

    if (st.feed && st.feed[0]) el.feedText.textContent = st.feed[0].text;

    const tt = st.tiktok || {};
    if (tt.connected) {
      el.liveBadge.className = 'live-tag on';
      el.liveBadge.textContent = `🔴 @${tt.username} • ${tt.viewerCount || 0}`;
    } else if (tt.connecting) {
      el.liveBadge.className = 'live-tag';
      el.liveBadge.textContent = `🟡 @${tt.username}...`;
    } else {
      el.liveBadge.className = 'live-tag';
      el.liveBadge.textContent = `⚫ @${tt.username || 'offline'}`;
    }

    const lb = st.leaderboard || [];
    if (lb.length === 0) {
      el.lbList.innerHTML = '<div class="lb-empty">İlk tapan lider olur! 🕵️‍♂️</div>';
    } else {
      const medals = ['🥇', '🥈', '🥉'];
      el.lbList.innerHTML = lb.slice(0, 3).map((r, i) => `
        <div class="lb-row">
          <span>${medals[i]} ${r.nickname}</span>
          <span>🔎 ${r.solvedCount} • ${r.score} xal</span>
        </div>
      `).join('');
    }

    // Host Studio controls & Host Secret Answer
    if (el.hostStatus) {
      el.hostStatus.textContent = tt.connected
        ? `🟢 Canlı Qoşulu: @${tt.username} (${tt.viewerCount} izləyici)`
        : (tt.error || `⚪ Gözlənilir: @${tt.username}`);
    }
    if (el.secretCulprit && st.hostAnswer) {
      el.secretCulprit.textContent = `Oğru: ${st.hostAnswer.culpritName}`;
      el.secretCoords.textContent = st.hostAnswer.coords.join(' | ');
    }
    if (el.btnToggleBots) el.btnToggleBots.textContent = `🤖 Demo Botlar: ${st.autoBotDemo ? 'AÇIQ' : 'BAĞLI'}`;
    document.querySelectorAll('.map-pick-btn').forEach((b) => {
      b.classList.toggle('active', st.map && b.dataset.map === st.map.id);
    });
  }

  setInterval(() => {
    if (!latestState || latestState.phase !== 'playing' || latestState.timeLeft <= 0) return;
    latestState.timeLeft -= 1;
    el.timeLeft.textContent = latestState.timeLeft;
    el.timerPill.classList.toggle('urgent', latestState.timeLeft <= 20);
  }, 1000);

  // ==================== SOCKET LISTENERS ====================
  socket.on('detective-state', renderState);
  socket.on('music-state', (m) => { musicState = m; syncAudioPlayback(); });
  socket.on('detective-fx', (fx) => {
    if (!fx) return;
    if (fx.type === 'win') { burstConfetti(90); Sfx.win(); }
    else if (fx.type === 'place') Sfx.place();
    else if (fx.type === 'wrong') Sfx.wrong();
  });
  socket.on('cmd-feedback', (fb) => {
    if (!el.cmdFeedback || !fb) return;
    el.cmdFeedback.textContent = fb.accepted
      ? `✅ İcra olundu (${fb.action}${fb.points ? ' +' + fb.points : ''})`
      : `⚠️ ${fb.reason}`;
  });

  // ==================== HOST PANEL EVENTS ====================
  if (el.btnCopyUrl && el.obsUrlInput) {
    el.btnCopyUrl.addEventListener('click', () => {
      navigator.clipboard?.writeText(el.obsUrlInput.value).catch(() => {});
      el.btnCopyUrl.textContent = '✅ Kopyalandı!';
      setTimeout(() => { el.btnCopyUrl.textContent = '📋 Kopyala'; }, 1500);
    });
  }
  if (el.btnConnect) el.btnConnect.addEventListener('click', () => socket.emit('connect-tiktok', { username: el.tiktokUserInput.value.trim() }));
  if (el.btnDisconnect) el.btnDisconnect.addEventListener('click', () => socket.emit('disconnect-tiktok'));
  if (el.btnRevealHint) el.btnRevealHint.addEventListener('click', () => socket.emit('reveal-hint'));
  if (el.btnNextPuzzle) el.btnNextPuzzle.addEventListener('click', () => socket.emit('next-puzzle'));
  if (el.btnToggleBots) el.btnToggleBots.addEventListener('click', () => socket.emit('toggle-bots', { enabled: !(latestState && latestState.autoBotDemo) }));
  if (el.btnResetScores) el.btnResetScores.addEventListener('click', () => socket.emit('reset-scores'));

  document.querySelectorAll('.map-pick-btn').forEach((b) => {
    b.addEventListener('click', () => socket.emit('next-puzzle', { mapId: b.dataset.map }));
  });
  if (el.btnSendTestCmd && el.testCmdInput) {
    const send = () => {
      const cmd = el.testCmdInput.value.trim();
      if (!cmd) return;
      socket.emit('manual-cmd', { nickname: 'Aparıcı_Test', command: cmd });
      el.testCmdInput.value = '';
    };
    el.btnSendTestCmd.addEventListener('click', send);
    el.testCmdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  // Music events
  if (el.btnMusicPlayPause) el.btnMusicPlayPause.addEventListener('click', () => { getCtx(); socket.emit('music-update', { playing: !(musicState && musicState.playing) }); });
  if (el.btnMusicLoop) el.btnMusicLoop.addEventListener('click', () => socket.emit('music-update', { loop: !(musicState && musicState.loop) }));
  if (el.musicVolume) {
    el.musicVolume.addEventListener('input', () => {
      const v = Number(el.musicVolume.value) / 100;
      if (el.volVal) el.volVal.textContent = `${el.musicVolume.value}%`;
      socket.emit('music-update', { volume: v });
    });
  }
  if (el.chkOverlayMusic) el.chkOverlayMusic.addEventListener('change', () => socket.emit('music-update', { playOnOverlay: el.chkOverlayMusic.checked }));
  document.querySelectorAll('.preset-btn').forEach((b) => {
    b.addEventListener('click', () => { getCtx(); socket.emit('music-update', { sourceType: 'preset', presetId: b.dataset.preset, playing: true }); });
  });
  if (el.btnApplyMusicUrl && el.musicUrlInput) {
    const apply = () => {
      const url = el.musicUrlInput.value.trim();
      if (!url) return;
      getCtx();
      socket.emit('music-update', { sourceType: 'url', customUrl: url, playing: true });
    };
    el.btnApplyMusicUrl.addEventListener('click', apply);
    el.musicUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
  }
  if (el.btnUploadMusic && el.musicFileInput) {
    el.btnUploadMusic.addEventListener('click', () => el.musicFileInput.click());
    el.musicFileInput.addEventListener('change', () => {
      const file = el.musicFileInput.files && el.musicFileInput.files[0];
      if (!file) return;
      el.uploadStatus.textContent = `⏳ Yüklənir: ${file.name}...`;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resp = await fetch('/api/music', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, mimeType: file.type || 'audio/mpeg', dataBase64: reader.result, title: file.name.replace(/\.[^.]+$/, '') })
          });
          const data = await resp.json();
          el.uploadStatus.textContent = data.ok ? `✅ Yükləndi: ${file.name}` : `❌ ${data.error}`;
        } catch (err) {
          el.uploadStatus.textContent = `❌ ${err.message}`;
        }
      };
      reader.readAsDataURL(file);
    });
  }
})();
