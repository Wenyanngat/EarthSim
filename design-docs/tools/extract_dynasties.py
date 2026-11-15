"""Export exact shipped dynasty/people source ranges and finite VM observations."""
from pathlib import Path
import hashlib
import json

ROOT=Path(__file__).resolve().parents[2]
HASH=lambda data: hashlib.sha256(data).hexdigest()


def main():
    report=json.loads((ROOT/'.research/wp-dynasties/probe-results.json').read_text(encoding='utf-8'))
    assert report['failed']==0 and report['passed']==len(report['results'])
    for row in report['sources']:
        assert HASH((ROOT/row['path']).read_bytes())==row['sha256'],row['path']
    rows=[
        ('DYN-01','people',12,80,'All PPL declarations, PEOPLE and DYNASTIES storage.','SRC-086'),
        ('DYN-02','people',88,116,'Clock, finite values, own procedural RNG and world seed.','SRC-086'),
        ('DYN-03','people',121,298,'Eight name styles, compact codes, mod-name retention and all twenty trait rows.','SRC-086'),
        ('DYN-04','people',300,340,'Trait opposition/inheritance, optional extra madness and skill generation.','SRC-086'),
        ('DYN-05','people',375,456,'Person prototype/record, parental links and dynasty creation/live counts.','SRC-086'),
        ('DYN-06','people',474,568,'Derived names/titles, custom names and renaming hooks.','SRC-086'),
        ('DYN-07','people',592,627,'Kin labels and shared-parent/grandparent marriage exclusion.','SRC-086'),
        ('DYN-08','people',629,664,'Age mortality, death bookkeeping, dynasty extinction.','SRC-089'),
        ('DYN-09','people',666,746,'Family ranks, desired births, spouses, child dynasty/name and backdated families.','SRC-086'),
        ('DYN-10','people',748,822,'UID lookup, regnal records, three laws, bounded succession and heir windows.','SRC-087'),
        ('DYN-11','people',824,905,'Ruler/regent modifiers, regent selection and enthronement/numbering.','SRC-087'),
        ('DYN-12','people',907,954,'End of reign and nickname priorities.','SRC-087'),
        ('DYN-13','people',1004,1034,'Refuge, exile, deposition and resulting claims.','SRC-088'),
        ('DYN-14','people',1036,1079,'New adult noble/house, invited prince and succession shocks.','SRC-088'),
        ('DYN-15','people',1081,1133,'Dynastic union eligibility/guard and actual succession after death.','SRC-087'),
        ('DYN-16','people',1136,1184,'Term lengths, leader pools, political descendants and dictator inheritance.','SRC-087'),
        ('DYN-17','people',1188,1241,'Court membership, house heads, 150-year claims, cadets and family move.','SRC-088'),
        ('DYN-18','people',1243,1297,'State birth/restoration/cadet branches and state-death court fates.','SRC-088'),
        ('DYN-19','people',1299,1355,'Government changes and title/election/restoration/new-house handoffs.','SRC-088'),
        ('DYN-20','people',1357,1382,'Peace result updates reigns and resolves a tracked succession war by UID.','SRC-088'),
        ('DYN-21','people',1388,1410,'Death with succession/regency effects and external PEOPLE/NPC kill boundaries.','SRC-088'),
        ('DYN-22','people',1413,1426,'Local disaster threat to the court excludes drought/plague/blizzard.','SRC-089'),
        ('DYN-23','people',1428,1490,'Dynastic marriage matching, usurper fate and optional succession-war declaration.','SRC-088'),
        ('DYN-24','people',1492,1575,'Regent takeover, madness, assassination, usurpation, coups, elections and golden ages.','SRC-089'),
        ('DYN-25','people',1578,1636,'Yearly reverse live walk: mortality/marriage/birth before all state court checks.','SRC-089'),
        ('DYN-26','people',1639,1672,'Protected genealogy pruning, soft cap, overflow horizon and reciprocal link removal.','SRC-089'),
        ('DYN-27','people',1677,1734,'Compact ordinary save schema, trait/skill packing, claims and first-300 NPC death entries.','SRC-091'),
        ('DYN-28','people',1736,1791,'Reset/bootstrap/load and rebuilding links/live traversal/skills.','SRC-091'),
        ('DYN-29','people',1793,1813,'Model statistics and guarded error counter.','SRC-091'),
        ('DYN-30','people',1816,1843,'Government-how fallback and guarded event registrations.','SRC-088'),
        ('DYN-31','people',1851,1893,'Procedural cache identity and all six era profession tables/selection.','SRC-090'),
        ('DYN-32','people',1895,1975,'Deterministic lineage, surnames, births/lifespans and generation reconstruction.','SRC-090'),
        ('DYN-33','people',1977,2012,'Whole-chain LRU eviction, stable procedural keys and resident sampling.','SRC-090'),
        ('DYN-34','people',2017,2112,'Biographies derive stored or procedural family/reign facts.','SRC-090'),
        ('DYN-35','people',2920,2937,'Exact adapter preserves live order, processed years and skill exceptions; public exports.','SRC-091'),
        ('DYN-36','civ',278,327,'Government flags and golden/succession/coup shock changes.','SRC-089'),
        ('DYN-37','civ',907,953,'Golden happiness/science bonus, timer decay and economy consumers.','SRC-089'),
        ('DYN-38','civ',1102,1131,'Golden age decline modifier; full politics already extracted.','SRC-089'),
        ('DYN-39','disasters',310,316,'Player inspiration invokes golden shock separately from natural ruler conditions.','SRC-089'),
        ('DYN-40','menu',10,138,'Ordinary in-memory save/load event order and state persistence.','SRC-091'),
        ('DYN-41','net',202,235,'Exact snapshot layers peopleNet adapter over ordinary reconstruction; no live session.','SRC-091'),
        ('DYN-42','walkact',2975,3002,'Local walk external death handoff; complete walk combat deferred.','SRC-091'),
        ('DYN-43','society',112,192,'Government and stateNew dispatch before people subscribers.','SRC-088'),
        ('DYN-44','civ',755,779,'State death/birth event handoff; full war resolution deferred.','SRC-088'),
        ('DYN-45','index',710,723,'Classic-script ordering of society and people.','SRC-091'),
        ('DYN-46','core',89,114,'Synchronous event dispatch with swallowed-error policy, explicitly checked by probes.','SRC-091'),
        ('DYN-47','people',2115,2277,'Pure genealogy geometry, bounded descendants/ancestors/partners and golden throne links.','SRC-090'),
    ]
    rules=[]
    for rid,name,start,end,summary,sid in rows:
        source=f'EarthSimulator/{name}.html' if name=='index' else f'EarthSimulator/{name}.js'
        raw=(ROOT/source).read_bytes();lines=raw.decode('utf-8-sig').splitlines()
        assert 0<start<=end<=len(lines),(source,start,end,len(lines))
        rules.append({'id':rid,'summary':summary,'source_id':sid,'evidence_type':'static_traced','source':{'path':source,'sha256':HASH(raw),'line':start,'end_line':end,'source_lines':lines[start-1:end]}})
    bundle='.research/rea/wp-dynasties-2026-11-15.evidence.json'
    result={
        'format_version':'1.0.0','work_package_id':'WP-PEOPLE-DYNASTIES','date':'2026-11-15','game_version':'2.1.4','path_base':'repository_root',
        'feature_ids':['FEAT-RULERS-SUCCESSION','FEAT-DYNASTIES','FEAT-CHARACTER-TRAITS','FEAT-COMMONER-FAMILIES','FEAT-COURT-CRISES','FEAT-DYNASTIC-RESTORATION','FEAT-GOLDEN-AGES'],
        'document_ids':['DOC-RULERS','DOC-PEOPLE','DOC-DYNASTIES','DOC-COMMONER-FAMILIES','DOC-DYNASTIES-DATA'],
        'source_ids':[f'SRC-{n:03}' for n in range(86,93)],
        'status':{'declarations':'extracted','static_chains':'traced','isolated_checks':'passed','runtime_observations':'not_performed','runtime_verified':False},
        'scope':{'completed':['person/dynasty records, all 20 traits and names','family/marriage/birth/mortality','three succession laws, regency/elections/numbering','court crises/exile/claims/restoration/dynastic union','natural/player golden ages and shocks','pruning/ordinary persistence/exact people adapter','procedural families/professions/caches/biography/pure tree geometry'],
                 'cross_package_boundaries':['War declaration/peace events read as people handoffs; complete war/peace/battles remain WP-WORLD-WARS-TERRITORY.','Canvas/UI interaction, walk actor simulation, disk persistence and live multiplayer/Steam/mods remain unobserved and outside this package.']},
        'identity':{'source_files':report['sources'],'rea_parent_evidence_id':'ev_1ea564b50385d7bda5e9072a2171528d1caeb982d68a81404146ed2634c4ded7','rea_summary_evidence_id':'ev_e4f8ddf17b6d04cb1022c1c419d997557905accdd056d002849f2afe09ba545c',
                    'rea_artifact_sha256':'681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd','rea_source_selection':['people.js'],'rea_bundle_path':bundle,'rea_bundle_sha256':HASH((ROOT/bundle).read_bytes()),
                    'rea_limits':['1 JavaScript file parsed without failure; 78 inventoried files outside selection.','Application and semantic graphs partial, not truncated; 78 application and 19389 semantic unknowns.','Inert syntax analysis does not establish execution; adjacent modules manually traced and hashed.']},
        'declarations':report['declarations'],'rules':rules,
        'findings':[
            {'id':'MODEL-SEPARATION','evidence':['DYN-01','DYN-25','DYN-31','DYN-32'],'conclusion':'Simulated PEOPLE, computed commoners and W.pop are distinct; NPC generation uses a separate deterministic RNG and does not consume Math.random.'},
            {'id':'TRAIT-FOUR','evidence':['DYN-04'],'conclusion':'Nominal 1-3 trait target is followed by optional madness; a fourth trait is possible, demonstrated by Y05.'},
            {'id':'HEIR-WINDOW','evidence':['DYN-10','DYN-15'],'conclusion':'Heir label checks only four candidates; actual death succession checks fourteen. A fifth candidate can inherit while heirOf returns null.'},
            {'id':'YEAR-GUARD','evidence':['DYN-25'],'conclusion':'Per-person _y prevents duplicate same-year life processing; all state court checks still run on each duplicate yearly call. Y25 is an artificial repeated event, not ordinary scheduler observation.'},
            {'id':'MEMORY-LIMIT','evidence':['DYN-26'],'conclusion':'MAX_PEOPLE is soft for living records; overflow may forget even ancient rulers older than HORIZON. IDs remain holes and are not reused.'},
            {'id':'SAVE-PRECISION','evidence':['DYN-27','DYN-28','DYN-35','DYN-41'],'conclusion':'Ordinary save reconstructs live order and processed years and assumes base-11 integer skills. Exact adapter restores traversal/year/average and fractional/out-of-range/null skill exceptions.'},
            {'id':'NPC-DEATH-MEMORY','evidence':['DYN-27','DYN-33'],'conclusion':'NPC cache IDs are transient; kill records key by cell/slot/generation/role. Ordinary save keeps first 300 inserted death records, not an unlimited or newest-only set.'},
            {'id':'DYNASTIC-UNION','evidence':['DYN-15','DYN-16'],'conclusion':'Dynastic union merges crowns without political federation. A dictator inheriting a son can create a family dynasty while government and st.dynasty remain nonhereditary.'},
        ],
        'verification':{'command':'node design-docs/tools/probe_dynasties.cjs','report_path':'.research/wp-dynasties/probe-results.json','test_copy_path':'.research/wp-dynasties/test-copy/EarthSimulator','checks':report['results'],
                        'probe_script_sha256':HASH((ROOT/'design-docs/tools/probe_dynasties.cjs').read_bytes()),'environment':report['environment'],'runtime_verified':False},
        'limitations':['63 finite synthetic VM cases are not full-game runtime verification or long stochastic-family observation.','Full people.js loads with CSS font and translation stubs; a VM-only lexical exposure object grants access to unchanged private functions/containers. Immutable source copies are byte-identical.','Small memory/cache caps and repeated-year input are explicitly artificial boundary fixtures. Biographies and tree geometry execute without DOM/canvas rendering.','Precise people adapter is tested in memory; no real transport, peer, disk save, old user save, Steam or active mod was used.'],
        'next_package':'WP-TRADE-NAVIGATION',
    }
    target=ROOT/'design-docs/research/extraction-dynasties.json'
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Wrote {target.relative_to(ROOT)}: {len(rules)} source ranges, {report["passed"]} passed probes.')


if __name__=='__main__':
    main()
