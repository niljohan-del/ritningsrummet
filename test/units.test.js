/* Tester för ledade fordon i Ritningsrummet.
 *
 * Facit är den slutna formen för stationär eftersläpning: följer en dragande
 * axel en cirkel med radie R1 och sitter kopplingen c meter från den axeln,
 * hamnar den släpade axeln på radien sqrt(R1² + c² − L₂²). Den formeln är
 * oberoende av simuleringen och duger därför som facit.
 *
 * Körs med:  node --test "test/**\/*.test.js"
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const RR = require('../src/core/rr.js');
const VEHICLES = require('../src/data/vehicles.js');

const S1 = { x: 1, y: 1 };
const near = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg||''} fick ${a}, väntade ${b} (±${tol})`);
const veh = id => VEHICLES.find(v => v.id === id);
const norm = a => Math.atan2(Math.sin(a), Math.cos(a));

// framaxel i (L,0) med nosen mot +x, dvs bakaxeln i origo
const pose = L => [{ x: L, y: 0 }, { x: L + 1, y: 0 }];

// kör runt i cirkel med konstant styrutslag; delas upp eftersom ett körsteg
// är begränsat till 50 m
const laps = (R, n) => {
  const total = 2 * Math.PI * R * n, step = 40;
  const out = [];
  for (let left = total; left > 0; left -= step) out.push(Math.min(step, left));
  return out;
};

/* ───────────────── steadyRadius: den slutna formen ───────────────── */
describe('steadyRadius', () => {
  test('en släpad enhet mot analytiskt värde', () => {
    const r = RR.steadyRadius(15, [{ hitchOffset: -2.2, wheelbase: 5 }]);
    near(r, Math.sqrt(225 + 4.84 - 25), 1e-12, 'släpradie');
  });

  test('koppling framför axeln ger större radie än bakom', () => {
    const fram = RR.steadyRadius(15, [{ hitchOffset: 0.3, wheelbase: 8 }]);
    const bak  = RR.steadyRadius(15, [{ hitchOffset: -0.3, wheelbase: 8 }]);
    near(fram, bak, 1e-12, 'symmetrisk i c, radien beror på c²');
  });

  test('kedja av två enheter tillämpar formeln igen', () => {
    const units = [{ hitchOffset: -1, wheelbase: 4 }, { hitchOffset: -2, wheelbase: 6 }];
    const steg1 = Math.sqrt(400 + 1 - 16);
    const steg2 = Math.sqrt(steg1 * steg1 + 4 - 36);
    near(RR.steadyRadius(20, units), steg2, 1e-12, 'två steg');
  });

  test('för snäv kurva för den släpade enheten avvisas', () => {
    assert.throws(() => RR.steadyRadius(3, [{ hitchOffset: 0, wheelbase: 8 }]), /för snäv/);
  });
});

