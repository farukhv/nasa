// Builds sunum/index.html: a standalone, offline copy of the jury deck (arrow keys / click to navigate, N = notes).
import fs from 'node:fs';
const here = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DECK = here + 'deck/project';
const src = fs.readFileSync(here + 'preview.mjs', 'utf8');
const map = {};
for (const m of src.matchAll(/'([0-9a-f]{32})': (A|R) \+ '([^']+)'/g)) map[m[1]] = (m[2] === 'A' ? 'assets' : '../data/public/pov/rover') + m[3];
for (const m of src.matchAll(/"([0-9a-f]{32})": here [+] "([^"]+)"/g)) map[m[1]] = m[2];
const deck = JSON.parse(fs.readFileSync(DECK + '/deck.json', 'utf8'));
const css = fs.readFileSync(DECK + '/deck.css', 'utf8');
let body = '', missing = new Set();
for (const id of deck.order) {
  let h = fs.readFileSync(`${DECK}/slides/${id}.html`, 'utf8');
  h = h.replace(/\/_blob\/([0-9a-f]{32})/g, (m, k) => { if (!map[k]) missing.add(k); return map[k] ?? m; });
  h = h.replace(/<x-shape kind="arrow-down" style="([^"]*)"><\/x-shape>/g, '<div style="$1; clip-path:polygon(30% 0,70% 0,70% 55%,100% 55%,50% 100%,0 55%,30% 55%)"></div>');
  body += h + '\n';
}
const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${deck.title}</title>
<link rel="stylesheet" href="${deck.faces.fraunces.href}">
<style>
@font-face{font-family:Fraunces;src:url(fonts/Fraunces.ttf);font-weight:300 700;font-style:normal}@font-face{font-family:Fraunces;src:url(fonts/Fraunces-Italic.ttf);font-weight:300 700;font-style:italic}@font-face{font-family:Archivo;src:url(fonts/Archivo.ttf);font-weight:400 600}@font-face{font-family:"Archivo Narrow";src:url(fonts/ArchivoNarrow.ttf);font-weight:500 700}@font-face{font-family:"JetBrains Mono";src:url(fonts/JetBrainsMono.ttf);font-weight:400 700}
html,body{margin:0;height:100%;background:#1c1612;overflow:hidden}
#stage{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform-origin:0 0}
section{position:absolute;left:0;top:0;width:1920px;height:1080px;box-sizing:border-box;overflow:hidden;visibility:hidden}
section.cur{visibility:visible}
section > *{position:relative}
section > .bleed, section > .scrim, section > .scrim-b, section > .strip, section > .pg, section > .src, section > svg{position:absolute}
h1,h2,h3,p{margin:0} table{border-collapse:collapse}
aside{display:none;position:absolute !important;left:0;right:0;bottom:0;background:rgba(14,17,20,.94);color:#E8E2D6;font:24px/1.4 Inter,Arial,sans-serif;padding:18px 110px;border-top:2px solid #BE7850}
body.notes section.cur aside{display:block}
${css}
</style></head><body><div id="stage">${body}</div>
<script>
const S=[...document.querySelectorAll('section')];let i=Math.max(0,S.findIndex(s=>'#'+s.id===location.hash));
S.forEach(s=>{for(const c of s.children){const st=c.getAttribute('style')||'';if(/position:\s*absolute/.test(st))c.style.position='absolute';}});
function fit(){const k=Math.min(innerWidth/1920,innerHeight/1080);const st=document.getElementById('stage');st.style.transform='scale('+k+') translate(-50%,-50%)';}
function show(n){i=Math.max(0,Math.min(S.length-1,n));S.forEach((s,k)=>s.classList.toggle('cur',k===i));history.replaceState(null,'','#'+S[i].id);}
addEventListener('resize',fit);addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' ','Enter'].includes(e.key))show(i+1);else if(['ArrowLeft','PageUp','Backspace'].includes(e.key))show(i-1);else if(e.key==='Home')show(0);else if(e.key==='End')show(S.length-1);else if(e.key.toLowerCase()==='n')document.body.classList.toggle('notes');else if(e.key.toLowerCase()==='f')document.documentElement.requestFullscreen?.();});
addEventListener('click',e=>show(i+(e.clientX<innerWidth/3?-1:1)));fit();show(i);
</script></body></html>`;
fs.writeFileSync(here + 'index.html', html);
console.log('wrote sunum/index.html', (html.length / 1024).toFixed(0) + ' KB', 'slides', deck.order.length, 'missing', [...missing]);
