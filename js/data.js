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
  { id: 'driver', name: 'Driver' }, { id: 'engine', name: 'Engine' }, { id: 'trail', name: 'Trail' }, { id: 'horn', name: 'Horn' }, { id: 'banner', name: 'Banner' }, { id: 'title', name: 'Title' },
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
  { id: 'b_bike', slot: 'body', name: 'Street Bike', rarity: 'rare', kind: 'bike', stats: [1.02, 1.04, 1.07, 0.97], desc: 'Motorbike. Leans hard into corners and turns on a dime.' },
  { id: 'b_chopper', slot: 'body', name: 'Road Hog', rarity: 'epic', kind: 'chopper', stats: [1.06, 0.97, 0.98, 1.03], desc: 'Long chopper. Fast cruiser with long boosts.' },
  { id: 'b_scooter', slot: 'body', name: 'Zippy', rarity: 'uncommon', kind: 'scooter', stats: [0.95, 1.09, 1.08, 0.98], desc: 'Little scooter. Instant pickup, super nimble.' },
  { id: 'b_atv', slot: 'body', name: 'Quad Crusher', rarity: 'rare', kind: 'atv', stats: [0.99, 1.03, 0.99, 1.01], offroad: true, desc: 'Four-wheeler built for dirt and grass.' },
  { id: 'b_ufo', slot: 'body', name: 'Saucer', rarity: 'legendary', kind: 'ufo', stats: [1.04, 1.03, 1.03, 1.02], offroad: true, desc: 'Flying saucer. Hovers over everything.' },
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
  { id: 'p_sky', slot: 'paint', name: 'Sky High', rarity: 'common', col: [0x6fc3ff, 0xffffff, 'two'] },
  { id: 'p_bee', slot: 'paint', name: 'Bumblebee', rarity: 'uncommon', col: [0xffd23a, 0x1b1b1b, 'stripe'] },
  { id: 'p_ruby', slot: 'paint', name: 'Ruby Glow', rarity: 'epic', col: [0xb5122e, 0xff7a8a, 'two', 0.45] },
  { id: 'p_aurora', slot: 'paint', name: 'Aurora', rarity: 'legendary', col: [0x16c7a0, 0x8a5cff, 'two', 0.6] },
  { id: 'p_flame', slot: 'paint', name: 'Hot Rod', rarity: 'rare', col: [0xff3b1f, 0xffd23a, 'stripe', 0.2] },
  { id: 'p_royal', slot: 'paint', name: 'Royal', rarity: 'epic', col: [0x5a1fb5, 0xffc928, 'stripe', 0.2] },
  { id: 'p_carbon', slot: 'paint', name: 'Carbon', rarity: 'rare', col: [0x22252b, 0xe8333a, 'stripe'] },
  { id: 'p_cotton', slot: 'paint', name: 'Cotton Candy', rarity: 'uncommon', col: [0x9fe0ff, 0xffb5e8, 'two'] },
  { id: 'p_chrome', slot: 'paint', name: 'Chrome', rarity: 'epic', col: [0xdfe6ee, 0x6b7480, 'two', 0.15] },
  { id: 'p_lava', slot: 'paint', name: 'Magma', rarity: 'legendary', col: [0x3a0d0d, 0xff5a1f, 'stripe', 0.8] },
  { id: 'p_jungle', slot: 'paint', name: 'Jungle', rarity: 'uncommon', col: [0x2f7d3a, 0xffe14a, 'stripe'] },
  { id: 'p_void', slot: 'paint', name: 'Void', rarity: 'legendary', col: [0x0d0d1a, 0x8a5cff, 'two', 0.9] },
  { id: 'p_coral', slot: 'paint', name: 'Coral Reef', rarity: 'rare', col: [0xff7a6b, 0x2ad0c8, 'two'] },
  { id: 'd_angel', slot: 'driver', name: 'Halo', rarity: 'epic', col: 0xffffff, top: 'halo' },
  { id: 'd_coach', slot: 'driver', name: 'Pit Boss', rarity: 'uncommon', col: 0x2a7fff, top: 'cap' },
  { id: 'd_ninja', slot: 'driver', name: 'Shadow', rarity: 'rare', col: 0x1b1b22, top: 'band' },
  { id: 'd_star', slot: 'driver', name: 'Superstar', rarity: 'legendary', col: 0xffd23a, top: 'star' },
  { id: 'd_shark', slot: 'driver', name: 'Finn', rarity: 'rare', col: 0x5f8fb0, top: 'fin' },
  { id: 't_hearts', slot: 'trail', name: 'Heartbeat', rarity: 'rare', kind: 'hearts' },
  { id: 't_bolt', slot: 'trail', name: 'Thunderbolt', rarity: 'epic', kind: 'bolt' },
  { id: 't_leaf', slot: 'trail', name: 'Leaf Storm', rarity: 'uncommon', kind: 'leaf' },
  { id: 't_star', slot: 'trail', name: 'Stardust', rarity: 'legendary', kind: 'star' },
  { id: 't_shadow', slot: 'trail', name: 'Dark Matter', rarity: 'epic', kind: 'shadow' },
  { id: 'h_siren', slot: 'horn', name: 'Siren', rarity: 'rare', kind: [660, 880, 660, 880] },
  { id: 'h_ufo', slot: 'horn', name: 'UFO', rarity: 'epic', kind: [300, 600, 1200, 600, 300] },
  { id: 'h_clown', slot: 'horn', name: 'Clown', rarity: 'uncommon', kind: [392, 330, 392, 330] },
  // ---- Turbo Pass tiers 41–100 ----
  { id: 'p_circuit', slot: 'paint', name: 'Circuit', rarity: 'epic', col: [0x10222e, 0x2bf0ff, 'stripe', 0.9], pass: true },
  { id: 'd_phantom', slot: 'driver', name: 'Phantom', rarity: 'epic', col: 0x8a5cff, top: 'horns', pass: true },
  { id: 't_ember', slot: 'trail', name: 'Embers', rarity: 'epic', kind: 'ember', pass: true },
  { id: 'w_turbine', slot: 'wheels', name: 'Turbines', rarity: 'epic', kind: 'turbine', stats: [1.02, 1.0, 1.0, 1.03], pass: true, desc: 'Spinning turbine rims. Longer boosts.' },
  { id: 'e_dark', slot: 'engine', name: 'Dark Matter Drive', rarity: 'legendary', kind: 'dark', stats: [1.05, 1.02, 1.0, 1.04], flame: 0x8a2cff, pass: true, desc: 'Purple-flame powerhouse.' },
  // ---- Prestige exclusives (levels 150–400): Prime versions of pass rewards ----
  { id: 'p_snow_x', slot: 'paint', name: 'Snowcap Prime', rarity: 'legendary', col: [0xffffff, 0x8fe9ff, 'two', 0.75], pass: true, ex: true },
  { id: 'w_candy_x', slot: 'wheels', name: 'Candy Swirls Prime', rarity: 'legendary', kind: 'prime', stats: [1.0, 1.02, 1.01, 1.0], pass: true, ex: true, desc: 'Glowing gold Prime rims.' },
  { id: 't_ice_x', slot: 'trail', name: 'Frostbite Prime', rarity: 'legendary', kind: 'prime', pass: true, ex: true },
  { id: 'd_king_x', slot: 'driver', name: 'Royale King Prime', rarity: 'legendary', col: 0xffd23a, top: 'crown', pass: true, ex: true },
  { id: 'e_fusion_x', slot: 'engine', name: 'Fusion Core Prime', rarity: 'legendary', kind: 'fusion', stats: [1.04, 1.03, 1.0, 1.05], flame: 0xfff2a8, pass: true, ex: true, desc: 'White-gold flame. Same power as the Fusion Core.' },
  { id: 'b_hover_x', slot: 'body', name: 'Anti-Grav Prime', rarity: 'legendary', kind: 'hoverx', stats: [1.03, 1.02, 1.04, 1.03], offroad: true, pass: true, ex: true, desc: 'The level 400 trophy kart.' },
  // ---- player card: banners ----
  { id: 'bn_blue', slot: 'banner', name: 'Starter Blue', rarity: 'common', def: true, css: 'linear-gradient(120deg,#2a5bff,#6b1fd6)' },
  { id: 'bn_sunset', slot: 'banner', name: 'Sunset', rarity: 'uncommon', css: 'linear-gradient(120deg,#ff7b2e,#c2186b 60%,#4a1a8c)' },
  { id: 'bn_forest', slot: 'banner', name: 'Forest', rarity: 'common', css: 'linear-gradient(120deg,#1f7d3a,#7ddc1f)' },
  { id: 'bn_ocean', slot: 'banner', name: 'Deep Ocean', rarity: 'uncommon', css: 'linear-gradient(120deg,#0b3a8a,#16c7c7)' },
  { id: 'bn_candy', slot: 'banner', name: 'Bubblegum', rarity: 'uncommon', css: 'linear-gradient(120deg,#ff7ac8,#ffd27a)' },
  { id: 'bn_carbon', slot: 'banner', name: 'Carbon Fibre', rarity: 'rare', css: 'repeating-linear-gradient(45deg,#1c1f26 0 6px,#2b303a 6px 12px)' },
  { id: 'bn_checker', slot: 'banner', name: 'Chequered Flag', rarity: 'rare', css: 'repeating-conic-gradient(#15171c 0 25%,#e9edf2 0 50%) 0 0/28px 28px' },
  { id: 'bn_neon', slot: 'banner', name: 'Neon Grid', rarity: 'rare', css: 'linear-gradient(rgba(255,43,214,.35) 2px,transparent 2px) 0 0/100% 14px,linear-gradient(90deg,rgba(43,240,255,.35) 2px,transparent 2px) 0 0/14px 100%,#180a3a' },
  { id: 'bn_lava', slot: 'banner', name: 'Lava Flow', rarity: 'epic', css: 'linear-gradient(120deg,#2a0a0a,#ff5a1f 55%,#ffd23a)', anim: true },
  { id: 'bn_galaxy', slot: 'banner', name: 'Galaxy', rarity: 'epic', css: 'radial-gradient(circle at 20% 30%,#ff4fe0 0,transparent 35%),radial-gradient(circle at 80% 70%,#2bf0ff 0,transparent 40%),#1a0b4a', anim: true },
  { id: 'bn_ice', slot: 'banner', name: 'Glacier', rarity: 'rare', css: 'linear-gradient(120deg,#dff6ff,#58b7ff 60%,#2a5bff)' },
  { id: 'bn_gold', slot: 'banner', name: 'Solid Gold', rarity: 'legendary', css: 'linear-gradient(120deg,#8a5a00,#ffd23a 40%,#fff2a8 55%,#c98a00)', anim: true },
  { id: 'bn_flames', slot: 'banner', name: 'Turbo Flames', rarity: 'rare', css: 'linear-gradient(0deg,#ff3b1f,#ff9f2e 45%,#2a0a2a 100%)', pass: true },
  { id: 'bn_storm', slot: 'banner', name: 'Storm Front', rarity: 'epic', css: 'linear-gradient(120deg,#1b2a4a,#5a6b8a 50%,#ffe14a 52%,#1b2a4a 54%)', pass: true, anim: true },
  { id: 'bn_champion', slot: 'banner', name: 'Champion', rarity: 'epic', css: 'linear-gradient(120deg,#6b1fd6,#ffc928)', pass: true, anim: true },
  { id: 'bn_century', slot: 'banner', name: 'Century', rarity: 'legendary', css: 'linear-gradient(120deg,#ff2bd6,#8a5cff 30%,#2bf0ff 60%,#8cff7a)', pass: true, anim: true },
  // ---- player card: titles ----
  { id: 'ti_rookie', slot: 'title', name: 'Rookie', rarity: 'common', def: true, color: '#e6eef8' },
  { id: 'ti_speed', slot: 'title', name: 'Speed Demon', rarity: 'rare', color: '#ff6a4a' },
  { id: 'ti_drift', slot: 'title', name: 'Drift King', rarity: 'rare', color: '#5fd0ff' },
  { id: 'ti_sunday', slot: 'title', name: 'Sunday Driver', rarity: 'common', color: '#c8f0a0' },
  { id: 'ti_coin', slot: 'title', name: 'Coin Collector', rarity: 'uncommon', color: '#ffd23a' },
  { id: 'ti_nitro', slot: 'title', name: 'Nitro Addict', rarity: 'uncommon', color: '#ff9f2e' },
  { id: 'ti_short', slot: 'title', name: 'Shortcut Hunter', rarity: 'uncommon', color: '#8cff7a' },
  { id: 'ti_wall', slot: 'title', name: 'Wall Hugger', rarity: 'common', color: '#c9bfae' },
  { id: 'ti_show', slot: 'title', name: 'Show-off', rarity: 'rare', color: '#ff7ac8' },
  { id: 'ti_rocket', slot: 'title', name: 'Rocket Scientist', rarity: 'epic', color: '#c25cff' },
  { id: 'ti_legend', slot: 'title', name: 'Living Legend', rarity: 'legendary', color: '#ffe14a' },
  { id: 'ti_pass', slot: 'title', name: 'Pass Holder', rarity: 'uncommon', color: '#9fe6ff', pass: true },
  { id: 'ti_charged', slot: 'title', name: 'Turbo Charged', rarity: 'rare', color: '#2bf0ff', pass: true },
  { id: 'ti_unstoppable', slot: 'title', name: 'Unstoppable', rarity: 'epic', color: '#ff5aa8', pass: true },
  { id: 'ti_centurion', slot: 'title', name: 'Centurion', rarity: 'legendary', color: '#ffd23a', pass: true },
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
const DEFAULT_EQUIP = { body: 'b_classic', paint: 'p_cherry', wheels: 'w_stock', driver: 'd_rookie', engine: 'e_stock', trail: 't_none', horn: 'h_beep', banner: 'bn_blue', title: 'ti_rookie' };
const STAT_NAMES = ['Speed', 'Acceleration', 'Handling', 'Boost'];
// combined stats of a loadout: kart × wheels × engine
function kartStats(cos) {
  const out = [1, 1, 1, 1]; let off = false;
  for (const slot of ['body', 'wheels', 'engine']) { const it = CAT[cos[slot]] || CAT[DEFAULT_EQUIP[slot]]; if (!it) continue; if (it.stats) for (let i = 0; i < 4; i++) out[i] *= it.stats[i] === undefined ? 1 : it.stats[i]; if (it.offroad) off = true; }
  return { s: out, offroad: off };
}

