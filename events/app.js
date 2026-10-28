const params=new URLSearchParams(location.search);
const els={search:document.querySelector("#search"),year:document.querySelector("#year"),category:document.querySelector("#category"),region:document.querySelector("#region"),list:document.querySelector("#list"),count:document.querySelector("#resultCount"),empty:document.querySelector("#empty"),total:document.querySelector("#total"),clear:document.querySelector("#clear"),weekSection:document.querySelector("#weekSection"),weeksList:document.querySelector("#weeksList"),weekCount:document.querySelector("#weekCount")};
let rows=[],weeks=[],todayISO=todayLocalISO();
function parseCSV(text){const out=[];let row=[],cell="",q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(q){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"'){q=false}else cell+=c}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell=""}else if(c==='\n'){row.push(cell);out.push(row);row=[];cell=""}else if(c!=='\r')cell+=c}}if(cell.length||row.length){row.push(cell);out.push(row)}return out}
function records(text){const parsed=parseCSV(text),head=parsed.shift();return parsed.filter(x=>x[0]).map(x=>Object.fromEntries(head.map((h,i)=>[h,x[i]||""])))}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function todayLocalISO(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function dt(s){return new Date(s+"T12:00:00Z")}
function month(s){return dt(s).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"})}
function opt(el,v){if(!v||[...el.options].some(o=>o.value===v))return;const o=document.createElement("option");o.value=v;o.textContent=v;el.appendChild(o)}
function populate(){[...new Set(rows.map(r=>r.start_date.slice(0,4)))].sort().forEach(x=>opt(els.year,x));[...new Set([...rows.map(r=>r.category),"Design Week"])].sort().forEach(x=>opt(els.category,x));[...new Set([...rows.map(r=>r.region),...weeks.map(w=>w.region)])].sort().forEach(x=>opt(els.region,x))}
function entry(r){const ongoing=r.start_date<todayISO;const day=ongoing?"Now":dt(r.start_date).toLocaleDateString("en-US",{day:"numeric",timeZone:"UTC"});const end=(r.end_date||r.start_date)===r.start_date?"":dt(r.end_date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:ongoing?"numeric":undefined,timeZone:"UTC"});return '<article class="event-entry"><div class="event-day"><strong>'+esc(day)+'</strong><span>'+esc(ongoing?"through "+end:end?"to "+end:"one day")+'</span></div><div><h3 class="event-name">'+esc(r.name)+'</h3><p class="event-place">'+esc(r.city+(r.city==="Online"||r.country==="Online"?"":", "+r.country))+'</p></div><div class="event-detail"><p class="event-type">'+esc(r.category)+'</p><p class="event-desc">'+esc(r.description)+'</p><p class="event-source">Source: '+esc(r.source)+'</p></div><a class="event-link" target="_blank" rel="noopener noreferrer" href="'+esc(r.url)+'" aria-label="Event details: '+esc(r.name)+'">↗</a></article>'}
function displayWeekEdition(w){
 const e=w.edition||"Dates to be confirmed";
 const parts=e.split(";").map(p=>p.trim()).filter(Boolean);
 if(parts.length<2)return e;
 const visible=parts.filter(p=>upcomingWeek({edition:p})||(/dates to be confirmed/i.test(p)&&!/\b20\d{2}\b/.test(p)));
 return visible.length?visible.join("; "):e;
}
function weekCard(w){return '<article class="week-card"><div><h3>'+esc(w.name)+'</h3><p>'+esc(w.city+", "+w.country)+'</p><p class="week-edition">'+esc(displayWeekEdition(w))+'</p></div><a target="_blank" rel="noopener noreferrer" href="'+esc(w.url)+'" aria-label="Visit '+esc(w.name)+'">↗</a></article>'}
function weekPriority(w){return ["Texas Design Week","Dallas Design Week","Nashville Design Week"].indexOf(w.name)}
// The Events Calendar lists only current and forthcoming editions.
// Permanent platforms, completed editions and undated programs belong in the Design Weeks Index.
function upcomingWeek(w){
 const e=w.edition||"";
 // A concluded edition is not an upcoming event, even if related exhibitions carry on.
 if(/\b(concluded|completed)\b/i.test(e)&&!/\bupcoming\b/i.test(e))return false;
 const year=Number(todayISO.slice(0,4)),month=Number(todayISO.slice(5,7)),day=Number(todayISO.slice(8,10));
 if(/\b20\d{2}\b/.test(e) && [...e.matchAll(/\b20\d{2}\b/g)].some(m=>Number(m[0])>year))return true;
 if(!e.includes(String(year)))return false;
 const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
 for(const match of e.matchAll(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi)){
  const index=months.findIndex(m=>m.toLowerCase()===match[0].toLowerCase())+1;
  const after=e.slice(match.index+match[0].length,match.index+match[0].length+8);
  const before=e.slice(Math.max(0,match.index-16),match.index);
  if(!after.includes(String(year))&&!before.includes(String(year)))continue;
  if(index>month)return true;
  if(index!==month)continue;
  const days=before.match(/(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?\s*$/);
  if(days && Number(days[2]||days[1])>=day)return true;
 }
 return false;
}
function render(){
 const q=els.search.value.trim().toLowerCase(),year=els.year.value,cat=els.category.value,region=els.region.value;
 const found=rows.filter(r=>(!q||[r.name,r.city,r.country,r.category,r.description,r.keywords].join(" ").toLowerCase().includes(q))&&(!year||r.start_date.startsWith(year))&&(!cat||r.category===cat)&&(!region||r.region===region));
 const matchingWeeks=weeks.filter(w=>(!q||[w.name,w.city,w.country,w.description,w.keywords,w.industries].join(" ").toLowerCase().includes(q))&&!year&&(!cat||cat==="Design Week")&&(!region||w.region===region))
 .sort((a,b)=>{const x=weekPriority(a),y=weekPriority(b);return (x<0?999:x)-(y<0?999:y)||a.name.localeCompare(b.name)});
 const groups=new Map();found.forEach(r=>{const m=r.start_date<todayISO?"Happening now":month(r.start_date);if(!groups.has(m))groups.set(m,[]);groups.get(m).push(r)});
 els.list.innerHTML=[...groups].map(([m,items])=>'<section class="month-group"><h2 class="month-title">'+esc(m)+'</h2>'+items.map(entry).join("")+'</section>').join("");
 els.weeksList.innerHTML=matchingWeeks.map(weekCard).join("");
 els.weekCount.textContent=matchingWeeks.length+" design weeks and festivals";
 els.weekSection.hidden=matchingWeeks.length===0;
 els.count.textContent=found.length+" dated events + "+matchingWeeks.length+" design weeks and festivals";
 els.empty.hidden=found.length+matchingWeeks.length!==0;
}
Promise.all([
 fetch("../data/events.csv?v=20261028cleanevents",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Could not load events");return r.text()}),
 fetch("../data/design-weeks.csv?v=20261028cleanevents",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Could not load design weeks");return r.text()})
]).then(([eventText,weekText])=>{
 todayISO=todayLocalISO();
 rows=records(eventText).filter(r=>r.start_date&&(r.end_date||r.start_date)>=todayISO).sort((a,b)=>a.start_date.localeCompare(b.start_date)||a.name.localeCompare(b.name));
 weeks=records(weekText).filter(upcomingWeek);
 els.total.textContent=rows.length+weeks.length;
 populate();
 for(const k of ["year","category","region"]){const v=params.get(k);if(v&&[...els[k].options].some(o=>o.value===v))els[k].value=v}
 const query=params.get("q");if(query)els.search.value=query;
 render();
}).catch(e=>{els.count.textContent=e.message});
[els.search,els.year,els.category,els.region].forEach(el=>el.addEventListener("input",render));
els.clear.addEventListener("click",()=>{els.search.value="";els.year.value="";els.category.value="";els.region.value="";render();els.search.focus()});