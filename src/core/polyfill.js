/* Nyare webbläsarfunktioner som pdf.js förutsätter. */
'use strict';
for(const C of [Map,typeof WeakMap!=='undefined'?WeakMap:null]){if(!C)continue;
 if(!C.prototype.getOrInsert)Object.defineProperty(C.prototype,'getOrInsert',{value(k,v){if(!this.has(k))this.set(k,v);return this.get(k);},writable:true,configurable:true});
 if(!C.prototype.getOrInsertComputed)Object.defineProperty(C.prototype,'getOrInsertComputed',{value(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k);},writable:true,configurable:true});}
