const params=new URLSearchParams(location.search);if(params.get("embed")==="1")document.body.classList.add("embed");
const els={search:document.querySelector("#search"),list:document.querySelector("#list"),count:document.querySelector("#resultCount"),empty:document.querySelector("#empty"),clear:document.querySelector("#clear")};let rows=[];
function parseCSV(text){const out=[];let row=[],cell="",q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(q){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"'){q=false}else cell+=c}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell=""}else if(c==='\n'){row.push(cell);out.push(row);row=[];cell=""}else if(c!=='\r')cell+=c}}if(cell.length||row.length){row.push(cell);out.push(row)}return out}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function render(){const q=els.search.value.trim().toLowerCase();const filtered=rows.filter(r=>!q||Object.values(r).join(" ").toLowerCase().includes(q));els.list.innerHTML=filtered.map(r=>`<article class="resource method-row"><div><span class="method-id">${esc(r.method_id)}</span><h2>${esc(r.method)}</h2></div><p>${esc(r.what_it_does)}</p><div class="method-meta"><span><strong>Best used for</strong><br>${esc(r.best_used_for)}</span><span><strong>KoD application</strong><br>${esc(r.kod_application)}</span><span><strong>Caution</strong><br>${esc(r.caution)}</span></div></article>`).join("");els.count.textContent=`${filtered.length} matching methods`;els.empty.hidden=filtered.length!==0}
fetch("../data/futures-methods.csv",{cache:"no-store"}).then(r=>r.text()).then(t=>{const p=parseCSV(t),h=p.shift();rows=p.filter(r=>r[0]).map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]||""])));render()});els.search.addEventListener("input",render);els.clear.addEventListener("click",()=>{els.search.value="";render();els.search.focus()});
const sourceList=document.querySelector("#sourceList"),sourceCount=document.querySelector("#sourceCount");
fetch("../data/resources.csv?v=20261017a",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Could not load academic resources");return r.text()}).then(t=>{
 const parsed=parseCSV(t),header=parsed.shift();
 const candidates=parsed.filter(row=>row[0]).map(row=>Object.fromEntries(header.map((h,i)=>[h,row[i]||""])));
 const sources=candidates.filter(r=>{
  const key=[r.keywords,r.industries,r.name].join(" ").toLowerCase();
  return /futur|foresight|steam|stemm|open science|complexity science|interdisciplinary research|arts integration|horizon scanning|art-science|stem education/.test(key);
 }).sort((a,b)=>a.name.localeCompare(b.name));
 sourceList.innerHTML=sources.map(r=>'<article class="resource"><h2>'+esc(r.name)+'</h2><p class="description">'+esc(r.description)+'</p><div class="taxonomy"><span><strong>'+esc(r.resource_type)+'</strong></span><span>'+esc(r.industries)+'</span></div><a class="visit" target="_blank" rel="noopener noreferrer" href="'+esc(r.url)+'" aria-label="Visit '+esc(r.name)+'">↗</a></article>').join("");
 sourceCount.textContent=sources.length+" curated research sources";
}).catch(e=>{sourceCount.textContent=e.message});
