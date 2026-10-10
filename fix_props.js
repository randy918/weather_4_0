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
    return t;
}

const propStartSearch = '    // Radio Blackout (R-Scale) Dial Variables (JCV)';
const propEndSearch = '    // Common margins & settings';

const propStart = jsContent.indexOf(propStartSearch);
const propEnd = jsContent.indexOf(propEndSearch);

if (propStart !== -1 && propEnd !== -1 && !jsContent.includes('--geomagnetic-storm-dial-size-desktop')) {
    let rProp = jsContent.substring(propStart, propEnd);
    let gProp = replaceAllCases(rProp);
    
    jsContent = jsContent.slice(0, propEnd) + gProp + jsContent.slice(propEnd);
    console.log("Props block added!");
} else {
    console.log("Props block already exists or not found");
}

fs.writeFileSync(jsPath, jsContent, 'utf8');
