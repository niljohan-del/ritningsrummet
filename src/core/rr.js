/* Ritningsrummet 1.0 — geometry and DXF import. All measurements are plan distances. */
(function(root){
'use strict';
const TAU=2*Math.PI, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const metric=(p,s)=>({x:p.x*s.x,y:p.y*s.y});
function length(p,s={x:1,y:1},closed=false){let n=0;for(let i=1;i<p.length;i++)n+=Math.hypot((p[i].x-p[i-1].x)*s.x,(p[i].y-p[i-1].y)*s.y);if(closed&&p.length>2)n+=length([p.at(-1),p[0]],s);return n;}
function area(p,s={x:1,y:1}){if(p.length<3)return 0;let a=0,o=p[0];for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length];a+=(q.x-o.x)*(r.y-o.y)-(r.x-o.x)*(q.y-o.y);}return Math.abs(a/2)*s.x*s.y;}
function segDist(p,a,b){let q=(b.x-a.x)**2+(b.y-a.y)**2;const t=q?clamp(((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/q,0,1):0;return dist(p,lerp(a,b,t));}
function inside(p,ps){let on=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++)if(((ps[i].y>p.y)!=(ps[j].y>p.y))&&(p.x<(ps[j].x-ps[i].x)*(p.y-ps[i].y)/(ps[j].y-ps[i].y)+ps[i].x))on=!on;return on;}
function simplePolygon(p){const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),on=(a,b,c)=>Math.abs(cross(a,b,c))<1e-10&&c.x>=Math.min(a.x,b.x)-1e-10&&c.x<=Math.max(a.x,b.x)+1e-10&&c.y>=Math.min(a.y,b.y)-1e-10&&c.y<=Math.max(a.y,b.y)+1e-10;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(dist(a,b)<1e-10)return false;for(let j=i+2;j<p.length;j++){if(i===0&&j===p.length-1)continue;const c=p[j],d=p[(j+1)%p.length];if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))return false;}}return true;}
function calibrate(a,b,meters,old,axis='uniform'){if(!Number.isFinite(meters)||meters<=0)throw Error('Ange ett avstånd större än noll.');let d=axis==='x'?Math.abs(b.x-a.x):axis==='y'?Math.abs(b.y-a.y):dist(a,b);if(d<1e-9)throw Error('Referenspunkterna måste vara olika.');if(axis==='uniform')return{x:meters/d,y:meters/d};if(!old?.x||!old?.y)throw Error('Kalibrera först ett vanligt referensmått.');return{...old,[axis]:meters/d};}
function scaleCandidates(text){const out=[],seen=new Set();const re=/(?:\b(?:skala|scale)\s*[:=]?\s*)?\b1\s*[:/]\s*((?:\d{1,3}(?:[ \u00a0]\d{3})+|\d{1,7}))(?!\d)/gi;let m;while((m=re.exec(text))){let n=Number(m[1].replace(/\s/g,''));if(n<1||n>100000||seen.has(n))continue;seen.add(n);const context=text.slice(Math.max(0,m.index-35),Math.min(text.length,m.index+m[0].length+45));out.push({ratio:n,context,explicit:/skala|scale/i.test(m[0])});}return out.sort((a,b)=>Number(b.explicit)-Number(a.explicit));}
const PAPER={A0:[1189,841],A1:[841,594],A2:[594,420],A3:[420,297],A4:[297,210]};
function ratioScale(ratio,page,paper='actual',dpi=300){if(!(ratio>0))throw Error('Skaltalet måste vara större än noll.');let x,y;if(paper!=='actual'&&PAPER[paper]){const p=PAPER[paper],land=page.w>=page.h;x=(land?p[0]:p[1])/page.w/1000*ratio;y=(land?p[1]:p[0])/page.h/1000*ratio;if(Math.abs(x-y)/Math.max(x,y)>.025)throw Error('Ritningens proportioner matchar inte pappersformatet. Kalibrera med referensmått.');x=y=(x+y)/2;}else if(page.kind==='pdf'){x=y=ratio*.0254/72;}else{if(!(dpi>0))throw Error('DPI måste vara större än noll.');x=y=ratio*.0254/dpi;}return{x,y};}
function bounds(points){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of points){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}return{minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};}
const CAD_UNITS={1:{name:'tum',m:.0254},2:{name:'fot',m:.3048},4:{name:'mm',m:.001},5:{name:'cm',m:.01},6:{name:'m',m:1},7:{name:'km',m:1000},8:{name:'mikrotum',m:2.54e-8},9:{name:'mil',m:2.54e-5},10:{name:'yard',m:.9144},11:{name:'ångström',m:1e-10},12:{name:'nm',m:1e-9},13:{name:'µm',m:1e-6},14:{name:'dm',m:.1},15:{name:'dam',m:10},16:{name:'hm',m:100},21:{name:'US survey foot',m:1200/3937}};
function arcPoints(cx,cy,rx,ry,start,end,rotation=0){let span=end-start;if(Math.abs(span)<1e-10)span=TAU;let n=Math.max(12,Math.ceil(Math.abs(span)/(Math.PI/180)));const c=Math.cos(rotation),s=Math.sin(rotation),p=[];for(let i=0;i<=n;i++){let t=start+span*i/n,x=rx*Math.cos(t),y=ry*Math.sin(t);p.push({x:cx+x*c-y*s,y:cy+x*s+y*c});}return p;}
function bulgePoints(a,b,bulge){if(!bulge||Math.abs(bulge)<1e-10||dist(a,b)<1e-12)return[a,b];const theta=4*Math.atan(bulge),chord=dist(a,b),r=chord*(1+bulge*bulge)/(4*Math.abs(bulge)),off=chord*(1-bulge*bulge)/(4*bulge),cx=(a.x+b.x)/2-(b.y-a.y)/chord*off,cy=(a.y+b.y)/2+(b.x-a.x)/chord*off;return arcPoints(cx,cy,r,r,Math.atan2(a.y-cy,a.x-cx),Math.atan2(a.y-cy,a.x-cx)+theta);}
function parseDXF(text){
 if(text.startsWith('AutoCAD Binary DXF'))throw Error('Binär DXF stöds inte. Exportera som ASCII DXF, gärna version 2013.');
 const ls=text.replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n'),groups=[];
 for(let i=0;i+1<ls.length;i+=2){const c=Number(ls[i].trim());if(!Number.isInteger(c))throw Error('DXF-filen har ogiltiga gruppkoder.');groups.push([c,ls[i+1].trim()]);}
 const records=[];let r=null;for(const g of groups){if(g[0]===0){r={type:g[1],g:[]};records.push(r);}else if(r)r.g.push(g);}
 const val=(r,c,d=0)=>{const g=r?.g.find(x=>x[0]===c);return g?g[1]:d;},num=(r,c,d=0)=>Number(val(r,c,d));
 let unitCode=0;for(let i=0;i<groups.length-1;i++)if(groups[i][0]===9&&groups[i][1]==='$INSUNITS')unitCode=Number(groups[i+1][1]);
 const blocks=new Map(),entities=[],warnings={},cadLayers=new Set();let section='',block=null;
 for(let i=0;i<records.length;i++){r=records[i];if(r.type==='SECTION'){section=val(r,2,'');continue;}if(r.type==='ENDSEC'){section='';continue;}if(section==='BLOCKS'){if(r.type==='BLOCK'){block={base:{x:num(r,10),y:num(r,20)},entities:[]};blocks.set(val(r,2,''),block);}else if(r.type==='ENDBLK')block=null;else if(block)block.entities.push(r);}else if(section==='ENTITIES')entities.push(r);}
 const shapes=[],warn=(type)=>warnings[type]=(warnings[type]||0)+1,matPoint=(p,m)=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
 const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
 function emit(rs,m=[1,0,0,1,0,0],depth=0,inLayer=null){if(depth>12){warn('Blockdjup > 12');return;}for(let i=0;i<rs.length;i++){
  const e=rs[i],t=e.type;let layer=val(e,8,'0');if(layer==='0'&&inLayer)layer=inLayer;cadLayers.add(layer);if(num(e,67)===1){warn('Pappersrymd');continue;}if(num(e,210)!==0||num(e,220)!==0||num(e,230,1)!==1){warn('Annan projektionsaxel (OCS)');continue;}
  let p=[],closed=false;
  if(t==='LINE')p=[{x:num(e,10),y:num(e,20)},{x:num(e,11),y:num(e,21)}];
  else if(t==='POINT'){const x=num(e,10),y=num(e,20);shapes.push({type:'point',points:[matPoint({x,y},m)],layer});continue;}
  else if(t==='LWPOLYLINE'||t==='POLYLINE'){
   const vs=[];if(t==='LWPOLYLINE'){let v;for(const [c,z]of e.g){if(c===10){v={x:Number(z),y:0,b:0};vs.push(v);}else if(v&&c===20)v.y=Number(z);else if(v&&c===42)v.b=Number(z);}}else{if(num(e,70)&(8|16|64)){warn('3D POLYLINE');while(rs[i+1]?.type==='VERTEX')i++;continue;}while(rs[i+1]?.type==='VERTEX'){const v=rs[++i];vs.push({x:num(v,10),y:num(v,20),b:num(v,42)});}if(rs[i+1]?.type==='SEQEND')i++;}
   closed=!!(num(e,70)&1);if(vs.length){p.push(vs[0]);for(let j=0;j<vs.length-(closed?0:1);j++)p.push(...bulgePoints(vs[j],vs[(j+1)%vs.length],vs[j].b).slice(1));}
  }else if(t==='CIRCLE'||t==='ARC'){let a=t==='CIRCLE'?0:num(e,50)*Math.PI/180,b=t==='CIRCLE'?TAU:num(e,51)*Math.PI/180;while(b<=a)b+=TAU;p=arcPoints(num(e,10),num(e,20),num(e,40),num(e,40),a,b);closed=t==='CIRCLE';}
  else if(t==='ELLIPSE'){const rx=Math.hypot(num(e,11),num(e,21));let a=num(e,41),b=num(e,42,TAU);while(b<=a)b+=TAU;p=arcPoints(num(e,10),num(e,20),rx,rx*num(e,40,1),a,b,Math.atan2(num(e,21),num(e,11)));closed=Math.abs(b-a-TAU)<1e-6;}
  else if(['SOLID','TRACE','3DFACE'].includes(t)){p=[{x:num(e,10),y:num(e,20)},{x:num(e,11),y:num(e,21)},{x:num(e,13,num(e,12)),y:num(e,23,num(e,22))},{x:num(e,12),y:num(e,22)}];closed=true;}
  else if(t==='TEXT'||t==='MTEXT'||t==='ATTRIB'){
   const text=e.g.filter(g=>g[0]===1||g[0]===3).map(g=>g[1]).join('').replace(/\\P/g,'\n').replace(/\\[A-Za-z][^;]*;/g,'').replace(/[{}]/g,'');const q=matPoint({x:num(e,10),y:num(e,20)},m);shapes.push({type:'text',points:[q],text,height:Math.abs(num(e,40,1))*Math.hypot(m[0],m[1]),angle:(num(e,50)*Math.PI/180)+Math.atan2(m[1],m[0]),layer});continue;
  }else if(t==='INSERT'||t==='DIMENSION'){
   const b=blocks.get(val(e,2,''));if(!b){warn(t==='INSERT'?'Saknat block / extern referens':'DIMENSION utan grafikblock');continue;}
   const a=num(e,50)*Math.PI/180,sx=num(e,41,1),sy=num(e,42,1),co=Math.cos(a),si=Math.sin(a),cols=Math.min(200,num(e,70,1)||1),rows=Math.min(200,num(e,71,1)||1);
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){let tx=num(e,10)+co*col*num(e,44)-si*row*num(e,45),ty=num(e,20)+si*col*num(e,44)+co*row*num(e,45);const local=t==='DIMENSION'?[1,0,0,1,0,0]:[co*sx,si*sx,-si*sy,co*sy,tx-co*sx*b.base.x+si*sy*b.base.y,ty-si*sx*b.base.x-co*sy*b.base.y];emit(b.entities,mul(m,local),depth+1,layer);}continue;
  }else if(['SEQEND','VERTEX','ENDTAB'].includes(t))continue;
  else{warn(t);continue;}
  if(p.length)shapes.push({type:'polyline',points:p.map(q=>matPoint(q,m)),closed,layer});
  if(shapes.length>150000)throw Error('DXF-filen är för stor. Exportera ett avgränsat utsnitt.');
 }}
 emit(entities);if(!shapes.length)throw Error('Inga stödda 2D-objekt hittades i modellrymden. Exportera en 2D-DXF eller PDF.');
 const bb=bounds(shapes.flatMap(s=>s.type==='text'?[s.points[0],{x:s.points[0].x+s.height*s.text.length*.65,y:s.points[0].y+s.height}]:s.points));if(!Number.isFinite(bb.w)||Math.max(bb.w,bb.h)<=0)throw Error('Ritningen saknar utbredning.');
 const pad=Math.max(bb.w,bb.h)*.025;for(const s of shapes){for(const p of s.points){p.x=p.x-bb.minX+pad;p.y=bb.maxY-p.y+pad;}if(s.type==='text')s.angle=-s.angle;}
 return{shapes,w:bb.w+2*pad,h:bb.h+2*pad,unit:CAD_UNITS[unitCode]||null,unitCode,layers:[...cadLayers],warnings,origin:{x:bb.minX-pad,y:bb.maxY+pad},text:shapes.filter(s=>s.type==='text').map(s=>s.text).join(' ')};
}
// Path = front axle centreline. Circular fillets preserve tangent continuity.
function smoothRoute(points,radius){if(points.length<2)throw Error('Placera minst två punkter.');const parts=[],issues=[];let current=points[0];for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],l1=dist(a,b),l2=dist(b,c);if(l1<.001||l2<.001)continue;const u={x:(b.x-a.x)/l1,y:(b.y-a.y)/l1},v={x:(c.x-b.x)/l2,y:(c.y-b.y)/l2};const angle=Math.acos(clamp(u.x*v.x+u.y*v.y,-1,1)),cross=u.x*v.y-u.y*v.x;if(angle<.005){parts.push({type:'line',a:current,b});current=b;continue;}if(angle>Math.PI-.03){issues.push('Nästan 180° riktningsbyte: dela upp manövern.');parts.push({type:'line',a:current,b});current=b;continue;}
  let trim=radius*Math.tan(angle/2),maxTrim=.45*Math.min(l1,l2),r=radius;if(trim>maxTrim){trim=maxTrim;r=trim/Math.tan(angle/2);issues.push('Punkterna ligger för tätt för vald svängradie.');}const start={x:b.x-u.x*trim,y:b.y-u.y*trim},end={x:b.x+v.x*trim,y:b.y+v.y*trim},sgn=Math.sign(cross),center={x:start.x-u.y*sgn*r,y:start.y+u.x*sgn*r};parts.push({type:'line',a:current,b:start});parts.push({type:'arc',center,r,a:Math.atan2(start.y-center.y,start.x-center.x),sweep:sgn*angle});current=end;
 }parts.push({type:'line',a:current,b:points.at(-1)});const sampled=[];for(const p of parts){let len=p.type==='line'?dist(p.a,p.b):Math.abs(p.sweep*p.r),n=Math.max(1,Math.ceil(len/.1));if(n+sampled.length>25000)throw Error('Körvägen är för lång. Begränsa den till cirka 2 km.');for(let i=0;i<=n;i++){if(sampled.length&&i===0)continue;const t=i/n;if(p.type==='line')sampled.push({...lerp(p.a,p.b,t),heading:Math.atan2(p.b.y-p.a.y,p.b.x-p.a.x)});else sampled.push({x:p.center.x+p.r*Math.cos(p.a+p.sweep*t),y:p.center.y+p.r*Math.sin(p.a+p.sweep*t),heading:p.a+p.sweep*t+Math.sign(p.sweep)*Math.PI/2});}}return{points:sampled,issues:[...new Set(issues)]};}
