/* all canvas-ritning */
function requestRender(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;draw();});}
function path(c,ps,close=false){if(!ps?.length)return;c.moveTo(ps[0].x,ps[0].y);for(let i=1;i<ps.length;i++)c.lineTo(ps[i].x,ps[i].y);if(close)c.closePath();}
function label(c,text,p,size,color='#17405e',bg=true){c.save();c.font=`550 ${size}px "Segoe UI",Arial,sans-serif`;c.textBaseline='middle';const w=c.measureText(text).width;if(bg){c.fillStyle='#fffffff0';c.fillRect(p.x-size*.3,p.y-size*.68,w+size*.6,size*1.36);}c.fillStyle=color;c.fillText(text,p.x,p.y);c.restore();}
function drawBase(c,p){c.save();c.fillStyle='#fff';c.fillRect(0,0,p.w,p.h);c.globalAlpha=p.baseOpacity??1;const cache=renderCache.get(p.id);if(p.cad){c.strokeStyle='#61717c';c.fillStyle='#465a68';c.lineWidth=unit(p)*.65;c.lineJoin='round';for(const s of p.cad.shapes){if(s.type==='text'){c.save();c.translate(s.points[0].x,s.points[0].y);c.rotate(s.angle||0);c.font=`${s.height}px Arial`;s.text.split('\n').forEach((t,i)=>c.fillText(t,0,i*s.height*1.2));c.restore();}else if(s.type==='point'){c.beginPath();c.arc(s.points[0].x,s.points[0].y,unit(p),0,RR.TAU);c.fill();}else{c.beginPath();path(c,s.points,s.closed);c.stroke();}}}else if(cache?.image)c.drawImage(cache.image,0,0,p.w,p.h);c.restore();}
function drawSweep(c,o,p,interactive){const sw=getSweep(o,p);if(!sw)return;const u=unit(p)*pageAppearance(p).line,tu=unit(p)*pageAppearance(p).text,color=sw.issues.length?'#d34a39':o.color||getLayer(o.layerId)?.color||'#2273cc';c.save();c.lineWidth=1*u;c.lineJoin='round';
 // A single nonzero path is filled once; overlapping poses do not darken the sweep.
 if(o.margin>0){c.beginPath();for(const f of sw.frames){path(c,f.buffer,true);if(f.units)for(const u of f.units)path(c,u.buffer,true);}c.fillStyle=color;c.globalAlpha*=.09;c.fill();c.globalAlpha/= .09;}
 c.beginPath();for(const f of sw.frames){path(c,f.body,true);if(f.units)for(const u of f.units)path(c,u.body,true);}c.fillStyle=color;c.globalAlpha*=.14;c.fill();c.globalAlpha/=.14;
 c.strokeStyle=color;c.lineWidth=.9*u;for(let k=0;k<4;k++){c.beginPath();path(c,sw.frames.map(f=>f.body[k]));c.stroke();}
 if(sw.units)for(let ui=0;ui<sw.units.length;ui++)for(let k=0;k<4;k++){c.beginPath();path(c,sw.frames.map(f=>f.units[ui].body[k]));c.stroke();}
 c.save();c.setLineDash([5*u,4*u]);for(const direction of [1,-1]){c.strokeStyle=direction>0?'#146cd4':'#d97513';c.beginPath();for(let i=1;i<sw.frames.length;i++){const a=sw.frames[i-1],b=sw.frames[i];if((b.direction||1)!==direction)continue;const pa=(o.pathModel==='rear-arcs'||o.drive?.control==='pilbil')?a.rear:a.front,pb=(o.pathModel==='rear-arcs'||o.drive?.control==='pilbil')?b.rear:b.front;c.moveTo(pa.x,pa.y);c.lineTo(pb.x,pb.y);}c.stroke();}c.setLineDash([2*u,3*u]);c.strokeStyle=(o.pathModel==='rear-arcs'||o.drive?.control==='pilbil')?'#728392':'#b33c46';c.beginPath();path(c,sw.frames.map(f=>(o.pathModel==='rear-arcs'||o.drive?.control==='pilbil')?f.front:f.rear));c.stroke();c.restore();
 // Direction arrows use actual movement; gear markers sit at stationary changes.
 if(o.drive||o.directions){let travel=0,gear=0;for(let i=1;i<sw.frames.length;i++){const prev=sw.frames[i-1],next=sw.frames[i],a={front:(o.pathModel==='rear-arcs'||o.drive?.control==='pilbil')?prev.rear:prev.front},b={front:(o.pathModel==='rear-arcs'||o.drive?.control==='pilbil')?next.rear:next.front},direction=next.direction||1;travel+=RR.dist(a.front,b.front);if(gear&&direction!==gear){label(c,direction<0?'BACK':'FRAM',{x:b.front.x+4*u,y:b.front.y+9*u},8*tu,direction<0?'#b15c08':'#146cd4');travel=0;}gear=direction;if(travel>45*unit(p)&&RR.dist(a.front,b.front)>1e-10){const angle=Math.atan2(b.front.y-a.front.y,b.front.x-a.front.x),q=b.front;c.save();c.translate(q.x,q.y);c.rotate(angle);c.strokeStyle=direction<0?'#d97513':'#146cd4';c.lineWidth=1.8*u;c.beginPath();path(c,[{x:-7*u,y:-4*u},{x:0,y:0},{x:-7*u,y:4*u}]);c.stroke();c.restore();travel=0;}}}
 if(sw.incomplete){c.save();c.strokeStyle='#d34a39';c.lineWidth=1.5*u;c.setLineDash([7*u,5*u]);c.beginPath();path(c,sw.problem?[sw.problem.from,sw.problem.target]:sw.path);c.stroke();c.restore();}
 const indices=[0,Math.min(sw.frames.length-1,Math.round(sw.frames.length*.33)),Math.min(sw.frames.length-1,Math.round(sw.frames.length*.67)),sw.frames.length-1];c.strokeStyle=color;c.globalAlpha*=.45;for(const i of indices){c.beginPath();path(c,sw.frames[i].body,true);c.stroke();}c.globalAlpha/=.45;
 const f=sw.frames[Math.round((sw.frames.length-1)*(o.frame??100)/100)];if(f){c.beginPath();path(c,f.body,true);c.fillStyle='#f6fbff';c.fill();c.lineWidth=1.8*u;c.stroke();c.beginPath();path(c,[RR.lerp(f.body[0],f.body[3],.2),RR.lerp(f.body[1],f.body[2],.2)]);c.stroke();c.beginPath();path(c,[f.rear,f.front]);c.stroke();c.fillStyle=color;c.beginPath();c.arc(f.front.x,f.front.y,1.8*u,0,RR.TAU);c.fill();}
 if(f&&(o.pathModel==='rear-arcs'||o.drive?.control==='pilbil')){c.save();c.strokeStyle=f.direction<0?'#d97513':'#146cd4';c.lineWidth=1.8*u;c.beginPath();c.arc(f.rear.x,f.rear.y,4*u,0,RR.TAU);c.stroke();label(c,'BAKAXEL',{x:f.rear.x+7*u,y:f.rear.y+8*u},8*tu,c.strokeStyle);label(c,'FRONT',{x:f.front.x+4*u,y:f.front.y-5*u},8*tu,color);c.restore();}
 if(f&&o.drive?.control==='pilbil')drawPilbilWheels(c,o,p,f);
 const txt=`${o.name||o.vehicle.name} · ${sw.issues.length?'KÖRSPÅRET MÅSTE JUSTERAS':'översiktligt körspår'}${o.drive||o.directions?' · '+(f?.direction<0?'BACK':f?.direction>0?'FRAM':'START'):''}`;label(c,txt,{x:o.points[0].x,y:o.points[0].y-15*u},11*tu,color);c.restore();}
