"""Export source-bound political/society traces with finite isolated observations."""
from pathlib import Path
import hashlib
import json

ROOT=Path(__file__).resolve().parents[2]
HASH=lambda data: hashlib.sha256(data).hexdigest()


def main():
    report=json.loads((ROOT/'.research/wp-politics/probe-results.json').read_text(encoding='utf-8'))
    assert report['failed']==0 and report['passed']==len(report['results'])
    for row in report['sources']:
        assert HASH((ROOT/row['path']).read_bytes())==row['sha256'],row['path']
    rows=[
        ('POL-01','civ',59,200,'Base constants and all political/diplomatic/secession/tempo declarations.','SRC-079'),
        ('POL-02','civ',278,327,'Government table, hereditary/free flags and local shocks.','SRC-082'),
        ('POL-03','civ',726,779,'Owner changes, depopulation/death, vassal release and stateNew dispatch.','SRC-080'),
        ('POL-04','civ',781,813,'Land-dependent cap, natural nucleation and direct player founding.','SRC-079'),
        ('POL-05','civ',956,976,'Fractional claims, spent integer budget and ordered NB8 expansion.','SRC-079'),
        ('POL-06','civ',978,1014,'Slot generation/UID, state initialization and default fields.','SRC-079'),
        ('POL-07','civ',1020,1031,'Secession chooses peak-pop capital and inherits a bounded subset; no treasury transfer.','SRC-080'),
        ('POL-08','civ',1033,1057,'Eight-connected components, minimum fragment thresholds and owner release.','SRC-080'),
        ('POL-09','civ',1059,1100,'Weighted land reach, sampled sea support and stability retention before separation.','SRC-080'),
        ('POL-10','civ',1102,1131,'Stability target, decline, peace exhaustion recovery and farthest 35 percent collapse.','SRC-080'),
        ('POL-11','civ',1389,1406,'Four-edge border counting, symmetric neighbor cache and shared foe.','SRC-083'),
        ('POL-12','civ',1408,1418,'Union transfers cells/treasury/trade, ends loser wars and emits death; no tech averaging.','SRC-083'),
        ('POL-13','civ',1420,1532,'Relations, peaceful diffusion, protectorates, war-start factors, tribute, absorption and federation eligibility.','SRC-083'),
        ('POL-14','civ',1535,1554,'Alliance blocks are graph connected components, size at least three, largest-population leader.','SRC-083'),
        ('POL-15','civ',1199,1250,'Local coalition recruitment at war declaration; complete warfare remains deferred.','SRC-083'),
        ('POL-16','civ',1746,1782,'State aggregation/expansion/stability/diplomacy/society ordering and cadences.','SRC-079'),
        ('POL-17','society',8,24,'All base society parameters.','SRC-081'),
        ('POL-18','society',25,36,'Culture/faith sentinel records and bounded ancestry roots.','SRC-081'),
        ('POL-19','society',37,55,'Local architecture inheritance/climate/hysteresis functions; no rendering observation.','SRC-084'),
        ('POL-20','society',61,102,'Culture/faith names, new IDs, absolute 250-entry limits, holy cell and zeal.','SRC-081'),
        ('POL-21','society',105,110,'Population-plus-one majority and insertion-order tie behavior.','SRC-081'),
        ('POL-22','society',112,127,'Direct government changes, event kind, stability delta and silent dispatch.','SRC-082'),
        ('POL-23','society',129,170,'All government-year transitions, cooldown gates and sequential random branches.','SRC-082'),
        ('POL-24','society',172,192,'State birth assigns culture/religion/government; revolt name restoration.','SRC-079'),
        ('POL-25','society',194,250,'Striped assimilation/conversion, delayed unity, faith death/revival and world followers.','SRC-081'),
        ('POL-26','society',252,256,'New state religion seeds capital/other cells with temporary unity.','SRC-081'),
        ('POL-27','society',258,265,'Schism excludes holy-cell owner and changes old-faith followers probabilistically.','SRC-081'),
        ('POL-28','society',267,290,'National revolt selects culture by cell count, connected chunk, reunion or independent state.','SRC-080'),
        ('POL-29','society',292,320,'Annual reforms, snapshot faith limit, revolt attempt cooldown, ethnogenesis and schism.','SRC-081'),
        ('POL-30','society',322,346,'Society reset/save/load, rounded religion fields, legacy cultures and governments.','SRC-084'),
        ('POL-31','menu',10,138,'Ordinary in-memory state serialization, persistent cooldown fields and reconstruction.','SRC-084'),
        ('POL-32','people',1243,1268,'Local stateNew handoff to election/restoration/cadet/new dynasty; full people package deferred.','SRC-082'),
        ('POL-33','people',1299,1355,'Local government-change handoff: hereditary titles, elective leaders and restoration; static only.','SRC-082'),
        ('POL-34','people',1816,1841,'Government-how fallback and guarded event subscriptions.','SRC-082'),
        ('POL-35','stats',482,511,'History consumes birth/death/government changes.','SRC-084'),
        ('POL-36','stats',765,773,'Statistics event subscription identities.','SRC-084'),
        ('POL-37','index',710,723,'Classic-script order places society before people.','SRC-084'),
        ('POL-38','core',89,114,'Synchronous event bus catches subscriber exceptions; probes explicitly fail on logged errors.','SRC-084'),
        ('POL-39','ui',1403,1408,'UI city founding raises population/urban before direct foundStateAt.','SRC-079'),
        ('POL-40','civ',2319,2328,'Local overseas colony adds population and owner language/faith; no new state object.','SRC-080'),
        ('POL-41','mods',509,536,'Explicit scenario/mod seeding calls founding then overrides; separate from base rules.','SRC-084'),
    ]
    rules=[]
    for rid,name,start,end,summary,sid in rows:
        source=f'EarthSimulator/{name}.html' if name=='index' else f'EarthSimulator/{name}.js'
        raw=(ROOT/source).read_bytes();lines=raw.decode('utf-8-sig').splitlines()
        assert 0<start<=end<=len(lines),(source,start,end,len(lines))
        rules.append({'id':rid,'summary':summary,'source_id':sid,'evidence_type':'static_traced','source':{'path':source,'sha256':HASH(raw),'line':start,'end_line':end,'source_lines':lines[start-1:end]}})
    bundle='.research/rea/wp-politics-2026-11-15.evidence.json'
    result={
        'format_version':'1.0.0','work_package_id':'WP-POLITICS-SOCIETY','date':'2026-11-15','game_version':'2.1.4','path_base':'repository_root',
        'feature_ids':['FEAT-STATE-FORMATION','FEAT-GOVERNMENT-REFORMS','FEAT-CULTURAL-CHANGE','FEAT-RELIGIOUS-DYNAMICS','FEAT-STATE-DECLINE','FEAT-VASSALS-FEDERATIONS','FEAT-DIPLOMACY','FEAT-CULTURES-RELIGIONS'],
        'document_ids':['DOC-STATE-FORMATION','DOC-CULTURES-RELIGIONS','DOC-TERRITORY','DOC-DIPLOMACY','DOC-POLITICS-DATA'],
        'source_ids':[f'SRC-{n:03}' for n in range(79,86)],
        'status':{'declarations':'extracted','static_chains':'traced','isolated_checks':'passed','runtime_observations':'not_performed','runtime_verified':False},
        'scope':{'completed':['natural/manual state founding and identity','claims/peaceful ownership/secession/collapse','stability/decline','all government transitions and local people handoff','cultures/assimilation/ethnogenesis/national revolt','faith birth/conversion/adoption/schism/death/revival','relations/vassals/federations/blocks and local coalition eligibility','in-memory persistence/legacy society recovery'],
                 'cross_package_boundaries':['Full people/dynasty succession comes next; event handlers are read statically but not executed here.','War declaration/coalitions and local colony writes are traced only as political handoffs; battles/war resolution/navigation remain later primary packages.','Full world nature, UI/rendering, disk saves/network/Steam and arbitrary mods remain deferred.']},
        'identity':{'source_files':report['sources'],'rea_parent_evidence_id':'ev_8dd6757ee573863dcd5c555b3715f411c1bb5f20373ebba550a1db01c8aca3d6','rea_summary_evidence_id':'ev_57698cb2446038324bb22e7e681046e600b77001d924ebe97623026dd3e65335',
                    'rea_artifact_sha256':'681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd','rea_source_selection':['society.js'],'rea_bundle_path':bundle,'rea_bundle_sha256':HASH((ROOT/bundle).read_bytes()),
                    'rea_limits':['1 JavaScript file parsed without failures; 78 inventoried files outside source selection.','Application/semantic graph partial, not truncated; 78 application and 3475 semantic unknowns.','Source text analyzed as inert syntax; other sources manually traced with exact hashes.'],
                    'reused_civ_evidence_path':'.research/rea/wp-demography-2026-11-15.evidence.json'},
        'declarations':report['declarations'],'rules':rules,
        'findings':[
            {'id':'MANUAL-FOUNDING','evidence':['POL-04','POL-39'],'conclusion':'Direct foundStateAt rejects water/ownership but bypasses natural population/cap gates; UI foundCity first raises population/urban.'},
            {'id':'BLOC-CONNECTIVITY','evidence':['POL-14'],'conclusion':'Blocks are connected components of alliance edges; no pairwise clique test. Lead is greatest population, not power.'},
            {'id':'RELIGION-LIMIT-SNAPSHOT','evidence':['POL-29'],'conclusion':'Annual relAlive is computed once; multiple eligible births can exceed configured REL_MAX. Probe shows 13 to 15 at default max 14.'},
            {'id':'UNITY-SNAPSHOT','evidence':['POL-25'],'conclusion':'Unity/followers are previous striped-cycle observations; cells update in place and no water exclusion exists in societyTick.'},
            {'id':'GOVERNMENT-ZERO-YEAR','evidence':['POL-23'],'conclusion':'_govY=0 is treated as absent by || fallback and bypasses the nominal cooldown; early hereditary transitions backdate by 30.'},
            {'id':'FEDERATION-ASYMMETRY','evidence':['POL-13'],'conclusion':'Union gate requires industrial era only on lower-ID outer-loop state; inner-loop partner has no era check. Probe merges an era-0 republic.'},
            {'id':'OWNERSHIP-NOT-IDENTITY','evidence':['POL-03','POL-07','POL-12','POL-28'],'conclusion':'Ownership transfers normally preserve cell population/culture/faith; secession and merge inherit different macro fields. Vassal/bloc status alone does not transfer land.'},
            {'id':'OVERSEAS-RETENTION','evidence':['POL-09'],'conclusion':'High stability may retain even unsupported overseas land with probability .6; the nearby comment claiming inevitable separation is not the executed condition.'},
        ],
        'verification':{'command':'node design-docs/tools/probe_politics.cjs','report_path':'.research/wp-politics/probe-results.json','test_copy_path':'.research/wp-politics/test-copy/EarthSimulator','checks':report['results'],
                        'probe_script_sha256':HASH((ROOT/'design-docs/tools/probe_politics.cjs').read_bytes()),'environment':report['environment'],'runtime_verified':False},
        'limitations':['59 finite deterministic VM cases do not observe a running game, long random trajectories or UI/network consistency.','All event-bus subscriber errors are treated as probe failures; people/stats lifecycle subscribers are not loaded.','P01 uses synthetic LANDMASS counts; P02 overrides cap to prove direct entry boundaries; P49 creates an artificial early republic to test the missing inner era condition.','Real terrain/pathfinding/performance, disk files, historical saves, multiplayer and active mods require separate observations.'],
        'next_package':'WP-PEOPLE-DYNASTIES',
    }
    target=ROOT/'design-docs/research/extraction-politics.json'
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} source ranges, {report["passed"]} passed probes.')


if __name__=='__main__':
    main()
