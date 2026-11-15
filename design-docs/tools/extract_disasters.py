"""Export exact source intervals, game declarations and isolated disaster checks."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = '.research/wp-disasters/probe-results.json'
COPY = '.research/wp-disasters/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-disasters-2026-11-15.evidence.json'
PACKAGE = 'WP-DISASTERS-DIVINE'
FEATURES = ['FEAT-DISASTERS', 'FEAT-DIVINE-POWERS', 'FEAT-MAP-TOOLS']
DOCUMENTS = ['DOC-DISASTERS', 'DOC-DISASTERS-DATA', 'DOC-TOOLS', 'DOC-SCENARIOS']

RANGES = [
    ('disasters.js', 8, 29, 127, 'Disaster constants, base probabilities, clock conversion and names.'),
    ('disasters.js', 31, 55, 127, 'Context text, spatial falloff, event record and ignition helper.'),
    ('disasters.js', 242, 263, 127, 'Area-scaled rolls and natural target selection.'),
    ('disasters.js', 59, 84, 128, 'Common entry and volcanic damage, island, nutrients and dust.'),
    ('disasters.js', 85, 108, 128, 'Quake, coastal cascade and tsunami.'),
    ('disasters.js', 109, 120, 128, 'Hurricane spawn and initial ignition.'),
    ('disasters.js', 121, 137, 128, 'Meteor crater, ring fire, aerosol and cascade.'),
    ('disasters.js', 138, 147, 128, 'Epidemic center threshold, neighboring cells and immunity.'),
    ('disasters.js', 148, 154, 128, 'Drought spawn and initial precipitation anomaly.'),
    ('disasters.js', 155, 166, 128, 'Flood rain, vulnerability and extinguishing.'),
    ('disasters.js', 167, 175, 128, 'Deep freeze temperature pulse.'),
    ('disasters.js', 177, 187, 128, 'Chronicle eligibility, importance, sounds and deferred cascade.'),
    ('disasters.js', 188, 214, 129, 'Drought reapplication, lifespan, hurricane movement and landfall.'),
    ('disasters.js', 215, 239, 129, 'Fire damage, spread, decay and civTick subscription.'),
    ('civ.js', 164, 165, 129, 'Disease, immunity and ruins coefficients.'),
    ('civ.js', 589, 615, 129, 'Capacity update and effect of ruins on food.'),
    ('civ.js', 632, 668, 129, 'Population pass, plague origin, spread, lethality and medicine.'),
    ('civ.js', 1746, 1804, 129, 'Main tick order and famine detector.'),
    ('climate.js', 295, 312, 129, 'Thermal pulse, aerosol and climate field relaxation.'),
    ('climate.js', 380, 390, 129, 'Precipitation anomaly and recovery.'),
    ('ecology.js', 89, 103, 129, 'Fertility contributions from river, volcanic deposits and pollution.'),
    ('people.js', 1413, 1426, 129, 'Disaster proximity to capitals in the court model.'),
    ('people.js', 1586, 1606, 129, 'Court yearly mortality branches for plague and disaster.'),
    ('disasters.js', 267, 298, 130, 'Nearest political neighbor and two-target discord handler.'),
    ('disasters.js', 299, 345, 130, 'Direct rain, blessing, inspiration, peace and discord mutations.'),
    ('civ.js', 322, 335, 130, 'Golden-age and bilateral relations helpers.'),
    ('civ.js', 490, 513, 130, 'Primary war vs opposite sides including allies.'),
    ('civ.js', 1199, 1248, 130, 'Direct declaration, guards, alliances and first chronicle entry.'),
    ('civ.js', 1251, 1319, 130, 'Apply peace including the branch for a war without battles.'),
    ('ui.js', 5, 50, 131, 'Initial controls and tool declarations.'),
    ('ui.js', 137, 161, 131, 'Preview radii, disaster strength and biome preset data.'),
    ('index.html', 518, 530, 131, 'Brush size and strength ranges in default UI.'),
    ('ui.js', 169, 196, 131, 'Tool selector, resource and fauna options and sliders.'),
    ('ui.js', 488, 519, 131, 'Tool locks and selection behavior.'),
    ('ui.js', 599, 629, 131, 'Brush dispatch and cell mutations.'),
    ('ui.js', 632, 691, 131, 'Point latch, command handoff, Discord and population paint.'),
    ('ui.js', 730, 805, 131, 'Point targets, two-click choice, direct biome paint and finish.'),
    ('ui.js', 1179, 1210, 131, 'Preview and live terrain/wind recompute.'),
    ('ui.js', 1402, 1408, 131, 'Found city writes and ownership callback.'),
    ('goals.js', 191, 204, 132, 'Age of Disasters scenario defaults, locks and conditions.'),
    ('goals.js', 239, 301, 132, 'Scenario locks, restoration and enforcement.'),
    ('ui.js', 1283, 1289, 132, 'Planet rate handler bounds and interface sync.'),
    ('mods.js', 190, 196, 132, 'Declarative event action, effect and location registries.'),
    ('mods.js', 593, 634, 132, 'Event parsing, bounds and destination fields.'),
    ('mods.js', 656, 724, 132, 'Action counters, scheduling, target resolution and dispatch.'),
    ('mods.js', 757, 778, 132, 'Global vs relative scenario event years and storage.'),
    ('main.js', 124, 134, 132, 'Boot application of world settings.'),
    ('disasters.js', 365, 374, 133, 'Worldgen/reset and save/load disaster hooks.'),
    ('menu.js', 9, 16, 133, 'Scalar persistence and excluded arrays.'),
    ('menu.js', 78, 109, 133, 'World serialization, typed buffers and legacy defaults.'),
    ('menu.js', 127, 137, 133, 'Derived terrain/capacity update before load event.'),
    ('ui.js', 1070, 1092, 133, 'Erase Life cell mutations and reset hook.'),
    ('core.js', 1139, 1151, 133, 'Generation clears fire, immune, anomalies and aerosol.'),
    ('civ.js', 38, 55, 133, 'Chronicle deduplication, metadata and event dispatch.'),
    ('stats.js', 464, 482, 133, 'Counting active objects by identity at yearly sample.'),
    ('stats.js', 512, 523, 133, 'Chronicle-specific disaster history and statistics polling.'),
    ('stats.js', 731, 741, 133, 'Restore counters and mark observed active objects.'),
    ('stats.js', 1968, 1977, 133, 'Current disaster cards, per-type counts and history rows.'),
    ('index.html', 714, 722, 133, 'Module order for climate, civil, disasters and people.'),
]

FINDINGS = [
    ('NATURAL-ROLLS', [1, 3, 5, 7], list(range(19, 31)),
     'Nine natural rolls have terrain and population gates. Tsunami enters through cascades or a direct invocation.'),
    ('VOLCANO-AND-METEOR', [2, 4, 7, 12], [2, 3, 7, 8, 43],
     'A player volcano can raise a dry island. Meteor strength changes the radius, crater and dust while the same center fraction applies.'),
    ('MARKERS-AND-FIELDS', [6, 9, 10, 11, 13, 14, 19, 20], [9, 10, 11, 12, 13, 14, 15],
     'Fire may outlive its marker. Hurricane moves before applying damage; drought and climate both write precipitation anomaly.'),
    ('EPIDEMIC', [8, 15, 17], [16, 17, 18, 25, 28],
     'The event seeds disease and immunity. Spread and medicine are population rules. Manual and natural target gates differ.'),
    ('DIRECT-POWERS', [24, 25, 26, 27, 29], [31, 32, 33, 34, 35],
     'Rain and blessing write cells; inspiration writes a nation. Boundary peace runs the normal peace handler and direct scenario discord changes relations.'),
    ('TWO-CLICK-DISCORD', [24, 28, 36, 37], [36, 37, 38],
     'Interactive discord has a 45-second selection and starts up to four wars in the all-neighbors branch.'),
    ('BRUSH-AND-RATE', [30, 31, 34, 35, 36, 37, 40, 41, 42], [39, 40, 41, 42, 49, 50],
     'Brush and point paths have distinct dispatch. Wrath enforces frequency four with the scenario rate control disabled.'),
    ('DECLARATIVE-INGRESS', [43, 44, 45, 46], [43, 51],
     'A scheduled attempt uses base effect handlers. A rejected target can consume a one-shot attempt.'),
    ('SAVE-AND-STATISTICS', [48, 49, 50, 51, 52, 53, 54, 55, 56, 57], [44, 45, 46, 47],
     'Ordinary load rebuilds fire index and preserves existing counters. A short unlogged marker may expire before it is counted.'),
    ('FAMINE-AND-COURT', [16, 18, 22, 23], [48],
     'Famine compares food-capacity snapshots. Court effects consume the active disaster list and cell disease through separate branches.'),
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    report = json.loads((ROOT / REPORT).read_text(encoding='utf-8'))
    assert report['work_package_id'] == PACKAGE and report['failed'] == 0
    manifest = {row['path']: row for row in report['sources']}
    rules = []
    for n, (name, start, end, source, summary) in enumerate(RANGES, 1):
        path = f'EarthSimulator/{name}'
        raw = (ROOT / path).read_bytes()
        assert digest(raw) == manifest[path]['sha256'], path
        lines = raw.decode('utf-8-sig').splitlines()
        assert 0 < start <= end <= len(lines), (name, start, end)
        rules.append({'id': f'DD-{n:02}', 'source_id': f'SRC-{source:03}', 'summary': summary,
                      'evidence_type': 'static_traced', 'source': {'path': path, 'sha256': manifest[path]['sha256'],
                      'line': start, 'end_line': end, 'source_lines': lines[start-1:end]}})
    findings = [{'id': key, 'evidence': [f'DD-{n:02}' for n in refs],
                 'probe_ids': [f'DD{n:02}' for n in probes], 'conclusion': summary}
                for key, refs, probes, summary in FINDINGS]
    assert all(set(f['evidence']) <= {r['id'] for r in rules} for f in findings)
    check_ids = {r['id'].split('-', 1)[0] for r in report['results']}
    assert all(set(f['probe_ids']) <= check_ids for f in findings)
    result = {
        'format_version': '1.0.0', 'work_package_id': PACKAGE, 'date': '2026-11-15', 'game_version': '2.1.4',
        'path_base': 'repository_root', 'feature_ids': FEATURES, 'document_ids': DOCUMENTS,
        'source_ids': [f'SRC-{n:03}' for n in range(127, 135)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {'source_files': report['sources'], 'rea_source_selection': ['disasters.js'],
                     'rea_parent_evidence_id': 'ev_0a9337237bd6f9e875f40ff6a01db10c50144ca7855c5d90eef9f6fecab7332c',
                     'rea_summary_evidence_id': 'ev_72bf7528cd0165fda3890c30cf1764ad4c3486739ed944c9c5903b3d140cd4ed',
                     'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                     'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
                     'rea_limits': ['1 JavaScript file parsed, 5198 AST nodes, zero parse failures, 78 other files unselected.',
                                    'Partial application and semantic graphs: 78 and 3215 unknowns.']},
        'declarations': report['declarations'], 'rules': rules, 'findings': findings,
        'verification': {'command': 'node design-docs/tools/probe_disasters.cjs', 'report_path': REPORT,
                         'test_copy_path': COPY, 'checks': report['results'],
                         'probe_script_sha256': digest((ROOT / 'design-docs/tools/probe_disasters.cjs').read_bytes()),
                         'environment': report['environment'], 'runtime_verified': False},
        'limitations': ['VM checks execute game functions with a controlled RNG, synthetic geography and substituted desktop, DOM and command adapters.',
                        'No rendered game, synchronized room, audio pipeline, user save or Workshop add-on was observed.',
                        'Natural roll branches are forced by fixtures. Long-horizon frequency and secondary outcomes remain unmeasured.',
                        'Annual live sea is covered in WP-WORLD-NATURE. Mod and scenario references record the entry into base game effects.'],
        'next_package': 'WP-MAP-INTERFACE',
    }
    target = ROOT / 'design-docs/research/extraction-disasters.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {report["passed"]} checks.')


if __name__ == '__main__':
    main()