function drawObject(c,o,p,interactive=true){const color=o.color||getLayer(o.layerId)?.color||'#1765ce',u=unit(p),ps=objectPoints(o);c.save();c.strokeStyle=color;c.fillStyle=color;c.lineWidth=(o.width||2*u)*pageAppearance(p).line;c.lineCap='round';c.lineJoin='round';if(o.kind==='landscape'){drawLandscape(c,o,p);c.restore();return;}if(o.kind==='street'){drawStreet(c,o,p,interactive);c.restore();return;}if(o.kind==='vehicle'){drawSweep(c,o,p,interactive);c.restore();return;}
 if(o.kind==='text'){drawText(c,o,p);}
 else{const closed=['area','rect','poly'].includes(o.kind);c.beginPath();path(c,ps,closed);if(closed){c.save();c.globalAlpha*=.11;c.fill();c.restore();}c.stroke();if(['line','pen'].includes(o.kind))drawLineEnds(c,o,ps,p);if(['measure','area'].includes(o.kind)){for(const a of ps){c.beginPath();c.arc(a.x,a.y,2.5*u*pageAppearance(p).line,0,RR.TAU);c.fill();}const at=o.kind==='area'?{x:ps.reduce((a,q)=>a+q.x,0)/ps.length,y:ps.reduce((a,q)=>a+q.y,0)/ps.length}:RR.lerp(ps[0],ps.at(-1),.5);label(c,measureLabel(o,p),{x:at.x+5*u,y:at.y-10*u},13*u*pageAppearance(p).text,color);}}
 c.restore();}
