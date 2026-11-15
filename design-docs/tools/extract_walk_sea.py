"""Export local sea transport evidence from shipped bytes and isolated scenarios."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'design-docs'
PACKAGE = 'WP-WALK-SEA'
REPORT = '.research/wp-walk-sea/probe-results.json'
COPY = '.research/wp-walk-sea/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-walk-sea-2026-11-15.evidence.json'
SCRIPT = 'design-docs/tools/probe_walk_sea.cjs'
DOCUMENTS = ['DOC-WALK-SEA', 'DOC-WALK-TRANSPORT', 'DOC-WALK-SEA-DATA']

GROUPS = {
    187: ('HULLS-PORTS', ('generation',), 'Fifteen hulls, actual-stage overrides, discovery fallbacks and deterministic shore geometry define local ship supply and port generation.', [
        ('index.html',729,738,'Walking module load order.'),
        ('walksea.js',46,164,'Settings, complete hull registry, epoch tables, discoveries and vehicle definitions.'),
        ('walksea.js',1184,1274,'Port dimensions and shore plan generation.'),
        ('walksea.js',1276,1407,'Frontage, piers, quays and walkable gangway bases.'),
        ('walksea.js',1519,1578,'Harbour land frontage and yard.'),
        ('walksea.js',1606,1818,'Published port state, service geometry and facility registration.'),
        ('walksea.js',1828,1843,'Berth capacity, discoveries and warship probability.'),
        ('walkgen.js',154,158,'Actual and visible epoch adapters.'),
    ]),
    188: ('NAVIGATION-TRAFFIC', ('navigation',), 'Local movement samples draft, smooths routes and separates harbour maneuvers. Ticket, deck, work, docker and guard occupancy delay departure. Strategic cargo ships remain a separate state pool.', [
        ('walksea.js',649,711,'Ship state, center and sampled depth, ship type and bobbing.'),
        ('walksea.js',723,749,'Ship creation, crime default and removal.'),
        ('walksea.js',757,860,'Route samples, pose, speed, reverse and encounter handling.'),
        ('walksea.js',861,922,'Idle and manually controlled ship physics.'),
        ('walksea.js',923,933,'Release of berth, route and battle binding.'),
        ('walksea.js',1844,1911,'Moor, depart, arrival and initial traffic fill.'),
        ('walksea.js',1913,1940,'Nearby port activation and traffic budget.'),
        ('walksea.js',1946,2038,'Strategic lane/coast candidates and local passing ships.'),
        ('walksea.js',2039,2084,'Passing traffic spawn and local lifetime.'),
        ('trade.js',551,580,'Strategic ship cargo and estimated year boundary.'),
        ('trade.js',614,632,'Strategic cargo tracking in the separate ships pool.'),
    ]),
    189: ('DECK-GANGWAY', ('deck',), 'Deck attachment carries local coordinates through hull motion. Gangways require a moored berth. Leaving the helm starts unattended travel with a forty-second throttle hold and shoal braking.', [
        ('walksea.js',951,1017,'Helm entry, deck exit and shared physics registration.'),
        ('walksea.js',2126,2192,'Complete deck plans, height, beam and collision bounds.'),
        ('walksea.js',2194,2215,'Shared deck ray hook.'),
        ('walksea.js',2225,2262,'Moving platform attachment and gangway geometry.'),
        ('walksea.js',2266,2332,'Walking input, gangway and deck motion.'),
        ('walksea.js',2337,2420,'Interaction targets, climb, helm and boat access.'),
        ('walksea.js',2423,2500,'Battle deck arrival and transition interface.'),
        ('walksea.js',2520,2529,'Unattended ship motion and shoal stop.'),
        ('walkact.js',936,942,'Exact hull rotation basis used by isolated deck checks.'),
        ('walkact.js',4431,4498,'Shared vehicle entry and release boundary.'),
    ]),
    190: ('DOCK-WORK', ('work',), 'Piecework, per-port daily quota, shift and unloading bonuses use distinct settlement rules. Cargo returns, carrying speed, berth store identity and departure holds coexist with generic ECO jobs.', [
        ('walksea.js',2574,2610,'Dock settings and persistent daily record.'),
        ('walksea.js',2614,2662,'Cargo kinds, color, geometry and carry dimensions.'),
        ('walksea.js',2664,2847,'Work zone geometry, pile, warehouse and collision state.'),
        ('walksea.js',2849,2918,'Zone streaming and dock worker population.'),
        ('walksea.js',2922,2981,'Shift access, acceptance, settlement and cargo pickup.'),
        ('walksea.js',2985,3032,'Warehouse delivery, immediate wage and unload bonus.'),
        ('walksea.js',3035,3086,'Drop, return, warehouse shortcut and jump consumption.'),
        ('walksea.js',3088,3125,'Quit window, distance, vehicle, death and cleanup.'),
        ('walksea.js',3297,3331,'Ship cargo, prolonged work hold and arrival counters.'),
        ('walksea.js',3351,3444,'Docker pickup, deck path, gangway and return.'),
        ('walksea.js',3446,3595,'Docker obstacle navigation and work phases.'),
        ('walksea.js',3599,3638,'Foreman and docker dialogue actions.'),
        ('walksea.js',1158,1160,'Removal of overlapping generic ECO dock spots.'),
        ('walkeco.js',105,110,'Economy clock and local day.'),
        ('walkeco.js',245,296,'Local wage, balance, earning and payment adapters.'),
        ('walkeco.js',2098,2104,'SEA harbour excludes duplicate ECO dock and sea work spots.'),
        ('walkeco.js',2241,2256,'Generic ECO job start has its own job state.'),
        ('walk.js',380,390,'Common heavy-load movement rule.'),
    ]),
    191: ('PASSENGER-SERVICE', ('passenger',), 'Connected-water routes, destination berth fit, fare, existing hull reservation, gangway boarding, compressed passage and arrival have explicit failure and refund branches. Stated voyage days do not directly advance historical time.', [
        ('walksea.js',5018,5045,'Passenger settings, type tables and distance units.'),
        ('walksea.js',5047,5117,'Duration display, berth fit, Dijkstra distances, fare and destinations.'),
        ('walksea.js',5120,5187,'Ticket eligibility, vessel selection and purchase.'),
        ('walksea.js',5190,5227,'Ticket closure, refunds, boarding and pre-departure cancellation.'),
        ('walksea.js',5229,5254,'Departure, arrival, overboard success and timeout fallback.'),
        ('walksea.js',5257,5295,'Cast-off, exit, veil and forced map transfer.'),
        ('walksea.js',5300,5355,'Destination vessel, deck spot, mooring and arrival snap.'),
        ('walksea.js',5357,5394,'Companion, cleanup, teleport block and ticket office sync.'),
        ('walksea.js',5396,5463,'Ticket agent, interaction and window.'),
        ('walksea.js',5573,5647,'Passenger figures and ticket booth placement.'),
        ('walk.js',348,359,'Forced teleport resets scene without adding voyage days to world time.'),
    ]),
    192: ('CREW-RIOT', ('crew',), 'Crew appearance and live actors share per-ship slots. Theft, assault and killing activate weapons or differentiated riot behavior. A calm timeout restores ordinary crew while hijacked crew remain hostile.', [
        ('walksea.js',3673,3768,'Route dialogue, crew appearance, slots and local positions.'),
        ('walksea.js',3770,3909,'Live sailor behavior, dialogue, spawn and tracking.'),
        ('walksea.js',3916,3969,'Far-figure hit conversion, kill records and riot hooks.'),
        ('walksea.js',3977,4003,'Crew and riot settings plus no-new-crime actor kind.'),
        ('walksea.js',4005,4153,'Deck navigation, arming, takeover and melee/ranged fight.'),
        ('walksea.js',4163,4207,'Riot creation, captain, brave actors and escape choice.'),
        ('walksea.js',4210,4273,'Captain calls, running, hiding, jumping and swimming.'),
        ('walksea.js',4275,4304,'Calm timeout and directional weapon threat.'),
    ]),
    193: ('LAW-BOARDING-FEAR', ('law',), 'Theft is charged at the dry port anchor. Shared law yields ship pursuit to SEA. Gangway spacing, boarding cap, shore fire, fear events and corpse-aware calm determine local response.', [
        ('walksea.js',936,947,'Theft at port shore or fallback dry cell.'),
        ('walksea.js',4837,4845,'Ship gunfire law alarm boundary.'),
        ('walksea.js',5746,5798,'Pursuit settings, ship ownership, land anchor and law wrappers.'),
        ('walksea.js',5800,5854,'Sight, terrain line of sight, cover, gangway pursuit and stuck timeout.'),
        ('walksea.js',5858,5898,'Shore pursuit, boarding spacing, start and release.'),
        ('walksea.js',5900,5986,'Boarding step, gangway, deck combat and lost support.'),
        ('walksea.js',5988,6015,'Boarding positions and synchronization.'),
        ('walksea.js',6019,6086,'Fear settings, merging, port closure and corpse-aware calm.'),
        ('walksea.js',6089,6193,'Worker and passenger flight, load drop and work return.'),
        ('walksea.js',6195,6233,'Fear updates and water-cell crime retry with recursion guard.'),
        ('walklaw.js',279,291,'Generic guard defers movement to seaChaseOwn.'),
        ('walklaw.js',1040,1053,'Law response uses seaLawAnchor for a moored player.'),
    ]),
    194: ('DAMAGE-LIFECYCLE', ('lifecycle',), 'Ship gun callbacks, common damage, sinking, berth release and debris have local lifetimes. Cleanup releases transient ships, platforms and tickets while profile dock records remain separate.', [
        ('walksea.js',1106,1174,'Local update, synchronization, cleanup and arrival hook.'),
        ('walksea.js',4316,4333,'Naval gun declarations and ship population boundary.'),
        ('walksea.js',4492,4522,'Damage wrapper and scripted battle result boundary.'),
        ('walksea.js',4658,4722,'Blast, impact and shot update.'),
        ('walksea.js',4724,4775,'Sink, berth release, fifteen-second descent and debris.'),
        ('walksea.js',4826,4890,'Naval player aiming, firing and weapon registration.'),
        ('walksea.js',4893,4994,'Battle landing entry boundary.'),
        ('walksea.js',3118,3125,'Work cleanup returns held cargo before zone release.'),
        ('walksea.js',5367,5381,'Passenger cleanup and internal teleport protection.'),
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
            rid = f'SV-{len(rules) + 1:02}'
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
        'source_ids': [f'SRC-{n}' for n in (*GROUPS, 195)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {
            'source_files': probe['sources'], 'rea_source_selection': ['walksea.js'],
            'rea_parent_evidence_id': 'ev_d35ce44f0826338053a80be02a80d184eb8b0404d72bb90265011e95146c6343',
            'rea_summary_evidence_id': 'ev_995d2cab064bd0e5c1e817428d29faf4b25a6180e46f51d1357fcce055b97211',
            'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
            'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
            'rea_limits': ['One selected JS file, 115755 AST nodes, zero parse failures and 78 inventoried files unselected.',
                           'Limited source examination and partial graph, 78 application and 20876 semantic unknowns.',
                           'Semantic retention reached 20000 nodes and 20000 unknown occurrences per file. Export contains two retained records.'],
        },
        'declarations': probe['declarations'], 'rules': rules, 'findings': findings,
        'verification': {
            'command': f'node {SCRIPT}', 'report_path': REPORT, 'test_copy_path': COPY,
            'checks': probe['results'], 'probe_script_sha256': digest((ROOT / SCRIPT).read_bytes()),
            'environment': probe['environment'], 'runtime_verified': False,
        },
        'limitations': [
            'Each probe executes the full unmodified copied walksea.js plus exact copied ACT hull-basis function in a fresh isolated VM.',
            'Synthetic scene, epoch/discovery adapters, wallet, water grid, actors and messages isolate selected rules. Timers are captured without a renderer.',
            'The test hull factory supplies base ACT frame creation. Port generation, rendering, shots, full crew navigation and pursuit are static traces; translation and deck attachment are isolated checks.',
            'No actual game scene, graphics, audio, room synchronization, disk save/load or performance has been observed.',
        ],
        'next_package': 'WP-WALK-WORLD-EFFECTS',
    }
    target = DOCS / 'research/extraction-walk-sea.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {probe["passed"]} checks.')


if __name__ == '__main__':
    main()
