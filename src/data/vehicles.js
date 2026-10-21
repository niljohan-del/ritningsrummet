/* Typfordon.
 *
 * STELA FORDON (P, LBn, custom)
 * Mått transkriberade ur Trafikverket VGU, Begrepp och grundvärden,
 * figur 2.2-6 och 2.2-10. Rear overhang = length - wheelbase - front overhang.
 *
 * LEDADE FORDON (Bl, Lps)
 * Mått ur Trafikverkets projektrapport DETESS 1.0 (2020-06-15, Per Strömgren),
 * figur 5.13 och 5.14, som redovisar både VGU:s värden och nya uppmätta.
 * https://fudinfo.trafikverket.se/fudinfoexternwebb/Publikationer/Publikationer_005601_005700/Publikation_005655/Detess%20ver.%201.0.pdf
 *
 *   Bl  — VGU:s uppsättning används, eftersom den summerar exakt till angiven
 *         längd: 2,8 + 5,1 + 2,2 + 5,0 + 2,9 = 18,0 m. Ledpunkten ligger
 *         2,2 m bakom mittaxeln och 5,0 m framför bakaxeln, enligt figuren.
 *
 *   Lps — de nya uppmätta värdena används, eftersom VGU:s gamla uppsättning är
 *         internt motstridig: den placerar vändskivan 1,1 m BAKOM drivboggin,
 *         vilket är fysiskt omöjligt. De nya värdena är konsistenta.
 *         hitchOffset är HÄRLEDD, inte citerad: ur längdkedjan
 *         16,5 = 1,5 + x + 8,15 + 3,85 följer x = 3,0 m från framaxeln till
 *         vändskivan, mot boggin på 3,3 m — alltså 0,3 m framför boggin.
 *
 * length är den DRAGANDE enhetens egen längd, inte ekipagets. Appens
 * projektvalidering kräver length === wheelbase + frontOverhang + rearOverhang.
 * Hela ekipagets längd ligger i rigLength och används bara för visning.
 *
 * hitchOffset mäts från den dragande enhetens axel längs dess kurs:
 * positivt = framför axeln (vändskiva), negativt = bakom (ledpunkt, dragstång).
 *
 * maxSteer och maxArticulation är uttryckliga, redigerbara
 * simuleringsantaganden — inte VGU-värden.
 *
 * vguTurningRadius och vguSweptWidth är VGU:s publicerade vändradie och
 * körvidd, med för visning och jämförelse. De återges INTE av en stationär
 * beräkning: största körvidd uppstår i genomfarten in i och ur kurvan, inte i
 * stationärt tillstånd, och för långa ekipage skiljer det sig märkbart.
 *
 * Typfordon Ls (lastbil med släp, 23,8 m) saknas medvetet. Varken VGU:s
 * grundvärden eller DETESS publicerar dess axel- och dragstångsgeometri, och
 * ett verkligt timmersläp är dollystyrt — tre kroppar, inte två. Att gissa
 * måtten vore att bygga in precis den sorts fel verktyget ska upptäcka.
 * Modellen klarar kedjor av flera enheter, så Ls kan läggas till som data
 * så snart geometrin finns belagd.
 */
const VGU_URL = 'https://trafikverket.diva-portal.org/smash/get/diva2%3A1542418/FULLTEXT01.pdf';
const DETESS_URL = 'https://fudinfo.trafikverket.se/fudinfoexternwebb/Publikationer/Publikationer_005601_005700/Publikation_005655/Detess%20ver.%201.0.pdf';

globalThis.VEHICLES=[
 {id:'P',name:'P · Personbil',length:4.9,width:1.8,wheelbase:2.8,frontOverhang:.8,rearOverhang:1.3,maxSteer:35,source:'VGU, figur 2.2-6',sourceURL:VGU_URL},
 {id:'LBn',name:'LBn · Lastbil / normalbuss',length:12,width:2.55,wheelbase:6,frontOverhang:2.6,rearOverhang:3.4,maxSteer:35,source:'VGU, figur 2.2-10',sourceURL:VGU_URL},

 {id:'Bl',name:'Bl · Ledbuss',
  length:10.1,width:2.55,wheelbase:5.1,frontOverhang:2.8,rearOverhang:2.2,maxSteer:35,
  rigLength:18.0,vguTurningRadius:12.0,vguSweptWidth:6.7,
  units:[{name:'Bakvagn',hitchOffset:-2.2,wheelbase:5.0,width:2.55,frontOverhang:0,rearOverhang:2.9,maxArticulation:50}],
  source:'DETESS 1.0, figur 5.13 (VGU:s uppsättning). Ledpunkt 2,2 m bakom mittaxeln.',sourceURL:DETESS_URL},

 {id:'Lps',name:'Lps · Dragbil med påhängsvagn',
  length:6.2,width:2.6,wheelbase:3.3,frontOverhang:1.5,rearOverhang:1.4,maxSteer:35,
  rigLength:16.5,vguTurningRadius:16.0,vguSweptWidth:8.5,
  units:[{name:'Påhängsvagn',hitchOffset:.3,wheelbase:8.15,width:2.6,frontOverhang:1.6,rearOverhang:3.85,maxArticulation:75}],
  source:'DETESS 1.0, figur 5.14 (nya uppmätta värden). Vändskivans läge härlett ur längdkedjan.',sourceURL:DETESS_URL},

 {id:'custom',name:'Eget stelt fordon',length:7,width:2.3,wheelbase:3.8,frontOverhang:1.2,rearOverhang:2,maxSteer:35,source:'Egna indata; exempelvärden, ej VGU-typfordon',sourceURL:''}
];

if(typeof module!=='undefined'&&module.exports)module.exports=globalThis.VEHICLES;
