// Turbo Royale — game data: cosmetics, tracks, pass, challenges
'use strict';
const RARITY = {
  common: { name: 'Common', color: '#8a96a3', bg: 'linear-gradient(160deg,#9aa6b2,#5d6874)', price: 200 },
  uncommon: { name: 'Uncommon', color: '#5cc93b', bg: 'linear-gradient(160deg,#6fd84b,#2d7d1d)', price: 400 },
  rare: { name: 'Rare', color: '#38a7ff', bg: 'linear-gradient(160deg,#4cb5ff,#1557b8)', price: 800 },
  epic: { name: 'Epic', color: '#c25cff', bg: 'linear-gradient(160deg,#cd6bff,#6b1fb5)', price: 1200 },
  legendary: { name: 'Legendary', color: '#ff9f2e', bg: 'linear-gradient(160deg,#ffb347,#c2541a)', price: 2000 },
};
const SLOTS = [
  { id: 'body', name: 'Kart' }, { id: 'paint', name: 'Paint' }, { id: 'wheels', name: 'Wheels' },
  { id: 'driver', name: 'Driver' }, { id: 'trail', name: 'Trail' }, { id: 'horn', name: 'Horn' },
];
// stats: speed/accel/handling multipliers (bodies only)
const CATALOG = [
  // bodies
  { id: 'b_classic', slot: 'body', name: 'Go-Getter', rarity: 'common', def: true, kind: 'classic', stats: [1, 1, 1] },
  { id: 'b_racer', slot: 'body', name: 'Streak', rarity: 'rare', kind: 'racer', stats: [1.04, 0.96, 1] },
  { id: 'b_buggy', slot: 'body', name: 'Dune Buggy', rarity: 'uncommon', kind: 'buggy', stats: [0.98, 1.05, 1.02] },
  { id: 'b_muscle', slot: 'body', name: 'Big Block', rarity: 'epic', kind: 'muscle', stats: [1.05, 0.95, 0.97] },
  { id: 'b_hover', slot: 'body', name: 'Anti-Grav', rarity: 'legendary', kind: 'hover', stats: [1.03, 1.03, 1.03], pass: true },
  { id: 'b_tub', slot: 'body', name: 'Bath Tub', rarity: 'epic', kind: 'tub', stats: [1, 1.02, 1.02] },
  // paints [primary, secondary, pattern, emissive?, metal]
  { id: 'p_cherry', slot: 'paint', name: 'Cherry Red', rarity: 'common', def: true, col: [0xe8333a, 0xffffff, 'stripe'] },
  { id: 'p_ocean', slot: 'paint', name: 'Ocean Blue', rarity: 'common', col: [0x2a7fff, 0xffffff, 'stripe'] },
  { id: 'p_lime', slot: 'paint', name: 'Lime Zest', rarity: 'uncommon', col: [0x7ddc1f, 0x1b1b1b, 'stripe'] },
  { id: 'p_sunset', slot: 'paint', name: 'Sunset Split', rarity: 'rare', col: [0xff7b2e, 0xc2186b, 'two'] },
  { id: 'p_midnight', slot: 'paint', name: 'Midnight', rarity: 'rare', col: [0x1b1e2e, 0x00e5ff, 'stripe', 0.6] },
  { id: 'p_bubble', slot: 'paint', name: 'Bubblegum', rarity: 'uncommon', col: [0xff7ac8, 0xfff27a, 'two'] },
  { id: 'p_gold', slot: 'paint', name: 'Gold Rush', rarity: 'legendary', col: [0xffc928, 0x6b3d00, 'stripe', 0.15] },
  { id: 'p_galaxy', slot: 'paint', name: 'Galaxy', rarity: 'epic', col: [0x4a1a8c, 0xff4fe0, 'two', 0.35] },
  { id: 'p_toxic', slot: 'paint', name: 'Toxic', rarity: 'epic', col: [0x2b2b2b, 0x8cff00, 'stripe', 0.7], pass: true },
  { id: 'p_mint', slot: 'paint', name: 'Mint Chip', rarity: 'uncommon', col: [0x8ff0c9, 0x4a2c1d, 'two'] },
  { id: 'p_snow', slot: 'paint', name: 'Snowcap', rarity: 'rare', col: [0xf4f8ff, 0x58b7ff, 'two'], pass: true },
  // wheels
  { id: 'w_stock', slot: 'wheels', name: 'Stock', rarity: 'common', def: true, kind: 'stock' },
  { id: 'w_chrome', slot: 'wheels', name: 'Chrome Spinners', rarity: 'rare', kind: 'chrome' },
  { id: 'w_neon', slot: 'wheels', name: 'Neon Rims', rarity: 'epic', kind: 'neon' },
  { id: 'w_gold', slot: 'wheels', name: '24K Rollers', rarity: 'legendary', kind: 'gold' },
  { id: 'w_monster', slot: 'wheels', name: 'Monster Treads', rarity: 'uncommon', kind: 'monster' },
  { id: 'w_candy', slot: 'wheels', name: 'Candy Swirls', rarity: 'rare', kind: 'candy', pass: true },
  // drivers
  { id: 'd_rookie', slot: 'driver', name: 'Rookie', rarity: 'common', def: true, col: 0xffffff, top: 'none' },
  { id: 'd_blaze', slot: 'driver', name: 'Blaze', rarity: 'rare', col: 0xe03a2e, top: 'horns' },
  { id: 'd_frost', slot: 'driver', name: 'Frost Queen', rarity: 'epic', col: 0x9fe6ff, top: 'crown' },
  { id: 'd_bunny', slot: 'driver', name: 'Hop Star', rarity: 'uncommon', col: 0xffb5d8, top: 'ears' },
  { id: 'd_robo', slot: 'driver', name: 'Unit-77', rarity: 'rare', col: 0xb8c4cc, top: 'antenna' },
  { id: 'd_pumpkin', slot: 'driver', name: 'Jack Rush', rarity: 'epic', col: 0xff8a1c, top: 'stem' },
  { id: 'd_kitty', slot: 'driver', name: 'Whisker', rarity: 'uncommon', col: 0xffe08a, top: 'cat' },
  { id: 'd_punk', slot: 'driver', name: 'Riot', rarity: 'rare', col: 0x2b2b2b, top: 'mohawk' },
  { id: 'd_king', slot: 'driver', name: 'Royale King', rarity: 'legendary', col: 0x7a2cff, top: 'crown', pass: true },
  { id: 'd_alien', slot: 'driver', name: 'Zorp', rarity: 'epic', col: 0x6dff7a, top: 'antenna2', pass: true },
  // trails
  { id: 't_none', slot: 'trail', name: 'None', rarity: 'common', def: true, kind: 'none' },
  { id: 't_smoke', slot: 'trail', name: 'Burnout', rarity: 'common', kind: 'smoke' },
  { id: 't_fire', slot: 'trail', name: 'Hot Lap', rarity: 'rare', kind: 'fire' },
  { id: 't_rainbow', slot: 'trail', name: 'Rainbow Road', rarity: 'legendary', kind: 'rainbow' },
  { id: 't_spark', slot: 'trail', name: 'Glitter Bomb', rarity: 'epic', kind: 'sparkle' },
  { id: 't_bubble', slot: 'trail', name: 'Bubbly', rarity: 'uncommon', kind: 'bubbles' },
  { id: 't_ice', slot: 'trail', name: 'Frostbite', rarity: 'rare', kind: 'ice', pass: true },
  // horns
  { id: 'h_beep', slot: 'horn', name: 'Beep Beep', rarity: 'common', def: true, kind: [520, 520] },
  { id: 'h_duck', slot: 'horn', name: 'Quack', rarity: 'uncommon', kind: [700, 380] },
  { id: 'h_tune', slot: 'horn', name: 'Fanfare', rarity: 'rare', kind: [523, 659, 784, 1046] },
  { id: 'h_low', slot: 'horn', name: 'Big Rig', rarity: 'epic', kind: [140, 140] },
];
const CAT = Object.fromEntries(CATALOG.map(i => [i.id, i]));
const DEFAULT_EQUIP = { body: 'b_classic', paint: 'p_cherry', wheels: 'w_stock', driver: 'd_rookie', trail: 't_none', horn: 'h_beep' };

