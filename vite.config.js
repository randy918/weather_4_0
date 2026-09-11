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

// Helper function to create Version_<number>.txt in dist/
function updateDistVersionFile(version) {
  const distDir = resolve(__dirname, "dist");
  if (!fs.existsSync(distDir)) return;

  try {
    const files = fs.readdirSync(distDir);
    for (const file of files) {
      if (/^Version_.*\.txt$/i.test(file)) {
        fs.unlinkSync(resolve(distDir, file));
      }
    }
    const versionFilePath = resolve(distDir, `Version_${version}.txt`);
    fs.writeFileSync(versionFilePath, `Version: ${version}\n`, "utf8");
    console.log(`[Passive Versioning] Updated dist version file: Version_${version}.txt\n`);
  } catch (err) {
    console.warn("[Passive Versioning] Could not write dist version file:", err.message);
  }
}

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

    // Also keep index.html <title> synchronized on disk
    const indexPath = resolve(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      let indexContent = fs.readFileSync(indexPath, 'utf8');
      indexContent = indexContent.replace(/<title>Weather.*?<\/title>/i, `<title>Weather ${nextVersion}</title>`);
      fs.writeFileSync(indexPath, indexContent, 'utf8');
    }

    console.log(`\n[Passive Versioning - ${context}] Incremented version to ${nextVersion} in src/js/weather.js and index.html\n`);
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
    },
    transformIndexHtml(html) {
      // Ensure index.html served in dev or built to dist has the current version in <title>
      const weatherJsPath = resolve(__dirname, 'src/js/weather.js');
      if (fs.existsSync(weatherJsPath)) {
        const content = fs.readFileSync(weatherJsPath, 'utf8');
        const match = content.match(/const\s+VERSION_NUMBER\s*=\s*['"](\d+)['"]/);
        if (match) {
          return html.replace(/<title>Weather.*?<\/title>/i, `<title>Weather ${match[1]}</title>`);
        }
      }
      return html;
    },
    closeBundle() {
      // Runs when dist build bundle has finished writing
      if (isBuild) {
        const weatherJsPath = resolve(__dirname, "src/js/weather.js");
        if (fs.existsSync(weatherJsPath)) {
          const content = fs.readFileSync(weatherJsPath, "utf8");
          const match = content.match(/const\s+VERSION_NUMBER\s*=\s*['"](\d+)['"]/);
          if (match) {
            updateDistVersionFile(match[1]);
          }
        }
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