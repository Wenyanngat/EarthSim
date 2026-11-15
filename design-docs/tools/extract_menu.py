"""Export source ranges, shipped menu declarations and finite menu checks."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = '.research/wp-menu/probe-results.json'
COPY = '.research/wp-menu/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-menu-2026-11-15.evidence.json'
PACKAGE = 'WP-MENU-LIFECYCLE'
FEATURES = ['FEAT-LOBBY', 'FEAT-WORLD-PRESETS', 'FEAT-WORLD-REGENERATE', 'FEAT-SOCIETY-RESET', 'FEAT-CREDITS']
DOCUMENTS = ['DOC-LOBBY', 'DOC-NEW-GAME', 'DOC-WORLD-GENERATION', 'DOC-CREDITS', 'DOC-MENU-LIFECYCLE', 'DOC-MENU-DATA']

# File, inclusive line range, source registry number, subject.
RANGES = [
    ('core.js', 5, 15, 110, 'Read session boot, size bounds and GRID allocation.'),
    ('main.js', 68, 110, 110, 'Paused lobby, room ticks, rendering and periodic autosave gate.'),
    ('main.js', 112, 146, 110, 'Initial inhabitants and starting parameters before the first frame.'),
    ('main.js', 147, 196, 110, 'Fresh, load, network and new boot order, degraded start, timer and cleanup.'),
    ('index.html', 749, 769, 110, 'Menu, news and main load order.'),
    ('package.json', 1, 17, 110, 'Shipped executable manifest and application version.'),
    ('menu.js', 197, 214, 110, 'New and load reload handshake and storage failure dialogs.'),
    ('menu.js', 310, 324, 111, 'Menu state and desktop/quit routes.'),
    ('menu.js', 635, 660, 111, 'Root menu actions, conditional items and version.'),
    ('menu.js', 874, 915, 111, 'Navigation pane dispatcher and click handlers.'),
    ('menu.js', 1056, 1104, 111, 'Settings feedback and immediately applied controls.'),
    ('menu.js', 1165, 1234, 111, 'Apply/cancel/escape, demo setup and restoring live settings.'),
    ('menu.js', 1315, 1345, 111, 'Fullscreen restore and external pane entry helpers.'),
    ('menu.js', 1346, 1363, 111, 'Mod relaunch decision at the menu boundary.'),
    ('menu.js', 1639, 1681, 111, 'Main lobby hold, Continue label and desktop native close callback.'),
    ('ui.js', 1096, 1150, 111, 'Modal escalation, ESC, quick keys and editing/walk gate.'),
    ('demomode.js', 287, 305, 111, 'Demo lobby amendments and version label.'),
    ('menu.js', 221, 305, 112, 'Built-in presets, form interpretation, boot mapping and storage.'),
    ('menu.js', 663, 724, 112, 'Form controls and declared bounds/defaults.'),
    ('menu.js', 917, 1024, 112, 'Slider labels, initial fauna, preset lifecycle and new-world action.'),
    ('menu.js', 1509, 1522, 112, 'Scenario buttons call the same boot handshake and pass the scenario ID.'),
    ('menu.js', 7, 148, 113, 'World record shape, plain state packing/unpacking and load checks.'),
    ('menu.js', 149, 196, 113, 'Metadata, thumbnail, save errors and JSON export.'),
    ('menu.js', 1026, 1055, 113, 'Named save, overwrite confirmation and file chooser import.'),
    ('menu.js', 1524, 1594, 113, 'Overwrite/load/delete lists and add-on world routing.'),
    ('menu.js', 1596, 1637, 113, 'Startup Continue selection, localized slots, quick save/load and autosave.'),
    ('savestore.js', 36, 78, 113, 'Store list ordering/read interface used by Continue.'),
    ('savestore.js', 85, 129, 113, 'Write result, browser fallback, migration and removal at menu boundary.'),
    ('mods.js', 1863, 1897, 113, 'Add-on world listing handoff and bootstrap reader.'),
    ('ui.js', 218, 228, 114, 'Buttons connect to the quick world lifecycle.'),
    ('ui.js', 596, 604, 114, 'Brush marks current world worth keeping.'),
    ('ui.js', 1008, 1095, 114, 'Dialogs, three regen outcomes, host gate and reset mutations.'),
    ('ui.js', 1162, 1171, 114, 'Second R press interval and fallback path.'),
    ('net.js', 243, 263, 114, 'Single-player callback vs room command and restriction toast.'),
    ('net.js', 317, 320, 114, 'Local and host time permissions.'),
    ('core.js', 1033, 1049, 114, 'Seed, terrain dispatch and flat/ocean starts.'),
    ('core.js', 1124, 1183, 114, 'New world effects, warmup and worldgen emit.'),
    ('goals.js', 239, 283, 114, 'Scenario opening, locks, delayed resolution and explicit close.'),
    ('goals.js', 375, 389, 114, 'Scenario persisted through save/load and ended by worldgen.'),
    ('fauna.js', 1913, 1919, 114, 'Animal state on worldgen and partial ownership reset.'),
    ('civ.js', 2369, 2379, 114, 'Shared lifecycle cache clearing by worldgen/reset.'),
    ('disasters.js', 366, 367, 114, 'Different disaster and burning cache resets.'),
    ('menunews.js', 1, 13, 115, 'Bundled menu news and source link declarations.'),
    ('menunews.js', 24, 49, 115, 'Roadmap, external link adapter, stored expansion and pane visibility.'),
    ('menunews.js', 74, 139, 115, 'Local news data, presentation selection and resize callback.'),
    ('changelog.js', 1, 4, 115, 'Bundled bilingual change data, recorded as shipped declarations.'),
    ('menu.js', 747, 764, 116, 'Credits text, data attribution and component list.'),
    ('menu.js', 1114, 1123, 116, 'Publisher and license file opening routes.'),
    ('credits.html', 1, 17, 116, 'Shipped sample Chromium credits stub.'),
]

FINDINGS = [
    ('STARTUP-CONTINUE', ['ML-10', 'ML-15', 'ML-26', 'ML-27'], ['M01', 'M02', 'M03', 'M04', 'M55'],
     'Only the startup Continue button auto-loads a recent eligible save. Missing valid metadata leads to the in-memory background world. Escape dismisses without auto-loading.'),
    ('FAILED-BOOT', ['ML-01', 'ML-04', 'ML-07', 'ML-22'], ['M32', 'M33', 'M54', 'M47'],
     'Boot is consumed at start. Failed load yields a default world, an alert toast and a bad-save entry capped at 20. Session storage errors prevent reload.'),
    ('SAVE-EXIT-FAILURE', ['ML-07', 'ML-08', 'ML-23', 'ML-26', 'ML-32'], ['M24', 'M25', 'M26'],
     'Quick regeneration requires successful save if selected. The new-game reload can proceed after exit-save failure. _saveOnExit returns true after a normal _slotWrite call even when the write returns null.'),
    ('NUMERIC-DEFAULT', ['ML-03', 'ML-18', 'ML-19'], ['M12', 'M15', 'M16', 'M34'],
     'Omission of starting climate from the form boot is by numeric equality, not by mutation history. Present climate values trigger a second worldgen notification.'),
    ('RESET-SCENARIO', ['ML-32', 'ML-37', 'ML-39', 'ML-40'], ['M27', 'M28', 'M49', 'M57'],
     'Quick regeneration ends the active scenario. Erase Life clears society and year-local history while retaining current clock, wildlife and scenario immediately after reset.'),
    ('AUTOSAVE-FAILURE', ['ML-26'], ['M41', 'M42', 'M56'],
     'Periodic autosave advances its integer-year guard before trying storage. A normal quota failure is not retried in that same year.'),
    ('LICENSE-STUB', ['ML-47', 'ML-48', 'ML-49'], ['M45', 'M53'],
     'The button targets credits.html beside the native executable. The shipped file identifies itself as a Chromium sample rather than a generated license list.'),
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    report = json.loads((ROOT / REPORT).read_text(encoding='utf-8'))
    assert report['work_package_id'] == PACKAGE
    assert report['failed'] == 0 and report['passed'] == len(report['results'])
    manifest = {row['path']: row for row in report['sources']}
    for name, row in manifest.items():
        data = (ROOT / name).read_bytes()
        assert digest(data) == row['sha256'] and len(data) == row['bytes'], name
        assert data == (ROOT / COPY / Path(name).name).read_bytes(), name
    rules = []
    for number, (name, start, end, source, summary) in enumerate(RANGES, 1):
        path = 'EarthSimulator/' + name
        lines = (ROOT / path).read_text(encoding='utf-8-sig').splitlines()
        assert 0 < start <= end <= len(lines), (name, start, end)
        rules.append({'id': f'ML-{number:02}', 'source_id': f'SRC-{source:03}', 'summary': summary,
                      'evidence_type': 'static_traced', 'source': {'path': path, 'sha256': manifest[path]['sha256'],
                      'line': start, 'end_line': end, 'source_lines': lines[start-1:end]}})
    result = {
        'format_version': '1.0.0', 'work_package_id': PACKAGE, 'date': '2026-11-15', 'game_version': '2.1.4',
        'path_base': 'repository_root', 'feature_ids': FEATURES, 'document_ids': DOCUMENTS,
        'source_ids': [f'SRC-{n:03}' for n in range(110, 118)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {'source_files': report['sources'], 'rea_source_selection': ['menu.js', 'menunews.js'],
                     'rea_parent_evidence_id': 'ev_2dab903ecdb5f5f83c25204c9682960578a3cdc29beefd99c829595f4c767107',
                     'rea_summary_evidence_id': 'ev_a7c9617a3f64a2deca0bc3921b8a41e2ee1cc727d30b0f6573eeff86714bf556',
                     'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                     'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
                     'rea_limits': ['2 JS files parsed, 16222 AST nodes, zero parse failures, 77 files outside selection.',
                                    'Application and semantic graphs partial: 77 and 8650 unknowns. Inert evidence.']},
        'declarations': report['declarations'], 'rules': rules,
        'findings': [{'id': key, 'evidence': refs, 'probe_ids': probes, 'conclusion': claim}
                     for key, refs, probes, claim in FINDINGS],
        'verification': {'command': 'node design-docs/tools/probe_menu.cjs', 'report_path': REPORT,
                         'test_copy_path': COPY, 'checks': report['results'],
                         'probe_script_sha256': digest((ROOT / 'design-docs/tools/probe_menu.cjs').read_bytes()),
                         'environment': report['environment'], 'runtime_verified': False},
        'limitations': ['The VM runs shipped handlers against substitute DOM, clocks, storage and shell. No rendered game, user saves, desktop process, external endpoint or room is observed.',
                        'Disk backend, Steam policy, mod execution, networking, scenario rules, settings engines and physical terrain detail remain their respective packages.',
                        'Localized change text and credits attributions are supplied content. They do not prove external availability or actual performance.'],
        'next_package': 'WP-WORLD-NATURE',
    }
    rule_ids = {r['id'] for r in rules}
    probe_ids = {r['id'].split('-', 1)[0] for r in report['results']}
    assert all(set(x['evidence']) <= rule_ids and set(x['probe_ids']) <= probe_ids for x in result['findings'])
    target = ROOT / 'design-docs/research/extraction-menu.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {report["passed"]} checks.')


if __name__ == '__main__':
    main()
