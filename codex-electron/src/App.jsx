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
/* >>>CONTINUE<<< */
