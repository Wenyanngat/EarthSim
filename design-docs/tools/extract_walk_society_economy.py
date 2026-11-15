"""Export walk society and economy declarations, excerpts and VM results."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'design-docs'
PACKAGE = 'WP-WALK-SOCIETY-ECONOMY'
REPORT = '.research/wp-walk-society-economy/probe-results.json'
COPY = '.research/wp-walk-society-economy/test-copy/EarthSimulator'
BUNDLE = '.research/rea/wp-walk-society-economy-2026-11-15.evidence.json'
SCRIPT = 'design-docs/tools/probe_walk_society_economy.cjs'
DOCUMENTS = ['DOC-WALK-NPC-LIFE', 'DOC-WALK-SHOPS-EQUIPMENT', 'DOC-QUESTS-JOBS', 'DOC-WALLET', 'DOC-ITEMS-HEALING',
             'DOC-WALK-TRANSPORT', 'DOC-WALK-SOCIETY-ECONOMY-DATA']

GROUPS = {
    152: ('NPC-LIFE', ('npc',), 'The local cast binds a role slot to a persistent person where available. Population, cast and named identities have separate lifetimes.', [
        ('walkact.js', 2115, 2194, 'Cast size, seed, professions, pedestrians and module additions.'),
        ('walkact.js', 2224, 2288, 'Person, role, appearance and spawn state.'),
        ('walkact.js', 2291, 2354, 'Distance, night and bad weather, density limits and schedule.'),
        ('walkact.js', 2355, 2465, 'Pedestrian route, road crossings and movement through obstacles.'),
        ('walkact.js', 2468, 2570, 'Talk, flee, fear, fight and return to role.'),
        ('walkact.js', 2899, 2933, 'Dialogue gates and available topics.'),
        ('walkact.js', 2953, 3003, 'Local damage, death and branch to permanent person records.'),
        ('walkeco.js', 787, 851, 'Shop role placement and work foremen in the cast.'),
        ('people.js', 1388, 1410, 'Named death, ordinary NPC death memory and ruler succession.'),
        ('people.js', 1994, 2038, 'Procedural resident cache, identity and replacement.'),
        ('net.js', 266, 273, 'Shared persistent-person update.'),
        ('netwalk.js', 280, 298, 'Leader and guest ambient authority.'),
    ]),
    153: ('HUNTING', ('hunt',), 'Local animals mirror fauna herds or use a fallback. Player-attributed kills can affect the world even when the herd was created for a module. Butchery mutates inventory separately.', [
        ('walkact.js', 3010, 3119, 'Fallback animals, herd materialization and kill/harvest paths.'),
        ('walkact.js', 3136, 3249, 'Bird, water and land states, player detection, pursuit and attacks.'),
        ('walkeco.js', 1897, 1923, 'Kill and law bridges; bandit reward hook.'),
        ('walkeco.js', 1961, 1973, 'Local health plus inventory yields.'),
        ('walkeco.js', 2572, 2582, 'Context action for harvesting and chest pickup.'),
        ('fauna.js', 1632, 1658, 'Map herd query used by the walk.'),
        ('fauna.js', 1758, 1785, 'Fauna hunt density, land/water gate and species abundance.'),
        ('net.js', 274, 278, 'Shared world hunt adapter.'),
    ]),
    154: ('SHOPS-ITEMS', ('shop', 'items'), 'Shops derive the displayed assortment from epoch, availability and deterministic stock. Checkout, item use and armor mutate the selected walk profile.', [
        ('walkeco.js', 345, 408, 'Shop and work refusal context and standing gates.'),
        ('walkeco.js', 445, 560, 'Complete stock declarations, loot-only items, categories and pack reference.'),
        ('walkeco.js', 564, 642, 'Restrictions, availability, buy and sale price multipliers.'),
        ('walkeco.js', 695, 755, 'Shop stock, item use, quick healing and damage-type armor filtering.'),
        ('walkeco.js', 1564, 1655, 'Open, purchase, contraband exposure, sell lists and mutations.'),
        ('walkeco.js', 1670, 1740, 'Shop UI projections, click handlers and exchange route.'),
        ('walkeco.js', 1752, 1775, 'Load-time validation, inventory limits and ownership checks.'),
        ('walkeco.js', 3935, 3953, 'Bag UI and action labels.'),
        ('walkact.js', 5000, 5049, 'Weapons, ammunition and equipped-slot storage.'),
        ('walkact.js', 5706, 5735, 'Body loot, equipment selection and hook insertion.'),
    ]),
    155: ('VEHICLE-OWNERSHIP', ('ownership',), 'Purchased vehicle type descriptors survive the walk. Spawning checks local placement; sale or a monitored loss updates the descriptor list.', [
        ('walkeco.js', 509, 537, 'Types of vehicles sold in shops and their base prices.'),
        ('walkeco.js', 890, 933, 'Spot search, ownership marker, restoration and loss.'),
        ('walkeco.js', 1596, 1654, 'Spawn-before-charge and selling a purchased type.'),
        ('walkeco.js', 1815, 1831, 'Arrival, clear and removal of live ownership references.'),
        ('walkact.js', 4498, 4524, 'Use of available transport and theft handling.'),
    ]),
    156: ('WALK-MONEY', ('money',), 'Each character holds wallets by currency issuer. Forms, wages, trading power and actual exchange use different inputs.', [
        ('walkeco.js', 32, 69, 'Wage, valuation, price and start funds declarations.'),
        ('walkeco.js', 96, 118, 'Wallet extension, accumulated clock and accounting counters.'),
        ('walkeco.js', 145, 243, 'Currency forms and names, issuer chain, extinct forms.'),
        ('walkeco.js', 245, 296, 'Wage, trust, actual cash, payments, fines and exchange quote.'),
        ('walkeco.js', 1656, 1663, 'Foreign wallet entries offered for exchange.'),
        ('walkeco.js', 1727, 1733, 'Exchange debit and credit from the shop interface.'),
        ('walkeco.js', 1788, 1814, 'Starting grant near a state.'),
        ('walkeco.js', 1839, 1872, 'Issuer cache refresh, wallet consolidation and border reminder.'),
        ('walkeco.js', 3915, 3934, 'Wallet view and earnings counters.'),
        ('civ.js', 188, 199, 'Visible-era declaration for built-in progression.'),
        ('walkgen.js', 151, 160, 'Visible era versus actual tier for goods.'),
    ]),
    157: ('QUESTS', ('quest-generator', 'quests'), 'Twelve built-in generators produce staged errands. Active records track inventory, world time and persistent giver identity. Finish can mutate the citizen profile and selected map fields.', [
        ('walkeco.js', 1747, 1778, 'Quest cap on load, history retention, foreign entries and validation.'),
        ('walkeco.js', 1896, 1901, 'Escort teleport interlock.'),
        ('walkeco.js', 2959, 3060, 'Saved stage schema, selection of destinations, time and pay helpers.'),
        ('walkeco.js', 3061, 3191, 'Twelve built-in generators and weighted recurring offer.'),
        ('walkeco.js', 3197, 3209, 'Separate quest extension registry.'),
        ('walkeco.js', 3329, 3375, 'Ore exists on the loading vehicle and can be lost.'),
        ('walkeco.js', 3399, 3512, 'Acceptance, payout, failure cleanup, hand-in routing and costs.'),
        ('walkeco.js', 3551, 3610, 'Quest actors, marked foes and companion spawn.'),
        ('walkeco.js', 3619, 3701, 'Stage runtime and lost chest interaction.'),
        ('walkeco.js', 3720, 3799, 'Clock gap, death identity, state collapse, cleanup and kill progress.'),
        ('net.js', 279, 282, 'Map unrest and disease update boundary.'),
    ]),
    158: ('SHORT-SHIFTS', ('jobs',), 'Regular jobs use site state and a cooldown per cell/kind. Completion pays a wage-adjusted award, partial settlement counts completed work.', [
        ('walkeco.js', 1989, 2043, 'Work declarations, registration variants, cooldown and wages.'),
        ('walkeco.js', 2066, 2151, 'Workplace layout for factory, mine, oil and field.'),
        ('walkeco.js', 2165, 2205, 'Offer availability and building jobs from live sites and posts.'),
        ('walkeco.js', 2222, 2341, 'Site scan, carry path, delivery, end conditions and partial pay.'),
        ('walkeco.js', 2583, 2641, 'Interaction targets and job markers.'),
        ('walkeco.js', 2659, 2690, 'Local guard watch route and dialog.'),
        ('walkeco.js', 2710, 2716, 'Early exit payment multiplier.'),
        ('walkmil.js', 39, 41, 'Base guard pay declaration.'),
        ('walkmil.js', 2125, 2142, 'Base guard duty and ordered patrol points.'),
        ('walkrail.js', 1488, 1535, 'Station porter plus specialist driver registration.'),
    ]),
    159: ('TRANSPORT-CONTRACTS', ('jobs',), 'Port loading, locomotive driving and flight have their own state and settlement. Shared wallet payout does not imply a shared job formula.', [
        ('walksea.js', 1158, 1164, 'SEA hides competing ordinary port work where available.'),
        ('walksea.js', 2562, 2615, 'Dock stock, quota and persistent ledger.'),
        ('walksea.js', 2922, 2962, 'Shift eligibility, start and bonus at settlement.'),
        ('walksea.js', 2989, 3033, 'Individual cargo payout, quota and ship unloading bonus.'),
        ('walksea.js', 3089, 3116, 'Early shift closing and cancellation conditions.'),
        ('walkrail.js', 1504, 1529, 'Rail cooldown and dispatch offer.'),
        ('walkrail.js', 2820, 2835, 'Rail pay, precision, station count and away limit.'),
        ('walkrail.js', 2910, 2968, 'Rail shift admission, docking stages and stop payment.'),
        ('walkrail.js', 2969, 3035, 'Per-stop pay, missed stops, resume and completion bonus.'),
        ('walkair.js', 55, 62, 'Airplane pay and timing declarations.'),
        ('walkair.js', 3767, 3787, 'Pilot cooldown, admission and route pricing.'),
        ('walkair.js', 3856, 3912, 'Flight acceptance, cancellation, flight bonuses and payout.'),
        ('walkair.js', 3926, 3977, 'Airplane route progression and landing conditions.'),
        ('walkair.js', 4195, 4209, 'Airship pay and rental parameters.'),
        ('walkair.js', 4323, 4397, 'Airship passenger stages, arrival and time conditions.'),
        ('walkair.js', 4398, 4439, 'Airship rental payment and outcome boundary.'),
    ]),
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    probe = json.loads((ROOT / REPORT).read_text(encoding='utf-8'))
    assert probe['work_package_id'] == PACKAGE and probe['failed'] == 0 and probe['passed'] == len(probe['results'])
    scope = json.loads((BASE / 'research/feature-scope.json').read_text(encoding='utf-8'))
    package = next(p for p in scope['work_packages'] if p['id'] == PACKAGE)
    manifest = {row['path']: row for row in probe['sources']}
    loaded = {}
    rules, findings = [], []
    for source, (key, groups, summary, entries) in GROUPS.items():
        rule_ids = []
        for file, start, end, role in entries:
            path = f'EarthSimulator/{file}'
            if path not in loaded:
                raw = (ROOT / path).read_bytes()
                assert digest(raw) == manifest[path]['sha256'], path
                loaded[path] = raw.decode('utf-8-sig').splitlines()
            lines = loaded[path]
            assert 0 < start <= end <= len(lines), (path, start, end, len(lines))
            rule_id = f'WS-{len(rules)+1:02}'
            rule_ids.append(rule_id)
            rules.append({'id': rule_id, 'source_id': f'SRC-{source}', 'summary': role, 'evidence_type': 'static_traced',
                          'source': {'path': path, 'sha256': manifest[path]['sha256'], 'line': start, 'end_line': end,
                                     'source_lines': lines[start-1:end]}})
        probes = [r['id'].split('-', 1)[0] for r in probe['results'] if r['id'].split('-', 1)[1] in groups]
        assert probes, key
        findings.append({'id': key, 'evidence': rule_ids, 'probe_ids': probes, 'conclusion': summary})
    result = {
        'format_version': '1.0.0', 'work_package_id': PACKAGE, 'date': '2026-11-15', 'game_version': '2.1.4',
        'path_base': 'repository_root', 'feature_ids': package['feature_ids'], 'document_ids': DOCUMENTS,
        'source_ids': [f'SRC-{n}' for n in (*GROUPS, 160)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed',
                   'runtime_observations': 'not_performed', 'runtime_verified': False},
        'identity': {'source_files': probe['sources'], 'rea_source_selection': ['walkeco.js'],
                     'rea_parent_evidence_id': 'ev_20e6ccc26fcccb67c34e41b3fda7b88d62773f9e980111fe07cee2ec526eba7c',
                     'rea_summary_evidence_id': 'ev_febad4260fb61e968e5ce9cdb256cbac83a660fd0f04f4e494c13791433094d7',
                     'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                     'rea_bundle_path': BUNDLE, 'rea_bundle_sha256': digest((ROOT / BUNDLE).read_bytes()),
                     'rea_limits': ['One selected source, 63853 AST nodes, zero parse failures, 78 other files unselected.',
                                    'Partial graph with 78 application and 12533 semantic unknowns; 20000 semantic nodes retained per file at most.']},
        'declarations': probe['declarations'], 'rules': rules, 'findings': findings,
        'verification': {'command': f'node {SCRIPT}', 'report_path': REPORT, 'test_copy_path': COPY,
                         'checks': probe['results'], 'fixture_observations': probe['fixture_observations'],
                         'probe_script_sha256': digest((ROOT / SCRIPT).read_bytes()),
                         'environment': probe['environment'], 'runtime_verified': False},
        'limitations': ['Tests evaluate selected shipped functions with artificial cells, actors, route providers, item and UI adapters.',
                        'The 12 generation fixtures establish reachable generator branches with supplied prerequisites and do not measure frequency in actual worlds.',
                        'Game UI, long-running jobs, full fauna or people simulation, disk saves, graphics and live room outcomes remain unobserved.'],
        'next_package': 'WP-WALK-LAW-BASES',
    }
    target = BASE / 'research/extraction-walk-society-economy.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} ranges, {probe["passed"]} checks.')


if __name__ == '__main__':
    main()
