// 6 Illustrated 6x6 Architectural Crime-Scene Maps (Azerbaijani)

const OBJECT_DEFS = {
  chair:     { label: 'Kreslo',        canOccupy: true,  onText: 'Kresloda oturmuşdu.' },
  car:       { label: 'Avtomobil',     canOccupy: true,  onText: 'Avtomobilin içində idi.' },
  oil:       { label: 'Yağ ləkəsi',    canOccupy: true,  onText: 'Yağ ləkəsinin üstündə idi.' },
  sofa:      { label: 'Divan',         canOccupy: true,  onText: 'Divanda oturmuşdu.' },
  rug:       { label: 'Xalça',         canOccupy: true,  onText: 'Xalçanın üstündə dayanmışdı.' },
  puddle:    { label: 'Su gölməçəsi',  canOccupy: true,  onText: 'Su gölməçəsinin üstündə idi.' },
  bed:       { label: 'Çarpayı',       canOccupy: true,  onText: 'Çarpayıda uzanmışdı.' },
  safe_tile: { label: 'Seyf önü',      canOccupy: true,  onText: 'Seyfin qarşısında dayanmışdı.' },

  table:     { label: 'Masa',          canOccupy: false, besideText: 'Masanın yanında idi.',          notBesideText: 'Masanın yanında deyildi.' },
  shelf:     { label: 'Rəf',           canOccupy: false, besideText: 'Rəfin yanında idi.',            notBesideText: 'Rəfin yanında deyildi.' },
  tv:        { label: 'Televizor',     canOccupy: false, besideText: 'Televizorun yanında idi.',      notBesideText: 'Televizorun yanında deyildi.' },
  plant:     { label: 'Gül dibçəyi',   canOccupy: false, besideText: 'Gülün yanında idi.',            notBesideText: 'Gülün yanında deyildi.' },
  statue:    { label: 'Heykəl',        canOccupy: false, besideText: 'Heykəlin yanında idi.',         notBesideText: 'Heykəlin yanında deyildi.' },
  counter:   { label: 'Piştaxta',      canOccupy: false, besideText: 'Piştaxtanın yanında idi.',      notBesideText: 'Piştaxtanın yanında deyildi.' },
  monitor:   { label: 'Monitor',       canOccupy: false, besideText: 'Monitorun yanında idi.',        notBesideText: 'Monitorun yanında deyildi.' }
};

