const fs = require('fs');

const jsPath = '/Users/randymiller918/APPS/weather_4_0/src/js/weather.js';
let jsContent = fs.readFileSync(jsPath, 'utf8');

// Helper to replace cases
function replaceAllCases(text, oldText, newText) {
    let t = text.replace(new RegExp(oldText, 'g'), newText);
    t = t.replace(new RegExp(oldText.toUpperCase(), 'g'), newText.toUpperCase());
    t = t.replace(new RegExp(oldText.toLowerCase(), 'g'), newText.toLowerCase());
    t = t.replace(new RegExp('RADIO_BLACKOUT', 'g'), 'GEOMAGNETIC_STORM');
    t = t.replace(new RegExp('radio-blackout', 'g'), 'geomagnetic-storm');
    t = t.replace(new RegExp('radioBlackout', 'g'), 'geomagneticStorm');
    t = t.replace(new RegExp('R-Scale', 'g'), 'G-Scale');
    t = t.replace(new RegExp('R_Scale', 'g'), 'G_Scale');
    
    // Scale specific changes (R0->G0, R1->G1...)
    for (let i = 0; i <= 5; i++) {
        t = t.replace(new RegExp(`R${i}`, 'g'), `G${i}`);
        t = t.replace(new RegExp(`r${i}`, 'g'), `g${i}`);
    }
    
    // Fix any broken RADIO / GEOMAGNETIC specific formatting
    t = t.replace(/RADIO/g, 'GEOMAG');
    t = t.replace(/BLACKOUT/g, 'STORM');
    
    return t;
}

// 1. Config Block
const configStart = jsContent.indexOf('// ===========================================================================\n  // 3B. RADIO BLACKOUT (R-SCALE) DIAL CONFIGURATION (JCV)');
const configEnd = jsContent.indexOf('// ===========================================================================\n  // 4.');
if (configStart !== -1 && configEnd !== -1) {
    const rConfig = jsContent.substring(configStart, configEnd);
    let gConfig = replaceAllCases(rConfig, 'Radio Blackout', 'Geomagnetic Storm');
    gConfig = gConfig.replace('3B.', '3C.');
    gConfig = gConfig.replace('db', 'Kp');
    gConfig = gConfig.replace('30, 100%, 50%', '120, 100%, 50%'); // Change default hue to green
    
    jsContent = jsContent.slice(0, configEnd) + gConfig + '\n' + jsContent.slice(configEnd);
    console.log("Config added");
}

// 2. Prop Block
const propStart = jsContent.indexOf('// --- Radio Blackout Dial (JCV) ---');
const propEnd = jsContent.indexOf('// --- Sun & Earth Sizing Config (JCV) ---');
if (propStart !== -1 && propEnd !== -1) {
    const rProp = jsContent.substring(propStart, propEnd);
    let gProp = replaceAllCases(rProp, 'Radio Blackout', 'Geomagnetic Storm');
    
    jsContent = jsContent.slice(0, propEnd) + gProp + jsContent.slice(propEnd);
    console.log("Props added");
}

// 3. Function Block
const funcStart = jsContent.indexOf('/* --- Radio Blackout (R-Scale) Dial Component --- */');
const funcEnd = jsContent.indexOf('/* --- Dial Refresh Cycle --- */');
if (funcStart !== -1 && funcEnd !== -1) {
    const rFunc = jsContent.substring(funcStart, funcEnd);
    let gFunc = replaceAllCases(rFunc, 'Radio Blackout', 'Geomagnetic Storm');
    
    gFunc = gFunc.replace('pk_r_cls', 'pk_g_cls');
    gFunc = gFunc.replace('pk_r_val', 'pk_g_val');
    
    // Values map to Kp: G0: 0, G1: 5, G2: 6, G3: 7, G4: 8, G5: 9
    gFunc = gFunc.replace(/value:\s*0\.2/g, 'value: 0.0');
    gFunc = gFunc.replace(/value:\s*1\.5/g, 'value: 5.0');
    gFunc = gFunc.replace(/value:\s*2\.8/g, 'value: 6.0');
    gFunc = gFunc.replace(/value:\s*6\.5/g, 'value: 7.0');
    gFunc = gFunc.replace(/value:\s*16\.0/g, 'value: 8.0');
    gFunc = gFunc.replace(/value:\s*32\.0/g, 'value: 9.0');
    
    const newRanges = `
    const ranges = {
      G0: { min: 0.00, max: 0.16, valMin: 0.0, valMax: 4.9 },
      G1: { min: 0.16, max: 0.33, valMin: 5.0, valMax: 5.9 },
      G2: { min: 0.33, max: 0.50, valMin: 6.0, valMax: 6.9 },
      G3: { min: 0.50, max: 0.67, valMin: 7.0, valMax: 7.9 },
      G4: { min: 0.67, max: 0.84, valMin: 8.0, valMax: 8.9 },
      G5: { min: 0.84, max: 1.00, valMin: 9.0, valMax: 9.0 }
    };
    `;
    gFunc = gFunc.replace(/const ranges = \{[\s\S]*?\};/, newRanges.trim());
    
    jsContent = jsContent.slice(0, funcEnd) + gFunc + jsContent.slice(funcEnd);
    console.log("Functions added");
}

fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log("Done updating weather.js");
