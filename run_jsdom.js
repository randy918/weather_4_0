const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = `
<!DOCTYPE html>
<html>
<head></head>
<body>
  <div class="main-wrapper"></div>
</body>
</html>
`;

let jsCode = fs.readFileSync('./src/js/weather.js', 'utf8');

// Mock imports
jsCode = jsCode.replace(/import .* from '.*';/g, '');

const dom = new JSDOM(html, { runScripts: "dangerously" });

// Mock HTMLCanvasElement.getContext
dom.window.HTMLCanvasElement.prototype.getContext = function () {
  return {
    clearRect: () => {},
    fillRect: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    restore: () => {},
    save: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
};

try {
  dom.window.eval(`
    const weatherConditions = {};
    ${jsCode}
  `);
  console.log("JSDOM initialization complete. Any errors would have been thrown.");
} catch (e) {
  console.error(e);
}
