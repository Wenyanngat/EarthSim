"""Rebuild the baseline evidence index from shipped bytes and isolated probe results."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / 'EarthSimulator'
DOCS = ROOT / 'design-docs'


def read(path):
    return path.read_text(encoding='utf-8-sig')


def identity(path):
    data = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(),
            'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}


def main():
    report = json.loads(read(ROOT / '.research/wp-baseline/probe-results.json'))
    assert report['failed'] == 0 and report['passed'] == 26
    files = [identity(p) for p in sorted(GAME.glob('*.js'))]
    files += [identity(GAME / n) for n in ('index.html', 'package.json')]
    hashes = {x['path']: x['sha256'] for x in files}
    for source in report['sources']:
        assert hashes[source['path']] == source['sha256'], 'Probe results no longer match source'
    texts = {p.name: read(p) for p in GAME.glob('*.js')}
    texts['index.html'] = read(GAME / 'index.html')

    def location(name, anchor):
        text = texts[name]
        pos = text.index(anchor)
        line = text[:pos].count('\n') + 1
        return {'path': 'EarthSimulator/' + name, 'line': line,
                'sha256': hashes['EarthSimulator/' + name],
                'code_excerpt': text.splitlines()[line - 1]}

    definitions = [
        ('BASE-FRAME-DT', 'main.js', 'const dt = Math.min(now - _last, 200)', 'Each rAF frame; milliseconds; upper cap only.'),
        ('BASE-DEBT-ADD', 'main.js', '_climateAcc += dt * speed;', 'Unpaused local simulation; speed<=0 drops full-step debt.'),
        ('BASE-STEP-SELECT', 'main.js', 'const doCl = cl &&', 'Largest ready debt in milliseconds; climate wins ties.'),
        ('BASE-BUDGET', 'main.js', 'if (did > 0 && performance.now()', 'Soft 11 ms frame budget; first ready step always runs.'),
        ('BASE-DEBT-CUT', 'main.js', 'if (lag > SIM_LAG_CAP)', 'Only after a budget stop; equal subtraction, max debt 860 ms.'),
        ('BASE-RATE', 'main.js', 'if (_simWant > 4000', 'Local rate; done counts climate milliseconds, not civ work.'),
        ('BASE-PAUSE-DEBT', 'main.js', 'function simDropDebt()', 'Full steps become 165/429 ms; fractional debt survives.'),
        ('BASE-CALENDAR', 'climate.js', 'function climateStep()', 'Day modulo 360; year += 1/60; year event before climate update.'),
        ('BASE-CIV-CLOCK', 'civ.js', 'function civTick()', 'Increments simTick at start; emits civTick at successful end.'),
        ('BASE-MANUAL-STEP', 'ui.js', "netAct('step',", 'Exactly one climate/ecology/civ step; no scheduler or pause check inside handler.'),
        ('BASE-WALK-SPEED', 'walk.js', 'function walkSimSpeed()', 'World speeds 0, 0.02, 0.1; independent local walk clock.'),
        ('BASE-WALK-DT', 'walk.js', 'const dt = WK.last ?', 'Seconds, first frame .016, then clamp [.001,.1].'),
        ('BASE-WALK-TOD', 'walk.js', 'else if (!WK.paused && cyc) WK.tod', '720 second base scale; night factor 2.2; network may substitute nwTod.'),
        ('BASE-NET-STEP', 'net.js', 'function netStepOne(vt)', 'Chronological absolute thresholds 166/430; climate wins ties.'),
    ]
    rules = []
    for rid, name, anchor, scope in definitions:
        src = location(name, anchor)
        # Preserve surrounding shipped expressions without reimplementing them.
        lines = texts[name].splitlines()
        count = 8 if rid in ('BASE-CALENDAR', 'BASE-NET-STEP', 'BASE-PAUSE-DEBT') else 2
        start = src['line'] - 1
        src['end_line'] = min(len(lines), start + count)
        rules.append({'id': rid, 'source': src, 'source_ids': ['SRC-060'],
                      'verification': 'static_traced', 'scope': scope,
                      'source_lines': lines[start:start + count]})
    scripts = []
    html = texts['index.html']
    for match in re.finditer(r'<script\b([^>]*)>(.*?)</script>', html, re.I | re.S):
        attrs = match.group(1)
        src = re.search(r'\bsrc="([^"]+)"', attrs)
        scripts.append({'line': html[:match.start()].count('\n') + 1,
                        'kind': 'external' if src else 'inline',
                        'src': src.group(1) if src else None,
                        'attributes': attrs.strip(),
                        'body_sha256': hashlib.sha256(match.group(2).encode()).hexdigest() if not src else None})
    events, writes = [], []
    for name, text in texts.items():
        if not name.endswith('.js') or name == 'three.min.js':
            continue
        for num, line in enumerate(text.splitlines(), 1):
            if line.lstrip().startswith('//'):
                continue
            for match in re.finditer(r'\b(simOn|simEmit)\(\s*[\'"]([^\'"]+)[\'"]', line):
                events.append({'operation': match[1], 'event': match[2],
                               'path': 'EarthSimulator/' + name, 'line': num,
                               'excerpt': line.strip()[:300]})
            if re.search(r'W\.(simYear|simTick|dayOfYear|seasonPhase|paused|pace)\s*(?:\+\+|--|(?:[+*/-])?=(?!=))', line):
                writes.append({'path': 'EarthSimulator/' + name, 'line': num,
                               'excerpt': line.strip()[:500]})
    fields = report['declared_W_fields']
    result = {
        'format_version': '1.0.0', 'work_package_id': 'WP-BASELINE',
        'date': '2026-11-14', 'game_version': '2.1.4', 'path_base': 'repository_root',
        'feature_ids': ['FEAT-GAME-LOOP', 'FEAT-SIMULATION-TIME'],
        'document_ids': ['DOC-BASELINE', 'DOC-CLOCK-POPULATION'],
        'source_ids': ['SRC-058', 'SRC-059', 'SRC-060', 'SRC-061'],
        'status': {'declarations': 'extracted', 'baseline_static_chains': 'traced',
                   'isolated_checks': 'passed', 'runtime_observations': 'not_performed',
                   'runtime_verified': False},
        'scope': {'owned_modules': ['EarthSimulator/' + n for n in ('index.html', 'package.json', 'main.js', 'core.js')],
                  'cross_package_reads': [s['path'] for s in report['sources'] if s['path'].split('/')[-1] not in ('index.html', 'package.json', 'main.js', 'core.js')],
                  'excluded': ['Full subsystem algorithms', 'NW.js/Chromium/Steam internals', 'Real save storage', 'User mod execution', 'Game UI/runtime observations']},
        'identity': {'manifest': json.loads(read(GAME / 'package.json')),
                     'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                     'rea_parent_evidence_id': 'ev_e96ef1a8d90bd9ad952167ee9b85552f24c50ce0eb7213c9aee1295e70b3065e',
                     'rea_summary_evidence_id': 'ev_0a6fb760686676ecca75779cd24282f3d08c3d307384f067c1988f320507f0ff',
                     'rea_bundle_path': '.research/rea/wp-baseline-2026-11-14.evidence.json',
                     'source_files': files},
        'bootstrap': {'scripts_in_document_order': scripts,
                      'boot_entry': location('main.js', 'function start()'),
                      'grid_entry': location('core.js', 'const _boot ='),
                      'boot_parameters_entry': location('main.js', 'function _applyBootParams(cfg)'),
                      'limit': 'Base HTML order only; code mods can intercept subsequent scripts. User profile was not inspected.'},
        'state_contract': {'source': location('core.js', 'const W = {'),
                           'fields_after_core_initialization': fields,
                           'field_count': len(fields),
                           'typed_arrays': sum('length' in f for f in fields),
                           'typed_array_bytes_per_cell': sum(f.get('bytes_per_cell', 0) for f in fields),
                           'default_grid': [80, 60],
                           'default_grid_typed_array_bytes': 4800 * sum(f.get('bytes_per_cell', 0) for f in fields),
                           'limit': 'Initial core fields only; not a complete schema for late module properties.'},
        'events': {'declarations_from_core_comments': ['worldgen', 'reset', 'year', 'civTick', 'stateNew', 'stateDead', 'eraChange', 'war', 'peace', 'event', 'save', 'load'],
                   'bus_source': location('core.js', 'const SIM ='), 'literal_calls': events,
                   'limit': 'Line-based lexical candidates, not a call graph or reachability proof. Dynamic names, wrappers and user mods are not exhausted.'},
        'clock_write_candidates': {'occurrences': writes,
                                   'limit': 'Direct scalar writes only; aliases, indexed assignments and snapshot mutations are not exhausted.'},
        'rules': rules,
        'verification': {'command': 'node design-docs/tools/probe_baseline.cjs',
                         'report_path': '.research/wp-baseline/probe-results.json',
                         'test_copy_path': '.research/wp-baseline/test-copy/EarthSimulator',
                         'passed': report['passed'], 'failed': report['failed'],
                         'runtime_verified': False, 'checks': report['results']},
        'limitations': [
            'REA parsed core/main as inert syntax and HTML/package links; graph partial, 75 inventoried files outside selected analysis; three inline bodies read manually.',
            'Controlled VM probes execute shipped code with stubbed UI/storage/network; they are not observations of the running game.',
            'Each subsystem owns complete traces of its consumers; this baseline does not complete those packages.',
            'No original build process reproduced; manifest declarations do not establish runtime component versions.'],
        'open_questions': ['Cold start, failed load and final HUD in complete game test copy.',
                           'Measured step cost and SIM_RATE under load.',
                           'Visible manual step, pause, menu and walk transitions.',
                           'Network and minimized-window observations with matching builds and explicit mod list.'],
    }
    (DOCS / 'research/extraction-baseline.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Baseline: {len(files)} file identities, {len(scripts)} script tags, {len(events)} event candidates, {len(rules)} rules; probe hashes matched.")


if __name__ == '__main__':
    main()
