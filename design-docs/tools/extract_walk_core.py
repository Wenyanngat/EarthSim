"""Export shipped walk-core excerpts and results from the isolated Node probe."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = Path('design-docs')
PACKAGE = 'WP-WALK-CORE'
REPORT = '.research/wp-walk-core/probe-results.json'
COPY = '.research/wp-walk-core/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-walk-core-2026-11-15.evidence.json'
SCRIPT = BASE / 'tools/probe_walk_core.cjs'
DOCUMENTS = ['DOC-WALK-MODES-CHARACTERS', 'DOC-WALK-PLAYER-LIFE', 'DOC-WALK-WORLD-GENERATION',
             'DOC-WALK-CONTROLS', 'DOC-DIALOGUES', 'DOC-JOURNAL', 'DOC-WALK-CORE-DATA']

# Source IDs match the registry. Probe groups describe the subsets exercised in fixtures.
GROUPS = {
    144: ('WALK-MODES', ('mode',), 'The option is latched at entry. Survival uses owned items and stored ammunition. Armed uses era loadouts and optional assists.', [
        ('ui.js', 325, 355, 'Local preference fields, mode changes and assist visibility.'),
        ('walk.js', 32, 47, 'Option defaults, normalization and local storage.'),
        ('walkact.js', 4792, 4803, 'Era tables and invention gates.'),
        ('walkact.js', 4996, 5101, 'Mode-dependent ammunition, ownership and local era gear.'),
        ('walkact.js', 6327, 6337, 'Persistent reserve and session loadout reset.'),
        ('walkeco.js', 264, 286, 'Real balance, virtual rich balance, normal spending and fines.'),
    ]),
    145: ('CHARACTER-PERSISTENCE', ('profile',), 'Version 2 saves a roster with independent version 1 profiles. Legacy saves migrate; roster operations use the map UI interlock.', [
        ('ui.js', 356, 425, 'Roster summary, selection, rename interlock and destructive confirmation UI.'),
        ('walkact.js', 4805, 4867, 'Profile fields, normalized serialization and sanitization.'),
        ('walkact.js', 4867, 4932, 'Roster defaults, names, save shape, legacy load and module rebinding.'),
        ('walkact.js', 4933, 4995, 'Roster operations, limits and save/load/world lifecycle hooks.'),
        ('menu.js', 78, 88, 'Save extension event.'),
        ('menu.js', 127, 138, 'Load extension event.'),
    ]),
    146: ('WALK-ENTRY-TIME', ('entry', 'room'), 'Entry snapshots the shared renderer. Local frames, history time and room time are separate. Spawn, teleport and respawn have distinct contracts.', [
        ('main.js', 38, 58, 'Rate-adjusted local simulation accumulation.'),
        ('main.js', 72, 97, 'Main-frame split for local time, room time and the walk scene.'),
        ('ui.js', 1376, 1402, 'Map picker eligibility, tool reset and mode forwarding.'),
        ('panels.js', 283, 300, 'City card delegates to the common picker.'),
        ('panels.js', 390, 442, 'Map strike and battle walk destinations.'),
        ('walktrade.js', 43, 68, 'Cargo entry on a deck or via a one-shot road callback.'),
        ('walktrade.js', 176, 200, 'Road cargo callback chooses a point in the loaded scene.'),
        ('walk.js', 48, 136, 'Entry, shared renderer restoration, and local speed mode.'),
        ('walk.js', 278, 359, 'Spawn-point selection, one-shot hint, player initialization and teleport guards.'),
        ('walk.js', 695, 702, 'Local and room sun clock integration.'),
        ('walk.js', 1580, 1620, 'Landscape changes and room world jumps that retain coordinates.'),
        ('walk.js', 1621, 1686, 'Readiness check and local frame lifecycle.'),
        ('net.js', 315, 322, 'Time permission is host-only in a room.'),
        ('net.js', 587, 600, 'Room walk-speed selection and pause.'),
        ('netwalk.js', 84, 109, 'Peer pose export fields.'),
        ('netwalk.js', 260, 265, 'Shared time-of-day transformation.'),
    ]),
    147: ('PLAYER-LIFE', ('life',), 'The movement loop uses local geometry and water. Damage can be changed by modules. Arrest may consume the death action before normal respawn.', [
        ('walkgen.js', 10, 44, 'Movement, terrain geometry and health declarations.'),
        ('walk.js', 360, 454, 'Motion, collision, hazards, damage hooks and healing.'),
        ('walk.js', 1484, 1516, 'Death actions and respawn site selection.'),
        ('walkact.js', 67, 86, 'Module dispatch for death and damage.'),
        ('walkgen.js', 1260, 1320, 'Water level, mesh ground, bridges and dynamic decks.'),
        ('walkgen.js', 5250, 5327, 'Collision indexing and local/dynamic contact.'),
        ('walklaw.js', 330, 345, 'Damage context captured for arrest.'),
        ('walklaw.js', 390, 445, 'Arrest eligibility, profile effects and release-to-respawn path.'),
        ('walklaw.js', 1817, 1824, 'Registration of law hooks.'),
        ('walkstrike.js', 285, 330, 'Contact with local fire and effects budget.'),
        ('walkstrike.js', 739, 751, 'Fire attribution in the scripted strike effect.'),
    ]),
    148: ('LOCAL-GENERATION', ('world',), 'World seed and world cells drive local terrain and plans. Accepted signatures protect nearby visible geometry while world state advances.', [
        ('walkgen.js', 10, 89, 'Cell dimensions, chunk budgets and generation options.'),
        ('walkgen.js', 114, 156, 'Settlement classes, seeded randomness and coordinate conversion.'),
        ('walkgen.js', 233, 272, 'Architecture, temple style and partial era conversion.'),
        ('walkgen.js', 273, 350, 'World build order, elevation checksum and height constraints.'),
        ('walkgen.js', 389, 460, 'Tier thresholds, surrounding rings, and hysteresis.'),
        ('walkgen.js', 1199, 1270, 'Interpolated terrain, shoreline, rivers and water level.'),
        ('walkgen.js', 2369, 2406, 'Occupancy grid and building/road planning constraints.'),
        ('walkgen.js', 2424, 2515, 'Structural and visual signatures; deterministic plan stages.'),
        ('walkgen.js', 2946, 2974, 'Finalizing plans, signatures for roads, capital entry.'),
        ('walkgen.js', 3585, 3650, 'City walls eligibility, city plan and street layout.'),
        ('walkgen.js', 5429, 5534, 'Chunk scheduling, visible cells, deferred structure and recolor jobs.'),
        ('walkgen.js', 5682, 5746, 'Session init/disposal and refresh from shared world state.'),
    ]),
    149: ('BUILDING-DAMAGE', ('damage',), 'Damage is replayed from the walk journal for regenerated plans. Strategic map impact is a separate civilization update.', [
        ('walkgen.js', 4804, 4850, 'Collision shape differences for holes, ruin, walls and props.'),
        ('walkgen.js', 4874, 5001, 'Building strength declarations, damage records, batched rebuilds and topple.'),
        ('walkact.js', 4276, 4382, 'Vehicle contacts apply vehicle or player damage and use the generated obstacle layer.'),
        ('walkact.js', 1997, 2050, 'Actor damage and routing to the environment damage adapter.'),
        ('walkact.js', 2975, 3000, 'Local actor death and distinct persistent person route.'),
        ('walksea.js', 4658, 4671, 'Shore hit reported to the same building adapter.'),
        ('walkstrike.js', 576, 602, 'Local damage and separately applied map impact.'),
        ('walkstrike.js', 838, 853, 'Shock front considers loaded local plans.'),
        ('civ.js', 1574, 1629, 'Strategic cell-level loss, ruin and fallout writes.'),
    ]),
    150: ('INPUT-INTERACTION-JOURNAL', ('controls', 'interact', 'journal'), 'Windows precede registered keys, then vehicle and base actions. Module, actor and body selection have separate thresholds. A pausing journal reads the active profile.', [
        ('walk.js', 777, 866, 'Key routing, browser chords, held keys and pointer lock.'),
        ('walk.js', 1399, 1434, 'Window registry, opening precedence and pause modes.'),
        ('walk.js', 1495, 1503, 'Closing registered windows, clearing modal state and restoring controls.'),
        ('walkact.js', 2755, 2928, 'NPC answers, availability, context and dialogue construction.'),
        ('walkact.js', 5656, 5705, 'Eligibility and score by target class; action dispatch.'),
        ('walkeco.js', 1925, 1929, 'Registered handlers and fallback ordering.'),
        ('walkeco.js', 3893, 4016, 'Journal tabs, contents, event delegation and key registrations.'),
    ]),
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    report = json.loads((ROOT / REPORT).read_text(encoding='utf-8'))
    assert report['work_package_id'] == PACKAGE and report['failed'] == 0 and report['passed'] > 0
    scope = json.loads((ROOT / BASE / 'research/feature-scope.json').read_text(encoding='utf-8'))
    package = next(p for p in scope['work_packages'] if p['id'] == PACKAGE)
    manifest = {r['path']: r for r in report['sources']}
    loaded = {}
    rules, findings = [], []
    for source, (key, groups, conclusion, entries) in GROUPS.items():
        ids = []
        for name, start, end, summary in entries:
            path = f'EarthSimulator/{name}'
            if path not in loaded:
                raw = (ROOT / path).read_bytes()
                assert digest(raw) == manifest[path]['sha256']
                loaded[path] = raw.decode('utf-8-sig').splitlines()
            lines = loaded[path]
            assert 0 < start <= end <= len(lines), (name, start, end, len(lines))
            entry = f'WC-{len(rules)+1:02}'
            ids.append(entry)
            rules.append({'id': entry, 'source_id': f'SRC-{source}', 'summary': summary, 'evidence_type': 'static_traced',
                          'source': {'path': path, 'sha256': manifest[path]['sha256'], 'line': start, 'end_line': end,
                                     'source_lines': lines[start-1:end]}})
        probes = [r['id'].split('-', 1)[0] for r in report['results'] if r['id'].split('-', 1)[1] in groups]
        assert probes, key
        findings.append({'id': key, 'evidence': ids, 'probe_ids': probes, 'conclusion': conclusion})
    result = {
        'format_version': '1.0.0', 'work_package_id': PACKAGE, 'date': '2026-11-15', 'game_version': '2.1.4',
        'path_base': 'repository_root', 'feature_ids': package['feature_ids'], 'document_ids': DOCUMENTS,
        'source_ids': [f'SRC-{n}' for n in (*GROUPS, 151)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {'source_files': report['sources'], 'rea_source_selection': ['walk.js', 'netwalk.js'],
                     'rea_parent_evidence_id': 'ev_d4961e0e6ae22cdd6c4cb3e10a6b8b6aed58618f6a1076040a9a4256faa31b21',
                     'rea_summary_evidence_id': 'ev_3ea725fd6eef6f88eef914477a8144a11aec3565d719abe9ab87587106a2b4a0',
                     'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                     'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
                     'rea_limits': ['Two JS files parsed, 42250 AST nodes, zero parse failures, 77 other files unselected.',
                                    'Partial application and semantic graphs contain 77 and 20835 unknowns.']},
        'declarations': report['declarations'], 'rules': rules, 'findings': findings,
        'verification': {'command': f'node {SCRIPT.as_posix()}', 'report_path': REPORT, 'test_copy_path': COPY,
                         'checks': report['results'], 'probe_script_sha256': digest((ROOT / SCRIPT).read_bytes()),
                         'environment': report['environment'], 'runtime_verified': False},
        'limitations': ['VM runs selected functions with substituted DOM, renderer, room interfaces, actors and small world fixtures.',
                        'Profile round trips use memory. No user save is opened. Actual pointer lock, complete visual scenes, accessibility and live room synchronization remain unobserved.',
                        'Quests, economics, NPC ecology, law, transport and combat are covered only at the core call sites.'],
        'next_package': 'WP-WALK-SOCIETY-ECONOMY',
    }
    target = ROOT / BASE / 'research/extraction-walk-core.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {report["passed"]} checks.')


if __name__ == '__main__':
    main()
