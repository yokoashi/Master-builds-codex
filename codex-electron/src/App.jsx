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
sim:[
{label:"Venom Blade",sub:"AGI Bleed/Poison",icon:"🗡️",a:C.green,cls:"Exiled Stalker",why:"Same Bleed+Poison core, fast short swords.",
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:18,END:18,STR:9,AGI:20,RAD:8,INF:8},sn:"Rush AGI.",weapons:[{n:"Exiled Stalker Daggers",ap:"~120",eq:true,d:"Starting daggers.",loc:"Starting gear.",up:"Upgrade early.",tip:"Fast attacks."}],armor:[{n:"Blackfeather Set",wt:"Light",eq:true,d:"Light fast armor.",loc:"Starting gear.",up:"N/A",tip:"Stay light."}],acc:[],spells:[],dmg:{ps:"~120/hit",sp:"None yet",bs:"Slow",n:"Rush AGI."}},
{name:"Mid Game",range:"Lv 20–35",stats:{VIT:22,END:20,STR:9,AGI:30,RAD:12,INF:12},sn:"AGI 30, dual status.",weapons:[{n:"Kukajin's + Bloodlust",ap:"~300–400",st:"Bleed+Poison",eq:true,d:"Dual status daggers.",loc:"Forsaken Fen / exploration.",up:"Deralium Nuggets.",tip:"Dual wield."}],armor:[{n:"Bone Armor Set",wt:"Light",eq:true,d:"Light armor.",loc:"Exploration.",up:"N/A",tip:"Stay light."}],acc:[{n:"Bloodbane Ring",ef:"Bleed on Poison",eq:true,d:"Core.",loc:"Forsaken Fen.",up:"N/A",tip:"Never remove."}],spells:[],dmg:{ps:"~300–400/hit",sp:"Triple status",bs:"Moderate",n:"Double status procs."}},
{name:"Endgame",range:"Lv 40+",stats:{VIT:25,END:22,STR:9,AGI:50,RAD:12,INF:12},sn:"AGI 50 soft cap.",weapons:[{n:"Both +10",ap:"~500–600",st:"Constant procs",eq:true,d:"Fully upgraded.",loc:"Acquired.",up:"Deralium Chunks.",tip:"Pre-buff with Poison Weapon."}],armor:[{n:"Bone or Light",wt:"Light",eq:true,d:"Stay light.",loc:"Acquired.",up:"N/A",tip:"Mobility."}],acc:[{n:"Bloodbane + Pendant of Burden",ef:"Status chain",eq:true,d:"Core duo.",loc:"Acquired.",up:"N/A",tip:"Never remove."}],spells:[],dmg:{ps:"~500–600/hit",sp:"Constant procs",bs:"Fast",n:"Constant triple status."}}],
key:[{i:"Kukajin's Sword",d:"Bleed+Poison, A AGI. Forsaken Fen."},{i:"Bloodlust",d:"Bleed+Burn, A- AGI/INF."},{i:"Bloodbane Ring",d:"Forsaken Fen."},{i:"Pendant of Burden",d:"Umbral Forsaken Fen."}],
steps:["Start Exiled Stalker → VIT/END 20","Push AGI 25+","Bloodbane Ring","Get Kukajin's Sword","Get Bloodlust","Dual-wield","Light armor, AGI 50"]},
{label:"Status Assassin",sub:"Frost/Bleed/Poison",icon:"❄️",a:C.blue,cls:"Exiled Stalker",why:"Triple status for max Pendant of Burden bonus.",
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:18,END:18,STR:9,AGI:20,RAD:8,INF:8},sn:"Rush AGI.",weapons:[{n:"Starting Daggers",ap:"~120",eq:true,d:"Default.",loc:"Starting gear.",up:"Upgrade.",tip:"Fast."}],armor:[{n:"Starting Set",wt:"Light",eq:true,d:"Starter.",loc:"Starting.",up:"N/A",tip:"Light."}],acc:[],spells:[],dmg:{ps:"~120/hit",sp:"None",bs:"Slow",n:"Rush AGI."}},
{name:"Mid Game",range:"Lv 20–35",stats:{VIT:22,END:20,STR:9,AGI:28,RAD:12,INF:15},sn:"Dual Kinrangr, triple status.",weapons:[{n:"Dual Kinrangr Daggers",ap:"~250–350",st:"Frostbite",eq:true,d:"Frostbite buildup.",loc:"Exploration.",up:"Nuggets.",tip:"Dual wield."}],armor:[{n:"Descrier Guide",wt:"Light",eq:true,d:"Light armor.",loc:"Exploration.",up:"N/A",tip:"Light."}],acc:[{n:"Bloodbane Ring",ef:"Bleed on Poison",eq:true,d:"Core.",loc:"Forsaken Fen.",up:"N/A",tip:"Never remove."}],spells:[],dmg:{ps:"~250–350",sp:"Triple status",bs:"Moderate",n:"Triple stack."}},
{name:"Endgame",range:"Lv 40+",stats:{VIT:25,END:20,STR:9,AGI:50,RAD:15,INF:15},sn:"AGI 50, max triple proc.",weapons:[{n:"Dual Kinrangr +10",ap:"~400–500",st:"Constant procs",eq:true,d:"Fully upgraded.",loc:"Acquired.",up:"Chunks.",tip:"Triple stack constantly."}],armor:[{n:"Descrier",wt:"Light",eq:true,d:"Best light.",loc:"Acquired.",up:"N/A",tip:"Light."}],acc:[{n:"Bloodbane + Pendant + Yorke's Ring",ef:"Triple stack amp",eq:true,d:"Frostbite damage ring.",loc:"Acquired.",up:"N/A",tip:"All three."}],spells:[],dmg:{ps:"~400–500",sp:"Constant triple procs",bs:"Fast",n:"Triple status constantly."}}],
key:[{i:"Kinrangr Hunter Daggers",d:"Frostbite buildup."},{i:"Bloodbane Ring",d:"Forsaken Fen."},{i:"Yorke's Ring",d:"Frostbite damage."},{i:"Pendant of Burden",d:"Umbral Forsaken Fen."}],
steps:["Start Exiled Stalker","Farm Kinrangr Daggers","Bloodbane + Pendant","RAD/INF 12 for Poison Weapon","Triple stack","AGI 50"]},
{label:"Burning Blood",sub:"STR Bleed+Burn",icon:"🔥",a:C.orange,cls:"Udirangr Warwolf",why:"Heavy STR like Crimson Reaper but Inferno instead of Radiance.",
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:18,END:18,STR:20,AGI:10,RAD:8,INF:10},sn:"STR 20 early.",weapons:[{n:"Starting Axe → Bloodlust",ap:"~200–350",st:"Bleed+Burn",eq:true,d:"Transition weapon.",loc:"Starting / exploration.",up:"Upgrade.",tip:"STR scaling."}],armor:[{n:"Warwolf → Fitzroy's",wt:"Heavy",eq:true,d:"Heavy armor.",loc:"Starting / Fitzroy's Gorge.",up:"N/A",tip:"Tank hits."}],acc:[],spells:[],dmg:{ps:"~200–350",sp:"Bleed+Burn",bs:"Slow",n:"STR early."}},
{name:"Mid Game",range:"Lv 20–35",stats:{VIT:25,END:22,STR:30,AGI:10,RAD:8,INF:20},sn:"Sword of Skin & Tooth.",weapons:[{n:"Sword of Skin & Tooth",ap:"~600–800",st:"Bleed+Burn",eq:true,d:"A+ STR scaling.",loc:"Calrath City false wall via Umbral.",up:"Large Shards.",tip:"Two-hand."}],armor:[{n:"Fitzroy's Set",wt:"71.7",eq:true,d:"Best early heavy.",loc:"Acquired.",up:"N/A",tip:"Stay medium."}],acc:[{n:"Ring of Infernal Devotion",ef:"Burn→Ignite",eq:true,d:"Burns become Ignite.",loc:"Exploration.",up:"N/A",tip:"Core."}],spells:[],dmg:{ps:"~600–800 + 200 Burn",sp:"Bleed+Burn+Ignite",bs:"Fast",n:"Inferno synergy."}},
{name:"Endgame",range:"Lv 40+",stats:{VIT:30,END:25,STR:50,AGI:10,RAD:8,INF:30},sn:"STR 50 soft cap.",weapons:[{n:"SoST +10",ap:"~1,000+",st:"Ignite AoE",eq:true,d:"Fully upgraded.",loc:"Acquired.",up:"Chunk.",tip:"Ignite AoE clears groups."}],armor:[{n:"Tancred's",wt:"81.2",eq:true,d:"Best heavy.",loc:"Trade Remembrance.",up:"N/A",tip:"High END needed."}],acc:[{n:"Pendant of Burden + Ring of Infernal Devotion",ef:"Status amp",eq:true,d:"Both core.",loc:"Acquired.",up:"N/A",tip:"Never remove."}],spells:[],dmg:{ps:"~1,000+ with Ignite AoE",sp:"Bleed+Burn+Ignite",bs:"Very fast",n:"Ignite AoE deletes groups."}}],
key:[{i:"Sword of Skin & Tooth",d:"A+ STR. Calrath City false wall via Umbral."},{i:"Ring of Infernal Devotion",d:"Burn→Ignite."},{i:"Pendant of Burden",d:"Umbral Forsaken Fen."}],
steps:["Start Warwolf","STR 25+, Bloodlust","Bloodbane","SoST in Calrath","Ring of Infernal Devotion","STR 50"]}
],
oth:[
{label:"Holy Juggernaut",sub:"STR/RAD Paladin",icon:"⚔️",a:C.yellow,cls:"Orian Preacher",why:"Most meta build. Tank STR + Radiance with massive Holy damage.",
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:18,END:18,STR:12,AGI:8,RAD:22,INF:8},sn:"RAD 22 early.",weapons:[{n:"Pieta's Sword",ap:"~300–500",st:"Smite",eq:true,d:"A- RAD sword.",loc:"Trade Pieta Remembrance with Molhu.",up:"Small Fragments.",tip:"RAD scaling."}],armor:[{n:"Pieta's Set",wt:"57.6",eq:true,d:"Holy defense.",loc:"Trade Remembrance.",up:"N/A",tip:"Medium."}],acc:[],spells:[],dmg:{ps:"~300–500",sp:"Smite",bs:"Moderate",n:"Holy damage early."}},
{name:"Mid Game",range:"Lv 20–35",stats:{VIT:25,END:22,STR:25,AGI:8,RAD:30,INF:8},sn:"STR 25, Ravager Gregory's.",weapons:[{n:"Ravager Gregory's",ap:"~700–900",st:"Wither",eq:true,d:"Highest AP Grand Sword.",loc:"Give Rosary to Dunmire.",up:"Large Shards.",tip:"Two-hand."}],armor:[{n:"Judge Cleric's",wt:"Heavy",eq:true,d:"Best cleric armor.",loc:"Trade Remembrance.",up:"N/A",tip:"High armor."}],acc:[],spells:[],dmg:{ps:"~700–900 + Wither",sp:"Wither",bs:"Fast",n:"Heavy hits."}},
{name:"Endgame",range:"Lv 45+",stats:{VIT:30,END:25,STR:40,AGI:8,RAD:50,INF:8},sn:"STR 40/RAD 50 soft caps.",weapons:[{n:"Ravager Gregory's +10",ap:"~1,000+",st:"Smite+Wither",eq:true,d:"Max AP Grand Sword.",loc:"Acquired.",up:"Chunk.",tip:"Orius' Judgment deletes."}],armor:[{n:"Judge Cleric's",wt:"Heavy",eq:true,d:"Best.",loc:"Acquired.",up:"N/A",tip:"Tank."}],acc:[{n:"Exacter Scripture",ef:"Best RAD catalyst",eq:true,d:"Top catalyst.",loc:"Exploration.",up:"N/A",tip:"For spells."}],spells:[],dmg:{ps:"~1,000+",sp:"Smite+Wither",bs:"Fast",n:"Orius' Judgment deletes bosses."}}],
key:[{i:"Ravager Gregory's Sword",d:"Highest AP Grand Sword. Give Rosary to Dunmire."},{i:"Judge Cleric's Armor",d:"Trade Remembrance."},{i:"Exacter Scripture",d:"Best RAD catalyst."}],
steps:["Start Orian Preacher","RAD 25, Pieta's Sword","STR 25+","Get Ravager Gregory's","Judge Cleric armor","STR 40 / RAD 50"]},
{label:"Lord of Flames",sub:"Inferno Burn",icon:"🌋",a:C.fire,cls:"Pyric Cultist",why:"Pure fire. Everything burns, ignites, explodes.",
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:18,END:18,STR:12,AGI:8,RAD:8,INF:20},sn:"INF 20 early.",weapons:[{n:"Pyric Cultist Staff",ap:"~200–300",st:"Fire",eq:true,d:"Starting staff.",loc:"Starting gear.",up:"Upgrade.",tip:"Spells > melee."}],armor:[{n:"Cultist Robes",wt:"Light",eq:true,d:"Starter.",loc:"Starting.",up:"N/A",tip:"Light."}],acc:[],spells:[],dmg:{ps:"~200–300 + spells",sp:"Fire AoE",bs:"Slow",n:"Spell focus."}},
{name:"Mid Game",range:"Lv 20–35",stats:{VIT:22,END:22,STR:25,AGI:8,RAD:8,INF:30},sn:"Fallen Lord's Sword.",weapons:[{n:"Fallen Lord's Sword",ap:"~600–850",st:"300 Ignite",eq:true,d:"A+ STR. 300 Ignite.",loc:"Campaign drop.",up:"Large Shards.",tip:"Two-hand."}],armor:[{n:"Infernal Enchantress",wt:"Medium",eq:true,d:"Fire defense.",loc:"Exploration.",up:"N/A",tip:"Medium."}],acc:[{n:"Ring of Infernal Devotion",ef:"Burn→Ignite",eq:true,d:"Core.",loc:"Exploration.",up:"N/A",tip:"Never remove."}],spells:[],dmg:{ps:"~600–850 + 300 Ignite",sp:"Ignite AoE",bs:"Fast",n:"Ignite everything."}},
{name:"Endgame",range:"Lv 45+",stats:{VIT:25,END:28,STR:35,AGI:8,RAD:8,INF:50},sn:"INF 50 soft cap.",weapons:[{n:"Fallen Lord's +10",ap:"~900–1,100",st:"Ignite AoE",eq:true,d:"Max Ignite.",loc:"Acquired.",up:"Chunk.",tip:"AoE groups."}],armor:[{n:"Tancred's Set",wt:"81.2",eq:true,d:"Best heavy.",loc:"Trade Remembrance.",up:"N/A",tip:"Tank."}],acc:[{n:"Ring of Infernal Devotion + Pendant of Burden",ef:"Burn→Ignite + status amp",eq:true,d:"Core duo.",loc:"Acquired.",up:"N/A",tip:"Core."}],spells:[],dmg:{ps:"~900–1,100 + Ignite AoE",sp:"Constant Ignite",bs:"Very fast",n:"Fire melts everything."}}],
key:[{i:"Fallen Lord's Sword",d:"300 Ignite, A+ STR."},{i:"Ring of Infernal Devotion",d:"Burn→Ignite."},{i:"Tancred's Set",d:"Trade Remembrance."}],
steps:["Start Pyric Cultist","INF 20","Get Fallen Lord's Sword","Ring of Infernal Devotion","STR 35 / INF 50"]},
{label:"Wrath of Orius",sub:"Radiance Caster",icon:"✨",a:C.purple,cls:"Orian Preacher",why:"Ranged Holy spellcaster. Some spells kill bosses in 2 casts.",
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:15,END:15,STR:8,AGI:8,RAD:25,INF:8},sn:"RAD 25 early.",weapons:[{n:"Pieta's Sword",ap:"~300–500",st:"Smite",eq:true,d:"A- RAD.",loc:"Trade Remembrance.",up:"Small Fragments.",tip:"RAD focus."}],armor:[{n:"Pieta's Set",wt:"57.6",eq:true,d:"Holy defense.",loc:"Trade.",up:"N/A",tip:"Medium."}],acc:[],spells:[],dmg:{ps:"~300–500",sp:"Smite",bs:"Moderate",n:"Holy caster."}},
{name:"Mid Game",range:"Lv 20–35",stats:{VIT:22,END:18,STR:8,AGI:8,RAD:35,INF:8},sn:"RAD 35, Radiant Weapon.",weapons:[{n:"Pieta's + Radiant Weapon",ap:"~600–800",st:"Smite",eq:true,d:"Buffed sword.",loc:"Acquired.",up:"Large Shards.",tip:"Buff before bosses."}],armor:[{n:"Pieta's Set",wt:"57.6",eq:true,d:"Best for RAD.",loc:"Acquired.",up:"N/A",tip:"Medium."}],acc:[],spells:[{n:"Radiant Weapon",ef:"+Damage buff",eq:true,d:"Weapon buff.",loc:"Radiance vendor.",up:"Scales RAD.",tip:"Pre-buff."}],dmg:{ps:"~600–800 buffed",sp:"Smite",bs:"Fast",n:"Radiant buff active."}},
{name:"Endgame",range:"Lv 45+",stats:{VIT:25,END:20,STR:8,AGI:8,RAD:50,INF:8},sn:"RAD 50 soft cap.",weapons:[{n:"Pieta's +10 buffed",ap:"~800–1,000",st:"Smite",eq:true,d:"Max RAD scaling.",loc:"Acquired.",up:"Chunk.",tip:"2-cast bosses."}],armor:[{n:"Lightreaper's",wt:"Medium",eq:true,d:"Best RAD armor.",loc:"Trade Remembrance.",up:"N/A",tip:"Medium."}],acc:[{n:"Exacter Scripture",ef:"Best RAD catalyst",eq:true,d:"Top catalyst.",loc:"Exploration.",up:"N/A",tip:"For spells."}],spells:[{n:"Orius' Judgment",ef:"Massive Holy beam",eq:true,d:"Boss killer.",loc:"Radiance vendor.",up:"Max RAD.",tip:"2 casts = boss dead."}],dmg:{ps:"~800–1,000/swing, 2-cast bosses",sp:"Smite",bs:"Fast",n:"Orius' Judgment is broken."}}],
key:[{i:"Pieta's Sword",d:"A- RAD, Smite. Trade Remembrance."},{i:"Exacter Scripture",d:"Best RAD catalyst."},{i:"Lightreaper's Set",d:"Trade Remembrance."}],
steps:["Start Orian Preacher","RAD 25","Defeat Pieta","Radiant Weapon buff","RAD 35+, Orius' Judgment","Mana regen rune","RAD 50"]}
],
ref:[
{n:"Crimson Reaper",i:"🩸",w:"Bloody Glory×2",ap:"~1,000+800",st:"Bleed(300)+Poison",ar:"Sov. Protector",s:"Heavy melee burst",a:C.crimson},
{n:"Venom Blade",i:"🗡️",w:"Kukajin's+Bloodlust",ap:"~500–600/hit",st:"Bleed+Poison+Burn",ar:"Bone/Blackfeather",s:"Fast dual-wield",a:C.green},
{n:"Status Assassin",i:"❄️",w:"Dual Kinrangr",ap:"~400–500/hit",st:"Frost+Bleed+Poison",ar:"Descrier Guide",s:"Triple stack",a:C.blue},
{n:"Burning Blood",i:"🔥",w:"Sword of Skin&Tooth",ap:"~800–1,000",st:"Bleed+Burn+Ignite",ar:"Tancred's",s:"Heavy fire+bleed",a:C.orange},
{n:"Holy Juggernaut",i:"⚔️",w:"Ravager Gregory's",ap:"~1,000+",st:"Smite+Wither",ar:"Judge Cleric's",s:"Tank paladin",a:C.yellow},
{n:"Lord of Flames",i:"🌋",w:"Fallen Lord's",ap:"~900–1,100",st:"Ignite(300)+Burn",ar:"Tancred's",s:"Fire melee+spells",a:C.fire},
{n:"Wrath of Orius",i:"✨",w:"Pieta's Sword",ap:"~800–1,000",st:"Smite",ar:"Lightreaper's",s:"Holy caster",a:C.purple}]};

