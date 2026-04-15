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
  <div style={{display:"flex",alignItems:"center",gap:10,marginTop:22,marginBottom:12}}>
    <div style={{width:3,height:16,background:a,borderRadius:2}}/>
    <h3 style={{fontFamily:"'Cinzel',serif",fontSize:".76rem",letterSpacing:".15em",textTransform:"uppercase",color:C.bright,margin:0,fontWeight:700}}>{children}</h3>
    <div style={{flex:1,height:1,background:`${a}33`}}/>
  </div>
);

const ItemCard=({item,a})=>{
  const [o,setO]=useState(false);
  return (
    <div style={{border:`1px solid ${o?a+"66":"#ffffff14"}`,borderRadius:6,marginBottom:6,background:o?C.cardHi:C.card,transition:"all .2s",overflow:"hidden"}}>
      <button onClick={()=>setO(!o)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 13px",background:"none",border:"none",cursor:"pointer",textAlign:"left",flexWrap:"wrap"}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:item.eq!==false?a:"#444",flexShrink:0}}/>
        <span style={{flex:"1 1 110px",fontSize:".86rem",color:item.eq!==false?C.bright:C.dim,fontWeight:item.eq!==false?600:400,minWidth:80}}>{item.n}</span>
        {item.ap&&<span style={{fontSize:".72rem",color:a,fontFamily:"'Cinzel',serif",fontWeight:700}}>{item.ap}</span>}
        {item.st&&<span style={{fontSize:".66rem",background:`${a}22`,color:C.bright,padding:"2px 9px",borderRadius:11,whiteSpace:"nowrap",fontWeight:600,border:`1px solid ${a}55`}}>{item.st}</span>}
        {item.ef&&<span style={{fontSize:".68rem",color:C.dim,fontStyle:"italic",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.ef}</span>}
        {item.wt&&<span style={{fontSize:".66rem",color:C.dim,whiteSpace:"nowrap"}}>⚖{item.wt}</span>}
        <span style={{color:a,fontSize:".62rem",transform:o?"rotate(90deg)":"rotate(0)",transition:"transform .2s",flexShrink:0}}>▶</span>
      </button>
      {o&&<div style={{padding:"4px 13px 14px 30px",fontSize:".8rem",lineHeight:1.65}}>
        {item.d&&<p style={{color:C.text,margin:"0 0 9px"}}>{item.d}</p>}
        {[{i:"📍",l:"LOCATION",v:item.loc},{i:"⬆",l:"UPGRADE",v:item.up},{i:"💡",l:"TIPS",v:item.tip}].filter(x=>x.v&&x.v!=="N/A").map((x,i)=>(
          <div key={i} style={{background:"#ffffff08",borderRadius:5,padding:"8px 11px",marginBottom:5,borderLeft:`3px solid ${a}`}}>
            <span style={{color:a,fontWeight:700,fontSize:".72rem",letterSpacing:".05em"}}>{x.i} {x.l}: </span><span style={{color:C.text}}>{x.v}</span>
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
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
      <span style={{width:36,fontSize:".72rem",color:C.dim,fontFamily:"'Cinzel',serif",textAlign:"right"}}>{l}</span>
      <div style={{flex:1,height:14,background:"#ffffff0a",borderRadius:7,overflow:"hidden",position:"relative"}}>
        {p!=null&&<div style={{position:"absolute",width:`${Math.min((p/max)*100,100)}%`,height:"100%",background:`${a}33`,borderRadius:7}}/>}
        <div style={{position:"relative",width:`${pct}%`,height:"100%",background:a,borderRadius:7,transition:"width .4s"}}/>
        {softCap&&<div style={{position:"absolute",left:`${(softCap/max)*100}%`,top:-1,width:2,height:"calc(100% + 2px)",background:"#ffffff66"}}/>}
      </div>
      <span style={{width:28,fontSize:".84rem",color:C.bright,fontWeight:700,textAlign:"right"}}>{v}</span>
      {grew?<span style={{fontSize:".64rem",color:C.green,fontWeight:700,width:24}}>+{v-p}</span>:<span style={{width:24}}/>}
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
        <div style={{display:"flex",gap:4,marginBottom:13}}>{b.ph.map((ph,i)=>(<button key={i} onClick={()=>setPi(i)} style={{flex:1,background:i===pi?`${b.a}22`:"transparent",border:`1px solid ${i===pi?b.a:"#ffffff14"}`,borderRadius:5,padding:"6px 4px",cursor:"pointer",textAlign:"center",transition:"all .2s"}}><div style={{fontSize:".72rem",color:i===pi?C.bright:C.dim,fontFamily:"'Cinzel',serif",fontWeight:700}}>{ph.n}</div><div style={{fontSize:".6rem",color:C.dim}}>{ph.r}</div></button>))}</div>
        <div style={{marginBottom:11}}>{Object.entries(p.s).map(([k,v])=><StatBar key={k} l={k} v={v} max={statMax} a={b.a} p={pv?pv.s[k]:null} softCap={softCaps?softCaps[k]:null}/>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:11,fontSize:".78rem"}}>
          <div style={{background:"#ffffff06",borderRadius:5,padding:"8px 10px",borderLeft:`2px solid ${b.a}`}}><div style={{color:b.a,fontWeight:700,fontSize:".66rem",marginBottom:3}}>WEAPON</div><div style={{color:C.bright}}>{p.w}</div></div>
          <div style={{background:"#ffffff06",borderRadius:5,padding:"8px 10px",borderLeft:`2px solid ${b.a}`}}><div style={{color:b.a,fontWeight:700,fontSize:".66rem",marginBottom:3}}>ARMOR</div><div style={{color:C.text}}>{p.ar}</div></div>
        </div>
        <div style={{background:"#ffffff06",border:`1px solid ${b.a}22`,borderLeft:`3px solid ${b.a}`,borderRadius:5,padding:"8px 10px",fontSize:".78rem",marginBottom:11}}><span style={{color:b.a,fontWeight:700,fontSize:".68rem"}}>DAMAGE: </span><span style={{color:C.text}}>{p.dm}</span></div>
        {[{l:"KEY ITEMS & LOCATIONS",o:ki,s:setKi,c:b.key.map((k,i)=><div key={i} style={{padding:"6px 10px",borderBottom:"1px solid #ffffff08",lineHeight:1.5,fontSize:".8rem"}}><span style={{color:b.a,fontWeight:700}}>{k.i}: </span><span style={{color:C.text}}>{k.d}</span></div>)},
          {l:"PROGRESSION STEPS",o:sk,s:setSk,c:b.steps.map((s,i)=><div key={i} style={{display:"flex",gap:7,padding:"4px 10px",fontSize:".8rem",color:C.text,lineHeight:1.5}}><span style={{color:b.a,fontWeight:700,fontSize:".7rem",flexShrink:0}}>{i+1}.</span><span>{s}</span></div>)}
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
  const [apiKey,setApiKey]=useState("");
  const [showSettings,setShowSettings]=useState(false);
  const [settingsKeyDraft,setSettingsKeyDraft]=useState("");

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
      const savedKey=localStorage.getItem("codex_apikey");
      if(savedKey)setApiKey(savedKey);
      else setShowSettings(true);
    }catch(e){}
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
    if(build.label)facts.push(`Build "${build.label}" (${build.sub||"—"}): class=${build.cls||"?"}, caps=${build.caps||"?"}, req=${build.weaponReq||"?"}`);
    (build.ph||[]).forEach(ph=>{
      (ph.weapons||[]).forEach(w=>{
        const parts=[];
        if(w.loc&&w.loc!=="Acquired."&&w.loc!=="N/A")parts.push(`loc: ${w.loc}`);
        if(w.up&&w.up!=="N/A"&&w.up!=="Acquired.")parts.push(`upgrade: ${w.up}`);
        if(w.ap)parts.push(`AP: ${w.ap}`);if(w.st)parts.push(`status: ${w.st}`);
        if(parts.length>0)facts.push(`WEAPON ${w.n} — ${parts.join(" | ")}`);
      });
      (ph.armor||[]).forEach(ar=>{
        if(ar.loc&&ar.loc!=="Acquired."&&ar.loc!=="N/A")facts.push(`ARMOR ${ar.n} — loc: ${ar.loc}${ar.wt?` | wt: ${ar.wt}`:""}`);
      });
      (ph.acc||[]).forEach(ac=>{
        if(ac.loc&&ac.loc!=="Acquired."&&ac.loc!=="N/A")facts.push(`RING/ACC ${ac.n} — ${ac.ef||""} — loc: ${ac.loc}`);
      });
      (ph.spells||[]).forEach(s=>{
        if(s.loc&&s.loc!=="Acquired."&&s.loc!=="N/A")facts.push(`SPELL ${s.n} — ${s.ef||""} — loc: ${s.loc}`);
      });
    });
    return facts;
  };

  const updateKnowledgeCache=(gameKey,gameName,newFacts,patchNote)=>{
    setKnowledgeCache(prev=>{
      const existing=prev[gameKey]||{name:gameName,lastUpdated:null,facts:[],patchNote:null};
      const seen=new Set(existing.facts.map(f=>f.slice(0,40)));
      const merged=[...existing.facts];
      for(const f of newFacts){const key=f.slice(0,40);if(!seen.has(key)){merged.push(f);seen.add(key);}}
      const capped=merged.slice(-200);
      return {...prev,[gameKey]:{name:gameName,lastUpdated:Date.now(),facts:capped,patchNote:patchNote||existing.patchNote}};
    });
  };

  const buildKnowledgeBlock=(gameKey)=>{
    const k=knowledgeCache[gameKey];
    if(!k||!k.facts||k.facts.length===0)return "";
    const factList=k.facts.slice(-80).join("\n");
    const ageHours=k.lastUpdated?Math.round((Date.now()-k.lastUpdated)/3600000):null;
    return `\n\nKNOWN FACTS FROM PREVIOUS BUILDS IN THIS CODEX (verified from earlier research${ageHours!=null?`, ${ageHours}h old`:""}):\n${factList}\n${k.patchNote?`Patch context: ${k.patchNote}\n`:""}Use these as authoritative references. Only web search for things NOT in this list.\n`;
  };

  const apiCall=async(prompt,useSearch=true)=>{
    const body={model:"claude-opus-4-6",max_tokens:8000,messages:[{role:"user",content:prompt}]};
    if(useSearch){body.tools=[{type:"web_search_20250305",name:"web_search"}];}
    let data;
    if(window.electronAPI){
      data=await window.electronAPI.callAnthropic(body,apiKey,useSearch);
    }else{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify(body)});
      data=await r.json();
    }
    if(data.error)throw new Error(data.error.message||"API error");
    const textBlocks=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text);
    if(textBlocks.length===0)throw new Error("No text in response");
    const tryParse=(raw)=>{
      if(!raw)return null;
      let text=raw.replace(/```json|```/g,"").trim();
      const s=text.indexOf("{");if(s===-1)return null;text=text.slice(s);
      try{return JSON.parse(text);}catch(_){}
      const eF=text.lastIndexOf("}");
      if(eF!==-1){try{return JSON.parse(text.slice(0,eF+1));}catch(_){}}
      let depth=0,inStr=false,esc=false,lastV=-1;
      for(let i=0;i<text.length;i++){const ch=text[i];if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch==='"'){inStr=!inStr;continue;}if(inStr)continue;if(ch==="{"||ch==="[")depth++;else if(ch==="}"||ch==="]"){depth--;if(depth===0)lastV=i;}}
      if(lastV!==-1){try{return JSON.parse(text.slice(0,lastV+1));}catch(_){}}
      return null;
    };
    const candidates=[textBlocks[textBlocks.length-1],...textBlocks.slice().sort((a,b)=>b.length-a.length),textBlocks.join("\n")];
    for(const cand of candidates){const parsed=tryParse(cand);if(parsed)return parsed;}
    throw new Error(`Couldn't extract JSON. Preview: "${textBlocks[textBlocks.length-1].slice(0,150)}..."`);
  };

  const handleAddBuild=async()=>{
    if(addMode==="ai"&&!addText.trim()){setAddError("Describe the build you want");return;}
    if(addMode==="semi"){
      const hasStats=Object.values(semiForm.endgameStats).some(v=>{const n=parseInt(v);return !isNaN(n)&&n>0;});
      if(!hasStats){setAddError("Set at least one endgame stat target in Semi-AI mode");return;}
    }
    if(addMode==="manual"&&!manualForm.label.trim()){setAddError("Manual mode needs at least a build name");return;}
    if(!apiKey.trim()){setAddError("No API key set. Open Settings to add your key.");return;}
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
      setAddStep(useSearchStep1?(useCustomGame?`Researching ${gameName} & generating early progression...`:"Researching game & generating early progression..."):`Using cached knowledge (${cacheSize} facts) — generating early progression...`);
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

Each phase: {"name":"Phase Name","range":"Lv X-Y","stats":{${statObjStr}},"sn":"1-2 sentence stat priority note","weapons":[{"n":"Weapon","ap":"~N","st":"status","eq":true,"d":"desc","loc":"specific location","up":"upgrade material","tip":"tip"}],"armor":[{"n":"Armor","wt":"~N","eq":true,"d":"desc","loc":"location","up":"N/A","tip":"tip"}],"acc":[{"n":"Ring","ef":"effect","eq":true,"d":"desc","loc":"location","up":"N/A","tip":"tip"}],"spells":[],"dmg":{"ps":"~N","sp":"status procs","bs":"boss speed","n":"notes"}}

Generate exactly 3 phases: Phase 1 (Early Game, Lv 1-20, starter gear), Phase 2 (Core Weapon, Lv 15-25, acquires signature weapon), Phase 3 (Key Accessories, Lv 20-30, build-defining rings)

RULES:
- Target game: ${gameName}
- Use EXACTLY these stat keys: ${statKeysStr}
- Stat max: ${statMax}
- BE SPECIFIC with locations (name zones, bonfires/vestiges/graces, landmarks)
- Use web search aggressively to verify item names and locations${urlRef}${knowledgeBlock}

${userConstraints}`;
      const step1=await apiCall(p1,useSearchStep1);
      if(!step1.label||!step1.ph||!Array.isArray(step1.ph))throw new Error("Invalid build metadata");
      let resolvedStatKeysStr=statKeysStr,resolvedStatObjStr=statObjStr,customGameMeta=null;
      if(useCustomGame){
        customGameMeta=step1.game_meta||{};
        const keys=customGameMeta.stat_keys||Object.keys(step1.ph[0]?.stats||{});
        if(keys.length>0){sampleStats=keys;resolvedStatKeysStr=keys.join(", ");resolvedStatObjStr=keys.map(s=>`"${s}":N`).join(",");statMax=customGameMeta.stat_max||99;}
      }

      setAddStep(`Generating late-game and NG+ for "${step1.label}"...`);
      const p2=`You previously generated the early phases of a "${step1.label}" (${step1.sub}) build for ${gameName}. Now generate the LATE progression phases 4-7.

CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. No preamble, no commentary. Start with { and end with }.

SCHEMA: {"ph":[<phase4>,<phase5>,<phase6>,<phase7_ngplus>]}

Phases 4-6: {"name":"Phase Name","range":"Lv X-Y","stats":{${resolvedStatObjStr}},"sn":"stat note","weapons":[{"n":"...","ap":"~N","st":"...","eq":true,"d":"...","loc":"...","up":"...","tip":"..."}],"armor":[{"n":"...","wt":"~N","eq":true,"d":"...","loc":"...","up":"N/A","tip":"..."}],"acc":[{"n":"...","ef":"...","eq":true,"d":"...","loc":"...","up":"N/A","tip":"..."}],"spells":[{"n":"Spell","ef":"effect","eq":true,"d":"desc","loc":"where learned","up":"scaling","tip":"tip"}],"dmg":{"ps":"~N","sp":"...","bs":"...","n":"..."}}

Phase 7 (NG+) SPECIAL structure: {"name":"NG+","range":"NG+1 to NG+7","stats":{${resolvedStatObjStr}},"sn":"NG+ overview","ngCycles":[{"label":"NG+1","stats":{${resolvedStatObjStr}},"notes":"NG+1 priorities"},{"label":"NG+3","stats":{${resolvedStatObjStr}},"notes":"NG+3 priorities"},{"label":"NG+5","stats":{${resolvedStatObjStr}},"notes":"NG+5 priorities"},{"label":"NG+7","stats":{${resolvedStatObjStr}},"notes":"NG+7 max"}],"weapons":[...],"armor":[...],"acc":[...],"spells":[...],"dmg":{"ps":"~N NG+1, ~N NG+7","sp":"...","bs":"...","n":"..."}}

Generate: Phase 4 (Unlock Spells, Lv 25-40), Phase 5 (Mid-to-Late, Lv 35-55), Phase 6 (Endgame, Lv 55+), Phase 7 (NG+, with ngCycles)

RULES: Stats approach/hit soft caps in endgame, hard caps (${statMax}) in NG+7. Each NG+ cycle adds ~5-10 levels per stat. Use exact stat keys: ${resolvedStatKeysStr}.${urlRef}${knowledgeBlock}

Build: "${step1.label}" (${step1.sub}) - ${step1.playstyle}`;
      const step2=await apiCall(p2,false);

      setAddStep("Generating similar builds, alternatives & reference table...");
      const p3=`You previously generated a full "${step1.label}" (${step1.sub}) build for ${gameName}. Now generate the VARIANTS SECTION.

CRITICAL OUTPUT FORMAT: Single JSON object only. Start with { end with }. No preamble.

SCHEMA: {"sim":[<variant1>,<variant2>],"oth":[<other1>,<other2>],"ref":[<refRow>,<refRow>,<refRow>,<refRow>,<refRow>]}

Each variant in sim/oth: {"label":"Name","sub":"subtitle","icon":"emoji","a":"#hexcolor","cls":"class","why":"1-2 sentences","ph":[{"n":"Early","r":"Lv 1-20","s":{${resolvedStatObjStr}},"w":"weapon","ar":"armor","dm":"damage"},{"n":"Mid","r":"Lv 20-40","s":{${resolvedStatObjStr}},"w":"weapon","ar":"armor","dm":"damage"},{"n":"End","r":"Lv 40+","s":{${resolvedStatObjStr}},"w":"weapon","ar":"armor","dm":"damage"}],"key":[{"i":"Item","d":"brief desc and location"},{"i":"Item","d":"desc"},{"i":"Item","d":"desc"}],"steps":["Step 1","Step 2","Step 3","Step 4","Step 5"]}

Each ref row: {"n":"Build Name","i":"emoji","w":"endgame weapon","ap":"~N damage","st":"status","ar":"endgame armor","s":"short style summary","a":"#hexcolor"}

First ref row MUST be for the main build: {"n":"${step1.label}","i":"${step1.icon}","w":"main endgame weapon","ap":"~N damage","st":"status","ar":"endgame armor","s":"${step1.sub}","a":"${step1.accent}"}

RULES: 2 sim = same archetype but different weapons/approach. 2 oth = completely different playstyles. 5 ref rows total. 3 condensed phases each. 3+ key items with locations. 5+ steps.${urlRef}${knowledgeBlock}

Main build: "${step1.label}" (${step1.sub}) - ${step1.playstyle}`;
      let step3;
      try{step3=await apiCall(p3,false);}catch(e){step3={sim:[],oth:[],ref:[{n:step1.label,i:step1.icon,w:"—",ap:"—",st:"—",ar:"—",s:step1.sub,a:step1.accent}]};}

      setAddStep("Finalizing build...");
      const {game_meta,...step1Clean}=step1;
      const fullBuild={...step1Clean,ph:[...(step1Clean.ph||[]),...(step2.ph||[])],sim:Array.isArray(step3.sim)?step3.sim:[],oth:Array.isArray(step3.oth)?step3.oth:[],ref:(Array.isArray(step3.ref)&&step3.ref.length>0)?step3.ref:[{n:step1.label,i:step1.icon,w:step1.ph[step1.ph.length-1]?.weapons?.[0]?.n||"—",ap:step1.ph[step1.ph.length-1]?.dmg?.ps||"—",st:step1.ph[step1.ph.length-1]?.dmg?.sp||"—",ar:step1.ph[step1.ph.length-1]?.armor?.[0]?.n||"—",s:step1.sub,a:step1.accent}],loadouts:Array.isArray(step1Clean.loadouts)&&step1Clean.loadouts.length>0?step1Clean.loadouts:null};

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
      setShowAdd(false);setAddText("");setAddUrl("");setAddCustomGameName("");setAddStep("");resetForms();
    }catch(e){
      let msg=e.message||"Unknown error";
      if(msg.toLowerCase().includes("stream idle timeout")||msg.toLowerCase().includes("partial response")){
        msg="API stream timed out — the response was too long. Try a more specific build description, or use Semi-AI mode with stat targets to reduce generation length.";
      }else if(msg.includes("exceeded_limit")||msg.includes("out_of_credits")||msg.includes("rate")){
        msg="You've hit your Claude usage limit for this window. Try again later or upgrade your plan.";
      }else if(msg.length>200){msg=msg.slice(0,200)+"... (Try a more specific request or different wording.)";}
      else{msg=msg+" Try a more specific request or different wording.";}
      setAddError(msg);setAddStep("");
    }finally{setAdding(false);}
  };

/* >>>CONTINUE<<< */
