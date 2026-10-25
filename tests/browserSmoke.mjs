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
  if(pathname==='/'||pathname==='/index.html')
   data=Buffer.from(data.toString().replace(
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
 assert.match(controls,/ROTARY BEARING/);
 console.log('MANIPULATOR',controls.slice(0,270));
 await page.getByRole('button',{name:/B-62/}).last().click();
 await page.waitForTimeout(150);
 assert.deepEqual(errors,[],'Bearing change browser errors');
 console.log('BROWSER_SMOKE_OK');
}finally{
 await page.close();await browser.close();
 await new Promise(done=>server.close(done));
}