const witherReaper={label:"Wither Reaper",sub:"Umbral Wither Build",icon:"🌑",accent:C.purple,
playstyle:"Umbral warrior dealing withered damage that prevents enemies from regenerating health. Combines boss weapons with Umbral magic and hyperarmor charged attacks. Enemy HP bars turn grey and stay that way.",
cls:"Mournstead Infantry or Orian Preacher",caps:"Soft 50 / Hard 75 (offensive)",weaponReq:"Varies — Elianne's 13 STR / scales with RAD",
loadouts:[
{id:"elianne_pieta",label:"Elianne + Pieta (Dual)",weaponWt:"~12",endReq:"18",armor:"Elianne's Set or Cursed Set. Light enough for any build.",pros:"Both swords at +10 unlock a special Radiant+Umbral combo explosion. Insane range and speed.",cons:"Requires pursuing the Inferno/Umbral ending to get Elianne's."},
{id:"faithful_bludgeon",label:"Faithful Bludgeon 2H",weaponWt:"~22",endReq:"22",armor:"Sovereign Protector or Cursed Set.",pros:"Grand Hammer with Holy + Wither. High STR/RAD scaling. Smashes posture.",cons:"Slower attacks. Less wither per hit than Elianne combo."},
{id:"dervla_martyr",label:"Dervla + Martyr's Sleeves",weaponWt:"~14",endReq:"18",armor:"Light armor, Martyr's Sleeves required for weapon art.",pros:"Harrower Dervla's Sword unique weapon art with Martyr's Sleeves. Long reach.",cons:"Must complete Dunmire's questline. Locks you into Martyr's Sleeves."}],
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:15,END:13,STR:14,AGI:10,RAD:18,INF:12},sn:"Mournstead Infantry for balance. VIT/END to 18. RAD toward 18 for early spells.",
weapons:[{n:"Mournstead Infantry Spear",ap:"~170",eq:true,d:"Starting weapon. Replace ASAP.",loc:"Starting gear.",up:"Don't invest.",tip:"Use until first wither option."}],
armor:[{n:"Mournstead Infantry Set",wt:"~38",eq:true,d:"Decent balanced starter.",loc:"Starting gear.",up:"N/A",tip:"Light enough for fast combat."}],
acc:[{n:"Use any rings you find",ef:"None build-defining yet",eq:true,d:"Save Vigor.",loc:"N/A",up:"N/A",tip:"N/A"}],spells:[],
dmg:{ps:"~170–230",sp:"None",bs:"Slow",n:"Reach first boss fights to unlock real wither weapons."}},
{name:"First Wither Weapon",range:"Lv 18–28",stats:{VIT:20,END:18,STR:16,AGI:10,RAD:22,INF:14},sn:"RAD to 22 to wield Pieta's Sword as transition. INF building for Umbral spells.",
weapons:[
{n:"Pieta's Sword (transition)",ap:"~300–500",st:"Smite",eq:true,wt:"~6",d:"Bridge weapon until Elianne's. Same moveset, Holy damage. Requires 25 RAD.",loc:"Defeat Pieta (first boss) → Trade Remembrance with Molhu at Skyrest Bridge.",up:"Small Deralium Fragments.",tip:"You'll swap to Elianne's later for pure wither."},
{n:"Harrower Dervla's Sword (alt)",ap:"~280–400",st:"Wither",eq:false,wt:"~8",d:"Early wither longsword. Requires Dunmire questline + Martyr's Sleeves for weapon art.",loc:"Defeat Harrower Dervla in Lower Calrath → Trade Remembrance.",up:"Small Deralium Fragments.",tip:"Pick over Pieta's for immediate wither damage."}],
armor:[{n:"Pieta's Set",wt:"57.6",eq:true,d:"Medium armor with Holy defense.",loc:"Trade Pieta's Remembrance.",up:"N/A",tip:"Swap to Cursed/Elianne's later."}],
acc:[{n:"Use available rings",ef:"Transitional",eq:true,d:"Real accessories next phase.",loc:"Various.",up:"N/A",tip:"Hallowed Triptych is a good placeholder."}],spells:[],
dmg:{ps:"~300–500",sp:"Smite builds on hits",bs:"Moderate",n:"Pieta's Sword is strong even as transition."}},
{name:"Key Accessories",range:"Lv 25–35",stats:{VIT:25,END:22,STR:20,AGI:10,RAD:28,INF:18},sn:"Push RAD toward 30. INF to 18. STR to 20.",
weapons:[{n:"Pieta's Sword (+3 to +5)",ap:"~500–650",st:"Smite",eq:true,d:"Upgrade while searching for Elianne's.",loc:"Acquired.",up:"Regular Deralium Nuggets.",tip:"Buff with Radiant Weapon for damage spikes."}],
armor:[{n:"Pieta's or Cursed Set",wt:"57.6 / 75.2",eq:true,d:"Cursed Set has high wither + physical defense.",loc:"Cursed Set: Manse of Hallowed Brothers → Bone bridge Umbral → Soulflay Umbral Belly.",up:"N/A",tip:"Cursed Set makes Umbral exploration easier."}],
acc:[
{n:"Pendant of Atrophy",ef:"Boosts wither damage",eq:true,d:"CORE PENDANT. Amplifies all wither-based damage.",loc:"Late-mid game Umbral exploration.",up:"N/A",tip:"Never unequip."},
{n:"Ring of Radiant Preeminence",ef:"Boosts Holy/Radiant damage",eq:true,d:"Works with Pieta's/Elianne's scaling.",loc:"Main campaign exploration.",up:"N/A",tip:"Core slot until endgame."},
{n:"Manastone Ring",ef:"Mana regeneration",eq:true,d:"Infinite casting with regen rune on shield.",loc:"Vendors and exploration.",up:"N/A",tip:"Stack with regen rune."}],spells:[],
dmg:{ps:"~500–650 + Pendant of Atrophy amp",sp:"Wither damage on hits",bs:"Fast",n:"Pendant of Atrophy turns on the damage. Enemy HP starts going grey."}},
{name:"Unlock Umbral Spells",range:"Lv 30–45",stats:{VIT:28,END:24,STR:22,AGI:10,RAD:35,INF:22},sn:"RAD 35 unlocks most Umbral spells. INF 22 for advanced casting.",
weapons:[{n:"Pieta's Sword (+5 to +7)",ap:"~650–800",st:"Smite + Wither buffed",eq:true,d:"With Umbral Weapon buff, significant wither on top of holy.",loc:"Acquired.",up:"Large Deralium Shards. Holy Bulwark farm.",tip:"Always pre-cast Umbral Weapon."}],
armor:[{n:"Cursed Set or Elianne's Set",wt:"75.2 / 56.5",eq:true,d:"Elianne's has best wither + frost resistance.",loc:"Elianne's: Trade Remembrance (requires alternate ending path).",up:"N/A",tip:"Cursed as stopgap, Elianne's as goal."}],
acc:[
{n:"Pendant of Atrophy",ef:"Wither boost",eq:true,d:"Core.",loc:"Acquired.",up:"N/A",tip:"Permanent."},
{n:"Umbral Eye of Loash",ef:"Hyperarmor on charged attacks + damage→wither",eq:true,d:"GAME CHANGER. Charging heavy attacks = unstaggerable AND all damage taken converts to wither.",loc:"Umbral Eye slot. Umbral realm exploration.",up:"Socket into Umbral Lamp.",tip:"Pairs with Grand Weapons. Unstaggerable charged R2s."},
{n:"Ring of Radiant Preeminence",ef:"Holy/Radiant boost",eq:true,d:"Core slot.",loc:"Acquired.",up:"N/A",tip:"Permanent."}],
spells:[
{n:"Umbral Weapon",ef:"Coats weapon with Wither damage",eq:true,d:"Core buff. Adds significant umbral damage for generous duration.",loc:"Umbral spell vendors. ~22 INF.",up:"Scales RAD+INF.",tip:"Cast first in rotation."},
{n:"Grieving Gaze",ef:"Ranged umbral beam",eq:true,d:"Ranged option for chipping HP.",loc:"Umbral realm vendors.",up:"Scales spell power.",tip:"For mages and archers."}],
dmg:{ps:"~650–800 + Umbral Weapon buff",sp:"Wither stacks with each swing",bs:"Very fast",n:"Umbral Weapon + Pendant + Loash hyperarmor = trade hits and win."}},
{name:"Boss Weapons",range:"Lv 40–55",stats:{VIT:30,END:26,STR:25,AGI:10,RAD:40,INF:25},sn:"RAD 40 for max Elianne scaling. STR 25 for Faithful Bludgeon.",
weapons:[
{n:"Elianne the Starved's Sword",ap:"~700–850",st:"Wither",eq:true,wt:"~6",d:"THE wither weapon. Pure wither with RAD scaling. Special combo with Pieta's when both +5+.",loc:"Defeat Elianne the Starved (Inferno/Umbral ending path). Trade Remembrance.",up:"Large Deralium Shards.",tip:"Pair with Pieta's + Odd Stone (Lower Calrath Umbral) for combo."},
{n:"Faithful Bludgeon (alt)",ap:"~800–950",st:"Holy + Wither",eq:false,wt:"~22",d:"Grand Hammer with Holy + Wither. B+ STR / B RAD. Unstaggerable charged R2 with Loash.",loc:"Campaign drop mid-late game.",up:"Same materials.",tip:"Best wither-STR weapon. Two-hand."}],
armor:[{n:"Elianne the Starved's Set",wt:"56.5",eq:true,d:"Best wither + frost + physical resistance.",loc:"Trade Elianne's Remembrance.",up:"N/A",tip:"Perfect thematic match."}],
acc:[
{n:"Pendant of Atrophy",ef:"Wither boost",eq:true,d:"Core.",loc:"Acquired.",up:"N/A",tip:"Never remove."},
{n:"Umbral Eye of Loash",ef:"Hyperarmor + damage→wither",eq:true,d:"Core.",loc:"Acquired.",up:"N/A",tip:"Core slot."},
{n:"Ring of Radiant Preeminence",ef:"Holy boost",eq:true,d:"Stacks with Elianne's scaling.",loc:"Acquired.",up:"N/A",tip:"Or swap Manastone."}],
spells:[
{n:"Umbral Weapon",ef:"Wither weapon buff",eq:true,d:"Core.",loc:"Acquired.",up:"Scales RAD+INF.",tip:"Pre-cast."},
{n:"Grieving Gaze",ef:"Ranged beam",eq:true,d:"Ranged option.",loc:"Acquired.",up:"Scales spell power.",tip:"Gap closing."}],
dmg:{ps:"~700–850 Elianne's / ~800–950 Faithful",sp:"Pure Wither",bs:"Very fast",n:"Full setup. Boss HP goes grey and stays."}},
{name:"Endgame",range:"Lv 55+",stats:{VIT:35,END:28,STR:30,AGI:10,RAD:45,INF:28},sn:"RAD approaching 50 (soft cap). STR 30 for flex. VIT 35 for tanking.",
weapons:[
{n:"Elianne the Starved's Sword +10",ap:"~950–1,050",st:"Wither",eq:true,wt:"~6",d:"Fully upgraded. Dual-wield combo with Pieta's +10 unlocks special attack.",loc:"Acquired.",up:"Deralium Chunk.",tip:"Socket Crafter's Essence for zero weight."},
{n:"Pieta's Sword +10 (combo partner)",ap:"~800–1,000",st:"Smite",eq:true,wt:"~6",d:"Dual-wield for Radiance+Umbral combo explosion. Requires Odd Stone delivered to Pieta.",loc:"Acquired.",up:"Another Deralium Chunk.",tip:"L2+R2 after Odd Stone dialogue."},
{n:"Faithful Bludgeon +10 (alt)",ap:"~950–1,100",st:"Holy + Wither",eq:false,wt:"~22",d:"Alternative heavy option for pure STR playstyle.",loc:"Acquired.",up:"Deralium Chunk.",tip:"Use if preferring Grand Hammer moveset."}],
armor:[{n:"Elianne the Starved's Set",wt:"56.5",eq:true,d:"Best wither defense in game.",loc:"Acquired.",up:"N/A",tip:"Alt: Cursed Set (75.2) for max physical tanking."}],
acc:[
{n:"Pendant of Atrophy",ef:"Wither boost",eq:true,d:"Permanent.",loc:"Acquired.",up:"N/A",tip:"Irreplaceable."},
{n:"Umbral Eye of Loash",ef:"Hyperarmor + wither conversion",eq:true,d:"Permanent.",loc:"Acquired.",up:"N/A",tip:"Permanent."},
{n:"Ring of Radiant Preeminence",ef:"Holy boost",eq:true,d:"Best general option.",loc:"Acquired.",up:"N/A",tip:"Permanent."}],
spells:[
{n:"Umbral Weapon",ef:"Wither weapon buff",eq:true,d:"Core.",loc:"Acquired.",up:"Max RAD+INF.",tip:"Pre-buff."},
{n:"Grieving Gaze",ef:"Ranged beam",eq:true,d:"Ranged option.",loc:"Acquired.",up:"Max spell power.",tip:"For range."}],
dmg:{ps:"~950–1,050/swing, ~2,000+ with dual combo explosion",sp:"Pure Wither, cannot be regenerated",bs:"Bosses 20–40s",n:"Final form. HP bars grey permanently."}},
{name:"NG+",range:"NG+1 to NG+7",stats:{VIT:40,END:32,STR:35,AGI:10,RAD:55,INF:32},
sn:"NG+ wither shines — bosses can't heal. Cycle selector shows growth toward LotF hard cap (75).",
ngCycles:[
{label:"NG+1",stats:{VIT:40,END:32,STR:35,AGI:10,RAD:55,INF:32},notes:"Past soft caps. RAD pushed to 55 for stronger Elianne's scaling. INF up for spell power."},
{label:"NG+3",stats:{VIT:48,END:35,STR:40,AGI:10,RAD:65,INF:38},notes:"Mid NG+. RAD nearing hard cap. Spell damage scaling significantly."},
{label:"NG+5",stats:{VIT:55,END:38,STR:45,AGI:10,RAD:75,INF:45},notes:"RAD at hard cap (75). Maximum Elianne's scaling. Heavy INF for Umbral spells."},
{label:"NG+7",stats:{VIT:60,END:40,STR:50,AGI:10,RAD:75,INF:55},notes:"All key stats at or near hard caps. Total ~290 = SL ~225+. Maximum theoretical wither output."}],
weapons:[{n:"Elianne's + Pieta's +10 (combo build)",ap:"~1,100+ each",st:"Wither + Smite",eq:true,wt:"~12",d:"Both swords +10 with Crafter's Essence option.",loc:"Acquired.",up:"Already +10. Sockets reset.",tip:"NG+ is when the dual combo explosion really shines."}],
armor:[{n:"Elianne the Starved's Set",wt:"56.5",eq:true,d:"Best wither defense.",loc:"Acquired.",up:"N/A",tip:"With higher VIT/END, fast roll comfortably."}],
acc:[{n:"Pendant of Atrophy + Loash + Radiant Preeminence",ef:"Same trinity",eq:true,d:"Same trinity as endgame.",loc:"Acquired.",up:"N/A",tip:"All slots locked."}],
spells:[{n:"Umbral Weapon + Grieving Gaze",ef:"Buff + ranged",eq:true,d:"Pre-buff Umbral Weapon every fight.",loc:"Acquired.",up:"Max RAD+INF scaling.",tip:"Always pre-buff before bosses."}],
dmg:{ps:"~1,100/swing NG+1, ~1,800+/swing NG+7, ~3,000+ combo explosion",sp:"Pure Wither — bosses can't recover any of it",bs:"NG+ bosses 25–50s",n:"Wither builds get STRONGER in NG+ since enemies have more HP that can never come back."}}
],
sim:[
{label:"Umbral Mage",sub:"Pure INF/RAD Caster",icon:"🔮",a:C.blue,cls:"Orian Preacher",why:"Same umbral damage focus but pure spellcasting.",
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:15,END:12,STR:8,AGI:8,RAD:22,INF:18},sn:"RAD/INF early.",weapons:[{n:"Orian Preacher Catalyst",ap:"~150",eq:true,d:"Starting catalyst.",loc:"Starting gear.",up:"Upgrade.",tip:"Spells > melee."}],armor:[{n:"Cultist Robes",wt:"Light",eq:true,d:"Light starter.",loc:"Starting.",up:"N/A",tip:"Light."}],acc:[],spells:[],dmg:{ps:"~150 per basic cast",sp:"Umbral",bs:"Slow",n:"Spell focus."}},
{name:"Mid Game",range:"Lv 20–40",stats:{VIT:25,END:15,STR:8,AGI:8,RAD:35,INF:30},sn:"Lost Berescu's Catalyst.",weapons:[{n:"Lost Berescu's Catalyst",ap:"~350–500",st:"Umbral",eq:true,d:"Best Umbral catalyst.",loc:"Lost Calrath Umbral path.",up:"Large Shards.",tip:"INF/RAD scaling."}],armor:[{n:"Mix armor",wt:"Light-Medium",eq:true,d:"Flexible.",loc:"Various.",up:"N/A",tip:"Stay mobile."}],acc:[{n:"Pendant of Atrophy",ef:"Wither boost",eq:true,d:"Core.",loc:"Exploration.",up:"N/A",tip:"Core."}],spells:[{n:"Grieving Gaze",ef:"Umbral beam",eq:true,d:"Main spell.",loc:"Umbral vendors.",up:"Scales RAD+INF.",tip:"Primary damage."}],dmg:{ps:"~350–500 per buffed cast",sp:"Umbral Wither",bs:"Moderate",n:"Ranged wither."}},
{name:"Endgame",range:"Lv 50+",stats:{VIT:30,END:18,STR:8,AGI:8,RAD:50,INF:40},sn:"RAD/INF soft caps.",weapons:[{n:"Berescu's +10",ap:"~600–900",st:"Umbral",eq:true,d:"Max catalyst.",loc:"Acquired.",up:"Chunk.",tip:"Infinite mana setup."}],armor:[{n:"Lightreaper's",wt:"Medium",eq:true,d:"Best caster armor.",loc:"Trade Remembrance.",up:"N/A",tip:"Medium."}],acc:[{n:"Pendant of Atrophy + Manastone + Puissance Root",ef:"Wither+mana+damage",eq:true,d:"Full caster setup.",loc:"Acquired.",up:"N/A",tip:"All three."}],spells:[{n:"Grieving Gaze + Umbral Weapon",ef:"Ranged + buff",eq:true,d:"Core spells.",loc:"Acquired.",up:"Max RAD+INF.",tip:"Buff then blast."}],dmg:{ps:"~600–900 per cast",sp:"Umbral Wither",bs:"Fast",n:"Infinite casting. Boss HP goes grey from range."}}],
key:[{i:"Lost Berescu's Catalyst",d:"Best Umbral catalyst. Lost Calrath Umbral path."},{i:"Pendant of Atrophy",d:"Wither boost."},{i:"Puissance Root Ring",d:"Sorcery damage."},{i:"Manastone Ring + regen rune",d:"Infinite casting."}],
steps:["Start Orian Preacher","RAD/INF 15 each","Basic Umbral spells","Lost Berescu's Catalyst","Pendant of Atrophy","Infinite casting setup","RAD 50 / INF 40"]},
{label:"Dervla's Shadow",sub:"Harrower Dervla Sword",icon:"🗡️",a:C.purple,cls:"Exiled Stalker",why:"Pure focus on Harrower Dervla's Sword with unique weapon art (Martyr's Sleeves required).",
ph:[
{name:"Early Game",range:"Lv 1–25",stats:{VIT:18,END:18,STR:14,AGI:20,RAD:18,INF:12},sn:"AGI/RAD balance.",weapons:[{n:"Dervla's Sword base",ap:"~280–400",st:"Wither",eq:true,d:"Early wither sword.",loc:"Defeat Harrower Dervla in Lower Calrath. Trade Remembrance.",up:"Small Fragments.",tip:"Wither on hit."}],armor:[{n:"Light starter",wt:"Light",eq:true,d:"Stay light.",loc:"Starting.",up:"N/A",tip:"Light."}],acc:[],spells:[],dmg:{ps:"~280–400 with wither",sp:"Wither",bs:"Moderate",n:"Early wither."}},
{name:"Mid Game",range:"Lv 25–40",stats:{VIT:25,END:22,STR:14,AGI:30,RAD:25,INF:15},sn:"Weapon art unlocked with Martyr's Sleeves.",weapons:[{n:"Dervla's +7",ap:"~500–650",st:"Wither",eq:true,d:"Weapon art active.",loc:"Acquired.",up:"Large Shards.",tip:"Weapon art unlocked."}],armor:[{n:"Light + Martyr's Sleeves",wt:"Light",eq:true,d:"Sleeves required for weapon art.",loc:"Complete Dunmire questline.",up:"N/A",tip:"REQUIRED for art."}],acc:[{n:"Pendant of Atrophy",ef:"Wither boost",eq:true,d:"Core.",loc:"Exploration.",up:"N/A",tip:"Core."}],spells:[],dmg:{ps:"~500–650 weapon art unlocked",sp:"Wither",bs:"Fast",n:"Weapon art active."}},
{name:"Endgame",range:"Lv 45+",stats:{VIT:30,END:25,STR:14,AGI:40,RAD:35,INF:20},sn:"AGI 40, weapon art mastered.",weapons:[{n:"Dervla's +10",ap:"~800–1,000",st:"Wither",eq:true,d:"Max upgraded.",loc:"Acquired.",up:"Chunk.",tip:"Weapon art deletes groups."}],armor:[{n:"Dervla's Set + Martyr's Sleeves",wt:"Light",eq:true,d:"Full thematic set.",loc:"Dervla's: Trade Remembrance.",up:"N/A",tip:"Light mobility."}],acc:[{n:"Pendant of Atrophy + Umbral Eye of Loash",ef:"Wither+hyperarmor",eq:true,d:"Core duo.",loc:"Acquired.",up:"N/A",tip:"Both core."}],spells:[],dmg:{ps:"~800–1,000, deletes groups",sp:"Wither",bs:"Very fast",n:"Weapon art wipes groups."}}],
key:[{i:"Harrower Dervla's Sword",d:"Defeat Harrower Dervla in Lower Calrath."},{i:"Martyr's Sleeves",d:"Complete Dunmire the Tax Collector questline."},{i:"Pendant of Atrophy",d:"Wither boost."}],
steps:["Start Exiled Stalker","Progress to Lower Calrath","Defeat Harrower Dervla","Trade Remembrance","Complete Dunmire questline","Upgrade to +10","Master weapon art"]},
{label:"Faithful Bludgeon",sub:"STR Grand Hammer Wither",icon:"🔨",a:C.yellow,cls:"Udirangr Warwolf",why:"Pure STR Grand Hammer with Holy+Wither. Unstaggerable charged R2s.",
ph:[
{name:"Early Game",range:"Lv 1–25",stats:{VIT:20,END:20,STR:22,AGI:10,RAD:15,INF:10},sn:"STR 22 early.",weapons:[{n:"Starting → Faithful Bludgeon",ap:"~400–550",st:"Wither",eq:true,d:"Grand Hammer with wither.",loc:"Campaign drop.",up:"Small Fragments.",tip:"Two-hand."}],armor:[{n:"Warwolf Set",wt:"~35",eq:true,d:"Heavy starter.",loc:"Starting.",up:"N/A",tip:"Tank."}],acc:[],spells:[],dmg:{ps:"~400–550",sp:"Wither",bs:"Slow",n:"Heavy hits."}},
{name:"Mid Game",range:"Lv 25–40",stats:{VIT:28,END:25,STR:32,AGI:10,RAD:25,INF:12},sn:"STR 32, Loash hyperarmor.",weapons:[{n:"Faithful Bludgeon +7",ap:"~650–800",st:"Holy+Wither",eq:true,d:"Mid upgrade.",loc:"Acquired.",up:"Large Shards.",tip:"Charged R2 = unstaggerable."}],armor:[{n:"Sovereign Protector",wt:"75",eq:true,d:"Best heavy.",loc:"Sunless Skein mines chest.",up:"N/A",tip:"High armor."}],acc:[{n:"Umbral Eye of Loash",ef:"Hyperarmor charged attacks",eq:true,d:"Core.",loc:"Umbral realm.",up:"N/A",tip:"Game changer."}],spells:[],dmg:{ps:"~650–800 charged R2",sp:"Wither",bs:"Fast",n:"Unstaggerable charged R2."}},
{name:"Endgame",range:"Lv 45+",stats:{VIT:35,END:28,STR:45,AGI:10,RAD:30,INF:15},sn:"STR 45, max hammer.",weapons:[{n:"Faithful Bludgeon +10",ap:"~950–1,100",st:"Holy+Wither",eq:true,d:"Max Grand Hammer.",loc:"Acquired.",up:"Chunk.",tip:"Charged R2 everything."}],armor:[{n:"Sovereign Protector",wt:"75",eq:true,d:"Best heavy.",loc:"Acquired.",up:"N/A",tip:"Max tank."}],acc:[{n:"Pendant of Atrophy + Loash",ef:"Wither+hyperarmor",eq:true,d:"Core duo.",loc:"Acquired.",up:"N/A",tip:"Both core."}],spells:[],dmg:{ps:"~950–1,100 charged R2",sp:"Holy+Wither",bs:"Fast",n:"Charged R2 everything."}}],
key:[{i:"Faithful Bludgeon",d:"Grand Hammer with Holy + Wither."},{i:"Umbral Eye of Loash",d:"Hyperarmor charged attacks."},{i:"Pendant of Atrophy",d:"Wither boost."},{i:"Sovereign Protector Set",d:"Best heavy armor."}],
steps:["Start Warwolf","STR 25+","Find Faithful Bludgeon","Umbral Eye of Loash","Pendant of Atrophy","STR 45","Charged R2 everything"]}
],
oth:[
{label:"Crimson Reaper",sub:"Bleed Build",icon:"🩸",a:C.crimson,cls:"Udirangr Warwolf",why:"The other main LotF build — heavy STR + Bleed with Bloody Glory. Opposite playstyle.",
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:20,END:20,STR:18,AGI:10,RAD:8,INF:8},sn:"STR/VIT/END early.",weapons:[{n:"Starting → Bloody Glory",ap:"~400–550",st:"300 Bleed",eq:true,d:"Bleed weapon.",loc:"Pilgrim's Perch.",up:"Fragments.",tip:"Crafter's Essence bypasses reqs."}],armor:[{n:"Fitzroy's",wt:"71.7",eq:true,d:"Heavy armor.",loc:"Fitzroy's Gorge.",up:"N/A",tip:"Heavy."}],acc:[],spells:[],dmg:{ps:"~400–550 + 300 Bleed",sp:"Bleed burst",bs:"Moderate",n:"Bleed focus."}},
{name:"Mid Game",range:"Lv 25–40",stats:{VIT:25,END:24,STR:32,AGI:10,RAD:18,INF:12},sn:"STR 32, dual wield.",weapons:[{n:"Bloody Glory +7",ap:"~700–850",st:"300 Bleed",eq:true,d:"Mid upgrade.",loc:"Acquired.",up:"Large Shards.",tip:"Lacerating Weapon buff."}],armor:[{n:"Sovereign Protector",wt:"75",eq:true,d:"Best heavy.",loc:"Sunless Skein.",up:"N/A",tip:"Heavy."}],acc:[{n:"Bloodbane Ring + Pendant of Burden",ef:"Bleed chain + status amp",eq:true,d:"Core duo.",loc:"Forsaken Fen.",up:"N/A",tip:"Core."}],spells:[],dmg:{ps:"~700–850 + Bleed burst",sp:"Bleed+Poison",bs:"Fast",n:"Bleed burst."}},
{name:"Endgame",range:"Lv 55+",stats:{VIT:35,END:30,STR:50,AGI:10,RAD:40,INF:12},sn:"STR 50 soft cap.",weapons:[{n:"Dual Bloody Glory +10",ap:"~1,800 dual",st:"300 Bleed each",eq:true,d:"Dual max bleed.",loc:"Acquired.",up:"2 Chunks.",tip:"Lacerating + Poison before bosses."}],armor:[{n:"Sovereign Protector",wt:"75",eq:true,d:"Best heavy.",loc:"Acquired.",up:"N/A",tip:"Tank."}],acc:[{n:"Bloodbane + Pendant of Burden + Lucent Sword",ef:"Full bleed trinity",eq:true,d:"Core trio.",loc:"Acquired.",up:"N/A",tip:"All three."}],spells:[{n:"Lacerating + Poison Weapon",ef:"+60 Bleed + Poison chain",eq:true,d:"Pre-buff combo.",loc:"Acquired.",up:"Max RAD.",tip:"Pre-buff always."}],dmg:{ps:"~1,800/dual swing",sp:"Bleed every combo",bs:"Fast",n:"Bleed melts everything."}}],
key:[{i:"Bloody Glory",d:"Pilgrim's Perch → Path of Devotion."},{i:"Bloodbane Ring",d:"Forsaken Fen — triggers Bleed on Poison."},{i:"Pendant of Burden",d:"Umbral Forsaken Fen."},{i:"Lacerating Weapon spell",d:"+60 Bleed buildup."}],
steps:["Start Udirangr Warwolf","Get Bloody Glory","Bloodbane + Pendant of Burden","Lacerating + Poison Weapon","Dual-wield","STR 50 / RAD 40"]},
{label:"Holy Juggernaut",sub:"STR/RAD Paladin",icon:"⚔️",a:C.yellow,cls:"Orian Preacher",why:"Meta tank build. Massive Holy damage, self-healing, group-deleting spells.",
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:18,END:18,STR:12,AGI:8,RAD:22,INF:8},sn:"RAD 22.",weapons:[{n:"Pieta's Sword",ap:"~300–500",st:"Smite",eq:true,d:"A- RAD.",loc:"Trade Remembrance.",up:"Fragments.",tip:"RAD focus."}],armor:[{n:"Pieta's Set",wt:"57.6",eq:true,d:"Holy defense.",loc:"Trade.",up:"N/A",tip:"Medium."}],acc:[],spells:[],dmg:{ps:"~300–500",sp:"Smite",bs:"Moderate",n:"Holy early."}},
{name:"Mid Game",range:"Lv 25–40",stats:{VIT:25,END:22,STR:25,AGI:8,RAD:30,INF:8},sn:"Ravager Gregory's.",weapons:[{n:"Ravager Gregory's",ap:"~700–900",st:"Wither",eq:true,d:"Highest AP Grand Sword.",loc:"Give Rosary to Dunmire.",up:"Large Shards.",tip:"Two-hand."}],armor:[{n:"Judge Cleric's",wt:"Heavy",eq:true,d:"Best cleric armor.",loc:"Trade Remembrance.",up:"N/A",tip:"Heavy."}],acc:[],spells:[],dmg:{ps:"~700–900 + Wither",sp:"Smite+Wither",bs:"Fast",n:"Heavy holy hits."}},
{name:"Endgame",range:"Lv 50+",stats:{VIT:30,END:25,STR:40,AGI:8,RAD:50,INF:8},sn:"STR 40/RAD 50.",weapons:[{n:"Ravager Gregory's +10",ap:"~1,000+",st:"Smite+Wither",eq:true,d:"Max AP.",loc:"Acquired.",up:"Chunk.",tip:"Orius' Judgment."}],armor:[{n:"Judge Cleric's",wt:"Heavy",eq:true,d:"Best.",loc:"Acquired.",up:"N/A",tip:"Tank."}],acc:[{n:"Exacter Scripture",ef:"Best RAD catalyst",eq:true,d:"Top catalyst.",loc:"Exploration.",up:"N/A",tip:"For spells."}],spells:[],dmg:{ps:"~1,000+",sp:"Smite+Wither",bs:"Fast",n:"Orius' Judgment deletes."}}],
key:[{i:"Ravager Gregory's Sword",d:"Highest AP Grand Sword."},{i:"Judge Cleric's Armor",d:"Trade Remembrance."},{i:"Exacter Scripture",d:"Best RAD catalyst."}],
steps:["Start Orian Preacher","RAD 25 + Pieta's","STR 25+","Ravager Gregory's","Judge Cleric Armor","STR 40 / RAD 50"]},
{label:"Lord of Flames",sub:"Inferno Burn",icon:"🌋",a:C.fire,cls:"Pyric Cultist",why:"Pure fire. Everything burns and explodes.",
ph:[
{name:"Early Game",range:"Lv 1–20",stats:{VIT:18,END:18,STR:12,AGI:8,RAD:8,INF:20},sn:"INF 20.",weapons:[{n:"Pyric Cultist Staff",ap:"~200–300",st:"Fire",eq:true,d:"Starting staff.",loc:"Starting.",up:"Upgrade.",tip:"Spells."}],armor:[{n:"Cultist Robes",wt:"Light",eq:true,d:"Starter.",loc:"Starting.",up:"N/A",tip:"Light."}],acc:[],spells:[],dmg:{ps:"~200–300",sp:"Fire",bs:"Slow",n:"Spell focus."}},
{name:"Mid Game",range:"Lv 25–40",stats:{VIT:22,END:22,STR:25,AGI:8,RAD:8,INF:30},sn:"Fallen Lord's Sword.",weapons:[{n:"Fallen Lord's Sword",ap:"~600–850",st:"300 Ignite",eq:true,d:"Ignite weapon.",loc:"Campaign drop.",up:"Large Shards.",tip:"Two-hand."}],armor:[{n:"Infernal Enchantress",wt:"Medium",eq:true,d:"Fire armor.",loc:"Exploration.",up:"N/A",tip:"Medium."}],acc:[{n:"Ring of Infernal Devotion",ef:"Burn→Ignite",eq:true,d:"Core.",loc:"Exploration.",up:"N/A",tip:"Core."}],spells:[],dmg:{ps:"~600–850 + 300 Ignite",sp:"Ignite AoE",bs:"Fast",n:"Ignite groups."}},
{name:"Endgame",range:"Lv 50+",stats:{VIT:25,END:28,STR:35,AGI:8,RAD:8,INF:50},sn:"INF 50.",weapons:[{n:"Fallen Lord's +10",ap:"~900–1,100",st:"Ignite AoE",eq:true,d:"Max fire.",loc:"Acquired.",up:"Chunk.",tip:"AoE everything."}],armor:[{n:"Tancred's Set",wt:"81.2",eq:true,d:"Best heavy.",loc:"Trade.",up:"N/A",tip:"Tank."}],acc:[{n:"Ring of Infernal Devotion + Pendant of Burden",ef:"Ignite+status amp",eq:true,d:"Core duo.",loc:"Acquired.",up:"N/A",tip:"Core."}],spells:[],dmg:{ps:"~900–1,100 + Ignite AoE",sp:"Constant Ignite",bs:"Fast",n:"Fire melts everything."}}],
key:[{i:"Fallen Lord's Sword",d:"300 Ignite, A+ STR."},{i:"Ring of Infernal Devotion",d:"Burn→Ignite."},{i:"Tancred's Set",d:"Trade Remembrance."}],
steps:["Start Pyric Cultist","INF 20","Fallen Lord's Sword","Ring of Infernal Devotion","STR 35 / INF 50"]}
],
ref:[
{n:"Wither Reaper",i:"🌑",w:"Elianne's + Pieta's",ap:"~2,000 combo",st:"Wither (permanent)",ar:"Elianne's Set",s:"Umbral wither control",a:C.purple},
{n:"Umbral Mage",i:"🔮",w:"Lost Berescu's Catalyst",ap:"~600–900/cast",st:"Umbral Wither",ar:"Lightreaper's",s:"Pure ranged caster",a:C.blue},
{n:"Dervla's Shadow",i:"🗡️",w:"Harrower Dervla's Sword",ap:"~800–1,000",st:"Wither + weapon art",ar:"Dervla's + Martyr's",s:"Long-reach wither",a:C.purple},
{n:"Faithful Bludgeon",i:"🔨",w:"Faithful Bludgeon +10",ap:"~950–1,100",st:"Holy + Wither",ar:"Sovereign Protector",s:"STR Grand Hammer",a:C.yellow},
{n:"Crimson Reaper",i:"🩸",w:"Bloody Glory×2",ap:"~1,800 dual",st:"Bleed + Poison",ar:"Sovereign Protector",s:"Heavy melee burst",a:C.crimson},
{n:"Holy Juggernaut",i:"⚔️",w:"Ravager Gregory's",ap:"~1,000+",st:"Smite + Wither",ar:"Judge Cleric's",s:"Tank paladin",a:C.yellow},
{n:"Lord of Flames",i:"🌋",w:"Fallen Lord's Sword",ap:"~900–1,100",st:"Ignite + Burn",ar:"Tancred's",s:"Fire melee + spells",a:C.fire}]};

