/** Headless real-browser smoke: prevents all-white startup regressions.
 * Served locally with importmap pinned to the same Three.js used by unit tests.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const ROOT=process.cwd(),errors=[];
const mime={'.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const full=resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if(!full.startsWith(ROOT+sep))throw Error('Outside test root');
  let data=await readFile(full);
  // Every HTML entrypoint uses the same pinned local Three.js in browser
  // smoke, including the new default yard and retained detailed mechanism lab.
  if(extname(full)==='.html')
   data=Buffer.from(data.toString().replaceAll(
    'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js',
    '/node_modules/three/build/three.module.js'));
  res.writeHead(200,{'Content-Type':mime[extname(full)]||'application/octet-stream'});
  res.end(data);
 }catch(e){res.writeHead(404);res.end(e.message);}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-gpu-sandbox'
]});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
page.on('pageerror',err=>errors.push('PAGEERROR '+err.stack));
page.on('console',msg=>{if(msg.type()==='error')errors.push('CONSOLE '+msg.text());});
page.on('requestfailed',request=>errors.push('REQUEST '+request.url()+' '+request.failure()?.errorText));
try{
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'load',timeout:30000});
 await page.waitForURL('**/graybox.html');
 assert.equal(await page.locator('#gb-viewport canvas').count(),1,
  'Home page must now open the unified garage/range');
 await page.goto('http://127.0.0.1:'+port+'/detailed-lab.html',{waitUntil:'load',timeout:30000});
 await page.waitForTimeout(900);
 const snapshot=await page.evaluate(()=>({
  stats:document.getElementById('stats')?.textContent,
  verdict:document.getElementById('verdict')?.textContent,
  tree:document.getElementById('tree')?.textContent?.slice(0,200),
  canvas:!!document.querySelector('#viewport canvas'),
  tab:document.querySelector('[data-tab="catalog"]')?.getAttribute('aria-pressed')
 }));
 console.log('BOOT',JSON.stringify(snapshot));
 assert.deepEqual(errors,[],'Startup browser errors');
 assert.ok(snapshot.canvas,'No WebGL canvas');
 assert.match(snapshot.stats||'',/NODES/,'No machine stats: initial UI did not render');
 assert.ok(snapshot.tree?.length>15,'Assembly graph not populated');
 await page.locator('[data-tab="manip"]').click();
 await page.getByRole('button',{name:'ASSEMBLE TEST MANIPULATOR'}).click();
 await page.waitForTimeout(150);
 assert.deepEqual(errors,[],'Manipulator browser errors');
 const controls=await page.locator('#manip-controls').innerText();
 assert.match(controls,/INDUSTRIAL MANIPULATOR/);
 assert.match(controls,/rotary bearing/i);
 console.log('MANIPULATOR',controls.slice(0,270));
 await page.getByRole('button',{name:/B-62/}).last().click();
 await page.waitForTimeout(150);
 assert.deepEqual(errors,[],'Bearing change browser errors');
 // Stage 12 graybox is a separate workspace; verify full user-visible render.
 await page.goto('http://127.0.0.1:'+port+'/graybox.html',{waitUntil:'load',timeout:30000});
 await page.waitForTimeout(500);
 const gray=await page.evaluate(()=>({
  canvas:!!document.querySelector('#gb-viewport canvas'),
  assessment:document.querySelector('#assessment')?.textContent,
  cards:document.querySelectorAll('#choices .part-choice').length,
  screen:document.querySelector('#gb-viewport')?.getBoundingClientRect().height
 }));
 console.log('GRAYBOX_BOOT',JSON.stringify(gray));
 assert.deepEqual(errors,[],'New graybox startup browser errors');
 assert.ok(gray.canvas,'Graybox has no WebGL preview');
 assert.match(gray.assessment||'',/5 \/ 5 READY/);
 assert.equal(gray.cards,4,'Expected four foundational frames');
 assert.ok(gray.screen>140,'Graybox viewport must remain visible on mobile');
 await page.locator('[data-tab="reference"]').click();
 await page.getByRole('button',{name:/06 \/ WALKING CANNON/}).click();
 await page.waitForTimeout(140);
 assert.deepEqual(errors,[],'Reference recipe browser errors');
 assert.match(await page.locator('#assessment').innerText(),/5 \/ 5/);
 await page.locator('[data-tab="parts"]').click();
 await page.getByRole('button',{name:'SUPPORT',exact:true}).click();
 await page.getByRole('button',{name:/UTILITY ARM \/ Service Manipulator/i}).click();
 const socketChoice=page.getByRole('button',{name:/LEFT AUXILIARY/i});
 if(await socketChoice.count())await socketChoice.first().click();
 await page.waitForTimeout(120);
 assert.deepEqual(errors,[],'Socket-selection browser errors');
 await page.locator('[data-tab="looks"]').click();
 const arch=page.locator('#appearance select[data-form]');
 assert.equal(await arch.count(),4,'Expected four interchangeable architectural families');
 await arch.nth(0).selectOption('drum');
 await arch.nth(1).selectOption('heavy');
 await arch.nth(2).selectOption('low');
 await arch.nth(3).selectOption('claw');
 await page.waitForTimeout(250);
 assert.deepEqual(errors,[],'Stage 14 form selection browser errors');
 const selected=await page.locator('#appearance select[data-form]').evaluateAll(
  nodes=>nodes.map(node=>[node.dataset.form,node.value]));
 assert.deepEqual(selected,[['housing','drum'],['carrier','heavy'],
  ['stance','low'],['feet','claw']]);
 await page.locator('[data-tab="reference"]').click();
 await page.getByRole('button',{name:/03 \/ CANOPY ASSAULT/}).click();
 await page.waitForTimeout(180);
 assert.deepEqual(errors,[],'New Bubble/Cradle recipe browser errors');
 await page.locator('[data-tab="looks"]').click();
 assert.equal(await page.locator('select[data-form="stance"]').inputValue(),'low');
 // Validate player-facing nested weapon sockets and independently plated legs.
 await page.locator('[data-tab="reference"]').click();
 await page.getByRole('button',{name:/01 \/ YELLOW UTILITY/}).click();
 await page.locator('[data-tab="parts"]').click();
 await page.getByRole('button',{name:'SUPPORT',exact:true}).click();
 await page.getByRole('button',{name:/SHIELD \/ Impact Plate/i}).click();
 await page.getByRole('button',{name:/WEAPON CARRIER PROTECTION/i}).click();
 assert.match(await page.locator('#choices').innerText(),/weapon-shield/i);
 await page.locator('[data-tab="looks"]').click();
 const leftLeg=page.locator('#appearance .armor-row').filter({hasText:'LEFT LEG'});
 await leftLeg.getByRole('button',{name:'FULL'}).click();
 assert.deepEqual(errors,[],'Nested equipment and asymmetric limb browser errors');
 console.log('STAGE14_FORMS',JSON.stringify(selected));
 await page.locator('[data-tab="audit"]').click();
 const selections=page.locator('#audit-controls select');
 assert.equal(await selections.count(),3,'Audit should expose family, part, coverage');
 await selections.nth(0).selectOption('support');
 await page.locator('#audit-controls select').nth(1).selectOption('support-arm-heavy');
 await page.locator('#audit-controls select').nth(2).selectOption('2');
 await page.getByRole('button',{name:'COMPARE ALL 3 COVERAGE LEVELS'}).click();
 assert.equal(await page.locator('#audit-controls select').count(),2,
  'Compare mode should show each coverage instead of separate selector');
 assert.match(await page.locator('#audit-notes').innerText(),/HEAVY ARM/i);
 await page.waitForTimeout(160);
 assert.deepEqual(errors,[],'Stage 15 isolated arm audit browser errors');
 await page.locator('[data-tab="reference"]').click();
 await page.getByRole('button',{name:/08 . COMPACT SCOUT/}).click();
 await page.waitForTimeout(110);
 assert.match(await page.locator('#assessment').innerText(),/Stubber is a compact biped/i);
 assert.deepEqual(errors,[],'Stage 15 mobile reference framing errors');
 console.log('STAGE15_AUDIT_BROWSER_OK');
 // Stage 17 acceptance: actually pilot the SAME experimental constructor
 // scene, then return to the garage with its complete blueprint preserved.
 await page.locator('#reset').click();
 const beforePilot=await page.evaluate(()=>localStorage.getItem('m3ch4-graybox-v1'));
 const originalCanvas=await page.locator('#gb-viewport canvas').elementHandle();
 await page.getByRole('button',{name:'DEPLOY THIS EXACT MECH'}).click();
 await page.waitForTimeout(220);
 assert.equal(await page.locator('#yard-hud').isVisible(),true,
  'Deployment must enter the integrated scene, not navigate to the old game');
 assert.equal(await page.locator('#yard-garage').isVisible(),true);
 assert.equal(await page.locator('#yard-fire').isVisible(),true);
 await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');
 await page.locator('#yard-fire').click();
 await page.locator('#yard-garage').click();
 await page.waitForTimeout(200);
 assert.equal(await page.locator('#yard-hud').isVisible(),false);
 assert.equal(await page.locator('#gb-viewport canvas').elementHandle().then(
  el=>el.evaluate((canvas,original)=>canvas===original,originalCanvas)),true,
  'Pilot/garage must reuse the existing WebGL canvas');
 assert.equal(await page.evaluate(()=>localStorage.getItem('m3ch4-graybox-v1')),
  beforePilot,'Pilot/garage must preserve exact experimental blueprint');
 assert.deepEqual(errors,[],'Stage 17 integrated yard startup/movement errors');
 console.log('STAGE17_SAME_MACHINE_YARD_OK');
 console.log('GRAYBOX_BROWSER_SMOKE_OK');
 console.log('BROWSER_SMOKE_OK');
}finally{
 await page.close();await browser.close();
 await new Promise(done=>server.close(done));
}
