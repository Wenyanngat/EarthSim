'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'.research/wp-walk-world-effects');
const copy=path.join(out,'test-copy/EarthSimulator');
const digest=b=>createHash('sha256').update(b).digest('hex');
const kinds=['trade','strike','combat'];
const sources=new Map(),results=[],declarations={},parts=[];
fs.mkdirSync(copy,{recursive:true});
for(const kind of kinds){
  const script=`design-docs/tools/probe_walk_world_effects_${kind}.cjs`;
  const stdout=execFileSync(process.execPath,[path.join(root,script)],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
  process.stdout.write(stdout);
  const reportPath=`.research/wp-walk-world-effects/${kind}-probe.json`;
  const raw=fs.readFileSync(path.join(root,reportPath)),r=JSON.parse(raw);
  assert.equal(r.work_package_id,'WP-WALK-WORLD-EFFECTS');assert.equal(r.runtime_verified,false);
  assert.equal(r.failed,0);assert.equal(r.passed,r.results.length);
  assert(r.results.every(x=>x.status==='passed'));
  for(const row of r.sources){
    const data=fs.readFileSync(path.join(root,row.path));
    assert.equal(data.length,row.bytes);assert.equal(digest(data),row.sha256);
    if(sources.has(row.path))assert.deepEqual(sources.get(row.path),row);
    else sources.set(row.path,row);
    const local=path.join(out,`${kind}-test-copy/EarthSimulator`,path.basename(row.path));
    assert.equal(digest(fs.readFileSync(local)),row.sha256);
    fs.writeFileSync(path.join(copy,path.basename(row.path)),data);
  }
  results.push(...r.results);declarations[kind]=r.declarations;
  parts.push({script,script_sha256:digest(fs.readFileSync(path.join(root,script))),report_path:reportPath,
    report_sha256:digest(raw),test_copy_path:`.research/wp-walk-world-effects/${kind}-test-copy/EarthSimulator`,environment:r.environment});
}
assert.equal(new Set(results.map(x=>x.id)).size,results.length);
const report={work_package_id:'WP-WALK-WORLD-EFFECTS',runtime_verified:false,sources:[...sources.values()],
  environment:{node:process.version,kind:'three isolated test-copy suites; full trade and strike modules plus exact selected combat functions; no game runtime'},
  declarations,passed:results.length,failed:0,results,parts};
fs.writeFileSync(path.join(out,'probe-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(`World effects: ${results.length}/${results.length} isolated checks passed across ${report.sources.length} copied files.`);
