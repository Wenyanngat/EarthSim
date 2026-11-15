"""Export shipped map UI source intervals, declarations and separated VM checks."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = '.research/wp-map-interface/probe-results.json'
COPY = '.research/wp-map-interface/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-map-interface-2026-11-15.evidence.json'
PACKAGE = 'WP-MAP-INTERFACE'
FEATURES = [
    'FEAT-MAP-TOOLS', 'FEAT-MAP-LAYERS', 'FEAT-CELL-INSPECTION', 'FEAT-PLANET-CONTROLS',
    'FEAT-STATE-NAVIGATION', 'FEAT-STATE-METRICS', 'FEAT-STATE-HISTORY', 'FEAT-GLOBAL-STATISTICS',
    'FEAT-WORLD-STATUS', 'FEAT-STATE-CHRONICLE', 'FEAT-GLOBAL-CHRONICLE', 'FEAT-GEOGRAPHIC-NAMES',
    'FEAT-WORLD-HISTORY-MAP', 'FEAT-EVENT-NOTIFICATIONS', 'FEAT-CITY-REGISTER', 'FEAT-CITY-CARD',
]
DOCUMENTS = [
    'DOC-MAP-DATA', 'DOC-STATISTICS-HISTORY', 'DOC-TOOLS', 'DOC-MAP-LAYERS', 'DOC-OBSERVATION',
    'DOC-WORLD-STATUS', 'DOC-CITIES', 'DOC-STATE-NAVIGATION', 'DOC-STATE-HISTORY', 'DOC-CHRONICLE',
    'DOC-CLIMATE-ECOLOGY',
]

# Each group corresponds to one entry in the source registry.
RANGES = {
    135: [
        ('ui.js', 5, 50, 'Tool state, mode names and point/area declarations.'),
        ('ui.js', 243, 283, '2D pointer, wheel, drag, battle and inspection dispatch.'),
        ('ui.js', 427, 477, 'Speed, mode switch, layer order and focus.'),
        ('ui.js', 482, 519, 'Tool categories, locks, visibility and layer activation.'),
        ('ui.js', 599, 668, 'Paint mutations, point latch and room dispatch/restore.'),
        ('ui.js', 730, 805, 'Point eligibility, biome paint and finish order.'),
        ('ui.js', 1116, 1171, 'Keyboard focus, modal escape, actions and confirmation.'),
        ('render.js', 1925, 1957, 'Logical coordinate conversion, cursor zoom and pan bounds.'),
        ('world3d.js', 691, 718, 'Ray intersections and 3D cell pick.'),
        ('world3d.js', 5684, 5715, 'Local and deferred view redraw after terrain edits.'),
        ('world3d.js', 5767, 5842, '3D inspection versus drag, painting and wheel zoom.'),
        ('world3d.js', 6051, 6056, '2D/3D view entry and fallback.'),
        ('net.js', 244, 265, 'Room command adapter and local dispatch boundary.'),
        ('net.js', 306, 320, 'Mode and permission getters used by the UI.'),
    ],
    136: [
        ('core.js', 120, 135, 'Registered thematic layer API.'),
        ('ui.js', 444, 465, 'Thematic order, layer buttons and extension placement.'),
        ('ui.js', 537, 594, 'Layer selection and legends, top-biome and top-nation lists.'),
        ('ui.js', 705, 727, 'Independent overlay switches and popup.'),
        ('render.js', 46, 68, 'Device buffer and logical scale bounds.'),
        ('render.js', 579, 647, 'Bake budget, low-detail fallback and minimap adapter.'),
        ('render.js', 776, 836, 'Alpha-aware bilinear layer fields and built-in ramps.'),
        ('render.js', 837, 878, 'Area layer dispatch and cell attributes.'),
        ('render.js', 880, 997, 'Area mix and rebuild order.'),
        ('render.js', 999, 1060, 'Frame order and dirty/step overlay refresh.'),
        ('render.js', 1390, 1401, 'Local overlay preferences and renderer sync.'),
        ('render.js', 1760, 1798, '2D wind and current draw setup.'),
        ('render.js', 1798, 1906, 'Vector layers, isolines and labels.'),
        ('world3d.js', 852, 935, 'Layer colors on 3D texture and selection masks.'),
        ('world3d.js', 937, 952, 'Overlay cell palette and 2D/3D differences.'),
        ('world3d.js', 2017, 2036, 'Independent map marks in 3D.'),
        ('world3d.js', 5978, 6048, '3D refresh routing at frame boundary.'),
        ('society.js', 343, 419, 'Seven registered territory, economy and epidemic fields.'),
        ('fauna.js', 1892, 1909, 'Registered hybrid fauna fill.'),
        ('trade.js', 1697, 1713, 'Trade legend, overlay and hover information.'),
    ],
    137: [
        ('ui.js', 117, 141, 'Wind/current unit scale and brush cursor setup.'),
        ('ui.js', 816, 897, 'Cell inspector, area label, warnings and summaries.'),
        ('ui.js', 963, 1001, 'HUD aggregation, overall era and speed feedback.'),
        ('ui.js', 1179, 1204, 'Brush cursor area and target error display.'),
        ('ui.js', 1211, 1263, 'Hover throttling, tooltip delay and layer data.'),
        ('ui.js', 1267, 1365, 'Planet command bounds, sliders, text and sync.'),
        ('units.js', 14, 59, 'Local display settings and temperature, length and weight units.'),
        ('units.js', 81, 98, 'Unit preference update and localization hook.'),
        ('index.html', 518, 529, 'Real brush controls and ranges.'),
        ('index.html', 571, 594, 'Planet markup, actual ranges and initial values.'),
        ('main.js', 98, 110, 'Frame timing for HUD and hover refresh.'),
    ],
    138: [
        ('custom.js', 710, 717, 'Label record used in both renderers.'),
        ('custom.js', 953, 994, 'Display filters, geographic names and place kinds.'),
        ('custom.js', 1003, 1142, 'Pick anchors, edit dialog, validation and action buttons.'),
        ('custom.js', 1144, 1221, 'Pick state, 2D/3D hit testing and capture before painting.'),
        ('custom.js', 1225, 1275, 'Geographic command/list transfer and persistence.'),
        ('render.js', 1256, 1334, 'Visible label placement, overlap and hit boxes in 2D.'),
        ('world3d.js', 4442, 4570, 'Projected label rendering and hit boxes in 3D.'),
    ],
    139: [
        ('uikit.js', 8, 24, 'Generic presentation and finite-number conversions.'),
        ('uikit.js', 234, 322, 'Modal stack, pause, tooltip and toast lifetime primitives.'),
        ('uikit.js', 326, 361, 'Table sort, row clipping, missing values and click delegation.'),
        ('uikit.js', 362, 429, 'Chart scale, missing points, DPR and mouse lookup.'),
        ('ui.js', 899, 962, 'Transient hover and pinned nation, summary cards.'),
        ('ui.js', 1419, 1444, 'Nation flag pattern and nearby city pick.'),
        ('panels.js', 236, 313, 'City card thresholds, cell projections, minimap and actions.'),
        ('panels.js', 624, 638, 'State detail route and legacy lightweight card.'),
        ('flags.js', 195, 236, 'Country flag image, locale and option state.'),
        ('stats.js', 1013, 1025, 'Stable world-statistics nation flag cache.'),
    ],
    140: [
        ('stats.js', 14, 76, 'Limits, defaults and history storage contract.'),
        ('stats.js', 83, 137, 'State and world metrics, units, encoding and forest IDs.'),
        ('stats.js', 202, 218, 'War participation and state projection.'),
        ('stats.js', 268, 308, 'Live and snapshot world aggregation.'),
        ('stats.js', 801, 831, 'View defaults and cached live measurement.'),
        ('stats.js', 1096, 1146, 'Statistics window tick, tabs, open and close.'),
        ('stats.js', 1147, 1200, 'Chart planning, delta labels and climate metrics.'),
        ('stats.js', 1218, 1320, 'World chart, feed, record cards and tab state.'),
        ('stats.js', 1323, 1502, 'Live/dead nation rows, presets, filtering and CSV.'),
        ('stats.js', 1503, 1580, 'Rank keys, long-run growth and rankings.'),
        ('stats.js', 1582, 1644, 'City register projection, sorting, search and CSV.'),
        ('stats.js', 1648, 1691, 'Global war table and current/archived counts.'),
        ('stats.js', 1760, 1844, 'Society rankings, tables and history presentation.'),
        ('stats.js', 1845, 1912, 'Science registry, dates and aggregate leaders.'),
        ('stats.js', 1929, 1989, 'Nature dashboard, active disasters, fauna and resources.'),
        ('stats.js', 1992, 2083, 'Comparison selection, styles, series alignment and summary.'),
        ('stats.js', 2093, 2121, 'Cached current land beneath history and overview maps.'),
        ('stats.js', 2122, 2258, 'Timelapse map, labels, navigation and playback.'),
        ('stats.js', 2314, 2421, 'State chart/header/footer, tab gating and state window.'),
        ('stats.js', 2423, 2534, 'Historic peak map and live map modes.'),
        ('stats.js', 2535, 2634, 'Overview ranks, trend panels, history and relation labels.'),
        ('stats.js', 2636, 2716, 'Diplomacy, cities, economy and optional trade.'),
        ('stats.js', 2717, 2795, 'State wars, rulers, chronicle tab and service surface.'),
    ],
    141: [
        ('stats.js', 150, 201, 'Historical records and initial arrays by UID.'),
        ('stats.js', 219, 265, 'Sample rows, timeline alignment, peaks and changes.'),
        ('stats.js', 311, 377, 'Series thinning, archive retention and death.'),
        ('stats.js', 378, 462, 'Full/delta frames, RLE palette, thinning and capture.'),
        ('stats.js', 477, 510, 'Scheduled sampling and nation hooks.'),
        ('stats.js', 536, 576, 'Archived war records and bootstrap.'),
        ('stats.js', 578, 628, 'Metric column pack/unpack, quantization and gaps.'),
        ('stats.js', 629, 742, 'Saved rows, pools and frames, decoding and migration.'),
        ('stats.js', 744, 780, 'Public series, diagnostics and hook registration.'),
        ('menu.js', 78, 88, 'Generic save extension event.'),
        ('menu.js', 127, 138, 'Generic load event after terrain and city setup.'),
    ],
    142: [
        ('civ.js', 38, 55, 'Chronicle creation, cap, and event identity payload.'),
        ('panels.js', 7, 51, 'World chronology groups and validated focus routing.'),
        ('panels.js', 109, 149, 'Chronicle filters and links, toast hooks and lifecycle reset.'),
        ('panels.js', 151, 231, 'World chronology badge, filters and notification queue.'),
        ('stats.js', 139, 149, 'Default importance and derived event categories.'),
        ('stats.js', 511, 534, 'Historical event insertion and retention eligibility.'),
        ('stats.js', 1042, 1104, 'War list identity, window actions and delegated links.'),
        ('stats.js', 2264, 2313, 'Chronicle from history, deduplication and dependent states.'),
    ],
}

# IDs refer to zero-padded probe numbers; sources cover the static scope in parallel.
FINDINGS = [
    ('MAP-INPUT', [135, 139], [9, 10, 11, 12, 58],
     '2D input maps logical pixels and 3D distinguishes a click from orbit drag. Both use shared brush and inspection functions.'),
    ('LAYER-PARITY', [136], list(range(1, 9)),
     'Registered cell colors go to both renderers. Built-in layer alpha differs and 2D pollution paints a distinct fallout ramp.'),
    ('PLANET-BOUNDS', [137], [16, 17, 59],
     'Visible CO2 and pace ranges are narrower than the planet action. Sea drag and release apply at different points.'),
    ('INSPECTION-HUD', [137, 138, 140], [13, 14, 15, 18, 19, 20, 21, 57],
     'Cell display uses current climate, global summaries use land-only smoothed climate. HUD and statistics have different all-water defaults.'),
    ('TABLE-AND-CARD', [139, 140], [39, 40, 41, 42, 49, 50, 51, 52],
     'Table rows sort before clipping, CSV follows shown rows and locale, city tiers and city occupancy use separate thresholds.'),
    ('STATISTICS-UI', [139, 140, 142], [34, 35, 36, 37, 38, 53, 54],
     'Statistics and archive windows have specific tabs and filters. Mixed-unit charts normalize by series; dead entries expose a restricted page.'),
    ('HISTORY-ENCODING', [140, 141], list(range(22, 34)) + [55],
     'The global time axis and owner UID timeline coarsen separately. Owner deltas are rebuilt and the save retains quantized rows and missing values.'),
    ('CHRONICLE-TOASTS', [139, 141, 142], [43, 44, 45, 46, 47, 48, 56],
     'Map, world statistics and nation feeds have separate eligibility. Focus checks stable identity and delayed toasts expire.'),
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    report = json.loads((ROOT / REPORT).read_text(encoding='utf-8'))
    assert report['work_package_id'] == PACKAGE and report['failed'] == 0
    manifest = {r['path']: r for r in report['sources']}
    loaded = {}
    rules = []
    for source, entries in RANGES.items():
        for name, start, end, summary in entries:
            path = f'EarthSimulator/{name}'
            if path not in loaded:
                raw = (ROOT / path).read_bytes()
                assert digest(raw) == manifest[path]['sha256'], path
                loaded[path] = raw.decode('utf-8-sig').splitlines()
            lines = loaded[path]
            assert 0 < start <= end <= len(lines), (name, start, end, len(lines))
            rules.append({'id': f'MI-{len(rules)+1:02}', 'source_id': f'SRC-{source:03}', 'summary': summary,
                          'evidence_type': 'static_traced', 'source': {'path': path, 'sha256': manifest[path]['sha256'],
                          'line': start, 'end_line': end, 'source_lines': lines[start-1:end]}})
    findings = [{'id': key, 'evidence': [r['id'] for r in rules if int(r['source_id'][4:]) in refs],
                 'probe_ids': [f'MI{n:02}' for n in probes], 'conclusion': summary}
                for key, refs, probes, summary in FINDINGS]
    check_ids = {r['id'].split('-', 1)[0] for r in report['results']}
    assert all(f['evidence'] and set(f['probe_ids']) <= check_ids for f in findings)
    result = {
        'format_version': '1.0.0', 'work_package_id': PACKAGE, 'date': '2026-11-15', 'game_version': '2.1.4',
        'path_base': 'repository_root', 'feature_ids': FEATURES, 'document_ids': DOCUMENTS,
        'source_ids': [f'SRC-{n:03}' for n in range(135, 144)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {'source_files': report['sources'], 'rea_source_selection': ['ui.js','stats.js','panels.js'],
                     'rea_parent_evidence_id': 'ev_2cdd6e0ce4654ae3eac82d1a62618fb04d53cabec1e82c86aad717f5a697a62b',
                     'rea_summary_evidence_id': 'ev_9cc7ee0b177556af85a0c5e650ff58407f0e52005326736c798bb161775e2af3',
                     'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                     'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
                     'rea_limits': ['Three JS files parsed, 70814 AST nodes, zero parse failures, 76 other files unselected.',
                                    'Partial application and semantic graphs: 76 and 32516 unknowns.']},
        'declarations': report['declarations'], 'rules': rules, 'findings': findings,
        'verification': {'command': 'node design-docs/tools/probe_map.cjs', 'report_path': REPORT,
                         'test_copy_path': COPY, 'checks': report['results'],
                         'probe_script_sha256': digest((ROOT / 'design-docs/tools/probe_map.cjs').read_bytes()),
                         'environment': report['environment'], 'runtime_verified': False},
        'limitations': ['VM tests substitute DOM, timers, localization, commands and Canvas drawing primitives.',
                        'A test-only read port exposes selected statistics closures without rewriting any copied file.',
                        '2D and 3D input test handlers in fixtures; the 3D coordinate pick is substituted. Displayed layout, WebGL cost, audio, live network and actual file downloads remain unmeasured.',
                        'Underlying simulation, trade, and room logic are recorded at their input or display boundary.'],
        'next_package': 'WP-WALK-CORE',
    }
    target = ROOT / 'design-docs/research/extraction-map.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {report["passed"]} checks.')


if __name__ == '__main__':
    main()