function simulate(route,vehicle,scale,radius,margin=0,motion={}){
 const origin=route[0],metricRoute=route.map(p=>({x:(p.x-origin.x)*scale.x,y:(p.y-origin.y)*scale.y})),sm=smoothRoute(metricRoute,radius),ps=sm.points,L=vehicle.wheelbase;
 if(ps.length<2||length(ps)<.1)throw Error('Körvägen är för kort.');const direction=motion.direction===-1?-1:1,reverse=direction<0?Math.PI:0;let th=motion.initialHeading??(Math.atan2(ps[1].y-ps[0].y,ps[1].x-ps[0].x)-reverse),maxSteer=0;const frames=[];
 const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));const world=p=>({x:p.x/scale.x+origin.x,y:p.y/scale.y+origin.y});
 function frame(front,heading,phi){const ux=Math.cos(heading),uy=Math.sin(heading),rear={x:front.x-L*ux,y:front.y-L*uy};const corner=(long,lat)=>world({x:rear.x+ux*long-uy*lat,y:rear.y+uy*long+ux*lat});const f=L+vehicle.frontOverhang,b=-vehicle.rearOverhang,w=vehicle.width/2;return{front:world(front),rear:world(rear),angle:heading,steer:phi,direction,body:[corner(f,w),corner(f,-w),corner(b,-w),corner(b,w)],buffer:[corner(f+margin,w+margin),corner(f+margin,-w-margin),corner(b-margin,-w-margin),corner(b-margin,w+margin)]};}
 const initialSteer=norm(ps[0].heading-th-reverse),limit=(vehicle.maxSteer+.2)*Math.PI/180;maxSteer=Math.abs(initialSteer);let incomplete=!!motion.enforceLimits&&Math.abs(initialSteer)>limit;
 frames.push(frame(ps[0],th,initialSteer));
 for(let i=1;i<ps.length&&!incomplete;i++){const a=ps[i-1],b=ps[i],ds=dist(a,b);if(ds<1e-9)continue;const alpha=Math.atan2(b.y-a.y,b.x-a.x),deriv=h=>{const sn=Math.sin(alpha-h);return Math.abs(sn)<1e-14?0:sn/L;},k1=deriv(th),k2=deriv(th+ds*k1/2),k3=deriv(th+ds*k2/2),k4=deriv(th+ds*k3),next=th+ds*(k1+2*k2+2*k3+k4)/6,phi=norm((b.heading??alpha)-next-reverse);
  maxSteer=Math.max(maxSteer,Math.abs(phi));
  // Do not label physically forward motion as reverse after the model turns through 90°.
  // Reject the first impossible pose; all displayed travel retains its requested gear.
  const alignment=Math.cos(alpha-(th+next)/2)*direction;
  if(motion.enforceLimits&&(Math.abs(phi)>limit||alignment<=0)){incomplete=true;break;}
  th=next;frames.push(frame(b,th,phi));
 }
 const maxDegrees=maxSteer*180/Math.PI,issues=[...sm.issues];if(maxDegrees>vehicle.maxSteer+.2)issues.push('Styrutslaget överskrider fordonets gräns. Öka radien eller ändra körvägen.');
 if(incomplete)issues.push('Körspåret måste justeras. Fordonet kan inte nå nästa nod med vald körriktning; visningen stannar vid sista möjliga läget.');
 return{frames,incomplete,issues:[...new Set(issues)],maxSteer:maxDegrees,path:ps.map(world),length:length(ps),valid:issues.length===0};
}
// Each direction belongs to the segment ending at the next clicked point.
// Split at gear changes so a reversal is a stop, never a rounded U-turn.
function simulateDirected(route,vehicle,scale,radius,margin=0,directions=[]){
 if(route.length<2||directions.length!==route.length-1||directions.some(d=>d!==1&&d!==-1))throw Error('Ogiltiga körriktningar.');
 const frames=[],issues=[],path=[];let maxSteer=0,total=0,forwardLength=0,reverseLength=0,initialHeading,incomplete=false;
 for(let start=0;start<directions.length;){const direction=directions[start];let end=start+1;while(end<directions.length&&directions[end]===direction)end++;
  const sw=simulate(route.slice(start,end+1),vehicle,scale,radius,margin,{direction,initialHeading,enforceLimits:true});
  if(frames.length+sw.frames.length>25000)throw Error('Körvägen är för lång. Dela upp manövern.');
  frames.push(...sw.frames);path.push(...sw.path);issues.push(...sw.issues);maxSteer=Math.max(maxSteer,sw.maxSteer);total+=sw.length;if(direction>0)forwardLength+=sw.length;else reverseLength+=sw.length;
  initialHeading=sw.frames.at(-1).angle;if(sw.incomplete){incomplete=true;path.push(...route.slice(end+1));break;}start=end;
 }
 return{frames,path,incomplete,issues:[...new Set(issues)],maxSteer,length:total,forwardLength,reverseLength,valid:issues.length===0};
}

