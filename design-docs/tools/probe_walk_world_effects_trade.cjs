// Execute unchanged shipped functions from byte-identical copies in a synthetic VM.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.research/wp-walk-world-effects'),copy=path.join(out,'trade-test-copy/EarthSimulator');
fs.mkdirSync(copy,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['core.js','climate.js','ecology.js','fauna.js','civ.js','society.js','trade.js','menu.js','net.js','walktrade.js','walkeco.js','walksea.js','walkrail.js','index.html'];
const sources=names.map(name=>{const b=fs.readFileSync(path.join(root,'EarthSimulator',name)),dest=path.join(copy,name);if(!fs.existsSync(dest))fs.writeFileSync(dest,b);assert.equal(hash(fs.readFileSync(dest)),hash(b),`Test copy drift: ${name}`);return {path:`EarthSimulator/${name}`,sha256:hash(b),bytes:b.length};});
const exposed=['slotNew','profileOf','routeSea','lotNew','deliver'];
const exposure=`globalThis.TX={${exposed.join(',')}};\n`;
const results=[];
const near=(a,b,tol=1e-5)=>assert(Math.abs(a-b)<=tol,`${a} != ${b}`);
function fixture(){
 const errors=[],c=vm.createContext({sessionStorage:{getItem:()=>JSON.stringify({w:24,h:24}),removeItem:()=>{}},window:{},document:{getElementById:()=>null},UI_FONT:'sans-serif',performance:{now:()=>0},console:{log:()=>{},warn:()=>{},error:(...a)=>errors.push(a.map(String).join(' '))},T:(a,b)=>b,TF:(a,b,...args)=>b.replace(/\{(\d+)\}/g,(_,i)=>args[i]),TL:'en'});
 const run=s=>{const ret=vm.runInContext(s,c,{timeout:10000});assert.deepEqual(errors,[],'Shipped subscriber logged an exception');return ret;};
 for(const name of ['core.js','climate.js','ecology.js','fauna.js','civ.js','society.js','trade.js']){
  let s=fs.readFileSync(path.join(copy,name),'utf8');if(name==='trade.js'){const anchor='  return {\n    NG, GI, C, conf,';assert.equal(s.split(anchor).length,2);s=s.replace(anchor,exposure+anchor);}vm.runInContext(s,c,{filename:`test-copy/${name}`,timeout:10000});
 }
 run('Math.random=()=>.99;W.simYear=100;W.simTick=100;W.elev.fill(.5);W.temp.fill(20);W.tempSmoothed.fill(20);W.stateId.fill(-1);W.landmass.fill(1);W.habEff.fill(1);W.biome.fill(BID.temperateGrassland);W.fertility.fill(.7);W.herb.fill(.5);_trade.reset();globalThis.X=_trade;globalThis.G=X.GI;');
 const state=(cells=[0],name='a',tech=0)=>run(`globalThis.${name}=stateBlank(states.length);${name}.alive=true;${name}.uid=states.length+1;${name}.name='${name}';${name}.capital=${cells[0]};${name}.cells=new Set(${JSON.stringify(cells)});${name}.area=${cells.length};${name}.tech=${tech};${name}.era=eraOf(${tech});${name}.tamed=0;states.push(${name});${name}.cells.forEach(i=>{W.stateId[i]=${name}.id;W.pop[i]=1000;});_stateSeq=states.length+1;`);
 const pair=()=>{state([25,26],'a');state([45,46],'b');run('X.scanAll();globalThis.r=TX.routeSea(25,45)');};
 const lot=(g='hides',car=0,dest=45)=>run(`globalThis.k=TX.lotNew(G.${g},a,TX.profileOf(a),25,a,${car},100,1,${dest},b,r,0,110);globalThis.id=X.lot(k).id`);
 const ship=()=>run('globalThis.sh={from:25,dest:45,owner:a,path:[49,50,51,52,53,54],pi:0,pu:0,v:1,x:1,y:2,trade:true,life:100};ships.push(sh);TX.shipsTick()');
 run(`
 globalThis.calls=[];globalThis.online=false;globalThis.money=0;
 globalThis.WALK={CELL:400};
 globalThis.WK={time:20,frame:1,pl:{cell:25,x:100,y:1,z:100,yaw:0,hp:100,veh:null},plans:new Map(),roadBits:Array(GRID.N).fill(0),railBits:Array(GRID.N).fill(0),tier:Array(GRID.N).fill(0)};
 globalThis.WA={vehs:[],npcs:[]};globalThis.WA_TARGETS=[];globalThis.WA_TALK=[];globalThis.WA_NPC_KINDS={};globalThis.WK_MARKS=[];
 globalThis.WK_T={INNER:3};globalThis.WK_DX=[1,0,-1,0];globalThis.WK_DZ=[0,1,0,-1];
 globalThis.WA_VEH={pack:{anim:true},caravan:{anim:true},travois:{anim:true},cart:{},wagon:{},oxcart:{},truck:{},lorry30:{},lorry:{}};
 globalThis.SEA_SHIPS={mgalley:{},cog:{},carrack:{},steamer:{},container:{}};globalThis.SEA={dk:null};
 globalThis.waOn=(event,fn)=>calls.push(['hook',event,fn.name]);globalThis.netLive=()=>online;
 globalThis.netDoFree=(...args)=>calls.push(['net',...args]);globalThis.walkEnter=(...args)=>{calls.push(['enter',...args]);return true;};
 globalThis.walkExit=()=>calls.push(['exit']);globalThis.flash=()=>{};globalThis.wkMsg=()=>{};globalThis.wkSfx=()=>{};
 globalThis.wkCellAt=()=>25;globalThis.wkGround=()=>1;globalThis.wkHeight=()=>1;globalThis.wkOcc=()=>0;
 globalThis.wkWage=()=>100;globalThis.wkEarn=(uid,n,kind)=>{money+=n;calls.push(['earn',uid,n,kind]);};
 globalThis.wkFmtMoney=(uid,n)=>String(n);globalThis.ecoStOf=()=>null;
 globalThis.wkLk=e=>[0,1,2,2,3,3,4,5][e|0];globalThis.wkEraOf=()=>3;
 globalThis.waCrime=(...args)=>calls.push(['crime',...args]);globalThis.waAngry=n=>{n.hostile=true;};
 globalThis.waFlee=n=>{n.state='flee';};globalThis.waCrewOut=()=>calls.push(['crewOut']);globalThis.ecoStat=(...args)=>calls.push(['stat',...args]);
 globalThis.seaCrewTurn=v=>{v.sea.hot=true;calls.push(['crewTurn']);};
 globalThis.waNpcAdd=(pl,kind,x,z,o)=>{const n={kind,x,z,y:1,hp:100,...o};WA.npcs.push(n);return n;};
 globalThis.waCol=()=>[.3,.4,.5];globalThis.tLower=s=>s.toLowerCase();
 globalThis.makeEntry=(opts={})=>{const L=X.lotById(id);const e=trwEntry(L,'porters');e.npcs=[{x:100,y:1,z:100,yaw:0}];return Object.assign(e,opts);};
 `);
 vm.runInContext(fs.readFileSync(path.join(copy,'walktrade.js'),'utf8'),c,{filename:'trade-test-copy/walktrade.js',timeout:10000});
 run('calls.length=0;Math.random=()=>.5;');
 return {run,state,pair,lot,ship,c};
}
const plain=v=>JSON.parse(JSON.stringify(v));
function check(label,code,expected,group='trade'){
 const id=`WT${String(results.length+1).padStart(2,'0')}-${group}`;
 try{const p=fixture();p.pair();p.lot();assert.deepEqual(plain(p.run(`{${code}}`)),expected);results.push({id,label,status:'passed'});}
 catch(e){results.push({id,label,status:'failed',error:e.stack});console.error(id,label,e.message);}
}

check('Guard count depends on unit price thresholds, not lot total',
 `TRADE_GOODS.push({price:19},{price:20},{price:99},{price:100},{price:399},{price:400});Array.from({length:6},(_,i)=>trwGuardN({g:26+i,val:1e9}));`,[0,2,2,3,3,4]);
check('Walk entry refuses air cargo',`X.netGet().cCar[k]=12;tradeWalkTo(id);`,false);
check('Walk entry rejects delivered lot',`X.arrive(id);tradeWalkTo(id);`,false);
check('Land entry stores cargo request and spawn callback',`const ok=tradeWalkTo(id);[ok,TRW.req.id===id,TRW.req.sea,WK.spawnAt===trwLandSpawn,calls.filter(c=>c[0]==='enter').length];`,[true,true,false,true,1]);
check('Clear preserves pending entry request',`TRW.req={id};TRW.list.push({});trwClear();[TRW.req.id===id,TRW.list.length];`,[true,0]);
check('Expired entry request is discarded before carrier creation',`TRW.req={id,t:Date.now()-30001,sea:false};trwArrive();[TRW.req,TRW.list.length];`,[null,0]);
check('Land type maps real carrier class and visible epoch',`[trwLandType(1,2,a),trwLandType(2,2,a),trwLandType(3,2,a),trwLandType(5,4,a),trwLandType(4,3,a)];`,['pack','caravan','wagon','truck','lorry30']);
check('Sea type maps real cargo carrier and fallback',`[trwSeaType(6,1,a),trwSeaType(7,2,a),trwSeaType(8,2,a),trwSeaType(9,3,a),trwSeaType(10,3,a),trwSeaType(10,4,a),trwSeaType(11,5,a)];`,['mgalley','cog','carrack','steamer','steamer','container','container']);
check('Guard lookup excludes dead fled vanished and distant guards',`const e=makeEntry();e.guards=[{x:101,z:100},{x:101,z:100,dead:true},{x:101,z:100,state:'flee'},{x:101,z:100,vanish:true},{x:146,z:100}];trwGuardsNear(e,100,100).length;`,1);
check('Guard radius has strict forty-five-meter boundary',`const e=makeEntry();e.guards=[{x:145,z:100}];trwGuardsNear(e,100,100).length;`,0);
check('Nearby guard blocks robbery and starts crime without payment',`const e=makeEntry();e.guards=[{x:101,z:100}];trwRob(e);[money,X.lotById(id).st,e.guards[0].hostile,e.guards[0].grudge,calls.filter(c=>c[0]==='crime').map(c=>c[1])];`,[0,1,true,true,[2]]);
check('Robbery target requires slow non-ship carrier',`const e=makeEntry({kind:'veh',v:{x:100,y:1,z:100,V:{},sp:2.6}});const a=trwTargets(WK.pl).length;e.v.sp=2.5;[a,trwTargets(WK.pl).length];`,[0,1]);
check('Train cargo is reachable only during dwell below half meter per second',`const e=makeEntry({kind:'train',T:{state:'run',sp:0,cars:[{x:100,y:1,z:100}]}});const a=trwTargets(WK.pl).length;e.T.state='dwell';e.T.sp=.5;const b=trwTargets(WK.pl).length;e.T.sp=.49;[a,b,trwTargets(WK.pl).length];`,[0,0,1]);
check('Ship cargo requires player on same deck, empty hold remains target',`const v={sea:{cargo:[]}},e=makeEntry({kind:'ship',v});const a=trwCargoAt(e,WK.pl);SEA.dk={v};[a,trwCargoAt(e,WK.pl)];`,[null,{x:100,y:1,z:100,d:0}]);
check('Successful robbery changes actual world lot and pays locally',`const e=makeEntry();trwRob(e);[e.robbed,X.lotById(id).st,X.world().tot.robbed,calls.filter(c=>c[0]==='earn').length,calls.filter(c=>c[0]==='crime').map(c=>c[1]),e.npcs[0].state];`,[true,5,1,1,[2],'flee']);
check('Offline repeated robbery cannot repeat reward or world loss',`const e=makeEntry();trwRob(e);const first=money;trwRob(e);[money===first,X.world().tot.robbed,calls.filter(c=>c[0]==='earn').length];`,[true,1,1]);
check('World robbery debits owner treasury and trade links once',`a.treasury=1000;a.trade=1;X.rob(id);X.rob(id);[a.treasury,a.trade,r.lost,r.go,X.world().tot.robbed];`,[996,.7,1,0,1]);
check('World robbery treasury penalty uses five-percent floor for small balance',`a.treasury=10;a.trade=.1;X.rob(id);[a.treasury,a.trade];`,[9.5,0]);
check('Local wallet chooses dry-cell issuer before carrier owner',`const e=makeEntry();ecoStOf=()=>b;trwRob(e);calls.find(c=>c[0]==='earn')[1];`,2);
check('Water location uses carrier owner currency',`const e=makeEntry();W.isWater[25]=1;trwRob(e);calls.find(c=>c[0]==='earn')[1];`,1);
check('Minimum loot is three wage days before random spread',`const e=makeEntry();X.netGet().cVal[k]=0;trwRob(e);money;`,300);
check('Maximum loot is forty wage days before random spread',`const e=makeEntry();X.netGet().cVal[k]=1e12;trwRob(e);money;`,4000);
check('Loot includes fifteen-percent downward randomness',`const e=makeEntry();X.netGet().cVal[k]=0;Math.random=()=>0;trwRob(e);money;`,255);
check('Local robbery in room queues authority command and pays before update',`const e=makeEntry();online=true;trwRob(e);[e.robbed,X.lotById(id).st,money>0,calls.filter(c=>c[0]==='net')];`,[true,1,true,[['net','tradeRob',1]]]);
check('Repeated direct room action before authority update can pay twice',`const e=makeEntry();online=true;trwRob(e);const first=money;trwRob(e);[money===first*2,calls.filter(c=>c[0]==='net').length,X.world().tot.robbed];`,[true,2,0]);
check('Completed world lot rejects later rob or arrive',`X.arrive(id);[X.rob(id),X.arrive(id),X.world().tot.n,X.world().tot.robbed];`,[null,null,1,0]);
check('World robbery prevents later delivery',`X.rob(id);[X.arrive(id),X.world().tot.n,X.world().tot.robbed];`,[null,0,1]);
check('Local arrival delivers now and is idempotent',`const e=makeEntry({G:{rest:0}});trwDeliver(e);trwDeliver(e);[e.done,e.G.rest,X.lotById(id).st,X.world().tot.n,W.simYear];`,[true,25,2,1,100]);
check('Room arrival queues command once without immediate world delivery',`const e=makeEntry();online=true;trwDeliver(e);trwDeliver(e);[e.done,X.lotById(id).st,calls.filter(c=>c[0]==='net')];`,[true,1,[['net','tradeArrive',1]]]);
check('Arrival threshold is strictly below 1.6 cells',`const e=makeEntry({dest:25});WK.pl.x=(25%24+.5)*400;WK.pl.z=(Math.floor(25/24)+.5)*400;e.npcs[0].x=WK.pl.x+640;e.npcs[0].z=WK.pl.z;trwArriveCheck(e);const a=!!e.done;e.npcs[0].x-=.1;trwArriveCheck(e);[a,e.done];`,[false,true]);
check('Camp and sea carriers do not use land auto-arrival',`const e=makeEntry({dest:25,camp:true});trwArriveCheck(e);e.camp=false;e.kind='ship';trwArriveCheck(e);[e.done??false,X.lotById(id).st];`,[false,1]);
check('Train station wait extends to at least 240 seconds',`const T={dwellT:20};trwTrainStop(T);T.dwellT;`,240);
check('Cargo free releases vehicle tracking without deleting world lot',`const v={keep:true},T={trc:{}},e=makeEntry({v,T});v.trc=e;trwFree(e);[v.trc,v.keep,T.trc,X.lotById(id).st];`,[null,false,null,1]);

for(const row of results){
 const n=Number(row.id.slice(2,4));
 const group=n<=8?'trade_entry':n<=14?'trade_access':n<=27?'trade_robbery':'trade_delivery';
 row.id=row.id.replace(/-trade$/,`-${group}`);
}
const p=fixture();
const report={work_package_id:'WP-WALK-WORLD-EFFECTS',runtime_verified:false,sources,
 environment:{kind:'full copied trade model and walktrade module in isolated VM',node:process.version,
  executed_modules:['core.js','climate.js','ecology.js','fauna.js','civ.js','society.js','trade.js','walktrade.js'],
  instrumentation:{kind:'VM-only lexical exposure',anchor:'  return {\n    NG, GI, C, conf,',exposed_functions_and_objects:exposed,injected_text_sha256:hash(exposure)},
  limitations:['Synthetic state, road/sea actors, player wallet, UI and network command adapters. No renderer, full convoy spawn, actual room, disk save or game runtime observed.','Room reentry test invokes same exported action twice directly before authority delivery; it establishes no observed UI exploit.']},
 declarations:plain(p.run(`({settings:Object.fromEntries(Object.entries(WALK).filter(([k])=>k.startsWith('TRW_'))),guardKind:{day:WA_NPC_KINDS.trguard.day},tradeStates:X.ST})`)),
 passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,results};
fs.writeFileSync(path.join(out,'trade-probe.json'),JSON.stringify(report,null,2)+'\n');
console.log(`World trade: ${report.passed}/${results.length} isolated checks passed.`);process.exitCode=report.failed?1:0;