function drawScene(c,p,interactive=false){drawBase(c,p);for(const l of S.layers){if(!l.visible)continue;c.save();c.globalAlpha=l.opacity;for(const o of p.objects.filter(o=>o.layerId===l.id).sort((a,b)=>Number(LC.isSurface(b))-Number(LC.isSurface(a))))drawObject(c,o,p,interactive);c.restore();}}
function draw(){if(typeof workspaceMode!=='undefined'&&workspaceMode==='sections')return;const p=page(),dpr=window.devicePixelRatio||1;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);$('empty').hidden=!!p;if(!p)return;ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.z,view.z);ctx.save();ctx.shadowColor='#18374a25';ctx.shadowBlur=15/view.z;ctx.shadowOffsetY=3/view.z;ctx.fillStyle='#fff';ctx.fillRect(0,0,p.w,p.h);ctx.restore();drawScene(ctx,p,true);
 if(tool==='lark')drawLarkPreview(ctx,p);if(tool==='pilbil')drawPilbilDraft(ctx,p);
 if(draft.length&&tool==='street'){const points=[...draft];if(hover&&RR.dist(points.at(-1),hover)>1e-6)points.push(hover);if(points.length>=2)drawStreet(ctx,{sectionId:streetSectionId,points},p,true);}
 if(draft.length&&tool==='vehicle')drawVehicleDraft(ctx,p);
 if(draft.length&&tool!=='vehicle'&&tool!=='pilbil'){const ps=[...draft];if(hover&&tool!=='pen')ps.push(hover);const color=tool==='calibrate'?'#e47612':style.color||activeLayer()?.color||palette[0];ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2/view.z;ctx.setLineDash(tool==='pen'?[]:[6/view.z,4/view.z]);ctx.beginPath();if(tool==='rect'&&ps.length>=2)path(ctx,objectPoints({kind:'rect',points:[ps[0],ps.at(-1)]}),true);else if(tool==='vehicle'){for(let i=1;i<ps.length;i++){ctx.beginPath();ctx.strokeStyle=ps[i].direction===-1?'#d97513':'#146cd4';path(ctx,[ps[i-1],ps[i]]);ctx.stroke();}}else path(ctx,ps,tool==='area');if(tool!=='vehicle')ctx.stroke();ctx.setLineDash([]);for(let i=0;i<draft.length;i++){ctx.beginPath();ctx.arc(draft[i].x,draft[i].y,4/view.z,0,RR.TAU);ctx.fill();label(ctx,String(i+1)+(tool==='vehicle'&&i>0?(draft[i].direction===-1?' B':' F'):''),{x:draft[i].x+7/view.z,y:draft[i].y-8/view.z},11/view.z,color);}
  if(['measure','area'].includes(tool)&&ps.length>1)label(ctx,measureLabel({kind:tool,points:ps},p),{x:ps.at(-1).x+12/view.z,y:ps.at(-1).y-16/view.z},13/view.z,color);ctx.restore();}
 const o=findObj();if(o&&getLayer(o.layerId)?.visible){ctx.save();ctx.strokeStyle='#173b68';ctx.fillStyle='#fff';ctx.lineWidth=1.3/view.z;for(const q of o.points){ctx.fillRect(q.x-4/view.z,q.y-4/view.z,8/view.z,8/view.z);ctx.strokeRect(q.x-4/view.z,q.y-4/view.z,8/view.z,8/view.z);}ctx.restore();}
 if(snapPoint){ctx.strokeStyle='#d7640b';ctx.lineWidth=1.4/view.z;ctx.strokeRect(snapPoint.x-6/view.z,snapPoint.y-6/view.z,12/view.z,12/view.z);}ctx.restore();
 if(tool==='calibrate'&&hover){const z=view.z*4,sz=140,x=cw-sz-18,y=58;ctx.save();ctx.fillStyle='#fff';ctx.fillRect(x,y,sz,sz);ctx.beginPath();ctx.rect(x,y,sz,sz);ctx.clip();ctx.translate(x+sz/2-hover.x*z,y+sz/2-hover.y*z);ctx.scale(z,z);drawBase(ctx,p);ctx.restore();ctx.save();ctx.strokeStyle='#c76c11';ctx.lineWidth=1;ctx.strokeRect(x,y,sz,sz);ctx.beginPath();ctx.moveTo(x+sz/2-18,y+sz/2);ctx.lineTo(x+sz/2+18,y+sz/2);ctx.moveTo(x+sz/2,y+sz/2-18);ctx.lineTo(x+sz/2,y+sz/2+18);ctx.stroke();label(ctx,'4× · referenspunkt',{x:x+5,y:y+sz+14},11);ctx.restore();}
 $('zoomLabel').textContent=`${nf(view.z/pageFitZoom(p)*100,0)} %`;$('scaleBar').hidden=!scaled(p);if(scaled(p)){const target=90/view.z*p.scale.x,n=niceNumber(target),px=n/p.scale.x*view.z;$('scaleBarLine').style.width=px+'px';$('scaleBarText').textContent=`${confirmed(p)?'':'≈ '}${nf(n,n<1?2:0)} m`;}renderStatus();renderScale();}