/* ══ DS1: UCHIGATANA ══ */
const ds1Uchi={label:"Sharp Uchigatana",sub:"DEX Katana",icon:"⚔️",accent:C.gold,
playstyle:"Fast DEX katana with Bleed buildup. Buff with Crystal Magic Weapon or Power Within for absurd damage. The most iconic DEX weapon in Dark Souls — accessible early, scales beautifully, R2 thrust shreds.",
cls:"Hunter (best DEX start)",caps:"DEX soft 40 / hard 99 · END soft 40 · VIT soft 50",weaponReq:"14 STR / 14 DEX",loadouts:null,
ph:[
{name:"Early Game",range:"SL 1–20",stats:{VIT:14,ATT:8,END:14,STR:14,DEX:18,RES:11,INT:9,FTH:8},sn:"Hunter starts with 16 DEX. Rush to Undead Burg for the Uchi.",
weapons:[{n:"Hunter starting Short Sword + Bow",ap:"~80–120",eq:true,d:"Default starting gear.",loc:"Hunter class default.",up:"Don't bother.",tip:"Pick Master Key as gift."}],
armor:[{n:"Hunter starter set",wt:"Light",eq:true,d:"Under 25% equip load = fast roll.",loc:"Hunter default.",up:"N/A",tip:"Under 25% = fastest roll."}],
acc:[{n:"Use any rings",ef:"None yet",eq:true,d:"Only 2 ring slots in DS1.",loc:"N/A",up:"N/A",tip:"Cloranthy Ring early."}],spells:[],
dmg:{ps:"~80–120",sp:"None",bs:"Slow",n:"Get to Undead Burg ASAP."}},
{name:"Get the Uchi",range:"SL 15–25",stats:{VIT:18,ATT:10,END:18,STR:14,DEX:20,RES:11,INT:9,FTH:8},sn:"VIT/END 18. DEX 20. Never level RES.",
weapons:[{n:"Uchigatana",ap:"~200–260",st:"Bleed (33/hit)",eq:true,d:"Built-in Bleed. Slash + Thrust. 14 STR / 14 DEX. Low durability.",loc:"Undead Burg → Undead Merchant (Male) on the bridge. Kill him for 100% drop. Alt: Shiva of the East in Blighttown (5,000 souls, Forest Hunter Covenant).",up:"+0 to +5: Titanite Shards (200 souls each) at Andre in Undead Parish.",tip:"Watch durability — katanas break."}],
armor:[{n:"Elite Knight Set",wt:"Light–Medium",eq:true,d:"Classic light-medium DEX pick.",loc:"Darkroot Garden corpse near Hydra area.",up:"N/A",tip:"Stay under 25% for fast roll."}],
acc:[
{n:"Cloranthy Ring",ef:"+Stamina regen",eq:true,d:"Massive stamina regen boost.",loc:"The Great Hollow bottom. Or jump from Blighttown swamp.",up:"N/A",tip:"Essential. Take ASAP."},
{n:"Ring of Favor and Protection",ef:"+20% HP/Stamina/Equip",eq:false,d:"BEST GENERAL RING. Triple buff. WARNING: removing breaks it permanently.",loc:"Anor Londo — drop from Lautrec after killing him.",up:"N/A",tip:"Don't unequip."}],spells:[],
dmg:{ps:"~200–260",sp:"Bleed in 4–5 hits",bs:"Moderate",n:"Thrust R2 destroys early enemies in 2–3 hits."}},
{name:"Mid Game",range:"SL 25–50",stats:{VIT:25,ATT:12,END:25,STR:14,DEX:30,RES:11,INT:9,FTH:8},sn:"DEX 30 for scaling. END 25.",
weapons:[{n:"Uchigatana +6 to +10",ap:"~280–360",st:"Bleed",eq:true,d:"Andre needs Large Ember past +5.",loc:"Acquired.",up:"+5 to +10: LARGE EMBER from The Depths chest. Large Titanite Shards — farm Darkwraiths in New Londo (after draining).",tip:"At +10 / 30 DEX = ~350 AR."}],
armor:[{n:"Elite Knight or Shadow Set",wt:"Light",eq:true,d:"Shadow Set is best light DEX armor.",loc:"Shadow: Darkroot Garden Shadow assassins.",up:"N/A",tip:"Light = mobility."}],
acc:[
{n:"Ring of Favor and Protection",ef:"+20% HP/Stam/Equip",eq:true,d:"Core. NEVER unequip.",loc:"Acquired.",up:"N/A",tip:"Permanent slot."},
{n:"Hornet Ring",ef:"+Critical damage (ripostes/backstabs)",eq:true,d:"GAME CHANGER. Ripostes hit for 1,500+.",loc:"Darkroot Garden corpse near Sif arena, guarded by Forest invaders.",up:"N/A",tip:"Parry humanoids for massive damage."}],spells:[],
dmg:{ps:"~280–360 normal, 800–1,500+ ripostes",sp:"Bleed in 3–4 hits",bs:"Fast",n:"Build comes online. Hornet + Uchi parry = burst."}},

{name:"Late Game",range:"SL 50–80",stats:{VIT:35,ATT:14,END:35,STR:14,DEX:40,RES:11,INT:9,FTH:8},sn:"DEX hits 40 (soft cap). END 35.",
weapons:[{n:"Uchigatana +14 to +15",ap:"~430–490",st:"Bleed",eq:true,d:"Very Large Ember needed past +10.",loc:"Acquired.",up:"+10 to +14: VERY LARGE EMBER from Demon Ruins illusory wall near Centipede Demon. Titanite Chunks from Black Knights. +14 to +15: Titanite Slab.",tip:"Buff with Crystal Magic Weapon or Power Within."}],
armor:[{n:"Light DEX setup",wt:"Light–Medium",eq:true,d:"Fashion souls.",loc:"Various.",up:"N/A",tip:"Mask of Father + Havel's Ring = heavy armor fast roll."}],
acc:[
{n:"Ring of Favor and Protection",ef:"+20% HP/Stam/Equip",eq:true,d:"Core.",loc:"Acquired.",up:"N/A",tip:"Never unequip."},
{n:"Hornet Ring",ef:"+Critical damage",eq:true,d:"Core for ripostes.",loc:"Acquired.",up:"N/A",tip:"Permanent."}],
spells:[
{n:"Power Within (optional)",ef:"+50% damage, drains HP",eq:false,d:"Pyromancy. +50% damage and stamina at HP cost. No INT/FTH required.",loc:"Lost Izalith or buy from Quelana.",up:"Needs Pyromancy Flame only.",tip:"Pop before bosses."},
{n:"Crystal Magic Weapon (optional)",ef:"+~50% damage buff",eq:false,d:"Best weapon buff in DS1. ~60s duration.",loc:"Bought from Logan after Duke's Archives.",up:"Requires ~32 INT.",tip:"Heavy INT investment but worth it."}],
dmg:{ps:"~430–490 base, 1,500+ ripostes, 600+ buffed",sp:"Bleed in 2–3 hits",bs:"Very fast",n:"Power Within + buffed Uchi + Hornet = massive burst."}},
{name:"Endgame / Meta",range:"SL 80–125 (PvP)",stats:{VIT:43,ATT:16,END:40,STR:14,DEX:45,RES:11,INT:9,FTH:8},sn:"DEX 45. END 40 (soft cap). SL 120 is PvP meta.",
weapons:[{n:"Uchigatana +15",ap:"~490+",st:"Bleed",eq:true,d:"Maxed. With Power Within = ~730+ AP.",loc:"Acquired.",up:"Maxed.",tip:"Always carry repair powder."}],
armor:[{n:"Fashion + 25% equip load",wt:"Light",eq:true,d:"Classic DS1 dex fits.",loc:"Various.",up:"N/A",tip:"Under 25% = fast roll."}],
acc:[
{n:"Ring of Favor and Protection",ef:"+20% HP/Stam/Equip",eq:true,d:"Permanent.",loc:"Acquired.",up:"N/A",tip:"Only 2 ring slots."},
{n:"Hornet Ring or Havel's Ring",ef:"Crit OR equip load",eq:true,d:"Hornet for ripostes, Havel's for heavy armor.",loc:"Havel's: Undead Burg basement Havel.",up:"N/A",tip:"Swap per situation."}],
spells:[{n:"Power Within",ef:"+50% damage, HP drain",eq:true,d:"Boss-killer buff.",loc:"Acquired.",up:"N/A",tip:"Pop before fights."}],
dmg:{ps:"~490 base, 730+ buffed, 2,000+ Power Within riposte",sp:"Bleed in 2 hits",bs:"Even Gwyn dies in seconds",n:"Final form. SL 120 meta. Uchi is top PvP weapon."}},
{name:"NG+",range:"NG+1 to NG+7",stats:{VIT:50,ATT:18,END:40,STR:14,DEX:60,RES:11,INT:9,FTH:8},
sn:"DS1 hard caps DEX at 99 but soft caps at 40 then 60. Cycle selector pushes from PvP meta toward maxed PvE.",
ngCycles:[
{label:"NG+1",stats:{VIT:50,ATT:18,END:40,STR:14,DEX:60,RES:11,INT:9,FTH:8},notes:"Past PvP meta. VIT to 50 (soft cap). DEX to 60 (second soft cap). END at 40 (soft cap)."},
{label:"NG+3",stats:{VIT:60,ATT:20,END:40,STR:14,DEX:75,RES:11,INT:9,FTH:8},notes:"Comfortable cycle. DEX past second soft cap, gains slow but real. VIT well past soft cap."},
{label:"NG+5",stats:{VIT:70,ATT:22,END:40,STR:14,DEX:90,RES:11,INT:9,FTH:8},notes:"Min-max focus. DEX approaching hard cap. STR/INT/FTH stay minimum (pure DEX)."},
{label:"NG+7",stats:{VIT:80,ATT:24,END:40,STR:14,DEX:99,RES:11,INT:9,FTH:8},notes:"DEX at hard cap (99). Maximum Uchi scaling. Total stat investment ~370 = SL ~290. The PvE god build."}],
weapons:[{n:"Uchigatana +15 (multiple, fresh durability)",ap:"~530+",st:"Bleed",eq:true,d:"NG+ resets respawning slabs so you can have backup +15s for durability swaps.",loc:"Acquired.",up:"Already +15. Slabs reset in NG+.",tip:"Carry 2-3 +15 Uchis since they break easily on extended NG+ runs."}],
armor:[{n:"Light fashion + Havel's combo",wt:"Light",eq:true,d:"With 40 END + Havel's Ring + Mask of the Father, you can fast roll in nearly anything.",loc:"Various.",up:"N/A",tip:"Pick whatever fashion souls combo you like."}],
acc:[{n:"Ring of Favor + Hornet Ring (PvE) or Havel's (PvP)",ef:"Triple buff + crit",eq:true,d:"Only 2 ring slots so choose wisely.",loc:"Acquired.",up:"N/A",tip:"PvE: Hornet for ripostes. PvP: Havel's for fashion souls weight."}],
spells:[{n:"Power Within + Crystal Magic Weapon",ef:"+50% damage + ~50% buff",eq:true,d:"NG+ buff stack. Power Within for damage/stamina, CMW for weapon damage.",loc:"Acquired.",up:"32+ INT for CMW.",tip:"Pop Power Within → Cast CMW → swing the boss into oblivion."}],
dmg:{ps:"~530 base NG+1, ~700+ NG+7, ~1,000+ buffed, ~2,500+ Power Within riposte",sp:"Bleed in 2 hits",bs:"NG+7 Gwyn melts in seconds",n:"DS1 NG+ caps out at NG+7 (no further difficulty scaling). At NG+7 with maxed Uchi + buffs, you're the ultimate katana wielder."}}
],

sim:[
{label:"Iaito",sub:"DEX Katana variant",icon:"🗡️",a:C.cyan,cls:"Wanderer",why:"Same katana archetype with unique charging stance R1.",
ph:[{n:"Early",r:"SL 1–25",s:{VIT:18,END:18,STR:10,DEX:20,INT:9,FTH:8},w:"Iaito",ar:"Wanderer starter",dm:"~180–250"},
{n:"Mid",r:"SL 25–50",s:{VIT:25,END:25,STR:10,DEX:30,INT:9,FTH:8},w:"Iaito +10",ar:"Shadow Set",dm:"~280–360 Bleed procs"},
{n:"End",r:"SL 50+",s:{VIT:35,END:35,STR:10,DEX:40,INT:9,FTH:8},w:"Iaito +15",ar:"Light fashion",dm:"~430–490"}],
key:[{i:"Iaito",d:"Shiva of the East in Blighttown, 5,000 souls (Forest Hunter Covenant)."},{i:"Forest Hunter Covenant",d:"Alvina the Cat in Darkroot Garden."},{i:"Hornet Ring",d:"Darkroot Garden near Sif."}],
steps:["Start Wanderer","Darkroot → Forest Hunter","Blighttown → buy Iaito","Large Ember from Depths","DEX 30 → 40","+15 with Slab"]},
{label:"Washing Pole",sub:"Long-range katana",icon:"🗾",a:C.purple,cls:"Wanderer",why:"Longest reach katana. Absurd range.",
ph:[{n:"Early",r:"SL 15–30",s:{VIT:20,END:18,STR:14,DEX:20,INT:9,FTH:8},w:"Washing Pole",ar:"Light starter",dm:"~200–270"},
{n:"Mid",r:"SL 30–55",s:{VIT:27,END:25,STR:14,DEX:30,INT:9,FTH:8},w:"Washing Pole +10",ar:"Elite Knight",dm:"~290–360 absurd reach"},
{n:"End",r:"SL 55+",s:{VIT:35,END:35,STR:14,DEX:40,INT:9,FTH:8},w:"Washing Pole +15",ar:"Light DEX",dm:"~440–500"}],
key:[{i:"Washing Pole",d:"Shiva of the East in Blighttown, 10,000 souls."},{i:"Forest Hunter Covenant",d:"Required for Shiva."}],
steps:["Start Wanderer/Hunter","Forest Hunter Covenant","Blighttown → Washing Pole","DEX 30 → 40","Range advantage","+15"]},
{label:"Chaos Blade",sub:"Crafted DEX katana",icon:"🔥",a:C.fire,cls:"Hunter",why:"Crafted from Uchi +10 + Soul of Quelaag. Highest katana damage but drains HP.",
ph:[{n:"Mid",r:"SL 30–50",s:{VIT:27,END:25,STR:14,DEX:30,INT:9,FTH:8},w:"Uchi +10",ar:"Light",dm:"~280–360 prepping"},
{n:"Late",r:"SL 50–80",s:{VIT:35,END:30,STR:14,DEX:40,INT:9,FTH:8},w:"Chaos Blade +5",ar:"Light",dm:"~430–490 + ~5% HP self-damage"},
{n:"End",r:"SL 80+",s:{VIT:45,END:35,STR:14,DEX:50,INT:9,FTH:8},w:"Chaos Blade +5 max",ar:"Light fashion",dm:"~520+ at 50 DEX"}],
key:[{i:"Soul of Quelaag",d:"Defeat Chaos Witch Quelaag in Blighttown."},{i:"Uchi +10",d:"Upgrade first."},{i:"Smith box",d:"Forge at bonfire smith box."}],
steps:["Uchigatana","Upgrade to +10","Defeat Quelaag","Forge Chaos Blade","Upgrade with Demon Titanite","DEX 40+"]}
],
oth:[
{label:"Quality Claymore",sub:"STR/DEX 40/40",icon:"⚔️",a:C.yellow,cls:"Knight",why:"Most popular DS1 build. Claymore is universally great.",
ph:[{n:"Early",r:"SL 1–25",s:{VIT:20,END:18,STR:18,DEX:16,INT:9,FTH:8},w:"Claymore",ar:"Knight Set",dm:"~180–250"},
{n:"Mid",r:"SL 25–60",s:{VIT:30,END:30,STR:30,DEX:30,INT:9,FTH:8},w:"Claymore +10",ar:"Knight/Elite Knight",dm:"~310–380"},
{n:"End",r:"SL 60+",s:{VIT:40,END:40,STR:40,DEX:40,INT:9,FTH:8},w:"Claymore +15",ar:"Heavy fashion",dm:"~440–500 meta-tier"}],
key:[{i:"Claymore",d:"Undead Burg Hellkite Dragon bridge — grab from body after dragon flies away."},{i:"Andre of Astora",d:"Undead Parish blacksmith."}],
steps:["Start Knight","Claymore on Hellkite bridge","Upgrade at Andre","STR/DEX evenly","40/40 endgame","+15"]},
{label:"Pyromancer",sub:"Pyromancy spam",icon:"🔥",a:C.fire,cls:"Pyromancer",why:"Pyromancies don't scale with INT/FTH — they scale with the Pyromancy Flame. Free damage.",
ph:[{n:"Early",r:"SL 1–25",s:{VIT:20,ATT:14,END:15,STR:11,DEX:11,INT:9,FTH:8},w:"Pyro Flame + Fireball",ar:"Pyromancer starter",dm:"~150 spell damage"},
{n:"Mid",r:"SL 25–55",s:{VIT:30,ATT:18,END:20,STR:14,DEX:14,INT:9,FTH:8},w:"Pyro Flame +10 + Great Combustion",ar:"Light",dm:"~400 per Great Combustion"},
{n:"End",r:"SL 60+",s:{VIT:40,ATT:24,END:25,STR:14,DEX:14,INT:9,FTH:8},w:"Pyro Flame +15 Ascended",ar:"Light fashion",dm:"~600+ per spell"}],
key:[{i:"Pyromancy Flame",d:"Pyromancer default or from Laurentius."},{i:"Quelana of Izalith",d:"Pyromancy teacher near Quelaag's Domain."},{i:"Great Combustion",d:"From Laurentius."}],
steps:["Start Pyromancer","Rescue Laurentius in The Depths","Reach Quelaag","Flame to +10","Great Combustion","Ascend Flame with Quelana to +15"]},
{label:"Sorcerer",sub:"Pure INT mage",icon:"🔮",a:C.blue,cls:"Sorcerer",why:"Crystal Soul Spear shreds bosses. Long-range destruction.",
ph:[{n:"Early",r:"SL 1–25",s:{VIT:15,ATT:14,END:12,STR:10,DEX:10,INT:25,FTH:8},w:"Sorcerer's Catalyst + Soul Arrow",ar:"Sorcerer Robe",dm:"~120 per Soul Arrow"},
{n:"Mid",r:"SL 25–55",s:{VIT:25,ATT:18,END:15,STR:10,DEX:10,INT:40,FTH:8},w:"Logan's Catalyst + Soul Spear",ar:"Black Cleric",dm:"~400 per Soul Spear"},
{n:"End",r:"SL 60+",s:{VIT:30,ATT:24,END:18,STR:10,DEX:10,INT:50,FTH:8},w:"Tin Crystallization + Crystal Soul Spear",ar:"Light",dm:"~700+ per Crystal Soul Spear"}],
key:[{i:"Logan's Catalyst",d:"Best INT staff at 40+ INT. Big Hat Logan drop."},{i:"Crystal Soul Spear",d:"From Logan after rescuing him."},{i:"Bellowing Dragoncrest Ring",d:"+20% sorcery damage. Great Hollow."}],
steps:["Start Sorcerer","Find Big Hat Logan in Sen's Fortress cage","Rescue him","INT 40","Crystal Soul Spear","INT 50"]}
],
ref:[
{n:"Sharp Uchigatana",i:"⚔️",w:"Uchigatana +15",ap:"~490+ (730+ buffed)",st:"Bleed",ar:"Elite Knight",s:"DEX katana, parry/counter",a:C.gold},
{n:"Iaito",i:"🗡️",w:"Iaito +15",ap:"~430–490",st:"Bleed",ar:"Shadow Set",s:"DEX katana variant",a:C.cyan},
{n:"Washing Pole",i:"🗾",w:"Washing Pole +15",ap:"~440–500",st:"Bleed + range",ar:"Light DEX",s:"Long-range katana",a:C.purple},
{n:"Chaos Blade",i:"🔥",w:"Chaos Blade +5",ap:"~520+",st:"Bleed + self-damage",ar:"Light",s:"Crafted DEX katana",a:C.fire},
{n:"Quality Claymore",i:"⚔️",w:"Claymore +15",ap:"~440–500",st:"Pure damage",ar:"Knight Set",s:"Meta R1 spam",a:C.yellow},
{n:"Pyromancer",i:"🔥",w:"Pyro Flame +15",ap:"~600+",st:"Fire AoE",ar:"Light",s:"Free damage spells",a:C.fire},
{n:"Sorcerer",i:"🔮",w:"Tin Crystallization",ap:"~700+ Crystal Spear",st:"Long-range",ar:"Sorcerer Robe",s:"Pure INT mage",a:C.blue}]};

/* ══ GAME DATA ══ */
const lotfMats=[
{tier:"Small Deralium Fragments",range:"+0 to +2",buy:"Gerlinde at Skyrest Bridge — unlimited, 500 Vigor each",farm:"Pilgrim Mages, Shuja Warriors",find:"Scattered in early areas",tip:"Just buy from Gerlinde."},
{tier:"Regular Deralium Nuggets",range:"+2 to +5",buy:"Gerlinde — unlimited after Sunless Skein",farm:"Chests in early-mid",find:"Revelation Depths (×3), Fitzroy's Gorge",tip:"Visit new Vestiges to expand inventory."},
{tier:"Large Deralium Shards",range:"+5 to +9",buy:"Gerlinde — unlimited after Abbey of Hallowed Sisters",farm:"BEST: Holy Bulwark at Vestige of Brother Jeremiah (~20 sec/run)",find:"Abbey, Empyrean, Bramis Castle",tip:"Equip Bountiful Ring for higher drops."},
{tier:"Deralium Chunks",range:"+9 to +10",buy:"Shrine of Orius — Pilfered Coins from boss rush",farm:"NOT farmable. Only ~4 per playthrough.",find:"Revelation Depths, Tower of Penance, Bramis Castle, Fief of Chill Curse",tip:"PERMANENT — test weapons before committing."}];

const ds1Mats=[
{tier:"Titanite Shard",range:"+0 to +5",buy:"Andre (800 souls) and Undead Merchant Female (800) — unlimited",farm:"Common enemies Undead Burg/Parish/Depths",find:"Scattered everywhere",tip:"You'll never run out."},
{tier:"Large Titanite Shard",range:"+5 to +10",buy:"Giant Blacksmith in Anor Londo — unlimited",farm:"BEST: Darkwraiths in New Londo after draining water. Also Black Knights.",find:"Sen's Fortress, Darkroot Basin, Anor Londo",tip:"REQUIRED: Give Large Ember (Depths chest) to Andre for +6 to +10."},
{tier:"Titanite Chunk",range:"+10 to +14",buy:"Giant Blacksmith — unlimited (expensive)",farm:"Black Knights. Crystal Cave Lizards. Anor Londo gargoyles.",find:"Crystal Cave, Anor Londo rooftops, Tomb of Giants",tip:"REQUIRED: Give Very Large Ember (Demon Ruins illusory wall) to Andre for +11 to +14."},
{tier:"Titanite Slab",range:"+14 to +15",buy:"Giant Blacksmith — limited",farm:"Crystal Lizards (tiny chance). Darkwraiths (low chance).",find:"FREE SLABS: Anor Londo (near Giant Blacksmith), Tomb of Giants (near Patches), Demon Ruins, Lost Izalith (Bounding Demons), Duke's Archives, Darkroot Garden (near Sif's grave)",tip:"~6–7 slabs per playthrough. ONLY +15 your main weapon."}];

const lotfWeight={light:"Under ~50% of max. Faster attacks.",medium:"50%–100%. RECOMMENDED. Same dodge as Light, better armor.",heavy:"Over max. Slow.",note:"END soft cap for weight at 40. Crafter's Essence rune (3 Rune Tablets to Gerlinde) makes weapons weightless and bypasses stat reqs. Ring of Bones increases equip load."};

const ds1Weight={light:"Under 25% equip load. FAST roll (best i-frames). Essential for DEX builds.",medium:"25%–50%. Normal roll.",heavy:"50%–100%. Slow roll.",note:"Over 100% = fat roll. Ring of Favor +20% equip. Havel's Ring +50% equip. Mask of Father +5% equip. END soft cap at 40. Combine for fast roll in anything."};

const games={
lotf:{name:"Lords of the Fallen",icon:"🩸",builds:{crimson:crimsonReaper,wither:witherReaper},statMax:75,endgameBudget:155,softCaps:{VIT:null,END:40,STR:50,AGI:50,RAD:50,INF:50},mats:lotfMats,weightInfo:lotfWeight},
ds1:{name:"Dark Souls",icon:"⚔️",builds:{uchi:ds1Uchi},statMax:99,endgameBudget:200,softCaps:{VIT:50,ATT:50,END:40,STR:40,DEX:40,RES:null,INT:50,FTH:50},mats:ds1Mats,weightInfo:ds1Weight}
};

/* ══ COMPONENTS ══ */

const SL=({children,a})=>(
  <div style={{display:"flex",alignItems:"center",gap:10,marginTop:26,marginBottom:12}}>
    <div style={{width:3,height:18,background:`linear-gradient(180deg,${a},${a}66)`,borderRadius:2,boxShadow:`0 0 7px ${a}88`,flexShrink:0}}/>
    <h3 style={{fontFamily:"'Cinzel',serif",fontSize:".72rem",letterSpacing:".18em",textTransform:"uppercase",color:C.bright,margin:0,fontWeight:700,whiteSpace:"nowrap"}}>{children}</h3>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,${a}44,transparent)`}}/>
  </div>
);

const ItemCard=({item,a})=>{
  const [o,setO]=useState(false);
  const isEquipped=item.eq!==false;
  return (
    <div className="item-card" style={{border:`1px solid ${o?a+"55":"#ffffff10"}`,borderLeft:isEquipped?`3px solid ${o?a:a+"55"}`:"3px solid #333",borderRadius:7,marginBottom:7,background:o?"#1d1911":C.card,overflow:"hidden",boxShadow:o?`0 2px 16px #00000050`:"none"}}>
      <button onClick={()=>setO(!o)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"10px 13px 10px 12px",background:"none",border:"none",cursor:"pointer",textAlign:"left",flexWrap:"wrap"}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:isEquipped?a:"#3a3428",flexShrink:0,boxShadow:isEquipped&&o?`0 0 6px ${a}`:""}}/>
        <span style={{flex:"1 1 110px",fontSize:".86rem",color:isEquipped?C.bright:C.dim,fontWeight:isEquipped?600:400,minWidth:80}}>{item.n}</span>
        {item.ap&&<span style={{fontSize:".72rem",color:a,fontFamily:"'Cinzel',serif",fontWeight:700,flexShrink:0}}>{item.ap}</span>}
        {item.st&&<span style={{fontSize:".65rem",background:`${a}1a`,color:C.bright,padding:"2px 10px",borderRadius:20,whiteSpace:"nowrap",fontWeight:600,border:`1px solid ${a}44`,flexShrink:0}}>{item.st}</span>}
        {item.ef&&!o&&<span style={{fontSize:".68rem",color:C.dim,fontStyle:"italic",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.ef}</span>}
        {item.wt&&<span style={{fontSize:".65rem",color:C.dim,whiteSpace:"nowrap",flexShrink:0}}>⚖ {item.wt}</span>}
        <span style={{color:a,fontSize:".6rem",transform:o?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s",flexShrink:0,marginLeft:"auto"}}>▶</span>
      </button>
      {o&&<div style={{padding:"2px 14px 14px 28px",fontSize:".8rem",lineHeight:1.65}}>
        {item.ef&&<div style={{fontSize:".76rem",color:a,fontWeight:600,marginBottom:8,fontStyle:"italic"}}>{item.ef}</div>}
        {item.d&&<p style={{color:C.text,margin:"0 0 10px",lineHeight:1.6}}>{item.d}</p>}
        {[{i:"📍",l:"LOCATION",v:item.loc},{i:"⬆",l:"UPGRADE",v:item.up},{i:"💡",l:"TIPS",v:item.tip}].filter(x=>x.v&&x.v!=="N/A"&&x.v!=="Acquired.").map((x,j)=>(
          <div key={j} style={{background:"#ffffff06",borderRadius:5,padding:"7px 12px",marginBottom:5,borderLeft:`2px solid ${a}88`}}>
            <span style={{color:a,fontWeight:700,fontSize:".7rem",letterSpacing:".04em"}}>{x.i} {x.l}: </span><span style={{color:C.text}}>{x.v}</span>
          </div>
        ))}
      </div>}
    </div>
  );
};

const StatBar=({l,v,max,a,p,softCap})=>{
  const pct=Math.min((v/max)*100,100);
  const grew=p!=null&&v>p;
  return (
    <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
      <span style={{width:36,fontSize:".7rem",color:C.dim,fontFamily:"'Cinzel',serif",textAlign:"right",letterSpacing:".03em",flexShrink:0}}>{l}</span>
      <div style={{flex:1,height:17,background:"#ffffff09",borderRadius:8,overflow:"hidden",position:"relative"}}>
        {p!=null&&<div style={{position:"absolute",width:`${Math.min((p/max)*100,100)}%`,height:"100%",background:`${a}28`,borderRadius:8}}/>}
        <div className="stat-fill" style={{position:"relative",width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${a}88,${a})`,borderRadius:8,boxShadow:pct>0?`0 0 8px ${a}66,inset 0 1px 0 rgba(255,255,255,0.15)`:"none"}}/>
        {softCap&&<div style={{position:"absolute",left:`${(softCap/max)*100}%`,top:0,width:1,height:"100%",background:"#ffffff55",boxShadow:"0 0 3px #ffffff88"}}/>}
      </div>
      <span style={{width:28,fontSize:".86rem",color:C.bright,fontWeight:700,textAlign:"right",flexShrink:0}}>{v}</span>
      {grew?<span style={{fontSize:".64rem",color:C.green,fontWeight:700,width:24,flexShrink:0}}>+{v-p}</span>:<span style={{width:24,flexShrink:0}}/>}
    </div>
  );
};

const DBox=({d,a})=>(
  <div style={{background:C.card,border:`1px solid ${a}44`,borderLeft:`3px solid ${a}`,borderRadius:6,padding:13,fontSize:".8rem"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:9}}>
      <div><div style={{color:a,fontWeight:700,fontSize:".68rem",letterSpacing:".07em",marginBottom:3}}>PER SWING</div><div style={{color:C.bright,fontWeight:700,fontSize:".92rem"}}>{d.ps}</div></div>
      <div><div style={{color:a,fontWeight:700,fontSize:".68rem",letterSpacing:".07em",marginBottom:3}}>STATUS / EFFECT</div><div style={{color:C.text}}>{d.sp}</div></div>
    </div>
    <div style={{marginBottom:7}}><span style={{color:a,fontWeight:700,fontSize:".68rem"}}>BOSS SPEED: </span><span style={{color:C.text}}>{d.bs}</span></div>
    <div style={{color:C.dim,fontStyle:"italic",fontSize:".78rem",borderTop:"1px solid #ffffff10",paddingTop:8,lineHeight:1.5}}>{d.n}</div>
  </div>
);

const ABC=({b,statMax,softCaps})=>{
  const [pi,setPi]=useState(b.ph.length-1);
  const [sk,setSk]=useState(false);
  const [ki,setKi]=useState(false);
  const p=b.ph[pi]; const pv=pi>0?b.ph[pi-1]:null;
  // Support both condensed AI format (n/r/s/w/ar/dm) and full static format (name/range/stats/weapons[])
  const pName=p.n||p.name||"—";
  const pRange=p.r||p.range||"—";
  const pStats=p.s||p.stats||{};
  const pWeapon=p.w||(p.weapons&&p.weapons.filter(w=>w.eq!==false)[0]?.n)||"—";
  const pArmor=p.ar||(p.armor&&p.armor[0]?.n)||"—";
  const pDmg=p.dm||(p.dmg?.ps)||"—";
  const pvStats=pv?(pv.s||pv.stats||{}):null;
  return (
    <div style={{border:`1px solid ${b.a}33`,borderLeft:`3px solid ${b.a}`,borderRadius:7,marginBottom:14,overflow:"hidden",background:C.card}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${b.a}22`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:"1.5rem"}}>{b.icon}</span>
          <div><div style={{fontFamily:"'Cinzel',serif",fontSize:"1.05rem",color:C.bright,fontWeight:700}}>{b.label}</div><div style={{fontSize:".66rem",color:b.a,letterSpacing:".09em",textTransform:"uppercase",marginTop:1,fontWeight:600}}>{b.sub} · {b.cls}</div></div>
        </div>
        <div style={{fontSize:".8rem",color:C.text,lineHeight:1.55,marginTop:9,fontStyle:"italic"}}>{b.why}</div>
      </div>
      <div style={{padding:"12px 16px"}}>
        <div style={{display:"flex",gap:4,marginBottom:13}}>{b.ph.map((ph,i)=>{const phName=ph.n||ph.name||"—";const phRange=ph.r||ph.range||"—";return(<button key={i} onClick={()=>setPi(i)} style={{flex:1,background:i===pi?`${b.a}22`:"transparent",border:`1px solid ${i===pi?b.a:"#ffffff14"}`,borderRadius:5,padding:"6px 4px",cursor:"pointer",textAlign:"center",transition:"all .2s"}}><div style={{fontSize:".72rem",color:i===pi?C.bright:C.dim,fontFamily:"'Cinzel',serif",fontWeight:700}}>{phName}</div><div style={{fontSize:".6rem",color:C.dim}}>{phRange}</div></button>);})}</div>
        <div style={{marginBottom:11}}>{Object.entries(pStats).map(([k,v])=><StatBar key={k} l={k} v={v} max={statMax} a={b.a} p={pvStats?pvStats[k]:null} softCap={softCaps?softCaps[k]:null}/>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:11,fontSize:".78rem"}}>
          <div style={{background:"#ffffff06",borderRadius:5,padding:"8px 10px",borderLeft:`2px solid ${b.a}`}}><div style={{color:b.a,fontWeight:700,fontSize:".66rem",marginBottom:3}}>WEAPON</div><div style={{color:C.bright}}>{pWeapon}</div></div>
          <div style={{background:"#ffffff06",borderRadius:5,padding:"8px 10px",borderLeft:`2px solid ${b.a}`}}><div style={{color:b.a,fontWeight:700,fontSize:".66rem",marginBottom:3}}>ARMOR</div><div style={{color:C.text}}>{pArmor}</div></div>
        </div>
        <div style={{background:"#ffffff06",border:`1px solid ${b.a}22`,borderLeft:`3px solid ${b.a}`,borderRadius:5,padding:"8px 10px",fontSize:".78rem",marginBottom:11}}><span style={{color:b.a,fontWeight:700,fontSize:".68rem"}}>DAMAGE: </span><span style={{color:C.text}}>{pDmg}</span></div>
        {[{l:"KEY ITEMS & LOCATIONS",o:ki,s:setKi,c:(b.key||[]).map((k,i)=><div key={i} style={{padding:"6px 10px",borderBottom:"1px solid #ffffff08",lineHeight:1.5,fontSize:".8rem"}}><span style={{color:b.a,fontWeight:700}}>{k.i}: </span><span style={{color:C.text}}>{k.d}</span></div>)},
          {l:"PROGRESSION STEPS",o:sk,s:setSk,c:(b.steps||[]).map((s,i)=><div key={i} style={{display:"flex",gap:7,padding:"4px 10px",fontSize:".8rem",color:C.text,lineHeight:1.5}}><span style={{color:b.a,fontWeight:700,fontSize:".7rem",flexShrink:0}}>{i+1}.</span><span>{s}</span></div>)}
        ].map((sec,i)=><div key={i} style={{marginBottom:6}}><button onClick={()=>sec.s(!sec.o)} style={{width:"100%",background:"#ffffff06",border:`1px solid ${b.a}33`,borderRadius:5,padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontFamily:"'Cinzel',serif",fontSize:".72rem",color:b.a,letterSpacing:".08em",fontWeight:700}}>{sec.l}</span><span style={{color:b.a,fontSize:".62rem",transform:sec.o?"rotate(90deg)":"rotate(0)",transition:"transform .2s"}}>▶</span></button>{sec.o&&<div style={{padding:"7px 0 4px"}}>{sec.c}</div>}</div>)}
      </div>
    </div>
  );
};

