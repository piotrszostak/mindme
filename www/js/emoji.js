/* Okienko wyboru emoji. */
/* ---- emoji: okienko z kategoriami i ostatnio użytymi ---- */
const EMO={'Buźki':'😀 😃 😄 😁 😆 😅 😂 🙂 😉 😊 😇 😍 🤩 😘 😎 🤓 🤔 🤨 😐 🙄 😴 😮 😲 😬 😢 😭 😡 🤯 🥳 🤗 🥺 😷',
 'Gesty':'👍 👎 👌 ✌️ 🤞 👏 🙌 🙏 💪 👀 🧠 👋 ✋ 👉 👈 👆 👇 🤝 🫶 ✍️ 🧑‍💻 👥 🏃 🧘',
 'Symbole':'✅ ☑️ ❌ ❗ ❓ ⚠️ ⛔ 🚫 ⭐ 🌟 ✨ 💡 🔥 ❤️ 💔 💯 🎯 🔑 🔒 🔔 📌 📍 🏷️ ➕ ➖ ➡️ ⬅️ ⬆️ ⬇️ 🔁 ⏳ ⏰ 🆕 🆗 🔴 🟠 🟡 🟢 🔵 🟣',
 'Praca':'📁 📂 📄 📝 📋 📅 🗓️ 📊 📈 📉 💼 🗂️ 🖊️ ✏️ 📎 🔍 💻 🖥️ 📱 ☎️ ✉️ 📧 💬 🗣️ 🧩 🛠️ ⚙️ 🧪 🚀 🏁 🧾',
 'Natura':'🌱 🌳 🌸 🌻 🍀 🌍 ☀️ 🌙 ☁️ ⛈️ ❄️ 🌈 🌊 🐶 🐱 🐞 🦋 🐝 🍎 🍋 🍕 ☕ 🍰 🥗',
 'Rzeczy':'🏠 🏢 🚗 ✈️ 🚲 🎵 🎨 📚 🎓 🏆 🎁 💰 💳 🛒 🧳 ⚽ 🎮 🏥 💊 🧹 🔧 🔋 📷 🎬'};
let emoOpen=false,emoTab='',emoRecent=[];try{emoRecent=JSON.parse(localStorage.getItem('mm.emo')||'[]')}catch(e){}
function drawEmoji(){const cats=(emoRecent.length?['Ostatnie']:[]).concat(Object.keys(EMO));if(!cats.includes(emoTab))emoTab=cats[0];
 const list=emoTab==='Ostatnie'?emoRecent:EMO[emoTab].split(' ');
 $('emo').innerHTML=`<div class="tabs">${cats.map(c=>`<button type="button" data-tab="${c}" title="${c}"${c===emoTab?' class="on"':''}>${c==='Ostatnie'?'🕘':EMO[c].split(' ')[0]}</button>`).join('')}</div>`+
  `<div class="cap">${c2(emoTab)}</div><div class="grid">${list.map(e=>`<button type="button" data-e="${e}">${e}</button>`).join('')}</div>`}
const c2=t=>t==='Ostatnie'?'Ostatnio użyte':t;
function openEmoji(x,y){closeMenu();const m=$('emo');if(emoRecent.length)emoTab='Ostatnie';drawEmoji();  /* otwiera się na ostatnio użytych */
 m.classList.add('open');emoOpen=true;const r=m.getBoundingClientRect();
 m.style.left=Math.max(4,Math.min(x,innerWidth-r.width-4))+'px';m.style.top=Math.max(4,Math.min(y,innerHeight-r.height-4))+'px'}
function closeEmoji(){if(!emoOpen)return;emoOpen=false;$('emo').classList.remove('open')}
/* w edycji: w miejscu kursora; poza edycją: na początku tekstu zaznaczonego węzła */
function insertEmoji(em){emoRecent=[em].concat(emoRecent.filter(x=>x!==em)).slice(0,16);try{localStorage.setItem('mm.emo',JSON.stringify(emoRecent))}catch(e){}
 closeEmoji();
 if(editing){const e=$('ed');e.focus();e.setRangeText(em,e.selectionStart,e.selectionEnd,'end');e.dispatchEvent(new Event('input'));return}
 const f=need();if(!f)return;snap();f.n.text=(f.n.text?f.n.text+' ':'')+em;changed();info('dodano emoji')}
['pointerdown','mousedown'].forEach(t=>{$('emo').addEventListener(t,e=>e.preventDefault());$('edemo').addEventListener(t,e=>e.preventDefault())}); /* nie zabieraj fokusu polu edycji */
$('emo').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.tab){emoTab=t.dataset.tab;return drawEmoji()}insertEmoji(t.dataset.e)});
$('edemo').addEventListener('click',()=>{if(emoOpen)return closeEmoji();const r=$('edemo').getBoundingClientRect();openEmoji(r.left,r.bottom+4)});