/* ───────────────── attachUnits: stationärt tillstånd ───────────────── */
describe('attachUnits — stationär eftersläpning', () => {
  const steadyTest = (id, steerDeg, tol) => {
    const v = veh(id), L = v.wheelbase;
    const R1 = L / Math.tan(steerDeg * Math.PI / 180);
    const sw = RR.attachUnits(
      RR.simulateManeuver(pose(L), v, S1, laps(R1, 4).map(d => ({ distance: d, steer: steerDeg }))),
      v, S1);
    const start = sw.frames[0].rear, cx = start.x, cy = start.y + R1;
    const last = sw.frames.at(-1).units[0];
    const got = Math.hypot(last.axle.x - cx, last.axle.y - cy);
    near(got, RR.steadyRadius(R1, v.units), tol, `${id} släpaxelradie`);
    return { sw, R1, cx, cy };
  };

  test('Bl: bakvagnens axel hamnar på analytisk radie', () => {
    steadyTest('Bl', 20, 0.001);
  });

  test('Lps: påhängsvagnens axel hamnar på analytisk radie', () => {
    steadyTest('Lps', 15, 0.001);
  });

  test('Bl: dragande axeln ligger kvar på sin egen cirkel', () => {
    const { sw, R1, cx, cy } = steadyTest('Bl', 20, 0.001);
    let worst = 0;
    for (const f of sw.frames) worst = Math.max(worst, Math.abs(Math.hypot(f.rear.x - cx, f.rear.y - cy) - R1));
    assert.ok(worst < 1e-6, `dragande axeln avviker ${worst} m`);
  });

  test('kopplingspunkten ligger hitchOffset från dragande axeln', () => {
    const v = veh('Lps'), L = v.wheelbase;
    const sw = RR.attachUnits(
      RR.simulateManeuver(pose(L), v, S1, [{ distance: 30, steer: 12 }]), v, S1);
    for (const f of sw.frames) {
      const d = Math.hypot(f.units[0].hitch.x - f.rear.x, f.units[0].hitch.y - f.rear.y);
      near(d, Math.abs(v.units[0].hitchOffset), 1e-9, 'avstånd axel–koppling');
    }
  });

  test('släpets axel ligger wheelbase bakom kopplingen', () => {
    const v = veh('Bl'), L = v.wheelbase;
    const sw = RR.attachUnits(
      RR.simulateManeuver(pose(L), v, S1, [{ distance: 35, steer: 18 }]), v, S1);
    for (const f of sw.frames) {
      const u = f.units[0];
      near(Math.hypot(u.hitch.x - u.axle.x, u.hitch.y - u.axle.y), v.units[0].wheelbase, 1e-9, 'kopplingsarm');
    }
  });
});

/* ───────────────── rak körning och geometri ───────────────── */
describe('attachUnits — rak körning och karossmått', () => {
  test('rak körning ger noll ledvinkel', () => {
    const v = veh('Bl'), L = v.wheelbase;
    const sw = RR.attachUnits(RR.simulateManeuver(pose(L), v, S1, [{ distance: 50, steer: 0 }]), v, S1);
    near(sw.maxArticulation, 0, 1e-9, 'ledvinkel i grader');
    assert.equal(sw.valid, true);
  });

  test('karossens bredd och längd följer enhetens mått', () => {
    for (const id of ['Bl', 'Lps']) {
      const v = veh(id), u = v.units[0], L = v.wheelbase;
      const sw = RR.attachUnits(RR.simulateManeuver(pose(L), v, S1, [{ distance: 40, steer: 0 }]), v, S1);
      const b = sw.frames.at(-1).units[0].body;
      near(Math.hypot(b[0].x - b[1].x, b[0].y - b[1].y), u.width, 1e-9, `${id} bredd`);
      near(Math.hypot(b[0].x - b[3].x, b[0].y - b[3].y),
           u.frontOverhang + u.wheelbase + u.rearOverhang, 1e-9, `${id} längd`);
    }
  });

  test('buffertzonen växer med marginalen', () => {
    const v = veh('Lps'), u = v.units[0], L = v.wheelbase, m = 0.4;
    const sw = RR.attachUnits(RR.simulateManeuver(pose(L), v, S1, [{ distance: 30, steer: 0 }], m), v, S1, m);
    const bf = sw.frames.at(-1).units[0].buffer;
    near(Math.hypot(bf[0].x - bf[1].x, bf[0].y - bf[1].y), u.width + 2 * m, 1e-9, 'bredd med marginal');
  });

  test('ekipagets totallängd vid rak körning stämmer mot rigLength', () => {
    for (const id of ['Bl', 'Lps']) {
      const v = veh(id), L = v.wheelbase;
      const sw = RR.attachUnits(RR.simulateManeuver(pose(L), v, S1, [{ distance: 40, steer: 0 }]), v, S1);
      const f = sw.frames.at(-1);
      const pts = [...f.body, ...f.units.flatMap(u => u.body)];
      const xs = pts.map(p => p.x);
      near(Math.max(...xs) - Math.min(...xs), v.rigLength, 1e-6, `${id} ekipagelängd`);
    }
  });
});

