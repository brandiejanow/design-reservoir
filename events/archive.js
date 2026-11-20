/* Archive explorer: no external dependencies; all views derive from the same CSV. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
  
  let records = [], region = '', month = '', limit = 40, ringHistory = [];
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
  function filtered(skip) {const q=$('search').value.trim().toLowerCase();return records.filter(r=>(!q||[r.name,r.city,r.country,r.description,r.keywords,r.category].join(' ').toLowerCase().includes(q)) && (skip==='country'||!$('place').value||r.country===$('place').value) && (skip==='category'||!$('discipline').value||r.category===$('discipline').value) && (skip==='year'||!$('year').value||yearOf(r)===$('year').value) && (skip==='region'||!region||r.region===region) && (skip==='month'||!month||r.start_date.slice(0,7)===month));}
  function choose(id,value) {$(id).value=value;ringHistory=[];limit=40;render();}
  const ringSnapshot=()=>({region,discipline:$('discipline').value,month});
  const clearAll=()=>{
    ['search','place','discipline','year'].forEach(id=>$(id).value='');
    region='';month='';ringHistory=[];limit=40;render();
  };
  function safeLink(value,label) {try {const u=new URL(value);if(!['http:','https:'].includes(u.protocol))return null;const a=el('a',label+' ↗');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return null;}}
  function recordNode(r) {
    const article=el('article',null,'record');
    const header=el('div',null,'record-header');
    const category=el('p',r.category||'Design event','record-category');
    const title=el('h3',r.name,'record-title');
    const place=el('p',[r.city,r.country].filter(Boolean).join(', '),'record-place');
    header.append(category,title,place);
    const body=el('div',null,'record-primary');
    if(r.description)body.append(el('p',r.description,'record-description'));
    if(r.keywords)body.append(el('p','Subjects: '+r.keywords,'record-topics'));
    const details=el('details',null,'record-sources');
    const summary=el('summary','Sources and dates');
    const sources=el('div',null,'record-source-body');
    const dateLabel=[r.start_date,r.end_date&&r.end_date!==r.start_date?'to '+r.end_date:''].filter(Boolean).join(' ');
    if(dateLabel)sources.append(el('p','Recorded dates: '+dateLabel,'record-date'));
    if(r.archive_note)sources.append(el('p',r.archive_note,'record-meta'));
    const history=safeLink(r.archive_url,'Listing history');if(history)sources.append(history);
    if(r.source){const source=safeLink(r.source,'Recorded source');sources.append(source||el('p','Source note: '+r.source,'record-meta'));}
    const eventLink=safeLink(r.url,'Event website');if(eventLink)sources.append(eventLink);
    details.append(summary,sources);
    article.append(header,body,details);
    return article;
  }

  const NS='http://www.w3.org/2000/svg';
  const svgEl=(tag,attrs,text)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,v));if(text!=null)n.textContent=text;return n;};
  const point=(r,a)=>[400+r*Math.cos((a-90)*Math.PI/180),400+r*Math.sin((a-90)*Math.PI/180)];
  const arc=(r,a,b)=>{const p=point(r,a),q=point(r,b);return `M ${p} A ${r} ${r} 0 ${b-a>180?1:0} 1 ${q}`;};
  const wedge=(r,w,a,b)=>{const p=point(r+w/2,a),q=point(r+w/2,b),u=point(r-w/2,b),v=point(r-w/2,a);return `M ${p} A ${r+w/2} ${r+w/2} 0 ${b-a>180?1:0} 1 ${q} L ${u} A ${r-w/2} ${r-w/2} 0 ${b-a>180?1:0} 0 ${v} Z`;};
  const shortNames={'Design Festival':'Festivals','Design Week':'Design weeks','Architecture & Built Environment':'Architecture','Futures & Foresight':'Foresight','Digital / UX / Product':'Digital / UX','Cross-disciplinary Design':'Across fields','Design Education':'Education','Graphic & Communication Design':'Graphic','Research, History & Education':'Research','Social, Systems & Strategic':'Systems','Arts & Cultural Heritage':'Arts / heritage','Product, Industrial & Material':'Materials','Design Management & Business':'Business','Spatial, Interior & Experiential':'Interiors','Speculative, Critical & Futures':'Speculative','Ecological, Bio & Regenerative':'Ecology','Typography & Communication':'Typography'};
  function renderWheel(selectedRows){
    const svg=$('archiveWheel');svg.replaceChildren();const defs=svgEl('defs');svg.append(defs);
    [124,208,280,359].forEach(r=>svg.append(svgEl('circle',{cx:400,cy:400,r,fill:'none',stroke:'#d5d4dc','stroke-width':.8})));
    const configurations=[
      {key:'region',radius:322,width:60,container:'regions',value:region,label:n=>n,select:n=>{region=region===n?'':n;}},
      {key:'category',radius:244,width:60,container:'subjects',value:$('discipline').value,label:n=>shortNames[n]||n,select:n=>{$('discipline').value=$('discipline').value===n?'':n;}},
      {key:r=>r.start_date.slice(0,7),radius:166,width:60,container:'months',value:month,label:n=>new Date(n+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'short',year:'2-digit',timeZone:'UTC'}),select:n=>{month=month===n?'':n;}}
    ];
    configurations.forEach((cfg,ring)=>{
      const groups=[...totals(records,cfg.key)].sort((a,b)=>a[0].localeCompare(b[0])), matching=totals(selectedRows,cfg.key), step=360/Math.max(1,groups.length);
      $(cfg.container).replaceChildren();
      groups.forEach(([name,total],i)=>{
        const start=i*step+1.4,end=(i+1)*step-1.4,mid=(start+end)/2,active=cfg.value===name,n=matching.get(name)||0;
        const action=()=>{ringHistory.push(ringSnapshot());cfg.select(name);limit=40;render();};
        const g=svgEl('g',{role:'button',tabindex:0,'aria-label':`${name}: ${total} records, ${n} in this selection`,'aria-pressed':String(active),'data-ring-key':`${ring}-${i}`,class:`ring-segment ring-${ring}${active?' selected':''}${n===0?' muted':''}`});
        g.append(svgEl('title',{},`${name} · ${total} records · ${n} selected`));
        g.append(svgEl('path',{d:wedge(cfg.radius,cfg.width,start,end),class:'segment-fill'}));
        const pathId=`ring-label-${ring}-${i}`,bottom=mid>90&&mid<270;let path=arc(cfg.radius+10,start+1,end-1);
        if(bottom){const a=point(cfg.radius-7,end-1),b=point(cfg.radius-7,start+1);path=`M ${a} A ${cfg.radius-7} ${cfg.radius-7} 0 ${end-start>180?1:0} 0 ${b}`;}
        defs.append(svgEl('path',{id:pathId,d:path}));
        const text=svgEl('text',{'text-anchor':'middle',class:'segment-label'}),tp=svgEl('textPath',{href:'#'+pathId,startOffset:'50%'},cfg.label(name));text.append(tp);g.append(text);
        // Segment counts appear in the selected center summary, not alongside ring labels.
        g.onclick=action;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();$('archiveWheel').querySelector(`[data-ring-key="${ring}-${i}"]`).focus();}};svg.append(g);
        const b=button(`${cfg.label(name)} · ${total}`,active,action);b.title=name;$(cfg.container).append(b);
      });
    });
    // The center is the reading surface for the current ring selection.
    // A segment number is the number of matching archived events, not a day of the month.
    const chosenCategory=$('discipline').value;
    const chosenMonth=month?new Date(month+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'}):'';
    const selections=[region,$('place').value,chosenCategory?(shortNames[chosenCategory]||chosenCategory):'',chosenMonth,$('year').value,$('search').value.trim()].filter(Boolean);
    // Native SVG text avoids the inconsistent clipping/scaling of foreignObject.
    // All center text is kept within a 115px radius of (400,400).
    const clipped=(str,max)=>{const v=String(str||'').trim();return v.length>max?v.slice(0,max-1).trimEnd()+'…':v;};
    const centerGroup=svgEl('g',{class:'archive-wheel-center-svg','aria-label':selectedRows.length+' matching archived events'});
    const svgLine=(label,y,cls,size)=>centerGroup.append(svgEl('text',{
      x:400,y,'text-anchor':'middle',class:cls,'font-size':size
    },clipped(label,cls==='archive-wheel-center-svg-event'?31:29)));
    const scope=selections.length?selections.join(' · '):'ALL ARCHIVED EVENTS';
    svgLine(scope,346,'archive-wheel-center-svg-scope',12);
    svgLine(String(selectedRows.length),400,'archive-wheel-center-svg-value',49);
    svgLine(selectedRows.length===1?'MATCHING EVENT':'MATCHING EVENTS',420,'archive-wheel-center-svg-label',10);
    if(!selections.length){
      svgLine('Select a ring to see details',445,'archive-wheel-center-svg-note',11);
    }else if(!selectedRows.length){
      svgLine('No matching event records',445,'archive-wheel-center-svg-note',11);
    }else{
      const top=[...totals(selectedRows,'category')].sort((a,b)=>b[1]-a[1])[0];
      if(top)svgLine((shortNames[top[0]]||top[0])+' ('+top[1]+')',444,'archive-wheel-center-svg-subject',11);
      const first=selectedRows[0];
      // The List retains the full event name, description and source.
      if(first){
        const name=first.name||'';
        const words=name.split(/\s+/);const lines=[''];
        for(const word of words){
          const last=lines.length-1;
          const joined=(lines[last]+' '+word).trim();
          if(joined.length<=25){lines[last]=joined;}
          else if(lines.length<2){lines.push(word);}
          else{lines[last]=clipped(lines[last],24);break;}
        }
        if(lines.length===1)svgLine(lines[0],468,'archive-wheel-center-svg-event',10);
        else{svgLine(lines[0],461,'archive-wheel-center-svg-event',10);svgLine(lines[1],474,'archive-wheel-center-svg-event',10);}
        centerGroup.append(svgEl('title',{},name));
      }
    }
    svg.append(centerGroup);
    $('selectionSummary').replaceChildren();
    $('ringBack').disabled=ringHistory.length===0;
    $('ringReset').disabled=ringHistory.length===0 && selections.length===0;
  }

  function renderSideCoverage(selectedRows) {
    const host=$('selectionBreakdown'); if(!host)return;
    host.replaceChildren();
    const heading=$('selectionHeading');
    const hasRegion=Boolean(region||$('place').value);
    const hasCategory=Boolean($('discipline').value);
    const hasTime=Boolean(month||$('year').value);
    const scope=hasRegion?(region||$('place').value):'All regions';
    heading.textContent=hasRegion?scope:(hasCategory||hasTime?'Within this selection':'Regional coverage');
    const key=hasRegion?'category':'region';
    const label=hasRegion?'Subjects represented':'Records by region';
    const counts=[...totals(selectedRows,key)].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    host.append(el('p',label,'selection-breakdown-label'));
    if(!counts.length){host.append(el('p','No matching records.','selection-breakdown-empty'));return;}
    const max=Math.max(1,...counts.map(([,n])=>n));
    for(const [name,n] of counts.slice(0,8)){
      const line=el('div',null,'selection-breakdown-row');
      const caption=el('div',null,'selection-breakdown-caption');
      caption.append(el('span',hasRegion?(shortNames[name]||name):name),el('strong',String(n)));
      const track=el('div',null,'selection-breakdown-track');
      const bar=el('span',null,'selection-breakdown-bar');
      bar.style.width=(n/max*100)+'%';track.append(bar);
      line.append(caption,track);host.append(line);
    }
    if(counts.length>8)host.append(el('p','+'+(counts.length-8)+' additional subjects','selection-breakdown-empty'));
    host.append(el('p','Based on this archive, not a measure of all design activity.','selection-breakdown-note'));
  }
  function render() {
    const rows=filtered();$('count').textContent=`${rows.length} of ${records.length} archived ${records.length===1?'record':'records'}`;
    $('results').replaceChildren(...rows.slice(0,limit).map(recordNode));
    if(!rows.length)$('results').append(el('p',records.length?'No records match these filters. Try another place, year or subject.':'There are no archived event records yet. Current and upcoming listings remain in the Events Calendar.'));
    $('more').hidden=rows.length<=limit;
    renderWheel(rows);
    // The wheel center reflects this exact same selection as the List.

  }
  ['search','place','discipline','year'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{ringHistory=[];limit=40;render();}));
  $('clear').onclick=clearAll;
  $('ringReset').onclick=clearAll;
  $('ringBack').onclick=()=>{
    const previous=ringHistory.pop();
    if(!previous)return;
    region=previous.region;
    $('discipline').value=previous.discipline;
    month=previous.month;
    limit=40;
    render();
  };
  $('more').onclick=()=>{limit+=40;render();};
  function view(atlas) {
    $('visual').hidden=!atlas;
    $('archiveList').hidden=atlas;
    [document.querySelector('.archive-toolbar'), document.querySelector('.archive-controls')].forEach(node=>{
      node.hidden=atlas;
      node.setAttribute('aria-hidden',String(atlas));
    });
    $('atlasView').setAttribute('aria-pressed',String(atlas));
    $('listView').setAttribute('aria-pressed',String(!atlas));
  }
  $('atlasView').onclick=()=>view(true);
  $('listView').onclick=()=>view(false);
  document.querySelector('.records-jump').addEventListener('click',event=>{
    event.preventDefault();
    view(false);
    $('archiveList').scrollIntoView({behavior:'smooth',block:'start'});
  });
  fetch('../data/events-archive.csv',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('Archive unavailable');return r.text();}).then(text=>{
    records=parseCSV(text).sort((a,b)=>(b.start_date||'').localeCompare(a.start_date||'')||a.name.localeCompare(b.name));
    [['place','country'],['discipline','category'],['year',yearOf]].forEach(([id,key])=>{[...totals(records,key).keys()].sort().forEach(v=>{const o=el('option',v);o.value=v;$(id).append(o);});$(id).disabled=!records.length;});
    if(!records.length){$('notice').hidden=false;$('notice').textContent='The archive is ready for its first records. As listings pass their recorded end dates, the regular archive update will preserve them here. No past events have been added simply to fill the map.';}
    render();
  }).catch(()=>{$('count').textContent='Archive unavailable';$('notice').hidden=false;$('notice').textContent='The archive could not be loaded. Please reload this page, or return to the Events Calendar.';$('visual').hidden=true;});
})();
