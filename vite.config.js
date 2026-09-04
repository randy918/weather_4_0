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

// Custom plugin to increment the version number passively on dist build
const passiveVersioningPlugin = () => {
  return {
    name: 'passive-versioning',
    apply: 'build', // Only run during vite build (production dist build)
    buildStart() {
      const weatherJsPath = resolve(__dirname, 'src/js/weather.js');

      if (!fs.existsSync(weatherJsPath)) return;

      // Read and update src/js/weather.js
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
        console.log(`\n[Passive Versioning] Incremented version to ${nextVersion} in src/js/weather.js\n`);
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