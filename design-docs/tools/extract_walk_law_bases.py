"""Export walk law and base evidence from shipped bytes and isolated fixtures."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'design-docs'
PACKAGE = 'WP-WALK-LAW-BASES'
REPORT = '.research/wp-walk-law-bases/probe-results.json'
COPY = '.research/wp-walk-law-bases/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-walk-law-bases-2026-11-15.evidence.json'
SCRIPT = 'design-docs/tools/probe_walk_law_bases.cjs'
DOCUMENTS = ['DOC-REPUTATION-LAW', 'DOC-WALK-PALACE-AUDIENCE', 'DOC-WALK-PURSUIT-BASES', 'DOC-WALK-LAW-BASES-DATA']

GROUPS = {
    161: ('CRIME-ROUTING', ('crime',), 'Witnesses, local law, offence type and separate hooks control standing, heat, reactions and current travel restrictions.', [
        ('index.html', 729, 738, 'Registration order of base actions, law, economy, military and transport modules.'),
        ('walkact.js', 58, 99, 'Hook delivery and explicit teleport interlock.'),
        ('walkact.js', 2617, 2635, 'Local witness classification, offence dispatch and fallback.'),
        ('walkact.js', 2952, 3003, 'Actor damage, revenge, guard and ruler death, and crime dispatch.'),
        ('walkact.js', 6405, 6414, 'Held weapon warning through ordinary patrols.'),
        ('walklaw.js', 169, 209, 'Current stars, point accumulation, owner and stand-down.'),
        ('walklaw.js', 248, 308, 'Crime escalation, temporary detention and teleport refusal.'),
        ('walklaw.js', 1710, 1754, 'Battle zone boundary, local soldiers and defensive response.'),
        ('walkeco.js', 1901, 1923, 'Crimes update standing independently from active stars.'),
    ]),
    162: ('PURSUIT', ('pursuit',), 'Sight and last-seen information change pursuit state. Police response depends on era, roads, recent perception and whether the avatar is reachable.', [
        ('walklaw.js', 24, 52, 'Pursuit timing, escalation and foot reinforcement balance.'),
        ('walklaw.js', 84, 109, 'Car and mounted caps, roadblock conditions and live state.'),
        ('walklaw.js', 130, 165, 'Visibility, geometry, last seen pose and reachability.'),
        ('walklaw.js', 232, 245, 'Search state and one-star decay.'),
        ('walklaw.js', 931, 1020, 'Foot unit pursuit states, post limits, grudge and last seen state.'),
        ('walklaw.js', 1024, 1076, 'Land plan fallback, reinforcement budget and foot dispatch.'),
        ('walklaw.js', 1076, 1146, 'Join and recognise guards, limits and conversation.'),
        ('walklaw.js', 1213, 1261, 'Police class and reciprocal road distance graph.'),
        ('walklaw.js', 1286, 1416, 'Vehicle and mount dispatch, travel modes and departure.'),
        ('walklaw.js', 1508, 1544, 'Police dismount and local search boundary.'),
        ('walklaw.js', 1629, 1668, 'In-game roadblock lifecycle and budget.'),
        ('walklaw.js', 1689, 1701, 'Pursuit and palace update cadence.'),
        ('walklaw.js', 1756, 1762, 'Top-level sync and five-star military dispatch.'),
    ]),
    163: ('ARREST-PROFILE', ('arrest', 'profile'), 'Surrender, arrest, temporary heat, persistent bounty and profile preservation are separate state transitions.', [
        ('walklaw.js', 75, 83, 'Arrest, confiscation, bounty lifetime and recognition ranges.'),
        ('walklaw.js', 210, 231, 'Eligibility, creation, refresh and expiration of bounties.'),
        ('walklaw.js', 313, 345, 'Fine scale, confiscation and remembered vehicle context.'),
        ('walklaw.js', 384, 445, 'Surrender eligibility, arrest, release destination and death hook.'),
        ('walklaw.js', 447, 490, 'Arrest and surrender windows, H control.'),
        ('walklaw.js', 1770, 1824, 'Runtime cleanup, scoped profile reset and public status.'),
        ('walk.js', 441, 452, 'Death calls modules before default death screen.'),
        ('walk.js', 1504, 1516, 'Explicit release arrival and HP initialization boundary.'),
        ('walkact.js', 4925, 4934, 'Profile switch rebinds runtime and preserves new warrants and passes.'),
    ]),
    164: ('REPUTATION', ('reputation',), 'Standing writes by state UID. Quiet time, earned awards, temple donations and settlements have distinct preconditions and effects.', [
        ('walkeco.js', 60, 75, 'Standing and recovery defaults.'),
        ('walkeco.js', 303, 334, 'Standing values, tiers, refusal thresholds and prices.'),
        ('walkeco.js', 410, 441, 'Temple gifts and non-bounty guard settlement.'),
        ('walkeco.js', 1873, 1880, 'Quiet period and elapsed-time calculation.'),
        ('walkeco.js', 1931, 1948, 'Dialogue additions and refusal messages.'),
        ('walkeco.js', 2261, 2276, 'ECO full work payment and good or bad standing gain.'),
        ('walkeco.js', 3425, 3450, 'Quest reward and standing penalties.'),
        ('walkeco.js', 3954, 3981, 'Journal display of effects and recovery advice.'),
    ]),
    165: ('PALACE-AUDIENCE', ('palace',), 'A per-cell audience is conditional and revocable. Court alarms cancel passes, change guards and gate collision, and stage the ruler’s withdrawal and return.', [
        ('walkgen.js', 3486, 3518, 'Palace footprint, throne and gate plan.'),
        ('walklaw.js', 53, 74, 'Court protection, warning, evacuation and service declarations.'),
        ('walklaw.js', 535, 578, 'Audience record, grant, expiry and boundary geometry.'),
        ('walklaw.js', 590, 615, 'Dynamic gate and local breach.'),
        ('walklaw.js', 636, 757, 'Court alarm, visible weapon and entry checks, return and revocation.'),
        ('walklaw.js', 817, 904, 'Bodyguard, ruler and gate dialogue, bribe and pardon.'),
        ('walklaw.js', 1764, 1769, 'Conversion of court guard roles.'),
        ('walkeco.js', 3142, 3155, 'Writing and ruler prerequisites for a court letter.'),
        ('walkeco.js', 3655, 3667, 'Item-stage delivery grants the audience by hook.'),
    ]),
    166: ('MILITARY-BASES', ('bases', 'facility'), 'The world projection chooses owner cells. The local module adds an era plan, controlled park, permission, alarms, gate states and military dispatch separate from the civil patrol.', [
        ('core.js', 16, 16, 'Eight-neighbor stencil used by site roughness check.'),
        ('walkgen.js', 61, 70, 'Site constraints and base count balance.'),
        ('walkgen.js', 490, 574, 'Site allocation, old assignment retention and fallback.'),
        ('walkgen.js', 2852, 2873, 'Facility hook and placeholder, and perimeter layout interface.'),
        ('walkmil.js', 21, 53, 'Base, deployment, access and transport balance.'),
        ('walkmil.js', 100, 157, 'Vehicle records, stage, discovery and domestic animal gates.'),
        ('walkmil.js', 601, 655, 'Fragile generated props and local damage journal integration.'),
        ('walkmil.js', 811, 845, 'Vehicle hooks and game alarm dispatch.'),
        ('walkmil.js', 1157, 1303, 'Different build recipes by visible era.'),
        ('walkmil.js', 1309, 1416, 'Aircraft and ship dependencies and base terrain plan.'),
        ('walkmil.js', 1543, 1620, 'Garrison roles, enlistment and a post-duty exit clock.'),
        ('walkmil.js', 1622, 1733, 'Active base, arrival handling, warning, alarm, reinforcement and stand-down.'),
        ('walkmil.js', 1745, 1774, 'Fire, breach and dynamic gate animation.'),
        ('walkmil.js', 1815, 1822, 'Broken gate journal and collision removal.'),
        ('walkmil.js', 1873, 1889, 'Legal owner selection and era of pursuit reinforcements.'),
        ('walkmil.js', 2027, 2078, 'Military response, unit mix, cleanup and optional aircraft.'),
        ('walkmil.js', 2086, 2159, 'Park ownership, ships and watch job integration.'),
        ('walkmil.js', 2162, 2177, 'Base update scheduling and vehicle inputs.'),
        ('walkmil.js', 2202, 2237, 'Alarm event routing and cleanup scope.'),
    ]),
    167: ('TRANSPORT-BOUNDARIES', ('adapters',), 'Civil and military aircraft theft, ship offences and waterfront pursuit forward into the shared legal state from their own modules.', [
        ('walkair.js', 1975, 2004, 'Aircraft entry and theft ownership boundary.'),
        ('walkair.js', 3307, 3321, 'Aircraft theft marks and legal heat adapter.'),
        ('walksea.js', 934, 947, 'Vessel theft routes to a land cell and consumes its marker.'),
        ('walksea.js', 963, 988, 'Ship entry ownership and player control.'),
        ('walksea.js', 4837, 4845, 'Naval action passes game alarm to the court.'),
        ('walksea.js', 5771, 5796, 'Mooring anchor and waterfront pursuit handler.'),
        ('walksea.js', 6218, 6230, 'Water cell retry at home port and re-entry guard.'),
    ]),
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    probe = json.loads((ROOT / REPORT).read_text(encoding='utf-8'))
    assert probe['work_package_id'] == PACKAGE and probe['failed'] == 0 and probe['passed'] == len(probe['results'])
    scope = json.loads((DOCS / 'research/feature-scope.json').read_text(encoding='utf-8'))
    package = next(p for p in scope['work_packages'] if p['id'] == PACKAGE)
    manifest = {r['path']: r for r in probe['sources']}
    loaded = {}
    rules, findings = [], []
    for src_id, (key, groups, conclusion, entries) in GROUPS.items():
        refs = []
        for file, start, end, summary in entries:
            path = f'EarthSimulator/{file}'
            if path not in loaded:
                raw = (ROOT / path).read_bytes()
                assert digest(raw) == manifest[path]['sha256'], path
                loaded[path] = raw.decode('utf-8-sig').splitlines()
            lines = loaded[path]
            assert 0 < start <= end <= len(lines), (file, start, end, len(lines))
            rid = f'WL-{len(rules)+1:02}'
            refs.append(rid)
            rules.append({'id': rid, 'source_id': f'SRC-{src_id}', 'summary': summary, 'evidence_type': 'static_traced',
                          'source': {'path': path, 'sha256': manifest[path]['sha256'], 'line': start, 'end_line': end,
                                     'source_lines': lines[start-1:end]}})
        probes = [r['id'].split('-', 1)[0] for r in probe['results'] if r['id'].split('-', 1)[1] in groups]
        assert probes, key
        findings.append({'id': key, 'evidence': refs, 'probe_ids': probes, 'conclusion': conclusion})

    result = {
        'format_version': '1.0.0', 'work_package_id': PACKAGE, 'date': '2026-11-15', 'game_version': '2.1.4',
        'path_base': 'repository_root', 'feature_ids': package['feature_ids'], 'document_ids': DOCUMENTS,
        'source_ids': [f'SRC-{n}' for n in (*GROUPS, 168)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {'source_files': probe['sources'], 'rea_source_selection': ['walklaw.js'],
                     'rea_parent_evidence_id': 'ev_40313cfea32ebe61e743cfbec1e1329cb702c0f35aacb110392638565e2a244f',
                     'rea_summary_evidence_id': 'ev_b8f72531c0791bf357b970b10531e1ecebb888642cd811f7c961e3a3e08d0f3e',
                     'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                     'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
                     'rea_limits': ['One selected JS file, 27262 AST nodes, zero parse failures and 78 sources unselected.',
                                    'Partial graph, 78 application and 12152 semantic unknowns. Bundle also contains retained economy evidence.']},
        'declarations': probe['declarations'], 'rules': rules, 'findings': findings,
        'verification': {'command': f'node {SCRIPT}', 'report_path': REPORT, 'test_copy_path': COPY,
                         'checks': probe['results'], 'probe_script_sha256': digest((ROOT / SCRIPT).read_bytes()),
                         'environment': probe['environment'], 'runtime_verified': False},
        'limitations': ['Tests run isolated game logic with artificial maps, timer values, wallets, actors, dialog callbacks, ray hits and dispatch adapters.',
                        'Scripted visibility and movement do not observe complete pursuit, aircraft handling, court or base geometry in the actual game.',
                        'Live room synchronization, disk persistence, audio, pointer capture and performance have no runtime observations in this package.'],
        'next_package': 'WP-WALK-GROUND-TRANSPORT',
    }
    target = DOCS / 'research/extraction-walk-law-bases.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {probe["passed"]} checks.')


if __name__ == '__main__':
    main()