// Signed rear-axle travel, exact constant-steering bicycle motion in metres.
function simulateManeuver(route,v,scale,commands,margin=0,approach=null){
 if(!route?.length||!scale||![scale.x,scale.y,v.wheelbase,v.width].every(n=>Number.isFinite(n)&&n>0)||!Array.isArray(commands)||commands.length>10000)throw Error('Ogiltig manöver.');
 let total=0;for(const q of commands){if(!Number.isFinite(q.distance)||q.distance===0||Math.abs(q.distance)>50||!Number.isFinite(q.steer)||Math.abs(q.steer)>65)throw Error('Ogiltigt körsteg.');total+=Math.abs(q.distance);}if(total>2000)throw Error('Begränsa manövern till 2 km.');
 const last=approach?.frames.at(-1),origin=last?.front||route[0],L=v.wheelbase;
 if(!last&&(!route[1]||dist(route[0],route[1])<1e-9))throw Error('Ange fordonets nosriktning med en andra punkt.');
 let th=last?.angle??Math.atan2((route[1].y-origin.y)*scale.y,(route[1].x-origin.x)*scale.x),rear={x:-L*Math.cos(th),y:-L*Math.sin(th)};
 const frames=approach?approach.frames.map(f=>({...f,direction:1})):[],issues=[...(approach?.issues||[])];let maxSteer=approach?.maxSteer||0,forwardLength=approach?length(approach.frames.map(f=>f.rear),scale):0,reverseLength=0;
 const world=p=>({x:origin.x+p.x/scale.x,y:origin.y+p.y/scale.y});
 function frame(direction,steer,commandIndex){const ux=Math.cos(th),uy=Math.sin(th),corner=(a,b)=>world({x:rear.x+ux*a-uy*b,y:rear.y+uy*a+ux*b}),f=L+v.frontOverhang,b=-v.rearOverhang,w=v.width/2;return{front:corner(L,0),rear:world(rear),angle:th,steer,direction,commandIndex,body:[corner(f,w),corner(f,-w),corner(b,-w),corner(b,w)],buffer:[corner(f+margin,w+margin),corner(f+margin,-w-margin),corner(b-margin,-w-margin),corner(b-margin,w+margin)]};}
 if(!frames.length)frames.push(frame(0,0,-1));
 for(let i=0;i<commands.length;i++){const q=commands[i],delta=q.steer*Math.PI/180,k=Math.tan(delta)/L,dir=Math.sign(q.distance),n=Math.max(1,Math.ceil(Math.abs(q.distance)/.1),Math.ceil(Math.abs(q.distance*k)/(Math.PI/360))),ds=q.distance/n;
  if(frames.length+n+1>50000)throw Error('Manövern innehåller för många lägen. Dela upp den.');
  // A stationary pose allows steering and gear changes without a position or heading jump.
  frames.push(frame(dir,delta,i));maxSteer=Math.max(maxSteer,Math.abs(q.steer));if(dir>0)forwardLength+=q.distance;else reverseLength-=q.distance;
  for(let j=0;j<n;j++){const next=th+ds*k;if(Math.abs(k)<1e-10){rear.x+=ds*Math.cos(th);rear.y+=ds*Math.sin(th);}else{rear.x+=(Math.sin(next)-Math.sin(th))/k;rear.y+=(Math.cos(th)-Math.cos(next))/k;}th=next;frames.push(frame(dir,delta,i));}
 }
 if(maxSteer>v.maxSteer+.2)issues.push('Styrutslaget överskrider fordonets gräns. Ångra körsteg eller justera styrgränsen.');
 return{frames,issues:[...new Set(issues)],maxSteer,path:frames.map(f=>f.front),length:forwardLength+reverseLength,forwardLength,reverseLength,valid:issues.length===0};
}

