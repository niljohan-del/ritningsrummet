(function(root){'use strict';
const SOURCE='https://www.taby.se/download/18.82a9cf319d24a0885d4ebe/1774518332035/teknisk-handbok_2025_tga.pdf';
const CATALOG=[
 {id:'walk',label:'Gångbana',width:2.5,color:'#c9b99e',kind:'walk',ref:'6.1.2',page:41,note:'1,8 m kräver särskilda förutsättningar för fri bredd och drift.'},
 {id:'cycle',label:'Cykelbana · huvudstråk',width:2.5,color:'#ca8d78',kind:'cycle',ref:'6.1.3.2',page:42,note:'Dubbelriktad, intill gångyta.'},
 {id:'regional',label:'Regional cykelbana',width:3.25,color:'#c7806c',kind:'cycle',ref:'6.1.3.1',page:42,note:'Enbart cykel. Annan bredd kan gälla intill gångyta.'},
 {id:'cycleone',label:'Enkelriktad cykelbana',width:2.25,color:'#d69c89',kind:'cycle',ref:'6.1.3.1',page:42,note:'Regionalt stråk. Drift kräver ytterligare fri bredd.'},
 {id:'gc',label:'Kombinerad gång- och cykelbana',width:3,color:'#c3ac8b',kind:'gc',ref:'6.1.3.3',page:42,note:'Lokalt dubbelriktat stråk.'},
 {id:'localbig',label:'Körbana · stor lokalgata',width:5.5,color:'#9aa7b3',kind:'road',ref:'6.1.4.3',page:44,note:'Hela den dubbelriktade körbanan.'},
 {id:'localsmall',label:'Körbana · liten lokalgata',width:4.5,color:'#9aa7b3',kind:'road',ref:'6.1.4.4',page:44,note:'Hela körbanan. Möten kräver anpassning.'},
 {id:'oneway',label:'Körbana · enkelriktad',width:3.5,color:'#92a1ae',kind:'lane',ref:'6.1.4.5',page:44,note:'Enkelriktad körbana.'},
 {id:'mainroad',label:'Körbana · huvudgata',width:6,color:'#8c9da9',kind:'road',ref:'6.1.4.1',page:43,note:'Minst 6 m; dimensionera efter trafiken.'},
 {id:'busroad',label:'Körbana · buss i linjetrafik',width:7,color:'#8a9dac',kind:'busroad',ref:'6.1.4.2',page:43,note:'Dubbelriktad, frizonstillägg tillkommer vid behov.'},
 {id:'buslane',label:'Körfält · buss',width:3.5,color:'#8b9ca8',kind:'bus',ref:'6.1.4.2',page:43,note:'En riktning, raksträcka. Frizon bedöms separat.'},
 {id:'parking',label:'Parkering · längsgående',width:2.5,color:'#a4b4c1',kind:'parking',ref:'6.1.8.1',page:47,note:'2,0 m kan användas vid låga flöden på lokalgata.'},
 {id:'parking90',label:'Parkering · vinkelrät',width:5,color:'#a4b4c1',kind:'parking90',ref:'6.1.8.1',page:48,note:'Sektionsdjup 5 m. Rutbredd 2,5 m mäts längs gatan.'},
 {id:'cycleparking',label:'Cykelparkering',width:2,color:'#a2b7aa',kind:'cycleparking',ref:'6.1.8.1',page:48,note:'Cykelns längdutrymme; manöveryta bedöms separat.'},
 {id:'shoulder',label:'Stödremsa',width:.25,color:'#c6c3a6',kind:'shoulder',ref:'6.1.4.6',page:44,note:'När kantstöd saknas.'},
 {id:'green',label:'Plantering / trädrad',width:2,color:'#96b092',kind:'green',note:'Skissvärde. Anpassa till växtbädd och drift.'},
 {id:'furniture',label:'Möbleringszon',width:2,color:'#b7b391',kind:'furniture',note:'Skissvärde. Beror på utrustningen.'},
 {id:'median',label:'Mittrefug / skiljeremsa',width:1,color:'#b9bea6',kind:'median',note:'Skissvärde. Anpassas till funktionen.'},
 {id:'curb',label:'Kantstöd',width:.15,color:'#bcc1c6',kind:'curb',note:'Skissvärde. Välj kantstödstyp.'},
 {id:'custom',label:'Egen yta',width:1,color:'#c0b7cf',kind:'custom',note:'Eget skissvärde.'}
];
const type=id=>CATALOG.find(t=>t.id===id),round=n=>Math.round(n*1e6)/1e6;
function bands(section){let x=0;const out=[];section.items.forEach((item,i)=>{const t=type(item.type);out.push({id:item.id,label:item.label||t.label,kind:t.kind,color:t.color,width:item.width,start:x,end:round(x+item.width),itemIndex:i,gap:false});x=round(x+item.width);if(i<section.items.length-1&&item.gapAfter!==null&&item.gapAfter>0){out.push({id:item.id+'-gap',label:'Skyddsavstånd',kind:'gap',color:'#e7c980',width:item.gapAfter,start:x,end:round(x+item.gapAfter),itemIndex:i,gap:true});x=round(x+item.gapAfter);}});return{bands:out,total:x};}
function validate(section){if(!section||typeof section.id!=='string'||typeof section.name!=='string'||section.name.length>120||!Array.isArray(section.items)||section.items.length>40)throw Error('Ogiltig gatusektion.');const ids=new Set();for(const e of section.items){if(typeof e.id!=='string'||e.id.length>100||ids.has(e.id)||!type(e.type)||typeof e.label!=='string'||e.label.length>120||!Number.isFinite(e.width)||e.width<.01||e.width>50||e.gapAfter!==null&&(!Number.isFinite(e.gapAfter)||e.gapAfter<0||e.gapAfter>20))throw Error('Ogiltigt sektionselement.');ids.add(e.id);}if(section.availableWidth!==null&&(!Number.isFinite(section.availableWidth)||section.availableWidth<=0||section.availableWidth>500))throw Error('Ogiltig tillgänglig bredd.');if(bands(section).total>500)throw Error('Sektionen får vara högst 500 m bred.');return section;}
function warnings(section){const out=[];for(let i=0;i<section.items.length;i++){const a=section.items[i],t=type(a.type),b=section.items[i+1],u=b&&type(b.type);if(t.ref&&Math.abs(a.width-t.width)>.000001)out.push(`${a.label}: ${a.width.toFixed(2)} m avviker från förvalet ${t.width.toFixed(2)} m (${t.ref}).`);if(!b)continue;const gap=a.gapAfter||0,walk=new Set(['walk','gc','cycle']),park=new Set(['parking','parking90']);if((walk.has(t.kind)&&park.has(u.kind)||park.has(t.kind)&&walk.has(u.kind))&&gap<.8)out.push('Parkering intill gång/cykelyta: kontrollera dörruppslag, normalt 0,8 m (6.1.5.1).');if((t.kind==='cycle'&&['road','lane','busroad','bus'].includes(u.kind)||u.kind==='cycle'&&['road','lane','busroad','bus'].includes(t.kind))&&gap<.3)out.push('Cykelbana intill körbana: kontrollera skyddszon, 0,3 m utan möblering; regionala stråk bedöms separat (6.1.5.1).');}return[...new Set(out)];}
function reverse(section){const gaps=section.items.slice(0,-1).map(e=>e.gapAfter).reverse();section.items.reverse();section.items.forEach((e,i)=>e.gapAfter=i<gaps.length?gaps[i]:null);return section;}
// Offset every boundary in metres; inverse-transform only after construction.
function planGeometry(section,points,scale,flip=false){validate(section);if(points.length<2||!scale||!(scale.x>0&&scale.y>0))throw Error('Rita en sträcka och bekräfta skalan.');const origin=points[0],ps=points.map(p=>({x:(p.x-origin.x)*scale.x,y:(p.y-origin.y)*scale.y})),layout=bands(section);if(!layout.total)throw Error('Sektionen behöver minst ett element.');const us=[];for(let i=1;i<ps.length;i++){const dx=ps[i].x-ps[i-1].x,dy=ps[i].y-ps[i-1].y,L=Math.hypot(dx,dy);if(L<.01)throw Error('Gatans noder ligger för nära varandra.');us.push({x:dx/L,y:dy/L,length:L});}
 const trims=[];for(let i=1;i<ps.length-1;i++){const a=us[i-1],b=us[i],dot=Math.max(-1,Math.min(1,a.x*b.x+a.y*b.y));if(dot<-.8)throw Error('Gatan svänger för tvärt. Flytta noderna.');trims[i]=layout.total/2*Math.tan(Math.acos(dot)/2);}
 for(let i=0;i<us.length;i++)if((trims[i]||0)+(trims[i+1]||0)>=us[i].length*.98)throw Error('Sektionen är för bred för avståndet mellan svängarna. Flytta noderna längre isär.');
 const world=p=>({x:origin.x+p.x/scale.x,y:origin.y+p.y/scale.y});
 function offset(d){return ps.map((p,i)=>{if(i===0||i===ps.length-1){const u=us[i===0?0:us.length-1];return world({x:p.x-u.y*d,y:p.y+u.x*d});}const a=us[i-1],b=us[i],nx=-a.y-b.y,ny=a.x+b.x,den=1+a.x*b.x+a.y*b.y;return world({x:p.x+nx*d/den,y:p.y+ny*d/den});});}
 const result=layout.bands.map(b=>{const lo=(b.start-layout.total/2)*(flip?-1:1),hi=(b.end-layout.total/2)*(flip?-1:1),left=offset(lo),right=offset(hi);return{...b,polygon:[...left,...right.slice().reverse()],left,right};});
 // Reject self-intersecting outer outline instead of displaying a false width at hairpins.
 const outer=[...offset(-layout.total/2),...offset(layout.total/2).reverse()];
 if(root.RR&&!root.RR.simplePolygon(outer))throw Error('Gatans ytterkanter korsar varandra. Justera noderna.');
 return{...layout,bands:result,outline:outer,length:us.reduce((s,u)=>s+u.length,0)};
}
const api={CATALOG,SOURCE,type,bands,validate,warnings,reverse,planGeometry};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RS=api;
})(globalThis);

