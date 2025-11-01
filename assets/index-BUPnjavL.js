(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))r(t);new MutationObserver(t=>{for(const s of t)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function o(t){const s={};return t.integrity&&(s.integrity=t.integrity),t.referrerPolicy&&(s.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?s.credentials="include":t.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(t){if(t.ep)return;t.ep=!0;const s=o(t);fetch(t.href,s)}})();const m={primary:"https://watchlockai-intel-api.craig-glatt.workers.dev",fallback:"./data/demo/unified-threats.sample.json"},h=6e4;let d="executive",a=60,c=null;async function w(){C(),await p(),L()}function C(){document.getElementById("viewToggle").addEventListener("click",$)}function $(){d=d==="executive"?"analyst":"executive",document.getElementById("currentView").textContent=d==="executive"?"Executive":"Analyst";const e=document.getElementById("topThreatsSection"),n=document.getElementById("allThreatsSection");d==="executive"?(e.style.display="block",n.style.display="none"):(e.style.display="none",n.style.display="block"),u()}async function p(){l("loading","Fetching threats...");try{const e=await fetch(`${m.primary}/api/top?limit=20`);if(!e.ok)throw new Error(`API returned ${e.status}`);c=await e.json(),l("success","Connected"),u(),g()}catch(e){console.warn("Primary API failed, trying fallback:",e.message);try{c=await(await fetch(m.fallback)).json(),l("fallback","Using demo data"),u(),g()}catch(n){console.error("Fallback also failed:",n),l("error","Failed to load data"),b()}}}function l(e,n){const o=document.getElementById("statusDot"),r=document.getElementById("statusText");o.className="status-dot",e==="error"&&o.classList.add("error"),r.textContent=n}function u(){!c||!c.items||(d==="executive"?E():T())}function E(){const e=document.getElementById("topThreatsContainer"),n=c.items.slice(0,10);e.innerHTML=n.map(o=>I(o)).join("")}function I(e){const n=e.severity.toLowerCase(),o=e.badges||[],r=e.sources||[e.source],t=e.sourceCount||r.length;return`
    <div class="threat-card ${n}" onclick="window.open('${e.link}', '_blank')">
      <div class="threat-header">
        <div class="threat-score ${n}">${e.riskScore||e.severity_score||0}</div>
        <div class="threat-severity ${n}">${e.severity}</div>
      </div>
      
      <div class="threat-title">${y(e.title)}</div>
      
      <div class="threat-meta">
        <div class="meta-chip">
          📊 Reported by ${t} source${t>1?"s":""}
        </div>
        <div class="meta-chip">
          📅 ${v(e.pubDate||e.first_seen)}
        </div>
      </div>
      
      ${o.length>0?`
        <div class="badges">
          ${o.map(s=>`
            <span class="badge ${s.toLowerCase().replace(/_/g,"-")}">${s}</span>
          `).join("")}
        </div>
      `:""}
    </div>
  `}function T(){const e=document.getElementById("threatsTableBody"),n=c.items;e.innerHTML=n.map(o=>{const r=o.severity.toLowerCase(),t=o.badges||[],s=o.sources||[o.source],i=o.sourceCount||s.length;return`
      <tr onclick="window.open('${o.link}', '_blank')" style="cursor: pointer;">
        <td><strong class="threat-score ${r}">${o.riskScore||0}</strong></td>
        <td><span class="threat-severity ${r}">${o.severity}</span></td>
        <td>${y(o.title)}</td>
        <td>${i}</td>
        <td>
          ${t.map(f=>`
            <span class="badge ${f.toLowerCase().replace(/_/g,"-")}">${f}</span>
          `).join(" ")}
        </td>
        <td>${v(o.pubDate||o.first_seen)}</td>
      </tr>
    `}).join("")}function g(){if(!c||!c.items)return;const e=c.items,n=e.filter(t=>t.severity==="CRITICAL").length,o=e.filter(t=>t.severity==="HIGH").length,r=e.filter(t=>(t.sourceCount||1)>1).length;document.getElementById("totalCount").textContent=e.length,document.getElementById("criticalCount").textContent=n,document.getElementById("highCount").textContent=o,document.getElementById("multiSourceCount").textContent=r,document.getElementById("lastUpdated").textContent=x(c.updated||new Date().toISOString())}function b(){const e=document.getElementById("topThreatsContainer");e.innerHTML=`
    <div style="padding: 40px; text-align: center; color: var(--text-muted);">
      <h3>⚠️ Unable to load threat data</h3>
      <p>Please check your connection and try again.</p>
    </div>
  `}function L(){setInterval(async()=>{await p(),a=60},h),setInterval(()=>{a--,a<0&&(a=60),document.getElementById("countdown").textContent=a},1e3)}function y(e){const n=document.createElement("div");return n.textContent=e,n.innerHTML}function v(e){const n=new Date(e),r=new Date-n,t=Math.floor(r/(1e3*60*60)),s=Math.floor(t/24);return t<1?"Just now":t<24?`${t}h ago`:s<7?`${s}d ago`:n.toLocaleDateString()}function x(e){return new Date(e).toLocaleTimeString()}document.addEventListener("DOMContentLoaded",w);
