import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'

// Grab the current date/time during build, formatted without seconds
const buildDate = new Date().toLocaleString('en-US', { 
  year: 'numeric', 
  month: 'numeric', 
  day: 'numeric', 
  hour: 'numeric', 
  minute: '2-digit' 
}).replace(' PM', ' pm').replace(' AM', ' am');

// Helper function to increment version number in src/js/weather.js
function incrementVersionNumber(context = 'build') {
  const weatherJsPath = resolve(__dirname, 'src/js/weather.js');
  if (!fs.existsSync(weatherJsPath)) return;

  let weatherJsContent = fs.readFileSync(weatherJsPath, 'utf8');
  const versionRegex = /(const\s+VERSION_NUMBER\s*=\s*['"])(\d+)(['"]\s*;)/;
  const match = weatherJsContent.match(versionRegex);

  if (match) {
    const currentVersion = parseInt(match[2], 10);
    const nextVersion = currentVersion + 1;

    weatherJsContent = weatherJsContent.replace(
      versionRegex,
      `$1${nextVersion}$3`
    );
    fs.writeFileSync(weatherJsPath, weatherJsContent, 'utf8');
    console.log(`\n[Passive Versioning - ${context}] Incremented version to ${nextVersion} in src/js/weather.js\n`);
    return nextVersion;
  }
}

// Custom plugin to increment the version number passively on dist build and on localhost session start
const passiveVersioningPlugin = () => {
  let isBuild = false;

  return {
    name: 'passive-versioning',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    configureServer(server) {
      // Fires once whenever a Vite localhost dev session starts
      incrementVersionNumber('localhost session');
    },
    buildStart() {
      // Fires when creating a dist build (vite build)
      if (isBuild) {
        incrementVersionNumber('dist build');
      }
    }
  };
};

export default defineConfig({
  base: './', 
  plugins: [passiveVersioningPlugin()],
  define: {
    __APP_BUILD_DATE__: JSON.stringify(buildDate)
  }
})