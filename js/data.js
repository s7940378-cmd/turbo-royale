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
  { id: 'driver', name: 'Driver' }, { id: 'engine', name: 'Engine' }, { id: 'trail', name: 'Trail' }, { id: 'horn', name: 'Horn' },
];
// stats: speed/accel/handling multipliers (bodies only)
const CATALOG = [
  // bodies — stats: [speed, acceleration, handling, boost]
  { id: 'b_classic', slot: 'body', name: 'Go-Getter', rarity: 'common', def: true, kind: 'classic', stats: [1, 1, 1, 1], desc: 'All-rounder. No weaknesses.' },
  { id: 'b_racer', slot: 'body', name: 'Streak', rarity: 'rare', kind: 'racer', stats: [1.05, 0.95, 1.02, 0.98], desc: 'Low and fast. Slow off the line.' },
  { id: 'b_buggy', slot: 'body', name: 'Dune Buggy', rarity: 'uncommon', kind: 'buggy', stats: [0.97, 1.06, 1.02, 0.99], offroad: true, desc: 'Quick to accelerate and barely slows off-road.' },
  { id: 'b_muscle', slot: 'body', name: 'Big Block', rarity: 'epic', kind: 'muscle', stats: [1.07, 0.94, 0.95, 1.02], desc: 'Huge top speed, heavy in the turns.' },
  { id: 'b_hover', slot: 'body', name: 'Anti-Grav', rarity: 'legendary', kind: 'hover', stats: [1.03, 1.02, 1.04, 1.03], offroad: true, pass: true, desc: 'Floats over grass. Great at everything.' },
  { id: 'b_tub', slot: 'body', name: 'Bath Tub', rarity: 'epic', kind: 'tub', stats: [0.98, 1.04, 1.05, 1.0], desc: 'Surprisingly nimble. Rubber duck included.' },
  { id: 'b_formula', slot: 'body', name: 'Apex F', rarity: 'legendary', kind: 'formula', stats: [1.06, 0.96, 1.06, 0.98], desc: 'Open-wheel racer. Fast and razor sharp, slow to get going.' },
  { id: 'b_truck', slot: 'body', name: 'Mud Hauler', rarity: 'rare', kind: 'truck', stats: [0.98, 1.04, 0.96, 1.02], offroad: true, desc: 'Mini pickup. Shrugs off grass and gravel.' },
  { id: 'b_jet', slot: 'body', name: 'Jet Sled', rarity: 'epic', kind: 'jet', stats: [1.06, 0.95, 0.96, 1.08], desc: 'Jet engine strapped to a seat. Boosts last longer.' },
  { id: 'b_bug', slot: 'body', name: 'Bubble Bug', rarity: 'uncommon', kind: 'bug', stats: [0.96, 1.07, 1.05, 0.99], desc: 'Tiny round car. Zippy and easy to steer.' },
  { id: 'b_shark', slot: 'body', name: 'Great White', rarity: 'epic', kind: 'shark', stats: [1.04, 0.98, 1.03, 1.0], pass: true, desc: 'Sleek shark body with a dorsal fin.' },
  { id: 'b_roadster', slot: 'body', name: 'Cruiser 59', rarity: 'rare', kind: 'roadster', stats: [1.02, 0.98, 0.99, 1.05], desc: 'Retro roadster with tail fins. Long boosts.' },
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
  // wheels — stats multiply with the kart's
  { id: 'w_stock', slot: 'wheels', name: 'Stock', rarity: 'common', def: true, kind: 'stock', stats: [1, 1, 1, 1], desc: 'Standard wheels.' },
  { id: 'w_chrome', slot: 'wheels', name: 'Chrome Spinners', rarity: 'rare', kind: 'chrome', stats: [1.02, 0.99, 1.0, 1.0], desc: 'Shiny and slightly faster.' },
  { id: 'w_neon', slot: 'wheels', name: 'Neon Rims', rarity: 'epic', kind: 'neon', stats: [1.0, 1.0, 1.02, 1.03], desc: 'Glowing rims. Better drift boosts.' },
  { id: 'w_gold', slot: 'wheels', name: '24K Rollers', rarity: 'legendary', kind: 'gold', stats: [1.03, 0.99, 1.01, 1.01], desc: 'Solid gold. Fast and flashy.' },
  { id: 'w_monster', slot: 'wheels', name: 'Monster Treads', rarity: 'uncommon', kind: 'monster', stats: [0.97, 1.03, 0.97, 1.0], offroad: true, desc: 'Giant tyres. Barely slow down off-road.' },
  { id: 'w_candy', slot: 'wheels', name: 'Candy Swirls', rarity: 'rare', kind: 'candy', stats: [1.0, 1.02, 1.01, 1.0], pass: true, desc: 'Sweet and grippy.' },
  { id: 'w_slick', slot: 'wheels', name: 'Race Slicks', rarity: 'epic', kind: 'slick', stats: [1.04, 0.98, 1.02, 0.98], desc: 'Pro racing tyres. Fast on tarmac.' },
  { id: 'w_knobby', slot: 'wheels', name: 'Trail Knobbies', rarity: 'uncommon', kind: 'knobby', stats: [0.98, 1.03, 1.0, 1.0], offroad: true, desc: 'Chunky tread for dirt and grass.' },
  { id: 'w_mini', slot: 'wheels', name: 'Roller Minis', rarity: 'common', kind: 'mini', stats: [0.96, 1.07, 1.03, 1.0], desc: 'Tiny wheels. Instant acceleration, lower top speed.' },
  { id: 'w_cyber', slot: 'wheels', name: 'Cyber Discs', rarity: 'legendary', kind: 'cyber', stats: [1.02, 1.01, 1.02, 1.02], pass: true, desc: 'Solid light discs. A bit better at everything.' },
  { id: 'w_wood', slot: 'wheels', name: 'Wagon Wheels', rarity: 'uncommon', kind: 'wood', stats: [0.98, 1.0, 1.04, 1.0], desc: 'Old-timey spokes that hold a tight line.' },
  // engines — stats only (plus exhaust colour)
  { id: 'e_stock', slot: 'engine', name: 'Stock Twin', rarity: 'common', def: true, kind: 'stock', stats: [1, 1, 1, 1], flame: 0xffa020, desc: 'Reliable two-cylinder.' },
  { id: 'e_turbo', slot: 'engine', name: 'Turbo Four', rarity: 'rare', kind: 'turbo', stats: [1.03, 0.98, 1.0, 1.02], flame: 0x4fc3ff, desc: 'More top speed, a bit of turbo lag.' },
  { id: 'e_torque', slot: 'engine', name: 'Torque Monster', rarity: 'uncommon', kind: 'torque', stats: [0.98, 1.07, 0.99, 1.0], flame: 0xff5a2e, desc: 'Explodes off the line.' },
  { id: 'e_electric', slot: 'engine', name: 'Volt Cell', rarity: 'rare', kind: 'electric', stats: [0.99, 1.05, 1.02, 0.97], flame: 0x6dff7a, desc: 'Silent instant torque.' },
  { id: 'e_nitro', slot: 'engine', name: 'Nitrous Kit', rarity: 'epic', kind: 'nitro', stats: [1.0, 0.98, 1.0, 1.12], flame: 0xc25cff, desc: 'Every boost lasts much longer.' },
  { id: 'e_v12', slot: 'engine', name: 'V12 Thunder', rarity: 'legendary', kind: 'v12', stats: [1.06, 1.0, 0.97, 1.03], flame: 0xffe14a, desc: 'Massive top speed.' },
  { id: 'e_hamster', slot: 'engine', name: 'Hamster Wheel', rarity: 'common', kind: 'hamster', stats: [0.97, 1.03, 1.04, 0.98], flame: 0xffc4e1, desc: 'Powered by a very motivated hamster.' },
  { id: 'e_fusion', slot: 'engine', name: 'Fusion Core', rarity: 'legendary', kind: 'fusion', stats: [1.04, 1.03, 1.0, 1.05], flame: 0x2bf0ff, pass: true, desc: 'Top-tier power from a tiny star.' },
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
const DEFAULT_EQUIP = { body: 'b_classic', paint: 'p_cherry', wheels: 'w_stock', driver: 'd_rookie', engine: 'e_stock', trail: 't_none', horn: 'h_beep' };
const STAT_NAMES = ['Speed', 'Acceleration', 'Handling', 'Boost'];
// combined stats of a loadout: kart × wheels × engine
function kartStats(cos) {
  const out = [1, 1, 1, 1]; let off = false;
  for (const slot of ['body', 'wheels', 'engine']) { const it = CAT[cos[slot]] || CAT[DEFAULT_EQUIP[slot]]; if (!it) continue; if (it.stats) for (let i = 0; i < 4; i++) out[i] *= it.stats[i] === undefined ? 1 : it.stats[i]; if (it.offroad) off = true; }
  return { s: out, offroad: off };
}

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
    else if (t === 13) r = { item: 'w_cyber' }; else if (t === 19) r = { item: 'b_shark' }; else if (t === 37) r = { item: 'e_fusion' };
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
  torpedo: { name: 'Torpedo', icon: '🌠' },
  gold: { name: 'Golden Nitro', icon: '🌟' },
  seeker: { name: 'Crown Seeker', icon: '🎯' },
  decoy: { name: 'Decoy Box', icon: '📦' },
};
// Comeback-balanced item odds. posFrac: 0 = leader … 1 = last. gap: laps behind the leader.
// Leaders get defensive / neutral items; trailing racers get speed and gap-closers.
function rollItem(rand, posFrac, lastThree, gap, seekerOK) {
  gap = gap || 0;
  let w;
  if (posFrac <= 0.001) w = { oil: 28, decoy: 24, shield: 26, nitro: 22 };
  else if (posFrac < 0.35) w = { oil: 18, decoy: 14, rocket: 30, nitro: 26, shield: 12 };
  else if (posFrac < 0.7) w = { rocket: 30, nitro: 24, nitro3: 18, shield: 8, oil: 8, gold: 6, seeker: 6 };
  else w = { nitro3: 24, gold: 18, rocket: 20, surge: 10, seeker: 12, nitro: 10 };
  if (lastThree) w.torpedo = posFrac >= 0.99 ? 22 : 14;
  // the further behind, the stronger the catch-up items
  const boost = gap > 0.25 ? 2 : gap > 0.12 ? 1.5 : gap < 0.03 ? 0.5 : 1;
  for (const k of ['gold', 'torpedo', 'nitro3', 'seeker', 'surge']) if (w[k]) w[k] *= boost;
  if (!seekerOK || gap < 0.05) delete w.seeker;
  let tot = 0; for (const k in w) tot += w[k];
  let r = rand() * tot; for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'nitro';
}