// Mouse targets are rear-axle positions. Solve each tangent arc from the current pose.
// No inverse front-axle following: exact signed travel is used for both gears.
function arcToTarget(rear,heading,target,direction,v,scale){
 if(![1,-1].includes(direction))throw Error('Välj framåt eller backning.');
 const dx=(target.x-rear.x)*scale.x,dy=(target.y-rear.y)*scale.y,c=Math.cos(heading),s=Math.sin(heading),x=dx*c+dy*s,y=-dx*s+dy*c,r2=x*x+y*y;
 if(r2<1e-8)throw Error('Flytta målpunkten från bakaxeln.');
 if(x*direction< -1e-8)throw Error(direction<0?'Målet ligger framför fordonet. Välj framåt eller flytta målet bakom bakaxeln.':'Målet ligger bakom fordonet. Välj backning eller flytta målet framför bakaxeln.');
 const curvature=2*y/r2,turn=2*Math.atan2(direction*y,direction*x),distance=Math.abs(curvature)<1e-10?x:turn/curvature,steer=Math.atan(v.wheelbase*curvature)*180/Math.PI;
 if(Math.abs(steer)>v.maxSteer+1e-7)throw Error('För snäv sväng från detta läge. Flytta målet längre bort eller lägg in en korrigerande manöver.');
 if(!Number.isFinite(distance)||distance*direction<=0)throw Error('Målpunkten kan inte nås med vald körriktning.');
 return{distance,steer,heading:heading+distance*curvature};
}
function simulateArcRoute(points,v,scale,directions,margin=0){
 if(points.length<2||directions.length!==points.length-2||directions.some(d=>d!==1&&d!==-1))throw Error('Ogiltig manöver.');
 const start=points[0];let heading=Math.atan2((points[1].y-start.y)*scale.y,(points[1].x-start.x)*scale.x),rear=start;
 if(length(points.slice(0,2),scale)<.01)throw Error('Ange nosens riktning med en andra punkt.');
 const initialHeading=heading,front={x:start.x+v.wheelbase*Math.cos(heading)/scale.x,y:start.y+v.wheelbase*Math.sin(heading)/scale.y},frontHeading={x:front.x+Math.cos(heading)/scale.x,y:front.y+Math.sin(heading)/scale.y},commands=[],legs=[];let problem=null,total=0;
 for(let i=2;i<points.length;i++){
  try{const q=arcToTarget(rear,heading,points[i],directions[i-2],v,scale);total+=Math.abs(q.distance);if(total>2000)throw Error('Dela upp manövrer längre än 2 km.');
   const n=Math.ceil(Math.abs(q.distance)/50),firstCommand=commands.length;for(let j=0;j<n;j++)commands.push({distance:q.distance/n,steer:q.steer});
   legs.push({start:rear,end:points[i],direction:directions[i-2],firstCommand,lastCommand:commands.length-1,distance:q.distance,steer:q.steer});heading=q.heading;rear=points[i];
  }catch(e){problem={node:i,from:rear,target:points[i],message:e.message};break;}
 }
 const sw=simulateManeuver([front,frontHeading],v,scale,commands,margin);
 if(problem)sw.issues.push('Körspåret måste justeras. '+problem.message);
 return{...sw,valid:!sw.issues.length,incomplete:!!problem,problem,legs,initialHeading,pathModel:'rear-arcs'};
}

