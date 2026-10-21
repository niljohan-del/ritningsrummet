/* Tester för RR-modulen i Ritningsrummet.
 * Facit är analytiska formler och VGU:s tabellvärden, inte tidigare utdata —
 * ett test som bara speglar nuvarande beteende upptäcker inga fel.
 * Körs med:  node --test test/
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const RR = require('../src/core/rr.js');

const S1 = { x: 1, y: 1 };           // 1 px = 1 m, gör drawing-koordinater = meter
const near = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg||''} fick ${a}, väntade ${b} (±${tol})`);

const LBn = { length:12, width:2.55, wheelbase:6, frontOverhang:2.6, rearOverhang:3.4, maxSteer:35 };
const P   = { length:4.9, width:1.8, wheelbase:2.8, frontOverhang:.8, rearOverhang:1.3, maxSteer:35 };

/* ─────────────────────────── Geometri ─────────────────────────── */
describe('geometri', () => {
  test('area av enhetskvadrat', () => {
    const sq = [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
    near(RR.area(sq, S1), 1, 1e-12, 'enhetskvadrat');
  });

  test('area skalas med sx*sy', () => {
    const sq = [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
    near(RR.area(sq, {x:2,y:3}), 6, 1e-12, 'skalad kvadrat');
  });

  test('area är oberoende av vridning', () => {
    const t = Math.PI/7, rot = p => ({x:p.x*Math.cos(t)-p.y*Math.sin(t), y:p.x*Math.sin(t)+p.y*Math.cos(t)});
    const sq = [{x:0,y:0},{x:3,y:0},{x:3,y:3},{x:0,y:3}].map(rot);
    near(RR.area(sq, S1), 9, 1e-10, 'vriden kvadrat');
  });

  test('area av triangel', () => {
    near(RR.area([{x:0,y:0},{x:4,y:0},{x:0,y:3}], S1), 6, 1e-12);
  });

  test('area ger 0 för färre än tre punkter', () => {
    assert.equal(RR.area([{x:0,y:0},{x:1,y:1}], S1), 0);
  });

  test('length längs polyline och sluten', () => {
    const p = [{x:0,y:0},{x:3,y:0},{x:3,y:4}];
    near(RR.length(p, S1), 7, 1e-12, 'öppen');
    near(RR.length(p, S1, true), 12, 1e-12, 'sluten (+hypotenusa 5)');
  });

  test('inside punkt i och utanför polygon', () => {
    const sq = [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}];
    assert.equal(RR.inside({x:5,y:5}, sq), true);
    assert.equal(RR.inside({x:15,y:5}, sq), false);
  });

  test('simplePolygon avvisar självkorsande', () => {
    assert.equal(RR.simplePolygon([{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]), true);
    assert.equal(RR.simplePolygon([{x:0,y:0},{x:10,y:10},{x:10,y:0},{x:0,y:10}]), false);
  });

  test('segDist avstånd punkt till segment', () => {
    near(RR.segDist({x:5,y:3},{x:0,y:0},{x:10,y:0}), 3, 1e-12, 'vinkelrätt');
    near(RR.segDist({x:-4,y:0},{x:0,y:0},{x:10,y:0}), 4, 1e-12, 'utanför ändpunkt');
  });

  test('bounds', () => {
    const b = RR.bounds([{x:1,y:2},{x:5,y:9},{x:-3,y:4}]);
    assert.deepEqual([b.minX,b.maxX,b.minY,b.maxY,b.w,b.h], [-3,5,2,9,8,7]);
  });
});

/* ─────────────────────────── Bågar ─────────────────────────── */
describe('bågar och bulge', () => {
  test('bulge 1 ger halvcirkel med radie korda/2', () => {
    const a = {x:0,y:0}, b = {x:10,y:0};
    const pts = RR.bulgePoints(a, b, 1);
    const cx = 5, cy = 0;
    for (const p of pts) near(Math.hypot(p.x-cx, p.y-cy), 5, 1e-9, 'radie');
    near(RR.length(pts, S1), Math.PI*5, 1e-3, 'båglängd halvcirkel');
  });

  test('bulge tan(pi/8) ger 90-gradersbåge, radie korda/sqrt(2)', () => {
    const a = {x:0,y:0}, b = {x:10,y:0};
    const pts = RR.bulgePoints(a, b, Math.tan(Math.PI/8));
    const R = 10/Math.SQRT2;
    near(RR.length(pts, S1), R*Math.PI/2, 1e-3, 'båglängd kvartscirkel');
  });

  test('bulge 0 ger rak linje', () => {
    assert.deepEqual(RR.bulgePoints({x:0,y:0},{x:4,y:0},0), [{x:0,y:0},{x:4,y:0}]);
  });

  test('arcPoints full cirkel har konstant radie och rätt omkrets', () => {
    const pts = RR.arcPoints(3, -2, 7, 7, 0, 2*Math.PI);
    for (const p of pts) near(Math.hypot(p.x-3, p.y+2), 7, 1e-9, 'radie');
    near(RR.length(pts, S1), 2*Math.PI*7, 1e-2, 'omkrets');
  });
});

/* ─────────────────────────── Skala ─────────────────────────── */
describe('skala', () => {
  test('ratioScale för PDF: 1 pt = 1/72 tum', () => {
    const s = RR.ratioScale(500, {w:842, h:595, kind:'pdf'});
    near(s.x, 500*0.0254/72, 1e-12, 'meter per punkt');
    assert.equal(s.x, s.y);
  });

  test('ratioScale för bild med dpi', () => {
    const s = RR.ratioScale(100, {w:2000, h:1000, kind:'image'}, 'actual', 300);
    near(s.x, 100*0.0254/300, 1e-12);
  });

  test('ratioScale mot pappersformat A3 liggande', () => {
    // A3 = 420x297 mm. En sida med samma proportion ska ge skalan rakt ut.
    const s = RR.ratioScale(200, {w:4200, h:2970, kind:'image'}, 'A3');
    near(s.x, 420/4200/1000*200, 1e-12, 'm per px');
  });

  test('ratioScale avvisar fel proportioner mot papper', () => {
    assert.throws(() => RR.ratioScale(200, {w:4200, h:1000, kind:'image'}, 'A3'), /proportioner/);
  });

  test('ratioScale avvisar skaltal <= 0 och dpi <= 0', () => {
    assert.throws(() => RR.ratioScale(0, {w:100,h:100,kind:'image'}), /större än noll/);
    assert.throws(() => RR.ratioScale(100, {w:100,h:100,kind:'image'}, 'actual', 0), /DPI/);
  });

  test('calibrate uniform', () => {
    const s = RR.calibrate({x:0,y:0}, {x:100,y:0}, 25);
    near(s.x, 0.25, 1e-12); near(s.y, 0.25, 1e-12);
  });

  test('calibrate avvisar noll och identiska punkter', () => {
    assert.throws(() => RR.calibrate({x:0,y:0},{x:10,y:0}, 0), /större än noll/);
    assert.throws(() => RR.calibrate({x:0,y:0},{x:0,y:0}, 10), /olika/);
  });

  test('calibrate per axel kräver tidigare uniform kalibrering', () => {
    assert.throws(() => RR.calibrate({x:0,y:0},{x:10,y:0}, 5, null, 'x'), /referensmått/);
    const s = RR.calibrate({x:0,y:0},{x:10,y:0}, 5, {x:1,y:1}, 'x');
    near(s.x, 0.5, 1e-12); near(s.y, 1, 1e-12, 'y orörd');
  });

  test('scaleCandidates hittar skaltal och rangordnar explicита först', () => {
    const c = RR.scaleCandidates('Ritad 1:200 ... Skala 1:500 ...');
    assert.equal(c[0].ratio, 500, 'explicit "Skala" ska komma först');
    assert.ok(c.some(x => x.ratio === 200));
  });

  test('scaleCandidates klarar tusenavskiljare med mellanslag', () => {
    const c = RR.scaleCandidates('skala 1:1 000');
    assert.equal(c[0].ratio, 1000);
  });

  test('scaleCandidates ignorerar orimliga tal', () => {
    assert.equal(RR.scaleCandidates('1:0 och 1:999999').length, 0);
  });

  // Regression: explicit avgjordes tidigare av ett fonster pa +-80 tecken runt
  // traffen, sa ordet SKALA nagon annanstans i texten befordrade orelaterade
  // tal. En lutning 1:20 hamnade da forst och gav 20 ggr fel pa alla matt.
  test('lutning befordras inte av ett SKALA langre bort i texten', () => {
    const c = RR.scaleCandidates('A3 utskrift. Lutning 1:20 i korsningen. SKALA 1:400');
    assert.equal(c[0].ratio, 400, 'den riktiga skalan ska ligga forst');
    assert.equal(c.find(x => x.ratio === 20).explicit, false, 'lutningen ar inte explicit');
  });

  test('explicit kraver att traffen inleds med skala eller scale', () => {
    assert.equal(RR.scaleCandidates('Skala 1:500')[0].explicit, true);
    assert.equal(RR.scaleCandidates('Ritad 1:200')[0].explicit, false);
    assert.equal(RR.scaleCandidates('scale=1:250')[0].explicit, true);
  });
});

/* ─────────────────────────── smoothRoute ─────────────────────────── */
describe('smoothRoute', () => {
  test('rak väg ger konstant kurs och rätt längd', () => {
    const r = RR.smoothRoute([{x:0,y:0},{x:50,y:0}], 10);
    assert.deepEqual(r.issues, []);
    near(RR.length(r.points, S1), 50, 1e-9, 'längd');
    for (const p of r.points) near(p.heading, 0, 1e-12, 'kurs');
  });

  test('90-gradershörn blir tangentkontinuerligt', () => {
    const r = RR.smoothRoute([{x:0,y:0},{x:50,y:0},{x:50,y:50}], 10);
    assert.deepEqual(r.issues, []);
    // kursen ska vrida sig jämnt från 0 till pi/2 utan hopp
    let maxJump = 0;
    for (let i=1;i<r.points.length;i++){
      const d = Math.abs(Math.atan2(Math.sin(r.points[i].heading-r.points[i-1].heading),
                                    Math.cos(r.points[i].heading-r.points[i-1].heading)));
      maxJump = Math.max(maxJump, d);
    }
    assert.ok(maxJump < 0.05, `kurshopp ${maxJump} rad är för stort`);
    near(r.points.at(-1).heading, Math.PI/2, 1e-6, 'slutkurs');
    // längd = 2*(50-trim) + kvartsbåge,  trim = R*tan(45°) = R
    near(RR.length(r.points, S1), 2*(50-10) + 10*Math.PI/2, 1e-2, 'längd med rundat hörn');
  });

  test('för tätt placerade punkter ger varning', () => {
    const r = RR.smoothRoute([{x:0,y:0},{x:5,y:0},{x:5,y:5}], 20);
    assert.ok(r.issues.some(s => /för tätt/.test(s)), 'förväntade varning om täthet');
  });

  test('kräver minst två punkter', () => {
    assert.throws(() => RR.smoothRoute([{x:0,y:0}], 10), /minst två/);
  });
});

/* ───────────── simulate: framaxelföljning, cykelmodell ───────────── */
describe('simulate — stationärt körspår', () => {
  // Analytiskt facit: följer framaxeln en cirkel med radie Rf, hamnar bakaxeln
  // på Rr = sqrt(Rf^2 - L^2) och styrutslaget blir asin(L/Rf).
  const circleRoute = (R, n, laps) => {
    const p = [];
    for (let i = 0; i <= n*laps; i++) {
      const a = 2*Math.PI*i/n;
      p.push({ x: R*Math.cos(a), y: R*Math.sin(a) });
    }
    return p;
  };

  test('bakaxelns offtracking mot analytiskt värde (LBn, Rf=12 m)', () => {
    const Rf = 12, L = LBn.wheelbase;
    const sw = RR.simulate(circleRoute(Rf, 2000, 3), LBn, S1, 5);
    const f = sw.frames.at(-1);
    // cirkelns centrum i world-koordinater: route börjar i (Rf,0) och origin flyttas dit
    const cx = sw.frames[0].front.x - Rf, cy = sw.frames[0].front.y;
    const rearR = Math.hypot(f.rear.x - cx, f.rear.y - cy);
    near(rearR, Math.sqrt(Rf*Rf - L*L), 0.01, 'bakaxelradie');
  });

  test('styrutslaget mot analytiskt asin(L/Rf)', () => {
    const Rf = 12, L = LBn.wheelbase;
    const sw = RR.simulate(circleRoute(Rf, 2000, 3), LBn, S1, 5);
    const steerDeg = Math.abs(sw.frames.at(-1).steer) * 180/Math.PI;
    near(steerDeg, Math.asin(L/Rf)*180/Math.PI, 0.1, 'styrutslag');
  });

  test('framaxeln håller cirkelradien genom hela varvet', () => {
    const Rf = 20;
    const sw = RR.simulate(circleRoute(Rf, 2000, 1), P, S1, 5);
    const cx = sw.frames[0].front.x - Rf, cy = sw.frames[0].front.y;
    let worst = 0;
    for (const f of sw.frames) worst = Math.max(worst, Math.abs(Math.hypot(f.front.x-cx, f.front.y-cy) - Rf));
    assert.ok(worst < 0.02, `framaxeln avviker ${worst.toFixed(4)} m från radien`);
  });

  test('rak körning ger noll styrutslag', () => {
    const sw = RR.simulate([{x:0,y:0},{x:100,y:0}], LBn, S1, 10);
    near(sw.maxSteer, 0, 1e-6, 'maxSteer i grader');
    assert.equal(sw.valid, true);
  });

  test('karossens mått följer fordonsdata', () => {
    const sw = RR.simulate([{x:0,y:0},{x:60,y:0}], LBn, S1, 10);
    const b = sw.frames.at(-1).body;      // [fram-v, fram-h, bak-h, bak-v]
    near(Math.hypot(b[0].x-b[1].x, b[0].y-b[1].y), LBn.width, 1e-9, 'bredd fram');
    near(Math.hypot(b[0].x-b[3].x, b[0].y-b[3].y), LBn.length, 1e-9, 'total längd');
  });

  test('buffertzonen växer med marginalen', () => {
    const m = 0.5;
    const sw = RR.simulate([{x:0,y:0},{x:60,y:0}], LBn, S1, 10, m);
    const f = sw.frames.at(-1);
    near(Math.hypot(f.buffer[0].x-f.buffer[1].x, f.buffer[0].y-f.buffer[1].y),
         LBn.width + 2*m, 1e-9, 'bredd med marginal');
    near(Math.hypot(f.buffer[0].x-f.buffer[3].x, f.buffer[0].y-f.buffer[3].y),
         LBn.length + 2*m, 1e-9, 'längd med marginal');
  });

  test('för snäv kurva flaggas mot fordonets styrgräns', () => {
    // Rf = 7 m ger asin(6/7) = 59 grader, långt över LBn:s 35
    const sw = RR.simulate(circleRoute(7, 2000, 1), LBn, S1, 3);
    assert.ok(sw.maxSteer > LBn.maxSteer, `maxSteer ${sw.maxSteer} skulle överskrida gränsen`);
    assert.ok(sw.issues.some(s => /[Ss]tyrutslag/.test(s)), 'förväntade varning om styrutslag');
    assert.equal(sw.valid, false);
  });

  test('för kort körväg avvisas', () => {
    assert.throws(() => RR.simulate([{x:0,y:0},{x:0.01,y:0}], LBn, S1, 5), /för kort/);
  });
});

/* ───────── simulateManeuver: exakt rörelse vid konstant styrutslag ───────── */
describe('simulateManeuver — exakt bågrörelse', () => {
  const pose = (L) => [{x:L,y:0},{x:L+1,y:0}];   // framaxel i (L,0), nos mot +x

  test('konstant styrutslag ger bakaxelradie L/tan(delta)', () => {
    const d = 30, L = LBn.wheelbase, R = L/Math.tan(d*Math.PI/180);
    const sw = RR.simulateManeuver(pose(L), LBn, S1, [{distance: R*Math.PI/2, steer: d}]);
    const start = sw.frames[0].rear;
    // centrum ligger R till vänster om startpunkten (positivt styrutslag = vänster)
    const cx = start.x, cy = start.y + R;
    let worst = 0;
    for (const f of sw.frames) worst = Math.max(worst, Math.abs(Math.hypot(f.rear.x-cx, f.rear.y-cy) - R));
    assert.ok(worst < 1e-6, `bakaxeln avviker ${worst} m från radien ${R.toFixed(3)}`);
  });

  test('kursändring = sträcka * tan(delta) / L', () => {
    const d = 20, L = P.wheelbase, dist = 15;
    const sw = RR.simulateManeuver(pose(L), P, S1, [{distance: dist, steer: d}]);
    const dth = sw.frames.at(-1).angle - sw.frames[0].angle;
    near(dth, dist*Math.tan(d*Math.PI/180)/L, 1e-9, 'kursändring i radianer');
  });

  test('styrutslag noll ger exakt rak förflyttning', () => {
    const L = LBn.wheelbase;
    const sw = RR.simulateManeuver(pose(L), LBn, S1, [{distance: 42, steer: 0}]);
    const a = sw.frames[0].rear, b = sw.frames.at(-1).rear;
    near(b.x - a.x, 42, 1e-9, 'x'); near(b.y - a.y, 0, 1e-12, 'y');
  });

  test('backning flyttar fordonet bakåt', () => {
    const L = LBn.wheelbase;
    const sw = RR.simulateManeuver(pose(L), LBn, S1, [{distance: -10, steer: 0}]);
    near(sw.frames.at(-1).rear.x - sw.frames[0].rear.x, -10, 1e-9);
    near(sw.reverseLength, 10, 1e-9, 'backad längd räknas positivt');
  });

  test('backning med styrutslag ger samma radie som framåt', () => {
    const d = 25, L = LBn.wheelbase, R = L/Math.tan(d*Math.PI/180);
    const sw = RR.simulateManeuver(pose(L), LBn, S1, [{distance: -R*Math.PI/4, steer: d}]);
    const start = sw.frames[0].rear, cx = start.x, cy = start.y + R;
    let worst = 0;
    for (const f of sw.frames) worst = Math.max(worst, Math.abs(Math.hypot(f.rear.x-cx, f.rear.y-cy) - R));
    assert.ok(worst < 1e-6, `backradien avviker ${worst} m`);
  });

  test('flera körsteg i följd summerar längderna', () => {
    const L = LBn.wheelbase;
    const sw = RR.simulateManeuver(pose(L), LBn, S1,
      [{distance: 10, steer: 0}, {distance: -4, steer: 10}, {distance: 6, steer: -10}]);
    near(sw.forwardLength, 16, 1e-9, 'framåt');
    near(sw.reverseLength, 4, 1e-9, 'bakåt');
  });

  test('avvisar orimliga körsteg', () => {
    const L = LBn.wheelbase;
    assert.throws(() => RR.simulateManeuver(pose(L), LBn, S1, [{distance: 999, steer: 0}]), /körsteg/);
    assert.throws(() => RR.simulateManeuver(pose(L), LBn, S1, [{distance: 5, steer: 90}]), /körsteg/);
    assert.throws(() => RR.simulateManeuver(pose(L), LBn, S1, [{distance: 0, steer: 0}]), /körsteg/);
  });

  test('flaggar styrutslag över fordonets gräns', () => {
    const L = LBn.wheelbase;
    const sw = RR.simulateManeuver(pose(L), LBn, S1, [{distance: 5, steer: 60}]);
    assert.ok(sw.issues.some(s => /[Ss]tyrutslag/.test(s)));
    assert.equal(sw.valid, false);
  });
});

/* ─────────────────────────── arcToTarget ─────────────────────────── */
describe('arcToTarget', () => {
  test('mål rakt fram ger noll styrutslag och sträckan dit', () => {
    const q = RR.arcToTarget({x:0,y:0}, 0, {x:25,y:0}, 1, LBn, S1);
    near(q.steer, 0, 1e-9, 'styrutslag');
    near(q.distance, 25, 1e-9, 'sträcka');
    near(q.heading, 0, 1e-12, 'kurs');
  });

  test('mål på känd båge återger bågens radie', () => {
    // kvartscirkel radie R åt vänster från origin med kurs 0 slutar i (R, R)
    const R = 15;
    const q = RR.arcToTarget({x:0,y:0}, 0, {x:R,y:R}, 1, LBn, S1);
    near(Math.abs(LBn.wheelbase/Math.tan(q.steer*Math.PI/180)), R, 1e-9, 'radie ur styrutslag');
    near(q.distance, R*Math.PI/2, 1e-9, 'båglängd');
    near(q.heading, Math.PI/2, 1e-12, 'slutkurs 90 grader');
  });

  test('mål bakom fordonet kräver backning', () => {
    assert.throws(() => RR.arcToTarget({x:0,y:0}, 0, {x:-20,y:0}, 1, LBn, S1), /bakom fordonet/);
    const q = RR.arcToTarget({x:0,y:0}, 0, {x:-20,y:0}, -1, LBn, S1);
    near(q.distance, -20, 1e-9, 'negativ sträcka vid backning');
  });

  test('för snäv sväng avvisas mot styrgränsen', () => {
    assert.throws(() => RR.arcToTarget({x:0,y:0}, 0, {x:2,y:4}, 1, LBn, S1), /snäv/);
  });

  test('kräver giltig körriktning och skilda punkter', () => {
    assert.throws(() => RR.arcToTarget({x:0,y:0}, 0, {x:10,y:0}, 0, LBn, S1), /framåt eller backning/);
    assert.throws(() => RR.arcToTarget({x:0,y:0}, 0, {x:0,y:0}, 1, LBn, S1), /bakaxeln/);
  });
});

/* ─────────────────────────── simulateDirected ─────────────────────────── */
describe('simulateDirected — växling mellan framåt och back', () => {
  test('rak körning framåt sedan back ger kontinuerlig kurs', () => {
    const route = [{x:0,y:0},{x:40,y:0},{x:10,y:0}];
    const sw = RR.simulateDirected(route, LBn, S1, 8, 0, [1, -1]);
    near(sw.forwardLength, 40, 0.01, 'framåt');
    near(sw.reverseLength, 30, 0.01, 'bakåt');
    // kursen ska inte hoppa vid växlingen
    let maxJump = 0;
    for (let i=1;i<sw.frames.length;i++)
      maxJump = Math.max(maxJump, Math.abs(Math.atan2(
        Math.sin(sw.frames[i].angle-sw.frames[i-1].angle),
        Math.cos(sw.frames[i].angle-sw.frames[i-1].angle))));
    assert.ok(maxJump < 0.05, `kurshopp ${maxJump} rad vid växling`);
  });

  test('riktningar måste vara ett per segment', () => {
    assert.throws(() => RR.simulateDirected([{x:0,y:0},{x:10,y:0}], LBn, S1, 5, 0, [1,1]), /körriktningar/);
    assert.throws(() => RR.simulateDirected([{x:0,y:0},{x:10,y:0}], LBn, S1, 5, 0, [0]), /körriktningar/);
  });

  test('varje frame bär sin växel', () => {
    const sw = RR.simulateDirected([{x:0,y:0},{x:40,y:0},{x:10,y:0}], LBn, S1, 8, 0, [1,-1]);
    assert.ok(sw.frames.some(f => f.direction === 1), 'framåt-frames saknas');
    assert.ok(sw.frames.some(f => f.direction === -1), 'back-frames saknas');
  });
});

/* ─────────────────────────── DXF ─────────────────────────── */
describe('parseDXF', () => {
  const dxf = (...pairs) => pairs.join('\n') + '\n';

  test('läser en LINE i modellrymden', () => {
    const t = dxf('0','SECTION','2','ENTITIES',
                  '0','LINE','8','VAG','10','0','20','0','11','10','21','0',
                  '0','ENDSEC','0','EOF');
    const r = RR.parseDXF(t);
    assert.equal(r.shapes.length, 1);
    assert.equal(r.shapes[0].type, 'polyline');
    near(r.w, 10 + 2*(10*0.025), 1e-9, 'bredd med marginal');
    assert.deepEqual(r.layers, ['VAG']);
  });

  test('sluten LWPOLYLINE ger rätt area', () => {
    const t = dxf('0','SECTION','2','ENTITIES',
      '0','LWPOLYLINE','8','0','90','4','70','1',
      '10','0','20','0','10','10','20','0','10','10','20','10','10','0','20','10',
      '0','ENDSEC','0','EOF');
    const r = RR.parseDXF(t);
    const s = r.shapes[0];
    assert.equal(s.closed, true);
    near(RR.area(s.points, S1), 100, 1e-9, 'kvadrat 10x10');
  });

  test('tolkar $INSUNITS som enhet', () => {
    const t = dxf('0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC',
      '0','SECTION','2','ENTITIES','0','LINE','8','0','10','0','20','0','11','5','21','0',
      '0','ENDSEC','0','EOF');
    const r = RR.parseDXF(t);
    assert.equal(r.unitCode, 4);
    assert.equal(r.unit.name, 'mm');
  });

  test('avvisar binär DXF med tydligt besked', () => {
    assert.throws(() => RR.parseDXF('AutoCAD Binary DXF\u0000'), /Binär DXF/);
  });

  test('avvisar fil utan stödda objekt', () => {
    assert.throws(() => RR.parseDXF(dxf('0','SECTION','2','ENTITIES','0','ENDSEC','0','EOF')),
                  /Inga stödda 2D-objekt/);
  });

  test('räknar okända objektstyper som varningar i stället för att krascha', () => {
    const t = dxf('0','SECTION','2','ENTITIES',
      '0','HELIX','8','0','10','0','20','0',
      '0','LINE','8','0','10','0','20','0','11','5','21','0',
      '0','ENDSEC','0','EOF');
    const r = RR.parseDXF(t);
    assert.equal(r.shapes.length, 1);
    assert.equal(r.warnings.HELIX, 1);
  });

  test('hoppar över pappersrymd', () => {
    const t = dxf('0','SECTION','2','ENTITIES',
      '0','LINE','8','0','67','1','10','0','20','0','11','5','21','0',
      '0','LINE','8','0','10','0','20','0','11','5','21','0',
      '0','ENDSEC','0','EOF');
    const r = RR.parseDXF(t);
    assert.equal(r.shapes.length, 1);
    assert.equal(r.warnings['Pappersrymd'], 1);
  });

  test('expanderar INSERT av block', () => {
    const t = dxf('0','SECTION','2','BLOCKS',
      '0','BLOCK','2','KRYSS','10','0','20','0',
      '0','LINE','8','0','10','0','20','0','11','2','21','0',
      '0','ENDBLK',
      '0','ENDSEC',
      '0','SECTION','2','ENTITIES',
      '0','INSERT','2','KRYSS','8','SYM','10','50','20','50',
      '0','ENDSEC','0','EOF');
    const r = RR.parseDXF(t);
    assert.equal(r.shapes.length, 1, 'blocket ska ha expanderats till en linje');
    near(RR.length(r.shapes[0].points, S1), 2, 1e-9, 'linjens längd ur blocket');
  });

  test('vänder y-axeln så ritningen hamnar med origo uppe till vänster', () => {
    const t = dxf('0','SECTION','2','ENTITIES',
      '0','LINE','8','0','10','0','20','0','11','0','21','10',
      '0','ENDSEC','0','EOF');
    const r = RR.parseDXF(t);
    const ys = r.shapes[0].points.map(p => p.y);
    assert.ok(ys[0] > ys[1], 'punkten med högst y i DXF ska få lägst y i bilden');
  });
});
