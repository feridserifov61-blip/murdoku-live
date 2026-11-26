const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');
const { generatePuzzle, COLS } = require('./engine/puzzle');
const { OBJECT_DEFS } = require('./data/maps');

const PORT = Number(process.env.PORT) || 3005;
const DEFAULT_TIKTOK_USER = (process.env.TIKTOK_USER || 'bakuremixlab').trim().replace(/^@+/, '').toLowerCase();
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const MUSIC_META_PATH = path.join(DATA_DIR, 'music.json');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ==================== AZERBAIJANI NORMALIZER ====================
const SOFT_MAP = {
  'ə': 'e', 'ş': 's', 'ç': 'c', 'ğ': 'g', 'ö': 'o', 'ü': 'u', 'ı': 'i', 'İ': 'i', 'i': 'i'
};
function normAz(str) {
  return [...String(str || '').normalize('NFC').trim().toLocaleLowerCase('az')]
    .map((ch) => SOFT_MAP[ch] || ch)
    .join('');
}

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) || fallback;
  } catch {
    return fallback;
  }
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (_) {}
}

// ==================== MUSIC STATE ====================
function extractYoutubeId(rawUrl) {
  const s = String(rawUrl || '').trim();
  if (!s) return '';
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}

const musicState = loadJson(MUSIC_META_PATH, {
  sourceType: 'preset',
  presetId: 'detective',
  customUrl: '',
  youtubeId: '',
  uploadedFile: '',
  uploadedMime: '',
  title: 'Detektiv Gərginlik (Studiya)',
  volume: 0.4,
  playing: false,
  loop: true,
  playOnOverlay: true
});

function persistMusic() {
  saveJson(MUSIC_META_PATH, musicState);
}