// Turbo Pass: 40 tiers, 1000 XP per tier
const PASS_XP = 1000;
const PASS = (() => {
  const items = ['p_snow', 'w_candy', 't_ice', 'd_alien', 'p_toxic', 'd_king', 'b_hover'];
  const tiers = [];
  for (let t = 1; t <= 40; t++) {
    let r;
    if (t === 5) r = { item: 'p_snow' }; else if (t === 10) r = { item: 'w_candy' }; else if (t === 16) r = { item: 't_ice' };
    else if (t === 22) r = { item: 'd_alien' }; else if (t === 28) r = { item: 'p_toxic' }; else if (t === 34) r = { item: 'd_king' };
    else if (t === 40) r = { item: 'b_hover' };
    else r = { coins: t % 3 === 0 ? 300 : 150 };
    tiers.push(r);
  }
  return tiers;
})();

const CHALLENGES = [
  { id: 'races3', text: 'Finish 3 races', goal: 3, stat: 'finish' },
  { id: 'win1', text: 'Win a race', goal: 1, stat: 'win' },
  { id: 'podium2', text: 'Finish top 3 twice', goal: 2, stat: 'podium' },
  { id: 'rocket3', text: 'Hit rivals with rockets 3 times', goal: 3, stat: 'rockethit' },
  { id: 'drift10', text: 'Land 10 drift boosts', goal: 10, stat: 'driftboost' },
  { id: 'items8', text: 'Use 8 items', goal: 8, stat: 'itemuse' },
  { id: 'boxes15', text: 'Smash 15 item boxes', goal: 15, stat: 'box' },
  { id: 'ko1', text: 'Survive to the final 3 in Knockout', goal: 1, stat: 'kotop3' },
  { id: 'pads6', text: 'Hit 6 boost pads', goal: 6, stat: 'pad' },
  { id: 'purple3', text: 'Land 3 Ultra (purple) drift boosts', goal: 3, stat: 'purple' },
  { id: 'party1', text: 'Race with a party member', goal: 1, stat: 'partyrace' },
];

