const { MAPS, OBJECT_DEFS } = require('../data/maps');

const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Distinct illustrated Azerbaijani detective cast (each round picks 5 suspects + 1 witness)
const CAST_POOL = [
  { name: 'Aysel',  gender: 'f', hair: '#92400e', hairStyle: 'bob',    shirt: '#e11d48', skin: '#fed7aa', glasses: false, beard: false },
  { name: 'Murad',  gender: 'm', hair: '#1e293b', hairStyle: 'short',  shirt: '#2563eb', skin: '#fdba74', glasses: true,  beard: false },
  { name: 'Rəşad',  gender: 'm', hair: '#facc15', hairStyle: 'quiff',  shirt: '#0284c7', skin: '#fed7aa', glasses: false, beard: true  },
  { name: 'Nigar',  gender: 'f', hair: '#1c1917', hairStyle: 'long',   shirt: '#9333ea', skin: '#fdba74', glasses: true,  beard: false },
  { name: 'Tural',  gender: 'm', hair: '#e2e8f0', hairStyle: 'side',   shirt: '#16a34a', skin: '#fed7aa', glasses: false, beard: true  },
  { name: 'Fərid',  gender: 'm', hair: '#451a03', hairStyle: 'short',  shirt: '#d97706', skin: '#eab676', glasses: false, beard: false },
  { name: 'Günay',  gender: 'f', hair: '#b45309', hairStyle: 'bun',    shirt: '#0d9488', skin: '#fed7aa', glasses: false, beard: false },
  { name: 'Orxan',  gender: 'm', hair: '#0f172a', hairStyle: 'curly',  shirt: '#4f46e5', skin: '#e5a978', glasses: true,  beard: true  },
  { name: 'Ləman',  gender: 'f', hair: '#7c2d12', hairStyle: 'wavy',   shirt: '#db2777', skin: '#fed7aa', glasses: false, beard: false },
  { name: 'Elvin',  gender: 'm', hair: '#334155', hairStyle: 'buzz',   shirt: '#059669', skin: '#fdba74', glasses: false, beard: false }
];

function coordLabel(r, c) {
  return `${r + 1}${COLS[c]}`;
}

function buildMapIndex(map) {
  const objAt = Array.from({ length: 6 }, () => Array(6).fill(null));
  for (const obj of map.objects) {
    objAt[obj.r][obj.c] = obj;
  }

  const roomCells = {};
  const canStand = Array.from({ length: 6 }, () => Array(6).fill(true));
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const rm = map.grid[r][c];
      if (!roomCells[rm]) roomCells[rm] = [];
      roomCells[rm].push([r, c]);
      const o = objAt[r][c];
      if (o && OBJECT_DEFS[o.type] && !OBJECT_DEFS[o.type].canOccupy) {
        canStand[r][c] = false;
      }
    }
  }

  // Orthogonal same-room neighbor object types for each cell
  const besideTypes = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => new Set()));
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if (!canStand[r][c]) continue;
      const rm = map.grid[r][c];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= 6 || nc < 0 || nc >= 6) continue;
        if (map.grid[nr][nc] !== rm) continue;
        const nbObj = objAt[nr][nc];
        if (nbObj && !OBJECT_DEFS[nbObj.type].canOccupy) {
          besideTypes[r][c].add(nbObj.type);
        }
      }
    }
  }

  return { objAt, roomCells, canStand, besideTypes };
}

function evalSingleClue(clue, r, c, map, idx) {
  if (!idx.canStand[r][c]) return false;
  if (clue.kind === 'onObject') {
    const o = idx.objAt[r][c];
    return !!o && o.type === clue.objType;
  }
  if (clue.kind === 'inRoom') {
    return map.grid[r][c] === clue.roomId;
  }
  if (clue.kind === 'notInRoom') {
    return map.grid[r][c] !== clue.roomId;
  }
  if (clue.kind === 'besideObject') {
    return idx.besideTypes[r][c].has(clue.objType);
  }
  if (clue.kind === 'notBesideObject') {
    return !idx.besideTypes[r][c].has(clue.objType);
  }
  if (clue.kind === 'aloneInRoom') {
    return map.grid[r][c] === clue.roomId;
  }
  if (clue.kind === 'aloneWithCulprit') {
    return true;
  }
  if (clue.kind === 'rowHint') {
    return r === clue.row;
  }
  if (clue.kind === 'colHint') {
    return c === clue.col;
  }
  return true;
}