// ==================== EXPRESS + SOCKET SERVER ====================
const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static(PUBLIC_DIR));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.post('/api/music', (req, res) => {
  try {
    const { filename, mimeType, dataBase64, title } = req.body || {};
    if (!dataBase64 || typeof dataBase64 !== 'string') {
      return res.status(400).json({ ok: false, error: 'Audio faylı boşdur.' });
    }
    const cleanB64 = dataBase64.includes(',') ? dataBase64.split(',')[1] : dataBase64;
    const buf = Buffer.from(cleanB64, 'base64');
    if (buf.length < 100 || buf.length > 20 * 1024 * 1024) {
      return res.status(400).json({ ok: false, error: 'Fayl ölçüsü 20MB-dan az olmalıdır.' });
    }
    const safeExt = (path.extname(filename || '') || '.mp3').toLowerCase().replace(/[^.a-z0-9]/g, '') || '.mp3';
    const destName = `custom_track${safeExt}`;
    for (const f of fs.readdirSync(UPLOAD_DIR)) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch (_) {}
    }
    fs.writeFileSync(path.join(UPLOAD_DIR, destName), buf);

    musicState.sourceType = 'upload';
    musicState.uploadedFile = destName;
    musicState.uploadedMime = mimeType || 'audio/mpeg';
    musicState.title = (title || filename || 'Mənim Musiqim').replace(/\.[^.]+$/, '');
    musicState.playing = true;
    persistMusic();
    broadcastMusic();
    return res.json({ ok: true, music: getPublicMusicState() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/music-file', (_req, res) => {
  if (!musicState.uploadedFile) return res.status(404).send('No uploaded track');
  const full = path.join(UPLOAD_DIR, musicState.uploadedFile);
  if (!fs.existsSync(full)) return res.status(404).send('Track missing');
  res.setHeader('Content-Type', musicState.uploadedMime || 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(full).pipe(res);
});

const lastRawChats = [];
app.get('/debug-chat', (_req, res) => {
  res.json({
    connected: tiktok.connected,
    username: tiktok.username,
    round: game.round,
    mapId: game.puzzle && game.puzzle.map.id,
    phase: game.phase,
    lastRawChats
  });
});

app.get('/healthz', (_req, res) => {
  res.status(200).json({
    ok: true,
    connected: tiktok.connected,
    tiktokError: tiktok.error,
    phase: game.phase,
    round: game.round,
    mapId: game.puzzle ? game.puzzle.map.id : null,
    placedCount: game.placed.filter(Boolean).length
  });
});

// ==================== GAME ENGINE STATE ====================
const game = {
  phase: 'playing', // 'playing' | 'won' | 'timeout'
  round: 0,
  puzzle: null,
  placed: [null, null, null, null, null, null], // { r, c, coord, by } per person 0..5
  accusedUsers: new Set(),
  likeEnergy: 0,
  autoBotDemo: false,
  roundStartedAt: Date.now(),
  roundDurationSec: 150,
  nextAutoHintAt: 0,
  winner: null,
  leaderboard: new Map(),
  streaks: new Map(),
  feed: [],
  tickTimer: null,
  nextRoundTimer: null,
  botTimer: null,
  mapCursor: 0
};

const tiktok = {
  username: DEFAULT_TIKTOK_USER,
  conn: null,
  connecting: false,
  connected: false,
  viewerCount: 0,
  error: '',
  reconnectTimer: null
};

function pushFeed(text, kind = 'info') {
  game.feed.unshift({ id: Date.now() + Math.random(), text, kind });
  if (game.feed.length > 6) game.feed.length = 6;
}

function getPublicMusicState() {
  return {
    sourceType: musicState.sourceType,
    presetId: musicState.presetId,
    customUrl: musicState.customUrl,
    youtubeId: musicState.youtubeId || '',
    audioSrc: musicState.sourceType === 'upload' && musicState.uploadedFile
      ? `/api/music-file?v=${encodeURIComponent(musicState.uploadedFile + '_' + musicState.title)}`
      : (musicState.sourceType === 'url' ? musicState.customUrl : ''),
    title: musicState.title,
    volume: musicState.volume,
    playing: musicState.playing,
    loop: musicState.loop,
    playOnOverlay: musicState.playOnOverlay
  };
}

function broadcastMusic() {
  io.emit('music-state', getPublicMusicState());
}

function addScore(uniqueId, nickname, delta, isSolve = false) {
  let row = game.leaderboard.get(uniqueId);
  if (!row) {
    row = { uniqueId, nickname, solvedCount: 0, score: 0, bestStreak: 0 };
    game.leaderboard.set(uniqueId, row);
  }
  row.nickname = nickname || row.nickname;
  row.score += delta;
  if (isSolve) {
    row.solvedCount += 1;
    const st = (game.streaks.get(uniqueId) || 0) + 1;
    game.streaks.set(uniqueId, st);
    if (st > row.bestStreak) row.bestStreak = st;
    return st;
  }
  return 0;
}

function startNewRound(preferredMapId = null) {
  clearTimeout(game.nextRoundTimer);
  const { MAPS } = require('./data/maps');
  const mapPick = preferredMapId || MAPS[game.mapCursor % MAPS.length].id;
  game.mapCursor += 1;

  game.puzzle = generatePuzzle(mapPick);
  game.round += 1;
  game.phase = 'playing';
  game.placed = [null, null, null, null, null, null];
  game.accusedUsers.clear();
  game.winner = null;
  game.roundStartedAt = Date.now();
  game.roundDurationSec = 150;
  game.nextAutoHintAt = Date.now() + 45000;

  pushFeed(`🔍 Yeni İş #${game.round}: ${game.puzzle.map.title} — Şübhəliləri yerləşdir və oğrunu tap!`, 'info');
  broadcastState();
}

function getAllPeopleList() {
  if (!game.puzzle) return [];
  return [...game.puzzle.suspects, game.puzzle.witness];
}

function revealOnePersonOnMap(reason = 'İpucu') {
  if (game.phase !== 'playing' || !game.puzzle) return false;
  const people = getAllPeopleList();
  const unplaced = [];
  for (let i = 0; i < 6; i++) {
    if (!game.placed[i]) unplaced.push(i);
  }
  if (unplaced.length === 0) return false;
  // Prefer revealing a suspect before the witness so culprit deduction stays fun
  const suspectChoices = unplaced.filter((i) => i < 5);
  const pickPool = suspectChoices.length > 1 ? suspectChoices : unplaced;
  const idx = pickPool[Math.floor(Math.random() * pickPool.length)];
  const person = people[idx];
  game.placed[idx] = { ...person.solution, by: reason };

  checkAutoCompleteSixth();
  pushFeed(`💡 ${reason}: ${person.name} → ${person.solution.coord}`, 'hint');
  io.emit('detective-fx', { type: 'place', personIdx: idx });
  broadcastState();
  return true;
}

function checkAutoCompleteSixth() {
  const people = getAllPeopleList();
  const unplaced = [];
  for (let i = 0; i < 6; i++) if (!game.placed[i]) unplaced.push(i);
  if (unplaced.length === 1) {
    const lastIdx = unplaced[0];
    const p = people[lastIdx];
    game.placed[lastIdx] = { ...p.solution, by: 'Avtomatik' };
  }
}

function findPersonByToken(token) {
  if (!game.puzzle) return -1;
  const clean = normAz(token);
  if (!clean) return -1;
  if (/^[1-6]$/.test(clean)) return Number(clean) - 1;
  if (clean === 'sahid' || clean === 'sahidi') return 5;
  const people = getAllPeopleList();
  for (let i = 0; i < people.length; i++) {
    const nm = normAz(people[i].name);
    if (nm === clean || (clean.length >= 3 && nm.startsWith(clean))) return i;
  }
  return -1;
}

function parseCoord(token) {
  const s = String(token || '').trim().toUpperCase();
  let m = s.match(/^([1-6])\s*([A-F])$/);
  if (m) return { r: Number(m[1]) - 1, c: COLS.indexOf(m[2]), coord: `${m[1]}${m[2]}` };
  m = s.match(/^([A-F])\s*([1-6])$/);
  if (m) return { r: Number(m[2]) - 1, c: COLS.indexOf(m[1]), coord: `${m[2]}${m[1]}` };
  return null;
}

function handlePlaceAttempt({ uniqueId, nickname, personIdx, coordObj, isBot = false, isVip = false }) {
  if (game.phase !== 'playing' || !game.puzzle) return { accepted: false, reason: 'round_ended' };
  const people = getAllPeopleList();
  const person = people[personIdx];
  if (!person) return { accepted: false, reason: 'bad_person' };

  if (game.placed[personIdx]) {
    return { accepted: false, reason: 'already_placed' };
  }

  const displayName = (nickname || 'Detektiv').slice(0, 22);
  if (person.solution.r === coordObj.r && person.solution.c === coordObj.c) {
    game.placed[personIdx] = { ...person.solution, by: displayName };
    const pts = isVip ? 45 : 30;
    if (!isBot) addScore(uniqueId, displayName, pts, false);
    checkAutoCompleteSixth();
    pushFeed(`📍 ${displayName}: ${person.name} → ${coordObj.coord} (+${pts} xal!)`, 'hit');
    io.emit('detective-fx', { type: 'place', personIdx });
    broadcastState();
    return { accepted: true, action: 'placed', points: pts };
  }

  pushFeed(`❌ ${displayName}: ${person.name} ${coordObj.coord}-də deyil`, 'wrong');
  io.emit('detective-fx', { type: 'wrong' });
  broadcastState();
  return { accepted: true, action: 'wrong_place' };
}

function handleAccuseAttempt({ uniqueId, nickname, personIdx, isBot = false, isVip = false }) {
  if (game.phase !== 'playing' || !game.puzzle) return { accepted: false, reason: 'round_ended' };
  if (personIdx < 0 || personIdx > 4) {
    return { accepted: false, reason: 'witness_not_culprit' };
  }
  if (!isBot && game.accusedUsers.has(uniqueId)) {
    return { accepted: false, reason: 'already_accused' };
  }
  if (!isBot) game.accusedUsers.add(uniqueId);

  const displayName = (nickname || 'Detektiv').slice(0, 22);
  const suspect = game.puzzle.suspects[personIdx];

  if (personIdx === game.puzzle.culpritIdx) {
    game.phase = 'won';
    const people = getAllPeopleList();
    for (let i = 0; i < 6; i++) {
      if (!game.placed[i]) game.placed[i] = { ...people[i].solution, by: 'Həll' };
    }
    let pts = isVip ? 180 : 150;
    let streak = 0;
    if (!isBot) {
      streak = addScore(uniqueId, displayName, pts, true);
      if (streak > 1) {
        const bonus = (streak - 1) * 30;
        pts += bonus;
        addScore(uniqueId, displayName, bonus, false);
      }
    }
    game.winner = {
      nickname: displayName,
      culpritName: suspect.name,
      culpritIdx: personIdx,
      points: pts,
      streak
    };
    pushFeed(`🏆 ${displayName} OĞRUNU TAPDI: ${suspect.name}! (+${pts} xal)`, 'win');
    io.emit('detective-fx', { type: 'win', winner: game.winner });
    broadcastState();
    clearTimeout(game.nextRoundTimer);
    game.nextRoundTimer = setTimeout(() => startNewRound(), 6200);
    return { accepted: true, action: 'won', points: pts };
  }

  pushFeed(`🔎 ${displayName}: ${suspect.name} oğru deyil!`, 'wrong');
  io.emit('detective-fx', { type: 'wrong' });
  broadcastState();
  return { accepted: true, action: 'wrong_accuse' };
}

function handleViewerChat({ uniqueId, nickname, comment, isBot = false, allowRepeatAccuse = false }) {
  const raw = String(comment || '').normalize('NFC').replace(/[\u200B-\u200F\uFEFF\u00A0]/g, '').trim();
  if (!raw) return { accepted: false, reason: 'empty' };

  const cleaned = raw.replace(/^[!.]+/, '').trim();
  const tokens = cleaned.split(/[\s,\-:]+/).filter(Boolean);
  let outcome = { accepted: false, reason: 'unmatched' };

  if (tokens.length === 2) {
    // Case A: Placement "<person> <coord>" or "<coord> <person>"
    const c2 = parseCoord(tokens[1]);
    const p1 = findPersonByToken(tokens[0]);
    if (p1 !== -1 && c2) {
      outcome = handlePlaceAttempt({ uniqueId, nickname, personIdx: p1, coordObj: c2, isBot });
    } else {
      const c1 = parseCoord(tokens[0]);
      const p2 = findPersonByToken(tokens[1]);
      if (p2 !== -1 && c1) {
        outcome = handlePlaceAttempt({ uniqueId, nickname, personIdx: p2, coordObj: c1, isBot });
      } else {
        // Case B: Accusation "<keyword> <suspect>" e.g. "ogru Murad", "tap 2"
        const kw = normAz(tokens[0]);
        if (['ogru', 'gunahkar', 'tap', 'qatil', 'casus', 'x'].includes(kw)) {
          const accP = findPersonByToken(tokens[1]);
          if (accP >= 0 && accP <= 4) {
            if (allowRepeatAccuse) game.accusedUsers.delete(uniqueId);
            outcome = handleAccuseAttempt({ uniqueId, nickname, personIdx: accP, isBot });
          }
        }
      }
    }
  } else if (tokens.length === 1) {
    // Single-token suspect name accusation ("Murad", "Aysel") OR compact "1B" won't match without person
    const one = tokens[0];
    // Compact "1-1B" already split above; check compact "11B" (digit + coord)
    const compact = one.match(/^([1-6])([1-6][A-Fa-f]|[A-Fa-f][1-6])$/);
    if (compact) {
      const cObj = parseCoord(compact[2]);
      if (cObj) {
        outcome = handlePlaceAttempt({ uniqueId, nickname, personIdx: Number(compact[1]) - 1, coordObj: cObj, isBot });
      }
    } else if (!/^[1-6]$/.test(normAz(one))) {
      const accP = findPersonByToken(one);
      if (accP >= 0 && accP <= 4) {
        if (allowRepeatAccuse) game.accusedUsers.delete(uniqueId);
        outcome = handleAccuseAttempt({ uniqueId, nickname, personIdx: accP, isBot });
      }
    }
  }

  lastRawChats.unshift({
    ts: new Date().toISOString(),
    nick: nickname,
    raw,
    round: game.round,
    accepted: !!outcome.accepted,
    action: outcome.action || null,
    reason: outcome.reason || 'ok'
  });
  if (lastRawChats.length > 20) lastRawChats.length = 20;
  return outcome;
}

function buildPublicState(includeHostAnswer = false) {
  const p = game.puzzle;
  const top3 = [...game.leaderboard.values()]
    .sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount)
    .slice(0, 5);
  const elapsedSec = Math.floor((Date.now() - game.roundStartedAt) / 1000);
  const timeLeft = game.phase === 'playing' ? Math.max(0, game.roundDurationSec - elapsedSec) : 0;

  const mapView = p ? {
    id: p.map.id,
    title: p.map.title,
    rooms: p.map.rooms,
    grid: p.map.grid,
    doors: p.map.doors,
    objects: p.map.objects.map((o) => ({
      ...o,
      label: OBJECT_DEFS[o.type]?.label || o.type
    }))
  } : null;

  const mapActorPublic = (actor, idx) => ({
    index: idx,
    number: actor.number,
    name: actor.name,
    gender: actor.gender,
    hair: actor.hair,
    hairStyle: actor.hairStyle,
    shirt: actor.shirt,
    skin: actor.skin,
    glasses: actor.glasses,
    beard: actor.beard,
    clueText: actor.clueText,
    placed: game.placed[idx] || null
  });

  const payload = {
    phase: game.phase,
    round: game.round,
    map: mapView,
    suspects: p ? p.suspects.map((s, i) => mapActorPublic(s, i)) : [],
    witness: p ? mapActorPublic(p.witness, 5) : null,
    placedCount: game.placed.filter(Boolean).length,
    revealedSolution: game.phase !== 'playing' && p ? {
      culpritIdx: p.culpritIdx,
      culpritName: p.culpritName,
      coords: getAllPeopleList().map((a) => a.solution)
    } : null,
    winner: game.winner,
    timeLeft,
    roundDuration: game.roundDurationSec,
    likeEnergy: game.likeEnergy,
    autoBotDemo: game.autoBotDemo,
    leaderboard: top3,
    feed: game.feed,
    tiktok: {
      username: tiktok.username,
      connected: tiktok.connected,
      connecting: tiktok.connecting,
      viewerCount: tiktok.viewerCount,
      error: tiktok.error
    }
  };

  if (includeHostAnswer && p) {
    payload.hostAnswer = {
      culpritName: p.culpritName,
      culpritIdx: p.culpritIdx,
      coords: getAllPeopleList().map((a) => `${a.number}.${a.name}→${a.solution.coord}`)
    };
  }

  return payload;
}

function broadcastState() {
  const overlayPayload = buildPublicState(false);
  const hostPayload = buildPublicState(true);
  for (const [, sock] of io.sockets.sockets) {
    const isOv = sock.handshake?.query?.overlay === '1';
    sock.emit('detective-state', isOv ? overlayPayload : hostPayload);
  }
}

// Round timer & auto-hint
game.tickTimer = setInterval(() => {
  if (game.phase !== 'playing' || !game.puzzle) return;
  const now = Date.now();
  const elapsed = (now - game.roundStartedAt) / 1000;
  if (now >= game.nextAutoHintAt) {
    game.nextAutoHintAt = now + 45000;
    const unplacedCount = game.placed.filter((x) => !x).length;
    if (unplacedCount > 2) revealOnePersonOnMap('Avtomatik ipucu');
  }
  if (elapsed >= game.roundDurationSec) {
    game.phase = 'timeout';
    const people = getAllPeopleList();
    for (let i = 0; i < 6; i++) {
      if (!game.placed[i]) game.placed[i] = { ...people[i].solution, by: 'Cavab' };
    }
    pushFeed(`⏱️ Vaxt bitdi! Oğru: ${game.puzzle.culpritName}`, 'timeout');
    io.emit('detective-fx', { type: 'timeout', culpritName: game.puzzle.culpritName });
    broadcastState();
    clearTimeout(game.nextRoundTimer);
    game.nextRoundTimer = setTimeout(() => startNewRound(), 5500);
  }
}, 1000);

// Optional Demo Bot (OFF by default)
game.botTimer = setInterval(() => {
  if (!game.autoBotDemo || game.phase !== 'playing' || !game.puzzle) return;
  const people = getAllPeopleList();
  const unplaced = [];
  for (let i = 0; i < 6; i++) if (!game.placed[i]) unplaced.push(i);
  if (unplaced.length > 0) {
    const pickIdx = unplaced[Math.floor(Math.random() * unplaced.length)];
    const p = people[pickIdx];
    handlePlaceAttempt({ uniqueId: 'bot_demo', nickname: '🤖 Köməkçi', personIdx: pickIdx, coordObj: p.solution, isBot: true });
  } else {
    handleAccuseAttempt({ uniqueId: 'bot_demo', nickname: '🤖 Köməkçi', personIdx: game.puzzle.culpritIdx, isBot: true });
  }
}, 5500);

// ==================== TIKTOK LIVE CONNECTOR ====================
function disconnectTikTok(manual = false) {
  clearTimeout(tiktok.reconnectTimer);
  if (tiktok.conn) {
    try { tiktok.conn.disconnect(); } catch (_) {}
    tiktok.conn = null;
  }
  tiktok.connecting = false;
  tiktok.connected = false;
  tiktok.viewerCount = 0;
  if (manual) tiktok.error = '';
  broadcastState();
}

async function connectTikTok(username, isManual = false) {
  const cleanUser = (username || DEFAULT_TIKTOK_USER).trim().replace(/^@+/, '').toLowerCase();
  if (!cleanUser) return;

  disconnectTikTok(false);
  tiktok.username = cleanUser;
  tiktok.connecting = true;
  tiktok.error = '';
  broadcastState();

  let conn = null;
  try {
    conn = new TikTokLiveConnection(cleanUser, {
      processInitialData: false,
      enableExtendedGiftInfo: false,
      requestPollingIntervalMs: 1200
    });
    tiktok.conn = conn;

    conn.on(WebcastEvent.CHAT, (data) => {
      if (tiktok.conn !== conn) return;
      const uniqueId = String(data?.user?.displayId || data?.user?.uniqueId || data?.user?.id || data?.user?.userId || data?.uniqueId || `u_${Math.random()}`);
      const nickname = String(data?.user?.nickname || data?.nickname || uniqueId);
      const comment = String(data?.content ?? data?.comment ?? '').trim();
      if (!comment) return;
      handleViewerChat({ uniqueId, nickname, comment });
    });

    conn.on(WebcastEvent.LIKE, (data) => {
      if (tiktok.conn !== conn) return;
      const count = Number(data?.count ?? data?.likeCount ?? 1);
      game.likeEnergy = Math.min(100, game.likeEnergy + count * 2);
      if (game.likeEnergy >= 100) {
        game.likeEnergy = 0;
        revealOnePersonOnMap('❤️ Bəyənmə 100%');
      } else {
        broadcastState();
      }
    });

    conn.on(WebcastEvent.GIFT, (data) => {
      if (tiktok.conn !== conn) return;
      const giftType = data?.gift?.type ?? data?.giftDetails?.giftType ?? data?.giftType;
      if (giftType === 1 && !data?.repeatEnd) return;
      const uniqueId = String(data?.user?.displayId || data?.user?.uniqueId || data?.user?.id || `gift_${Date.now()}`);
      const nickname = String(data?.user?.nickname || data?.nickname || 'VIP');
      const giftName = data?.gift?.name || data?.giftDetails?.giftName || data?.giftName || 'Hədiyyə';
      addScore(uniqueId, nickname, 50, false);
      revealOnePersonOnMap(`🎁 ${nickname} (${giftName})`);
      broadcastState();
    });

    conn.on(WebcastEvent.ROOM_USER, (data) => {
      if (tiktok.conn !== conn) return;
      const rawVc = data?.viewerCount ?? data?.total ?? data?.totalUser;
      if (rawVc !== undefined && rawVc !== null && rawVc !== '') {
        const vc = Number(rawVc);
        if (Number.isFinite(vc)) {
          tiktok.viewerCount = vc;
          broadcastState();
        }
      }
    });

    conn.on(WebcastEvent.STREAM_END, () => {
      if (tiktok.conn !== conn) return;
      tiktok.connected = false;
      tiktok.connecting = false;
      tiktok.error = 'Canlı yayım bitdi';
      broadcastState();
      clearTimeout(tiktok.reconnectTimer);
      tiktok.reconnectTimer = setTimeout(() => connectTikTok(tiktok.username, false), 15000);
    });

    conn.on(ControlEvent.DISCONNECTED, () => {
      if (tiktok.conn !== conn) return;
      if (tiktok.connected) {
        tiktok.connected = false;
        tiktok.connecting = false;
        broadcastState();
        clearTimeout(tiktok.reconnectTimer);
        tiktok.reconnectTimer = setTimeout(() => connectTikTok(tiktok.username, false), 5000);
      }
    });

    conn.on(ControlEvent.ERROR, (err) => {
      if (tiktok.conn !== conn) return;
      console.error('[TikTok ERROR]', err?.exception?.message || err?.info || err);
    });

    const state = await conn.connect();
    if (tiktok.conn !== conn) return;
    tiktok.connected = true;
    tiktok.connecting = false;
    tiktok.viewerCount = Number(state?.roomInfo?.data?.user_count ?? state?.roomInfo?.user_count ?? 0) || 0;
    tiktok.error = '';
    pushFeed(`🔴 @${cleanUser} TikTok LIVE-a qoşuldu!`, 'win');
    broadcastState();
  } catch (err) {
    if (tiktok.conn !== conn) return;
    const rawMsg = err?.message || String(err || '');
    const isOffline = /offline|not live|UserOffline|isn't online/i.test(rawMsg);
    tiktok.connected = false;
    tiktok.connecting = false;
    tiktok.error = isOffline
      ? `@${cleanUser} hazırda canlı yayımda deyil`
      : `Qoşulma xətası: ${rawMsg.slice(0, 90)}`;
    broadcastState();
    clearTimeout(tiktok.reconnectTimer);
    tiktok.reconnectTimer = setTimeout(() => connectTikTok(tiktok.username, false), 15000);
  }
}

// ==================== SOCKET.IO CONTROLS ====================
io.on('connection', (socket) => {
  const isOv = socket.handshake?.query?.overlay === '1';
  socket.emit('detective-state', buildPublicState(!isOv));
  socket.emit('music-state', getPublicMusicState());

  socket.on('next-puzzle', ({ mapId } = {}) => startNewRound(mapId || null));
  socket.on('reveal-hint', () => revealOnePersonOnMap('Aparıcı ipucu'));
  socket.on('toggle-bots', ({ enabled } = {}) => {
    game.autoBotDemo = !!enabled;
    broadcastState();
  });
  socket.on('manual-cmd', ({ nickname, command, isVip } = {}) => {
    const res = handleViewerChat({
      uniqueId: `host_${Date.now()}_${Math.random()}`,
      nickname: nickname || 'Aparıcı',
      comment: command,
      allowRepeatAccuse: true
    });
    socket.emit('cmd-feedback', res);
  });
  socket.on('reset-scores', () => {
    game.leaderboard.clear();
    game.streaks.clear();
    game.feed = [];
    pushFeed('🔄 Xallar sıfırlandı!', 'info');
    broadcastState();
  });
  socket.on('connect-tiktok', ({ username } = {}) => connectTikTok(username, true));
  socket.on('disconnect-tiktok', () => disconnectTikTok(true));

  socket.on('music-update', async (patch = {}) => {
    if (patch.sourceType && ['preset', 'upload', 'url', 'youtube'].includes(patch.sourceType)) {
      musicState.sourceType = patch.sourceType;
    }
    if (typeof patch.presetId === 'string') {
      musicState.presetId = patch.presetId;
      if (musicState.sourceType === 'preset') {
        const names = { detective: 'Detektiv Gərginlik', lofi: 'Gecə Studiyası (Lofi)', pulse: 'Enerji Ritmi' };
        musicState.title = names[patch.presetId] || 'Studiya Musiqisi';
      }
    }
    if (typeof patch.customUrl === 'string') {
      musicState.customUrl = patch.customUrl.trim();
      const ytId = extractYoutubeId(musicState.customUrl);
      if (ytId) {
        musicState.sourceType = 'youtube';
        musicState.youtubeId = ytId;
        musicState.title = `YouTube (${ytId})`;
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 2200);
          const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + ytId)}&format=json`, { signal: ctrl.signal });
          clearTimeout(t);
          if (r.ok) {
            const meta = await r.json();
            if (meta && meta.title) musicState.title = `YouTube: ${meta.title.slice(0, 42)}`;
          }
        } catch (_) {}
      } else if (musicState.customUrl && musicState.sourceType === 'url') {
        musicState.youtubeId = '';
        musicState.title = patch.title || 'Xarici Musiqi (URL)';
      }
    }
    if (typeof patch.playing === 'boolean') musicState.playing = patch.playing;
    if (typeof patch.loop === 'boolean') musicState.loop = patch.loop;
    if (typeof patch.playOnOverlay === 'boolean') musicState.playOnOverlay = patch.playOnOverlay;
    if (patch.volume !== undefined) {
      const v = Number(patch.volume);
      if (!Number.isNaN(v)) musicState.volume = Math.max(0, Math.min(1, v));
    }
    persistMusic();
    broadcastMusic();
  });
});

// ==================== BOOT ====================
startNewRound();

server.listen(PORT, () => {
  console.log(`\n================================================`);
  console.log(`  Detektiv Sudoku (Canli Murdoku) isleyir!`);
  console.log(`  Aparici Studiyasi : http://localhost:${PORT}`);
  console.log(`  OBS / Studio Link : http://localhost:${PORT}/?overlay=1`);
  console.log(`  TikTok Kanal      : @${tiktok.username}`);
  console.log(`================================================\n`);
  connectTikTok(DEFAULT_TIKTOK_USER, false);
});

process.on('uncaughtException', (err) => console.error('[UncaughtException]', err?.stack || err));
process.on('unhandledRejection', (reason) => console.error('[UnhandledRejection]', reason));
