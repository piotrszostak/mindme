/* Start: górny pasek, wczytanie zapisanej mapy, pierwszy render. */
buildHelp();buildSide();
/* ---- górny pasek: tylko ikony + objaśnienia ---- */
document.querySelectorAll('[data-ic]').forEach(b=>{b.innerHTML=icon(b.dataset.ic);b.setAttribute('aria-label',b.dataset.tip)});
const below=b=>{const r=b.getBoundingClientRect();return[r.left,r.bottom+4]};
$('bp').onclick=toggleSide;$('bu').onclick=undo;$('br').onclick=redo;$('bf').onclick=fitView;$('bt').onclick=toggleText;
$('bl').onclick=e=>{const[x,y]=below(e.currentTarget);openMenu(Object.keys(LAY).map(d=>({ic:LAY[d][0],t:'Układ '+LAY[d][1],f:()=>setLayout(d),on:dir===d,id:'lay-'+d})),x,y)};
$('bm').onclick=e=>{const[x,y]=below(e.currentTarget);moreMenu(x,y)};
try{const th=localStorage.getItem('mm.theme');if(th)document.documentElement.dataset.theme=th}catch(e){}
try{const s=localStorage.getItem('mm.md');if(s){root=parse(s);sel=first().id}}catch(e){}
syncLayout();syncText();
window.addEventListener('resize',()=>{closeMenu();closeEmoji();render()});render();
info(selfTest()?'round-trip OK · ? = pomoc':'round-trip BŁĄD');hint(matchMedia('(hover: none)').matches?'przytrzymaj węzeł – menu · przytrzymaj tło – odznacz · stuknij 2× – edytuj':'dwuklik – edytuj · PPM – menu · przeciągnij węzeł – przenieś');
