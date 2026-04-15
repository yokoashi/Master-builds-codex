import { useState, useEffect } from "react";

const C={bg:"#0b0a08",card:"#18140f",cardHi:"#221c15",text:"#d8cfba",dim:"#8a8070",bright:"#f5ede0",red:"#e74c3c",crimson:"#d64545",green:"#2ecc71",blue:"#3498db",orange:"#e67e22",yellow:"#f1c40f",purple:"#b370d8",fire:"#ff6b47",cyan:"#1abc9c",gold:"#e8c05a"};

const crimsonReaper={label:"Crimson Reaper",sub:"Bleed Build",icon:"🩸",accent:C.crimson,
playstyle:"Heavy-hitting Grand Sword wielder who procs Bleed and Poison to melt bosses with massive burst damage. Trade hits behind heavy armor and watch health bars evaporate.",
cls:"Udirangr Warwolf",caps:"Soft 50 / Hard 75 (offensive)",weaponReq:"20 STR / 32 RAD",
loadouts:[
{id:"two_hand",label:"Two-Hand BG",weaponWt:"~24",endReq:"25",armor:"Sovereign Protector or Tancred's at higher END.",pros:"Best armor options. Only 1 Deralium Chunk needed. Higher per-swing damage.",cons:"Lower Bleed application rate (one weapon)."},
{id:"dual_bg",label:"Dual Bloody Glory",weaponWt:"~48",endReq:"28–30+",armor:"Angel of Void (~44 wt) or Warwolf Set (~35 wt). OR Crafter's Essence rune on one BG.",pros:"Double 300 Bleed = instant proc. Highest status DPS.",cons:"Very heavy. Need 2 Deralium Chunks."},
{id:"bg_abiding",label:"BG + Abiding Defender",weaponWt:"~46",endReq:"28–30+",armor:"Lighter armor or use Crafter's Essence rune.",pros:"Different moveset variety. Abiding Defender has Inferno rune slot.",cons:"Heavy. Lower base damage on off-hand."}],
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:15,END:12,STR:16,AGI:10,RAD:8,INF:8},sn:"Rush VIT to 20, then END to 20. Survival first.",
weapons:[{n:"Warwolf Axe (starting)",ap:"~180",eq:true,d:"Default starter.",loc:"Starting gear.",up:"Upgrade to +2–3 if spare materials.",tip:"Two-hand for extra damage."}],
armor:[{n:"Udirangr Warwolf Set",wt:"~35",eq:true,d:"Strong elemental resists.",loc:"Starting gear OR Thehk-Ihir at Forsaken Fen.",up:"N/A",tip:"Easy medium encumbrance."}],
acc:[{n:"Use whatever you find",ef:"No build-defining rings yet",eq:true,d:"Save Vigor for Pilgrim's Perch Key.",loc:"N/A",up:"N/A",tip:"N/A"}],spells:[],
dmg:{ps:"~180–250",sp:"None yet",bs:"Slow",n:"Focus on dodge timing and stamina."}},
{name:"Core Weapon",range:"Lv 15–25",stats:{VIT:20,END:20,STR:20,AGI:10,RAD:8,INF:8},sn:"VIT/END at 20. BG needs 20 STR + 32 RAD — use Crafter's Essence to bypass.",
weapons:[{n:"Bloody Glory",ap:"~400–550",st:"300 Bleed",eq:true,wt:"~24",d:"THE bleed weapon. Highest Bleed in game. Physical + Holy. Requires 20 STR / 32 RAD.",loc:"Pilgrim's Perch → Buy Perch Key from Stomund (~9,500) → Belled Rise → Path of Devotion → corpse near Vestige.",up:"+0 to +2: Small Deralium Fragments.",tip:"Crafter's Essence rune bypasses all requirements."}],
armor:[{n:"Fitzroy's Set",wt:"71.7",eq:true,d:"Best early heavy armor.",loc:"Fitzroy's Gorge → Past Ruiner → Climb tower → Chest.",up:"N/A",tip:"END 20 for medium encumbrance."}],
acc:[{n:"Save a ring slot",ef:"Bloodbane coming soon",eq:true,d:"Use whatever helps.",loc:"N/A",up:"N/A",tip:"N/A"}],spells:[],
dmg:{ps:"~400–550",sp:"Bleed burst every 2–4 combos",bs:"Moderate",n:"Massive jump. Bleed proc = burst damage + physical vulnerability."}},
{name:"Key Accessories",range:"Lv 20–30",stats:{VIT:22,END:22,STR:26,AGI:10,RAD:12,INF:12},sn:"Push STR toward 30. RAD/INF to 12 for future spells.",
weapons:[{n:"Bloody Glory (+3 to +5)",ap:"~550–700",st:"300 Bleed",eq:true,d:"Significant damage jump at +5.",loc:"Acquired.",up:"Regular Deralium Nuggets — Gerlinde after Sunless Skein.",tip:"Two-hand still best."}],
armor:[{n:"Fitzroy's Set",wt:"71.7",eq:true,d:"Still best.",loc:"Acquired.",up:"N/A",tip:"Sovereign Protector coming."}],
acc:[
{n:"Bloodbane Ring",ef:"Bleed when you inflict Poison",eq:true,d:"BUILD ENGINE. Poison → Bleed simultaneously.",loc:"Forsaken Fen swamp area.",up:"N/A",tip:"NEVER unequip."},
{n:"Pendant of Burden",ef:"+Damage per active status",eq:true,d:"Amplifies ALL damage per active status.",loc:"Forsaken Fen Umbral side.",up:"N/A",tip:"Permanent."}],spells:[],
dmg:{ps:"~550–700 + Pendant bonus",sp:"Bleed + Poison bursting",bs:"Fast",n:"Bloodbane + Pendant = massive spike."}},
{name:"Unlock Spells",range:"Lv 25–40",stats:{VIT:25,END:24,STR:32,AGI:10,RAD:18,INF:12},sn:"RAD to 15+ for Lacerating Weapon. STR past 30.",
weapons:[{n:"Bloody Glory (+5 to +7)",ap:"~700–850",st:"360 Bleed w/ Lacerating",eq:true,d:"Lacerating Weapon adds +60 Bleed.",loc:"Acquired.",up:"Large Deralium Shards. BEST FARM: Holy Bulwark at Vestige of Brother Jeremiah.",tip:"Cast Lacerating before every boss."}],
armor:[{n:"Fitzroy's or Sovereign Protector",wt:"71.7 / Heavy",eq:true,d:"Sovereign if two-handing.",loc:"Sovereign Protector: Sunless Skein mines chest.",up:"N/A",tip:"Stay Medium."}],
acc:[
{n:"Bloodbane Ring",ef:"Bleed on Poison",eq:true,d:"Core.",loc:"Acquired.",up:"N/A",tip:"Even stronger now."},
{n:"Pendant of Burden",ef:"+Damage per status",eq:true,d:"Core.",loc:"Acquired.",up:"N/A",tip:"Permanent."},
{n:"Melchior's Ring",ef:"Boosts physical damage",eq:true,d:"Bleed makes enemies vulnerable to physical.",loc:"Mid-game exploration.",up:"N/A",tip:"Or Lucent Sword Ring."}],
spells:[
{n:"Lacerating Weapon",ef:"+60 Bleed + damage",eq:true,d:"Buffs weapon. Cast before every fight.",loc:"Radiance spell ~15 RAD.",up:"Scales with RAD.",tip:"Cast FIRST, then Poison Weapon."},
{n:"Poison Weapon",ef:"Poison → triggers Bloodbane → Bleed",eq:true,d:"Per swing: 360 Bleed + Poison + Bloodbane Bleed.",loc:"Umbral spell ~12 RAD/INF.",up:"Scales with spell power.",tip:"Use Poison Salts as alternative."}],
dmg:{ps:"~700–850 + Pendant amp",sp:"Bleed in 1–2 swings",bs:"Very fast",n:"HUGE spike. Build truly OP here."}},
{name:"Dual-Wield",range:"Lv 35–55",stats:{VIT:30,END:28,STR:38,AGI:10,RAD:32,INF:12},sn:"STR approaching soft cap. RAD at 32 — meets BG reqs.",
weapons:[
{n:"Bloody Glory (+7 to +9)",ap:"~850–950",st:"300 Bleed",eq:true,wt:"~24",d:"Approaching peak.",loc:"Acquired.",up:"Large Deralium Shards.",tip:"Dual-wield now."},
{n:"2nd BG OR Luminous Abiding Defender",ap:"~700–850",st:"High Bleed",eq:true,wt:"~22–24",d:"Two BGs = double 300 Bleed.",loc:"2nd BG: NG+/trade. Abiding Defender: Manse of Hallowed Brothers boss.",up:"Same materials.",tip:"Crafter's Essence on one for weight management."}],
armor:[{n:"Depends on Loadout",eq:true,d:"Dual Grand Swords = ~46–48 wt. Use Loadout selector.",loc:"Sovereign Protector / Angel of Void / Ring of Bones.",up:"N/A",tip:"See selector above."}],
acc:[
{n:"Bloodbane Ring",ef:"Bleed on Poison",eq:true,d:"Core.",loc:"Acquired.",up:"N/A",tip:"Never remove."},
{n:"Pendant of Burden",ef:"+Damage per status",eq:true,d:"Core.",loc:"Acquired.",up:"N/A",tip:"Never remove."},
{n:"Lucent Sword Ring",ef:"Damage boost when HP high",eq:true,d:"Heavy armor = consistently active.",loc:"Mid-late.",up:"N/A",tip:"Swap Melchior's for tough bosses."}],
spells:[
{n:"Lacerating Weapon",ef:"+60 Bleed",eq:true,d:"Core.",loc:"Acquired.",up:"Scales RAD.",tip:"Always."},
{n:"Poison Weapon",ef:"Poison → Bleed chain",eq:true,d:"Core.",loc:"Acquired.",up:"Scales spell power.",tip:"Always."}],
dmg:{ps:"~850–950 (main) + ~700–850 (off)",sp:"Bleed in 1 combo",bs:"Extremely fast",n:"Dual Grand Swords with spells = absurd."}},
{name:"Endgame",range:"Lv 55+",stats:{VIT:35,END:30,STR:50,AGI:10,RAD:40,INF:12},sn:"STR at 50 (soft cap). RAD at 40 for max spell power.",
weapons:[
{n:"Bloody Glory +10",ap:"~1,000 (651 base)",st:"300 Bleed",eq:true,wt:"~24",d:"At +10: 651 AP, A+ RAD scaling.",loc:"Acquired.",up:"Deralium Chunk. ~4 per playthrough: Revelation Depths cave, Tower of Penance jail, Bramis Castle chest, Fief of Chill Curse.",tip:"Socket Omiron runes or Crafter's Essence."},
{n:"2nd weapon +10",ap:"~800–1,000",st:"High Bleed",eq:true,wt:"~22–24",d:"Fully upgraded off-hand.",loc:"Acquired.",up:"Another Deralium Chunk.",tip:"Consider keeping off-hand at +9 if tight."}],
armor:[{n:"Based on Loadout",eq:true,d:"With Crafter's Essence: Sovereign Protector or Tancred's. Without: Angel of Void.",loc:"Tancred's: Trade Remembrance with Molhu.",up:"N/A",tip:"At END 30 / VIT 35, handles most heavy armor."}],
acc:[
{n:"Bloodbane Ring",ef:"Bleed on Poison",eq:true,d:"Permanent.",loc:"Acquired.",up:"N/A",tip:"Irreplaceable."},
{n:"Pendant of Burden",ef:"+Damage per status",eq:true,d:"Permanent.",loc:"Acquired.",up:"N/A",tip:"Irreplaceable."},
{n:"Lucent Sword Ring",ef:"High HP = more damage",eq:true,d:"Consistently active.",loc:"Acquired.",up:"N/A",tip:"Best general option."}],
spells:[
{n:"Lacerating Weapon",ef:"+60 Bleed",eq:true,d:"Core.",loc:"Acquired.",up:"Max RAD.",tip:"Pre-buff."},
{n:"Poison Weapon",ef:"Poison → Bleed",eq:true,d:"Core.",loc:"Acquired.",up:"Spell power.",tip:"Pre-buff."}],
dmg:{ps:"~1,000 main + ~800 off = ~1,800/dual swing",sp:"Bleed every combo",bs:"Most bosses 15–30s",n:"Final form. You are the boss now."}},
{name:"NG+",range:"NG+1 to NG+7",stats:{VIT:40,END:35,STR:60,AGI:10,RAD:50,INF:15},
sn:"NG+ pushes stats past soft caps. Use cycle selector below for NG+1 → NG+7 progression up to LotF hard cap (75).",
ngCycles:[
{label:"NG+1",stats:{VIT:40,END:35,STR:60,AGI:10,RAD:50,INF:15},notes:"Just past soft caps. Enemies hit ~50% harder so VIT first. STR to 60 for solid scaling above the soft cap."},
{label:"NG+3",stats:{VIT:50,END:38,STR:70,AGI:10,RAD:60,INF:18},notes:"Comfortable cycle. STR pushing toward hard cap. RAD up for spell power scaling."},
{label:"NG+5",stats:{VIT:55,END:40,STR:75,AGI:10,RAD:70,INF:20},notes:"STR hard cap (75) reached. END at hard cap (40) for max stamina. Min-max focus."},
{label:"NG+7",stats:{VIT:60,END:40,STR:75,AGI:10,RAD:75,INF:22},notes:"All offensive stats at LotF hard cap. Maximum theoretical power. Total ~322 stat points = SL ~250+."}],
weapons:[{n:"Bloody Glory +10 (Crafter's Essence)",ap:"~1,100+",st:"300 Bleed",eq:true,wt:"0",d:"Same weapon. Socket Crafter's Essence rune to remove all weight and stat reqs.",loc:"Acquired.",up:"Already +10. Sockets reset between cycles.",tip:"Socket Sundering Marrow runes for armor pierce vs NG+ heavy enemies."}],
armor:[{n:"Tancred's or Sovereign Protector",wt:"81.2 / 75",eq:true,d:"Top-tier endgame armor at higher END.",loc:"Tancred's: Trade Remembrance with Molhu.",up:"N/A",tip:"With END 38+, you can fast roll in Tancred's."}],
acc:[{n:"Bloodbane + Pendant of Burden + Lucent Sword Ring",ef:"Same trinity",eq:true,d:"Same setup as endgame. All three slots locked.",loc:"Acquired.",up:"N/A",tip:"With higher VIT in NG+, Lucent Sword stays active longer."}],
spells:[{n:"Lacerating + Poison Weapon (pre-buff combo)",ef:"+60 Bleed + Poison chain",eq:true,d:"Both spells pre-buffed before every fight.",loc:"Acquired.",up:"Max RAD/spell scaling.",tip:"Always pre-cast in this order."}],
dmg:{ps:"~1,200/swing NG+1, ~1,800+/swing NG+7",sp:"Bleed every combo, % of bigger HP pool",bs:"NG+ bosses 30–60s",n:"NG+ bosses have larger HP pools but Bleed deals % damage on proc — Bleed builds DOMINATE NG+ cycles."}}
],
/* >>>CONTINUE<<< */
