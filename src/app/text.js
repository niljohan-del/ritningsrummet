/* textobjekt och typografi */
function textFormat(o,p=page()){return{size:o?(o.fontSize||18*unit(p))/unit(p):style.font,family:o?(o.fontFamily||'segoe'):(style.fontFamily||'segoe'),bold:o?!!o.fontBold:!!style.fontBold,italic:o?!!o.fontItalic:!!style.fontItalic,underline:o?!!o.fontUnderline:!!style.fontUnderline};}
function textFields(f,p=page()){return{fontSize:f.size*unit(p),fontFamily:f.family,fontBold:f.bold,fontItalic:f.italic,fontUnderline:f.underline};}
function fontFamilyCSS(id){return(TEXT_FONTS.find(f=>f.id===id)||TEXT_FONTS[0]).css;}
function canvasTextFont(o,p=page()){return`${o.fontItalic?'italic':'normal'} ${o.fontBold?'700':'400'} ${(o.fontSize||18*unit(p))*pageAppearance(p).text}px ${fontFamilyCSS(o.fontFamily)}`;}
function textFormatPanel(prefix,f){return `<div class="text-format"><div class="row">${field('Textstorlek',prefix+'Size',Math.round(f.size*100)/100,'number','min="6" max="200" step="1"')}<label class="field"><span>Teckensnitt</span><select id="${prefix}Family">${TEXT_FONTS.map(font=>`<option value="${font.id}" ${font.id===f.family?'selected':''}>${font.name}</option>`).join('')}</select></label></div><div class="text-style-buttons" role="group" aria-label="Textstil">${[['bold','Fet','F'],['italic','Kursiv','K'],['underline','Understruken','U']].map(([key,label,letter])=>`<button type="button" id="${prefix}${key}" class="text-${key} ${f[key]?'active':''}" title="${label}" aria-label="${label}" aria-pressed="${f[key]}">${letter}</button>`).join('')}</div></div>`;}
function previewTextFormat(id,f){const el=$(id);if(!el)return;el.style.fontFamily=fontFamilyCSS(f.family);el.style.fontSize=f.size+'px';el.style.fontWeight=f.bold?'700':'400';el.style.fontStyle=f.italic?'italic':'normal';el.style.textDecoration=f.underline?'underline':'none';}
function bindTextFormat(prefix,format,commit,locked=false,previewId=null){let current={...format};const apply=next=>{if(locked)return;current=next;commit({...current});if(previewId)previewTextFormat(previewId,current);};
 const size=$(prefix+'Size'),family=$(prefix+'Family');size.disabled=family.disabled=locked;
 size.onchange=()=>{const n=number(size.value);if(!Number.isFinite(n)||n<6||n>200){toast('Välj textstorlek mellan 6 och 200.');size.value=current.size;return;}apply({...current,size:n});};
 family.onchange=()=>apply({...current,family:family.value});
 for(const key of ['bold','italic','underline']){const button=$(prefix+key);button.disabled=locked;button.onclick=()=>{if(locked)return;const next={...current,[key]:!current[key]};button.classList.toggle('active',next[key]);button.setAttribute('aria-pressed',String(next[key]));apply(next);};}
 if(previewId)previewTextFormat(previewId,current);
}

const canvas=$('drawing'),ctx=canvas.getContext('2d');
