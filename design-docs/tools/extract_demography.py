"""Export source-bound demography/city traces and isolated checks without editing the game."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
HASH = lambda data: hashlib.sha256(data).hexdigest()


def main():
    report = json.loads((ROOT / '.research/wp-demography/probe-results.json').read_text(encoding='utf-8'))
    assert report['failed'] == 0 and report['passed'] == len(report['results'])
    for row in report['sources']:
        assert HASH((ROOT / row['path']).read_bytes()) == row['sha256'], row['path']
    rules = []

    def add(rid, name, start, end, summary, sid):
        path = f'EarthSimulator/{name}.js'
        data = (ROOT / path).read_bytes()
        lines = data.decode('utf-8-sig').splitlines()
        assert 0 < start <= end <= len(lines), (path, start, end)
        rules.append({'id': rid, 'summary': summary, 'source_id': sid, 'evidence_type':'static_traced',
                      'source':{'path':path,'sha256':HASH(data),'line':start,'end_line':end,'source_lines':lines[start-1:end]}})

    rows = [
        ('DEM-01','civ',62,200,'CIV parameter declarations; only demography/city/social consumers are traced in this package.','SRC-067'),
        ('DEM-02','civ',448,484,'Natural climate habitability, lethal thresholds and agricultural food capacity.','SRC-068'),
        ('DEM-03','civ',558,618,'Smoothed wind exposure, foodCapS, rural/subsistence/urban capacity and prior adaptation.','SRC-068'),
        ('DEM-04','civ',620,630,'Adaptation rises only above population 30, decays on sparse land, water is skipped.','SRC-068'),
        ('DEM-05','civ',632,668,'Logistic growth, transition, disease mortality and in-place infection; immunity decrements first.','SRC-069'),
        ('DEM-06','civ',672,723,'Buffered migration with live destination room, old source population and straight sea rays.','SRC-069'),
        ('DEM-07','civ',726,773,'Depopulated territory release, immediate brush cleanup, capital transfer and state death preserve cell population.','SRC-070'),
        ('DEM-08','core',1219,1255,'Terrain recomputation changes water/land fields without erasing flooded population.','SRC-069'),
        ('DEM-09','disasters',38,44,'Circular plague neighborhood.','SRC-069'),
        ('DEM-10','disasters',138,146,'External plague overrides immunity; center population threshold differs from neighborhood.','SRC-069'),
        ('DEM-11','disasters',193,216,'Disaster tick has no continuing plague mortality; disease is handled by population step.','SRC-069'),
        ('DEM-12','disasters',247,263,'Yearly natural plague selection is separate from overcrowding outbreak.','SRC-069'),
        ('DEM-13','civ',1785,1804,'Famine detects smoothed food loss, raises unrest and logs; does not directly kill population.','SRC-069'),
        ('CITY-01','civ',263,273,'City name/passport is created on first query; identity is cell-bound.','SRC-070'),
        ('CITY-02','civ',815,866,'Cached city-site score, rank-size urban budget, 86/14 split and town limits.','SRC-070'),
        ('CITY-03','civ',887,914,'State aggregation and social wellbeing; city count lacks water filter. GDP context is scoped, not full economy extraction.','SRC-071'),
        ('CITY-04','civ',995,1014,'State defaults; Set/Map types are established by source, not flattened JSON alone.','SRC-067'),
        ('CITY-05','civ',1735,1782,'Strict marker thresholds, exclusion of water, capital relocation and full civTick ordering.','SRC-070'),
        ('CITY-06','menu',10,138,'Ordinary save arrays/state/passports; city-site cache excluded and city list rebuilt.','SRC-070'),
        ('CITY-07','custom',151,160,'Rename updates name dictionaries and keeps original name for reset.','SRC-070'),
        ('CITY-08','ui',1403,1407,'Manual city founding raises population/urban capacity; caller restrictions are separate.','SRC-070'),
        ('SOC-01','stats',211,217,'State metrics read existing aggregates.','SRC-071'),
        ('SOC-02','stats',270,305,'World population uses grid, social metrics use weighted state aggregates with different coverage.','SRC-071'),
        ('SOC-03','people',629,634,'Life expectancy influences mortality of simulated people.','SRC-071'),
        ('SOC-04','people',1402,1409,'NPC kill marks person death without subtracting W.pop.','SRC-071'),
        ('SOC-05','people',1584,1613,'Yearly simulated person mortality and life-expectancy consumption.','SRC-071'),
        ('SOC-06','people',1718,1739,'Save simulated people and bounded procedural NPC death records.','SRC-071'),
        ('SOC-07','people',1846,2011,'Procedural NPC chains, lifetimes, cache and cityResidents sample are distinct from grid census.','SRC-071'),
        ('SOC-08','panels',236,284,'Card labels and sampled biographies differ from marker thresholds and aggregate residents.','SRC-071'),
        ('SOC-09','walkact',2132,2158,'Walk actors are a bounded visual cast, not all residents.','SRC-071'),
        ('SOC-10','walkact',2975,3002,'Walk person kill path calls person-level hooks; no direct aggregate census subtraction here.','SRC-071'),
    ]
    for row in rows:
        add(*row)
    bundle = '.research/rea/wp-demography-2026-11-15.evidence.json'
    result = {
        'format_version':'1.0.0','work_package_id':'WP-DEMOGRAPHY-CITIES','date':'2026-11-15','game_version':'2.1.4','path_base':'repository_root',
        'feature_ids':['FEAT-POPULATION','FEAT-EPIDEMICS','FEAT-CLIMATE-ADAPTATION','FEAT-SOCIAL-WELLBEING','FEAT-CITY-REGISTER','FEAT-ECONOMY','FEAT-TECHNOLOGY'],
        'document_ids':['DOC-DEMOGRAPHY','DOC-DEMOGRAPHY-DATA','DOC-CLOCK-POPULATION','DOC-STATE-CITIES','DOC-CITIES','DOC-ECONOMY','DOC-TECHNOLOGY'],
        'source_ids':[f'SRC-{i:03}' for i in range(67,73)],
        'status':{'declarations':'extracted','static_chains':'traced','isolated_checks':'passed','runtime_observations':'not_performed','runtime_verified':False},
        'scope':{'owned_package':'WP-DEMOGRAPHY-CITIES','completed':['capacity/adaptation','population/disease/plague/migration','flood/depopulation','cities/urbanization/passports','social wellbeing and local NPC integration'],
                 'cross_package_boundaries':['GDP and technology inputs required for wellbeing; full WP-ECONOMY-TECH remains next','Local PEOPLE/NPC consumers; full dynasty/walk algorithms deferred','Local plague effects only; full disasters deferred','Ordinary in-memory save contract only; full disk storage/network deferred']},
        'identity':{'source_files':report['sources'],'rea_artifact_sha256':'681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                    'rea_parent_evidence_id':'ev_63627df7d49729173b81f041a7395f35f7b9e2f87eb07739e9a86bac374c171d',
                    'rea_summary_evidence_id':'ev_5daae06b51f956a876f7867a4c56124dce00613676314a714877c300d06dc14b',
                    'rea_bundle_path':bundle,'rea_bundle_sha256':HASH((ROOT/bundle).read_bytes()),'rea_source_selection':['civ.js'],
                    'rea_limits':['78 files outside selected source analysis','Application/semantic graph partial; semantic retention not truncated with 50000 nodes/file allowance','78 application and 15481 semantic unknowns; inert syntax only']},
        'declarations':report['declarations'],'rules':rules,
        'findings':[
            {'id':'FLOODED-POPULATION','evidence':'DEM-03,DEM-05,DEM-08','conclusion':'Flooding does not immediately erase people: capacity=0, lethal flag=0; occupied water takes harsh decay .95 then may evacuate by migration.'},
            {'id':'URBAN-CAPACITY','evidence':'CITY-02,CITY-05','conclusion':'Urban is capacity, city markers are strict threshold samples; allocations do not move people.'},
            {'id':'SOCIAL-SNAPSHOT','evidence':'CITY-03,CITY-05','conclusion':'State aggregates precede urban allocation/late damage; cityCount may include flooded cells while cities excludes them.'},
            {'id':'NPC-CENSUS','evidence':'SOC-07,SOC-08,SOC-10','conclusion':'Procedural resident lists and walk casts are not a census; traced NPC death does not subtract W.pop.'},
            {'id':'HIGH-PACE-LIMIT','evidence':'DEM-06','conclusion':'Migration lacks a source out<=P clamp; extreme manually supplied pace=1000 yields negative source population in D39. This is an edge probe, not a claim about ordinary UI settings.'},
        ],
        'verification':{'command':'node design-docs/tools/probe_demography.cjs','report_path':'.research/wp-demography/probe-results.json','test_copy_path':'.research/wp-demography/test-copy/EarthSimulator',
                        'checks':report['results'],'probe_script_sha256':HASH((ROOT/'design-docs/tools/probe_demography.cjs').read_bytes()),'environment':report['environment'],'runtime_verified':False},
        'limitations':['Static tracing and isolated execution do not observe the full game.','All inspected source bytes and immutable test copies are hashed; selected dispatch/late-system functions are stubbed only as specified in report.',
                       '45 finite cases do not verify stochastic trajectories, performance, UI consistency or network operation.','Full economy/technology, politics, dynasties, wars, walk, disasters, world nature and storage remain separate packages.'],
        'next_package':'WP-ECONOMY-TECH',
    }
    path = ROOT / 'design-docs/research/extraction-demography.json'
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Wrote {path.relative_to(ROOT)}: {len(rules)} source ranges, {report["passed"]} passed probes.')


if __name__ == '__main__':
    main()
