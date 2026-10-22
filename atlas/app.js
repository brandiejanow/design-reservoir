const params=new URLSearchParams(location.search);if(params.get("embed")==="1")document.body.classList.add("embed");
const els={search:document.querySelector("#search"),family:document.querySelector("#family"),groups:document.querySelector("#groups"),count:document.querySelector("#resultCount"),empty:document.querySelector("#empty"),clear:document.querySelector("#clear"),total:document.querySelector("#total"),familyCount:document.querySelector("#familyCount"),disciplineCount:document.querySelector("#disciplineCount")};let rows=[],resourceRows=[],eventRows=[];
function parseCSV(text){const out=[];let row=[],cell="",q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(q){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"'){q=false}else cell+=c}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell=""}else if(c==='\n'){row.push(cell);out.push(row);row=[];cell=""}else if(c!=='\r')cell+=c}}if(cell.length||row.length){row.push(cell);out.push(row)}return out}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function unique(a){return[...new Set(a)].sort((a,b)=>a.localeCompare(b))}
function populate(){unique(rows.map(r=>r.family)).forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;els.family.appendChild(o)})}

function sourceHits(d){const term=d.toLowerCase();return resourceRows.filter(r=>r.search.includes(term)).length}
function eventHits(d){const term=d.toLowerCase();return eventRows.filter(r=>r.search.includes(term)).length}
function familyIndustry(f){return f==="Speculative, Critical & Futures"?"Futures & Foresight":f}
function disciplineCard(r){
 const label=esc(r.discipline),term=encodeURIComponent(r.discipline);
 const resources=sourceHits(r.discipline),events=eventHits(r.discipline);
 const links=[];
 if(resources)links.push('<a href="../?q='+term+'" aria-label="Find resources for '+label+'">Resources ('+resources+')</a>');
 if(events)links.push('<a href="../events/?q='+term+'" aria-label="Find events for '+label+'">Events ('+events+')</a>');
 return '<div class="discipline"><span>'+label+'</span>'+(links.length?'<span class="discipline-links">'+links.join("")+'</span>':"")+'</div>';
}
function render(){
 const q=els.search.value.trim().toLowerCase(),f=els.family.value;
 const filtered=rows.filter(r=>(!q||r.discipline.toLowerCase().includes(q)||r.family.toLowerCase().includes(q))&&(!f||r.family===f));
 const families=unique(filtered.map(r=>r.family));
 els.groups.innerHTML=families.map(fam=>{
  const items=filtered.filter(r=>r.family===fam),resourceLink="../?industry="+encodeURIComponent(familyIndustry(fam));
  const linkedEvents=eventRows.some(r=>r.category===fam);
  const eventLink=linkedEvents?'<a href="../events/?category='+encodeURIComponent(fam)+'">Upcoming events ↗</a>':"";
  return '<section class="atlas-family"><div class="atlas-family-heading"><h2>'+esc(fam)+'</h2><div class="atlas-family-links"><a href="'+resourceLink+'">Explore resources ↗</a>'+eventLink+'</div></div><div class="discipline-grid">'+items.map(disciplineCard).join("")+'</div></section>';
 }).join("");
 els.count.textContent=filtered.length+" of "+rows.length+" classified entries";
 els.empty.hidden=filtered.length!==0;
}
function csvRecords(t){const data=parseCSV(t),head=data.shift();return data.filter(r=>r[0]).map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]||""])))}

fetch("../data/design-atlas.csv",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Unable to load Design Atlas");return r.text()}).then(async t=>{
 rows=csvRecords(t);
 els.familyCount.textContent=unique(rows.map(r=>r.family)).length;
 els.disciplineCount.textContent=rows.length;
 const files=await Promise.allSettled([
  fetch("../data/resources.csv?v=20261022atlaslinks",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("resources");return r.text()}),
  fetch("../data/events.csv?v=20261022atlaslinks",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("events");return r.text()})
 ]);
 if(files[0].status==="fulfilled")resourceRows=csvRecords(files[0].value).map(r=>({search:[r.name,r.description,r.keywords].join(" ").toLowerCase()}));
 if(files[1].status==="fulfilled"){
  const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
  eventRows=csvRecords(files[1].value).filter(r=>(r.end_date||r.start_date)>=today).map(r=>({search:[r.name,r.description,r.keywords].join(" ").toLowerCase(),category:r.category}));
 }
 populate();
 render();
}).catch(e=>{els.count.textContent=e.message});
[els.search,els.family].forEach(e=>e.addEventListener("input",render));
els.clear.addEventListener("click",()=>{els.search.value="";els.family.value="";render();els.search.focus()});
