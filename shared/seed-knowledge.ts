/**
 * seed-knowledge.ts
 *
 * Verified item facts sourced from:
 *   - Fextralife Dark Souls Wiki (darksouls.wiki.fextralife.com)
 *   - GamingBolt Lords of the Fallen 2023 weapon/armor guides
 *   - GamerGuides Lords of the Fallen 2023 accessories guide
 *   - PowerPyx Lords of the Fallen 2023 collectible checklists
 *
 * These are injected into the knowledge cache on first server startup so
 * the AI generation pipeline has real, verified item names from day one —
 * no Learn session required.
 *
 * Format matches KnowledgeFact interface in shared/types.ts.
 */

import type { KnowledgeFact } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// LORDS OF THE FALLEN (2023) — gameKey: "lotf"
// ─────────────────────────────────────────────────────────────────────────────

export const LOTF_SEED_FACTS: KnowledgeFact[] = [
  // ── WEAPONS: Axes ──────────────────────────────────────────────────────────
  { type: "WEAPON", name: "Byron's Shovel", raw: "WEAPON: Byron's Shovel | type:Axe | req:15 STR/11 AGI | Loc:Manse of the Hallowed Brothers" },
  { type: "WEAPON", name: "Fungus-Encrusted Pickaxe", raw: "WEAPON: Fungus-Encrusted Pickaxe | type:Axe | req:15 RAD/15 INF | Loc:Enslaved Miner rare drop" },
  { type: "WEAPON", name: "Grinning Axe", raw: "WEAPON: Grinning Axe | type:Axe | req:17 INF | Loc:Bramis Castle" },
  { type: "WEAPON", name: "Kinrangr Leader's Axe", raw: "WEAPON: Kinrangr Leader's Axe | type:Axe | req:12 STR/12 AGI | Loc:Fief of the Chill Curse" },
  { type: "WEAPON", name: "Marco's Axe", raw: "WEAPON: Marco's Axe | type:Axe | req:13 STR | Loc:Abandoned Redcopse — Marco the Axe drop" },
  { type: "WEAPON", name: "Pickaxe", raw: "WEAPON: Pickaxe | type:Axe | req:9 STR/9 AGI | Loc:Cistern" },
  { type: "WEAPON", name: "Purger Axe", raw: "WEAPON: Purger Axe | type:Axe | req:10 STR/10 AGI | Loc:Skyrest Bridge — purchase from Exacter Dunmire" },
  { type: "WEAPON", name: "Raw Mangler Axe", raw: "WEAPON: Raw Mangler Axe | type:Axe | req:13 INF | Loc:Raw Mangler drop / Pilgrim's Perch purchase from Damarose" },
  { type: "WEAPON", name: "Skinstealer Cleaver", raw: "WEAPON: Skinstealer Cleaver | type:Axe | req:15 STR/15 INF | Loc:Skinstealer drop" },
  { type: "WEAPON", name: "Splitting Axe", raw: "WEAPON: Splitting Axe | type:Axe | req:11 STR/13 AGI | Loc:Fief of the Chill Curse" },
  { type: "WEAPON", name: "Tassara's Axe", raw: "WEAPON: Tassara's Axe | type:Axe | req:12 STR | Loc:Abandoned Redcopse" },
  { type: "WEAPON", name: "Blackfeather Ranger Axe", raw: "WEAPON: Blackfeather Ranger Axe | type:Axe | req:10 STR/10 AGI | Loc:Forsaken Fen — Blackfeather Ranger drop" },
  { type: "WEAPON", name: "Angel's Axe", raw: "WEAPON: Angel's Axe | type:Grand Axe | req:20 STR | Loc:Abbey of the Hallowed Sisters" },

  // ── WEAPONS: Bows ──────────────────────────────────────────────────────────
  { type: "WEAPON", name: "Bow of the Mutilated", raw: "WEAPON: Bow of the Mutilated | type:Bow | req:13 STR/16 AGI | Loc:Fief of the Chill Curse" },
  { type: "WEAPON", name: "Defiled Infantry Bow", raw: "WEAPON: Defiled Infantry Bow | type:Bow | req:15 STR/15 AGI | Loc:Lower Calrath" },
  { type: "WEAPON", name: "Fungal Bowman Bow", raw: "WEAPON: Fungal Bowman Bow | type:Bow | req:10 STR/13 AGI | Loc:Fungal Bowman drop" },
  { type: "WEAPON", name: "Hallowed Bow", raw: "WEAPON: Hallowed Bow | type:Bow | req:8 STR/13 AGI | Loc:Pilgrim's Perch" },
  { type: "WEAPON", name: "Kinrangr Hunter Bow", raw: "WEAPON: Kinrangr Hunter Bow | type:Bow | req:13 STR/16 AGI | Loc:Kinrangr Hunter drop" },
  { type: "WEAPON", name: "Sin-Piercer Bow", raw: "WEAPON: Sin-Piercer Bow | type:Bow | req:18 AGI | Loc:Abbey of the Hallowed Sisters — purchase from Thehk-Ihir" },
  { type: "WEAPON", name: "Udirangr Shaman Bow", raw: "WEAPON: Udirangr Shaman Bow | type:Bow | req:13 STR/13 AGI | Loc:Fief of the Chill Curse" },

  // ── WEAPONS: Crossbows ─────────────────────────────────────────────────────
  { type: "WEAPON", name: "Marksman Crossbow", raw: "WEAPON: Marksman Crossbow | type:Crossbow | req:12 STR/12 AGI | Loc:Revelation Depths" },
  { type: "WEAPON", name: "Multi-Shot Crossbow", raw: "WEAPON: Multi-Shot Crossbow | type:Crossbow | req:22 STR | Loc:Abbey of the Hallowed Sisters" },
  { type: "WEAPON", name: "Partisan Crossbow", raw: "WEAPON: Partisan Crossbow | type:Crossbow | req:13 STR | Loc:Partisan equipment / Skyrest Bridge purchase from Gerlinde" },
  { type: "WEAPON", name: "Split Crossbow", raw: "WEAPON: Split Crossbow | type:Crossbow | req:19 STR | Loc:Lower Calrath" },
  { type: "WEAPON", name: "Trapper Crossbow", raw: "WEAPON: Trapper Crossbow | type:Crossbow | req:20 STR | Loc:Skyrest Bridge — purchase from Thehk-Ihir" },

  // ── WEAPONS: Daggers ───────────────────────────────────────────────────────
  { type: "WEAPON", name: "Extracter Dagger", raw: "WEAPON: Extracter Dagger | type:Dagger | req:11 AGI | Loc:Abandoned Redcopse" },
  { type: "WEAPON", name: "Final Whisper", raw: "WEAPON: Final Whisper | type:Dagger | req:13 AGI | Loc:Manse of the Hallowed Brothers" },
  { type: "WEAPON", name: "Fist of Insight", raw: "WEAPON: Fist of Insight | type:Fist | req:10 AGI | Loc:Pilgrim's Perch — purchase from Damarose the Marked" },
  { type: "WEAPON", name: "Fungal Bowman Dagger", raw: "WEAPON: Fungal Bowman Dagger | type:Dagger | req:11 AGI | Loc:Path of Devotion — purchase from Thehk-Ihir" },
  { type: "WEAPON", name: "Jeffrey's Dagger", raw: "WEAPON: Jeffrey's Dagger | type:Dagger | req:15 AGI | Loc:Tower of Penance" },
  { type: "WEAPON", name: "Kinrangr Hunter Dagger", raw: "WEAPON: Kinrangr Hunter Dagger | type:Dagger | req:9 STR/10 AGI | Loc:Kinrangr Hunter drop" },
  { type: "WEAPON", name: "Left-hand Lightreaper Dagger", raw: "WEAPON: Left-hand Lightreaper Dagger | type:Dagger | req:11 AGI/11 INF | Loc:Skyrest Bridge — purchase from Molhu" },
  { type: "WEAPON", name: "Reject's Blade", raw: "WEAPON: Reject's Blade | type:Dagger | req:11 AGI | Loc:Skyrest Bridge / Pilgrim's Perch" },
  { type: "WEAPON", name: "Shovel-Head", raw: "WEAPON: Shovel-Head | type:Fist | req:10 STR/9 AGI | Loc:Cistern" },
  { type: "WEAPON", name: "Talon", raw: "WEAPON: Talon | type:Dagger | req:9 STR/13 AGI | Loc:Fief of the Chill Curse" },

  // ── WEAPONS: Grand Hammers ─────────────────────────────────────────────────
  { type: "WEAPON", name: "Faithful Bludgeon", raw: "WEAPON: Faithful Bludgeon | type:Grand Hammer | req:28 STR | Loc:Skyrest Bridge" },
  { type: "WEAPON", name: "Nohuta Ritual Hammer", raw: "WEAPON: Nohuta Ritual Hammer | type:Grand Hammer | req:26 STR/26 RAD/26 INF | Loc:Fitzroy's Gorge — Umbral Tumor drop" },
  { type: "WEAPON", name: "Queen's Head Hammer", raw: "WEAPON: Queen's Head Hammer | type:Grand Hammer | req:26 STR/26 INF | Loc:Skyrest Bridge — purchase from Molhu" },
  { type: "WEAPON", name: "Righteous Pulveriser", raw: "WEAPON: Righteous Pulveriser | type:Grand Hammer | req:20 STR/26 RAD | Loc:Path of Devotion — purchase from Thehk-Ihir" },
  { type: "WEAPON", name: "Orian Preacher Hammer", raw: "WEAPON: Orian Preacher Hammer | type:Hammer | req:12 STR/10 RAD | Loc:Abandoned Redcopse" },
  { type: "WEAPON", name: "Precision Hammer", raw: "WEAPON: Precision Hammer | type:Hammer | req:11 STR/11 AGI | Loc:Pilgrim's Perch" },
  { type: "WEAPON", name: "Avowed Mace", raw: "WEAPON: Avowed Mace | type:Hammer | req:12 STR/8 RAD | Loc:Abandoned Redcopse" },

  // ── WEAPONS: Long Swords ───────────────────────────────────────────────────
  { type: "WEAPON", name: "Harrower Dervla's Sword", raw: "WEAPON: Harrower Dervla's Sword | type:Long Sword | req:29 STR/29 AGI | Loc:Skyrest Bridge — purchase from Molhu" },
  { type: "WEAPON", name: "Justice", raw: "WEAPON: Justice | type:Long Sword | req:34 STR/20 RAD | Loc:Revelation Depths" },
  { type: "WEAPON", name: "Luminous Abiding Defender Sword", raw: "WEAPON: Luminous Abiding Defender Sword | type:Long Sword | req:29 STR/29 RAD | Loc:Abiding Defender drop" },
  { type: "WEAPON", name: "Pale Butcher's Blade", raw: "WEAPON: Pale Butcher's Blade | type:Long Sword | req:25 STR/20 AGI | Loc:Forsaken Fen" },
  { type: "WEAPON", name: "Paladin Isaac's Sword", raw: "WEAPON: Paladin Isaac's Sword | type:Long Sword | req:18 STR/12 RAD | Loc:Reward from Paladin Isaac quest" },
  { type: "WEAPON", name: "Fitzroy's Sword", raw: "WEAPON: Fitzroy's Sword | type:Long Sword | req:14 STR/14 AGI | Loc:Fitzroy's Gorge" },
  { type: "WEAPON", name: "Broken Sword", raw: "WEAPON: Broken Sword | type:Short Sword | req:8 STR/8 AGI | Loc:Abandoned Redcopse — starting area" },
  { type: "WEAPON", name: "Bloodletter", raw: "WEAPON: Bloodletter | type:Short Sword | req:10 STR/12 AGI | Loc:Abandoned Redcopse" },
  { type: "WEAPON", name: "Sin-Piercer Sword", raw: "WEAPON: Sin-Piercer Sword | type:Short Sword | req:10 AGI | Loc:Pilgrim's Perch" },

  // ── WEAPONS: Grand Swords ──────────────────────────────────────────────────
  { type: "WEAPON", name: "Hallowed Condemnation", raw: "WEAPON: Hallowed Condemnation | type:Grand Sword | req:10 STR/10 INF | Loc:Abandoned Redcopse" },
  { type: "WEAPON", name: "Hallowed Knight Sword", raw: "WEAPON: Hallowed Knight Sword | type:Grand Sword | req:12 STR/8 AGI | Loc:Hallowed Knight equipment / Skyrest Bridge purchase from Stomund" },
  { type: "WEAPON", name: "Hallowed Praise", raw: "WEAPON: Hallowed Praise | type:Grand Sword | req:12 AGI | Loc:Pilgrim's Perch" },
  { type: "WEAPON", name: "Elianne the Starved's Sword", raw: "WEAPON: Elianne the Starved's Sword | type:Grand Sword | req:20 RAD/20 INF | Loc:Skyrest Bridge — purchase from Molhu" },
  { type: "WEAPON", name: "Right-hand Bringer of Stillness Sword", raw: "WEAPON: Right-hand Bringer of Stillness Sword | type:Grand Sword | req:12 AGI | Loc:Cistern — Bringer of Stillness boss drop" },
  { type: "WEAPON", name: "Left-hand Bringer of Stillness Sword", raw: "WEAPON: Left-hand Bringer of Stillness Sword | type:Grand Sword | req:12 AGI | Loc:Cistern — Bringer of Stillness boss drop" },
  { type: "WEAPON", name: "Devoted Chopper", raw: "WEAPON: Devoted Chopper | type:Grand Sword | req:8 STR/8 AGI | Loc:Sunless Skein" },

  // ── WEAPONS: Polearms & Spears ─────────────────────────────────────────────
  { type: "WEAPON", name: "Conflagrant Seer Staff", raw: "WEAPON: Conflagrant Seer Staff | type:Polearm | req:20 INF | Loc:Conflagrant Seer drop" },
  { type: "WEAPON", name: "Duty's Chime", raw: "WEAPON: Duty's Chime | type:Polearm | req:18 STR/16 AGI | Loc:Manse of the Hallowed Brothers" },
  { type: "WEAPON", name: "Nohuta Polearm", raw: "WEAPON: Nohuta Polearm | type:Polearm | req:20 RAD/20 INF | Loc:Sunless Skein — Umbral Belly drop" },
  { type: "WEAPON", name: "Old Mournstead Pike", raw: "WEAPON: Old Mournstead Pike | type:Polearm | req:14 STR/14 AGI | Loc:Skyrest Bridge — purchase from Stomund, Captain of the Fidelis" },
  { type: "WEAPON", name: "Putrid Polearm", raw: "WEAPON: Putrid Polearm | type:Polearm | req:15 STR/15 AGI/15 RAD/15 INF | Loc:Fief of the Chill Curse — Umbral Belly drop" },
  { type: "WEAPON", name: "Radiant Purifier Polearm", raw: "WEAPON: Radiant Purifier Polearm | type:Polearm | req:9 STR/15 RAD | Loc:Abbey of the Hallowed Sisters — purchase from Stomund" },
  { type: "WEAPON", name: "Shuja Warrior Spear", raw: "WEAPON: Shuja Warrior Spear | type:Spear | req:8 STR/12 AGI | Loc:Forsaken Fen — purchase from Thehk-Ihir / Shuja Warrior drop" },
  { type: "WEAPON", name: "Skinstealer Spear", raw: "WEAPON: Skinstealer Spear | type:Spear | req:17 AGI | Loc:Skinstealer drop / Lower Calrath" },
  { type: "WEAPON", name: "Veil-Piercer", raw: "WEAPON: Veil-Piercer | type:Spear | req:9 STR/9 AGI/11 RAD/11 INF | Loc:Sunless Skein" },
  { type: "WEAPON", name: "Overseer's Halberd", raw: "WEAPON: Overseer's Halberd | type:Polearm | req:16 STR/15 AGI | Loc:Tower of Penance" },

  // ── CATALYSTS ──────────────────────────────────────────────────────────────
  { type: "CATALYST", name: "Wilmarc's Catalyst", raw: "CATALYST: Wilmarc's Catalyst | type:Radiant catalyst | req:18 RAD | Loc:Forsaken Fen — behind Kukajin after casting Sanctify" },
  { type: "CATALYST", name: "Abbess Chalice", raw: "CATALYST: Abbess Chalice | type:Radiant catalyst | req:22 RAD | Loc:Abbey of the Hallowed Sisters — Abbess drop / The Empyrean Abbess drop" },
  { type: "CATALYST", name: "Exacter Scripture", raw: "CATALYST: Exacter Scripture | type:Radiant catalyst | req:25 RAD | Loc:Upper Calrath" },
  { type: "CATALYST", name: "Radiant Purifier Catalyst", raw: "CATALYST: Radiant Purifier Catalyst | type:Radiant catalyst | req:15 RAD | Loc:Tower of Penance" },

  // ── RINGS ──────────────────────────────────────────────────────────────────
  { type: "RING", name: "Adyr's Mark Ring", raw: "RING: Adyr's Mark Ring | Effect:+3 Inferno attribute | Loc:Lower Calrath — top of burning building after Lydia the Numb Witch Vestige" },
  { type: "RING", name: "Blackfeather Ranger Ring", raw: "RING: Blackfeather Ranger Ring | Effect:Deal additional damage with bows and crossbows | Loc:Skyrest Bridge — start as Blackfeather Ranger or purchase from Gerlinde for 500 Vigor" },
  { type: "RING", name: "Bloodbane Ring", raw: "RING: Bloodbane Ring | Effect:Inflicting poison simultaneously inflicts bleed buildup | Loc:Forsaken Fogfen — hut past Vestige of the Pale Butcher" },
  { type: "RING", name: "Brawn Ring", raw: "RING: Brawn Ring | Effect:+3 Strength attribute | Loc:Belled Rise — circular room with Radiant Swordsmen" },
  { type: "RING", name: "Charred Root", raw: "RING: Charred Root | Effect:Cast Inferno Sorceries with a non-Inferno catalyst | Loc:Skyrest Bridge — purchase from Molhu for 10 Umbral Scouring" },
  { type: "RING", name: "Cursewyrm Ring", raw: "RING: Cursewyrm Ring | Effect:+1 Strength and Agility | Loc:Forsaken Fogfen — hidden behind breakable vines next to Valade Vestige" },
  { type: "RING", name: "Defiance Ring", raw: "RING: Defiance Ring | Effect:+20 resistance to all status effects | Loc:Pilgrim's Perch Bellroom — chest behind Soul Flay wall" },
  { type: "RING", name: "Glacier Ring", raw: "RING: Glacier Ring | Effect:+50 Frostbite resistance | Loc:Fief of the Chill Curse — corpse at edge of plank" },
  { type: "RING", name: "Grievous Ring", raw: "RING: Grievous Ring | Effect:Regain health and Soulflay charge on Grievous Strike | Loc:Lower Calrath — behind house near Sebastian Vestige, must be in Umbral" },
  { type: "RING", name: "Holy Blood Ring", raw: "RING: Holy Blood Ring | Effect:+100 Bleed resistance | Loc:Pilgrim's Perch — Soul Flay corpse in Umbral Realm" },
  { type: "RING", name: "Magma Ring", raw: "RING: Magma Ring | Effect:+50 Ignite resistance | Loc:Lower Calrath — inside the Burning City near large pot" },
  { type: "RING", name: "Mineowner's Ring", raw: "RING: Mineowner's Ring | Effect:Increases max Stamina and Stamina regen rate | Loc:Abandoned Redcopse — enter Umbral after Marco the Axe Vestige, hanging corpse in stone house" },
  { type: "RING", name: "Mother's Watch", raw: "RING: Mother's Watch | Effect:Increase resistance to Dread | Loc:Skyrest Bridge — purchase from Molhu for 3000 Vigor" },
  { type: "RING", name: "Nimble Ring", raw: "RING: Nimble Ring | Effect:+3 Agility attribute | Loc:Revelation Depths" },
  { type: "RING", name: "Panoptic Ring", raw: "RING: Panoptic Ring | Effect:+1 Radiance and Inferno | Loc:Forsaken Fogfen — hanging off tree past Vestige of the Pale Butcher, shoot it down" },
  { type: "RING", name: "Queen Verena II's Ring", raw: "RING: Queen Verena II's Ring | Effect:Health regenerates over time | Loc:Rare drop / questline reward" },
  { type: "RING", name: "Ring of Bones", raw: "RING: Ring of Bones | Effect:+20 maximum equip load | Loc:Sunless Skein — corpse in large water area, drain water via Umbral lever" },
  { type: "RING", name: "Ring of Brilliant Protection", raw: "RING: Ring of Brilliant Protection | Effect:+50 Smite resistance | Loc:Forsaken Fogfen — hanging off tree past Vestige of the Pale Butcher" },
  { type: "RING", name: "Ring of Duty", raw: "RING: Ring of Duty | Effect:+1 Vitality and Endurance | Loc:Skyrest Bridge — purchase from Stomund for 3000 Vigor" },
  { type: "RING", name: "Ring of Night's Fire", raw: "RING: Ring of Night's Fire | Effect:Deal additional Fire and Wither damage | Loc:Fitzroy's Gorge — courtyard by mossy gravestones after Ruiner Boss Fight" },
  { type: "RING", name: "Ring of Nourishment", raw: "RING: Ring of Nourishment | Effect:Regain health upon killing an enemy | Loc:Lower Calrath — outer side of bridge to Spurned Progeny boss" },
  { type: "RING", name: "Ring of Radiant Preeminence", raw: "RING: Ring of Radiant Preeminence | Effect:Cast Radiant Sorceries with a non-Radiant catalyst | Loc:Fitzroy's Gorge" },
  { type: "RING", name: "Ring of the First of the Beasts", raw: "RING: Ring of the First of the Beasts | Effect:+3 Endurance | Loc:Sunless Skein — along one of the mine tracks" },
  { type: "RING", name: "Shuja Harmony Hoop", raw: "RING: Shuja Harmony Hoop | Effect:After each spell cast, further spells deal increased damage; stacks across magic schools | Loc:Forsaken Fen — Umbral ladder past Valade Vestige shortcut" },
  { type: "RING", name: "Unblinking Root", raw: "RING: Unblinking Root | Effect:Cast Umbral Sorceries with a non-Umbral catalyst | Loc:Sunless Skein cistern — corpse against barred window near shortcut ladder" },
  { type: "RING", name: "Verdure Ring", raw: "RING: Verdure Ring | Effect:+100 Poison resistance | Loc:Forsaken Fen area" },
  { type: "RING", name: "Vessel Root", raw: "RING: Vessel Root | Effect:+15 maximum mana | Loc:Upper Calrath — corpse on tree in center of ashen town past the Enchantress" },
  { type: "RING", name: "Princess' Sting", raw: "RING: Princess' Sting | Effect:Deal additional damage with smaller equip load | Loc:Skyrest Bridge — hidden wall at bottom of stairs in closed-off part of Hub" },
  { type: "RING", name: "Manastone Ring", raw: "RING: Manastone Ring | Effect:Slowly regenerates mana | Loc:Skyrest Bridge — purchase from Molhu" },
  { type: "RING", name: "Puissance Root", raw: "RING: Puissance Root | Effect:Increases power of sorceries | Loc:Skyrest Bridge — purchase from Tortured Prisoner after saving her" },
  { type: "RING", name: "Rhogar's Delight", raw: "RING: Rhogar's Delight | Effect:Increase fire damage and fire defense | Loc:Skyrest Bridge — purchase from Tortured Prisoner after saving her" },
  { type: "RING", name: "Scornful Effigy", raw: "RING: Scornful Effigy | Effect:Reduce health by half for increased damage | Loc:Lower Calrath — Umbral path towards mining district near Doln Vestige" },
  { type: "RING", name: "Relic of Perpetuation", raw: "RING: Relic of Perpetuation | Effect:+50 health | Loc:Pilgrim's Perch — chest via Umbral, past Blind Agatha Vestige" },

  // ── PENDANTS (treated as RING type) ───────────────────────────────────────
  { type: "RING", name: "Cavalry Pendant", raw: "RING/Pendant: Cavalry Pendant | Effect:Reduce cost of Shout and Buff Sorceries | Loc:Skyrest Bridge — through Upper Calrath, destroy Umbral Belly to open door" },
  { type: "RING", name: "Empyrean Pendant", raw: "RING/Pendant: Empyrean Pendant | Effect:Increase Holy damage and Holy defense | Loc:Skyrest Bridge — purchase from Exacter Dunmire for 4500 Vigor" },
  { type: "RING", name: "Faceless Carving", raw: "RING/Pendant: Faceless Carving | Effect:Increase Wither damage and Wither defense | Loc:Skyrest Bridge — purchase from Molhu for 4500 Vigor" },
  { type: "RING", name: "Hallowed Triptych", raw: "RING/Pendant: Hallowed Triptych | Effect:Holy damage deals additional posture damage | Loc:Manse of the Hallowed Brothers — rooftop chest requiring Umbral traversal" },
  { type: "RING", name: "Inner Serpent Pendant", raw: "RING/Pendant: Inner Serpent Pendant | Effect:Dodging reloads your crossbow automatically | Loc:Manse of the Hallowed Brothers — rafters via Umbral wall" },
  { type: "RING", name: "Paladin's Pendant", raw: "RING/Pendant: Paladin's Pendant | Effect:+3 Strength and +3 Endurance | Loc:Starting equipment of Dark Crusader class / Paladin Isaac quest" },
  { type: "RING", name: "Pendant of Burden", raw: "RING/Pendant: Pendant of Burden | Effect:Deal additional damage for every status effect inflicted | Loc:Forsaken Fen — chest near Shuja Warriors bonfire after Pale Butcher Vestige" },
  { type: "RING", name: "Pendant of Induration", raw: "RING/Pendant: Pendant of Induration | Effect:+50 physical defense | Loc:Forsaken Fen — reward from Kukajin after casting Sanctify on her" },
  { type: "RING", name: "Scornful Effigy", raw: "RING/Pendant: Scornful Effigy | Effect:Reduce health by half for increased damage | Loc:Lower Calrath Umbral" },
  { type: "RING", name: "Unbridled Focus", raw: "RING/Pendant: Unbridled Focus | Effect:Reduce mana cost of channeled and aura sorceries | Loc:Abbey of the Hallowed Sisters — rooftop via Umbral platforms" },

  // ── ARMOR SETS ─────────────────────────────────────────────────────────────
  { type: "ARMOR", name: "Abiding Defender Set", raw: "ARMOR: Abiding Defender Set | Loc:Manse of the Hallowed Brothers — Abiding Defender enemy drop" },
  { type: "ARMOR", name: "Byron's Set", raw: "ARMOR: Byron's Set | Loc:Manse of the Hallowed Brothers area" },
  { type: "ARMOR", name: "Calrath Guardsman Set", raw: "ARMOR: Calrath Guardsman Set | Loc:Lower Calrath — Calrath Guardsman drops" },
  { type: "ARMOR", name: "Carrion Knight Set", raw: "ARMOR: Carrion Knight Set | Loc:Tower of Penance — Carrion Knight enemy drop" },
  { type: "ARMOR", name: "Condemned Set", raw: "ARMOR: Condemned Set | Loc:Various areas — Condemned enemy drops" },
  { type: "ARMOR", name: "Corrupted Pilgrim Set", raw: "ARMOR: Corrupted Pilgrim Set | Loc:Abandoned Redcopse — Corrupted Pilgrim random drop" },
  { type: "ARMOR", name: "Crimson Rector Set", raw: "ARMOR: Crimson Rector Set | Loc:Fitzroy's Gorge — Crimson Rector Percival boss drop" },
  { type: "ARMOR", name: "Damarose's Set", raw: "ARMOR: Damarose's Set | Loc:Pilgrim's Perch — Damarose the Marked NPC" },
  { type: "ARMOR", name: "Drustan's Set", raw: "ARMOR: Drustan's Set | Loc:Upper Calrath area" },
  { type: "ARMOR", name: "Exacter Set", raw: "ARMOR: Exacter Set | Loc:Reward for The Price of Knowledge Quest" },
  { type: "ARMOR", name: "Fitzroy's Set", raw: "ARMOR: Fitzroy's Set | Loc:Fitzroy's Gorge" },
  { type: "ARMOR", name: "Hallowed Knight Set", raw: "ARMOR: Hallowed Knight Set | Loc:Hallowed Knight enemy drop / Skyrest Bridge purchase from Stomund" },
  { type: "ARMOR", name: "Harrower Set", raw: "ARMOR: Harrower Set | Loc:Forsaken Fen — Harrower enemy drops" },
  { type: "ARMOR", name: "Iron Wayfarer's Set", raw: "ARMOR: The Iron Wayfarer's Set | Loc:Reward for The Last Step Quest" },
  { type: "ARMOR", name: "Iselle's Set", raw: "ARMOR: Iselle's Set | Loc:Adyr Ending reward" },
  { type: "ARMOR", name: "Kinrangr Guardian Set", raw: "ARMOR: Kinrangr Guardian Set | Loc:Fief of the Chill Curse — Kinrangr Guardian drop" },
  { type: "ARMOR", name: "Kinrangr Hunter Set", raw: "ARMOR: Kinrangr Hunter Set | Loc:Fief of the Chill Curse — Kinrangr Hunter drop" },
  { type: "ARMOR", name: "Kukajin's Set", raw: "ARMOR: Kukajin's Set | Loc:Reward for A Trace of Venom Quest" },
  { type: "ARMOR", name: "Lightreaper's Set", raw: "ARMOR: Lightreaper's Set | Loc:Skyrest Bridge — purchase from Molhu" },
  { type: "ARMOR", name: "Paladin Set", raw: "ARMOR: Paladin Set | Loc:Reward for Paladin Isaac's Quest" },
  { type: "ARMOR", name: "Pilgrim Garb", raw: "ARMOR: Pilgrim Garb | Loc:Abandoned Redcopse Part 1" },
  { type: "ARMOR", name: "Radiant Purifier Set", raw: "ARMOR: Radiant Purifier Set | Loc:Tower of Penance area" },
  { type: "ARMOR", name: "Sacred Resonance Set", raw: "ARMOR: Sacred Resonance Set | Loc:Abbey of the Hallowed Sisters area" },
  { type: "ARMOR", name: "Scourged Sister Set", raw: "ARMOR: Scourged Sister Set | Loc:Skyrest Bridge — Scourged Sister random drop" },
  { type: "ARMOR", name: "Shuja Strider Set", raw: "ARMOR: Shuja Strider Set | Loc:Forsaken Fen — Shuja Strider drop" },
  { type: "ARMOR", name: "Shuja Warrior Set", raw: "ARMOR: Shuja Warrior Set | Loc:Forsaken Fen — Shuja Warrior drop" },
  { type: "ARMOR", name: "Skinstealer Set", raw: "ARMOR: Skinstealer Set | Loc:Sunless Skein — Skinstealer drop" },
  { type: "ARMOR", name: "Sovereign Protector Set", raw: "ARMOR: Sovereign Protector Set | Loc:Sunless Skein area" },
  { type: "ARMOR", name: "Stomund's Set", raw: "ARMOR: Stomund's Set | Loc:Skyrest Bridge — questline with Stomund" },
  { type: "ARMOR", name: "Tancred's Set", raw: "ARMOR: Tancred's Set | Loc:Upper Calrath / boss area" },
  { type: "ARMOR", name: "Udirangr Warwolf Set", raw: "ARMOR: Udirangr Warwolf Set | Loc:Forsaken Fen — Udirangr Warwolf drop" },

  // ── BUILD: Bosses & key progression ───────────────────────────────────────
  { type: "BUILD", name: "Pieta, She of Blessed Renewal", raw: "BUILD: Pieta, She of Blessed Renewal | type:Boss | Loc:Skyrest Bridge — first major boss | drops:Pieta's Sword, Blessed Reunion" },
  { type: "BUILD", name: "Spurned Progeny", raw: "BUILD: Spurned Progeny | type:Boss | Loc:Lower Calrath / Calrath Slums | drops:Vestige of Spurned" },
  { type: "BUILD", name: "Bringer of Stillness", raw: "BUILD: Bringer of Stillness | type:Boss | Loc:Cistern | drops:Left/Right-hand Bringer of Stillness Sword" },
  { type: "BUILD", name: "Crimson Rector Percival", raw: "BUILD: Crimson Rector Percival | type:Boss | Loc:Fitzroy's Gorge | drops:Crimson Rector Set pieces" },
  { type: "BUILD", name: "Pale Butcher", raw: "BUILD: Pale Butcher | type:Boss | Loc:Forsaken Fen — end of area | drops:Pale Butcher's Blade" },
  { type: "BUILD", name: "Ruiner", raw: "BUILD: Ruiner | type:Boss | Loc:Fitzroy's Gorge — courtyard | drops:various" },
  { type: "BUILD", name: "Skinstealer", raw: "BUILD: Skinstealer | type:Boss | Loc:Sunless Skein | drops:Skinstealer Cleaver, Skinstealer Spear, Skinstealer Set" },
  { type: "BUILD", name: "Abbess", raw: "BUILD: Abbess | type:Boss | Loc:Abbey of the Hallowed Sisters / The Empyrean | drops:Abbess Chalice" },
  { type: "BUILD", name: "Lightreaper", raw: "BUILD: Lightreaper | type:Recurring Boss | Loc:Multiple encounters throughout Mournstead | drops:Lightreaper Set, Left-hand Lightreaper Dagger" },
];