function niceNumber(x){const e=10**Math.floor(Math.log10(Math.max(x,1e-15))),v=x/e;return(v>=5?5:v>=2?2:1)*e;}
function resize(){const r=$('viewport').getBoundingClientRect(),oldW=cw,oldH=ch,p=page(),wasFitted=p&&oldW&&oldH&&Math.abs(view.z/pageFitZoom(p,oldW,oldH)-1)<.001&&Math.abs(view.x-(oldW-p.w*view.z)/2)<2&&Math.abs(view.y-(oldH-p.h*view.z)/2)<2;if(r.width<=0||r.height<=0)return;cw=r.width;ch=r.height;const dpi=window.devicePixelRatio||1;canvas.width=Math.round(cw*dpi);canvas.height=Math.round(ch*dpi);if(wasFitted){fitPage();}else if(oldW&&oldH){view.x+=(cw-oldW)/2;view.y+=(ch-oldH)/2;}requestRender();}
new ResizeObserver(resize).observe($('viewport'));

function drawVehicleDraft(c,p){
 let points=[...draft];
 if(hover){if(points.length===1){if(RR.length([points[0],hover],p.scale)>.01)points.push(hover);}else{const rear=points.length===2?points[0]:points.at(-1);if(RR.length([rear,hover],p.scale)>.01)points.push({...hover,direction:vehicleSettings.gear});}}
 if(points.length>=2){try{const obj=vehicleDraftObject(points),sw=getSweep(obj,p);drawSweep(c,obj,p,true);if(sw?.problem){const q=sw.problem.target;label(c,'Målet kräver en annan manöver',{x:q.x+10/view.z,y:q.y+18/view.z},12/view.z,'#b73529');}}catch{}}
 c.save();c.lineWidth=1.5/view.z;c.setLineDash([4/view.z,4/view.z]);if(points.length>1){c.strokeStyle='#567080';c.beginPath();path(c,points.slice(0,2));c.stroke();}c.setLineDash([]);
 for(let i=0;i<points.length;i++){const q=points[i],color=i<2?'#3e596e':q.direction<0?'#d97513':'#146cd4';c.strokeStyle=color;c.fillStyle='#fff';c.beginPath();c.arc(q.x,q.y,4/view.z,0,RR.TAU);c.fill();c.stroke();label(c,i===0?'Start · bakaxel':i===1?'Nosriktning':`${i-1} · ${q.direction<0?'BACK':'FRAM'}`,{x:q.x+8/view.z,y:q.y-10/view.z},11/view.z,color);}
 c.restore();
}

function textLayout(c,o,p){const size=(o.fontSize||18*unit(p))*pageAppearance(p).text,lineHeight=size*1.25,origin=o.points[0];c.save();c.font=canvasTextFont(o,p);c.textBaseline='alphabetic';let minX=origin.x,maxX=origin.x,minY=origin.y-size,maxY=origin.y;const lines=o.text.split('\n').map((text,i)=>{const m=c.measureText(text),y=origin.y+i*lineHeight,x=origin.x;minX=Math.min(minX,x-(m.actualBoundingBoxLeft||0));maxX=Math.max(maxX,x+Math.max(m.width,m.actualBoundingBoxRight||0));minY=Math.min(minY,y-(m.actualBoundingBoxAscent||size*.8));maxY=Math.max(maxY,y+(m.actualBoundingBoxDescent||size*.2),o.fontUnderline?y+size*.16:y);return{text,x,y,width:m.width};});c.restore();return{lines,size,bounds:{minX,maxX,minY,maxY}};}
/* Linjeändar: punkt, pil eller tvärstreck i vardera änden.
   Markörerna skalas med linjebredden så de följer med när ritningen
   zoomas eller linjetjockleken ändras. */