const LoadoutSelector=({lo,setLo,a,loadouts})=>loadouts?(
  <div style={{marginBottom:18}}>
    <SL a={a}>Loadout Variant</SL>
    <div style={{display:"flex",gap:5,marginBottom:11,flexWrap:"wrap"}}>
      {loadouts.map(l=>(
        <button key={l.id} onClick={()=>setLo(l.id)} style={{flex:"1 1 auto",background:lo===l.id?`${a}22`:"transparent",border:`1px solid ${lo===l.id?a:"#ffffff14"}`,borderRadius:5,padding:"8px 11px",cursor:"pointer",textAlign:"center",minWidth:130,transition:"all .2s"}}>
          <div style={{fontSize:".76rem",color:lo===l.id?C.bright:C.dim,fontFamily:"'Cinzel',serif",fontWeight:700}}>{l.label}</div>
          <div style={{fontSize:".62rem",color:C.dim,marginTop:2}}>Wt: {l.weaponWt}</div>
        </button>
      ))}
    </div>
    {(()=>{const sel=loadouts.find(x=>x.id===lo); return sel?(
      <div style={{background:C.card,border:`1px solid ${a}44`,borderLeft:`3px solid ${a}`,borderRadius:6,padding:13,fontSize:".8rem",lineHeight:1.65}}>
        <div style={{marginBottom:5}}><span style={{color:a,fontWeight:700}}>Weapon Weight: </span><span style={{color:C.bright}}>{sel.weaponWt}</span></div>
        <div style={{marginBottom:5}}><span style={{color:a,fontWeight:700}}>END Needed: </span><span style={{color:C.text}}>{sel.endReq}</span></div>
        <div style={{marginBottom:5}}><span style={{color:a,fontWeight:700}}>Best Armor: </span><span style={{color:C.text}}>{sel.armor}</span></div>
        <div style={{marginBottom:5}}><span style={{color:C.green,fontWeight:700}}>✓ Pros: </span><span style={{color:C.text}}>{sel.pros}</span></div>
        <div><span style={{color:C.fire,fontWeight:700}}>✗ Cons: </span><span style={{color:C.text}}>{sel.cons}</span></div>
      </div>
    ):null;})()}
  </div>
):null;