// Turbo Pass: 40 tiers, 1000 XP per tier
const PASS_XP = 1000;
const PASS_MAX = 400; // level cap
const PASS_ITEMS = { 5: 'p_snow', 10: 'w_candy', 13: 'w_cyber', 16: 't_ice', 19: 'b_shark', 22: 'd_alien', 28: 'p_toxic', 34: 'd_king', 37: 'e_fusion', 40: 'b_hover',
  45: 'ti_pass', 50: 'bn_flames', 55: 'p_circuit', 60: 'ti_charged', 65: 'bn_storm', 70: 'd_phantom', 75: 'bn_champion', 80: 'ti_unstoppable', 85: 't_ember', 90: 'w_turbine', 95: 'e_dark', 99: 'ti_centurion', 100: 'bn_century',
  // prestige: every 50 levels past 100, an exclusive Prime version of a pass reward
  150: 'p_snow_x', 200: 'w_candy_x', 250: 't_ice_x', 300: 'd_king_x', 350: 'e_fusion_x', 400: 'b_hover_x' };
const PASS_PRESTIGE = [150, 200, 250, 300, 350, 400];
const PASS = (() => {
  const tiers = [];
  for (let t = 1; t <= PASS_MAX; t++) tiers.push(PASS_ITEMS[t] ? { item: PASS_ITEMS[t] } : { coins: t > 100 ? 100 : t > 40 ? (t % 10 === 0 ? 500 : 200) : (t % 3 === 0 ? 300 : 150) });
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

// 3-day challenges (medium) and weekly challenges (very hard)
const TRI_CHALLENGES = [
  { id: 't_win3', text: 'Win 3 races', goal: 3, stat: 'win' },
  { id: 't_drift30', text: 'Land 30 drift boosts', goal: 30, stat: 'driftboost' },
  { id: 't_hit8', text: 'Hit rivals with items 8 times', goal: 8, stat: 'rockethit' },
  { id: 't_short5', text: 'Drive all the way through 5 shortcuts', goal: 5, stat: 'shortcut' },
  { id: 't_trick8', text: 'Land 8 trick boosts off ramps', goal: 8, stat: 'trick' },
  { id: 't_pod5', text: 'Finish top 3 in 5 races', goal: 5, stat: 'podium' },
  { id: 't_slip10', text: 'Slipstream behind rivals 10 times', goal: 10, stat: 'slip' },
  { id: 't_box40', text: 'Smash 40 item boxes', goal: 40, stat: 'box' },
  { id: 't_ko2', text: 'Survive to the final 3 in Knockout twice', goal: 2, stat: 'kotop3' },
];
const WEEK_CHALLENGES = [
  { id: 'w_win12', text: 'Win 12 races', goal: 12, stat: 'win' },
  { id: 'w_hard3', text: 'Win 3 races with bots on Hard', goal: 3, stat: 'hardwin' },
  { id: 'w_nohit', text: 'Win a race without getting hit once', goal: 1, stat: 'nohitwin' },
  { id: 'w_purple25', text: 'Land 25 Ultra (purple) drift boosts', goal: 25, stat: 'purple' },
  { id: 'w_alltracks', text: 'Win on all 4 tracks', goal: 4, stat: 'trackwin' },
  { id: 'w_hit40', text: 'Hit rivals with items 40 times', goal: 40, stat: 'rockethit' },
  { id: 'w_ko2', text: 'Win 2 Knockouts (Victory Royale)', goal: 2, stat: 'kowin' },
  { id: 'w_finish25', text: 'Finish 25 races', goal: 25, stat: 'finish' },
  { id: 'w_trick30', text: 'Land 30 trick boosts', goal: 30, stat: 'trick' },
];
const CH_TIERS = [
  { key: 'daily', name: 'Daily', pool: () => CHALLENGES, count: 4, xp: 500, coins: 100 },
  { key: 'tri', name: '3-Day', pool: () => TRI_CHALLENGES, count: 3, xp: 1500, coins: 400 },
  { key: 'week', name: 'Weekly', pool: () => WEEK_CHALLENGES, count: 3, xp: 5000, coins: 1500 },
];
const DAY_MS = 86400000;
function chPeriod(tier) { // {key, end} for the current period of a tier (UTC)
  const day = Math.floor(Date.now() / DAY_MS);
  if (tier === 'tri') { const n = Math.floor(day / 3); return { key: 't' + n, end: (n + 1) * 3 * DAY_MS }; }
  if (tier === 'week') { const n = Math.floor((day + 3) / 7); return { key: 'w' + n, end: ((n + 1) * 7 - 3) * DAY_MS }; } // weeks start Monday
  return { key: new Date().toISOString().slice(0, 10), end: (day + 1) * DAY_MS };
}

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
    id: 'coral', name: 'Coral Coast', theme: 'beach', width: 24, scale: 1.0, laps: 3,
    pts: [[0, 0, 0], [160, 0, 0], [270, 50, 2], [290, 170, 6], [200, 250, 10], [90, 220, 6], [20, 290, 2], [-110, 320, 0], [-230, 250, 0], [-260, 120, 3], [-170, 60, 6], [-200, -40, 3], [-110, -70, 0]],
  },
  {
    id: 'magma', name: 'Magma Mountain', theme: 'volcano', width: 24, scale: 1.0, laps: 3,
    pts: [[0, 0, 0], [180, -20, 4], [300, 40, 12], [330, 160, 22], [250, 260, 28], [130, 230, 20], [60, 300, 12], [-80, 330, 6], [-200, 270, 10], [-240, 150, 18], [-150, 80, 12], [-230, -10, 6], [-130, -70, 0]],
  },
  {
    id: 'sugar', name: 'Sugar Summit', theme: 'candy', width: 25, scale: 1.0, laps: 3,
    pts: [[0, 0, 0], [140, 30, 0], [240, -20, 3], [340, 60, 6], [320, 190, 10], [200, 210, 6], [140, 300, 2], [0, 280, 0], [-90, 200, 4], [-200, 240, 8], [-290, 150, 4], [-250, 30, 0], [-130, -30, 0]],
  },
  {
    id: 'neon', name: 'Neon Nights', theme: 'neon', width: 24, scale: 1.0, laps: 3,
    pts: [[0, 0, 0], [170, 0, 0], [225, 45, 0], [225, 160, 4], [180, 205, 6], [70, 205, 6], [20, 250, 4], [20, 320, 0], [-25, 365, 0], [-160, 365, 0], [-210, 320, 3], [-210, 50, 3], [-160, 0, 0]],
  },
];
const THEMES = {
  volcano: { sky: [0.35, 0.18, 0.15], fog: [0.45, 0.22, 0.16], fogN: 110, fogF: 470, ground: 0x3a2e2e, ground2: 0x4a3530, hill: 0x2a2020, road: 0x3d3d44, wall: [0xff5a1f, 0x2a2a2a], skyTop: 0x2a0f12, capCol: 0xff5a1f, light: { dir: [0.4, 0.75, 0.3], sky: [0.62, 0.5, 0.48], ground: [0.5, 0.26, 0.18], sun: [0.85, 0.58, 0.4] }, props: 'lava' },
  candy: { sky: [1.0, 0.75, 0.9], fog: [1.0, 0.85, 0.94], fogN: 150, fogF: 540, ground: 0xffc4e1, ground2: 0xffa8d4, hill: 0xc79bff, road: 0x7d5aa8, wall: [0xff5aa8, 0xffffff], skyTop: 0x7ab8ff, light: { dir: [0.35, 0.82, 0.3], sky: [0.7, 0.68, 0.78], ground: [0.45, 0.36, 0.42], sun: [0.75, 0.7, 0.62] }, props: 'candy' },
  beach: { sky: [0.45, 0.8, 1.0], fog: [0.75, 0.92, 1.0], fogN: 150, fogF: 540, ground: 0xf2dc9a, ground2: 0xe6c77a, hill: 0x6fbf5f, road: 0x5a6068, wall: [0x2ad0c8, 0xffffff], light: { dir: [0.35, 0.82, 0.25], sky: [0.66, 0.72, 0.8], ground: [0.45, 0.42, 0.32], sun: [0.8, 0.74, 0.6] }, props: 'palms' },
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