const LINE_ENDS=[['none','Ingen'],['dot','Punkt'],['arrow','Pil'],['bar','Tvärstreck']];
function drawLineEnd(c,at,towards,style,size){
 if(!style||style==='none')return;
 const dx=at.x-towards.x,dy=at.y-towards.y,d=Math.hypot(dx,dy);
 if(d<1e-9)return;
 const ux=dx/d,uy=dy/d,nx=-uy,ny=ux;
 c.beginPath();
 if(style==='dot'){c.arc(at.x,at.y,size*.9,0,RR.TAU);c.fill();return;}
 if(style==='bar'){c.moveTo(at.x+nx*size*1.3,at.y+ny*size*1.3);
                   c.lineTo(at.x-nx*size*1.3,at.y-ny*size*1.3);c.stroke();return;}
 // pil: fylld triangel med spetsen i ändpunkten
 const back=size*2.6,half=size*1.25;
 c.moveTo(at.x,at.y);
 c.lineTo(at.x-ux*back+nx*half,at.y-uy*back+ny*half);
 c.lineTo(at.x-ux*back-nx*half,at.y-uy*back-ny*half);
 c.closePath();c.fill();
}
function drawLineEnds(c,o,ps,p){
 if(ps.length<2)return;
 if(!o.endStart&&!o.endEnd)return;
 const size=Math.max((o.width||2*unit(p))*pageAppearance(p).line*1.6,2.5*unit(p));
 c.save();c.lineCap='butt';
 drawLineEnd(c,ps[0],ps[1],o.endStart,size);
 drawLineEnd(c,ps.at(-1),ps.at(-2),o.endEnd,size);
 c.restore();
}
function drawText(c,o,p){const layout=textLayout(c,o,p);c.font=canvasTextFont(o,p);c.textBaseline='alphabetic';// Rotationen läggs som transform kring ankarpunkten, så textLayout kan
 // fortsätta räkna oroterat och bounds förblir enkla att resonera om.
 const rot=(o.rotation||0)*Math.PI/180,anchor=o.points[0];
 if(rot){c.save();c.translate(anchor.x,anchor.y);c.rotate(rot);c.translate(-anchor.x,-anchor.y);}
 for(const line of layout.lines){c.fillText(line.text,line.x,line.y);if(o.fontUnderline&&line.width>0){c.save();c.strokeStyle=c.fillStyle;c.lineWidth=layout.size/16;c.lineCap='butt';c.beginPath();c.moveTo(line.x,line.y+layout.size*.12);c.lineTo(line.x+line.width,line.y+layout.size*.12);c.stroke();c.restore();}}if(rot)c.restore();}

const INLINE_ASSETS=$('bundledAssets'),ASSET_MAP=INLINE_ASSETS?JSON.parse(INLINE_ASSETS.textContent):null,decode64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const ASSET_FILE={pdfMain:'pdfMain.mjs',pdfWorker:'pdfWorker.mjs',pdfLib:'pdfLib.mjs',ocrWorker:'ocrWorker.js',ocrWasm:'ocrWasm.wasm',ocrLang:'ocrLang.traineddata',licenses:'licenses.txt'};
const missing=k=>Error('En inbyggd komponent saknas: '+k);
const assetPath=k=>'vendor/'+(ASSET_FILE[k]||k);
const assetBytes=async k=>{if(ASSET_MAP){if(!ASSET_MAP[k])throw missing(k);return decode64(ASSET_MAP[k]);}const r=await fetch(assetPath(k));if(!r.ok)throw missing(k);return new Uint8Array(await r.arrayBuffer());};
const assetText=async k=>new TextDecoder().decode(await assetBytes(k));
const assetURL=k=>{if(!ASSET_MAP)return new URL(assetPath(k),document.baseURI).href;if(!ASSET_MAP[k])throw missing(k);return URL.createObjectURL(new Blob([decode64(ASSET_MAP[k])],{type:'text/javascript'}));};
let pdfLibrary=null,pdfLibLibrary=null,ocrWorker=null,ocrSeq=0;const ocrJobs=new Map();