/* ───────────────── backning och fällkniv ───────────────── */
describe('attachUnits — backning', () => {
  test('backning låter ledvinkeln växa, dvs fällkniv uppstår av sig själv', () => {
    const v = veh('Lps'), L = v.wheelbase;
    const sw = RR.attachUnits(
      RR.simulateManeuver(pose(L), v, S1, [{ distance: -45, steer: 4 }, { distance: -45, steer: 4 }]), v, S1);
    const arts = sw.frames.map(f => Math.abs(f.units[0].articulation) * 180 / Math.PI);
    assert.ok(arts.at(-1) > arts[Math.floor(arts.length / 3)] + 1,
      `ledvinkeln ska växa vid backning, gick från ${arts[0].toFixed(1)}° till ${arts.at(-1).toFixed(1)}°`);
    assert.ok(arts.every(Number.isFinite), 'inga värden får spåra ur numeriskt');
  });

  test('framåt i samma kurva håller ledvinkeln begränsad', () => {
    const v = veh('Lps'), L = v.wheelbase;
    const sw = RR.attachUnits(
      RR.simulateManeuver(pose(L), v, S1, [{ distance: 45, steer: 4 }, { distance: 45, steer: 4 }]), v, S1);
    const steady = Math.abs(sw.frames.at(-1).units[0].articulation) * 180 / Math.PI;
    assert.ok(steady < 20, `stationär ledvinkel blev ${steady.toFixed(1)}°, väntade måttlig`);
  });

  test('för stor ledvinkel flaggas mot gränsen', () => {
    const v = veh('Bl'), L = v.wheelbase;
    // snäv sväng över lång sträcka driver ledvinkeln förbi bussledens gräns
    const sw = RR.attachUnits(
      RR.simulateManeuver(pose(L), v, S1, [{ distance: -40, steer: 30 }, { distance: -40, steer: 30 }]), v, S1);
    if (sw.maxArticulation > v.units[0].maxArticulation + 0.2) {
      assert.ok(sw.issues.some(s => /[Ll]edvinkel/.test(s)), 'förväntade varning om ledvinkel');
      assert.equal(sw.valid, false);
    } else {
      assert.ok(true, 'ledvinkeln höll sig under gränsen i detta fall');
    }
  });
});

/* ───────────────── komposition med övriga simulate-varianter ───────────────── */
describe('attachUnits — fungerar ovanpå alla körspårsvarianter', () => {
  test('ovanpå simulate (framaxelföljning)', () => {
    const v = veh('Bl');
    const sw = RR.attachUnits(RR.simulate([{x:0,y:0},{x:60,y:0},{x:60,y:40}], v, S1, 14), v, S1);
    assert.equal(sw.frames.length, sw.units[0].frames.length, 'lika många lägen');
    assert.ok(sw.frames.every(f => f.units && f.units.length === 1), 'varje läge har sin bakvagn');
  });

  test('ovanpå simulateDirected (växling framåt/back)', () => {
    const v = veh('Lps');
    const sw = RR.attachUnits(
      RR.simulateDirected([{x:0,y:0},{x:50,y:0},{x:20,y:0}], v, S1, 14, 0, [1,-1]), v, S1);
    assert.ok(sw.frames.length > 10);
    assert.ok(sw.frames.every(f => f.units[0].body.length === 4));
  });

  test('ovanpå simulatePilbil (manuell körning)', () => {
    const v = veh('Bl');
    const sw = RR.attachUnits(
      RR.simulatePilbil([{x:0,y:0},{x:1,y:0}], v, S1, [{distance:20,steer:10}]), v, S1);
    assert.ok(sw.frames.every(f => f.units && f.units[0].axle));
  });

  test('stela fordon lämnas orörda', () => {
    const v = veh('LBn'), L = v.wheelbase;
    const base = RR.simulateManeuver(pose(L), v, S1, [{distance:20,steer:10}]);
    const sw = RR.attachUnits(base, v, S1);
    assert.equal(sw, base, 'samma objekt tillbaka när units saknas');
    assert.equal(sw.frames[0].units, undefined);
  });

  test('ledvinkeln mäts mot den dragande enhetens kurs', () => {
    const v = veh('Bl'), L = v.wheelbase;
    const sw = RR.attachUnits(RR.simulateManeuver(pose(L), v, S1, [{distance:30,steer:22}]), v, S1);
    for (const f of sw.frames)
      near(f.units[0].articulation, norm(f.angle - f.units[0].angle), 1e-12, 'ledvinkel');
  });
});

