"""Export traced world-effect ranges and compose independently scoped probes."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'design-docs'
OUT = ROOT / '.research/wp-walk-world-effects'
PACKAGE = 'WP-WALK-WORLD-EFFECTS'
SCRIPT = 'design-docs/tools/probe_walk_world_effects.cjs'
BUNDLE = '.research/rea/wp-walk-world-effects-2026-11-15.evidence.json'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    probe = json.loads((OUT / 'probe-results.json').read_text(encoding='utf-8'))
    assert probe['work_package_id'] == PACKAGE and probe['failed'] == 0
    scope = json.loads((DOCS / 'research/feature-scope.json').read_text(encoding='utf-8'))
    package = next(p for p in scope['work_packages'] if p['id'] == PACKAGE)
    meta = json.loads((OUT / 'rea-metadata.json').read_text(encoding='utf-8'))
    manifest = {r['path']: r for r in probe['sources']}
    rules, findings, groups, limits, labels = [], [], [], [], {}
    for kind in ('trade', 'strike', 'combat'):
        data = json.loads((OUT / f'{kind}-findings.json').read_text(encoding='utf-8'))
        groups.extend(data['groups'])
        limits.extend(data.get('limitations', []))
    for number, group in enumerate(groups, 196):
        sid = f'SRC-{number}'
        refs = []
        for entry in group['entries']:
            path = f'EarthSimulator/{entry["file"]}'
            raw = (ROOT / path).read_bytes()
            assert digest(raw) == manifest[path]['sha256'], path
            lines = raw.decode('utf-8-sig').splitlines()
            start, end = entry['start'], entry['end']
            assert 0 < start <= end <= len(lines), (path, start, end)
            rid = f'WE-{len(rules) + 1:03}'
            refs.append(rid)
            rules.append({'id': rid, 'source_id': sid, 'summary': entry['summary'], 'evidence_type': 'static_traced',
                          'source': {'path': path, 'sha256': manifest[path]['sha256'], 'line': start,
                                     'end_line': end, 'source_lines': lines[start - 1:end]}})
        ids = [r['id'].split('-', 1)[0] for r in probe['results']
               if r['id'].split('-', 1)[1] in group['probe_groups']]
        assert ids, (group['key'], group['probe_groups'])
        labels[group['key']] = sid
        findings.append({'id': group['key'], 'evidence': refs, 'probe_ids': ids,
                         'conclusion': group['conclusion']})
    report_source = f'SRC-{196 + len(groups)}'
    ids = [f'SRC-{i}' for i in range(196, 197 + len(groups))]
    result = {
        'format_version': '1.0.0', 'work_package_id': PACKAGE, 'date': '2026-11-15', 'game_version': '2.1.4',
        'path_base': 'repository_root', 'feature_ids': package['feature_ids'],
        'document_ids': ['DOC-WALK-WORLD-EFFECTS', 'DOC-WALK-COMBAT', 'DOC-WALK-WORLD-EFFECTS-DATA'],
        'source_ids': ids,
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {'source_files': probe['sources'], 'rea_source_selection': ['walktrade.js', 'walkstrike.js', 'walkmil.js'],
                     'rea_parent_evidence_id': meta['parent'], 'rea_summary_evidence_id': meta['summary_id'],
                     'rea_artifact_sha256': meta['artifact']['sha256'], 'rea_bundle_path': BUNDLE,
                     'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
                     'rea_limits': ['Three selected JavaScript files; 74232 AST nodes; zero parse failures; 76 inventoried files unselected.',
                                    'Partial application and semantic graphs: 76 application and 22206 semantic unknowns.',
                                    'Semantic node retention reached 20000 per file. Two retained evidence records exported.']},
        'declarations': probe['declarations'], 'rules': rules, 'findings': findings,
        'verification': {'command': f'node {SCRIPT}', 'report_path': '.research/wp-walk-world-effects/probe-results.json',
                         'test_copy_path': '.research/wp-walk-world-effects/test-copy/EarthSimulator',
                         'checks': probe['results'], 'probe_script_sha256': digest((ROOT / SCRIPT).read_bytes()),
                         'environment': probe['environment'], 'parts': probe['parts'], 'runtime_verified': False},
        'limitations': list(dict.fromkeys(limits + [
            'Synthetic actors, map, wallet, geometry and command adapters isolate selected behavior; no full game runtime observed.',
            'Online direct-call reentry, low-level repeated map apply and injected local-step failures establish scoped program behavior, not a reproduced UI exploit.',
            'Visuals, sound, complete local fights, actual multiplayer authority delivery, disk persistence and performance remain unobserved.'])),
        'next_package': 'WP-NETWORK',
    }
    target = DOCS / 'research/extraction-walk-world-effects.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (OUT / 'source-map.json').write_text(json.dumps({'groups': labels, 'report': report_source}, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {probe["passed"]} checks, sources {ids[0]} through {ids[-1]}.')


if __name__ == '__main__':
    main()