const MAPS = [
  {
    id: 'car_repair',
    title: '🚗 AVTOSERVİS',
    rooms: {
      rec:  { name: 'QƏBUL',    loc: 'Qəbul otağında',    bg: '#8fa8be', tile: '#839db4', labelAt: [2, 1] },
      stor: { name: 'ANBAR',    loc: 'Anbarda',           bg: '#6e8094', tile: '#64768a', labelAt: [0, 4] },
      wait: { name: 'GÖZLƏMƏ',  loc: 'Gözləmə zalında',   bg: '#9ab6cf', tile: '#8eaac4', labelAt: [2, 4] },
      gar:  { name: 'QARAJ',    loc: 'Qarajda',           bg: '#7d8a97', tile: '#73808d', labelAt: [5, 0] }
    },
    // 6x6 room grid (rows 0..5, cols 0..5)
    grid: [
      ['rec', 'rec', 'rec', 'stor', 'stor', 'stor'],
      ['rec', 'rec', 'rec', 'wait', 'wait', 'stor'],
      ['rec', 'rec', 'rec', 'wait', 'wait', 'wait'],
      ['gar', 'gar', 'gar', 'gar',  'gar',  'gar' ],
      ['gar', 'gar', 'gar', 'gar',  'gar',  'gar' ],
      ['gar', 'gar', 'gar', 'gar',  'gar',  'gar' ]
    ],
    doors: [
      [2, 1, 3, 1], // rec <-> gar
      [0, 4, 1, 4], // stor <-> wait
      [2, 5, 3, 5]  // wait <-> gar
    ],
    objects: [
      { r: 0, c: 0, type: 'table', variant: 'small' },
      { r: 0, c: 1, type: 'chair' },
      { r: 0, c: 2, type: 'table', variant: 'desk_tl' },
      { r: 1, c: 1, type: 'table', variant: 'desk_bl' },
      { r: 1, c: 2, type: 'table', variant: 'desk_br' },
      { r: 2, c: 2, type: 'shelf' },
      { r: 0, c: 3, type: 'tv' },
      { r: 0, c: 5, type: 'shelf' },
      { r: 1, c: 4, type: 'plant' },
      { r: 2, c: 3, type: 'chair' },
      { r: 2, c: 4, type: 'chair' },
      { r: 3, c: 3, type: 'shelf' },
      { r: 3, c: 4, type: 'shelf' },
      { r: 4, c: 1, type: 'car', spanCols: 2, color: '#818cf8' },
      { r: 4, c: 2, type: 'car', hiddenPart: true },
      { r: 4, c: 4, type: 'oil' },
      { r: 5, c: 0, type: 'oil' },
      { r: 5, c: 3, type: 'car', spanCols: 2, color: '#e2d4b7' },
      { r: 5, c: 4, type: 'car', hiddenPart: true }
    ]
  },
  {
    id: 'bank_vault',
    title: '🏦 BANK SEYFİ',
    rooms: {
      kassa: { name: 'KASSA',    loc: 'Kassada',         bg: '#9cb0a5', tile: '#90a499', labelAt: [2, 0] },
      muhaf: { name: 'MÜHAFİZƏ', loc: 'Mühafizədə',      bg: '#6d7a8e', tile: '#647185', labelAt: [0, 4] },
      seyf:  { name: 'SEYF',     loc: 'Seyf otağında',   bg: '#8a8599', tile: '#7e798d', labelAt: [5, 0] },
      kabin: { name: 'KABİNET',  loc: 'Kabinetdə',       bg: '#a89c86', tile: '#9c907b', labelAt: [5, 4] }
    },
    grid: [
      ['kassa', 'kassa', 'kassa', 'muhaf', 'muhaf', 'muhaf'],
      ['kassa', 'kassa', 'kassa', 'muhaf', 'muhaf', 'muhaf'],
      ['kassa', 'kassa', 'kassa', 'muhaf', 'muhaf', 'muhaf'],
      ['seyf',  'seyf',  'seyf',  'kabin', 'kabin', 'kabin'],
      ['seyf',  'seyf',  'seyf',  'kabin', 'kabin', 'kabin'],
      ['seyf',  'seyf',  'seyf',  'kabin', 'kabin', 'kabin']
    ],
    doors: [
      [1, 2, 1, 3],
      [2, 1, 3, 1],
      [2, 4, 3, 4],
      [4, 2, 4, 3]
    ],
    objects: [
      { r: 0, c: 0, type: 'counter' },
      { r: 0, c: 1, type: 'counter' },
      { r: 1, c: 2, type: 'plant' },
      { r: 2, c: 1, type: 'chair' },
      { r: 2, c: 2, type: 'rug' },
      { r: 0, c: 3, type: 'monitor' },
      { r: 0, c: 5, type: 'chair' },
      { r: 1, c: 4, type: 'table' },
      { r: 2, c: 5, type: 'shelf' },
      { r: 3, c: 0, type: 'safe_tile' },
      { r: 4, c: 1, type: 'rug' },
      { r: 5, c: 2, type: 'safe_tile' },
      { r: 3, c: 5, type: 'shelf' },
      { r: 4, c: 3, type: 'sofa', spanCols: 2, color: '#38bdf8' },
      { r: 4, c: 4, type: 'sofa', hiddenPart: true },
      { r: 5, c: 3, type: 'plant' },
      { r: 5, c: 5, type: 'chair' }
    ]
  },
  {
    id: 'hotel_lobby',
    title: '🏨 OTEL LOBBİSİ',
    rooms: {
      lobbi:  { name: 'LOBBİ',    loc: 'Lobbidə',         bg: '#9ca3af', tile: '#9098a5', labelAt: [2, 0] },
      kafe:   { name: 'KAFE',     loc: 'Kafedə',          bg: '#b0937e', tile: '#a48772', labelAt: [0, 4] },
      dehliz: { name: 'DƏHLİZ',   loc: 'Dəhlizdə',        bg: '#7d8fa3', tile: '#728498', labelAt: [4, 0] },
      vip:    { name: 'VİP OTAQ', loc: 'VİP otaqda',      bg: '#8a7ca8', tile: '#7f719c', labelAt: [5, 4] }
    },
    grid: [
      ['lobbi',  'lobbi',  'lobbi',  'kafe',   'kafe',   'kafe'  ],
      ['lobbi',  'lobbi',  'lobbi',  'kafe',   'kafe',   'kafe'  ],
      ['lobbi',  'lobbi',  'lobbi',  'dehliz', 'vip',    'vip'   ],
      ['dehliz', 'dehliz', 'dehliz', 'dehliz', 'vip',    'vip'   ],
      ['dehliz', 'dehliz', 'dehliz', 'vip',    'vip',    'vip'   ],
      ['dehliz', 'dehliz', 'dehliz', 'vip',    'vip',    'vip'   ]
    ],
    doors: [
      [0, 2, 0, 3],
      [2, 1, 3, 1],
      [2, 3, 2, 4],
      [4, 2, 4, 3]
    ],
    objects: [
      { r: 0, c: 0, type: 'counter' },
      { r: 0, c: 2, type: 'plant' },
      { r: 1, c: 1, type: 'rug' },
      { r: 2, c: 2, type: 'chair' },
      { r: 0, c: 4, type: 'table' },
      { r: 1, c: 3, type: 'chair' },
      { r: 1, c: 5, type: 'counter' },
      { r: 3, c: 0, type: 'plant' },
      { r: 3, c: 2, type: 'puddle' },
      { r: 4, c: 1, type: 'sofa', spanCols: 2, color: '#fb7185' },
      { r: 4, c: 2, type: 'sofa', hiddenPart: true },
      { r: 5, c: 0, type: 'shelf' },
      { r: 2, c: 5, type: 'tv' },
      { r: 3, c: 4, type: 'rug' },
      { r: 4, c: 4, type: 'bed', spanCols: 2, color: '#facc15' },
      { r: 4, c: 5, type: 'bed', hiddenPart: true },
      { r: 5, c: 4, type: 'chair' }
    ]
  },
  {
    id: 'museum_hall',
    title: '🏛️ MUZEY ZALI',
    rooms: {
      bilet:  { name: 'BİLET',   loc: 'Bilet zalında',  bg: '#8fa49a', tile: '#82978d', labelAt: [2, 0] },
      heykel: { name: 'HEYKƏL',  loc: 'Heykəl zalında', bg: '#a39988', tile: '#978d7c', labelAt: [1, 4] },
      arxiv:  { name: 'ARXİV',   loc: 'Arxivdə',        bg: '#737f91', tile: '#687486', labelAt: [5, 0] },
      qalere: { name: 'QALEREYA',loc: 'Qalereyada',     bg: '#8e849e', tile: '#837992', labelAt: [5, 4] }
    },
    grid: [
      ['bilet', 'bilet', 'heykel', 'heykel', 'heykel', 'heykel'],
      ['bilet', 'bilet', 'heykel', 'heykel', 'heykel', 'heykel'],
      ['bilet', 'bilet', 'heykel', 'heykel', 'heykel', 'heykel'],
      ['arxiv', 'arxiv', 'arxiv',  'qalere', 'qalere', 'qalere'],
      ['arxiv', 'arxiv', 'arxiv',  'qalere', 'qalere', 'qalere'],
      ['arxiv', 'arxiv', 'arxiv',  'qalere', 'qalere', 'qalere']
    ],
    doors: [
      [1, 1, 1, 2],
      [2, 0, 3, 0],
      [2, 4, 3, 4],
      [4, 2, 4, 3]
    ],
    objects: [
      { r: 0, c: 0, type: 'counter' },
      { r: 1, c: 1, type: 'chair' },
      { r: 2, c: 1, type: 'plant' },
      { r: 0, c: 3, type: 'statue' },
      { r: 0, c: 5, type: 'statue' },
      { r: 1, c: 4, type: 'rug' },
      { r: 2, c: 3, type: 'chair' },
      { r: 3, c: 1, type: 'shelf' },
      { r: 4, c: 0, type: 'table' },
      { r: 4, c: 2, type: 'chair' },
      { r: 5, c: 1, type: 'safe_tile' },
      { r: 3, c: 5, type: 'tv' },
      { r: 4, c: 4, type: 'sofa', spanCols: 2, color: '#a78bfa' },
      { r: 4, c: 5, type: 'sofa', hiddenPart: true },
      { r: 5, c: 3, type: 'puddle' },
      { r: 5, c: 5, type: 'statue' }
    ]
  },
  {
    id: 'cafe_kitchen',
    title: '☕ KAFE VƏ MƏTBƏX',
    rooms: {
      zal:    { name: 'ZAL',     loc: 'Zalda',         bg: '#b59d84', tile: '#a89077', labelAt: [2, 0] },
      bar:    { name: 'BAR',     loc: 'Bar zonasında', bg: '#7b8fa1', tile: '#708395', labelAt: [0, 4] },
      metbex: { name: 'MƏTBƏX',  loc: 'Mətbəxdə',      bg: '#8a9e91', tile: '#7f9285', labelAt: [4, 0] },
      bagca:  { name: 'BAĞÇA',   loc: 'Bağçada',       bg: '#6d9174', tile: '#63866a', labelAt: [5, 4] }
    },
    grid: [
      ['zal',    'zal',    'zal',    'bar',   'bar',   'bar'  ],
      ['zal',    'zal',    'zal',    'bar',   'bar',   'bar'  ],
      ['zal',    'zal',    'zal',    'bar',   'bar',   'bar'  ],
      ['metbex', 'metbex', 'metbex', 'bagca', 'bagca', 'bagca'],
      ['metbex', 'metbex', 'metbex', 'bagca', 'bagca', 'bagca'],
      ['metbex', 'metbex', 'metbex', 'bagca', 'bagca', 'bagca']
    ],
    doors: [
      [1, 2, 1, 3],
      [2, 1, 3, 1],
      [2, 4, 3, 4],
      [4, 2, 4, 3]
    ],
    objects: [
      { r: 0, c: 0, type: 'table' },
      { r: 0, c: 2, type: 'sofa', spanCols: 1, color: '#f59e0b' },
      { r: 1, c: 1, type: 'chair' },
      { r: 2, c: 0, type: 'plant' },
      { r: 0, c: 4, type: 'counter' },
      { r: 0, c: 5, type: 'tv' },
      { r: 1, c: 4, type: 'chair' },
      { r: 2, c: 3, type: 'rug' },
      { r: 3, c: 0, type: 'counter' },
      { r: 3, c: 2, type: 'shelf' },
      { r: 4, c: 1, type: 'puddle' },
      { r: 5, c: 0, type: 'shelf' },
      { r: 5, c: 2, type: 'chair' },
      { r: 3, c: 5, type: 'plant' },
      { r: 4, c: 4, type: 'table' },
      { r: 4, c: 5, type: 'chair' },
      { r: 5, c: 3, type: 'puddle' }
    ]
  },
  {
    id: 'luxury_yacht',
    title: '🚢 LÜKS YAXTA',
    rooms: {
      korpu:  { name: 'KÖRPÜ',   loc: 'Kapitan körpüsündə', bg: '#69839c', tile: '#5e7891', labelAt: [1, 0] },
      salon:  { name: 'SALON',   loc: 'Salonda',            bg: '#9c927d', tile: '#908671', labelAt: [1, 4] },
      kayut:  { name: 'KAYUTA',  loc: 'Kayutada',           bg: '#837a96', tile: '#786f8b', labelAt: [5, 0] },
      goyert: { name: 'GÖYƏRTƏ', loc: 'Göyərtədə',          bg: '#6d99a6', tile: '#628e9b', labelAt: [5, 4] }
    },
    grid: [
      ['korpu', 'korpu', 'salon', 'salon', 'salon', 'salon'],
      ['korpu', 'korpu', 'salon', 'salon', 'salon', 'salon'],
      ['korpu', 'korpu', 'salon', 'salon', 'salon', 'salon'],
      ['kayut', 'kayut', 'kayut', 'goyert','goyert','goyert'],
      ['kayut', 'kayut', 'kayut', 'goyert','goyert','goyert'],
      ['kayut', 'kayut', 'kayut', 'goyert','goyert','goyert']
    ],
    doors: [
      [1, 1, 1, 2],
      [2, 0, 3, 0],
      [2, 4, 3, 4],
      [4, 2, 4, 3]
    ],
    objects: [
      { r: 0, c: 0, type: 'monitor' },
      { r: 0, c: 1, type: 'chair' },
      { r: 2, c: 1, type: 'table' },
      { r: 0, c: 3, type: 'tv' },
      { r: 1, c: 3, type: 'sofa', spanCols: 2, color: '#fb923c' },
      { r: 1, c: 4, type: 'sofa', hiddenPart: true },
      { r: 2, c: 2, type: 'plant' },
      { r: 2, c: 5, type: 'rug' },
      { r: 3, c: 1, type: 'shelf' },
      { r: 4, c: 0, type: 'bed', spanCols: 2, color: '#38bdf8' },
      { r: 4, c: 1, type: 'bed', hiddenPart: true },
      { r: 5, c: 2, type: 'chair' },
      { r: 3, c: 5, type: 'puddle' },
      { r: 4, c: 4, type: 'chair' },
      { r: 5, c: 3, type: 'puddle' },
      { r: 5, c: 5, type: 'plant' }
    ]
  }
];

module.exports = { MAPS, OBJECT_DEFS };