// ─────────────────────────────────────────────────────────────────────────────
// DARK SOULS 1 / REMASTERED — gameKey: "ds1"
// ─────────────────────────────────────────────────────────────────────────────

export const DS1_SEED_FACTS: KnowledgeFact[] = [
  // ── WEAPONS: Straight Swords ──────────────────────────────────────────────
  { type: "WEAPON", name: "Long Sword", raw: "WEAPON: Long Sword | type:Straight Sword | AP:200(+15) | Loc:Undead Burg merchant / Undead Parish merchant Undead Male Merchant | Up:Standard/Lightning/Fire/Magic/Divine/Occult/Chaos/Enchanted/Crystal/Raw" },
  { type: "WEAPON", name: "Balder Side Sword", raw: "WEAPON: Balder Side Sword | type:Straight Sword | AP:195(+15) | Loc:Undead Parish — rare drop from Balder Knight | Up:Standard/Lightning/Fire/Magic/Divine/Occult" },
  { type: "WEAPON", name: "Drake Sword", raw: "WEAPON: Drake Sword | type:Straight Sword | AP:200(unique) | Loc:Undead Burg — cut off Hellkite Dragon tail | Up:Cannot be upgraded normally" },
  { type: "WEAPON", name: "Darkmoon Blade", raw: "WEAPON: Darkmoon Blade | type:Straight Sword (Miracle buff) | Loc:Anor Londo — reward for rank 1 Darkmoon Blades covenant | Up:Unique miracle, not a weapon" },
  { type: "WEAPON", name: "Painting Guardian Sword", raw: "WEAPON: Painting Guardian Sword | type:Curved Sword | AP:184(+15) | Loc:Anor Londo — rare drop from Painting Guardian | Up:Standard/Lightning/Fire/Enchanted" },
  { type: "WEAPON", name: "Dark Silver Tracer", raw: "WEAPON: Dark Silver Tracer | type:Dagger | AP:220(+5) | Loc:Royal Wood (AotA DLC) — kill/drop from Knight Artorias area | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Gold Tracer", raw: "WEAPON: Gold Tracer | type:Curved Sword | AP:130(+5) | status:Bleed 33 | Loc:Royal Wood (AotA DLC) — purchase from Marvelous Chester or drop | Up:Cannot upgrade" },

  // ── WEAPONS: Greatswords ──────────────────────────────────────────────────
  { type: "WEAPON", name: "Claymore", raw: "WEAPON: Claymore | type:Greatsword | AP:230(+15) | Loc:Undead Burg — on bridge near Hellkite Dragon (body) | Up:Standard/Lightning/Fire/Magic/Divine/Occult/Crystal" },
  { type: "WEAPON", name: "Zweihander", raw: "WEAPON: Zweihander | type:Ultra Greatsword | AP:330(+15) | Loc:Firelink Shrine — on body near skeleton at the bottom | Up:Standard/Lightning/Fire/Magic/Divine/Occult" },
  { type: "WEAPON", name: "Moonlight Greatsword", raw: "WEAPON: Moonlight Greatsword | type:Greatsword | AP:320(+5) magic | Loc:The Duke's Archives — cut Seath the Scaleless tail | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Abyss Greatsword", raw: "WEAPON: Abyss Greatsword | type:Greatsword | AP:312(+5) | Loc:Oolacile Township (AotA DLC) — defeat Knight Artorias | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Black Knight Greatsword", raw: "WEAPON: Black Knight Greatsword | type:Ultra Greatsword | AP:345(+5) | Loc:Undead Burg/Kiln of the First Flame — rare drop from Black Knight | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Man-Serpent Greatsword", raw: "WEAPON: Man-Serpent Greatsword | type:Greatsword | AP:270(+15) | Loc:Sen's Fortress — drop from Man-serpent enemies | Up:Standard/Lightning/Fire/Magic" },
  { type: "WEAPON", name: "Greatsword of Artorias", raw: "WEAPON: Greatsword of Artorias | type:Greatsword | AP:360(+5) scaling | Loc:Anor Londo — Giant Blacksmith, transpose Broken Straight Sword/Straight Sword Hilt with Soul of Sif | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Chaos Blade", raw: "WEAPON: Chaos Blade | type:Katana | AP:290(+5) | status:Bleed | Loc:Giant Blacksmith Anor Londo — transpose with Soul of Quelaag | Up:Cannot upgrade" },

  // ── WEAPONS: Katanas ──────────────────────────────────────────────────────
  { type: "WEAPON", name: "Uchigatana", raw: "WEAPON: Uchigatana | type:Katana | AP:253(+15) | status:Bleed 33 | Loc:Undead Burg — kill Undead Merchant (male) or drop | Up:Standard/Lightning/Fire/Magic/Enchanted/Chaos/Crystal" },
  { type: "WEAPON", name: "Iaito", raw: "WEAPON: Iaito | type:Katana | AP:247(+15) | status:Bleed 33 | Loc:Blighttown — lower area, chest on wooden platform | Up:Standard/Lightning/Fire/Magic" },
  { type: "WEAPON", name: "Washing Pole", raw: "WEAPON: Washing Pole | type:Katana | AP:260(+15) | status:Bleed 33 | Loc:Sen's Fortress — purchase from Crestfallen Merchant | Up:Standard/Lightning/Fire/Magic" },

  // ── WEAPONS: Axes & Hammers ───────────────────────────────────────────────
  { type: "WEAPON", name: "Battle Axe", raw: "WEAPON: Battle Axe | type:Axe | AP:200(+15) | Loc:Undead Burg — shop / starting equipment pyromancer | Up:Standard/Lightning/Fire/Magic/Divine/Occult" },
  { type: "WEAPON", name: "Hand Axe", raw: "WEAPON: Hand Axe | type:Axe | AP:170(+15) | Loc:Firelink Shrine — crestfallen merchant | Up:Standard/Lightning/Fire/Magic" },
  { type: "WEAPON", name: "Greataxe", raw: "WEAPON: Greataxe | type:Great Axe | AP:380(+15) | Loc:Purchased from Undead Merchant / various drops | Up:Standard/Lightning/Fire" },
  { type: "WEAPON", name: "Black Knight Greataxe", raw: "WEAPON: Black Knight Greataxe | type:Great Axe | AP:420(+5) | Loc:Undead Burg/Parish — rare drop from Black Knight | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Demon's Greataxe", raw: "WEAPON: Demon's Greataxe | type:Great Axe | AP:570(+5) | Loc:Undead Burg — drop from Stray Demon boss | Up:Unique path" },
  { type: "WEAPON", name: "Mace", raw: "WEAPON: Mace | type:Hammer | AP:198(+15) | Loc:Firelink Shrine / starting class Cleric | Up:Standard/Lightning/Fire/Magic/Divine/Occult" },
  { type: "WEAPON", name: "Smough's Hammer", raw: "WEAPON: Smough's Hammer | type:Great Hammer | AP:400(+5) | Loc:Anor Londo — Giant Blacksmith, transpose with Soul of Smough | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Great Club", raw: "WEAPON: Great Club | type:Great Hammer | AP:330(+15) | Loc:Sen's Fortress — drop from Rock Golems / purchased | Up:Standard/Lightning/Fire" },

  // ── WEAPONS: Spears & Halberds ────────────────────────────────────────────
  { type: "WEAPON", name: "Spear", raw: "WEAPON: Spear | type:Spear | AP:180(+15) | Loc:Undead Burg — shop | Up:Standard/Lightning/Fire/Magic/Divine/Occult" },
  { type: "WEAPON", name: "Silver Knight Spear", raw: "WEAPON: Silver Knight Spear | type:Spear | AP:280(+5) | Loc:Anor Londo — rare drop from Silver Knight (spear variant) | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Dragonslayer Spear", raw: "WEAPON: Dragonslayer Spear | type:Spear | AP:280(+5) lightning | Loc:Anor Londo — transpose with Soul of Ornstein | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Halberd", raw: "WEAPON: Halberd | type:Halberd | AP:235(+15) | Loc:Undead Parish — purchased or starting equipment Knight | Up:Standard/Lightning/Fire/Magic/Divine/Occult" },
  { type: "WEAPON", name: "Black Knight Halberd", raw: "WEAPON: Black Knight Halberd | type:Halberd | AP:380(+5) | Loc:Darkroot Basin — rare drop from Black Knight | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Great Scythe", raw: "WEAPON: Great Scythe | type:Scythe | AP:225(+15) | status:Bleed 33 | Loc:The Catacombs — chest near Pinwheel boss fog | Up:Standard/Lightning/Fire/Magic" },
  { type: "WEAPON", name: "Channeler's Trident", raw: "WEAPON: Channeler's Trident | type:Spear | AP:200(+10) | Loc:Undead Parish / Duke's Archives — drop from Channeler enemies | Up:Unique path" },
  { type: "WEAPON", name: "Demon's Spear", raw: "WEAPON: Demon's Spear | type:Spear | AP:250(+5) lightning | Loc:Sen's Fortress — top of tower drop from flying gargoyles | Up:Cannot upgrade" },

  // ── WEAPONS: Curved swords ────────────────────────────────────────────────
  { type: "WEAPON", name: "Falchion", raw: "WEAPON: Falchion | type:Curved Sword | AP:220(+15) | status:Bleed 33 | Loc:New Londo Ruins — on a corpse | Up:Standard/Lightning/Fire/Magic/Enchanted" },
  { type: "WEAPON", name: "Shotel", raw: "WEAPON: Shotel | type:Curved Sword | AP:220(+15) | status:Bleed 33 | Loc:Sen's Fortress — purchase from Crestfallen Merchant | Up:Standard/Lightning/Fire" },
  { type: "WEAPON", name: "Murakumo", raw: "WEAPON: Murakumo | type:Curved Greatsword | AP:330(+15) | status:Bleed 33 | Loc:Undead Asylum (revisit) / dark moon knightess drop | Up:Standard/Lightning/Fire/Magic" },
  { type: "WEAPON", name: "Quelaag's Furysword", raw: "WEAPON: Quelaag's Furysword | type:Curved Sword | AP:variations with Humanity | Loc:Giant Blacksmith Anor Londo — transpose with Soul of Quelaag | Up:Cannot upgrade" },

  // ── WEAPONS: Daggers ──────────────────────────────────────────────────────
  { type: "WEAPON", name: "Dagger", raw: "WEAPON: Dagger | type:Dagger | AP:156(+15) | status:Bleed 33 | Loc:Undead Burg — starting equipment Thief, shop | Up:Standard/Lightning/Fire/Magic/Divine/Occult/Enchanted/Chaos/Crystal" },
  { type: "WEAPON", name: "Bandit's Knife", raw: "WEAPON: Bandit's Knife | type:Dagger | AP:175(+15) | status:Bleed 48 | Loc:Undead Burg — starting equipment Bandit | Up:Standard/Lightning/Fire/Magic/Enchanted/Chaos" },
  { type: "WEAPON", name: "Ghost Blade", raw: "WEAPON: Ghost Blade | type:Dagger | AP:200(cannot upgrade) | Loc:New Londo Ruins — drop from Ghost enemies | Up:Cannot upgrade" },
  { type: "WEAPON", name: "Rapier", raw: "WEAPON: Rapier | type:Piercing Sword | AP:220(+15) | Loc:New Londo Ruins — Ingward NPC shop | Up:Standard/Lightning/Fire/Magic/Enchanted/Chaos" },
  { type: "WEAPON", name: "Estoc", raw: "WEAPON: Estoc | type:Piercing Sword | AP:220(+15) | Loc:Undead Burg — purchased from Undead Merchant / starting equipment | Up:Standard/Lightning/Fire/Magic/Enchanted" },

  // ── WEAPONS: Bows & Ranged ────────────────────────────────────────────────
  { type: "WEAPON", name: "Short Bow", raw: "WEAPON: Short Bow | type:Bow | AP:50(+15) | Loc:Undead Burg — starting equipment Hunter, shop | Up:Standard/Lightning/Fire/Magic" },
  { type: "WEAPON", name: "Black Bow of Pharis", raw: "WEAPON: Black Bow of Pharis | type:Bow | AP:56(+15) | Loc:Darkroot Garden — drop from Pharis | Up:Standard/Lightning/Fire/Magic" },
  { type: "WEAPON", name: "Longbow", raw: "WEAPON: Longbow | type:Bow | AP:55(+15) | Loc:Undead Burg — Undead Merchant shop / starting equipment | Up:Standard/Lightning/Fire/Magic" },
  { type: "WEAPON", name: "Dragonslayer Greatbow", raw: "WEAPON: Dragonslayer Greatbow | type:Greatbow | AP:120(+5) | Loc:Anor Londo — drop from Painting Guardian or Giant (anor londo giants) area | Up:Cannot upgrade" },

  // ── CATALYSTS (Staves/Flames) ─────────────────────────────────────────────
  { type: "CATALYST", name: "Sorcerer's Catalyst", raw: "CATALYST: Sorcerer's Catalyst | type:Sorcery Staff | spell buff:+100 | Loc:Undead Burg — starting equipment Sorcerer | Up:+15 standard" },
  { type: "CATALYST", name: "Oolacile Catalyst", raw: "CATALYST: Oolacile Catalyst | type:Sorcery Staff (Oolacile) | Loc:Oolacile Township (AotA DLC) — drop from Oolacile Sorcerer | Up:+5 special" },
  { type: "CATALYST", name: "Logan's Catalyst", raw: "CATALYST: Logan's Catalyst | type:Sorcery Staff | spell buff:+264 | Loc:The Duke's Archives — drop from Big Hat Logan after he goes hollow | Up:Cannot upgrade" },
  { type: "CATALYST", name: "Tin Crystallization Catalyst", raw: "CATALYST: Tin Crystallization Catalyst | type:Sorcery Staff | spell buff:+300 but halves castings | Loc:The Duke's Archives — drop from Big Hat Logan | Up:Cannot upgrade" },
  { type: "CATALYST", name: "Pyromancy Flame", raw: "CATALYST: Pyromancy Flame | type:Pyromancy | spell buff:scales with upgrades | Loc:Starting equipment Pyromancer / purchase from Laurentius | Up:+15 via Laurentius then Quelana" },
  { type: "CATALYST", name: "Talisman", raw: "CATALYST: Talisman | type:Miracle talisman | spell buff:+100 | Loc:Firelink Shrine — starting equipment Cleric / shop | Up:+15 standard" },
  { type: "CATALYST", name: "Ivory Talisman", raw: "CATALYST: Ivory Talisman | type:Miracle talisman | Loc:Anor Londo — Gwynevere drops / Darkmoon Seance Ring area | Up:Cannot upgrade" },
  { type: "CATALYST", name: "Canvas Talisman", raw: "CATALYST: Canvas Talisman | type:Miracle talisman | spell buff:highest for miracles | Loc:Undead Parish — purchase from Petrus of Thorolund | Up:+15 standard" },

  // ── SHIELDS ────────────────────────────────────────────────────────────────
  { type: "SHIELD", name: "Spider Shield", raw: "SHIELD: Spider Shield | type:Medium Shield | stability:49(+10) | block:100% physical | Loc:Blighttown — drop from Blowdart Sniper | Up:Standard" },
  { type: "SHIELD", name: "Heater Shield", raw: "SHIELD: Heater Shield | type:Small Shield | stability:58(+10) | block:100% physical | Loc:Undead Burg — starting equipment Knight | Up:Standard/Lightning" },
  { type: "SHIELD", name: "Grass Crest Shield", raw: "SHIELD: Grass Crest Shield | type:Medium Shield | stability:56(+10) | block:95% physical | Effect:Passive stamina regen +20% | Loc:Darkroot Basin — crystal lizard area near ladder | Up:Standard/Lightning" },
  { type: "SHIELD", name: "Havel's Greatshield", raw: "SHIELD: Havel's Greatshield | type:Greatshield | stability:80(+5) | block:100% physical | Loc:Anor Londo — Giant Blacksmith, transpose with Slab | Up:Special" },
  { type: "SHIELD", name: "Eagle Shield", raw: "SHIELD: Eagle Shield | type:Greatshield | stability:76(+10) | block:100% physical | Loc:Sen's Fortress — chest at top | Up:Standard" },
  { type: "SHIELD", name: "Tower Kite Shield", raw: "SHIELD: Tower Kite Shield | type:Medium Shield | stability:58(+10) | block:95% physical | Loc:Undead Burg — Undead Merchant / starting equipment | Up:Standard/Lightning" },
  { type: "SHIELD", name: "Black Knight Shield", raw: "SHIELD: Black Knight Shield | type:Greatshield | stability:74(+5) | block:100% physical | Loc:Darkroot Basin — rare drop from Black Knight | Up:Cannot upgrade" },
  { type: "SHIELD", name: "Crest Shield", raw: "SHIELD: Crest Shield | type:Medium Shield | stability:60(+10) | block:100% physical | Effect:+30 magic defense | Loc:Undead Parish — Oscar's body near start or Firekeeper | Up:Standard" },
  { type: "SHIELD", name: "Balder Shield", raw: "SHIELD: Balder Shield | type:Medium Shield | stability:68(+10) | block:100% physical | Loc:Undead Parish — rare drop from Balder Knight (shield variant) | Up:Standard/Lightning" },
  { type: "SHIELD", name: "Skull Lantern", raw: "SHIELD: Skull Lantern | type:Flame (off-hand) | Loc:The Catacombs — drop from Necromancer | Up:Cannot upgrade" },

  // ── RINGS ──────────────────────────────────────────────────────────────────
  { type: "RING", name: "Havel's Ring", raw: "RING: Havel's Ring | Effect:+50% maximum equip load | Loc:Undead Burg — chest behind Havel the Rock in tower (need Watchtower Basement Key)" },
  { type: "RING", name: "Ring of Favor and Protection", raw: "RING: Ring of Favor and Protection | Effect:+20% HP, +20% Stamina, +20% equip load; breaks on removal | Loc:Undead Parish — drop from Lautrec of Carim (kill him or after he murders Firekeeper)" },
  { type: "RING", name: "Cloranthy Ring", raw: "RING: Cloranthy Ring | Effect:+20% stamina regen (stacks with Grass Crest Shield and Green Blossom) | Loc:Darkroot Garden — bottom of stone staircase in swamp via master key / Oolacile DLC" },
  { type: "RING", name: "Wolf Ring", raw: "RING: Wolf Ring | Effect:+40 Poise | Loc:Darkroot Garden — chest behind door that requires Crest of Artorias key" },
  { type: "RING", name: "Leo Ring", raw: "RING: Leo Ring | Effect:+40% counter damage on thrusting attacks | Loc:Anor Londo — drop from Dragon Slayer Ornstein" },
  { type: "RING", name: "Red Tearstone Ring", raw: "RING: Red Tearstone Ring | Effect:+50% attack when below 20% HP | Loc:Valley of Drakes — on a corpse on ledge" },
  { type: "RING", name: "Bellowing Dragoncrest Ring", raw: "RING: Bellowing Dragoncrest Ring | Effect:+20-26% magic/sorcery damage | Loc:Depths — purchased from Griggs of Vinheim after rescuing him" },
  { type: "RING", name: "Covetous Gold Serpent Ring", raw: "RING: Covetous Gold Serpent Ring | Effect:+200 item discovery | Loc:Sen's Fortress — chest at the top" },
  { type: "RING", name: "Covetous Silver Serpent Ring", raw: "RING: Covetous Silver Serpent Ring | Effect:+20% souls per kill | Loc:Firelink Shrine — behind locked door near well (need residence key)" },
  { type: "RING", name: "Dark Wood Grain Ring", raw: "RING: Dark Wood Grain Ring | Effect:Ninja flip roll under 25% equip load | Loc:Anor Londo — drop from Shiva of the East's bodyguard (Forest Hunter covenant)" },
  { type: "RING", name: "Hornet Ring", raw: "RING: Hornet Ring | Effect:+30% critical (backstab/riposte) damage | Loc:Darkroot Garden — grave near where Sif is fought" },
  { type: "RING", name: "Rusted Iron Ring", raw: "RING: Rusted Iron Ring | Effect:No movement penalty in swamps, water, tar | Loc:Undead Asylum (revisit) — iron chest in the yard" },
  { type: "RING", name: "Tiny Being's Ring", raw: "RING: Tiny Being's Ring | Effect:+5% maximum HP | Loc:Northern Undead Asylum — starting gift option or on body in Asylum" },
  { type: "RING", name: "Ring of Steel Protection", raw: "RING: Ring of Steel Protection | Effect:+50 physical defense | Loc:Sen's Fortress — chest" },
  { type: "RING", name: "Lingering Dragoncrest Ring", raw: "RING: Lingering Dragoncrest Ring | Effect:+50% magic effect duration | Loc:Darkroot Garden — purchase from Griggs or Dusk of Oolacile (AotA)" },
  { type: "RING", name: "Ring of the Sun's Firstborn", raw: "RING: Ring of the Sun's Firstborn | Effect:+20% miracle damage | Loc:Anor Londo — corpse in hallway near Gwynevere's chamber" },
  { type: "RING", name: "Covenant of Artorias", raw: "RING: Covenant of Artorias | Effect:Allows entry to The Abyss | Loc:Darkroot Garden — drop from Great Grey Wolf Sif" },
  { type: "RING", name: "Dusk Crown Ring", raw: "RING: Dusk Crown Ring | Effect:+50% sorcery castings, -50% max HP | Loc:Darkroot Basin — Princess Dusk of Oolacile rescue" },
  { type: "RING", name: "Calamity Ring", raw: "RING: Calamity Ring | Effect:Player takes double damage | Loc:AotA DLC — Kalameet fight reward (not useful for offense)" },
  { type: "RING", name: "Orange Charred Ring", raw: "RING: Orange Charred Ring | Effect:Reduces lava damage | Loc:Demon Ruins — drop from Centipede Demon" },
  { type: "RING", name: "Ring of the Evil Eye", raw: "RING: Ring of the Evil Eye | Effect:Absorb 30 HP from every killed enemy | Loc:Depths — defeat Gaping Dragon, then Domhnall of Zena" },

  // ── ARMOR SETS ─────────────────────────────────────────────────────────────
  { type: "ARMOR", name: "Havel's Set", raw: "ARMOR: Havel's Set | weight:Heavy | poise:high | Loc:Anor Londo — Giant's tomb / Giant Blacksmith area chest" },
  { type: "ARMOR", name: "Elite Knight Set", raw: "ARMOR: Elite Knight Set | weight:Medium | Loc:Darkroot Garden — appears after defeating one of the four knights in the clearing" },
  { type: "ARMOR", name: "Silver Knight Set", raw: "ARMOR: Silver Knight Set | weight:Medium-heavy | Loc:Anor Londo — rare drop from Silver Knights" },
  { type: "ARMOR", name: "Black Knight Set", raw: "ARMOR: Black Knight Set | weight:Heavy | Loc:Kiln of the First Flame — drop from Black Knights" },
  { type: "ARMOR", name: "Giant Armor Set", raw: "ARMOR: Giant Armor Set | weight:Very Heavy | Loc:Anor Londo — Giant Blacksmith / Giant enemy drops" },
  { type: "ARMOR", name: "Ornstein's Set", raw: "ARMOR: Ornstein's Set | weight:Heavy | Loc:Anor Londo — purchase from Domhnall of Zena after defeating Smough & Ornstein (Ornstein last)" },
  { type: "ARMOR", name: "Smough's Set", raw: "ARMOR: Smough's Set | weight:Very Heavy | poise:highest in game | Loc:Anor Londo — purchase from Domhnall of Zena after defeating Smough & Ornstein (Smough last)" },
  { type: "ARMOR", name: "Artorias' Set", raw: "ARMOR: Artorias' Set | weight:Medium-heavy | Loc:Royal Wood (AotA DLC) — purchase from Marvelous Chester" },
  { type: "ARMOR", name: "Gold-Hemmed Black Set", raw: "ARMOR: Gold-Hemmed Black Set | weight:Very Light | Loc:Demon Ruins — near the fog door before Ceaseless Discharge" },
  { type: "ARMOR", name: "Eastern Set", raw: "ARMOR: Eastern Set | weight:Light | Loc:Sen's Fortress — chest at top / Shiva of the East purchase" },
  { type: "ARMOR", name: "Shadow Set", raw: "ARMOR: Shadow Set | weight:Very Light | Loc:Blighttown — drop from Shiva's bodyguard (Forest Hunter covenant)" },
  { type: "ARMOR", name: "Catarina Set", raw: "ARMOR: Catarina Set | weight:Heavy | Loc:Undead Parish — Siegmeyer of Catarina purchase / questline" },
  { type: "ARMOR", name: "Painting Guardian Set", raw: "ARMOR: Painting Guardian Set | weight:Very Light | Loc:Anor Londo — rare drop from Painting Guardians" },
  { type: "ARMOR", name: "Dingy Set", raw: "ARMOR: Dingy Set | weight:Very Light | Loc:Blighttown — drop from Quelaan's maiden companions" },
  { type: "ARMOR", name: "Black Iron Set", raw: "ARMOR: Black Iron Set | weight:Very Heavy | Loc:Anor Londo — Siegmeyer questline reward / Iron Golem area" },
  { type: "ARMOR", name: "Pyromancer Set", raw: "ARMOR: Pyromancer Set | weight:Light | Loc:Depths — starting area near merchant" },
  { type: "ARMOR", name: "Sorcerer Set", raw: "ARMOR: Sorcerer Set | weight:Very Light | Loc:Undead Burg — purchased from Griggs of Vinheim" },
  { type: "ARMOR", name: "Hollow Warrior Set", raw: "ARMOR: Hollow Warrior Set | weight:Very Light | Loc:Undead Burg — drop from Hollow Warriors" },
  { type: "ARMOR", name: "Knight Set", raw: "ARMOR: Knight Set | weight:Medium | Loc:Undead Parish — drop from Knights / purchase" },
  { type: "ARMOR", name: "Chain Set", raw: "ARMOR: Chain Set | weight:Medium | Loc:Undead Parish — purchase from Blacksmith Andre" },
  { type: "ARMOR", name: "Xanthous Set", raw: "ARMOR: Xanthous Set | weight:Light | Loc:Painted World of Ariamis — drop from Xanthous King Jeremiah" },
  { type: "ARMOR", name: "Gwyndolin Moonlight Set", raw: "ARMOR: Gwyndolin Moonlight Set | weight:Very Light | Loc:Anor Londo — drop from Dark Sun Gwyndolin" },
  { type: "ARMOR", name: "Chester's Set", raw: "ARMOR: Chester's Set | weight:Light | Loc:AotA DLC — drop from Chester (invader)" },
  { type: "ARMOR", name: "Gough's Set", raw: "ARMOR: Gough's Set | weight:Heavy | Loc:AotA DLC — drop from Hawkeye Gough after defeating him" },

  // ── SPELLS: Sorceries ─────────────────────────────────────────────────────
  { type: "SPELL", name: "Soul Arrow", raw: "SPELL: Soul Arrow | school:Sorcery | damage:~95 | FP-analog:uses casts | Loc:Undead Burg — Griggs of Vinheim / Big Hat Logan | stat:10 INT" },
  { type: "SPELL", name: "Great Soul Arrow", raw: "SPELL: Great Soul Arrow | school:Sorcery | damage:~180 | Loc:Sen's Fortress — Big Hat Logan purchase | stat:16 INT" },
  { type: "SPELL", name: "Soul Spear", raw: "SPELL: Soul Spear | school:Sorcery | damage:~400 | Loc:The Duke's Archives — Big Hat Logan / Duke's chest | stat:36 INT" },
  { type: "SPELL", name: "Crystal Soul Spear", raw: "SPELL: Crystal Soul Spear | school:Sorcery | damage:~550 | Loc:The Duke's Archives — drop from Big Hat Logan hollow | stat:44 INT" },
  { type: "SPELL", name: "Homing Soul Mass", raw: "SPELL: Homing Soul Mass | school:Sorcery | effect:5 tracking projectiles | Loc:Anor Londo — Big Hat Logan | stat:18 INT" },
  { type: "SPELL", name: "Dark Bead", raw: "SPELL: Dark Bead | school:Sorcery (Oolacile) | damage:~480 multi-hit | Loc:AotA DLC — Elizabeth or Royal Wood | stat:14 INT" },
  { type: "SPELL", name: "Pursuers", raw: "SPELL: Pursuers | school:Sorcery (Oolacile) | effect:3 tracking orbs | Loc:AotA DLC — purchase from Marvelous Chester | stat:18 INT" },

  // ── SPELLS: Miracles ──────────────────────────────────────────────────────
  { type: "SPELL", name: "Lightning Spear", raw: "SPELL: Lightning Spear | school:Miracle | damage:~220 | Loc:Sen's Fortress — chest at top | stat:20 FAI" },
  { type: "SPELL", name: "Great Lightning Spear", raw: "SPELL: Great Lightning Spear | school:Miracle | damage:~340 | Loc:Anor Londo — covenant rank 1 Warrior of Sunlight | stat:30 FAI" },
  { type: "SPELL", name: "Sunlight Spear", raw: "SPELL: Sunlight Spear | school:Miracle | damage:~500 | Loc:Kiln of the First Flame — transpose with Lord Gwyn Soul | stat:50 FAI" },
  { type: "SPELL", name: "Wrath of the Gods", raw: "SPELL: Wrath of the Gods | school:Miracle | effect:powerful AOE shockwave | Loc:Tomb of the Giants — purchase from Rhea of Thorolund | stat:28 FAI" },
  { type: "SPELL", name: "Tranquil Walk of Peace", raw: "SPELL: Tranquil Walk of Peace | school:Miracle | effect:stagger all enemies | Loc:The Catacombs — purchase from Rhea or Patches | stat:18 FAI" },
  { type: "SPELL", name: "Replenishment", raw: "SPELL: Replenishment | school:Miracle | effect:gradual HP regen | Loc:Undead Parish — Petrus of Thorolund | stat:16 FAI" },
  { type: "SPELL", name: "Heal", raw: "BUFF: Heal | school:Miracle | effect:restore moderate HP | Loc:Undead Parish — Petrus of Thorolund / starting miracle Cleric | stat:12 FAI" },
  { type: "BUFF", name: "Sunlight Blade", raw: "BUFF: Sunlight Blade | school:Miracle | effect:coat weapon in lightning temporarily | Loc:Anor Londo — covenant rank 1 Warrior of Sunlight (very high rank) | stat:30 FAI" },
  { type: "BUFF", name: "Darkmoon Blade", raw: "BUFF: Darkmoon Blade | school:Miracle | effect:coat weapon in magic damage | Loc:Anor Londo — rank 1 Blade of the Darkmoon covenant | stat:30 FAI" },

  // ── SPELLS: Pyromancies ───────────────────────────────────────────────────
  { type: "SPELL", name: "Fireball", raw: "SPELL: Fireball | school:Pyromancy | damage:~180 | Loc:Starting pyromancy / Laurentius of the Great Swamp" },
  { type: "SPELL", name: "Great Fireball", raw: "SPELL: Great Fireball | school:Pyromancy | damage:~340 | Loc:Quelana of Izalith — Blighttown spider lair" },
  { type: "SPELL", name: "Fire Tempest", raw: "SPELL: Fire Tempest | school:Pyromancy | damage:~500+ | Loc:Quelana of Izalith — Blighttown" },
  { type: "SPELL", name: "Fire Whip", raw: "SPELL: Fire Whip | school:Pyromancy | effect:continuous fire lash | Loc:Quelana of Izalith — Blighttown" },
  { type: "SPELL", name: "Power Within", raw: "BUFF: Power Within | school:Pyromancy | effect:+20% attack, drains HP over time | Loc:Blighttown — chest in Blighttown swamp near waterwheel" },
  { type: "SPELL", name: "Flash Sweat", raw: "BUFF: Flash Sweat | school:Pyromancy | effect:+50% fire resistance for 60s | Loc:Laurentius of the Great Swamp — Firelink Shrine" },
  { type: "SPELL", name: "Iron Flesh", raw: "BUFF: Iron Flesh | school:Pyromancy | effect:high defense but extreme slow | Loc:Sens Fortress — Eingyi after Chaos Servant covenant" },
  { type: "SPELL", name: "Combustion", raw: "SPELL: Combustion | school:Pyromancy | damage:~120 close range | Loc:Laurentius of the Great Swamp — Firelink" },
  { type: "SPELL", name: "Great Combustion", raw: "SPELL: Great Combustion | school:Pyromancy | damage:~250 close range | Loc:Quelana of Izalith — Blighttown" },

  // ── BUILD: Bosses & key locations ─────────────────────────────────────────
  { type: "BUILD", name: "Bell Gargoyles", raw: "BUILD: Bell Gargoyles | type:Boss | Loc:Undead Parish — roof of cathedral | drops:Gargoyle Tail Axe, Bell of Awakening access" },
  { type: "BUILD", name: "Capra Demon", raw: "BUILD: Capra Demon | type:Boss | Loc:Undead Burg lower section | drops:Demon Machete, Key to the Depths" },
  { type: "BUILD", name: "Gaping Dragon", raw: "BUILD: Gaping Dragon | type:Boss | Loc:The Depths | drops:Blighttown Key, Humanity" },
  { type: "BUILD", name: "Quelaag", raw: "BUILD: Quelaag | type:Boss | Loc:Blighttown | drops:Soul of Quelaag (Furysword/Chaos Blade), Bell of Awakening" },
  { type: "BUILD", name: "Iron Golem", raw: "BUILD: Iron Golem | type:Boss | Loc:Sen's Fortress top | drops:Core of an Iron Golem (Giant Blacksmith weapon), access to Anor Londo" },
  { type: "BUILD", name: "Ornstein and Smough", raw: "BUILD: Ornstein and Smough | type:Boss | Loc:Anor Londo — cathedral | drops:Soul of Ornstein (Dragonslayer Spear) or Soul of Smough (Smough's Hammer)" },
  { type: "BUILD", name: "Sif the Great Grey Wolf", raw: "BUILD: Sif the Great Grey Wolf | type:Boss | Loc:Darkroot Garden | drops:Soul of Sif (Greatsword of Artorias / Greatshield of Artorias), Covenant of Artorias ring" },
  { type: "BUILD", name: "Four Kings", raw: "BUILD: Four Kings | type:Boss | Loc:New Londo Ruins — The Abyss (need Covenant of Artorias ring) | drops:Soul of the Four Kings, Lordvessel access" },
  { type: "BUILD", name: "Seath the Scaleless", raw: "BUILD: Seath the Scaleless | type:Boss | Loc:The Duke's Archives | drops:Soul of Seath (Moonlight Greatsword / Moonlight Butterfly Horn), Tin Crystallization Catalyst" },
  { type: "BUILD", name: "Gravelord Nito", raw: "BUILD: Gravelord Nito | type:Boss | Loc:Tomb of the Giants | drops:Lord Soul" },
  { type: "BUILD", name: "Bed of Chaos", raw: "BUILD: Bed of Chaos | type:Boss | Loc:Lost Izalith | drops:Lord Soul" },
  { type: "BUILD", name: "Gwyn, Lord of Cinder", raw: "BUILD: Gwyn, Lord of Cinder | type:Final Boss | Loc:Kiln of the First Flame | drops:Lord Soul — Link the Fire or Dark Lord ending" },
  { type: "BUILD", name: "Knight Artorias", raw: "BUILD: Knight Artorias | type:Boss (AotA DLC) | Loc:Oolacile Coliseum | drops:Soul of Artorias (Abyss Greatsword)" },
  { type: "BUILD", name: "Manus, Father of the Abyss", raw: "BUILD: Manus, Father of the Abyss | type:Final DLC Boss | Loc:Chasm of the Abyss (AotA) | drops:Soul of Manus (Manus Catalyst)" },
];

/** Map of gameKey → seed facts */
export const SEED_KNOWLEDGE: Record<string, KnowledgeFact[]> = {
  lotf: LOTF_SEED_FACTS,
  ds1: DS1_SEED_FACTS,
};
