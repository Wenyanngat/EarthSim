"""Export shipped game rules and finite VM checks for war and territorial ownership."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = '.research/wp-wars/probe-results.json'
COPY = '.research/wp-wars/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-wars-2026-11-15.evidence.json'
FEATURES = ['FEAT-WARS', 'FEAT-ARMY-POWER', 'FEAT-STRATEGIC-WEAPONS', 'FEAT-TERRITORIAL-EXPANSION']
DOCUMENTS = ['DOC-WARS', 'DOC-TERRITORY', 'DOC-WAR-MECHANICS', 'DOC-STRATEGIC-WEAPONS', 'DOC-WARS-DATA']
SOURCES = [f'SRC-{n:03}' for n in range(101, 110)]


def digest(data):
    return hashlib.sha256(data).hexdigest()


# Line numbers refer to the recorded source manifest. Source text is copied verbatim.
RANGES = [
    ('civ.js', 11, 30, 101, 'War, battle, projectile and visual-effect stores and history cap.'),
    ('civ.js', 59, 186, 101, 'Civilization cadence, combat, fleet, technology and ownership declarations.'),
    ('civ.js', 486, 511, 102, 'Slot-only primary lookup versus UID-aware coalition lookup.'),
    ('civ.js', 887, 954, 101, 'State aggregates, upkeep and mobilization.'),
    ('civ.js', 1134, 1180, 102, 'Power, battle marker, live coalition and enemy caches.'),
    ('civ.js', 1181, 1248, 102, 'War record, causes, goals, alliance calls and great-war naming.'),
    ('civ.js', 1251, 1319, 104, 'Peace order, no-battle case, reparations, vassals, reabsorption and chronicle.'),
    ('civ.js', 1321, 1363, 103, 'Land fight: power, advancement, capture, losses and exhaustion.'),
    ('civ.js', 1364, 1386, 104, 'War step and ordered peace conditions.'),
    ('civ.js', 1389, 1406, 103, 'Orthogonal shared-border cache and shared enemy lookup.'),
    ('civ.js', 1408, 1418, 107, 'Merger: transfer first, peace next, death last.'),
    ('civ.js', 1420, 1468, 102, 'Diplomacy schedule, relation drift, trade/knowledge and protectorate.'),
    ('civ.js', 1469, 1530, 102, 'Ordinary war probability, vassal rebellion, union.'),
    ('civ.js', 1559, 1571, 106, 'Simulated projectile spawn and cap.'),
    ('civ.js', 1574, 1637, 106, 'Simulated impact, map fields, battle markers and lifetime.'),
    ('civ.js', 1639, 1701, 106, 'In-game arsenals, targets, first strike, retaliation and generation checks.'),
    ('civ.js', 1704, 1733, 106, 'Civilization industry equilibration and local pollution consumption.'),
    ('civ.js', 1735, 1782, 107, 'Cities, capital relocation, aggregate order and military scheduler.'),
    ('civ.js', 1950, 1991, 105, 'Colonist frontier and expedition trigger, path and generation snapshot.'),
    ('civ.js', 1993, 2016, 105, 'Landing: identity/peace guards, capture or defending naval victory.'),
    ('civ.js', 2025, 2056, 105, 'Water body connectivity, port ownership cache.'),
    ('civ.js', 2057, 2085, 105, 'Fleet strength, squadrons and war accounting.'),
    ('civ.js', 2088, 2134, 105, 'Naval front selection, battle spot and log throttling.'),
    ('civ.js', 2135, 2183, 105, 'Fleet engagement, blockade and per-step battle budget.'),
    ('civ.js', 2188, 2229, 105, 'Coastal interception and privateering.'),
    ('civ.js', 2266, 2310, 107, 'Civilian ship and colonist departure and target search.'),
    ('civ.js', 2312, 2367, 105, 'Ship lifecycle, arrival, colonization, interception and raid removal.'),
    ('civ.js', 2369, 2379, 108, 'Worldgen/reset military stores and queues.'),
    ('civ.js', 2397, 2418, 108, 'Civ save/load, rebuild foes and cache reset boundaries.'),
    ('civ.js', 589, 618, 107, 'Water removes capacity; ruin lowers food capacity.'),
    ('civ.js', 632, 729, 107, 'Population/migration and release of depopulated cells.'),
    ('civ.js', 735, 778, 107, 'Brush-related pruning, ownership primitives and state death/birth events.'),
    ('civ.js', 784, 813, 107, 'Nucleation and manual founding.'),
    ('civ.js', 956, 1016, 107, 'Expansion, state identity and slot reuse.'),
    ('civ.js', 1020, 1132, 107, 'Secession, fragmentation, sea support, collapse and peacetime exhaustion.'),
    ('society.js', 268, 291, 107, 'Cultural rejoining or national revolt and independence war.'),
    ('people.js', 1081, 1133, 107, 'Dynastic union uses merger and installs successor.'),
    ('people.js', 1357, 1382, 104, 'Peace outcomes feed reign history and succession restoration.'),
    ('people.js', 1484, 1490, 102, 'Succession war caller.'),
    ('disasters.js', 266, 339, 102, 'Creator discord and concord war/peace handoffs.'),
    ('core.js', 44, 85, 107, 'Owner array and initial neutral sentinel.'),
    ('core.js', 193, 204, 107, 'Per-cell raw default reset helper.'),
    ('core.js', 1141, 1159, 107, 'Generation bulk reset and lifecycle of old records.'),
    ('core.js', 1218, 1236, 107, 'Terrain recomputation changes water but not ownership.'),
    ('climate.js', 236, 255, 106, 'Nuclear winter enters simulated global temperature forcing.'),
    ('climate.js', 299, 305, 106, 'Heat pulse and winter decay.'),
    ('ecology.js', 87, 102, 106, 'Radioactive fallout subtracts from simulated soil fertility.'),
    ('ecology.js', 147, 156, 106, 'Scorched biome heat classification; no direct fallout threshold.'),
    ('ecology.js', 274, 283, 106, 'Radioactive fallout decay.'),
    ('mods.js', 477, 526, 107, 'Scenario seed states and transfer of neutral ring cells.'),
    ('ui.js', 618, 625, 107, 'Eraser ownership write and state Set deletion.'),
    ('ui.js', 676, 704, 107, 'Population brush records states touched by removal.'),
    ('ui.js', 780, 807, 107, 'Finish brush, direct depopulation and terrain rebuild.'),
    ('ui.js', 1070, 1096, 107, 'Reset-life bulk ownership and military reset.'),
    ('ui.js', 1367, 1376, 106, 'Player launch wrapper for the abstract map.'),
    ('walkstrike.js', 591, 600, 106, 'Single-player local strike applies map effect or returns held projectile.'),
    ('menu.js', 9, 138, 108, 'Ordinary save copies typed arrays/sets/maps and reconstructs war records.'),
    ('net.js', 149, 175, 108, 'Exact network snapshot carries military working data and merge semantics.'),
    ('net.js', 203, 237, 108, 'Network snapshot overlays ordinary reconstruction.'),
    ('stats.js', 202, 209, 104, 'Current-war participation includes allies.'),
    ('stats.js', 536, 561, 104, 'War history consumer and bounded retention.'),
    ('stats.js', 2728, 2745, 104, 'State war table participation and side labels.'),
    ('panels.js', 551, 599, 104, 'War card roles, live UID checks and naval totals.'),
    ('index.html', 708, 751, 109, 'Classic-script boot order for the VM subset.'),
]

OWNERSHIP = [
    ('Initialization', 'core.js:83,194–204,1142–1155', 'Neutral or complete world reset. makeCell has no located callers in the shipped JS inventory.'),
    ('Ownership primitives', 'civ.js:752–753', 'Mutate W.stateId and Set membership, record last taker on transfer, dirty border/port caches.'),
    ('Founding', 'civ.js:790–813', 'Neutral to new state with stateNew. Manual founding does not itself create population.'),
    ('Expansion', 'civ.js:956–975', 'Neutral inhabited land to adjacent state after claim budgeting.'),
    ('Secession and collapse', 'civ.js:1020–1132', 'State to successor or neutral. No direct census decrement.'),
    ('National uprising', 'society.js:268–291', 'State to co-cultural neighbor or new state. Former parent may declare independence war.'),
    ('Merger, federation, dynastic union', 'civ.js:1408–1418,1511–1526; people.js:1081–1133', 'Transfer all cells, settle primary wars, kill absorbed state, release its vassals.'),
    ('Peace with reabsorption', 'civ.js:1284–1291', 'Only independence side A winner with matching parent id and gen reabsorbs defender.'),
    ('Land and naval capture', 'civ.js:1321–1363,1993–2016', 'Transfer captured cell with local census loss. Land and landing have different cell-side effects.'),
    ('Colony', 'civ.js:2294–2307,2320–2329', 'Neutral usable arrival cell to ship owner, +900 residents and optional owner culture/religion.'),
    ('Depopulation and flooding', 'civ.js:589–618,632–750,1753–1770; core.js:1219–1236', 'Flooded cell keeps owner until population release or state/brush cleanup. Capital relocates to viable land.'),
    ('State death', 'civ.js:755–774', 'Surviving cells become neutral, releases vassals. Recent last-cell transfer can infer conquered.'),
    ('Player eraser and remove people', 'ui.js:621–624,676–704,780–807', 'Eraser writes neutral plus Set deletion. Population removal prunes touched states at brush finish.'),
    ('Reset life', 'ui.js:1070–1096', 'Bulk neutralization, empties state and military registries, emits reset.'),
    ('Scenario seed', 'mods.js:477–526', 'Adds inhabitants before founding, then claims only eligible neutral ring cells.'),
    ('Save/restore', 'menu.js:34–138; net.js:219–237', 'Restore W.stateId typed array and state Sets from saved state, not by replaying territorial events.'),
]

FINDINGS = [
    ('WAR-IDENTITY', 'WR-03 WR-05 WR-06', 'Direct declaration filters duplicate primary slots. Coalition membership and core settlement check UIDs.'),
    ('FRONT-PARITY', 'WR-08 WR-10', 'Land parity adds exhaustion without casualties. Orthogonal neighbor cache triggers fighting, then capture scans NB8.'),
    ('NO-BATTLE-PEACE', 'WR-07 WR-09 WR-15 WR-61', 'A strike marker does not increment war counters. A war with only strikes can follow no-battle peace. Primary war totals decrement but coalition ally totals stay incremented.'),
    ('PEACE-REABSORPTION', 'WR-07 WR-36', 'Only side A victory in independence war with a founding parent match reabsorbs the side B defender.'),
    ('NAVAL-CONNECTIVITY', 'WR-19 WR-21 WR-23', 'Water body flood fill admits corner-connected water. Ship pathfinder has an additional diagonal land-isthmus veto.'),
    ('NUCLEAR-QUEUE', 'WR-16 WR-28 WR-29 WR-57 WR-58 WR-59', 'Ordinary loads neither persist nor normally clear the existing retaliation queue. A queued item can survive a load and fire when its due tick and both generation guards allow it. Exact snapshot includes the queue.'),
    ('POPULATION-AND-OWNERSHIP', 'WR-30 WR-31 WR-32 WR-44', 'Terrain recompute alone does not remove political ownership. Population release or state/brush cleanup updates the owner.'),
    ('BATTLE-AND-CENSUS', 'WR-05 WR-08 WR-20 WR-22', 'Defender cell losses reduce grid population at capture. State bookkeeping for attacker and fleet losses does not directly subtract from home-cell population.'),
]


def main():
    report = json.loads((ROOT / REPORT).read_text(encoding='utf-8'))
    assert report['failed'] == 0 and report['passed'] == len(report['results'])
    manifest = {row['path']: row for row in report['sources']}
    for name, row in manifest.items():
        data = (ROOT / name).read_bytes()
        assert digest(data) == row['sha256'] and len(data) == row['bytes'], name
        assert data == (ROOT / COPY / Path(name).name).read_bytes(), name
    rules = []
    for i, (name, start, end, source_number, description) in enumerate(RANGES, 1):
        path = 'EarthSimulator/' + name
        lines = (ROOT / path).read_text(encoding='utf-8-sig').splitlines()
        assert 0 < start <= end <= len(lines), (name, start, end, len(lines))
        rules.append({'id': f'WR-{i:02}', 'source_id': f'SRC-{source_number:03}', 'summary': description,
                      'evidence_type': 'static_traced', 'source': {'path': path, 'sha256': manifest[path]['sha256'], 'line': start, 'end_line': end, 'source_lines': lines[start-1:end]}})
    result = {
        'format_version': '1.0.0', 'work_package_id': 'WP-WORLD-WARS-TERRITORY', 'date': '2026-11-15',
        'game_version': '2.1.4', 'path_base': 'repository_root', 'feature_ids': FEATURES, 'document_ids': DOCUMENTS, 'source_ids': SOURCES,
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed', 'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {'source_files': report['sources'], 'rea_source_selection': ['civ.js'], 'rea_parent_evidence_id': 'ev_0462b1aeb784701034e6ef1cad824a83ead2764580d874e8b05a97ac76ce6349', 'rea_summary_evidence_id': 'ev_cfad7d5a6e94d9f2a8fb8eeaa2551dc8d784ff715a4478701c5c8b4a3e33a277', 'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd', 'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()), 'rea_limits': ['One JavaScript file parsed, 31,284 AST nodes and zero parse failures. 78 artifact files outside selected analysis.', 'Application and semantic graphs partial and untruncated: 78 application and 15,481 semantic unknowns. Selected static parse does not observe execution.']},
        'declarations': report['declarations'], 'rules': rules,
        'ownership_sites': [{'transition': transition, 'locations': locations, 'effect': effect} for transition, locations, effect in OWNERSHIP],
        'findings': [{'id': key, 'evidence': refs.split(), 'conclusion': conclusion} for key, refs, conclusion in FINDINGS],
        'verification': {'command': 'node design-docs/tools/probe_wars.cjs', 'report_path': REPORT, 'test_copy_path': COPY, 'checks': report['results'], 'probe_script_sha256': digest((ROOT / 'design-docs/tools/probe_wars.cjs').read_bytes()), 'environment': report['environment'], 'runtime_verified': False},
        'limitations': ['Synthetic VM states and forced probabilities provide finite observations only. No game UI, long-play dynamics, network room or disk/user saves were observed.', 'Function bodies are shipped code. Save/load fixture uses a JSON round trip before applying the loaded save, because the live return object aliases wars and warLog.', 'Ownership inventory covers static references in this shipped JavaScript tree. Configuration, arbitrary active mods and complete walk combat remain scoped to their own packages.'],
        'next_package': 'WP-MENU-LIFECYCLE',
    }
    rule_ids = {r['id'] for r in rules}
    assert all(set(f['evidence']) <= rule_ids for f in result['findings'])
    target = ROOT / 'design-docs/research/extraction-wars.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {len(OWNERSHIP)} ownership transitions, {report["passed"]} checks.')


if __name__ == '__main__':
    main()
