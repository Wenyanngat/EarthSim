"""Export source-bound economy/technology rules and finite isolated observations."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
HASH = lambda data: hashlib.sha256(data).hexdigest()


def main():
    report = json.loads((ROOT / '.research/wp-economy/probe-results.json').read_text(encoding='utf-8'))
    assert report['failed'] == 0 and report['passed'] == len(report['results'])
    for row in report['sources']:
        assert HASH((ROOT / row['path']).read_bytes()) == row['sha256'], row['path']
    rows = [
        ('ECO-01', 'core', 209, 222, 'Resource IDs and base mining eras; markers are not finite mined stocks.', 'SRC-073'),
        ('ECO-02', 'civ', 59, 103, 'Base tempo, economy/science/urban parameter declarations.', 'SRC-073'),
        ('ECO-03', 'civ', 163, 234, 'Industry/emissions, era tables, legacy ladder mapping, era linearization and pace.', 'SRC-074'),
        ('ECO-04', 'civ', 278, 291, 'Government modifiers consumed by science; full political lifecycle is deferred.', 'SRC-074'),
        ('ECO-05', 'civ', 870, 885, 'Offshore cached resource ownership uses first live NB8 neighbor; periodic and explicit invalidation.', 'SRC-073'),
        ('ECO-06', 'civ', 887, 914, 'Cell aggregates, offshore counts, resource wealth, GDP smoothing and social input order.', 'SRC-073'),
        ('ECO-07', 'civ', 916, 920, 'Treasury production/upkeep/decay and trade decay use prior military and era.', 'SRC-073'),
        ('ECO-08', 'civ', 922, 953, 'Science drive/gates, inventions, era events, military and bounded history.', 'SRC-074'),
        ('ECO-09', 'civ', 356, 431, 'All 58 invention declarations, invHas permissive unknown keys, eraRebuilt, inclusive era thresholds and rural productivity.', 'SRC-074'),
        ('ECO-10', 'civ', 995, 1014, 'State economy/science/army defaults and ruler modifiers.', 'SRC-073'),
        ('ECO-11', 'civ', 1134, 1138, 'Power is a separate derived value with technology/GDP/iron/horses/ruler/exhaustion modifiers.', 'SRC-075'),
        ('ECO-12', 'civ', 1704, 1732, 'Cell industry target/fuel/smoothing, pollution/vegetation/emissions and bounded CO2 feedback.', 'SRC-075'),
        ('ECO-13', 'civ', 1746, 1782, 'Civilization ordering; offshore every 16; aggregate, technology, urbanization and late diffusion snapshots.', 'SRC-073'),
        ('ECO-14', 'civ', 1420, 1459, 'Peaceful neighbor trade and gap diffusion every third civ tick, blocked during war.', 'SRC-076'),
        ('ECO-15', 'civ', 1503, 1511, 'Vassal tribute is a 2 percent treasury transfer per diplomacy update; full vassal politics deferred.', 'SRC-076'),
        ('ECO-16', 'civ', 2268, 2281, 'Maritime arrival context: route caches and ship spawning; pathfinding remains trade/navigation scope.', 'SRC-076'),
        ('ECO-17', 'civ', 2313, 2355, 'Actual ship arrival credits treasuries/trade and diffuses knowledge, with route-length weight.', 'SRC-076'),
        ('ECO-18', 'trade', 1, 23, 'Goods accounting is separate from civilization macroeconomy; architecture declaration corroborated at local writes.', 'SRC-076'),
        ('ECO-19', 'trade', 217, 229, 'Production gates use inventions/obsolescence/mining eras and local resource requirements; buyer slack is eligibility only.', 'SRC-076'),
        ('ECO-20', 'trade', 598, 610, 'Player robbery explicitly subtracts treasury/trade; full walk robbery lifecycle deferred.', 'SRC-076'),
        ('ECO-21', 'people', 12, 75, 'Ruler parameter declarations; full genealogy and succession deferred.', 'SRC-077'),
        ('ECO-22', 'people', 272, 299, 'All ruler trait modifiers; science consumes trait rm[0].', 'SRC-077'),
        ('ECO-23', 'people', 823, 846, 'Ruler learning/administration/traits, elective/regency scaling and finite bounded modifiers.', 'SRC-077'),
        ('ECO-24', 'civ', 322, 327, 'Golden shock changes stability and golden timer.', 'SRC-077'),
        ('ECO-25', 'disasters', 310, 316, 'Inspiration is a direct capped science addition; era is updated later.', 'SRC-077'),
        ('ECO-26', 'civ', 1020, 1027, 'Secession copies 82 percent technology and 80 percent GDP per capita; full secession deferred.', 'SRC-077'),
        ('ECO-27', 'civ', 2397, 2476, 'Invention/era-first save contract, old ladder migration and exact/approximate backfill algorithm.', 'SRC-077'),
        ('ECO-28', 'menu', 10, 138, 'Ordinary in-memory economy/state save and restore; no disk storage claims.', 'SRC-077'),
        ('ECO-29', 'stats', 211, 217, 'Statistics reads existing macro aggregates and army count.', 'SRC-076'),
        ('ECO-30', 'stats', 1323, 1337, 'State table metrics use aggregate values; full ranking/UI remains separate.', 'SRC-076'),
        ('ECO-31', 'civ', 589, 618, 'Technology, agricultural productivity and herds feed food capacity; previously extracted demography input.', 'SRC-075'),
        ('ECO-32', 'civ', 815, 866, 'Previously extracted urban surplus/Zipf allocation consumes new tech; does not transport concrete goods.', 'SRC-075'),
        ('ECO-33', 'stats', 1503, 1521, 'Ranking metrics and top-positive descending bars; local growth comparison.', 'SRC-076'),
        ('ECO-34', 'stats', 1175, 1188, 'Percentage points, multipliers and percent-change formatting thresholds.', 'SRC-076'),
        ('ECO-35', 'stats', 2314, 2319, 'State change-label snapshot selection by historical window.', 'SRC-076'),
        ('ECO-36', 'stats', 31, 31, 'Default change-label window is 50 simulation years.', 'SRC-076'),
    ]
    rules = []
    for rid, name, start, end, summary, sid in rows:
        source = f'EarthSimulator/{name}.js'
        data = (ROOT / source).read_bytes()
        lines = data.decode('utf-8-sig').splitlines()
        assert 0 < start <= end <= len(lines), (source, start, end, len(lines))
        rules.append({'id': rid, 'summary': summary, 'source_id': sid, 'evidence_type': 'static_traced',
                      'source': {'path': source, 'sha256': HASH(data), 'line': start, 'end_line': end, 'source_lines': lines[start - 1:end]}})
    bundle = '.research/rea/wp-demography-2026-11-15.evidence.json'
    result = {
        'format_version': '1.0.0', 'work_package_id': 'WP-ECONOMY-TECH', 'date': '2026-11-15', 'game_version': '2.1.4', 'path_base': 'repository_root',
        'feature_ids': ['FEAT-ECONOMY', 'FEAT-TECHNOLOGY', 'FEAT-STATE-METRICS', 'FEAT-ARMY-POWER'],
        'document_ids': ['DOC-ECONOMY', 'DOC-TECHNOLOGY', 'DOC-ECONOMY-DATA', 'DOC-STATE-OVERVIEW'],
        'source_ids': [f'SRC-{n:03}' for n in range(73, 79)],
        'status': {'declarations': 'extracted', 'static_chains': 'traced', 'isolated_checks': 'passed', 'runtime_observations': 'not_performed', 'runtime_verified': False},
        'scope': {'completed': ['resources/offshore', 'macro GDP/treasury/trade inputs', 'science/8 eras/58 inventions', 'industry/ecological feedback', 'military versus power', 'neighbor and maritime diffusion', 'local ruler/inspiration/secession inputs', 'in-memory save/legacy migration/backfill'],
                  'cross_package_boundaries': ['Full politics/vassals/war/genealogy remain in later primary packages.', 'Goods creation/transport/delivery and full routes remain WP-TRADE-NAVIGATION.', 'Full historical sampling/UI rendering, disk storage/network and full world climate remain deferred.']},
        'identity': {'source_files': report['sources'], 'rea_reused_from': 'WP-DEMOGRAPHY-CITIES; imported and inspected without repeating source analysis',
                     'rea_parent_evidence_id': 'ev_63627df7d49729173b81f041a7395f35f7b9e2f87eb07739e9a86bac374c171d',
                     'rea_artifact_sha256': '681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                     'rea_bundle_path': bundle, 'rea_bundle_sha256': HASH((ROOT / bundle).read_bytes()), 'rea_source_selection': ['civ.js'],
                     'rea_limits': ['Static syntax only; no game execution.', '78 inventoried files outside selection; application and semantic graph partial.', '78 application unknowns and 15481 semantic unknowns; unselected sources traced manually with source hashes.']},
        'declarations': report['declarations'], 'rules': rules,
        'findings': [
            {'id': 'TICK-SNAPSHOTS', 'evidence': ['ECO-06', 'ECO-07', 'ECO-08', 'ECO-13'], 'conclusion': 'GDP uses prior tech; upkeep uses prior military/era; military uses new tech/era; industry and external tech diffusion occur after aggregate update.'},
            {'id': 'OFFSHORE-TIE', 'evidence': ['ECO-05'], 'conclusion': 'First live neighboring owner in NB8 order wins, not nearest capital or largest coast; stale/new resource cache boundaries matter.'},
            {'id': 'SCIENCE-GATE', 'evidence': ['ECO-08'], 'conclusion': 'Industry gate requires BOTH coal and iron absent; gate overlaps missing oil at 12.5<=tech<13; technology has soft convergence rather than a final clamp.'},
            {'id': 'ERA-LAG', 'evidence': ['ECO-14', 'ECO-17'], 'conclusion': 'External knowledge gain changes tech but does not immediately update era, inv, firsts, techRate or GDP.'},
            {'id': 'UNITS-SEPARATE', 'evidence': ['ECO-06', 'ECO-07', 'ECO-18', 'ECO-20'], 'conclusion': 'Conditional GDP, treasury, trade ties, goods accounting and player coins remain distinct; explicit local robbery is an exception touching treasury/trade.'},
            {'id': 'INVENTION-GATES', 'evidence': ['ECO-09', 'ECO-19', 'ECO-27'], 'conclusion': 'invHas uses numeric tech, not global first or st.inv; unknown keys are open. First records persist or are reconstructed with exact/approximate attribution.'},
        ],
        'verification': {'command': 'node design-docs/tools/probe_economy.cjs', 'report_path': '.research/wp-economy/probe-results.json', 'test_copy_path': '.research/wp-economy/test-copy/EarthSimulator',
                         'checks': report['results'], 'probe_script_sha256': HASH((ROOT / 'design-docs/tools/probe_economy.cjs').read_bytes()), 'environment': report['environment'], 'runtime_verified': False},
        'limitations': ['Finite isolated numerical execution is not full-game runtime verification.', 'Only core/climate/ecology/civ and the exact menu serialization prefix execute in these probes; other hashed source files are static inputs.',
                        'E35 uses actual arrival and payouts with subsequent destination/lane bookkeeping stubbed. E41 supplies synthetic historical rows, not a running statistics UI.',
                        'Long stochastic trajectories, visuals/performance, disk saves, network/Steam/mods and full next-package mechanics remain unobserved.'],
        'next_package': 'WP-POLITICS-SOCIETY',
    }
    target = ROOT / 'design-docs/research/extraction-economy.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} source ranges, {report["passed"]} passed probes.')


if __name__ == '__main__':
    main()
