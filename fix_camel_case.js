const fs = require('fs');

const jsPath = '/Users/randymiller918/APPS/weather_4_0/src/js/weather.js';
let jsContent = fs.readFileSync(jsPath, 'utf8');

const startStr = '/* --- Geomagnetic Storm (G-Scale) Dial Component --- */';
const funcStart = jsContent.indexOf(startStr);

if (funcStart !== -1) {
    let block = jsContent.substring(funcStart);
    
    // Fix camelCase
    block = block.replace(/RadioBlackout/g, 'GeomagneticStorm');
    block = block.replace(/radioBlackout/g, 'geomagneticStorm');
    
    // Special function calls that might have been renamed incorrectly earlier
    block = block.replace(/getRadioBlackoutImpact/g, 'getGeomagneticStormImpact');
    block = block.replace(/getRadioBlackoutLabels/g, 'getGeomagneticStormLabels');
    block = block.replace(/getRadioBlackoutLevelColor/g, 'getGeomagneticStormLevelColor');
    block = block.replace(/calculateRadioBlackoutFraction/g, 'calculateGeomagneticStormFraction');
    block = block.replace(/formatRadioBlackoutValue/g, 'formatGeomagneticStormValue');
    block = block.replace(/updateRadioBlackoutDial/g, 'updateGeomagneticStormDial');
    block = block.replace(/buildRadioBlackoutColumn/g, 'buildGeomagneticStormColumn');
    block = block.replace(/fetchLiveRadioBlackoutData/g, 'fetchLiveGeomagneticStormData');
    block = block.replace(/handleRadioBlackoutDialClick/g, 'handleGeomagneticStormDialClick');
    
    // Replace the block
    jsContent = jsContent.slice(0, funcStart) + block;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log('Fixed RadioBlackout occurrences in G-Scale block.');
} else {
    console.log('Could not find start string.');
}
