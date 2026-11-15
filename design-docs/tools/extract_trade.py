"""Export exact shipped trade/navigation declarations, source ranges and finite checks."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
HASH = lambda data: hashlib.sha256(data).hexdigest()


def main():
    report = json.loads((ROOT / '.research/wp-trade/probe-results.json').read_text(encoding='utf-8'))
    assert report['failed'] == 0 and report['passed'] == len(report['results'])
    for row in report['sources']:
        assert HASH((ROOT / row['path']).read_bytes()) == row['sha256'], row['path']
    rows = [
        ('TR-01','trade',28,115,'Complete TRADE/goods/carriers/biome declarations.',93),
        ('TR-02','trade',117,185,'Configuration clamps, separate RNG, finite pool and slot reuse.',93),
        ('TR-03','trade',196,239,'Profile allocation, biome/resource tables, production/use gates, coastal fish.',94),
        ('TR-04','trade',240,276,'Raw/resource/craft supply weights and best-source city preference.',94),
        ('TR-05','trade',277,349,'Strip scan, UID guards, nearest city and quick profile.',94),
        ('TR-06','trade',352,428,'Route keys/retention/eviction and bounded compaction histories.',97),
        ('TR-07','trade',430,469,'World/state/buyer memory, clock smoothing and weighted good choice.',94),
        ('TR-08','trade',470,486,'Lot quantity/value/origin/date/loader/carrier/buyer snapshots.',95),
        ('TR-09','trade',488,526,'Re-export eligibility, bounded hops, markup and one forward link.',95),
        ('TR-10','trade',529,576,'Sea/air carriers, ETA, dual cargo allocation and ship references.',96),
        ('TR-11','trade',577,633,'Same-tick raid matching, robbed/lost/taken/arrived and disappeared ships.',98),
        ('TR-12','trade',635,661,'Land pair budget and alternating direction.',96),
        ('TR-13','trade',662,709,'Real domestication, land carrier precedence, markets and caravan ETA.',96),
        ('TR-14','trade',711,742,'Current-owner delivery, land-war guard and flow accounting.',97),
        ('TR-15','trade',744,778,'Year callbacks, decay/forgetting, tick order and reset.',97),
        ('TR-16','trade',781,887,'Compact ordinary persistence, precision/remapping/limits and detached cargo.',99),
        ('TR-17','trade',889,951,'Decoded lot/progress/position/profile/ring/count APIs.',95),
        ('TR-18','trade',953,1020,'Display-only land A*, sea lanes and map threshold/selection.',96),
        ('TR-19','trade',1022,1054,'Finite diagnostic consistency checker, not runtime proof.',100),
        ('TR-20','trade',1056,1096,'Exact adapter references, primary array validation and event subscriptions.',99),
        ('TR-21','trade',1199,1220,'Display formatting and accumulator-to-year conversion.',97),
        ('TR-22','trade',1290,1357,'Route endpoints/directional goods/route KPIs and history.',97),
        ('TR-23','trade',1452,1492,'Goods card, suppliers/buyers/current cargo and bounded recent buyers.',97),
        ('TR-24','trade',1494,1520,'City profile attribution, top 12 routes, outgoing memory and capped incoming KPI.',97),
        ('TR-25','trade',1555,1654,'World and state delivered-flow summaries, route and transit lists.',97),
        ('TR-26','civ',138,186,'Local navigation/war/trade constants and era gates.',96),
        ('TR-27','civ',419,421,'Current invention threshold helper.',94),
        ('TR-28','civ',489,489,'Actual war test requires live states and cached foes.',98),
        ('TR-29','civ',512,554,'Sea reach, repeated-lane selection and near/far destinations.',96),
        ('TR-30','civ',1746,1782,'Civilization scheduler processes ships before civTick subscribers.',96),
        ('TR-31','civ',1806,1861,'Port thresholds, directional current/wind speed and time cost.',96),
        ('TR-32','civ',1862,1949,'Water BFS/flow A* with reach and diagonal isthmus guard.',96),
        ('TR-33','civ',2145,2167,'Local blockade trade/treasury/unrest effects; full battle deferred.',98),
        ('TR-34','civ',2213,2229,'Local privateering predicate, cash/trade losses and raid marker.',98),
        ('TR-35','civ',2231,2265,'Independent sea-lane memory, decay/cap and compact path encoding.',96),
        ('TR-36','civ',2266,2355,'Port cache/ship spawn/movement/core cash and knowledge/faith arrival.',96),
        ('TR-37','civ',2356,2366,'Ship disease/raid handoffs before return.',98),
        ('TR-38','civ',2378,2396,'Ordinary lanes extension and terrain validation on load.',99),
        ('TR-39','menu',10,138,'Ordinary world reconstruction and extension dispatch.',99),
        ('TR-40','net',203,235,'Shared graph snapshot applies exact trade adapter after ordinary load.',99),
        ('TR-41','walktrade',22,65,'Local walk declarations and in-transit/non-air entry guard.',98),
        ('TR-42','walktrade',510,544,'Trade robbery handoff and separate local-wage loot conversion.',98),
        ('TR-43','walktrade',603,610,'Early delivery or multiplayer free-command handoff.',98),
        ('TR-44','core',89,114,'Synchronous event dispatch; logged subscriber errors fail VM checks.',100),
        ('TR-45','index',710,750,'Classic-script module order including trade and walk integration.',99),
    ]
    rules=[]
    for rid,name,start,end,summary,sid in rows:
        source=f'EarthSimulator/{name}.html' if name=='index' else f'EarthSimulator/{name}.js'
        raw=(ROOT/source).read_bytes(); lines=raw.decode('utf-8-sig').splitlines()
        assert 0 < start <= end <= len(lines), (source,start,end,len(lines))
        rules.append({'id':rid,'summary':summary,'source_id':f'SRC-{sid:03}','evidence_type':'static_traced','source':{'path':source,'sha256':HASH(raw),'line':start,'end_line':end,'source_lines':lines[start-1:end]}})
    bundle='.research/rea/wp-trade-2026-11-15.evidence.json'
    result={
        'format_version':'1.0.0','work_package_id':'WP-TRADE-NAVIGATION','date':'2026-11-15','game_version':'2.1.4','path_base':'repository_root',
        'feature_ids':['FEAT-TRADE-GOODS','FEAT-TRADE-ROUTES','FEAT-TRADE-FLOWS','FEAT-TRADE-REEXPORT','FEAT-CITY-TRADE'],
        'document_ids':['DOC-TRADE','DOC-TRADE-MECHANICS','DOC-TRADE-NAVIGATION','DOC-TRADE-DATA','DOC-CITIES'],
        'source_ids':[f'SRC-{n:03}' for n in range(93,101)],
        'status':{'declarations':'extracted','static_chains':'traced','isolated_checks':'passed','runtime_observations':'not_performed','runtime_verified':False},
        'scope':{'completed':['26 goods/14 carriers/all TRADE and biome declarations','supply profiles/gates/city attribution/RNG','lot pool/origin/loader/carrier/buyer/retained re-export chain','land budget/markets/carriers/ETA and local sea reach/wind/current/path/ship chain','delivery/ownership change/flows/history/city read model','local blockade/raid/walk rob and arrive boundaries','ordinary trade/lanes persistence and exact trade adapter'],
                 'cross_package_boundaries':['Full climate/nature and war/invasion/peace resolution remain their packages. Local navigation consumes existing environment arrays.','City UI queries are traced statically; no rendered-window observation. Complete walk transport/guards/combat/currency economy remain walk packages.','Exact trade adapter tested in memory, not actual network encoding/transport or a room. No disk saves or old user files used.']},
        'identity':{'source_files':report['sources'],'rea_parent_evidence_id':'ev_f881eaf3113d363708805beec8a9c0e5c56e8e30af575e0566ff17dd364ed9ee','rea_summary_evidence_id':'ev_e1badea4eca45e53c20abdb4ff0c9774627474bcc29cb5f0330ed6e3a96eaa78','rea_artifact_sha256':'681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd','rea_source_selection':['trade.js'],'rea_bundle_path':bundle,'rea_bundle_sha256':HASH((ROOT/bundle).read_bytes()),'rea_limits':['One JavaScript file parsed, 30824 AST nodes, no failures; 78 other inventoried files outside selection.','Application and semantic graphs partial, not truncated: 78 application and 15867 semantic unknowns.','Inert syntax analysis is not execution; adjacent source ranges manually traced and hashed.']},
        'declarations':report['declarations'],'rules':rules,
        'findings':[
            {'id':'WEIGHTS-NOT-STOCK','evidence':['TR-04','TR-08','TR-36'],'conclusion':'Supply profile is a relative offer weight. Lot creation drains no inventory; core ship cash and trade values do not equal delivered lot value.'},
            {'id':'REEXPORT-BOUNDED','evidence':['TR-09','TR-10'],'conclusion':'One onward link, no source mass decrement, retained hops only; markup caps at retained HOPS. A re-export can use full capacity plus a second 40% cargo.'},
            {'id':'CURRENT-BUYER','evidence':['TR-14'],'conclusion':'Delivery resolves current owner, retaining original buyer technology snapshot. Domestic and unowned deliveries count world turnover; country exports/imports use last loader versus current owner.'},
            {'id':'RAID-SAME-TICK','evidence':['TR-11','TR-34'],'conclusion':'Only a matching raid marker with startTick exactly equal to current simTick marks removed ship cargo TAKEN; an older raid leaves ghost delivery.'},
            {'id':'TWO-ROUTE-MEMORIES','evidence':['TR-06','TR-35'],'conclusion':'trade routes track lots/value/history; civ seaLanes track arrived ships and decay every eight ticks. They have distinct caps/lifetimes and same-length seaLanes geometry is retained.'},
            {'id':'CITY-READ-MODEL','evidence':['TR-24'],'conclusion':'Made here uses only best-source city attribution; outgoing count spans retained pool records. Incoming KPI and route count are capped at twelve by the pre-sliced lists.'},
            {'id':'CLOCK-NOT-GEOMETRY','evidence':['TR-13','TR-18','TR-31','TR-32'],'conclusion':'Land ETA uses direct distance; display A* does not change arrival time. Sea route search and movement use directional wind/current; live-ship cargo waits for observed ship arrival.'},
            {'id':'SAVE-NOT-EXACT','evidence':['TR-16','TR-20','TR-40'],'conclusion':'Ordinary save rounds/detaches cargo and omits RNG/scan/land budget. Exact adapter restores arrays, references and those clocks/caches within a shared object graph.'},
        ],
        'verification':{'command':'node design-docs/tools/probe_trade.cjs','report_path':'.research/wp-trade/probe-results.json','test_copy_path':'.research/wp-trade/test-copy/EarthSimulator','checks':report['results'],'probe_script_sha256':HASH((ROOT/'design-docs/tools/probe_trade.cjs').read_bytes()),'environment':report['environment'],'runtime_verified':False},
        'limitations':['71 finite synthetic VM checks do not establish full-game runtime, UI correctness or long stochastic trade dynamics.','VM-only lexical exposure does not alter function bodies or original/copied source files. Translation/DOM/font/time stubs are listed in report; any logged subscriber error fails.','Artificial small limits, direct private-function calls, external ship retention after reset, forced probabilities and exact-adapter clone are explicit boundary fixtures.','Blockade/privateering/walk local handoffs are traced statically; isolated trade effects are checked without executing complete war/walk systems. Network transport, disk saves, active mods and old user files remain unobserved.'],
        'next_package':'WP-WORLD-WARS-TERRITORY',
    }
    target=ROOT/'design-docs/research/extraction-trade.json'
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} source ranges, {report["passed"]} passed probes.')


if __name__ == '__main__':
    main()
