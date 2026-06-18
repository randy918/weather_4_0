import { defineConfig } from 'vite'

// Grab the current date/time during build, formatted without seconds
const buildDate = new Date().toLocaleString('en-US', { 
  year: 'numeric', 
  month: 'numeric', 
  day: 'numeric', 
  hour: 'numeric', 
  minute: '2-digit' 
}).replace(' PM', ' pm').replace(' AM', ' am');

export default defineConfig({
  base: './', 
  define: {
    __APP_BUILD_DATE__: JSON.stringify(buildDate)
  }
})