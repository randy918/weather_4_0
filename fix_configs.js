const fs = require('fs');

const jsPath = '/Users/randymiller918/APPS/weather_4_0/src/js/weather.js';
let jsContent = fs.readFileSync(jsPath, 'utf8');

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
    
    t = t.replace(/RADIO/g, 'GEOMAG');
    t = t.replace(/BLACKOUT/g, 'STORM');
    return t;
}

const configStartSearch = '// --- EDITABLE: Radio Blackout (R-Scale) Dial Config (JCV) ---';
const configEndSearch = '// --- Flanking Duplicate Timezone Dials Config (JCV) ---';

const configStart = jsContent.indexOf(configStartSearch);
const configEnd = jsContent.indexOf(configEndSearch);

if (configStart !== -1 && configEnd !== -1 && !jsContent.includes('const GEOMAGNETIC_STORM_MODE')) {
    let realStart = jsContent.lastIndexOf('// ==', configStart);
    let rConfig = jsContent.substring(realStart, configEnd);
    let gConfig = replaceAllCases(rConfig);
    
    gConfig = gConfig.replace(/db/g, 'Kp');
    gConfig = gConfig.replace(/hsl\(30/g, 'hsl(120'); // Change orange to green default
    
    jsContent = jsContent.slice(0, configEnd) + gConfig + '\n  ' + jsContent.slice(configEnd);
    console.log("Config block added!");
} else {
    console.log("Config block already exists or not found");
}

fs.writeFileSync(jsPath, jsContent, 'utf8');
