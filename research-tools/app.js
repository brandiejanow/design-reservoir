const els={search:document.querySelector("#search"),workflow:document.querySelector("#workflow"),groups:document.querySelector("#groups"),count:document.querySelector("#resultCount"),empty:document.querySelector("#empty"),clear:document.querySelector("#clear"),total:document.querySelector("#total")};
let rows=[];
const ORDER=["Discover & map literature","Evaluate & screen evidence","Write & manage references","Qualitative & field research","Analyze & visualize data","Publish & collaborate","Other research tools"];
function csv(t){const out=[];let row=[],v="",q=false;for(let i=0;i<t.length;i++){const c=t[i],n=t[i+1];if(q){if(c==='"'&&n==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c}else if(c==='"')q=true;else if(c===','){row.push(v);v=""}else if(c==='\n'){row.push(v);out.push(row);row=[];v=""}else if(c!=='\r')v+=c}}if(row.length||v){row.push(v);out.push(row)}return out}
function records(t){const arr=csv(t),header=arr.shift();return arr.filter(r=>r[0]).map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]||""])))}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function render(){
 const q=els.search.value.trim().toLowerCase(),work=els.workflow.value;
 const found=rows.filter(r=>(!q||[r.name,r.description,r.industries,r.keywords,r.workflow].join(" ").toLowerCase().includes(q))&&(!work||r.workflow===work));
 els.count.textContent=found.length+" of "+rows.length+" curated research tools";
 els.empty.hidden=found.length>0;
 els.groups.innerHTML=ORDER.filter(stage=>found.some(r=>r.workflow===stage)).map(stage=>'<section class="workflow-group"><h2 class="workflow-heading">'+esc(stage)+'</h2><div class="resource-list">'+found.filter(r=>r.workflow===stage).map(r=>'<article class="resource"><h3>'+esc(r.name)+'</h3><p class="description">'+esc(r.description)+'</p><div class="taxonomy"><span>'+esc(r.industries)+'</span><span>Reviewed '+esc(r.last_checked)+'</span></div><a class="visit" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer" aria-label="Visit '+esc(r.name)+'">↗</a></article>').join("")+'</div></section>').join("");
}
Promise.all([fetch("../data/resources.csv",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Research records unavailable");return r.text()}),fetch("../data/research-tool-workflows.csv",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Workflow classifications unavailable");return r.text()})]).then(([a,b])=>{
 const stages=new Map(records(b).map(r=>[r.name,r.workflow]));
 rows=records(a).filter(r=>r.resource_type==="Research Tool").map(r=>({...r,workflow:stages.get(r.name)||"Other research tools"})).sort((x,y)=>x.name.localeCompare(y.name));
 for(const stage of ORDER){if(rows.some(r=>r.workflow===stage)){const option=document.createElement("option");option.value=stage;option.textContent=stage;els.workflow.appendChild(option)}}
 els.total.textContent=rows.length;render();
}).catch(e=>{els.count.textContent=e.message;els.empty.hidden=true});
els.search.addEventListener("input",render);
els.workflow.addEventListener("change",render);
els.clear.addEventListener("click",()=>{els.search.value="";els.workflow.value="";render();els.search.focus()});
