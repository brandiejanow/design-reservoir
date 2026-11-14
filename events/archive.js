/* Archive explorer: no external dependencies; all views derive from the same CSV. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
  const anchors = {'North America':[20,32], 'South America':[32,67], 'Europe':[52,25], 'Africa':[53,57], 'Middle East':[62,39], 'Asia':[77,34], 'Oceania':[88,73]};
  let records = [], region = '', limit = 40;
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', quote = false;
    for (let i=0;i<text.length;i++) {
      const c=text[i];
      if(c==='"') { if(quote && text[i+1]==='"') {cell+='"';i++;} else quote=!quote; }
      else if(c===','&&!quote) {row.push(cell);cell='';}
      else if((c==='\n'||c==='\r')&&!quote) {if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}
      else cell+=c;
    }
    row.push(cell);if(row.some(Boolean))rows.push(row);
    if(quote) throw new Error('Incomplete CSV');
    const headers=(rows.shift()||[]).map(s=>s.trim().replace(/^\uFEFF/,''));
    if(!headers.includes('name')||!headers.includes('end_date')) throw new Error('Missing archive columns');
    return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()]))).filter(r=>r.name);
  }
  const yearOf = r => /^\d{4}-/.test(r.start_date) ? r.start_date.slice(0,4) : '';
  const totals = (rows, key) => rows.reduce((m,r)=>{const k=typeof key==='function'?key(r):r[key];if(k)m.set(k,(m.get(k)||0)+1);return m;},new Map());
  function button(text, active, action, cls) {const b=el('button',text,cls);b.type='button';b.setAttribute('aria-pressed',String(active));b.onclick=action;return b;}
  function filtered(skip) {const q=$('search').value.trim().toLowerCase();return records.filter(r=>(!q||[r.name,r.city,r.country,r.description,r.keywords,r.category].join(' ').toLowerCase().includes(q)) && (skip==='country'||!$('place').value||r.country===$('place').value) && (skip==='category'||!$('discipline').value||r.category===$('discipline').value) && (skip==='year'||!$('year').value||yearOf(r)===$('year').value) && (skip==='region'||!region||r.region===region));}
  function choose(id,value) {$(id).value=value;limit=40;render();}
  function safeLink(value,label) {try {const u=new URL(value);if(!['http:','https:'].includes(u.protocol))return null;const a=el('a',label+' ↗');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return null;}}
  function recordNode(r) {
    const d=el('details',null,'record'), s=el('summary');
    s.append(el('span',r.start_date||'Date not recorded','record-date'),el('span',r.name,'record-title'));d.append(s);
    const body=el('div',null,'record-content');
    body.append(el('p',[r.city,r.country,r.region,r.category].filter(Boolean).join(' · '),'record-meta'));
    body.append(el('p','Listed dates: '+(r.start_date||'Not recorded')+' to '+(r.end_date||'Not recorded')));
    if(r.description)body.append(el('p',r.description));
    if(r.keywords)body.append(el('p','Topics: '+r.keywords,'record-meta'));
    if(r.source) {const source=safeLink(r.source,'Recorded source');body.append(source||el('p','Source note: '+r.source,'record-meta'));}
    const link=safeLink(r.url,'Event website');if(link)body.append(link);
    d.append(body);return d;
  }
  function render() {
    const rows=filtered();$('count').textContent=`${rows.length} of ${records.length} archived ${records.length===1?'record':'records'}`;
    $('results').replaceChildren(...rows.slice(0,limit).map(recordNode));
    if(!rows.length)$('results').append(el('p',records.length?'No records match these filters. Try another place, year or subject.':'There are no archived event records yet. Current and upcoming listings remain in the Events Calendar.'));
    $('more').hidden=rows.length<=limit;
    const regions=totals(filtered('region'),'region');$('regions').replaceChildren();$('markers').replaceChildren();
    if(records.length)$('regions').append(button('All regions',!region,()=>{region='';limit=40;render();}));
    [...regions].sort().forEach(([name,n])=>{const action=()=>{region=region===name?'':name;limit=40;render();};$('regions').append(button(`${name} · ${n}`,region===name,action));if(anchors[name]){const b=button(String(n),region===name,action,'marker');b.style.left=anchors[name][0]+'%';b.style.top=anchors[name][1]+'%';b.setAttribute('aria-label',`${name}: ${n} archived ${n===1?'record':'records'}`);b.title=`${name} · ${n}`;$('markers').append(b);}});
    $('mapEmpty').hidden=$('markers').childElementCount>0;$('mapEmpty').textContent=records.length?'No mapped regions in this selection.':'No locations to display yet.';
    const years=totals(filtered('year'),yearOf), max=Math.max(1,...years.values());$('timeline').replaceChildren();
    [...years].sort().forEach(([y,n])=>{const b=button('', $('year').value===y,()=>choose('year',$('year').value===y?'':y),'year-column');b.setAttribute('aria-label',`${y}: ${n} archived ${n===1?'record':'records'}`);b.append(el('span',String(n)));const bar=el('span',null,'year-bar');bar.style.height=(n/max*100)+'px';bar.setAttribute('aria-hidden','true');b.append(bar,el('span',y));$('timeline').append(b);});
    if(!years.size)$('timeline').append(el('p',records.length?'No recorded start years in this selection.':'The timeline will appear as dated records enter the archive.'));
    $('subjects').replaceChildren();[...totals(filtered('category'),'category')].sort().forEach(([name,n])=>{$('subjects').append(button(`${name} · ${n}`,$('discipline').value===name,()=>choose('discipline',$('discipline').value===name?'':name)));});
    if(!$('subjects').childElementCount)$('subjects').append(el('p',records.length?'No disciplines in this selection.':'Disciplines will appear with the first archived records.'));
  }
  ['search','place','discipline','year'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{limit=40;render();}));
  $('clear').onclick=()=>{['search','place','discipline','year'].forEach(id=>$(id).value='');region='';limit=40;render();};
  $('more').onclick=()=>{limit+=40;render();};
  function view(atlas){$('visual').hidden=!atlas;$('atlasView').setAttribute('aria-pressed',String(atlas));$('listView').setAttribute('aria-pressed',String(!atlas));}
  $('atlasView').onclick=()=>view(true);$('listView').onclick=()=>view(false);
  fetch('../data/events-archive.csv',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('Archive unavailable');return r.text();}).then(text=>{
    records=parseCSV(text).sort((a,b)=>(b.start_date||'').localeCompare(a.start_date||'')||a.name.localeCompare(b.name));
    [['place','country'],['discipline','category'],['year',yearOf]].forEach(([id,key])=>{[...totals(records,key).keys()].sort().forEach(v=>{const o=el('option',v);o.value=v;$(id).append(o);});$(id).disabled=!records.length;});
    if(!records.length){$('notice').hidden=false;$('notice').textContent='The archive is ready for its first records. As listings pass their recorded end dates, the regular archive update will preserve them here. No past events have been added simply to fill the map.';}
    render();
  }).catch(()=>{$('count').textContent='Archive unavailable';$('notice').hidden=false;$('notice').textContent='The archive could not be loaded. Please reload this page, or return to the Events Calendar.';$('visual').hidden=true;});
})();