/* ══ MAIN APP ══ */
export default function App(){
  const defaultPi=(build)=>{
    if(!build||!build.ph)return 0;
    const idx=build.ph.findIndex(ph=>ph.name==="Endgame"||ph.name==="Endgame / Meta");
    return idx>=0?idx:build.ph.length-1;
  };

  const [game,setGame]=useState("lotf");
  const initialBuild=Object.keys(games.lotf.builds)[0];
  const [buildKey,setBuildKey]=useState(initialBuild);
  const [tab,setTab]=useState("main");
  const [pi,setPi]=useState(defaultPi(games.lotf.builds[initialBuild]));
  const [lo,setLo]=useState("two_hand");
  const [dynamicBuilds,setDynamicBuilds]=useState({});
  const [dynamicGames,setDynamicGames]=useState({});
  const [hiddenStaticBuilds,setHiddenStaticBuilds]=useState([]);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [confirmReset,setConfirmReset]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [addText,setAddText]=useState("");
  const [addUrl,setAddUrl]=useState("");
  const [addTargetGame,setAddTargetGame]=useState("lotf");
  const [addCustomGameName,setAddCustomGameName]=useState("");
  const [adding,setAdding]=useState(false);
  const [addStep,setAddStep]=useState("");
  const [addError,setAddError]=useState("");
  const [updating,setUpdating]=useState(false);
  const [updateMsg,setUpdateMsg]=useState("");
  const [addMode,setAddMode]=useState("ai");
  const [manualPhase,setManualPhase]=useState(0);
  const [semiForm,setSemiForm]=useState({label:"",playstyle:"",accent:"",endgameStats:{},preferredWeapon:"",notes:""});
  const [manualForm,setManualForm]=useState({
    label:"",sub:"",icon:"⚔️",accent:"#e74c3c",cls:"",caps:"",weaponReq:"",playstyle:"",
    phases:[
      {stats:{},weapons:[{n:"",st:""}],armor:[{n:""}],acc:[{n:"",ef:""}],spells:[]},
      {stats:{},weapons:[{n:"",st:""}],armor:[{n:""}],acc:[{n:"",ef:""}],spells:[]},
      {stats:{},weapons:[{n:"",st:""}],armor:[{n:""}],acc:[{n:"",ef:""}],spells:[]}
    ]
  });
  const [ngCycle,setNgCycle]=useState(0);
  const [storageLoaded,setStorageLoaded]=useState(false);
  const [knowledgeCache,setKnowledgeCache]=useState({});
  const [provider,setProvider]=useState("claude");
  const [selectedProviders,setSelectedProviders]=useState(["claude"]); // ordered: [core, cont, variants]
  const [multiAI,setMultiAI]=useState(()=>{try{return localStorage.getItem("codex_multiAI")!=="false";}catch{return true;}});
  const [apiKeys,setApiKeys]=useState({claude:"",perplexity:""});
  const [genInfo,setGenInfo]=useState(null); // {prov,label,step,total} — shown in floating indicator
  const [confirmClearCache,setConfirmClearCache]=useState(false); // inline confirm to avoid window.confirm() Electron focus bug
  const [showCacheViewer,setShowCacheViewer]=useState(false);
  const [wikiUrls,setWikiUrls]=useState(""); // wiki import URLs (one per line)
  const [wikiImporting,setWikiImporting]=useState(false); // wiki fetch in progress
  const [learning,setLearning]=useState(false); // AI Learn crawl in progress
  const [permCache,setPermCache]=useState({}); // permanent item database — manually curated, never auto-cleared
  const [showPermViewer,setShowPermViewer]=useState(false); // toggle perm cache viewer panel

  // Toggle a provider in the modal multi-select (max 3, order = step assignment)
  const toggleModalProv=(key)=>{
    if(!(apiKeys[key]||"").trim())return;
    setSelectedProviders(prev=>{
      if(prev.includes(key)){
        if(prev.length===1)return prev; // can't deselect the only one
        const next=prev.filter(p=>p!==key);
        setProvider(next[0]); // keep global in sync with primary
        try{localStorage.setItem("codex_provider",next[0]);}catch(_){}
        return next;
      }else{
        return [...prev,key].slice(0,3); // cap at 3 (one per step)
      }
    });
  };
  const [showSettings,setShowSettings]=useState(false);
  const [settingsDraft,setSettingsDraft]=useState({claude:"",perplexity:""});
  // legacy compat
  const apiKey=apiKeys[provider]||"";

  // Load saved state on mount
  useEffect(()=>{
    try{
      const raw=localStorage.getItem("codex_state");
      if(raw){
        const state=JSON.parse(raw);
        if(state.dynamicBuilds)setDynamicBuilds(state.dynamicBuilds);
        if(state.dynamicGames)setDynamicGames(state.dynamicGames);
        if(state.hiddenStaticBuilds)setHiddenStaticBuilds(state.hiddenStaticBuilds);
        if(state.game)setGame(state.game);
        if(state.buildKey)setBuildKey(state.buildKey);
      }
    }catch(e){}
    try{
      const rawK=localStorage.getItem("codex_knowledge");
      if(rawK){const k=JSON.parse(rawK);if(k&&typeof k==="object")setKnowledgeCache(k);}
    }catch(e){}
    try{
      const rawP=localStorage.getItem("codex_perm");
      if(rawP){const p=JSON.parse(rawP);if(p&&typeof p==="object")setPermCache(p);}
    }catch(e){}
    try{
      const savedKeys=localStorage.getItem("codex_apikeys");
      const legacyKey=localStorage.getItem("codex_apikey");
      if(savedKeys){
        const parsed=JSON.parse(savedKeys);
        setApiKeys(prev=>({...prev,...parsed}));
        setSettingsDraft(prev=>({...prev,...parsed}));
        if(!Object.values(parsed).some(v=>v&&v.trim()))setShowSettings(true);
      }else if(legacyKey){
        // migrate old single key to claude slot
        setApiKeys(prev=>({...prev,claude:legacyKey}));
        setSettingsDraft(prev=>({...prev,claude:legacyKey}));
        localStorage.setItem("codex_apikeys",JSON.stringify({claude:legacyKey,perplexity:""}));
      }else{setShowSettings(true);}
      const savedProvider=localStorage.getItem("codex_provider");
      // Only restore if the provider still exists (guards against groq/openai being in old saves)
      if(savedProvider&&["claude","perplexity"].includes(savedProvider)){
        setProvider(savedProvider);setSelectedProviders([savedProvider]);
      }else if(savedProvider){
        // Stale provider removed — fall back to first available key or claude
        localStorage.removeItem("codex_provider");
      }
    }catch(e){setShowSettings(true);}
    setStorageLoaded(true);
  },[]);

  // Save state when it changes (after initial load)
  useEffect(()=>{
    if(!storageLoaded)return;
    try{localStorage.setItem("codex_state",JSON.stringify({dynamicBuilds,dynamicGames,hiddenStaticBuilds,game,buildKey}));}catch(e){}
  },[storageLoaded,dynamicBuilds,dynamicGames,hiddenStaticBuilds,game,buildKey]);

  // Save knowledge cache
  useEffect(()=>{
    if(!storageLoaded)return;
    try{localStorage.setItem("codex_knowledge",JSON.stringify(knowledgeCache));}catch(e){}
  },[storageLoaded,knowledgeCache]);

  // Save permanent cache
  useEffect(()=>{
    if(!storageLoaded)return;
    try{localStorage.setItem("codex_perm",JSON.stringify(permCache));}catch(e){}
  },[storageLoaded,permCache]);

  // Persist multi-AI toggle
  useEffect(()=>{try{localStorage.setItem("codex_multiAI",multiAI);}catch(_){}
  },[multiAI]);

  // Merge static and dynamic games, filter hidden static builds
  const allGames={};
  for(const [k,g] of Object.entries(games)){
    const filteredStatic={};
    for(const [bk,bv] of Object.entries(g.builds)){
      if(!hiddenStaticBuilds.includes(`${k}:${bk}`))filteredStatic[bk]=bv;
    }
    const merged={...filteredStatic,...(dynamicBuilds[k]||{})};
    if(Object.keys(merged).length>0)allGames[k]={...g,builds:merged};
  }
  for(const [k,g] of Object.entries(dynamicGames)){
    if(g.builds&&Object.keys(g.builds).length>0)allGames[k]=g;
  }

  const gameKeys=Object.keys(allGames);
  const safeGame=allGames[game]?game:(gameKeys[0]||"lotf");
  const G=allGames[safeGame]||{builds:{},name:"—",icon:"❓",statMax:99,softCaps:{}};
  const allBuilds=G.builds;
  const buildKeys=Object.keys(allBuilds);
  const safeBuildKey=buildKeys.includes(buildKey)?buildKey:buildKeys[0];
  const B=allBuilds[safeBuildKey]||{label:"No builds",sub:"",icon:"—",accent:C.dim,playstyle:"All builds have been deleted. Add a new one to get started.",cls:"—",caps:"—",weaponReq:"—",ph:[{name:"—",range:"—",stats:{},sn:"",weapons:[],armor:[],acc:[],spells:[],dmg:{ps:"—",sp:"—",bs:"—",n:"—"}}],sim:[],oth:[],ref:[]};
  const safePi=Math.min(pi,B.ph.length-1);
  const p=B.ph[safePi];
  const pv=safePi>0?B.ph[safePi-1]:null;
  const a=B.accent;

  const handleGameSwitch=(g)=>{
    setGame(g);const gameObj=allGames[g];const firstBuild=Object.keys(gameObj.builds)[0];
    setBuildKey(firstBuild);setTab("main");setPi(defaultPi(gameObj.builds[firstBuild]));
    setLo(gameObj.builds[firstBuild].loadouts?.[0]?.id||"two_hand");setNgCycle(0);
  };
  const handleBuildSwitch=(k)=>{
    setBuildKey(k);setTab("main");setPi(defaultPi(allBuilds[k]));
    setLo(allBuilds[k].loadouts?.[0]?.id||"two_hand");setNgCycle(0);
  };
  const handleDeleteBuild=()=>{if(!safeBuildKey||B.label==="No builds")return;setConfirmDelete(true);};
  const doDeleteBuild=()=>{
    const curGame=safeGame;const curBuild=safeBuildKey;setConfirmDelete(false);
    let newDynamicGames=dynamicGames,newDynamicBuilds=dynamicBuilds,newHidden=hiddenStaticBuilds;
    if(dynamicGames[curGame]){
      const gb={...dynamicGames[curGame].builds};delete gb[curBuild];
      newDynamicGames={...dynamicGames};
      if(Object.keys(gb).length===0)delete newDynamicGames[curGame];
      else newDynamicGames[curGame]={...dynamicGames[curGame],builds:gb};
    }else if(dynamicBuilds[curGame]?.[curBuild]){
      const gb={...(dynamicBuilds[curGame]||{})};delete gb[curBuild];
      newDynamicBuilds={...dynamicBuilds};
      if(Object.keys(gb).length===0)delete newDynamicBuilds[curGame];
      else newDynamicBuilds[curGame]=gb;
    }else{newHidden=[...hiddenStaticBuilds,`${curGame}:${curBuild}`];}
    const newAllGames={};
    for(const [k,g] of Object.entries(games)){
      const fs={};
      for(const [bk,bv] of Object.entries(g.builds)){if(!newHidden.includes(`${k}:${bk}`))fs[bk]=bv;}
      const merged={...fs,...(newDynamicBuilds[k]||{})};
      if(Object.keys(merged).length>0)newAllGames[k]={...g,builds:merged};
    }
    for(const [k,g] of Object.entries(newDynamicGames)){if(g.builds&&Object.keys(g.builds).length>0)newAllGames[k]=g;}
    setDynamicGames(newDynamicGames);setDynamicBuilds(newDynamicBuilds);setHiddenStaticBuilds(newHidden);
    if(newAllGames[curGame]){
      const nb=Object.keys(newAllGames[curGame].builds)[0];setBuildKey(nb);
      setPi(defaultPi(newAllGames[curGame].builds[nb]));setLo(newAllGames[curGame].builds[nb].loadouts?.[0]?.id||"two_hand");
    }else if(Object.keys(newAllGames).length>0){
      const ng=Object.keys(newAllGames)[0];const nb=Object.keys(newAllGames[ng].builds)[0];
      setGame(ng);setBuildKey(nb);setPi(defaultPi(newAllGames[ng].builds[nb]));setLo(newAllGames[ng].builds[nb].loadouts?.[0]?.id||"two_hand");
    }
    setTab("main");
  };
  const handleRestoreAll=()=>setConfirmReset(true);
  const doRestoreAll=()=>{
    setConfirmReset(false);setHiddenStaticBuilds([]);setDynamicBuilds({});setDynamicGames({});
    setGame("lotf");setBuildKey(Object.keys(games.lotf.builds)[0]);
    setPi(defaultPi(games.lotf.builds[Object.keys(games.lotf.builds)[0]]));setTab("main");
  };

  const extractFactsFromBuild=(build)=>{
    const facts=[];

    // Returns true if a loc string is too vague to be worth caching
    const isVagueLoc=(loc)=>{
      if(!loc||typeof loc!=="string")return true;
      const l=loc.trim().toLowerCase();
      if(l.length<8)return true;
      return /^(starting|acquired\.?|n\/a|exploration|mid-?game|various|unknown|tbd|inventory|default|placeholder|obtained in phase|drops? from enemies|found (throughout|everywhere)|given (to|by)|beginning|early game|any |common drop|use |player starts?)/.test(l);
    };

    // Returns true if an item name is too generic to cache
    const isVagueName=(n)=>{
      if(!n||typeof n!=="string")return true;
      const l=n.trim().toLowerCase();
      if(l.length<3)return true;
      // Exact or prefix matches for generic placeholders
      if(["n/a","none","various","any","item","weapon","armor","ring","accessory","starting gear","placeholder","use whatever you find","save a ring slot"].some(s=>l===s||l.startsWith(s)))return true;
      // Placeholder weapon/armor phrases regardless of position
      if(/\b(2nd|second|third|another|off.?hand|additional|extra|alternate|backup)\s+(weapon|sword|axe|blade|ring|armor|shield)/i.test(n))return true;
      if(/^(best |your |the |any |upgrade |based on )/i.test(n))return true;
      return false;
    };

    if(build.label)facts.push(`Build "${build.label}" (${build.sub||"—"}): class=${build.cls||"?"}, caps=${build.caps||"?"}, req=${build.weaponReq||"?"}`);

    // ── Weapons: group across all phases to capture AP upgrade progression ──
    // Same weapon appears in multiple phases at different upgrade levels.
    // We collect all appearances then emit a single fact with the full AP range
    // (e.g. "AP: ~400 (base) → ~1,000 (+10)") plus scaling grades.
    const weaponGroups={}; // normalized name → [appearance, ...]
    (build.ph||[]).forEach(ph=>{
      (ph.weapons||[]).forEach(w=>{
        if(w.eq===false||isVagueName(w.n))return;
        // Normalize name: strip upgrade suffixes like " (+5 to +7)", " +10" for grouping
        const normKey=w.n.toLowerCase().replace(/\s*\(?\+?\d+[^)]*\)?$/,"").replace(/\s+/g," ").trim();
        if(!weaponGroups[normKey])weaponGroups[normKey]={canonical:w.n,appearances:[]};
        // Use longer name as canonical (more descriptive)
        if(w.n.length>weaponGroups[normKey].canonical.length)weaponGroups[normKey].canonical=w.n;
        weaponGroups[normKey].appearances.push(w);
      });
    });

    for(const grp of Object.values(weaponGroups)){
      const apps=grp.appearances;
      const parts=[];

      // Location — first appearance with a real location
      const withLoc=apps.find(a=>!isVagueLoc(a.loc));
      if(withLoc)parts.push(`loc: ${withLoc.loc}`);

      // Upgrade materials — first real entry
      const withUp=apps.find(a=>a.up&&a.up!=="N/A"&&!isVagueLoc(a.up));
      if(withUp)parts.push(`upgrade: ${withUp.up}`);

      // AP progression across phases — earliest and latest non-empty values
      const aps=apps.map(a=>a.ap).filter(Boolean);
      if(aps.length>1){
        // Show lowest (base) → highest (max upgrade) if they differ meaningfully
        const first=aps[0],last=aps[aps.length-1];
        parts.push(first===last?`AP: ${first}`:`AP: ${first} (base) → ${last} (+10 max)`);
      }else if(aps.length===1){
        parts.push(`AP: ${aps[0]}`);
      }

      // Scaling grades — from dedicated sc field, or scan d/tip for grade patterns
      const withSc=apps.find(a=>a.sc&&a.sc.trim().length>1);
      if(withSc){
        parts.push(`scaling: ${withSc.sc}`);
      }else{
        // Fallback: extract from description or tip (e.g. "A STR", "S DEX / C INT")
        const text=apps.map(a=>`${a.d||""} ${a.tip||""}`).join(" ");
        const scMatch=text.match(/\b([A-S][+-]?)\s+(STR|DEX|INT|FTH|ARC|RAD|INF|AGI|VIG|END|Quality)/i);
        if(scMatch)parts.push(`scaling: ${scMatch[0].trim()}`);
      }

      // Status effect — from any appearance
      const withSt=apps.find(a=>a.st);
      if(withSt)parts.push(`status: ${withSt.st}`);

      // Weapon type/weight from any appearance
      const withWt=apps.find(a=>a.wt);
      if(withWt)parts.push(`wt: ${withWt.wt}`);

      if(parts.length>0)facts.push(`WEAPON ${grp.canonical} — ${parts.join(" | ")}`);
    }

    // For armor, acc, spells: deduplicate by name so the same item across builds is merged.
    // We use a Map keyed by normalized item name and keep the most-detailed entry.
    const armorSeen=new Map();
    const accSeen=new Map();
    const spellSeen=new Map();

    (build.ph||[]).forEach(ph=>{
      (ph.armor||[]).forEach(ar=>{
        if(ar.eq===false||isVagueName(ar.n))return;
        const k=ar.n.trim().toLowerCase();
        // Keep the entry with the most specific (longest real) location
        const existing=armorSeen.get(k);
        const curLocReal=!isVagueLoc(ar.loc);
        const prevLocReal=existing&&!isVagueLoc(existing.loc||"");
        // Prefer: real loc > vague loc. Tie-break by longer loc string.
        if(!existing||(curLocReal&&!prevLocReal)||(curLocReal===prevLocReal&&(ar.loc||"").length>(existing.loc||"").length))
          armorSeen.set(k,ar);
      });
      (ph.acc||[]).forEach(ac=>{
        if(ac.eq===false||isVagueName(ac.n)||isVagueLoc(ac.loc))return;
        const k=ac.n.trim().toLowerCase();
        if(!accSeen.has(k)||(ac.ef||"").length>(accSeen.get(k).ef||"").length)accSeen.set(k,ac);
      });
      (ph.spells||[]).forEach(s=>{
        if(s.eq===false||isVagueName(s.n)||isVagueLoc(s.loc))return;
        const k=s.n.trim().toLowerCase();
        if(!spellSeen.has(k)||(s.dmg||s.ef||"").length>(spellSeen.get(k).dmg||spellSeen.get(k).ef||"").length)spellSeen.set(k,s);
      });
    });

    for(const ar of armorSeen.values()){
      const parts=[];
      if(!isVagueLoc(ar.loc))parts.push(`loc: ${ar.loc}`);
      if(ar.wt)parts.push(`wt: ${ar.wt}`);
      if(ar.d&&ar.d.trim())parts.push(`note: ${ar.d.trim().slice(0,90)}${ar.d.trim().length>90?"…":""}`);
      facts.push("ARMOR "+ar.n+(parts.length>0?" — "+parts.join(" | "):""));
    }

    for(const ac of accSeen.values()){
      const parts=[];
      if(ac.ef)parts.push(`ef: ${ac.ef}`);
      // Include d excerpt if it adds substance beyond ef
      if(ac.d&&ac.d.trim()){
        const dNorm=ac.d.trim();
        const efNorm=(ac.ef||"").trim().toLowerCase();
        if(!dNorm.toLowerCase().startsWith(efNorm.slice(0,20))){
          parts.push(`detail: ${dNorm.slice(0,110)}${dNorm.length>110?"…":""}`);
        }
      }
      parts.push(`loc: ${ac.loc}`);
      facts.push(`RING/ACC ${ac.n} — ${parts.join(" | ")}`);
    }

    for(const s of spellSeen.values()){
      const parts=[];
      if(s.ef)parts.push(`ef: ${s.ef}`);
      if(s.dmg)parts.push(`dmg: ${s.dmg}`);
      if(s.up&&s.up.trim()&&s.up!=="N/A")parts.push(`scales: ${s.up}`);
      if(s.d&&s.d.trim()){
        parts.push(`note: ${s.d.trim().slice(0,110)}${s.d.trim().length>110?"…":""}`);
      }
      parts.push(`loc: ${s.loc}`);
      facts.push(`SPELL ${s.n} — ${parts.join(" | ")}`);
    }

    return facts;
  };

  const updateKnowledgeCache=(gameKey,gameName,newFacts,patchNote)=>{
    setKnowledgeCache(prev=>{
      const existing=prev[gameKey]||{name:gameName,lastUpdated:null,facts:[],patchNote:null};
      // Deduplicate by normalized item name so the same item from different builds doesn't create many entries.
      // Key format: "WEAPON bloody glory", "RING/ACC bloodbane ring", "Build my build name", etc.
      const itemKey=(f)=>{
        const m=f.match(/^(WEAPON|ARMOR|RING\/ACC|SPELL|PATCH UPDATE|Build)\s+"?([^"—(]+)/i);
        return m?`${m[1].toLowerCase()} ${m[2].trim().toLowerCase().slice(0,40)}`:`${f.slice(0,60).toLowerCase()}`;
      };
      // When a newer fact for the same item arrives, replace the old one so locations get updated
      const factMap=new Map(existing.facts.map(f=>[itemKey(f),f]));
      for(const f of newFacts)factMap.set(itemKey(f),f);
      const merged=[...factMap.values()].slice(-100); // cap at 100 unique items
      return {...prev,[gameKey]:{name:gameName,lastUpdated:Date.now(),facts:merged,patchNote:patchNote||existing.patchNote}};
    });
  };

  // Adds facts to the permanent cache (deduped by first 60 chars of each fact string)
  const addToPermCache=(gameKey,gameName,facts)=>{
    const incoming=Array.isArray(facts)?facts:[facts];
    setPermCache(prev=>{
      const existing=prev[gameKey]||{name:gameName,facts:[]};
      const existingKeys=new Set(existing.facts.map(f=>f.slice(0,60).toLowerCase()));
      const toAdd=incoming.filter(f=>f&&f.trim()&&!existingKeys.has(f.slice(0,60).toLowerCase()));
      if(toAdd.length===0)return prev;
      return{...prev,[gameKey]:{name:gameName,facts:[...existing.facts,...toAdd]}};
    });
  };

  const buildKnowledgeBlock=(gameKey)=>{
    const perm=permCache[gameKey];
    const k=knowledgeCache[gameKey];
    let block="";
    // Perm cache comes first — highest confidence, no caveats
    if(perm&&perm.facts&&perm.facts.length>0){
      block+=`\n\nVERIFIED ITEM DATABASE FOR ${(perm.name||"THIS GAME").toUpperCase()} (confirmed accurate — use freely):\n${perm.facts.slice(-50).join("\n")}\n`;
    }
    // Temp cache second — reference only
    if(k&&k.facts&&k.facts.length>0){
      const factList=k.facts.slice(-30).join("\n");
      const ageHours=k.lastUpdated?Math.round((Date.now()-k.lastUpdated)/3600000):null;
      block+=`\n\nITEMS SEEN IN PAST BUILDS FOR THIS GAME (reference only${ageHours!=null?`, ${ageHours}h ago`:""}):\n${factList}\n${k.patchNote?`Patch context: ${k.patchNote}\n`:""}IMPORTANT: These are items from PREVIOUS builds — do NOT copy them into the current build unless they genuinely suit this specific build concept. Each build must be designed independently. Use web search to discover the best weapons, armor, and rings for THIS build's archetype — do not default to whatever was used before.\n`;
    }
    return block;
  };

  const PROVIDERS={
    claude:{label:"Claude",icon:"🟠",model:"claude-sonnet-4-6",hint:"sk-ant-...",url:"console.anthropic.com",note:"Best structured JSON & reasoning. Web search built-in.",searchCapable:true},
    perplexity:{label:"Perplexity",icon:"🔵",model:"sonar-pro",hint:"pplx-...",url:"perplexity.ai/settings/api",note:"Real-time web search. Best for item locations and current meta.",searchCapable:true},
  };

  // opts: { prov: string (override active provider), rawText: bool (skip JSON parsing, return string) }
  const apiCall=async(prompt,useSearch=true,opts={})=>{
    const tProv=opts.prov||provider;
    const curKey=apiKeys[tProv]||"";
    if(!curKey.trim())throw new Error(`No API key for ${PROVIDERS[tProv]?.label||tProv}. Open Settings.`);
    let body,rawText;

    if(tProv==="claude"){
      body={model:PROVIDERS.claude.model,max_tokens:opts.maxTokens||6000,messages:[{role:"user",content:prompt}]};
      if(useSearch)body.tools=[{type:"web_search_20250305",name:"web_search"}];
      let data;
      if(window.electronAPI){data=await window.electronAPI.callAI("claude",body,curKey);}
      else{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":curKey,"anthropic-version":"2023-06-01"},body:JSON.stringify(body)});data=await r.json();}
      if(data.error)throw new Error(data.error.message||"Claude API error");
      const blocks=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text);
      if(blocks.length===0)throw new Error("No text in Claude response");
      rawText=blocks.join("\n");
    } else {
      // OpenAI-compatible: Perplexity, OpenAI, Gemini, Groq
      const systemMsg=opts.rawText
        ?"You are a game research assistant. Search for and provide accurate, concise, up-to-date information. Be specific with item names, locations, and stats."
        :"You are an expert soulslike build theorycrafter and game database. Your ENTIRE response must be a single valid JSON object — output ONLY the JSON with no markdown code fences, no text before or after, no citation markers, no footnotes. Start immediately with { and end with }.\n\nCRITICAL RULES:\n1. Every item 'n' field MUST be a REAL, SPECIFIC item name that exists in the game — NEVER write '2nd weapon +10', 'another ring', 'upgrade material', 'based on loadout', 'best armor', 'your armor', 'any weapon', 'additional ring', 'second weapon', or ANY other generic placeholder. If a second weapon is needed, name the actual weapon (e.g. 'Bloody Glory', 'Abiding Defender', 'Pieta's Sword').\n2. Every 'loc' field MUST contain a specific zone + landmark, NPC name, boss drop, or chest location. NEVER write 'Exploration', 'Acquired', 'Mid-game', 'Various locations', 'N/A', or 'Based on loadout'.\n3. Use web search to verify item names, locations, and stat requirements before writing them.";
      const urlMap={perplexity:"https://api.perplexity.ai/chat/completions"};
      body={model:PROVIDERS[tProv].model,max_tokens:opts.rawText?1000:(opts.maxTokens||6000),messages:[{role:"system",content:systemMsg},{role:"user",content:prompt}]};
      // Perplexity: disable inline citations (they corrupt JSON) and boost search context
      if(tProv==="perplexity"&&!opts.rawText){
        body.return_citations=false;
        body.search_recency_filter="month";
        body.web_search_options={search_context_size:"high"};
      }
      let data;
      if(window.electronAPI){data=await window.electronAPI.callAI(tProv,body,curKey);}
      else{const r=await fetch(urlMap[tProv],{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${curKey}`},body:JSON.stringify(body)});data=await r.json();}
      if(data.error)throw new Error(data.error.message||(data.error?.code?"API error: "+data.error.code:"API error"));
      const choice=data.choices?.[0]?.message?.content;
      const finishReason=data.choices?.[0]?.finish_reason||data.choices?.[0]?.finish_message||"";
      if(!choice){
        if(/safety|content_filter/i.test(finishReason))throw new Error(`${PROVIDERS[tProv].label} blocked this request (safety filter). Switch to a different provider.`);
        if(/length/i.test(finishReason))throw new Error(`${PROVIDERS[tProv].label} hit its output token limit. Try Claude for longer builds.`);
        const preview=JSON.stringify(data).slice(0,200);
        throw new Error(`${PROVIDERS[tProv].label} returned no content. Raw: ${preview}`);
      }
      rawText=choice;
      // Flag truncated responses so tryParse knows to attempt recovery
      if(/length/i.test(finishReason))rawText="__TRUNCATED__"+rawText;
    }

    if(opts.rawText)return rawText; // raw text for research steps — skip JSON parsing

    const tryParse=(raw)=>{
      if(!raw)return null;
      const wasTruncated=raw.startsWith("__TRUNCATED__");
      // Strip Perplexity inline citation markers [1], [2,3], etc. — they corrupt JSON if outside strings
      let cleaned=raw.replace(/^__TRUNCATED__/,"").replace(/\[\d+(?:,\s*\d+)*\]/g,"");
      // Prefer content BETWEEN code fences — this excludes Perplexity's trailing citations
      const fenceMatch=cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      let text=fenceMatch?fenceMatch[1].trim():cleaned.replace(/```json|```/g,"").trim();
      // Find start of outermost JSON object OR array
      const sObj=text.indexOf("{"),sArr=text.indexOf("[");
      const s=(sObj===-1)?sArr:(sArr===-1?sObj:Math.min(sObj,sArr));
      if(s===-1)return null;
      text=text.slice(s);
      try{return JSON.parse(text);}catch(_){}
      // Balanced-brace walk with bracket stack — stops at first complete top-level close.
      // Uses a stack to record which brackets are still open, and tracks the last position
      // where a complete element closed at depth ≤ 2 (e.g. a phase in {"ph":[...]}).
      // This correctly handles {"ph":[...]} where phases close at depth 2, not depth 1.
      let stack=[],inStr=false,esc=false,end=-1,lastSafe=null;
      for(let i=0;i<text.length;i++){
        const ch=text[i];
        if(esc){esc=false;continue;}
        if(inStr){if(ch==="\\"){esc=true;}else if(ch==='"'){inStr=false;}continue;}
        if(ch==='"'){inStr=true;continue;}
        if(ch==="{"||ch==="["){stack.push(ch);continue;}
        if(ch==="}"||ch==="]"){
          if(stack.length===0)continue;
          stack.pop();
          if(stack.length===0){end=i;break;}
          // Record recovery point whenever a complete element closes near the top level
          if(stack.length<=2)lastSafe={pos:i,stack:[...stack]};
        }
      }
      if(end!==-1){try{return JSON.parse(text.slice(0,end+1));}catch(_){}}
      // JSON appears truncated (token limit hit) — recover up to last fully-closed element
      if(lastSafe&&lastSafe.pos>0){
        let partial=text.slice(0,lastSafe.pos+1).trimEnd();
        if(partial.endsWith(","))partial=partial.slice(0,-1);
        // Close remaining open brackets from innermost to outermost
        for(const opener of lastSafe.stack.slice().reverse())partial+=opener==="{"?"}":"]";
        try{return JSON.parse(partial);}catch(_){}
      }
      return null;
    };
    const parsed=tryParse(rawText);
    if(parsed)return parsed;
    const wasTruncated=rawText.startsWith("__TRUNCATED__");
    const preview=rawText.replace(/^__TRUNCATED__/,"").slice(0,150);
    if(wasTruncated)throw new Error(`${PROVIDERS[tProv].label} hit its token limit and the JSON was cut off. The partial data could not be recovered. Try Claude, which supports longer outputs.`);
    throw new Error(`Couldn't extract JSON. Preview: "${preview}..."`);
  };

  const handleAddBuild=async()=>{
    if(addMode==="ai"&&!addText.trim()){setAddError("Describe the build you want");return;}
    if(addMode==="semi"){
      const hasStats=Object.values(semiForm.endgameStats).some(v=>{const n=parseInt(v);return !isNaN(n)&&n>0;});
      if(!hasStats){setAddError("Set at least one endgame stat target in Semi-AI mode");return;}
    }
    if(addMode==="manual"&&!manualForm.label.trim()){setAddError("Manual mode needs at least a build name");return;}
    const coreProvKey=selectedProviders[0]||provider;
    if(!(apiKeys[coreProvKey]||"").trim()){setAddError(`No API key for ${PROVIDERS[coreProvKey]?.label||coreProvKey}. Open Settings to add your key.`);return;}
    setAdding(true);setAddError("");
    const useCustomGame=addCustomGameName.trim().length>0;
    const customKey=useCustomGame?"game_"+Date.now():null;
    const gameName=useCustomGame?addCustomGameName.trim():allGames[addTargetGame].name;
    const existingStats=useCustomGame?null:Object.keys(Object.values(allGames[addTargetGame].builds)[0].ph[0].stats);
    const existingStatMax=useCustomGame?99:allGames[addTargetGame].statMax;
    let sampleStats=existingStats||["STAT_KEY_1","STAT_KEY_2","STAT_KEY_3","STAT_KEY_4"];
    let statMax=existingStatMax;
    let statKeysStr=useCustomGame?`use the standard stats for ${gameName} (the common short codes the community uses, e.g. VIG, END, STR, DEX, INT, FTH)`:sampleStats.join(", ");
    let statObjStr=useCustomGame?`"STAT_CODE":N,"STAT_CODE":N`:sampleStats.map(s=>`"${s}":N`).join(",");
    const urlRef=addUrl.trim()?`\n\nPRIMARY REFERENCE URL: ${addUrl.trim()} — you MUST use web search to read this reference and pull accurate item names, locations, and stat recommendations from it.`:"\n\nUse web search to verify item names, locations, and current stat recommendations from reputable wikis (Fextralife, official wikis).";
    let userConstraints;
    if(addMode==="ai"){userConstraints=`USER REQUEST: ${addText}`;}
    else if(addMode==="semi"){
      const statTargets=Object.entries(semiForm.endgameStats).filter(([k,v])=>{const n=parseInt(v);return !isNaN(n)&&n>0;}).map(([k,v])=>`${k}:${v}`).join(", ");
      const cl=[];
      if(semiForm.label.trim())cl.push(`- Build name: ${semiForm.label.trim()}`);
      if(semiForm.playstyle.trim())cl.push(`- Playstyle: ${semiForm.playstyle.trim()}`);
      cl.push(`- ENDGAME stat targets (build MUST reach these by endgame, ±2 points): ${statTargets}`);
      cl.push(`- Total stat point budget is ~${addCustomGameName.trim()?200:(allGames[addTargetGame]?.endgameBudget||200)} (average endgame). Do NOT exceed.`);
      if(semiForm.preferredWeapon.trim())cl.push(`- Preferred main weapon: ${semiForm.preferredWeapon.trim()}`);
      if(semiForm.accent.trim())cl.push(`- Use this accent color: ${semiForm.accent.trim()}`);
      if(semiForm.notes.trim())cl.push(`- Additional notes: ${semiForm.notes.trim()}`);
      userConstraints=`SEMI-AI MODE - USER CONSTRAINTS (you MUST honor these):\n${cl.join("\n")}\n\nBuild the progression so that endgame phase stats match the user targets. Earlier phases should naturally lead toward those stats.`;
    }else{
      const skeleton={label:manualForm.label.trim(),sub:manualForm.sub.trim()||"(generate fitting subtitle)",icon:manualForm.icon.trim()||"⚔️",accent:manualForm.accent||"#e74c3c",cls:manualForm.cls.trim()||"(pick best starting class)",caps:manualForm.caps.trim()||"(determine soft/hard caps)",weaponReq:manualForm.weaponReq.trim()||"(determine from weapons)",playstyle:manualForm.playstyle.trim()||"(write 3-4 sentences describing the playstyle)",user_phases:manualForm.phases.map((ph,i)=>({stage:["Early","Mid","Endgame"][i],stats:Object.fromEntries(Object.entries(ph.stats).filter(([k,v])=>v!==""&&v!=null).map(([k,v])=>[k,parseInt(v)||0])),weapons:(ph.weapons||[]).filter(w=>w.n&&w.n.trim()).map(w=>({n:w.n.trim(),st:w.st?w.st.trim():""})),armor:(ph.armor||[]).filter(ar=>ar.n&&ar.n.trim()).map(ar=>({n:ar.n.trim()})),acc:(ph.acc||[]).filter(ac=>ac.n&&ac.n.trim()).map(ac=>({n:ac.n.trim(),ef:ac.ef?ac.ef.trim():""})),spells:(ph.spells||[]).filter(s=>s.n&&s.n.trim()).map(s=>({n:s.n.trim(),ef:s.ef?s.ef.trim():""}))}))};
      userConstraints=`MANUAL MODE - USER-PROVIDED BUILD SKELETON:\n\nThe user has manually built the core skeleton below. Your job:\n1. PRESERVE all user-provided values exactly as written\n2. FILL IN blank/missing fields: descriptions (d), specific locations (loc), upgrade paths (up), tips, ap, wt, damage box (dmg)\n3. EXPAND the user's 3 stages into the 3 schema phases for Step 1 — distribute items naturally\n4. Generate metadata only if user values are placeholders\n\nUSER SKELETON (JSON):\n${JSON.stringify(skeleton,null,2)}`;
    }

    try{
      const cacheKey=useCustomGame?addCustomGameName.trim().toLowerCase().replace(/\s+/g,"_"):addTargetGame;
      const knowledgeBlock=buildKnowledgeBlock(cacheKey);
      const cacheSize=knowledgeCache[cacheKey]?.facts?.length||0;
      const useSearchStep1=addUrl.trim().length>0||cacheSize<20||useCustomGame;

      // ── Provider routing from user selection ───────────────────────────────
      // selectedProviders is ordered: [0]=Core build, [1]=Continuation, [2]=Variants
      // When multi-AI is OFF, all steps use the same provider as core
      const [provCore=provider, provCont2, provVars2]=selectedProviders;
      const singleProvMode=!multiAI;
      // Step 0 Research: prefer a search-capable provider from the selection;
      // fall back to any search-capable provider not already used for Core.
      const researchProv=
        selectedProviders.find(p=>p!==provCore&&(apiKeys[p]||"").trim()&&PROVIDERS[p]?.searchCapable)
        ||["perplexity"].find(p=>!selectedProviders.includes(p)&&(apiKeys[p]||"").trim()&&PROVIDERS[p]?.searchCapable);
      // Step 2 Continuation: use explicit selection if set, otherwise auto-pick (single-AI mode locks to provCore)
      const contProv=singleProvMode?provCore:(provCont2||(["perplexity","claude"].find(p=>(apiKeys[p]||"").trim())||provCore));
      // Step 3 Variants: same (single-AI mode locks to provCore)
      const variantsProv=singleProvMode?provCore:(provVars2||(["claude","perplexity"].find(p=>(apiKeys[p]||"").trim())||provCore));

      // ── Step 0: Web research — short, targeted, non-fatal ───────────────────
      // Only runs if a search-capable provider is available AND different from main
      // Keeps the main provider's input tokens free for the heavy generation steps
      let researchContext="";
      if(researchProv){
        const rp=PROVIDERS[researchProv];
        setAddStep(`${rp.icon} ${rp.label} — researching current ${gameName} meta...`);
        setGenInfo({prov:researchProv,label:"researching current meta",step:0,total:3});
        try{
          const buildDesc=addMode==="ai"?addText.slice(0,120):addMode==="semi"?(semiForm.playstyle||semiForm.label||"OP build").slice(0,120):manualForm.label.slice(0,120)||"OP build";
          // Keep research prompt short — we only need a targeted summary, not an essay
          const rPrompt=`${gameName} "${buildDesc}" build — search and briefly answer (under 200 words total):
Best weapons with locations? Key stats/soft caps? Recent patches? Top tips?`;
          const rawResearch=await apiCall(rPrompt,true,{prov:researchProv,rawText:true});
          if(rawResearch&&rawResearch.length>50){
            // Cap at 900 chars to limit token injection into Steps 1-2
            researchContext=`\n\n[${rp.label} research: ${rawResearch.slice(0,900)}]`;
          }
        }catch(e){/* non-fatal — continue without research */}
      }

      const step1Label=useSearchStep1?(useCustomGame?`researching ${gameName} + phases 1–3`:"researching + phases 1–3"):`phases 1–3 (${cacheSize} cached facts)`;
      setAddStep(`${PROVIDERS[provCore].icon} ${PROVIDERS[provCore].label} — ${step1Label}...`);
      setGenInfo({prov:provCore,label:step1Label,step:1,total:3});
      const customGameMetaSchema=useCustomGame?`"game_meta":{"icon":"single emoji representing this game","stat_keys":["STAT1","STAT2","STAT3","STAT4","STAT5","STAT6"],"stat_max":99,"notes":"1-2 sentence note on the game's stat system"},\n`:"";
      const p1=`You are an elite ${gameName} theorycrafter with deep knowledge of weapons, stats, item locations, and optimal progression routes. Generate the FIRST HALF of an OP build (metadata + 3 early phases).

CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. No preamble, no commentary, no explanation before or after. No "Here's the build:" or "Based on my research". Start your response with { and end with }. Your output is parsed by code that will fail if there's any non-JSON text.${useCustomGame?`\n\nIMPORTANT: ${gameName} is not yet in the codex. You MUST first determine its stat system via web search, then include a "game_meta" field at the top of your JSON with the correct stat short codes and stat_max.`:""}

SCHEMA (output exactly this structure):
{
${customGameMetaSchema}"label":"Short evocative name (3-5 words)","sub":"Short archetype subtitle","icon":"single thematic emoji","accent":"#hexcolor (distinctive - avoid #d64545, #b370d8, #e8c05a, #e74c3c)","playstyle":"3-4 sentences explaining identity, combat feel, and why this build is strong","cls":"Best starting class for this build","caps":"Relevant stat soft/hard cap info","weaponReq":"Stat requirements for main weapon(s)",
"loadouts":[<loadout1>,<loadout2>,<loadout3>],
"ph":[<phase1>,<phase2>,<phase3>]
}

Each loadout: {"id":"unique_id","label":"Variant Name","weaponWt":"~N","endReq":"N","armor":"best armor description","pros":"benefits","cons":"drawbacks"} (set loadouts to null if build is single-weapon focused with no real variants)

Each phase: {"name":"Phase Name","range":"Lv X-Y","stats":{${statObjStr}},"sn":"1-2 sentence stat priority note","weapons":[{"n":"Weapon","ap":"~N","sc":"A STR / B+ RAD","st":"status","eq":true,"d":"desc","loc":"specific location","up":"upgrade material","tip":"tip"}],"armor":[{"n":"Armor","wt":"~N","eq":true,"d":"desc","loc":"location","up":"N/A","tip":"tip"}],"acc":[{"n":"Ring","ef":"precise effect with numbers","eq":true,"d":"desc","loc":"location","up":"N/A","tip":"tip"}],"spells":[{"n":"Spell","ef":"precise effect with numbers","dmg":"~N damage or N buildup/cast","eq":true,"d":"desc","loc":"where/how learned","up":"scaling stat","tip":"tip"}],"dmg":{"ps":"~N","sp":"status procs","bs":"boss speed","n":"notes"}}

ITEM FIELD REQUIREMENTS — every single item (weapon, armor, ring, spell) must have ALL fields filled with real, specific, non-placeholder data:
- "n": A REAL item name that exists in the game. NEVER write "2nd weapon +10", "another weapon", "second ring", "best armor", "based on loadout", or any generic phrase. If you need a second weapon, name it specifically (e.g. "Abiding Defender", "Bloody Glory"). Use web search if you are unsure of the exact item name.
- "eq": true for recommended/core items. Only use false for explicitly labeled alternatives.
- "d": 1-2 sentences explaining WHY this item is good for THIS specific build (not a generic description).
- "loc": EXACT location — zone name + specific landmark, NPC name, chest location, or boss drop. NEVER write "Exploration", "Acquired", "Mid-game exploration", "Various locations", "Dropped by enemies", or "N/A". If the item is already held from a prior phase, write "Obtained in Phase X — [original zone]." If you are unsure of the exact location, use your search capability to find it.
- "up": exact upgrade material name for weapons (e.g. "Regular Deralium Nuggets — purchase from Gerlinde at Sunless Skein"). "N/A" only for rings/amulets/armor.
- "tip": actionable gameplay tip that tells the player HOW to use this item effectively (not just a description of what it does).
- "ef" (accessories & spells): precise mechanic WITH numbers (e.g. "Bleed when you inflict Poison", "+15% Holy damage to all attacks", "+60 Bleed buildup per hit"). NEVER write vague phrases like "improves status", "boosts damage", or "enhances offense".
- "dmg" (spells only): actual damage output or status buildup per cast/hit (e.g. "~320 Holy per cast", "80 Bleed buildup/swing", "~200 Fire AoE on detonation"). Use real numbers from the game — do NOT write "varies" or "scales with stats" alone.

STARTING GEAR RULE: Phase 1 MAY reference the starting weapon/armor if it is genuinely the best option early. Phases 2+ must feature items ACQUIRED in the world. NEVER list generic starting items that are irrelevant to the build's core synergy. If the starting gear is a placeholder ("use whatever you find"), exclude it — list what the player should be working TOWARD instead.

COMPLETE REFERENCE EXAMPLE (every phase must match this depth and specificity):
{"name":"Key Accessories","range":"Lv 20-30","stats":{"VIT":22,"END":22,"STR":26,"AGI":10,"RAD":12,"INF":12},"sn":"Push STR toward 30. RAD/INF to 12 for future spells.","weapons":[{"n":"Bloody Glory (+3 to +5)","ap":"~550-700","sc":"A STR / B+ RAD","st":"300 Bleed","eq":true,"d":"Significant damage jump at +5 — Bleed accumulation per hit scales with upgrade level, reducing procs from 4-5 swings down to 2-3.","loc":"Obtained in Phase 2 — Pilgrim's Perch, Path of Devotion, corpse near Vestige.","up":"Regular Deralium Nuggets — purchase from Gerlinde after she relocates to Sunless Skein.","tip":"Two-hand for 10% extra damage. Dual-wield comes in Phase 5 once STR reaches 38."}],"armor":[{"n":"Fitzroy's Set","wt":"71.7","eq":true,"d":"Highest poise-to-weight ratio in early game — lets you trade hits with large enemies without staggering.","loc":"Obtained in Phase 2 — Fitzroy's Gorge, climb the tower past the Ruiner, chest at the top.","up":"N/A","tip":"At END 22 you can medium-roll in this set. Keep equip load below 70%."}],"acc":[{"n":"Bloodbane Ring","ef":"Bleed when you inflict Poison","eq":true,"d":"The build's engine — Poison proc triggers Bleed simultaneously, meaning Poison Weapon doubles your status output without extra hits.","loc":"Forsaken Fen — ruined building on the eastern swamp shore, before the Vestige of Blind Agatha.","up":"N/A","tip":"Never unequip. This ring makes Poison Weapon relevant for a Bleed build — without it, you would not need Poison at all."},{"n":"Pendant of Burden","ef":"+Damage per active status effect","eq":true,"d":"Amplifies ALL damage by a % per active status — with Bleed and Poison both active this gives massive burst amplification.","loc":"Forsaken Fen — Umbral realm side, past the bridge near the Vestige of Blind Agatha.","up":"N/A","tip":"Pre-cast both Poison Weapon and Lacerating Weapon before any boss fight so both statuses are always active."}],"spells":[],"dmg":{"ps":"~550-700 + Pendant bonus","sp":"Bleed + Poison bursting","bs":"Fast","n":"Bloodbane + Pendant = massive effective damage spike. Bosses start dying in 30-45 seconds."}}

Generate exactly 3 phases: Phase 1 (Early Game, Lv 1-20, only include starting gear if truly relevant), Phase 2 (Core Weapon, Lv 15-25, acquires the build's signature weapon from a specific world location), Phase 3 (Key Accessories, Lv 20-30, build-defining rings/amulets with exact locations)

RULES:
- Target game: ${gameName}
- Use EXACTLY these stat keys: ${statKeysStr}
- Stat max: ${statMax}
- BE SPECIFIC with locations (name zones, bonfires/vestiges/graces, landmarks)
- For EACH item you include in Phase 2 and Phase 3, web search "${gameName} [item name] location" to verify the exact zone and landmark before writing the "loc" field. Do NOT rely on training data alone for locations.${urlRef}${knowledgeBlock}${researchContext}

${userConstraints}`;
      const step1=await apiCall(p1,useSearchStep1,{prov:provCore,maxTokens:8000});
      if(!step1.label||!step1.ph||!Array.isArray(step1.ph))throw new Error("Invalid build metadata");
      let resolvedStatKeysStr=statKeysStr,resolvedStatObjStr=statObjStr,customGameMeta=null;
      if(useCustomGame){
        customGameMeta=step1.game_meta||{};
        const keys=customGameMeta.stat_keys||Object.keys(step1.ph[0]?.stats||{});
        if(keys.length>0){sampleStats=keys;resolvedStatKeysStr=keys.join(", ");resolvedStatObjStr=keys.map(s=>`"${s}":N`).join(",");statMax=customGameMeta.stat_max||99;}
      }

      setAddStep(`${PROVIDERS[contProv].icon} ${PROVIDERS[contProv].label} — phases 4–7 + NG+ for "${step1.label}"...`);
      setGenInfo({prov:contProv,label:`phases 4–7 + NG+`,step:2,total:3});
      const phase1to3Summary=(step1.ph||[]).map((ph,i)=>`Phase ${i+1} "${ph.name}" (${ph.range}): weapons=${(ph.weapons||[]).map(w=>w.n).join(", ")||"none"}; armor=${(ph.armor||[]).map(a=>a.n).join(", ")||"none"}; acc=${(ph.acc||[]).map(a=>a.n).join(", ")||"none"}; spells=${(ph.spells||[]).map(s=>s.n).join(", ")||"none"}`).join("\n");
      const p2=`You are continuing a "${step1.label}" (${step1.sub}) build guide for ${gameName}. Phases 1-3 have already been written. Generate the LATE progression phases 4-7.

ITEMS ALREADY OBTAINED IN PHASES 1-3 (do NOT re-introduce these as new acquisitions; reference them as "already obtained"):
${phase1to3Summary}

CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single valid JSON object. No preamble, no commentary, no markdown fences, no citations. Start immediately with { and end with }.

SCHEMA: {"ph":[<phase4>,<phase5>,<phase6>,<phase7_ngplus>]}

Phases 4-6 schema: {"name":"Phase Name","range":"Lv X-Y","stats":{${resolvedStatObjStr}},"sn":"stat note","weapons":[{"n":"...","ap":"~N","sc":"A STR / B+ RAD","st":"...","eq":true,"d":"...","loc":"...","up":"...","tip":"..."}],"armor":[{"n":"...","wt":"~N","eq":true,"d":"...","loc":"...","up":"N/A","tip":"..."}],"acc":[{"n":"...","ef":"precise effect with numbers","eq":true,"d":"...","loc":"...","up":"N/A","tip":"..."}],"spells":[{"n":"Spell","ef":"precise effect with numbers","dmg":"~N damage or N buildup/cast","eq":true,"d":"desc","loc":"where/how learned","up":"scaling stat","tip":"tip"}],"dmg":{"ps":"~N","sp":"...","bs":"...","n":"..."}}

ITEM FIELD REQUIREMENTS — every field must contain specific, non-placeholder data:
- "n": A REAL item name from the game. NEVER write "2nd weapon +10", "second ring", "another weapon", "best armor for this build", "upgrade your armor", "based on loadout", or any other generic placeholder. Every item needs a real, searchable name. Use web search to confirm names if needed.
- "d": WHY this item matters for THIS build (not a generic description).
- "loc": EXACT location — zone, NPC/merchant name, boss drop, chest location. If item was obtained in Phases 1-3, write "Obtained in Phase X — [zone]". NEVER write "Acquired", "Exploration", "Mid-game", "Various", or standalone "N/A" for loc.
- "up": exact upgrade material + where to buy/find it for weapons. "N/A" only for non-upgradeable items.
- "tip": actionable HOW-TO advice for using the item in combat.
- "ef" (accessories & spells): precise mechanic WITH numbers (e.g. "Bleed when you inflict Poison", "+15% Holy damage", "+60 Bleed buildup per hit"). NEVER write vague phrases like "improves status" or "boosts damage".
- "dmg" (spells only): actual damage or status buildup per cast/hit (e.g. "~320 Holy per cast", "80 Bleed buildup/swing", "~200 Fire AoE"). Use real numbers — not "varies" or "scales with stats" alone.

COMPLETE REFERENCE EXAMPLE (match this depth for EVERY item in EVERY phase):
{"name":"Unlock Spells","range":"Lv 25-40","stats":{"VIT":25,"END":24,"STR":32,"AGI":10,"RAD":18,"INF":12},"sn":"RAD to 15+ for Lacerating Weapon. Push STR past 30.","weapons":[{"n":"Bloody Glory (+5 to +7)","ap":"~700-850","sc":"A STR / B+ RAD","st":"360 Bleed w/ Lacerating Weapon","eq":true,"d":"Lacerating Weapon adds +60 Bleed on top of the base 300, pushing proc threshold down to 1-2 swings on bosses.","loc":"Obtained in Phase 2 — Pilgrim's Perch, Path of Devotion.","up":"Large Deralium Shards — farm Holy Bulwark enemies at Vestige of Brother Jeremiah, or purchase from Gerlinde.","tip":"Cast Lacerating Weapon before every boss pull without exception — the Bleed boost is that significant."}],"armor":[{"n":"Fitzroy's Set or Sovereign Protector","wt":"71.7 / Heavy","eq":true,"d":"Sovereign Protector gives the best poise if you are two-handing, letting you trade comfortably with mid-tier bosses.","loc":"Fitzroy's Set: Obtained Phase 2. Sovereign Protector: Sunless Skein — chest in the mines area past the first Mendacious Visage.","up":"N/A","tip":"Switch to Sovereign if two-handing. Keep Fitzroy's for the dual-wield setup in Phase 5."}],"acc":[{"n":"Bloodbane Ring","ef":"Bleed when you inflict Poison","eq":true,"d":"Core engine — unchanged from Phase 3. Now amplified by Lacerating Weapon's extra Bleed buildup.","loc":"Obtained in Phase 3 — Forsaken Fen, eastern swamp shore.","up":"N/A","tip":"The spell combo (Lacerating + Poison Weapon) feeds this ring every fight. Never swap it out."},{"n":"Pendant of Burden","ef":"+Damage per active status effect","eq":true,"d":"With three statuses active (Bleed, Poison, and Lacerating's buff), the damage amplification becomes substantial.","loc":"Obtained in Phase 3 — Forsaken Fen Umbral side.","up":"N/A","tip":"Pre-buff both spells before entering any boss arena — the Pendant bonus is only active when statuses are running."},{"n":"Melchior's Ring","ef":"Boosts physical damage output","eq":true,"d":"Bleed makes enemies vulnerable to physical damage — Melchior's Ring doubles down on this by boosting physical output directly.","loc":"Calrath Sewers — lootable from a corpse in the flooded lower section, near the Vestige of Hooded Antuli.","up":"N/A","tip":"Swap for Lucent Sword Ring on bosses that resist physical damage."}],"spells":[{"n":"Lacerating Weapon","ef":"+60 Bleed buildup per hit for 60 seconds","dmg":"+60 Bleed accumulation/swing (raises total to 360 with base BG)","eq":true,"d":"Elevates Bleed buildup from 300 to 360 per hit — at this stage procs occur every 1-2 combos on bosses.","loc":"Radiance spell — purchase from Molhu at the Vestige of Blind Agatha for ~4,500 vigor. Requires 15 RAD.","up":"Scales with RAD stat.","tip":"Cast FIRST before Poison Weapon. The combined pre-buff takes 4 seconds and transforms your damage output."},{"n":"Poison Weapon","ef":"Applies 120 Poison buildup/hit, triggering Bloodbane Ring Bleed","dmg":"120 Poison buildup per swing","eq":true,"d":"Each swing now applies Poison + 360 Bleed — the Bloodbane Ring makes Poison proc a free Bleed proc simultaneously.","loc":"Umbral spell — purchase from Molhu at the Vestige of Blind Agatha for ~3,200 vigor. Requires 12 INF/RAD.","up":"Scales with spell power.","tip":"Always cast second, after Lacerating Weapon. Use Poison Salts as an alternative if out of spell slots."}],"dmg":{"ps":"~700-850 + Pendant amp","sp":"Bleed in 1-2 swings","bs":"Very fast","n":"This phase is where the build becomes truly overpowered. Pre-buffed, most standard enemies die in 3-4 hits."}}

Phase 7 (NG+) SPECIAL structure: {"name":"NG+","range":"NG+1 to NG+7","stats":{${resolvedStatObjStr}},"sn":"NG+ overview","ngCycles":[{"label":"NG+1","stats":{${resolvedStatObjStr}},"notes":"NG+1 priorities"},{"label":"NG+3","stats":{${resolvedStatObjStr}},"notes":"NG+3 priorities"},{"label":"NG+5","stats":{${resolvedStatObjStr}},"notes":"NG+5 priorities"},{"label":"NG+7","stats":{${resolvedStatObjStr}},"notes":"NG+7 max"}],"weapons":[...],"armor":[...],"acc":[...],"spells":[...],"dmg":{"ps":"~N NG+1, ~N NG+7","sp":"...","bs":"...","n":"..."}}

Generate: Phase 4 (Unlock Spells, Lv 25-40), Phase 5 (Mid-to-Late / Dual-Wield, Lv 35-55), Phase 6 (Endgame, Lv 55+), Phase 7 (NG+, with ngCycles)

RULES: Stats approach/hit soft caps in endgame, hard caps (${statMax}) in NG+7. Each NG+ cycle adds ~5-10 levels per stat. Use exact stat keys: ${resolvedStatKeysStr}. For any NEW items introduced in phases 4-6 that were not in phases 1-3, web search "${gameName} [item name] location" to verify the exact zone and landmark before writing the "loc" field.${urlRef}${knowledgeBlock}${researchContext}

Build: "${step1.label}" (${step1.sub}) - ${step1.playstyle}`;
      const step2=await apiCall(p2,false,{prov:contProv,maxTokens:7000});

      // ── Step 3: Perplexity fact-check — always runs if a Perplexity key is present,
      // regardless of which AI generated the build. Verifies item types, existence, and
      // locations via web search and removes/corrects errors before saving.
      let verifiedStep1Ph=[...(step1.ph||[])];
      let verifiedStep2Ph=[...(step2.ph||[])];
      if((apiKeys.perplexity||"").trim()){
        setAddStep("🔵 Perplexity — fact-checking item types & locations...");
        setGenInfo({prov:"perplexity",label:"verifying items via web search",step:2,total:4});
        try{
          // Collect every unique item across all 7 phases
          const seen=new Set();
          const itemList=[];
          [...verifiedStep1Ph,...verifiedStep2Ph].forEach(ph=>{
            const cats=[["weapon",ph.weapons],["armor",ph.armor],["ring/acc",ph.acc],["spell",ph.spells]];
            cats.forEach(([cat,arr])=>{
              (arr||[]).forEach(it=>{
                if(!it.n||it.n.length<3)return;
                const key=it.n.toLowerCase();
                if(seen.has(key))return;
                seen.add(key);
                itemList.push(`${cat} | "${it.n}" | ${it.loc||"unknown"}`);
              });
            });
          });
          if(itemList.length>0){
            const fcPrompt=`You are fact-checking a ${gameName} build guide. Use web search to verify each item listed below.

For each item verify:
1. CORRECT TYPE — is the category right? (e.g. a shield must NEVER be listed as "weapon". A ring must be "ring/acc". Spells must be "spell".)
2. EXISTS IN GAME — does this item actually exist in ${gameName}?
3. CORRECT LOCATION — is the listed location a real, specific place in ${gameName}?

Items to verify (format: claimed_category | "item name" | listed location):
${itemList.join("\n")}

Return ONLY a single JSON object:
{
  "corrections":[
    {"name":"exact item name","issue":"wrong_type","details":"e.g. Pale Eye is a shield/offhand, not a greatsword","fixedLoc":"correct location if known"},
    {"name":"exact item name","issue":"wrong_loc","details":"what is wrong","fixedLoc":"correct specific location — zone + landmark/NPC/chest"}
  ],
  "remove":["name of item that does not exist in ${gameName}"]
}

Only include items with genuine errors. If all items are correct output: {"corrections":[],"remove":[]}`;
            const fc=await apiCall(fcPrompt,true,{prov:"perplexity",maxTokens:3000});
            if(fc&&typeof fc==="object"){
              const wrongType=new Set((fc.corrections||[]).filter(c=>c.issue==="wrong_type").map(c=>c.name.toLowerCase()));
              const removals=new Set((fc.remove||[]).map(n=>n.toLowerCase()));
              const locFixes=Object.fromEntries((fc.corrections||[]).filter(c=>c.fixedLoc&&c.fixedLoc.length>5&&!wrongType.has(c.name.toLowerCase())).map(c=>[c.name.toLowerCase(),c.fixedLoc]));
              const prunePhase=(ph)=>({
                ...ph,
                weapons:(ph.weapons||[]).filter(w=>!wrongType.has(w.n?.toLowerCase())&&!removals.has(w.n?.toLowerCase())).map(w=>locFixes[w.n?.toLowerCase()]?{...w,loc:locFixes[w.n?.toLowerCase()]}:w),
                armor:(ph.armor||[]).filter(a=>!wrongType.has(a.n?.toLowerCase())&&!removals.has(a.n?.toLowerCase())).map(a=>locFixes[a.n?.toLowerCase()]?{...a,loc:locFixes[a.n?.toLowerCase()]}:a),
                acc:(ph.acc||[]).filter(a=>!wrongType.has(a.n?.toLowerCase())&&!removals.has(a.n?.toLowerCase())).map(a=>locFixes[a.n?.toLowerCase()]?{...a,loc:locFixes[a.n?.toLowerCase()]}:a),
                spells:(ph.spells||[]).filter(s=>!wrongType.has(s.n?.toLowerCase())&&!removals.has(s.n?.toLowerCase())).map(s=>locFixes[s.n?.toLowerCase()]?{...s,loc:locFixes[s.n?.toLowerCase()]}:s),
              });
              verifiedStep1Ph=verifiedStep1Ph.map(prunePhase);
              verifiedStep2Ph=verifiedStep2Ph.map(prunePhase);
            }
          }
        }catch(e){/* non-fatal — use unverified data */}
      }

      const vp=PROVIDERS[variantsProv];
      setAddStep(`${vp.icon} ${vp.label} — variants & comparison...`);
      setGenInfo({prov:variantsProv,label:"similar builds + comparison table",step:3,total:4});
      const p3=`You previously generated a full "${step1.label}" (${step1.sub}) build for ${gameName}. Now generate the VARIANTS SECTION.

CRITICAL OUTPUT FORMAT: Single JSON object only. Start with { end with }. No preamble.

SCHEMA: {"sim":[<variant1>,<variant2>],"oth":[<other1>,<other2>],"ref":[<refRow>,<refRow>,<refRow>,<refRow>,<refRow>]}

Each variant in sim/oth: {"label":"Name","sub":"subtitle","icon":"emoji","a":"#hexcolor","cls":"class","why":"1-2 sentences","ph":[{"n":"Early","r":"Lv 1-20","s":{${resolvedStatObjStr}},"w":"weapon","ar":"armor","dm":"damage"},{"n":"Mid","r":"Lv 20-40","s":{${resolvedStatObjStr}},"w":"weapon","ar":"armor","dm":"damage"},{"n":"End","r":"Lv 40+","s":{${resolvedStatObjStr}},"w":"weapon","ar":"armor","dm":"damage"}],"key":[{"i":"Item","d":"brief desc and location"},{"i":"Item","d":"desc"},{"i":"Item","d":"desc"}],"steps":["Step 1","Step 2","Step 3","Step 4","Step 5"]}

Each ref row: {"n":"Build Name","i":"emoji","w":"endgame weapon","ap":"~N damage","st":"status","ar":"endgame armor","s":"short style summary","a":"#hexcolor"}

First ref row MUST be for the main build: {"n":"${step1.label}","i":"${step1.icon}","w":"main endgame weapon","ap":"~N damage","st":"status","ar":"endgame armor","s":"${step1.sub}","a":"${step1.accent}"}

RULES: 2 sim = same archetype but different weapons/approach. 2 oth = completely different playstyles. 5 ref rows total. 3 condensed phases each. 3+ key items with locations. 5+ steps.${urlRef}${knowledgeBlock}

Main build: "${step1.label}" (${step1.sub}) - ${step1.playstyle}`;
      let step3;
      try{step3=await apiCall(p3,false,{prov:variantsProv,maxTokens:4000});}catch(e){step3={sim:[],oth:[],ref:[{n:step1.label,i:step1.icon,w:"—",ap:"—",st:"—",ar:"—",s:step1.sub,a:step1.accent}]};}

      setAddStep("Finalizing build...");
      const {game_meta,...step1Clean}=step1;
      const fullBuild={...step1Clean,ph:[...verifiedStep1Ph,...verifiedStep2Ph],sim:Array.isArray(step3.sim)?step3.sim:[],oth:Array.isArray(step3.oth)?step3.oth:[],ref:(Array.isArray(step3.ref)&&step3.ref.length>0)?step3.ref:[{n:step1.label,i:step1.icon,w:step1.ph[step1.ph.length-1]?.weapons?.[0]?.n||"—",ap:step1.ph[step1.ph.length-1]?.dmg?.ps||"—",st:step1.ph[step1.ph.length-1]?.dmg?.sp||"—",ar:step1.ph[step1.ph.length-1]?.armor?.[0]?.n||"—",s:step1.sub,a:step1.accent}],loadouts:Array.isArray(step1Clean.loadouts)&&step1Clean.loadouts.length>0?step1Clean.loadouts:null};

      const newKey="custom_"+Date.now();
      if(useCustomGame){
        const newGameEntry={name:gameName,icon:customGameMeta?.icon||step1.icon||"🎮",builds:{[newKey]:fullBuild},statMax:statMax,softCaps:{},mats:[],weightInfo:{light:"Lighter = faster roll.",medium:"Balanced encumbrance.",heavy:"Slow roll, heavy armor.",note:"Materials tab will populate as you add more builds."}};
        setDynamicGames(prev=>({...prev,[customKey]:newGameEntry}));
        setGame(customKey);
      }else{
        setDynamicBuilds(prev=>({...prev,[addTargetGame]:{...(prev[addTargetGame]||{}),[newKey]:fullBuild}}));
        setGame(addTargetGame);
      }
      setBuildKey(newKey);setTab("main");setPi(defaultPi(fullBuild));setLo(fullBuild.loadouts?.[0]?.id||"two_hand");
      const newFacts=extractFactsFromBuild(fullBuild);
      const finalCacheKey=useCustomGame?customKey:addTargetGame;
      const finalCacheName=useCustomGame?gameName:games[addTargetGame]?.name||gameName;
      if(newFacts.length>0)updateKnowledgeCache(finalCacheKey,finalCacheName,newFacts,null);
      setShowAdd(false);setAddText("");setAddUrl("");setAddCustomGameName("");setAddStep("");setGenInfo(null);resetForms();
    }catch(e){
      let msg=e.message||"Unknown error";
      if(msg.toLowerCase().includes("stream idle timeout")||msg.toLowerCase().includes("partial response")){
        msg="Response timed out mid-stream. Try a more specific description, use Semi-AI mode, or switch to a different AI provider in Settings.";
      }else if(msg.includes("exceeded_limit")||msg.includes("out_of_credits")||msg.includes("rate_limit")||msg.includes("Rate limit")||msg.includes("insufficient_quota")||msg.includes("credit")||msg.includes("tokens per minute")||msg.includes("requests per minute")){
        const pName=PROVIDERS[provider]?.label||provider;
        const alt=Object.keys(PROVIDERS).filter(p=>p!==provider&&(apiKeys[p]||"").trim()).map(p=>PROVIDERS[p].label);
        msg=`${pName} rate limit hit.${alt.length>0?` Switch to ${alt.join(" or ")} in Settings to continue.`:" Add a Groq (free) or Gemini (free) key in Settings for a fast fallback."}`;
      }else if(msg.length>200){msg=msg.slice(0,200)+"...";}
      else{msg=msg+" Try a different provider in Settings if this keeps happening.";}
      setAddError(msg);setAddStep("");setGenInfo(null);
    }finally{setAdding(false);}
  };

  const getTargetStatKeys=()=>{
    if(addCustomGameName.trim())return ["VIG","MND","END","STR","DEX","INT","FTH","ARC"];
    const tg=allGames[addTargetGame];if(!tg||!tg.builds)return ["STR","DEX","INT","FTH"];
    const fb=Object.values(tg.builds)[0];
    if(!fb||!fb.ph||!fb.ph[0])return ["STR","DEX","INT","FTH"];
    return Object.keys(fb.ph[0].stats);
  };
  const updateManualField=(field,value)=>setManualForm(prev=>({...prev,[field]:value}));
  const updateManualStat=(phaseIdx,key,value)=>{setManualForm(prev=>{const phases=[...prev.phases];phases[phaseIdx]={...phases[phaseIdx],stats:{...phases[phaseIdx].stats,[key]:value}};return {...prev,phases};});};
  const updateManualItem=(phaseIdx,cat,itemIdx,field,value)=>{setManualForm(prev=>{const phases=[...prev.phases];const items=[...(phases[phaseIdx][cat]||[])];items[itemIdx]={...items[itemIdx],[field]:value};phases[phaseIdx]={...phases[phaseIdx],[cat]:items};return {...prev,phases};});};
  const addManualItem=(phaseIdx,cat,blank)=>{setManualForm(prev=>{const phases=[...prev.phases];const items=[...(phases[phaseIdx][cat]||[]),blank];phases[phaseIdx]={...phases[phaseIdx],[cat]:items};return {...prev,phases};});};
  const removeManualItem=(phaseIdx,cat,itemIdx)=>{setManualForm(prev=>{const phases=[...prev.phases];const items=[...(phases[phaseIdx][cat]||[])];items.splice(itemIdx,1);phases[phaseIdx]={...phases[phaseIdx],[cat]:items};return {...prev,phases};});};
  const resetForms=()=>{
    setSemiForm({label:"",playstyle:"",accent:"",endgameStats:{},preferredWeapon:"",notes:""});
    setManualForm({label:"",sub:"",icon:"⚔️",accent:"#e74c3c",cls:"",caps:"",weaponReq:"",playstyle:"",phases:[{stats:{},weapons:[{n:"",st:""}],armor:[{n:""}],acc:[{n:"",ef:""}],spells:[]},{stats:{},weapons:[{n:"",st:""}],armor:[{n:""}],acc:[{n:"",ef:""}],spells:[]},{stats:{},weapons:[{n:"",st:""}],armor:[{n:""}],acc:[{n:"",ef:""}],spells:[]}]});
    setManualPhase(0);
  };

  const handleExport=()=>{
    try{
      const payload={version:1,exportedAt:new Date().toISOString(),dynamicBuilds,dynamicGames,hiddenStaticBuilds,knowledgeCache,currentGame:game,currentBuild:buildKey};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");link.href=url;link.download=`codex_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);link.click();document.body.removeChild(link);URL.revokeObjectURL(url);
      setUpdateMsg("✓ Codex exported");setTimeout(()=>setUpdateMsg(""),4000);
    }catch(e){setUpdateMsg("✗ Export failed: "+(e.message||"unknown"));setTimeout(()=>setUpdateMsg(""),5000);}
  };

  const handleImport=(event)=>{
    const file=event.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const data=JSON.parse(e.target.result);
        if(!data||typeof data!=="object")throw new Error("Invalid file format");
        let restored=0;
        if(data.dynamicBuilds&&typeof data.dynamicBuilds==="object"){setDynamicBuilds(data.dynamicBuilds);restored++;}
        if(data.dynamicGames&&typeof data.dynamicGames==="object"){setDynamicGames(data.dynamicGames);restored++;}
        if(Array.isArray(data.hiddenStaticBuilds)){setHiddenStaticBuilds(data.hiddenStaticBuilds);restored++;}
        if(data.knowledgeCache&&typeof data.knowledgeCache==="object"){setKnowledgeCache(data.knowledgeCache);restored++;}
        if(data.currentGame)setGame(data.currentGame);
        if(data.currentBuild)setBuildKey(data.currentBuild);
        if(restored===0)throw new Error("No recognizable codex data in file");
        setUpdateMsg(`✓ Codex restored from ${file.name}`);setTimeout(()=>setUpdateMsg(""),5000);
      }catch(err){setUpdateMsg("✗ Import failed: "+(err.message||"unknown"));setTimeout(()=>setUpdateMsg(""),5000);}
    };
    reader.readAsText(file);event.target.value="";
  };

  const handleUpdateGame=async()=>{
    const cacheKey=safeGame;const gameName=G.name;
    setUpdating(true);setUpdateMsg("Checking latest patch notes...");
    // Build a priority list of providers that have a key, preferring search-capable ones.
    const providerPriority=["perplexity","claude"]
      .filter(p=>PROVIDERS[p]&&(apiKeys[p]||"").trim());
    if(providerPriority.length===0){setUpdateMsg("✗ No API key configured. Open Settings.");setTimeout(()=>setUpdateMsg(""),5000);setUpdating(false);return;}
    const isRateLimitError=(msg)=>/exceeded_limit|out_of_credits|rate.?limit|insufficient_quota|credit|tokens per minute|requests per minute|overloaded|unavailable|529|529/i.test(msg);
    let lastError="Unknown error";
    for(const prov of providerPriority){
      try{
        const pName=PROVIDERS[prov].label;
        setUpdateMsg(`${PROVIDERS[prov].icon} ${pName} — checking patch notes...`);
        const lastDate=knowledgeCache[cacheKey]?.lastUpdated?new Date(knowledgeCache[cacheKey].lastUpdated).toDateString():"never";
        const prompt=`You are a ${gameName} patch and meta expert. Search the web for the LATEST patch notes, balance changes, and meta updates for ${gameName} that affect builds.\n\nCurrent cached info was last updated: ${lastDate}.\n\nFind: current patch version, recent weapon nerfs/buffs, stat scaling changes, item location changes, new items.\n\nOutput ONLY a single JSON object, no preamble:\n{\n"patchVersion":"current patch version string",\n"summary":"2-3 sentence summary of meta-relevant changes",\n"changes":[{"item":"Item or weapon name","change":"what changed"}],\n"newFacts":["FACT 1: specific verifiable detail","FACT 2: another detail"]\n}\n\nLimit changes to 8, newFacts to 10. Be concise.`;
        const result=await apiCall(prompt,true,{prov});
        if(!result||typeof result!=="object")throw new Error("Invalid update response");
        const patchNote=result.patchVersion?`${result.patchVersion}: ${result.summary||""}`:result.summary||"Updated from web";
        const changeFacts=(result.changes||[]).map(c=>`PATCH UPDATE: ${c.item} — ${c.change}`);
        const extraFacts=Array.isArray(result.newFacts)?result.newFacts:[];
        updateKnowledgeCache(cacheKey,gameName,[...changeFacts,...extraFacts],patchNote);
        const n=changeFacts.length;const v=result.patchVersion?` (${result.patchVersion})`:"";
        const usedFallback=prov!==providerPriority[0];
        setUpdateMsg(`✓ Updated via ${pName}${v} — ${n} change${n!==1?"s":""} cached`);setTimeout(()=>setUpdateMsg(""),usedFallback?7000:5000);
        setUpdating(false);return; // success — stop trying
      }catch(e){
        lastError=e.message||"Unknown error";
        if(!isRateLimitError(lastError))break; // non-rate-limit error — don't retry other providers
        // rate limit / unavailable — try next provider
      }
    }
    // All providers failed
    let msg=isRateLimitError(lastError)?"All providers are rate-limited or unavailable. Try again later.":lastError;
    if(msg.length>180)msg=msg.slice(0,180)+"...";
    setUpdateMsg("✗ "+msg);setTimeout(()=>setUpdateMsg(""),7000);
    setUpdating(false);
  };

  // ── Wiki import ────────────────────────────────────────────────────────────
  // Fetches one or more wiki URLs (one per line), strips HTML, asks an AI to
  // extract item facts per page, then bulk-stores everything into the cache.
  // Auto-follows intra-wiki links for item category/list pages (up to 12 extra).
  const handleWikiImport=async()=>{
    const explicitUrls=wikiUrls.split("\n").map(u=>u.trim()).filter(u=>u.startsWith("http"));
    if(explicitUrls.length===0)return;
    const coreKey=selectedProviders[0]||provider;
    if(!(apiKeys[coreKey]||"").trim()){setUpdateMsg("✗ Add an API key in Settings first.");setTimeout(()=>setUpdateMsg(""),4000);return;}
    setWikiImporting(true);
    const cacheKey=safeGame;
    const gameName=G.name;
    const allLines=[];
    let errors=0;
    // Item-related path keywords — used to filter discovered links worth crawling
    const ITEM_PATH_RE=/\/(weapon|armor|ring|spell|staff|shield|bow|talisman|accessory|catalyst|incantation|sorcery|pyromancy|ash[\-_]of[\-_]war|equip|gear|item)/i;
    const MAX_AUTO_LINKS=12; // extra pages discovered by link-following
    // Mutable queue: starts with explicit URLs, grows as we discover item links
    const urlQueue=[...explicitUrls];
    const explicitSet=new Set(explicitUrls);
    const visited=new Set();
    let autoCount=0;
    // Helper: strip HTML noise and return plain text (shared by import + follow)
    const htmlToText=(rawHtml)=>{
      let w=rawHtml
        .replace(/<script[\s\S]*?<\/script>/gi,"")
        .replace(/<style[\s\S]*?<\/style>/gi,"")
        .replace(/<nav[\s\S]*?<\/nav>/gi," ")
        .replace(/<header[\s\S]*?<\/header>/gi," ")
        .replace(/<footer[\s\S]*?<\/footer>/gi," ");
      const patterns=[
        /id=["']wiki-?content["'][^>]*>([\s\S]{500,})/i,
        /class=["'][^"']*wiki[-_]?content[^"']*["'][^>]*>([\s\S]{500,})/i,
        /<main[^>]*>([\s\S]{500,})<\/main>/i,
        /<article[^>]*>([\s\S]{500,})<\/article>/i,
        /id=["']mw-content-text["'][^>]*>([\s\S]{500,})/i,
      ];
      for(const p of patterns){const m=w.match(p);if(m){w=m[1];break;}}
      return w.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ").replace(/&#\d+;/g," ").replace(/&[a-z]+;/g," ").replace(/\s{2,}/g," ").trim().slice(0,40000);
    };
    // Helper: parse AI fact lines
    const parseFactLines=(raw)=>{
      const lines=(raw||"").split("\n").map(l=>l.trim()).filter(l=>l.length>8&&/^(WEAPON|ARMOR|RING\/ACC|SPELL)\s/i.test(l));
      const flex=(raw||"").split("\n").map(l=>l.trim()).filter(l=>l.length>12&&l.includes("—")&&!lines.includes(l)&&/^(weapon|armor|ring|acc|spell)/i.test(l)).map(l=>{
        const m=l.match(/^(weapon|armor|ring\/?acc?|spell)/i);if(!m)return null;
        const t=m[1].toLowerCase().startsWith("ring")||m[1].toLowerCase().startsWith("acc")?"RING/ACC":m[1].toUpperCase();
        return t+" "+l.replace(/^(weapon|armor|ring\/?acc?|spell)\s*/i,"");
      }).filter(Boolean);
      return[...lines,...flex];
    };
    let qi=0;
    while(qi<urlQueue.length){
      const url=urlQueue[qi++];
      if(visited.has(url)){continue;}
      visited.add(url);
      const isAuto=!explicitSet.has(url);
      const pageNum=visited.size;
      const totalPages=urlQueue.length;
      setUpdateMsg(`📥 Page ${pageNum}/${totalPages}${isAuto?" (auto)":""} — fetching...`);
      try{
        let rawHtml="";
        if(window.electronAPI?.fetchUrl){
          const r=await window.electronAPI.fetchUrl(url);
          if(r.error)throw new Error(r.error);
          rawHtml=r.html||"";
        }else{
          const r=await fetch(url);
          if(!r.ok)throw new Error(`HTTP ${r.status}`);
          rawHtml=await r.text();
        }
        // Discover intra-wiki item links on explicitly-entered pages (not auto pages, to avoid snowball)
        if(explicitSet.has(url)&&autoCount<MAX_AUTO_LINKS){
          try{
            const baseHost=new URL(url).hostname;
            const hrefRe=/href=["']([^"'#][^"']*?)["']/g;
            let m;
            while((m=hrefRe.exec(rawHtml))!==null&&autoCount<MAX_AUTO_LINKS){
              try{
                const abs=new URL(m[1],url).href;
                if(new URL(abs).hostname!==baseHost)continue;
                if(visited.has(abs)||urlQueue.includes(abs))continue;
                if(ITEM_PATH_RE.test(new URL(abs).pathname)){
                  urlQueue.push(abs);
                  autoCount++;
                }
              }catch(_){}
            }
            if(autoCount>0)setUpdateMsg(`📥 Found ${autoCount} item pages — crawling...`);
          }catch(_){}
        }
        const plainText=htmlToText(rawHtml);
        if(plainText.length<50){errors++;setUpdateMsg(`⚠ Page ${pageNum} — no content, skipping`);await new Promise(r=>setTimeout(r,900));continue;}
        setUpdateMsg(`📥 Page ${pageNum}/${urlQueue.length}${isAuto?" (auto)":""} — extracting items...`);
        const prompt=`You are extracting item data from a ${gameName} wiki page to build a reference database. Extract EVERY weapon, armor, ring/accessory, or spell mentioned.\n\nFor each item output one line in this exact format:\nITEM_TYPE Name — effect/description — loc: location (write "loc: unknown" if not on page) — stat: requirement or value\n\nRules:\n- ITEM_TYPE must be: WEAPON, ARMOR, RING/ACC, or SPELL\n- Extract ALL items even if location is not listed — write "loc: unknown" in that case\n- For location: use the most specific text from the page (zone name, boss drop, merchant name, etc.)\n- Include stat requirements, damage values, weight, or any numeric data after "stat:"\n- Skip consumables, key items, lore items\n- Output ONLY the item lines, nothing else\n\nWiki page content:\n${plainText}`;
        const rawFacts=await apiCall(prompt,false,{prov:coreKey,rawText:true,maxTokens:4000});
        allLines.push(...parseFactLines(rawFacts));
      }catch(e){
        errors++;
        setUpdateMsg(`⚠ Page ${pageNum} — ${(e.message||"error").slice(0,80)}, skipping`);
        await new Promise(r=>setTimeout(r,1500));
      }
    }
    // Done — cache everything collected
    if(allLines.length>0){
      updateKnowledgeCache(cacheKey,gameName,allLines,null);
      setWikiUrls("");
      const autoNote=autoCount>0?` + ${autoCount} auto-discovered`:"";
      const skipped=errors>0?` (${errors} skipped)`:"";
      setUpdateMsg(`✓ Cached ${allLines.length} items from ${explicitUrls.length} page${explicitUrls.length!==1?"s":""}${autoNote}${skipped}`);
      setTimeout(()=>setUpdateMsg(""),9000);
    }else{
      setUpdateMsg("✗ No items extracted from any page");setTimeout(()=>setUpdateMsg(""),7000);
    }
    setWikiImporting(false);
  };

  // ── AI Learn ───────────────────────────────────────────────────────────────
  // Uses Perplexity + Claude (or whichever is available) to search the web and
  // gather comprehensive item data for the current game without needing a URL.
  // Splits categories between providers when both are available for breadth.
  const handleLearn=async()=>{
    const gameName=G.name;
    const cacheKey=safeGame;
    const hasPplx=!!(apiKeys.perplexity||"").trim();
    const hasClaude=!!(apiKeys.claude||"").trim();
    if(!hasPplx&&!hasClaude){setUpdateMsg("✗ Add an API key in Settings first.");setTimeout(()=>setUpdateMsg(""),4000);return;}
    setLearning(true);
    const allLines=[];
    // Split categories: weapons+armor via Perplexity (best for current data),
    // rings+spells via Claude — swap if only one is available
    const pA=hasPplx?"perplexity":"claude";
    const pB=hasClaude?"claude":"perplexity";
    const categories=[
      {name:"weapons",type:"WEAPON",prov:pA,
       q:`Search for a complete list of every weapon in ${gameName}. For EACH weapon include: exact in-game name, damage values or AR, scaling stats (e.g. A STR / B DEX), location or how to obtain (zone name, boss drop, merchant name), and any stat requirements.`},
      {name:"armor & sets",type:"ARMOR",prov:pA,
       q:`Search for a complete list of every armor set and piece in ${gameName}. For EACH armor item include: exact name, location or how to obtain, weight, and any notable defense values.`},
      {name:"rings & accessories",type:"RING/ACC",prov:pB,
       q:`Search for a complete list of every ring and accessory in ${gameName}. For EACH ring/accessory include: exact name, precise effect with numbers (e.g. +15% damage, +60 buildup), and exact location or how to obtain.`},
      {name:"spells & incantations",type:"SPELL",prov:pB,
       q:`Search for a complete list of every spell, incantation, sorcery, or pyromancy in ${gameName}. For EACH spell include: exact name, precise effect with numbers, damage per cast, stat requirements, and where to learn it (NPC name, location).`},
    ];
    const parseLines=(raw)=>{
      if(!raw)return[];
      const lines=(raw).split("\n").map(l=>l.trim()).filter(l=>l.length>8&&/^(WEAPON|ARMOR|RING\/ACC|SPELL)\s/i.test(l));
      const flex=(raw).split("\n").map(l=>l.trim()).filter(l=>l.length>12&&l.includes("—")&&!lines.includes(l)&&/^(weapon|armor|ring|acc|spell)/i.test(l)).map(l=>{
        const m=l.match(/^(weapon|armor|ring\/?acc?|spell)/i);if(!m)return null;
        const t=m[1].toLowerCase().startsWith("ring")||m[1].toLowerCase().startsWith("acc")?"RING/ACC":m[1].toUpperCase();
        return t+" "+l.replace(/^(weapon|armor|ring\/?acc?|spell)\s*/i,"");
      }).filter(Boolean);
      return[...lines,...flex];
    };
    for(let i=0;i<categories.length;i++){
      const cat=categories[i];
      const icon=PROVIDERS[cat.prov]?.icon||"🔍";
      setUpdateMsg(`${icon} Learning ${cat.name} (${i+1}/${categories.length})...`);
      try{
        const prompt=`${cat.q}

For each item output one line in this exact format:
${cat.type} Name — description/effect with numbers — loc: exact location or how to obtain — stat: requirements and key values

Rules:
- List EVERY ${cat.name} in ${gameName} — be comprehensive, don't skip rare or optional items
- Use specific in-game names only — no generic placeholders
- loc: must be specific: zone name, boss name, NPC/merchant name, or chest description
- stat: include damage, weight, scaling grades, or buildup numbers
- Output ONLY the item lines in the exact format above — no intro, no markdown, no commentary`;
        const raw=await apiCall(prompt,true,{prov:cat.prov,rawText:true,maxTokens:4000});
        const parsed=parseLines(raw);
        allLines.push(...parsed);
      }catch(e){/* non-fatal — skip category */}
    }
    if(allLines.length>0){
      updateKnowledgeCache(cacheKey,gameName,allLines,null);
      setUpdateMsg(`✓ Learned ${allLines.length} items for ${gameName}`);
      setTimeout(()=>setUpdateMsg(""),9000);
    }else{
      setUpdateMsg("✗ No items found — check API keys or try a more specific game name.");
      setTimeout(()=>setUpdateMsg(""),6000);
    }
    setLearning(false);
  };

  const tabs=[
    {id:"main",l:"Your Build",s:B.label,icon:"🎯"},
    {id:"mats",l:"Materials",s:"Upgrades & Weight",icon:"⬆"},
    {id:"sim",l:"Similar",s:"Variants",icon:"🔗"},
    {id:"oth",l:"Other OP",s:"Different Playstyles",icon:"💀"},
    {id:"ref",l:"Quick Ref",s:"Compare All",icon:"📊"}
  ];

  return (
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:C.bg,color:C.text,height:"100vh",display:"flex",overflow:"hidden"}}>

      {/* SETTINGS MODAL */}
      {showSettings&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#000000ee",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={()=>Object.values(apiKeys).some(v=>v.trim())&&setShowSettings(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.gold}66`,borderLeft:`4px solid ${C.gold}`,borderRadius:10,padding:24,maxWidth:500,width:"100%",boxShadow:"0 20px 60px #000",maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:C.bright,fontWeight:800,marginBottom:4}}>⚙ Settings — AI Provider</div>
          <div style={{fontSize:".76rem",color:C.dim,marginBottom:16,lineHeight:1.5}}>Keys are stored locally and sent only to the provider's API. Configure multiple providers and switch between them when one hits a rate limit.</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:".64rem",color:C.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8,fontWeight:700}}>Active Provider</div>
          <div style={{display:"flex",gap:6,marginBottom:18}}>
            {Object.entries(PROVIDERS).map(([key,p])=>{const isA=provider===key;return(<button key={key} onClick={()=>{setProvider(key);try{localStorage.setItem("codex_provider",key);}catch(_){}}} style={{flex:1,background:isA?`${C.gold}22`:"transparent",border:`1px solid ${isA?C.gold+"88":"#ffffff18"}`,borderRadius:6,padding:"8px 6px",cursor:"pointer",textAlign:"center",transition:"all .2s"}}><div style={{fontSize:"1.1rem",marginBottom:2}}>{p.icon}</div><div style={{fontFamily:"'Cinzel',serif",fontSize:".65rem",color:isA?C.bright:C.dim,fontWeight:700}}>{p.label}</div>{isA&&<div style={{fontSize:".5rem",color:C.gold,marginTop:1}}>● active</div>}</button>);})}</div>
          {Object.entries(PROVIDERS).map(([key,p])=>{const hasSaved=(apiKeys[key]||"").trim();return(<div key={key} style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}><label style={{fontSize:".68rem",color:hasSaved?C.text:C.dim,fontFamily:"'Cinzel',serif",letterSpacing:".07em",fontWeight:700}}>{p.icon} {p.label.toUpperCase()} KEY{hasSaved?" ✓":""}</label><span style={{fontSize:".58rem",color:C.dim,maxWidth:180,textAlign:"right",lineHeight:1.3}}>{p.note}</span></div><input value={settingsDraft[key]||""} onChange={e=>setSettingsDraft(prev=>({...prev,[key]:e.target.value}))} placeholder={hasSaved?"(saved — paste to replace)":p.hint} type="password" style={{width:"100%",background:"#ffffff08",border:`1px solid ${hasSaved?C.gold+"55":C.gold+"22"}`,borderRadius:6,padding:"9px 12px",color:C.bright,fontSize:".84rem",outline:"none",boxSizing:"border-box"}}/><div style={{fontSize:".58rem",color:"#ffffff33",marginTop:3}}>Get key → {p.url}</div></div>);})}
          <div style={{display:"flex",gap:8,marginTop:6}}>
            {Object.values(apiKeys).some(v=>v.trim())&&<button onClick={()=>setShowSettings(false)} style={{flex:1,background:"transparent",border:"1px solid #ffffff22",borderRadius:6,padding:"10px",cursor:"pointer",color:C.dim,fontFamily:"'Cinzel',serif",fontSize:".76rem",fontWeight:700}}>Cancel</button>}
            <button onClick={()=>{const merged={...apiKeys};Object.entries(settingsDraft).forEach(([k,v])=>{if(v.trim())merged[k]=v.trim();});setApiKeys(merged);try{localStorage.setItem("codex_apikeys",JSON.stringify(merged));localStorage.setItem("codex_provider",provider);}catch(_){}setSettingsDraft({claude:"",perplexity:"",openai:"",gemini:"",groq:""});setShowSettings(false);}} style={{flex:2,background:C.gold,border:"none",borderRadius:6,padding:"10px",cursor:"pointer",color:"#000",fontFamily:"'Cinzel',serif",fontSize:".76rem",fontWeight:800}}>Save Settings</button>
          </div>
          {!Object.values(apiKeys).some(v=>v.trim())&&<div style={{marginTop:10,fontSize:".7rem",color:C.fire,fontStyle:"italic",textAlign:"center"}}>Add at least one API key to generate builds.</div>}
        </div>
      </div>}

      {/* CONFIRM DELETE MODAL */}
      {confirmDelete&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#000000dd",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={()=>setConfirmDelete(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:"1px solid #e74c3c66",borderLeft:"4px solid #e74c3c",borderRadius:10,padding:22,maxWidth:420,width:"100%",boxShadow:"0 20px 60px #000"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.05rem",color:C.bright,fontWeight:800,marginBottom:8}}>✕ Delete Build</div>
          <div style={{fontSize:".82rem",color:C.text,marginBottom:6,lineHeight:1.5}}>Delete <span style={{color:"#ff8a7a",fontWeight:700}}>{B.label}</span>?</div>
          <div style={{fontSize:".72rem",color:C.dim,marginBottom:16,lineHeight:1.5}}>This will remove it from the selector. You can restore it later with the ↺ Reset button.</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setConfirmDelete(false)} style={{flex:1,background:"transparent",border:"1px solid #ffffff22",borderRadius:6,padding:"10px",cursor:"pointer",color:C.dim,fontFamily:"'Cinzel',serif",fontSize:".76rem",fontWeight:700}}>Cancel</button>
            <button onClick={doDeleteBuild} style={{flex:1,background:"#e74c3c",border:"none",borderRadius:6,padding:"10px",cursor:"pointer",color:"#fff",fontFamily:"'Cinzel',serif",fontSize:".76rem",fontWeight:700}}>✕ Delete</button>
          </div>
        </div>
      </div>}

      {/* CONFIRM RESET MODAL */}
      {confirmReset&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#000000dd",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={()=>setConfirmReset(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${a}66`,borderLeft:`4px solid ${a}`,borderRadius:10,padding:22,maxWidth:420,width:"100%",boxShadow:"0 20px 60px #000"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.05rem",color:C.bright,fontWeight:800,marginBottom:8}}>↺ Reset Codex</div>
          <div style={{fontSize:".78rem",color:C.text,marginBottom:16,lineHeight:1.5}}>Restore all deleted builds and remove all AI-generated builds and games. This cannot be undone.</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setConfirmReset(false)} style={{flex:1,background:"transparent",border:"1px solid #ffffff22",borderRadius:6,padding:"10px",cursor:"pointer",color:C.dim,fontFamily:"'Cinzel',serif",fontSize:".76rem",fontWeight:700}}>Cancel</button>
            <button onClick={doRestoreAll} style={{flex:1,background:a,border:"none",borderRadius:6,padding:"10px",cursor:"pointer",color:"#fff",fontFamily:"'Cinzel',serif",fontSize:".76rem",fontWeight:700}}>↺ Reset</button>
          </div>
        </div>
      </div>}

      {/* ADD BUILD MODAL */}
      {showAdd&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#000000dd",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={()=>!adding&&setShowAdd(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${a}66`,borderLeft:`4px solid ${a}`,borderRadius:10,padding:22,maxWidth:620,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px #000"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:C.bright,fontWeight:800,marginBottom:4}}>✦ Request New Build</div>
          <div style={{fontSize:".74rem",color:C.dim,marginBottom:14,lineHeight:1.5}}>Choose a mode below. Full AI does everything from a description. Semi-AI lets you set endgame stat targets. Manual lets you build the skeleton yourself with AI filling in details.</div>
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            {[{id:"ai",l:"✦ Full AI",d:"Just describe it"},{id:"semi",l:"◐ Semi-AI",d:"Set targets, AI fills"},{id:"manual",l:"✎ Manual",d:"Build it yourself"}].map(m=>{const isA=addMode===m.id;return(<button key={m.id} onClick={()=>{setAddMode(m.id);setAddError("");}} disabled={adding} style={{flex:1,background:isA?`${a}22`:"transparent",border:`1px solid ${isA?a:"#ffffff14"}`,borderRadius:6,padding:"10px 8px",cursor:adding?"not-allowed":"pointer",textAlign:"center",opacity:adding?0.5:1,transition:"all .2s"}}><div style={{fontFamily:"'Cinzel',serif",fontSize:".75rem",color:isA?C.bright:C.dim,fontWeight:700}}>{m.l}</div><div style={{fontSize:".58rem",color:isA?a:"#555",marginTop:2}}>{m.d}</div></button>);})}
          </div>
          {/* MULTI-PROVIDER SELECTOR */}
          <div style={{background:"#ffffff05",border:"1px solid #ffffff0d",borderRadius:8,padding:"10px 12px",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:".6rem",color:C.dim,fontFamily:"'Cinzel',serif",fontWeight:700,letterSpacing:".08em"}}>AI PROVIDERS</span>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                {multiAI&&<span style={{fontSize:".56rem",color:C.dim,fontStyle:"italic"}}>Click to add · order = which step each handles</span>}
                {/* Multi-AI toggle */}
                <button onClick={()=>setMultiAI(v=>!v)} disabled={adding}
                  title={multiAI?"Multi-AI: each step uses a different provider":"Single-AI: one provider handles all steps"}
                  style={{display:"flex",alignItems:"center",gap:5,background:"none",border:`1px solid ${multiAI?a+"55":"#ffffff1a"}`,borderRadius:20,padding:"2px 8px",cursor:adding?"not-allowed":"pointer",opacity:adding?0.5:1,transition:"all .2s"}}>
                  <span style={{fontSize:".55rem",color:multiAI?a:C.dim,fontWeight:700,fontFamily:"'Cinzel',serif",letterSpacing:".05em",whiteSpace:"nowrap"}}>
                    {multiAI?"MULTI-AI":"SINGLE-AI"}
                  </span>
                  <div style={{width:22,height:12,background:multiAI?`${a}44`:"#ffffff12",borderRadius:6,position:"relative",transition:"background .2s"}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:multiAI?a:"#555",position:"absolute",top:1,left:multiAI?10:1,transition:"all .2s"}}/>
                  </div>
                </button>
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,opacity:multiAI?1:0.45,pointerEvents:multiAI?"auto":"none"}}>
              {Object.entries(PROVIDERS).map(([key,p])=>{
                const idx=selectedProviders.indexOf(key);
                const isSelected=idx!==-1;
                const hasKey=!!(apiKeys[key]||"").trim();
                const stepLabels=["① Core","② Cont.","③ Vars."];
                const stepColors=[a,C.cyan,C.purple];
                return(
                  <button key={key} onClick={()=>!adding&&toggleModalProv(key)} disabled={adding||!hasKey}
                    title={hasKey?(isSelected?`Remove ${p.label} from step ${idx+1}`:`Add ${p.label} — step ${selectedProviders.length+1}`):`${p.label} — add API key in Settings`}
                    style={{display:"flex",alignItems:"center",gap:5,position:"relative",
                      background:isSelected?`${stepColors[idx]||C.gold}18`:"#ffffff07",
                      border:`1px solid ${isSelected?`${stepColors[idx]||C.gold}66`:"#ffffff12"}`,
                      borderRadius:7,padding:"6px 10px",
                      cursor:adding||!hasKey?"not-allowed":"pointer",
                      opacity:hasKey?1:0.38,
                      boxShadow:isSelected?`0 0 8px ${stepColors[idx]||C.gold}22`:"none"}}>
                    {isSelected&&<div style={{
                      position:"absolute",top:-6,left:-6,width:15,height:15,borderRadius:"50%",
                      background:stepColors[idx]||C.gold,color:"#000",fontSize:".52rem",
                      fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",
                      fontFamily:"'Cinzel',serif",boxShadow:`0 0 4px ${stepColors[idx]||C.gold}`
                    }}>{idx+1}</div>}
                    <span style={{fontSize:".9rem"}}>{p.icon}</span>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:".63rem",color:isSelected?C.bright:C.dim,fontWeight:700}}>{p.label}</div>
                      {isSelected
                        ?<div style={{fontSize:".5rem",color:stepColors[idx]||C.gold,fontWeight:700,marginTop:1}}>{stepLabels[idx]}</div>
                        :<div style={{fontSize:".5rem",color:"#444",marginTop:1}}>+ add</div>}
                    </div>
                    {!hasKey&&<span style={{fontSize:".5rem",color:C.fire,marginLeft:2}}>!</span>}
                  </button>
                );
              })}
            </div>
            {!multiAI&&(()=>{const p=PROVIDERS[selectedProviders[0]||provider];return p?(<div style={{marginTop:7,fontSize:".58rem",color:C.dim}}><span style={{color:a,fontWeight:700}}>{p.icon} {p.label}</span> handles <span style={{color:C.text}}>all steps</span> — turn on Multi-AI to split across providers</div>):null;})()}
            {multiAI&&selectedProviders.length>1&&<div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
              {selectedProviders.map((key,i)=>{
                const p=PROVIDERS[key];const stepColors=[a,C.cyan,C.purple];
                const stepDesc=["Core Build (phases 1–3, metadata)","Continuation (phases 4–7, NG+)","Variants (similar builds, ref table)"];
                return(<div key={key} style={{display:"flex",alignItems:"center",gap:4,fontSize:".58rem",color:C.dim}}>
                  <span style={{color:stepColors[i],fontWeight:700}}>{p.icon} {p.label}</span>
                  <span>→ {stepDesc[i]}</span>
                </div>);
              })}
            </div>}
          </div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:a,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Target Game</div>
          <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            {Object.entries(allGames).map(([k,g])=>{const isA=addTargetGame===k&&!addCustomGameName.trim();return(<button key={k} onClick={()=>{setAddTargetGame(k);setAddCustomGameName("");}} disabled={adding} style={{flex:"1 1 140px",background:isA?C.cardHi:"transparent",border:`1px solid ${isA?a+"66":"#ffffff14"}`,borderRadius:5,padding:"8px",cursor:adding?"not-allowed":"pointer",textAlign:"center",opacity:adding?0.5:1}}><span style={{fontSize:"1.1rem",marginRight:5}}>{g.icon}</span><span style={{fontFamily:"'Cinzel',serif",fontSize:".72rem",color:isA?C.bright:C.dim,fontWeight:700}}>{g.name}</span></button>);})}
          </div>
          <input type="text" value={addCustomGameName} onChange={e=>setAddCustomGameName(e.target.value)} disabled={adding} placeholder="…or type a new game name (e.g. 'Elden Ring', 'Bloodborne', 'Dark Souls 3')" style={{width:"100%",background:C.bg,border:`1px solid ${addCustomGameName.trim()?a:a+"44"}`,borderRadius:6,padding:"10px 12px",color:C.bright,fontSize:".8rem",outline:"none",boxSizing:"border-box",marginBottom:14}}/>

          {addMode==="ai"&&<>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:a,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Build Request</div>
            <textarea value={addText} onChange={e=>setAddText(e.target.value)} disabled={adding} placeholder="e.g. 'Holy paladin tank with greatsword' or 'Fast dex dual-dagger bleed build' or 'Pyromancer with fire spells and melee support'" style={{width:"100%",minHeight:80,background:C.bg,border:`1px solid ${a}44`,borderRadius:6,padding:"10px 12px",color:C.bright,fontSize:".85rem",lineHeight:1.5,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
          </>}

          {addMode==="semi"&&<>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:a,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Build Name <span style={{color:C.dim,fontSize:".6rem",textTransform:"none",fontWeight:400}}>— optional</span></div>
            <input type="text" value={semiForm.label} onChange={e=>setSemiForm({...semiForm,label:e.target.value})} disabled={adding} placeholder="e.g. Crimson Vanguard" style={{width:"100%",background:C.bg,border:`1px solid ${a}44`,borderRadius:6,padding:"10px 12px",color:C.bright,fontSize:".8rem",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:a,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Playstyle <span style={{color:C.dim,fontSize:".6rem",textTransform:"none",fontWeight:400}}>— optional</span></div>
            <textarea value={semiForm.playstyle} onChange={e=>setSemiForm({...semiForm,playstyle:e.target.value})} disabled={adding} placeholder="e.g. heavy hitter that procs bleed, fast dual-wield assassin" style={{width:"100%",minHeight:55,background:C.bg,border:`1px solid ${a}44`,borderRadius:6,padding:"10px 12px",color:C.bright,fontSize:".8rem",lineHeight:1.5,resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
            {(()=>{
              const statKeys=getTargetStatKeys();
              const tg=addCustomGameName.trim()?null:allGames[addTargetGame];
              const budget=tg?.endgameBudget||200;const maxStat=tg?.statMax||99;
              const used=statKeys.reduce((sum,k)=>sum+(parseInt(semiForm.endgameStats[k])||0),0);
              const remaining=budget-used;const pct=Math.min(100,Math.round((used/budget)*100));const overBudget=remaining<0;
              const changeStat=(k,delta)=>{const cur=parseInt(semiForm.endgameStats[k])||0;let next=cur+delta;if(delta>0)next=Math.min(next,cur+remaining,maxStat);next=Math.max(0,Math.min(maxStat,next));setSemiForm(prev=>({...prev,endgameStats:{...prev.endgameStats,[k]:next>0?String(next):""}}));};
              return(<>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:a,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Endgame Stat Targets <span style={{color:"#ff9a8b",fontSize:".6rem",textTransform:"none",fontWeight:400}}>— required</span></div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:6,marginBottom:10}}>
                  {statKeys.map(k=>{const val=parseInt(semiForm.endgameStats[k])||0;const softCap=tg?.softCaps?.[k];const atSoft=softCap&&val>=softCap;return(<div key={k} style={{display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{fontSize:".58rem",color:atSoft?a:C.dim,letterSpacing:".06em",fontWeight:700,marginBottom:3}}>{k}{atSoft?" ✓":""}</div><div style={{display:"flex",alignItems:"center",gap:2}}><button onClick={()=>changeStat(k,-5)} disabled={adding||val<=0} style={{background:"transparent",border:`1px solid ${a}44`,borderRadius:4,width:22,height:26,cursor:adding||val<=0?"not-allowed":"pointer",color:val<=0?C.dim:a,fontWeight:700,fontSize:".7rem"}}>−</button><div style={{width:36,textAlign:"center",fontSize:".88rem",color:val>0?C.bright:C.dim,fontWeight:700}}>{val||"–"}</div><button onClick={()=>changeStat(k,5)} disabled={adding||remaining<=0||val>=maxStat} style={{background:"transparent",border:`1px solid ${a}44`,borderRadius:4,width:22,height:26,cursor:adding||remaining<=0||val>=maxStat?"not-allowed":"pointer",color:remaining<=0||val>=maxStat?C.dim:a,fontWeight:700,fontSize:".7rem"}}>+</button></div></div>);})}
                </div>
                <div style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:".62rem",fontWeight:600}}><span style={{color:overBudget?"#ff6b6b":C.dim}}>Points used: <span style={{color:overBudget?"#ff6b6b":C.text}}>{used}</span> / {budget}</span><span style={{color:remaining<=0?(overBudget?"#ff6b6b":"#7ddb8a"):C.dim}}>{remaining>0?`${remaining} remaining`:remaining===0?"Budget filled!":"Over budget!"}</span></div><div style={{height:6,background:"#ffffff0d",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:overBudget?"#e74c3c":pct>85?a:"#7ddb8a",borderRadius:3,transition:"width .2s"}}/></div></div>
              </>);
            })()}
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:a,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Preferred Weapon <span style={{color:C.dim,fontSize:".6rem",textTransform:"none",fontWeight:400}}>— optional</span></div>
            <input type="text" value={semiForm.preferredWeapon} onChange={e=>setSemiForm({...semiForm,preferredWeapon:e.target.value})} disabled={adding} placeholder="e.g. Bloody Glory, Uchigatana, Rivers of Blood" style={{width:"100%",background:C.bg,border:`1px solid ${a}44`,borderRadius:6,padding:"10px 12px",color:C.bright,fontSize:".8rem",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:a,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Additional Notes <span style={{color:C.dim,fontSize:".6rem",textTransform:"none",fontWeight:400}}>— optional</span></div>
            <textarea value={semiForm.notes} onChange={e=>setSemiForm({...semiForm,notes:e.target.value})} disabled={adding} placeholder="e.g. 'no spells', 'must use shield', 'PvE focused'" style={{width:"100%",minHeight:50,background:C.bg,border:`1px solid ${a}44`,borderRadius:6,padding:"10px 12px",color:C.bright,fontSize:".8rem",lineHeight:1.5,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
          </>}

          {addMode==="manual"&&<>
            <div style={{padding:"8px 11px",background:`${a}11`,border:`1px solid ${a}33`,borderLeft:`3px solid ${a}`,borderRadius:5,fontSize:".7rem",color:C.text,marginBottom:14,lineHeight:1.5}}>You define the build skeleton (name, playstyle, items, stats per stage). AI fills in: damage estimates, item locations, upgrade paths, descriptions, NG+ phase, similar builds, and other OP variants.</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:a,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Build Metadata</div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:6,marginBottom:6}}>
              <input type="text" value={manualForm.label} onChange={e=>updateManualField("label",e.target.value)} disabled={adding} placeholder="Build Name *" style={{background:C.bg,border:`1px solid ${manualForm.label.trim()?a:a+"44"}`,borderRadius:6,padding:"9px 11px",color:C.bright,fontSize:".8rem",outline:"none",boxSizing:"border-box"}}/>
              <input type="text" value={manualForm.icon} onChange={e=>updateManualField("icon",e.target.value)} disabled={adding} placeholder="Icon" maxLength="3" style={{background:C.bg,border:`1px solid ${a}44`,borderRadius:6,padding:"9px 11px",color:C.bright,fontSize:".95rem",outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
            </div>
            <input type="text" value={manualForm.sub} onChange={e=>updateManualField("sub",e.target.value)} disabled={adding} placeholder="Subtitle (e.g. 'Bleed Build')" style={{width:"100%",background:C.bg,border:`1px solid ${a}44`,borderRadius:6,padding:"9px 11px",color:C.bright,fontSize:".8rem",outline:"none",boxSizing:"border-box",marginBottom:6}}/>
            <input type="text" value={manualForm.cls} onChange={e=>updateManualField("cls",e.target.value)} disabled={adding} placeholder="Starting class (or leave for AI)" style={{width:"100%",background:C.bg,border:`1px solid ${a}44`,borderRadius:6,padding:"9px 11px",color:C.bright,fontSize:".8rem",outline:"none",boxSizing:"border-box",marginBottom:6}}/>
            <textarea value={manualForm.playstyle} onChange={e=>updateManualField("playstyle",e.target.value)} disabled={adding} placeholder="Playstyle description (or leave for AI)" style={{width:"100%",minHeight:50,background:C.bg,border:`1px solid ${a}44`,borderRadius:6,padding:"9px 11px",color:C.bright,fontSize:".78rem",lineHeight:1.5,resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:14}}/>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:a,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,fontWeight:700}}>Stages</div>
            <div style={{display:"flex",gap:4,marginBottom:10}}>
              {["Early Game","Mid Game","Endgame"].map((name,i)=>(<button key={i} onClick={()=>setManualPhase(i)} disabled={adding} style={{flex:1,background:manualPhase===i?`${a}22`:"transparent",border:`1px solid ${manualPhase===i?a:"#ffffff14"}`,borderRadius:5,padding:"7px 6px",cursor:adding?"not-allowed":"pointer",color:manualPhase===i?C.bright:C.dim,fontFamily:"'Cinzel',serif",fontSize:".7rem",fontWeight:700}}>{name}</button>))}
            </div>
            {(()=>{const ph=manualForm.phases[manualPhase];const statKeys=getTargetStatKeys();return(
              <div style={{background:C.bg,border:"1px solid #ffffff0d",borderRadius:6,padding:12,marginBottom:14}}>
                <div style={{fontSize:".62rem",color:a,letterSpacing:".08em",fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Stats <span style={{color:C.dim,fontWeight:400}}>(blank = AI infers)</span></div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(70px,1fr))",gap:5,marginBottom:12}}>
                  {statKeys.map(k=>(<div key={k} style={{display:"flex",flexDirection:"column"}}><div style={{fontSize:".55rem",color:C.dim,letterSpacing:".05em",fontWeight:700,marginBottom:2,textAlign:"center"}}>{k}</div><input type="number" min="0" max="99" value={ph.stats[k]||""} onChange={e=>updateManualStat(manualPhase,k,e.target.value)} disabled={adding} placeholder="–" style={{width:"100%",background:C.card,border:`1px solid ${ph.stats[k]?a+"66":"#ffffff14"}`,borderRadius:4,padding:"5px 4px",color:C.bright,fontSize:".75rem",outline:"none",boxSizing:"border-box",textAlign:"center"}}/></div>))}
                </div>
                <div style={{fontSize:".62rem",color:a,letterSpacing:".08em",fontWeight:700,marginBottom:6,textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Weapons</span><button onClick={()=>addManualItem(manualPhase,"weapons",{n:"",st:""})} disabled={adding} style={{background:"transparent",border:`1px solid ${a}44`,borderRadius:3,padding:"2px 6px",color:a,cursor:"pointer",fontSize:".62rem",fontWeight:700}}>+</button></div>
                {(ph.weapons||[]).map((w,i)=>(<div key={i} style={{display:"flex",gap:4,marginBottom:4}}><input type="text" value={w.n||""} onChange={e=>updateManualItem(manualPhase,"weapons",i,"n",e.target.value)} disabled={adding} placeholder="Weapon name" style={{flex:2,background:C.card,border:"1px solid #ffffff14",borderRadius:4,padding:"6px 8px",color:C.bright,fontSize:".76rem",outline:"none"}}/><input type="text" value={w.st||""} onChange={e=>updateManualItem(manualPhase,"weapons",i,"st",e.target.value)} disabled={adding} placeholder="Status" style={{flex:1,background:C.card,border:"1px solid #ffffff14",borderRadius:4,padding:"6px 8px",color:C.bright,fontSize:".76rem",outline:"none"}}/>{ph.weapons.length>1&&<button onClick={()=>removeManualItem(manualPhase,"weapons",i)} disabled={adding} style={{background:"transparent",border:"1px solid #ffffff14",borderRadius:4,padding:"0 8px",color:C.dim,cursor:"pointer",fontSize:".75rem"}}>×</button>}</div>))}
                <div style={{fontSize:".62rem",color:a,letterSpacing:".08em",fontWeight:700,marginBottom:6,marginTop:10,textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Armor</span><button onClick={()=>addManualItem(manualPhase,"armor",{n:""})} disabled={adding} style={{background:"transparent",border:`1px solid ${a}44`,borderRadius:3,padding:"2px 6px",color:a,cursor:"pointer",fontSize:".62rem",fontWeight:700}}>+</button></div>
                {(ph.armor||[]).map((ar,i)=>(<div key={i} style={{display:"flex",gap:4,marginBottom:4}}><input type="text" value={ar.n||""} onChange={e=>updateManualItem(manualPhase,"armor",i,"n",e.target.value)} disabled={adding} placeholder="Armor set name" style={{flex:1,background:C.card,border:"1px solid #ffffff14",borderRadius:4,padding:"6px 8px",color:C.bright,fontSize:".76rem",outline:"none"}}/>{ph.armor.length>1&&<button onClick={()=>removeManualItem(manualPhase,"armor",i)} disabled={adding} style={{background:"transparent",border:"1px solid #ffffff14",borderRadius:4,padding:"0 8px",color:C.dim,cursor:"pointer",fontSize:".75rem"}}>×</button>}</div>))}
                <div style={{fontSize:".62rem",color:a,letterSpacing:".08em",fontWeight:700,marginBottom:6,marginTop:10,textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Accessories / Rings</span><button onClick={()=>addManualItem(manualPhase,"acc",{n:"",ef:""})} disabled={adding} style={{background:"transparent",border:`1px solid ${a}44`,borderRadius:3,padding:"2px 6px",color:a,cursor:"pointer",fontSize:".62rem",fontWeight:700}}>+</button></div>
                {(ph.acc||[]).map((ac,i)=>(<div key={i} style={{display:"flex",gap:4,marginBottom:4}}><input type="text" value={ac.n||""} onChange={e=>updateManualItem(manualPhase,"acc",i,"n",e.target.value)} disabled={adding} placeholder="Ring/accessory name" style={{flex:2,background:C.card,border:"1px solid #ffffff14",borderRadius:4,padding:"6px 8px",color:C.bright,fontSize:".76rem",outline:"none"}}/><input type="text" value={ac.ef||""} onChange={e=>updateManualItem(manualPhase,"acc",i,"ef",e.target.value)} disabled={adding} placeholder="Effect" style={{flex:2,background:C.card,border:"1px solid #ffffff14",borderRadius:4,padding:"6px 8px",color:C.bright,fontSize:".76rem",outline:"none"}}/>{ph.acc.length>1&&<button onClick={()=>removeManualItem(manualPhase,"acc",i)} disabled={adding} style={{background:"transparent",border:"1px solid #ffffff14",borderRadius:4,padding:"0 8px",color:C.dim,cursor:"pointer",fontSize:".75rem"}}>×</button>}</div>))}
                <div style={{fontSize:".62rem",color:a,letterSpacing:".08em",fontWeight:700,marginBottom:6,marginTop:10,textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Spells / Buffs</span><button onClick={()=>addManualItem(manualPhase,"spells",{n:"",ef:""})} disabled={adding} style={{background:"transparent",border:`1px solid ${a}44`,borderRadius:3,padding:"2px 6px",color:a,cursor:"pointer",fontSize:".62rem",fontWeight:700}}>+</button></div>
                {(ph.spells||[]).length===0&&<div style={{fontSize:".7rem",color:C.dim,fontStyle:"italic",padding:"4px 0"}}>No spells (click + to add)</div>}
                {(ph.spells||[]).map((s,i)=>(<div key={i} style={{display:"flex",gap:4,marginBottom:4}}><input type="text" value={s.n||""} onChange={e=>updateManualItem(manualPhase,"spells",i,"n",e.target.value)} disabled={adding} placeholder="Spell name" style={{flex:2,background:C.card,border:"1px solid #ffffff14",borderRadius:4,padding:"6px 8px",color:C.bright,fontSize:".76rem",outline:"none"}}/><input type="text" value={s.ef||""} onChange={e=>updateManualItem(manualPhase,"spells",i,"ef",e.target.value)} disabled={adding} placeholder="Effect" style={{flex:2,background:C.card,border:"1px solid #ffffff14",borderRadius:4,padding:"6px 8px",color:C.bright,fontSize:".76rem",outline:"none"}}/><button onClick={()=>removeManualItem(manualPhase,"spells",i)} disabled={adding} style={{background:"transparent",border:"1px solid #ffffff14",borderRadius:4,padding:"0 8px",color:C.dim,cursor:"pointer",fontSize:".75rem"}}>×</button></div>))}
              </div>
            );})()}
          </>}

          <div style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:a,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,marginTop:12,fontWeight:700}}>Reference URL <span style={{color:C.dim,fontSize:".6rem",textTransform:"none",fontWeight:400}}>— optional, triggers web search</span></div>
          <input type="url" value={addUrl} onChange={e=>setAddUrl(e.target.value)} disabled={adding} placeholder="https://fextralife.com/... or a YouTube guide URL" style={{width:"100%",background:C.bg,border:`1px solid ${a}44`,borderRadius:6,padding:"10px 12px",color:C.bright,fontSize:".8rem",outline:"none",boxSizing:"border-box"}}/>
          {addError&&<div style={{marginTop:10,padding:"8px 11px",background:"#e74c3c15",border:"1px solid #e74c3c55",borderLeft:"3px solid #e74c3c",borderRadius:5,fontSize:".76rem",color:"#ff9a8b"}}>{addError}</div>}
          {(()=>{
            const isBlocked=(addMode==="ai"&&!addText.trim())||(addMode==="semi"&&!Object.values(semiForm.endgameStats).some(v=>{const n=parseInt(v);return !isNaN(n)&&n>0;}))||(addMode==="manual"&&!manualForm.label.trim());
            const btnLabel=adding?(addStep||"✦ Generating..."):(addMode==="manual"?"✎ Build It":addMode==="semi"?"◐ Generate from Targets":"✦ Generate Full Build");
            return(<div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={()=>!adding&&setShowAdd(false)} disabled={adding} style={{flex:1,background:"transparent",border:"1px solid #ffffff22",borderRadius:6,padding:"10px",cursor:adding?"not-allowed":"pointer",color:C.dim,fontFamily:"'Cinzel',serif",fontSize:".76rem",fontWeight:700}}>Cancel</button>
              <button onClick={handleAddBuild} disabled={adding||isBlocked} style={{flex:2,background:adding||isBlocked?"#ffffff11":a,border:`1px solid ${a}`,borderRadius:6,padding:"10px",cursor:adding||isBlocked?"not-allowed":"pointer",color:adding||isBlocked?C.dim:"#fff",fontFamily:"'Cinzel',serif",fontSize:".76rem",fontWeight:700}}>{btnLabel}</button>
            </div>);
          })()}
          {adding&&genInfo&&<div style={{marginTop:12,padding:"8px 12px",background:"#ffffff07",border:"1px solid #ffffff12",borderRadius:6}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,fontSize:".7rem"}}>
              <span>{PROVIDERS[genInfo.prov]?.icon}</span>
              <span style={{color:C.text,fontWeight:600}}>{PROVIDERS[genInfo.prov]?.label}</span>
              <span style={{color:C.dim,marginLeft:2}}>{genInfo.label}</span>
            </div>
            <div style={{display:"flex",gap:3}}>
              {[0,1,2,3].map(i=><div key={i} style={{flex:1,height:2,borderRadius:1,background:i<=genInfo.step?a:"#ffffff1a"}}/>)}
            </div>
            <div style={{marginTop:4,fontSize:".62rem",color:C.dim,textAlign:"right"}}>step {genInfo.step+1} / 4</div>
          </div>}
          {adding&&!genInfo&&<div style={{marginTop:12,fontSize:".7rem",color:C.dim,fontStyle:"italic",textAlign:"center",lineHeight:1.4}}>Running 3 API calls — usually 30–90 seconds.</div>}
        </div>
      </div>}

      {/* ══ SIDEBAR ══ */}
      <div style={{width:230,flexShrink:0,background:"#0f0c09",borderRight:"1px solid #1c1810",display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>

        {/* Branding */}
        <div style={{padding:"18px 16px 14px",borderBottom:"1px solid #1c1810",flexShrink:0}}>
          <div style={{fontSize:".44rem",letterSpacing:".45em",color:a,textTransform:"uppercase",fontWeight:700,marginBottom:5}}>Master Build</div>
          <div style={{fontFamily:"'Cinzel Decorative','Cinzel',serif",fontSize:"1.05rem",color:C.bright,fontWeight:900,letterSpacing:".04em",lineHeight:1}}>CODEX</div>
          <div style={{width:28,height:2,background:`linear-gradient(90deg,${a},${a}44)`,borderRadius:1,marginTop:8,boxShadow:`0 0 6px ${a}88`}}/>
        </div>

        {/* Active build hero */}
        <div style={{padding:"13px 14px",borderBottom:"1px solid #1c1810",background:`${a}09`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:40,height:40,borderRadius:8,background:`${a}18`,border:`1px solid ${a}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",flexShrink:0,boxShadow:`0 0 14px ${a}22`}}>{B.icon}</div>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:".78rem",color:C.bright,fontWeight:800,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{B.label}</div>
              <div style={{fontSize:".55rem",color:a,letterSpacing:".1em",textTransform:"uppercase",fontWeight:700,marginTop:3}}>{B.sub}</div>
            </div>
          </div>
          <div style={{fontSize:".6rem",color:C.dim,marginTop:9,lineHeight:1.4,borderTop:`1px solid ${a}18`,paddingTop:7}}>{B.cls} · {B.caps}</div>
        </div>

        {/* Game list */}
        <div style={{padding:"11px 10px 4px",flexShrink:0}}>
          <div style={{fontSize:".48rem",letterSpacing:".22em",color:"#4a4035",textTransform:"uppercase",fontWeight:700,marginBottom:6,paddingLeft:3}}>Game</div>
          {Object.entries(allGames).map(([k,g])=>{
            const isAct=game===k; const isCG=!games[k];
            return(<button key={k} onClick={()=>handleGameSwitch(k)} className="sb-btn" style={{width:"100%",display:"flex",alignItems:"center",gap:8,background:isAct?`${a}12`:"transparent",border:`1px solid ${isAct?a+"44":"transparent"}`,borderRadius:6,padding:"6px 9px",cursor:"pointer",marginBottom:2,textAlign:"left"}}>
              <span style={{fontSize:".95rem",filter:isAct?"none":"grayscale(70%) opacity(0.4)"}}>{g.icon}</span>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:isAct?C.bright:C.dim,fontWeight:700,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.name}</span>
              {isCG&&<span style={{fontSize:".44rem",color:a,background:`${a}18`,padding:"1px 5px",borderRadius:3,fontWeight:700,flexShrink:0}}>AI</span>}
            </button>);
          })}
        </div>

        {/* Build list */}
        <div style={{padding:"4px 10px",flex:1,overflowY:"auto",minHeight:0}}>
          <div style={{fontSize:".48rem",letterSpacing:".22em",color:"#4a4035",textTransform:"uppercase",fontWeight:700,marginBottom:6,paddingLeft:3}}>Builds</div>
          {buildKeys.map(k=>{
            const bld=allBuilds[k]; const isAct=safeBuildKey===k; const isCust=k.startsWith("custom_");
            return(<button key={k} onClick={()=>handleBuildSwitch(k)} className="sb-btn" style={{width:"100%",display:"flex",alignItems:"center",gap:7,background:isAct?`${bld.accent}12`:"transparent",border:`1px solid ${isAct?bld.accent+"44":"transparent"}`,borderLeft:isAct?`3px solid ${bld.accent}`:"3px solid transparent",borderRadius:6,padding:"6px 9px",cursor:"pointer",marginBottom:2,textAlign:"left"}}>
              <span style={{fontSize:".85rem"}}>{bld.icon}</span>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:".66rem",color:isAct?C.bright:C.dim,fontWeight:700,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{bld.label}</span>
              {isCust&&<span style={{fontSize:".44rem",color:bld.accent,fontWeight:700,flexShrink:0}}>✦</span>}
            </button>);
          })}
        </div>

        {/* Action buttons */}
        <div style={{padding:"9px 10px",borderTop:"1px solid #1c1810",flexShrink:0}}>
          <button onClick={()=>{setAddTargetGame(safeGame);setShowAdd(true);setAddError("");setSelectedProviders([provider]);}} style={{width:"100%",background:`${a}12`,border:`1px dashed ${a}55`,borderRadius:6,padding:"8px",cursor:"pointer",color:a,fontFamily:"'Cinzel',serif",fontSize:".65rem",fontWeight:700,textAlign:"center",marginBottom:6,letterSpacing:".06em"}}>✦ Add Build</button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:4}}>
            <button onClick={handleUpdateGame} disabled={updating} title="Check for latest patch updates" style={{background:"transparent",border:"1px solid #ffffff0e",borderRadius:5,padding:"5px 3px",cursor:updating?"not-allowed":"pointer",color:C.dim,fontSize:".58rem",fontWeight:700,textAlign:"center",opacity:updating?0.6:1}}>{updating?"⟳":"↻"} Up</button>
            <button onClick={handleExport} title="Export/backup your codex" style={{background:"transparent",border:"1px solid #ffffff0e",borderRadius:5,padding:"5px 3px",cursor:"pointer",color:C.dim,fontSize:".58rem",fontWeight:700,textAlign:"center"}}>💾 Save</button>
            <label title="Import a saved codex" style={{background:"transparent",border:"1px solid #ffffff0e",borderRadius:5,padding:"5px 3px",cursor:"pointer",color:C.dim,fontSize:".58rem",fontWeight:700,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:2}}>📂<input type="file" accept=".json,application/json" onChange={handleImport} style={{display:"none"}}/>Load</label>
          </div>
          {(hiddenStaticBuilds.length>0||Object.keys(dynamicBuilds).length>0||Object.keys(dynamicGames).length>0||safeBuildKey)&&
            <div style={{display:"flex",gap:4}}>
              {(hiddenStaticBuilds.length>0||Object.keys(dynamicBuilds).length>0||Object.keys(dynamicGames).length>0)&&<button onClick={handleRestoreAll} style={{flex:1,background:"transparent",border:"1px solid #ffffff0e",borderRadius:5,padding:"5px 3px",cursor:"pointer",color:C.dim,fontSize:".57rem",fontWeight:700,textAlign:"center"}}>↺ Reset</button>}
              {(safeBuildKey&&B.label!=="No builds")&&<button onClick={handleDeleteBuild} style={{flex:1,background:"transparent",border:"1px solid #e74c3c28",borderRadius:5,padding:"5px 3px",cursor:"pointer",color:"#e74c3c66",fontSize:".57rem",fontWeight:700,textAlign:"center"}}>✕ Del</button>}
            </div>
          }

          {/* Wiki import — paste one URL per line to cache verified item locations */}
          <div style={{marginTop:8,padding:"8px 0 0"}}>
            <div style={{fontSize:".58rem",color:C.dim,letterSpacing:".07em",fontFamily:"'Cinzel',serif",fontWeight:700,marginBottom:5,textTransform:"uppercase",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>📖 Wiki Import</span>
              {wikiUrls.split("\n").filter(u=>u.trim().startsWith("http")).length>1&&<span style={{color:a,fontFamily:"'DM Sans',sans-serif",fontSize:".58rem",fontWeight:400,letterSpacing:0}}>{wikiUrls.split("\n").filter(u=>u.trim().startsWith("http")).length} urls</span>}
            </div>
            <textarea
              value={wikiUrls}
              onChange={e=>setWikiUrls(e.target.value)}
              disabled={wikiImporting}
              placeholder={"Paste wiki URLs, one per line:\nhttps://fextralife.com/...\nhttps://fextralife.com/..."}
              rows={3}
              style={{width:"100%",background:"#ffffff08",border:"1px solid #ffffff14",borderRadius:4,padding:"5px 7px",color:C.bright,fontSize:".62rem",outline:"none",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",fontFamily:"'DM Sans',system-ui,sans-serif"}}
            />
            <button
              onClick={handleWikiImport}
              disabled={wikiImporting||learning||!wikiUrls.split("\n").some(u=>u.trim().startsWith("http"))}
              title="Fetch wiki pages + follow item-category links automatically"
              style={{width:"100%",marginTop:4,background:wikiImporting?"transparent":a+"22",border:`1px solid ${wikiImporting?"#ffffff14":a+"55"}`,borderRadius:4,padding:"5px",cursor:(wikiImporting||learning)?"not-allowed":"pointer",color:(wikiImporting||learning)?C.dim:a,fontSize:".62rem",fontWeight:700}}
            >{wikiImporting?"crawling pages…":"↓ Import + Follow Links"}</button>
            <button
              onClick={handleLearn}
              disabled={learning||wikiImporting}
              title={`AI searches the web for every weapon, armor, ring, and spell in ${G.name} — no URL needed`}
              style={{width:"100%",marginTop:4,background:learning?"transparent":`#7b52ab22`,border:`1px solid ${learning?"#ffffff14":"#9b6fc866"}`,borderRadius:4,padding:"5px",cursor:(learning||wikiImporting)?"not-allowed":"pointer",color:(learning||wikiImporting)?C.dim:"#c794e8",fontSize:".62rem",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}
            >
              {learning
                ?<>⏳ learning…</>
                :<><span style={{fontSize:".72rem"}}>🧠</span> Learn {G.name} (AI Search)</>
              }
            </button>
            <div style={{fontSize:".54rem",color:"#ffffff28",marginTop:3,lineHeight:1.4}}>Import: Fextralife or any wiki, one URL per line — auto-follows item pages. Learn: no URL needed, AI searches everything.</div>
          </div>
        </div>

        {/* Settings */}
        <div style={{padding:"8px 10px",borderTop:"1px solid #1c1810",flexShrink:0}}>
          <button onClick={()=>{setSettingsDraft({claude:"",perplexity:""});setShowSettings(true);}} className="sb-btn" style={{width:"100%",background:"transparent",border:"1px solid #ffffff0e",borderRadius:6,padding:"9px 11px",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:"1.05rem"}}>{PROVIDERS[provider]?.icon||"⚙"}</span>
            <div style={{flex:1,textAlign:"left"}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:".62rem",color:apiKey?C.text:C.fire,fontWeight:700}}>{apiKey?PROVIDERS[provider]?.label:"No API Key!"}</div>
              <div style={{fontSize:".5rem",color:C.dim,marginTop:1}}>API Settings</div>
            </div>
            {!apiKey&&<span style={{fontSize:".9rem"}}>⚠️</span>}
          </button>
        </div>
      </div>

      {/* ══ MAIN CONTENT PANEL ══ */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Status bar */}
        {(updateMsg||knowledgeCache[safeGame]?.facts?.length>0||permCache[safeGame]?.facts?.length>0)&&
          <div style={{padding:"4px 18px",background:"#0f0c09",borderBottom:"1px solid #1c1810",fontSize:".62rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:12}}>
            <div style={{color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,display:"flex",alignItems:"center",gap:10}}>
              {permCache[safeGame]?.facts?.length>0&&<span style={{flexShrink:0}}>
                🔒 <button onClick={()=>{setShowPermViewer(v=>!v);setShowCacheViewer(false);}} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit",font:"inherit",display:"inline"}}>
                  <span style={{color:"#f0c070"}}>{permCache[safeGame].facts.length}</span> permanent <span style={{color:C.text,textDecoration:"underline dotted",textUnderlineOffset:2}}>{G.name}</span>
                </button>
              </span>}
              {knowledgeCache[safeGame]?.facts?.length>0&&<span style={{flexShrink:0}}>
                🧠 <button onClick={()=>{setShowCacheViewer(v=>!v);setConfirmClearCache(false);setShowPermViewer(false);}} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit",font:"inherit",display:"inline"}}>
                  <span style={{color:a}}>{knowledgeCache[safeGame].facts.length}</span> working
                </button>
                {knowledgeCache[safeGame]?.patchNote&&<span> · {knowledgeCache[safeGame].patchNote.slice(0,50)}{knowledgeCache[safeGame].patchNote.length>50?"…":""}</span>}
              </span>}
            </div>
            {knowledgeCache[safeGame]?.facts?.length>0&&!confirmClearCache&&<button onClick={()=>setConfirmClearCache(true)} style={{background:"none",border:"1px solid #3a2e22",borderRadius:3,color:C.dim,cursor:"pointer",fontSize:".6rem",padding:"1px 7px",flexShrink:0}} title="Clear working cache for this game">Clear working</button>}
            {confirmClearCache&&<span style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
              <span style={{fontSize:".6rem",color:"#ff8a7a"}}>Clear {knowledgeCache[safeGame]?.facts?.length} working facts?</span>
              <button onClick={()=>{setKnowledgeCache(prev=>{const n={...prev};delete n[safeGame];return n;});setConfirmClearCache(false);setShowCacheViewer(false);}} style={{background:"#e74c3c",border:"none",borderRadius:3,color:"#fff",cursor:"pointer",fontSize:".6rem",padding:"1px 7px"}}>Yes</button>
              <button onClick={()=>setConfirmClearCache(false)} style={{background:"none",border:"1px solid #3a2e22",borderRadius:3,color:C.dim,cursor:"pointer",fontSize:".6rem",padding:"1px 7px"}}>No</button>
            </span>}
            {updateMsg&&<div style={{color:updateMsg.startsWith("✓")?"#7ddb8a":updateMsg.startsWith("✗")?"#ff8a7a":C.dim,fontStyle:"italic",fontWeight:600,flexShrink:0}}>{updateMsg}</div>}
          </div>
        }

        {/* Permanent cache viewer — full curated database, per-item delete only */}
        {showPermViewer&&permCache[safeGame]?.facts?.length>0&&(()=>{
          const facts=permCache[safeGame].facts;
          const delPerm=(f)=>setPermCache(prev=>({...prev,[safeGame]:{...prev[safeGame],facts:prev[safeGame].facts.filter(x=>x!==f)}}));
          const tagColor=(f)=>{
            if(f.startsWith("WEAPON"))return a;
            if(f.startsWith("ARMOR"))return "#7eb8d4";
            if(f.startsWith("RING"))return "#82d482";
            if(f.startsWith("SPELL"))return "#c794e8";
            if(f.startsWith("PATCH"))return "#f0c070";
            return C.dim;
          };
          const tagLabel=(f)=>{
            const m=f.match(/^(WEAPON|ARMOR|RING\/ACC|SPELL|PATCH UPDATE|Build)/i);
            return m?m[1].toUpperCase():"INFO";
          };
          // Group by type for easier browsing
          const grouped={WEAPON:[],ARMOR:[],RING:[],SPELL:[],OTHER:[]};
          facts.forEach(f=>{
            if(f.startsWith("WEAPON"))grouped.WEAPON.push(f);
            else if(f.startsWith("ARMOR"))grouped.ARMOR.push(f);
            else if(f.startsWith("RING"))grouped.RING.push(f);
            else if(f.startsWith("SPELL"))grouped.SPELL.push(f);
            else grouped.OTHER.push(f);
          });
          const groupOrder=[["WEAPON","Weapons",a],["ARMOR","Armor","#7eb8d4"],["RING","Rings & Accessories","#82d482"],["SPELL","Spells","#c794e8"],["OTHER","Other","#888"]];
          return(
            <div style={{background:"#09070a",borderBottom:"2px solid #2a1f0a",flexShrink:0,maxHeight:400,overflowY:"auto"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 18px",borderBottom:"1px solid #2a1f0a",position:"sticky",top:0,background:"#09070a",zIndex:1}}>
                <span style={{fontSize:".65rem",color:"#f0c070",fontFamily:"'Cinzel',serif",letterSpacing:".06em"}}>🔒 PERMANENT DATABASE — {G.name} <span style={{color:C.dim,fontWeight:400}}>({facts.length} items · click ✕ to remove individual entries)</span></span>
                <button onClick={()=>setShowPermViewer(false)} style={{background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:".8rem",padding:"0 4px",lineHeight:1}}>✕</button>
              </div>
              {groupOrder.map(([key,label,col])=>grouped[key].length===0?null:(
                <div key={key}>
                  <div style={{padding:"5px 18px 3px",fontSize:".58rem",color:col,fontFamily:"'Cinzel',serif",letterSpacing:".08em",fontWeight:700,background:"#0c0a0e",borderBottom:"1px solid #1a1520",position:"sticky",top:35,zIndex:1}}>{label} ({grouped[key].length})</div>
                  {grouped[key].map((f,i)=>{
                    const body=f.replace(/^(WEAPON|ARMOR|RING\/ACC|SPELL|PATCH UPDATE|Build)\s+/i,"").replace(/^"([^"]+)"\s*—?\s*/,"$1 — ");
                    return(
                      <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"5px 18px",borderBottom:"1px solid #100d14",fontSize:".65rem",lineHeight:1.55}}>
                        <span style={{color:C.text,flex:1,wordBreak:"break-word"}}>{body}</span>
                        <button onClick={()=>delPerm(f)} title="Remove from permanent cache" style={{background:"none",border:"none",color:"#4a3a32",cursor:"pointer",fontSize:".75rem",flexShrink:0,padding:"0 2px",lineHeight:1,marginTop:1}} onMouseEnter={e=>e.target.style.color="#e74c3c"} onMouseLeave={e=>e.target.style.color="#4a3a32"}>✕</button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Cache fact viewer — toggled by clicking the facts count */}
        {showCacheViewer&&knowledgeCache[safeGame]?.facts?.length>0&&(()=>{
          const facts=knowledgeCache[safeGame].facts;
          const deleteFact=(f)=>setKnowledgeCache(prev=>({...prev,[safeGame]:{...prev[safeGame],facts:prev[safeGame].facts.filter(x=>x!==f)}}));
          const keepFact=(f)=>{addToPermCache(safeGame,G.name,f);deleteFact(f);};
          const alreadyKept=(f)=>(permCache[safeGame]?.facts||[]).some(p=>p.slice(0,60).toLowerCase()===f.slice(0,60).toLowerCase());
          const tagColor=(f)=>{
            if(f.startsWith("WEAPON"))return a;
            if(f.startsWith("ARMOR"))return "#7eb8d4";
            if(f.startsWith("RING"))return "#82d482";
            if(f.startsWith("SPELL"))return "#c794e8";
            if(f.startsWith("PATCH"))return "#f0c070";
            return C.dim;
          };
          const tagLabel=(f)=>{
            const m=f.match(/^(WEAPON|ARMOR|RING\/ACC|SPELL|PATCH UPDATE|Build)/i);
            return m?m[1].toUpperCase():"INFO";
          };
          return(
            <div style={{background:"#080705",borderBottom:"2px solid #1c1810",flexShrink:0,maxHeight:320,overflowY:"auto"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 18px",borderBottom:"1px solid #1c1810",position:"sticky",top:0,background:"#080705",zIndex:1}}>
                <span style={{fontSize:".65rem",color:C.dim,fontFamily:"'Cinzel',serif",letterSpacing:".06em"}}>WORKING CACHE — {G.name} ({facts.length} facts) <span style={{color:"#f0c07066",fontWeight:400,fontSize:".58rem"}}>· 🔒 to keep permanently</span></span>
                <button onClick={()=>setShowCacheViewer(false)} style={{background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:".8rem",padding:"0 4px",lineHeight:1}}>✕</button>
              </div>
              {facts.map((f,i)=>{
                const tag=tagLabel(f);
                const col=tagColor(f);
                const body=f.replace(/^(WEAPON|ARMOR|RING\/ACC|SPELL|PATCH UPDATE|Build)\s+/i,"").replace(/^"([^"]+)"\s*—?\s*/,"$1 — ");
                const kept=alreadyKept(f);
                return(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"5px 18px",borderBottom:"1px solid #0d0b09",fontSize:".65rem",lineHeight:1.55}}>
                    <span style={{color:col,fontWeight:700,fontSize:".58rem",flexShrink:0,marginTop:2,minWidth:52,letterSpacing:".04em"}}>{tag}</span>
                    <span style={{color:C.text,flex:1,wordBreak:"break-word"}}>{body}</span>
                    <button onClick={()=>!kept&&keepFact(f)} title={kept?"Already in permanent cache":"Move to permanent cache"} style={{background:"none",border:"none",color:kept?"#f0c07077":"#5a4a32",cursor:kept?"default":"pointer",fontSize:".72rem",flexShrink:0,padding:"0 3px",lineHeight:1,marginTop:1}} onMouseEnter={e=>{if(!kept)e.target.style.color="#f0c070";}} onMouseLeave={e=>{if(!kept)e.target.style.color="#5a4a32";}}>🔒</button>
                    <button onClick={()=>deleteFact(f)} title="Delete this fact" style={{background:"none",border:"none",color:"#4a3a32",cursor:"pointer",fontSize:".75rem",flexShrink:0,padding:"0 2px",lineHeight:1,marginTop:1}} onMouseEnter={e=>e.target.style.color="#e74c3c"} onMouseLeave={e=>e.target.style.color="#4a3a32"}>✕</button>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Tab bar */}
        <div style={{display:"flex",background:"#0f0c09",borderBottom:"1px solid #1c1810",flexShrink:0,overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"#18140f":"transparent",border:"none",borderBottom:tab===t.id?`2px solid ${a}`:"2px solid transparent",padding:"10px 18px",cursor:"pointer",flexShrink:0,textAlign:"left"}}>
              <div style={{fontSize:".78rem",color:tab===t.id?C.bright:C.dim,fontWeight:700,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}><span>{t.icon}</span>{t.l}</div>
              <div style={{fontSize:".56rem",color:tab===t.id?a:"#3a3428",marginTop:1,whiteSpace:"nowrap"}}>{t.s}</div>
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{flex:1,overflowY:"auto",padding:"22px 26px"}} className="tab-content">

          {/* MAIN TAB */}
          {tab==="main"&&<div>
            <div style={{background:C.card,border:`1px solid ${a}44`,borderLeft:`4px solid ${a}`,borderRadius:10,padding:"18px 20px",marginBottom:18,boxShadow:`0 0 30px ${a}0d,0 4px 20px #00000050`}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                <div style={{width:54,height:54,borderRadius:10,background:`${a}18`,border:`1px solid ${a}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",flexShrink:0,boxShadow:`0 0 18px ${a}33`}}>{B.icon}</div>
                <div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.2rem",color:C.bright,fontWeight:800,letterSpacing:".04em"}}>{B.label}</div>
                  <div style={{fontSize:".68rem",color:a,letterSpacing:".12em",textTransform:"uppercase",marginTop:4,fontWeight:700}}>{B.sub}</div>
                </div>
              </div>
              <div style={{fontSize:".86rem",color:C.text,lineHeight:1.65,marginBottom:13}}>{B.playstyle}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",fontSize:".7rem"}}>
                <span style={{background:`${a}22`,color:C.bright,padding:"4px 12px",borderRadius:20,border:`1px solid ${a}66`,fontWeight:600}}>Class: {B.cls}</span>
                <span style={{background:"#ffffff07",color:C.text,padding:"4px 12px",borderRadius:20,border:"1px solid #ffffff14"}}>Caps: {B.caps}</span>
                <span style={{background:"#ffffff07",color:C.text,padding:"4px 12px",borderRadius:20,border:"1px solid #ffffff14"}}>Req: {B.weaponReq}</span>
              </div>
            </div>
            <div style={{fontSize:".74rem",color:C.dim,marginBottom:14,fontStyle:"italic",borderLeft:`3px solid ${a}44`,paddingLeft:10,lineHeight:1.5}}>Click phase buttons to see progression. Click items to expand for location/upgrade info. Green +numbers = gains from previous phase.</div>
            {B.loadouts&&<LoadoutSelector lo={lo} setLo={setLo} a={a} loadouts={B.loadouts}/>}
            <div style={{display:"flex",gap:5,marginBottom:20,flexWrap:"wrap"}}>
              {B.ph.map((ph,i)=>{const isActive=i===safePi;const isPast=i<safePi;return(<button key={i} onClick={()=>{setPi(i);setNgCycle(0);}} className="phase-btn" style={{flex:"1 1 auto",minWidth:88,background:isActive?a:"transparent",border:`1px solid ${isActive?a:isPast?a+"55":"#ffffff1a"}`,borderRadius:7,padding:"8px 10px",cursor:"pointer",textAlign:"center",boxShadow:isActive?`0 0 14px ${a}55,0 2px 10px #00000060`:"none"}}>
                <div style={{fontSize:".7rem",color:isActive?"#fff":isPast?a:C.dim,fontFamily:"'Cinzel',serif",fontWeight:700}}>{ph.name}</div>
                <div style={{fontSize:".56rem",color:isActive?"#ffffffaa":C.dim,marginTop:1}}>{ph.range}</div>
              </button>);})}
            </div>
            <SL a={a}>Stats — {p.name}</SL>
            {p.ngCycles&&<div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>{p.ngCycles.map((c,i)=>(<button key={i} onClick={()=>setNgCycle(i)} className="phase-btn" style={{flex:"1 1 auto",minWidth:70,background:i===ngCycle?`${a}28`:"transparent",border:`1px solid ${i===ngCycle?a:"#ffffff14"}`,borderRadius:5,padding:"6px 8px",cursor:"pointer",textAlign:"center"}}><div style={{fontSize:".7rem",color:i===ngCycle?C.bright:C.dim,fontFamily:"'Cinzel',serif",fontWeight:700}}>{c.label}</div></button>))}</div>}
            {(()=>{const cur=p.ngCycles?p.ngCycles[ngCycle]:null;const stats=cur?cur.stats:p.stats;return Object.entries(stats).map(([k,v])=><StatBar key={k} l={k} v={v} max={G.statMax} a={a} p={pv?pv.stats[k]:null} softCap={G.softCaps?G.softCaps[k]:null}/>);})()}
            <div style={{fontSize:".78rem",color:C.dim,fontStyle:"italic",marginBottom:16,paddingLeft:10,borderLeft:`2px solid ${a}44`,lineHeight:1.55}}>{p.ngCycles&&p.ngCycles[ngCycle]?p.ngCycles[ngCycle].notes:p.sn}</div>
            <SL a={a}>Weapons</SL>{p.weapons.map((w,i)=><ItemCard key={i} item={w} a={a}/>)}
            <SL a={a}>Armor</SL>{p.armor.map((ar,i)=><ItemCard key={i} item={ar} a={a}/>)}
            <SL a={a}>Accessories / Rings</SL>{p.acc.map((ac,i)=><ItemCard key={i} item={ac} a={a}/>)}
            <SL a={a}>Spells / Buffs</SL>{p.spells.length>0?p.spells.map((s,i)=><ItemCard key={i} item={s} a={a}/>):<div style={{fontSize:".78rem",color:C.dim,fontStyle:"italic",padding:"6px 0"}}>No spells at this phase.</div>}
            <SL a={a}>Damage — {p.name}</SL><DBox d={p.dmg} a={a}/>
          </div>}

          {/* MATERIALS TAB */}
          {tab==="mats"&&<div>
            <SL a={a}>Upgrade Material Guide</SL>
            {G.mats.map((m,i)=><div key={i} style={{border:`1px solid ${a}33`,borderLeft:`3px solid ${a}`,borderRadius:8,marginBottom:10,background:C.card,padding:14,boxShadow:"0 2px 14px #00000040"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontFamily:"'Cinzel',serif",fontSize:".88rem",color:C.bright,fontWeight:700}}>{m.tier}</span><span style={{fontSize:".68rem",background:`${a}22`,color:C.bright,padding:"3px 11px",borderRadius:20,border:`1px solid ${a}55`,fontWeight:700}}>{m.range}</span></div>
              {[{l:"🛒 BUY",v:m.buy},{l:"⚔ FARM",v:m.farm},{l:"📍 FIND",v:m.find},{l:"💡 TIP",v:m.tip}].map((x,j)=>(<div key={j} style={{background:"#ffffff05",borderRadius:5,padding:"7px 11px",marginBottom:5,fontSize:".8rem",borderLeft:`2px solid ${a}55`}}><span style={{color:a,fontWeight:700,fontSize:".7rem"}}>{x.l}: </span><span style={{color:C.text}}>{x.v}</span></div>))}
            </div>)}
            <SL a={a}>Encumbrance & Weight</SL>
            <div style={{background:C.card,border:`1px solid ${a}33`,borderLeft:`3px solid ${a}`,borderRadius:8,padding:14,fontSize:".8rem",lineHeight:1.7}}>
              <div style={{marginBottom:8}}><span style={{color:C.green,fontWeight:700,fontFamily:"'Cinzel',serif"}}>LIGHT</span> — {G.weightInfo.light}</div>
              <div style={{marginBottom:8}}><span style={{color:C.yellow,fontWeight:700,fontFamily:"'Cinzel',serif"}}>MEDIUM</span> — {G.weightInfo.medium}</div>
              <div style={{marginBottom:8}}><span style={{color:C.fire,fontWeight:700,fontFamily:"'Cinzel',serif"}}>HEAVY</span> — {G.weightInfo.heavy}</div>
              <div style={{borderTop:"1px solid #ffffff10",paddingTop:9,marginTop:5,color:C.text}}>{G.weightInfo.note}</div>
            </div>
          </div>}

          {/* SIMILAR TAB */}
          {tab==="sim"&&<div>
            <div style={{fontSize:".8rem",color:C.dim,marginBottom:16,fontStyle:"italic",borderLeft:`2px solid ${a}55`,paddingLeft:10,lineHeight:1.5}}>Variants of <span style={{color:C.bright,fontWeight:600}}>{B.label}</span> with the same archetype.</div>
            {B.sim.map((b,i)=><ABC key={i} b={b} statMax={G.statMax} softCaps={G.softCaps}/>)}
          </div>}

          {/* OTHER OP TAB */}
          {tab==="oth"&&<div>
            <div style={{fontSize:".8rem",color:C.dim,marginBottom:16,fontStyle:"italic",borderLeft:`2px solid ${a}55`,paddingLeft:10,lineHeight:1.5}}>Different playstyles than <span style={{color:C.bright,fontWeight:600}}>{B.label}</span>, equally overpowered.</div>
            {B.oth.map((b,i)=><ABC key={i} b={b} statMax={G.statMax} softCaps={G.softCaps}/>)}
          </div>}

          {/* REF TAB */}
          {tab==="ref"&&<div>
            <SL a={a}>{B.label} Build Family</SL>
            <div style={{overflowX:"auto",border:`1px solid ${a}33`,borderRadius:8,background:C.card,boxShadow:"0 4px 20px #00000050"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:".76rem"}}>
                <thead><tr>{["Build","Weapon","AP","Status","Armor","Style"].map((h,i)=><th key={i} style={{textAlign:"left",padding:"10px 10px",background:`${a}18`,color:C.bright,fontFamily:"'Cinzel',serif",fontSize:".63rem",letterSpacing:".1em",textTransform:"uppercase",borderBottom:`2px solid ${a}`,whiteSpace:"nowrap",fontWeight:700}}>{h}</th>)}</tr></thead>
                <tbody>{B.ref.map((d,i)=><tr key={i} style={{borderBottom:"1px solid #ffffff08"}}><td style={{padding:"9px 10px",whiteSpace:"nowrap"}}><span style={{marginRight:6}}>{d.i}</span><span style={{color:C.bright,fontWeight:700}}>{d.n}</span></td><td style={{padding:"9px 10px",color:C.text}}>{d.w}</td><td style={{padding:"9px 10px",color:d.a,fontWeight:600}}>{d.ap}</td><td style={{padding:"9px 10px",color:C.dim}}>{d.st}</td><td style={{padding:"9px 10px",color:C.dim}}>{d.ar}</td><td style={{padding:"9px 10px",color:C.dim,fontStyle:"italic"}}>{d.s}</td></tr>)}</tbody>
              </table>
            </div>
          </div>}

        </div>
      </div>
    </div>
  );
}
