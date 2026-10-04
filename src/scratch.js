const ELEMENTS = {
  mercury: { L0: 252.250906, L1: 149472.6746358 },
  venus:   { L0: 181.979801, L1:  58517.8156760 },
  earth:   { L0: 100.464457, L1:  36000.7698278 },
  mars:    { L0: 355.433000, L1:  19140.2993313 },
  jupiter: { L0:  34.351519, L1:   3034.9056606 },
  saturn:  { L0:  50.077444, L1:   1222.1137943 },
  uranus:  { L0: 314.055005, L1:    428.4669983 },
  neptune: { L0: 304.348665, L1:    218.4862002 },
};

function calcPlanetOrreryAngle(planet, dateOverride = null) {
  const el = ELEMENTS[planet.toLowerCase()];
  const now = dateOverride || new Date();
  const JD = (now.getTime() / 86400000) + 2440587.5;
  const T = (JD - 2451545.0) / 36525.0;
  let lon = (el.L0 + el.L1 * T) % 360;
  if (lon < 0) lon += 360;
  return lon.toFixed(2);
}

function calcPlanetDistanceToEarth(planet, dateOverride = null, returnUnrounded = false) {
  const a = {
    mercury: 0.387098,
    venus: 0.723332,
    earth: 1.000000,
    mars: 1.523679,
    jupiter: 5.2044,
    saturn: 9.5826,
    uranus: 19.2184,
    neptune: 30.11
  };
  const pAngleStr = calcPlanetOrreryAngle(planet, dateOverride);
  const eAngleStr = calcPlanetOrreryAngle('earth', dateOverride);
  const pAngle = parseFloat(pAngleStr);
  const eAngle = parseFloat(eAngleStr);
  const dTheta = (pAngle - eAngle) * Math.PI / 180;
  const r_p = a[planet.toLowerCase()];
  const r_e = a['earth'];
  const distAU = Math.sqrt(r_p * r_p + r_e * r_e - 2 * r_p * r_e * Math.cos(dTheta));
  const distM = distAU * 92.9558;
  return returnUnrounded ? distM : Math.round(distM);
}

const now = new Date();
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].forEach(p => {
  const distNow = calcPlanetDistanceToEarth(p, now, true);
  const distTomorrow = calcPlanetDistanceToEarth(p, tomorrow, true);
  console.log(`${p}: Now = ${distNow.toFixed(4)}, Tomorrow = ${distTomorrow.toFixed(4)}, Diff = ${(distTomorrow - distNow).toFixed(4)}`);
  if (distTomorrow > distNow) console.log(`  -> UP`);
  else if (distTomorrow < distNow) console.log(`  -> DOWN`);
  else console.log(`  -> FLAT`);
});
