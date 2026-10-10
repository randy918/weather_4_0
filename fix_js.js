const fs = require('fs');

const jsPath = '/Users/randymiller918/APPS/weather_4_0/src/js/weather.js';
let jsContent = fs.readFileSync(jsPath, 'utf8');

// Helper to replace cases
function replaceAllCases(text) {
    let t = text.replace(/Radio Blackout/g, 'Geomagnetic Storm');
    t = t.replace(/RADIO BLACKOUT/g, 'GEOMAGNETIC STORM');
    t = t.replace(/radio-blackout/g, 'geomagnetic-storm');
    t = t.replace(/radioBlackout/g, 'geomagneticStorm');
    t = t.replace(/RADIO_BLACKOUT/g, 'GEOMAGNETIC_STORM');
    t = t.replace(/R-Scale/g, 'G-Scale');
    t = t.replace(/R_Scale/g, 'G_Scale');
    
    // Scale specific changes (R0->G0, R1->G1...)
    for (let i = 0; i <= 5; i++) {
        t = t.replace(new RegExp(`R${i}`, 'g'), `G${i}`);
        t = t.replace(new RegExp(`r${i}`, 'g'), `g${i}`);
        t = t.replace(new RegExp(`'R${i}'`, 'g'), `'G${i}'`);
        t = t.replace(new RegExp(`"R${i}"`, 'g'), `"G${i}"`);
    }
    
    // Fix broken terms
    t = t.replace(/RADIO/g, 'GEOMAG');
    t = t.replace(/BLACKOUT/g, 'STORM');
    
    t = t.replace('pk_r_cls', 'pk_g_cls');
    t = t.replace('pk_r_val', 'pk_g_val');
    
    // Values map to Kp
    t = t.replace(/value:\s*0\.2/g, 'value: 0.0');
    t = t.replace(/value:\s*1\.5/g, 'value: 5.0');
    t = t.replace(/value:\s*2\.8/g, 'value: 6.0');
    t = t.replace(/value:\s*6\.5/g, 'value: 7.0');
    t = t.replace(/value:\s*16\.0/g, 'value: 8.0');
    t = t.replace(/value:\s*32\.0/g, 'value: 9.0');
    
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
    t = t.replace(/const ranges = \{[\s\S]*?\};/, newRanges.trim());
    return t;
}

// Ensure we haven't already inserted the function
if (!jsContent.includes('function buildGeomagneticStormColumn')) {
    const startStr = '/* --- Radio Blackout (R-Scale) Dial Component --- */';
    const funcStart = jsContent.indexOf(startStr);
    
    if (funcStart !== -1) {
        // Find the end of buildRadioBlackoutColumn
        const funcStr = 'function buildRadioBlackoutColumn() {';
        const buildStart = jsContent.indexOf(funcStr, funcStart);
        
        let braceCount = 0;
        let funcEnd = -1;
        let started = false;
        
        for (let i = buildStart; i < jsContent.length; i++) {
            if (jsContent[i] === '{') {
                braceCount++;
                started = true;
            } else if (jsContent[i] === '}') {
                braceCount--;
            }
            
            if (started && braceCount === 0) {
                funcEnd = i + 1;
                break;
            }
        }
        
        if (funcEnd !== -1) {
            const rFunc = jsContent.substring(funcStart, funcEnd);
            let gFunc = replaceAllCases(rFunc);
            
            // Insert it after the end of buildRadioBlackoutColumn
            jsContent = jsContent.slice(0, funcEnd) + '\n\n' + gFunc + jsContent.slice(funcEnd);
            console.log("Successfully cloned functions!");
        }
    }
} else {
    console.log("Functions already exist.");
}

fs.writeFileSync(jsPath, jsContent, 'utf8');
