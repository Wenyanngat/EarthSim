"""Build traceable fauna declarations, source excerpts and isolated-check results."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'design-docs/research/extraction-fauna.json'
REPORT = ROOT / '.research/wp-fauna/probe-results.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def source(path, start, end):
    data = (ROOT / path).read_bytes()
    lines = data.decode('utf-8-sig').splitlines()
    assert 0 < start <= end <= len(lines), (path, start, end)
    return {'path': path, 'sha256': sha(data), 'line': start, 'end_line': end,
            'source_lines': lines[start - 1:end]}


def main():
    report = json.loads(REPORT.read_text(encoding='utf-8'))
    assert report['failed'] == 0 and report['passed'] == len(report['results'])
    for row in report['sources']:
        assert sha((ROOT / row['path']).read_bytes()) == row['sha256'], row['path']
    declarations = report['declarations']
    assert len(declarations['species']) == 35
    rules = []

    def add(rid, summary, path, start, end, source_id):
        rules.append({'id': rid, 'summary': summary, 'source_id': source_id,
                      'evidence_type': 'static_traced', 'source': source(path, start, end)})

    add('ENV-01', 'Typed environment fields; default smoothed temperature 15 C and precipitation 800 mm/year.', 'EarthSimulator/core.js', 28, 113, 'SRC-062')
    add('ENV-02', 'Climate warmup initializes smoothed climate; generated-world ecology establishes vegetation and fertility before worldgen event.', 'EarthSimulator/core.js', 1006, 1027, 'SRC-062')
    add('ENV-03', 'Worldgen temperature seeding, climate warmup, direct biome classification, NPP/vegetation/fertility initialization and event order.', 'EarthSimulator/core.js', 1161, 1184, 'SRC-062')
    add('ENV-04', 'Water if elev<seaLevel; depth=(seaLevel-elev)/seaLevel*4000; coast from adjacent water/land.', 'EarthSimulator/core.js', 1219, 1238, 'SRC-062')
    add('ENV-05', 'Smoothed temperature and annual precipitation relax with coefficient 0.012 after actual climate updates.', 'EarthSimulator/climate.js', 304, 312, 'SRC-062')
    add('ENV-06', 'Miami NPP, heat cutoff and fertility from biome, smoothed climate, river, slope, ecology, pollution and fallout.', 'EarthSimulator/ecology.js', 85, 108, 'SRC-062')
    add('ENV-07', 'Four interleaved ecology stripes; relaxation compensation 1-(1-rate)^K; immediate land/water biome change; one faunaStep per call.', 'EarthSimulator/ecology.js', 220, 284, 'SRC-062')
    fauna = [
        ('FAU-01',49,257,'Declarations: all FAU parameters and 35 species; values are base defaults, mods may override.','SRC-063'),
        ('FAU-02',271,347,'Two state layers: three cell density arrays; species abundance by at most 32 realms; birds have no density field.','SRC-063'),
        ('FAU-03',369,411,'Species temperature fitness falls linearly to zero across 4 C outside range; NH=biomes+12 sea habitats.','SRC-063'),
        ('FAU-04',419,643,'Realm allocation/remapping; oceans by hemisphere, land BFS, Earth geography, four-neighbor adjacency.','SRC-064'),
        ('FAU-05',645,795,'Cell capacities, hunting/farming/urbanization, pollution/fire/fallout, predator-prey, in-place diffusion, sea-only auto floor.','SRC-063'),
        ('FAU-06',797,920,'Published full-pass accumulators, guild occupancy 1-exp(-1.6*den), mass and area-normalized population estimate.','SRC-063'),
        ('FAU-07',933,1071,'Annual abundance and causes, early resettlement, rarity, low counter, grace and at most one normal extinction per calendar year.','SRC-063'),
        ('FAU-08',1102,1248,'Natural adjacent-realm spread persists with auto off; automatic arrivals require auto and do not revive ever-extinct species.','SRC-064'),
        ('FAU-09',1254,1370,'Domestic bit masks, local wild stock, neighbor/global adoption, own taming, herds, feral abundance and inheritance.','SRC-064'),
        ('FAU-10',1377,1510,'Deterministic initial assignment, empty richness -1, early resettling and special silent history reconstruction.','SRC-064'),
        ('FAU-11',1514,1550,'Cell stripes, independent ++tick%60==30 annual phase A then B next step; per-state domestic rotation.','SRC-064'),
        ('FAU-12',1553,1695,'Food bonus, visible species shares and deterministic herd sampling; graphic herd count is not FAUNA.pop.','SRC-065'),
        ('FAU-13',1703,1757,'Mod species validation, limits and derived habitat weights; registering species does not itself populate the world.','SRC-065'),
        ('FAU-14',1759,1836,'Hunt/seed API units switch at amount>=1; explicit seeding checks medium but not climate; species statistics.','SRC-065'),
        ('FAU-15',1872,1918,'Tooltip/layer and reset: densities persist while domestic history and selected intro bits reset.','SRC-065'),
        ('FAU-16',1920,2030,'Save v1, species keys/domKeys remapping, abundance precision, fallback; transient yearB/rareY/row are not restored exactly.','SRC-065'),
    ]
    for rid, start, end, summary, sid in fauna:
        add(rid, summary, 'EarthSimulator/fauna.js', start, end, sid)
    callers = [
        ('INT-01','EarthSimulator/civ.js',589,615,'Food and domestic herds multiply capacity; demographic algorithm is a later package.'),
        ('INT-02','EarthSimulator/civ.js',958,958,'Horses multiply peaceful expansion accumulation by 1.2.'),
        ('INT-03','EarthSimulator/civ.js',1137,1137,'Horses multiply military strength by 1.1 in the applicable eras.'),
        ('INT-04','EarthSimulator/trade.js',263,264,'Wild herbivore density affects hide/livestock export weights.'),
        ('INT-05','EarthSimulator/trade.js',664,681,'Domestic species affect caravan carrier choice.'),
        ('INT-06','EarthSimulator/walkact.js',3100,3120,'Player animal kills call global hunt even for tame/mod herd; butchering heals locally.'),
        ('INT-07','EarthSimulator/menu.js',78,105,'Ordinary serialization stores W densities and scalars; extension save/load hooks follow.'),
        ('INT-08','EarthSimulator/net.js',149,164,'Exact network snapshot contains fauna internals; this does not verify network consistency.'),
        ('INT-09','EarthSimulator/net.js',275,277,'wkHunt validates cell/key then hunts one head.'),
        ('INT-10','EarthSimulator/ui.js',623,623,'Animal brush dispatches hunt/seed with brush-scaled amount.'),
        ('INT-11','EarthSimulator/mods.js',1443,1505,'Data-mod species normalization and registration.'),
        ('INT-12','EarthSimulator/world3d.js',5293,5398,'3D rendering consumes sampled herds under detail and per-herd display caps.'),
    ]
    for rid, path, start, end, summary in callers:
        add(rid, summary, path, start, end, 'SRC-065')
    bundle = '.research/rea/wp-fauna-2026-11-14.evidence.json'
    result = {
        'format_version':'1.0.0', 'work_package_id':'WP-FAUNA', 'date':'2026-11-15',
        'game_version':'2.1.4', 'path_base':'repository_root',
        'feature_ids':['FEAT-FAUNA','FEAT-ANIMAL-POPULATIONS','FEAT-ANIMAL-BIOGEOGRAPHY','FEAT-ANIMAL-CONSERVATION','FEAT-DOMESTICATION'],
        'document_ids':['DOC-FAUNA','DOC-FAUNA-DATA'],
        'source_ids':['SRC-062','SRC-063','SRC-064','SRC-065','SRC-066'],
        'status':{'declarations':'extracted','static_chains':'traced','isolated_checks':'passed','runtime_observations':'not_performed','runtime_verified':False},
        'scope':{'primary_package':'WP-FAUNA','required_pre_read':'WP-WORLD-NATURE environment inputs only',
                 'deferred':['Full WP-WORLD-NATURE','Full demography/economy/politics/trade/wars/walk/modding/network/storage algorithms','Full-game runtime observations']},
        'identity':{'source_files':report['sources'],'rea_artifact_sha256':'681198ab2ecff4e60f72f69fdc9a37b496638215b61122491ece53ba5929b7cd',
                    'rea_parent_evidence_id':'ev_0ac4c15c523528f9e5fc195e7647d635743b84f0db2af8c3d628c3909a08fa12',
                    'rea_summary_evidence_id':'ev_ff13d7452c7dd779e41ccd852a19b5323cd1b90a0647a6699e3898be12e17246',
                    'rea_bundle_path':bundle,'rea_bundle_sha256':sha((ROOT/bundle).read_bytes()),
                    'rea_source_selection':['fauna.js','ecology.js'],
                    'rea_limits':['77 inventoried files outside selected analysis','semantic graph partial: 20000 per-file retention ceiling','77 application unknowns, 8428 semantic unknowns; no runtime execution']},
        'environment_inputs':[
            {'field':'W.biome','type':'Uint8Array','producer':'classifyBiome/ecologyStep','cadence':'4 interleaved stripes; K compensation; direct generation initialization'},
            {'field':'W.tempSmoothed','type':'Float32Array','unit':'C','producer':'climateStep','cadence':'every climate step, +=0.012*(temp-smoothed); warmup writes initial mean'},
            {'field':'W.precipSmoothed','type':'Float32Array','unit':'mm/year','producer':'climateStep','cadence':'every climate step, +=0.012*(precip-smoothed); fauna consumes through biome/vegetation'},
            {'field':'W.isWater/W.seaDepth/W.isCoast','producer':'recomputeStatic','cadence':'world generation and terrain/sea edits'},
            {'field':'W.veg/W.eco','producer':'ecologyStep','cadence':'4 stripes after climate; used directly by fauna'},
            {'field':'W.fertility','producer':'computeFertility/ecologyStep','cadence':'4 stripes; direct initialization during worldgen; demographic input, not read directly by fauna'},
            {'field':'W.pollution/W.fallout/W.fire/W.iceAlbedo','producer':'local environment/disaster state','cadence':'fauna reads current arrays; full producer algorithms deferred'},
        ],
        'declarations':declarations,'rules':rules,
        'verification':{'command':'node design-docs/tools/probe_fauna.cjs','report_path':'.research/wp-fauna/probe-results.json',
                        'test_copy_path':'.research/wp-fauna/test-copy/EarthSimulator','checks':report['results'],
                        'probe_script_sha256':sha((ROOT/'design-docs/tools/probe_fauna.cjs').read_bytes()),'environment':report['environment'],'runtime_verified':False},
        'limitations':['Static tracing and isolated VM probes are distinct from full-game runtime observations.',
                       'VM uses actual core/climate/ecology/fauna from hash-checked copies; translation, logs and performance time are stubs; selected contract probes replace callees to observe scheduling.',
                       'Numerical checks cover declared cases, not exhaustive stochastic trajectories, performance, graphics, network or mod combinations.',
                       'Explicit seeding accepts unsuitable climate; later survival is separate. Birds lack a local density field.',
                       'Ordinary load is not an exact continuation: pending annual B and rare-message year are reset.',
                       'Game files and user saves were not changed.'],
        'next_package':'WP-DEMOGRAPHY-CITIES',
    }
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Wrote {OUT.relative_to(ROOT)}: {len(rules)} traced source ranges, 35 species, {report["passed"]} passed probes.')


if __name__ == '__main__':
    main()