function evalAllCluesForPerson(clues, r, c, map, idx) {
  for (const cl of clues) {
    if (!evalSingleClue(cl, r, c, map, idx)) return false;
  }
  return true;
}

/**
 * Exact solver: finds all valid 6-person rook assignments (up to maxSolutions).
 * People indices: 0..4 = suspects, 5 = witness (victim).
 * Witness room MUST contain exactly 2 people (witness + 1 suspect = culprit).
 */
function solvePuzzle(map, idx, peopleClues, maxSolutions = 2) {
  const candidates = peopleClues.map((clues) => {
    const list = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (evalAllCluesForPerson(clues, r, c, map, idx)) {
          list.push([r, c]);
        }
      }
    }
    return list;
  });

  // Order backtracking by fewest candidates first (MRV heuristic) for <0.2ms speed
  const order = [0, 1, 2, 3, 4, 5].sort((a, b) => candidates[a].length - candidates[b].length);
  const usedRow = [false, false, false, false, false, false];
  const usedCol = [false, false, false, false, false, false];
  const placement = new Array(6);
  const solutions = [];

  function backtrack(step) {
    if (solutions.length >= maxSolutions) return;
    if (step === 6) {
      // Verify global room constraints:
      // 1. Every 'aloneInRoom' clue must have room population === 1
      // 2. Witness (index 5) room must have population === 2
      const roomCounts = {};
      for (let p = 0; p < 6; p++) {
        const [r, c] = placement[p];
        const rm = map.grid[r][c];
        roomCounts[rm] = (roomCounts[rm] || 0) + 1;
      }
      const [wr, wc] = placement[5];
      const wRoom = map.grid[wr][wc];
      if (roomCounts[wRoom] !== 2) return;

      for (let p = 0; p < 5; p++) {
        for (const cl of peopleClues[p]) {
          if (cl.kind === 'aloneInRoom' && roomCounts[cl.roomId] !== 1) return;
        }
      }

      // Identify culprit (the single suspect sharing wRoom with witness)
      let culpritIdx = -1;
      for (let p = 0; p < 5; p++) {
        const [r, c] = placement[p];
        if (map.grid[r][c] === wRoom) {
          culpritIdx = p;
          break;
        }
      }
      if (culpritIdx === -1) return;

      solutions.push({
        placement: placement.map(([r, c]) => [r, c]),
        culpritIdx
      });
      return;
    }

    const p = order[step];
    const cand = candidates[p];
    for (let i = 0; i < cand.length; i++) {
      const [r, c] = cand[i];
      if (usedRow[r] || usedCol[c]) continue;
      usedRow[r] = true;
      usedCol[c] = true;
      placement[p] = [r, c];
      backtrack(step + 1);
      usedRow[r] = false;
      usedCol[c] = false;
      if (solutions.length >= maxSolutions) return;
    }
  }

  backtrack(0);
  return solutions;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildAtomicCluesForCell(r, c, roomPop, map, idx) {
  const rm = map.grid[r][c];
  const rmInfo = map.rooms[rm];
  const obj = idx.objAt[r][c];
  const list = [];

  if (obj && OBJECT_DEFS[obj.type].canOccupy) {
    list.push({
      kind: 'onObject',
      objType: obj.type,
      text: OBJECT_DEFS[obj.type].onText,
      weight: 10
    });
  }
  if (roomPop[rm] === 1) {
    list.push({
      kind: 'aloneInRoom',
      roomId: rm,
      text: `${rmInfo.loc} tək idi.`,
      weight: 9
    });
  }
  for (const nbType of idx.besideTypes[r][c]) {
    if (OBJECT_DEFS[nbType]?.besideText) {
      list.push({
        kind: 'besideObject',
        objType: nbType,
        text: OBJECT_DEFS[nbType].besideText,
        weight: 8
      });
    }
  }
  list.push({
    kind: 'inRoom',
    roomId: rm,
    text: `${rmInfo.loc} idi.`,
    weight: 5
  });

  // Add disambiguating secondary options (row/col/notInRoom/notBeside) with lower weight
  const allBlockingPresent = new Set();
  for (const o of map.objects) {
    if (!OBJECT_DEFS[o.type].canOccupy) allBlockingPresent.add(o.type);
  }
  for (const bt of allBlockingPresent) {
    if (!idx.besideTypes[r][c].has(bt) && OBJECT_DEFS[bt]?.notBesideText) {
      list.push({
        kind: 'notBesideObject',
        objType: bt,
        text: OBJECT_DEFS[bt].notBesideText,
        weight: 3
      });
    }
  }
  for (const otherRm of Object.keys(map.rooms)) {
    if (otherRm !== rm) {
      list.push({
        kind: 'notInRoom',
        roomId: otherRm,
        text: `${map.rooms[otherRm].loc} deyildi.`,
        weight: 2
      });
    }
  }
  list.push({
    kind: 'rowHint',
    row: r,
    text: `${r + 1}-ci sətirdə idi.`,
    weight: 1
  });
  list.push({
    kind: 'colHint',
    col: c,
    text: `${COLS[c]} sütununda idi.`,
    weight: 1
  });

  return list;
}