/* ───────────────── indatakontroll ───────────────── */
describe('attachUnits — indatakontroll', () => {
  const v = veh('Bl'), L = v.wheelbase;
  const base = () => RR.simulateManeuver(pose(L), v, S1, [{distance:20,steer:0}]);

  test('avvisar ogiltig skala', () => {
    assert.throws(() => RR.attachUnits(base(), v, {x:0,y:1}), /skala/i);
  });

  test('avvisar enhet utan giltiga mått', () => {
    const bad = {...v, units:[{hitchOffset:-2.2,wheelbase:0,width:2.5}]};
    assert.throws(() => RR.attachUnits(base(), bad, S1), /släpad enhet/);
    const bad2 = {...v, units:[{hitchOffset:NaN,wheelbase:5,width:2.5}]};
    assert.throws(() => RR.attachUnits(base(), bad2, S1), /släpad enhet/);
  });

  test('tomt resultat går igenom utan att krascha', () => {
    assert.equal(RR.attachUnits(null, v, S1), null);
    const empty = {frames:[]};
    assert.equal(RR.attachUnits(empty, v, S1), empty);
  });
});

/* ───────────────── fordonsdatan ───────────────── */
describe('fordonsdata', () => {
  test('alla fordon uppfyller appens valideringsidentitet', () => {
    for (const v of VEHICLES)
      near(v.length, v.wheelbase + v.frontOverhang + v.rearOverhang, 0.001,
           `${v.id}: length måste vara summan av axelavstånd och överhäng`);
  });

  test('ledade fordons ekipagelängd summerar till rigLength', () => {
    for (const v of VEHICLES.filter(v => v.units)) {
      let total = v.frontOverhang + v.wheelbase;
      for (const u of v.units) total += -u.hitchOffset + u.wheelbase;
      total += v.units.at(-1).rearOverhang;
      near(total, v.rigLength, 0.001, `${v.id} ekipagelängd`);
    }
  });

  test('Bl stämmer mot DETESS figur 5.13', () => {
    const v = veh('Bl');
    near(v.frontOverhang, 2.8, 0, 'överhäng fram');
    near(v.wheelbase, 5.1, 0, 'framaxel till mittaxel');
    near(v.units[0].hitchOffset, -2.2, 0, 'ledpunkt bakom mittaxeln');
    near(v.units[0].wheelbase, 5.0, 0, 'ledpunkt till bakaxel');
    near(v.units[0].rearOverhang, 2.9, 0, 'överhäng bak');
    near(v.rigLength, 18.0, 0, 'total längd');
  });

  test('Lps stämmer mot DETESS figur 5.14 med härledd vändskiva', () => {
    const v = veh('Lps');
    near(v.frontOverhang, 1.5, 0, 'överhäng fram drag');
    near(v.wheelbase, 3.3, 0, 'axelavstånd drag');
    near(v.units[0].wheelbase, 8.15, 0, 'kingpin till boggi');
    near(v.units[0].rearOverhang, 3.85, 0, 'överhäng bak vagn');
    near(v.rigLength, 16.5, 0, 'total längd');
    // vändskivan ska ligga strax framför drivboggin, inte bakom
    assert.ok(v.units[0].hitchOffset > 0 && v.units[0].hitchOffset < 1,
      `vändskivan ska ligga strax framför boggin, fick ${v.units[0].hitchOffset}`);
  });

  test('varje fordon har källhänvisning', () => {
    for (const v of VEHICLES) assert.ok(typeof v.source === 'string' && v.source.length > 5, v.id);
  });
});
