"""Validate the documentation catalog and local navigation, using only stdlib.

Run from any directory: python <project>/design-docs/tools/validate_catalog.py
The schema walker implements only the keywords used by catalog.schema.json and
rejects unsupported validation keywords instead of silently ignoring them.
"""

from pathlib import Path
from urllib.parse import unquote, urlsplit
import hashlib
import json
import os
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
REFERENCE_ROOT = Path(os.environ.get("EARTHSIM_REFERENCE_ROOT") or ROOT).resolve()
BASE = ROOT / 'design-docs'


class Invalid(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise Invalid(message)


def validate(value, rule, schema, at='$'):
    supported = {'$schema', '$ref', '$defs', 'title', 'description', 'type',
                 'const', 'enum', 'required', 'properties', 'additionalProperties',
                 'items', 'minItems', 'uniqueItems', 'minLength', 'pattern'}
    require(set(rule) <= supported, f'{at}: unsupported schema keywords {set(rule) - supported}')
    if '$ref' in rule:
        ref = rule['$ref']
        require(ref.startswith('#/'), f'{at}: nonlocal schema ref')
        target = schema
        for key in ref[2:].split('/'):
            target = target[key.replace('~1', '/').replace('~0', '~')]
        validate(value, target, schema, at)
        return
    kinds = {'object': dict, 'array': list, 'string': str, 'boolean': bool}
    if 'type' in rule:
        require(type(value) is kinds[rule['type']], f'{at}: expected {rule["type"]}')
    if 'const' in rule:
        require(value == rule['const'], f'{at}: expected {rule["const"]!r}')
    if 'enum' in rule:
        require(value in rule['enum'], f'{at}: unexpected value {value!r}')
    if isinstance(value, dict):
        require(set(rule.get('required', [])) <= value.keys(), f'{at}: missing required fields')
        props = rule.get('properties', {})
        extra = rule.get('additionalProperties', True)
        for key, item in value.items():
            if key in props:
                validate(item, props[key], schema, f'{at}.{key}')
            elif extra is False:
                raise Invalid(f'{at}: unexpected field {key}')
            elif isinstance(extra, dict):
                validate(item, extra, schema, f'{at}.{key}')
    if isinstance(value, list):
        require(len(value) >= rule.get('minItems', 0), f'{at}: not enough items')
        if rule.get('uniqueItems'):
            tokens = [json.dumps(x, sort_keys=True, ensure_ascii=False) for x in value]
            require(len(tokens) == len(set(tokens)), f'{at}: duplicate items')
        for i, item in enumerate(value):
            validate(item, rule.get('items', {}), schema, f'{at}[{i}]')
    if isinstance(value, str):
        require(len(value) >= rule.get('minLength', 0), f'{at}: empty string')
        if 'pattern' in rule:
            require(re.search(rule['pattern'], value), f'{at}: invalid format {value!r}')


def local_file(relative, *, root=ROOT):
    p = (root / relative).resolve()
    require(p.is_relative_to(root), f'Path escapes project: {relative}')
    require(p.is_file(), f'Missing file: {relative}')
    return p


def unique_index(items, key):
    values = [x[key] for x in items]
    require(len(values) == len(set(values)), f'Duplicate {key}: {values}')
    return {x[key]: x for x in items}


def check_target(owner, target):
    # Only filesystem targets; remote links and data URIs are not fetched.
    parsed = urlsplit(target)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return
    p = (owner.parent / unquote(parsed.path)).resolve()
    require(p.is_relative_to(ROOT), f'{owner.relative_to(ROOT)}: link escapes project: {target}')
    require(p.exists(), f'{owner.relative_to(ROOT)}: broken link: {target}')


def markdown_links(path):
    text = path.read_text(encoding='utf-8-sig')
    # Code examples are not Markdown navigation.
    text = re.sub(r'^```[^\n]*\n.*?^```\s*$', '', text, flags=re.M | re.S)
    definitions = dict(re.findall(r'^\[([^\]]+)\]:\s*(\S+)\s*$', text, re.M))
    for target in re.findall(r'\[[^\]\n]*\]\(([^)\n]+)\)', text):
        check_target(path, target)
    for image_ref in re.findall(r'!\[[^\]]*\]\[([^\]]+)\]', text):
        require(image_ref in definitions, f'{path.relative_to(ROOT)}: missing image definition {image_ref}')
        check_target(path, definitions[image_ref])
    for target in definitions.values():
        check_target(path, target)
    return text


def main():
    catalog = json.loads((BASE / 'catalog.json').read_text(encoding='utf-8'))
    schema = json.loads((BASE / 'catalog.schema.json').read_text(encoding='utf-8'))
    validate(catalog, schema, schema)
    documents = unique_index(catalog['documents'], 'id')
    unique_index(catalog['documents'], 'path')
    features = unique_index(catalog['features'], 'id')
    categories = unique_index(catalog['categories'], 'id')
    sources = set(re.findall(r'^\| (SRC-\d{3}) \|', local_file(catalog['source_registry_path']).read_text(encoding='utf-8'), re.M))
    require(sources, 'Source registry is empty')
    images = set()
    topic_images = set()
    for doc in documents.values():
        p = local_file(doc['path'])
        require(doc['category'] in categories, f'{doc["id"]}: unknown category')
        require(set(doc['source_ids']) <= sources, f'{doc["id"]}: unknown SRC')
        for fid in doc['feature_ids']:
            require(fid in features, f'{doc["id"]}: unknown feature {fid}')
            require(doc['id'] in features[fid]['document_ids'], f'{doc["id"]}: missing reverse link to {fid}')
        if doc['kind'] == 'topic':
            require(doc['feature_ids'], f'{doc["id"]}: topic has no feature')
        for image_path in doc['image_paths']:
            local_file(image_path)
            images.add(image_path)
        if p.suffix.lower() == '.md' and doc['kind'] != 'original_archive':
            body = markdown_links(p)
            if doc['kind'] in ('topic', 'historical_questions', 'research_stub'):
                require(len(re.findall(r'^# ', body, re.M)) == 1, f'{doc["id"]}: expected one H1')
                require('catalog.json' in body, f'{doc["id"]}: missing catalog link')
                for target in re.findall(r'^\[image\d+\]:\s*(\S+)', body, re.M):
                    topic_images.add((p.parent / unquote(target)).resolve().relative_to(ROOT).as_posix())
                for sid in re.findall(r'SRC-\d{3}', body):
                    require(sid in sources, f'{doc["id"]}: unknown inline SRC {sid}')
    for f in features.values():
        require(f['category'] in categories, f'{f["id"]}: unknown category')
        require(set(f['source_ids']) <= sources, f'{f["id"]}: unknown SRC')
        available_sources = set()
        for did in f['document_ids']:
            require(did in documents, f'{f["id"]}: unknown document {did}')
            require(f['id'] in documents[did]['feature_ids'], f'{f["id"]}: missing reverse link in {did}')
            available_sources.update(documents[did]['source_ids'])
        require(set(f['source_ids']) <= available_sources, f'{f["id"]}: evidence missing from linked documents')
        for path in f['implementation_entry_points']:
            if path.startswith('EarthSimulator/'):
                local_file(path, root=REFERENCE_ROOT.resolve())
            else:
                local_file(path)
    expected = {f'design-docs/assets/image{n:02d}.png' for n in range(1, 47)}
    require(images == expected, 'Catalog does not cover exactly the original 46 images')
    require(topic_images == expected, 'Topic links do not cover exactly the original 46 images')
    for path in expected:
        require(local_file(path).read_bytes().startswith(b'\x89PNG\r\n\x1a\n'), f'Invalid PNG signature: {path}')
    registered = {d['path'] for d in documents.values()}
    actual_md = {p.relative_to(ROOT).as_posix() for p in BASE.rglob('*.md')}
    require(actual_md <= registered, f'Unregistered Markdown files: {sorted(actual_md - registered)}')
    original = next(d for d in documents.values() if d['kind'] == 'original_archive')
    digest = hashlib.sha256(local_file(original['path']).read_bytes()).hexdigest()
    require(digest == catalog['migration']['original_archive_sha256'], 'Original archive changed')
    for f in features.values():
        if f['runtime_verified']:
            require('runtime_observation' in f['evidence_levels'], f'{f["id"]}: runtime verification needs observation evidence')
    print(f'OK: {len(features)} features, {len(documents)} documents, {len(expected)} images; schema, links, sources and original archive verified.')


if __name__ == '__main__':
    try:
        main()
    except (Invalid, KeyError, ValueError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)
