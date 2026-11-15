"""Record terrain and nature declarations, exact source intervals, and VM observations."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = '.research/wp-nature/probe-results.json'
COPY = '.research/wp-nature/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-nature-2026-11-15.evidence.json'
PACKAGE = 'WP-WORLD-NATURE'
FEATURES = [
    'FEAT-WORLD-CREATE', 'FEAT-REAL-EARTH', 'FEAT-GEOGRAPHIC-NAMES', 'FEAT-CLIMATE',
    'FEAT-BIOMES-ECOLOGY', 'FEAT-HYDROLOGY', 'FEAT-MINERAL-RESOURCES', 'FEAT-POLLUTION',
    'FEAT-PLANET-CONTROLS', 'FEAT-WORLD-REGENERATE', 'FEAT-SOCIETY-RESET',
]
DOCUMENTS = [
    'DOC-NATURE-DATA', 'DOC-WORLD-TERRAIN', 'DOC-REAL-EARTH', 'DOC-CLIMATE-ECOLOGY',
    'DOC-CLOCK-POPULATION', 'DOC-WORLD-GENERATION', 'DOC-NEW-GAME',
]

RANGES = [
    ('core.js', 5, 24, 118, 'Boot size gate, grid, neighborhoods and typed arrays.'),
    ('core.js', 26, 84, 118, 'Physical, climatic, ecological and history state.'),
    ('core.js', 138, 192, 118, 'Grid coordinates, interpolation, hash and fractal noise.'),
    ('core.js', 1005, 1032, 118, 'Spin-up, seasonal calendar, fallback averaging and seeded RNG.'),
    ('core.js', 1033, 1126, 118, 'All dispatch paths, signed seed, Gaussians, quantile, ridges and sea normalization.'),
    ('core.js', 1128, 1189, 118, 'Terrain-derived state, resets, warm-up, initial biomes and worldgen.'),
    ('mods.js', 1979, 1995, 118, 'Shape validation, heightmap read and core handoff.'),
    ('index.html', 710, 715, 119, 'Packaged elevation and climate source precedes core and solvers.'),
    ('earthdata.js', 1, 15, 119, 'Dataset declarations, comments and encoding; packed data marked by file hash.'),
    ('core.js', 676, 719, 119, 'Earth constants and compressed raster decode.'),
    ('core.js', 720, 776, 119, 'Terrain-area weights, bilinear normal interpolation and lowland lift.'),
    ('core.js', 778, 844, 119, 'Nine straits and limited shallow connections using water components.'),
    ('core.js', 846, 913, 119, 'Priority flood, island and lake retention, target climate and pole marker.'),
    ('core.js', 916, 1001, 119, 'Ellipses, terrain and land mask for the no-data fallback.'),
    ('core.js', 254, 280, 120, 'Eight-neighbor landmass rebuild and island designation.'),
    ('core.js', 307, 475, 120, 'Land/water place declarations and coordinate boundary rules.'),
    ('core.js', 478, 668, 120, 'Cache, land seeds, water regions, localized name and public lookup.'),
    ('custom.js', 12, 47, 120, 'Manual and people-name limits and thresholds.'),
    ('custom.js', 637, 709, 120, 'Earth region adapter, water/land components and active anchors.'),
    ('custom.js', 757, 841, 120, 'Mask signature, label cache and territorial ownership of anchors.'),
    ('custom.js', 953, 1001, 120, 'Visibility and lookup priority for manual, real and people names.'),
    ('custom.js', 1225, 1275, 120, 'Geographic list action, save, migration, worldgen and reset.'),
    ('custom.js', 1304, 1393, 120, 'Automatic name state, syllables, collision avoidance and kind thresholds.'),
    ('custom.js', 1401, 1443, 120, 'Automatic land areas, thresholds and deep anchors.'),
    ('custom.js', 1444, 1568, 120, 'Automatic water areas, coast association and cache.'),
    ('custom.js', 1569, 1694, 120, 'Winning anchors, population/language accumulation, rename and retention.'),
    ('custom.js', 1696, 1778, 120, 'Automatic labels, deserialization, annual scheduling and shipped labels.'),
    ('core.js', 1193, 1216, 121, 'Precipitation-fed steepest descent and normalized river index.'),
    ('core.js', 1219, 1290, 121, 'Water, depth, slope, coast, land distance and basin side.'),
    ('core.js', 1292, 1364, 121, 'Current relaxation solve, live vectors and upwind wetness.'),
    ('disasters.js', 350, 364, 121, 'Annual live sea reference, accumulated drift and recalculation.'),
    ('climate.js', 9, 114, 122, 'Constants, insolation, belt interpolation, monsoon and orographic wind.'),
    ('climate.js', 116, 224, 122, 'Ocean influence, latitude targets, advection, diffusion and counters.'),
    ('climate.js', 226, 312, 122, 'Phase and year, temperature pass, ice, pulse decay and smoothed fields.'),
    ('climate.js', 315, 409, 122, 'Evaporation, moisture transport, rainfall zones, anomaly and smoothing.'),
    ('climate.js', 414, 451, 122, 'Earth calibration data layout and temperature / rain bias application.'),
    ('climate.js', 453, 502, 122, 'Calibrate annual residuals, encode them and load older worlds.'),
    ('ecology.js', 6, 77, 123, 'Twenty biomes, render/development entries and ecology parameters.'),
    ('ecology.js', 82, 139, 123, 'Miami productivity, fertility and mod rule registration.'),
    ('ecology.js', 140, 203, 123, 'Classification priorities and Whittaker threshold table.'),
    ('ecology.js', 225, 298, 123, 'Stripes, succession, confirmation, surface transition and migration.'),
    ('core.js', 211, 243, 124, 'Resource types, eras, veins, hill preference and shallow-water oil.'),
    ('civ.js', 869, 909, 124, 'Offshore cache, adjacent owner, count aggregation and economy input.'),
    ('civ.js', 1704, 1734, 124, 'Industry, pollution, green transition, vegetation sink and CO2.'),
    ('ecology.js', 205, 219, 124, 'Advect pollution over the entire grid above a threshold.'),
    ('main.js', 4, 63, 125, 'Paired climate/ecology step, civilization step and frame budget.'),
    ('main.js', 124, 145, 125, 'Climate boot parameters, second spin-up and worldgen notification.'),
    ('ui.js', 596, 633, 125, 'Brush writes and touched flags for each local field.'),
    ('ui.js', 780, 805, 125, 'Brush commit recompute order and dirty flags.'),
    ('ui.js', 1064, 1093, 125, 'Regeneration and society reset routes.'),
    ('ui.js', 1267, 1332, 125, 'Planet action bounds, sea drag/release and global settings bindings.'),
    ('menu.js', 9, 29, 125, 'Scalar whitelist, derived array exclusions and typed byte encoding.'),
    ('menu.js', 78, 135, 125, 'Save/load order, old resources, sea defaults and load hooks.'),
]

FINDINGS = [
    ('PROCEDURAL-SEED', [3, 5, 42], ['N01', 'N02', 'N03'],
     'At each tested template the same seed and dimensions yield identical elevation and deposit arrays.'),
    ('SPIN-CALENDAR', [4, 6, 34], ['N06', 'N10', 'N12', 'N24'],
     'Normal spin-up leaves day 356, Earth paths restore day 80, and generation suppresses year broadcasts.'),
    ('EARTH-DATA', [9, 10, 11, 12, 13, 14], ['N07', 'N08', 'N09', 'N12', 'N45', 'N46'],
     'Earth reads local rasters, converts them at the requested resolution and can cut shallow straits and fill land pits. No-data boot uses the sketch.'),
    ('EARTH-CALIBRATION', [36, 37, 53], ['N10', 'N11'],
     'Three rounds fit quantized corrections while smoothed fields are seeded exactly to the targets. Save without corrections zeros the fields.'),
    ('GEOGRAPHIC-NAMES', [16, 17, 21, 22, 26], ['N13', 'N14', 'N48'],
     'Geographic lookup depends on the Earth flag and territorial cache. Player names survive reset, and a competing language can replace a people name after the hold period.'),
    ('TERRAIN-DERIVATIVES', [15, 28, 29, 30], ['N15', 'N16', 'N17', 'N18', 'N20', 'N21', 'N22', 'N23'],
     'Static water and land geometry use distinct neighborhoods; rivers follow a strict descent. Currents can retain values between deferred solves.'),
    ('SHALLOW-OIL', [42, 43, 49], ['N19', 'N47'],
     'Oil generation tests shallow water and noise without a coast flag. Offshore counting requires an adjacent nation.'),
    ('SEA-BUFFER', [31, 51, 52, 53], ['N29', 'N30', 'N32', 'N44'],
     'Sea changes are accumulated before shore recompute. In-place application leaves the existing buffer in memory. Sea release performs three climate steps.'),
    ('CO2-LIMITS', [34, 44, 51], ['N25', 'N31', 'N33', 'N34'],
     'The greenhouse term uses log2, and the civilization update clamps CO2 to a narrower interval than the planet handler.'),
    ('BIOME-CATEGORIES', [38, 39, 40, 41], ['N35', 'N36', 'N37', 'N38', 'N39', 'N40', 'N41', 'N43'],
     'The direct transition tests numeric IDs 0–2, so a modded water ID may follow confirmation. Legacy saves move slots starting at 19.'),
    ('POLLUTION-SCALES', [34, 41, 44, 45], ['N28', 'N34', 'N42', 'N49'],
     'Smog is transported and decays each ecology call. Fallout decays more slowly, and volcanic soil decays on visited dry cells.'),
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    report = json.loads((ROOT / REPORT).read_text(encoding='utf-8'))
    assert report['work_package_id'] == PACKAGE and report['failed'] == 0
    manifest = {r['path']: r for r in report['sources']}
    rules = []
    for number, (name, start, end, source, summary) in enumerate(RANGES, 1):
        path = 'EarthSimulator/' + name
        raw = (ROOT / path).read_bytes()
        assert digest(raw) == manifest[path]['sha256'], path
        lines = raw.decode('utf-8-sig').splitlines()
        assert 0 < start <= end <= len(lines), (name, start, end)
        rules.append({'id': f'WN-{number:02}', 'source_id': f'SRC-{source:03}', 'summary': summary,
                      'evidence_type': 'static_traced', 'source': {'path': path, 'sha256': manifest[path]['sha256'],
                      'line': start, 'end_line': end, 'source_lines': lines[start-1:end]}})
    findings = [{'id': key, 'evidence': [f'WN-{n:02}' for n in refs], 'probe_ids': probes, 'conclusion': claim}
                for key, refs, probes, claim in FINDINGS]
    rule_ids = {r['id'] for r in rules}
    probe_ids = {r['id'].split('-', 1)[0] for r in report['results']}
    assert all(set(x['evidence']) <= rule_ids and set(x['probe_ids']) <= probe_ids for x in findings)
    result = {
        'format_version': '1.0.0', 'work_package_id': PACKAGE, 'date': '2026-11-15', 'game_version': '2.1.4',
        'path_base': 'repository_root', 'feature_ids': FEATURES, 'document_ids': DOCUMENTS,
        'source_ids': [f'SRC-{n:03}' for n in range(118, 127)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {'source_files': report['sources'], 'rea_source_selection': ['core.js', 'climate.js', 'ecology.js'],
                     'rea_parent_evidence_id': 'ev_916f584495b4a188defe6d7c39c2a91994c7e1f32a01af6a79ec11a2e92deb6e',
                     'rea_summary_evidence_id': 'ev_5361993ae450843fc08ee9f21100fe099ad41423a01f69dc3631d5e6b7f1e599',
                     'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                     'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
                     'rea_limits': ['3 JS files parsed, 25330 AST nodes, zero parse failures; 76 files outside selection.',
                                    'Application and semantic graphs partial: 76 and 10539 unknowns.']},
        'declarations': report['declarations'], 'rules': rules, 'findings': findings,
        'verification': {'command': 'node design-docs/tools/probe_nature.cjs', 'report_path': REPORT,
                         'test_copy_path': COPY, 'checks': report['results'],
                         'probe_script_sha256': digest((ROOT / 'design-docs/tools/probe_nature.cjs').read_bytes()),
                         'environment': report['environment'], 'runtime_verified': False},
        'limitations': ['The VM uses copied scripts, substitute DOM and in-memory save fields. It neither starts the game nor touches user saves.',
                        'Attribution comes from the bundled header. Long-term calibration accuracy, frame performance and label rendering remain unmeasured.',
                        'Disaster actions, add-on editor, label UI and networking remain in their own packages.'],
        'next_package': 'WP-DISASTERS-DIVINE',
    }
    target = ROOT / 'design-docs/research/extraction-nature.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {report["passed"]} checks.')


if __name__ == '__main__':
    main()