function formatClueText(clues) {
  if (clues.length === 1) return clues[0].text;
  return `${clues[0].text.replace(/\.$/, '')} və ${clues[1].text.charAt(0).toLocaleLowerCase('az')}${clues[1].text.slice(1)}`;
}

function generatePuzzle(preferredMapId = null) {
  const pref = preferredMapId ? MAPS.find((m) => m.id === preferredMapId) : null;
  const mapOrder = pref ? [pref, ...shuffle(MAPS.filter((m) => m.id !== pref.id))] : shuffle(MAPS);

  for (const map of mapOrder) {
    const idx = buildMapIndex(map);
    const validCellsPerRow = Array.from({ length: 6 }, (_, r) => {
      const cols = [];
      for (let c = 0; c < 6; c++) if (idx.canStand[r][c]) cols.push(c);
      return cols;
    });

    for (let attempt = 0; attempt < 240; attempt++) {
      // Pick random 6-rook placement across rows 0..5
      const colChoice = new Array(6);
      const usedC = [false, false, false, false, false, false];
      const rowsOrder = shuffle([0, 1, 2, 3, 4, 5]);
      let okPlacement = true;
      for (const r of rowsOrder) {
        const opts = shuffle(validCellsPerRow[r].filter((c) => !usedC[c]));
        if (opts.length === 0) { okPlacement = false; break; }
        colChoice[r] = opts[0];
        usedC[opts[0]] = true;
      }
      if (!okPlacement) continue;

      const cells = Array.from({ length: 6 }, (_, r) => [r, colChoice[r]]);
      const roomMembers = {};
      const roomPop = {};
      cells.forEach(([r, c], i) => {
        const rm = map.grid[r][c];
        if (!roomMembers[rm]) roomMembers[rm] = [];
        roomMembers[rm].push(i);
        roomPop[rm] = (roomPop[rm] || 0) + 1;
      });

      // Need at least one room with exact population === 2 (Witness + Culprit)
      const pairRooms = Object.keys(roomMembers).filter((rm) => roomMembers[rm].length === 2);
      if (pairRooms.length === 0) continue;

      const targetPairRoom = pairRooms[Math.floor(Math.random() * pairRooms.length)];
      const pairPeople = roomMembers[targetPairRoom];
      const witnessOrigIdx = pairPeople[Math.floor(Math.random() * 2)];
      const culpritOrigIdx = pairPeople.find((p) => p !== witnessOrigIdx);

      // Map original indices so 0..4 are suspects and 5 is witness
      const suspectOrigIndices = shuffle([0, 1, 2, 3, 4, 5].filter((i) => i !== witnessOrigIdx));
      const orderedCells = [...suspectOrigIndices.map((i) => cells[i]), cells[witnessOrigIdx]];
      const expectedCulpritIdx = suspectOrigIndices.indexOf(culpritOrigIdx);

      // Build candidate clues for each of the 5 suspects (prefer high-weight natural clues)
      const clueChoices = orderedCells.slice(0, 5).map(([r, c]) => {
        const all = buildAtomicCluesForCell(r, c, roomPop, map, idx);
        const top = all.filter((cl) => cl.weight >= 5);
        return top.length > 0 ? top : all;
      });

      // Pick initial natural 1-clue-per-suspect combo
      const peopleClues = clueChoices.map((list) => {
        const sorted = list.slice().sort((a, b) => b.weight - a.weight + (Math.random() - 0.5) * 3);
        return [sorted[0]];
      });
      peopleClues.push([{ kind: 'aloneWithCulprit', text: 'Əsas Şahid — Oğru ilə otaqda təkbətək idi.' }]);

      let solutions = solvePuzzle(map, idx, peopleClues, 2);
      if (solutions.length === 0) continue;

      // If more than 1 solution exists, refine/add at most 1 clean disambiguating clue where needed
      let guard = 0;
      while (solutions.length > 1 && guard < 12) {
        guard++;
        const s0 = solutions[0].placement;
        const s1 = solutions[1].placement;
        // Find a suspect that differs between s0 and s1, or witness
        let improved = false;
        for (const p of shuffle([0, 1, 2, 3, 4])) {
          if (s0[p][0] === s1[p][0] && s0[p][1] === s1[p][1]) continue;
          const [r, c] = orderedCells[p];
          const extras = buildAtomicCluesForCell(r, c, roomPop, map, idx)
            .filter((cl) => !peopleClues[p].some((ex) => ex.kind === cl.kind && ex.objType === cl.objType && ex.roomId === cl.roomId));
          // Prefer upgrading to a sharper 1-clue (weight >= 8) before adding a second clause
          const sharp = extras.find((cl) => cl.weight >= 8 && peopleClues[p].length === 1 && peopleClues[p][0].weight < 8);
          if (sharp) {
            peopleClues[p] = [sharp];
            improved = true;
            break;
          }
          if (peopleClues[p].length < 2 && extras.length > 0) {
            const pick = extras.sort((a, b) => b.weight - a.weight)[0];
            peopleClues[p] = [peopleClues[p][0], pick];
            improved = true;
            break;
          }
        }
        if (!improved) {
          // Give witness a room hint only if still ambiguous
          const [wr, wc] = orderedCells[5];
          const wRm = map.grid[wr][wc];
          if (peopleClues[5].length === 1) {
            peopleClues[5].push({ kind: 'inRoom', roomId: wRm, text: `${map.rooms[wRm].loc} idi.` });
            improved = true;
          }
        }
        if (!improved) break;
        solutions = solvePuzzle(map, idx, peopleClues, 2);
      }

      if (solutions.length !== 1) continue;
      if (solutions[0].culpritIdx !== expectedCulpritIdx) continue;

      // Double-verify every person's coordinates match orderedCells exactly
      const sol = solutions[0];
      let exactMatch = true;
      for (let p = 0; p < 6; p++) {
        if (sol.placement[p][0] !== orderedCells[p][0] || sol.placement[p][1] !== orderedCells[p][1]) {
          exactMatch = false;
          break;
        }
      }
      if (!exactMatch) continue;

      const cast = shuffle(CAST_POOL).slice(0, 6);
      const suspects = cast.slice(0, 5).map((actor, i) => ({
        index: i,
        number: i + 1,
        ...actor,
        clueText: formatClueText(peopleClues[i]),
        solution: { r: orderedCells[i][0], c: orderedCells[i][1], coord: coordLabel(orderedCells[i][0], orderedCells[i][1]) }
      }));

      const witness = {
        index: 5,
        number: 6,
        ...cast[5],
        clueText: peopleClues[5].length === 1
          ? 'Əsas Şahid — Oğru ilə otaqda təkbətək idi.'
          : `Əsas Şahid — ${map.rooms[map.grid[orderedCells[5][0]][orderedCells[5][1]]].loc} oğru ilə təkbətək idi.`,
        solution: { r: orderedCells[5][0], c: orderedCells[5][1], coord: coordLabel(orderedCells[5][0], orderedCells[5][1]) }
      };

      return {
        map,
        suspects,
        witness,
        culpritIdx: expectedCulpritIdx,
        culpritName: suspects[expectedCulpritIdx].name
      };
    }
  }

  throw new Error('Failed to generate unique-solution puzzle');
}

module.exports = { generatePuzzle, solvePuzzle, buildMapIndex, coordLabel, COLS };
