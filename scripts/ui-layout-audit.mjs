// First-party audit: actual Admin sources, synthetic API data, no backend/provider access.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)), repo=path.resolve(dir,'..');
const assets=path.join(repo,'src/free_claude_code/api/admin_static');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||path.resolve(repo,'node_modules/playwright-core/index.mjs')).href);
const phase=process.argv[2]||'before',out=path.resolve(process.env.UI_AUDIT_DIR||path.join(repo,'test-results/ui-ux'),phase),origin='http://127.0.0.1:4365';
await mkdir(out,{recursive:true});
const field=(key,label,section,extra={})=>({key,label,section,type:'string',value:'',description:'Synthetic fixture. No real provider connection.',source:'managed_env',secret:false,configured:false,locked:false,nullable:true,...extra});
const config={paths:{managed:'/synthetic-fixture/config.env'},fields:[field('FIXTURE_KEY','Fixture key','fixture'),field('HOST','Listen address','runtime',{value:'127.0.0.1'})],sections:[{id:'runtime',label:'Server settings',description:'Synthetic local settings for UI testing only.'}],provider_status:[{provider_id:'fixture',display_name:'Example provider',website_url:'https://example.invalid/',kind:'cloud',status:'unconfigured',settings_keys:['FIXTURE_KEY'],missing_configuration_keys:['FIXTURE_KEY']}],custom_providers:[],custom_reasoning_formats:{openai_chat:['provider_default'],openai_responses:['provider_default'],anthropic_messages:['provider_default']}};
const results={phase,fixtureOnly:true,checks:[],browserErrors:[],blockedExternal:[],requests:[]};
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
results.browser=browser.version();
let scenario='normal',holdConfig,releaseConfig;
const context=await browser.newContext({reducedMotion:'reduce',colorScheme:'dark'});
await context.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url()),p=url.pathname;
 if(url.origin!==origin){results.blockedExternal.push(req.url());return route.abort();}
 if(p.startsWith('/admin/api/')){
  results.requests.push({path:p,method:req.method(),scenario});let body={},status=200;
  if(p==='/admin/api/config'){
   if(scenario==='loading')await holdConfig;
   if(scenario==='load-error'){status=503;body={detail:'Synthetic config unavailable. Retry after checking the local service.'};}
   else{body=structuredClone(config);if(scenario==='long')body.provider_status[0].display_name='SyntheticProviderWithoutBreaks'.repeat(5);}
  }else if(p==='/admin/api/models')body={models:[],model_labels:{}};
  else if(p==='/admin/api/config/apply'){status=422;body={detail:'Synthetic validation error: '+'providerEndpointWithoutBreaks'.repeat(5)};}
  else if(p.startsWith('/admin/api/integrations/')){status=503;body={detail:'Synthetic integration unavailable. No real service contacted.'};}
  else if(p!=='/admin/api/status'){status=404;body={detail:'Unmocked API'};}
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 }
 let file;
 if(p.startsWith('/admin/assets/ui-local/')){const rel=p.slice('/admin/assets/ui-local/'.length);file=rel==='app-icon.svg'?path.resolve(assets,'../../assets/app-icon.svg'):path.resolve(assets,rel);if(!file.startsWith(path.resolve(repo,'src')+path.sep))return route.abort();}
 else if(/^\/admin(?:\/[^.]*)?$/.test(p))file=path.join(assets,'index.html');else return route.abort();
 try{let body=await readFile(file);if(file.endsWith('index.html'))body=Buffer.from(body.toString().replaceAll('__FCC_VERSION__','ui-local'));return route.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body});}catch{return route.fulfill({status:404,body:'Missing local asset'});}
});
const page=await context.newPage();page.on('pageerror',e=>results.browserErrors.push(e.message));
const record=(name,actual,pass)=>results.checks.push({name,actual,pass});
const shot=name=>page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
const overflow=()=>page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflowing:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1;}).slice(0,8).map(e=>e.className||e.tagName)}));
async function open(){await page.goto(origin+'/admin/providers');await page.locator('[data-provider-settings]').waitFor();}
try{
 for(const [width,height] of [[360,800],[412,915],[440,956],[1440,900],[844,390]]){
  scenario='normal';await page.setViewportSize({width,height});await open();await shot('providers-'+width);
  const metrics=await page.evaluate(()=>({sidebar:document.querySelector('.sidebar').getBoundingClientRect().height,buttonHeight:document.querySelector('[data-provider-settings]').getBoundingClientRect().height,inputHeight:document.querySelector('#field-HOST').getBoundingClientRect().height}));
  const layout=await overflow();record('providers-'+width,{...metrics,...layout},layout.scroll<=width+1&&metrics.buttonHeight>=44);
  await page.locator('[data-provider-settings]').click();await page.locator('#field-FIXTURE_KEY').fill('synthetic-value');await page.locator('#saveProvider').click();await page.locator('#providerMessage.error').waitFor();await shot('error-dialog-'+width);
  const dialog=await page.locator('#providerDialog').evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth,height:e.getBoundingClientRect().height,viewport:innerHeight,value:document.querySelector('#field-FIXTURE_KEY').value}));record('error-dialog-'+width,dialog,dialog.scroll<=dialog.client+1&&dialog.height<=height&&dialog.value==='synthetic-value');
  // Native dialogs may move focus to browser chrome (reported as BODY). Background app controls must stay inert.
  const focusTargets=[];let isolated=true;for(let i=0;i<8;i++){await page.keyboard.press('Tab');const entry=await page.evaluate(()=>({target:document.activeElement.id||document.activeElement.tagName,inside:document.querySelector('#providerDialog').contains(document.activeElement),browser:document.activeElement===document.body}));focusTargets.push(entry.target);isolated&&=entry.inside||entry.browser;}
  const backgroundBlocked=await page.evaluate(()=>{const background=document.querySelector('[data-provider-settings]');background.focus();return document.activeElement!==background;});record('modal-background-isolation-'+width,{focusTargets,backgroundBlocked},isolated&&backgroundBlocked);
  await page.keyboard.press('Escape');const focused=await page.evaluate(()=>document.activeElement?.hasAttribute('data-provider-settings'));record('focus-return-'+width,focused,focused);
 }
 await page.setViewportSize({width:360,height:800});scenario='long';await open();await shot('long-name-360');const long=await overflow();record('long-name-360',long,long.scroll<=361);
 scenario='loading';holdConfig=new Promise(r=>releaseConfig=r);await page.goto(origin+'/admin/providers');await shot('loading-360');const role=await page.locator('#messageArea').getAttribute('role');record('loading-live-status',role,role==='status');releaseConfig();await page.locator('[data-provider-settings]').waitFor();
 scenario='load-error';await page.goto(origin+'/admin/providers');await page.locator('#messageArea.error').waitFor();await shot('load-error-360');record('load-error-text',await page.locator('#messageArea').innerText(),(await page.locator('#messageArea').innerText()).includes('Synthetic config unavailable'));
 scenario='normal';await open();const empty=await page.getByText('No custom providers yet.').isVisible();record('empty-custom',empty,empty);
 const colors=await page.evaluate(()=>{const root=getComputedStyle(document.documentElement),button=getComputedStyle(document.querySelector('[data-provider-settings]'));return {muted:root.getPropertyValue('--muted').trim(),panel:root.getPropertyValue('--panel').trim(),error:root.getPropertyValue('--error').trim(),accent:root.getPropertyValue('--accent').trim(),buttonText:button.color,buttonBackground:button.backgroundColor};});
 function luminance(s){let c=s.startsWith('#')?s.slice(1).match(/../g).map(x=>parseInt(x,16)):s.match(/[\d.]+/g).slice(0,3).map(Number);return c.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);}
 function contrast(a,b){const l=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (l[0]+.05)/(l[1]+.05);}
 for(const [name,a,b,min] of [['muted-text',colors.muted,colors.panel,4.5],['error-text',colors.error,colors.panel,4.5],['focus-accent',colors.accent,colors.panel,3],['primary-text',colors.buttonText,colors.buttonBackground,4.5]]){const ratio=contrast(a,b);record('contrast-'+name,{ratio,colors:[a,b]},ratio>=min);}
 await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth}));record('keyboard-focus',focus,focus.outline!=='none'&&parseFloat(focus.width)>=2);
 const transition=await page.locator('.nav-link').first().evaluate(e=>getComputedStyle(e).transitionDuration);record('reduced-motion-transition',transition,transition.split(',').every(s=>parseFloat(s)===0));
 await page.evaluate(()=>{window.auditScroll=[];window.scrollTo=options=>window.auditScroll.push(options.behavior);});
 await page.locator('button[data-view="integrations"]').click();await page.locator('#vscodeChatIntegrationMessage').filter({hasText:'Synthetic'}).waitFor();await shot('integrations-error-360');const integration=await overflow();record('integrations-error-360',integration,integration.scroll<=361);
 const scroll=await page.evaluate(()=>window.auditScroll);record('reduced-motion-scroll',scroll,scroll.length>0&&scroll.every(s=>s!=='smooth'));
 for(const colorScheme of ['dark','light']){await page.emulateMedia({colorScheme});await page.setViewportSize({width:1440,height:900});await open();await page.evaluate(()=>document.body.style.zoom='2');await shot('zoom200-'+colorScheme);const zoom=await overflow();record('zoom200-'+colorScheme,zoom,zoom.scroll<=1441);const dirty=await page.locator('#dirtyState').evaluate(e=>({text:e.textContent,client:e.clientWidth,scroll:e.scrollWidth}));record('zoom200-dirty-status-'+colorScheme,dirty,dirty.scroll<=dirty.client+1);}
}finally{await writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify({phase,checks:results.checks.length,failures:results.checks.filter(c=>!c.pass),browserErrors:results.browserErrors},null,2));
if(phase!=='before'&&(results.browserErrors.length||results.checks.some(c=>!c.pass)))process.exitCode=1;
