"""Check full-game extraction scope, module identity and planning coverage."""
from pathlib import Path
import hashlib
import json
import os
import sys

ROOT = Path(__file__).resolve().parents[2]
REFERENCE_ROOT = Path(os.environ.get("EARTHSIM_REFERENCE_ROOT") or ROOT).resolve()
EVIDENCE_ROOT = Path(os.environ.get("EARTHSIM_EVIDENCE_ROOT") or REFERENCE_ROOT).resolve()


def require(test, message):
    if not test:
        raise ValueError(message)


def safe_file(relative):
    parts = Path(relative).parts
    roots = {'EarthSimulator': REFERENCE_ROOT, '.research': EVIDENCE_ROOT}
    root = roots.get(parts[0], ROOT) if parts else ROOT
    path = (root / relative).resolve()
    require(path.is_relative_to(root) and path.is_file(), f'Missing/unsafe file: {relative}')
    return path


def index(rows, key):
    result = {r[key]: r for r in rows}
    require(len(result) == len(rows), f'Duplicate {key}')
    return result


def validate_baseline(package, catalog):
    """Accept extracted status only with traceable bytes and successful code probes."""
    require(package['id'] == 'WP-BASELINE', 'Only baseline has an extracted result in this pass')
    result_path = ROOT / 'design-docs/research/extraction-baseline.json'
    result = json.loads(result_path.read_text(encoding='utf-8'))
    require(result['work_package_id'] == package['id'], 'Baseline package mismatch')
    require(result['status']['runtime_verified'] is False, 'VM probes are not game runtime observations')
    evidence = package['verification']
    require(evidence['runtime_verified'] is False, 'Package has no game runtime evidence')
    require(set(result['source_ids']) == set(evidence['source_ids']), 'Baseline source registry mismatch')
    require(set(result['feature_ids']) == set(package['feature_ids']), 'Baseline feature mismatch')
    require(set(result['document_ids']) <= {d['id'] for d in catalog['documents']}, 'Baseline document missing')

    for source in result['identity']['source_files']:
        data = safe_file(source['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == source['sha256'], f'Baseline source changed: {source["path"]}')
        require(len(data) == source['bytes'], f'Baseline source size changed: {source["path"]}')
    safe_file(result['identity']['rea_bundle_path'])
    report = json.loads(safe_file(result['verification']['report_path']).read_text(encoding='utf-8'))
    checks = report['results']
    require(checks and len({x['id'] for x in checks}) == len(checks), 'Missing/duplicate baseline checks')
    require(all(x['status'] == 'passed' for x in checks), 'Baseline probe failure')
    require(report['runtime_verified'] is False, 'Probe report incorrectly claims game runtime verification')
    require(report['passed'] == len(checks) and report['failed'] == 0, 'Incorrect baseline check counts')
    require(result['verification']['checks'] == checks, 'Baseline result uses stale probe values')
    require(evidence['isolated_checks']['passed'] == len(checks), 'Package probe count mismatch')
    for source in report['sources']:
        original = safe_file(source['path']).read_bytes()
        copied = safe_file(result['verification']['test_copy_path'] + '/' + Path(source['path']).name).read_bytes()
        require(hashlib.sha256(original).hexdigest() == source['sha256'], 'Probe original source changed')
        require(original == copied, 'Probe copy differs from original source')
    fields = result['state_contract']['fields_after_core_initialization']
    require(fields == report['declared_W_fields'], 'Baseline W contract differs from probe')
    require(len({f['name'] for f in fields}) == len(fields) == result['state_contract']['field_count'], 'Invalid W field count')
    require(sum('length' in f for f in fields) == result['state_contract']['typed_arrays'], 'Invalid W array count')
    require(sum(f.get('bytes_per_cell', 0) for f in fields) == result['state_contract']['typed_array_bytes_per_cell'], 'Invalid W memory count')
    for rule in result['rules']:
        source = rule['source']
        path = safe_file(source['path'])
        require(hashlib.sha256(path.read_bytes()).hexdigest() == source['sha256'], f'Rule source changed: {rule["id"]}')
        lines = path.read_text(encoding='utf-8-sig').splitlines()
        start, end = source['line'] - 1, source['end_line']
        require(0 <= start < end <= len(lines), f'Invalid rule range: {rule["id"]}')
        require(lines[start:end] == rule['source_lines'], f'Rule excerpt changed: {rule["id"]}')


def validate_fauna(package, catalog):
    """Reject stale fauna evidence, copied sources, declarations or numerical reports."""
    result = json.loads(safe_file('design-docs/research/extraction-fauna.json').read_text(encoding='utf-8'))
    require(result['work_package_id'] == package['id'] == 'WP-FAUNA', 'Fauna package mismatch')
    require(result['status']['runtime_verified'] is False, 'Fauna probes are not game runtime observations')
    verification = package['verification']
    require(verification['runtime_verified'] is False, 'Fauna package incorrectly claims runtime evidence')
    require(set(result['feature_ids']) == set(package['feature_ids']), 'Fauna feature scope mismatch')
    require(set(result['source_ids']) == set(verification['source_ids']), 'Fauna SRC mismatch')
    require(set(result['document_ids']) <= {d['id'] for d in catalog['documents']}, 'Fauna document missing')
    for row in result['identity']['source_files']:
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'] and len(data) == row['bytes'], f'Fauna source changed: {row["path"]}')
    bundle = safe_file(result['identity']['rea_bundle_path']).read_bytes()
    require(hashlib.sha256(bundle).hexdigest() == result['identity']['rea_bundle_sha256'], 'Fauna REA bundle changed')
    report = json.loads(safe_file(result['verification']['report_path']).read_text(encoding='utf-8'))
    checks = report['results']
    require(checks and len({x['id'] for x in checks}) == len(checks), 'Missing/duplicate fauna probes')
    require(report['passed'] == len(checks) and report['failed'] == 0 and all(x['status'] == 'passed' for x in checks), 'Fauna probe failure/count mismatch')
    require(report['runtime_verified'] is False, 'Fauna probe report claims game runtime verification')
    require(result['verification']['checks'] == checks, 'Stale fauna probe results')
    require(verification['isolated_checks']['passed'] == len(checks), 'Fauna package probe count mismatch')
    require(report['sources'] == result['identity']['source_files'], 'Fauna probe source manifest differs')
    require(result['declarations'] == report['declarations'], 'Stale fauna declarations')
    require(len(result['declarations']['species']) == 35, 'Unexpected base species count; review extraction')
    require(len(result['declarations']['domestic_keys']) == 8, 'Unexpected domestic species count')
    script = safe_file('design-docs/tools/probe_fauna.cjs').read_bytes()
    require(hashlib.sha256(script).hexdigest() == result['verification']['probe_script_sha256'], 'Fauna probe script changed after extraction')
    for row in report['sources']:
        copied = safe_file(result['verification']['test_copy_path'] + '/' + Path(row['path']).name).read_bytes()
        require(copied == safe_file(row['path']).read_bytes(), f'Fauna test copy drift: {row["path"]}')
    require(result['rules'] and len({r['id'] for r in result['rules']}) == len(result['rules']), 'Fauna rules missing/duplicated')
    for rule in result['rules']:
        row = rule['source']
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'], f'Fauna rule source changed: {rule["id"]}')
        lines = data.decode('utf-8-sig').splitlines()
        start, end = row['line'] - 1, row['end_line']
        require(0 <= start < end <= len(lines), f'Invalid fauna source range: {rule["id"]}')
        require(lines[start:end] == row['source_lines'], f'Fauna rule excerpt changed: {rule["id"]}')


def validate_demography(package, catalog):
    """Check the demography extraction against its exact shipped bytes and finite probes."""
    result = json.loads(safe_file('design-docs/research/extraction-demography.json').read_text(encoding='utf-8'))
    require(result['work_package_id'] == package['id'] == 'WP-DEMOGRAPHY-CITIES', 'Demography package mismatch')
    require(result['status']['runtime_verified'] is False and package['verification']['runtime_verified'] is False, 'Demography VM checks do not verify game runtime')
    require(set(result['feature_ids']) == set(package['feature_ids']), 'Demography feature scope mismatch')
    require(set(result['source_ids']) == set(package['verification']['source_ids']), 'Demography source registry mismatch')
    require(set(result['document_ids']) <= {d['id'] for d in catalog['documents']}, 'Demography document missing')
    for row in result['identity']['source_files']:
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'] and len(data) == row['bytes'], f'Demography source changed: {row["path"]}')
        copied = safe_file(result['verification']['test_copy_path'] + '/' + Path(row['path']).name).read_bytes()
        require(copied == data, f'Demography test copy changed: {row["path"]}')
    bundle = safe_file(result['identity']['rea_bundle_path']).read_bytes()
    require(hashlib.sha256(bundle).hexdigest() == result['identity']['rea_bundle_sha256'], 'Demography REA bundle changed')
    report = json.loads(safe_file(result['verification']['report_path']).read_text(encoding='utf-8'))
    checks = report['results']
    require(checks and len({r['id'] for r in checks}) == len(checks), 'Missing/duplicate demography checks')
    require(report['passed'] == len(checks) and report['failed'] == 0 and all(r['status'] == 'passed' for r in checks), 'Demography probe failure/count mismatch')
    require(report['work_package_id'] == package['id'] and report['runtime_verified'] is False, 'Demography report identity/runtime mismatch')
    require(result['verification']['checks'] == checks and result['declarations'] == report['declarations'], 'Stale demography checks/declarations')
    require(result['identity']['source_files'] == report['sources'], 'Demography source manifest differs from report')
    require(package['verification']['isolated_checks']['passed'] == len(checks), 'Demography package probe count mismatch')
    script = safe_file('design-docs/tools/probe_demography.cjs').read_bytes()
    require(hashlib.sha256(script).hexdigest() == result['verification']['probe_script_sha256'], 'Demography probe script changed')
    require(result['rules'] and len({r['id'] for r in result['rules']}) == len(result['rules']), 'Missing/duplicate demography rules')
    for rule in result['rules']:
        row = rule['source']
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'], f'Demography rule source changed: {rule["id"]}')
        lines = data.decode('utf-8-sig').splitlines()
        start, end = row['line'] - 1, row['end_line']
        require(0 <= start < end <= len(lines), f'Invalid demography rule range: {rule["id"]}')
        require(lines[start:end] == row['source_lines'], f'Demography rule excerpt changed: {rule["id"]}')
        require(rule['source_id'] in result['source_ids'], f'Unregistered demography rule source: {rule["id"]}')


def validate_economy(package, catalog):
    """Verify economy source bytes, immutable copies, excerpts and finite probe records."""
    result = json.loads(safe_file('design-docs/research/extraction-economy.json').read_text(encoding='utf-8'))
    require(result['work_package_id'] == package['id'] == 'WP-ECONOMY-TECH', 'Economy package mismatch')
    require(result['status']['runtime_verified'] is False and package['verification']['runtime_verified'] is False, 'Economy VM checks do not verify game runtime')
    require(set(result['feature_ids']) == set(package['feature_ids']), 'Economy feature scope mismatch')
    require(set(result['source_ids']) == set(package['verification']['source_ids']), 'Economy source registry mismatch')
    require(set(result['document_ids']) <= {d['id'] for d in catalog['documents']}, 'Economy document missing')
    for row in result['identity']['source_files']:
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'] and len(data) == row['bytes'], f'Economy source changed: {row["path"]}')
        copied = safe_file(result['verification']['test_copy_path'] + '/' + Path(row['path']).name).read_bytes()
        require(copied == data, f'Economy test copy changed: {row["path"]}')
    bundle = safe_file(result['identity']['rea_bundle_path']).read_bytes()
    require(hashlib.sha256(bundle).hexdigest() == result['identity']['rea_bundle_sha256'], 'Economy REA bundle changed')
    report = json.loads(safe_file(result['verification']['report_path']).read_text(encoding='utf-8'))
    checks = report['results']
    require(checks and len({r['id'] for r in checks}) == len(checks), 'Missing/duplicate economy checks')
    require(report['passed'] == len(checks) and report['failed'] == 0 and all(r['status'] == 'passed' for r in checks), 'Economy probe failure/count mismatch')
    require(report['work_package_id'] == package['id'] and report['runtime_verified'] is False, 'Economy report identity/runtime mismatch')
    require(result['verification']['checks'] == checks and result['declarations'] == report['declarations'], 'Stale economy checks/declarations')
    require(result['identity']['source_files'] == report['sources'], 'Economy source manifest differs from report')
    require(package['verification']['isolated_checks']['passed'] == len(checks), 'Economy package probe count mismatch')
    script = safe_file('design-docs/tools/probe_economy.cjs').read_bytes()
    require(hashlib.sha256(script).hexdigest() == result['verification']['probe_script_sha256'], 'Economy probe script changed')
    require(len(result['declarations']['INVENTIONS']) == 58, 'Base invention table mismatch')
    require(result['rules'] and len({r['id'] for r in result['rules']}) == len(result['rules']), 'Missing/duplicate economy rules')
    for rule in result['rules']:
        row = rule['source']
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'], f'Economy rule source changed: {rule["id"]}')
        lines = data.decode('utf-8-sig').splitlines()
        start, end = row['line'] - 1, row['end_line']
        require(0 <= start < end <= len(lines), f'Invalid economy rule range: {rule["id"]}')
        require(lines[start:end] == row['source_lines'], f'Economy rule excerpt changed: {rule["id"]}')
        require(rule['source_id'] in result['source_ids'], f'Unregistered economy rule source: {rule["id"]}')


def validate_politics(package, catalog):
    """Verify political/society source bytes, immutable copies, excerpts and finite probes."""
    result = json.loads(safe_file('design-docs/research/extraction-politics.json').read_text(encoding='utf-8'))
    require(result['work_package_id'] == package['id'] == 'WP-POLITICS-SOCIETY', 'Politics package mismatch')
    require(result['status']['runtime_verified'] is False and package['verification']['runtime_verified'] is False, 'Politics VM checks do not verify game runtime')
    require(set(result['feature_ids']) == set(package['feature_ids']), 'Politics feature scope mismatch')
    require(set(result['source_ids']) == set(package['verification']['source_ids']), 'Politics source registry mismatch')
    require(set(result['document_ids']) <= {d['id'] for d in catalog['documents']}, 'Politics document missing')
    for row in result['identity']['source_files']:
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'] and len(data) == row['bytes'], f'Politics source changed: {row["path"]}')
        copied = safe_file(result['verification']['test_copy_path'] + '/' + Path(row['path']).name).read_bytes()
        require(copied == data, f'Politics test copy changed: {row["path"]}')
    bundle = safe_file(result['identity']['rea_bundle_path']).read_bytes()
    require(hashlib.sha256(bundle).hexdigest() == result['identity']['rea_bundle_sha256'], 'Politics REA bundle changed')
    report = json.loads(safe_file(result['verification']['report_path']).read_text(encoding='utf-8'))
    checks = report['results']
    require(checks and len({r['id'] for r in checks}) == len(checks), 'Missing/duplicate politics checks')
    require(report['passed'] == len(checks) and report['failed'] == 0 and all(r['status'] == 'passed' for r in checks), 'Politics probe failure/count mismatch')
    require(report['work_package_id'] == package['id'] and report['runtime_verified'] is False, 'Politics report identity/runtime mismatch')
    require(result['verification']['checks'] == checks and result['declarations'] == report['declarations'], 'Stale politics checks/declarations')
    require(result['identity']['source_files'] == report['sources'], 'Politics source manifest differs from report')
    require(package['verification']['isolated_checks']['passed'] == len(checks), 'Politics package probe count mismatch')
    script = safe_file('design-docs/tools/probe_politics.cjs').read_bytes()
    require(hashlib.sha256(script).hexdigest() == result['verification']['probe_script_sha256'], 'Politics probe script changed')
    require(result['rules'] and len({r['id'] for r in result['rules']}) == len(result['rules']), 'Missing/duplicate politics rules')
    for rule in result['rules']:
        row = rule['source']
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'], f'Politics rule source changed: {rule["id"]}')
        lines = data.decode('utf-8-sig').splitlines()
        start, end = row['line'] - 1, row['end_line']
        require(0 <= start < end <= len(lines), f'Invalid politics rule range: {rule["id"]}')
        require(lines[start:end] == row['source_lines'], f'Politics rule excerpt changed: {rule["id"]}')
        require(rule['source_id'] in result['source_ids'], f'Unregistered politics rule source: {rule["id"]}')



def validate_dynasties(package, catalog):
    """Verify dynasty source bytes, immutable copies, excerpts and finite probes."""
    result = json.loads(safe_file('design-docs/research/extraction-dynasties.json').read_text(encoding='utf-8'))
    require(result['work_package_id'] == package['id'] == 'WP-PEOPLE-DYNASTIES', 'Dynasties package mismatch')
    require(result['status']['runtime_verified'] is False and package['verification']['runtime_verified'] is False, 'Dynasties VM checks do not verify game runtime')
    require(set(result['feature_ids']) == set(package['feature_ids']), 'Dynasties feature scope mismatch')
    require(set(result['source_ids']) == set(package['verification']['source_ids']), 'Dynasties source registry mismatch')
    require(set(result['document_ids']) <= {d['id'] for d in catalog['documents']}, 'Dynasties document missing')
    for row in result['identity']['source_files']:
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'] and len(data) == row['bytes'], f'Dynasties source changed: {row["path"]}')
        copied = safe_file(result['verification']['test_copy_path'] + '/' + Path(row['path']).name).read_bytes()
        require(copied == data, f'Dynasties test copy changed: {row["path"]}')
    bundle = safe_file(result['identity']['rea_bundle_path']).read_bytes()
    require(hashlib.sha256(bundle).hexdigest() == result['identity']['rea_bundle_sha256'], 'Dynasties REA bundle changed')
    report = json.loads(safe_file(result['verification']['report_path']).read_text(encoding='utf-8'))
    checks = report['results']
    require(checks and len({r['id'] for r in checks}) == len(checks), 'Missing/duplicate dynasties checks')
    require(report['passed'] == len(checks) and report['failed'] == 0 and all(r['status'] == 'passed' for r in checks), 'Dynasties probe failure/count mismatch')
    require(report['work_package_id'] == package['id'] and report['runtime_verified'] is False, 'Dynasties report identity/runtime mismatch')
    require(result['verification']['checks'] == checks and result['declarations'] == report['declarations'], 'Stale dynasties checks/declarations')
    require(result['identity']['source_files'] == report['sources'], 'Dynasties source manifest differs from report')
    require(package['verification']['isolated_checks']['passed'] == len(checks), 'Dynasties package probe count mismatch')
    script = safe_file('design-docs/tools/probe_dynasties.cjs').read_bytes()
    require(hashlib.sha256(script).hexdigest() == result['verification']['probe_script_sha256'], 'Dynasties probe script changed')
    require(result['rules'] and len({r['id'] for r in result['rules']}) == len(result['rules']), 'Missing/duplicate dynasties rules')
    for rule in result['rules']:
        row = rule['source']
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'], f'Dynasties rule source changed: {rule["id"]}')
        lines = data.decode('utf-8-sig').splitlines()
        start, end = row['line'] - 1, row['end_line']
        require(0 <= start < end <= len(lines), f'Invalid dynasties rule range: {rule["id"]}')
        require(lines[start:end] == row['source_lines'], f'Dynasties rule excerpt changed: {rule["id"]}')
        require(rule['source_id'] in result['source_ids'], f'Unregistered dynasties rule source: {rule["id"]}')



def validate_trade(package, catalog):
    """Verify trade source bytes, immutable copies, excerpts and finite probes."""
    result = json.loads(safe_file('design-docs/research/extraction-trade.json').read_text(encoding='utf-8'))
    require(result['work_package_id'] == package['id'] == 'WP-TRADE-NAVIGATION', 'Trade package mismatch')
    require(result['status']['runtime_verified'] is False and package['verification']['runtime_verified'] is False, 'Trade VM checks do not verify game runtime')
    require(set(result['feature_ids']) == set(package['feature_ids']), 'Trade feature scope mismatch')
    require(set(result['source_ids']) == set(package['verification']['source_ids']), 'Trade source registry mismatch')
    require(set(result['document_ids']) <= {d['id'] for d in catalog['documents']}, 'Trade document missing')
    for row in result['identity']['source_files']:
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'] and len(data) == row['bytes'], f'Trade source changed: {row["path"]}')
        copied = safe_file(result['verification']['test_copy_path'] + '/' + Path(row['path']).name).read_bytes()
        require(copied == data, f'Trade test copy changed: {row["path"]}')
    bundle = safe_file(result['identity']['rea_bundle_path']).read_bytes()
    require(hashlib.sha256(bundle).hexdigest() == result['identity']['rea_bundle_sha256'], 'Trade REA bundle changed')
    report = json.loads(safe_file(result['verification']['report_path']).read_text(encoding='utf-8'))
    checks = report['results']
    require(checks and len({r['id'] for r in checks}) == len(checks), 'Missing/duplicate trade checks')
    require(report['passed'] == len(checks) and report['failed'] == 0 and all(r['status'] == 'passed' for r in checks), 'Trade probe failure/count mismatch')
    require(report['work_package_id'] == package['id'] and report['runtime_verified'] is False, 'Trade report identity/runtime mismatch')
    require(result['verification']['checks'] == checks and result['declarations'] == report['declarations'], 'Stale trade checks/declarations')
    require(result['identity']['source_files'] == report['sources'], 'Trade source manifest differs from report')
    require(package['verification']['isolated_checks']['passed'] == len(checks), 'Trade package probe count mismatch')
    script = safe_file('design-docs/tools/probe_trade.cjs').read_bytes()
    require(hashlib.sha256(script).hexdigest() == result['verification']['probe_script_sha256'], 'Trade probe script changed')
    require(result['rules'] and len({r['id'] for r in result['rules']}) == len(result['rules']), 'Missing/duplicate trade rules')
    for rule in result['rules']:
        row = rule['source']
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'], f'Trade rule source changed: {rule["id"]}')
        lines = data.decode('utf-8-sig').splitlines()
        start, end = row['line'] - 1, row['end_line']
        require(0 <= start < end <= len(lines), f'Invalid trade rule range: {rule["id"]}')
        require(lines[start:end] == row['source_lines'], f'Trade rule excerpt changed: {rule["id"]}')
        require(rule['source_id'] in result['source_ids'], f'Unregistered trade rule source: {rule["id"]}')



def validate_source_extraction(package, catalog, slug):
    """Verify source bytes, immutable copies, excerpts and finite probes."""
    label = package['id']

    result = json.loads(safe_file(f'design-docs/research/extraction-{slug}.json').read_text(encoding='utf-8'))
    require(result['work_package_id'] == label, f'{label}: package mismatch')
    require(result['status']['runtime_verified'] is False and package['verification']['runtime_verified'] is False, f'{label}: VM checks do not verify game runtime')
    require(set(result['feature_ids']) == set(package['feature_ids']), f'{label}: feature scope mismatch')
    require(set(result['source_ids']) == set(package['verification']['source_ids']), f'{label}: source registry mismatch')
    require(set(result['document_ids']) <= {d['id'] for d in catalog['documents']}, f'{label}: document missing')
    for row in result['identity']['source_files']:
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'] and len(data) == row['bytes'], f'{label}: source changed: {row["path"]}')
        copied = safe_file(result['verification']['test_copy_path'] + '/' + Path(row['path']).name).read_bytes()
        require(copied == data, f'{label}: test copy changed: {row["path"]}')
    bundle = safe_file(result['identity']['rea_bundle_path']).read_bytes()
    require(hashlib.sha256(bundle).hexdigest() == result['identity']['rea_bundle_sha256'], f'{label}: REA bundle changed')
    report = json.loads(safe_file(result['verification']['report_path']).read_text(encoding='utf-8'))
    checks = report['results']
    require(checks and len({r['id'] for r in checks}) == len(checks), f'{label}: missing/duplicate checks')
    require(report['passed'] == len(checks) and report['failed'] == 0 and all(r['status'] == 'passed' for r in checks), f'{label}: probe failure/count mismatch')
    require(report['work_package_id'] == label and report['runtime_verified'] is False, f'{label}: report identity/runtime mismatch')
    require(result['verification']['checks'] == checks and result['declarations'] == report['declarations'], f'{label}: stale checks/declarations')
    require(result['identity']['source_files'] == report['sources'], f'{label}: source manifest differs from report')
    require(package['verification']['isolated_checks']['passed'] == len(checks), f'{label}: package probe count mismatch')
    probe_name = slug.replace('-', '_')
    script = safe_file(f'design-docs/tools/probe_{probe_name}.cjs').read_bytes()
    require(hashlib.sha256(script).hexdigest() == result['verification']['probe_script_sha256'], f'{label}: probe script changed')
    require(result['rules'] and len({r['id'] for r in result['rules']}) == len(result['rules']), f'{label}: missing/duplicate rules')
    for rule in result['rules']:
        row = rule['source']
        data = safe_file(row['path']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row['sha256'], f'{label}: rule source changed: {rule["id"]}')
        lines = data.decode('utf-8-sig').splitlines()
        start, end = row['line'] - 1, row['end_line']
        require(0 <= start < end <= len(lines), f'{label}: invalid rule range: {rule["id"]}')
        require(lines[start:end] == row['source_lines'], f'{label}: rule excerpt changed: {rule["id"]}')
        require(rule['source_id'] in result['source_ids'], f'{label}: unregistered rule source: {rule["id"]}')
    return result


def validate_wars(package, catalog):
    result = validate_source_extraction(package, catalog, 'wars')
    require(len(result['ownership_sites']) == 16, 'Wars ownership inventory mismatch')
    require(all(site['locations'] for site in result['ownership_sites']), 'Missing ownership location')


def validate_extraction_findings(package, catalog, slug):
    result = validate_source_extraction(package, catalog, slug)
    rule_ids = {r['id'] for r in result['rules']}
    probe_ids = {r['id'].split('-', 1)[0] for r in result['verification']['checks']}
    require(all(set(f['evidence']) <= rule_ids and set(f['probe_ids']) <= probe_ids
                for f in result['findings']), f'{package["id"]}: invalid finding evidence links')
    return result


def validate_menu(package, catalog):
    validate_extraction_findings(package, catalog, 'menu')


def validate_nature(package, catalog):
    validate_extraction_findings(package, catalog, 'nature')


def validate_disasters(package, catalog):
    validate_extraction_findings(package, catalog, 'disasters')


def validate_map(package, catalog):
    validate_extraction_findings(package, catalog, 'map')


def validate_walk_core(package, catalog):
    validate_extraction_findings(package, catalog, 'walk-core')


def validate_walk_society_economy(package, catalog):
    result = validate_extraction_findings(package, catalog, 'walk-society-economy')
    report = json.loads(safe_file(result['verification']['report_path']).read_text(encoding='utf-8'))
    fixtures = result['verification']['fixture_observations']
    require(fixtures == report['fixture_observations'], 'Walk society and economy: stale fixture observations')
    require(set(fixtures['generated_quests']) == set(result['declarations']['quest_kinds']),
            'Walk society and economy: incomplete quest generator coverage')


def validate_walk_law_bases(package, catalog):
    validate_extraction_findings(package, catalog, 'walk-law-bases')


def validate_walk_ground_transport(package, catalog):
    result = validate_extraction_findings(package, catalog, 'walk-ground-transport')
    vehicles = result['declarations']['vehicles']
    keys = {row['key'] for row in vehicles}
    require(len(vehicles) == len(keys) == 78, 'Ground transport: registry count or uniqueness mismatch')
    require(set(result['declarations']['registeredTrainTypes']) <= keys,
            'Ground transport: registered train absent from registry')


def validate_walk_air(package, catalog):
    result = validate_extraction_findings(package, catalog, 'walk-air')
    declarations = result['declarations']
    require(len(declarations['types']) == 11, 'Air: flight type count mismatch')
    require(set(declarations['passengerTypes']) <= declarations['types'].keys(),
            'Air: passenger type absent from aircraft properties')
    require(set(declarations['pilotTypes']) <= declarations['types'].keys(),
            'Air: pilot type absent from aircraft properties')


def validate_walk_sea(package, catalog):
    result = validate_extraction_findings(package, catalog, 'walk-sea')
    declarations = result['declarations']
    types = declarations['types']
    require(len(types) == 15 and sum(bool(v.get('war')) for v in types.values()) == 7,
            'Sea: hull registry count mismatch')
    require(set(types) == set(declarations['vehicleDefinitions']), 'Sea: vehicle registry mismatch')
    for row in declarations['passengerTypes']:
        require(set(row or []) <= types.keys(), 'Sea: passenger type absent from hull registry')


def validate_walk_world_effects(package, catalog):
    result = validate_extraction_findings(package, catalog, 'walk-world-effects')
    report = json.loads(safe_file(result['verification']['report_path']).read_text(encoding='utf-8'))
    parts = result['verification']['parts']
    require(parts == report['parts'] and len(parts) == 3, 'World effects: stale or missing suite metadata')
    checks = []
    for part in parts:
        script = safe_file(part['script'])
        probe_path = safe_file(part['report_path'])
        require(hashlib.sha256(script.read_bytes()).hexdigest() == part['script_sha256'], 'World effects: suite script changed')
        require(hashlib.sha256(probe_path.read_bytes()).hexdigest() == part['report_sha256'], 'World effects: suite report changed')
        probe = json.loads(probe_path.read_text(encoding='utf-8'))
        require(probe['failed'] == 0 and probe['passed'] == len(probe['results']), 'World effects: suite failure/count mismatch')
        require(probe['runtime_verified'] is False, 'World effects: isolated suite is not game runtime')
        for row in probe['sources']:
            copied = safe_file(Path(part['test_copy_path']) / Path(row['path']).name)
            require(hashlib.sha256(copied.read_bytes()).hexdigest() == row['sha256'], 'World effects: suite copy changed')
        kind = Path(part['report_path']).name.removesuffix('-probe.json')
        require(probe['declarations'] == result['declarations'][kind], 'World effects: stale suite declarations')
        checks.extend(probe['results'])
    require(checks == result['verification']['checks'], 'World effects: combined suite results differ')
    weapons = result['declarations']['combat']
    require(len(weapons['weapons']) == 24 and len(weapons['ammo']) == 8 and len(weapons['loadouts']) == 8,
            'World effects: arsenal count mismatch')


def main():
    scope = json.loads((ROOT / 'design-docs/research/feature-scope.json').read_text(encoding='utf-8'))
    catalog = json.loads((ROOT / 'design-docs/catalog.json').read_text(encoding='utf-8'))
    features = index(scope['features'], 'id')
    catalog_features = index(catalog['features'], 'id')
    packages = index(scope['work_packages'], 'id')
    modules = index(scope['modules'], 'path')
    policy = scope['execution_policy']
    primary = policy['primary_queue']
    deferred = policy['deferred_queue']
    require(primary and len(set(primary)) == len(primary), 'Primary queue must contain unique packages')
    require(len(set(deferred)) == len(deferred), 'Duplicate deferred package')
    require(set(primary).isdisjoint(deferred) and set(primary + deferred) == packages.keys(), 'Priority queues must partition all packages')
    require([w['id'] for w in scope['work_packages'] if w['priority'] == 'high'] == primary, 'High-priority package order differs from primary queue')
    pre_reads = {r['work_package_id']: r for r in policy['required_pre_reads']}
    require(set(pre_reads) <= set(deferred), 'Pre-reads must belong to deferred full scopes')
    positions = {w['id']: i for i, w in enumerate(scope['work_packages'])}
    last_primary = max(positions[wid] for wid in primary)
    early_deferred = {wid for wid in deferred if positions[wid] < last_primary}
    require(early_deferred <= pre_reads.keys(), 'Nonessential package precedes the primary queue')
    for wid, w in packages.items():
        queue = primary if wid in primary else deferred
        require(w['priority'] == ('high' if wid in primary else 'normal'), f'{wid}: wrong priority')
        require(w['priority_rank'] == queue.index(wid) + 1, f'{wid}: wrong priority rank')
        require(w['required_pre_read'] == (wid in pre_reads), f'{wid}: wrong pre-read flag')
    for wid, pre_read in pre_reads.items():
        require(positions[pre_read['after']] < positions[wid] < positions[pre_read['before']], f'{wid}: pre-read in wrong position')
        require(pre_read['inputs'] and pre_read['deferred_scope'] and pre_read['completion_rule'], f'{wid}: pre-read scope missing')
    require(features.keys() == catalog_features.keys(), 'Scope/catalog feature IDs differ')
    require(scope['coverage']['feature_count'] == len(features), 'Wrong feature count')
    require(scope['coverage']['work_package_count'] == len(packages), 'Wrong work package count')
    require(scope['coverage']['inventory_paths'] == len(modules), 'Wrong inventory path count')
    root_js = {p.relative_to(REFERENCE_ROOT).as_posix() for p in (REFERENCE_ROOT / 'EarthSimulator').glob('*.js')}
    listed_root_js = {p for p in modules if p.startswith('EarthSimulator/') and p.count('/') == 1 and p.endswith('.js')}
    require(root_js == listed_root_js, f'Root JS inventory mismatch: {root_js ^ listed_root_js}')
    require(scope['coverage']['root_javascript_files'] == len(root_js), 'Wrong root JS count')
    require(scope['coverage']['owned_modules_reviewed'] == len(root_js) - 1, 'Wrong owned module count')
    require(modules['EarthSimulator/three.min.js']['review'] == 'third_party_dependency', 'Library must remain classified separately')
    languages = {p.relative_to(REFERENCE_ROOT).as_posix() for p in (REFERENCE_ROOT / 'EarthSimulator/lang').glob('*.js')}
    require(languages <= modules.keys(), 'Missing localization data')
    require(scope['coverage']['localization_files'] == len(languages), 'Wrong language resource count')
    seen = set()
    for w in scope['work_packages']:
        require(set(w['dependencies']) <= seen, f'{w["id"]}: dependencies absent or not topologically ordered')
        require(w['feature_ids'], f'{w["id"]}: empty feature scope')
        require(set(w['feature_ids']) <= features.keys(), f'{w["id"]}: unknown feature')
        require(set(w['modules']) <= modules.keys(), f'{w["id"]}: unknown module')
        require(w['questions'] and w['outputs'] and w['completion'], f'{w["id"]}: missing extraction deliverables')
        require(w['status'] in ('planned', 'static_traced_runtime_pending'), f'{w["id"]}: unsupported research status')
        if w['status'] == 'static_traced_runtime_pending':
            validators = {'WP-BASELINE': validate_baseline, 'WP-FAUNA': validate_fauna, 'WP-DEMOGRAPHY-CITIES': validate_demography, 'WP-ECONOMY-TECH': validate_economy, 'WP-POLITICS-SOCIETY': validate_politics, 'WP-PEOPLE-DYNASTIES': validate_dynasties, 'WP-TRADE-NAVIGATION': validate_trade, 'WP-WORLD-WARS-TERRITORY': validate_wars, 'WP-MENU-LIFECYCLE': validate_menu, 'WP-WORLD-NATURE': validate_nature, 'WP-DISASTERS-DIVINE': validate_disasters, 'WP-MAP-INTERFACE': validate_map, 'WP-WALK-CORE': validate_walk_core,
                          'WP-WALK-SOCIETY-ECONOMY': validate_walk_society_economy,
                          'WP-WALK-LAW-BASES': validate_walk_law_bases,
                          'WP-WALK-GROUND-TRANSPORT': validate_walk_ground_transport,
                          'WP-WALK-AIR': validate_walk_air,
                          'WP-WALK-SEA': validate_walk_sea,
                          'WP-WALK-WORLD-EFFECTS': validate_walk_world_effects}
            require(w['id'] in validators, f'{w["id"]}: extracted evidence validator missing')
            validators[w['id']](w, catalog)
        for fid in w['feature_ids']:
            require(w['id'] in features[fid]['work_package_ids'], f'{w["id"]}: missing feature backlink {fid}')
        seen.add(w['id'])
    for f in features.values():
        ranks = [primary.index(wid) + 1 for wid in f['work_package_ids'] if wid in primary]
        require(f['priority'] == ('high' if ranks else 'normal'), f'{f["id"]}: wrong feature priority')
        expected_rank = min(ranks) if ranks else min(packages[wid]['priority_rank'] for wid in f['work_package_ids'])
        require(f['priority_rank'] == expected_rank, f'{f["id"]}: wrong feature priority rank')
        require(f['work_package_ids'], f'{f["id"]}: feature is not planned')
        require(set(f['work_package_ids']) <= packages.keys(), f'{f["id"]}: unknown package')
        require(f['runtime_verified'] is False, f'{f["id"]}: no runtime observations in this inventory')
        for wid in f['work_package_ids']:
            require(f['id'] in packages[wid]['feature_ids'], f'{f["id"]}: missing package backlink')
        require(set(f['module_paths']) <= modules.keys(), f'{f["id"]}: source outside inventory')
        for a in f['anchors']:
            p = safe_file(a['path'])
            lines = p.read_text(encoding='utf-8-sig').splitlines()
            require(1 <= a['line'] <= len(lines), f'{f["id"]}: invalid source line')
            require(a['code_excerpt'] == lines[a['line'] - 1][:240], f'{f["id"]}: source anchor changed')
    for m in modules.values():
        p = safe_file(m['path'])
        data = p.read_bytes()
        require(hashlib.sha256(data).hexdigest() == m['sha256'], f'File changed: {m["path"]}; review its features and update scope')
        require(len(data) == m['bytes'], f'File size changed: {m["path"]}')
        require(m['work_package_ids'], f'File not assigned to plan: {m["path"]}')
        require(set(m['work_package_ids']) <= packages.keys(), f'Unknown module package: {m["path"]}')
        require(set(m['feature_ids']) <= features.keys(), f'Unknown module feature: {m["path"]}')
    plan = (ROOT / scope['plan_path']).read_text(encoding='utf-8')
    require(all(wid in plan for wid in packages), 'Plan does not enumerate all work packages')
    require('FEATURE_INVENTORY.md' in plan and 'research/feature-scope.json' in plan, 'Plan missing full inventory links')
    print(f'OK: {len(features)} features, {len(packages)} work packages, {len(root_js)} root JS files, {len(modules)} paths; full planning coverage and source hashes verified.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)
