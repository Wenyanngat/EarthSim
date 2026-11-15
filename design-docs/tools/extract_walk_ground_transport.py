"""Export shipped ground transport rules and isolated observations."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'design-docs'
PACKAGE = 'WP-WALK-GROUND-TRANSPORT'
REPORT = '.research/wp-walk-ground-transport/probe-results.json'
COPY = '.research/wp-walk-ground-transport/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-walk-ground-transport-2026-11-15.evidence.json'
SCRIPT = 'design-docs/tools/probe_walk_ground_transport.cjs'
DOCUMENTS = ['DOC-WALK-TRANSPORT', 'DOC-WALK-ROAD-TRAFFIC', 'DOC-WALK-RAIL', 'DOC-WALK-GROUND-TRANSPORT-DATA']

GROUPS = {
    169: ('VEHICLE-REGISTRY', ('vehicle', 'road'), 'The final vehicle registry combines base, economy, police, military, air, sea and rail definitions. Availability uses several epoch scales, discoveries and animal substitutions.', [
        ('index.html', 729, 738, 'Shipped script registration order.'),
        ('walkact.js', 762, 854, 'Base records, physical registry and traffic mixture by actual epoch.'),
        ('walkact.js', 855, 918, 'Rebuild fraction, technology weights and parking selection.'),
        ('walkact.js', 1441, 1447, 'Additional contemporary civilian records.'),
        ('walkeco.js', 955, 984, 'Husbandry, lead transport and human-carried records.'),
        ('walkgen.js', 170, 239, 'Animal and climate eligibility and replacement order.'),
        ('walklaw.js', 1160, 1163, 'Police, hover police and roadblock records.'),
        ('walklaw.js', 1199, 1199, 'Early motor police record.'),
        ('walkmil.js', 73, 156, 'Military records and actual-stage eligibility.'),
        ('walkmil.js', 819, 826, 'Tracked and military wheeled physics dispatch.'),
        ('walkair.js', 74, 115, 'Aircraft and parachute records.'),
        ('walkair.js', 886, 890, 'Aircraft registry population.'),
        ('walksea.js', 83, 164, 'Ship data and generated vehicle records.'),
        ('walkrail.js', 1709, 1714, 'Four train frame records.'),
        ('walkrail.js', 2195, 2199, 'Crossing blocker record.'),
    ]),
    170: ('ROAD-TRAFFIC', ('road',), 'Traffic selection depends on nearby settlement tiers, crowd density and time of day. Road drivers evaluate the next leg, junction occupancy and local obstacles.', [
        ('walkact.js', 2126, 2130, 'Crowd-dependent vehicle budget.'),
        ('walkact.js', 3252, 3335, 'Vehicle construction, AI assignment and removal.'),
        ('walkact.js', 3379, 3465, 'Parking lifetime, ambient budget, spawn ring and clearance.'),
        ('walkact.js', 3480, 3559, 'Leg state, neighbor eligibility and junction choice.'),
        ('walkact.js', 3567, 3702, 'Turns, relative obstacles, braking and passing clearance.'),
        ('walkact.js', 3704, 3792, 'AI desired speed, passing, sirens, yielding and stuck recovery.'),
        ('walkact.js', 3794, 3887, 'Leg traversal, turn curves and junction ownership.'),
        ('walkact.js', 3910, 3952, 'Coasting, update cadence and pedestrian displacement.'),
        ('walkgen.js', 627, 646, 'Road classes and neighbor profiles.'),
    ]),
    171: ('COMMON-VEHICLE', ('vehicle', 'road'), 'Common entry, release and damage transitions select a physical model. Ground, lead and tracked motion have their own terrain, collision and rider rules.', [
        ('walk.js', 360, 366, 'Player step dispatches to the current vehicle.'),
        ('walk.js', 799, 839, 'Module, vehicle and common key handling order.'),
        ('walkact.js', 4132, 4184, 'Leading caravans and pack animals by the player.'),
        ('walkact.js', 4191, 4250, 'Input, throttle, steering, chassis circles and vertical landing.'),
        ('walkact.js', 4251, 4331, 'Land, horse and small-boat motion and dispatch.'),
        ('walkact.js', 4333, 4395, 'Shared collisions, runover and player health context.'),
        ('walkact.js', 4425, 4520, 'Vehicle keys, entry, safe dismount and theft actions.'),
        ('walkact.js', 4616, 4686, 'Damage to vehicle and driver, wreck and persistence markers.'),
        ('walkact.js', 4702, 4715, 'Vehicle weapon input dispatch.'),
        ('walkmil.js', 644, 826, 'Tracked movement, military car wrapper and post-step collisions.'),
        ('walkeco.js', 889, 939, 'Purchased transport creation, restoration and loss.'),
        ('walkair.js', 1952, 2003, 'Aircraft entry, exit and theft adapter.'),
        ('walksea.js', 934, 988, 'Ship theft and entry adapter.'),
    ]),
    172: ('RAIL-MAP', ('rail_map',), 'The rail projection follows strategic map lines, creates cardinal edges and station endpoints, and uses terrain and facility exclusions to bridge gaps.', [
        ('walkgen.js', 768, 834, 'Map rail handoff, fallback network and rail bits.'),
        ('walkgen.js', 912, 980, 'Rail offset, nodes, classes, arcs and distance.'),
        ('walkrail.js', 22, 77, 'Rail balance and local state declarations.'),
        ('walkrail.js', 160, 205, 'Electrification, runs and facility rail plan.'),
        ('walkrail.js', 208, 312, 'Track clearance, buffer stops and crossings.'),
        ('walkrail.js', 525, 569, 'Station geometry and station plan.'),
        ('walkrail.js', 651, 682, 'Reciprocal edge passability and traction class.'),
        ('walkrail.js', 683, 824, 'Route pieces, exits, plans, switches, trim and coordinate queries.'),
        ('walkrail.js', 3109, 3200, 'Map-era classes, cardinal detours and retained map routes.'),
        ('walkrail.js', 3202, 3267, 'Arrival near map line and runtime registrations.'),
    ]),
    173: ('RAIL-SERVICE', ('rail_service',), 'Passenger fare, boarding, cab takeover, direction and exit route through train-specific state. Generated rolling stock depends on traction and freight flags.', [
        ('walkrail.js', 825, 930, 'Consist recipes, offsets, spawning and next stop.'),
        ('walkrail.js', 1019, 1121, 'Train update, traction, stations, dwell and doors.'),
        ('walkrail.js', 1218, 1288, 'Turnaround and consist reversal.'),
        ('walkrail.js', 1453, 1485, 'Station passenger flow.'),
        ('walkrail.js', 1622, 1685, 'Ambient train lifecycle and spawn exclusions.'),
        ('walkrail.js', 1918, 1946, 'Fare and coach coordinate definitions.'),
        ('walkrail.js', 1948, 2017, 'Looking, choosing doors and passenger boarding.'),
        ('walkrail.js', 2018, 2082, 'Cab takeover, theft, two-press exit and reverse request.'),
        ('walkrail.js', 2083, 2175, 'Train physical model, cameras, exit, HUD and keys.'),
        ('walkrail.js', 2177, 2182, 'Switch request feedback.'),
    ]),
    174: ('RAIL-DISPATCH-ACCIDENTS', ('rail_dispatch',), 'Player priority and reservation windows govern AI yielding. Contact, overspeed, dispatcher cleanup and deadlock recovery are explicit game state transitions.', [
        ('walkrail.js', 931, 1005, 'Train priority, reservation length and sampled occupancy.'),
        ('walkrail.js', 1007, 1016, 'Curve speed cap under the full consist.'),
        ('walkrail.js', 1027, 1099, 'Player movement, AI yielding, swept collision and overspeed.'),
        ('walkrail.js', 1122, 1195, 'Blocking, swept contact, collision damage and derail.'),
        ('walkrail.js', 1197, 1216, 'Curve speed and advance warning.'),
        ('walkrail.js', 1243, 1255, 'Trailing train check for reverse.'),
        ('walkrail.js', 1289, 1376, 'Eviction, dispatcher corridor and watchdog cleanup.'),
        ('walkrail.js', 1378, 1392, 'Walking player uses actual coach bodies.'),
    ]),
    175: ('RAIL-JOBS', ('rail_jobs',), 'Driver work creates an independent route and legal cab handoff, pays completed platforms immediately, and retains a timed break and per-origin cooldown.', [
        ('walkrail.js', 1488, 1535, 'Station porter, driver offer and repeat cooldown.'),
        ('walkrail.js', 2820, 2836, 'Driver shift balance.'),
        ('walkrail.js', 2842, 2904, 'Stop search, route variants and station desk.'),
        ('walkrail.js', 2906, 2954, 'Incident failure and service train preparation.'),
        ('walkrail.js', 2956, 2967, 'Next stop, skipped stops and per-station local pay.'),
        ('walkrail.js', 2969, 3040, 'Wait, takeover, breaks, award, completion and reservation.'),
        ('walkrail.js', 3041, 3091, 'Job HUD, markers and walk cleanup.'),
        ('walkeco.js', 2018, 2024, 'Work registration interface.'),
    ]),
    176: ('CROSSINGS', ('crossing',), 'A crossing has a warning and arm state machine, explicit AI blockers and pedestrian waiting. Legal work distinguishes a closed crossing accident from reckless or unprotected contact.', [
        ('walkrail.js', 1559, 1619, 'Runover, legal-work attribution and closed crossing predicate.'),
        ('walkrail.js', 2184, 2236, 'Crossing state, acquisition and train sampling.'),
        ('walkrail.js', 2238, 2285, 'ETA and warning, lowering, locked and reopening phases.'),
        ('walkrail.js', 2287, 2349, 'Pedestrian waiting and road queue stop point.'),
        ('walkrail.js', 2350, 2364, 'Atomic pair of invisible traffic blockers.'),
        ('walkrail.js', 2396, 2449, 'Blast and vehicle arm break states.'),
        ('walkrail.js', 2451, 2451, 'Crossing cleanup on walk clear.'),
    ]),
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    probe = json.loads((ROOT / REPORT).read_text(encoding='utf-8'))
    assert probe['work_package_id'] == PACKAGE and probe['failed'] == 0
    scope = json.loads((DOCS / 'research/feature-scope.json').read_text(encoding='utf-8'))
    package = next(p for p in scope['work_packages'] if p['id'] == PACKAGE)
    manifest = {r['path']: r for r in probe['sources']}
    loaded, rules, findings = {}, [], []
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
            rid = f'GT-{len(rules) + 1:02}'
            refs.append(rid)
            rules.append({
                'id': rid, 'source_id': f'SRC-{src_id}', 'summary': summary, 'evidence_type': 'static_traced',
                'source': {'path': path, 'sha256': manifest[path]['sha256'], 'line': start,
                           'end_line': end, 'source_lines': lines[start - 1:end]},
            })
        probes = [r['id'].split('-', 1)[0] for r in probe['results'] if r['id'].split('-', 1)[1] in groups]
        assert probes, key
        findings.append({'id': key, 'evidence': refs, 'probe_ids': probes, 'conclusion': conclusion})

    result = {
        'format_version': '1.0.0', 'work_package_id': PACKAGE, 'date': '2026-11-15', 'game_version': '2.1.4',
        'path_base': 'repository_root', 'feature_ids': package['feature_ids'], 'document_ids': DOCUMENTS,
        'source_ids': [f'SRC-{n}' for n in (*GROUPS, 177)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {
            'source_files': probe['sources'], 'rea_source_selection': ['walkrail.js'],
            'rea_parent_evidence_id': 'ev_95a2c43a93fde171cd62e0918229ac39148879d111c7e002c5b942c24de45ed5',
            'rea_summary_evidence_id': 'ev_4e63b2981b12af8300d2236fff45c74b5f0a70b716837504e9045a37135c091b',
            'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
            'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
            'rea_limits': ['One selected JS file, 54988 AST nodes, zero parse failures and 78 sources unselected.',
                           'Partial graph, 78 application and 10561 semantic unknowns; semantic nodes per file reached 20000.',
                           'Bundle contains six retained records including earlier economy and law analyses.'],
        },
        'declarations': probe['declarations'], 'rules': rules, 'findings': findings,
        'verification': {
            'command': f'node {SCRIPT}', 'report_path': REPORT, 'test_copy_path': COPY,
            'checks': probe['results'], 'probe_script_sha256': digest((ROOT / SCRIPT).read_bytes()),
            'environment': probe['environment'], 'runtime_verified': False,
        },
        'limitations': [
            'The full shipped rail source executes in an isolated VM. Rendering, plan terrain, wallets, actors, motion adapters and event registration are synthetic.',
            'Other modules supply selected original handlers and definition factories. The registry captures 78 declarations, including porters and two invisible blockers.',
            'Physics and availability declarations for AIR and SEA are inventory boundaries. Their complete movement, services and crews belong to the following packages.',
            'No full-game scene, room synchronization, disk persistence, visible train rendering, audio or performance has been observed.',
        ],
        'next_package': 'WP-WALK-AIR',
    }
    target = DOCS / 'research/extraction-walk-ground-transport.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {probe["passed"]} checks.')


if __name__ == '__main__':
    main()
