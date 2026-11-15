"""Export aviation evidence from shipped bytes and isolated scenarios."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'design-docs'
PACKAGE = 'WP-WALK-AIR'
REPORT = '.research/wp-walk-air/probe-results.json'
COPY = '.research/wp-walk-air/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-walk-air-2026-11-15.evidence.json'
SCRIPT = 'design-docs/tools/probe_walk_air.cjs'
DOCUMENTS = ['DOC-WALK-AIR', 'DOC-WALK-TRANSPORT', 'DOC-WALK-AIR-DATA']

GROUPS = {
    178: ('GENERATION', ('generation',), 'Airport generation uses owner progress and discoveries. Layout, surface type and aircraft selection are cached by generation and facility context.', [
        ('index.html', 729, 738, 'Registration order of walking modules.'),
        ('walkair.js', 18, 113, 'Aircraft settings, flight properties and frame declarations.'),
        ('walkair.js', 874, 951, 'Registry, era substitution and aircraft creation state.'),
        ('walkair.js', 962, 1040, 'Host ownership, aviation filter and deterministic airport layout.'),
        ('walkair.js', 1041, 1068, 'Coordinate transforms, stand selection and runway ends.'),
        ('walkair.js', 1079, 1156, 'Airport plan, stands, helipad, mast and terminal.'),
        ('walkair.js', 1320, 1335, 'Facility and collision registration.'),
        ('walkgen.js', 154, 158, 'Visible and actual epoch scales.'),
        ('walkgen.js', 490, 574, 'World facility site assignment and owner association.'),
    ]),
    179: ('AIRPORT-TRAFFIC', ('traffic',), 'Airfields reserve stands, runway and taxiway separately. Ordered departure, arrival gaps, fair waiting and stale ownership checks govern traffic.', [
        ('walkair.js', 240, 289, 'Stairs movement and boarding geometry.'),
        ('walkair.js', 2768, 2794, 'Field state and parked aircraft creation.'),
        ('walkair.js', 2797, 2873, 'Airship traffic balance, mast arrival and departure.'),
        ('walkair.js', 2875, 2935, 'Nearby field activation, sleeping, vacating and base parks.'),
        ('walkair.js', 2937, 3012, 'Taxi movement and arrival/departure setup.'),
        ('walkair.js', 3014, 3062, 'Taxiway priority, approach gap and fair departure window.'),
        ('walkair.js', 3064, 3142, 'Traffic phases and stuck-queue recovery.'),
        ('walkair.js', 3144, 3178, 'Player runway occupancy and shared movement budget.'),
    ]),
    180: ('AIRPLANE-FLIGHT', ('flight',), 'Aircraft use separate frame and airframe health. Thrust, stall, bank, terrain-relative ceiling, wheel surfaces and touchdown state determine movement and damage.', [
        ('walkair.js', 1444, 1460, 'Surface classes and flight input defaults.'),
        ('walkair.js', 1462, 1513, 'Thrust, stall, control authority, bank, drag and touchdown event.'),
        ('walkair.js', 1515, 1564, 'Automatic and manual gear, ground friction, tug reverse and rotation.'),
        ('walkair.js', 1566, 1581, 'Player flight input and look hold.'),
        ('walkair.js', 1583, 1697, 'Aircraft probes, contacts, dents and hard crashes.'),
        ('walkair.js', 1699, 1760, 'World contact, damage routing and landing quality.'),
        ('walkair.js', 1762, 1807, 'Player aircraft step and shared context.'),
        ('walkair.js', 1809, 1861, 'Destruction, automatic ejection, falling frame and abandoned aircraft.'),
        ('walkair.js', 1880, 1997, 'Camera, HUD, input, entry, exit and physics registration.'),
        ('walkact.js', 4325, 4331, 'Physical model dispatch and post-step opt-out.'),
        ('walkact.js', 4431, 4498, 'Common vehicle entry and release.'),
    ]),
    181: ('ROTOR-AIRSHIP', ('rotor_zep',), 'Helicopters use rotor power, directional velocity and deck support. Airships use equilibrium height, consumable ballast/gas, wind and a reserved mast winch.', [
        ('walkair.js', 2008, 2052, 'Helicopter support, moving ship deck and input.'),
        ('walkair.js', 2053, 2159, 'Rotor, velocity, touchdown, contacts and abandoned helicopter.'),
        ('walkair.js', 2180, 2226, 'Airship balance, state, boarding and input.'),
        ('walkair.js', 2228, 2300, 'Wind, buoyancy, ballast, gas and gondola touchdown.'),
        ('walkair.js', 2301, 2374, 'Airship hull contacts, mast search and capture.'),
        ('walkair.js', 2376, 2424, 'Mast approach feedback, winch, lock, refill and cast-off.'),
        ('walkair.js', 2425, 2457, 'Airship player and abandoned steps.'),
        ('walkair.js', 2502, 2535, 'Airship keys and exit at mast or ground.'),
        ('walksea.js', 2145, 2167, 'Ship deck geometry API boundary for helicopter support.'),
    ]),
    182: ('PASSENGER-SERVICE', ('passenger',), 'Tickets reserve a specific aircraft with a separate waiting timeout. Passenger phases, compressed cruise, refund policy, locked flight exit and arrival govern service.', [
        ('walkair.js', 4452, 4480, 'Passenger settings, fare and cruise time calculations.'),
        ('walkair.js', 4481, 4530, 'Destinations, service modes, eligibility and available aircraft.'),
        ('walkair.js', 4532, 4574, 'Purchase, waiting ticket, failure and refund.'),
        ('walkair.js', 4576, 4605, 'Cabin configurations and seat geometry.'),
        ('walkair.js', 4678, 4694, 'Cabin passenger generation.'),
        ('walkair.js', 4736, 4780, 'Window seat, field closure and relative passenger camera.'),
        ('walkair.js', 4781, 4860, 'Passenger route, terrain clearance, approach and flight steering.'),
        ('walkair.js', 4861, 4940, 'Passenger exit, scripted phases, arrival and skip.'),
        ('walkair.js', 4942, 5044, 'Ticket HUD, agent, desk and ticket-window actions.'),
    ]),
    183: ('JOBS-RENTAL', ('jobs_rental',), 'Pilot contracts, airship service and rental have independent route, payment and completion rules. Successful work records an origin-day cooldown; overdue rental becomes theft.', [
        ('walkair.js', 3759, 3787, 'Pilot eligibility, daily cooldown and award formula.'),
        ('walkair.js', 3789, 3854, 'Routes avoiding bases, available service aircraft and runway axis.'),
        ('walkair.js', 3856, 3913, 'Contract acceptance, legal boarding, cancellation and final award.'),
        ('walkair.js', 3915, 3976, 'Pilot flight confirmation, route markers, timeout and landing result.'),
        ('walkair.js', 3978, 4127, 'Job HUD, dispatcher and work/rental interface.'),
        ('walkair.js', 4193, 4254, 'Airship service and rental balance, routes and mast axes.'),
        ('walkair.js', 4256, 4315, 'Airship contract setup, boarding, timetable and unloading trigger.'),
        ('walkair.js', 4323, 4366, 'Airship service phases and rental duration.'),
        ('walkair.js', 4398, 4441, 'Rental price, refund, grace, return and overdue theft.'),
        ('walkeco.js', 105, 110, 'Economy clock and local day boundary.'),
        ('walkeco.js', 245, 281, 'Local wage and money adapters.'),
    ]),
    184: ('LAW-WEAPONS', ('law',), 'Aircraft theft feeds the shared law state. Interception depends on actual aviation capability and flight state. Aircraft weapon and damage callbacks retain game ownership attribution.', [
        ('walkair.js', 3266, 3331, 'Port search, legal boarding, theft start and nearest mast.'),
        ('walkair.js', 3333, 3384, 'Hijack phases, landing intent and type of interceptor.'),
        ('walkair.js', 3385, 3410, 'Capability-gated interceptor wave.'),
        ('walkair.js', 3411, 3503, 'Interceptor flight, shots, return, destruction and loss.'),
        ('walkair.js', 3504, 3518, 'Bail and incident end, landing crime and nearby guard reaction.'),
        ('walkair.js', 3520, 3598, 'Game aircraft weapons, targeting, projectiles and ownership.'),
        ('walkair.js', 3655, 3691, 'Legal ticket, work and takeover targets.'),
        ('walklaw.js', 384, 389, 'Surrender eligibility in an airborne vehicle.'),
        ('walkmil.js', 1309, 1337, 'Military aircraft park dependency.'),
    ]),
    185: ('PARACHUTE-LIFECYCLE', ('parachute',), 'Bailout enters a parachute vehicle with deployment and landing phases. Landing damage is deferred until release; walk cleanup separates transient and full-reset state.', [
        ('walkair.js', 2627, 2658, 'Chute creation, bailout boundary and abandoned aircraft.'),
        ('walkair.js', 2660, 2730, 'Fall, deployment, steering, landing, deferred damage and exit.'),
        ('walkair.js', 3208, 3260, 'High-flight entity culling and detail restoration.'),
        ('walkair.js', 3603, 3624, 'Air update and deferred parachute damage.'),
        ('walkair.js', 3713, 3751, 'Teleport block, keyboard precedence and walk cleanup.'),
        ('walkair.js', 5060, 5079, 'Public AIR interface.'),
        ('walk.js', 799, 839, 'Common keyboard dispatch into AIR hooks and models.'),
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
    for source_id, (key, groups, conclusion, entries) in GROUPS.items():
        refs = []
        for file, start, end, summary in entries:
            path = f'EarthSimulator/{file}'
            if path not in loaded:
                raw = (ROOT / path).read_bytes()
                assert digest(raw) == manifest[path]['sha256'], path
                loaded[path] = raw.decode('utf-8-sig').splitlines()
            lines = loaded[path]
            assert 0 < start <= end <= len(lines), (file, start, end, len(lines))
            rid = f'AV-{len(rules) + 1:02}'
            refs.append(rid)
            rules.append({
                'id': rid, 'source_id': f'SRC-{source_id}', 'summary': summary, 'evidence_type': 'static_traced',
                'source': {'path': path, 'sha256': manifest[path]['sha256'], 'line': start,
                           'end_line': end, 'source_lines': lines[start - 1:end]},
            })
        probes = [r['id'].split('-', 1)[0] for r in probe['results'] if r['id'].split('-', 1)[1] in groups]
        assert probes, key
        findings.append({'id': key, 'evidence': refs, 'probe_ids': probes, 'conclusion': conclusion})

    result = {
        'format_version': '1.0.0', 'work_package_id': PACKAGE, 'date': '2026-11-15', 'game_version': '2.1.4',
        'path_base': 'repository_root', 'feature_ids': package['feature_ids'], 'document_ids': DOCUMENTS,
        'source_ids': [f'SRC-{n}' for n in (*GROUPS, 186)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {
            'source_files': probe['sources'], 'rea_source_selection': ['walkair.js'],
            'rea_parent_evidence_id': 'ev_720ca0c0756ff01a831bb66e90c410b4d21de96977b7ab309cb7b10150c262b4',
            'rea_summary_evidence_id': 'ev_c8dc1030ad39844ca1be200ba06d18a647715f2ec3157108d8d38984edb72a4d',
            'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
            'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
            'rea_limits': ['One selected JS file, 94133 AST nodes, zero parse failures and 78 inventoried files unselected.',
                           'Limited source examination and partial graph, 78 application and 18033 semantic unknowns.',
                           'Semantic retention reached 20000 nodes per file. Export contains two retained records.'],
        },
        'declarations': probe['declarations'], 'rules': rules, 'findings': findings,
        'verification': {
            'command': f'node {SCRIPT}', 'report_path': REPORT, 'test_copy_path': COPY,
            'checks': probe['results'], 'probe_script_sha256': digest((ROOT / SCRIPT).read_bytes()),
            'environment': probe['environment'], 'runtime_verified': False,
        },
        'limitations': [
            'Each probe executes the full unmodified copied walkair.js in a fresh isolated VM.',
            'Synthetic scene, epoch/discovery adapters, wallet, map, actors, messages and model ownership isolate the selected rules.',
            'The test aircraft factory supplies base ACT frame creation. Runway rendering, collision rays, moving decks and full pursuit are static traces.',
            'No actual game scene, graphics, audio, room synchronization, disk save/load or performance has been observed.',
        ],
        'next_package': 'WP-WALK-SEA',
    }
    target = DOCS / 'research/extraction-walk-air.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {probe["passed"]} checks.')


if __name__ == '__main__':
    main()