function simulatePilbil(route,v,scale,commands,margin=0){if(route?.length!==2||!scale||![scale.x,scale.y].every(n=>Number.isFinite(n)&&n>0))throw Error('Placera bakaxeln och ange nosriktningen.');const a=route[0],b=route[1],dx=(b.x-a.x)*scale.x,dy=(b.y-a.y)*scale.y,d=Math.hypot(dx,dy);if(d<.01)throw Error('Nosriktningen är för kort.');const front={x:a.x+dx/d*v.wheelbase/scale.x,y:a.y+dy/d*v.wheelbase/scale.y},heading={x:front.x+dx/d/scale.x,y:front.y+dy/d/scale.y};return simulateManeuver([front,heading],v,scale,commands,margin);}
// Släpade enheter. Kopplingen till enhet k sitter hitchOffset meter från
// axeln på enhet k-1, mätt längs den enhetens kurs: positivt framför axeln
// (vändskiva på dragbil), negativt bakom (ledpunkt på ledbuss, dragstång).
//
// En släpad axel kan inte röra sig i sidled, vilket ger samma ekvation som
// framaxelföljningen redan använder:  dtheta/ds = sin(alpha - theta) / L,
// integrerad med RK4 mot kopplingspunktens egen färdsträcka. Formeln är
// oförändrad vid backning: där pekar alpha motsatt theta och avvikelsen växer
// av sig själv, så fällkniv uppstår utan specialfall.
//
// Fäster på frames från valfri simulate*-variant. frames[i].rear och .angle
// är dragfordonets axel i ritningskoordinater respektive kurs i metriskt rum,
// vilket gäller lika för simulate, simulateDirected, simulateManeuver,
// simulateArcRoute och simulatePilbil.
function attachUnits(sw,vehicle,scale,margin=0){
 const units=vehicle&&vehicle.units;
 if(!Array.isArray(units)||!units.length||!sw||!sw.frames||!sw.frames.length)return sw;
 if(![scale.x,scale.y].every(n=>Number.isFinite(n)&&n>0))throw Error('Ogiltig skala.');
 for(const u of units)if(!(u.wheelbase>0)||!(u.width>0)||!Number.isFinite(u.hitchOffset))throw Error('Ogiltiga mått på släpad enhet.');
 const o=sw.frames[0].rear;
 const toM=p=>({x:(p.x-o.x)*scale.x,y:(p.y-o.y)*scale.y});
 const toW=p=>({x:o.x+p.x/scale.x,y:o.y+p.y/scale.y});
 const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
 const issues=[...(sw.issues||[])];
 let towAxle=sw.frames.map(f=>toM(f.rear)),towAngle=sw.frames.map(f=>f.angle);
 const chain=[];
 for(const u of units){
  const L=u.wheelbase,hw=u.width/2,fo=u.frontOverhang||0,ro=u.rearOverhang||0;
  const hitch=towAxle.map((p,i)=>({x:p.x+Math.cos(towAngle[i])*u.hitchOffset,y:p.y+Math.sin(towAngle[i])*u.hitchOffset}));
  const angle=[],axle=[];
  let th=towAngle[0];                        // startar rakt bakom dragfordonet
  angle.push(th);axle.push({x:hitch[0].x-L*Math.cos(th),y:hitch[0].y-L*Math.sin(th)});
  for(let i=1;i<hitch.length;i++){
   const a=hitch[i-1],b=hitch[i],ds=Math.hypot(b.x-a.x,b.y-a.y);
   if(ds>1e-12){
    const al=Math.atan2(b.y-a.y,b.x-a.x),d=h=>Math.sin(al-h)/L;
    const k1=d(th),k2=d(th+ds*k1/2),k3=d(th+ds*k2/2),k4=d(th+ds*k3);
    th=th+ds*(k1+2*k2+2*k3+k4)/6;
   }
   angle.push(th);axle.push({x:hitch[i].x-L*Math.cos(th),y:hitch[i].y-L*Math.sin(th)});
  }
  const frames=axle.map((p,i)=>{
   const ux=Math.cos(angle[i]),uy=Math.sin(angle[i]);
   const corner=(lon,lat)=>toW({x:p.x+ux*lon-uy*lat,y:p.y+uy*lon+ux*lat});
   const f=L+fo,b=-ro;                       // framkant fo framför kopplingen
   return{name:u.name,angle:angle[i],axle:toW(p),hitch:toW(hitch[i]),
    articulation:norm(towAngle[i]-angle[i]),
    body:[corner(f,hw),corner(f,-hw),corner(b,-hw),corner(b,hw)],
    buffer:[corner(f+margin,hw+margin),corner(f+margin,-hw-margin),corner(b-margin,-hw-margin),corner(b-margin,hw+margin)]};
  });
  let maxArt=0;for(const fr of frames)maxArt=Math.max(maxArt,Math.abs(fr.articulation));
  const maxDeg=maxArt*180/Math.PI;
  if(Number.isFinite(u.maxArticulation)&&maxDeg>u.maxArticulation+.2)
   issues.push('Ledvinkeln når '+maxDeg.toFixed(0)+'° och överskrider gränsen '+u.maxArticulation+'°. Fordonet viker sig – justera körvägen.');
  chain.push({name:u.name,frames,maxArticulation:maxDeg});
  towAxle=axle;towAngle=angle;
 }
 // Varje frame får sina släpade enheter i samma ordning som vehicle.units.
 // Detta muterar frames avsiktligt, så ritkoden slipper hålla två listor i takt.
 sw.frames.forEach((fr,i)=>{fr.units=chain.map(c=>c.frames[i]);});
 return{...sw,units:chain,maxArticulation:Math.max(...chain.map(c=>c.maxArticulation)),
  issues:[...new Set(issues)],valid:issues.length===0};
}
// Stationär eftersläpning, sluten form. Används av testerna som facit och av
// gränssnittet för att visa väntad släpradie utan att simulera.
function steadyRadius(R1,units){
 let r=R1;
 for(const u of units){
  const rh=Math.hypot(r,u.hitchOffset),inside=rh*rh-u.wheelbase*u.wheelbase;
  if(inside<=0)throw Error('Kurvan är för snäv för den släpade enheten.');
  r=Math.sqrt(inside);
 }
 return r;
}
const api={attachUnits,steadyRadius,simulatePilbil,TAU,clamp,dist,lerp,length,area,segDist,inside,simplePolygon,calibrate,scaleCandidates,ratioScale,bounds,CAD_UNITS,PAPER,arcPoints,bulgePoints,parseDXF,smoothRoute,simulate,simulateDirected,simulateManeuver,arcToTarget,simulateArcRoute};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RR=api;
})(globalThis);