// Tracks: control points [x, z, y], scaled ×S
const TRACKS = [
  {
    id: 'sunny', name: 'Sunny Speedway', theme: 'meadow', width: 24, scale: 1.0, laps: 3,
    pts: [[0, 0, 0], [150, 0, 0], [260, 40, 2], [300, 150, 6], [240, 250, 8], [120, 260, 4], [60, 200, 0], [-20, 240, 0], [-140, 260, 4], [-240, 180, 6], [-260, 60, 3], [-150, -20, 0]],
  },
  {
    id: 'dune', name: 'Dune Drift', theme: 'desert', width: 25, scale: 1.0, laps: 3,
    pts: [[0, 0, 0], [200, -30, 4], [330, 60, 12], [300, 200, 8], [160, 180, 0], [100, 300, 0], [-60, 330, 8], [-200, 250, 16], [-160, 120, 6], [-290, 40, 2], [-200, -80, 0]],
  },
  {
    id: 'frost', name: 'Frostbite Pass', theme: 'snow', width: 23, scale: 1.0, laps: 3,
    pts: [[0, 0, 0], [130, -60, 6], [260, -40, 16], [320, 80, 24], [220, 160, 16], [270, 280, 8], [120, 340, 2], [-40, 290, 0], [-90, 170, 8], [-220, 190, 14], [-310, 60, 8], [-190, -40, 0]],
  },
  {
    id: 'neon', name: 'Neon Nights', theme: 'neon', width: 24, scale: 1.0, laps: 3,
    pts: [[0, 0, 0], [170, 0, 0], [225, 45, 0], [225, 160, 4], [180, 205, 6], [70, 205, 6], [20, 250, 4], [20, 320, 0], [-25, 365, 0], [-160, 365, 0], [-210, 320, 3], [-210, 50, 3], [-160, 0, 0]],
  },
];
const THEMES = {
  meadow: { sky: [0.52, 0.78, 1.0], fog: [0.72, 0.86, 1.0], fogN: 140, fogF: 520, ground: 0x5fbf3f, ground2: 0x3f9a2c, hill: 0x7a9a50, road: 0x55585f, wall: [0xff3b3b, 0xffffff], light: { dir: [0.4, 0.8, 0.3], sky: [0.62, 0.68, 0.78], ground: [0.38, 0.36, 0.3], sun: [0.75, 0.7, 0.6] }, props: 'trees' },
  desert: { sky: [1.0, 0.8, 0.55], fog: [1.0, 0.86, 0.66], fogN: 140, fogF: 520, ground: 0xe8bf72, ground2: 0xd49a52, hill: 0xc9874a, road: 0x6b5a4b, wall: [0x2a7fff, 0xffffff], light: { dir: [0.5, 0.75, -0.2], sky: [0.7, 0.62, 0.55], ground: [0.45, 0.35, 0.25], sun: [0.8, 0.68, 0.5] }, props: 'cactus' },
  snow: { sky: [0.75, 0.86, 0.98], fog: [0.86, 0.92, 1.0], fogN: 120, fogF: 460, ground: 0xf2f6fb, ground2: 0xd6e4f2, hill: 0xb9c9db, road: 0x4b5160, wall: [0x2fa3ff, 0xffffff], light: { dir: [0.3, 0.8, 0.4], sky: [0.7, 0.75, 0.85], ground: [0.45, 0.48, 0.55], sun: [0.55, 0.55, 0.55] }, props: 'pines' },
  neon: { sky: [0.06, 0.03, 0.16], fog: [0.12, 0.04, 0.24], fogN: 90, fogF: 430, ground: 0x1c1430, ground2: 0x261a40, hill: 0x2b1f4a, road: 0x22222c, wall: [0xff2bd6, 0x2bf0ff], light: { dir: [0.2, 0.9, 0.3], sky: [0.42, 0.32, 0.6], ground: [0.2, 0.12, 0.3], sun: [0.35, 0.3, 0.45] }, props: 'city', neon: true },
};
const MODES = {
  gp: { id: 'gp', name: 'Grand Prix', desc: '3 laps · 8 racers · items on', icon: '🏁' },
  ko: { id: 'ko', name: 'Knockout', desc: 'Last place is eliminated every 20s. Be the last kart standing.', icon: '🌀' },
  tt: { id: 'tt', name: 'Time Trial', desc: 'Solo · no items · set the fastest 3 laps', icon: '⏱' },
};
const BOT_NAMES = ['Turbo Tina', 'Drift King', 'Max Nitro', 'Lil Burnout', 'Pixel Pete', 'Skidmark', 'Captain Brake', 'Zoomer', 'Vroom Vroom', 'Sir Spins', 'Gravel Gus', 'Apex Annie', 'Coach Clutch', 'Nina Nitro'];

// coin rewards by place (1-indexed)
const PLACE_COINS = [250, 180, 140, 110, 90, 70, 55, 45];
const PLACE_XP = [700, 560, 480, 420, 380, 350, 330, 320];

// item definitions
const ITEMS = {
  nitro: { name: 'Nitro', icon: '🔥' },
  nitro3: { name: 'Triple Nitro', icon: '🔥' },
  rocket: { name: 'Rocket', icon: '🚀' },
  oil: { name: 'Oil Slick', icon: '🛢' },
  shield: { name: 'Shield', icon: '🛡' },
  surge: { name: 'Storm Surge', icon: '⚡' },
};
function rollItem(rand, posFrac) { // posFrac 0 = leader, 1 = last
  const w = posFrac < 0.15 ? { oil: 40, shield: 30, rocket: 15, nitro: 15 }
    : posFrac < 0.5 ? { oil: 20, rocket: 35, nitro: 30, shield: 15 }
      : posFrac < 0.8 ? { rocket: 35, nitro: 30, nitro3: 20, shield: 10, oil: 5 }
        : { nitro3: 35, rocket: 30, surge: 15, nitro: 20 };
  let tot = 0; for (const k in w) tot += w[k];
  let r = rand() * tot; for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'nitro';
}
