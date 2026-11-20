/* Archive analysis: region × subject counts linked to source records. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
let records=[],region='',subject='',shown=40,viewingVisual=true;
const subjectGroups=[
['Design weeks / festivals',['Design Week','Design Festival']],
['Architecture / space',['Architecture & Built Environment','Spatial, Interior & Experiential']],
['Research / futures',['Research, History & Education','Futures & Foresight','Speculative, Critical & Futures']],
['Education / STEAM',['Design Education','STEAM','Cross-disciplinary Design']],
['Digital / graphics',['Digital / UX / Product','Graphic & Communication Design','Typography & Communication']],
['Culture / materials',['Arts & Cultural Heritage','Fashion, Textile & Craft','Product, Industrial & Material']],
['Social / ecology / business',['Social, Systems & Strategic','Ecological, Bio & Regenerative','Design Management & Business']]
];
const groupOf=c=>subjectGroups.find(x=>x[1].includes(c))?.[0]||'Other';
function csv(text){let rows=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}row.push(cell);if(row.some(Boolean))rows.push(row);const h=rows.shift()||[];return rows.map(a=>Object.fromEntries(h.map((name,i)=>[name,(a[i]||'').trim()]))).filter(r=>r.name);}
const count=(rows,key)=>rows.filter(r=>key(r)).length;
function allMatches(){const search=$('search').value.trim().toLowerCase(),country=$('place').value,category=$('discipline').value,year=$('year').value;return records.filter(r=>(!region||r.region===region)&&(!subject||groupOf(r.category)===subject)&&(!country||r.country===country)&&(!category||r.category===category)&&(!year||r.start_date.startsWith(year))&&(!search||[r.name,r.city,r.country,r.description,r.keywords].join(' ').toLowerCase().includes(search)));}
function link(url,label){try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))return null;const a=node('a',label+' ↗');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return null;}}
function record(r){const d=node('details',undefined,'record'),sum=node('summary');sum.append(node('span',r.start_date,'record-date'),node('span',r.name,'record-title'));d.append(sum);const body=node('div',undefined,'record-content');body.append(node('p',[r.city,r.country,r.region,r.category].filter(Boolean).join(' · '),'record-meta'));if(r.description)body.append(node('p',r.description));if(r.archive_note)body.append(node('p',r.archive_note,'record-meta'));for(const [u,label] of [[r.archive_url,'Listing history'],[r.url,'Organizer page']]){const a=link(u,label);if(a)body.append(a);}if(r.source)body.append(node('p','Source: '+r.source,'record-meta'));d.append(body);return d;}
function switchView(visual){viewingVisual=visual;$('visual').hidden=!visual;$('archiveList').hidden=visual;for(const e of [document.querySelector('.archive-toolbar'),document.querySelector('.archive-controls')]){e.hidden=visual;e.setAttribute('aria-hidden',String(visual));}$('atlasView').setAttribute('aria-pressed',String(visual));$('listView').setAttribute('aria-pressed',String(!visual));}
function choose(r,g){region=(region===r&&subject===g)?'':r;subject=(region===''?'':g);shown=40;render();if(!viewingVisual)switchView(true);}
function renderMatrix(){
 const host=$('activityMatrix');host.replaceChildren();
 const regions=[...new Set(records.map(r=>r.region))].sort((a,b)=>count(records,r=>r.region===b)-count(records,r=>r.region===a));
 const groups=subjectGroups.map(x=>x[0]).filter(g=>records.some(r=>groupOf(r.category)===g));
 if(records.some(r=>groupOf(r.category)==='Other'))groups.push('Other');
 host.style.gridTemplateColumns='minmax(148px,1.6fr) repeat('+groups.length+',minmax(95px,1fr)) 75px';
 host.append(node('div','Region / subject','matrix-head matrix-corner'));
 for(const g of groups)host.append(node('div',g,'matrix-head'));
 host.append(node('div','Total','matrix-head'));
 const max=Math.max(1,...regions.flatMap(r=>groups.map(g=>count(records,x=>x.region===r&&groupOf(x.category)===g))));
 for(const reg of regions){
   const n=count(records,x=>x.region===reg);
   const label=node('button',reg+' · '+n,'matrix-region');label.type='button';label.onclick=()=>choose(reg,'');label.setAttribute('aria-pressed',String(region===reg&&!subject));host.append(label);
   for(const g of groups){
     const k=count(records,x=>x.region===reg&&groupOf(x.category)===g),btn=node('button',String(k),'matrix-cell');btn.type='button';btn.title=reg+' / '+g+': '+k+' records';btn.setAttribute('aria-label',btn.title);btn.setAttribute('aria-pressed',String(region===reg&&subject===g));
     if(k){btn.style.setProperty('--strength',String(.07+.42*k/max));btn.onclick=()=>choose(reg,g);}else{btn.disabled=true;btn.classList.add('empty-cell');}
     host.append(btn);
   }
   const total=node('button',String(n),'matrix-total');total.type='button';total.title='Show all '+n+' records in '+reg;total.onclick=()=>choose(reg,'');host.append(total);
 }
 const totals=node('div','All regions','matrix-head');host.append(totals);
 for(const g of groups)host.append(node('div',String(count(records,r=>groupOf(r.category)===g)),'matrix-total-static'));
 host.append(node('div',String(records.length),'matrix-total-static'));
}
function render(){
 const rows=allMatches();$('count').textContent=rows.length+' of '+records.length+' archived records';
 $('results').replaceChildren(...rows.slice(0,shown).map(record));if(!rows.length)$('results').append(node('p','No records match this selection.'));$('more').hidden=rows.length<=shown;
 $('evidenceSummary').textContent=records.length+' archived events · '+new Set(records.map(r=>r.region)).size+' region groups · '+new Set(records.map(r=>groupOf(r.category))).size+' subject groups';
 const detail=$('matrixDetail');detail.replaceChildren();
 const description=region?(region+(subject?' / '+subject:'')+': '+rows.length+' matching records'):'Select a region or subject cell to see the corresponding events.';
 detail.append(node('p',description));if(region){const btn=node('button','Clear selection','matrix-clear');btn.type='button';btn.onclick=()=>{region='';subject='';render();};detail.append(btn);const more=node('button','View matching events','matrix-open');more.type='button';more.onclick=()=>{switchView(false);$('archiveList').scrollIntoView({behavior:'smooth',block:'start'});};detail.append(more);}
 renderMatrix();
}
$('atlasView').onclick=()=>switchView(true);$('listView').onclick=()=>switchView(false);
$('clear').onclick=()=>{region='';subject='';for(const id of ['search','place','discipline','year'])$(id).value='';render();};
$('more').onclick=()=>{shown+=40;render();};
for(const id of ['search','place','discipline','year'])$(id).addEventListener(id==='search'?'input':'change',render);
fetch('../data/events-archive.csv',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Archive unavailable');return r.text();}).then(t=>{
 records=csv(t).sort((a,b)=>b.start_date.localeCompare(a.start_date));
 for(const [id,key] of [['place','country'],['discipline','category'],['year','year']]){const values=[...new Set(records.map(r=>key==='year'?r.start_date.slice(0,4):r[key]))].filter(Boolean).sort();for(const v of values){const o=node('option',v);o.value=v;$(id).append(o);}}
 render();
}).catch(()=>{$('notice').hidden=false;$('notice').textContent='The archive could not be loaded.';$('visual').hidden=true;});
})();