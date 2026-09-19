import weatherConditions from '../data/weather-conditions.json';

  // 1. SETUP: Adjustable config
  // NOTE: Replace "YOUR_PASTED_KEY_HERE" with your OpenWeather API key OR call Weather.setApiKey(key)
  let API_KEY = "d1a7fcdb2d6f38c6b216b37322444de9";
  let LAT = 36.10336; // Tulsa exact home Latitude (now mutable via Weather.setLatLon)
  let LON = -95.92734; // Tulsa exact home Longitude

  let displayUnit = 'F';

  // Helper to render dual temperature slash in light font style with tight horizontal margin spacing
  const formatSlash = () => `<span style="font-family: 'light', sans-serif; margin: 0 -0.06em;">/</span>`;

  // Dynamic NWS radar station identifier (defaults to Tulsa's KINX)
  let currentRadarStation = 'KINX';

  // Radar loop interval and index trackers
  let radarLoopIntervalId = null;
  let radarSweepIntervalId = null;
  let currentRadarFrameIndex = 0;
  let radarLoopCounter = 0;

  // Track the last fetched city to prevent unnecessary API calls--
  let currentCityLat = null; 
  let currentCityLon = null;

  // Refresh interval (default 5 minutes)
  const DEFAULT_REFRESH_MS = 5 * 60 * 1000;
  let currentRefreshMs = DEFAULT_REFRESH_MS;
  const urlParams = new URLSearchParams(window.location.search);
  const forceSnow = urlParams.get('snow') === 'true' || urlParams.get('snow') === '1' || urlParams.get('test_snow') === 'true';
  const forceRain = urlParams.get('rain') === 'true' || urlParams.get('rain') === '1' || urlParams.get('test_rain') === 'true';
  const forceStars = urlParams.get('stars') === 'true' || urlParams.get('stars') === '1' || urlParams.get('test_stars') === 'true';
  // Automatically strip any leftover meteor test query parameters from browser URL address bar
  if (urlParams.has('meteorLive') || urlParams.has('testMeteor') || urlParams.has('meteorCountdown') || urlParams.has('meteor') || urlParams.has('test_meteor_live') || urlParams.has('test_meteor_countdown')) {
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {}
  }

  // --- CONFIG: Season Starts Test / Preview & Styling (JCV) ---
  const TEST_SHOW_SEASON_COUNTDOWN_PREVIEW = false; // EDITABLE: Set to true to force-show a countdown for testing

  // --- CONFIG: Meteor Shower Test / Preview Toggles (JCV) ---
  // Toggle either of these true to preview the meteor shower banner states:
  let TEST_SHOW_METEOR_COUNTDOWN_PREVIEW = false; // EDITABLE: Set true to test the 12-hour countdown warning banner ("Perseid Meteor Shower Coming in 4 hours")
  let TEST_SHOW_METEOR_LIVE_PREVIEW = false;      // EDITABLE: Set true to test the active viewing banner & 20X shooting stars ("Perseid Meteor Shower Occurring")

  const SPRING_STARTS_COLOR = "rgba(46, 204, 113, 0.85)"; // Spring fresh green
  const SUMMER_STARTS_COLOR = "rgba(243, 156, 18, 0.85)"; // Summer gold-orange
  const FALL_STARTS_COLOR = "rgba(211, 84, 0, 0.85)";     // Fall rust orange
  const WINTER_STARTS_COLOR = "rgba(52, 152, 219, 0.85)";   // Winter ice blue

  const SPRING_STARTS_ICON = "img/sun-wat.svg";
  const SUMMER_STARTS_ICON = "img/sun-wat.svg";
  const FALL_STARTS_ICON = "img/wind-wat.svg";
  const WINTER_STARTS_ICON = "img/fog-wat.svg";

  document.documentElement.style.setProperty('--spring-starts-color', SPRING_STARTS_COLOR);
  document.documentElement.style.setProperty('--summer-starts-color', SUMMER_STARTS_COLOR);
  document.documentElement.style.setProperty('--fall-starts-color', FALL_STARTS_COLOR);
  document.documentElement.style.setProperty('--winter-starts-color', WINTER_STARTS_COLOR);

  // --- CONFIG: Clock Hands Spin Animation ---
  const CLOCK_SPIN_DURATION_MS = 1200; // EDITABLE: Reset animation spin duration in milliseconds
  let isClockSpinning = false;
  document.documentElement.style.setProperty('--clock-spin-duration', CLOCK_SPIN_DURATION_MS + 'ms');

  // --- CONFIG: Barometer and RH Gauge Animations ---
  const GAUGE_TRANSITION_DURATION_MS = 800; // EDITABLE: Animation transition duration in milliseconds
  const GAUGE_GROW_DURATION_MS = 600;       // EDITABLE: Time in milliseconds to stay/grow at maximum before shrinking
  document.documentElement.style.setProperty('--gauge-transition-duration', GAUGE_TRANSITION_DURATION_MS + 'ms');
  let refreshTimerId = null;

  // --- CONFIG: Rain Drop Animation ---
  const RAIN_ENABLED = true;                         // Set to false to disable all canvas drawing
  const RAIN_DROP_WIDTH = 2;                         // Thickness of raindrop in pixels
  const RAIN_DROP_TAIL_LENGTH_VW = 12.0;             // Length of fading tail in vw units
  const RAIN_DROP_SPEED = 15;                        // Droplet speed in pixels per frame
  const RAIN_DROP_HEAD_OPACITY = 0.3;                // Opacity of the leading tip (almost white)
  const RAIN_DROP_TAIL_OPACITY = 0.0;                // Opacity of the trailing end of the tail (fading)
  const RAIN_WIND_TILT_RATIO = 2.0;                  // Ratio of tilt degrees per 1 mph of East-West wind speed
  
  // --- CONFIG: Rain Area Layout, Fading & Opacity (JCV) ---
  const RAIN_AREA_HEIGHT_DESKTOP = '50vw';           // EDITABLE Desktop: Height of entire rain animation area (starts flush with top)
  const RAIN_AREA_HEIGHT_MOBILE = '50vw';            // EDITABLE Mobile: Height of entire rain animation area (starts flush with top)

  const RAIN_FADE_TOP_DESKTOP = '5vw';               // EDITABLE Desktop: Top fade zone from 0% to 100% opacity (e.g. '5vw', '0vw' for none)
  const RAIN_FADE_TOP_MOBILE = '5vw';                // EDITABLE Mobile: Top fade zone from 0% to 100% opacity (e.g. '5vw', '0vw' for none)

  const RAIN_FADE_BOTTOM_DESKTOP = '10vw';           // EDITABLE Desktop: Bottom fade zone from 100% to 0% opacity (e.g. '10vw', '0vw' for none)
  const RAIN_FADE_BOTTOM_MOBILE = '10vw';            // EDITABLE Mobile: Bottom fade zone from 100% to 0% opacity (e.g. '10vw', '0vw' for none)

  const RAIN_OPACITY_DESKTOP = 1.0;                  // EDITABLE Desktop: Overall opacity for rain graphics (0.0 to 1.0, e.g. 1.0 = 100%)
  const RAIN_OPACITY_MOBILE = 1.0;                   // EDITABLE Mobile: Overall opacity for rain graphics (0.0 to 1.0, e.g. 1.0 = 100%)

  // --- CONFIG: Dynamic Rain Density ---
  const RAIN_MIN_SPAWN_INTERVAL_MS = 50;             // Downpour speed (heavy rain) in milliseconds
  const RAIN_MAX_SPAWN_INTERVAL_MS = 3000;           // Drizzle speed (light rain) in milliseconds
  const RAIN_LIGHT_THRESHOLD_MM = 0.1;               // Minimum rain rate in mm/h to trigger animation
  const RAIN_HEAVY_THRESHOLD_MM = 10.0;              // Rain rate in mm/h considered max downpour

  let currentRainSpawnIntervalMs = RAIN_MAX_SPAWN_INTERVAL_MS;
  let isRainingCurrently = false;

  document.documentElement.style.setProperty('--rain-enabled', RAIN_ENABLED);
  document.documentElement.style.setProperty('--rain-drop-width', RAIN_DROP_WIDTH + 'px');
  document.documentElement.style.setProperty('--rain-drop-tail-length-vw', RAIN_DROP_TAIL_LENGTH_VW + 'vw');
  document.documentElement.style.setProperty('--rain-drop-speed', RAIN_DROP_SPEED);
  document.documentElement.style.setProperty('--rain-drop-head-opacity', RAIN_DROP_HEAD_OPACITY);
  document.documentElement.style.setProperty('--rain-drop-tail-opacity', RAIN_DROP_TAIL_OPACITY);
  document.documentElement.style.setProperty('--rain-wind-tilt-ratio', RAIN_WIND_TILT_RATIO);
  document.documentElement.style.setProperty('--rain-min-spawn-interval-ms', RAIN_MIN_SPAWN_INTERVAL_MS + 'ms');
  document.documentElement.style.setProperty('--rain-max-spawn-interval-ms', RAIN_MAX_SPAWN_INTERVAL_MS + 'ms');
  document.documentElement.style.setProperty('--rain-light-threshold-mm', RAIN_LIGHT_THRESHOLD_MM);
  document.documentElement.style.setProperty('--rain-heavy-threshold-mm', RAIN_HEAVY_THRESHOLD_MM);
  document.documentElement.style.setProperty('--rain-spawn-interval-ms', currentRainSpawnIntervalMs + 'ms');

  document.documentElement.style.setProperty('--rain-area-height-desktop', RAIN_AREA_HEIGHT_DESKTOP);
  document.documentElement.style.setProperty('--rain-area-height-mobile', RAIN_AREA_HEIGHT_MOBILE);
  document.documentElement.style.setProperty('--rain-area-height', window.innerWidth <= 767 ? RAIN_AREA_HEIGHT_MOBILE : RAIN_AREA_HEIGHT_DESKTOP);

  document.documentElement.style.setProperty('--rain-fade-top-desktop', RAIN_FADE_TOP_DESKTOP);
  document.documentElement.style.setProperty('--rain-fade-top-mobile', RAIN_FADE_TOP_MOBILE);
  document.documentElement.style.setProperty('--rain-fade-top', window.innerWidth <= 767 ? RAIN_FADE_TOP_MOBILE : RAIN_FADE_TOP_DESKTOP);

  document.documentElement.style.setProperty('--rain-fade-bottom-desktop', RAIN_FADE_BOTTOM_DESKTOP);
  document.documentElement.style.setProperty('--rain-fade-bottom-mobile', RAIN_FADE_BOTTOM_MOBILE);
  document.documentElement.style.setProperty('--rain-fade-bottom', window.innerWidth <= 767 ? RAIN_FADE_BOTTOM_MOBILE : RAIN_FADE_BOTTOM_DESKTOP);

  document.documentElement.style.setProperty('--rain-opacity-desktop', RAIN_OPACITY_DESKTOP);
  document.documentElement.style.setProperty('--rain-opacity-mobile', RAIN_OPACITY_MOBILE);
  document.documentElement.style.setProperty('--rain-opacity', window.innerWidth <= 767 ? RAIN_OPACITY_MOBILE : RAIN_OPACITY_DESKTOP);

  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 767;
    document.documentElement.style.setProperty('--rain-area-height', isMobile ? RAIN_AREA_HEIGHT_MOBILE : RAIN_AREA_HEIGHT_DESKTOP);
    document.documentElement.style.setProperty('--rain-fade-top', isMobile ? RAIN_FADE_TOP_MOBILE : RAIN_FADE_TOP_DESKTOP);
    document.documentElement.style.setProperty('--rain-fade-bottom', isMobile ? RAIN_FADE_BOTTOM_MOBILE : RAIN_FADE_BOTTOM_DESKTOP);
    document.documentElement.style.setProperty('--rain-opacity', isMobile ? RAIN_OPACITY_MOBILE : RAIN_OPACITY_DESKTOP);
  });

  // --- CONFIG: Snow Flake Animation ---
  const SNOW_ENABLED = true;                         // Set to false to disable all canvas drawing
  const SNOW_DIAL_MASK_PERCENT = 95;                 // EDITABLE: Percentage of dial radius to mask/block snow (e.g., 100 for full size, 99 for slight buffer, 2 for a tiny center dot)
  const SNOW_FLAKE_RADIUS_MIN_DESKTOP = 1.0;         // Minimum snowflake radius in pixels (Desktop)
  const SNOW_FLAKE_RADIUS_MIN_MOBILE = 0.6;          // Minimum snowflake radius in pixels (Mobile)
  const SNOW_FLAKE_RADIUS_MAX_DESKTOP = 3.5;         // Maximum snowflake radius in pixels (Desktop)
  const SNOW_FLAKE_RADIUS_MAX_MOBILE = 2.0;          // Maximum snowflake radius in pixels (Mobile)
  const SNOW_FLAKE_SPEED_MIN = 0.5;                  // Minimum speed in pixels per frame
  const SNOW_FLAKE_SPEED_MAX = 2.2;                  // Maximum speed in pixels per frame
  const SNOW_FLAKE_OPACITY_MIN = 0.2;                // Minimum snowflake opacity (0.0 to 1.0)
  const SNOW_FLAKE_OPACITY_MAX = 0.85;               // Maximum snowflake opacity (0.0 to 1.0)
  const SNOW_FLAKE_DRIFT_AMPLITUDE = 1.2;            // Amplitude of horizontal sway (drift)
  const SNOW_WIND_DRIFT_RATIO = 0.5;                 // Ratio of additional drift per 1 mph of East-West wind speed

  // --- CONFIG: Dynamic Snow Density ---
  const SNOW_MIN_SPAWN_INTERVAL_MS = 100;            // Heavy snow spawn interval in milliseconds
  const SNOW_MAX_SPAWN_INTERVAL_MS = 1200;           // Light snow spawn interval in milliseconds
  const SNOW_LIGHT_THRESHOLD_MM = 0.1;               // Minimum snow rate in mm/h to trigger animation
  const SNOW_HEAVY_THRESHOLD_MM = 5.0;               // Snow rate in mm/h considered max heavy snow

  let currentSnowSpawnIntervalMs = SNOW_MAX_SPAWN_INTERVAL_MS;
  let isSnowingCurrently = false;

  document.documentElement.style.setProperty('--snow-enabled', SNOW_ENABLED);
  document.documentElement.style.setProperty('--snow-flake-radius-min-desktop', SNOW_FLAKE_RADIUS_MIN_DESKTOP + 'px');
  document.documentElement.style.setProperty('--snow-flake-radius-min-mobile', SNOW_FLAKE_RADIUS_MIN_MOBILE + 'px');
  document.documentElement.style.setProperty('--snow-flake-radius-max-desktop', SNOW_FLAKE_RADIUS_MAX_DESKTOP + 'px');
  document.documentElement.style.setProperty('--snow-flake-radius-max-mobile', SNOW_FLAKE_RADIUS_MAX_MOBILE + 'px');
  document.documentElement.style.setProperty('--snow-flake-speed-min', SNOW_FLAKE_SPEED_MIN);
  document.documentElement.style.setProperty('--snow-flake-speed-max', SNOW_FLAKE_SPEED_MAX);
  document.documentElement.style.setProperty('--snow-flake-opacity-min', SNOW_FLAKE_OPACITY_MIN);
  document.documentElement.style.setProperty('--snow-flake-opacity-max', SNOW_FLAKE_OPACITY_MAX);
  document.documentElement.style.setProperty('--snow-flake-drift-amplitude', SNOW_FLAKE_DRIFT_AMPLITUDE);
  document.documentElement.style.setProperty('--snow-wind-drift-ratio', SNOW_WIND_DRIFT_RATIO);
  document.documentElement.style.setProperty('--snow-min-spawn-interval-ms', SNOW_MIN_SPAWN_INTERVAL_MS + 'ms');
  document.documentElement.style.setProperty('--snow-max-spawn-interval-ms', SNOW_MAX_SPAWN_INTERVAL_MS + 'ms');
  document.documentElement.style.setProperty('--snow-light-threshold-mm', SNOW_LIGHT_THRESHOLD_MM);
  document.documentElement.style.setProperty('--snow-heavy-threshold-mm', SNOW_HEAVY_THRESHOLD_MM);
  document.documentElement.style.setProperty('--snow-spawn-interval-ms', currentSnowSpawnIntervalMs + 'ms');
  document.documentElement.style.setProperty('--snow-dial-mask-percent', SNOW_DIAL_MASK_PERCENT);

  // Store last weather data for resize repositioning of temp pointer--
  let lastWeatherData = null;

  // Track daytime/nighttime and base weather image filename for color updates
  let currentIsNight = false;
  let currentBaseFileName = '';

  // Editable minimum threshold for showing rain amounts (in inches) throughout the app
  const MIN_RAIN_DISPLAY_THRESHOLD = 0.05;

  // EDITABLE: Minimum precipitation pixels in downscaled 80x80 radar map area to trigger Doppler loop.==
  // Increase to prevent minor noise/dust (clutter) from showing the radar. Try 80, 120, or 200!
  const RADAR_PRECIPITATION_PIXEL_THRESHOLD = 120;

  // --- CONFIG: Temperature Pointer Configuration (DUAL Desktop & Mobile) ---
  const TEMP_POINTER_WIDTH_DESKTOP = '1.732vw';         // EDITABLE Desktop: Width of the triangle pointing to current temp
  const TEMP_POINTER_WIDTH_MOBILE = '2.5vw';            // EDITABLE Mobile: Width of the triangle
  const TEMP_POINTER_HEIGHT_DESKTOP = '2.0vw';          // EDITABLE Desktop: Height of the triangle
  const TEMP_POINTER_HEIGHT_MOBILE = '2.88vw';          // EDITABLE Mobile: Height of the triangle
  const TEMP_POINTER_SHADOW = 'drop-shadow(-0.3vw 0.3vw 0.4vw rgba(0, 0, 0, 0.6))'; // EDITABLE: Shadow style (uses drop-shadow)
  const TEMP_POINTER_USE_CURRENT_COLOR = true;          // EDITABLE: Set to true to color the pointer using the current temp's color bucket
  const TEMP_POINTER_DEFAULT_COLOR = 'white';           // EDITABLE: Default / fallback color for the pointer

  document.documentElement.style.setProperty('--temp-pointer-width-desktop', TEMP_POINTER_WIDTH_DESKTOP);
  document.documentElement.style.setProperty('--temp-pointer-width-mobile', TEMP_POINTER_WIDTH_MOBILE);
  document.documentElement.style.setProperty('--temp-pointer-height-desktop', TEMP_POINTER_HEIGHT_DESKTOP);
  document.documentElement.style.setProperty('--temp-pointer-height-mobile', TEMP_POINTER_HEIGHT_MOBILE);
  document.documentElement.style.setProperty('--temp-pointer-shadow', TEMP_POINTER_SHADOW);
  document.documentElement.style.setProperty('--temp-pointer-default-color', TEMP_POINTER_DEFAULT_COLOR);

  // --- CONFIG: Day 0 High Bar 10-Degree Horizontal Lines ---
  const DAY0_LINES_ENABLED = true;                          // EDITABLE: Show horizontal 10° marker lines on Day 0 high bar
  const DAY0_LINES_COLOR_MODE = 'current_plus_10';         // EDITABLE: 'current_plus_10', 'current_minus_10', 'line_temp', or 'custom'
  const DAY0_LINES_CUSTOM_COLOR = '';                       // EDITABLE: Set explicit color (e.g. 'white', 'rgba(255,255,255,0.7)') or leave empty for dynamic
  const DAY0_LINES_HEIGHT_DESKTOP = '0.22vw';                // EDITABLE Desktop: Thickness of horizontal lines
  const DAY0_LINES_HEIGHT_MOBILE = '0.40vw';                 // EDITABLE Mobile: Thickness of horizontal lines
  const DAY0_LINES_OPACITY_DESKTOP = 0.55;                   // EDITABLE Desktop: Opacity of the horizontal lines (0.0 to 1.0, 55%)
  const DAY0_LINES_OPACITY_MOBILE = 0.50;                    // EDITABLE Mobile: Opacity of the horizontal lines (0.0 to 1.0, 50%)
  const DAY0_LINES_OPACITY = DAY0_LINES_OPACITY_DESKTOP;    // Fallback alias
  const DAY0_LINES_Z_INDEX_DESKTOP = 15;                    // EDITABLE Desktop: Stacking order (in front of bars, behind temperature number and wedge pointer)
  const DAY0_LINES_Z_INDEX_MOBILE = 15;                     // EDITABLE Mobile: Stacking order for lines on mobile
  const DAY0_LINES_Z_INDEX = DAY0_LINES_Z_INDEX_DESKTOP;    // Fallback alias
  const HI_BAR_TEXT_Z_INDEX_DESKTOP = 25;                   // EDITABLE Desktop: Stacking order for high bar temperature number (on top of lines, behind wedge pointer)
  const HI_BAR_TEXT_Z_INDEX_MOBILE = 25;                    // EDITABLE Mobile: Stacking order for high bar temperature number on mobile
  const HI_BAR_TEXT_Z_INDEX = HI_BAR_TEXT_Z_INDEX_DESKTOP;  // Fallback alias
  const DAY0_LINES_ANIMATE_WITH_BAR = true;                 // EDITABLE: Animate 10° lines down and up in lockstep with Day 0 high temp changes

  document.documentElement.style.setProperty('--day0-lines-height-desktop', DAY0_LINES_HEIGHT_DESKTOP);
  document.documentElement.style.setProperty('--day0-lines-height-mobile', DAY0_LINES_HEIGHT_MOBILE);
  document.documentElement.style.setProperty('--day0-lines-opacity-desktop', DAY0_LINES_OPACITY_DESKTOP);
  document.documentElement.style.setProperty('--day0-lines-opacity-mobile', DAY0_LINES_OPACITY_MOBILE);
  document.documentElement.style.setProperty('--day0-lines-opacity', DAY0_LINES_OPACITY);
  document.documentElement.style.setProperty('--day0-lines-z-index-desktop', DAY0_LINES_Z_INDEX_DESKTOP);
  document.documentElement.style.setProperty('--day0-lines-z-index-mobile', DAY0_LINES_Z_INDEX_MOBILE);
  document.documentElement.style.setProperty('--day0-lines-z-index', DAY0_LINES_Z_INDEX);
  document.documentElement.style.setProperty('--hi-bar-text-z-index-desktop', HI_BAR_TEXT_Z_INDEX_DESKTOP);
  document.documentElement.style.setProperty('--hi-bar-text-z-index-mobile', HI_BAR_TEXT_Z_INDEX_MOBILE);
  document.documentElement.style.setProperty('--hi-bar-text-z-index', HI_BAR_TEXT_Z_INDEX);

  // --- CONFIG: Close Hi/Lo Temperature Layering (8-Day Forecast Bars) ---
  // In close high and low situations, ensures the low bar & low temp text layer z-wise ABOVE the high bar & high temp text
  const CLOSE_HI_LO_DIFF_THRESHOLD_DESKTOP = 5;       // EDITABLE Desktop: Max difference (°F) between high & low considered "close" (e.g. 5° or less)
  const CLOSE_HI_LO_DIFF_THRESHOLD_MOBILE = 5;        // EDITABLE Mobile: Max difference (°F) between high & low considered "close"
  const LO_BAR_Z_INDEX_DESKTOP = 2;                   // EDITABLE Desktop: Default stacking order for low bars
  const LO_BAR_Z_INDEX_MOBILE = 2;                    // EDITABLE Mobile: Default stacking order for low bars
  const HI_BAR_Z_INDEX_DESKTOP = 1;                   // EDITABLE Desktop: Default stacking order for high bars
  const HI_BAR_Z_INDEX_MOBILE = 1;                    // EDITABLE Mobile: Default stacking order for high bars
  const LO_BAR_CLOSE_Z_INDEX_DESKTOP = 30;            // EDITABLE Desktop: Stacking order for low bar in close situations (above hi bar & hi text)
  const LO_BAR_CLOSE_Z_INDEX_MOBILE = 30;             // EDITABLE Mobile: Stacking order for low bar in close situations
  const LO_BAR_CLOSE_TEXT_Z_INDEX_DESKTOP = 35;       // EDITABLE Desktop: Stacking order for low bar text in close situations (above hi bar & hi text)
  const LO_BAR_CLOSE_TEXT_Z_INDEX_MOBILE = 35;        // EDITABLE Mobile: Stacking order for low bar text in close situations

  document.documentElement.style.setProperty('--close-hi-lo-diff-threshold-desktop', CLOSE_HI_LO_DIFF_THRESHOLD_DESKTOP);
  document.documentElement.style.setProperty('--close-hi-lo-diff-threshold-mobile', CLOSE_HI_LO_DIFF_THRESHOLD_MOBILE);
  document.documentElement.style.setProperty('--lo-bar-z-index-desktop', LO_BAR_Z_INDEX_DESKTOP);
  document.documentElement.style.setProperty('--lo-bar-z-index-mobile', LO_BAR_Z_INDEX_MOBILE);
  document.documentElement.style.setProperty('--hi-bar-z-index-desktop', HI_BAR_Z_INDEX_DESKTOP);
  document.documentElement.style.setProperty('--hi-bar-z-index-mobile', HI_BAR_Z_INDEX_MOBILE);
  document.documentElement.style.setProperty('--lo-bar-close-z-index-desktop', LO_BAR_CLOSE_Z_INDEX_DESKTOP);
  document.documentElement.style.setProperty('--lo-bar-close-z-index-mobile', LO_BAR_CLOSE_Z_INDEX_MOBILE);
  document.documentElement.style.setProperty('--lo-bar-close-text-z-index-desktop', LO_BAR_CLOSE_TEXT_Z_INDEX_DESKTOP);
  document.documentElement.style.setProperty('--lo-bar-close-text-z-index-mobile', LO_BAR_CLOSE_TEXT_Z_INDEX_MOBILE);

  // --- CONFIG: 8-Day Forecast Temperature Bar Padding (Hi & Lo Degrees) ---
  const HI_BAR_PADDING_TOP_DESKTOP = '0.4vw';         // EDITABLE Desktop: Top padding hugging degrees to top of hi bar
  const HI_BAR_PADDING_TOP_MOBILE = '0.4vw';          // EDITABLE Mobile: Top padding hugging degrees to top of hi bar
  const LO_BAR_PADDING_TOP_DESKTOP = '0.4vw';         // EDITABLE Desktop: Top padding hugging degrees to top of lo cell
  const LO_BAR_PADDING_TOP_MOBILE = '0.4vw';          // EDITABLE Mobile: Top padding hugging degrees to top of lo cell

  document.documentElement.style.setProperty('--hi-bar-padding-top-desktop', HI_BAR_PADDING_TOP_DESKTOP);
  document.documentElement.style.setProperty('--hi-bar-padding-top-mobile', HI_BAR_PADDING_TOP_MOBILE);
  document.documentElement.style.setProperty('--lo-bar-padding-top-desktop', LO_BAR_PADDING_TOP_DESKTOP);
  document.documentElement.style.setProperty('--lo-bar-padding-top-mobile', LO_BAR_PADDING_TOP_MOBILE);

  // --- CONFIG: Low Temp Bar Upward Shadow (8-day forecast) ---
  const LO_TEMP_SHADOW_OFFSET_Y_DESKTOP = '-3vw';     // EDITABLE Desktop: Upward vertical offset (negative is up)
  const LO_TEMP_SHADOW_OFFSET_Y_MOBILE = '-3.0vw';      // EDITABLE Mobile: Upward vertical offset (negative is up)
  const LO_TEMP_SHADOW_BLUR_DESKTOP = '1.2vw';          // EDITABLE Desktop: Shadow blur/spread size
  const LO_TEMP_SHADOW_BLUR_MOBILE = '1.6vw';           // EDITABLE Mobile: Shadow blur/spread size
  const LO_TEMP_SHADOW_OPACITY_DESKTOP = 0.2;          // EDITABLE Desktop: Shadow opacity (0.0 = clear, 1.0 = pitch black)
  const LO_TEMP_SHADOW_OPACITY_MOBILE = 0.2;           // EDITABLE Mobile: Shadow opacity (0.0 = clear, 1.0 = pitch black)
  const LO_TEMP_SHADOW_BLEND_MODE = 'multiply';         // EDITABLE: Blend mode for the upward shadow

  // Construct shadow strings dynamically using the configurations above
  const loTempShadowDesktop = `0 ${LO_TEMP_SHADOW_OFFSET_Y_DESKTOP} ${LO_TEMP_SHADOW_BLUR_DESKTOP} 0 rgba(0, 0, 0, ${LO_TEMP_SHADOW_OPACITY_DESKTOP})`;
  const loTempShadowMobile = `0 ${LO_TEMP_SHADOW_OFFSET_Y_MOBILE} ${LO_TEMP_SHADOW_BLUR_MOBILE} 0 rgba(0, 0, 0, ${LO_TEMP_SHADOW_OPACITY_MOBILE})`;

  document.documentElement.style.setProperty('--lo-temp-shadow-desktop', loTempShadowDesktop);
  document.documentElement.style.setProperty('--lo-temp-shadow-mobile', loTempShadowMobile);
  document.documentElement.style.setProperty('--lo-temp-shadow-blend-mode', LO_TEMP_SHADOW_BLEND_MODE);

  // =========================================================================
  // --- CONFIG: 8-DAY GRID - Low Temp Reflection Gradient Tinges (JCV) ---
  // (Applies EXCLUSIVELY to the 8-Day Forecast Image cells; does NOT affect 24-Hour)
  // =========================================================================
  const FORECAST_GRADIENTS_ENABLED = true;                          // EDITABLE: Enable/disable 8-day reflection gradient tinge row
  const FORECAST_GRADIENT_HEIGHT_DESKTOP = '45%';                   // EDITABLE Desktop: 8-day height of gradient flush to top (e.g. '45%', '50%')
  const FORECAST_GRADIENT_HEIGHT_MOBILE = '45%';                    // EDITABLE Mobile: 8-day height of gradient flush to top
  const FORECAST_GRADIENT_HEIGHT = FORECAST_GRADIENT_HEIGHT_DESKTOP; // Fallback alias

  const FORECAST_GRADIENT_OPACITY_TOP_DESKTOP = 1.0;                // EDITABLE Desktop: 8-day top opacity (1.0 = 100%)
  const FORECAST_GRADIENT_OPACITY_TOP_MOBILE = 1.0;                 // EDITABLE Mobile: 8-day top opacity (1.0 = 100%)

  const FORECAST_GRADIENT_OPACITY_MID_DESKTOP = 0.5;                // EDITABLE Desktop: 8-day midpoint opacity (0.5 = 50%)
  const FORECAST_GRADIENT_OPACITY_MID_MOBILE = 0.5;                 // EDITABLE Mobile: 8-day midpoint opacity (0.5 = 50%)

  const FORECAST_GRADIENT_OPACITY_BOTTOM_DESKTOP = 0.0;             // EDITABLE Desktop: 8-day bottom opacity (0.0 = 0%)
  const FORECAST_GRADIENT_OPACITY_BOTTOM_MOBILE = 0.0;              // EDITABLE Mobile: 8-day bottom opacity (0.0 = 0%)

  const FORECAST_GRADIENT_MID_POINT_DESKTOP = '50%';                // EDITABLE Desktop: 8-day midpoint position (e.g. '50%' = halfway)
  const FORECAST_GRADIENT_MID_POINT_MOBILE = '50%';                 // EDITABLE Mobile: 8-day midpoint position (e.g. '50%' = halfway)
  const FORECAST_GRADIENT_MID_POINT = FORECAST_GRADIENT_MID_POINT_DESKTOP; // Fallback alias

  const FORECAST_GRADIENT_BLEND_MODE = 'normal';                    // EDITABLE: 8-day blend mode ('normal', 'screen', 'overlay', 'soft-light')

  document.documentElement.style.setProperty('--forecast-gradient-height-desktop', FORECAST_GRADIENT_HEIGHT_DESKTOP);
  document.documentElement.style.setProperty('--forecast-gradient-height-mobile', FORECAST_GRADIENT_HEIGHT_MOBILE);
  document.documentElement.style.setProperty('--forecast-gradient-height', FORECAST_GRADIENT_HEIGHT);
  document.documentElement.style.setProperty('--forecast-gradient-mid-point-desktop', FORECAST_GRADIENT_MID_POINT_DESKTOP);
  document.documentElement.style.setProperty('--forecast-gradient-mid-point-mobile', FORECAST_GRADIENT_MID_POINT_MOBILE);
  document.documentElement.style.setProperty('--forecast-gradient-mid-point', FORECAST_GRADIENT_MID_POINT);
  document.documentElement.style.setProperty('--forecast-gradient-opacity-top-desktop', FORECAST_GRADIENT_OPACITY_TOP_DESKTOP);
  document.documentElement.style.setProperty('--forecast-gradient-opacity-top-mobile', FORECAST_GRADIENT_OPACITY_TOP_MOBILE);
  document.documentElement.style.setProperty('--forecast-gradient-opacity-mid-desktop', FORECAST_GRADIENT_OPACITY_MID_DESKTOP);
  document.documentElement.style.setProperty('--forecast-gradient-opacity-mid-mobile', FORECAST_GRADIENT_OPACITY_MID_MOBILE);
  document.documentElement.style.setProperty('--forecast-gradient-opacity-bottom-desktop', FORECAST_GRADIENT_OPACITY_BOTTOM_DESKTOP);
  document.documentElement.style.setProperty('--forecast-gradient-opacity-bottom-mobile', FORECAST_GRADIENT_OPACITY_BOTTOM_MOBILE);
  document.documentElement.style.setProperty('--forecast-gradient-blend-mode', FORECAST_GRADIENT_BLEND_MODE);

  // =========================================================================
  // --- CONFIG: 24-HOUR GRID - Temp Reflection Gradient Tinges (JCV) ---
  // (Applies EXCLUSIVELY to the 24-Hour Forecast Image cells; does NOT affect 8-Day)
  // =========================================================================
  const HOURLY_GRADIENTS_ENABLED = true;                            // EDITABLE: Enable/disable 24-hour reflection gradient tinge row
  const HOURLY_GRADIENT_HEIGHT_DESKTOP = '45%';                     // EDITABLE Desktop: 24-hour height of gradient flush to top (e.g. '45%', '50%')
  const HOURLY_GRADIENT_HEIGHT_MOBILE = '45%';                      // EDITABLE Mobile: 24-hour height of gradient flush to top
  const HOURLY_GRADIENT_HEIGHT = HOURLY_GRADIENT_HEIGHT_DESKTOP;   // Fallback alias

  const HOURLY_GRADIENT_OPACITY_TOP_DESKTOP = 1;                  // EDITABLE Desktop: 24-hour top opacity (1.0 = 100%)
  const HOURLY_GRADIENT_OPACITY_TOP_MOBILE = 1;                   // EDITABLE Mobile: 24-hour top opacity (1.0 = 100%)

  const HOURLY_GRADIENT_OPACITY_MID_DESKTOP = 0.5;                  // EDITABLE Desktop: 24-hour midpoint opacity (0.5 = 50%)
  const HOURLY_GRADIENT_OPACITY_MID_MOBILE = 0.5;                   // EDITABLE Mobile: 24-hour midpoint opacity (0.5 = 50%)

  const HOURLY_GRADIENT_OPACITY_BOTTOM_DESKTOP = 0.0;               // EDITABLE Desktop: 24-hour bottom opacity (0.0 = 0%)
  const HOURLY_GRADIENT_OPACITY_BOTTOM_MOBILE = 0.0;                // EDITABLE Mobile: 24-hour bottom opacity (0.0 = 0%)

  const HOURLY_GRADIENT_MID_POINT_DESKTOP = '50%';                  // EDITABLE Desktop: 24-hour midpoint position (e.g. '50%' = halfway)
  const HOURLY_GRADIENT_MID_POINT_MOBILE = '50%';                   // EDITABLE Mobile: 24-hour midpoint position (e.g. '50%' = halfway)
  const HOURLY_GRADIENT_MID_POINT = HOURLY_GRADIENT_MID_POINT_DESKTOP; // Fallback alias

  const HOURLY_GRADIENT_BLEND_MODE = 'normal';                      // EDITABLE: 24-hour blend mode ('normal', 'screen', 'overlay', 'soft-light')

  document.documentElement.style.setProperty('--hourly-gradient-height-desktop', HOURLY_GRADIENT_HEIGHT_DESKTOP);
  document.documentElement.style.setProperty('--hourly-gradient-height-mobile', HOURLY_GRADIENT_HEIGHT_MOBILE);
  document.documentElement.style.setProperty('--hourly-gradient-height', HOURLY_GRADIENT_HEIGHT);
  document.documentElement.style.setProperty('--hourly-gradient-mid-point-desktop', HOURLY_GRADIENT_MID_POINT_DESKTOP);
  document.documentElement.style.setProperty('--hourly-gradient-mid-point-mobile', HOURLY_GRADIENT_MID_POINT_MOBILE);
  document.documentElement.style.setProperty('--hourly-gradient-mid-point', HOURLY_GRADIENT_MID_POINT);
  document.documentElement.style.setProperty('--hourly-gradient-opacity-top-desktop', HOURLY_GRADIENT_OPACITY_TOP_DESKTOP);
  document.documentElement.style.setProperty('--hourly-gradient-opacity-top-mobile', HOURLY_GRADIENT_OPACITY_TOP_MOBILE);
  document.documentElement.style.setProperty('--hourly-gradient-opacity-mid-desktop', HOURLY_GRADIENT_OPACITY_MID_DESKTOP);
  document.documentElement.style.setProperty('--hourly-gradient-opacity-mid-mobile', HOURLY_GRADIENT_OPACITY_MID_MOBILE);
  document.documentElement.style.setProperty('--hourly-gradient-opacity-bottom-desktop', HOURLY_GRADIENT_OPACITY_BOTTOM_DESKTOP);
  document.documentElement.style.setProperty('--hourly-gradient-opacity-bottom-mobile', HOURLY_GRADIENT_OPACITY_BOTTOM_MOBILE);
  document.documentElement.style.setProperty('--hourly-gradient-blend-mode', HOURLY_GRADIENT_BLEND_MODE);

  // --- CONFIG: Clock Grid (8 Countdown Circles Row) ---
  const CLOCK_GRID_SIZE = '11vw';         // EDITABLE: Width and height of each circle widget
  const CLOCK_GRID_GAP = '1vw';          // EDITABLE: Gap between cells
  const CLOCK_GRID_MARGIN_TOP_DESKTOP = '2.2vw'; // EDITABLE Desktop: Top margin of the row / gap below summary
  const CLOCK_GRID_MARGIN_TOP_MOBILE = '3.0vw';  // EDITABLE Mobile: Top margin of the row / gap below summary
  const CLOCK_GRID_MARGIN_BOTTOM = '0vw';// EDITABLE: Bottom margin of the row
  const CLOCK_GRID_MARGIN_LEFT = '2vw';  // EDITABLE: Left margin for the row as a whole
  const CLOCK_GRID_MARGIN_RIGHT = '2vw'; // EDITABLE: Right margin for the row as a whole
  const CLOCK_GRID_TRACK_COLOR = 'rgba(255, 255, 255, 0.2)'; // EDITABLE: Circle track color
  const CLOCK_GRID_PROGRESS_COLOR = 'rgba(255, 255, 255, 0.5)'; // EDITABLE: Active progress fill color
  const CLOCK_GRID_STROKE_WIDTH = 3.5;     // EDITABLE: SVG stroke thickness
  const CLOCK_GRID_GUST_OPACITY = 0;     // EDITABLE: Wind gust ring opacity (0.0 to 1.0)
  const CLOCK_GRID_WIND_SPEED_Y_OFFSET = '0vw'; // EDITABLE: Vertical offset of the wind speed number inside cell #3 (e.g. '0vw', '0.7vw')
  const CLOCK_GRID_WIND_GUST_OVER_Y_OFFSET = '-2.5vw'; // EDITABLE: Vertical offset of the wind gust text when placed over the number
  const CLOCK_GRID_WIND_GUST_UNDER_Y_OFFSET = '2.5vw'; // EDITABLE: Vertical offset of the wind gust text when placed under the number
  const CLOCK_GRID_HUMIDITY_Y_OFFSET = '0.7vw';   // EDITABLE: Vertical offset of the humidity number inside cell #4 (e.g. '0vw', '0.7vw')
  const CLOCK_GRID_DEWPOINT_Y_OFFSET = '0.7vw';   // EDITABLE: Vertical offset of the dewpoint number inside cell #5 (e.g. '0vw', '0.7vw')
  const CLOCK_GRID_SUN_Y_OFFSET = '0.7vw';        // EDITABLE: Vertical offset of the sun dial day-length number inside cell #6 (e.g. '0vw', '0.7vw')
  const CLOCK_GRID_MOON_Y_OFFSET = '0.7vw';       // EDITABLE: Vertical offset of the moon dial moon-up number inside cell #7 (e.g. '0vw', '0.7vw')
  const CLOCK_GRID_CELESTIAL_DOT_RADIUS = 6.4;  // EDITABLE: Radius of the celestial dots marking current time on the dial track (using SVG native viewBox units, e.g. 2 means 2 viewBox units out of 100)
  const CLOCK_GRID_CELESTIAL_DOT_STROKE_WIDTH = 2; // EDITABLE: Stroke width for the celestial dots (using SVG native viewBox units)
  const CLOCK_GRID_CELESTIAL_DOT_FILL = 'rgba(0,0,0,0.5)'; // EDITABLE: Fill color for the celestial dots
  const CLOCK_GRID_WIND_SPEED_TEXT_SHADOW = '2px 2px 0px black)'; // EDITABLE: Text shadow for wind speed number (offset-x offset-y blur color)
  const CLOCK_GRID_ROW2_MARGIN_TOP = '2vw'; // EDITABLE: Margin top for the 2nd row of 4x2 dials

  // EDITABLE: Moon Phase photo sizing and position inside the dial track ring (DESKTOP)
  const GRID_MOON_PHASE_SIZE_DESKTOP = '93%';       // EDITABLE: Desktop size of moon phase photo (e.g. '92%', '95%', '100%')
  const GRID_MOON_PHASE_X_OFFSET_DESKTOP = '0vw';    // EDITABLE: Desktop horizontal offset (e.g. '0vw', '-0.2vw', '0.2vw' - positive moves RIGHT, negative moves LEFT)
  const GRID_MOON_PHASE_Y_OFFSET_DESKTOP = '0vw';    // EDITABLE: Desktop vertical offset (e.g. '0vw', '-0.2vw', '0.2vw' - positive moves DOWN, negative moves UP)

  // EDITABLE: Moon Phase photo sizing and position inside the dial track ring (MOBILE / PHONE)
  const GRID_MOON_PHASE_SIZE_MOBILE = '93%';        // EDITABLE: Mobile size of moon phase photo (e.g. '92%', '95%', '100%')
  const GRID_MOON_PHASE_X_OFFSET_MOBILE = '0vw';     // EDITABLE: Mobile horizontal offset (e.g. '0vw', '-0.2vw', '0.2vw' - positive moves RIGHT, negative moves LEFT)
  const GRID_MOON_PHASE_Y_OFFSET_MOBILE = '0vw';     // EDITABLE: Mobile vertical offset (e.g. '0vw', '-0.2vw', '0.2vw' - positive moves DOWN, negative moves UP)

  // Inject these config variables into CSS properties immediately
  const CLOCK_GRID_LABEL_FONT_SIZE = '1.8vw';     // EDITABLE: Font size for the labels beneath the dials
  const CLOCK_GRID_LABEL_FONT_FAMILY = 'light';   // EDITABLE: Font family for the dial labels
  const CLOCK_GRID_LABEL_MARGIN_TOP = '0.5vw';    // EDITABLE: Space between dial and its label
  const CLOCK_GRID_LABEL_LETTER_SPACING = '-0.05vw'; // EDITABLE: Letter spacing (kerning) for the labels
  
  // EDITABLE: Styling for the inner unit text below the number (e.g. "RH", "Td", "Day", "Moon", "hPa") inside the dials
  const CLOCK_GRID_INNER_LABEL_FONT_SIZE_DESKTOP = '2.2vw'; // EDITABLE: Desktop size of the inner label
  const CLOCK_GRID_INNER_LABEL_FONT_SIZE_MOBILE = '4vw'; // EDITABLE: Mobile size of the inner label
  
  const CLOCK_GRID_INNER_LABEL_Y_OFFSET = '0.75vw'; // EDITABLE: Space above the inner label
  const CLOCK_GRID_INNER_LABEL_FONT_FAMILY = "'medium', sans-serif"; // EDITABLE: Font family style ('light', 'medium', 'bold')

  document.documentElement.style.setProperty('--clock-grid-inner-label-font-size-desktop', CLOCK_GRID_INNER_LABEL_FONT_SIZE_DESKTOP);
  document.documentElement.style.setProperty('--clock-grid-inner-label-font-size-mobile', CLOCK_GRID_INNER_LABEL_FONT_SIZE_MOBILE);

  const CLOCK_GRID_LABELS = ['TIME', 'PHASE', 'WIND', 'Humidity', 'Dew Pt', 'SUN', 'MOON', 'Barometer']; // EDITABLE: Labels for the 8 dials
  
  document.documentElement.style.setProperty('--clock-grid-label-font-size', CLOCK_GRID_LABEL_FONT_SIZE);
  document.documentElement.style.setProperty('--clock-grid-label-font-family', CLOCK_GRID_LABEL_FONT_FAMILY);
  document.documentElement.style.setProperty('--clock-grid-label-margin-top', CLOCK_GRID_LABEL_MARGIN_TOP);
  document.documentElement.style.setProperty('--clock-grid-label-letter-spacing', CLOCK_GRID_LABEL_LETTER_SPACING);

  document.documentElement.style.setProperty('--clock-grid-size', CLOCK_GRID_SIZE);
  document.documentElement.style.setProperty('--clock-grid-gap', CLOCK_GRID_GAP);
  document.documentElement.style.setProperty('--clock-grid-margin-top-desktop', CLOCK_GRID_MARGIN_TOP_DESKTOP);
  document.documentElement.style.setProperty('--clock-grid-margin-top-mobile', CLOCK_GRID_MARGIN_TOP_MOBILE);
  document.documentElement.style.setProperty('--clock-grid-margin-bottom', CLOCK_GRID_MARGIN_BOTTOM);
  document.documentElement.style.setProperty('--clock-grid-margin-left', CLOCK_GRID_MARGIN_LEFT);
  document.documentElement.style.setProperty('--clock-grid-margin-right', CLOCK_GRID_MARGIN_RIGHT);
  document.documentElement.style.setProperty('--clock-grid-track-color', CLOCK_GRID_TRACK_COLOR);
  document.documentElement.style.setProperty('--clock-grid-progress-color', CLOCK_GRID_PROGRESS_COLOR);
  document.documentElement.style.setProperty('--clock-grid-stroke-width', CLOCK_GRID_STROKE_WIDTH);
  document.documentElement.style.setProperty('--clock-grid-gust-opacity', CLOCK_GRID_GUST_OPACITY);
  document.documentElement.style.setProperty('--grid-wind-speed-y-offset', CLOCK_GRID_WIND_SPEED_Y_OFFSET);
  document.documentElement.style.setProperty('--grid-wind-gust-over-y-offset', CLOCK_GRID_WIND_GUST_OVER_Y_OFFSET);
  document.documentElement.style.setProperty('--grid-wind-gust-under-y-offset', CLOCK_GRID_WIND_GUST_UNDER_Y_OFFSET);
  document.documentElement.style.setProperty('--grid-humidity-y-offset', CLOCK_GRID_HUMIDITY_Y_OFFSET);
  document.documentElement.style.setProperty('--grid-dewpoint-y-offset', CLOCK_GRID_DEWPOINT_Y_OFFSET);
  document.documentElement.style.setProperty('--grid-sun-y-offset', CLOCK_GRID_SUN_Y_OFFSET);
  document.documentElement.style.setProperty('--grid-moon-y-offset', CLOCK_GRID_MOON_Y_OFFSET);
  document.documentElement.style.setProperty('--grid-celestial-dot-radius', CLOCK_GRID_CELESTIAL_DOT_RADIUS);
  document.documentElement.style.setProperty('--grid-celestial-dot-stroke-width', CLOCK_GRID_CELESTIAL_DOT_STROKE_WIDTH);
  document.documentElement.style.setProperty('--grid-celestial-dot-fill', CLOCK_GRID_CELESTIAL_DOT_FILL);
  document.documentElement.style.setProperty('--grid-wind-speed-text-shadow', CLOCK_GRID_WIND_SPEED_TEXT_SHADOW);
  document.documentElement.style.setProperty('--clock-grid-row2-margin-top', CLOCK_GRID_ROW2_MARGIN_TOP);
  document.documentElement.style.setProperty('--grid-moon-phase-size-desktop', GRID_MOON_PHASE_SIZE_DESKTOP);
  document.documentElement.style.setProperty('--grid-moon-phase-x-offset-desktop', GRID_MOON_PHASE_X_OFFSET_DESKTOP);
  document.documentElement.style.setProperty('--grid-moon-phase-y-offset-desktop', GRID_MOON_PHASE_Y_OFFSET_DESKTOP);

  document.documentElement.style.setProperty('--grid-moon-phase-size-mobile', GRID_MOON_PHASE_SIZE_MOBILE);
  document.documentElement.style.setProperty('--grid-moon-phase-x-offset-mobile', GRID_MOON_PHASE_X_OFFSET_MOBILE);
  document.documentElement.style.setProperty('--grid-moon-phase-y-offset-mobile', GRID_MOON_PHASE_Y_OFFSET_MOBILE);

  // Removed lastBarometricPressure as we now use future predictive trend

  // Easily editable animation duration for the alert banner slide (in milliseconds)
  const ALERT_ANIMATION_MS = 1000;



  // --- CONFIG: Doppler Radar Option ---
  // Status of the left and right widgets
  let SHOW_DOPPLER_RADAR_LEFT = false;
  let SHOW_DOPPLER_RADAR_RIGHT = false;
  
  // Last resolved automatic status of the left and right widgets
  let AUTO_DOPPLER_RADAR_LEFT = false;
  let AUTO_DOPPLER_RADAR_RIGHT = false;

  // User manual overrides: null = follow auto rules, true = force show, false = force hide
  let USER_DOPPLER_OVERRIDE_LEFT = null;
  let USER_DOPPLER_OVERRIDE_RIGHT = null;

  // Timer trackers for override duration limits
  let leftDopplerOverrideTimerId = null;
  let rightDopplerOverrideTimerId = null;

  // EDITABLE: Time limit (in ms) before override resets to auto (e.g., 60000 = 60 seconds)
  const DOPPLER_OVERRIDE_DURATION_MS = 60000;

  // Set to true to force SHOW_DOPPLER_RADAR = true for testing (otherwise depends on active rain).
  const FORCE_DOPPLER_RADAR = false;

  // --- RainViewer Config for Left and Right Circle Cells ---
  const RAINVIEWER_ZOOM_LEFT = 5;       // Zoom level for far view (e.g. 5 = ~600 miles)
  const RAINVIEWER_ZOOM_RIGHT = 7;      // Zoom level for close-up view (e.g. 7 = ~150 miles)
  const RAINVIEWER_TILE_SIZE = 512;     // Tile size for RainViewer tiles (256 or 512)
  const RAINVIEWER_COLOR_SCHEME = 1;    // Color scheme (1 is Universal Blue, free personal use standard)

  // Default precipitation thresholds (minimum active pixels inside viewport circle)
  const RAINVIEWER_PRECIPITATION_PIXEL_THRESHOLD_LEFT = 300;
  const RAINVIEWER_PRECIPITATION_PIXEL_THRESHOLD_RIGHT = 1200;

  let latestRainViewerData = null;

  // Oklahoma state boundary coordinates (143 simplified points in [longitude, latitude] format)
  const OKLAHOMA_COORDINATES = [
    [-100.0004,34.7464],[-100.0004,36.4997],[-103.0024,36.5004],[-103.0022,37.0001],
    [-102.0422,36.9931],[-100.1157,37.0022],[-94.6181,36.9981],[-94.6179,36.4994],
    [-94.4312,35.3943],[-94.4859,33.6379],[-94.4907,33.6256],[-94.5284,33.616],
    [-94.661,33.6603],[-94.7351,33.6913],[-94.7606,33.7271],[-94.8225,33.7327],
    [-94.8693,33.7459],[-95.0395,33.8606],[-95.0673,33.9174],[-95.2194,33.9616],
    [-95.2311,33.9604],[-95.2529,33.9336],[-95.2482,33.9123],[-95.2555,33.892],
    [-95.2876,33.8736],[-95.4078,33.8663],[-95.5443,33.8801],[-95.5521,33.8884],
    [-95.5491,33.9079],[-95.5594,33.9302],[-95.5997,33.9342],[-95.7572,33.8673],
    [-95.7636,33.848],[-95.8247,33.8377],[-95.9499,33.8575],[-96.0975,33.8475],
    [-96.1481,33.8378],[-96.1701,33.7692],[-96.1817,33.7585],[-96.2205,33.7474],
    [-96.3047,33.7459],[-96.3696,33.7168],[-96.4234,33.7764],[-96.448,33.781],
    [-96.5003,33.7726],[-96.6129,33.8339],[-96.6158,33.8534],[-96.6115,33.8753],
    [-96.6154,33.8811],[-96.6586,33.9001],[-96.6723,33.8996],[-96.6786,33.8928],
    [-96.6946,33.85],[-96.7124,33.8316],[-96.7616,33.8244],[-96.8561,33.8475],
    [-96.883,33.868],[-96.8957,33.8964],[-96.8994,33.9337],[-96.9074,33.95],
    [-96.9221,33.9596],[-96.9729,33.9357],[-96.9856,33.8865],[-97.048,33.8179],
    [-97.0924,33.7332],[-97.1072,33.7211],[-97.1211,33.7172],[-97.1513,33.7226],
    [-97.1722,33.7375],[-97.2048,33.7999],[-97.205,33.8189],[-97.1997,33.8273],
    [-97.1716,33.8353],[-97.1666,33.8473],[-97.1808,33.8952],[-97.2109,33.9161],
    [-97.2265,33.9146],[-97.3108,33.8725],[-97.3729,33.8195],[-97.4265,33.8194],
    [-97.4531,33.8285],[-97.4629,33.8418],[-97.4515,33.8709],[-97.451,33.8914],
    [-97.4581,33.9016],[-97.4865,33.917],[-97.501,33.9196],[-97.555,33.8973],
    [-97.5874,33.9025],[-97.5971,33.9179],[-97.5896,33.9536],[-97.6091,33.9681],
    [-97.6562,33.9895],[-97.6718,33.9914],[-97.6931,33.9837],[-97.7337,33.9364],
    [-97.7853,33.8907],[-97.8343,33.8577],[-97.8774,33.8502],[-97.9667,33.8819],
    [-97.9779,33.8899],[-97.9534,33.9364],[-97.9457,33.9898],[-97.9835,34.0016],
    [-98.0411,33.9935],[-98.0853,34.0033],[-98.1691,34.1142],[-98.2939,34.133],
    [-98.3254,34.151],[-98.364,34.1571],[-98.3832,34.1478],[-98.4005,34.1218],
    [-98.4751,34.0643],[-98.5042,34.0724],[-98.5537,34.1337],[-98.5998,34.1606],
    [-98.6523,34.161],[-98.7002,34.136],[-98.7656,34.1364],[-98.8584,34.1527],
    [-98.9667,34.2012],[-99.0603,34.2048],[-99.1192,34.2017],[-99.1909,34.2153],
    [-99.2116,34.2922],[-99.2114,34.3379],[-99.2613,34.4035],[-99.3567,34.4421],
    [-99.3986,34.3758],[-99.4072,34.3726],[-99.4408,34.3741],[-99.4535,34.3888],
    [-99.5154,34.4143],[-99.5744,34.4183],[-99.6168,34.3754],[-99.6639,34.3737],
    [-99.695,34.3783],[-99.7672,34.4305],[-99.8848,34.547],[-99.9232,34.5746],
    [-99.9546,34.5782],[-100.0004,34.5605],[-100.0004,34.7464]
  ];

  function generateOklahomaPath(zoom, x_start, y_start) {
    return OKLAHOMA_COORDINATES.map((pt, i) => {
      const tileCoords = getTileCoords(pt[1], pt[0], zoom);
      const x = (tileCoords.x - x_start).toFixed(4);
      const y = (tileCoords.y - y_start).toFixed(4);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';
  }

  function isTulsaArea(lat, lon) {
    return lat >= 35.80 && lat <= 36.40 && lon >= -96.30 && lon <= -95.60;
  }

  // --- Doppler Radar Zoom & Pan Config (Active only when SHOW_DOPPLER_RADAR is true) ---
  // LEFT Circle Cell (Far/Wide View) - Fallback NWS radar config
  const RADAR_ZOOM_LEFT = 3.1;           // EDITABLE: Zoom level for far view (1.0 = covers container, e.g. 1.1 for slight zoom)
  const RADAR_OFFSET_X_LEFT = '0%';      // EDITABLE: Horizontal center offset (positive = right, negative = left)
  const RADAR_OFFSET_Y_LEFT = '7.5%';      // EDITABLE: Vertical center offset (positive = down, negative = up)

  // RIGHT Circle Cell (Local/Zoomed View)
  const RADAR_ZOOM_RIGHT = 4.8;          // EDITABLE: Zoom level for local view (e.g. 1.6 to zoom in closer)
  const RADAR_OFFSET_X_RIGHT = '-10%';    // EDITABLE: Horizontal center offset (positive = right, e.g. '10%')
  const RADAR_OFFSET_Y_RIGHT = '3.5%';    // EDITABLE: Vertical center offset (positive = down, negative = up)

  // --- Doppler Radar Playback Config ---
  const RADAR_LOOP_SPEED_MS = 500;     // EDITABLE: Time each frame is fully visible (in milliseconds)
  const RADAR_FADE_DURATION_MS = 200;  // EDITABLE: Transition duration for cross-fade (in milliseconds)
  const RADAR_LAST_FRAME_FADE_MS = 1500; // EDITABLE: Time the last frame takes to slowly fade out on loop restart (in ms)
  const RADAR_FRAME_COUNT = 12;        // EDITABLE: Number of recent radar frames to loop (default is 6)
  const RADAR_OUTER_STROKE_WIDTH = '0.7vw'; // EDITABLE: Outer border thickness
  const RADAR_INNER_STROKE_WIDTH = '0.3vw'; // EDITABLE: Inner coverage circle border thickness (left only)
  const RADAR_ZOOM_RATIO = 1.5;          // EDITABLE: Zoom ratio between Left (Far) and Right (Closeup) Doppler (e.g. 2 for 2x, 3 for 3x)
  const RADAR_SCALE_FACTOR = 2 / RADAR_ZOOM_RATIO; // CSS scale factor for left frame (e.g. 0.6667 for 3x zoom ratio)
  const RADAR_INNER_CIRCLE_DIAMETER = '39%'; // EDITABLE: Size of the inner coverage/reference circle on the far radar (e.g. '33.33%' for 3x zoom, '50%' for 2x zoom)
  const RADAR_RING_25_DIAMETER_RIGHT = '31.85%'; // EDITABLE: Size of the 25-mile range circle on the right radar (25mi radius / 78.5mi total radius)
  const RADAR_RING_50_DIAMETER_RIGHT = '63.69%'; // EDITABLE: Size of the 50-mile range circle on the right radar (50mi radius / 78.5mi total radius)
  const RADAR_RING_25_STROKE_RIGHT = '0.3vw';  // Thickness of the 25-mile range circle on the right radar
  const RADAR_RING_50_STROKE_RIGHT = '0.3vw';  // Thickness of the 50-mile range circle on the right radar
  const RADAR_SWEEP_LINE_WIDTH = '0.48vw';     // EDITABLE: Thickness of the twirling radar sweep line (double standard 0.24vw)
  const RADAR_FADE_TRANSITION_TIMING = 'ease-in-out'; // EDITABLE: Easing curve for cross-fade transition
  const RADAR_GPU_ACCELERATION = false; // EDITABLE: Set to true to force GPU hardware acceleration for smooth fades
  const RADAR_BLUR_AMOUNT = '0vw';              // EDITABLE: Set to '0vw' to disable blur entirely, or e.g. '0.04vw' to smooth edges


  // --- Weather Image Config (Upper Right/Left Circle Cells) ---
  // EDITABLE: Size, margins, and offsets for the left and right weather circle cells.
  // These variables are injected as CSS variables, allowing easy tweaks here or via CSS.
  const WEATHER_CIRCLES_NIGHT_IMAGE_FORCE_CLEAR = true; // EDITABLE: Always use clear night image ('dark-desc-clear-sky.jpg') for all nighttime conditions (does not change with cloud cover)
  const WEATHER_CIRCLES_NIGHT_IMAGE = 'img/dark-desc-clear-sky.jpg'; // EDITABLE: Nighttime background image path for weather circles
  const CIRCLE_CELL_SIZE_DESKTOP = '24vw';       // EDITABLE Desktop: Diameter of the circles (resizes them)
  const CIRCLE_CELL_SIZE_MOBILE = 'var(--dynamic-item-size-4)'; // EDITABLE Mobile: Diameter of the circles (matches 4-column dial size)
  const CIRCLE_CELL_TOP_DESKTOP = '8vw';         // EDITABLE Desktop: Space above the circles (top spacing)
  const CIRCLE_CELL_TOP_MOBILE = '0vw';          // EDITABLE Mobile: Space above the circles (top spacing)
  const CIRCLE_CELL_LEFT = '3vw';           // EDITABLE: Space left of the left circle cell
  const CIRCLE_CELL_RIGHT = '3vw';          // EDITABLE: Space right of the right circle cell
  // NOTE on Space Below: Because the circle cells are positioned 'absolute', space below them
  // to the dials row is controlled by CLOCK_GRID_MARGIN_TOP_DESKTOP / MOBILE (lines 185-186)
  // as well as adjusting CIRCLE_CELL_TOP above.
  const CIRCLE_CELL_MARGIN_BOTTOM = '2vw';  // Legacy margin-bottom (see CLOCK_GRID_MARGIN_TOP for gap to dials)
  const WEATHER_IMAGE_BORDER_RADIUS = '50%'; // EDITABLE: Circle shape rounding (keep at 50%)
  // EDITABLE: Doppler Radar center dot configuration (both Left & Right radar circles)
  const RADAR_CENTER_DOT_SIZE_DESKTOP = '1.0vw'; // EDITABLE Desktop: Size of the radar center dot (middle dot)
  const RADAR_CENTER_DOT_SIZE_MOBILE = '1.2vw';  // EDITABLE Mobile: Size of the radar center dot (middle dot)
  const RADAR_CENTER_DOT_COLOR = '#ffffff';      // EDITABLE: 100% solid white
  const RADAR_CENTER_DOT_OPACITY = '1.0';        // EDITABLE: 100% opaque, not transparent
  const RADAR_CENTER_DOT_Z_INDEX_DESKTOP = 100;  // EDITABLE Desktop: z-index above radar animation & sweep line (95)
  const RADAR_CENTER_DOT_Z_INDEX_MOBILE = 100;   // EDITABLE Mobile: z-index above radar animation & sweep line (95)
  const RADAR_CENTER_DOT_SIZE = RADAR_CENTER_DOT_SIZE_DESKTOP;

  // Compatibility aliases
  const CIRCLE_CELL_SIZE = CIRCLE_CELL_SIZE_DESKTOP;
  const CIRCLE_CELL_TOP = CIRCLE_CELL_TOP_DESKTOP;

  // Set initial CSS variables for sizing and spacing
  document.documentElement.style.setProperty('--circle-cell-size', CIRCLE_CELL_SIZE);
  document.documentElement.style.setProperty('--circle-cell-top-desktop', CIRCLE_CELL_TOP_DESKTOP);
  document.documentElement.style.setProperty('--circle-cell-top-mobile', CIRCLE_CELL_TOP_MOBILE);
  document.documentElement.style.setProperty('--circle-cell-top', window.innerWidth <= 767 ? CIRCLE_CELL_TOP_MOBILE : CIRCLE_CELL_TOP_DESKTOP);
  document.documentElement.style.setProperty('--circle-cell-left', CIRCLE_CELL_LEFT);
  document.documentElement.style.setProperty('--circle-cell-right', CIRCLE_CELL_RIGHT);
  document.documentElement.style.setProperty('--circle-cell-margin-bottom', CIRCLE_CELL_MARGIN_BOTTOM);
  document.documentElement.style.setProperty('--radar-center-dot-size-desktop', RADAR_CENTER_DOT_SIZE_DESKTOP);
  document.documentElement.style.setProperty('--radar-center-dot-size-mobile', RADAR_CENTER_DOT_SIZE_MOBILE);
  document.documentElement.style.setProperty('--radar-center-dot-size', window.innerWidth <= 767 ? RADAR_CENTER_DOT_SIZE_MOBILE : RADAR_CENTER_DOT_SIZE_DESKTOP);
  document.documentElement.style.setProperty('--radar-center-dot-color', RADAR_CENTER_DOT_COLOR);
  document.documentElement.style.setProperty('--radar-center-dot-opacity', RADAR_CENTER_DOT_OPACITY);
  document.documentElement.style.setProperty('--radar-center-dot-z-index-desktop', String(RADAR_CENTER_DOT_Z_INDEX_DESKTOP));
  document.documentElement.style.setProperty('--radar-center-dot-z-index-mobile', String(RADAR_CENTER_DOT_Z_INDEX_MOBILE));
  document.documentElement.style.setProperty('--radar-center-dot-z-index', String(window.innerWidth <= 767 ? RADAR_CENTER_DOT_Z_INDEX_MOBILE : RADAR_CENTER_DOT_Z_INDEX_DESKTOP));
  document.documentElement.style.setProperty('--radar-sweep-duration', `${RADAR_FRAME_COUNT * RADAR_LOOP_SPEED_MS}ms`);
  document.documentElement.style.setProperty('--radar-fade-timing', RADAR_FADE_TRANSITION_TIMING);
  document.documentElement.style.setProperty('--radar-blur-amount', RADAR_BLUR_AMOUNT);
  document.documentElement.style.setProperty('--radar-zoom-ratio', String(RADAR_ZOOM_RATIO));
  document.documentElement.style.setProperty('--radar-scale-factor', String(RADAR_SCALE_FACTOR));
  document.documentElement.style.setProperty('--radar-inner-circle-diameter', RADAR_INNER_CIRCLE_DIAMETER);
  document.documentElement.style.setProperty('--radar-ring-25-diameter-right', RADAR_RING_25_DIAMETER_RIGHT);
  document.documentElement.style.setProperty('--radar-ring-50-diameter-right', RADAR_RING_50_DIAMETER_RIGHT);
  document.documentElement.style.setProperty('--radar-ring-25-stroke-right', RADAR_RING_25_STROKE_RIGHT);
  document.documentElement.style.setProperty('--radar-ring-50-stroke-right', RADAR_RING_50_STROKE_RIGHT);
  document.documentElement.style.setProperty('--radar-sweep-line-width', RADAR_SWEEP_LINE_WIDTH);

  const WEATHER_IMAGE_WIDTH = CIRCLE_CELL_SIZE;
  const WEATHER_IMAGE_HEIGHT = CIRCLE_CELL_SIZE;
  const WEATHER_IMAGE_TOP = CIRCLE_CELL_TOP;
  const WEATHER_IMAGE_RIGHT = CIRCLE_CELL_RIGHT;

  // EDITABLE: Side-scrolling speed for weather images (in seconds)
  const WEATHER_IMAGE_SCROLL_SPEED_S = 240;

  // EDITABLE: Sun and Moon dial inner label vertical offsets (in vw)
  // Positive values move the label DOWN, negative values move it UP
  const SUNMOON_TOP_LABEL_Y_OFFSET = '.65vw';
  const SUNMOON_BOTTOM_LABEL_Y_OFFSET = '-1.65vw';
  document.documentElement.style.setProperty('--sunmoon-top-label-y', SUNMOON_TOP_LABEL_Y_OFFSET);
  document.documentElement.style.setProperty('--sunmoon-bottom-label-y', SUNMOON_BOTTOM_LABEL_Y_OFFSET);

  // EDITABLE: Adjust the vertical position of the "fragile" top-row elements as a set.
  // This moves the Moon Phase, Wind Arrow, and Weather Description Image together.
  // Use negative values to move UP, positive values to move DOWN (e.g., '-1.5vw' or '2vw').
  const FRAGILE_ELEMENTS_Y_OFFSET_DESKTOP = '2vw';  // EDITABLE Desktop: Vertical position offset
  const FRAGILE_ELEMENTS_Y_OFFSET_MOBILE = '2vw';   // EDITABLE Mobile: Vertical position offset
  const FRAGILE_ELEMENTS_Y_OFFSET = FRAGILE_ELEMENTS_Y_OFFSET_DESKTOP;
  document.documentElement.style.setProperty('--fragile-y-offset-desktop', FRAGILE_ELEMENTS_Y_OFFSET_DESKTOP);
  document.documentElement.style.setProperty('--fragile-y-offset-mobile', FRAGILE_ELEMENTS_Y_OFFSET_MOBILE);
  document.documentElement.style.setProperty('--fragile-y-offset', window.innerWidth <= 767 ? FRAGILE_ELEMENTS_Y_OFFSET_MOBILE : FRAGILE_ELEMENTS_Y_OFFSET_DESKTOP);

  // EDITABLE: Adjust the horizontal position of the middle four lines of text as a set.
  // Positive values move the text to the RIGHT, negative values move it to the LEFT (e.g., '.5vw' or '-.5vw').
  const MIDDLE_TEXT_X_OFFSET = '.5vw';
  document.documentElement.style.setProperty('--middle-text-x-offset', MIDDLE_TEXT_X_OFFSET);

  // ==========================================================================
  // ==========================================================================
  // --- Floating Sticky Back-to-Top Button (JCV Config & Implementation) ---
  // ==========================================================================
  const SCROLL_TOP_BUTTON_ENABLED = true;                    // EDITABLE: Master toggle to enable/disable back-to-top button

  // EDITABLE: "APPEARS WHEN" scroll distance (in px) before button appears
  const SCROLL_TOP_APPEARS_WHEN_DESKTOP = 350;               // EDITABLE Desktop (D): Pixels scrolled down before button appears
  const SCROLL_TOP_APPEARS_WHEN_MOBILE  = 480;               // EDITABLE Mobile (M): Pixels scrolled down before button appears (instigated 20% sooner: reduced from 600px to 480px)
  // Compatibility aliases
  const SCROLL_TOP_APPEARS_WHEN_PX_DESKTOP = SCROLL_TOP_APPEARS_WHEN_DESKTOP;
  const SCROLL_TOP_APPEARS_WHEN_PX_MOBILE  = SCROLL_TOP_APPEARS_WHEN_MOBILE;
  const SCROLL_TOP_THRESHOLD_PX_DESKTOP    = SCROLL_TOP_APPEARS_WHEN_DESKTOP;
  const SCROLL_TOP_THRESHOLD_PX_MOBILE     = SCROLL_TOP_APPEARS_WHEN_MOBILE;

  // EDITABLE: Distance from viewport bottom (Lowered down closer to the bottom edge)
  const SCROLL_TOP_BOTTOM_DESKTOP = '2.0vw';                 // EDITABLE Desktop (D): Distance from viewport bottom (lowered down)
  const SCROLL_TOP_BOTTOM_MOBILE  = '2.5vw';                 // EDITABLE Mobile (M): Distance from viewport bottom (lowered down from 5.0vw)
  const SCROLL_TOP_RIGHT_DESKTOP  = '2.5vw';                 // EDITABLE Desktop (D): Distance from viewport right edge
  const SCROLL_TOP_RIGHT_MOBILE   = '5.0vw';                 // EDITABLE Mobile (M): Distance from viewport right edge

  // EDITABLE: Dimensions & Strokes (from movie app)
  const SCROLL_TOP_SIZE_DESKTOP         = '3.2vw';           // EDITABLE Desktop (D): Button diameter
  const SCROLL_TOP_SIZE_MOBILE          = '11.0vw';          // EDITABLE Mobile (M): Button diameter
  const SCROLL_TOP_ICON_SIZE_DESKTOP    = '1.3vw';           // EDITABLE Desktop (D): Up arrow icon font-size
  const SCROLL_TOP_ICON_SIZE_MOBILE     = '4.5vw';           // EDITABLE Mobile (M): Up arrow icon font-size
  const SCROLL_TOP_BORDER_WIDTH_DESKTOP = '0.35vw';          // EDITABLE Desktop (D): Ring border thickness
  const SCROLL_TOP_BORDER_WIDTH_MOBILE  = '1.1vw';           // EDITABLE Mobile (M): Ring border thickness
  const SCROLL_TOP_ARROW_STROKE_DESKTOP = '0.04vw';          // EDITABLE Desktop (D): Arrow stroke thickness
  const SCROLL_TOP_ARROW_STROKE_MOBILE  = '0.12vw';          // EDITABLE Mobile (M): Arrow stroke thickness

  // EDITABLE: Colors (The Red from movie app)
  const SCROLL_TOP_COLOR              = 'red';               // EDITABLE: "The red" arrow color (matches movie app)
  const SCROLL_TOP_STROKE_COLOR       = 'red';               // EDITABLE: "The red" ring border color (matches movie app)
  const SCROLL_TOP_HOVER_COLOR        = '#ff3333';           // EDITABLE: Hover arrow color (matches movie app)
  const SCROLL_TOP_HOVER_STROKE_COLOR = '#ff3333';           // EDITABLE: Hover ring border color (matches movie app)

  const SCROLL_TOP_BG            = 'rgba(0, 0, 0, 0.45)';    // EDITABLE: Button background color
  const SCROLL_TOP_HOVER_BG      = 'rgba(0, 0, 0, 0.75)';    // EDITABLE: Button background color on hover
  const SCROLL_TOP_OPACITY       = '0.9';                    // EDITABLE: Normal resting opacity when visible
  const SCROLL_TOP_HOVER_OPACITY = '1.0';                    // EDITABLE: Hover opacity
  const SCROLL_TOP_HOVER_SCALE   = '1.08';                   // EDITABLE: Hover scale
  const SCROLL_TOP_Z_INDEX       = '9000';                   // EDITABLE: z-index layer

  // ==========================================================================
  // --- Floating Sticky Go-To-Bottom Button (JCV Config & Implementation) ---
  // ==========================================================================
  const SCROLL_BOTTOM_BUTTON_ENABLED = true;                  // EDITABLE: Master toggle to enable/disable go-to-bottom button

  // EDITABLE: "DISAPPEARS WHEN" distance (in px) from bottom before button disappears
  const SCROLL_BOTTOM_DISAPPEARS_WHEN_DESKTOP = 300;          // EDITABLE Desktop (D): Pixels from bottom before button disappears
  const SCROLL_BOTTOM_DISAPPEARS_WHEN_MOBILE  = 400;          // EDITABLE Mobile (M): Pixels from bottom before button disappears
  const SCROLL_BOTTOM_DISAPPEARS_WHEN_PX_DESKTOP = SCROLL_BOTTOM_DISAPPEARS_WHEN_DESKTOP;
  const SCROLL_BOTTOM_DISAPPEARS_WHEN_PX_MOBILE  = SCROLL_BOTTOM_DISAPPEARS_WHEN_MOBILE;

  // EDITABLE: Distance from viewport top / sticky banners (JCV Y-positionable for M & D)
  const SCROLL_BOTTOM_TOP_DESKTOP = '2.0vw';                  // EDITABLE Desktop (D): Distance from viewport top / below sticky banners
  const SCROLL_BOTTOM_TOP_MOBILE  = '3.0vw';                  // EDITABLE Mobile (M): Distance from viewport top / below sticky banners
  const SCROLL_BOTTOM_RIGHT_DESKTOP = '2.5vw';                // EDITABLE Desktop (D): Distance from viewport right edge
  const SCROLL_BOTTOM_RIGHT_MOBILE  = '5.0vw';                // EDITABLE Mobile (M): Distance from viewport right edge

  // EDITABLE: Dimensions & Strokes (from movie app / matches go-to-top button)
  const SCROLL_BOTTOM_SIZE_DESKTOP         = '3.2vw';         // EDITABLE Desktop (D): Button diameter
  const SCROLL_BOTTOM_SIZE_MOBILE          = '11.0vw';        // EDITABLE Mobile (M): Button diameter
  const SCROLL_BOTTOM_ICON_SIZE_DESKTOP    = '1.3vw';         // EDITABLE Desktop (D): Down arrow icon font-size
  const SCROLL_BOTTOM_ICON_SIZE_MOBILE     = '4.5vw';         // EDITABLE Mobile (M): Down arrow icon font-size
  const SCROLL_BOTTOM_BORDER_WIDTH_DESKTOP = '0.35vw';        // EDITABLE Desktop (D): Ring border thickness
  const SCROLL_BOTTOM_BORDER_WIDTH_MOBILE  = '1.1vw';         // EDITABLE Mobile (M): Ring border thickness
  const SCROLL_BOTTOM_ARROW_STROKE_DESKTOP = '0.04vw';        // EDITABLE Desktop (D): Arrow stroke thickness
  const SCROLL_BOTTOM_ARROW_STROKE_MOBILE  = '0.12vw';        // EDITABLE Mobile (M): Arrow stroke thickness

  // EDITABLE: Colors (Red matching go-to-top button)
  const SCROLL_BOTTOM_COLOR              = 'red';             // EDITABLE: "The red" arrow color (matches movie app)
  const SCROLL_BOTTOM_STROKE_COLOR       = 'red';             // EDITABLE: "The red" ring border color (matches movie app)
  const SCROLL_BOTTOM_HOVER_COLOR        = '#ff3333';         // EDITABLE: Hover arrow color (matches movie app)
  const SCROLL_BOTTOM_HOVER_STROKE_COLOR = '#ff3333';         // EDITABLE: Hover ring border color (matches movie app)

  const SCROLL_BOTTOM_BG            = 'rgba(0, 0, 0, 0.45)';  // EDITABLE: Button background color
  const SCROLL_BOTTOM_HOVER_BG      = 'rgba(0, 0, 0, 0.75)';  // EDITABLE: Button background color on hover
  const SCROLL_BOTTOM_OPACITY       = '0.9';                  // EDITABLE: Normal resting opacity when visible
  const SCROLL_BOTTOM_HOVER_OPACITY = '1.0';                  // EDITABLE: Hover opacity
  const SCROLL_BOTTOM_HOVER_SCALE   = '1.08';                 // EDITABLE: Hover scale
  const SCROLL_BOTTOM_Z_INDEX       = '9000';                 // EDITABLE: z-index layer

  function applyScrollTopButtonConfig() {
    const isMobile = window.innerWidth <= 767;
    document.documentElement.style.setProperty('--scroll-top-bottom-desktop', SCROLL_TOP_BOTTOM_DESKTOP);
    document.documentElement.style.setProperty('--scroll-top-bottom-mobile', SCROLL_TOP_BOTTOM_MOBILE);
    document.documentElement.style.setProperty('--scroll-top-bottom', isMobile ? SCROLL_TOP_BOTTOM_MOBILE : SCROLL_TOP_BOTTOM_DESKTOP);

    document.documentElement.style.setProperty('--scroll-top-right-desktop', SCROLL_TOP_RIGHT_DESKTOP);
    document.documentElement.style.setProperty('--scroll-top-right-mobile', SCROLL_TOP_RIGHT_MOBILE);
    document.documentElement.style.setProperty('--scroll-top-right', isMobile ? SCROLL_TOP_RIGHT_MOBILE : SCROLL_TOP_RIGHT_DESKTOP);

    document.documentElement.style.setProperty('--scroll-top-size-desktop', SCROLL_TOP_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--scroll-top-size-mobile', SCROLL_TOP_SIZE_MOBILE);
    document.documentElement.style.setProperty('--scroll-top-size', isMobile ? SCROLL_TOP_SIZE_MOBILE : SCROLL_TOP_SIZE_DESKTOP);

    document.documentElement.style.setProperty('--scroll-top-icon-size-desktop', SCROLL_TOP_ICON_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--scroll-top-icon-size-mobile', SCROLL_TOP_ICON_SIZE_MOBILE);
    document.documentElement.style.setProperty('--scroll-top-icon-size', isMobile ? SCROLL_TOP_ICON_SIZE_MOBILE : SCROLL_TOP_ICON_SIZE_DESKTOP);

    document.documentElement.style.setProperty('--scroll-top-border-width-desktop', SCROLL_TOP_BORDER_WIDTH_DESKTOP);
    document.documentElement.style.setProperty('--scroll-top-border-width-mobile', SCROLL_TOP_BORDER_WIDTH_MOBILE);
    document.documentElement.style.setProperty('--scroll-top-btn-border-width', isMobile ? SCROLL_TOP_BORDER_WIDTH_MOBILE : SCROLL_TOP_BORDER_WIDTH_DESKTOP);

    document.documentElement.style.setProperty('--scroll-top-arrow-stroke-desktop', SCROLL_TOP_ARROW_STROKE_DESKTOP);
    document.documentElement.style.setProperty('--scroll-top-arrow-stroke-mobile', SCROLL_TOP_ARROW_STROKE_MOBILE);
    document.documentElement.style.setProperty('--scroll-top-arrow-stroke-width', isMobile ? SCROLL_TOP_ARROW_STROKE_MOBILE : SCROLL_TOP_ARROW_STROKE_DESKTOP);

    document.documentElement.style.setProperty('--scroll-top-color', SCROLL_TOP_COLOR);
    document.documentElement.style.setProperty('--scroll-top-stroke-color', SCROLL_TOP_STROKE_COLOR);
    document.documentElement.style.setProperty('--scroll-top-hover-color', SCROLL_TOP_HOVER_COLOR);
    document.documentElement.style.setProperty('--scroll-top-hover-stroke-color', SCROLL_TOP_HOVER_STROKE_COLOR);

    document.documentElement.style.setProperty('--scroll-top-bg', SCROLL_TOP_BG);
    document.documentElement.style.setProperty('--scroll-top-hover-bg', SCROLL_TOP_HOVER_BG);
    document.documentElement.style.setProperty('--scroll-top-opacity', SCROLL_TOP_OPACITY);
    document.documentElement.style.setProperty('--scroll-top-hover-opacity', SCROLL_TOP_HOVER_OPACITY);
    document.documentElement.style.setProperty('--scroll-top-hover-scale', SCROLL_TOP_HOVER_SCALE);
    document.documentElement.style.setProperty('--scroll-top-z-index', SCROLL_TOP_Z_INDEX);
  }

  function applyScrollBottomButtonConfig() {
    const isMobile = window.innerWidth <= 767;
    document.documentElement.style.setProperty('--scroll-bottom-top-desktop', SCROLL_BOTTOM_TOP_DESKTOP);
    document.documentElement.style.setProperty('--scroll-bottom-top-mobile', SCROLL_BOTTOM_TOP_MOBILE);
    document.documentElement.style.setProperty('--scroll-bottom-top', isMobile ? SCROLL_BOTTOM_TOP_MOBILE : SCROLL_BOTTOM_TOP_DESKTOP);

    document.documentElement.style.setProperty('--scroll-bottom-right-desktop', SCROLL_BOTTOM_RIGHT_DESKTOP);
    document.documentElement.style.setProperty('--scroll-bottom-right-mobile', SCROLL_BOTTOM_RIGHT_MOBILE);
    document.documentElement.style.setProperty('--scroll-bottom-right', isMobile ? SCROLL_BOTTOM_RIGHT_MOBILE : SCROLL_BOTTOM_RIGHT_DESKTOP);

    document.documentElement.style.setProperty('--scroll-bottom-size-desktop', SCROLL_BOTTOM_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--scroll-bottom-size-mobile', SCROLL_BOTTOM_SIZE_MOBILE);
    document.documentElement.style.setProperty('--scroll-bottom-size', isMobile ? SCROLL_BOTTOM_SIZE_MOBILE : SCROLL_BOTTOM_SIZE_DESKTOP);

    document.documentElement.style.setProperty('--scroll-bottom-icon-size-desktop', SCROLL_BOTTOM_ICON_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--scroll-bottom-icon-size-mobile', SCROLL_BOTTOM_ICON_SIZE_MOBILE);
    document.documentElement.style.setProperty('--scroll-bottom-icon-size', isMobile ? SCROLL_BOTTOM_ICON_SIZE_MOBILE : SCROLL_BOTTOM_ICON_SIZE_DESKTOP);

    document.documentElement.style.setProperty('--scroll-bottom-border-width-desktop', SCROLL_BOTTOM_BORDER_WIDTH_DESKTOP);
    document.documentElement.style.setProperty('--scroll-bottom-border-width-mobile', SCROLL_BOTTOM_BORDER_WIDTH_MOBILE);
    document.documentElement.style.setProperty('--scroll-bottom-btn-border-width', isMobile ? SCROLL_BOTTOM_BORDER_WIDTH_MOBILE : SCROLL_BOTTOM_BORDER_WIDTH_DESKTOP);

    document.documentElement.style.setProperty('--scroll-bottom-arrow-stroke-desktop', SCROLL_BOTTOM_ARROW_STROKE_DESKTOP);
    document.documentElement.style.setProperty('--scroll-bottom-arrow-stroke-mobile', SCROLL_BOTTOM_ARROW_STROKE_MOBILE);
    document.documentElement.style.setProperty('--scroll-bottom-arrow-stroke-width', isMobile ? SCROLL_BOTTOM_ARROW_STROKE_MOBILE : SCROLL_BOTTOM_ARROW_STROKE_DESKTOP);

    document.documentElement.style.setProperty('--scroll-bottom-color', SCROLL_BOTTOM_COLOR);
    document.documentElement.style.setProperty('--scroll-bottom-stroke-color', SCROLL_BOTTOM_STROKE_COLOR);
    document.documentElement.style.setProperty('--scroll-bottom-hover-color', SCROLL_BOTTOM_HOVER_COLOR);
    document.documentElement.style.setProperty('--scroll-bottom-hover-stroke-color', SCROLL_BOTTOM_HOVER_STROKE_COLOR);

    document.documentElement.style.setProperty('--scroll-bottom-bg', SCROLL_BOTTOM_BG);
    document.documentElement.style.setProperty('--scroll-bottom-hover-bg', SCROLL_BOTTOM_HOVER_BG);
    document.documentElement.style.setProperty('--scroll-bottom-opacity', SCROLL_BOTTOM_OPACITY);
    document.documentElement.style.setProperty('--scroll-bottom-hover-opacity', SCROLL_BOTTOM_HOVER_OPACITY);
    document.documentElement.style.setProperty('--scroll-bottom-hover-scale', SCROLL_BOTTOM_HOVER_SCALE);
    document.documentElement.style.setProperty('--scroll-bottom-z-index', SCROLL_BOTTOM_Z_INDEX);
  }

  function initScrollToTopButton() {
    if (!SCROLL_TOP_BUTTON_ENABLED) return;
    if (typeof initScrollToBottomButton === 'function') {
      initScrollToBottomButton();
    }
    if (document.getElementById('scroll-to-top-btn')) return;

    applyScrollTopButtonConfig();

    const btn = document.createElement('button');
    btn.id = 'scroll-to-top-btn';
    btn.className = 'scroll-to-top-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = `<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>`;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    document.body.appendChild(btn);

    const updateVisibility = () => {
      const isMobile = window.innerWidth <= 767;
      const threshold = isMobile ? SCROLL_TOP_APPEARS_WHEN_MOBILE : SCROLL_TOP_APPEARS_WHEN_DESKTOP;
      const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (currentScroll > threshold) {
        btn.classList.add('is-visible');
      } else {
        btn.classList.remove('is-visible');
      }
    };

    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', () => {
      applyScrollTopButtonConfig();
      updateVisibility();
    }, { passive: true });

    updateVisibility();
    [500, 1500, 3000].forEach(ms => setTimeout(updateVisibility, ms));
  }

  function initScrollToBottomButton() {
    if (!SCROLL_BOTTOM_BUTTON_ENABLED) return;
    if (document.getElementById('scroll-to-bottom-btn')) return;

    applyScrollBottomButtonConfig();

    const btn = document.createElement('button');
    btn.id = 'scroll-to-bottom-btn';
    btn.className = 'scroll-to-bottom-btn is-visible';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Go to bottom');
    btn.innerHTML = `<i class="fa-solid fa-arrow-down" aria-hidden="true"></i>`;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: document.documentElement.scrollHeight || document.body.scrollHeight,
        behavior: 'smooth'
      });
    });

    document.body.appendChild(btn);

    const updateVisibility = () => {
      const isMobile = window.innerWidth <= 767;
      const threshold = isMobile ? SCROLL_BOTTOM_DISAPPEARS_WHEN_MOBILE : SCROLL_BOTTOM_DISAPPEARS_WHEN_DESKTOP;
      const scrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const totalHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const distanceToBottom = totalHeight - (scrollPosition + viewportHeight);

      // Initially visible towards the top; only disappears when scrolled near the page bottom
      if (distanceToBottom <= threshold && scrollPosition > 100) {
        btn.classList.remove('is-visible');
      } else {
        btn.classList.add('is-visible');
      }
    };

    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', () => {
      applyScrollBottomButtonConfig();
      updateVisibility();
    }, { passive: true });

    updateVisibility();
    [500, 1500, 3000].forEach(ms => setTimeout(updateVisibility, ms));
  }

  applyScrollTopButtonConfig();
  applyScrollBottomButtonConfig();
  initScrollToBottomButton();

  // EDITABLE: Vertical position of the barometric/humidity/wind trend arrow (scaled to dial size)
  const BAROMETRIC_TREND_TOP_POS = "calc(var(--item-current-size) * -0.28 + 0.25vw)";
  // EDITABLE: Font size of the barometric/humidity/wind trend arrow (scaled to dial size)
  const BAROMETRIC_TREND_FONT_SIZE = "calc(var(--item-current-size) * 0.1875)";

  // --- EDITABLE: Dial Average Baselines Config (6 o'clock start -> 12 o'clock average -> 6 o'clock max) ---
  const HUMIDITY_DIAL_MIN = 30;     // EDITABLE: Humidity minimum (6 o'clock start position)
  const HUMIDITY_MORNING_AVG = 80;  // EDITABLE: Peak morning humidity average baseline (around 6 AM)
  const HUMIDITY_AFTERNOON_AVG = 50;// EDITABLE: Trough afternoon humidity average baseline (around 4 PM)
  const HUMIDITY_DIAL_MAX = 100;    // EDITABLE: Humidity maximum (6 o'clock end position)

  // Dynamically slides humidity 12 o'clock midpoint smoothly between 80% (6 AM) and 50% (4 PM)
  function getDynamicHumidityAverage(dtSeconds) {
    const d = dtSeconds ? new Date(dtSeconds * 1000) : new Date();
    const hours = d.getHours() + d.getMinutes() / 60;
    
    // 6:00 AM (6.0) to 4:00 PM (16.0): Daytime drying transition (80% -> 50%)
    if (hours >= 6.0 && hours <= 16.0) {
      const frac = (hours - 6.0) / 10.0;
      return HUMIDITY_MORNING_AVG - (HUMIDITY_MORNING_AVG - HUMIDITY_AFTERNOON_AVG) * frac;
    }
    // 4:00 PM (16.0) to 6:00 AM (6.0 next morning): Night/morning moistening transition (50% -> 80%)
    let frac = 0;
    if (hours > 16.0) {
      frac = (hours - 16.0) / 14.0;
    } else {
      frac = (hours + 8.0) / 14.0;
    }
    return HUMIDITY_AFTERNOON_AVG + (HUMIDITY_MORNING_AVG - HUMIDITY_AFTERNOON_AVG) * frac;
  }

  const DEWPOINT_DIAL_MIN = 34;     // EDITABLE: Dew point minimum in °F (6 o'clock start position)
  const DEWPOINT_DIAL_AVG = 67;     // EDITABLE: Dew point average baseline in °F (12 o'clock top-center position)
  const DEWPOINT_DIAL_MAX = 80;     // EDITABLE: Dew point maximum in °F (6 o'clock end position)

  const BAROMETER_DIAL_MIN = 976;   // EDITABLE: Barometer minimum in hPa (6 o'clock start position)
  const BAROMETER_DIAL_AVG = 1013;  // EDITABLE: Barometer average baseline in hPa (12 o'clock top-center position)
  const BAROMETER_DIAL_MAX = 1050;  // EDITABLE: Barometer maximum in hPa (6 o'clock end position)

  // Map value to 6 o'clock (0.0) -> 12 o'clock average (0.5) -> 6 o'clock max (1.0)
  function calcAboveBelowAverageProgress(val, minVal, avgVal, maxVal) {
    if (typeof val !== 'number' || Number.isNaN(val)) return 0;
    const clampedVal = Math.max(minVal, Math.min(maxVal, val));
    if (clampedVal <= avgVal) {
      if (avgVal === minVal) return 0.5;
      return 0.5 * ((clampedVal - minVal) / (avgVal - minVal));
    } else {
      if (maxVal === avgVal) return 0.5;
      return 0.5 + 0.5 * ((clampedVal - avgVal) / (maxVal - avgVal));
    }
  }

  // Helper to animate SVG progress dials in two stages on value changes
  function animateGauge(elements, newVal, prevVal, minVal, avgVal, maxVal, getRadiusFn) {
    if (!elements || elements.length === 0) return;
    
    const originalPrevVal = prevVal;
    // Default null prevVal to minVal so it runs a clean two-stage animation from empty on load
    if (prevVal === null) {
      prevVal = minVal;
    }
    
    const hasChange = originalPrevVal === null || prevVal !== newVal;

    elements.forEach(el => {
      // If the element is currently running a two-stage animation, do not interrupt it!
      if (el.dataset.animating === 'true') {
        const radius = getRadiusFn(el);
        const circumference = 2 * Math.PI * radius;
        const newPercent = calcAboveBelowAverageProgress(newVal, minVal, avgVal, maxVal);
        el.dataset.targetOffset = circumference * (1 - newPercent);
        return;
      }

      const radius = getRadiusFn(el);
      const circumference = 2 * Math.PI * radius;
      el.style.strokeDasharray = `${circumference}`;
      el.style.transition = 'none'; // Disable CSS transitions to prevent conflicts

      const newPercent = calcAboveBelowAverageProgress(newVal, minVal, avgVal, maxVal);
      const targetOffset = circumference * (1 - newPercent);
      const currentOffset = parseFloat(el.style.strokeDashoffset) || circumference;

      if (hasChange) {
        // Mark as animating
        el.dataset.animating = 'true';
        el.dataset.targetOffset = targetOffset;

        const oldPercent = calcAboveBelowAverageProgress(prevVal, minVal, avgVal, maxVal);
        const startOffset = circumference * (1 - oldPercent);
        
        const isIncrease = newVal > prevVal;

        if (isIncrease) {
          // Stage 1: Animate clockwise from old value's offset to MAX (strokeDashoffset = 0)
          animateValue(el, startOffset, 0, 800, () => {
            const currentTarget = parseFloat(el.dataset.targetOffset) ?? targetOffset;
            // Stage 2: Animate counter-clockwise from MAX (0) to new targetOffset
            animateValue(el, 0, currentTarget, 800, () => {
              el.dataset.animating = 'false';
            });
          });
        } else {
          // Stage 1: Animate counter-clockwise from old value's offset to MIN (strokeDashoffset = circumference)
          animateValue(el, startOffset, circumference, 800, () => {
            const currentTarget = parseFloat(el.dataset.targetOffset) ?? targetOffset;
            // Stage 2: Animate clockwise from MIN (circumference) to new targetOffset
            animateValue(el, circumference, currentTarget, 800, () => {
              el.dataset.animating = 'false';
            });
          });
        }
      } else {
        // Normal update (no change or initial load): animate smoothly to target
        animateValue(el, currentOffset, targetOffset, 800);
      }
    });
  }

  // JS animation helper using requestAnimationFrame
  function animateValue(el, startOffset, targetOffset, duration, onComplete) {
    const startTime = performance.now();
    
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: easeInOutCubic
      const eased = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const current = startOffset + (targetOffset - startOffset) * eased;
      el.style.strokeDashoffset = current;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.style.strokeDashoffset = targetOffset;
        if (onComplete) onComplete();
      }
    }
    
    requestAnimationFrame(update);
  }

  // EDITABLE: Lower gradient overlay lowest border vertical offset (relative to 24 sky images bottom edge)
  const GRADIENT_LOWER_BORDER_OFFSET_DESKTOP = '-4vw'; // EDITABLE Desktop: Adjust lowest border position (positive moves DOWN, negative moves UP)
  const GRADIENT_LOWER_BORDER_OFFSET_MOBILE = '-4vw';  // EDITABLE Mobile: Adjust lowest border position (positive moves DOWN, negative moves UP)

  // EDITABLE: Scrolling Gradient Overlay configuration (Non-phone version: iPad, desktop)
  const GRADIENT_NON_PHONE = {
    top: '40.5vw',
    height: '45vw',
    midpoint: '70%',
    midOpacity: '0.65',
    lowerTop: '116vw', // Fallback top before 24 sky images render
    lowerHeight: '38vw',
    lowerMidpoint: '90%',
    lowerMidOpacity: '0.65',
    lowerBorderOffset: GRADIENT_LOWER_BORDER_OFFSET_DESKTOP
  };

  // EDITABLE: Scrolling Gradient Overlay configuration (Phone version only)
  const GRADIENT_PHONE = {
    top: '80.5vw',
    height: '45vw',
    midpoint: '70%',
    midOpacity: '0.65',
    lowerTop: '158vw', // Fallback top before 24 sky images render
    lowerHeight: '38vw',
    lowerMidpoint: '90%',
    lowerMidOpacity: '0.65',
    lowerBorderOffset: GRADIENT_LOWER_BORDER_OFFSET_MOBILE
  };

  let lastCalculatedLowerTop = '';

  function updateLowerGradientPosition() {
    const isPhone = window.innerWidth < 768;
    const config = isPhone ? GRADIENT_PHONE : GRADIENT_NON_PHONE;
    const offsetStr = isPhone ? GRADIENT_LOWER_BORDER_OFFSET_MOBILE : GRADIENT_LOWER_BORDER_OFFSET_DESKTOP;
    const offsetVal = parseFloat(offsetStr) || 0;
    const lowerHeightVal = parseFloat(config.lowerHeight) || 38;
    const pxPerVw = window.innerWidth / 100;

    const imagesContainer = document.querySelector('.hourly-images-container');

    // Account for any active alert / rain banner height transitions
    const alertsContainer = document.getElementById('alerts-container');
    const rainBanner = document.getElementById('rain-forecast-banner');

    let pendingDeltaPx = 0;
    if (alertsContainer && alertsContainer.style.height) {
      const targetAlertsPx = (parseFloat(alertsContainer.style.height) || 0) * pxPerVw;
      const currentAlertsPx = alertsContainer.getBoundingClientRect().height;
      pendingDeltaPx += (targetAlertsPx - currentAlertsPx);
    }
    if (rainBanner && rainBanner.style.height) {
      const targetRainPx = (parseFloat(rainBanner.style.height) || 0) * pxPerVw;
      const currentRainPx = rainBanner ? rainBanner.getBoundingClientRect().height : 0;
      pendingDeltaPx += (targetRainPx - currentRainPx);
    }

    let lowerBottomVwNum;

    if (imagesContainer && imagesContainer.getBoundingClientRect().bottom > 0) {
      const rect = imagesContainer.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      const measuredBottomPx = rect.bottom + scrollY + pendingDeltaPx;
      lowerBottomVwNum = (measuredBottomPx / pxPerVw) + offsetVal;
    } else {
      // Fallback before 24 sky images render
      const fallbackTop = parseFloat(config.lowerTop || (isPhone ? 158 : 116));
      lowerBottomVwNum = fallbackTop + lowerHeightVal + offsetVal;
    }

    const lowerTopVwNum = lowerBottomVwNum - lowerHeightVal;
    const lowerTopVw = `${lowerTopVwNum.toFixed(2)}vw`;
    const lowerBottomVw = `${lowerBottomVwNum.toFixed(2)}vw`;

    if (lastCalculatedLowerTop !== lowerTopVw) {
      lastCalculatedLowerTop = lowerTopVw;
      document.documentElement.style.setProperty('--gradient-lower-top', lowerTopVw);
      document.documentElement.style.setProperty('--gradient-lower-bottom', lowerBottomVw);
      document.documentElement.style.setProperty('--gradient-lower-border-offset', offsetStr);
    }
  }

  let hourlyResizeObserver = null;
  function initHourlyResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    const target = document.querySelector('.hourly-images-container');
    if (!target) return;
    if (hourlyResizeObserver) {
      hourlyResizeObserver.disconnect();
    }
    hourlyResizeObserver = new ResizeObserver(() => {
      updateLowerGradientPosition();
    });
    hourlyResizeObserver.observe(target);
    const wrapper = document.getElementById('hourly-forecast-wrapper');
    if (wrapper) hourlyResizeObserver.observe(wrapper);
  }

  function applyGradientProperties() {
    const isPhone = window.innerWidth < 768;
    const config = isPhone ? GRADIENT_PHONE : GRADIENT_NON_PHONE;
    
    document.documentElement.style.setProperty('--gradient-top', config.top);
    document.documentElement.style.setProperty('--gradient-height', config.height);
    document.documentElement.style.setProperty('--gradient-midpoint', config.midpoint);
    document.documentElement.style.setProperty('--gradient-mid-opacity', config.midOpacity);
    document.documentElement.style.setProperty('--gradient-lower-height', config.lowerHeight);
    document.documentElement.style.setProperty('--gradient-lower-midpoint', config.lowerMidpoint);
    document.documentElement.style.setProperty('--gradient-lower-mid-opacity', config.lowerMidOpacity);
    document.documentElement.style.setProperty('--gradient-lower-border-offset', isPhone ? GRADIENT_LOWER_BORDER_OFFSET_MOBILE : GRADIENT_LOWER_BORDER_OFFSET_DESKTOP);

    updateLowerGradientPosition();
  }

  // Initial apply
  applyGradientProperties();

  // Re-apply on window resize
  window.addEventListener('resize', applyGradientProperties);

  // ==========================================
  // --- EDITABLE: Night Sky Starfield Configuration (JCV) ---
  // ==========================================
  // 1. Test Mode: Set to true to force starfield visible during daytime for testing (or use URL query ?stars=true)
  let STARFIELD_TEST_MODE = false; // EDITABLE: Toggle true to force starfield visible during daytime (set false for auto day/night)

  // 2. Day/Night Opacity Fade Window (in minutes)
  const STARFIELD_FADE_WINDOW_MINUTES = 60; // EDITABLE: Minutes after sunset to fade in (dusk) / minutes before sunrise to fade out (dawn)

  // 3. Container Dimensions, Position & Stacking Order (JCV)
  const STARFIELD_CONTAINER_TOP_DESKTOP = '0vw';    // EDITABLE Desktop: Vertical top position of starfield container
  const STARFIELD_CONTAINER_TOP_MOBILE = '0vw';     // EDITABLE Mobile: Vertical top position of starfield container
  const STARFIELD_CONTAINER_HEIGHT_DESKTOP = '100vh'; // EDITABLE Desktop: Height of starfield container (100vh matches full screen on load)
  const STARFIELD_CONTAINER_HEIGHT_MOBILE = '100vh';  // EDITABLE Mobile: Height of starfield container (100vh matches full screen on load)
  const STARFIELD_Z_INDEX_DESKTOP = -9990;          // EDITABLE Desktop: z-index layer (below gradient overlays at 0)
  const STARFIELD_Z_INDEX_MOBILE = -9990;           // EDITABLE Mobile: z-index layer

  // 4. Circle Geometry, Center Position & Top Cutoff (JCV)
  // Shifts stars UP so the city name (Tulsa) area is filled with stars, flush with top boundary / banners
  const STARFIELD_TOP_CUTOFF_DESKTOP = '12vw';      // EDITABLE Desktop: Vertical size cut off at top (shifts stars UP to fill Tulsa area flush with top)
  const STARFIELD_TOP_CUTOFF_MOBILE = '12vw';       // EDITABLE Mobile: Vertical size cut off at top (shifts stars UP to fill Tulsa area flush with top)
  const STARFIELD_CIRCLE_DIAMETER_DESKTOP = '100vw'; // EDITABLE Desktop: Diameter of starfield circle (full width)
  const STARFIELD_CIRCLE_DIAMETER_MOBILE = '100vw';  // EDITABLE Mobile: Diameter of starfield circle (full width)
  // Optional manual center Y override (leave null to automatically calculate: Radius - TopCutoff, e.g. 50vw - 12vw = 38vw):
  const STARFIELD_CENTER_Y_DESKTOP = null;          // EDITABLE Desktop: Explicit Center Y or null to auto-calculate (50vw - 12vw = 38vw)
  const STARFIELD_CENTER_Y_MOBILE = null;           // EDITABLE Mobile: Explicit Center Y or null to auto-calculate (50vw - 12vw = 38vw)
  const STARFIELD_CENTER_X_DESKTOP = '50vw';        // EDITABLE Desktop: Horizontal position of circle center
  const STARFIELD_CENTER_X_MOBILE = '50vw';         // EDITABLE Mobile: Horizontal position of circle center

  // 4. Slow Rotation Around Center (Seconds per 360° turn & direction)
  const STARFIELD_ROTATION_SPEED_S_DESKTOP = 500;   // EDITABLE Desktop: Seconds per 360° rotation (480s = 8 minutes)
  const STARFIELD_ROTATION_SPEED_S_MOBILE = 400;    // EDITABLE Mobile: Seconds per 360° rotation
  const STARFIELD_ROTATION_DIRECTION_DESKTOP = 'reverse'; // EDITABLE Desktop: 'normal' (clockwise) or 'reverse' (counter-clockwise)
  const STARFIELD_ROTATION_DIRECTION_MOBILE = 'normal';  // EDITABLE Mobile: 'normal' or 'reverse'

  // 5. Vertical Square Mask (Opacity going 100% to 0% vertically going down)
  const STARFIELD_MASK_START_DESKTOP = '0%';        // EDITABLE Desktop: Start point of 100% opacity
  const STARFIELD_MASK_START_MOBILE = '0%';         // EDITABLE Mobile: Start point of 100% opacity
  const STARFIELD_MASK_END_DESKTOP = '75%';         // EDITABLE Desktop: End point where opacity reaches 0%
  const STARFIELD_MASK_END_MOBILE = '70%';          // EDITABLE Mobile: End point where opacity reaches 0%

  // 6. Number of Stars & Wildness Randomization
  const STARFIELD_STAR_COUNT_DESKTOP = 160;         // EDITABLE Desktop: Base star count
  const STARFIELD_STAR_COUNT_MOBILE = 110;          // EDITABLE Mobile: Base star count
  const STARFIELD_COUNT_VARIANCE_DESKTOP = 0.35;    // EDITABLE Desktop: Wildness/randomness variance factor (0.35 = ±35%)
  const STARFIELD_COUNT_VARIANCE_MOBILE = 0.35;     // EDITABLE Mobile: Wildness/randomness variance factor (0.35 = ±35%)

  // 7. Star Sizes (Minimum, Maximum, and Random Selection)
  const STARFIELD_STAR_MIN_SIZE_DESKTOP = 0.8;      // EDITABLE Desktop: Minimum star radius in px
  const STARFIELD_STAR_MIN_SIZE_MOBILE = 0.8;       // EDITABLE Mobile: Minimum star radius in px
  const STARFIELD_STAR_MAX_SIZE_DESKTOP = 1.8;      // EDITABLE Desktop: Maximum star radius in px
  const STARFIELD_STAR_MAX_SIZE_MOBILE = 1.2;       // EDITABLE Mobile: Maximum star radius in px

  // 8. Out-of-Focus Stars (Atmospheric Blur Ratio & Max Blur Radius)
  const STARFIELD_OUT_OF_FOCUS_RATIO_DESKTOP = 0.00; // EDITABLE Desktop: Ratio of stars that are out-of-focus (0.30 = 30%)
  const STARFIELD_OUT_OF_FOCUS_RATIO_MOBILE = 0.00;  // EDITABLE Mobile: Ratio of stars that are out-of-focus
  const STARFIELD_OUT_OF_FOCUS_BLUR_DESKTOP = 1.0;  // EDITABLE Desktop: Blur radius for out-of-focus stars in px
  const STARFIELD_OUT_OF_FOCUS_BLUR_MOBILE = 1.0;   // EDITABLE Mobile: Blur radius for out-of-focus stars in px

  // 9. Dial & Doppler Interior Masking (Mask out stars inside dials and radar circles)
  let STARFIELD_MASK_DIALS_ENABLED = true;                // EDITABLE: Set true to mask out stars behind dials
  const STARFIELD_MASK_WEATHER_CIRCLES = true;           // EDITABLE: Set true to also mask out stars behind the 2 large radar/weather circles
  const STARFIELD_DIAL_MASK_PERCENT_DESKTOP = 100;       // EDITABLE Desktop: Dial cutout radius percentage (100 = full dial)
  const STARFIELD_DIAL_MASK_PERCENT_MOBILE = 100;        // EDITABLE Mobile: Dial cutout radius percentage
  const STARFIELD_DOPPLER_MASK_PERCENT_DESKTOP = 100;    // EDITABLE Desktop: Doppler circle cutout radius percentage
  const STARFIELD_DOPPLER_MASK_PERCENT_MOBILE = 100;     // EDITABLE Mobile: Doppler circle cutout radius percentage

  // 10. Startup Star Temperature Tints (Percentage of stars tinted by current & adjacent temperatures)
  const STARFIELD_COLOR_PERCENT_CURRENT_TEMP_DESKTOP = 7; // EDITABLE Desktop: % of stars tinted with current temperature color
  const STARFIELD_COLOR_PERCENT_CURRENT_TEMP_MOBILE = 7;  // EDITABLE Mobile: % of stars tinted with current temperature color
  const STARFIELD_COLOR_PERCENT_PLUS10_TEMP_DESKTOP = 7;  // EDITABLE Desktop: % of stars tinted with (current temp + 10) color
  const STARFIELD_COLOR_PERCENT_PLUS10_TEMP_MOBILE = 7;   // EDITABLE Mobile: % of stars tinted with (current temp + 10) color
  const STARFIELD_COLOR_PERCENT_MINUS10_TEMP_DESKTOP = 7; // EDITABLE Desktop: % of stars tinted with (current temp - 10) color
  const STARFIELD_COLOR_PERCENT_MINUS10_TEMP_MOBILE = 7;  // EDITABLE Mobile: % of stars tinted with (current temp - 10) color

  // 11. Individual Star Twinkling & Scintillation (Occasional random twinkling "now and then")
  let STARFIELD_TWINKLE_ENABLED = true;                         // EDITABLE: Enable/disable individual star twinkling
  const STARFIELD_TWINKLE_COMMONNESS_DESKTOP = 1.0;            // EDITABLE Desktop: How common twinkles are (1.0 = relaxed 'now and then' ~3.5s pause, 2.0 = ~1.8s, 0.5 = ~7s calm sky)
  const STARFIELD_TWINKLE_COMMONNESS_MOBILE = 0.8;             // EDITABLE Mobile: How common twinkles are (0.8 = ~4.5s average lull between twinkles)
  const STARFIELD_TWINKLE_RANDOMNESS_DESKTOP = 0.85;           // EDITABLE Desktop: How random the timing is (0.0 = regular clockwork, 1.0 = pure Poisson random arrival)
  const STARFIELD_TWINKLE_RANDOMNESS_MOBILE = 0.85;            // EDITABLE Mobile: How random the timing is (0.0 to 1.0)
  const STARFIELD_TWINKLE_DURATION_S_DESKTOP = 0.35;           // EDITABLE Desktop: Duration of a single sparkle in seconds (snappy, realistic twinkle)
  const STARFIELD_TWINKLE_DURATION_S_MOBILE = 0.35;            // EDITABLE Mobile: Duration of a single sparkle in seconds
  const STARFIELD_TWINKLE_INTENSITY_DESKTOP = 0.80;            // EDITABLE Desktop: Sparkle brilliance & glint brightness (0.0 = subtle, 1.0 = brilliant sparkle)
  const STARFIELD_TWINKLE_INTENSITY_MOBILE = 0.75;             // EDITABLE Mobile: Sparkle brilliance & glint brightness

  // 12. Random Star Flares (Disabled by default to prevent mechanical balloon/pulsing)
  let STARFIELD_FLARE_ENABLED = false;                   // EDITABLE: Set false to prevent stars from blooming/pulsing like balloons
  const STARFIELD_FLARE_INTERVAL_MIN_S_DESKTOP = 15;     // EDITABLE Desktop: Min seconds between random flare events
  const STARFIELD_FLARE_INTERVAL_MIN_S_MOBILE = 20;      // EDITABLE Mobile: Min seconds between random flare events
  const STARFIELD_FLARE_INTERVAL_MAX_S_DESKTOP = 30;     // EDITABLE Desktop: Max seconds between random flare events
  const STARFIELD_FLARE_INTERVAL_MAX_S_MOBILE = 40;      // EDITABLE Mobile: Max seconds between random flare events
  const STARFIELD_FLARE_DURATION_S_DESKTOP = 1.5;        // EDITABLE Desktop: Duration of each flare bloom in seconds
  const STARFIELD_FLARE_DURATION_S_MOBILE = 1.5;         // EDITABLE Mobile: Duration of each flare bloom in seconds
  const STARFIELD_FLARE_SIZE_MULT_DESKTOP = 1.8;         // EDITABLE Desktop: Peak size multiplier during flare bloom
  const STARFIELD_FLARE_SIZE_MULT_MOBILE = 1.6;          // EDITABLE Mobile: Peak size multiplier during flare bloom

  // 13. Occasional Shooting Stars (Meteors)
  let STARFIELD_METEOR_ENABLED = true;                   // EDITABLE: Enable/disable occasional shooting stars
  const STARFIELD_METEOR_INTERVAL_MIN_S_DESKTOP = 25;    // EDITABLE Desktop: Min seconds between shooting star streaks
  const STARFIELD_METEOR_INTERVAL_MIN_S_MOBILE = 35;     // EDITABLE Mobile: Min seconds between shooting star streaks
  const STARFIELD_METEOR_INTERVAL_MAX_S_DESKTOP = 60;    // EDITABLE Desktop: Max seconds between shooting star streaks
  const STARFIELD_METEOR_INTERVAL_MAX_S_MOBILE = 75;     // EDITABLE Mobile: Max seconds between shooting star streaks
  const STARFIELD_METEOR_LENGTH_DESKTOP = 90;            // EDITABLE Desktop: Streak trail length in px
  const STARFIELD_METEOR_LENGTH_MOBILE = 65;             // EDITABLE Mobile: Streak trail length in px
  const STARFIELD_METEOR_SPEED_DESKTOP = 400;            // EDITABLE Desktop: Streak speed in px per second
  const STARFIELD_METEOR_SPEED_MOBILE = 320;             // EDITABLE Mobile: Streak speed in px per second
  const STARFIELD_METEOR_ANGLE_MIN_DEG_DESKTOP = 15;     // EDITABLE Desktop: Min downward screen trajectory angle in degrees (15° = downward-right)
  const STARFIELD_METEOR_ANGLE_MIN_DEG_MOBILE = 15;      // EDITABLE Mobile: Min downward screen trajectory angle in degrees
  const STARFIELD_METEOR_ANGLE_MAX_DEG_DESKTOP = 165;    // EDITABLE Desktop: Max downward screen trajectory angle in degrees (165° = downward-left, 90° = straight down)
  const STARFIELD_METEOR_ANGLE_MAX_DEG_MOBILE = 165;     // EDITABLE Mobile: Max downward screen trajectory angle in degrees

  // 14. Meteor Shower Live Event & Banner Configuration (JCV)
  let METEOR_SHOWER_TEST_MODE = null;                     // EDITABLE: null (auto by date/weather), 'coming' (force 12h countdown banner), 'occurring' (force active banner & 20x meteors)
  const METEOR_SHOWER_OCCURRENCE_MULTIPLIER_DESKTOP = 10; // EDITABLE Desktop: Shooting star occurrence frequency multiplier during visual shower (20X)
  const METEOR_SHOWER_OCCURRENCE_MULTIPLIER_MOBILE = 10;  // EDITABLE Mobile: Shooting star occurrence frequency multiplier during visual shower (20X)
  const METEOR_SHOWER_COUNTDOWN_HOURS_DESKTOP = 12;       // EDITABLE Desktop: Advance warning countdown window in hours (12 hours)
  const METEOR_SHOWER_COUNTDOWN_HOURS_MOBILE = 12;        // EDITABLE Mobile: Advance warning countdown window in hours (12 hours)
  const METEOR_SHOWER_MAX_CLOUD_COVER_DESKTOP = 30;       // EDITABLE Desktop: Max cloud cover % threshold (<= 30%)
  const METEOR_SHOWER_MAX_CLOUD_COVER_MOBILE = 30;        // EDITABLE Mobile: Max cloud cover % threshold (<= 30%)
  const METEOR_SHOWER_MOON_PHASE_MIN_WINDOW_1_DESKTOP = 0.0;  // EDITABLE Desktop: Moon phase window 1 min (0.0 = New Moon)
  const METEOR_SHOWER_MOON_PHASE_MIN_WINDOW_1_MOBILE = 0.0;   // EDITABLE Mobile: Moon phase window 1 min
  const METEOR_SHOWER_MOON_PHASE_MAX_WINDOW_1_DESKTOP = 0.35; // EDITABLE Desktop: Moon phase window 1 max (0.35 = crescent/first quarter)
  const METEOR_SHOWER_MOON_PHASE_MAX_WINDOW_1_MOBILE = 0.35;  // EDITABLE Mobile: Moon phase window 1 max
  const METEOR_SHOWER_MOON_PHASE_MIN_WINDOW_2_DESKTOP = 0.65; // EDITABLE Desktop: Moon phase window 2 min (0.65 = waning crescent)
  const METEOR_SHOWER_MOON_PHASE_MIN_WINDOW_2_MOBILE = 0.65;  // EDITABLE Mobile: Moon phase window 2 min
  const METEOR_SHOWER_MOON_PHASE_MAX_WINDOW_2_DESKTOP = 1.0;  // EDITABLE Desktop: Moon phase window 2 max (1.0 = New Moon)
  const METEOR_SHOWER_MOON_PHASE_MAX_WINDOW_2_MOBILE = 1.0;   // EDITABLE Mobile: Moon phase window 2 max
  const METEOR_SHOWER_BANNER_COLOR_DESKTOP = "rgba(45, 25, 75, 0.88)"; // EDITABLE Desktop: Cosmic indigo banner background color
  const METEOR_SHOWER_BANNER_COLOR_MOBILE = "rgba(45, 25, 75, 0.88)";  // EDITABLE Mobile: Cosmic indigo banner background color
  const METEOR_SHOWER_BANNER_ICON = "img/meteor-wat.svg";              // EDITABLE: SVG icon path for meteor shower banner
  const METEOR_SHOWER_COMING_LABEL = "METEOR SHOWER COMING";           // EDITABLE: Event title suffix for countdown banner
  const METEOR_SHOWER_OCCURRING_LABEL = "METEOR SHOWER OCCURRING";     // EDITABLE: Event title suffix for active shower banner

  // Major annual meteor showers with peak windows and hemisphere latitude bounds
  const POPULAR_METEOR_SHOWERS = [
    {
      name: "Quadrantid",
      fullName: "Quadrantid Meteor Shower",
      radiant: "Boötes",
      peakMonth: 1, // Jan
      peakStartDay: 3,
      peakEndDay: 4,
      peakRatePerHour: 110,
      minLat: -10,
      maxLat: 90,
      description: "One of the year's best meteor showers, known for producing bright fireball meteors with persistent glowing trains."
    },
    {
      name: "Lyrid",
      fullName: "Lyrid Meteor Shower",
      radiant: "Lyra",
      peakMonth: 4, // Apr
      peakStartDay: 21,
      peakEndDay: 22,
      peakRatePerHour: 20,
      minLat: -30,
      maxLat: 90,
      description: "Fast and bright meteors from Comet Thatcher, often leaving luminous dust trails lasting several seconds."
    },
    {
      name: "Eta Aquariid",
      fullName: "Eta Aquariid Meteor Shower",
      radiant: "Aquarius",
      peakMonth: 5, // May
      peakStartDay: 5,
      peakEndDay: 6,
      peakRatePerHour: 50,
      minLat: -90,
      maxLat: 60,
      description: "Swift meteors originating from Halley's Comet, featuring high speeds and glowing vapor trains."
    },
    {
      name: "Perseid",
      fullName: "Perseid Meteor Shower",
      radiant: "Perseus",
      peakMonth: 8, // Aug
      peakStartDay: 11,
      peakEndDay: 13,
      peakRatePerHour: 100,
      minLat: -30,
      maxLat: 90,
      description: "The summer's most famous meteor shower from Comet Swift-Tuttle, renowned for abundant fireballs and high rates."
    },
    {
      name: "Orionid",
      fullName: "Orionid Meteor Shower",
      radiant: "Orion",
      peakMonth: 10, // Oct
      peakStartDay: 20,
      peakEndDay: 22,
      peakRatePerHour: 25,
      minLat: -90,
      maxLat: 90,
      description: "Debris left behind by Halley's Comet striking Earth's atmosphere at 41 miles per second with fine incandescent trails."
    },
    {
      name: "Leonid",
      fullName: "Leonid Meteor Shower",
      radiant: "Leo",
      peakMonth: 11, // Nov
      peakStartDay: 17,
      peakEndDay: 18,
      peakRatePerHour: 15,
      minLat: -90,
      maxLat: 90,
      description: "Historic meteor shower from Comet Tempel-Tuttle, celebrated for swift greenish meteors and historic meteor storms."
    },
    {
      name: "Geminid",
      fullName: "Geminid Meteor Shower",
      radiant: "Gemini",
      peakMonth: 12, // Dec
      peakStartDay: 13,
      peakEndDay: 14,
      peakRatePerHour: 120,
      minLat: -40,
      maxLat: 90,
      description: "Widely regarded as the king of annual meteor showers, producing intensely bright, multicolored, slow-moving fireballs from asteroid 3200 Phaethon."
    },
    {
      name: "Ursid",
      fullName: "Ursid Meteor Shower",
      radiant: "Ursa Minor",
      peakMonth: 12, // Dec
      peakStartDay: 21,
      peakEndDay: 22,
      peakRatePerHour: 10,
      minLat: 0,
      maxLat: 90,
      description: "Late December shower radiating from the Little Dipper near Polaris, best viewed in far northern skies."
    }
  ];

  let isMeteorShowerOccurring = false;

  let starFieldStars = null;
  let activeFlare = null;
  let nextFlareTime = 0;
  let activeMeteors = [];
  let nextMeteorTime = 0;
  let nextTwinkleTime = 0;
  let starfieldAnimId = null;
  let starfieldAnimRunning = false;

  // Helper: Parse hsl(H, S%, L%) into [r, g, b] array
  function parseHslToRgb(hslStr) {
    if (!hslStr || typeof hslStr !== 'string') return [255, 255, 255];
    const match = hslStr.match(/hsl\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
    if (!match) return [255, 255, 255];
    const h = parseFloat(match[1]) / 360;
    const s = parseFloat(match[2]) / 100;
    const l = parseFloat(match[3]) / 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function getStarfieldTempColors(wData) {
    const data = wData || lastWeatherData || window.lastWeatherData;
    const currTemp = (typeof data?.current?.temp === 'number') ? data.current.temp : 72;
    const colorCurrHsl = (typeof tempToColor === 'function' ? tempToColor(currTemp) : null) || 'hsl(45, 100%, 50%)';
    const colorPlus10Hsl = (typeof tempToColor === 'function' ? tempToColor(currTemp + 10) : null) || 'hsl(30, 100%, 50%)';
    const colorMinus10Hsl = (typeof tempToColor === 'function' ? tempToColor(currTemp - 10) : null) || 'hsl(80, 90%, 40%)';

    return {
      currTemp,
      rgbCurr: parseHslToRgb(colorCurrHsl),
      rgbPlus10: parseHslToRgb(colorPlus10Hsl),
      rgbMinus10: parseHslToRgb(colorMinus10Hsl)
    };
  }

  function refreshStarfieldTempColors(data) {
    if (!starFieldStars || starFieldStars.length === 0) return;
    const { rgbCurr, rgbPlus10, rgbMinus10 } = getStarfieldTempColors(data);
    starFieldStars.forEach(star => {
      if (star.colorType === 'curr') {
        star.rgb = rgbCurr;
      } else if (star.colorType === 'plus10') {
        star.rgb = rgbPlus10;
      } else if (star.colorType === 'minus10') {
        star.rgb = rgbMinus10;
      }
    });
  }

  function generateStarFieldData() {
    const isPhone = window.innerWidth < 768;
    const baseCount = isPhone ? STARFIELD_STAR_COUNT_MOBILE : STARFIELD_STAR_COUNT_DESKTOP;
    const variance = isPhone ? STARFIELD_COUNT_VARIANCE_MOBILE : STARFIELD_COUNT_VARIANCE_DESKTOP;
    const count = Math.max(10, Math.round(baseCount * (1 + (Math.random() * 2 - 1) * variance)));

    const minSize = isPhone ? STARFIELD_STAR_MIN_SIZE_MOBILE : STARFIELD_STAR_MIN_SIZE_DESKTOP;
    const maxSize = isPhone ? STARFIELD_STAR_MAX_SIZE_MOBILE : STARFIELD_STAR_MAX_SIZE_DESKTOP;
    const oofRatio = isPhone ? STARFIELD_OUT_OF_FOCUS_RATIO_MOBILE : STARFIELD_OUT_OF_FOCUS_RATIO_DESKTOP;
    const maxBlur = isPhone ? STARFIELD_OUT_OF_FOCUS_BLUR_MOBILE : STARFIELD_OUT_OF_FOCUS_BLUR_DESKTOP;

    // Temperature colors and percentage distribution
    const { rgbCurr, rgbPlus10, rgbMinus10 } = getStarfieldTempColors();
    const pctCurr = isPhone ? STARFIELD_COLOR_PERCENT_CURRENT_TEMP_MOBILE : STARFIELD_COLOR_PERCENT_CURRENT_TEMP_DESKTOP;
    const pctPlus10 = isPhone ? STARFIELD_COLOR_PERCENT_PLUS10_TEMP_MOBILE : STARFIELD_COLOR_PERCENT_PLUS10_TEMP_DESKTOP;
    const pctMinus10 = isPhone ? STARFIELD_COLOR_PERCENT_MINUS10_TEMP_MOBILE : STARFIELD_COLOR_PERCENT_MINUS10_TEMP_DESKTOP;

    const numCurr = Math.round(count * (pctCurr / 100));
    const numPlus10 = Math.round(count * (pctPlus10 / 100));
    const numMinus10 = Math.round(count * (pctMinus10 / 100));

    const colorAssignments = [];
    for (let i = 0; i < numCurr; i++) colorAssignments.push('curr');
    for (let i = 0; i < numPlus10; i++) colorAssignments.push('plus10');
    for (let i = 0; i < numMinus10; i++) colorAssignments.push('minus10');
    while (colorAssignments.length < count) colorAssignments.push('natural');

    // Shuffle distribution array so temperature stars are evenly dispersed throughout the night sky
    for (let i = colorAssignments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorAssignments[i], colorAssignments[j]] = [colorAssignments[j], colorAssignments[i]];
    }

    const stars = [];
    for (let i = 0; i < count; i++) {
      // Uniform random distribution inside circle:
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      const normX = r * Math.cos(theta); // Normalized: -1 to +1
      const normY = r * Math.sin(theta); // Normalized: -1 to +1

      // Size distribution: power curve so faint pinpoints dominate with occasional bright stars
      const sizeFactor = Math.pow(Math.random(), 2.0);
      const size = minSize + sizeFactor * (maxSize - minSize);

      // Opacity / Brightness variation
      const alpha = 0.35 + Math.random() * 0.65;

      const colorType = colorAssignments[i] || 'natural';
      let rgb = [255, 255, 255]; // Pure white (default)

      if (colorType === 'curr') {
        rgb = rgbCurr;
      } else if (colorType === 'plus10') {
        rgb = rgbPlus10;
      } else if (colorType === 'minus10') {
        rgb = rgbMinus10;
      } else {
        const randNatural = Math.random();
        if (randNatural < 0.20) {
          rgb = [205, 225, 255]; // Subtle celestial blue
        } else if (randNatural < 0.40) {
          rgb = [255, 242, 215]; // Subtle warm amber
        }
      }

      const isOutOfFocus = Math.random() < oofRatio;
      const blur = isOutOfFocus ? (1.5 + Math.random() * (maxBlur - 1.5)) : 0;

      stars.push({
        normX,
        normY,
        size,
        alpha,
        rgb,
        colorType,
        isOutOfFocus,
        blur,
        twinkle: null
      });
    }

    starFieldStars = stars;
  }

  function scheduleNextTwinkle(nowSec) {
    const isPhone = window.innerWidth < 768;
    const baseCommonness = isPhone ? STARFIELD_TWINKLE_COMMONNESS_MOBILE : STARFIELD_TWINKLE_COMMONNESS_DESKTOP;
    const commonness = Math.max(0.05, typeof window !== 'undefined' && window.STARFIELD_TWINKLE_COMMONNESS_OVERRIDE !== undefined ? window.STARFIELD_TWINKLE_COMMONNESS_OVERRIDE : baseCommonness);
    const baseRandomness = isPhone ? STARFIELD_TWINKLE_RANDOMNESS_MOBILE : STARFIELD_TWINKLE_RANDOMNESS_DESKTOP;
    const randomness = Math.max(0, Math.min(1, typeof window !== 'undefined' && window.STARFIELD_TWINKLE_RANDOMNESS_OVERRIDE !== undefined ? window.STARFIELD_TWINKLE_RANDOMNESS_OVERRIDE : baseRandomness));

    // Base interval in seconds between twinkles:
    // At commonness = 1.0, average lull is ~3.5s.
    // At commonness = 2.0, average lull is ~1.75s.
    // At commonness = 0.5, average lull is ~7.0s.
    const baseInterval = 3.5 / commonness;

    // Poisson process exponential distribution for natural sporadic timing
    // -ln(U) has mean = 1.0, generating realistic clustered and spaced intervals
    const u = Math.max(0.0001, Math.random());
    const poissonInterval = -Math.log(u) * baseInterval;

    // Blend between clockwork regular (randomness = 0) and pure Poisson (randomness = 1)
    const actualInterval = Math.max(0.25, (1 - randomness) * baseInterval + randomness * poissonInterval);
    nextTwinkleTime = nowSec + actualInterval;
  }

  function scheduleNextFlare(nowSec) {
    const isPhone = window.innerWidth < 768;
    const minS = isPhone ? STARFIELD_FLARE_INTERVAL_MIN_S_MOBILE : STARFIELD_FLARE_INTERVAL_MIN_S_DESKTOP;
    const maxS = isPhone ? STARFIELD_FLARE_INTERVAL_MAX_S_MOBILE : STARFIELD_FLARE_INTERVAL_MAX_S_DESKTOP;
    nextFlareTime = nowSec + minS + Math.random() * (maxS - minS);
  }

  function scheduleNextMeteor(nowSec) {
    const isPhone = window.innerWidth < 768;
    let minS = isPhone ? STARFIELD_METEOR_INTERVAL_MIN_S_MOBILE : STARFIELD_METEOR_INTERVAL_MIN_S_DESKTOP;
    let maxS = isPhone ? STARFIELD_METEOR_INTERVAL_MAX_S_MOBILE : STARFIELD_METEOR_INTERVAL_MAX_S_DESKTOP;
    if (isMeteorShowerOccurring) {
      const mult = isPhone ? METEOR_SHOWER_OCCURRENCE_MULTIPLIER_MOBILE : METEOR_SHOWER_OCCURRENCE_MULTIPLIER_DESKTOP;
      minS = Math.max(0.2, minS / mult);
      maxS = Math.max(0.6, maxS / mult);
    }
    nextMeteorTime = nowSec + minS + Math.random() * (maxS - minS);
  }

  function setMeteorShowerOccurring(active) {
    if (isMeteorShowerOccurring !== active) {
      isMeteorShowerOccurring = active;
      if (active) {
        nextMeteorTime = (performance.now() / 1000) + 0.3; // Trigger streak almost immediately!
      }
    }
  }

  function getCanvasRotationAngle(canvas) {
    if (!canvas) return 0;
    const style = window.getComputedStyle(canvas);
    const transform = style.transform || style.webkitTransform;
    if (!transform || transform === 'none') return 0;
    const match = transform.match(/^matrix\(([^)]+)\)$/);
    if (match) {
      const values = match[1].split(',').map(parseFloat);
      return Math.atan2(values[1], values[0]);
    }
    const match3d = transform.match(/^matrix3d\(([^)]+)\)$/);
    if (match3d) {
      const values = match3d[1].split(',').map(parseFloat);
      return Math.atan2(values[1], values[0]);
    }
    return 0;
  }

  function createMeteor(canvas, isPhone, nowSec, forcedDuration) {
    const dVw = parseFloat(isPhone ? STARFIELD_CIRCLE_DIAMETER_MOBILE : STARFIELD_CIRCLE_DIAMETER_DESKTOP) || 100;
    const diameterPx = Math.round((dVw / 100) * window.innerWidth);
    const radius = diameterPx / 2;
    const cx = radius;
    const cy = radius;

    // 1. Determine screen-space angle within lower 180° (0° is right, 90° is straight down, 180° is left)
    const minDeg = isPhone ? STARFIELD_METEOR_ANGLE_MIN_DEG_MOBILE : STARFIELD_METEOR_ANGLE_MIN_DEG_DESKTOP;
    const maxDeg = isPhone ? STARFIELD_METEOR_ANGLE_MAX_DEG_MOBILE : STARFIELD_METEOR_ANGLE_MAX_DEG_DESKTOP;
    const screenAngleDeg = minDeg + Math.random() * (maxDeg - minDeg);
    const screenAngleRad = screenAngleDeg * (Math.PI / 180);

    // 2. Counter-rotate to get canvas-local angle so visual motion on screen is always downward within the lower 180°
    const rotAngle = getCanvasRotationAngle(canvas);
    const localAngle = screenAngleRad - rotAngle;

    // 3. Screen-relative start position in the upper sky
    // Biased horizontally opposite the travel direction so the meteor streaks gracefully across the visible sky
    const isHeadingRight = screenAngleDeg < 90;
    const screenRelX = isHeadingRight
      ? (-0.55 + Math.random() * 0.75) * radius  // Starts left/center, streaks downward-right
      : (-0.20 + Math.random() * 0.75) * radius; // Starts right/center, streaks downward-left
    const screenRelY = -radius * (0.15 + Math.random() * 0.45); // -0.60 to -0.15 radius (upper sky)

    // 4. Transform screen-relative start position into canvas-local coordinates
    const localX = screenRelX * Math.cos(rotAngle) + screenRelY * Math.sin(rotAngle);
    const localY = -screenRelX * Math.sin(rotAngle) + screenRelY * Math.cos(rotAngle);
    const startX = cx + localX;
    const startY = cy + localY;

    const speed = isPhone ? STARFIELD_METEOR_SPEED_MOBILE : STARFIELD_METEOR_SPEED_DESKTOP;
    const length = isPhone ? STARFIELD_METEOR_LENGTH_MOBILE : STARFIELD_METEOR_LENGTH_DESKTOP;
    const duration = forcedDuration || (0.5 + Math.random() * 0.4);

    return {
      x: startX,
      y: startY,
      angle: localAngle,
      speed,
      length,
      startTime: nowSec,
      duration
    };
  }

  let cachedStarfieldMaskDials = [];
  let lastStarfieldMaskDialsTime = 0;

  function getStarfieldMaskDials() {
    const now = performance.now();
    if (cachedStarfieldMaskDials.length > 0 && (now - lastStarfieldMaskDialsTime < 400)) {
      return cachedStarfieldMaskDials;
    }
    lastStarfieldMaskDialsTime = now;

    const isPhone = window.innerWidth < 768;
    const dialMaskPercent = isPhone ? STARFIELD_DIAL_MASK_PERCENT_MOBILE : STARFIELD_DIAL_MASK_PERCENT_DESKTOP;
    const dopplerMaskPercent = isPhone ? STARFIELD_DOPPLER_MASK_PERCENT_MOBILE : STARFIELD_DOPPLER_MASK_PERCENT_DESKTOP;

    let selector = '.clockGridItem, #analog-clock';
    if (STARFIELD_MASK_WEATHER_CIRCLES) {
      selector += ', #weather-desc-image, #weather-desc-image-left';
    }

    const elements = document.querySelectorAll(selector);
    const dials = [];
    const starfieldCircle = document.getElementById('starfield-circle');
    const circleRect = starfieldCircle ? starfieldCircle.getBoundingClientRect() : null;
    const circleCenterX = circleRect ? (circleRect.left + circleRect.width / 2) : (window.innerWidth / 2);
    const circleCenterY = circleRect ? (circleRect.top + circleRect.height / 2) : 0;

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const isDoppler = el.id === 'weather-desc-image' || el.id === 'weather-desc-image-left';
        const maskPct = isDoppler ? dopplerMaskPercent : dialMaskPercent;
        const radius = (rect.width / 2) * (maskPct / 100);
        dials.push({
          dx: (rect.left + rect.width / 2) - circleCenterX,
          dy: (rect.top + rect.height / 2) - circleCenterY,
          radius: radius
        });
      }
    });

    cachedStarfieldMaskDials = dials;
    return dials;
  }

  function drawStarfield(timestamp) {
    const canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;

    if (!starFieldStars) {
      generateStarFieldData();
    }

    const isPhone = window.innerWidth < 768;
    const diameterStr = isPhone ? STARFIELD_CIRCLE_DIAMETER_MOBILE : STARFIELD_CIRCLE_DIAMETER_DESKTOP;
    const dVw = parseFloat(diameterStr) || 100;
    const diameterPx = Math.round((dVw / 100) * window.innerWidth);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(diameterPx * dpr);
    const targetH = Math.round(diameterPx * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cx = diameterPx / 2;
    const cy = diameterPx / 2;
    const radius = diameterPx / 2;
    const nowSec = (timestamp || performance.now()) / 1000;

    // Flare management
    if (STARFIELD_FLARE_ENABLED) {
      if (!nextFlareTime) scheduleNextFlare(nowSec);
      if (!activeFlare && nowSec >= nextFlareTime && starFieldStars.length > 0) {
        const starIdx = Math.floor(Math.random() * starFieldStars.length);
        const dur = isPhone ? STARFIELD_FLARE_DURATION_S_MOBILE : STARFIELD_FLARE_DURATION_S_DESKTOP;
        const mult = isPhone ? STARFIELD_FLARE_SIZE_MULT_MOBILE : STARFIELD_FLARE_SIZE_MULT_DESKTOP;
        activeFlare = {
          starIndex: starIdx,
          startTime: nowSec,
          duration: dur,
          sizeMult: mult
        };
      }
      if (activeFlare && nowSec >= activeFlare.startTime + activeFlare.duration) {
        activeFlare = null;
        scheduleNextFlare(nowSec);
      }
    }

    // Meteor management
    if (STARFIELD_METEOR_ENABLED) {
      if (!nextMeteorTime) scheduleNextMeteor(nowSec);
      if (nowSec >= nextMeteorTime) {
        activeMeteors.push(createMeteor(canvas, isPhone, nowSec));
        scheduleNextMeteor(nowSec);
      }
      activeMeteors = activeMeteors.filter(m => nowSec < m.startTime + m.duration);
    }

    // Random "now and then" star twinkle management
    if (STARFIELD_TWINKLE_ENABLED && starFieldStars.length > 0) {
      if (!nextTwinkleTime) scheduleNextTwinkle(nowSec);
      if (nowSec >= nextTwinkleTime) {
        // Pick an eligible star that is not currently twinkling or flaring
        const eligible = [];
        for (let i = 0; i < starFieldStars.length; i++) {
          if (!starFieldStars[i].twinkle && (!activeFlare || activeFlare.starIndex !== i)) {
            eligible.push(i);
          }
        }
        if (eligible.length > 0) {
          const chosenIdx = eligible[Math.floor(Math.random() * eligible.length)];
          const durBase = isPhone ? STARFIELD_TWINKLE_DURATION_S_MOBILE : STARFIELD_TWINKLE_DURATION_S_DESKTOP;
          const intensity = isPhone ? STARFIELD_TWINKLE_INTENSITY_MOBILE : STARFIELD_TWINKLE_INTENSITY_DESKTOP;
          const dur = durBase * (0.85 + Math.random() * 0.3);

          starFieldStars[chosenIdx].twinkle = {
            startTime: nowSec,
            duration: dur,
            intensity: intensity,
            phase: Math.random() * Math.PI * 2
          };
        }
        scheduleNextTwinkle(nowSec);
      }
    }

    // Draw stars
    starFieldStars.forEach((star, idx) => {
      const x = cx + star.normX * radius;
      const y = cy + star.normY * radius;
      const [r, g, b] = star.rgb;

      let currentAlpha = star.alpha;
      let currentSize = star.size;

      // Apply organic "now and then" twinkle (crisp scintillation, NO balloon/size pulsing)
      if (star.twinkle) {
        const elapsed = nowSec - star.twinkle.startTime;
        if (elapsed >= star.twinkle.duration) {
          star.twinkle = null;
        } else {
          const progress = elapsed / star.twinkle.duration; // 0.0 to 1.0

          // Organic scintillation envelope:
          // Rapid rise (attack ~20%), turbulent micro-scintillations (~50%), quick smooth release (~30%)
          let scintEnvelope = 0;
          if (progress < 0.20) {
            scintEnvelope = progress / 0.20;
          } else if (progress < 0.70) {
            const subP = (progress - 0.20) / 0.50;
            // 3 rapid asymmetric atmospheric micro-shimmer peaks
            scintEnvelope = 0.70 + 0.30 * Math.sin(subP * Math.PI * 5 + star.twinkle.phase);
          } else {
            const decP = (progress - 0.70) / 0.30;
            scintEnvelope = 1.0 - decP;
          }

          // Boost alpha towards 1.0 during sparkle (keeps star diameter stable, zero balloon pulsing)
          const alphaBoost = (1.0 - star.alpha) * scintEnvelope * star.twinkle.intensity;
          currentAlpha = Math.min(1.0, star.alpha + alphaBoost);

          // Render crisp micro-glint diffraction sparkle at peak brilliance
          if (scintEnvelope > 0.35 && star.twinkle.intensity > 0.25) {
            const glintAlpha = ((scintEnvelope - 0.35) / 0.65) * star.twinkle.intensity;
            const glintLen = (star.size + 2.5) * scintEnvelope;

            ctx.save();
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1.0, glintAlpha * 0.85)})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            // Tiny 4-point celestial micro-glint cross
            ctx.moveTo(x - glintLen, y);
            ctx.lineTo(x + glintLen, y);
            ctx.moveTo(x, y - glintLen);
            ctx.lineTo(x, y + glintLen);
            ctx.stroke();

            // Brilliant white pinpoint core
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, glintAlpha * 0.95)})`;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(0.6, star.size * 0.6), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // Apply flare bloom
      if (activeFlare && activeFlare.starIndex === idx) {
        const p = (nowSec - activeFlare.startTime) / activeFlare.duration;
        const flarePulse = Math.sin(p * Math.PI);
        currentSize = star.size * (1 + (activeFlare.sizeMult - 1) * flarePulse);
        currentAlpha = Math.min(1.0, star.alpha + 0.5 * flarePulse);

        const flareRadius = currentSize * 3.5;
        const flareGrad = ctx.createRadialGradient(x, y, 0, x, y, flareRadius);
        flareGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * flarePulse})`);
        flareGrad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${0.6 * flarePulse})`);
        flareGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = flareGrad;
        ctx.beginPath();
        ctx.arc(x, y, flareRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (star.isOutOfFocus) {
        const totalRadius = currentSize + star.blur;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, totalRadius);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentAlpha * 0.85})`);
        grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${currentAlpha * 0.35})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, totalRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, currentSize, 0, Math.PI * 2);
        ctx.fill();

        if (currentSize > 1.4) {
          const glowRad = currentSize * 2.2;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, glowRad);
          grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentAlpha * 0.4})`);
          grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, glowRad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // Draw meteors
    activeMeteors.forEach(m => {
      const elapsed = nowSec - m.startTime;
      const progress = elapsed / m.duration;
      const dist = elapsed * m.speed;
      const headX = m.x + Math.cos(m.angle) * dist;
      const headY = m.y + Math.sin(m.angle) * dist;
      const tailX = headX - Math.cos(m.angle) * m.length;
      const tailY = headY - Math.sin(m.angle) * m.length;

      const meteorAlpha = progress < 0.2 ? (progress / 0.2) : (1 - (progress - 0.2) / 0.8);

      const mGrad = ctx.createLinearGradient(tailX, tailY, headX, headY);
      mGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      mGrad.addColorStop(0.7, `rgba(200, 230, 255, ${meteorAlpha * 0.5})`);
      mGrad.addColorStop(1, `rgba(255, 255, 255, ${meteorAlpha * 0.95})`);

      ctx.strokeStyle = mGrad;
      ctx.lineWidth = isPhone ? 1.5 : 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 255, 255, ${meteorAlpha})`;
      ctx.beginPath();
      ctx.arc(headX, headY, isPhone ? 1.5 : 2.0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mask out dials and Doppler circles directly on the canvas buffer (ensures shooting stars & stars are 100% masked)
    if (STARFIELD_MASK_DIALS_ENABLED) {
      const dials = getStarfieldMaskDials();
      if (dials.length > 0) {
        const rotAngle = getCanvasRotationAngle(canvas);
        const cos = Math.cos(-rotAngle);
        const sin = Math.sin(-rotAngle);

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';

        for (let i = 0; i < dials.length; i++) {
          const d = dials[i];
          const localX = cx + (d.dx * cos - d.dy * sin);
          const localY = cy + (d.dx * sin + d.dy * cos);

          ctx.beginPath();
          ctx.arc(localX, localY, d.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }

  function starfieldAnimLoop(timestamp) {
    if (!starfieldAnimRunning) return;
    drawStarfield(timestamp);
    starfieldAnimId = requestAnimationFrame(starfieldAnimLoop);
  }

  function startStarfieldAnimation() {
    if (!starfieldAnimRunning) {
      starfieldAnimRunning = true;
      starfieldAnimId = requestAnimationFrame(starfieldAnimLoop);
    }
  }

  function stopStarfieldAnimation() {
    starfieldAnimRunning = false;
    if (starfieldAnimId) {
      cancelAnimationFrame(starfieldAnimId);
      starfieldAnimId = null;
    }
  }

  function calculateStarfieldOpacity(data) {
    const isLiveTest = TEST_SHOW_METEOR_LIVE_PREVIEW || METEOR_SHOWER_TEST_MODE === 'occurring';
    if (STARFIELD_TEST_MODE || forceStars || isLiveTest) {
      return 1.0;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const today = data?.daily?.[0];
    const sunriseSec = today?.sunrise ?? data?.current?.sunrise;
    const sunsetSec = today?.sunset ?? data?.current?.sunset;
    const fadeSec = Math.max(1, STARFIELD_FADE_WINDOW_MINUTES * 60);

    if (typeof sunriseSec !== 'number' || typeof sunsetSec !== 'number') {
      const hr = new Date().getHours();
      return (hr >= 20 || hr < 6) ? 1.0 : 0.0;
    }

    if (nowSec >= sunsetSec + fadeSec) {
      // Full night after dusk -> 1.0
      return 1.0;
    } else if (nowSec >= sunsetSec) {
      // 60 minutes AFTER sunset (dusk) -> fade IN from 0 to 1
      return Math.max(0, Math.min(1, (nowSec - sunsetSec) / fadeSec));
    } else if (nowSec >= sunriseSec) {
      // Full daytime between sunrise and sunset -> 0.0
      return 0.0;
    } else if (nowSec >= sunriseSec - fadeSec) {
      // 60 minutes PRECEDING sunrise (dawn) -> fade OUT from 1 to 0
      return Math.max(0, Math.min(1, (sunriseSec - nowSec) / fadeSec));
    } else {
      // Full night before dawn -> 1.0
      return 1.0;
    }
  }

  function updateStarfieldOpacity(data) {
    const opacity = calculateStarfieldOpacity(data || lastWeatherData);
    document.documentElement.style.setProperty('--starfield-opacity', opacity.toFixed(4));
    if (opacity > 0) {
      startStarfieldAnimation();
    } else {
      stopStarfieldAnimation();
    }
    return opacity;
  }

  function updateStarfieldMask() {
    cachedStarfieldMaskDials = []; // Invalidate canvas dial mask cache
    const starfieldContainer = document.getElementById('starfield-container');
    if (!starfieldContainer) return;

    const isPhone = window.innerWidth < 768;
    const maskStart = isPhone ? STARFIELD_MASK_START_MOBILE : STARFIELD_MASK_START_DESKTOP;
    const maskEnd = isPhone ? STARFIELD_MASK_END_MOBILE : STARFIELD_MASK_END_DESKTOP;

    if (!STARFIELD_MASK_DIALS_ENABLED) {
      starfieldContainer.style.setProperty('-webkit-mask-image', 'none');
      starfieldContainer.style.setProperty('mask-image', 'none');
      document.documentElement.style.setProperty('--starfield-mask-image', 'none');
      return;
    }

    const dialMaskPercent = isPhone ? STARFIELD_DIAL_MASK_PERCENT_MOBILE : STARFIELD_DIAL_MASK_PERCENT_DESKTOP;
    const dopplerMaskPercent = isPhone ? STARFIELD_DOPPLER_MASK_PERCENT_MOBILE : STARFIELD_DOPPLER_MASK_PERCENT_DESKTOP;

    // Container dimensions for SVG mask
    const containerRect = starfieldContainer.getBoundingClientRect();
    const w = Math.round(containerRect.width) || Math.max(document.documentElement.clientWidth, window.innerWidth);
    const h = Math.round(containerRect.height) || Math.max(document.documentElement.clientHeight, window.innerHeight);

    // Collect all active dial elements to mask out
    let selector = '.clockGridItem, #analog-clock';
    if (STARFIELD_MASK_WEATHER_CIRCLES) {
      selector += ', #weather-desc-image, #weather-desc-image-left';
    }

    const elements = document.querySelectorAll(selector);
    const pathParts = [`M 0 0 H ${w} V ${h} H 0 Z`];

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const isDoppler = el.id === 'weather-desc-image' || el.id === 'weather-desc-image-left';
        const maskPct = isDoppler ? dopplerMaskPercent : dialMaskPercent;
        const radius = (rect.width / 2) * (maskPct / 100);
        // Position cutouts relative to starfield container (scroll-invariant)
        const cx = (rect.left + rect.width / 2) - containerRect.left;
        const cy = (rect.top + rect.height / 2) - containerRect.top;
        // SVG circle sub-path using evenodd rule:
        pathParts.push(`M ${(cx - radius).toFixed(1)} ${cy.toFixed(1)} a ${radius.toFixed(1)} ${radius.toFixed(1)} 0 1 0 ${(radius * 2).toFixed(1)} 0 a ${radius.toFixed(1)} ${radius.toFixed(1)} 0 1 0 ${(-radius * 2).toFixed(1)} 0 Z`);
      }
    });

    const fullPathD = pathParts.join(' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<defs>` +
        `<linearGradient id="sf-grad" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="${maskStart}" stop-color="white" stop-opacity="1"/>` +
          `<stop offset="${maskEnd}" stop-color="white" stop-opacity="0"/>` +
        `</linearGradient>` +
      `</defs>` +
      `<path fill="url(#sf-grad)" fill-rule="evenodd" d="${fullPathD}"/>` +
    `</svg>`;

    const maskValue = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    starfieldContainer.style.setProperty('-webkit-mask-image', maskValue);
    starfieldContainer.style.setProperty('mask-image', maskValue);
    document.documentElement.style.setProperty('--starfield-mask-image', maskValue);
  }

  function applyStarfieldProperties() {
    const isPhone = window.innerWidth < 768;
    
    const containerTop = isPhone ? STARFIELD_CONTAINER_TOP_MOBILE : STARFIELD_CONTAINER_TOP_DESKTOP;
    const containerHeight = isPhone ? STARFIELD_CONTAINER_HEIGHT_MOBILE : STARFIELD_CONTAINER_HEIGHT_DESKTOP;
    const zIndex = isPhone ? STARFIELD_Z_INDEX_MOBILE : STARFIELD_Z_INDEX_DESKTOP;
    const topCutoff = isPhone ? STARFIELD_TOP_CUTOFF_MOBILE : STARFIELD_TOP_CUTOFF_DESKTOP;
    const diameter = isPhone ? STARFIELD_CIRCLE_DIAMETER_MOBILE : STARFIELD_CIRCLE_DIAMETER_DESKTOP;
    const manualCenterY = isPhone ? STARFIELD_CENTER_Y_MOBILE : STARFIELD_CENTER_Y_DESKTOP;
    const centerX = isPhone ? STARFIELD_CENTER_X_MOBILE : STARFIELD_CENTER_X_DESKTOP;

    let centerY = manualCenterY;
    if (!centerY) {
      const radiusVal = (parseFloat(diameter) || 100) / 2;
      const cutoffVal = parseFloat(topCutoff) || 0;
      centerY = `${(radiusVal - cutoffVal).toFixed(2)}vw`;
    }

    const rotationSpeed = isPhone ? STARFIELD_ROTATION_SPEED_S_MOBILE : STARFIELD_ROTATION_SPEED_S_DESKTOP;
    const rotationDirection = isPhone ? STARFIELD_ROTATION_DIRECTION_MOBILE : STARFIELD_ROTATION_DIRECTION_DESKTOP;
    const maskStart = isPhone ? STARFIELD_MASK_START_MOBILE : STARFIELD_MASK_START_DESKTOP;
    const maskEnd = isPhone ? STARFIELD_MASK_END_MOBILE : STARFIELD_MASK_END_DESKTOP;
    const dialMaskPercent = isPhone ? STARFIELD_DIAL_MASK_PERCENT_MOBILE : STARFIELD_DIAL_MASK_PERCENT_DESKTOP;
    const dopplerMaskPercent = isPhone ? STARFIELD_DOPPLER_MASK_PERCENT_MOBILE : STARFIELD_DOPPLER_MASK_PERCENT_DESKTOP;

    document.documentElement.style.setProperty('--starfield-container-top', containerTop);
    document.documentElement.style.setProperty('--starfield-container-height', containerHeight);
    document.documentElement.style.setProperty('--starfield-z-index', zIndex);
    document.documentElement.style.setProperty('--starfield-top-cutoff', topCutoff);
    document.documentElement.style.setProperty('--starfield-diameter', diameter);
    document.documentElement.style.setProperty('--starfield-center-y', centerY);
    document.documentElement.style.setProperty('--starfield-center-x', centerX);
    document.documentElement.style.setProperty('--starfield-rotation-speed', `${rotationSpeed}s`);
    document.documentElement.style.setProperty('--starfield-rotation-direction', rotationDirection);
    document.documentElement.style.setProperty('--starfield-mask-start', maskStart);
    document.documentElement.style.setProperty('--starfield-mask-end', maskEnd);
    document.documentElement.style.setProperty('--starfield-color-pct-curr', `${isPhone ? STARFIELD_COLOR_PERCENT_CURRENT_TEMP_MOBILE : STARFIELD_COLOR_PERCENT_CURRENT_TEMP_DESKTOP}%`);
    document.documentElement.style.setProperty('--starfield-color-pct-plus10', `${isPhone ? STARFIELD_COLOR_PERCENT_PLUS10_TEMP_MOBILE : STARFIELD_COLOR_PERCENT_PLUS10_TEMP_DESKTOP}%`);
    document.documentElement.style.setProperty('--starfield-color-pct-minus10', `${isPhone ? STARFIELD_COLOR_PERCENT_MINUS10_TEMP_MOBILE : STARFIELD_COLOR_PERCENT_MINUS10_TEMP_DESKTOP}%`);
    document.documentElement.style.setProperty('--starfield-dial-mask-pct', `${dialMaskPercent}%`);
    document.documentElement.style.setProperty('--starfield-doppler-mask-pct', `${dopplerMaskPercent}%`);
    document.documentElement.style.setProperty('--starfield-twinkle-commonness', isPhone ? `${STARFIELD_TWINKLE_COMMONNESS_MOBILE}` : `${STARFIELD_TWINKLE_COMMONNESS_DESKTOP}`);
    document.documentElement.style.setProperty('--starfield-twinkle-randomness', isPhone ? `${STARFIELD_TWINKLE_RANDOMNESS_MOBILE}` : `${STARFIELD_TWINKLE_RANDOMNESS_DESKTOP}`);
    document.documentElement.style.setProperty('--starfield-twinkle-duration', isPhone ? `${STARFIELD_TWINKLE_DURATION_S_MOBILE}s` : `${STARFIELD_TWINKLE_DURATION_S_DESKTOP}s`);
    document.documentElement.style.setProperty('--starfield-twinkle-intensity', isPhone ? `${STARFIELD_TWINKLE_INTENSITY_MOBILE}` : `${STARFIELD_TWINKLE_INTENSITY_DESKTOP}`);
    document.documentElement.style.setProperty('--meteor-shower-banner-color', isPhone ? METEOR_SHOWER_BANNER_COLOR_MOBILE : METEOR_SHOWER_BANNER_COLOR_DESKTOP);

    updateStarfieldOpacity(lastWeatherData);
    drawStarfield();
    updateStarfieldMask();

    // Directly bind and synchronize the CSS animation on the canvas element (iPad/Safari optimization)
    const canvas = document.getElementById('starfield-canvas');
    if (canvas) {
      canvas.style.animation = 'none';
      void canvas.offsetWidth; // Force WebKit reflow to guarantee animation starts cleanly
      canvas.style.setProperty('animation', `starfield-rotate ${rotationSpeed}s linear infinite`, 'important');
      canvas.style.setProperty('animation-direction', rotationDirection, 'important');
      canvas.style.setProperty('transform-origin', '50% 50%', 'important');
    }
  }

  function initStarfield() {
    // Inject bulletproof @keyframes to prevent minifiers from stripping angle units
    if (!document.getElementById('starfield-style')) {
      const style = document.createElement('style');
      style.id = 'starfield-style';
      style.textContent = `
        @keyframes starfield-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `;
      document.head.appendChild(style);
    }

    let container = document.getElementById('starfield-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'starfield-container';
      const circle = document.createElement('div');
      circle.id = 'starfield-circle';
      const canvas = document.createElement('canvas');
      canvas.id = 'starfield-canvas';
      circle.appendChild(canvas);
      container.appendChild(circle);

      const fixedBg = document.getElementById('fixed-bg');
      if (fixedBg && fixedBg.parentNode) {
        fixedBg.parentNode.insertBefore(container, fixedBg.nextSibling);
      } else {
        document.body.insertBefore(container, document.body.firstChild);
      }
    }

    applyStarfieldProperties();
    setTimeout(updateStarfieldMask, 150);
    setTimeout(updateStarfieldMask, 600);
    setTimeout(updateStarfieldMask, 1500);
  }

  // Window event handlers for starfield
  window.addEventListener('resize', applyStarfieldProperties);
  // Note: Starfield container is position: absolute and scrolls naturally on GPU compositor matching scrolling gradient overlays

  // Periodic check (every 60s) to advance day/night opacity transition
  setInterval(() => {
    updateStarfieldOpacity(lastWeatherData);
  }, 60000);

  // Expose Starfield helpers to window.Weather for manual console testing
  if (!window.Weather) window.Weather = {};
  window.Weather.setStarfieldTestMode = (enabled) => {
    STARFIELD_TEST_MODE = !!enabled;
    const op = updateStarfieldOpacity(lastWeatherData);
    console.log(`✨ Starfield test mode set to: ${STARFIELD_TEST_MODE}, opacity: ${op}`);
  };
  window.Weather.regenerateStarfield = () => {
    generateStarFieldData();
    drawStarfield();
    console.log(`✨ Starfield regenerated with ${starFieldStars ? starFieldStars.length : 0} stars`);
  };
  window.Weather.getStars = () => starFieldStars;
  window.Weather.updateStarfieldMask = updateStarfieldMask;
  window.Weather.setStarfieldMaskDials = (enabled) => {
    STARFIELD_MASK_DIALS_ENABLED = !!enabled;
    updateStarfieldMask();
    console.log(`✨ Starfield dial mask enabled: ${STARFIELD_MASK_DIALS_ENABLED}`);
  };
  window.Weather.setStarfieldTwinkle = (enabled) => {
    STARFIELD_TWINKLE_ENABLED = !!enabled;
    console.log(`✨ Starfield twinkling set to: ${STARFIELD_TWINKLE_ENABLED}`);
  };
  window.Weather.setStarfieldTwinkleConfig = ({ commonness, randomness, intensity, duration } = {}) => {
    if (commonness !== undefined) {
      window.STARFIELD_TWINKLE_COMMONNESS_OVERRIDE = commonness;
      console.log(`✨ Starfield twinkle commonness set to: ${commonness}`);
    }
    if (randomness !== undefined) {
      window.STARFIELD_TWINKLE_RANDOMNESS_OVERRIDE = randomness;
      console.log(`✨ Starfield twinkle randomness set to: ${randomness}`);
    }
  };
  window.Weather.triggerTwinkle = () => {
    if (starFieldStars && starFieldStars.length > 0) {
      const isPhone = window.innerWidth < 768;
      const starIdx = Math.floor(Math.random() * starFieldStars.length);
      const dur = isPhone ? STARFIELD_TWINKLE_DURATION_S_MOBILE : STARFIELD_TWINKLE_DURATION_S_DESKTOP;
      const intensity = isPhone ? STARFIELD_TWINKLE_INTENSITY_MOBILE : STARFIELD_TWINKLE_INTENSITY_DESKTOP;
      starFieldStars[starIdx].twinkle = {
        startTime: performance.now() / 1000,
        duration: dur,
        intensity: intensity,
        phase: Math.random() * Math.PI * 2
      };
      console.log(`✨ Triggered single sparkle on star #${starIdx}`);
    }
  };
  window.Weather.setStarfieldFlares = (enabled) => {
    STARFIELD_FLARE_ENABLED = !!enabled;
    console.log(`✨ Starfield flares set to: ${STARFIELD_FLARE_ENABLED}`);
  };
  window.Weather.setStarfieldMeteors = (enabled) => {
    STARFIELD_METEOR_ENABLED = !!enabled;
    console.log(`✨ Starfield meteors set to: ${STARFIELD_METEOR_ENABLED}`);
  };
  window.Weather.setMeteorShowerTest = (mode) => {
    METEOR_SHOWER_TEST_MODE = mode; // null, 'coming', or 'occurring'
    if (lastWeatherData) {
      updateAlerts(lastWeatherData);
      updateStarfieldOpacity(lastWeatherData);
    }
    console.log(`🌠 Meteor shower test mode set to: ${METEOR_SHOWER_TEST_MODE}`);
  };
  window.Weather.testMeteorCountdown = (enabled = true) => {
    TEST_SHOW_METEOR_COUNTDOWN_PREVIEW = !!enabled;
    if (enabled) TEST_SHOW_METEOR_LIVE_PREVIEW = false;
    if (lastWeatherData) {
      updateAlerts(lastWeatherData);
      updateStarfieldOpacity(lastWeatherData);
    }
    console.log(`🌠 Meteor countdown test preview: ${TEST_SHOW_METEOR_COUNTDOWN_PREVIEW}`);
  };
  window.Weather.testMeteorLive = (enabled = true) => {
    TEST_SHOW_METEOR_LIVE_PREVIEW = !!enabled;
    if (enabled) TEST_SHOW_METEOR_COUNTDOWN_PREVIEW = false;
    if (lastWeatherData) {
      updateAlerts(lastWeatherData);
      updateStarfieldOpacity(lastWeatherData);
    }
    console.log(`🌠 Meteor live event test preview: ${TEST_SHOW_METEOR_LIVE_PREVIEW}`);
  };
  window.Weather.clearMeteorTests = () => {
    TEST_SHOW_METEOR_COUNTDOWN_PREVIEW = false;
    TEST_SHOW_METEOR_LIVE_PREVIEW = false;
    METEOR_SHOWER_TEST_MODE = null;
    setMeteorShowerOccurring(false);
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {}
    if (lastWeatherData) {
      updateAlerts(lastWeatherData);
      updateStarfieldOpacity(lastWeatherData);
    }
    console.log('🌠 All meteor test modes turned OFF.');
  };
  window.Weather.getMeteorShowerStatus = () => ({
    isOccurring: isMeteorShowerOccurring,
    testMode: METEOR_SHOWER_TEST_MODE,
    conditions: typeof checkMeteorShowerConditions === 'function' ? checkMeteorShowerConditions(lastWeatherData) : null
  });
  window.Weather.triggerFlare = () => {
    if (starFieldStars && starFieldStars.length > 0) {
      const isPhone = window.innerWidth < 768;
      const starIdx = Math.floor(Math.random() * starFieldStars.length);
      activeFlare = {
        starIndex: starIdx,
        startTime: performance.now() / 1000,
        duration: isPhone ? STARFIELD_FLARE_DURATION_S_MOBILE : STARFIELD_FLARE_DURATION_S_DESKTOP,
        sizeMult: isPhone ? STARFIELD_FLARE_SIZE_MULT_MOBILE : STARFIELD_FLARE_SIZE_MULT_DESKTOP
      };
      console.log(`✨ Triggered star flare on star #${starIdx}`);
    }
  };
  window.Weather.triggerMeteor = () => {
    const isPhone = window.innerWidth < 768;
    const canvas = document.getElementById('starfield-canvas');
    const nowSec = performance.now() / 1000;
    activeMeteors.push(createMeteor(canvas, isPhone, nowSec, 0.8));
    console.log('✨ Triggered shooting star (downward)');
  };

  // EDITABLE: Wind speed text Y-offset adjustment
  const WIND_NUMBER_Y_OFFSET_DESKTOP = '-1vw'; // EDITABLE: Desktop vertical position of main wind number (negative moves UP)
  const WIND_NUMBER_Y_OFFSET_MOBILE = '-2vw';    // EDITABLE: Mobile vertical position of main wind number (negative moves UP)
  
  document.documentElement.style.setProperty('--wind-number-y-offset-desktop', WIND_NUMBER_Y_OFFSET_DESKTOP);
  document.documentElement.style.setProperty('--wind-number-y-offset-mobile', WIND_NUMBER_Y_OFFSET_MOBILE);

  // EDITABLE: High wind speed text size formatting
  const WIND_SPEED_HIGH_THRESHOLD_MPH = 25; // EDITABLE: Wind speed threshold (in mph) where text gets enlarged
  const WIND_SPEED_HIGH_MULTIPLIER = .55; // EDITABLE: Font size multiplier (relative to dial size) when threshold is exceeded
  
  document.documentElement.style.setProperty('--wind-speed-high-multiplier', WIND_SPEED_HIGH_MULTIPLIER);

  // EDITABLE: Rain forecast banner configuration
  const RAIN_BANNER_HEIGHT_VW = 10; // Height of the rain banner (same as alert banners)
  const RAIN_BANNER_BLUE = 'hsl(205, 100%, 27%)'; // Same blue as rain inches row
  const RAIN_BANNER_FONT_SIZE_HOUR = '2.6vw'; // Font size for hour text (line 1)
  const RAIN_BANNER_FONT_SIZE_PERCENT = '4vw'; // Font size for percent text (line 2)
  const RAIN_BANNER_MIN_OPACITY = 0.3; // Minimum opacity for cells with rain
  const RAIN_BANNER_MAX_OPACITY = 0.95; // Maximum opacity for cells with rain

  // EDITABLE: Minimum height for the 8-day forecast temperature bars
  const MIN_TEMP_BAR_HEIGHT_VW = 6.5; // The height for the lowest temp of the week
  const DAY_LETTER_FONT_SIZE = 'inherit'; // EDITABLE: Size of the day letters (S, M, T...) under the bars. Try '4.5vw'!

  // EDITABLE: Hourly forecast time labels (JCV)
  const HOURLY_LABEL_FONT_SIZE_DESKTOP = '2.25vw';   // EDITABLE Desktop: Time label font size
  const HOURLY_LABEL_FONT_SIZE_MOBILE = '2.75vw';    // EDITABLE Mobile: Time label font size
  const HOURLY_LABEL_FONT_SIZE = HOURLY_LABEL_FONT_SIZE_DESKTOP; // Fallback alias
  const HOURLY_LABEL_SPACE_ABOVE_DESKTOP = '0.5vw'; // EDITABLE Desktop: Space between sky images and labels
  const HOURLY_LABEL_SPACE_ABOVE_MOBILE = '0.5vw';  // EDITABLE Mobile: Space between sky images and labels
  const HOURLY_LABEL_COLOR = '#ffffff';             // Enforce pure white

  document.documentElement.style.setProperty('--hourly-label-font-size-desktop', HOURLY_LABEL_FONT_SIZE_DESKTOP);
  document.documentElement.style.setProperty('--hourly-label-font-size-mobile', HOURLY_LABEL_FONT_SIZE_MOBILE);
  document.documentElement.style.setProperty('--hourly-label-space-above-desktop', HOURLY_LABEL_SPACE_ABOVE_DESKTOP);
  document.documentElement.style.setProperty('--hourly-label-space-above-mobile', HOURLY_LABEL_SPACE_ABOVE_MOBILE);

  // EDITABLE: Hourly forecast section margins
  const HOURLY_MARGIN_TOP = '4vw';    // Gap above the entire 24-hour forecast row (after the daily rows)
  const HOURLY_MARGIN_BOTTOM = '5vw';  // Gap below the 24-hour forecast row

  // EDITABLE: Hourly forecast temperature bars
  const HOURLY_TEMP_FONT_SIZE = '3vw'; // EDITABLE: Set to 3vw to perfectly match F&C dual mode
  const HOURLY_TEMP_COLOR = 'var(--theBrown)'; // Color of the temperature number inside the bar
  const HOURLY_BAR_BORDER_RADIUS = '.5vw 0.5vw 0.5 0.5'; // EDITABLE: Temp bars rounded corners
  const HOURLY_IMAGE_BORDER_RADIUS = '0.5vw';         // EDITABLE: Weather images rounded corners
  document.documentElement.style.setProperty('--hourly-image-border-radius', HOURLY_IMAGE_BORDER_RADIUS);
  const HOURLY_MIN_HEIGHT_VW = 5.5; // EDITABLE: Minimum height for single-temperature 24-hour bars

  // EDITABLE: F&C Dual Temp mode strictly for 24-hour bars
  const DUAL_HOURLY_FONT_SIZE = '3vw';     // EDITABLE: Size of the stacked numbers (Matches single temp size)
  const DUAL_HOURLY_LINE_HEIGHT = '.8';       // Internal line height
  const DUAL_HOURLY_ROW_GAP = '0.2vw';       // Space directly between the F and C rows
  const DUAL_HOURLY_MIN_HEIGHT_VW = 8.25;     // Height needed to safely hold two rows
  const DUAL_HOURLY_TOP_OFFSET = '0vw';      // Nudge the whole text block up or down
  const DUAL_HOURLY_LEFT_OFFSET = '-0.15vw'; // Nudges text left to perfectly counter the bar's default padding

  // EDITABLE: Hourly Rain
  const TEST_HOURLY_RAIN = false; // STAGE 1: Set to true to see fake passing storm. Set to false for live OpenWeather data.
  const HOURLY_RAIN_FONT_SIZE = '1.72vw'; // Size of the inches text (Matches hourly temperature bar size)

  // EDITABLE: Great Weather Advisory Criteria (Personal Ideal: Cloud Shade required, 68-80°F)
  const GREAT_WEATHER_TEMP_MIN = 68;
  const GREAT_WEATHER_TEMP_MAX = 80;
  const GREAT_WEATHER_HUMIDITY_MAX = 65;
  const GREAT_WEATHER_WIND_MAX = 20;

  // EDITABLE: Nice Weather Advisory Criteria (Broader: Clear skies allowed, 60-85°F)
  const NICE_WEATHER_TEMP_MIN = 60;
  const NICE_WEATHER_TEMP_MAX = 85;
  const NICE_WEATHER_HUMIDITY_MAX = 75;
  const NICE_WEATHER_WIND_MAX = 25;

  const GREAT_WEATHER_DAYLIGHT_BUFFER_HOURS = 1; // EDITABLE: Additional hours before sunrise & after sunset to consider "daylight"

  // EDITABLE: Temperature Change Advisory Criteria
  const TEMP_CHANGE_ADVISORY_THRESHOLD = 15; // EDITABLE: Temperature difference threshold (15°F+) between today and tomorrow

  // EDITABLE: Alert Banner Colors
  // Maps specific alert keywords to their background colors.
  const ALERT_MODAL_LINE_HEIGHT = '3.025vw'; // EDITABLE: Line spacing INSIDE the modal paragraphs
  const ALERT_MODAL_TITLE_LINE_HEIGHT = '.95'; // EDITABLE: Line spacing for the uppercase TITLE inside the modal
  const ALERT_MODAL_BODY_TOP_MARGIN = '3.0vw'; // EDITABLE: Additional linespace above body copy of alert/warning
  const ALERT_DROP_ICON_TRANSFORM = 'scaleY(-1)'; // EDITABLE: Vertical reversal transform to indicate downward temperature drop
  const ALERT_BANNER_LINE_HEIGHT = '1.1'; // EDITABLE: Line height for banner text to ensure vertical centering

  // --- EDITABLE: Temperature Advisory Vertical Centering (JCV) ---
  // Fine vertical nudge for type (text) and symbol (icon) (+ moves DOWN, - moves UP)
  const ALERT_TEMP_DROP_TYPE_Y_OFFSET_DESKTOP = '0.3vw';  // EDITABLE Desktop: Vertical nudge for Temperature Drop text
  const ALERT_TEMP_DROP_TYPE_Y_OFFSET_MOBILE = '0.3vw';   // EDITABLE Mobile: Vertical nudge for Temperature Drop text
  const ALERT_TEMP_DROP_ICON_Y_OFFSET_DESKTOP = '0.4vw';  // EDITABLE Desktop: Vertical nudge for Temperature Drop icon
  const ALERT_TEMP_DROP_ICON_Y_OFFSET_MOBILE = '0.4vw';   // EDITABLE Mobile: Vertical nudge for Temperature Drop icon

  const ALERT_TEMP_RISE_TYPE_Y_OFFSET_DESKTOP = '0.3vw';  // EDITABLE Desktop: Vertical nudge for Temperature Rise text
  const ALERT_TEMP_RISE_TYPE_Y_OFFSET_MOBILE = '0.3vw';   // EDITABLE Mobile: Vertical nudge for Temperature Rise text
  const ALERT_TEMP_RISE_ICON_Y_OFFSET_DESKTOP = '-0.15vw'; // EDITABLE Desktop: Vertical nudge for Temperature Rise icon
  const ALERT_TEMP_RISE_ICON_Y_OFFSET_MOBILE = '-0.15vw';  // EDITABLE Mobile: Vertical nudge for Temperature Rise icon

  document.documentElement.style.setProperty('--alert-banner-line-height', ALERT_BANNER_LINE_HEIGHT);

  document.documentElement.style.setProperty('--alert-temp-drop-type-y-offset-desktop', ALERT_TEMP_DROP_TYPE_Y_OFFSET_DESKTOP);
  document.documentElement.style.setProperty('--alert-temp-drop-type-y-offset-mobile', ALERT_TEMP_DROP_TYPE_Y_OFFSET_MOBILE);
  document.documentElement.style.setProperty('--alert-temp-drop-icon-y-offset-desktop', ALERT_TEMP_DROP_ICON_Y_OFFSET_DESKTOP);
  document.documentElement.style.setProperty('--alert-temp-drop-icon-y-offset-mobile', ALERT_TEMP_DROP_ICON_Y_OFFSET_MOBILE);

  document.documentElement.style.setProperty('--alert-temp-rise-type-y-offset-desktop', ALERT_TEMP_RISE_TYPE_Y_OFFSET_DESKTOP);
  document.documentElement.style.setProperty('--alert-temp-rise-type-y-offset-mobile', ALERT_TEMP_RISE_TYPE_Y_OFFSET_MOBILE);
  document.documentElement.style.setProperty('--alert-temp-rise-icon-y-offset-desktop', ALERT_TEMP_RISE_ICON_Y_OFFSET_DESKTOP);
  document.documentElement.style.setProperty('--alert-temp-rise-icon-y-offset-mobile', ALERT_TEMP_RISE_ICON_Y_OFFSET_MOBILE);

  const ALERT_COLORS = {
    "DEFAULT": "rgba(0,0,0, 0.75)", // Default translucent red for anything else
    "GREAT WEATHER ADVISORY": "rgba(110, 170, 35, 0.88)", // Vibrant yellow-green
    "NICE WEATHER ADVISORY": "rgba(46, 204, 113, 0.75)", // Cool emerald green
    "TEMPERATURE DROP & RISE ADVISORY": "rgba(142, 68, 173, 0.85)", // Purple/Indigo
    "TEMPERATURE DROP/RISE ADVISORY": "rgba(142, 68, 173, 0.85)", // Purple/Indigo
    "TEMPERATURE DROP ADVISORY": "rgba(41, 128, 185, 0.85)", // Cool blue
    "TEMPERATURE RISE ADVISORY": "rgba(230, 126, 34, 0.85)", // Warm orange
    "DENSE FOG ADVISORY": "rgba(128, 128, 128, 0.85)", // Gray
    "EXTREME HEAT WARNING": "hsl(0, 90%, 35%)", 
    "EXTREME HEAT WATCH": "hsl(0, 90%, 25%)", 
    "FLOOD ADVISORY": "hsl(195, 90%, 45%)", // Bright blue-purple
    "FLOOD WATCH": "hsl(195, 90%, 65%)", // Bright blue-purple
    "HEAT ADVISORY": "rgba(250, 38, 38, 0.85)", // Standard red
    "SEVERE THUNDERSTORM WARNING": "rgba(220, 38, 38, 0.85)", // Standard red
    "SEVERE THUNDERSTORM WATCH": "hsl(280, 90%, 50%)", // Bright blue-purple
    "SPECIAL WEATHER STATEMENT": "rgba(100, 130, 160, 0.85)", // Steel blue/gray
    "TORNADO WARNING": "hsl(0, 90%, 35%)", // Dark red
    "TORNADO WATCH": "hsl(0,   90%, 55%)", // Orange
    "WIND ADVISORY": "hsl(220, 90%, 35%)", // Bright blue-purple
    "SPRING STARTS": "var(--spring-starts-color)",
    "SUMMER STARTS": "var(--summer-starts-color)",
    "FALL STARTS": "var(--fall-starts-color)",
    "WINTER STARTS": "var(--winter-starts-color)",
    "METEOR SHOWER": "var(--meteor-shower-banner-color)",
  };

  // EDITABLE: Alert Banner Icons
  // Maps specific alert keywords to their SVG icons.
  const ALERT_ICONS = {
    "DEFAULT": "img/default-wat.svg",
    "GREAT WEATHER ADVISORY": "img/sun-wat.svg",
    "NICE WEATHER ADVISORY": "img/sun-wat.svg",
    "TEMPERATURE DROP & RISE ADVISORY": "img/heat-wat.svg",
    "TEMPERATURE DROP/RISE ADVISORY": "img/heat-wat.svg",
    "TEMPERATURE DROP ADVISORY": "img/heat-wat.svg",
    "TEMPERATURE RISE ADVISORY": "img/heat-wat.svg",
    "DENSE FOG ADVISORY": "img/fog-wat.svg",
    "EXTREME HEAT WARNING": "img/heat-wat.svg",
    "EXTREME HEAT WATCH": "img/heat-wat.svg",
    "FLOOD ADVISORY": "img/flood-wat.svg",
    "FLOOD WATCH": "img/flood-wat.svg",
    "HEAT ADVISORY": "img/heat-wat.svg",
    "SEVERE THUNDERSTORM WARNING": "img/thun-wat.svg",
    "SEVERE THUNDERSTORM WATCH": "img/thun-wat.svg",
    "SPECIAL WEATHER STATEMENT": "img/thun-wat.svg",
    "TORNADO WARNING": "img/thun-wat.svg",
    "TORNADO WATCH": "img/thun-wat.svg",
    "WIND ADVISORY": "img/wind-wat.svg",
    "SPRING STARTS": SPRING_STARTS_ICON,
    "SUMMER STARTS": SUMMER_STARTS_ICON,
    "FALL STARTS": FALL_STARTS_ICON,
    "WINTER STARTS": WINTER_STARTS_ICON,
    "METEOR SHOWER": METEOR_SHOWER_BANNER_ICON,
  };

  // Dynamic temperature range based on actual week's data
  let tempRangeMin = 1;  // Will be updated to (lowest low + 5°)
  let tempRangeMax = 100; // Will be updated to highest high

  // Simple, declarative field config — add new metrics here
  const FIELDS = [
    {
      name: 'high',
      selector: '.weather__high',
      compute: (data) => {
        const next24 = (data.hourly || []).slice(1, 25);
        const temps = next24.map(h => h.temp).filter(v => typeof v === 'number');
        return temps.length ? Math.max(...temps) : null;
      },
      format: v => {
        const f = Math.round(v);
        const c = Math.round((f - 32) * 5 / 9);
        return displayUnit === 'BOTH' 
          ? `<span class="fc-mode-text">${f}${formatSlash()}${c}hi</span>`
          : `<span class="fc-mode-text">${displayUnit === 'C' ? c : f}hi</span>`;
      },
      placeholder: '--°H'
    },
    {
      name: 'current',
      selector: '.weather__temp',
      compute: data => (typeof data.current?.temp === 'number' ? data.current.temp : null),
      format: v => {
        const f = Math.round(v);
        const c = Math.round((f - 32) * 5 / 9);
        return displayUnit === 'BOTH' 
          ? `<span class="fc-mode-text">${f}${formatSlash()}${c}</span>`
          : `<span class="fc-mode-text">${displayUnit === 'C' ? c : f}${displayUnit === 'C' ? 'C' : 'F'}</span>`;
      },
      placeholder: '--°F'
    },
    {
      name: 'low',
      selector: '.weather__low',
      compute: (data) => {
        // Get today's actual low from daily forecast
        const todayLow = data.daily?.[0]?.temp?.min;
        return typeof todayLow === 'number' ? todayLow : null;
      },
      format: v => {
        const f = Math.round(v);
        const c = Math.round((f - 32) * 5 / 9);
        return displayUnit === 'BOTH'
          ? `<span class="fc-mode-text">${f}${formatSlash()}${c}lo</span>`
          : `<span class="fc-mode-text">${displayUnit === 'C' ? c : f}lo</span>`;
      },
      placeholder: '--°lo'
    }
  ];

  function getUrl() {
    // include daily so we can show next-10-days highs
    return `https://api.openweathermap.org/data/3.0/onecall?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=imperial`;
  }

  function setPlaceholders() {
    FIELDS.forEach(f => {
      const el = document.querySelector(f.selector);
      if (el) el.textContent = f.placeholder;
    });

    // Scrub any hardcoded placeholder temperatures (like 69° and 76°) from the HTML immediately
    document.querySelectorAll('.hiItem, .loItem').forEach(item => {
      item.innerHTML = '';
    });
  }

  // Calculate dynamic temperature range from weekly forecast data
  function updateTempRange(data) {
    const dailyData = data.daily || [];
    if (!dailyData.length) return;

    let minTemp = Infinity;
    let maxTemp = -Infinity;

    dailyData.forEach(day => {
      if (day.temp) {
        if (typeof day.temp.min === 'number') minTemp = Math.min(minTemp, day.temp.min);
        if (typeof day.temp.max === 'number') maxTemp = Math.max(maxTemp, day.temp.max);
      }
    });

    if (minTemp !== Infinity && maxTemp !== -Infinity) {
      tempRangeMin = Math.round(minTemp); // Exactly the lowest low of the week
      tempRangeMax = Math.round(maxTemp);
      /* eslint-disable */console.log(...oo_oo(`2266558813_861_6_861_105_4`,`Dynamic temp range updated: ${tempRangeMin}°F - ${tempRangeMax}°F (from weekly data)`));
    }
  }

  function updateGradientOverlay(data) {
    const dailyData = (data.daily || []).slice(0, 8); // Need up to 8 days
    if (!dailyData.length) return;

    const colorStats = {};

    dailyData.forEach(day => {
      const maxTemp = day.temp?.max;
      if (typeof maxTemp === 'number') {
        const roundedTemp = Math.round(maxTemp);
        const color = tempToColor(maxTemp);
        if (color) {
          if (!colorStats[color]) {
            colorStats[color] = { count: 0, highestTemp: -Infinity };
          }
          colorStats[color].count++;
          if (roundedTemp > colorStats[color].highestTemp) {
            colorStats[color].highestTemp = roundedTemp;
          }
        }
      }
    });

    let popularColor = null;
    let maxCount = -1;
    let tieBreakerTemp = -Infinity;

    Object.keys(colorStats).forEach(color => {
      const stats = colorStats[color];
      if (stats.count > maxCount) {
        maxCount = stats.count;
        popularColor = color;
        tieBreakerTemp = stats.highestTemp;
      } else if (stats.count === maxCount) {
        // Tie breaker: higher numbered color (higher temperature)
        if (stats.highestTemp > tieBreakerTemp) {
          popularColor = color;
          tieBreakerTemp = stats.highestTemp;
        }
      }
    });

    if (popularColor) {
      const transparentColor = popularColor.replace('hsl(', 'hsla(').replace(')', ', 0)');
      
      const isPhone = window.innerWidth < 768;
      const config = isPhone ? GRADIENT_PHONE : GRADIENT_NON_PHONE;
      const overlayMidOpacity = config.midOpacity;
      const midpointColor = popularColor.replace('hsl(', 'hsla(').replace(')', `, ${overlayMidOpacity})`);
      const midpointPercent = config.midpoint;

      const overlay = document.querySelector('.scrolling-gradient-overlay');
      if (overlay) {
        // Create 3-color gradient: 0% opacity at top, configured setup at midpoint, 0% opacity at bottom
        document.documentElement.style.setProperty('--gradient-overlay-color', popularColor);
        document.documentElement.style.setProperty('--gradient-overlay-transparent', transparentColor);
        overlay.style.backgroundImage = `linear-gradient(to bottom, ${transparentColor} 0%, ${midpointColor} ${midpointPercent}, ${transparentColor} 100%)`;
      }
    }
  }

  function updateHourlyGradientOverlay(data) {
    const hourlyData = (data.hourly || []).slice(0, 24); // Need up to 24 hours
    if (!hourlyData.length) return;

    const colorStats = {};

    hourlyData.forEach(hour => {
      const temp = hour.temp;
      if (typeof temp === 'number') {
        const roundedTemp = Math.round(temp);
        const color = tempToColor(temp);
        if (color) {
          if (!colorStats[color]) {
            colorStats[color] = { count: 0, highestTemp: -Infinity };
          }
          colorStats[color].count++;
          if (roundedTemp > colorStats[color].highestTemp) {
            colorStats[color].highestTemp = roundedTemp;
          }
        }
      }
    });

    let popularColor = null;
    let maxCount = -1;
    let tieBreakerTemp = -Infinity;

    Object.keys(colorStats).forEach(color => {
      const stats = colorStats[color];
      if (stats.count > maxCount) {
        maxCount = stats.count;
        popularColor = color;
        tieBreakerTemp = stats.highestTemp;
      } else if (stats.count === maxCount) {
        // Tie breaker: higher numbered color (higher temperature)
        if (stats.highestTemp > tieBreakerTemp) {
          popularColor = color;
          tieBreakerTemp = stats.highestTemp;
        }
      }
    });

    if (popularColor) {
      const transparentColor = popularColor.replace('hsl(', 'hsla(').replace(')', ', 0)');
      
      const isPhone = window.innerWidth < 768;
      const config = isPhone ? GRADIENT_PHONE : GRADIENT_NON_PHONE;
      const overlayMidOpacity = config.lowerMidOpacity;
      const midpointColor = popularColor.replace('hsl(', 'hsla(').replace(')', `, ${overlayMidOpacity})`);
      const midpointPercent = config.lowerMidpoint;

      const overlay = document.querySelector('.scrolling-gradient-overlay-lower');
      if (overlay) {
        // Create 3-color gradient: 0% opacity at top, configured setup at midpoint, 0% opacity at bottom
        document.documentElement.style.setProperty('--gradient-overlay-lower-color', popularColor);
        document.documentElement.style.setProperty('--gradient-overlay-lower-transparent', transparentColor);
        overlay.style.backgroundImage = `linear-gradient(to bottom, ${transparentColor} 0%, ${midpointColor} ${midpointPercent}, ${transparentColor} 100%)`;
      }
    }
  }

  function setLoading(isLoading) {
    // simple visual cue — add/remove .loading on body (you can style it in CSS)
    document.body.classList.toggle('weather-loading', !!isLoading);
  }

  // color mapping: temperature (dynamic range) -> HSL color using customizable stops
  // Uses dynamic range based on actual weekly forecast data
  // (e.g., 30°F is vivid purple-blue; below 30 gets progressively darker)
  // Easily editable list of colors per 10° range
  // Note: MUST use hsl(H, S%, L%) format for compatibility with background animations
  const TEMP_COLORS = [
    { max: -10, color: 'hsl(0, 100%, 37%)' },   // Below -10: deep red
    { max: 0,   color: 'hsl(320, 90%, 45%)' },   // Below 0: red-purple
    { max: 10,  color: 'hsl(280, 90%, 50%)' },   // 0s: purple
    { max: 20,  color: 'hsl(260, 90%, 60%)' },   // 10s: blue purple
    { max: 30,  color: 'hsl(220, 90%, 55%)' },   // 20s: blue
    { max: 40,  color: 'hsl(195, 90%, 45%)' },   // 30s: cyan
    { max: 50,  color: 'hsl(165, 90%, 40%)' },   // 40s: aqua
    { max: 60,  color: 'hsl(120, 80%, 35%)' },   // 50s: green
    { max: 70,  color: 'hsl(80,  90%, 40%)' },   // 60s: yellow-green
    { max: 80,  color: 'hsl(45,  100%, 50%)' },  // 70s: yellow-gold
    { max: 90,  color: 'hsl(30,  100%, 50%)' },  // 80s: orange
    { max: 100, color: 'hsl(0,   90%, 55%)' },   // 90s: tomato red
    { max: 110, color: 'hsl(0, 100%, 37%)' },   // 100s: red
    { max: 120, color: 'hsl(0, 100%, 22%)' },   // 110s: brown
    { max: Infinity, color: 'hsl(0, 0%, 0%)' }   // 120+: black
  ];








  function tempToColor(temp) {
    if (typeof temp !== 'number' || Number.isNaN(temp)) return null;
    
    // Round the temperature first so the color exactly matches the displayed integer
    const roundedTemp = Math.round(temp);
    const bucket = TEMP_COLORS.find(b => roundedTemp < b.max);
    return bucket ? bucket.color : TEMP_COLORS[TEMP_COLORS.length - 1].color;
  }

  function applyColor(el, temp, isCurrentTemp = false) {
    if (!el) return;
    const color = tempToColor(temp);
    if (color) {
      el.style.setProperty('--temp-color', color);
      el.style.color = color;
      // Only set on document root for current temperature (not high/low)
      if (isCurrentTemp) {
        document.documentElement.style.setProperty('--temp-color', color);
        if (typeof updateVersionDisplay === 'function') {
          updateVersionDisplay(temp);
        }
      }
    } else {
      el.style.removeProperty('--temp-color');
      el.style.removeProperty('color');
    }
  }








  // EDITABLE: Moon Phase Window Thresholds (OpenWeather 0.0 to 1.0 scale)
  // In the 29.53-day lunar cycle, each day is ~0.034.
  // 0.05 creates a ~3-day window (~1.5 days on either side: day before, day of, and day after).
  const NEW_MOON_THRESHOLD = 0.05;   // EDITABLE: Day on either side of New Moon (3-day window: [0.95, 1.0] and [0.0, 0.05])
  const FULL_MOON_THRESHOLD = 0.05;  // EDITABLE: Day on either side of Full Moon (3-day window: [0.45, 0.55])

  function getMoonPhaseName(phase) {
    if (typeof phase !== 'number') return '';
    // Based on standard OpenWeather API moon_phase values (0..1)
    // Primary phases use a range so that "Full Moon", "New Moon", etc. cover full calendar days
    // 3-day window: day before, day of, and day after New Moon (matching Full Moon's 3-day window)
    if (phase <= NEW_MOON_THRESHOLD || phase >= (1 - NEW_MOON_THRESHOLD)) return 'New Moon';
    if (phase > NEW_MOON_THRESHOLD && phase < 0.21) return 'Waxing Crescent';
    if (phase >= 0.21 && phase <= 0.29) return 'First Quarter';
    if (phase > 0.29 && phase < (0.5 - FULL_MOON_THRESHOLD)) return 'Waxing Gibbous';
    if (phase >= (0.5 - FULL_MOON_THRESHOLD) && phase <= (0.5 + FULL_MOON_THRESHOLD)) return 'Full Moon'; // 3-day window: day before, day of, and day after Full Moon
    if (phase > (0.5 + FULL_MOON_THRESHOLD) && phase < 0.71) return 'Waning Gibbous';
    if (phase >= 0.71 && phase <= 0.79) return 'Last Quarter';
    if (phase > 0.79 && phase < (1 - NEW_MOON_THRESHOLD)) return 'Waning Crescent';
    return '';
  }

  function updateMoonPhase(data) {
    const moonPhase = data?.daily?.[0]?.moon_phase;
    if (typeof moonPhase !== 'number') return;

    // OpenWeather moon_phase is 0..1 representing the lunar cycle:
    // 0 and 1 = new moon, 0.25 = first quarter, 0.5 = full moon, 0.75 = last quarter
    // Map to image index 1..30
    
    // PERMANENT OFFSET: Adjust this single number to calibrate your moon images.
    // Positive values shift forward, negative shift backward.
    // Calibrated on Jan 15, 2026 to show 2moon28.png
    const MOON_IMAGE_OFFSET = 0;
    
    // Calculate raw index from API value, then apply offset
    // Multiply by 30 so 0 and 1.0 both correctly resolve to image 01 (New Moon)
    let rawIndex = Math.round(moonPhase * 30);
    let imgIndex = ((rawIndex + MOON_IMAGE_OFFSET) % 30) + 1;
    
    // Ensure we stay in valid range 1-30
    if (imgIndex < 1) imgIndex = imgIndex + 30;
    if (imgIndex > 30) imgIndex = imgIndex - 30;

    // Format with leading zero if needed (e.g. 1 -> "01")
    const imgIndexStr = imgIndex.toString().padStart(2, '0');
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_1097_4_1097_127_4`,`Moon phase: ${moonPhase.toFixed(3)}, raw=${rawIndex}, offset=${MOON_IMAGE_OFFSET} -> 2moon${imgIndexStr}.png`));

    // EDITABLE: Set this to true to force show the track circle for testing/visual verification
    const DEBUG_FORCE_NEW_MOON_TRACK = true;

    const imgEl = document.getElementById('moon-phase-img');
    const gridImgEls = document.querySelectorAll('.grid-moon-phase');
    
    if (imgEl || gridImgEls.length > 0) {
      const moonSrcUrl = `url(img/2moon${imgIndexStr}.png)`;
      const isNewMoon = (imgIndex === 1) || DEBUG_FORCE_NEW_MOON_TRACK;
      
      if (imgEl) {
        imgEl.style.webkitMaskImage = moonSrcUrl;
        imgEl.style.maskImage = moonSrcUrl;
        imgEl.setAttribute('aria-label', `Moon Phase ${imgIndex} (${moonPhase})`);
      }
      gridImgEls.forEach(gridImgEl => {
        gridImgEl.style.webkitMaskImage = moonSrcUrl;
        gridImgEl.style.maskImage = moonSrcUrl;
        gridImgEl.setAttribute('aria-label', `Moon Phase ${imgIndex} (${moonPhase})`);
        
        // Show track circle around the moon phase photo
        const trackSvg = gridImgEl.parentNode.querySelector('.grid-moon-track-svg');
        if (trackSvg) {
          trackSvg.style.display = 'block';
        }
      });
      
      // Check if moon is currently risen (between moonrise and moonset)
      // EASY TOGGLE: Set to false to always show full opacity, true to dim it when moon is down
      const DIM_WHEN_MOON_DOWN = true;
      
      // Determine the target temperature color
      let tempColorStr = '#FFF';
      const currentTemp = data?.current?.temp;
      if (typeof currentTemp === 'number') {
        const color = tempToColor(currentTemp);
        if (color) tempColorStr = color;
      } else {
        const rootColor = document.documentElement.style.getPropertyValue('--temp-color');
        if (rootColor) tempColorStr = rootColor;
      }
      
      if (DIM_WHEN_MOON_DOWN) {
        const now = Math.floor(Date.now() / 1000); // current time in Unix seconds
        
        // Check today's and yesterday's moon data for accurate rise/set detection
        const today = data?.daily?.[0];
        const moonrise = today?.moonrise;
        const moonset = today?.moonset;
        
        let isMoonUp = false; // default to down if data unavailable
        
        if (typeof moonrise === 'number' && typeof moonset === 'number') {
          if (moonrise < moonset) {
            isMoonUp = now >= moonrise && now < moonset;
          } else {
            isMoonUp = now >= moonrise || now < moonset;
          }
        }
        
        if (isMoonUp) {
          if (imgEl) {
            imgEl.classList.remove('moon-down');
            imgEl.style.backgroundColor = '#FFFFFF'; // White when moon is risen
          }
          gridImgEls.forEach(gridImgEl => {
            gridImgEl.classList.remove('moon-down');
            gridImgEl.style.backgroundColor = '#FFFFFF';
          });
        } else {
          if (imgEl) {
            imgEl.classList.add('moon-down');
            imgEl.style.backgroundColor = tempColorStr; // Temp color when moon is set
          }
          gridImgEls.forEach(gridImgEl => {
            gridImgEl.classList.add('moon-down');
            gridImgEl.style.backgroundColor = tempColorStr;
          });
        }
      } else {
        if (imgEl) {
          imgEl.classList.remove('moon-down');
          imgEl.style.backgroundColor = '#FFFFFF';
        }
        gridImgEls.forEach(gridImgEl => {
          gridImgEl.classList.remove('moon-down');
          gridImgEl.style.backgroundColor = '#FFFFFF';
        });
      }
    }
  }

  function updateRainAnimationState(data) {
    if (!data) return;
    
    // Retrieve precipitation (to-the-minute if available, otherwise current hourly)
    let precipitation = 0;
    if (data.minutely && data.minutely.length > 0) {
      precipitation = data.minutely[0].precipitation || 0;
    } else if (data.current?.rain) {
      precipitation = data.current.rain['1h'] || data.current.rain['3h'] / 3 || 0;
    }
    
    if (precipitation >= RAIN_LIGHT_THRESHOLD_MM) {
      isRainingCurrently = true;
      
      // Calculate dynamic interval (linear interpolation between min and max based on rain rate)
      const ratio = Math.min((precipitation - RAIN_LIGHT_THRESHOLD_MM) / (RAIN_HEAVY_THRESHOLD_MM - RAIN_LIGHT_THRESHOLD_MM), 1.0);
      currentRainSpawnIntervalMs = RAIN_MAX_SPAWN_INTERVAL_MS - ratio * (RAIN_MAX_SPAWN_INTERVAL_MS - RAIN_MIN_SPAWN_INTERVAL_MS);
    } else {
      isRainingCurrently = false;
      currentRainSpawnIntervalMs = RAIN_MAX_SPAWN_INTERVAL_MS; // Fallback to max interval
    }
    
    document.documentElement.style.setProperty('--rain-spawn-interval-ms', currentRainSpawnIntervalMs + 'ms');
    /* eslint-disable */console.log(...oo_oo(`2266558813_1214_4_1214_188_4`,`🌧️ Rain animation state updated: isRainingCurrently=${isRainingCurrently}, precipitation=${precipitation} mm/h, spawnInterval=${currentRainSpawnIntervalMs.toFixed(0)}ms`));
  }

  function updateSnowAnimationState(data) {
    if (!data) return;
    
    // Check if the current weather ID indicates snow (6xx)
    const currentId = data.current?.weather?.[0]?.id;
    const isSnowId = currentId && (currentId >= 600 && currentId < 700);
    
    let snowPrecipitation = 0;
    if (data.current?.snow) {
      snowPrecipitation = data.current.snow['1h'] || data.current.snow['3h'] / 3 || 0;
    } else if (isSnowId && data.minutely && data.minutely.length > 0) {
      // If condition is snow, minutely precipitation represents snow
      snowPrecipitation = data.minutely[0].precipitation || 0;
    }
    
    if (snowPrecipitation >= SNOW_LIGHT_THRESHOLD_MM) {
      isSnowingCurrently = true;
      const ratio = Math.min((snowPrecipitation - SNOW_LIGHT_THRESHOLD_MM) / (SNOW_HEAVY_THRESHOLD_MM - SNOW_LIGHT_THRESHOLD_MM), 1.0);
      currentSnowSpawnIntervalMs = SNOW_MAX_SPAWN_INTERVAL_MS - ratio * (SNOW_MAX_SPAWN_INTERVAL_MS - SNOW_MIN_SPAWN_INTERVAL_MS);
    } else {
      isSnowingCurrently = false;
      currentSnowSpawnIntervalMs = SNOW_MAX_SPAWN_INTERVAL_MS;
    }
    
    document.documentElement.style.setProperty('--snow-spawn-interval-ms', currentSnowSpawnIntervalMs + 'ms');
    /* eslint-disable */console.log(...oo_oo(`2266558813_1242_4_1242_195_4`,`❄️ Snow animation state updated: isSnowingCurrently=${isSnowingCurrently}, snowPrecipitation=${snowPrecipitation} mm/h, spawnInterval=${currentSnowSpawnIntervalMs.toFixed(0)}ms`));
  }

  function updateFields(data) {
    FIELDS.forEach(f => {
      const el = document.querySelector(f.selector);
      if (!el) return;
      try {
        const value = f.compute(data);
        if (value != null) {
          let displayText = f.format(value);

          // Add trend indicator (+/-) for current temperature
          if (f.name === 'current') {
            const tempRounded = Math.round(value);
            const trendDir = getPersistentTrendDirection('weather_trend_temp', tempRounded);
            if (trendDir === 'up') {
              displayText += '▲';
              /* eslint-disable */console.log(...oo_oo(`2266558813_1260_14_1260_60_4`,`Temp trend: ▲ (${tempRounded}°)`));
            } else if (trendDir === 'down') {
              displayText += '▼';
              /* eslint-disable */console.log(...oo_oo(`2266558813_1263_14_1263_60_4`,`Temp trend: ▼ (${tempRounded}°)`));
            } else {
              /* eslint-disable */console.log(...oo_oo(`2266558813_1265_14_1265_68_4`,`Temp trend: blank/off (${tempRounded}°)`));
            }
          }

          el.innerHTML = displayText;
          // Apply color for temperature fields (after text is set so color applies to arrows too)
          if (f.name === 'current') applyColor(el, value, true);
          else if (['high','low'].includes(f.name)) applyColor(el, value, false);
          else el.style.removeProperty('color');

          // If this is the current temp, ensure a simple month label is present and color it
          if (f.name === 'current') {
            createSimpleMonthIfMissing();
            updateSimpleMonthContent();
            updateSimpleMonthColor(value);
          }
        } else {
          el.textContent = f.placeholder;
          el.style.removeProperty('color');
        }
      } catch (e) {
        /* eslint-disable */console.error(...oo_tx(`2266558813_1286_8_1286_60_11`,`Error computing field ${f.name}:`, e));
        el.textContent = f.placeholder;
        el.style.removeProperty('color');
      }
    });
    
    // Update "Feels like" display
    updateFeelsLike(data);
    
    // Update weather description
    updateWeatherDescription(data);
    
    // Update clock grid row
    updateClockGridRow(data);

    // Update daily weather summary line
    updateDailySummary(data);

    // Update sun dial
    updateSunDial(data);

    // Update moon dial
    updateMoonDial(data);

    // Update wind gauge
    updateWindGauge(data);
    
    // Update barometric pressure gauge
    updateBarometricGauge(data);

    // Update wind speed dots row (Disabled since replaced by dials)
    // updateWindDotsRow(data);
    
    // Update humidity dial
    updateHumidityDial(data);
    
    // Update dewpoint dial
    updateDewpointDial(data);
    
    // Update sun position dots row (Disabled since replaced by dials)
    // updateSunDotsRow(data);
    
    // Update moon rise/set dots row (Disabled since replaced by dials)
    // updateMoonDotsRow(data);
    
    // Update second gauge
    updateSecondGauge(data);
    
    // Update moon phase
    updateMoonPhase(data);

    // Calculate wind direction
    // Fallback: If current wind is 0/calm, use the nearest hourly forecast to show prevailing direction
    let windDeg = data.current?.wind_deg;
    /* eslint-disable */console.log(...oo_oo(`2266558813_1340_4_1340_141_4`,'🧭 RAW API Wind Direction:', windDeg, '° | Wind Speed:', data.current?.wind_speed, 'mph | Full current data:', data.current));
    /* eslint-disable */console.log(...oo_oo(`2266558813_1341_4_1341_110_4`,'🧭 Current Wind Direction:', windDeg, '° (meteorological - direction FROM which wind blows)'));
    if ((!windDeg || data.current?.wind_speed === 0) && data.hourly && data.hourly.length > 0) {
      // Find the closest hourly forecast in the future
      const now = Date.now() / 1000;
      const nextHour = data.hourly.find(h => h.dt > now);
      if (nextHour && nextHour.wind_deg) {
          const previousWindDeg = windDeg;
          windDeg = nextHour.wind_deg;
          /* eslint-disable */console.log(...oo_oo(`2266558813_1349_10_1349_114_4`,`Current wind is calm/0°. Changed from ${previousWindDeg}° to hourly forecast: ${windDeg}°`));
      }
    }

    // Update wind direction arrow
    const windArrow = document.getElementById('wind-direction-arrow');
    const currentWindSpeed = data.current?.wind_speed || 0;
    
    if (windArrow) {
      updateWindDirectionArrow(data.current?.temp, windDeg, currentWindSpeed);
      
      if (currentWindSpeed >= 25) {
        const baseColor = tempToColor(data.current?.temp) || 'white';
        const activeColor = 'hsl(0, 90%, 55%)';
        windArrow.style.setProperty('--base-color', baseColor);
        windArrow.style.setProperty('--glow-color', activeColor);
        windArrow.classList.add('high-wind-active');
        // Let CSS animation handle background-color over time
        const colorDiv = windArrow.querySelector('.wind-arrow-color');
        if (colorDiv) colorDiv.style.backgroundColor = ''; // Clear inline color
      } else {
        windArrow.classList.remove('high-wind-active');
        const baseColor = tempToColor(data.current?.temp) || 'white';
        const colorDiv = windArrow.querySelector('.wind-arrow-color');
        if (colorDiv) colorDiv.style.backgroundColor = baseColor;
      }
    }

    // Update circular overlay (wind direction)
    updateCircularOverlay(data.current?.temp, windDeg);
    const circularOverlay = document.querySelector('.circular-overlay');
    if (circularOverlay) {
      if (currentWindSpeed >= 25) {
        const baseColor = tempToColor(data.current?.temp) || 'white';
        const activeColor = 'hsl(0, 90%, 55%)';
        circularOverlay.style.setProperty('--base-color', baseColor);
        circularOverlay.style.setProperty('--glow-color', activeColor);
        circularOverlay.style.backgroundColor = ''; // Clear inline color
        circularOverlay.classList.add('high-wind-active');
      } else {
        circularOverlay.classList.remove('high-wind-active');
        circularOverlay.style.backgroundColor = tempToColor(data.current?.temp) || 'white';
      }
    }

    // Update alert banners (tornado, thunderstorm, etc.)
    updateAlerts(data);
    
    // Update rain forecast banner (hourly rain %)
    updateRainBanner(data);
  }

  // Helper function to persist trend directions (wind, barometer, dewpoint, temp)
  // Keeps the last direction ('up' or 'down') until an opposite value change occurs.
  // After 1 hour of identical values, the wedge automatically turns off (returns null).
  function getPersistentTrendDirection(key, currentValue, expiryMs = 60 * 60 * 1000) {
    if (typeof currentValue !== 'number' || isNaN(currentValue)) return null;

    const now = Date.now();
    let state = null;

    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        state = JSON.parse(raw);
      }
    } catch (e) {
      state = null;
    }

    if (!state || typeof state.lastValue !== 'number') {
      state = {
        lastValue: currentValue,
        direction: null,
        lastChangedTs: now
      };
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (e) {}
      return null;
    }

    let direction = state.direction || null;
    let lastChangedTs = typeof state.lastChangedTs === 'number' ? state.lastChangedTs : now;

    if (currentValue > state.lastValue) {
      direction = 'up';
      lastChangedTs = now;
      state.lastValue = currentValue;
    } else if (currentValue < state.lastValue) {
      direction = 'down';
      lastChangedTs = now;
      state.lastValue = currentValue;
    } else {
      // Value has not changed. Turn off after 1 hour of same value
      if (now - lastChangedTs >= expiryMs) {
        direction = null;
      }
    }

    const updatedState = {
      lastValue: state.lastValue,
      direction: direction,
      lastChangedTs: lastChangedTs
    };

    try {
      localStorage.setItem(key, JSON.stringify(updatedState));
    } catch (e) {}

    return direction;
  }

  // Helper function to maintain a rolling timestamped history in localStorage
  // and retrieve the recorded observation from up to 30 minutes ago (~30 min lookback)
  function getHistoricalComparisonValue(key, currentValue, maxAgeMs = 30 * 60 * 1000) {
    if (typeof currentValue !== 'number' || isNaN(currentValue)) return currentValue;
    const now = Date.now();
    let history = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        history = JSON.parse(raw);
        if (!Array.isArray(history)) history = [];
      }
    } catch (e) {
      history = [];
    }

    // Keep samples up to maxAgeMs (30 mins) + 5 min buffer
    const maxStorageAgeMs = maxAgeMs + 5 * 60 * 1000;
    history = history.filter(item => item && typeof item.ts === 'number' && typeof item.val === 'number' && (now - item.ts) <= maxStorageAgeMs);

    // Record current sample if empty or if last sample is at least 30s old
    const lastSample = history[history.length - 1];
    if (!lastSample || (now - lastSample.ts) >= 30 * 1000) {
      history.push({ ts: now, val: currentValue });
      try {
        localStorage.setItem(key, JSON.stringify(history));
      } catch (e) { /* noop */ }
    }

    // If we only have 1 sample in history, return current value (diff = 0)
    if (history.length <= 1) {
      return currentValue;
    }

    // Find the sample closest to targetTs (now - 30 minutes).
    // Exclude samples recorded less than 1 minute ago to ensure true lookback.
    const targetTs = now - maxAgeMs;
    let bestSample = null;
    let minDiff = Infinity;

    for (const sample of history) {
      const age = now - sample.ts;
      if (age < 60 * 1000 && history.length > 1) continue;

      const diff = Math.abs(sample.ts - targetTs);
      if (diff < minDiff) {
        minDiff = diff;
        bestSample = sample;
      }
    }

    return (bestSample && typeof bestSample.val === 'number') ? bestSample.val : currentValue;
  }

  // Update the wind gauge with wind speed and gust data
  function updateWindGauge(data) {
    const windSpeed = data?.current?.wind_speed || 0;
    const rawWindGust = data?.current?.wind_gust || windSpeed;
    const windGust = (rawWindGust - windSpeed >= 5) ? rawWindGust : windSpeed;
    
    if (lastWindSpeed !== null && windSpeed !== lastWindSpeed) {
      triggerWindSpeedSpinAnimation();
    }
    lastWindSpeed = windSpeed;
    
    const currentTemp = data?.current?.temp || null;
    
    let trendHtml = '';
    const windSpeedRounded = Math.round(windSpeed);
    const windTrend = getPersistentTrendDirection('weather_trend_wind', windSpeedRounded);
    let iconClass = '';
    if (windTrend === 'up') {
      iconClass = "fa-angle-up";
    } else if (windTrend === 'down') {
      iconClass = "fa-angle-down";
    }

    // Determine whether stem is pointing upwards (above the middle) or downwards (below the middle)
    const windDeg = parseFloat(data?.current?.wind_deg);
    const ARROW_OFFSET = 0;
    const displayDeg = !isNaN(windDeg) ? (windDeg + ARROW_OFFSET) : 0;
    const normalizedDeg = ((displayDeg % 360) + 360) % 360;
    const isStemAboveMiddle = (normalizedDeg <= 90 || normalizedDeg >= 270);
    const positionAttr = isStemAboveMiddle ? 'bottom' : 'top';
    
    if (iconClass) {
      const trendPositionValue = isStemAboveMiddle ? `calc(${BAROMETRIC_TREND_TOP_POS} - 0.5vw)` : BAROMETRIC_TREND_TOP_POS;
      trendHtml = `<div style="position: absolute; ${positionAttr}: ${trendPositionValue}; width: 100%; text-align: center; font-size: ${BAROMETRIC_TREND_FONT_SIZE};"><i class="fa-solid ${iconClass}"></i></div>`;
    }
    
    // Calculate percentages (0-60 mph scale)
    const maxWindMph = 60;
    const speedPercent = Math.min((windSpeed / maxWindMph) * 100, 100);
    const gustPercent = Math.min((windGust / maxWindMph) * 100, 100);
    
    // Get the base temperature color for the "data" side of the bar,
    // and derive a darker companion color (matching the animated background helpers)
    let tempColor = null;
    let darkerBgColor = null;
    let brighterGustColor = null;
    let gustTempColor = null;
    
    if (currentTemp !== null) {
      tempColor = tempToColor(currentTemp);
      gustTempColor = tempToColor(currentTemp + 10);
      if (tempColor) {
        const parsed = parseHslString(tempColor);
        if (parsed) {
          const [h, s, l] = parsed;
          const pair = deriveDarkerPairFromHsl(h, s, l) || [];
          // Use a shade exactly between the two darker variants so the
          // gauge tail feels like a true midpoint of the background pair.
          darkerBgColor = midpointHslColor(pair[0], pair[1]) || pair[0] || pair[1] || null;
          // Create a brighter variant of the temp color for gusts that
          // peek out beyond the main wind-speed bar.
          const brighterL = Math.min(l + 18, 92);
          brighterGustColor = `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${brighterL.toFixed(1)}%)`;
        }
      }
    }
    
    // Update the visual bars
    const speedBar = document.querySelector('.wind-gauge__speed');
    const gustBar = document.querySelector('.wind-gauge__gust');
    const tempFill = document.querySelector('.wind-gauge__temp-fill');
    const speedLabel = document.querySelector('.wind-gauge__speed-label');
    
    if (speedBar) {
      speedBar.style.width = `${speedPercent}%`;
      if (tempColor) {
        // Data side (wind speed) uses the current temperature color
        speedBar.style.background = tempColor;
      }
    }
    
    if (gustBar) {
      gustBar.style.width = `${gustPercent}%`;
      if (tempColor) {
        // Gust overlay uses a brighter version of the temp color so
        // any portion extending beyond the main bar glows a bit.
        gustBar.style.background = brighterGustColor || tempColor;
      }
    }
    
    // Use the darker derived shade for the remaining (background) portion
    if (tempFill) {
      tempFill.style.backgroundColor = darkerBgColor || tempColor || '';
    }
    
    // Update the speed label
    if (speedLabel) {
      speedLabel.textContent = `${Math.round(windSpeed)}mph`;
    }
    
    // Update the text labels
    const windValueEl = document.querySelector('.wind-value');
    const gustValueEl = document.querySelector('.gust-value');
    
    if (windValueEl) {
      windValueEl.textContent = Math.round(windSpeed);
    }
    
    if (gustValueEl) {
      gustValueEl.textContent = Math.round(windGust);
    }
    // Update the wind speed progress and track rings in grid cell #3 (0 to 60 mph scale)
    const gridWindProgressEls = document.querySelectorAll('.clockGridItem-2 .countdown-progress');
    const gridWindTrackEls = document.querySelectorAll('.clockGridItem-2 .countdown-track');
    const radius = 46;
    const circumference = 2 * Math.PI * radius; // ~289
    
    const percentSpeed = Math.max(0, Math.min(1, windSpeed / maxWindMph));
    const percentGust = Math.max(0, Math.min(1, windGust / maxWindMph));

    gridWindProgressEls.forEach(gridWindProgressEl => {
      const dashOffset = circumference * (1 - percentSpeed);
      gridWindProgressEl.style.strokeDashoffset = dashOffset;
      if (tempColor) {
        gridWindProgressEl.style.stroke = tempColor;
      }
    });

    // Update fading gust progress arc (from speed to gust)
    const gridGustProgressEls = document.querySelectorAll('.clockGridItem-2 .gust-progress');
    gridGustProgressEls.forEach(gridGustProgressEl => {
      const length = Math.max(0, (percentGust - percentSpeed) * circumference);
      const dashOffset = - (percentSpeed * circumference);
      if (length > 0) {
        gridGustProgressEl.style.display = '';
        gridGustProgressEl.style.strokeDasharray = `${length}, ${circumference}`;
        gridGustProgressEl.style.strokeDashoffset = dashOffset;
        if (gustTempColor) {
          gridGustProgressEl.style.stroke = gustTempColor;
        } else if (tempColor) {
          gridGustProgressEl.style.stroke = tempColor;
        }
      } else {
        gridGustProgressEl.style.display = 'none';
      }
    });
    
    gridWindTrackEls.forEach(gridWindTrackEl => {
      const gapLength = percentGust * circumference;
      const trackLength = circumference * (1 - percentGust);
      gridWindTrackEl.style.strokeDasharray = `0, ${gapLength.toFixed(3)}, ${trackLength.toFixed(3)}, ${circumference.toFixed(3)}`;
      gridWindTrackEl.style.strokeDashoffset = '0';
    });

    // Update the gust-dot positioning at the point indicating gust speed
    const gustDotEls = document.querySelectorAll('.clockGridItem-2 .gust-dot');
    gustDotEls.forEach(gustDotEl => {
      gustDotEl.style.display = 'none';
    });
    
    const gridWindSpeedTextEls = document.querySelectorAll('.clockGridItem-2 .grid-wind-speed-text');
    gridWindSpeedTextEls.forEach(gridWindSpeedTextEl => {
      gridWindSpeedTextEl.innerHTML = `
        ${trendHtml}<span style="position: relative; display: inline-block;">${Math.round(windSpeed)}</span>
      `;
      
      if (tempColor) {
        gridWindSpeedTextEl.style.color = tempColor;
      }

      if (windSpeed >= WIND_SPEED_HIGH_THRESHOLD_MPH) {
        gridWindSpeedTextEl.style.setProperty('font-size', 'calc(var(--item-current-size) * var(--wind-speed-high-multiplier))', 'important');
      } else {
        gridWindSpeedTextEl.style.removeProperty('font-size');
      }
    });
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_1693_4_1693_160_4`,`Wind updated: Speed ${Math.round(windSpeed)} mph (${speedPercent.toFixed(1)}%), Gust ${Math.round(windGust)} mph (${gustPercent.toFixed(1)}%)`));
  }

  // Update the barometric pressure gauge
  function updateBarometricGauge(data) {
    const pressureEls = document.querySelectorAll('.barometric-text');
    const pressureFills = document.querySelectorAll('.barometric-fill');
    // OpenWeather provides pressure in hPa. Typical sea level range is 950 to 1050.
    const pressure = data?.current?.pressure || 1013; 
    
    // Determine persistent trend arrow for barometer
    let trendHtml = '';
    const pressureRounded = Math.round(pressure);
    const pressureTrend = getPersistentTrendDirection('weather_trend_barometer', pressureRounded);

    let iconClass = '';
    let transformStyle = '';

    if (pressureTrend === 'up') {
      iconClass = "fa-angle-up";
    } else if (pressureTrend === 'down') {
      iconClass = "fa-angle-down";
    }

    if (iconClass) {
      trendHtml = `<div style="position: absolute; top: ${BAROMETRIC_TREND_TOP_POS}; width: 100%; text-align: center; font-size: ${BAROMETRIC_TREND_FONT_SIZE};"><i class="fa-solid ${iconClass}" style="${transformStyle}"></i></div>`;
    }

    pressureEls.forEach(el => {
      // Scale dynamic inner elements if it's placed inside the smaller grid circle!
      const isGrid = el.closest('.grid-barometric-pressure') !== null;
      const unitFontSize = isGrid ? '1.1vw' : '1.5vw';
      el.innerHTML = `${trendHtml}${Math.round(pressure)}<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">hPa</span>`;
    });

    if (pressureFills.length > 0) {
      const getRadius = (el) => el.closest('.grid-barometric-pressure') !== null ? 46 : 45;
      animateGauge(pressureFills, pressure, prevPressure, BAROMETER_DIAL_MIN, BAROMETER_DIAL_AVG, BAROMETER_DIAL_MAX, getRadius);
      prevPressure = pressure;
      
      // Inherit the color of the current temperature
      const currentTemp = data?.current?.temp;
      if (currentTemp !== null && currentTemp !== undefined) {
        const color = tempToColor(currentTemp);
        if (color) {
          pressureFills.forEach(fill => {
            fill.style.stroke = color;
          });
          pressureEls.forEach(el => {
            el.style.color = color;
          });
        }
      }
    }
  }

  // Update the second gauge (humidity display)
  function updateSecondGauge(data) {
    const humidity = data?.current?.humidity || 0;
    const currentTemp = data?.current?.temp || null;
    
    // Calculate percentage (0-100% scale for humidity)
    const humidityPercent = Math.min(humidity, 100);
    
    // Derive humidity color from temperature (darker version)
    let humidityColor = 'hsl(210, 80%, 35%)'; // default dark blue
    let tempColor = null;
    let darkerBgColor = null;
    
    if (currentTemp !== null) {
      tempColor = tempToColor(currentTemp);
      if (tempColor) {
        const parsed = parseHslString(tempColor);
        if (parsed) {
          const [h, s, l] = parsed;
      const pair = deriveDarkerPairFromHsl(h, s, l) || [];
      // Use a midpoint shade between the two darker variants so the
      // humidity gauge tail visually matches the animated background.
      darkerBgColor = midpointHslColor(pair[0], pair[1]) || pair[0] || pair[1] || null;
        }
      }
    }
    
    const speedBar = document.querySelector('.second-gauge__speed');
    const humidityBar = document.querySelector('.second-gauge__gust');
    const tempFill = document.querySelector('.second-gauge__temp-fill');
    const humidityLabel = document.querySelector('.second-gauge__humidity-label');
    
    // Hide/remove the speed bar (not used)
    if (speedBar) {
      speedBar.style.width = '0%';
    }
    
    // Set humidity bar
    if (humidityBar) {
      humidityBar.style.width = `${humidityPercent}%`;
      // Data side (humidity) uses the current temperature color
      if (tempColor) {
        humidityBar.style.background = tempColor;
      }
    }
    
    // Use the darker derived shade for the remaining (background) portion
    if (tempFill) {
      tempFill.style.backgroundColor = darkerBgColor || tempColor || '';
    }
    
    // Update the humidity label
    if (humidityLabel) {
      humidityLabel.textContent = `${Math.round(humidity)}%`;
    }
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_1805_4_1805_71_4`,`Humidity updated: ${humidity}% (${humidityPercent}%)`));
  }








  // Initialize the alert container and force bulletproof CSS transitions
  function initAlertsContainer() {
    if (document.getElementById('alerts-container')) return;
    
    // Inject bulletproof CSS for animations, scrollbar removal, glass effect, and text pulsing
    const style = document.createElement('style');
    style.id = 'alerts-style';
    style.textContent = `
      :root {
        --alert-temp-drop-type-y-offset: var(--alert-temp-drop-type-y-offset-desktop, 0.3vw);
        --alert-temp-drop-icon-y-offset: var(--alert-temp-drop-icon-y-offset-desktop, 0.4vw);
        --alert-temp-rise-type-y-offset: var(--alert-temp-rise-type-y-offset-desktop, 0.3vw);
        --alert-temp-rise-icon-y-offset: var(--alert-temp-rise-icon-y-offset-desktop, -0.15vw);
      }
      @media (max-width: 767px) {
        :root {
          --alert-temp-drop-type-y-offset: var(--alert-temp-drop-type-y-offset-mobile, 0.3vw);
          --alert-temp-drop-icon-y-offset: var(--alert-temp-drop-icon-y-offset-mobile, 0.4vw);
          --alert-temp-rise-type-y-offset: var(--alert-temp-rise-type-y-offset-mobile, 0.3vw);
          --alert-temp-rise-icon-y-offset: var(--alert-temp-rise-icon-y-offset-mobile, -0.15vw);
        }
      }
      html, body {
        margin: 0 !important;
      }
      #alerts-container {
        width: 100vw;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        overflow: hidden;
        height: 0vw;
        transition: height ${ALERT_ANIMATION_MS}ms ease !important;
      }
      #rain-forecast-banner {
        width: 100%;
        margin: 0 auto;
        height: 0vw;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        overflow: hidden;
        background-color: transparent;
        transition: height ${ALERT_ANIMATION_MS}ms ease !important;
      }
      .rain-forecast-inner {
        width: 100%;
        height: ${RAIN_BANNER_HEIGHT_VW}vw;
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 1vw;
        flex-shrink: 0;
      }
      .alert-banner {
        width: 100vw;
        height: 10vw;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        gap: 3vw;
        flex-shrink: 0;
        position: relative; /* Position context for children shadows */
        background-color: transparent;
      }
      .alert-banner-bg {
        position: absolute;
        inset: 0;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-bottom: 0.2vw solid rgba(255, 255, 255, 0.2);
        z-index: 1;
      }


      .alert-banner-content {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3vw;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      .alert-banner-top-shadow {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2vw;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.55), transparent), linear-gradient(to bottom, var(--prev-banner-color), transparent);
        pointer-events: none;
        z-index: 10;
        opacity: 0.5;
      }
      .alert-banner-bottom-shadow {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        height: 2vw;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.65), transparent);
        pointer-events: none;
        z-index: 10;
        opacity: 0.5;
      }
      .alert-text {
        font-size: 3.5vw;
        font-family: 'bold', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        line-height: var(--alert-banner-line-height, 1.1);
        color: #ffffff;
      }
      .alert-expires {
        font-family: 'FiraSans', 'Fira Sans', sans-serif;
        font-weight: 300; /* Light weight */
        font-style: normal;
        color: #ffffff; /* White */
        font-size: 3.5vw; /* Same size as alert text */
        letter-spacing: -0.05em; /* EDITABLE: Kerning for expiration time */
        text-transform: lowercase; /* Lowercase expires text */
      }
      #moon-phase-img {
        position: absolute !important;
        transform-origin: top left !important;
        transform: translateY(calc(var(--alert-push, 0vw) + var(--fragile-y-offset, 0vw))) scale(0.63) !important;
      }
      #wind-direction-arrow {
        position: absolute !important;
        top: 0vw !important;
        left: 16vw !important;
        width: 12vw !important;
        height: 12vw !important;
        z-index: 999 !important;
        pointer-events: none !important;
        opacity: 0.9 !important;
        transform-origin: center center !important;
        transform: translateY(calc(var(--alert-push, 0vw) + var(--fragile-y-offset, 0vw))) !important;
      }
      #analog-clock, #barometric-pressure-gauge {
        transform: translateY(calc(var(--alert-push, 0vw) + var(--fragile-y-offset, 0vw))) !important;
      }
      @keyframes scroll-weather-bg {
        0% { background-position: 0 center; }
        100% { background-position: 200vw center; }
      }
      #weather-desc-image {
        position: absolute;
        right: var(--circle-cell-right, ${WEATHER_IMAGE_RIGHT});
        top: var(--circle-cell-top, ${WEATHER_IMAGE_TOP});
        width: var(--circle-cell-size, ${WEATHER_IMAGE_WIDTH});
        height: var(--circle-cell-size, ${WEATHER_IMAGE_HEIGHT});
        margin-bottom: var(--circle-cell-margin-bottom, 0vw);
        background-color: #000;
        background-image: url('${WEATHER_CIRCLES_NIGHT_IMAGE}');
        background-size: auto 100%;
        background-repeat: repeat-x;
        background-position: center;
        --radar-loop-speed: ${RADAR_LOOP_SPEED_MS}ms;
        --radar-fade-duration: ${RADAR_FADE_DURATION_MS}ms;
        animation: scroll-weather-bg ${WEATHER_IMAGE_SCROLL_SPEED_S}s linear infinite !important;
        border-radius: ${WEATHER_IMAGE_BORDER_RADIUS};
        -webkit-mask-image: -webkit-radial-gradient(white, black);
        transform-origin: top right !important;
        transform: translateY(calc(var(--alert-push, 0vw) + var(--fragile-y-offset, 0vw))) !important;
        z-index: 50;
        overflow: hidden;
        opacity: 0; /* Hide initially to prevent page load flash */
      }
      #weather-desc-image.radar-mode {
        background-color: var(--radar-bg-color, transparent);
        background-image: var(--radar-bg-image, none);
        background-size: cover;
        background-repeat: no-repeat;
        animation: var(--radar-animation, none) !important;
        mix-blend-mode: var(--radar-blend-mode, lighten);
        box-sizing: border-box;
        border: none;
        box-shadow: inset 0 0 0 ${RADAR_OUTER_STROKE_WIDTH} var(--clock-grid-track-color, rgba(255, 255, 255, 0.2));
      }
      #weather-desc-image.radar-mode .radar-frame {
        /* Filter removal per workspace storm core isolation rules */
      }
      #weather-desc-image.radar-mode #simple-month {
        display: none !important;
      }
      #weather-desc-image-left {
        position: absolute;
        left: var(--circle-cell-left, ${CIRCLE_CELL_LEFT});
        top: var(--circle-cell-top, ${WEATHER_IMAGE_TOP});
        width: var(--circle-cell-size, ${WEATHER_IMAGE_WIDTH});
        height: var(--circle-cell-size, ${WEATHER_IMAGE_HEIGHT});
        margin-bottom: var(--circle-cell-margin-bottom, 0vw);
        background-color: #000;
        background-image: url('${WEATHER_CIRCLES_NIGHT_IMAGE}');
        background-size: auto 100%;
        background-repeat: repeat-x;
        background-position: center;
        --radar-loop-speed: ${RADAR_LOOP_SPEED_MS}ms;
        --radar-fade-duration: ${RADAR_FADE_DURATION_MS}ms;
        animation: scroll-weather-bg ${WEATHER_IMAGE_SCROLL_SPEED_S}s linear infinite !important;
        border-radius: ${WEATHER_IMAGE_BORDER_RADIUS};
        -webkit-mask-image: -webkit-radial-gradient(white, black);
        transform-origin: top left !important;
        transform: translateY(calc(var(--alert-push, 0vw) + var(--fragile-y-offset, 0vw))) !important;
        z-index: 50;
        overflow: hidden;
        opacity: 0; /* Hide initially to prevent page load flash */
      }
      #weather-desc-image-left.radar-mode {
        background-color: var(--radar-bg-color, transparent);
        background-image: var(--radar-bg-image, none);
        background-size: cover;
        background-repeat: no-repeat;
        animation: var(--radar-animation, none) !important;
        mix-blend-mode: var(--radar-blend-mode, lighten);
        box-sizing: border-box;
        border: none;
        box-shadow: inset 0 0 0 ${RADAR_OUTER_STROKE_WIDTH} var(--clock-grid-track-color, rgba(255, 255, 255, 0.2));
      }
      #weather-desc-image-left.radar-mode .radar-frame {
        /* Filter removal per workspace storm core isolation rules */
      }
      #weather-desc-image-left.radar-mode #simple-month-left {
        display: none !important;
      }
      .radar-map-bg {
        opacity: 0.15;
      }
      @keyframes radar-sweep {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .radar-sweep-line {
        animation: radar-sweep var(--radar-sweep-duration, 6000ms) linear infinite !important;
      }
      .radar-ring-25-right {
        position: absolute;
        top: 50%;
        left: 50%;
        width: var(--radar-ring-25-diameter-right, 31.85%);
        height: var(--radar-ring-25-diameter-right, 31.85%);
        transform: translate(-50%, -50%);
        box-sizing: border-box;
        border: var(--radar-ring-25-stroke-right, 0.15vw) solid var(--clock-grid-track-color, rgba(255, 255, 255, 0.2));
        border-radius: 50%;
        z-index: 90;
        pointer-events: none;
      }
      .radar-ring-50-right {
        position: absolute;
        top: 50%;
        left: 50%;
        width: var(--radar-ring-50-diameter-right, 63.69%);
        height: var(--radar-ring-50-diameter-right, 63.69%);
        transform: translate(-50%, -50%);
        box-sizing: border-box;
        border: var(--radar-ring-50-stroke-right, 0.15vw) solid var(--clock-grid-track-color, rgba(255, 255, 255, 0.2));
        border-radius: 50%;
        z-index: 90;
        pointer-events: none;
      }
      .radar-frame,
      .radar-sweep-line,
      .radar-frames-container,
      .radar-map-bg,
      .radar-oklahoma-outline,
      .radar-screen {
        pointer-events: none !important;
      }
      .radar-screen {
        position: absolute;
        top: 50%;
        left: 50%;
        width: calc(100% - 2 * ${RADAR_OUTER_STROKE_WIDTH});
        height: calc(100% - 2 * ${RADAR_OUTER_STROKE_WIDTH});
        transform: translate(-50%, -50%);
        border-radius: 50%;
        overflow: hidden;
        -webkit-mask-image: -webkit-radial-gradient(white, black);
        pointer-events: none;
      }
      #weather-desc-image-left.radar-mode::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: var(--radar-inner-circle-diameter, 33.33%);
        height: var(--radar-inner-circle-diameter, 33.33%);
        transform: translate(-50%, -50%);
        box-sizing: border-box;
        border: ${RADAR_INNER_STROKE_WIDTH} solid var(--clock-grid-track-color, rgba(255, 255, 255, 0.2));
        border-radius: 50%;
        z-index: 90;
        pointer-events: none;
      }
      #weather-desc-image.radar-mode::after,
      #weather-desc-image-left.radar-mode::after,
      .radar-center-dot {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: var(--radar-center-dot-size, 1.0vw);
        height: var(--radar-center-dot-size, 1.0vw);
        background-color: var(--radar-center-dot-color, #ffffff) !important;
        opacity: var(--radar-center-dot-opacity, 1.0) !important;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: var(--radar-center-dot-z-index, 100) !important;
        pointer-events: none;
      }
      .hiItem.animating-change,
      .loItem.animating-change {
        transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      .day0-temp-line.animating-change {
        transition: top 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease !important;
      }
      body.transitions-ready #moon-phase-img {
        transition: transform ${ALERT_ANIMATION_MS}ms ease, filter 0.3s ease !important;
      }
      body.transitions-ready #weather-desc-image,
      body.transitions-ready #weather-desc-image-left {
        transition: transform ${ALERT_ANIMATION_MS}ms ease, filter 0.3s ease, opacity 0.5s ease !important;
      }
      body.transitions-ready #wind-direction-arrow {
        transition: transform ${ALERT_ANIMATION_MS}ms ease !important;
      }
      body.transitions-ready #analog-clock, 
      body.transitions-ready #barometric-pressure-gauge {
        transition: transform ${ALERT_ANIMATION_MS}ms ease !important;
      }
      #alert-modal-overlay {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background-color: rgba(0, 0, 0, 0.85);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      #alert-modal-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .alert-modal-content {
        position: relative;
        width: 85vw;
        max-height: 80vh;
        background: rgba(30, 30, 30, 0.95);
        border-radius: 3vw;
        padding: 6vw;
        color: rgba(255, 255, 255, 0.9);
        overflow-y: auto;
        box-shadow: 0 4vw 8vw rgba(0,0,0,0.8);
        font-family: 'light', sans-serif;
        font-size: 4vw;
        line-height: 1.4;
        text-align: center; /* Base alignment for modal */
      }
      .alert-modal-title {
        font-family: 'bold', sans-serif;
        font-size: 5vw;
        margin-bottom: 3vw;
        padding: 0 8vw; /* Keep text away from close button but evenly centered */
        line-height: ${ALERT_MODAL_TITLE_LINE_HEIGHT}; /* EDITABLE: Pulled from config at top */
        text-align: center; /* Guarantee title is centered */
      }
      .alert-modal-body {
        margin-top: ${ALERT_MODAL_BODY_TOP_MARGIN}; /* EDITABLE: Linespace above body copy */
        font-size: 2.4vw; /* EDITABLE: Text size (60% of 4vw) */
        color: #ffffff; /* EDITABLE: Pure white text */
        text-align: left; /* EDITABLE: Flush left alignment */
        font-family: 'light', sans-serif; /* EDITABLE: Font style */
      }
      .alert-modal-body p {
        text-align: left; /* Explicitly force paragraphs to be flush left */
        line-height: ${ALERT_MODAL_LINE_HEIGHT} !important; /* EDITABLE: Pulled from config at top */
        margin-top: -1vw; /* EDITABLE: Space ABOVE each paragraph */
        margin-bottom: 3vw; /* EDITABLE: Space BELOW each paragraph */
      }
      .alert-modal-body p.alert-bullet {
        padding-left: 2.3vw; /* Indent the whole paragraph */
        text-indent: -2.3vw; /* Pull the bullet point back to the left margin */
        margin-top: -2vw; /* Keep bullets reasonably tight */
      }
      .alert-modal-body p:first-child,
      .alert-modal-body p.alert-bullet:first-child {
        margin-top: 0 !important; /* Preserves the line space above the body copy */
      }
      .alert-modal-body p.alert-bullet .heavy-bullet {
        font-family: 'bold', sans-serif;
        font-size: 1.5em; /* Make the actual dot visibly larger/bolder */
        vertical-align: -0.1em; /* Subtly lower the larger bullet to align with lowercase letters */
      }
      .alert-modal-body p:last-child {
        margin-bottom: 0; /* Keeps the bottom of the modal tidy */
      }
      .alert-modal-close {
        position: absolute;
        top: 4vw; right: 5vw;
        font-size: 8vw;
        color: rgba(255,255,255,0.5);
        cursor: pointer;
        line-height: 0.8;
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'alerts-container';
    container.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'height') {
        updateLowerGradientPosition();
      }
    });
    document.body.insertBefore(container, document.body.firstChild);

    // Create rain forecast banner container immediately after alerts
    initRainBannerContainer();

    // Inject the SVG filter for removing blue haze on startup
    if (!document.getElementById('remove-blue-haze-svg')) {
      const rootStyles = getComputedStyle(document.documentElement);
      const mR = rootStyles.getPropertyValue('--radar-matrix-r').trim() || '3.0';
      const mG = rootStyles.getPropertyValue('--radar-matrix-g').trim() || '0.0';
      const mB = rootStyles.getPropertyValue('--radar-matrix-b').trim() || '-5.0';
      const mOffset = rootStyles.getPropertyValue('--radar-matrix-offset').trim() || '-0.6';
      
      const svgFilterHtml = `
        <svg xmlns="http://www.w3.org/2000/svg" id="remove-blue-haze-svg" style="position: absolute; top: -9999px; left: -9999px; visibility: hidden;" aria-hidden="true">
          <defs>
            <filter id="remove-blue-haze" color-interpolation-filters="sRGB">
              <feColorMatrix type="matrix" values="
                1   0   0   0   0
                0   1   0   0   0
                0   0   1   0   0
                ${mR} ${mG} ${mB} 1.0 ${mOffset}
              "/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="10" intercept="-4"/>
              </feComponentTransfer>
            </filter>
          </defs>
        </svg>
      `;
      document.body.insertAdjacentHTML('beforeend', svgFilterHtml);
    }

    // Create the 16:9 placeholder element
    if (!document.getElementById('weather-desc-image')) {
      const descImg = document.createElement('div');
      descImg.id = 'weather-desc-image';
      
      
      if (!SHOW_DOPPLER_RADAR_RIGHT) {
        // Random animation delay to start at different scroll position
        const randomDelay = -Math.random() * WEATHER_IMAGE_SCROLL_SPEED_S;
        descImg.style.setProperty('animation-delay', `${randomDelay}s`, 'important');
      }
      document.body.appendChild(descImg);
      
      // If simple-month was already created, move it inside the scrolling banner
      const simpleMonth = document.getElementById('simple-month');
      if (simpleMonth && !SHOW_DOPPLER_RADAR_RIGHT) {
        descImg.appendChild(simpleMonth);
      }
    }

    if (!document.getElementById('weather-desc-image-left')) {
      const descImgLeft = document.createElement('div');
      descImgLeft.id = 'weather-desc-image-left';
      if (!SHOW_DOPPLER_RADAR_LEFT) {
        // Random animation delay to start at different scroll position
        const randomDelay = -Math.random() * WEATHER_IMAGE_SCROLL_SPEED_S;
        descImgLeft.style.setProperty('animation-delay', `${randomDelay}s`, 'important');
      }
      document.body.appendChild(descImgLeft);
      
      // If simple-month-left was already created, move it inside the scrolling banner
      const simpleMonthLeft = document.getElementById('simple-month-left');
      if (simpleMonthLeft && !SHOW_DOPPLER_RADAR_LEFT) {
        descImgLeft.appendChild(simpleMonthLeft);
      }
    }

    // DUPLICATE CELL CODE (For backtracking/reference)
    /*
    if (!document.getElementById('weather-desc-image')) {
      const descImg = document.createElement('div');
      descImg.id = 'weather-desc-image';
      const randomDelay = -Math.random() * WEATHER_IMAGE_SCROLL_SPEED_S;
      descImg.style.setProperty('animation-delay', `${randomDelay}s`, 'important');
      document.body.appendChild(descImg);
      const simpleMonth = document.getElementById('simple-month');
      if (simpleMonth) {
        descImg.appendChild(simpleMonth);
      }
    }
    */
  }








  function createDrop(canvas, startY) {
    // Get current wind parameters from API data
    const windSpeed = lastWeatherData?.current?.wind_speed || 0;
    const windDeg = lastWeatherData?.current?.wind_deg || 0;
    
    // Calculate East-West component of wind speed in mph
    // In meteorology, deg is the direction the wind is COMING FROM.
    // So u-component (East-West wind speed, positive blowing East, negative blowing West) is:
    const windDegRad = (windDeg * Math.PI) / 180;
    const u = -windSpeed * Math.sin(windDegRad);
    
    // Convert to tilt in degrees: 1 mph of East-West wind = 1 degree of tilt (via RAIN_WIND_TILT_RATIO)
    const tiltDegrees = u * RAIN_WIND_TILT_RATIO;
    
    // Fall path angle: 90 degrees is straight down, < 90 tilts right, > 90 tilts left
    const dropAngleDeg = 90 - tiltDegrees;
    const angleRad = (dropAngleDeg * Math.PI) / 180;
    
    return {
      x: Math.random() * canvas.width,
      y: startY,
      speed: RAIN_DROP_SPEED,
      angleRad: angleRad,
      
      update() {
        this.x += this.speed * Math.cos(this.angleRad);
        this.y += this.speed * Math.sin(this.angleRad);
      },
      
      isOffScreen(endY) {
        const tailLength = window.innerWidth * (RAIN_DROP_TAIL_LENGTH_VW / 100);
        const tailY = this.y - tailLength * Math.sin(this.angleRad);
        return tailY > endY || this.x > canvas.width + tailLength || this.x < -tailLength;
      },
      
      draw(ctx) {
        const tailLength = window.innerWidth * (RAIN_DROP_TAIL_LENGTH_VW / 100);
        const startX = this.x - tailLength * Math.cos(this.angleRad);
        const startYVal = this.y - tailLength * Math.sin(this.angleRad);
        
        const grad = ctx.createLinearGradient(startX, startYVal, this.x, this.y);
        grad.addColorStop(0, `rgba(255, 255, 255, ${RAIN_DROP_TAIL_OPACITY})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${RAIN_DROP_HEAD_OPACITY})`);
        
        ctx.strokeStyle = grad;
        ctx.lineWidth = RAIN_DROP_WIDTH;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(startX, startYVal);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
      }
    };
  }

  let rainCanvasInitialized = false;
  function initRainCanvas() {
    if (rainCanvasInitialized) return;
    rainCanvasInitialized = true;
    const canvas = document.getElementById('weather-rain-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function getRainAreaHeightPx() {
      const isMobile = window.innerWidth <= 767;
      const heightStr = isMobile ? RAIN_AREA_HEIGHT_MOBILE : RAIN_AREA_HEIGHT_DESKTOP;
      const heightVal = parseFloat(heightStr) || 50;
      return Math.round((heightVal / 100) * window.innerWidth);
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = getRainAreaHeightPx();
    }
    window.addEventListener('resize', resize);
    resize();
    
    let activeDrops = [];
    let lastSpawnTime = 0;
    
    function animate(currentTime) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Determine if we should rain. If forceSnow is active, force rain off.
      const shouldRain = (RAIN_ENABLED && isRainingCurrently && !forceSnow) || (forceRain && !forceSnow);
      
      if (shouldRain) {
        const time = currentTime || performance.now();
        if (activeDrops.length === 0) {
          // Pre-populate initial scattered raindrops across the rain area
          const initialCount = Math.min(12, Math.floor(canvas.height / 35));
          for (let i = 0; i < initialCount; i++) {
            activeDrops.push(createDrop(canvas, Math.random() * canvas.height));
          }
        }

        if (time - lastSpawnTime >= currentRainSpawnIntervalMs) {
          activeDrops.push(createDrop(canvas, 0));
          lastSpawnTime = time;
        }
        
        activeDrops = activeDrops.filter(drop => {
          drop.update();
          if (drop.isOffScreen(canvas.height)) {
            return false;
          }
          drop.draw(ctx);
          return true;
        });
      } else {
        activeDrops = [];
      }
      
      requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
  }

  function getActiveDials() {
    const elements = document.querySelectorAll('.clockGridItem, #analog-clock');
    const dials = [];
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const radius = rect.width / 2;
        dials.push({
          cx: rect.left + radius,
          cy: rect.top + radius,
          r: radius
        });
      }
    });
    return dials;
  }

  function createFlake(canvas, startY) {
    const isMobile = window.innerWidth <= 767;
    const radiusMin = isMobile ? SNOW_FLAKE_RADIUS_MIN_MOBILE : SNOW_FLAKE_RADIUS_MIN_DESKTOP;
    const radiusMax = isMobile ? SNOW_FLAKE_RADIUS_MAX_MOBILE : SNOW_FLAKE_RADIUS_MAX_DESKTOP;
    
    // Get current wind parameters from API data
    const windSpeed = lastWeatherData?.current?.wind_speed || 0;
    const windDeg = lastWeatherData?.current?.wind_deg || 0;
    const windDegRad = (windDeg * Math.PI) / 180;
    const u = -windSpeed * Math.sin(windDegRad);
    const windDrift = u * SNOW_WIND_DRIFT_RATIO;

    const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
    const speed = SNOW_FLAKE_SPEED_MIN + Math.random() * (SNOW_FLAKE_SPEED_MAX - SNOW_FLAKE_SPEED_MIN);
    const opacity = SNOW_FLAKE_OPACITY_MIN + Math.random() * (SNOW_FLAKE_OPACITY_MAX - SNOW_FLAKE_OPACITY_MIN);
    
    return {
      x: Math.random() * canvas.width,
      y: startY - radius,
      radius: radius,
      speed: speed,
      opacity: opacity,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.01 + Math.random() * 0.02,
      
      update() {
        this.driftPhase += this.driftSpeed;
        this.x += Math.sin(this.driftPhase) * SNOW_FLAKE_DRIFT_AMPLITUDE + windDrift;
        this.y += this.speed;
      },
      
      isOffScreen(endY) {
        return this.y > endY + this.radius || this.x > canvas.width + this.radius || this.x < -this.radius;
      },
      
      draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
      }
    };
  }

  let snowCanvasInitialized = false;
  function initSnowCanvas() {
    if (snowCanvasInitialized) return;
    snowCanvasInitialized = true;
    const canvas = document.getElementById('weather-snow-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    
    let activeFlakes = [];
    let lastSpawnTime = 0;
    let cachedDials = [];
    let lastDialUpdate = 0;
    
    function animate(currentTime) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Determine if we should snow. If forceRain is active, force snow off.
      const shouldSnow = (SNOW_ENABLED && isSnowingCurrently && !forceRain) || (forceSnow && !forceRain);
      
      if (shouldSnow) {
        const alertsContainer = document.getElementById('alerts-container');
        const rainBanner = document.getElementById('rain-forecast-banner');
        let bannerHeightVw = 0;
        if (alertsContainer) {
          bannerHeightVw += parseFloat(alertsContainer.style.height) || 0;
        }
        if (rainBanner) {
          bannerHeightVw += parseFloat(rainBanner.style.height) || 0;
        }
        
        const startY = (bannerHeightVw / 100) * window.innerWidth;
        const loContainer = document.querySelector('.loContainer');
        const endY = loContainer ? loContainer.getBoundingClientRect().bottom : canvas.height;
        
        const time = currentTime || performance.now();
        if (time - lastSpawnTime >= currentSnowSpawnIntervalMs) {
          activeFlakes.push(createFlake(canvas, startY));
          lastSpawnTime = time;
        }
        
        // Cache dial coordinates to prevent layout thrashing (forced reflows)
        if (time - lastDialUpdate > 1000 || cachedDials.length === 0) {
          cachedDials = getActiveDials();
          lastDialUpdate = time;
        }
        const dials = cachedDials;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, startY, canvas.width, Math.max(0, endY - startY));
        ctx.clip();
        
        // Draw and update falling active flakes, hiding them when inside dial bounds
        activeFlakes = activeFlakes.filter(flake => {
          flake.update();
          
          if (flake.isOffScreen(endY)) {
            return false;
          }
          
          // Masking: Check if flake is inside any dial circle (shrunk by SNOW_DIAL_MASK_PERCENT)
          let isInsideDial = false;
          for (let i = 0; i < dials.length; i++) {
            const d = dials[i];
            const dx = flake.x - d.cx;
            const dy = flake.y - d.cy;
            const maskRadius = d.r * (SNOW_DIAL_MASK_PERCENT / 100);
            // Compare squared distance to avoid Math.sqrt
            if (dx * dx + dy * dy < maskRadius * maskRadius) {
              isInsideDial = true;
              break;
            }
          }
          
          if (!isInsideDial) {
            flake.draw(ctx);
          }
          return true;
        });
        
        ctx.restore();
      } else {
        activeFlakes = [];
      }
      
      requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
  }

  if (document.body) {
    initAlertsContainer();
    initRainCanvas();
    initSnowCanvas();
    initStarfield();
    if (typeof initScrollToTopButton === 'function') initScrollToTopButton();
    // Initialize fragile elements with starting position
    const moon = document.getElementById('moon-phase-img');
    const descImg = document.getElementById('weather-desc-image');
    const descImgLeft = document.getElementById('weather-desc-image-left');
    const windArrow = document.getElementById('wind-direction-arrow');
    const clockHands = document.getElementById('analog-clock');
    const baroGauge = document.getElementById('barometric-pressure-gauge');
    const gradientUpper = document.querySelector('.scrolling-gradient-overlay');
    const gradientLower = document.querySelector('.scrolling-gradient-overlay-lower');
    const starfieldContainer = document.getElementById('starfield-container');
    const rainCanvas = document.getElementById('weather-rain-canvas');
    if (moon) moon.style.setProperty('--alert-push', '0vw');
    if (descImg) descImg.style.setProperty('--alert-push', '0vw');
    if (descImgLeft) descImgLeft.style.setProperty('--alert-push', '0vw');
    if (windArrow) windArrow.style.setProperty('--alert-push', '0vw');
    if (clockHands) clockHands.style.setProperty('--alert-push', '0vw');
    if (baroGauge) baroGauge.style.setProperty('--alert-push', '0vw');
    if (gradientUpper) gradientUpper.style.setProperty('--alert-push', '0vw');
    if (gradientLower) gradientLower.style.setProperty('--alert-push', '0vw');
    if (starfieldContainer) starfieldContainer.style.setProperty('--alert-push', '0vw');
    if (rainCanvas) rainCanvas.style.setProperty('--alert-push', '0vw');
    const btnBottom = document.getElementById('scroll-to-bottom-btn');
    if (btnBottom) btnBottom.style.setProperty('--alert-push', '0vw');
    document.documentElement.style.setProperty('--alert-push', '0vw');
    setTimeout(() => document.body.classList.add('transitions-ready'), 100);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      initAlertsContainer();
      initRainCanvas();
      initSnowCanvas();
      initStarfield();
      if (typeof initScrollToTopButton === 'function') initScrollToTopButton();
      if (typeof initScrollToBottomButton === 'function') initScrollToBottomButton();
      // Initialize fragile elements with starting position
      const moon = document.getElementById('moon-phase-img');
      const descImg = document.getElementById('weather-desc-image');
      const descImgLeft = document.getElementById('weather-desc-image-left');
      const windArrow = document.getElementById('wind-direction-arrow');
      const clockHands = document.getElementById('analog-clock');
      const baroGauge = document.getElementById('barometric-pressure-gauge');
      const gradientUpper = document.querySelector('.scrolling-gradient-overlay');
      const gradientLower = document.querySelector('.scrolling-gradient-overlay-lower');
      const starfieldContainer = document.getElementById('starfield-container');
      const rainCanvas = document.getElementById('weather-rain-canvas');
      if (moon) moon.style.setProperty('--alert-push', '0vw');
      if (descImg) descImg.style.setProperty('--alert-push', '0vw');
      if (descImgLeft) descImgLeft.style.setProperty('--alert-push', '0vw');
      if (windArrow) windArrow.style.setProperty('--alert-push', '0vw');
      if (clockHands) clockHands.style.setProperty('--alert-push', '0vw');
      if (baroGauge) baroGauge.style.setProperty('--alert-push', '0vw');
      if (gradientUpper) gradientUpper.style.setProperty('--alert-push', '0vw');
      if (gradientLower) gradientLower.style.setProperty('--alert-push', '0vw');
      if (starfieldContainer) starfieldContainer.style.setProperty('--alert-push', '0vw');
      if (rainCanvas) rainCanvas.style.setProperty('--alert-push', '0vw');
      const btnBottomDom = document.getElementById('scroll-to-bottom-btn');
      if (btnBottomDom) btnBottomDom.style.setProperty('--alert-push', '0vw');
      document.documentElement.style.setProperty('--alert-push', '0vw');
      setTimeout(() => document.body.classList.add('transitions-ready'), 100);
    });
  }








  // Helper function to update the position of fragile elements based on total banner height
  // Store the current wind arrow rotation globally so we can reapply it
  let currentWindArrowRotation = 0;

  function updateFragileElementsPosition() {
    const alertsContainer = document.getElementById('alerts-container');
    const rainBanner = document.getElementById('rain-forecast-banner');
    
    // Calculate total banner height
    let totalHeight = 0;
    
    if (alertsContainer) {
      const alertHeight = parseFloat(alertsContainer.style.height) || 0;
      totalHeight += alertHeight;
    }
    
    if (rainBanner) {
      const rainHeight = parseFloat(rainBanner.style.height) || 0;
      totalHeight += rainHeight;
    }
    
    // Update the fragile elements
    const moon = document.getElementById('moon-phase-img');
    const descImg = document.getElementById('weather-desc-image');
    const windArrow = document.getElementById('wind-direction-arrow');
    const clockHands = document.getElementById('analog-clock');
    const baroGauge = document.getElementById('barometric-pressure-gauge');
    const gradientUpper = document.querySelector('.scrolling-gradient-overlay');
    const gradientLower = document.querySelector('.scrolling-gradient-overlay-lower');
    const starfieldContainer = document.getElementById('starfield-container');
    
    const pushValue = `${totalHeight}vw`;
    
    if (moon) {
      moon.style.setProperty('--alert-push', pushValue);
    }
    if (descImg) {
      descImg.style.setProperty('--alert-push', pushValue);
    }
    const descImgLeft = document.getElementById('weather-desc-image-left');
    if (descImgLeft) {
      descImgLeft.style.setProperty('--alert-push', pushValue);
    }
    if (windArrow) {
      windArrow.style.setProperty('--alert-push', pushValue);
      // Only set CSS variable, don't override transform - let CSS transition handle the animation
    }
    if (clockHands) {
      clockHands.style.setProperty('--alert-push', pushValue);
    }
    if (baroGauge) {
      baroGauge.style.setProperty('--alert-push', pushValue);
    }
    if (gradientUpper) {
      gradientUpper.style.setProperty('--alert-push', pushValue);
    }
    if (gradientLower) {
      gradientLower.style.setProperty('--alert-push', pushValue);
    }
    if (starfieldContainer) {
      starfieldContainer.style.setProperty('--alert-push', pushValue);
    }
    const rainCanvas = document.getElementById('weather-rain-canvas');
    if (rainCanvas) {
      rainCanvas.style.setProperty('--alert-push', pushValue);
    }
    const btnBottom = document.getElementById('scroll-to-bottom-btn');
    if (btnBottom) {
      btnBottom.style.setProperty('--alert-push', pushValue);
    }
    document.documentElement.style.setProperty('--alert-push', pushValue);
    updateLowerGradientPosition();
    setTimeout(updateStarfieldMask, 50);
    setTimeout(updateStarfieldMask, 1050);
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_2709_4_2709_67_4`,`Fragile elements pushed down by ${totalHeight}vw`));
  }

  // Helper: Formats screaming ALL-CAPS NWS text into readable sentence case with paragraphs
  function formatNwsText(text, alertColor) {
    if (!text) return 'No detailed description available.';
    
    // Replace actual double line breaks with a temporary marker to save paragraphs
    let processed = text.replace(/\n{2,}/g, ' @@@ ');
    // Ensure any NWS bullet points (asterisks) force a paragraph break before them
    processed = processed.replace(/(?:\s|\n)*\*\s+/g, ' @@@ * ');
    // Replace single line breaks with spaces so sentences don't arbitrarily wrap mid-screen
    processed = processed.replace(/\n/g, ' ');
    // Make everything lowercase
    processed = processed.toLowerCase();
    // Capitalize the first letter of each sentence
    processed = processed.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, separator, letter) => {
      return separator + letter.toUpperCase();
    });
    
    // --- EDITABLE: Dictionary of Proper Nouns to Capitalize ---
    const properNouns = [
      // States & Regions
      "Oklahoma", "Kansas", "Arkansas", "Missouri", "Texas", "Osage Nation", "AR", "KS", "MO", "TX",
      // Local Counties
      "Tulsa", "Osage", "Washington", "Nowata", "Craig", "Ottawa", "Pawnee", "Delaware", "Adair",
      "Creek", "Mayes", "Rogers", "Cherokee", "Wagoner", "Okmulgee", "Muskogee", "McIntosh", 
      "Sequoyah", "Okfuskee", "Hughes", "Lincoln", "Payne", "Garfield", "Noble", "Benton", "Carroll", "Madison", 
      // Local Cities
      "Broken Arrow", "Owasso", "Bixby", "Jenks", "Sand Springs", "Sapulpa", "Claremore", "Jenks Riverside Airport", "Bentonville", "Berryville", "Eufaula", "Tulsa International Airport", "Eureka Springs", "Fayetteville", "Grove", "Huntsville", "Okemah", "Springdale", "Stilwell", "Pittsburg", "Bartlesville", "McAlester", "Tahlequah", "Miami", "Vinita", "Pryor", "Jay", "Pawhuska", 
      // Acronyms & Weather Terms
      "NWS", "CDT", "CST", "Doppler", "National Weather Service", "OK",
      // Days & Months
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
      "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ];
    
    // Hunt for our proper nouns and force them to capitalize correctly
    properNouns.forEach(noun => {
      // \b means "word boundary", so it doesn't accidentally capitalize "tulsa" inside another word
      const regex = new RegExp(`\\b${noun}\\b`, 'gi');
      processed = processed.replace(regex, noun);
    });
    
      // Restore our paragraphs with actual HTML p tags for margin control
      // We use @@@ securely because it is immune to the capitalization routines
      processed = '<p>' + processed.replace(/\s*@@@\s*/g, '</p><p>') + '</p>';

      // Clean up any empty or spacer paragraphs (handles NWS formatting glitches, invisible lines, and standalone punctuation like "...")
      processed = processed.replace(/<p>[\s\S]*?<\/p>/gi, (match) => {
        const textOnly = match.replace(/<[^>]+>/g, '').replace(/&[a-zA-Z0-9#]+;/gi, '').trim();
        if (textOnly.replace(/[^a-zA-Z0-9]/g, '') === '') {
          return '';
        }
        return match;
      });

      // Ensure the first letter of every paragraph is capitalized, ignoring leading punctuation (e.g., "...")
      processed = processed.replace(/<p>([^a-zA-Z]*)([a-z])/g, (match, nonLetters, letter) => '<p>' + nonLetters + letter.toUpperCase());
    
      // Convert NWS asterisks at the start of paragraphs into styled bullet points
      const bulletColorAttr = alertColor ? ` style="color: ${alertColor};"` : '';
      processed = processed.replace(/<p>\s*\*\s+/gi, `<p class="alert-bullet"><span class="heavy-bullet"${bulletColorAttr}>&bull;</span>&nbsp;&nbsp;`);

      // Add colons to squished NWS times (e.g. "1115 am" -> "11:15 am")
      processed = processed.replace(/\b([1-9]|1[0-2])([0-5][0-9])\s*(am|pm)\b/gi, '$1:$2 $3');

      // Apply the italic font style to any entire paragraph that begins with "In ", handling unexpected lowercase "in"
      processed = processed.replace(/<p>\s*([^a-zA-Z]*)(In\b)/gi, '<p style="font-family: \'ital\', sans-serif; color: white;">$1In');

      // Delete timezone abbreviations FIRST so they don't intercept our time phrases!
      processed = processed.replace(/\s*\b(?:CST|CDT)\b/gi, '');

      // Emphasize the word "Tulsa" using the bold font-family
      processed = processed.replace(/\bTulsa\b/g, '<span style="font-family: \'bold\', sans-serif; color: white; font-size: 1em !important;">Tulsa</span>');

      // Emphasize time phrases including the day or time-of-day that follows (e.g. "until 9 pm this evening", "until 6 am tuesday")
      processed = processed.replace(/(\buntil\s+\d{1,2}(?::?\d{2})?\s*(?:am|pm)(?:\s+(?:this\s+morning|this\s+afternoon|this\s+evening|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday))?)\b/gi, '<span style="font-family: \'bold\', sans-serif; color: white; font-size: 1em !important;">$1</span>');

      // Convert short "In " regional headers (8 words or fewer) to use a soft return, merging them with the next paragraph.
      // We capture the exact style applied to the <p> and move it to a <span> so it doesn't bleed into the merged text.
      processed = processed.replace(/<p (style="[^"]*")>([\s\S]*?)<\/p>\s*<p([^>]*)>/g, (match, styleAttr, pContent, nextPAttr) => {
        let textOnly = pContent.replace(/<[^>]+>/g, ' '); // Strip HTML tags safely into spaces
        textOnly = textOnly.replace(/&[a-zA-Z0-9#]+;/gi, ' '); // Handle HTML entities like &nbsp;
        textOnly = textOnly.replace(/[^a-zA-Z0-9\s]/g, '').trim(); // Strip ALL punctuation to ensure a strict, bulletproof word count
        
        if (textOnly.match(/^In\b/i)) {
          // Filter out empty strings to ensure accurate array counting
          const words = textOnly.split(/\s+/).filter(w => w.length > 0);
          if (words.length > 0 && words.length <= 8) {
            // Safely inject font-size: 1em !important; to protect the span from rogue global CSS rules
            const spanStyle = styleAttr.replace('style="', 'style="font-size: 1em !important; ');
            return `<p${nextPAttr}><span ${spanStyle}>${pContent}</span><br>`;
          }
        }
        return match;
      });

      // Style 1-3 intro words and the "..." at the start of a paragraph with font-family 'medium' and white color
      processed = processed.replace(/(<p[^>]*>(?:<span[^>]*>&bull;<\/span>&nbsp;&nbsp;)?\s*)([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+){0,2})\s*(\.{3,})/gi, (match, prefix, words, dots) => {
        return `${prefix}<span style="font-family: 'medium', sans-serif; font-weight: normal !important; color: white;">${words}${dots}</span>`;
      });

      // Expand tight NWS ellipses "..." into unbreakable spaced dots with a trailing space for readability
      processed = processed.replace(/\.{3,}/g, '.&nbsp;.&nbsp;. ');

    return processed;
  }

  // Helper: Opens the full-screen modal showing the verbose alert text
  function openAlertModal(alert, color, icon) {
    let overlay = document.getElementById('alert-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'alert-modal-overlay';
      document.body.appendChild(overlay);
      // Close when clicking the dark background
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    }
    
    const title = alert.event || 'Weather Alert';
    
    // Format title: place a non-breaking space after word 2 in a typical advisory
    let titleArr = title.toUpperCase().split(' ');
    if (titleArr.length > 2) {
      titleArr[1] = titleArr[1] + '&nbsp;' + titleArr[2];
      titleArr.splice(2, 1);
    }
    const displayTitle = titleArr.join(' ');

    const formattedText = formatNwsText(alert.description, color);

    // EDITABLE: Modal icon properties
    const modalIconSize = '10vw';
    const modalIconMarginTop = '0vw';
    const modalIconMarginBottom = '2vw';
    
    const isTempDrop = (alert.event || '').toUpperCase().includes('TEMPERATURE DROP ADVISORY');
    const modalIconTransform = isTempDrop ? ` transform: ${ALERT_DROP_ICON_TRANSFORM};` : '';

    // Icon element using CSS mask to colorize the SVG to match the alert color
    const iconElement = icon ? `
      <div style="
        width: ${modalIconSize}; 
        height: ${modalIconSize}; 
        margin: ${modalIconMarginTop} auto ${modalIconMarginBottom} auto;
        background-color: ${color};
        -webkit-mask-image: url('${icon}');
        -webkit-mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-image: url('${icon}');
        mask-size: contain;
        mask-repeat: no-repeat;
        mask-position: center;${modalIconTransform}
      "></div>
    ` : '';
    
    overlay.innerHTML = `
      <div class="alert-modal-content" style="border-top: 1.5vw solid ${color};">
        <div class="alert-modal-close" onclick="document.getElementById('alert-modal-overlay').classList.remove('active')">&times;</div>
        ${iconElement}
        <div class="alert-modal-title" style="color: ${color};">${displayTitle}</div>
        <div class="alert-modal-body">${formattedText}</div>
      </div>
    `;
    
    // Force browser reflow to guarantee CSS transition plays, then show
    void overlay.offsetWidth;
    overlay.classList.add('active');
  }

  // Evaluates whether a popular annual meteor shower is observable and meets moon & cloud requirements
  function checkMeteorShowerConditions(data) {
    if (!data) return { active: false, state: null, shower: null };

    // Support Test Mode override: ONLY active if an explicit test toggle is true in code or console
    const effectiveTestMode = (() => {
      if (TEST_SHOW_METEOR_LIVE_PREVIEW || METEOR_SHOWER_TEST_MODE === 'occurring') {
        return 'occurring';
      }
      if (TEST_SHOW_METEOR_COUNTDOWN_PREVIEW || METEOR_SHOWER_TEST_MODE === 'coming') {
        return 'coming';
      }
      return null;
    })();

    if (effectiveTestMode === 'occurring') {
      const testShower = POPULAR_METEOR_SHOWERS[3]; // Perseid
      const nowSec = Math.floor(Date.now() / 1000);
      return {
        active: true,
        state: 'OCCURRING',
        shower: testShower,
        viewingStart: nowSec - 3600,
        viewingEnd: nowSec + 4 * 3600
      };
    } else if (effectiveTestMode === 'coming') {
      const testShower = POPULAR_METEOR_SHOWERS[3]; // Perseid
      const nowMs = Date.now();
      const targetTimeMs = nowMs + 4 * 3600 * 1000;
      return {
        active: true,
        state: 'COMING',
        shower: testShower,
        viewingStart: Math.floor(targetTimeMs / 1000),
        viewingEnd: Math.floor((targetTimeMs + 5 * 3600 * 1000) / 1000)
      };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const userLat = typeof LAT === 'number' ? LAT : (data.lat ?? 36.15);
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate(); // 1-31

    // Find any popular meteor shower active today/tonight in user's area
    const matchingShower = POPULAR_METEOR_SHOWERS.find(s => {
      // Check latitude coverage (Northern vs Southern hemisphere)
      if (userLat < s.minLat || userLat > s.maxLat) return false;

      // Check date range (allowing 1 day buffer around peak nights)
      if (currentMonth === s.peakMonth) {
        return (currentDay >= s.peakStartDay - 1 && currentDay <= s.peakEndDay + 1);
      }
      return false;
    });

    if (!matchingShower) {
      return { active: false, state: null, shower: null };
    }

    const isPhone = window.innerWidth < 768;
    const moonMin1 = isPhone ? METEOR_SHOWER_MOON_PHASE_MIN_WINDOW_1_MOBILE : METEOR_SHOWER_MOON_PHASE_MIN_WINDOW_1_DESKTOP;
    const moonMax1 = isPhone ? METEOR_SHOWER_MOON_PHASE_MAX_WINDOW_1_MOBILE : METEOR_SHOWER_MOON_PHASE_MAX_WINDOW_1_DESKTOP;
    const moonMin2 = isPhone ? METEOR_SHOWER_MOON_PHASE_MIN_WINDOW_2_MOBILE : METEOR_SHOWER_MOON_PHASE_MIN_WINDOW_2_DESKTOP;
    const moonMax2 = isPhone ? METEOR_SHOWER_MOON_PHASE_MAX_WINDOW_2_MOBILE : METEOR_SHOWER_MOON_PHASE_MAX_WINDOW_2_DESKTOP;
    const maxClouds = isPhone ? METEOR_SHOWER_MAX_CLOUD_COVER_MOBILE : METEOR_SHOWER_MAX_CLOUD_COVER_DESKTOP;
    const countdownHours = isPhone ? METEOR_SHOWER_COUNTDOWN_HOURS_MOBILE : METEOR_SHOWER_COUNTDOWN_HOURS_DESKTOP;
    const countdownWindowSec = countdownHours * 3600;

    // 1. Moon phase check: (0 <= phase <= 0.35) || (0.65 <= phase <= 1.0)
    // Avoid bright waxing/waning gibbous and full moon (0.35 - 0.65)
    const todayMoonPhase = data.daily?.[0]?.moon_phase;
    if (typeof todayMoonPhase === 'number') {
      const isMoonDark = (todayMoonPhase >= moonMin1 && todayMoonPhase <= moonMax1) ||
                         (todayMoonPhase >= moonMin2 && todayMoonPhase <= moonMax2);
      if (!isMoonDark) {
        // Moon too bright! Condition failed -> no banners
        return { active: false, state: null, shower: matchingShower };
      }
    }

    // 2. Nighttime & Cloud Cover Check
    const todaySunset = data.daily?.[0]?.sunset ?? data.current?.sunset;
    const todaySunrise = data.daily?.[0]?.sunrise ?? data.current?.sunrise;
    const tomorrowSunrise = data.daily?.[1]?.sunrise ?? (todaySunrise ? todaySunrise + 86400 : null);

    const isCurrentlyNight = (todaySunset && todaySunrise)
      ? (nowSec >= todaySunset || nowSec < todaySunrise)
      : (new Date().getHours() >= 20 || new Date().getHours() < 6);

    const currentClouds = data.current?.clouds ?? 0;

    // Check if OCCURRING right now: night + clear skies (<= 30% clouds)
    if (isCurrentlyNight && currentClouds <= maxClouds) {
      return {
        active: true,
        state: 'OCCURRING',
        shower: matchingShower,
        viewingStart: todaySunset || nowSec,
        viewingEnd: (nowSec < todaySunrise ? todaySunrise : tomorrowSunrise) || (nowSec + 4 * 3600)
      };
    }

    // Check upcoming hourly forecast for a clear viewing window
    const hourlyList = data.hourly || [];
    let firstClearHourSec = null;
    let clearHourEndSec = null;

    for (let i = 0; i < hourlyList.length; i++) {
      const h = hourlyList[i];
      if (!h || typeof h.dt !== 'number') continue;
      if (h.dt < nowSec) continue;

      const hDate = new Date(h.dt * 1000);
      const hHour = hDate.getHours();
      const isHourAtNight = (hHour >= 20 || hHour < 6);

      if (isHourAtNight && typeof h.clouds === 'number' && h.clouds <= maxClouds) {
        if (firstClearHourSec === null) {
          firstClearHourSec = h.dt;
          clearHourEndSec = h.dt + 3600;
        } else if (h.dt === clearHourEndSec) {
          clearHourEndSec = h.dt + 3600;
        }
      } else if (firstClearHourSec !== null) {
        break;
      }
    }

    if (firstClearHourSec !== null) {
      const diffSec = firstClearHourSec - nowSec;
      if (diffSec > 0 && diffSec <= countdownWindowSec) {
        return {
          active: true,
          state: 'COMING',
          shower: matchingShower,
          viewingStart: firstClearHourSec,
          viewingEnd: clearHourEndSec || (firstClearHourSec + 3 * 3600)
        };
      }
    }

    return { active: false, state: null, shower: matchingShower };
  }

  // Create and update dynamic alert banners from OpenWeather API
  function updateAlerts(data) {
    const rawAlerts = data.alerts || [];
    const now = Math.floor(Date.now() / 1000);
    
    // Deduplicate alerts by event name to prevent showing the exact same warning twice
    // (The National Weather Service often issues overlapping polygons for the same storm)
    const alerts = [];
    const seenEvents = new Set();
    rawAlerts.forEach(alert => {
      if (alert && alert.event) {
        // Skip alert if it has already expired
        const expiration = Number(alert.end);
        if (!isNaN(expiration) && expiration <= now) {
          return;
        }

        // Force uppercase and strip hidden spaces/newlines to guarantee reliable deduplication
        const normalizedEvent = alert.event.toUpperCase().trim();
        if (!seenEvents.has(normalizedEvent)) {
          seenEvents.add(normalizedEvent);
          alerts.push(alert);
        }
      }
    });

    // Add season countdown alerts if within 24 hours of starting
    const seasonEvents = {
      2025: {
        SPRING: "2025-03-20T09:01:00Z",
        SUMMER: "2025-06-20T22:42:00Z",
        FALL:   "2025-09-22T14:19:00Z",
        WINTER: "2025-12-21T10:03:00Z"
      },
      2026: {
        SPRING: "2026-03-20T14:02:00Z",
        SUMMER: "2026-06-21T07:42:00Z",
        FALL:   "2026-09-22T21:05:00Z",
        WINTER: "2026-12-21T19:50:00Z"
      },
      2027: {
        SPRING: "2027-03-20T19:59:00Z",
        SUMMER: "2027-06-21T13:42:00Z",
        FALL:   "2027-09-23T03:01:00Z",
        WINTER: "2027-12-21T01:42:00Z"
      },
      2028: {
        SPRING: "2028-03-20T01:45:00Z",
        SUMMER: "2028-06-20T19:41:00Z",
        FALL:   "2028-09-22T08:45:00Z",
        WINTER: "2028-12-21T07:33:00Z"
      },
      2029: {
        SPRING: "2029-03-20T07:37:00Z",
        SUMMER: "2029-06-21T01:29:00Z",
        FALL:   "2029-09-22T14:37:00Z",
        WINTER: "2029-12-21T13:13:00Z"
      },
      2030: {
        SPRING: "2030-03-20T13:28:00Z",
        SUMMER: "2030-06-21T07:30:00Z",
        FALL:   "2030-09-22T20:27:00Z",
        WINTER: "2030-12-21T19:09:00Z"
      }
    };

    // (TEST_SHOW_SEASON_COUNTDOWN_PREVIEW is defined at the top of the file as a JCV)

    const nowMs = Date.now();
    const nowYear = new Date().getUTCFullYear();
    const yearEvents = seasonEvents[nowYear];

    if (yearEvents) {
      const testPreviewActive = (() => {
        try {
          return new URLSearchParams(window.location.search).has('testSeason') || TEST_SHOW_SEASON_COUNTDOWN_PREVIEW;
        } catch(e) {
          return TEST_SHOW_SEASON_COUNTDOWN_PREVIEW;
        }
      })();

      for (let [seasonName, eventIsoStr] of Object.entries(yearEvents)) {
        let eventTimeMs = Date.parse(eventIsoStr);
        let diffMs = eventTimeMs - nowMs;

        // For testing/preview mode, if active, force the FALL starts countdown to be 19 hours away
        if (testPreviewActive && seasonName === 'FALL') {
          eventTimeMs = nowMs + 19 * 60 * 60 * 1000 + 120000; // 19 hours and 2 minutes
          diffMs = eventTimeMs - nowMs;
        }

        // Active only during the 24 hours countdown BEFORE the exact start of the season
        if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
          const diffMinutes = Math.ceil(diffMs / 60000);
          let countdownStr = "";
          
          if (diffMinutes >= 60) {
            const hours = Math.floor(diffMinutes / 60);
            countdownStr = `in ${hours} hour${hours > 1 ? 's' : ''}`;
          } else {
            countdownStr = `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
          }

          const localTime = new Date(eventTimeMs);
          const localTimeStr = localTime.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          }) + " at " + localTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          // Push season countdown to the alerts array
          alerts.push({
            event: `${seasonName} STARTS`,
            countdown: countdownStr,
            sender_name: "Astronomical Season Countdown",
            start: Math.floor(nowMs / 1000),
            end: Math.floor(eventTimeMs / 1000),
            description: `The astronomical beginning of ${seasonName.charAt(0) + seasonName.slice(1).toLowerCase()} is approaching:
            
• Exact Local Start: ${localTimeStr}
• Time Remaining: ${countdownStr}

Prepare for the seasonal transition!`
          });
        }
      }
    }

    // --- METEOR SHOWER LIVE EVENT & WARNING BANNER ---
    const meteorEvent = checkMeteorShowerConditions(data);
    if (meteorEvent && meteorEvent.active && meteorEvent.shower) {
      const shower = meteorEvent.shower;
      const viewingStart = meteorEvent.viewingStart;
      const viewingEnd = meteorEvent.viewingEnd;

      if (meteorEvent.state === 'OCCURRING') {
        setMeteorShowerOccurring(true);

        const localStartStr = new Date(viewingStart * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const localEndStr = new Date(viewingEnd * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        alerts.push({
          event: `${shower.name.toUpperCase()} ${METEOR_SHOWER_OCCURRING_LABEL}`,
          sender_name: "Astronomical Meteor Shower Alert",
          start: viewingStart,
          end: viewingEnd,
          description: `The ${shower.fullName} is currently active and visually observable under optimal clear, dark skies!

• Status: Prime visual viewing window open NOW
• Sky Conditions: Favorable (<= 30% cloud cover)
• Moon Illumination: Dark skies (minimal moonlight interference)
• Radiant Constellation: Look toward ${shower.radiant}
• Peak Activity: Up to ~${shower.peakRatePerHour} meteors per hour

${shower.description}

Viewing Tips:
Lie flat on your back away from city lights, allowing 20-30 minutes for your eyes to adjust to the darkness. No telescope or binoculars required—shooting stars streak across wide expanses of the night sky.`
        });
      } else if (meteorEvent.state === 'COMING') {
        setMeteorShowerOccurring(false);

        const diffSec = Math.max(0, viewingStart - now);
        const diffMinutes = Math.ceil(diffSec / 60);
        let countdownStr = "";
        if (diffMinutes >= 60) {
          const hours = Math.floor(diffMinutes / 60);
          countdownStr = `in ${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
          countdownStr = `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
        }

        const localTime = new Date(viewingStart * 1000);
        const localTimeStr = localTime.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }) + " at " + localTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        alerts.push({
          event: `${shower.name.toUpperCase()} ${METEOR_SHOWER_COMING_LABEL}`,
          countdown: countdownStr,
          sender_name: "Astronomical Meteor Shower Alert",
          start: now,
          end: viewingStart,
          description: `The ${shower.fullName} is approaching prime viewing conditions in your area!

• Expected Viewing Window: Starts ${localTimeStr} (${countdownStr})
• Forecasted Skies: Clear (<= 30% cloud cover)
• Moon Illumination: Favorable dark skies
• Radiant Constellation: ${shower.radiant}
• Peak Activity: Up to ~${shower.peakRatePerHour} meteors per hour

${shower.description}

Prepare ahead: Scout a dark viewing location away from direct streetlights for the best viewing experience.`
        });
      }
    } else {
      setMeteorShowerOccurring(false);
    }

    // Check if Great / Nice Weather Advisory conditions are met (Using "Feels Like" temperature)
    const currentFeelsLike = data.current?.feels_like ?? data.current?.temp;
    const humidity = data.current?.humidity;
    const windSpeed = data.current?.wind_speed;
    const sunrise = data.daily?.[0]?.sunrise;
    const sunset = data.daily?.[0]?.sunset;
    const weatherId = data.current?.weather?.[0]?.id;
    const weatherDesc = data.current?.weather?.[0]?.description || '';
    
    // Extended daylight rule: Permits activation during daylight plus 1-hr twilight buffer (1hr before sunrise to 1hr after sunset).
    // Deep night (outside this window) is strictly blocked.
    const daylightBufferSec = GREAT_WEATHER_DAYLIGHT_BUFFER_HOURS * 3600;
    const isDaylightOrTwilight = (typeof sunrise === 'number' && typeof sunset === 'number') 
      ? (now >= (sunrise - daylightBufferSec) && now < (sunset + daylightBufferSec)) 
      : true; // fallback to true if sunrise/sunset timestamps are unavailable

    const hasPrecipitation = (typeof weatherId === 'number' && weatherId >= 200 && weatherId < 700) ||
                             (data.current?.rain && Object.keys(data.current.rain).length > 0) ||
                             (data.current?.snow && Object.keys(data.current.snow).length > 0);

    // Exclude fog, haze, smoke, or dust (weather IDs 701-781)
    const isBadAtmosphere = typeof weatherId === 'number' && weatherId >= 700 && weatherId < 800;

    // 1. GREAT WEATHER ADVISORY (Personal Ideal: Requires Cloud Shade / No harsh total sun)
    const isGreatWeather = 
      typeof currentFeelsLike === 'number' && 
      currentFeelsLike >= GREAT_WEATHER_TEMP_MIN && 
      currentFeelsLike <= GREAT_WEATHER_TEMP_MAX &&
      isDaylightOrTwilight &&
      typeof humidity === 'number' && 
      humidity < GREAT_WEATHER_HUMIDITY_MAX &&
      typeof windSpeed === 'number' && 
      windSpeed < GREAT_WEATHER_WIND_MAX &&
      weatherDesc.toLowerCase().trim() !== 'clear sky' && // Personal rule: Require cloud shade
      !isBadAtmosphere &&
      !hasPrecipitation;

    // 2. NICE WEATHER ADVISORY (Broader: Permits Clear Skies / Total Sun)
    const isNiceWeather = 
      typeof currentFeelsLike === 'number' && 
      currentFeelsLike >= NICE_WEATHER_TEMP_MIN && 
      currentFeelsLike <= NICE_WEATHER_TEMP_MAX &&
      isDaylightOrTwilight &&
      typeof humidity === 'number' && 
      humidity <= NICE_WEATHER_HUMIDITY_MAX &&
      typeof windSpeed === 'number' && 
      windSpeed <= NICE_WEATHER_WIND_MAX &&
      !isBadAtmosphere &&
      !hasPrecipitation;

    // Helper function to scan upcoming hourly forecasts and find when conditions break
    function getAdvisoryExpirationTimestamp(isGreatMode) {
      const maxExpiration = (typeof sunset === 'number') ? sunset + daylightBufferSec : null;
      if (!data.hourly || data.hourly.length === 0) return maxExpiration;

      const tempMin = isGreatMode ? GREAT_WEATHER_TEMP_MIN : NICE_WEATHER_TEMP_MIN;
      const tempMax = isGreatMode ? GREAT_WEATHER_TEMP_MAX : NICE_WEATHER_TEMP_MAX;
      const humMax  = isGreatMode ? GREAT_WEATHER_HUMIDITY_MAX : NICE_WEATHER_HUMIDITY_MAX;
      const windMax = isGreatMode ? GREAT_WEATHER_WIND_MAX : NICE_WEATHER_WIND_MAX;

      // Filter upcoming hourly blocks for today
      for (const h of data.hourly) {
        if (!h.dt || h.dt <= now) continue;

        // If forecast hour reaches or exceeds twilight end (sunset + 1hr), cap at twilight end
        if (maxExpiration && h.dt >= maxExpiration) {
          return maxExpiration;
        }

        const hFeelsLike = h.feels_like ?? h.temp;
        const hHum = h.humidity;
        const hWind = h.wind_speed;
        const hWeatherId = h.weather?.[0]?.id;
        const hWeatherDesc = h.weather?.[0]?.description || '';
        const hPop = h.pop || 0;

        const hPrecip = (typeof hWeatherId === 'number' && hWeatherId >= 200 && hWeatherId < 700) ||
                        (h.rain && Object.keys(h.rain).length > 0) ||
                        (h.snow && Object.keys(h.snow).length > 0) ||
                        hPop >= 0.3; // 30%+ rain chance counts as incoming rain

        const hBadAtmosphere = typeof hWeatherId === 'number' && hWeatherId >= 700 && hWeatherId < 800;

        let passes = 
          typeof hFeelsLike === 'number' && hFeelsLike >= tempMin && hFeelsLike <= tempMax &&
          typeof hHum === 'number' && hHum <= humMax &&
          typeof hWind === 'number' && hWind <= windMax &&
          !hBadAtmosphere &&
          !hPrecip;

        if (isGreatMode && hWeatherDesc.toLowerCase().trim() === 'clear sky') {
          passes = false;
        }

        // If conditions break in this upcoming hour, this hour's start time is when the advisory expires!
        if (!passes) {
          return h.dt;
        }
      }

      return maxExpiration;
    }

    if (isGreatWeather) {
      const displayFeelsLike = Math.round(currentFeelsLike);
      const displayHum = Math.round(humidity);
      const displayWind = Math.round(windSpeed);
      const endTimestamp = getAdvisoryExpirationTimestamp(true);
      const expireStr = endTimestamp
        ? new Date(endTimestamp * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : 'Sundown';

      alerts.push({
        event: "GREAT WEATHER ADVISORY",
        sender_name: "Local Observations",
        start: now,
        end: endTimestamp,
        description: `Current conditions are exceptionally pleasant:
• Feels Like: ${displayFeelsLike}°F
• Humidity: ${displayHum}%
• Wind Speed: ${displayWind} mph
• Sky: Cloud Shade
• Expires: ${expireStr}

Perfect shaded weather to head outdoors and enjoy the day!`
      });
    } else if (isNiceWeather) {
      const displayFeelsLike = Math.round(currentFeelsLike);
      const displayHum = Math.round(humidity);
      const displayWind = Math.round(windSpeed);
      const endTimestamp = getAdvisoryExpirationTimestamp(false);
      const expireStr = endTimestamp
        ? new Date(endTimestamp * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : 'Sundown';

      alerts.push({
        event: "NICE WEATHER ADVISORY",
        sender_name: "Local Observations",
        start: now,
        end: endTimestamp,
        description: `Current conditions are nice and pleasant:
• Feels Like: ${displayFeelsLike}°F
• Humidity: ${displayHum}%
• Wind Speed: ${displayWind} mph
• Expires: ${expireStr}

Great weather to head outdoors!`
      });
    }
    
    // Check for Temperature Drop/Rise Advisory (Tomorrow's High/Low differs 15+ from Today's High/Low)
    const todayDaily = data.daily?.[0];
    const tomorrowDaily = data.daily?.[1];

    if (todayDaily?.temp && tomorrowDaily?.temp) {
      const todayHigh = todayDaily.temp.max;
      const todayLow = todayDaily.temp.min;
      const tomorrowHigh = tomorrowDaily.temp.max;
      const tomorrowLow = tomorrowDaily.temp.min;

      if (
        typeof todayHigh === 'number' && typeof todayLow === 'number' &&
        typeof tomorrowHigh === 'number' && typeof tomorrowLow === 'number'
      ) {
        const diffHigh = tomorrowHigh - todayHigh;
        const diffLow = tomorrowLow - todayLow;

        const isHighDrop = diffHigh <= -TEMP_CHANGE_ADVISORY_THRESHOLD;
        const isHighRise = diffHigh >= TEMP_CHANGE_ADVISORY_THRESHOLD;
        const isLowDrop = diffLow <= -TEMP_CHANGE_ADVISORY_THRESHOLD;
        const isLowRise = diffLow >= TEMP_CHANGE_ADVISORY_THRESHOLD;

        const hasDrop = isHighDrop || isLowDrop;
        const hasRise = isHighRise || isLowRise;

        if (hasDrop || hasRise) {
          let eventTitle = "TEMPERATURE DROP ADVISORY";
          if (hasDrop && hasRise) {
            eventTitle = "TEMPERATURE DROP/RISE ADVISORY";
          } else if (hasRise) {
            eventTitle = "TEMPERATURE RISE ADVISORY";
          }

          const changesText = [];
          if (isHighDrop) {
            changesText.push(`• High Temperature: Drops by ${Math.abs(Math.round(diffHigh))}°F tomorrow (from ${Math.round(todayHigh)}°F to ${Math.round(tomorrowHigh)}°F)`);
          } else if (isHighRise) {
            changesText.push(`• High Temperature: Rises by ${Math.round(diffHigh)}°F tomorrow (from ${Math.round(todayHigh)}°F to ${Math.round(tomorrowHigh)}°F)`);
          }

          if (isLowDrop) {
            changesText.push(`• Low Temperature: Drops by ${Math.abs(Math.round(diffLow))}°F tomorrow (from ${Math.round(todayLow)}°F to ${Math.round(tomorrowLow)}°F)`);
          } else if (isLowRise) {
            changesText.push(`• Low Temperature: Rises by ${Math.round(diffLow)}°F tomorrow (from ${Math.round(todayLow)}°F to ${Math.round(tomorrowLow)}°F)`);
          }

          alerts.push({
            event: eventTitle,
            sender_name: "24-Hour Forecast Analysis",
            start: now,
            end: tomorrowDaily.sunset || (now + 86400),
            description: `Significant day-to-day temperature change expected tomorrow:

• Today's Forecast: High ${Math.round(todayHigh)}°F / Low ${Math.round(todayLow)}°F
• Tomorrow's Forecast: High ${Math.round(tomorrowHigh)}°F / Low ${Math.round(tomorrowLow)}°F

Noteworthy Temperature Changes (15°F+ Shift):
${changesText.join('\n')}

Plan ahead for shifting weather conditions tomorrow!`
          });
        }
      }
    }
    
    // EDITABLE preview mode: set to true to force-show test banners for TEMPERATURE DROP ADVISORY and TEMPERATURE RISE ADVISORY
    const TEST_SHOW_TEMP_ADVISORIES_PREVIEW = false; // Set to false for normal live operation
    const urlParams = new URLSearchParams(window.location.search);
    const showTempAdvisoriesPreview = TEST_SHOW_TEMP_ADVISORIES_PREVIEW || urlParams.get('temp_advisories') === 'true' || urlParams.get('test_alerts') === 'true';
    if (showTempAdvisoriesPreview) {
      alerts.push({
        event: "TEMPERATURE DROP ADVISORY",
        sender_name: "24-Hour Forecast Analysis",
        start: now,
        end: now + 86400,
        description: `Significant day-to-day temperature drop expected tomorrow:

• Today's Forecast: High 88°F / Low 68°F
• Tomorrow's Forecast: High 66°F / Low 51°F

Noteworthy Temperature Changes (15°F+ Shift):
• High Temperature: Drops by 22°F tomorrow (from 88°F to 66°F)
• Low Temperature: Drops by 17°F tomorrow (from 68°F to 51°F)

Plan ahead for significantly colder conditions tomorrow!`
      });

      alerts.push({
        event: "TEMPERATURE RISE ADVISORY",
        sender_name: "24-Hour Forecast Analysis",
        start: now,
        end: now + 86400,
        description: `Significant day-to-day temperature rise expected tomorrow:

• Today's Forecast: High 62°F / Low 45°F
• Tomorrow's Forecast: High 81°F / Low 62°F

Noteworthy Temperature Changes (15°F+ Shift):
• High Temperature: Rises by 19°F tomorrow (from 62°F to 81°F)
• Low Temperature: Rises by 17°F tomorrow (from 45°F to 62°F)

Plan ahead for significantly warmer conditions tomorrow!`
      });
    }
    

    
    const container = document.getElementById('alerts-container');
    
    // Console logging to debug tornado watch
    /* eslint-disable */console.log(...oo_oo(`2266558813_3270_4_3270_62_4`,'🚨 ALERTS DEBUG - Raw alerts array:', alerts));
    /* eslint-disable */console.log(...oo_oo(`2266558813_3271_4_3271_69_4`,'🚨 ALERTS DEBUG - Number of alerts:', alerts.length));
    /* eslint-disable */console.log(...oo_oo(`2266558813_3272_4_3272_67_4`,'🚨 ALERTS DEBUG - Full data.alerts:', data.alerts));
    if (alerts.length > 0) {
      alerts.forEach((alert, index) => {
        /* eslint-disable */console.log(...oo_oo(`2266558813_3275_8_3282_10_4`,`🚨 Alert ${index + 1}:`, {
          event: alert.event,
          sender_name: alert.sender_name,
          start: alert.start,
          end: alert.end,
          description: alert.description?.substring(0, 100) + '...',
          tags: alert.tags
        }));
      });
    } else {
      /* eslint-disable */console.log(...oo_oo(`2266558813_3285_6_3285_66_4`,'🚨 ALERTS DEBUG - No alerts found in API data'));
    }
    
    if (!container) return;
    
    if (alerts.length === 0) {
      const isAlreadyCollapsed = !container.style.height || container.style.height === '0vw';
      if (isAlreadyCollapsed) return; // Prevent unnecessary DOM updates
      container.style.overflow = 'hidden';
      container.style.height = '0vw';
      // Update fragile elements immediately as animation starts
      updateFragileElementsPosition();
      // Wait for slide up transition to finish before clearing DOM
      setTimeout(() => { if (container.style.height === '0vw') container.innerHTML = ''; }, ALERT_ANIMATION_MS);
      return;
    }
    
    const targetHeight = alerts.length * 10;
    const currentHeight = parseFloat(container.style.height) || 0;
    
    container.innerHTML = ''; // clear old alerts
    
    let prevBannerColor = null;
    
    alerts.forEach((alert, index) => {
      /* eslint-disable */console.log(...oo_oo(`2266558813_3310_6_3310_39_4`,'Alert data:', alert)); // Debug: see what properties are available
      
      const banner = document.createElement('div');
      banner.className = 'alert-banner';
      banner.style.zIndex = 100 - index; // Ensure correct paint order for overlays
      
      // Determine background color based on alert name
      const eventName = alert.event.toUpperCase().trim();
      
      let bannerColor = ALERT_COLORS["DEFAULT"];
      for (const [key, color] of Object.entries(ALERT_COLORS)) {
        if (eventName.includes(key)) {
          bannerColor = color;
          break;
        }
      }

      let bannerIcon = ALERT_ICONS["DEFAULT"];
      for (const [key, icon] of Object.entries(ALERT_ICONS)) {
        if (eventName.includes(key)) {
          bannerIcon = icon;
          break;
        }
      }

      // Create the sibling background layer
      const bannerBg = document.createElement('div');
      bannerBg.className = 'alert-banner-bg';
      bannerBg.style.backgroundColor = bannerColor;

      banner.appendChild(bannerBg);

      banner.style.cursor = 'pointer';
      banner.addEventListener('click', () => openAlertModal(alert, bannerColor, bannerIcon));
      
      // Use custom SVG icon
      const svgSize = '7vw';
      const isTempDrop = eventName.includes('TEMPERATURE DROP');
      const isTempRise = !isTempDrop && eventName.includes('TEMPERATURE RISE');
      
      let iconTransform = '';
      if (isTempDrop) {
        iconTransform = `transform: translateY(var(--alert-temp-drop-icon-y-offset, 0vw)) ${ALERT_DROP_ICON_TRANSFORM};`;
      } else if (isTempRise) {
        iconTransform = `transform: translateY(var(--alert-temp-rise-icon-y-offset, 0vw));`;
      }
      const bannerIconTransform = iconTransform ? ` ${iconTransform}` : '';
      
      const svgIcon = `
        <img src="${bannerIcon}" style="width: ${svgSize}; height: ${svgSize}; flex-shrink: 0;${bannerIconTransform}" alt="Alert">
      `;
      
      // Create the content container (sits above background)
      const bannerContent = document.createElement('div');
      bannerContent.className = 'alert-banner-content';

      const textWrapper = document.createElement('div');
      textWrapper.style.display = 'flex';
      textWrapper.style.flexDirection = 'column';
      textWrapper.style.justifyContent = 'center';
      textWrapper.style.alignItems = 'flex-start';
      if (isTempDrop) {
        textWrapper.style.transform = 'translateY(var(--alert-temp-drop-type-y-offset, 0vw))';
      } else if (isTempRise) {
        textWrapper.style.transform = 'translateY(var(--alert-temp-rise-type-y-offset, 0vw))';
      }

      const text = document.createElement('div');
      text.className = 'alert-text';
      
      // Format: "TORNADO WATCH expires 6:15 am" or "TEMPERATURE DROP ADVISORY tomorrow"
      let alertText = alert.event.toUpperCase();
      if (alert.countdown) {
        alertText += ` <span class="alert-expires">${alert.countdown}</span>`;
      } else if (eventName.includes('TEMPERATURE DROP') || eventName.includes('TEMPERATURE RISE')) {
        alertText += ` <span class="alert-expires">tomorrow</span>`;
      } else if (eventName.includes('METEOR SHOWER OCCURRING') || eventName.includes('METEOR SHOWER OCCURING')) {
        // Active visual meteor shower window: keep pure title as requested
      } else if (alert.end) {
        const endDate = new Date(alert.end * 1000); // Convert Unix timestamp to Date
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        let dayLabel = '';
        if (endDate.toDateString() === today.toDateString()) {
          dayLabel = ''; // Expired/expires today
        } else if (endDate.toDateString() === tomorrow.toDateString()) {
          dayLabel = ' tomorrow';
        } else {
          dayLabel = ' ' + endDate.toLocaleDateString('en-US', { weekday: 'short' });
        }

        const hours = endDate.getHours();
        const minutes = endDate.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for midnight
        const expiresText = `expires ${displayHours}:${minutes} ${ampm}${dayLabel}`;
        alertText += ` <span class="alert-expires">${expiresText}</span>`;
        /* eslint-disable */console.log(...oo_oo(`2266558813_3392_8_3392_86_4`,`Alert expires at: ${displayHours}:${minutes} ${ampm}${dayLabel}`));
      } else {
        /* eslint-disable */console.log(...oo_oo(`2266558813_3394_8_3394_48_4`,'Alert has no end property'));
      }
      text.innerHTML = alertText; // Use innerHTML to support span tag
      textWrapper.appendChild(text);
      
      // Subtitle: succinctly say what the alert is (ONLY for Special Weather Statements)
      if (alert.description && eventName.includes('SPECIAL WEATHER STATEMENT')) {
        // Clean up messy NWS formatting (remove newlines, extra spaces)
        let cleanDesc = alert.description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Strip leading ellipses or redundant event names
        cleanDesc = cleanDesc.replace(/^\.+/, '').trim();
        const eventNameUpper = alert.event.toUpperCase();
        if (cleanDesc.toUpperCase().startsWith(eventNameUpper)) {
          cleanDesc = cleanDesc.substring(eventNameUpper.length).replace(/^\.+/, '').trim();
        }
        
        // Convert ALL CAPS to normal sentence case for readability
        if (cleanDesc.length > 0) {
          cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1).toLowerCase();
        }
        
        const subtext = document.createElement('div');
        subtext.style.fontSize = '1.76vw'; // 80% of previous size
        subtext.style.fontFamily = "'light', sans-serif";
        subtext.style.color = 'rgba(255, 255, 255, 0.85)';
        subtext.style.marginTop = '-0.2vw'; // EDITABLE: Gap ABOVE the alert subtext sentence
        subtext.style.display = '-webkit-box';
        subtext.style.webkitLineClamp = '2'; // Force exactly 2 lines
        subtext.style.webkitBoxOrient = 'vertical';
        subtext.style.whiteSpace = 'normal'; // Allow text to wrap
        subtext.style.overflow = 'hidden';
        subtext.style.maxWidth = '75vw';
        subtext.style.lineHeight = '2.2vw'; // Restored: Gap for the BANNER subtext (not the modal)
        subtext.textContent = cleanDesc;
        
        textWrapper.appendChild(subtext);
      }

      bannerContent.innerHTML = svgIcon;
      bannerContent.appendChild(textWrapper);
      banner.appendChild(bannerContent);

      // Add top shadow (multiplies previous banner color inside this banner context)
      if (index > 0 && prevBannerColor) {
        const topShadow = document.createElement('div');
        topShadow.className = 'alert-banner-top-shadow';
        topShadow.style.setProperty('--prev-banner-color', prevBannerColor);
        banner.appendChild(topShadow);
      }
      
      // Add bottom shadow (projects downwards for overlapping below)
      const bottomShadow = document.createElement('div');
      bottomShadow.className = 'alert-banner-bottom-shadow';
      bottomShadow.style.setProperty('--banner-color', bannerColor);
      banner.appendChild(bottomShadow);
      
      container.appendChild(banner);
      
      prevBannerColor = bannerColor;
    });

    if (currentHeight !== targetHeight) {
      // Set fragile elements to current position (before adding new alerts height change)
      const currentRainHeight = parseFloat(document.getElementById('rain-forecast-banner')?.style.height) || 0;
      const startPushValue = `${currentHeight + currentRainHeight}vw`;
      const moon = document.getElementById('moon-phase-img');
      const descImg = document.getElementById('weather-desc-image');
      const windArrow = document.getElementById('wind-direction-arrow');
      const clockHands = document.getElementById('analog-clock');
      const baroGauge = document.getElementById('barometric-pressure-gauge');
      const gradientUpper = document.querySelector('.scrolling-gradient-overlay');
      const gradientLower = document.querySelector('.scrolling-gradient-overlay-lower');
      const starfieldContainer = document.getElementById('starfield-container');
      if (moon) moon.style.setProperty('--alert-push', startPushValue);
      if (descImg) descImg.style.setProperty('--alert-push', startPushValue);
      const descImgLeft = document.getElementById('weather-desc-image-left');
      if (descImgLeft) descImgLeft.style.setProperty('--alert-push', startPushValue);
      if (windArrow) windArrow.style.setProperty('--alert-push', startPushValue);
      if (clockHands) clockHands.style.setProperty('--alert-push', startPushValue);
      if (baroGauge) baroGauge.style.setProperty('--alert-push', startPushValue);
      if (gradientUpper) gradientUpper.style.setProperty('--alert-push', startPushValue);
      if (gradientLower) gradientLower.style.setProperty('--alert-push', startPushValue);
      if (starfieldContainer) starfieldContainer.style.setProperty('--alert-push', startPushValue);
      
      // Ensure starting height is explicitly set so it animates properly and hide overflow during transition
      container.style.overflow = 'hidden';
      container.style.height = `${currentHeight}vw`;

      // Use a tiny delay to guarantee the browser has painted the newly inserted HTML 
      // BEFORE expanding its height, physically forcing the CSS slide animation to trigger!
      setTimeout(() => {
        container.style.height = `${targetHeight}vw`;
        // Update fragile elements to final position as animation starts
        updateFragileElementsPosition();
        
        // After height animation is complete, make overflow visible so shadows show
        setTimeout(() => {
          if (parseFloat(container.style.height) > 0) {
            container.style.overflow = 'visible';
          }
        }, ALERT_ANIMATION_MS);
      }, 50);
    } else {
      container.style.overflow = 'visible';
    }
  }

  // Initialize rain banner container
  function initRainBannerContainer() {
    if (document.getElementById('rain-forecast-banner')) return;
    
    const container = document.createElement('div');
    container.id = 'rain-forecast-banner';
    container.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'height') {
        updateLowerGradientPosition();
      }
    });
    
    // Insert after alerts container
    const alertsContainer = document.getElementById('alerts-container');
    if (alertsContainer && alertsContainer.parentNode) {
      alertsContainer.parentNode.insertBefore(container, alertsContainer.nextSibling);
    } else {
      document.body.insertBefore(container, document.body.firstChild);
    }
  }

  // Create and update rain forecast banner (hourly rain % for next 8 hours)
  function updateRainBanner(data) {
    const containerId = 'rain-forecast-banner';
    let container = document.getElementById(containerId);
    if (!container) return; // Should always exist after init
    
    // Get current hour and next 7 hours (8 cells total)
    const hourlyData = data.hourly || [];
    const rainHours = hourlyData.slice(0, 8).map((hour, index) => {
      const pop = (typeof hour.pop === 'number') ? hour.pop : 0;
      const percent = Math.round(pop * 100);
      const dt = hour.dt || 0;
      let rainMm = (hour.rain && typeof hour.rain === 'object' && hour.rain['1h']) ? hour.rain['1h'] : (typeof hour.rain === 'number' ? hour.rain : 0);
      let rainInches = (rainMm / 25.4);
      let rainDisplay = rainInches >= MIN_RAIN_DISPLAY_THRESHOLD ? rainInches.toFixed(2).replace(/^0+/, '') + '"' : '0"';
      return { percent, dt, index, rainDisplay };
    });
    
    // Check if there's any measurable rain to show that meets our threshold
    // parseFloat(h.rainDisplay) will be 0 if the rain was beneath the MIN_RAIN_DISPLAY_THRESHOLD
    const hasRain = rainHours.some(h => h.percent > 0 && parseFloat(h.rainDisplay) > 0);
    
    if (!hasRain) {
      const isAlreadyCollapsed = !container.style.height || container.style.height === '0vw';
      if (isAlreadyCollapsed) return; // Prevent unnecessary DOM updates
      
      // No rain, slide banner up and hide
      container.style.height = '0vw';
      // Update fragile elements immediately as animation starts
      updateFragileElementsPosition();
      setTimeout(() => { 
        if (container.style.height === '0vw') container.innerHTML = ''; 
      }, ALERT_ANIMATION_MS);
      return;
    }
    
    // Check if banner is already showing
    const isAlreadyShowing = container.style.height === `${RAIN_BANNER_HEIGHT_VW}vw`;
    
    // If already showing, just update cells without animation
    if (isAlreadyShowing) {
      container.innerHTML = '';
      const inner = document.createElement('div');
      inner.className = 'rain-forecast-inner';
      rainHours.forEach((hour, index) => {
        const cell = createRainCell(hour, index);
        inner.appendChild(cell);
      });
      container.appendChild(inner);
      return;
    }
    
    // Banner is hidden, animate it down
    // Clear existing cells and ensure starting hidden
    container.innerHTML = '';
    container.style.height = '0vw';
    
    // Set fragile elements to current position (before adding this banner height)
    // This ensures they start at the right position before animating
    const currentAlertsHeight = parseFloat(document.getElementById('alerts-container')?.style.height) || 0;
    const startPushValue = `${currentAlertsHeight}vw`;
    
    const inner = document.createElement('div');
    inner.className = 'rain-forecast-inner';
    // Build cells
    rainHours.forEach((hour, index) => {
      const cell = createRainCell(hour, index);
      inner.appendChild(cell);
    });
    container.appendChild(inner);
    
    // Set starting position for fragile elements
    const moon = document.getElementById('moon-phase-img');
    const descImg = document.getElementById('weather-desc-image');
    const windArrow = document.getElementById('wind-direction-arrow');
    const clockHands = document.getElementById('analog-clock');
    const baroGauge = document.getElementById('barometric-pressure-gauge');
    if (moon) moon.style.setProperty('--alert-push', startPushValue);
    if (descImg) descImg.style.setProperty('--alert-push', startPushValue);
    const descImgLeft = document.getElementById('weather-desc-image-left');
    if (descImgLeft) descImgLeft.style.setProperty('--alert-push', startPushValue);
    if (windArrow) windArrow.style.setProperty('--alert-push', startPushValue);
    if (clockHands) clockHands.style.setProperty('--alert-push', startPushValue);
    if (baroGauge) baroGauge.style.setProperty('--alert-push', startPushValue);
    
    // Use requestAnimationFrame to ensure browser has painted, then animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.height = `${RAIN_BANNER_HEIGHT_VW}vw`;
        // Update fragile elements to final position as animation starts
        updateFragileElementsPosition();
      });
    });
  }

  // Helper function to create a rain forecast cell
  function createRainCell(hour, index) {
    const cell = document.createElement('div');
    cell.className = 'rain-forecast-cell';
    
    // Check if rainDisplay evaluates to 0 inches
    const hasMeasurableRain = parseFloat(hour.rainDisplay) > 0;
    
    // Calculate opacity directly from rain percentage
    // Opacity = percentage / 100
    let cellOpacity = 0;
    if (hasMeasurableRain && hour.percent > 0) {
      cellOpacity = hour.percent / 100;
      // Uncomment below to add a minimum floor for visibility:
      // cellOpacity = Math.max(hour.percent / 100, RAIN_BANNER_MIN_OPACITY);
    }
    
    // Format hour text
    let hourText = '';
    if (index === 0) {
      hourText = 'Now';
    } else {
      const date = new Date(hour.dt * 1000);
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12 || 12;
      const minutesStr = minutes.toString().padStart(2, '0');
      hourText = `${hours}:${minutesStr}${ampm}`;
    }
    
    // Check if rain is 1 inch or more to change color
    const isHeavyRain = parseFloat(hour.rainDisplay) >= 1;
    const cellBgColor = isHeavyRain ? 'hsl(0, 90%, 35%)' : RAIN_BANNER_BLUE;

    cell.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: ${cellBgColor};
      opacity: ${hasMeasurableRain ? cellOpacity : 0};
      visibility: ${hasMeasurableRain ? 'visible' : 'hidden'};
      color: white;
      text-align: center;
      line-height: 1.1;
      padding: 0.5vw;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
    `;
    
    // Only add text if there's measurable rain
    if (hasMeasurableRain) {
      const hourLine = document.createElement('div');
      hourLine.style.cssText = `
        font-family: 'light', sans-serif;
        font-weight: normal;
        font-size: ${RAIN_BANNER_FONT_SIZE_HOUR};
        color: white;
        position: relative;
        z-index: 2;
      `;
      hourLine.textContent = hourText;
      
      const percentLine = document.createElement('div');
      percentLine.style.cssText = `
        font-family: 'bold', sans-serif;
        font-weight: 900;
        font-size: ${RAIN_BANNER_FONT_SIZE_PERCENT};
        color: white;
        position: relative;
        z-index: 2;
      `;
      percentLine.textContent = `${hour.rainDisplay}`;

      // Create a darkening top shadow (starts at 65% opacity and fades down 2vw to 0)
      const topShadow = document.createElement('div');
      topShadow.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2vw;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.65), transparent);
        pointer-events: none;
        z-index: 1;
      `;
      
      cell.appendChild(topShadow);
      cell.appendChild(hourLine);
      cell.appendChild(percentLine);
      cell.title = `${hour.rainDisplay} of rain at ${hourText}`;
    }
    
    return cell;
  }

  // =========================================================================
  // --- 1. STANDALONE TOP TEMPERATURE (When diff < 10°, NO "feels like") ---
  // Controls the temperature directly under the city when feels-like is hidden (e.g. "72°")
  // =========================================================================
  const CURRENT_TEMP_TOP_SIZE_DESKTOP = '7.25vw';       // EDITABLE Desktop: Font size of standalone temp at top
  const CURRENT_TEMP_TOP_SIZE_MOBILE = '13.25vw';       // EDITABLE Mobile: Font size of standalone temp at top
  const CURRENT_TEMP_TOP_SIZE_DEFAULT = CURRENT_TEMP_TOP_SIZE_DESKTOP;
  const CURRENT_TEMP_TOP_SIZE_DUAL_DESKTOP = '5vw';     // EDITABLE Desktop: Dual F/C button mode font size
  const CURRENT_TEMP_TOP_SIZE_DUAL_MOBILE = '7.25vw';   // EDITABLE Mobile: Dual F/C button mode font size

  const CURRENT_TEMP_TOP_MARGIN_DESKTOP = '-.3vw';        // EDITABLE Desktop: Gap ABOVE standalone temp (under city)
  const CURRENT_TEMP_TOP_MARGIN_MOBILE = '-2vw';         // EDITABLE Mobile: Gap ABOVE standalone temp (under city)
  const CURRENT_TEMP_BOTTOM_MARGIN_DESKTOP = '0vw';     // EDITABLE Desktop: Gap BELOW standalone temp
  const CURRENT_TEMP_BOTTOM_MARGIN_MOBILE = '0vw';      // EDITABLE Mobile: Gap BELOW standalone temp
  const CURRENT_TEMP_X_OFFSET_DESKTOP = '0vw';          // EDITABLE Desktop: Fine horizontal nudge (+ right, - left)
  const CURRENT_TEMP_X_OFFSET_MOBILE = '0vw';           // EDITABLE Mobile: Fine horizontal nudge (+ right, - left)
  const CURRENT_TEMP_Y_OFFSET_DESKTOP = '0vw';          // EDITABLE Desktop: Fine vertical nudge (+ down, - up)
  const CURRENT_TEMP_Y_OFFSET_MOBILE = '0vw';           // EDITABLE Mobile: Fine vertical nudge (+ down, - up)

  // Visual / Optical Centering (centers digits as if degree symbol isn't there - NON "feels like" modes only)
  const CURRENT_TEMP_OPTICAL_CENTERING = true;          // EDITABLE: Center digits disregarding degree symbol width
  const CURRENT_TEMP_DEGREE_X_OFFSET_DESKTOP = '0vw';   // EDITABLE Desktop: Fine horizontal nudge for degree symbol
  const CURRENT_TEMP_DEGREE_X_OFFSET_MOBILE = '0vw';    // EDITABLE Mobile: Fine horizontal nudge for degree symbol
  const CURRENT_TEMP_DEGREE_Y_OFFSET_DESKTOP = '0vw';   // EDITABLE Desktop: Fine vertical nudge for degree symbol
  const CURRENT_TEMP_DEGREE_Y_OFFSET_MOBILE = '0vw';    // EDITABLE Mobile: Fine vertical nudge for degree symbol

  // =========================================================================
  // --- 2. "FEELS LIKE" ACTIVE MODE (When difference >= 10°, WITH "feels like XX°") ---
  // Active only when feels-like differs from core temp by 10°+ (e.g. "72° feels like 85°")
  // =========================================================================
  const FEELS_LIKE_DIFF_THRESHOLD = 10;                 // EDITABLE: Degree difference (+/-) required to show "feels like"
  
  // Spacing & Margins for the entire "feels like" row
  const FEELS_LIKE_TOP_MARGIN_DESKTOP = '1vw';          // EDITABLE Desktop: Gap ABOVE "feels like" row (under city)
  const FEELS_LIKE_TOP_MARGIN_MOBILE = '1vw';           // EDITABLE Mobile: Gap ABOVE "feels like" row (under city)
  const FEELS_LIKE_TOP_MARGIN = FEELS_LIKE_TOP_MARGIN_DESKTOP;
  const FEELS_LIKE_BOTTOM_MARGIN_DESKTOP = '0vw';       // EDITABLE Desktop: Gap BELOW "feels like" row
  const FEELS_LIKE_BOTTOM_MARGIN_MOBILE = '0vw';        // EDITABLE Mobile: Gap BELOW "feels like" row
  const FEELS_LIKE_BOTTOM_MARGIN = FEELS_LIKE_BOTTOM_MARGIN_DESKTOP;
  const FEELS_LIKE_Y_OFFSET_DESKTOP = '0vw';            // EDITABLE Desktop: Fine vertical nudge for entire row (+ down, - up)
  const FEELS_LIKE_Y_OFFSET_MOBILE = '0vw';             // EDITABLE Mobile: Fine vertical nudge for entire row (+ down, - up)
  const FEELS_LIKE_Y_OFFSET = FEELS_LIKE_Y_OFFSET_DESKTOP;
  const FEELS_LIKE_VAL_Y_OFFSET = '0vw';                // EDITABLE: Tight vertical nudge for ONLY the feels-like temp value

  // Font Sizes during "feels like" mode
  // (a) First number (Core temp, e.g. "72°" in "72° feels like 85°")
  const FEELS_LIKE_CORE_TEMP_SIZE_DESKTOP = '5vw';      // EDITABLE Desktop: Size of core temp during feels-like mode
  const FEELS_LIKE_CORE_TEMP_SIZE_MOBILE = '5vw';       // EDITABLE Mobile: Size of core temp during feels-like mode
  const FEELS_LIKE_CORE_TEMP_SIZE_DUAL_DESKTOP = '4vw'; // EDITABLE Desktop: Dual F/C core temp size
  const FEELS_LIKE_CORE_TEMP_SIZE_DUAL_MOBILE = '4vw';  // EDITABLE Mobile: Dual F/C core temp size

  // (b) Middle label text ("feels like")
  const FEELS_LIKE_TEXT_SIZE_DESKTOP = '5vw';           // EDITABLE Desktop: Size of "feels like" label text (single mode)
  const FEELS_LIKE_TEXT_SIZE_MOBILE = '5vw';            // EDITABLE Mobile: Size of "feels like" label text (single mode)
  const FEELS_LIKE_TEXT_SIZE_DUAL_DESKTOP = '4vw';      // EDITABLE Desktop: Size of "feels like" label text (dual mode)
  const FEELS_LIKE_TEXT_SIZE_DUAL_MOBILE = '4vw';       // EDITABLE Mobile: Size of "feels like" label text (dual mode)

  // (c) Second number (Feels-like temp, e.g. "85°" in "72° feels like 85°")
  const FEELS_LIKE_TEMP_SIZE_DESKTOP = '7.25vw';        // EDITABLE Desktop: Size of feels-like temp (single mode)
  const FEELS_LIKE_TEMP_SIZE_MOBILE = '7.25vw';         // EDITABLE Mobile: Size of feels-like temp (single mode)
  const FEELS_LIKE_TEMP_SIZE_DUAL_DESKTOP = '6.25vw';   // EDITABLE Desktop: Size of feels-like temp (dual mode)
  const FEELS_LIKE_TEMP_SIZE_DUAL_MOBILE = '6.25vw';    // EDITABLE Mobile: Size of feels-like temp (dual mode)

  // (d) Leading space before first number in "feels like" mode
  const FEELS_LIKE_FIRST_TEMP_LEADING_SPACE = true;     // EDITABLE: Add a space just before first temp in feels like line only (e.g. " 99° feels...")

  // --- Odometer Digit "1" Kerning Config ---
  const ODOMETER_ONE_MARGIN_LEFT = '-0.06em';  // EDITABLE: Left margin adjustment for digit 1 to tighten kerning
  const ODOMETER_ONE_MARGIN_RIGHT = '-0.06em'; // EDITABLE: Right margin adjustment for digit 1 to tighten kerning

  // Helper function to dynamically update odometer numbers without destroying DOM elements
  function updateOdometer(container, newStr) {
    if (!container) return;
    
    if (!container.classList.contains('odometer-number')) {
      container.classList.add('odometer-number');
    }
    
    const chars = Array.from(newStr);
    const existingChildren = Array.from(container.children);
    
    // If the number of characters or structural types don't match, rebuild the DOM
    let needsRebuild = chars.length !== existingChildren.length;
    if (!needsRebuild) {
      for (let i = 0; i < chars.length; i++) {
        const isDigit = chars[i] >= '0' && chars[i] <= '9';
        const wasDigit = existingChildren[i].classList.contains('odometer-digit');
        if (isDigit !== wasDigit) {
          needsRebuild = true;
          break;
        }
      }
    }
    
    if (needsRebuild) {
      container.innerHTML = '';
      chars.forEach(char => {
        const isDigit = char >= '0' && char <= '9';
        if (isDigit) {
          const digit = parseInt(char);
          const digitEl = document.createElement('span');
          digitEl.className = 'odometer-digit';
          digitEl.innerHTML = `<span class="odometer-strip" style="transform: translateY(0%);" data-digit="0">` +
                              `<span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span>` +
                              `</span>`;
          container.appendChild(digitEl);
          
          // Force reflow and transition to the target digit
          void digitEl.offsetHeight;
          const strip = digitEl.querySelector('.odometer-strip');
          strip.style.transform = `translateY(-${digit * 10}%)`;
          strip.setAttribute('data-digit', digit);
        } else {
          const staticEl = document.createElement('span');
          staticEl.className = 'odometer-static';
          if (char === '°') {
            staticEl.classList.add('odometer-degree');
          }
          if (char === ' ' || char === '\u00A0') {
            staticEl.innerHTML = '&nbsp;';
            staticEl.style.whiteSpace = 'pre';
          } else {
            staticEl.textContent = char;
          }
          container.appendChild(staticEl);
        }
      });
    } else {
      // Update existing elements
      chars.forEach((char, i) => {
        const child = existingChildren[i];
        if (char >= '0' && char <= '9') {
          const digit = parseInt(char);
          const strip = child.querySelector('.odometer-strip');
          if (strip) {
            const currentDigit = parseInt(strip.getAttribute('data-digit') || '0');
            if (currentDigit !== digit) {
              strip.style.transform = `translateY(-${digit * 10}%)`;
              strip.setAttribute('data-digit', digit);
            }
          }
        } else {
          if (char === ' ' || char === '\u00A0') {
            child.innerHTML = '&nbsp;';
            child.style.whiteSpace = 'pre';
          } else if (child.textContent !== char) {
            child.textContent = char;
          }
          if (char === '°') {
            child.classList.add('odometer-degree');
          } else {
            child.classList.remove('odometer-degree');
          }
        }
      });
    }
    
    // Apply digit "1" kerning margins
    const children = Array.from(container.children);
    children.forEach((child, i) => {
      let isOne = false;
      if (child.classList.contains('odometer-digit')) {
        const strip = child.querySelector('.odometer-strip');
        if (strip) {
          const digitVal = strip.getAttribute('data-digit');
          isOne = (digitVal === '1');
        }
      } else {
        isOne = (child.textContent === '1');
      }

      if (isOne) {
        // Adjust left margin (skip first element to prevent shifting start position)
        if (i > 0) {
          child.style.marginLeft = ODOMETER_ONE_MARGIN_LEFT;
        } else {
          child.style.marginLeft = '';
        }
        
        // Adjust right margin (skip last element to prevent shifting end position)
        if (i < children.length - 1) {
          child.style.marginRight = ODOMETER_ONE_MARGIN_RIGHT;
        } else {
          child.style.marginRight = '';
        }
      } else {
        // Reset margins for non-one digits/static characters
        child.style.marginLeft = '';
        child.style.marginRight = '';
      }
    });
  }

  // Create and update "Feels like" element
  function updateFeelsLike(data) {
    const id = 'weather-feels-like';
    let el = document.getElementById(id);
    
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.textAlign = 'center';
      el.style.width = 'max-content'; // Allows us to measure its exact physical text width
      el.style.fontFamily = "'Weather', sans-serif";
      el.style.fontWeight = '200';
      el.style.fontSize = '4vw';
      el.style.lineHeight = '1';
      el.style.color = 'inherit';
      el.style.opacity = '0.85';
      el.style.textShadow = '0 2px 6px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4)';
      
      const secondGauge = document.querySelector('.second-gauge-container');
      if (secondGauge && secondGauge.parentNode) {
        secondGauge.parentNode.insertBefore(el, secondGauge.nextSibling);
      } else {
        const windGauge = document.querySelector('.wind-gauge-container');
        if (windGauge && windGauge.parentNode) {
          windGauge.parentNode.insertBefore(el, windGauge);
        } else {
          (document.querySelector('main.content') || document.body).appendChild(el);
        }
      }
    }
    
    const feelsLike = data?.current?.feels_like;
    const currentTemp = data?.current?.temp;

    // Check whether feels-like is significant (FEELS_LIKE_DIFF_THRESHOLD degrees away from current temp)
    const hasSignificantFeelsLike = typeof feelsLike === 'number' && 
                                   typeof currentTemp === 'number' && 
                                   Math.abs(Math.round(feelsLike) - Math.round(currentTemp)) >= FEELS_LIKE_DIFF_THRESHOLD;

    const isPhone = window.innerWidth < 768;

    // 1. Spacing & Margins: strictly choose between Standalone config and Feels-Like config
    const activeTopMargin = hasSignificantFeelsLike
      ? (isPhone ? FEELS_LIKE_TOP_MARGIN_MOBILE : FEELS_LIKE_TOP_MARGIN_DESKTOP)
      : (isPhone ? CURRENT_TEMP_TOP_MARGIN_MOBILE : CURRENT_TEMP_TOP_MARGIN_DESKTOP);

    const activeBottomMargin = hasSignificantFeelsLike
      ? (isPhone ? FEELS_LIKE_BOTTOM_MARGIN_MOBILE : FEELS_LIKE_BOTTOM_MARGIN_DESKTOP)
      : (isPhone ? CURRENT_TEMP_BOTTOM_MARGIN_MOBILE : CURRENT_TEMP_BOTTOM_MARGIN_DESKTOP);

    const activeYOffset = hasSignificantFeelsLike
      ? (isPhone ? FEELS_LIKE_Y_OFFSET_MOBILE : FEELS_LIKE_Y_OFFSET_DESKTOP)
      : (isPhone ? CURRENT_TEMP_Y_OFFSET_MOBILE : CURRENT_TEMP_Y_OFFSET_DESKTOP);

    const activeXOffset = hasSignificantFeelsLike
      ? '0vw'
      : (isPhone ? CURRENT_TEMP_X_OFFSET_MOBILE : CURRENT_TEMP_X_OFFSET_DESKTOP);

    const degreeX = isPhone ? CURRENT_TEMP_DEGREE_X_OFFSET_MOBILE : CURRENT_TEMP_DEGREE_X_OFFSET_DESKTOP;
    const degreeY = isPhone ? CURRENT_TEMP_DEGREE_Y_OFFSET_MOBILE : CURRENT_TEMP_DEGREE_Y_OFFSET_DESKTOP;

    // Always apply styling so hot-reloading works
    el.style.margin = `0 auto`;
    el.style.marginTop = activeTopMargin;
    el.style.marginBottom = activeBottomMargin;
    el.style.paddingTop = '0px';
    el.style.paddingBottom = '0px';
    el.style.setProperty('--feels-like-y-offset', activeYOffset);
    el.style.setProperty('--feels-like-val-y-offset', FEELS_LIKE_VAL_Y_OFFSET);
    el.style.setProperty('--current-temp-top-size-desktop', CURRENT_TEMP_TOP_SIZE_DESKTOP);
    el.style.setProperty('--current-temp-top-size-mobile', CURRENT_TEMP_TOP_SIZE_MOBILE);
    el.style.setProperty('--current-temp-top-size-dual-desktop', CURRENT_TEMP_TOP_SIZE_DUAL_DESKTOP);
    el.style.setProperty('--current-temp-top-size-dual-mobile', CURRENT_TEMP_TOP_SIZE_DUAL_MOBILE);
    el.style.setProperty('--current-temp-top-margin-desktop', CURRENT_TEMP_TOP_MARGIN_DESKTOP);
    el.style.setProperty('--current-temp-top-margin-mobile', CURRENT_TEMP_TOP_MARGIN_MOBILE);
    el.style.setProperty('--current-temp-bottom-margin-desktop', CURRENT_TEMP_BOTTOM_MARGIN_DESKTOP);
    el.style.setProperty('--current-temp-bottom-margin-mobile', CURRENT_TEMP_BOTTOM_MARGIN_MOBILE);
    el.style.setProperty('--current-temp-x-offset', activeXOffset);
    el.style.setProperty('--current-temp-y-offset-desktop', CURRENT_TEMP_Y_OFFSET_DESKTOP);
    el.style.setProperty('--current-temp-y-offset-mobile', CURRENT_TEMP_Y_OFFSET_MOBILE);
    el.style.setProperty('--current-temp-degree-x', degreeX);
    el.style.setProperty('--current-temp-degree-y', degreeY);

    el.style.setProperty('--feels-like-top-margin-desktop', FEELS_LIKE_TOP_MARGIN_DESKTOP);
    el.style.setProperty('--feels-like-top-margin-mobile', FEELS_LIKE_TOP_MARGIN_MOBILE);
    el.style.setProperty('--feels-like-bottom-margin-desktop', FEELS_LIKE_BOTTOM_MARGIN_DESKTOP);
    el.style.setProperty('--feels-like-bottom-margin-mobile', FEELS_LIKE_BOTTOM_MARGIN_MOBILE);
    el.style.setProperty('--feels-like-y-offset-desktop', FEELS_LIKE_Y_OFFSET_DESKTOP);
    el.style.setProperty('--feels-like-y-offset-mobile', FEELS_LIKE_Y_OFFSET_MOBILE);
    el.style.setProperty('--feels-like-core-temp-size-desktop', FEELS_LIKE_CORE_TEMP_SIZE_DESKTOP);
    el.style.setProperty('--feels-like-core-temp-size-mobile', FEELS_LIKE_CORE_TEMP_SIZE_MOBILE);
    el.style.setProperty('--feels-like-temp-size-desktop', FEELS_LIKE_TEMP_SIZE_DESKTOP);
    el.style.setProperty('--feels-like-temp-size-mobile', FEELS_LIKE_TEMP_SIZE_MOBILE);
    const currentTempX = hasSignificantFeelsLike
      ? `var(--middle-text-x-offset, 0vw)`
      : `calc(var(--middle-text-x-offset, 0vw) + var(--current-temp-x-offset, 0vw))`;
    el.style.transform = `translate(${currentTempX}, var(--feels-like-y-offset, 0vw))`;
    
    if (typeof currentTemp === 'number' || typeof feelsLike === 'number') {
      // --- EDITABLE: "feels like" text styles ---
      // Default View (Single Temp)
      const FEELS_LIKE_LETTER_SPACING_DEFAULT = '-.225vw';
      const FEELS_LIKE_MARGIN_LEFT_DEFAULT = '.5vw';  // EDITABLE: Space BEFORE "feels like"
      const FEELS_LIKE_MARGIN_RIGHT_DEFAULT = '0.8vw'; // EDITABLE: Space AFTER "feels like" (before number)
      const FEELS_LIKE_TEMP_LETTER_SPACING_DEFAULT = '-0.08vw'; // EDITABLE: Kerning for feels-like temp value
      const FEELS_LIKE_HUNDREDS_ONE_LETTER_SPACING_DEFAULT = '-0.25vw'; // EDITABLE: Additional kerning for the "first 1" in hundreds
      
      // F&C View (Dual Temp)
      const FEELS_LIKE_LETTER_SPACING_DUAL = '-.225vw';
      const FEELS_LIKE_MARGIN_LEFT_DUAL = '1vw';  // EDITABLE: Space BEFORE "feels like"
      const FEELS_LIKE_MARGIN_RIGHT_DUAL = '0.8vw'; // EDITABLE: Space AFTER "feels like" (before number)
      const FEELS_LIKE_TEMP_LETTER_SPACING_DUAL = '-0.08vw'; // EDITABLE: Kerning for feels-like temp value
      const FEELS_LIKE_HUNDREDS_ONE_LETTER_SPACING_DUAL = '-0.25vw'; // EDITABLE: Additional kerning for the "first 1" in hundreds

      const dynamicColor = (typeof feelsLike === 'number' ? tempToColor(feelsLike) : null) || 'inherit';
      
      // Check difference based on rounded display values (Disabled: glow turned off as requested)
      let isHotGlow = false;
      const glowClass = isHotGlow ? 'feels-like-temp-val' : '';
      
      // Derive a brighter color for the glow to ensure high visibility on a dark background
      let glowColor = dynamicColor;
      if (isHotGlow && dynamicColor.startsWith('hsl(')) {
        const match = dynamicColor.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
        if (match) {
          const h = parseFloat(match[1]);
          const s = parseFloat(match[2]);
          const l = parseFloat(match[3]);
          const glowL = Math.max(l, 62); // Ensure at least 62% lightness for bright neon contrast
          glowColor = `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${glowL.toFixed(1)}%)`;
        }
      }
      
      const glowStyle = isHotGlow ? `--feels-glow-color: ${glowColor};` : '';
      
      // Ensure sub-containers exist inside el
      let currentTempContainer = el.querySelector('.feels-like-current-temp');
      let labelEl = el.querySelector('.feels-like-label');
      let feelsLikeContainer = el.querySelector('.feels-like-val-container');

      if (!currentTempContainer || !labelEl || !feelsLikeContainer) {
        el.innerHTML = '<span class="feels-like-current-temp"></span><span class="feels-like-label"></span><span class="feels-like-val-container"></span>';
        currentTempContainer = el.querySelector('.feels-like-current-temp');
        labelEl = el.querySelector('.feels-like-label');
        feelsLikeContainer = el.querySelector('.feels-like-val-container');
      }

      // Update labelEl (only show if feels like is significant)
      if (hasSignificantFeelsLike) {
        const labelSize = displayUnit === 'BOTH'
          ? (isPhone ? FEELS_LIKE_TEXT_SIZE_DUAL_MOBILE : FEELS_LIKE_TEXT_SIZE_DUAL_DESKTOP)
          : (isPhone ? FEELS_LIKE_TEXT_SIZE_MOBILE : FEELS_LIKE_TEXT_SIZE_DESKTOP);

        labelEl.style.display = 'inline';
        labelEl.style.fontFamily = "'light', sans-serif";
        labelEl.style.fontWeight = 'normal';
        labelEl.style.fontSize = labelSize;
        labelEl.style.letterSpacing = displayUnit === 'BOTH' ? FEELS_LIKE_LETTER_SPACING_DUAL : FEELS_LIKE_LETTER_SPACING_DEFAULT;
        labelEl.style.marginLeft = displayUnit === 'BOTH' ? FEELS_LIKE_MARGIN_LEFT_DUAL : FEELS_LIKE_MARGIN_LEFT_DEFAULT;
        labelEl.style.marginRight = displayUnit === 'BOTH' ? FEELS_LIKE_MARGIN_RIGHT_DUAL : FEELS_LIKE_MARGIN_RIGHT_DEFAULT;
        labelEl.style.color = 'inherit';
        labelEl.textContent = 'feels like';
      } else {
        labelEl.style.display = 'none';
        labelEl.textContent = '';
      }

      const currClr = typeof currentTemp === 'number' ? (tempToColor(currentTemp) || 'white') : 'white';

      // Update Current Temp Container
      if (typeof currentTemp === 'number') {
        const isPhone = window.innerWidth < 768;
        let currentTempTopSize;
        if (hasSignificantFeelsLike) {
          currentTempTopSize = displayUnit === 'BOTH'
            ? (isPhone ? FEELS_LIKE_CORE_TEMP_SIZE_DUAL_MOBILE : FEELS_LIKE_CORE_TEMP_SIZE_DUAL_DESKTOP)
            : (isPhone ? FEELS_LIKE_CORE_TEMP_SIZE_MOBILE : FEELS_LIKE_CORE_TEMP_SIZE_DESKTOP);
        } else {
          currentTempTopSize = displayUnit === 'BOTH'
            ? (isPhone ? CURRENT_TEMP_TOP_SIZE_DUAL_MOBILE : CURRENT_TEMP_TOP_SIZE_DUAL_DESKTOP)
            : (isPhone ? CURRENT_TEMP_TOP_SIZE_MOBILE : CURRENT_TEMP_TOP_SIZE_DESKTOP);
        }
        currentTempContainer.style.display = 'inline-flex';
        currentTempContainer.style.fontFamily = displayUnit === 'BOTH' ? "'boldcond', sans-serif" : "'bold', sans-serif";
        currentTempContainer.style.setProperty('font-size', currentTempTopSize, 'important');
        currentTempContainer.style.color = currClr;
        currentTempContainer.style.transition = 'color 0.5s ease';
        
        if (!hasSignificantFeelsLike && CURRENT_TEMP_OPTICAL_CENTERING) {
          currentTempContainer.classList.add('optical-center-digits');
        } else {
          currentTempContainer.classList.remove('optical-center-digits');
        }
        
        let currentText = '';
        if (displayUnit === 'BOTH') {
          const cF = Math.round(currentTemp);
          const cC = Math.round((currentTemp - 32) * 5 / 9);
          currentText = `${cF}${formatSlash()}${cC}`;
        } else {
          const displayCurrent = displayUnit === 'C' ? (currentTemp - 32) * 5 / 9 : currentTemp;
          currentText = `${Math.round(displayCurrent)}°`;
        }
        if (hasSignificantFeelsLike && FEELS_LIKE_FIRST_TEMP_LEADING_SPACE) {
          currentText = ' ' + currentText;
        }
        updateOdometer(currentTempContainer, currentText);
      } else {
        currentTempContainer.style.display = 'none';
        currentTempContainer.innerHTML = '';
      }

      // Update Feels Like Container (only show if feels like is significant)
      if (hasSignificantFeelsLike) {
        const feelsLikeTempSize = displayUnit === 'BOTH'
          ? (isPhone ? FEELS_LIKE_TEMP_SIZE_DUAL_MOBILE : FEELS_LIKE_TEMP_SIZE_DUAL_DESKTOP)
          : (isPhone ? FEELS_LIKE_TEMP_SIZE_MOBILE : FEELS_LIKE_TEMP_SIZE_DESKTOP);

        feelsLikeContainer.style.display = 'inline-flex';
        if (glowClass) {
          if (!feelsLikeContainer.classList.contains(glowClass)) feelsLikeContainer.className = `feels-like-val-container ${glowClass}`;
        } else {
          feelsLikeContainer.className = 'feels-like-val-container';
        }
        if (glowStyle) {
          feelsLikeContainer.style.setProperty('--feels-glow-color', glowColor);
        }
        feelsLikeContainer.style.transform = `translateY(var(--feels-like-val-y-offset, 0vw))`;
        feelsLikeContainer.style.fontFamily = displayUnit === 'BOTH' ? "'boldcond', sans-serif" : "'bold', sans-serif";
        feelsLikeContainer.style.fontSize = feelsLikeTempSize;
        
        const activeSpacing = displayUnit === 'BOTH' ? FEELS_LIKE_TEMP_LETTER_SPACING_DUAL : FEELS_LIKE_TEMP_LETTER_SPACING_DEFAULT;
        feelsLikeContainer.style.letterSpacing = activeSpacing;
        el.style.setProperty('--feels-like-temp-letter-spacing', activeSpacing);

        const activeHundredsOneSpacing = displayUnit === 'BOTH' ? FEELS_LIKE_HUNDREDS_ONE_LETTER_SPACING_DUAL : FEELS_LIKE_HUNDREDS_ONE_LETTER_SPACING_DEFAULT;
        el.style.setProperty('--hundreds-one-margin-right', activeHundredsOneSpacing);

        feelsLikeContainer.style.color = dynamicColor;
        feelsLikeContainer.style.transition = 'color 0.5s ease';
        
        let feelsLikeText = '';
        if (displayUnit === 'BOTH') {
          const fF = Math.round(feelsLike);
          const fC = Math.round((feelsLike - 32) * 5 / 9);
          feelsLikeText = `${fF}${formatSlash()}${fC}`;
        } else {
          const displayFeelsLike = displayUnit === 'C' ? (feelsLike - 32) * 5 / 9 : feelsLike;
          feelsLikeText = `${Math.round(displayFeelsLike)}°`;
        }
        updateOdometer(feelsLikeContainer, feelsLikeText);
      } else {
        feelsLikeContainer.style.display = 'none';
        feelsLikeContainer.innerHTML = '';
      }

      el.style.color = tempToColor(currentTemp) || 'inherit';
    } else {
      el.textContent = '';
    }
  }








  // --- Weather Description Config ---
  // Line 3: The API description (e.g., "Overcast clouds.")
  const DESC_MARGIN_TOP_DESKTOP = '-1vw';     // EDITABLE Desktop: Space ABOVE the 3rd line
  const DESC_MARGIN_TOP_MOBILE = '-1vw';      // EDITABLE Mobile: Space ABOVE the 3rd line
  const DESC_MARGIN_BOTTOM_DESKTOP = '1vw';   // EDITABLE Desktop: Space BELOW the 3rd line
  const DESC_MARGIN_BOTTOM_MOBILE = '1vw';    // EDITABLE Mobile: Space BELOW the 3rd line
  
  // Line 4: The custom derived phrase (e.g., "Raw.")
  const DERIVED_DESC_MARGIN_TOP_DESKTOP = '-1.5vw';    // EDITABLE Desktop: Space ABOVE the 4th line
  const DERIVED_DESC_MARGIN_TOP_MOBILE = '-1.5vw';     // EDITABLE Mobile: Space ABOVE the 4th line
  const DERIVED_DESC_MARGIN_BOTTOM_DESKTOP = '-1vw';  // EDITABLE Desktop: Space BELOW the 4th line / gap above summary
  const DERIVED_DESC_MARGIN_BOTTOM_MOBILE = '3.0vw';   // EDITABLE Mobile: Space BELOW the 4th line / gap above summary

  // Create and update weather description element
  function updateWeatherDescription(data) {
    const isMobile = window.innerWidth <= 767;
    const descMarginTop = isMobile ? DESC_MARGIN_TOP_MOBILE : DESC_MARGIN_TOP_DESKTOP;
    const descMarginBottom = isMobile ? DESC_MARGIN_BOTTOM_MOBILE : DESC_MARGIN_BOTTOM_DESKTOP;
    const derivedDescMarginTop = isMobile ? DERIVED_DESC_MARGIN_TOP_MOBILE : DERIVED_DESC_MARGIN_TOP_DESKTOP;
    const derivedDescMarginBottom = isMobile ? DERIVED_DESC_MARGIN_BOTTOM_MOBILE : DERIVED_DESC_MARGIN_BOTTOM_DESKTOP;

    const id = 'weather-description';
    let el = document.getElementById(id);
    
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.textAlign = 'center';
      el.style.width = 'max-content'; // Allows exact measurement
      el.style.display = 'block'; // Ensure block display for transform
      el.style.fontFamily = "'light', sans-serif";
      el.style.fontWeight = 'normal';
      el.style.fontSize = '5vw';
      el.style.whiteSpace = 'nowrap'; // Force single line for shrink-to-fit
      el.style.lineHeight = '1';
      el.style.margin = `${descMarginTop} auto ${descMarginBottom}`;
      el.style.color = 'inherit';
      el.style.opacity = '1';
      el.style.textShadow = '0 2px 6px rgba(0, 0, 0, 0.0), 0 4px 12px rgba(0, 0, 0, 0.0)';
      el.style.letterSpacing = '-.225vw';
      
      const feelsLike = document.getElementById('weather-feels-like');
      if (feelsLike && feelsLike.parentNode) {
        feelsLike.parentNode.insertBefore(el, feelsLike.nextSibling);
      } else {
        const highContainer = document.querySelector('.container__high');
        if (highContainer && highContainer.parentNode) {
          highContainer.parentNode.insertBefore(el, highContainer);
        } else {
          (document.querySelector('main.content') || document.body).appendChild(el);
        }
      }
    }

    // Dynamic duplicate for later custom user data injection
    const dupId = 'weather-description-duplicate';
    let dupEl = document.getElementById(dupId);
    
    if (!dupEl) {
      dupEl = document.createElement('div');
      dupEl.id = dupId;
      dupEl.style.textAlign = 'center';
      dupEl.style.width = 'max-content'; 
      dupEl.style.fontFamily = "'light', sans-serif";
      dupEl.style.fontWeight = 'normal'; 
      dupEl.style.fontSize = '5vw';
      dupEl.style.whiteSpace = 'nowrap'; 
      dupEl.style.lineHeight = '1.2';

      // Center horizontally natively
      dupEl.style.margin = '0 auto'; 
      dupEl.style.marginTop = derivedDescMarginTop; 
      dupEl.style.marginBottom = derivedDescMarginBottom; 
      
      dupEl.style.color = 'inherit';
      dupEl.style.opacity = '1';
      dupEl.style.textShadow = '0 2px 6px rgba(0, 0, 0, 0.0), 0 4px 12px rgba(0, 0, 0, 0.0)';
      dupEl.style.letterSpacing = '-.225vw';
      dupEl.style.display = 'block'; // Ensure block display for transform centering
      
      if (el && el.parentNode) {
        el.parentNode.insertBefore(dupEl, el.nextSibling);
      }
    }

    el.style.transform = 'translateX(var(--middle-text-x-offset, 0vw))';
    if (dupEl) {
      dupEl.style.transform = 'translateX(var(--middle-text-x-offset, 0vw))';
    }
    
    const description = data?.current?.weather?.[0]?.description;
    const currentTemp = data?.current?.temp;
    const feelsLike = data?.current?.feels_like;
    const currentWind = data?.current?.wind_speed;
    const currentHum = data?.current?.humidity;

    // Helper to evaluate derived text from weather-conditions.json
    function getDerivedWeatherPhrase(t, w, h) {
      if (!weatherConditions || !weatherConditions.length) return '';
      // Priority 1 is highest, sort ascending
      const sorted = [...weatherConditions].sort((a, b) => a.priority - b.priority);
      for (const cond of sorted) {
        let match = true;
        if (cond.minTemp !== undefined && t < cond.minTemp) match = false;
        if (cond.maxTemp !== undefined && t > cond.maxTemp) match = false;
        if (cond.minWind !== undefined && w < cond.minWind) match = false;
        if (cond.maxWind !== undefined && w > cond.maxWind) match = false;
        if (cond.minHum !== undefined && h < cond.minHum) match = false;
        if (cond.maxHum !== undefined && h > cond.maxHum) match = false;
        
        if (match) {
          /* eslint-disable */console.log(...oo_oo(`2266558813_4157_10_4157_102_4`,`🔍 Derived Phrase Match: "${cond.phrase}" (Temp: ${t}, Wind: ${w}, Hum: ${h})`));
          return cond.phrase + '.';
        }
      }
      /* eslint-disable */console.log(...oo_oo(`2266558813_4161_6_4161_86_4`,`🔍 Derived Phrase: NO MATCH for Temp: ${t}, Wind: ${w}, Hum: ${h}`));
      return ''; // Fallback if no conditions match
    }
    
    // Console report: Current weather description
    /* eslint-disable */console.log(...oo_oo(`2266558813_4166_4_4166_73_4`,'🌤️ CURRENT Weather Description:', description || 'N/A'));
    
    if (description) {
      const formattedDescription = description.charAt(0).toUpperCase() + description.slice(1) + '.';
      el.textContent = formattedDescription;
      el.style.color = tempToColor(currentTemp) || 'inherit';

      // Set duplicate content and color
      if (dupEl) {
        dupEl.textContent = getDerivedWeatherPhrase(currentTemp, currentWind, currentHum);
        
        // TEST VARIABLE: Uncomment the line below to force an extremely long sentence and test the 40vw condensing behavior.
      // dupEl.textContent = "vw v works!";
        
        dupEl.style.color = el.style.color; // Match the color
      }

      // Reset to default before measuring
      el.style.fontSize = '5vw';
      el.style.transform = 'none';
      el.style.display = 'block'; // Force display style for transform, 'block' ensures it stays on its own line
      el.style.width = 'max-content'; // Crucial: forces block width to tightly hug the text so scrollWidth and scaleX work perfectly
      el.style.margin = `${descMarginTop} auto ${descMarginBottom}`; // Apply editable margins
      
      if (dupEl) {
        dupEl.style.fontSize = '5vw';
        dupEl.style.transform = 'none';
        dupEl.style.display = 'block'; // 'block' forces line break
        dupEl.style.width = 'max-content'; 
        dupEl.style.margin = '0 auto';
        dupEl.style.marginTop = derivedDescMarginTop; 
        dupEl.style.marginBottom = derivedDescMarginBottom;
      }
      
      // Force repaint/reflow to ensure accurate measurement after resetting transforms
      void el.offsetHeight;
      if (dupEl) void dupEl.offsetHeight;

      // EDITABLE: Set the maximum width allowed for these text lines before they begin horizontally condensing (squishing).
      // Example: 0.85 means "85% of the screen width". 
      const MAX_WIDTH_RATIO = 0.85; 

      // EDITABLE: Set the maximum width specific to the secondary "Right now" verbal description.
      // Example: 40 means 40vw.
      const MAX_DUP_WIDTH_VW = 40;
      
      // Force synchronous layout to measure and shrink if necessary
      const targetWidth = window.innerWidth * MAX_WIDTH_RATIO; 
      const targetDupWidth = window.innerWidth * (MAX_DUP_WIDTH_VW / 100);

      // Measure using scrollWidth because it ignores bounding box limits if text tries to overflow
      if (el.scrollWidth > targetWidth) {
        const ratio = targetWidth / el.scrollWidth;
        // Squish horizontally (condense) rather than reducing height/font-size
        el.style.transform = `scaleX(${ratio})`;
        el.style.transformOrigin = 'center center';
      }

      // Apply same horizontal squish logic to duplicate if needed, using its own custom width
      if (dupEl) {
        // Default scale X is 1.0 to precisely match the "feels like" line
        // We only shrink further if that effective width exceeds targetDupWidth.
        const defaultScale = 1.0;
        const effectiveWidth = dupEl.scrollWidth * defaultScale;
        
        let finalScale = defaultScale;
        if (effectiveWidth > targetDupWidth) {
          // If it's too wide at 1.0, calculate the extra ratio needed
          finalScale = targetDupWidth / dupEl.scrollWidth;
        }
        
        dupEl.style.transform = `scaleX(${finalScale})`;
        dupEl.style.transformOrigin = 'center center';
      }

      // Update the side-scrolling image based on the description
      const descImageEl = document.getElementById('weather-desc-image');
      const descImageLeftEl = document.getElementById('weather-desc-image-left');
      if (descImageEl || descImageLeftEl) {
        // Determine if it is currently night time
        const now = Math.floor(Date.now() / 1000);
        const sunrise = data?.current?.sunrise || data?.daily?.[0]?.sunrise;
        const sunset = data?.current?.sunset || data?.daily?.[0]?.sunset;
        let isNight = false;
        if (sunrise && sunset) {
          isNight = now < sunrise || now >= sunset;
        }

        const baseFileName = 'desc-' + description.toLowerCase().replace(/\s+/g, '-') + '.jpg';

        // Update track variables for color checking
        currentIsNight = isNight;
        currentBaseFileName = baseFileName;

        // Update the simple month text colors immediately
        updateSimpleMonthColors();

        const dayImgPath = 'img/' + baseFileName;
        const nightImgPath = WEATHER_CIRCLES_NIGHT_IMAGE_FORCE_CLEAR ? WEATHER_CIRCLES_NIGHT_IMAGE : ('img/dark-' + baseFileName);
        const fallbackPath = 'img/desc-rem.jpg';
        const primaryImgPath = isNight ? nightImgPath : dayImgPath;

        // Determine effective display mode based on hover (opposite of current mode)
        const effectiveShowDopplerLeft = leftRadarHovered ? !SHOW_DOPPLER_RADAR_LEFT : SHOW_DOPPLER_RADAR_LEFT;
        const effectiveShowDopplerRight = rightRadarHovered ? !SHOW_DOPPLER_RADAR_RIGHT : SHOW_DOPPLER_RADAR_RIGHT;
        
        // Zoom levels and offsets are fixed constants (Close and Far views)
        const zoomLeft = RAINVIEWER_ZOOM_LEFT;
        const zoomRight = RAINVIEWER_ZOOM_RIGHT;
        
        const nwsZoomLeft = RADAR_ZOOM_LEFT;
        const nwsZoomRight = RADAR_ZOOM_RIGHT;
        
        const nwsOffsetXLeft = RADAR_OFFSET_X_LEFT;
        const nwsOffsetYLeft = RADAR_OFFSET_Y_LEFT;
        
        const nwsOffsetXRight = RADAR_OFFSET_X_RIGHT;
        const nwsOffsetYRight = RADAR_OFFSET_Y_RIGHT;
        
        // Pre-calculate slippy parameters for LEFT
        const coordsLeft = getTileCoords(LAT, LON, zoomLeft);
        const x0Left = Math.floor(coordsLeft.x);
        const y0Left = Math.floor(coordsLeft.y);
        const dXLeft = coordsLeft.x - x0Left;
        const dYLeft = coordsLeft.y - y0Left;
        const x_startLeft = (dXLeft < 0.5) ? x0Left - 1 : x0Left;
        const y_startLeft = (dYLeft < 0.5) ? y0Left - 1 : y0Left;

        // Pre-calculate slippy parameters for RIGHT
        const coordsRight = getTileCoords(LAT, LON, zoomRight);
        const x0Right = Math.floor(coordsRight.x);
        const y0Right = Math.floor(coordsRight.y);
        const dXRight = coordsRight.x - x0Right;
        const dYRight = coordsRight.y - y0Right;
        const x_startRight = (dXRight < 0.5) ? x0Right - 1 : x0Right;
        const y_startRight = (dYRight < 0.5) ? y0Right - 1 : y0Right;

        let framesRight = [];
        if (descImageEl) {
          if (effectiveShowDopplerRight) {
            descImageEl.classList.add('radar-mode');
            descImageEl.style.backgroundImage = '';
            descImageEl.style.backgroundColor = '';
            descImageEl.style.setProperty('--radar-fade-duration', `${RADAR_FADE_DURATION_MS}ms`);
            framesRight = descImageEl.querySelectorAll('.radar-frame');
            
            // Calculate coordinates and offsets dynamically to center the RainViewer map on LAT/LON for the right circle
            const coords = getTileCoords(LAT, LON, zoomRight);
            const x0 = Math.floor(coords.x);
            const y0 = Math.floor(coords.y);
            const dX = coords.x - x0;
            const dY = coords.y - y0;
            
            const x_start = (dX < 0.5) ? x0 - 1 : x0;
            const y_start = (dY < 0.5) ? y0 - 1 : y0;
            const dX_new = coords.x - x_start;
            const dY_new = coords.y - y_start;
            
            const gridLeftPct = (0.5 - dX_new) * 100;
            const gridTopPct = (0.5 - dY_new) * 100;

            let targetParentRight = descImageEl.querySelector('.radar-screen') || descImageEl;

            if (framesRight.length !== RADAR_FRAME_COUNT || descImageEl.getAttribute('data-zoom-level') !== String(zoomRight)) {
              descImageEl.setAttribute('data-zoom-level', String(zoomRight));
              descImageEl.querySelectorAll('.radar-frame').forEach(f => f.remove());
              descImageEl.querySelectorAll('.radar-sweep-line').forEach(l => l.remove());
              descImageEl.querySelectorAll('.radar-center-dot').forEach(d => d.remove());
              descImageEl.querySelectorAll('.radar-frames-container').forEach(c => c.remove());
              descImageEl.querySelectorAll('.radar-map-bg').forEach(m => m.remove());
              descImageEl.querySelectorAll('.radar-oklahoma-outline').forEach(o => o.remove());
              descImageEl.querySelectorAll('.radar-ring-25-right').forEach(r => r.remove());
              descImageEl.querySelectorAll('.radar-ring-50-right').forEach(r => r.remove());
              descImageEl.querySelectorAll('.radar-screen').forEach(s => s.remove());
              
              const screenContainer = document.createElement('div');
              screenContainer.className = 'radar-screen';
              descImageEl.appendChild(screenContainer);
              targetParentRight = screenContainer;

              const mapBg = document.createElement('div');
              mapBg.className = 'radar-map-bg';
              mapBg.style.cssText = `
                position: absolute;
                width: 200%; height: 200%;
                left: ${gridLeftPct}%;
                top: ${gridTopPct}%;
                background-position: 0% 0%, 100% 0%, 0% 100%, 100% 100%;
                background-size: 50% 50%, 50% 50%, 50% 50%, 50% 50%;
                background-repeat: no-repeat;
                z-index: 1;
                pointer-events: none;
              `;
              screenContainer.appendChild(mapBg);

              const framesContainer = document.createElement('div');
              framesContainer.className = 'radar-frames-container';
              framesContainer.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                pointer-events: none;
                z-index: 2;
                filter: blur(var(--radar-blur-amount, 1.2px));
              `;
              screenContainer.appendChild(framesContainer);
              
              framesRight = [];
              for (let i = RADAR_FRAME_COUNT - 1; i >= 0; i--) {
                const frame = document.createElement('div');
                frame.className = 'radar-frame';
                frame.style.cssText = `
                  position: absolute;
                  width: 200%; height: 200%;
                  left: ${gridLeftPct}%;
                  top: ${gridTopPct}%;
                  background-position: 0% 0%, 100% 0%, 0% 100%, 100% 100%;
                  background-size: 50% 50%, 50% 50%, 50% 50%, 50% 50%;
                  background-repeat: no-repeat;
                  opacity: ${i === 0 ? 1 : 0};
                  transition: opacity var(--radar-fade-duration, 400ms) var(--radar-fade-timing, ease-in-out);
                  filter: url(\${window.location.href.split('#')[0]}#remove-blue-haze) !important;
                  will-change: opacity, transform;
                `;
                framesContainer.appendChild(frame);
                framesRight.push(frame);
              }

              // Create the sweep line element
              const sweepLine = document.createElement('div');
              sweepLine.className = 'radar-sweep-line';
              screenContainer.appendChild(sweepLine);

              // Create the center dot element (100% solid white, z above animation)
              const centerDot = document.createElement('div');
              centerDot.className = 'radar-center-dot';
              screenContainer.appendChild(centerDot);
            } else {
              framesRight.forEach(frame => {
                frame.style.left = `${gridLeftPct}%`;
                frame.style.top = `${gridTopPct}%`;
              });
              const mapBg = descImageEl.querySelector('.radar-map-bg');
              if (mapBg) {
                mapBg.style.left = `${gridLeftPct}%`;
                mapBg.style.top = `${gridTopPct}%`;
              }
              if (!descImageEl.querySelector('.radar-center-dot')) {
                const centerDot = document.createElement('div');
                centerDot.className = 'radar-center-dot';
                targetParentRight.appendChild(centerDot);
              }
            }

            // Create/update or remove Oklahoma state outline depending on whether current location is Tulsa
            if (isTulsaArea(LAT, LON)) {
              let okOutline = descImageEl.querySelector('.radar-oklahoma-outline');
              if (!okOutline) {
                okOutline = document.createElement('div');
                okOutline.className = 'radar-oklahoma-outline';
                okOutline.style.cssText = `
                  position: absolute;
                  width: 200%; height: 200%;
                  left: ${gridLeftPct}%;
                  top: ${gridTopPct}%;
                  pointer-events: none;
                  z-index: 3;
                `;
                okOutline.innerHTML = `
                  <svg viewBox="0 0 2 2" style="width: 100%; height: 100%; display: block; overflow: visible;">
                    <path d="${generateOklahomaPath(zoomRight, x_start, y_start)}" fill="none" stroke="var(--clock-grid-track-color, rgba(255, 255, 255, 0.2))" stroke-width="1.2px" vector-effect="non-scaling-stroke" />
                  </svg>
                `;
                targetParentRight.appendChild(okOutline);
              } else {
                okOutline.style.left = `${gridLeftPct}%`;
                okOutline.style.top = `${gridTopPct}%`;
                const pathEl = okOutline.querySelector('path');
                if (pathEl) {
                  pathEl.setAttribute('d', generateOklahomaPath(zoomRight, x_start, y_start));
                }
              }
            } else {
              descImageEl.querySelectorAll('.radar-oklahoma-outline').forEach(o => o.remove());
            }
            
            // Append 25mi and 50mi range rings dynamically (Right circle is Close view)
            if (!descImageEl.querySelector('.radar-ring-25-right')) {
              const r25 = document.createElement('div');
              r25.className = 'radar-ring-25-right';
              targetParentRight.appendChild(r25);
            }
            if (!descImageEl.querySelector('.radar-ring-50-right')) {
              const r50 = document.createElement('div');
              r50.className = 'radar-ring-50-right';
              targetParentRight.appendChild(r50);
            }
          } else {
            descImageEl.classList.remove('radar-mode');
            descImageEl.querySelectorAll('.radar-frame').forEach(f => f.remove());
            descImageEl.querySelectorAll('.radar-sweep-line').forEach(l => l.remove());
            descImageEl.querySelectorAll('.radar-center-dot').forEach(d => d.remove());
            descImageEl.querySelectorAll('.radar-frames-container').forEach(c => c.remove());
            descImageEl.querySelectorAll('.radar-map-bg').forEach(m => m.remove());
            descImageEl.querySelectorAll('.radar-oklahoma-outline').forEach(o => o.remove());
            descImageEl.querySelectorAll('.radar-ring-25-right').forEach(r => r.remove());
            descImageEl.querySelectorAll('.radar-ring-50-right').forEach(r => r.remove());
            descImageEl.querySelectorAll('.radar-screen').forEach(s => s.remove());
            
            // Set standard background image
            const imgPreload = new Image();
            imgPreload.onload = () => {
              descImageEl.style.backgroundImage = `url('${primaryImgPath}')`;
            };
            imgPreload.onerror = () => {
              if (isNight) {
                const nightFallback = WEATHER_CIRCLES_NIGHT_IMAGE_FORCE_CLEAR ? WEATHER_CIRCLES_NIGHT_IMAGE : dayImgPath;
                const dayPreload = new Image();
                dayPreload.onload = () => { descImageEl.style.backgroundImage = `url('${nightFallback}')`; };
                dayPreload.onerror = () => { descImageEl.style.backgroundImage = `url('${fallbackPath}')`; };
                dayPreload.src = nightFallback;
              } else {
                descImageEl.style.backgroundImage = `url('${fallbackPath}')`;
              }
            };
            imgPreload.src = primaryImgPath;
          }
        }

        let framesLeft = [];
        if (descImageLeftEl) {
          if (effectiveShowDopplerLeft) {
            descImageLeftEl.classList.add('radar-mode');
            descImageLeftEl.style.backgroundImage = '';
            descImageLeftEl.style.backgroundColor = '';
            descImageLeftEl.style.setProperty('--radar-fade-duration', `${RADAR_FADE_DURATION_MS}ms`);
            framesLeft = descImageLeftEl.querySelectorAll('.radar-frame');
            
            // Calculate coordinates and offsets dynamically to center the RainViewer map on LAT/LON for the left circle
            const coords = getTileCoords(LAT, LON, zoomLeft);
            const x0 = Math.floor(coords.x);
            const y0 = Math.floor(coords.y);
            const dX = coords.x - x0;
            const dY = coords.y - y0;
            
            // Adjust the loaded tiles based on whether center coordinates fall in left/right or top/bottom halves of the tile
            const x_start = (dX < 0.5) ? x0 - 1 : x0;
            const y_start = (dY < 0.5) ? y0 - 1 : y0;
            const dX_new = coords.x - x_start;
            const dY_new = coords.y - y_start;
            
            const frameLeftPct = 50 - dX_new * 100 * RADAR_SCALE_FACTOR;
            const frameTopPct = 50 - dY_new * 100 * RADAR_SCALE_FACTOR;

            let targetParentLeft = descImageLeftEl.querySelector('.radar-screen') || descImageLeftEl;

            if (framesLeft.length !== RADAR_FRAME_COUNT || descImageLeftEl.getAttribute('data-zoom-level') !== String(zoomLeft)) {
              descImageLeftEl.setAttribute('data-zoom-level', String(zoomLeft));
              descImageLeftEl.querySelectorAll('.radar-frame').forEach(f => f.remove());
              descImageLeftEl.querySelectorAll('.radar-sweep-line').forEach(l => l.remove());
              descImageLeftEl.querySelectorAll('.radar-center-dot').forEach(d => d.remove());
              descImageLeftEl.querySelectorAll('.radar-frames-container').forEach(c => c.remove());
              descImageLeftEl.querySelectorAll('.radar-map-bg').forEach(m => m.remove());
              descImageLeftEl.querySelectorAll('.radar-oklahoma-outline').forEach(o => o.remove());
              descImageLeftEl.querySelectorAll('.radar-ring-25-right').forEach(r => r.remove());
              descImageLeftEl.querySelectorAll('.radar-ring-50-right').forEach(r => r.remove());
              descImageLeftEl.querySelectorAll('.radar-screen').forEach(s => s.remove());
              
              const screenLeft = document.createElement('div');
              screenLeft.className = 'radar-screen';
              descImageLeftEl.appendChild(screenLeft);
              targetParentLeft = screenLeft;

              const mapBg = document.createElement('div');
              mapBg.className = 'radar-map-bg';
              mapBg.style.cssText = `
                position: absolute;
                width: ${200 * RADAR_SCALE_FACTOR}%; height: ${200 * RADAR_SCALE_FACTOR}%;
                left: ${frameLeftPct}%;
                top: ${frameTopPct}%;
                background-position: 0% 0%, 100% 0%, 0% 100%, 100% 100%;
                background-size: 50% 50%, 50% 50%, 50% 50%, 50% 50%;
                background-repeat: no-repeat;
                z-index: 1;
                pointer-events: none;
              `;
              screenLeft.appendChild(mapBg);

              const framesContainer = document.createElement('div');
              framesContainer.className = 'radar-frames-container';
              framesContainer.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                pointer-events: none;
                z-index: 2;
                filter: blur(var(--radar-blur-amount, 1.2px));
              `;
              screenLeft.appendChild(framesContainer);
              
              framesLeft = [];
              for (let i = RADAR_FRAME_COUNT - 1; i >= 0; i--) {
                const frame = document.createElement('div');
                frame.className = 'radar-frame';
                frame.style.cssText = `
                  position: absolute;
                  width: ${200 * RADAR_SCALE_FACTOR}%; height: ${200 * RADAR_SCALE_FACTOR}%;
                  left: ${frameLeftPct}%;
                  top: ${frameTopPct}%;
                  background-position: 0% 0%, 100% 0%, 0% 100%, 100% 100%;
                  background-size: 50% 50%, 50% 50%, 50% 50%, 50% 50%;
                  background-repeat: no-repeat;
                  opacity: ${i === 0 ? 1 : 0};
                  transition: opacity var(--radar-fade-duration, 400ms) var(--radar-fade-timing, ease-in-out);
                  filter: url(\${window.location.href.split('#')[0]}#remove-blue-haze) !important;
                  will-change: opacity, transform;
                `;
                framesContainer.appendChild(frame);
                framesLeft.push(frame);
              }

              // Create the sweep line element
              const sweepLine = document.createElement('div');
              sweepLine.className = 'radar-sweep-line';
              screenLeft.appendChild(sweepLine);

              // Create the center dot element (100% solid white, z above animation)
              const centerDot = document.createElement('div');
              centerDot.className = 'radar-center-dot';
              screenLeft.appendChild(centerDot);
            } else {
              framesLeft.forEach(frame => {
                frame.style.left = `${frameLeftPct}%`;
                frame.style.top = `${frameTopPct}%`;
              });
              const mapBg = descImageLeftEl.querySelector('.radar-map-bg');
              if (mapBg) {
                mapBg.style.left = `${frameLeftPct}%`;
                mapBg.style.top = `${frameTopPct}%`;
              }
              if (!descImageLeftEl.querySelector('.radar-center-dot')) {
                const centerDot = document.createElement('div');
                centerDot.className = 'radar-center-dot';
                targetParentLeft.appendChild(centerDot);
              }
            }

            // Create/update or remove Oklahoma state outline depending on whether current location is Tulsa
            if (isTulsaArea(LAT, LON)) {
              let okOutlineLeft = descImageLeftEl.querySelector('.radar-oklahoma-outline');
              if (!okOutlineLeft) {
                okOutlineLeft = document.createElement('div');
                okOutlineLeft.className = 'radar-oklahoma-outline';
                okOutlineLeft.style.cssText = `
                  position: absolute;
                  width: ${200 * RADAR_SCALE_FACTOR}%; height: ${200 * RADAR_SCALE_FACTOR}%;
                  left: ${frameLeftPct}%;
                  top: ${frameTopPct}%;
                  pointer-events: none;
                  z-index: 3;
                `;
                okOutlineLeft.innerHTML = `
                  <svg viewBox="0 0 2 2" style="width: 100%; height: 100%; display: block; overflow: visible;">
                    <path d="${generateOklahomaPath(zoomLeft, x_start, y_start)}" fill="none" stroke="var(--clock-grid-track-color, rgba(255, 255, 255, 0.2))" stroke-width="1.2px" vector-effect="non-scaling-stroke" />
                  </svg>
                `;
                targetParentLeft.appendChild(okOutlineLeft);
              } else {
                okOutlineLeft.style.left = `${frameLeftPct}%`;
                okOutlineLeft.style.top = `${frameTopPct}%`;
                const pathEl = okOutlineLeft.querySelector('path');
                if (pathEl) {
                  pathEl.setAttribute('d', generateOklahomaPath(zoomLeft, x_start, y_start));
                }
              }
            } else {
              descImageLeftEl.querySelectorAll('.radar-oklahoma-outline').forEach(o => o.remove());
            }
            
            // Left circle is Far view, so ensure no range rings are appended
            descImageLeftEl.querySelectorAll('.radar-ring-25-right').forEach(r => r.remove());
            descImageLeftEl.querySelectorAll('.radar-ring-50-right').forEach(r => r.remove());
          } else {
            descImageLeftEl.classList.remove('radar-mode');
            descImageLeftEl.querySelectorAll('.radar-frame').forEach(f => f.remove());
            descImageLeftEl.querySelectorAll('.radar-sweep-line').forEach(l => l.remove());
            descImageLeftEl.querySelectorAll('.radar-center-dot').forEach(d => d.remove());
            descImageLeftEl.querySelectorAll('.radar-frames-container').forEach(c => c.remove());
            descImageLeftEl.querySelectorAll('.radar-map-bg').forEach(m => m.remove());
            descImageLeftEl.querySelectorAll('.radar-oklahoma-outline').forEach(o => o.remove());
            descImageLeftEl.querySelectorAll('.radar-screen').forEach(s => s.remove());
            
            // Set standard background image
            const imgPreload = new Image();
            imgPreload.onload = () => {
              descImageLeftEl.style.backgroundImage = `url('${primaryImgPath}')`;
            };
            imgPreload.onerror = () => {
              if (isNight) {
                const nightFallback = WEATHER_CIRCLES_NIGHT_IMAGE_FORCE_CLEAR ? WEATHER_CIRCLES_NIGHT_IMAGE : dayImgPath;
                const dayPreload = new Image();
                dayPreload.onload = () => { descImageLeftEl.style.backgroundImage = `url('${nightFallback}')`; };
                dayPreload.onerror = () => { descImageLeftEl.style.backgroundImage = `url('${fallbackPath}')`; };
                dayPreload.src = nightFallback;
              } else {
                descImageLeftEl.style.backgroundImage = `url('${fallbackPath}')`;
              }
            };
            imgPreload.src = primaryImgPath;
          }
        }

        const timeParam = Math.floor(Date.now() / 1200000);

        // Set static map backgrounds once (CartoDB dark matter)
        const mapBgLeft = descImageLeftEl ? descImageLeftEl.querySelector('.radar-map-bg') : null;
        if (effectiveShowDopplerLeft && mapBgLeft && latestRainViewerData) {
          const baseTilesLeft = [
            `https://basemaps.cartocdn.com/dark_all/${zoomLeft}/${x_startLeft}/${y_startLeft}.png`,
            `https://basemaps.cartocdn.com/dark_all/${zoomLeft}/${x_startLeft+1}/${y_startLeft}.png`,
            `https://basemaps.cartocdn.com/dark_all/${zoomLeft}/${x_startLeft}/${y_startLeft+1}.png`,
            `https://basemaps.cartocdn.com/dark_all/${zoomLeft}/${x_startLeft+1}/${y_startLeft+1}.png`
          ];
          mapBgLeft.style.backgroundImage = `
            url('${baseTilesLeft[0]}'), url('${baseTilesLeft[1]}'), url('${baseTilesLeft[2]}'), url('${baseTilesLeft[3]}')
          `;
          mapBgLeft.style.display = 'block';
        } else if (mapBgLeft) {
          mapBgLeft.style.backgroundImage = 'none';
          mapBgLeft.style.display = 'none';
        }

        const mapBgRight = descImageEl ? descImageEl.querySelector('.radar-map-bg') : null;
        if (effectiveShowDopplerRight && mapBgRight && latestRainViewerData) {
          const baseTilesRight = [
            `https://basemaps.cartocdn.com/dark_all/${zoomRight}/${x_startRight}/${y_startRight}.png`,
            `https://basemaps.cartocdn.com/dark_all/${zoomRight}/${x_startRight+1}/${y_startRight}.png`,
            `https://basemaps.cartocdn.com/dark_all/${zoomRight}/${x_startRight}/${y_startRight+1}.png`,
            `https://basemaps.cartocdn.com/dark_all/${zoomRight}/${x_startRight+1}/${y_startRight+1}.png`
          ];
          mapBgRight.style.backgroundImage = `
            url('${baseTilesRight[0]}'), url('${baseTilesRight[1]}'), url('${baseTilesRight[2]}'), url('${baseTilesRight[3]}')
          `;
          mapBgRight.style.display = 'block';
        } else if (mapBgRight) {
          mapBgRight.style.backgroundImage = 'none';
          mapBgRight.style.display = 'none';
        }

        for (let i = 0; i < RADAR_FRAME_COUNT; i++) {
          const frameNum = (RADAR_FRAME_COUNT - 1) - i;
          
          // Left circle (RainViewer)
          if (effectiveShowDopplerLeft && descImageLeftEl && framesLeft[i]) {
            if (latestRainViewerData && latestRainViewerData.radar && latestRainViewerData.radar.past) {
              const pastFrames = latestRainViewerData.radar.past;
              const frameIndex = pastFrames.length - 1 - frameNum;
              const rvFrame = pastFrames[frameIndex] || pastFrames[pastFrames.length - 1];
              const host = latestRainViewerData.host || 'https://tilecache.rainviewer.com';
              const path = rvFrame.path;
              
              const rvTiles = [
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomLeft}/${x_startLeft}/${y_startLeft}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomLeft}/${x_startLeft+1}/${y_startLeft}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomLeft}/${x_startLeft}/${y_startLeft+1}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomLeft}/${x_startLeft+1}/${y_startLeft+1}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`
              ];
              
              framesLeft[i].style.backgroundImage = `
                url('${rvTiles[0]}'), url('${rvTiles[1]}'), url('${rvTiles[2]}'), url('${rvTiles[3]}')
              `;
              framesLeft[i].style.backgroundPosition = '0% 0%, 100% 0%, 0% 100%, 100% 100%';
              framesLeft[i].style.backgroundSize = '50% 50%, 50% 50%, 50% 50%, 50% 50%';
            } else {
              const fallbackFrameNum = Math.min(3, frameNum);
              const conusUrl = `https://radar.weather.gov/ridge/standard/CONUS_${fallbackFrameNum}.gif?t=${timeParam}`;
              framesLeft[i].style.backgroundImage = `url('${conusUrl}')`;
              framesLeft[i].style.backgroundSize = `calc(${nwsZoomLeft} * 100%) auto`;
              framesLeft[i].style.backgroundPosition = `calc(50% + ${nwsOffsetXLeft}) calc(50% + ${nwsOffsetYLeft})`;
            }
          }

          // Right circle (RainViewer)
          if (effectiveShowDopplerRight && descImageEl && framesRight[i]) {
            if (latestRainViewerData && latestRainViewerData.radar && latestRainViewerData.radar.past) {
              const pastFrames = latestRainViewerData.radar.past;
              const frameIndex = pastFrames.length - 1 - frameNum;
              const rvFrame = pastFrames[frameIndex] || pastFrames[pastFrames.length - 1];
              const host = latestRainViewerData.host || 'https://tilecache.rainviewer.com';
              const path = rvFrame.path;
              
              const rvTiles = [
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomRight}/${x_startRight}/${y_startRight}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomRight}/${x_startRight+1}/${y_startRight}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomRight}/${x_startRight}/${y_startRight+1}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomRight}/${x_startRight+1}/${y_startRight+1}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`
              ];
              
              framesRight[i].style.backgroundImage = `
                url('${rvTiles[0]}'), url('${rvTiles[1]}'), url('${rvTiles[2]}'), url('${rvTiles[3]}')
              `;
              framesRight[i].style.backgroundPosition = '0% 0%, 100% 0%, 0% 100%, 100% 100%';
              framesRight[i].style.backgroundSize = '50% 50%, 50% 50%, 50% 50%, 50% 50%';
            } else {
              const fallbackFrameNum = Math.min(3, frameNum);
              const url = `https://radar.weather.gov/ridge/standard/${currentRadarStation}_${fallbackFrameNum}.gif?t=${timeParam}`;
              framesRight[i].style.backgroundImage = `url('${url}')`;
              framesRight[i].style.backgroundSize = `calc(${nwsZoomRight} * 100%) auto`;
              framesRight[i].style.backgroundPosition = `calc(50% + ${nwsOffsetXRight}) calc(50% + ${nwsOffsetYRight})`;
            }
          }
        }

        if (effectiveShowDopplerRight || effectiveShowDopplerLeft) {
          startRadarLoop(
            effectiveShowDopplerRight ? framesRight : null,
            effectiveShowDopplerLeft ? framesLeft : null
          );
        } else {
          if (radarLoopIntervalId) {
            clearInterval(radarLoopIntervalId);
            radarLoopIntervalId = null;
          }
          if (radarSweepIntervalId) {
            clearInterval(radarSweepIntervalId);
            radarSweepIntervalId = null;
          }
        }
      }
      
      // Clear drop shadow on the white date and time text (removed as requested)
      const simpleMonthEl = document.getElementById('simple-month');
      const simpleMonthLeftEl = document.getElementById('simple-month-left');
      if (simpleMonthEl) simpleMonthEl.style.textShadow = 'none';
      if (simpleMonthLeftEl) simpleMonthLeftEl.style.textShadow = 'none';
    } else {
      el.textContent = '';
    }

    // Initialize dots countdown with current temperature
    initDotsCountdown(currentTemp);

    if (typeof updateStarfieldMask === 'function') {
      requestAnimationFrame(updateStarfieldMask);
    }
  }

  // --- Dots Countdown Config ---
  // Easily editable settings for the top refresh dots row
  const REFRESH_DOTS_RIGHT_GAP_VW = 30; // EDITABLE: Empty space on the right side (in vw). Try 20 or 30!
  const DOT_SIZE_VW = 0.9;  // Match sun/moon rows
  const DOT_GAP_VW = 0.49;  // Match sun/moon rows
  // Auto-calculates exactly how many dots fit in the remaining space!
  const DOTS_COUNT = Math.floor((100 - REFRESH_DOTS_RIGHT_GAP_VW + DOT_GAP_VW) / (DOT_SIZE_VW + DOT_GAP_VW)); 
  const DOT_SIZE = `${DOT_SIZE_VW}vw`;
  const DOT_GAP = `${DOT_GAP_VW}vw`;
  // Default to a mid-range temperature color (60s°F range) - will be overridden by actual temp color
  const DOT_COLOR_ACTIVE = 'hsl(80, 90%, 40%)';
  const DOT_COLOR_INACTIVE = 'hsla(80, 90%, 40%, 0.15)';

  // --- Temp Format Buttons Config ---
  const TEMP_BTN_FONT_SIZE = '3.5vw'; // EDITABLE: Button font size (225%)
  const TEMP_BTN_FONT_FAMILY = "'bold', sans-serif"; // EDITABLE: Font style
  const TEMP_BTN_BORDER_RADIUS = '0vw'; // EDITABLE: Outline rounded corners
  const TEMP_BTN_BORDER_THICKNESS = '0vw'; // EDITABLE: Outline thickness
  const TEMP_BTN_PADDING = '0.4vw 1.2vw'; // EDITABLE: Inside spacing (top/bottom left/right)
  const TEMP_BTN_GAP = '2vw'; // EDITABLE: Space between the two buttons
  const TEMP_BTN_OFFSET_X = '5.25vw'; // EDITABLE: Left/Right position (positive = right, negative = left)
  const TEMP_BTN_OFFSET_Y = '-24.75vw'; // EDITABLE: Up/Down position (negative = UP, positive = DOWN)

  // --- Wind Dots Config ---
  // Easily editable settings for the wind speed dots row
  const WIND_DOTS_COUNT = 60;
  const WIND_DOT_SIZE = '1vw'; // Adjusted to fit all 60 dots
  const WIND_DOT_GAP = '0.2vw';  // Slightly larger gap
  const WIND_LABEL_FONT_SIZE = '4.5vw'; // 2x text size (was 2.25vw)
  const WIND_MAX_MPH = 60;
  const WIND_MARGIN_TOP = '1.5vw';       // EDITABLE: Gap above the wind dots row
  const WIND_LABEL_OFFSET_Y = '-1vw';   // EDITABLE: Gap between the dots and the label
  const WIND_MARGIN_BOTTOM = '4vw';    // EDITABLE: Gap below the wind dots row

  // --- Humidity Dots Config ---
  // Settings for the RH (relative humidity) dots row
  const HUMIDITY_DOTS_COUNT = 60;  // Match wind row dot count
  const HUMIDITY_DOT_SIZE = '1vw';
  const HUMIDITY_DOT_GAP = '0.5vw';  // Match wind row gap
  const HUMIDITY_LABEL_FONT_SIZE = '4.5vw'; // 2x text size (was 2.25vw)
  const HUMIDITY_MAX_PERCENT = 100;
  const HUMIDITY_MARGIN_TOP = '7.25vw';      // EDITABLE: Gap above the humidity dots row
  const HUMIDITY_LABEL_OFFSET_Y = '-1vw';  // EDITABLE: Gap between the dots and the label
  const HUMIDITY_MARGIN_BOTTOM = '4vw';   // EDITABLE: Gap below the humidity dots row

  // --- Dewpoint Dots Config ---
  // Settings for the dew point dots row (20° to 80°)
  const DEWPOINT_DOTS_COUNT = 61;  // 61 dots for 20° to 80° range (inclusive)
  const DEWPOINT_DOT_SIZE = '1vw';
  const DEWPOINT_DOT_GAP = '0.46vw';
  const DEWPOINT_LABEL_FONT_SIZE = '4.5vw'; // Match humidity label size
  const DEWPOINT_MIN_TEMP = 20;  // Minimum temperature for dots
  const DEWPOINT_MAX_TEMP = 80;  // Maximum temperature for dots
  const DEWPOINT_MARGIN_TOP = '7.25vw';      // EDITABLE: Gap above the dewpoint dots row
  const DEWPOINT_LABEL_OFFSET_Y = '-1vw';  // EDITABLE: Gap between the dots and the label
  const DEWPOINT_MARGIN_BOTTOM = '4vw';   // EDITABLE: Gap below the dewpoint dots row

  // --- Sun Position Dots Config ---
  // Settings for the sun position dots row (24 hours visualization)
  const SUN_DOTS_COUNT = 72;  // 72 dots for 24 hours (20 minutes per dot)
  const SUN_DOT_SIZE = '0.9vw';  // Slightly smaller than wind/humidity dots
  const SUN_DOT_GAP = '0.46vw';
  const SUN_CURRENT_DOT_SCALE = 2.5;  // 250% bigger for the "dot of the moment"
  const SUN_MARGIN_TOP = '6.75vw';      // EDITABLE: Gap above the sun dots row
  const SUN_LABEL_OFFSET_Y = '-1.5vw'; // EDITABLE: Gap between the dots and the labels
  const SUN_LABEL_FONT_SIZE = '4.5vw'; // EDITABLE: Font size for sun labels
  const SUN_MARGIN_BOTTOM = '4vw';   // EDITABLE: Gap below the sun dots row

  // --- Moon Rise/Set Dots Config ---
  // Settings for the moon rise/set dots row (24 hours visualization)
  const MOON_DOTS_COUNT = 72;  // 72 dots for 24 hours (20 minutes per dot)
  const MOON_DOT_SIZE = '0.9vw';
  const MOON_DOT_GAP = '0.46vw';
  const MOON_CURRENT_DOT_SCALE = 2.5;  // 250% bigger for the "dot of the moment"
  const MOON_MARGIN_TOP = '6vw';       // EDITABLE: Gap above the moon dots row
  const MOON_LABEL_OFFSET_Y = '-1.5vw'; // EDITABLE: Gap between the dots and the labels
  const MOON_LABEL_FONT_SIZE = '4.5vw'; // EDITABLE: Font size for moon labels
  const MOON_MARGIN_BOTTOM = '-8vw';    // EDITABLE: Gap below the moon dots row

  // --- Live Sun Image & Solar Animation Config (GOES-19 SUVI Fe195 Å) ---
  // Live Sunspot & Coronal image from NOAA GOES-19 Solar Ultraviolet Imager
  // Band: Fe195 Å (Iron XII, 195 Ångströms, signature orange-red)
  // Website: https://www.star.nesdis.noaa.gov/goes/SUVI_band.php?sat=G19&band=Fe195&length=60
  const SUN_IMAGE_BASE_URL = 'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/';
  const SUN_IMAGE_URL = 'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/latest.jpg';

  // Duo Celestial Mode (Side-by-Side: Pacific Dial, Big Sun, Big Earth, UK Dial) Controls (JCV)
  const SUN_DUO_MODE = true;                          // EDITABLE: true = celestial row active; false = single sun


  // Celestial Interactivity & Refresh Controls (JCV)
  const CELESTIAL_ROTATION_ON_CLICK = true;           // EDITABLE: Clicking Sun or Earth triggers 1 round of rotation
  const CELESTIAL_ROTATION_ON_REFRESH = true;         // EDITABLE: 5-minute countdown refresh triggers 1 round of rotation for both
  const CELESTIAL_ROTATE_ON_INITIAL_LOAD = false;     // EDITABLE: false = static live on page load until clicked or refreshed; true = 1 round on load

  // Left Circle: Sun Live (GOES-19 SUVI Fe195 Å) 27-Day Rotation Controls (JCV)
  const SUN_ANIMATION_ENABLED = true;                 // EDITABLE: Enable/disable time-span rotation animation
  const SUN_ANIMATION_DAYS = 27;                      // EDITABLE: Number of data days in time span (27 = full solar synodic rotation)
  const SUN_ANIMATION_FPS = 12;                       // EDITABLE: Default frames per second (e.g. 12 = ~4.5s for 54-frame rotation cycle)
  const SUN_ANIMATION_FPS_DESKTOP = 12;               // EDITABLE Desktop: Frames per second (playback speed)
  const SUN_ANIMATION_FPS_MOBILE = 12;                // EDITABLE Mobile: Frames per second (playback speed)
  const SUN_ANIMATION_CROSSFADE_ENABLED = true;       // EDITABLE: Enable/disable smooth dual-buffer cross-fade between rotation frames
  const SUN_ANIMATION_CROSSFADE_MS_DESKTOP = 60;      // EDITABLE Desktop: Cross-fade transition duration in milliseconds (e.g. 50-70ms)
  const SUN_ANIMATION_CROSSFADE_MS_MOBILE = 60;       // EDITABLE Mobile: Cross-fade transition duration in milliseconds (e.g. 50-70ms)
  const SUN_ANIMATION_LOOP_PAUSE_MS = 1200;           // EDITABLE: Pause in ms on the latest frame before repeating loop
  const SUN_ANIMATION_RESOLUTION = '600x600';         // EDITABLE: Resolution ('600x600' or '300x300')

  // Ease-In & Ease-Out Playback Dynamics (JCV)
  // Eases out of the Live frame pause (slow start accelerating to cruise speed)
  // and eases into the Live frame stop (decelerating smoothly before the pause)
  const SUN_ANIMATION_EASE_ENABLED = true;              // EDITABLE: Enable/disable ease-in and ease-out speed ramping
  const SUN_ANIMATION_EASE_FRAMES_DESKTOP = 4;          // EDITABLE Desktop: Number of frames to ease in and ease out (e.g. 5-7)
  const SUN_ANIMATION_EASE_FRAMES_MOBILE = 4;           // EDITABLE Mobile: Number of frames to ease in and ease out
  const SUN_ANIMATION_EASE_MAX_DELAY_MS_DESKTOP = 200;  // EDITABLE Desktop: Delay in ms for slowest ease frame (cruising is ~83ms)
  const SUN_ANIMATION_EASE_MAX_DELAY_MS_MOBILE = 200;   // EDITABLE Mobile: Delay in ms for slowest ease frame

  // Verified 27-day historical frame sequence (55 frames sampled at 12-hour intervals up to today noon, ending with live sun)
  const SUN_ANIMATION_FRAMES = [
    '20262300000468_GOES19-SUVI-Fe195-600x600.jpg',
    '20262301200483_GOES19-SUVI-Fe195-600x600.jpg',
    '20262310000499_GOES19-SUVI-Fe195-600x600.jpg',
    '20262311200514_GOES19-SUVI-Fe195-600x600.jpg',
    '20262320000529_GOES19-SUVI-Fe195-600x600.jpg',
    '20262321200544_GOES19-SUVI-Fe195-600x600.jpg',
    '20262330000560_GOES19-SUVI-Fe195-600x600.jpg',
    '20262331200575_GOES19-SUVI-Fe195-600x600.jpg',
    '20262340000590_GOES19-SUVI-Fe195-600x600.jpg',
    '20262341201005_GOES19-SUVI-Fe195-600x600.jpg',
    '20262350001020_GOES19-SUVI-Fe195-600x600.jpg',
    '20262351201036_GOES19-SUVI-Fe195-600x600.jpg',
    '20262360001051_GOES19-SUVI-Fe195-600x600.jpg',
    '20262361201066_GOES19-SUVI-Fe195-600x600.jpg',
    '20262370001081_GOES19-SUVI-Fe195-600x600.jpg',
    '20262371201096_GOES19-SUVI-Fe195-600x600.jpg',
    '20262380000011_GOES19-SUVI-Fe195-600x600.jpg',
    '20262381200026_GOES19-SUVI-Fe195-600x600.jpg',
    '20262390000042_GOES19-SUVI-Fe195-600x600.jpg',
    '20262391200057_GOES19-SUVI-Fe195-600x600.jpg',
    '20262400000072_GOES19-SUVI-Fe195-600x600.jpg',
    '20262401200087_GOES19-SUVI-Fe195-600x600.jpg',
    '20262410000102_GOES19-SUVI-Fe195-600x600.jpg',
    '20262411200117_GOES19-SUVI-Fe195-600x600.jpg',
    '20262420000132_GOES19-SUVI-Fe195-600x600.jpg',
    '20262421200147_GOES19-SUVI-Fe195-600x600.jpg',
    '20262430000163_GOES19-SUVI-Fe195-600x600.jpg',
    '20262431200178_GOES19-SUVI-Fe195-600x600.jpg',
    '20262440000193_GOES19-SUVI-Fe195-600x600.jpg',
    '20262441200208_GOES19-SUVI-Fe195-600x600.jpg',
    '20262450000223_GOES19-SUVI-Fe195-600x600.jpg',
    '20262451200238_GOES19-SUVI-Fe195-600x600.jpg',
    '20262460000253_GOES19-SUVI-Fe195-600x600.jpg',
    '20262461200268_GOES19-SUVI-Fe195-600x600.jpg',
    '20262470000283_GOES19-SUVI-Fe195-600x600.jpg',
    '20262471200298_GOES19-SUVI-Fe195-600x600.jpg',
    '20262480000312_GOES19-SUVI-Fe195-600x600.jpg',
    '20262481200327_GOES19-SUVI-Fe195-600x600.jpg',
    '20262490000342_GOES19-SUVI-Fe195-600x600.jpg',
    '20262491200357_GOES19-SUVI-Fe195-600x600.jpg',
    '20262500000372_GOES19-SUVI-Fe195-600x600.jpg',
    '20262501200387_GOES19-SUVI-Fe195-600x600.jpg',
    '20262510000402_GOES19-SUVI-Fe195-600x600.jpg',
    '20262511200417_GOES19-SUVI-Fe195-600x600.jpg',
    '20262520000400_GOES19-SUVI-Fe195-600x600.jpg',
    '20262521200415_GOES19-SUVI-Fe195-600x600.jpg',
    '20262530000430_GOES19-SUVI-Fe195-600x600.jpg',
    '20262531200445_GOES19-SUVI-Fe195-600x600.jpg',
    '20262540000460_GOES19-SUVI-Fe195-600x600.jpg',
    '20262541200474_GOES19-SUVI-Fe195-600x600.jpg',
    '20262550000489_GOES19-SUVI-Fe195-600x600.jpg',
    '20262551200004_GOES19-SUVI-Fe195-600x600.jpg',
    '20262560000019_GOES19-SUVI-Fe195-600x600.jpg',
    '20262561200034_GOES19-SUVI-Fe195-600x600.jpg',
    'latest.jpg'
  ];

  // Left Sun ("Sizzling Live Sun") Controls (JCV)
  // Plays back recent stepped frames back-and-forth (ping-pong) to show live solar flare activity & winking white dots
  const SUN_SIZZLE_ENABLED = true;                    // EDITABLE: Enable/disable animation for left sizzling sun
  const SUN_SIZZLE_BAND = 'Fe195';                    // EDITABLE: NOAA SUVI band: 'Fe195' (coronal loops/bronze), 'Fe094' (hot solar flares/blue), 'He304' (prominence eruptions/red)
  const SUN_SIZZLE_FETCH_LENGTH = 240;                // EDITABLE: Historical buffer to pull from NOAA (60 = ~1 hr, 120 = ~2 hrs, 240 = ~4 hrs)
  const SUN_SIZZLE_FRAME_STEP = 3;                    // EDITABLE: Cadence step (~3-4m apart so solar flares visibly boil and wink with white dots)
  const SUN_SIZZLE_FRAME_COUNT = 36;                  // EDITABLE: Number of recent stepped frames in loop (e.g. 24, 36, 48)
  const SUN_SIZZLE_FPS_DESKTOP = 10;                  // EDITABLE Desktop: Sizzle playback speed in FPS (8-12 FPS allows eye to clearly track flare eruptions & winking dots)
  const SUN_SIZZLE_FPS_MOBILE = 10;                   // EDITABLE Mobile: Sizzle playback speed in FPS
  const SUN_SIZZLE_FPS = 10;                          // EDITABLE: Fallback / default FPS
  const SUN_SIZZLE_PAUSE_END_MS = 150;                // EDITABLE: Pause in ms at turnaround ends (live frame and oldest frame) before reversing (0 for instant)
  const SUN_SIZZLE_PLAYBACK_MODE = 'pingpong';        // EDITABLE: 'pingpong' (1..36..1) or 'forward' (1..36, 1..36)
  const SUN_SIZZLE_CROSSFADE_MS_DESKTOP = 35;         // EDITABLE Desktop: Cross-fade transition in ms between sizzle frames (eliminates flicker)
  const SUN_SIZZLE_CROSSFADE_MS_MOBILE = 35;          // EDITABLE Mobile: Cross-fade transition in ms between sizzle frames
  const SUN_SIZZLE_AUTO_REFRESH_MS = 3 * 60 * 1000;   // EDITABLE: Auto-fetch fresh SUVI frames every 3 minutes

  // Seed list of latest stepped real-time NOAA SUVI Fe195 frames (~4m cadence spanning ~2.5 hrs for vivid flare sizzling)
  const SUN_SIZZLE_FRAMES_SEED = [
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572148075_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572152075_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572156075_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572200575_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572204576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572208576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572212576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572216576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572220576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572224576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572228576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572232576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572236576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572240576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572244576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572248576_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572252577_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572256577_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572301477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572305477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572309477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572313477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572317477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572321477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572325477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572329477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572333477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572337477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572341477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572345477_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572349478_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572353478_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262572357478_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262580002578_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262580006578_GOES19-SUVI-Fe195-600x600.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/SUVI/FD/Fe195/20262580010578_GOES19-SUVI-Fe195-600x600.jpg'
  ];

  // =========================================================================
  // --- Sun & Earth Sizing Config (JCV) ---
  // Direct vw unit configuration (e.g. '32vw', '20vw', or plain numbers like 32, 20)
  // =========================================================================
  const SUN_IMAGE_WIDTH_DESKTOP = 'auto';             // EDITABLE Desktop: 'auto' (scales via SUN_SIZE_SCALE_DESKTOP below, e.g. 1.85) or direct vw (e.g. '32vw')
  const SUN_IMAGE_WIDTH_MOBILE = 'auto';              // EDITABLE Mobile: 'auto' (scales via SUN_SIZE_SCALE_MOBILE below) or direct vw

  const EARTH_IMAGE_WIDTH_DESKTOP = 'auto';           // EDITABLE Desktop: 'auto' (scales via EARTH_SIZE_SCALE_DESKTOP below, e.g. 0.92 = 16vw) or direct vw
  const EARTH_IMAGE_WIDTH_MOBILE = 'auto';            // EDITABLE Mobile: 'auto' (scales via EARTH_SIZE_SCALE_MOBILE below) or direct vw

  // =========================================================================
  // --- Space Above & Below Celestial Row (JCV) ---
  // Space between the top Timezone Clocks row and this Celestial (Pacific, Sun, Earth, UK) row
  // =========================================================================
  const CELESTIAL_ROW_MARGIN_TOP_DESKTOP = '1.5vw';   // EDITABLE Desktop: Space ABOVE celestial row (gap below timezone clocks)
  const CELESTIAL_ROW_MARGIN_TOP_MOBILE = '2vw';      // EDITABLE Mobile: Space ABOVE celestial row (gap below timezone clocks)
  const CELESTIAL_ROW_MARGIN_BOTTOM_DESKTOP = '2vw';  // EDITABLE Desktop: Space BELOW celestial row (gap above city switcher)
  const CELESTIAL_ROW_MARGIN_BOTTOM_MOBILE = '0vw';   // EDITABLE Mobile: Space BELOW celestial row

  // Compatibility aliases
  const SUN_IMAGE_MARGIN_TOP_DESKTOP = CELESTIAL_ROW_MARGIN_TOP_DESKTOP;
  const SUN_IMAGE_MARGIN_TOP_MOBILE = CELESTIAL_ROW_MARGIN_TOP_MOBILE;
  const SUN_IMAGE_MARGIN_BOTTOM_DESKTOP = CELESTIAL_ROW_MARGIN_BOTTOM_DESKTOP;
  const SUN_IMAGE_MARGIN_BOTTOM_MOBILE = CELESTIAL_ROW_MARGIN_BOTTOM_MOBILE;

  // =========================================================================
  // --- Sun Sizing & Position Controls (JCV) ---
  // =========================================================================
  const SUN_IMAGE_INNER_SCALE_DESKTOP = 'auto';       // EDITABLE Desktop: 'auto' (scales with Sun width * 1.08 to crop watermark) or custom vw string (e.g. '34.5vw')
  const SUN_IMAGE_INNER_SCALE_MOBILE = 'auto';        // EDITABLE Mobile: 'auto' or custom vw string
  const SUN_IMAGE_OFFSET_Y_DESKTOP = '0vw';           // EDITABLE Desktop: Vertical position in vw (positive = DOWN, negative = UP; e.g. '0vw', '-0.5vw', '1vw')
  const SUN_IMAGE_OFFSET_Y_MOBILE = '0vw';            // EDITABLE Mobile: Vertical position in vw (positive = DOWN, negative = UP)
  const SUN_IMAGE_OFFSET_X_DESKTOP = '0vw';           // EDITABLE Desktop: Horizontal position in vw (positive = RIGHT, negative = LEFT; e.g. '0vw', '0.5vw', '-1vw')
  const SUN_IMAGE_OFFSET_X_MOBILE = '0vw';            // EDITABLE Mobile: Horizontal position in vw (positive = RIGHT, negative = LEFT)

  const SUN_MASK_RADIUS_DESKTOP = '49.5%';            // EDITABLE Desktop: Circular mask radius
  const SUN_MASK_RADIUS_MOBILE = '49.5%';             // EDITABLE Mobile: Circular mask radius
  const SUN_MASK_POSITION_Y_DESKTOP = '50%';          // EDITABLE Desktop: Mask center Y position
  const SUN_MASK_POSITION_Y_MOBILE = '50%';           // EDITABLE Mobile: Mask center Y position
  const SUN_IMAGE_OPACITY_DESKTOP = 1.0;              // EDITABLE Desktop: Overall opacity (0.0 to 1.0)
  const SUN_IMAGE_OPACITY_MOBILE = 1.0;               // EDITABLE Mobile: Overall opacity (0.0 to 1.0)
  const SUN_IMAGE_BLEND_MODE_DESKTOP = 'lighten';     // EDITABLE Desktop: Blend mode on dark background ('lighten', 'screen', etc.)
  const SUN_IMAGE_BLEND_MODE_MOBILE = 'lighten';      // EDITABLE Mobile: Blend mode on dark background

  // =========================================================================
  // --- Earth Sizing & Position Controls (JCV) ---
  // =========================================================================
  const EARTH_IMAGE_INNER_SCALE_DESKTOP = 'auto';     // EDITABLE Desktop: 'auto' (matches Earth width) or custom vw string (e.g. '16vw')
  const EARTH_IMAGE_INNER_SCALE_MOBILE = 'auto';      // EDITABLE Mobile: 'auto' or custom vw string
  const EARTH_IMAGE_OFFSET_Y_DESKTOP = '0vw';         // EDITABLE Desktop: Vertical position in vw (positive = DOWN, negative = UP; e.g. '0vw', '-0.5vw', '1vw')
  const EARTH_IMAGE_OFFSET_Y_MOBILE = '0vw';          // EDITABLE Mobile: Vertical position in vw (positive = DOWN, negative = UP)
  const EARTH_IMAGE_OFFSET_X_DESKTOP = '0vw';         // EDITABLE Desktop: Horizontal position in vw (positive = RIGHT, negative = LEFT; e.g. '0vw', '0.5vw', '-1vw')
  const EARTH_IMAGE_OFFSET_X_MOBILE = '0vw';          // EDITABLE Mobile: Horizontal position in vw (positive = RIGHT, negative = LEFT)

  // =========================================================================
  // --- Sun & Earth Sizing Scale Controls (JCV) ---
  // Direct scale multipliers relative to the timezone clock dial size (var(--world-clock-size)):
  // e.g. 1.0 = exactly matches clock size (17.4vw); 1.85 = 185% size (~32vw); 1.2 = 120% size (~21vw)
  // =========================================================================
  const SUN_SIZE_SCALE_DESKTOP = 2.0;                // EDITABLE Desktop: Sun diameter multiplier (1.85 = ~32vw, 1.2 = ~21vw, 2.0 = ~35vw)
  const SUN_SIZE_SCALE_MOBILE = 2.0;                 // EDITABLE Mobile: Sun diameter multiplier
  const SUN_CORONA_SCALE_DESKTOP = SUN_SIZE_SCALE_DESKTOP;
  const SUN_CORONA_SCALE_MOBILE = SUN_SIZE_SCALE_MOBILE;
  const EARTH_SIZE_SCALE_DESKTOP = 1.6;              // EDITABLE Desktop: Earth diameter multiplier (0.92 = ~16vw, 1.0 = ~17.4vw)
  const EARTH_SIZE_SCALE_MOBILE = 1.55;               // EDITABLE Mobile: Earth diameter multiplier
  const EARTH_GLOBE_SCALE_DESKTOP = EARTH_SIZE_SCALE_DESKTOP;
  const EARTH_GLOBE_SCALE_MOBILE = EARTH_SIZE_SCALE_MOBILE;

  // =========================================================================
  // --- Celestial Row: 4-Object Gaps & Lateral Edge Anchors (JCV) ---
  // Row sequence: [ Object 1: Pacific ] <--> [ Object 2: Sun (150%) ] <--> [ Object 3: Earth ] <--> [ Object 4: UK ]
  // Dials #1 and #4 are anchored to the 95vw boundaries directly under Timezone Clocks #1 & #5.
  // Gaps between dials adjust spacing WITHOUT moving dials #1 and #4 laterally.
  // =========================================================================

  // Exterior Edge Controls (establishes the 95% vw alignment directly under clocks #1 & #5)
  // By default 0vw so Dial #1 is flush with the left of 95vw, and Dial #4 is flush with the right of 95vw.
  const CELESTIAL_ROW_EDGE_GAP_LEFT_DESKTOP = '0vw';          // EDITABLE Desktop: Edge offset for #1 (Pacific) from 95% left boundary
  const CELESTIAL_ROW_EDGE_GAP_LEFT_MOBILE = '0vw';           // EDITABLE Mobile: Edge offset for #1 (Pacific) from 95% left boundary
  const CELESTIAL_ROW_EDGE_GAP_RIGHT_DESKTOP = '0vw';         // EDITABLE Desktop: Edge offset for #4 (UK) from 95% right boundary
  const CELESTIAL_ROW_EDGE_GAP_RIGHT_MOBILE = '0vw';          // EDITABLE Mobile: Edge offset for #4 (UK) from 95% right boundary

  // Object 1: Left Dial (Pacific) <--> Object 2: Sun
  const GAP_PACIFIC_TO_SUN_DESKTOP = '0vw';                   // EDITABLE Desktop: Spacing between 'Pacific' dial and the Sun (0vw = evenly distributed)
  const GAP_PACIFIC_TO_SUN_MOBILE = '0vw';                    // EDITABLE Mobile: Spacing between 'Pacific' dial and the Sun
  const CELESTIAL_DIAL_LEFT_GAP_RIGHT_DESKTOP = GAP_PACIFIC_TO_SUN_DESKTOP; // Compatibility alias
  const CELESTIAL_DIAL_LEFT_GAP_RIGHT_MOBILE = GAP_PACIFIC_TO_SUN_MOBILE;   // Compatibility alias

  // Object 2: Sun (150% size) <--> Object 3: Earth (Derived Middle Space)
  const SUN_GAP_LEFT_DESKTOP = '-3.6vw';                     // EDITABLE Desktop: Additional gap to the left of Sun (perfected by user)
  const SUN_GAP_LEFT_MOBILE = '-3.6vw';                          // EDITABLE Mobile: Additional gap to the left of Sun
  // The gap between Sun and Earth is NOT explicitly defined; it is derived automatically
  // from the remaining space in the 95vw row between the left pair (Pacific/Sun) and right pair (Earth/UK).
  // Resizing Sun expands rightward into this space; resizing Earth expands leftward into this space.
  const GAP_SUN_TO_EARTH_DESKTOP = 'auto';                     // DERIVED: Remaining space between Sun & Earth (automatic)
  const GAP_SUN_TO_EARTH_MOBILE = 'auto';                      // DERIVED: Remaining space between Sun & Earth (automatic)
  const SUN_GAP_RIGHT_DESKTOP = GAP_SUN_TO_EARTH_DESKTOP;      // Compatibility alias
  const SUN_GAP_RIGHT_MOBILE = GAP_SUN_TO_EARTH_MOBILE;        // Compatibility alias

  // Object 3: Earth <--> Object 4: Right Dial (UK)
  // Editable fixed gap between Earth (#3) and UK dial (#4).
  // Dial #4 (UK) is fixed at the right 95% edge. When Earth is resized, Dial #4 does NOT move,
  // and this gap stays fixed (Earth grows/shrinks towards the Sun into the derived middle space).
  const GAP_EARTH_TO_UK_DESKTOP = '1.6vw';                       // EDITABLE Desktop: Spacing between Earth and UK dial (e.g. '0vw', '-2vw', '2.5vw')
  const GAP_EARTH_TO_UK_MOBILE = '1.4vw';                        // EDITABLE Mobile: Spacing between Earth and UK dial
  const EARTH_GAP_RIGHT_DESKTOP = GAP_EARTH_TO_UK_DESKTOP;     // Compatibility alias for Earth-to-UK gap
  const EARTH_GAP_RIGHT_MOBILE = GAP_EARTH_TO_UK_MOBILE;       // Compatibility alias
  const EARTH_GAP_LEFT_DESKTOP = '0vw';                        // EDITABLE Desktop: Additional gap to the left of Earth
  const EARTH_GAP_LEFT_MOBILE = '0vw';                         // EDITABLE Mobile: Additional gap to the left of Earth

  // Object 4: Right Dial (UK)
  const CELESTIAL_DIAL_RIGHT_GAP_LEFT_DESKTOP = '0vw';         // EDITABLE Desktop: Gap to the left of Right Dial
  const CELESTIAL_DIAL_RIGHT_GAP_LEFT_MOBILE = '0vw';          // EDITABLE Mobile: Gap to the left of Right Dial

  // Compatibility aliases
  const SUN_DUO_GAP_DESKTOP = SUN_GAP_RIGHT_DESKTOP;
  const SUN_DUO_GAP_MOBILE = SUN_GAP_RIGHT_MOBILE;
  const CELESTIAL_DUO_WIDTH_DESKTOP = 'auto';
  // =========================================================================
  // --- EDITABLE: Solar Flare Scale Dial Config (JCV) ---
  // Replaces the left flanking dial placeholder in the Celestial row
  // =========================================================================
  const SOLAR_FLARE_DIAL_ENABLED = true;                         // EDITABLE: Enable/disable Solar Flare scale dial in celestial row
  const SOLAR_FLARE_MODE = 'live';                               // EDITABLE: 'manual' (uses manual class/value below) or 'live' (NOAA SWPC GOES satellite)
  const SOLAR_FLARE_CLASS_MANUAL = 'C';                          // EDITABLE: Manual test class: 'A', 'B', 'C', 'M', or 'X'
  const SOLAR_FLARE_VALUE_MANUAL = 2.8;                          // EDITABLE: Manual test value (e.g. 1.0 to 9.9, or higher for X)
  const SOLAR_FLARE_CLICK_CYCLES_CLASSES = true;                 // EDITABLE: Click/tap dial to cycle through test flare levels (A -> B -> C -> M -> X)
  const SOLAR_FLARE_AUTO_REFRESH_MS = 60000;                     // EDITABLE: Polling interval in ms for live NOAA flare data

  // --- Temperature Colors per Solar Flare Level (JCV) ---
  // Assign numeric temperature degree (maps directly to app's TEMP_COLORS palette)
  // OR assign a custom CSS color string (e.g. 'hsl(30, 100%, 50%)', '#f2534b')
  const SOLAR_FLARE_COLOR_LEVEL_A = 55;                          // EDITABLE: Level A (Micro/Background) temperature color (50s green/aqua)
  const SOLAR_FLARE_COLOR_LEVEL_B = 75;                          // EDITABLE: Level B (Minor) temperature color (70s yellow-gold)
  const SOLAR_FLARE_COLOR_LEVEL_C = 95;                          // EDITABLE: Level C (Small) temperature color (90s tomato red / coral matching screenshot)
  const SOLAR_FLARE_COLOR_LEVEL_M = 105;                         // EDITABLE: Level M (Medium) temperature color (100s vibrant red)
  const SOLAR_FLARE_COLOR_LEVEL_X = 115;                         // EDITABLE: Level X (Major) temperature color (110s deep red)
  const SOLAR_FLARE_COLOR_OVERRIDE = null;                       // EDITABLE: Optional universal color override (e.g. null, 95, or '#f2534b')

  // --- Level Descriptive Labels (JCV) ---
  const SOLAR_FLARE_LABEL_A_LINE1 = 'MICRO';                     // EDITABLE: Line 1 label for Class A
  const SOLAR_FLARE_LABEL_A_LINE2 = 'FLARE';                     // EDITABLE: Line 2 label for Class A
  const SOLAR_FLARE_LABEL_B_LINE1 = 'MINOR';                     // EDITABLE: Line 1 label for Class B
  const SOLAR_FLARE_LABEL_B_LINE2 = 'FLARE';                     // EDITABLE: Line 2 label for Class B
  const SOLAR_FLARE_LABEL_C_LINE1 = 'SMALL';                     // EDITABLE: Line 1 label for Class C (matches screenshot)
  const SOLAR_FLARE_LABEL_C_LINE2 = 'FLARE';                     // EDITABLE: Line 2 label for Class C (matches screenshot)
  const SOLAR_FLARE_LABEL_M_LINE1 = 'MEDIUM';                    // EDITABLE: Line 1 label for Class M
  const SOLAR_FLARE_LABEL_M_LINE2 = 'FLARE';                     // EDITABLE: Line 2 label for Class M
  const SOLAR_FLARE_LABEL_X_LINE1 = 'MAJOR';                     // EDITABLE: Line 1 label for Class X
  const SOLAR_FLARE_LABEL_X_LINE2 = 'FLARE';                     // EDITABLE: Line 2 label for Class X

  // --- Circular Progress Ring & Track (JCV) ---
  const SOLAR_FLARE_START_ANGLE_DEG = 90;                        // EDITABLE: Arc start angle (90deg in SVG = 6 o'clock / lowest point)
  const SOLAR_FLARE_TRACK_COLOR = 'rgba(255, 255, 255, 0.22)';  // EDITABLE: Background circular track ring color
  const SOLAR_FLARE_TRACK_STROKE_WIDTH_DESKTOP = 4.0;            // EDITABLE Desktop: SVG track stroke thickness
  const SOLAR_FLARE_TRACK_STROKE_WIDTH_MOBILE = 4.0;             // EDITABLE Mobile: SVG track stroke thickness
  const SOLAR_FLARE_PROGRESS_STROKE_WIDTH_DESKTOP = 4.0;         // EDITABLE Desktop: SVG active progress stroke thickness
  const SOLAR_FLARE_PROGRESS_STROKE_WIDTH_MOBILE = 4.0;          // EDITABLE Mobile: SVG active progress stroke thickness
  const SOLAR_FLARE_STROKE_LINECAP = 'butt';                     // EDITABLE: Progress arc end cap ('butt' for flush radial cut as in screenshot, or 'round')
  const SOLAR_FLARE_ANIM_DURATION_S = 0.8;                       // EDITABLE: Transition duration in seconds for arc updates

  // --- Dial Frame & Sizing (JCV) ---
  const SOLAR_FLARE_DIAL_SIZE_DESKTOP = 'auto';                  // EDITABLE Desktop: 'auto' (matches var(--celestial-dial-size)) or custom vw
  const SOLAR_FLARE_DIAL_SIZE_MOBILE = 'auto';                   // EDITABLE Mobile: 'auto' or custom vw
  const SOLAR_FLARE_OFFSET_X_DESKTOP = '0vw';                    // EDITABLE Desktop: Fine horizontal nudge for dial circle
  const SOLAR_FLARE_OFFSET_X_MOBILE = '0vw';                     // EDITABLE Mobile: Fine horizontal nudge
  const SOLAR_FLARE_OFFSET_Y_DESKTOP = '0vw';                    // EDITABLE Desktop: Fine vertical nudge for dial circle
  const SOLAR_FLARE_OFFSET_Y_MOBILE = '0vw';                     // EDITABLE Mobile: Fine vertical nudge
  const SOLAR_FLARE_DIAL_BG_COLOR = 'transparent';               // EDITABLE: Dial circle background color
  const SOLAR_FLARE_DIAL_INNER_SHADOW = 'inset 0 0 1vw rgba(0, 0, 0, 0.5)'; // EDITABLE: Dial inner shadow

  // --- Typography & Text Positioning (JCV) ---
  // Top Label ("SMALL FLARE")
  const SOLAR_FLARE_LABEL_FONT_FAMILY = "'euro', sans-serif";    // EDITABLE: Top label font-family ("euro" = EurostileExtended)
  const SOLAR_FLARE_LABEL_FONT_SIZE_DESKTOP = 'calc(var(--solar-flare-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.088)'; // EDITABLE Desktop: Top label font size
  const SOLAR_FLARE_LABEL_FONT_SIZE_MOBILE = 'calc(var(--solar-flare-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.088)';  // EDITABLE Mobile: Top label font size
  const SOLAR_FLARE_LABEL_LINE_HEIGHT = 1.0;                     // EDITABLE: Top label line height
  const SOLAR_FLARE_LABEL_LETTER_SPACING_DESKTOP = '0.04em';     // EDITABLE Desktop: Top label letter spacing
  const SOLAR_FLARE_LABEL_LETTER_SPACING_MOBILE = '0.04em';      // EDITABLE Mobile: Top label letter spacing
  const SOLAR_FLARE_LABEL_OFFSET_Y_DESKTOP = '0vw';              // EDITABLE Desktop: Fine vertical nudge for top label
  const SOLAR_FLARE_LABEL_OFFSET_Y_MOBILE = '0vw';               // EDITABLE Mobile: Fine vertical nudge for top label
  const SOLAR_FLARE_GAP_LABEL_TO_CLASS_DESKTOP = 'calc(var(--solar-flare-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.025)'; // EDITABLE Desktop: Gap between label and giant class letter
  const SOLAR_FLARE_GAP_LABEL_TO_CLASS_MOBILE = 'calc(var(--solar-flare-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.025)';  // EDITABLE Mobile: Gap between label and giant class letter

  // Middle Giant Class Letter ("C")
  const SOLAR_FLARE_CLASS_FONT_FAMILY = "'euro-bold', sans-serif"; // EDITABLE: Giant class letter font-family ("euro-bold" = EurostileExtendedBlack)
  const SOLAR_FLARE_CLASS_FONT_SIZE_DESKTOP = 'calc(var(--solar-flare-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.38)'; // EDITABLE Desktop: Giant class letter font size
  const SOLAR_FLARE_CLASS_FONT_SIZE_MOBILE = 'calc(var(--solar-flare-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.38)';  // EDITABLE Mobile: Giant class letter font size
  const SOLAR_FLARE_CLASS_LINE_HEIGHT = 0.82;                    // EDITABLE: Giant class letter line height
  const SOLAR_FLARE_CLASS_OFFSET_Y_DESKTOP = '0vw';              // EDITABLE Desktop: Fine vertical nudge for giant class letter
  const SOLAR_FLARE_CLASS_OFFSET_Y_MOBILE = '0vw';               // EDITABLE Mobile: Fine vertical nudge for giant class letter
  const SOLAR_FLARE_GAP_CLASS_TO_VALUE_DESKTOP = 'calc(var(--solar-flare-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.02)'; // EDITABLE Desktop: Gap between giant class letter and bottom value
  const SOLAR_FLARE_GAP_CLASS_TO_VALUE_MOBILE = 'calc(var(--solar-flare-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.02)';  // EDITABLE Mobile: Gap between giant class letter and bottom value

  // Bottom Decimal Value ("2.8")
  const SOLAR_FLARE_VALUE_FONT_FAMILY = "'euro-bold', sans-serif"; // EDITABLE: Bottom value font-family ("euro-bold" = EurostileExtendedBlack)
  const SOLAR_FLARE_VALUE_FONT_SIZE_DESKTOP = 'calc(var(--solar-flare-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.175)'; // EDITABLE Desktop: Bottom value font size
  const SOLAR_FLARE_VALUE_FONT_SIZE_MOBILE = 'calc(var(--solar-flare-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.175)';  // EDITABLE Mobile: Bottom value font size
  const SOLAR_FLARE_VALUE_LINE_HEIGHT = 0.92;                    // EDITABLE: Bottom value line height
  const SOLAR_FLARE_VALUE_LETTER_SPACING_DESKTOP = '0.02em';     // EDITABLE Desktop: Bottom value letter spacing
  const SOLAR_FLARE_VALUE_LETTER_SPACING_MOBILE = '0.02em';      // EDITABLE Mobile: Bottom value letter spacing
  const SOLAR_FLARE_VALUE_OFFSET_Y_DESKTOP = '-.5vw';              // EDITABLE Desktop: Fine vertical nudge for bottom value
  const SOLAR_FLARE_VALUE_OFFSET_Y_MOBILE = '0vw';               // EDITABLE Mobile: Fine vertical nudge for bottom value

  // Overall Content Block Alignment
  const SOLAR_FLARE_CONTENT_OFFSET_Y_DESKTOP = '0vw';            // EDITABLE Desktop: Vertical nudge for entire text block inside dial
  const SOLAR_FLARE_CONTENT_OFFSET_Y_MOBILE = '0vw';             // EDITABLE Mobile: Vertical nudge for entire text block inside dial

  // Sublabel Below Dial (Strategy 3: Live Impact)
  const SOLAR_FLARE_SUBLABEL_ENABLED = true;                     // EDITABLE: Enable/disable live impact label below dial
  const SOLAR_FLARE_SUBLABEL_MODE = 'dynamic';                   // EDITABLE: 'dynamic' (strategy 3: changes with level) or 'static' (uses static text below)
  const SOLAR_FLARE_SUBLABEL_TEXT_DESKTOP = 'Solar Flare';       // EDITABLE Desktop: Static fallback text
  const SOLAR_FLARE_SUBLABEL_TEXT_MOBILE = 'Solar Flare';        // EDITABLE Mobile: Static fallback text
  const SOLAR_FLARE_SUBLABEL_FONT_FAMILY = "var(--sun-label-font-family, 'light', sans-serif)"; // EDITABLE: Font family ('light', 'euro', 'bold', etc.)
  const SOLAR_FLARE_SUBLABEL_FONT_SIZE_DESKTOP = '1.35vw';        // EDITABLE Desktop: Sublabel font size
  const SOLAR_FLARE_SUBLABEL_FONT_SIZE_MOBILE = '2.6vw';         // EDITABLE Mobile: Sublabel font size
  const SOLAR_FLARE_SUBLABEL_LINE_HEIGHT = 1.15;                 // EDITABLE: Sublabel line height for multi-line
  const SOLAR_FLARE_SUBLABEL_LETTER_SPACING_DESKTOP = '0.04vw';  // EDITABLE Desktop: Sublabel letter spacing
  const SOLAR_FLARE_SUBLABEL_LETTER_SPACING_MOBILE = '0.04vw';   // EDITABLE Mobile: Sublabel letter spacing
  const SOLAR_FLARE_SUBLABEL_COLOR = 'auto';                     // EDITABLE: 'auto' (matches dial color) or custom CSS color (e.g. 'rgba(255, 255, 255, 0.70)')
  const SOLAR_FLARE_SUBLABEL_MARGIN_TOP_DESKTOP = '0.8vw';       // EDITABLE Desktop: Margin top below dial circle
  const SOLAR_FLARE_SUBLABEL_MARGIN_TOP_MOBILE = '1.5vw';        // EDITABLE Mobile: Margin top below dial circle
  const SOLAR_FLARE_SUBLABEL_OFFSET_Y_DESKTOP = '0vw';           // EDITABLE Desktop: Fine vertical nudge
  const SOLAR_FLARE_SUBLABEL_OFFSET_Y_MOBILE = '0vw';            // EDITABLE Mobile: Fine vertical nudge

  // Strategy 3: Dynamic Live Impact Sublabels per Solar Flare Level
  const SOLAR_FLARE_IMPACT_LEVEL_A_ARROW = 'down';               // EDITABLE: Arrow direction ('up' or 'down')
  const SOLAR_FLARE_IMPACT_LEVEL_A_TEXT = 'Quiet Sun';           // EDITABLE: Situation text (can use <br> for multi-line)
  const SOLAR_FLARE_IMPACT_LEVEL_B_ARROW = 'down';               // EDITABLE: Arrow direction ('up' or 'down')
  const SOLAR_FLARE_IMPACT_LEVEL_B_TEXT = 'Nominal Activity';    // EDITABLE: Situation text
  const SOLAR_FLARE_IMPACT_LEVEL_C_ARROW = 'up';                 // EDITABLE: Arrow direction ('up' or 'down')
  const SOLAR_FLARE_IMPACT_LEVEL_C_TEXT = 'Low Activity';        // EDITABLE: Situation text
  const SOLAR_FLARE_IMPACT_LEVEL_M_ARROW = 'up';                 // EDITABLE: Arrow direction ('up' or 'down')
  const SOLAR_FLARE_IMPACT_LEVEL_M_TEXT = 'Radio Comm<br>Advisory'; // EDITABLE: Situation text
  const SOLAR_FLARE_IMPACT_LEVEL_X_ARROW = 'up';                 // EDITABLE: Arrow direction ('up' or 'down')
  const SOLAR_FLARE_IMPACT_LEVEL_X_TEXT = 'Radiation<br>Hazard'; // EDITABLE: Situation text

  // =========================================================================
  // --- EDITABLE: Radio Blackout (R-Scale) Dial Config (JCV) ---
  // Replaces the right flanking dial (UK) in the Celestial row
  // =========================================================================
  const RADIO_BLACKOUT_DIAL_ENABLED = true;                      // EDITABLE: Enable/disable Radio Blackout dial in celestial row
  const RADIO_BLACKOUT_MODE = 'live';                            // EDITABLE: 'live' (NOAA SWPC real-time) or 'manual' (uses manual class/value below)
  const RADIO_BLACKOUT_CLASS_MANUAL = 'R2';                      // EDITABLE: Manual test class: 'R0', 'R1', 'R2', 'R3', 'R4', 'R5'
  const RADIO_BLACKOUT_VALUE_MANUAL = 2.8;                       // EDITABLE: Manual test value in dB (e.g. 2.8db matches mockup)
  const RADIO_BLACKOUT_CLICK_CYCLES_CLASSES = true;              // EDITABLE: Click/tap dial to cycle through test levels (R0 -> R1 -> R2 -> R3 -> R4 -> R5 -> Live)
  const RADIO_BLACKOUT_AUTO_REFRESH_MS = 60000;                  // EDITABLE: Polling interval in ms for live NOAA blackout data

  // --- Temperature Colors per Radio Blackout Level (JCV) ---
  // Assign numeric temperature degree (maps directly to app's TEMP_COLORS palette)
  // OR assign a custom CSS color string (e.g. 'hsl(30, 100%, 50%)', '#f60')
  const RADIO_BLACKOUT_COLOR_LEVEL_R0 = 55;                      // EDITABLE: Level R0 (No Fade / Normal) temperature color (50s green)
  const RADIO_BLACKOUT_COLOR_LEVEL_R1 = 75;                      // EDITABLE: Level R1 (Weak Fade) temperature color (70s yellow-gold)
  const RADIO_BLACKOUT_COLOR_LEVEL_R2 = 85;                      // EDITABLE: Level R2 (Partial Fade) temperature color (80s orange, matches mockup)
  const RADIO_BLACKOUT_COLOR_LEVEL_R3 = 95;                      // EDITABLE: Level R3 (Strong Fade) temperature color (90s tomato coral/red)
  const RADIO_BLACKOUT_COLOR_LEVEL_R4 = 105;                     // EDITABLE: Level R4 (Severe Fade) temperature color (100s vibrant red)
  const RADIO_BLACKOUT_COLOR_LEVEL_R5 = 115;                     // EDITABLE: Level R5 (Extreme Fade) temperature color (110s deep maroon red)
  const RADIO_BLACKOUT_COLOR_OVERRIDE = null;                    // EDITABLE: Optional universal color override (e.g. null, 85, or '#f60')

  // --- Level Descriptive Labels (JCV) ---
  const RADIO_BLACKOUT_LABEL_R0_LINE1 = 'NO';                    // EDITABLE: Line 1 label for R0
  const RADIO_BLACKOUT_LABEL_R0_LINE2 = 'FADE';                  // EDITABLE: Line 2 label for R0
  const RADIO_BLACKOUT_LABEL_R1_LINE1 = 'WEAK';                  // EDITABLE: Line 1 label for R1
  const RADIO_BLACKOUT_LABEL_R1_LINE2 = 'FADE';                  // EDITABLE: Line 2 label for R1
  const RADIO_BLACKOUT_LABEL_R2_LINE1 = 'PARTIAL';               // EDITABLE: Line 1 label for R2 (matches mockup)
  const RADIO_BLACKOUT_LABEL_R2_LINE2 = 'FADE';                  // EDITABLE: Line 2 label for R2 (matches mockup)
  const RADIO_BLACKOUT_LABEL_R3_LINE1 = 'STRONG';                // EDITABLE: Line 1 label for R3
  const RADIO_BLACKOUT_LABEL_R3_LINE2 = 'FADE';                  // EDITABLE: Line 2 label for R3
  const RADIO_BLACKOUT_LABEL_R4_LINE1 = 'SEVERE';                // EDITABLE: Line 1 label for R4
  const RADIO_BLACKOUT_LABEL_R4_LINE2 = 'FADE';                  // EDITABLE: Line 2 label for R4
  const RADIO_BLACKOUT_LABEL_R5_LINE1 = 'EXTREME';               // EDITABLE: Line 1 label for R5
  const RADIO_BLACKOUT_LABEL_R5_LINE2 = 'FADE';                  // EDITABLE: Line 2 label for R5

  // --- Circular Progress Ring & Track (JCV) ---
  const RADIO_BLACKOUT_START_ANGLE_DEG = 90;                     // EDITABLE: Arc start angle (90deg in SVG = 6 o'clock / lowest point)
  const RADIO_BLACKOUT_TRACK_COLOR = 'rgba(255, 255, 255, 0.22)';// EDITABLE: Background circular track ring color
  const RADIO_BLACKOUT_TRACK_STROKE_WIDTH_DESKTOP = 4.0;         // EDITABLE Desktop: SVG track stroke thickness
  const RADIO_BLACKOUT_TRACK_STROKE_WIDTH_MOBILE = 4.0;          // EDITABLE Mobile: SVG track stroke thickness
  const RADIO_BLACKOUT_PROGRESS_STROKE_WIDTH_DESKTOP = 4.0;      // EDITABLE Desktop: SVG active progress stroke thickness
  const RADIO_BLACKOUT_PROGRESS_STROKE_WIDTH_MOBILE = 4.0;       // EDITABLE Mobile: SVG active progress stroke thickness
  const RADIO_BLACKOUT_STROKE_LINECAP = 'butt';                  // EDITABLE: Progress arc end cap ('butt' or 'round')
  const RADIO_BLACKOUT_ANIM_DURATION_S = 0.8;                    // EDITABLE: Transition duration in seconds for arc updates

  // --- Dial Frame & Sizing (JCV) ---
  const RADIO_BLACKOUT_DIAL_SIZE_DESKTOP = 'auto';               // EDITABLE Desktop: 'auto' (matches var(--celestial-dial-size)) or custom vw
  const RADIO_BLACKOUT_DIAL_SIZE_MOBILE = 'auto';                // EDITABLE Mobile: 'auto' or custom vw
  const RADIO_BLACKOUT_OFFSET_X_DESKTOP = '0vw';                 // EDITABLE Desktop: Fine horizontal nudge for dial circle
  const RADIO_BLACKOUT_OFFSET_X_MOBILE = '0vw';                  // EDITABLE Mobile: Fine horizontal nudge
  const RADIO_BLACKOUT_OFFSET_Y_DESKTOP = '0vw';                 // EDITABLE Desktop: Fine vertical nudge for dial circle
  const RADIO_BLACKOUT_OFFSET_Y_MOBILE = '0vw';                  // EDITABLE Mobile: Fine vertical nudge
  const RADIO_BLACKOUT_DIAL_BG_COLOR = 'transparent';            // EDITABLE: Dial circle background color
  const RADIO_BLACKOUT_DIAL_INNER_SHADOW = 'inset 0 0 1vw rgba(0, 0, 0, 0.5)'; // EDITABLE: Dial inner shadow

  // --- Typography & Text Positioning (JCV) ---
  // Top Label ("PARTIAL FADE")
  const RADIO_BLACKOUT_LABEL_FONT_FAMILY = "'euro', sans-serif"; // EDITABLE: Top label font-family ("euro" = EurostileExtended)
  const RADIO_BLACKOUT_LABEL_FONT_SIZE_DESKTOP = 'calc(var(--radio-blackout-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.088)'; // EDITABLE Desktop: Top label font size
  const RADIO_BLACKOUT_LABEL_FONT_SIZE_MOBILE = 'calc(var(--radio-blackout-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.088)';  // EDITABLE Mobile: Top label font size
  const RADIO_BLACKOUT_LABEL_LINE_HEIGHT = 1.0;                  // EDITABLE: Top label line height
  const RADIO_BLACKOUT_LABEL_LETTER_SPACING_DESKTOP = '0.04em';  // EDITABLE Desktop: Top label letter spacing
  const RADIO_BLACKOUT_LABEL_LETTER_SPACING_MOBILE = '0.04em';   // EDITABLE Mobile: Top label letter spacing
  const RADIO_BLACKOUT_LABEL_OFFSET_Y_DESKTOP = '0vw';           // EDITABLE Desktop: Fine vertical nudge for top label
  const RADIO_BLACKOUT_LABEL_OFFSET_Y_MOBILE = '0vw';            // EDITABLE Mobile: Fine vertical nudge for top label
  const RADIO_BLACKOUT_GAP_LABEL_TO_CLASS_DESKTOP = 'calc(var(--radio-blackout-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.025)'; // EDITABLE Desktop: Gap between label and giant class text
  const RADIO_BLACKOUT_GAP_LABEL_TO_CLASS_MOBILE = 'calc(var(--radio-blackout-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.025)';  // EDITABLE Mobile: Gap between label and giant class text

  // Middle Giant Class ("R2")
  const RADIO_BLACKOUT_CLASS_FONT_FAMILY = "'euro-bold', sans-serif"; // EDITABLE: Giant class font-family ("euro-bold" = EurostileExtendedBlack)
  const RADIO_BLACKOUT_CLASS_FONT_SIZE_DESKTOP = 'calc(var(--radio-blackout-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.34)'; // EDITABLE Desktop: Giant class text font size
  const RADIO_BLACKOUT_CLASS_FONT_SIZE_MOBILE = 'calc(var(--radio-blackout-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.34)';  // EDITABLE Mobile: Giant class text font size
  const RADIO_BLACKOUT_CLASS_LINE_HEIGHT = 0.82;                 // EDITABLE: Giant class line height
  const RADIO_BLACKOUT_CLASS_OFFSET_Y_DESKTOP = '0vw';           // EDITABLE Desktop: Fine vertical nudge for giant class text
  const RADIO_BLACKOUT_CLASS_OFFSET_Y_MOBILE = '0vw';            // EDITABLE Mobile: Fine vertical nudge for giant class text
  const RADIO_BLACKOUT_GAP_CLASS_TO_VALUE_DESKTOP = 'calc(var(--radio-blackout-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.02)'; // EDITABLE Desktop: Gap between giant class and bottom value
  const RADIO_BLACKOUT_GAP_CLASS_TO_VALUE_MOBILE = 'calc(var(--radio-blackout-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.02)';  // EDITABLE Mobile: Gap between giant class and bottom value

  // Bottom Value ("2.8dB")
  const RADIO_BLACKOUT_UNIT = 'dB';                              // EDITABLE: SI/IEEE decibel unit symbol ('dB', 'db', or '')
  const RADIO_BLACKOUT_TWO_SIG_DIGITS = true;                    // EDITABLE: If true, formats to 2 significant digits (e.g. 2.8dB, 16dB vs 16.0dB) to avoid circle crowding
  const RADIO_BLACKOUT_VALUE_FONT_FAMILY = "'euro-bold', sans-serif"; // EDITABLE: Bottom value font-family ("euro-bold" = EurostileExtendedBlack)
  const RADIO_BLACKOUT_VALUE_FONT_SIZE_DESKTOP = 'calc(var(--radio-blackout-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.165)'; // EDITABLE Desktop: Bottom value font size
  const RADIO_BLACKOUT_VALUE_FONT_SIZE_MOBILE = 'calc(var(--radio-blackout-dial-size, var(--celestial-dial-size, 13.5vw)) * 0.165)';  // EDITABLE Mobile: Bottom value font size
  const RADIO_BLACKOUT_VALUE_LINE_HEIGHT = 0.92;                 // EDITABLE: Bottom value line height
  const RADIO_BLACKOUT_VALUE_LETTER_SPACING_DESKTOP = '-.015em';  // EDITABLE Desktop: Bottom value letter spacing
  const RADIO_BLACKOUT_VALUE_LETTER_SPACING_MOBILE = '-.03em';   // EDITABLE Mobile: Bottom value letter spacing
  const RADIO_BLACKOUT_VALUE_OFFSET_Y_DESKTOP = '-.5vw';           // EDITABLE Desktop: Fine vertical nudge for bottom value
  const RADIO_BLACKOUT_VALUE_OFFSET_Y_MOBILE = '0vw';            // EDITABLE Mobile: Fine vertical nudge for bottom value

  // Overall Content Block Alignment
  const RADIO_BLACKOUT_CONTENT_OFFSET_Y_DESKTOP = '0vw';         // EDITABLE Desktop: Vertical nudge for entire text block inside dial
  const RADIO_BLACKOUT_CONTENT_OFFSET_Y_MOBILE = '0vw';          // EDITABLE Mobile: Vertical nudge for entire text block inside dial

  // Sublabel Below Dial (Strategy 3: Live Impact)
  const RADIO_BLACKOUT_SUBLABEL_ENABLED = true;                  // EDITABLE: Enable/disable live impact label below dial
  const RADIO_BLACKOUT_SUBLABEL_MODE = 'dynamic';                // EDITABLE: 'dynamic' (strategy 3: changes with level) or 'static' (uses static text below)
  const RADIO_BLACKOUT_SUBLABEL_TEXT_DESKTOP = 'Radio Blackout'; // EDITABLE Desktop: Static fallback text
  const RADIO_BLACKOUT_SUBLABEL_TEXT_MOBILE = 'Radio Blackout';  // EDITABLE Mobile: Static fallback text
  const RADIO_BLACKOUT_SUBLABEL_FONT_FAMILY = "var(--sun-label-font-family, 'light', sans-serif)"; // EDITABLE: Font family ('light', 'euro', 'bold', etc.)
  const RADIO_BLACKOUT_SUBLABEL_FONT_SIZE_DESKTOP = '1.35vw';     // EDITABLE Desktop: Sublabel font size
  const RADIO_BLACKOUT_SUBLABEL_FONT_SIZE_MOBILE = '2.6vw';      // EDITABLE Mobile: Sublabel font size
  const RADIO_BLACKOUT_SUBLABEL_LINE_HEIGHT = 1.15;              // EDITABLE: Sublabel line height for multi-line
  const RADIO_BLACKOUT_SUBLABEL_LETTER_SPACING_DESKTOP = '0.04vw';// EDITABLE Desktop: Sublabel letter spacing
  const RADIO_BLACKOUT_SUBLABEL_LETTER_SPACING_MOBILE = '0.04vw'; // EDITABLE Mobile: Sublabel letter spacing
  const RADIO_BLACKOUT_SUBLABEL_COLOR = 'auto';                  // EDITABLE: 'auto' (matches dial color) or custom CSS color (e.g. 'rgba(255, 255, 255, 0.70)')
  const RADIO_BLACKOUT_SUBLABEL_MARGIN_TOP_DESKTOP = '0.8vw';    // EDITABLE Desktop: Margin top below dial circle
  const RADIO_BLACKOUT_SUBLABEL_MARGIN_TOP_MOBILE = '1.5vw';     // EDITABLE Mobile: Margin top below dial circle
  const RADIO_BLACKOUT_SUBLABEL_OFFSET_Y_DESKTOP = '0vw';        // EDITABLE Desktop: Fine vertical nudge
  const RADIO_BLACKOUT_SUBLABEL_OFFSET_Y_MOBILE = '0vw';         // EDITABLE Mobile: Fine vertical nudge

  // Strategy 3: Dynamic Live Impact Sublabels per Radio Blackout Level
  const RADIO_BLACKOUT_IMPACT_LEVEL_R0_ARROW = 'down';           // EDITABLE: Arrow direction ('up' or 'down')
  const RADIO_BLACKOUT_IMPACT_LEVEL_R0_TEXT = 'All Bands Clear'; // EDITABLE: Situation text
  const RADIO_BLACKOUT_IMPACT_LEVEL_R1_ARROW = 'up';             // EDITABLE: Arrow direction ('up' or 'down')
  const RADIO_BLACKOUT_IMPACT_LEVEL_R1_TEXT = 'Minor HF Noise';  // EDITABLE: Situation text
  const RADIO_BLACKOUT_IMPACT_LEVEL_R2_ARROW = 'up';             // EDITABLE: Arrow direction ('up' or 'down')
  const RADIO_BLACKOUT_IMPACT_LEVEL_R2_TEXT = 'HF Signal Loss';  // EDITABLE: Situation text
  const RADIO_BLACKOUT_IMPACT_LEVEL_R3_ARROW = 'up';             // EDITABLE: Arrow direction ('up' or 'down')
  const RADIO_BLACKOUT_IMPACT_LEVEL_R3_TEXT = 'Wide HF Outage';  // EDITABLE: Situation text
  const RADIO_BLACKOUT_IMPACT_LEVEL_R4_ARROW = 'up';             // EDITABLE: Arrow direction ('up' or 'down')
  const RADIO_BLACKOUT_IMPACT_LEVEL_R4_TEXT = 'Major Day Outage';// EDITABLE: Situation text
  const RADIO_BLACKOUT_IMPACT_LEVEL_R5_ARROW = 'up';             // EDITABLE: Arrow direction ('up' or 'down')
  const RADIO_BLACKOUT_IMPACT_LEVEL_R5_TEXT = 'Total Dayside<br>Blackout'; // EDITABLE: Situation text

  // --- Flanking Duplicate Timezone Dials Config (JCV) ---
  // Duplicates the 1st (Pacific) and 5th (UK) dials down to the Sun/Earth row: [Pacific, Big Sun, Big Earth, UK]
  const CELESTIAL_DIALS_ENABLED = true;                         // EDITABLE: Enable/disable flanking dials in celestial row
  const CELESTIAL_DIAL_LEFT_NAME_DESKTOP = 'Pacific';           // EDITABLE Desktop: Left dial label name (user can change content in future)
  const CELESTIAL_DIAL_LEFT_NAME_MOBILE = 'Pacific';            // EDITABLE Mobile: Left dial label name
  const CELESTIAL_DIAL_LEFT_TIMEZONE = 'America/Los_Angeles';   // EDITABLE: Left dial IANA timezone string
  const CELESTIAL_DIAL_LEFT_SHOW_TIME = true;                   // EDITABLE: Show dynamic time under left dial
  const CELESTIAL_DIAL_RIGHT_NAME_DESKTOP = 'UK';               // EDITABLE Desktop: Right dial label name (user can change content in future)
  const CELESTIAL_DIAL_RIGHT_NAME_MOBILE = 'UK';                // EDITABLE Mobile: Right dial label name
  const CELESTIAL_DIAL_RIGHT_TIMEZONE = 'Europe/London';        // EDITABLE: Right dial IANA timezone string
  const CELESTIAL_DIAL_RIGHT_SHOW_TIME = true;                  // EDITABLE: Show dynamic time under right dial

  // --- Sweeping Gauge Two-Stage Animation & Reset Flash Controls (JCV) ---
  const CELESTIAL_GAUGE_ANIM_ENABLED = true;                   // EDITABLE: Enable two-stage sweeping animation on value change (like Barometer/Humidity)
  const CELESTIAL_GAUGE_STAGE1_MS = 600;                       // EDITABLE: Stage 1 duration (sweep to full if 'up', sweep to 0 if 'down') in ms
  const CELESTIAL_GAUGE_STAGE2_MS = 600;                       // EDITABLE: Stage 2 duration (settle to target offset) in ms
  const CELESTIAL_DIAL_RESET_FLASH_ENABLED = true;             // EDITABLE: Flash dial opacity during resets (fade out to 0.15 & in to 1.0)
  const CELESTIAL_DIAL_RESET_FLASH_MS = 500;                   // EDITABLE: Reset flash duration in ms

  // Flanking Dials Lateral & Vertical Centering Controls (JCV)
  // 'center' aligns the dial circle's horizontal midline with the Sun & Earth equator
  const CELESTIAL_DIAL_VERTICAL_ALIGN_DESKTOP = 'center';       // EDITABLE Desktop: 'center' (equator aligned with Sun/Earth) or 'top'
  const CELESTIAL_DIAL_VERTICAL_ALIGN_MOBILE = 'center';        // EDITABLE Mobile: 'center' or 'top'
  const CELESTIAL_DIAL_OFFSET_Y_DESKTOP = '0vw';                // EDITABLE Desktop: Fine vertical nudge for dial circle (positive = DOWN, negative = UP)
  const CELESTIAL_DIAL_OFFSET_Y_MOBILE = '0vw';                 // EDITABLE Mobile: Fine vertical nudge for dial circle
  const CELESTIAL_DIAL_OFFSET_X_DESKTOP = '0vw';                // EDITABLE Desktop: Fine horizontal nudge for dial circle (positive = RIGHT, negative = LEFT)
  const CELESTIAL_DIAL_OFFSET_X_MOBILE = '0vw';                 // EDITABLE Mobile: Fine horizontal nudge for dial circle
  const CELESTIAL_DIAL_SIZE_DESKTOP = 'auto';                   // EDITABLE Desktop: 'auto' (matches upper timezone dial size var(--world-clock-size)) or custom vw
  const CELESTIAL_DIAL_SIZE_MOBILE = 'auto';                    // EDITABLE Mobile: 'auto' or custom vw

  // Flanking Dial Label Spacing & Nudge Controls (JCV)
  const CELESTIAL_DIAL_LABEL_MARGIN_TOP_DESKTOP = 'calc(var(--world-clock-size) * 0.06)'; // EDITABLE Desktop: Gap above dial label
  const CELESTIAL_DIAL_LABEL_MARGIN_TOP_MOBILE = 'calc(var(--world-clock-size) * 0.062)'; // EDITABLE Mobile: Gap above dial label
  const CELESTIAL_DIAL_LABEL_OFFSET_Y_DESKTOP = '0vw';          // EDITABLE Desktop: Vertical nudge for dial label
  const CELESTIAL_DIAL_LABEL_OFFSET_Y_MOBILE = '0vw';           // EDITABLE Mobile: Vertical nudge for dial label

  // --- Sun & Earth Labels Config (JCV) ---
  // Centered labels beneath each circle
  // Default is 'Live' for both; changes to '27-Day Rotation' / '24-Hour Rotation' ONLY during animation
  const SUN_LABEL_ENABLED = true;                     // EDITABLE: Enable/disable centered labels under each circle
  const SUN_LABEL_LEFT_DEFAULT_TEXT = 'Live';         // EDITABLE: Default label under left circle (when not rotating)
  const SUN_LABEL_RIGHT_DEFAULT_TEXT = 'Live';        // EDITABLE: Default label under right circle (when not rotating)
  const SUN_LABEL_LEFT_ROTATING_TEXT = '27-Day Rotation'; // EDITABLE: Label under left circle during rotation animation
  const SUN_LABEL_RIGHT_ROTATING_TEXT = '24-Hour Rotation';// EDITABLE: Label under right circle during rotation animation

  // Compatibility aliases
  const SUN_LABEL_LEFT_TEXT = SUN_LABEL_LEFT_DEFAULT_TEXT;
  const SUN_LABEL_RIGHT_TEXT = SUN_LABEL_RIGHT_DEFAULT_TEXT;

  const SUN_LABEL_FONT_SIZE_DESKTOP = '2.0vw';        // EDITABLE Desktop: Font size for sun labels
  const SUN_LABEL_FONT_SIZE_MOBILE = '2.6vw';         // EDITABLE Mobile: Font size for sun labels

  const SUN_LABEL_MARGIN_TOP_DESKTOP = '-2.5vw';       // EDITABLE Desktop: Gap between sun circle and label
  const SUN_LABEL_MARGIN_TOP_MOBILE = '-2vw';        // EDITABLE Mobile: Gap between sun circle and label

  const EARTH_LABEL_MARGIN_TOP_DESKTOP = 'auto';      // EDITABLE Desktop: Gap above Earth label ('auto' aligns baseline with Sun's label) or custom vw string
  const EARTH_LABEL_MARGIN_TOP_MOBILE = 'auto';       // EDITABLE Mobile: Gap above Earth label ('auto' aligns baseline with Sun's label) or custom vw string

  const SUN_LABEL_FONT_FAMILY = "'light', sans-serif";// EDITABLE: Font family (matches UI aesthetic)
  const SUN_LABEL_LETTER_SPACING_DESKTOP = '0.08vw';  // EDITABLE Desktop: Letter spacing / kerning
  const SUN_LABEL_LETTER_SPACING_MOBILE = '0.06vw';   // EDITABLE Mobile: Letter spacing / kerning

  const SUN_LABEL_COLOR = '#ffffff';                  // EDITABLE: Text color
  const SUN_LABEL_OPACITY = '0.70';                   // EDITABLE: Opacity (0.0 to 1.0)
  const SUN_LABEL_TEXT_TRANSFORM = 'none';            // EDITABLE: 'uppercase', 'capitalize', 'none'

  // Horizontal Nudge / Alignment Offsets (JCV)
  // Positive nudges label to the right, negative nudges label to the left
  const SUN_LABEL_OFFSET_X_DESKTOP = '0vw';        // EDITABLE Desktop: Global label horizontal nudge
  const SUN_LABEL_OFFSET_X_MOBILE = '0vw';         // EDITABLE Mobile: Global label horizontal nudge

  const SUN_LABEL_LEFT_OFFSET_X_DESKTOP = '0vw';   // EDITABLE Desktop: Left label specific horizontal nudge
  const SUN_LABEL_LEFT_OFFSET_X_MOBILE = '0vw';    // EDITABLE Mobile: Left label specific horizontal nudge

  const SUN_LABEL_RIGHT_OFFSET_X_DESKTOP = '0vw';  // EDITABLE Desktop: Right label specific horizontal nudge
  const SUN_LABEL_RIGHT_OFFSET_X_MOBILE = '0vw';   // EDITABLE Mobile: Right label specific horizontal nudge



  // ==========================================
  // --- EDITABLE: World Clocks Row Config (JCV) ---
  // ==========================================
  const WORLD_CLOCKS_ENABLED = true;                         // EDITABLE: Enable/disable 5-clock world time row (Pacific, Mountain, Central, Eastern, UK)

  // --- Primary Row Geometry Controls (JCV) ---
  // The dials automatically become bigger or smaller as a group on their own from these two settings:
  // Dial Diameter = (Row Width - (4 * Gap)) / 5
  const WORLD_CLOCKS_WIDTH_DESKTOP = '95vw';                 // EDITABLE Desktop: Row container width centered across viewport
  const WORLD_CLOCKS_WIDTH_MOBILE = '95vw';                  // EDITABLE Mobile: Row container width centered across viewport
  const WORLD_CLOCKS_GAP_DESKTOP = '2vw';                  // EDITABLE Desktop: Spacing between each clock column
  const WORLD_CLOCKS_GAP_MOBILE = '1.875vw';                 // EDITABLE Mobile: Spacing between each clock column

  // Optional manual dial size override ('auto' computes dynamic diameter from Row Width & Gap)
  const WORLD_CLOCK_SIZE_DESKTOP = 'auto';                   // EDITABLE Desktop: 'auto' (dials scale on their own from width & gap) or custom string (e.g. '15.68vw')
  const WORLD_CLOCK_SIZE_MOBILE = 'auto';                    // EDITABLE Mobile: 'auto' (dials scale on their own from width & gap) or custom string (e.g. '16.5vw')

  const WORLD_CLOCKS_MARGIN_TOP_DESKTOP = '-5vw';           // EDITABLE Desktop: Margin above the clocks row
  const WORLD_CLOCKS_MARGIN_TOP_MOBILE = '-5.0vw';            // EDITABLE Mobile: Margin above the clocks row
  const WORLD_CLOCKS_MARGIN_BOTTOM_DESKTOP = '-1vw';        // EDITABLE Desktop: Margin below the clocks row
  const WORLD_CLOCKS_MARGIN_BOTTOM_MOBILE = '-4vw';         // EDITABLE Mobile: Margin below the clocks row

  // Dial Track (outer ring without 5-min countdown)
  const WORLD_CLOCK_TRACK_COLOR_DESKTOP = 'rgba(255, 255, 255, 0.2)'; // EDITABLE Desktop: Default track stroke color
  const WORLD_CLOCK_TRACK_COLOR_MOBILE = 'rgba(255, 255, 255, 0.2)';  // EDITABLE Mobile: Default track stroke color
  const WORLD_CLOCK_TRACK_WIDTH_DESKTOP = 4;                 // EDITABLE Desktop: Track stroke thickness
  const WORLD_CLOCK_TRACK_WIDTH_MOBILE = 4;                  // EDITABLE Mobile: Track stroke thickness

  // User Timezone Track Color Highlight (Matches current temperature color)
  const WORLD_CLOCK_USER_TIMEZONE_TRACK_COLOR_MODE = 'temp'; // EDITABLE: 'temp' (matches current temp color) or custom color
  const WORLD_CLOCK_USER_TIMEZONE_TRACK_COLOR_DESKTOP = 'temp'; // EDITABLE Desktop: User timezone track color ('temp' or color string)
  const WORLD_CLOCK_USER_TIMEZONE_TRACK_COLOR_MOBILE = 'temp';  // EDITABLE Mobile: User timezone track color ('temp' or color string)
  const WORLD_CLOCK_USER_TIMEZONE_OVERRIDE = null;           // EDITABLE: Manual override (e.g. 'central', 'pacific', 'mountain', 'eastern', 'uk') or null for auto-detect

  // Hands & Dot styling
  const WORLD_CLOCK_HANDS_COLOR_MODE = 'temp';               // EDITABLE: 'temp' (matches current temp color) or 'white' or custom string (e.g. 'rgba(255,255,255,0.9)')
  const WORLD_CLOCK_HANDS_COLOR_DESKTOP = 'rgba(255, 255, 255, 0.9)'; // EDITABLE Desktop: Base hands color when mode is not temp
  const WORLD_CLOCK_HANDS_COLOR_MOBILE = 'rgba(255, 255, 255, 0.9)';  // EDITABLE Mobile: Base hands color when mode is not temp
  const WORLD_CLOCK_SECOND_HAND_COLOR = 'rgba(255, 255, 255, 0.2)';   // EDITABLE: Subtle second hand color matching clock dial
  const WORLD_CLOCK_CENTER_DOT_OPACITY = 0;                  // EDITABLE: 0 to hide center dot (matching clock dial), 1 to show

  // Labels below dials (Two lines: Line 1 Zone Name "where", Line 2 Actual Time "time")
  const WORLD_CLOCK_LABEL_ENABLED = true;                    // EDITABLE: Show labels under dials
  const WORLD_CLOCK_LABEL_SHOW_TIME = true;                  // EDITABLE: Include dynamic time string (e.g. "6:51a") with region name
  const WORLD_CLOCK_LABEL_LAYOUT_DESKTOP = 'column';         // EDITABLE Desktop: 'column' (two lines) or 'row' (side-by-side)
  const WORLD_CLOCK_LABEL_LAYOUT_MOBILE = 'column';          // EDITABLE Mobile: 'column' (two lines) or 'row' (side-by-side)
  const WORLD_CLOCK_LABEL_SPACES = 2;                        // EDITABLE: Number of typographic spaces if used in single row
  const WORLD_CLOCK_LABEL_GAP_DESKTOP = '0vw';               // EDITABLE Desktop: Extra spacing when in row layout
  const WORLD_CLOCK_LABEL_GAP_MOBILE = '0vw';                // EDITABLE Mobile: Extra spacing when in row layout
  const WORLD_CLOCK_LABEL_LINE_GAP_DESKTOP = 'calc(var(--world-clock-size) * 0.015)'; // EDITABLE Desktop: Vertical space between zone name and actual time (scales with dial)
  const WORLD_CLOCK_LABEL_LINE_GAP_MOBILE = 'calc(var(--world-clock-size) * 0.019)';  // EDITABLE Mobile: Vertical space between zone name and actual time (scales with dial)
  const WORLD_CLOCK_LABEL_MARGIN_TOP_DESKTOP = 'calc(var(--world-clock-size) * 0.06)'; // EDITABLE Desktop: Margin above label (scales with dial)
  const WORLD_CLOCK_LABEL_MARGIN_TOP_MOBILE = 'calc(var(--world-clock-size) * 0.062)'; // EDITABLE Mobile: Margin above label (scales with dial)

  // Line 1: Zone Name ("where" - scales proportionally with dials)
  const WORLD_CLOCK_NAME_FONT_SIZE_DESKTOP = 'calc(var(--world-clock-size) * 0.13)';  // EDITABLE Desktop: Zone name (where) font size
  const WORLD_CLOCK_NAME_FONT_SIZE_MOBILE = 'calc(var(--world-clock-size) * 0.144)';  // EDITABLE Mobile: Zone name (where) font size
  const WORLD_CLOCK_NAME_FONT_FAMILY_DESKTOP = "'light', sans-serif"; // EDITABLE Desktop: Zone name font family
  const WORLD_CLOCK_NAME_FONT_FAMILY_MOBILE = "'light', sans-serif";  // EDITABLE Mobile: Zone name font family
  const WORLD_CLOCK_NAME_COLOR_DESKTOP = '#ffffff';          // EDITABLE Desktop: Zone name color
  const WORLD_CLOCK_NAME_COLOR_MOBILE = '#ffffff';           // EDITABLE Mobile: Zone name color
  const WORLD_CLOCK_NAME_OPACITY_DESKTOP = 0.85;             // EDITABLE Desktop: Zone name opacity
  const WORLD_CLOCK_NAME_OPACITY_MOBILE = 0.85;              // EDITABLE Mobile: Zone name opacity
  const WORLD_CLOCK_NAME_LETTER_SPACING_DESKTOP = '0.046vw'; // EDITABLE Desktop: Zone name letter spacing
  const WORLD_CLOCK_NAME_LETTER_SPACING_MOBILE = '0.02vw';   // EDITABLE Mobile: Zone name letter spacing

  // Line 2: Actual Time ("time" - scales proportionally with dials)
  const WORLD_CLOCK_TIME_FONT_SIZE_DESKTOP = 'calc(var(--world-clock-size) * 0.13)';  // EDITABLE Desktop: Actual time font size
  const WORLD_CLOCK_TIME_FONT_SIZE_MOBILE = 'calc(var(--world-clock-size) * 0.144)';  // EDITABLE Mobile: Actual time font size
  const WORLD_CLOCK_TIME_FONT_FAMILY_DESKTOP = "'light', sans-serif"; // EDITABLE Desktop: Time font family
  const WORLD_CLOCK_TIME_FONT_FAMILY_MOBILE = "'light', sans-serif";  // EDITABLE Mobile: Time font family
  const WORLD_CLOCK_TIME_COLOR_DESKTOP = '#ffffff';          // EDITABLE Desktop: Time text color
  const WORLD_CLOCK_TIME_COLOR_MOBILE = '#ffffff';           // EDITABLE Mobile: Time text color
  const WORLD_CLOCK_TIME_OPACITY_DESKTOP = 0.85;             // EDITABLE Desktop: Time opacity
  const WORLD_CLOCK_TIME_OPACITY_MOBILE = 0.85;              // EDITABLE Mobile: Time opacity
  const WORLD_CLOCK_TIME_LETTER_SPACING_DESKTOP = '0.046vw'; // EDITABLE Desktop: Time letter spacing
  const WORLD_CLOCK_TIME_LETTER_SPACING_MOBILE = '0.02vw';   // EDITABLE Mobile: Time letter spacing

  // Legacy fallback references
  const WORLD_CLOCK_LABEL_FONT_SIZE_DESKTOP = WORLD_CLOCK_NAME_FONT_SIZE_DESKTOP;
  const WORLD_CLOCK_LABEL_FONT_SIZE_MOBILE = WORLD_CLOCK_NAME_FONT_SIZE_MOBILE;
  const WORLD_CLOCK_LABEL_LETTER_SPACING_DESKTOP = WORLD_CLOCK_NAME_LETTER_SPACING_DESKTOP;
  const WORLD_CLOCK_LABEL_LETTER_SPACING_MOBILE = WORLD_CLOCK_NAME_LETTER_SPACING_MOBILE;
  const WORLD_CLOCK_LABEL_FONT_FAMILY_DESKTOP = WORLD_CLOCK_NAME_FONT_FAMILY_DESKTOP;
  const WORLD_CLOCK_LABEL_FONT_FAMILY_MOBILE = WORLD_CLOCK_NAME_FONT_FAMILY_MOBILE;
  const WORLD_CLOCK_LABEL_COLOR_DESKTOP = WORLD_CLOCK_NAME_COLOR_DESKTOP;
  const WORLD_CLOCK_LABEL_COLOR_MOBILE = WORLD_CLOCK_NAME_COLOR_MOBILE;
  const WORLD_CLOCK_LABEL_OPACITY_DESKTOP = WORLD_CLOCK_NAME_OPACITY_DESKTOP;
  const WORLD_CLOCK_LABEL_OPACITY_MOBILE = WORLD_CLOCK_NAME_OPACITY_MOBILE;

  function applyWorldClocksConfig() {
    const isMobile = window.innerWidth <= 767;
    document.documentElement.style.setProperty('--world-clocks-width-desktop', WORLD_CLOCKS_WIDTH_DESKTOP);
    document.documentElement.style.setProperty('--world-clocks-width-mobile', WORLD_CLOCKS_WIDTH_MOBILE);
    document.documentElement.style.setProperty('--world-clocks-width', isMobile ? WORLD_CLOCKS_WIDTH_MOBILE : WORLD_CLOCKS_WIDTH_DESKTOP);

    document.documentElement.style.setProperty('--world-clocks-gap-desktop', WORLD_CLOCKS_GAP_DESKTOP);
    document.documentElement.style.setProperty('--world-clocks-gap-mobile', WORLD_CLOCKS_GAP_MOBILE);
    document.documentElement.style.setProperty('--world-clocks-gap', isMobile ? WORLD_CLOCKS_GAP_MOBILE : WORLD_CLOCKS_GAP_DESKTOP);

    const isAutoDesktop = !WORLD_CLOCK_SIZE_DESKTOP || WORLD_CLOCK_SIZE_DESKTOP === 'auto';
    const isAutoMobile = !WORLD_CLOCK_SIZE_MOBILE || WORLD_CLOCK_SIZE_MOBILE === 'auto';

    const dialSizeDesktop = isAutoDesktop 
      ? 'calc((var(--world-clocks-width-desktop, 90vw) - (4 * var(--world-clocks-gap-desktop, 2.9vw))) / 5)' 
      : WORLD_CLOCK_SIZE_DESKTOP;
    const dialSizeMobile = isAutoMobile 
      ? 'calc((var(--world-clocks-width-mobile, 90vw) - (4 * var(--world-clocks-gap-mobile, 1.875vw))) / 5)' 
      : WORLD_CLOCK_SIZE_MOBILE;
    const dialSizeActive = (isMobile ? isAutoMobile : isAutoDesktop)
      ? 'calc((var(--world-clocks-width) - (4 * var(--world-clocks-gap))) / 5)'
      : (isMobile ? WORLD_CLOCK_SIZE_MOBILE : WORLD_CLOCK_SIZE_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-size-desktop', dialSizeDesktop);
    document.documentElement.style.setProperty('--world-clock-size-mobile', dialSizeMobile);
    document.documentElement.style.setProperty('--world-clock-size', dialSizeActive);

    document.documentElement.style.setProperty('--world-clocks-margin-top-desktop', WORLD_CLOCKS_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--world-clocks-margin-top-mobile', WORLD_CLOCKS_MARGIN_TOP_MOBILE);
    document.documentElement.style.setProperty('--world-clocks-margin-top', isMobile ? WORLD_CLOCKS_MARGIN_TOP_MOBILE : WORLD_CLOCKS_MARGIN_TOP_DESKTOP);

    document.documentElement.style.setProperty('--world-clocks-margin-bottom-desktop', WORLD_CLOCKS_MARGIN_BOTTOM_DESKTOP);
    document.documentElement.style.setProperty('--world-clocks-margin-bottom-mobile', WORLD_CLOCKS_MARGIN_BOTTOM_MOBILE);
    document.documentElement.style.setProperty('--world-clocks-margin-bottom', isMobile ? WORLD_CLOCKS_MARGIN_BOTTOM_MOBILE : WORLD_CLOCKS_MARGIN_BOTTOM_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-track-color-desktop', WORLD_CLOCK_TRACK_COLOR_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-track-color-mobile', WORLD_CLOCK_TRACK_COLOR_MOBILE);
    document.documentElement.style.setProperty('--world-clock-track-color', isMobile ? WORLD_CLOCK_TRACK_COLOR_MOBILE : WORLD_CLOCK_TRACK_COLOR_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-track-width-desktop', String(WORLD_CLOCK_TRACK_WIDTH_DESKTOP));
    document.documentElement.style.setProperty('--world-clock-track-width-mobile', String(WORLD_CLOCK_TRACK_WIDTH_MOBILE));
    document.documentElement.style.setProperty('--world-clock-track-width', String(isMobile ? WORLD_CLOCK_TRACK_WIDTH_MOBILE : WORLD_CLOCK_TRACK_WIDTH_DESKTOP));

    document.documentElement.style.setProperty('--world-clock-label-layout-desktop', WORLD_CLOCK_LABEL_LAYOUT_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-label-layout-mobile', WORLD_CLOCK_LABEL_LAYOUT_MOBILE);
    document.documentElement.style.setProperty('--world-clock-label-layout', isMobile ? WORLD_CLOCK_LABEL_LAYOUT_MOBILE : WORLD_CLOCK_LABEL_LAYOUT_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-label-gap-desktop', WORLD_CLOCK_LABEL_GAP_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-label-gap-mobile', WORLD_CLOCK_LABEL_GAP_MOBILE);
    document.documentElement.style.setProperty('--world-clock-label-gap', isMobile ? WORLD_CLOCK_LABEL_GAP_MOBILE : WORLD_CLOCK_LABEL_GAP_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-label-line-gap-desktop', WORLD_CLOCK_LABEL_LINE_GAP_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-label-line-gap-mobile', WORLD_CLOCK_LABEL_LINE_GAP_MOBILE);
    document.documentElement.style.setProperty('--world-clock-label-line-gap', isMobile ? WORLD_CLOCK_LABEL_LINE_GAP_MOBILE : WORLD_CLOCK_LABEL_LINE_GAP_DESKTOP);

    const isRowLayout = (isMobile ? WORLD_CLOCK_LABEL_LAYOUT_MOBILE : WORLD_CLOCK_LABEL_LAYOUT_DESKTOP) === 'row';
    document.documentElement.style.setProperty('--world-clock-spacer-display', isRowLayout ? 'inline-block' : 'none');

    document.documentElement.style.setProperty('--world-clock-label-margin-top-desktop', WORLD_CLOCK_LABEL_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-label-margin-top-mobile', WORLD_CLOCK_LABEL_MARGIN_TOP_MOBILE);
    document.documentElement.style.setProperty('--world-clock-label-margin-top', isMobile ? WORLD_CLOCK_LABEL_MARGIN_TOP_MOBILE : WORLD_CLOCK_LABEL_MARGIN_TOP_DESKTOP);

    // Line 1: Zone Name ("where")
    document.documentElement.style.setProperty('--world-clock-name-font-size-desktop', WORLD_CLOCK_NAME_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-name-font-size-mobile', WORLD_CLOCK_NAME_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--world-clock-name-font-size', isMobile ? WORLD_CLOCK_NAME_FONT_SIZE_MOBILE : WORLD_CLOCK_NAME_FONT_SIZE_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-name-font-family-desktop', WORLD_CLOCK_NAME_FONT_FAMILY_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-name-font-family-mobile', WORLD_CLOCK_NAME_FONT_FAMILY_MOBILE);
    document.documentElement.style.setProperty('--world-clock-name-font-family', isMobile ? WORLD_CLOCK_NAME_FONT_FAMILY_MOBILE : WORLD_CLOCK_NAME_FONT_FAMILY_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-name-color-desktop', WORLD_CLOCK_NAME_COLOR_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-name-color-mobile', WORLD_CLOCK_NAME_COLOR_MOBILE);
    document.documentElement.style.setProperty('--world-clock-name-color', isMobile ? WORLD_CLOCK_NAME_COLOR_MOBILE : WORLD_CLOCK_NAME_COLOR_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-name-opacity-desktop', String(WORLD_CLOCK_NAME_OPACITY_DESKTOP));
    document.documentElement.style.setProperty('--world-clock-name-opacity-mobile', String(WORLD_CLOCK_NAME_OPACITY_MOBILE));
    document.documentElement.style.setProperty('--world-clock-name-opacity', String(isMobile ? WORLD_CLOCK_NAME_OPACITY_MOBILE : WORLD_CLOCK_NAME_OPACITY_DESKTOP));

    document.documentElement.style.setProperty('--world-clock-name-letter-spacing-desktop', WORLD_CLOCK_NAME_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-name-letter-spacing-mobile', WORLD_CLOCK_NAME_LETTER_SPACING_MOBILE);
    document.documentElement.style.setProperty('--world-clock-name-letter-spacing', isMobile ? WORLD_CLOCK_NAME_LETTER_SPACING_MOBILE : WORLD_CLOCK_NAME_LETTER_SPACING_DESKTOP);

    // Line 2: Actual Time ("time")
    document.documentElement.style.setProperty('--world-clock-time-font-size-desktop', WORLD_CLOCK_TIME_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-time-font-size-mobile', WORLD_CLOCK_TIME_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--world-clock-time-font-size', isMobile ? WORLD_CLOCK_TIME_FONT_SIZE_MOBILE : WORLD_CLOCK_TIME_FONT_SIZE_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-time-font-family-desktop', WORLD_CLOCK_TIME_FONT_FAMILY_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-time-font-family-mobile', WORLD_CLOCK_TIME_FONT_FAMILY_MOBILE);
    document.documentElement.style.setProperty('--world-clock-time-font-family', isMobile ? WORLD_CLOCK_TIME_FONT_FAMILY_MOBILE : WORLD_CLOCK_TIME_FONT_FAMILY_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-time-color-desktop', WORLD_CLOCK_TIME_COLOR_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-time-color-mobile', WORLD_CLOCK_TIME_COLOR_MOBILE);
    document.documentElement.style.setProperty('--world-clock-time-color', isMobile ? WORLD_CLOCK_TIME_COLOR_MOBILE : WORLD_CLOCK_TIME_COLOR_DESKTOP);

    document.documentElement.style.setProperty('--world-clock-time-opacity-desktop', String(WORLD_CLOCK_TIME_OPACITY_DESKTOP));
    document.documentElement.style.setProperty('--world-clock-time-opacity-mobile', String(WORLD_CLOCK_TIME_OPACITY_MOBILE));
    document.documentElement.style.setProperty('--world-clock-time-opacity', String(isMobile ? WORLD_CLOCK_TIME_OPACITY_MOBILE : WORLD_CLOCK_TIME_OPACITY_DESKTOP));

    document.documentElement.style.setProperty('--world-clock-time-letter-spacing-desktop', WORLD_CLOCK_TIME_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-time-letter-spacing-mobile', WORLD_CLOCK_TIME_LETTER_SPACING_MOBILE);
    document.documentElement.style.setProperty('--world-clock-time-letter-spacing', isMobile ? WORLD_CLOCK_TIME_LETTER_SPACING_MOBILE : WORLD_CLOCK_TIME_LETTER_SPACING_DESKTOP);

    // Overall label fallbacks
    document.documentElement.style.setProperty('--world-clock-label-font-size', isMobile ? WORLD_CLOCK_NAME_FONT_SIZE_MOBILE : WORLD_CLOCK_NAME_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-label-font-family', isMobile ? WORLD_CLOCK_NAME_FONT_FAMILY_MOBILE : WORLD_CLOCK_NAME_FONT_FAMILY_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-label-color', isMobile ? WORLD_CLOCK_NAME_COLOR_MOBILE : WORLD_CLOCK_NAME_COLOR_DESKTOP);
    document.documentElement.style.setProperty('--world-clock-label-opacity', String(isMobile ? WORLD_CLOCK_NAME_OPACITY_MOBILE : WORLD_CLOCK_NAME_OPACITY_DESKTOP));
    document.documentElement.style.setProperty('--world-clock-label-letter-spacing', isMobile ? WORLD_CLOCK_NAME_LETTER_SPACING_MOBILE : WORLD_CLOCK_NAME_LETTER_SPACING_DESKTOP);

    // Keep celestial row duo width and base circle sizing locked to timezone dials above
    if (typeof applySunImageConfig === 'function') {
      applySunImageConfig();
    }
  }


  // ==========================================
  // --- Earth Image & Living Weather Config (JCV) ---
  // ==========================================
  // Note: EARTH_IMAGE_WIDTH_DESKTOP & EARTH_IMAGE_WIDTH_MOBILE are configured above under Celestial Row config
  const EARTH_IMAGE_MARGIN_TOP_DESKTOP = '0vw';     // EDITABLE Desktop: Handled by duo row wrapper
  const EARTH_IMAGE_MARGIN_TOP_MOBILE = '0vw';      // EDITABLE Mobile: Handled by duo row wrapper
  const EARTH_IMAGE_MARGIN_BOTTOM_DESKTOP = '0vw';  // EDITABLE Desktop: Handled by duo row spacer
  const EARTH_IMAGE_MARGIN_BOTTOM_MOBILE = '0vw';   // EDITABLE Mobile: Handled by duo row spacer
  const EARTH_MASK_RADIUS_DESKTOP = '45.2%';        // EDITABLE Desktop: Circle radius clipping Earth globe, completely excluding the bottom NOAA white platform
  const EARTH_MASK_RADIUS_MOBILE = '45.2%';         // EDITABLE Mobile: Circle radius clipping Earth globe
  const EARTH_MASK_POSITION_Y_DESKTOP = '45.5%';    // EDITABLE Desktop: Center of the Earth globe in the NOAA frame (45.5%)
  const EARTH_MASK_POSITION_Y_MOBILE = '45.5%';     // EDITABLE Mobile: Center of the Earth globe in the NOAA frame (45.5%)
  const EARTH_MASK_RADIUS = EARTH_MASK_RADIUS_DESKTOP;
  const EARTH_MASK_POSITION_Y = EARTH_MASK_POSITION_Y_DESKTOP;
  const EARTH_IMAGE_URL = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/678x678.jpg';

  // Note: EARTH_IMAGE_INNER_SCALE, EARTH_IMAGE_OFFSET_Y, and EARTH_IMAGE_OFFSET_X
  // are all configured above under the Celestial Row Config section (JCV)

  // Compatibility aliases
  const EARTH_IMAGE_WIDTH = EARTH_IMAGE_WIDTH_DESKTOP;
  const EARTH_IMAGE_MARGIN_TOP = EARTH_IMAGE_MARGIN_TOP_DESKTOP;
  const EARTH_IMAGE_MARGIN_BOTTOM = EARTH_IMAGE_MARGIN_BOTTOM_DESKTOP;

  // --- Dynamic Earth Animation Controls (JCV) ---
  const EARTH_ANIMATION_ENABLED = true;             // EDITABLE: Enable/disable animation
  const EARTH_ANIMATION_MODE = 'daynight';          // EDITABLE SWITCH: 'weather' (Mode A: 2-4h live cloud flow) or 'daynight' (Mode B: 24h day/night cycle)
  const EARTH_ANIMATION_RESOLUTION = '678x678';     // EDITABLE: Resolution: '339x339' (lightweight ~128KB) or '678x678' (~450KB)

  // Mode A: "Living Weather" (Recent 2-4 Hours Storm & Cloud Flow)
  const EARTH_WEATHER_FETCH_LENGTH = 24;            // EDITABLE: NOAA buffer (24 = 4 hours of 10-minute satellite captures)
  const EARTH_WEATHER_FRAME_STEP = 1;               // EDITABLE: Cadence step (1 = every 10m frame, 2 = every 20m)
  const EARTH_WEATHER_FRAME_COUNT = 18;             // EDITABLE: Number of frames in loop (18 = 3 hours of cloud motion)
  const EARTH_WEATHER_FPS = 8;                      // EDITABLE: Playback speed in frames per second
  const EARTH_WEATHER_LOOP_PAUSE_MS = 1200;         // EDITABLE: Pause in ms on live frame

  // Mode B: "Day & Night Cycle" (24 Hours of Sunlight & Night Lights)
  const EARTH_DAYNIGHT_FETCH_LENGTH = 144;          // EDITABLE: NOAA 24-hour buffer (144 frames @ 10m cadence)
  const EARTH_DAYNIGHT_FRAME_STEP = 4;              // EDITABLE: Cadence step (4 = ~40m intervals; 36 frames total)
  const EARTH_DAYNIGHT_FRAME_COUNT = 36;            // EDITABLE: Number of frames in 24h cycle
  const EARTH_DAYNIGHT_FPS_DESKTOP = 10;            // EDITABLE Desktop: Playback speed in frames per second
  const EARTH_DAYNIGHT_FPS_MOBILE = 10;             // EDITABLE Mobile: Playback speed in frames per second
  const EARTH_DAYNIGHT_FPS = EARTH_DAYNIGHT_FPS_DESKTOP;
  const EARTH_DAYNIGHT_LOOP_PAUSE_MS = 1200;        // EDITABLE: Pause in ms on live frame

  // Smooth Cross-Fade Dynamics
  const EARTH_ANIMATION_CROSSFADE_ENABLED = true;   // EDITABLE: Smooth dual-buffer cross-dissolve between frames
  const EARTH_ANIMATION_CROSSFADE_MS_DESKTOP = 70;  // EDITABLE Desktop: Cross-fade duration in milliseconds
  const EARTH_ANIMATION_CROSSFADE_MS_MOBILE = 70;   // EDITABLE Mobile: Cross-fade duration in milliseconds
  const EARTH_ANIMATION_CROSSFADE_MS = EARTH_ANIMATION_CROSSFADE_MS_DESKTOP;
  const EARTH_ANIMATION_AUTO_REFRESH_MS = 10 * 60 * 1000; // EDITABLE: Auto-fetch fresh frames every 10 minutes

  // Seed list of real-time NOAA GOES-19 GeoColor Full Disk frames for instant readiness
  const EARTH_FRAMES_SEED = [
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262571720_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262571740_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262571800_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262571820_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262571840_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262571900_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262571920_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262571940_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262572000_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262572020_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262572040_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/20262572100_GOES19-ABI-FD-GEOCOLOR-678x678.jpg',
    'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/678x678.jpg'
  ];

  // Subpixel Anti-Aliasing & Soft-Meld Blur (JCV)
  const EARTH_IMAGE_BLUR_DESKTOP = '0.8px';        // EDITABLE Desktop: Subpixel blur
  const EARTH_IMAGE_BLUR_MOBILE = '0.5px';         // EDITABLE Mobile: Subpixel blur on mobile

  function isAutoCelestialDimension(val) {
    if (!val) return true;
    const s = String(val).trim().toLowerCase();
    return s === 'auto' || s.startsWith('aut');
  }

  function formatCelestialDimension(val) {
    if (val === undefined || val === null) return 'auto';
    const s = String(val).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return `${s}vw`;
    return s;
  }

  function applyEarthImageConfig() {
    const isMobile = window.innerWidth <= 767;
    const isAutoWidthDesktop = isAutoCelestialDimension(EARTH_IMAGE_WIDTH_DESKTOP);
    const isAutoWidthMobile = isAutoCelestialDimension(EARTH_IMAGE_WIDTH_MOBILE);
    const earthWidthDesktop = isAutoWidthDesktop
      ? `calc(var(--celestial-base-circle-size-desktop) * var(--earth-globe-scale-desktop, ${EARTH_GLOBE_SCALE_DESKTOP}))`
      : formatCelestialDimension(EARTH_IMAGE_WIDTH_DESKTOP);
    const earthWidthMobile = isAutoWidthMobile
      ? `calc(var(--celestial-base-circle-size-mobile) * var(--earth-globe-scale-mobile, ${EARTH_GLOBE_SCALE_MOBILE}))`
      : formatCelestialDimension(EARTH_IMAGE_WIDTH_MOBILE);
    const earthWidthActive = isMobile ? earthWidthMobile : earthWidthDesktop;

    const marginTop = isMobile ? EARTH_IMAGE_MARGIN_TOP_MOBILE : EARTH_IMAGE_MARGIN_TOP_DESKTOP;
    const marginBottom = isMobile ? EARTH_IMAGE_MARGIN_BOTTOM_MOBILE : EARTH_IMAGE_MARGIN_BOTTOM_DESKTOP;
    const blur = isMobile ? EARTH_IMAGE_BLUR_MOBILE : EARTH_IMAGE_BLUR_DESKTOP;
    const crossfadeMs = isMobile ? EARTH_ANIMATION_CROSSFADE_MS_MOBILE : EARTH_ANIMATION_CROSSFADE_MS_DESKTOP;

    const isAutoInnerDesktop = isAutoCelestialDimension(EARTH_IMAGE_INNER_SCALE_DESKTOP);
    const isAutoInnerMobile = isAutoCelestialDimension(EARTH_IMAGE_INNER_SCALE_MOBILE);
    const innerScaleDesktop = isAutoInnerDesktop ? 'var(--earth-image-width-desktop)' : formatCelestialDimension(EARTH_IMAGE_INNER_SCALE_DESKTOP);
    const innerScaleMobile = isAutoInnerMobile ? 'var(--earth-image-width-mobile)' : formatCelestialDimension(EARTH_IMAGE_INNER_SCALE_MOBILE);
    const innerScale = (isMobile ? isAutoInnerMobile : isAutoInnerDesktop)
      ? 'var(--earth-image-width)'
      : (isMobile ? innerScaleMobile : innerScaleDesktop);

    const offsetY = isMobile ? EARTH_IMAGE_OFFSET_Y_MOBILE : EARTH_IMAGE_OFFSET_Y_DESKTOP;
    const offsetX = isMobile ? EARTH_IMAGE_OFFSET_X_MOBILE : EARTH_IMAGE_OFFSET_X_DESKTOP;

    document.documentElement.style.setProperty('--earth-image-width-desktop', earthWidthDesktop);
    document.documentElement.style.setProperty('--earth-image-width-mobile', earthWidthMobile);
    document.documentElement.style.setProperty('--earth-image-width', earthWidthActive);

    document.documentElement.style.setProperty('--earth-image-margin-top-desktop', EARTH_IMAGE_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--earth-image-margin-top-mobile', EARTH_IMAGE_MARGIN_TOP_MOBILE);
    document.documentElement.style.setProperty('--earth-image-margin-top', marginTop);

    document.documentElement.style.setProperty('--earth-image-margin-bottom-desktop', EARTH_IMAGE_MARGIN_BOTTOM_DESKTOP);
    document.documentElement.style.setProperty('--earth-image-margin-bottom-mobile', EARTH_IMAGE_MARGIN_BOTTOM_MOBILE);
    document.documentElement.style.setProperty('--earth-image-margin-bottom', marginBottom);

    document.documentElement.style.setProperty('--earth-image-inner-scale-desktop', innerScaleDesktop);
    document.documentElement.style.setProperty('--earth-image-inner-scale-mobile', innerScaleMobile);
    document.documentElement.style.setProperty('--earth-image-inner-scale', innerScale);

    document.documentElement.style.setProperty('--earth-image-offset-y-desktop', EARTH_IMAGE_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--earth-image-offset-y-mobile', EARTH_IMAGE_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--earth-image-offset-y', offsetY);

    document.documentElement.style.setProperty('--earth-image-offset-x-desktop', EARTH_IMAGE_OFFSET_X_DESKTOP);
    document.documentElement.style.setProperty('--earth-image-offset-x-mobile', EARTH_IMAGE_OFFSET_X_MOBILE);
    document.documentElement.style.setProperty('--earth-image-offset-x', offsetX);

    document.documentElement.style.setProperty('--earth-image-blur-desktop', EARTH_IMAGE_BLUR_DESKTOP);
    document.documentElement.style.setProperty('--earth-image-blur-mobile', EARTH_IMAGE_BLUR_MOBILE);
    document.documentElement.style.setProperty('--earth-image-blur', blur);

    document.documentElement.style.setProperty('--earth-animation-crossfade-duration-desktop', `${EARTH_ANIMATION_CROSSFADE_MS_DESKTOP}ms`);
    document.documentElement.style.setProperty('--earth-animation-crossfade-duration-mobile', `${EARTH_ANIMATION_CROSSFADE_MS_MOBILE}ms`);
    document.documentElement.style.setProperty('--earth-animation-crossfade-duration', `${crossfadeMs}ms`);

    const maskRadius = isMobile ? EARTH_MASK_RADIUS_MOBILE : EARTH_MASK_RADIUS_DESKTOP;
    const maskPosY = isMobile ? EARTH_MASK_POSITION_Y_MOBILE : EARTH_MASK_POSITION_Y_DESKTOP;

    document.documentElement.style.setProperty('--earth-mask-radius-desktop', EARTH_MASK_RADIUS_DESKTOP);
    document.documentElement.style.setProperty('--earth-mask-radius-mobile', EARTH_MASK_RADIUS_MOBILE);
    document.documentElement.style.setProperty('--earth-mask-radius', maskRadius);

    document.documentElement.style.setProperty('--earth-mask-position-y-desktop', EARTH_MASK_POSITION_Y_DESKTOP);
    document.documentElement.style.setProperty('--earth-mask-position-y-mobile', EARTH_MASK_POSITION_Y_MOBILE);
    document.documentElement.style.setProperty('--earth-mask-position-y', maskPosY);

    const container = document.getElementById('earth-image-container');
    if (container) {
      container.style.width = 'var(--earth-image-width)';
      container.style.height = 'var(--earth-image-width)';
      container.style.marginTop = 'var(--earth-image-container-margin-top, 0vw)';
      container.style.backgroundColor = 'transparent';
      container.style.mixBlendMode = 'lighten';
    }

    const spacer = document.getElementById('earth-image-spacer');
    if (spacer) {
      spacer.style.display = 'none';
    }
  }
  function applySunImageConfig() {
    const isMobile = window.innerWidth <= 767;

    // Space above and below Celestial Row (JCV)
    document.documentElement.style.setProperty('--celestial-row-margin-top-desktop', CELESTIAL_ROW_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--celestial-row-margin-top-mobile', CELESTIAL_ROW_MARGIN_TOP_MOBILE);
    document.documentElement.style.setProperty('--celestial-row-margin-top', isMobile ? CELESTIAL_ROW_MARGIN_TOP_MOBILE : CELESTIAL_ROW_MARGIN_TOP_DESKTOP);

    document.documentElement.style.setProperty('--celestial-row-margin-bottom-desktop', CELESTIAL_ROW_MARGIN_BOTTOM_DESKTOP);
    document.documentElement.style.setProperty('--celestial-row-margin-bottom-mobile', CELESTIAL_ROW_MARGIN_BOTTOM_MOBILE);
    document.documentElement.style.setProperty('--celestial-row-margin-bottom', isMobile ? CELESTIAL_ROW_MARGIN_BOTTOM_MOBILE : CELESTIAL_ROW_MARGIN_BOTTOM_DESKTOP);

    // Edge gaps establishing the 95% alignment directly under timezone clocks #1 & #5 (JCV)
    document.documentElement.style.setProperty('--celestial-row-edge-gap-left-desktop', CELESTIAL_ROW_EDGE_GAP_LEFT_DESKTOP);
    document.documentElement.style.setProperty('--celestial-row-edge-gap-left-mobile', CELESTIAL_ROW_EDGE_GAP_LEFT_MOBILE);
    document.documentElement.style.setProperty('--celestial-row-edge-gap-left', isMobile ? CELESTIAL_ROW_EDGE_GAP_LEFT_MOBILE : CELESTIAL_ROW_EDGE_GAP_LEFT_DESKTOP);

    document.documentElement.style.setProperty('--celestial-row-edge-gap-right-desktop', CELESTIAL_ROW_EDGE_GAP_RIGHT_DESKTOP);
    document.documentElement.style.setProperty('--celestial-row-edge-gap-right-mobile', CELESTIAL_ROW_EDGE_GAP_RIGHT_MOBILE);
    document.documentElement.style.setProperty('--celestial-row-edge-gap-right', isMobile ? CELESTIAL_ROW_EDGE_GAP_RIGHT_MOBILE : CELESTIAL_ROW_EDGE_GAP_RIGHT_DESKTOP);

    // Gaps between all 4 objects across the row (JCV)
    document.documentElement.style.setProperty('--gap-pacific-to-sun-desktop', GAP_PACIFIC_TO_SUN_DESKTOP);
    document.documentElement.style.setProperty('--gap-pacific-to-sun-mobile', GAP_PACIFIC_TO_SUN_MOBILE);
    document.documentElement.style.setProperty('--gap-pacific-to-sun', isMobile ? GAP_PACIFIC_TO_SUN_MOBILE : GAP_PACIFIC_TO_SUN_DESKTOP);
    document.documentElement.style.setProperty('--celestial-dial-left-gap-right-desktop', CELESTIAL_DIAL_LEFT_GAP_RIGHT_DESKTOP);
    document.documentElement.style.setProperty('--celestial-dial-left-gap-right-mobile', CELESTIAL_DIAL_LEFT_GAP_RIGHT_MOBILE);
    document.documentElement.style.setProperty('--celestial-dial-left-gap-right', isMobile ? CELESTIAL_DIAL_LEFT_GAP_RIGHT_MOBILE : CELESTIAL_DIAL_LEFT_GAP_RIGHT_DESKTOP);

    document.documentElement.style.setProperty('--sun-gap-left-desktop', SUN_GAP_LEFT_DESKTOP);
    document.documentElement.style.setProperty('--sun-gap-left-mobile', SUN_GAP_LEFT_MOBILE);
    document.documentElement.style.setProperty('--sun-gap-left', isMobile ? SUN_GAP_LEFT_MOBILE : SUN_GAP_LEFT_DESKTOP);

    document.documentElement.style.setProperty('--gap-sun-to-earth-desktop', GAP_SUN_TO_EARTH_DESKTOP);
    document.documentElement.style.setProperty('--gap-sun-to-earth-mobile', GAP_SUN_TO_EARTH_MOBILE);
    document.documentElement.style.setProperty('--gap-sun-to-earth', isMobile ? GAP_SUN_TO_EARTH_MOBILE : GAP_SUN_TO_EARTH_DESKTOP);
    document.documentElement.style.setProperty('--sun-gap-right-desktop', SUN_GAP_RIGHT_DESKTOP);
    document.documentElement.style.setProperty('--sun-gap-right-mobile', SUN_GAP_RIGHT_MOBILE);
    document.documentElement.style.setProperty('--sun-gap-right', isMobile ? SUN_GAP_RIGHT_MOBILE : SUN_GAP_RIGHT_DESKTOP);

    document.documentElement.style.setProperty('--earth-gap-left-desktop', EARTH_GAP_LEFT_DESKTOP);
    document.documentElement.style.setProperty('--earth-gap-left-mobile', EARTH_GAP_LEFT_MOBILE);
    document.documentElement.style.setProperty('--earth-gap-left', isMobile ? EARTH_GAP_LEFT_MOBILE : EARTH_GAP_LEFT_DESKTOP);

    const earthToUkDesktop = (GAP_EARTH_TO_UK_DESKTOP !== '0vw' && EARTH_GAP_RIGHT_DESKTOP !== '0vw' && GAP_EARTH_TO_UK_DESKTOP !== EARTH_GAP_RIGHT_DESKTOP)
      ? `calc(${GAP_EARTH_TO_UK_DESKTOP} + ${EARTH_GAP_RIGHT_DESKTOP})`
      : (GAP_EARTH_TO_UK_DESKTOP !== '0vw' ? GAP_EARTH_TO_UK_DESKTOP : EARTH_GAP_RIGHT_DESKTOP);
    const earthToUkMobile = (GAP_EARTH_TO_UK_MOBILE !== '0vw' && EARTH_GAP_RIGHT_MOBILE !== '0vw' && GAP_EARTH_TO_UK_MOBILE !== EARTH_GAP_RIGHT_MOBILE)
      ? `calc(${GAP_EARTH_TO_UK_MOBILE} + ${EARTH_GAP_RIGHT_MOBILE})`
      : (GAP_EARTH_TO_UK_MOBILE !== '0vw' ? GAP_EARTH_TO_UK_MOBILE : EARTH_GAP_RIGHT_MOBILE);

    document.documentElement.style.setProperty('--gap-earth-to-uk-desktop', earthToUkDesktop);
    document.documentElement.style.setProperty('--gap-earth-to-uk-mobile', earthToUkMobile);
    document.documentElement.style.setProperty('--gap-earth-to-uk', isMobile ? earthToUkMobile : earthToUkDesktop);
    document.documentElement.style.setProperty('--earth-gap-right-desktop', earthToUkDesktop);
    document.documentElement.style.setProperty('--earth-gap-right-mobile', earthToUkMobile);
    document.documentElement.style.setProperty('--earth-gap-right', isMobile ? earthToUkMobile : earthToUkDesktop);

    document.documentElement.style.setProperty('--celestial-dial-right-gap-left-desktop', CELESTIAL_DIAL_RIGHT_GAP_LEFT_DESKTOP);
    document.documentElement.style.setProperty('--celestial-dial-right-gap-left-mobile', CELESTIAL_DIAL_RIGHT_GAP_LEFT_MOBILE);
    document.documentElement.style.setProperty('--celestial-dial-right-gap-left', isMobile ? CELESTIAL_DIAL_RIGHT_GAP_LEFT_MOBILE : CELESTIAL_DIAL_RIGHT_GAP_LEFT_DESKTOP);

    // Legacy aliases
    document.documentElement.style.setProperty('--sun-duo-gap-desktop', SUN_GAP_RIGHT_DESKTOP);
    document.documentElement.style.setProperty('--sun-duo-gap-mobile', SUN_GAP_RIGHT_MOBILE);
    document.documentElement.style.setProperty('--sun-duo-gap', isMobile ? SUN_GAP_RIGHT_MOBILE : SUN_GAP_RIGHT_DESKTOP);

    // Scales for Sun & Earth
    document.documentElement.style.setProperty('--sun-size-scale-desktop', String(SUN_SIZE_SCALE_DESKTOP));
    document.documentElement.style.setProperty('--sun-size-scale-mobile', String(SUN_SIZE_SCALE_MOBILE));
    document.documentElement.style.setProperty('--sun-size-scale', String(isMobile ? SUN_SIZE_SCALE_MOBILE : SUN_SIZE_SCALE_DESKTOP));
    document.documentElement.style.setProperty('--sun-corona-scale', String(isMobile ? SUN_SIZE_SCALE_MOBILE : SUN_SIZE_SCALE_DESKTOP));

    document.documentElement.style.setProperty('--earth-size-scale-desktop', String(EARTH_SIZE_SCALE_DESKTOP));
    document.documentElement.style.setProperty('--earth-size-scale-mobile', String(EARTH_SIZE_SCALE_MOBILE));
    document.documentElement.style.setProperty('--earth-size-scale', String(isMobile ? EARTH_SIZE_SCALE_MOBILE : EARTH_SIZE_SCALE_DESKTOP));
    document.documentElement.style.setProperty('--earth-globe-scale-desktop', String(EARTH_GLOBE_SCALE_DESKTOP));
    document.documentElement.style.setProperty('--earth-globe-scale-mobile', String(EARTH_GLOBE_SCALE_MOBILE));
    document.documentElement.style.setProperty('--earth-globe-scale', String(isMobile ? EARTH_GLOBE_SCALE_MOBILE : EARTH_GLOBE_SCALE_DESKTOP));

    // Base circle diameter calculated from remaining space in row:
    // W_rem = Row_Width - (2 * Dial_Size) - Total_Gaps
    // Since Sun = sunScale * Base and Earth = earthScale * Base, W_rem = (sunScale + earthScale) * Base
    const totalGapsDesktop = 'calc(var(--celestial-row-edge-gap-left-desktop, 0vw) + var(--celestial-dial-left-gap-right-desktop, 0vw) + var(--sun-gap-left-desktop, 0vw) + var(--earth-gap-left-desktop, 0vw) + var(--earth-gap-right-desktop, 0vw) + var(--celestial-dial-right-gap-left-desktop, 0vw) + var(--celestial-row-edge-gap-right-desktop, 0vw))';
    const totalGapsMobile = 'calc(var(--celestial-row-edge-gap-left-mobile, 0vw) + var(--celestial-dial-left-gap-right-mobile, 0vw) + var(--sun-gap-left-mobile, 0vw) + var(--earth-gap-left-mobile, 0vw) + var(--earth-gap-right-mobile, 0vw) + var(--celestial-dial-right-gap-left-mobile, 0vw) + var(--celestial-row-edge-gap-right-mobile, 0vw))';

    const baseCircleDesktop = `calc((var(--world-clocks-width-desktop, 95vw) - (2 * var(--world-clock-size-desktop, 17.4vw)) - (${totalGapsDesktop})) / (${SUN_SIZE_SCALE_DESKTOP} + ${EARTH_SIZE_SCALE_DESKTOP}))`;
    const baseCircleMobile = `calc((var(--world-clocks-width-mobile, 95vw) - (2 * var(--world-clock-size-mobile, 17.5vw)) - (${totalGapsMobile})) / (${SUN_SIZE_SCALE_MOBILE} + ${EARTH_SIZE_SCALE_MOBILE}))`;
    const baseCircleActive = isMobile ? baseCircleMobile : baseCircleDesktop;

    document.documentElement.style.setProperty('--celestial-base-circle-size-desktop', baseCircleDesktop);
    document.documentElement.style.setProperty('--celestial-base-circle-size-mobile', baseCircleMobile);
    document.documentElement.style.setProperty('--celestial-base-circle-size', baseCircleActive);

    // Sun circle width (scaled relative to world clock size via SUN_SIZE_SCALE or custom vw string)
    const isSunWidthAutoDesktop = isAutoCelestialDimension(SUN_IMAGE_WIDTH_DESKTOP);
    const isSunWidthAutoMobile = isAutoCelestialDimension(SUN_IMAGE_WIDTH_MOBILE);
    const sunWidthDesktop = isSunWidthAutoDesktop
      ? `calc(var(--world-clock-size-desktop, 17.4vw) * var(--sun-size-scale-desktop, ${SUN_SIZE_SCALE_DESKTOP}))`
      : formatCelestialDimension(SUN_IMAGE_WIDTH_DESKTOP);
    const sunWidthMobile = isSunWidthAutoMobile
      ? `calc(var(--world-clock-size-mobile, 17.5vw) * var(--sun-size-scale-mobile, ${SUN_SIZE_SCALE_MOBILE}))`
      : formatCelestialDimension(SUN_IMAGE_WIDTH_MOBILE);
    const sunWidthActive = (isMobile ? isSunWidthAutoMobile : isSunWidthAutoDesktop)
      ? `calc(var(--world-clock-size, 17.4vw) * var(--sun-size-scale, ${isMobile ? SUN_SIZE_SCALE_MOBILE : SUN_SIZE_SCALE_DESKTOP}))`
      : (isMobile ? formatCelestialDimension(SUN_IMAGE_WIDTH_MOBILE) : formatCelestialDimension(SUN_IMAGE_WIDTH_DESKTOP));

    document.documentElement.style.setProperty('--sun-image-width-desktop', sunWidthDesktop);
    document.documentElement.style.setProperty('--sun-image-width-mobile', sunWidthMobile);
    document.documentElement.style.setProperty('--sun-image-width', sunWidthActive);

    // Earth circle width (scaled relative to world clock size via EARTH_GLOBE_SCALE or custom vw string)
    const isEarthWidthAutoDesktop = isAutoCelestialDimension(EARTH_IMAGE_WIDTH_DESKTOP);
    const isEarthWidthAutoMobile = isAutoCelestialDimension(EARTH_IMAGE_WIDTH_MOBILE);
    const earthWidthDesktop = isEarthWidthAutoDesktop
      ? `calc(var(--world-clock-size-desktop, 17.4vw) * var(--earth-globe-scale-desktop, ${EARTH_GLOBE_SCALE_DESKTOP}))`
      : formatCelestialDimension(EARTH_IMAGE_WIDTH_DESKTOP);
    const earthWidthMobile = isEarthWidthAutoMobile
      ? `calc(var(--world-clock-size-mobile, 17.5vw) * var(--earth-globe-scale-mobile, ${EARTH_GLOBE_SCALE_MOBILE}))`
      : formatCelestialDimension(EARTH_IMAGE_WIDTH_MOBILE);
    const earthWidthActive = (isMobile ? isEarthWidthAutoMobile : isEarthWidthAutoDesktop)
      ? `calc(var(--world-clock-size, 17.4vw) * var(--earth-globe-scale, ${isMobile ? EARTH_GLOBE_SCALE_MOBILE : EARTH_GLOBE_SCALE_DESKTOP}))`
      : (isMobile ? formatCelestialDimension(EARTH_IMAGE_WIDTH_MOBILE) : formatCelestialDimension(EARTH_IMAGE_WIDTH_DESKTOP));

    document.documentElement.style.setProperty('--earth-image-width-desktop', earthWidthDesktop);
    document.documentElement.style.setProperty('--earth-image-width-mobile', earthWidthMobile);
    document.documentElement.style.setProperty('--earth-image-width', earthWidthActive);

    // Sun Inner Scale (1.08 of Sun width pushes watermark outside circle)
    const isSunInnerAutoDesktop = isAutoCelestialDimension(SUN_IMAGE_INNER_SCALE_DESKTOP);
    const isSunInnerAutoMobile = isAutoCelestialDimension(SUN_IMAGE_INNER_SCALE_MOBILE);
    const sunInnerDesktop = isSunInnerAutoDesktop
      ? 'calc(var(--sun-image-width-desktop) * 1.08)'
      : formatCelestialDimension(SUN_IMAGE_INNER_SCALE_DESKTOP);
    const sunInnerMobile = isSunInnerAutoMobile
      ? 'calc(var(--sun-image-width-mobile) * 1.08)'
      : formatCelestialDimension(SUN_IMAGE_INNER_SCALE_MOBILE);
    const sunInnerActive = (isMobile ? isSunInnerAutoMobile : isSunInnerAutoDesktop)
      ? 'calc(var(--sun-image-width) * 1.08)'
      : (isMobile ? sunInnerMobile : sunInnerDesktop);

    document.documentElement.style.setProperty('--sun-image-inner-scale-desktop', sunInnerDesktop);
    document.documentElement.style.setProperty('--sun-image-inner-scale-mobile', sunInnerMobile);
    document.documentElement.style.setProperty('--sun-image-inner-scale', sunInnerActive);

    // Earth Inner Scale
    const isEarthInnerAutoDesktop = isAutoCelestialDimension(EARTH_IMAGE_INNER_SCALE_DESKTOP);
    const isEarthInnerAutoMobile = isAutoCelestialDimension(EARTH_IMAGE_INNER_SCALE_MOBILE);
    const earthInnerDesktop = isEarthInnerAutoDesktop
      ? 'var(--earth-image-width-desktop)'
      : formatCelestialDimension(EARTH_IMAGE_INNER_SCALE_DESKTOP);
    const earthInnerMobile = isEarthInnerAutoMobile
      ? 'var(--earth-image-width-mobile)'
      : formatCelestialDimension(EARTH_IMAGE_INNER_SCALE_MOBILE);
    const earthInnerActive = (isMobile ? isEarthInnerAutoMobile : isEarthInnerAutoDesktop)
      ? 'var(--earth-image-width)'
      : (isMobile ? earthInnerMobile : earthInnerDesktop);

    document.documentElement.style.setProperty('--earth-image-inner-scale-desktop', earthInnerDesktop);
    document.documentElement.style.setProperty('--earth-image-inner-scale-mobile', earthInnerMobile);
    document.documentElement.style.setProperty('--earth-image-inner-scale', earthInnerActive);

    // Flanking Dials: Size
    const isDialSizeAutoDesktop = !CELESTIAL_DIAL_SIZE_DESKTOP || CELESTIAL_DIAL_SIZE_DESKTOP === 'auto';
    const isDialSizeAutoMobile = !CELESTIAL_DIAL_SIZE_MOBILE || CELESTIAL_DIAL_SIZE_MOBILE === 'auto';
    const dialSizeDesktop = isDialSizeAutoDesktop ? 'var(--world-clock-size-desktop)' : CELESTIAL_DIAL_SIZE_DESKTOP;
    const dialSizeMobile = isDialSizeAutoMobile ? 'var(--world-clock-size-mobile)' : CELESTIAL_DIAL_SIZE_MOBILE;
    const dialSizeActive = (isMobile ? isDialSizeAutoMobile : isDialSizeAutoDesktop) ? 'var(--world-clock-size)' : (isMobile ? CELESTIAL_DIAL_SIZE_MOBILE : CELESTIAL_DIAL_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--celestial-dial-size-desktop', dialSizeDesktop);
    document.documentElement.style.setProperty('--celestial-dial-size-mobile', dialSizeMobile);
    document.documentElement.style.setProperty('--celestial-dial-size', dialSizeActive);

    // Universal Equator Centering across all 4 circles:
    // Calculates the reference max diameter across all circles in the row so ALL 4 circles stay centered on the same equator
    const maxCircleDesktop = 'max(var(--sun-image-width-desktop), var(--earth-image-width-desktop), var(--celestial-dial-size-desktop, var(--world-clock-size-desktop)))';
    const maxCircleMobile = 'max(var(--sun-image-width-mobile), var(--earth-image-width-mobile), var(--celestial-dial-size-mobile, var(--world-clock-size-mobile)))';
    const maxCircleActive = isMobile ? maxCircleMobile : maxCircleDesktop;

    document.documentElement.style.setProperty('--celestial-max-circle-size-desktop', maxCircleDesktop);
    document.documentElement.style.setProperty('--celestial-max-circle-size-mobile', maxCircleMobile);
    document.documentElement.style.setProperty('--celestial-max-circle-size', maxCircleActive);

    // Sun container margin-top for equator centering
    const sunMarginTopDesktop = 'calc(((var(--celestial-max-circle-size-desktop) - var(--sun-image-width-desktop)) / 2) + var(--sun-image-offset-y-desktop, 0vw))';
    const sunMarginTopMobile = 'calc(((var(--celestial-max-circle-size-mobile) - var(--sun-image-width-mobile)) / 2) + var(--sun-image-offset-y-mobile, 0vw))';
    const sunMarginTopActive = isMobile ? sunMarginTopMobile : sunMarginTopDesktop;
    document.documentElement.style.setProperty('--sun-image-container-margin-top-desktop', sunMarginTopDesktop);
    document.documentElement.style.setProperty('--sun-image-container-margin-top-mobile', sunMarginTopMobile);
    document.documentElement.style.setProperty('--sun-image-container-margin-top', sunMarginTopActive);

    // Earth container margin-top for equator centering
    const earthMarginTopDesktop = 'calc(((var(--celestial-max-circle-size-desktop) - var(--earth-image-width-desktop)) / 2) + var(--earth-image-offset-y-desktop, 0vw))';
    const earthMarginTopMobile = 'calc(((var(--celestial-max-circle-size-mobile) - var(--earth-image-width-mobile)) / 2) + var(--earth-image-offset-y-mobile, 0vw))';
    const earthMarginTopActive = isMobile ? earthMarginTopMobile : earthMarginTopDesktop;
    document.documentElement.style.setProperty('--earth-image-container-margin-top-desktop', earthMarginTopDesktop);
    document.documentElement.style.setProperty('--earth-image-container-margin-top-mobile', earthMarginTopMobile);
    document.documentElement.style.setProperty('--earth-image-container-margin-top', earthMarginTopActive);

    // Flanking Dials: Equator Centering with Sun & Earth
    const isCenterDesktop = CELESTIAL_DIAL_VERTICAL_ALIGN_DESKTOP === 'center';
    const isCenterMobile = CELESTIAL_DIAL_VERTICAL_ALIGN_MOBILE === 'center';
    const dialMarginTopDesktop = isCenterDesktop
      ? 'calc(((var(--celestial-max-circle-size-desktop) - var(--celestial-dial-size-desktop, var(--world-clock-size-desktop))) / 2) + var(--celestial-dial-offset-y-desktop, 0vw))'
      : 'var(--celestial-dial-offset-y-desktop, 0vw)';
    const dialMarginTopMobile = isCenterMobile
      ? 'calc(((var(--celestial-max-circle-size-mobile) - var(--celestial-dial-size-mobile, var(--world-clock-size-mobile))) / 2) + var(--celestial-dial-offset-y-mobile, 0vw))'
      : 'var(--celestial-dial-offset-y-mobile, 0vw)';
    const dialMarginTopActive = (isMobile ? isCenterMobile : isCenterDesktop)
      ? 'calc(((var(--celestial-max-circle-size) - var(--celestial-dial-size, var(--world-clock-size))) / 2) + var(--celestial-dial-offset-y, 0vw))'
      : 'var(--celestial-dial-offset-y, 0vw)';

    document.documentElement.style.setProperty('--celestial-dial-offset-y-desktop', CELESTIAL_DIAL_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--celestial-dial-offset-y-mobile', CELESTIAL_DIAL_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--celestial-dial-offset-y', isMobile ? CELESTIAL_DIAL_OFFSET_Y_MOBILE : CELESTIAL_DIAL_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--celestial-dial-offset-x-desktop', CELESTIAL_DIAL_OFFSET_X_DESKTOP);
    document.documentElement.style.setProperty('--celestial-dial-offset-x-mobile', CELESTIAL_DIAL_OFFSET_X_MOBILE);
    document.documentElement.style.setProperty('--celestial-dial-offset-x', isMobile ? CELESTIAL_DIAL_OFFSET_X_MOBILE : CELESTIAL_DIAL_OFFSET_X_DESKTOP);

    document.documentElement.style.setProperty('--celestial-dial-margin-top-desktop', dialMarginTopDesktop);
    document.documentElement.style.setProperty('--celestial-dial-margin-top-mobile', dialMarginTopMobile);
    document.documentElement.style.setProperty('--celestial-dial-margin-top', dialMarginTopActive);

    // Flanking Dials: Label Margin & Offsets
    document.documentElement.style.setProperty('--celestial-dial-label-margin-top-desktop', CELESTIAL_DIAL_LABEL_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--celestial-dial-label-margin-top-mobile', CELESTIAL_DIAL_LABEL_MARGIN_TOP_MOBILE);
    document.documentElement.style.setProperty('--celestial-dial-label-margin-top', isMobile ? CELESTIAL_DIAL_LABEL_MARGIN_TOP_MOBILE : CELESTIAL_DIAL_LABEL_MARGIN_TOP_DESKTOP);

    document.documentElement.style.setProperty('--celestial-dial-label-offset-y-desktop', CELESTIAL_DIAL_LABEL_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--celestial-dial-label-offset-y-mobile', CELESTIAL_DIAL_LABEL_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--celestial-dial-label-offset-y', isMobile ? CELESTIAL_DIAL_LABEL_OFFSET_Y_MOBILE : CELESTIAL_DIAL_LABEL_OFFSET_Y_DESKTOP);

    // Flanking dial names in DOM if elements exist
    if (CELESTIAL_DIALS_ENABLED) {
      const leftNameEl = document.querySelector('#celestial-clock-left .world-clock-name');
      if (leftNameEl) {
        leftNameEl.textContent = isMobile ? CELESTIAL_DIAL_LEFT_NAME_MOBILE : CELESTIAL_DIAL_LEFT_NAME_DESKTOP;
      }
      const rightNameEl = document.querySelector('#celestial-clock-right .world-clock-name');
      if (rightNameEl) {
        rightNameEl.textContent = isMobile ? CELESTIAL_DIAL_RIGHT_NAME_MOBILE : CELESTIAL_DIAL_RIGHT_NAME_DESKTOP;
      }
    }

    // Solar Flare Dial Variables (JCV)
    const isSolarDialAutoDesktop = !SOLAR_FLARE_DIAL_SIZE_DESKTOP || SOLAR_FLARE_DIAL_SIZE_DESKTOP === 'auto';
    const isSolarDialAutoMobile = !SOLAR_FLARE_DIAL_SIZE_MOBILE || SOLAR_FLARE_DIAL_SIZE_MOBILE === 'auto';
    const solarDialSizeDesktop = isSolarDialAutoDesktop ? 'var(--celestial-dial-size-desktop, var(--world-clock-size-desktop))' : SOLAR_FLARE_DIAL_SIZE_DESKTOP;
    const solarDialSizeMobile = isSolarDialAutoMobile ? 'var(--celestial-dial-size-mobile, var(--world-clock-size-mobile))' : SOLAR_FLARE_DIAL_SIZE_MOBILE;
    const solarDialSize = (isMobile ? isSolarDialAutoMobile : isSolarDialAutoDesktop) ? 'var(--celestial-dial-size, var(--world-clock-size))' : (isMobile ? SOLAR_FLARE_DIAL_SIZE_MOBILE : SOLAR_FLARE_DIAL_SIZE_DESKTOP);

    document.documentElement.style.setProperty('--solar-flare-dial-size-desktop', solarDialSizeDesktop);
    document.documentElement.style.setProperty('--solar-flare-dial-size-mobile', solarDialSizeMobile);
    document.documentElement.style.setProperty('--solar-flare-dial-size', solarDialSize);

    document.documentElement.style.setProperty('--solar-flare-offset-x-desktop', SOLAR_FLARE_OFFSET_X_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-offset-x-mobile', SOLAR_FLARE_OFFSET_X_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-offset-x', isMobile ? SOLAR_FLARE_OFFSET_X_MOBILE : SOLAR_FLARE_OFFSET_X_DESKTOP);

    document.documentElement.style.setProperty('--solar-flare-offset-y-desktop', SOLAR_FLARE_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-offset-y-mobile', SOLAR_FLARE_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-offset-y', isMobile ? SOLAR_FLARE_OFFSET_Y_MOBILE : SOLAR_FLARE_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--solar-flare-start-angle', `${SOLAR_FLARE_START_ANGLE_DEG}deg`);
    document.documentElement.style.setProperty('--solar-flare-track-color', SOLAR_FLARE_TRACK_COLOR);
    document.documentElement.style.setProperty('--solar-flare-track-stroke-width', String(isMobile ? SOLAR_FLARE_TRACK_STROKE_WIDTH_MOBILE : SOLAR_FLARE_TRACK_STROKE_WIDTH_DESKTOP));
    document.documentElement.style.setProperty('--solar-flare-progress-stroke-width', String(isMobile ? SOLAR_FLARE_PROGRESS_STROKE_WIDTH_MOBILE : SOLAR_FLARE_PROGRESS_STROKE_WIDTH_DESKTOP));
    document.documentElement.style.setProperty('--solar-flare-stroke-linecap', SOLAR_FLARE_STROKE_LINECAP);
    document.documentElement.style.setProperty('--solar-flare-anim-duration', `${SOLAR_FLARE_ANIM_DURATION_S}s`);

    document.documentElement.style.setProperty('--solar-flare-dial-bg-color', SOLAR_FLARE_DIAL_BG_COLOR);
    document.documentElement.style.setProperty('--solar-flare-dial-inner-shadow', SOLAR_FLARE_DIAL_INNER_SHADOW);

    document.documentElement.style.setProperty('--solar-flare-content-offset-y-desktop', SOLAR_FLARE_CONTENT_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-content-offset-y-mobile', SOLAR_FLARE_CONTENT_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-content-offset-y', isMobile ? SOLAR_FLARE_CONTENT_OFFSET_Y_MOBILE : SOLAR_FLARE_CONTENT_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--solar-flare-label-font-family', SOLAR_FLARE_LABEL_FONT_FAMILY);
    document.documentElement.style.setProperty('--solar-flare-label-font-size-desktop', SOLAR_FLARE_LABEL_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-label-font-size-mobile', SOLAR_FLARE_LABEL_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-label-font-size', isMobile ? SOLAR_FLARE_LABEL_FONT_SIZE_MOBILE : SOLAR_FLARE_LABEL_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-label-line-height', String(SOLAR_FLARE_LABEL_LINE_HEIGHT));
    document.documentElement.style.setProperty('--solar-flare-label-letter-spacing-desktop', SOLAR_FLARE_LABEL_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-label-letter-spacing-mobile', SOLAR_FLARE_LABEL_LETTER_SPACING_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-label-letter-spacing', isMobile ? SOLAR_FLARE_LABEL_LETTER_SPACING_MOBILE : SOLAR_FLARE_LABEL_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-label-offset-y-desktop', SOLAR_FLARE_LABEL_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-label-offset-y-mobile', SOLAR_FLARE_LABEL_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-label-offset-y', isMobile ? SOLAR_FLARE_LABEL_OFFSET_Y_MOBILE : SOLAR_FLARE_LABEL_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--solar-flare-gap-label-to-class-desktop', SOLAR_FLARE_GAP_LABEL_TO_CLASS_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-gap-label-to-class-mobile', SOLAR_FLARE_GAP_LABEL_TO_CLASS_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-gap-label-to-class', isMobile ? SOLAR_FLARE_GAP_LABEL_TO_CLASS_MOBILE : SOLAR_FLARE_GAP_LABEL_TO_CLASS_DESKTOP);

    document.documentElement.style.setProperty('--solar-flare-class-font-family', SOLAR_FLARE_CLASS_FONT_FAMILY);
    document.documentElement.style.setProperty('--solar-flare-class-font-size-desktop', SOLAR_FLARE_CLASS_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-class-font-size-mobile', SOLAR_FLARE_CLASS_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-class-font-size', isMobile ? SOLAR_FLARE_CLASS_FONT_SIZE_MOBILE : SOLAR_FLARE_CLASS_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-class-line-height', String(SOLAR_FLARE_CLASS_LINE_HEIGHT));
    document.documentElement.style.setProperty('--solar-flare-class-offset-y-desktop', SOLAR_FLARE_CLASS_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-class-offset-y-mobile', SOLAR_FLARE_CLASS_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-class-offset-y', isMobile ? SOLAR_FLARE_CLASS_OFFSET_Y_MOBILE : SOLAR_FLARE_CLASS_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--solar-flare-gap-class-to-value-desktop', SOLAR_FLARE_GAP_CLASS_TO_VALUE_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-gap-class-to-value-mobile', SOLAR_FLARE_GAP_CLASS_TO_VALUE_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-gap-class-to-value', isMobile ? SOLAR_FLARE_GAP_CLASS_TO_VALUE_MOBILE : SOLAR_FLARE_GAP_CLASS_TO_VALUE_DESKTOP);

    document.documentElement.style.setProperty('--solar-flare-value-font-family', SOLAR_FLARE_VALUE_FONT_FAMILY);
    document.documentElement.style.setProperty('--solar-flare-value-font-size-desktop', SOLAR_FLARE_VALUE_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-value-font-size-mobile', SOLAR_FLARE_VALUE_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-value-font-size', isMobile ? SOLAR_FLARE_VALUE_FONT_SIZE_MOBILE : SOLAR_FLARE_VALUE_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-value-line-height', String(SOLAR_FLARE_VALUE_LINE_HEIGHT));
    document.documentElement.style.setProperty('--solar-flare-value-letter-spacing-desktop', SOLAR_FLARE_VALUE_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-value-letter-spacing-mobile', SOLAR_FLARE_VALUE_LETTER_SPACING_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-value-letter-spacing', isMobile ? SOLAR_FLARE_VALUE_LETTER_SPACING_MOBILE : SOLAR_FLARE_VALUE_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-value-offset-y-desktop', SOLAR_FLARE_VALUE_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-value-offset-y-mobile', SOLAR_FLARE_VALUE_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-value-offset-y', isMobile ? SOLAR_FLARE_VALUE_OFFSET_Y_MOBILE : SOLAR_FLARE_VALUE_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--solar-flare-sublabel-font-family', SOLAR_FLARE_SUBLABEL_FONT_FAMILY);
    document.documentElement.style.setProperty('--solar-flare-sublabel-font-size-desktop', SOLAR_FLARE_SUBLABEL_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-sublabel-font-size-mobile', SOLAR_FLARE_SUBLABEL_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-sublabel-font-size', isMobile ? SOLAR_FLARE_SUBLABEL_FONT_SIZE_MOBILE : SOLAR_FLARE_SUBLABEL_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-sublabel-line-height', String(SOLAR_FLARE_SUBLABEL_LINE_HEIGHT));
    document.documentElement.style.setProperty('--solar-flare-sublabel-letter-spacing-desktop', SOLAR_FLARE_SUBLABEL_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-sublabel-letter-spacing-mobile', SOLAR_FLARE_SUBLABEL_LETTER_SPACING_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-sublabel-letter-spacing', isMobile ? SOLAR_FLARE_SUBLABEL_LETTER_SPACING_MOBILE : SOLAR_FLARE_SUBLABEL_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-sublabel-margin-top-desktop', SOLAR_FLARE_SUBLABEL_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-sublabel-margin-top-mobile', SOLAR_FLARE_SUBLABEL_MARGIN_TOP_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-sublabel-margin-top', isMobile ? SOLAR_FLARE_SUBLABEL_MARGIN_TOP_MOBILE : SOLAR_FLARE_SUBLABEL_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-sublabel-offset-y-desktop', SOLAR_FLARE_SUBLABEL_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--solar-flare-sublabel-offset-y-mobile', SOLAR_FLARE_SUBLABEL_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--solar-flare-sublabel-offset-y', isMobile ? SOLAR_FLARE_SUBLABEL_OFFSET_Y_MOBILE : SOLAR_FLARE_SUBLABEL_OFFSET_Y_DESKTOP);

    if (typeof updateSolarFlareDial === 'function') {
      updateSolarFlareDial();
    }

    // Radio Blackout (R-Scale) Dial Variables (JCV)
    const isRadioDialAutoDesktop = !RADIO_BLACKOUT_DIAL_SIZE_DESKTOP || RADIO_BLACKOUT_DIAL_SIZE_DESKTOP === 'auto';
    const isRadioDialAutoMobile = !RADIO_BLACKOUT_DIAL_SIZE_MOBILE || RADIO_BLACKOUT_DIAL_SIZE_MOBILE === 'auto';
    const radioDialSizeDesktop = isRadioDialAutoDesktop ? 'var(--celestial-dial-size-desktop, var(--world-clock-size-desktop))' : RADIO_BLACKOUT_DIAL_SIZE_DESKTOP;
    const radioDialSizeMobile = isRadioDialAutoMobile ? 'var(--celestial-dial-size-mobile, var(--world-clock-size-mobile))' : RADIO_BLACKOUT_DIAL_SIZE_MOBILE;
    const radioDialSize = (isMobile ? isRadioDialAutoMobile : isRadioDialAutoDesktop) ? 'var(--celestial-dial-size, var(--world-clock-size))' : (isMobile ? RADIO_BLACKOUT_DIAL_SIZE_MOBILE : RADIO_BLACKOUT_DIAL_SIZE_DESKTOP);

    document.documentElement.style.setProperty('--radio-blackout-dial-size-desktop', radioDialSizeDesktop);
    document.documentElement.style.setProperty('--radio-blackout-dial-size-mobile', radioDialSizeMobile);
    document.documentElement.style.setProperty('--radio-blackout-dial-size', radioDialSize);

    document.documentElement.style.setProperty('--radio-blackout-offset-x-desktop', RADIO_BLACKOUT_OFFSET_X_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-offset-x-mobile', RADIO_BLACKOUT_OFFSET_X_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-offset-x', isMobile ? RADIO_BLACKOUT_OFFSET_X_MOBILE : RADIO_BLACKOUT_OFFSET_X_DESKTOP);

    document.documentElement.style.setProperty('--radio-blackout-offset-y-desktop', RADIO_BLACKOUT_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-offset-y-mobile', RADIO_BLACKOUT_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-offset-y', isMobile ? RADIO_BLACKOUT_OFFSET_Y_MOBILE : RADIO_BLACKOUT_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--radio-blackout-start-angle', `${RADIO_BLACKOUT_START_ANGLE_DEG}deg`);
    document.documentElement.style.setProperty('--radio-blackout-track-color', RADIO_BLACKOUT_TRACK_COLOR);
    document.documentElement.style.setProperty('--radio-blackout-track-stroke-width', String(isMobile ? RADIO_BLACKOUT_TRACK_STROKE_WIDTH_MOBILE : RADIO_BLACKOUT_TRACK_STROKE_WIDTH_DESKTOP));
    document.documentElement.style.setProperty('--radio-blackout-progress-stroke-width', String(isMobile ? RADIO_BLACKOUT_PROGRESS_STROKE_WIDTH_MOBILE : RADIO_BLACKOUT_PROGRESS_STROKE_WIDTH_DESKTOP));
    document.documentElement.style.setProperty('--radio-blackout-stroke-linecap', RADIO_BLACKOUT_STROKE_LINECAP);
    document.documentElement.style.setProperty('--radio-blackout-anim-duration', `${RADIO_BLACKOUT_ANIM_DURATION_S}s`);

    document.documentElement.style.setProperty('--radio-blackout-dial-bg-color', RADIO_BLACKOUT_DIAL_BG_COLOR);
    document.documentElement.style.setProperty('--radio-blackout-dial-inner-shadow', RADIO_BLACKOUT_DIAL_INNER_SHADOW);

    document.documentElement.style.setProperty('--radio-blackout-content-offset-y-desktop', RADIO_BLACKOUT_CONTENT_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-content-offset-y-mobile', RADIO_BLACKOUT_CONTENT_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-content-offset-y', isMobile ? RADIO_BLACKOUT_CONTENT_OFFSET_Y_MOBILE : RADIO_BLACKOUT_CONTENT_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--radio-blackout-label-font-family', RADIO_BLACKOUT_LABEL_FONT_FAMILY);
    document.documentElement.style.setProperty('--radio-blackout-label-font-size-desktop', RADIO_BLACKOUT_LABEL_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-label-font-size-mobile', RADIO_BLACKOUT_LABEL_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-label-font-size', isMobile ? RADIO_BLACKOUT_LABEL_FONT_SIZE_MOBILE : RADIO_BLACKOUT_LABEL_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-label-line-height', String(RADIO_BLACKOUT_LABEL_LINE_HEIGHT));
    document.documentElement.style.setProperty('--radio-blackout-label-letter-spacing-desktop', RADIO_BLACKOUT_LABEL_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-label-letter-spacing-mobile', RADIO_BLACKOUT_LABEL_LETTER_SPACING_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-label-letter-spacing', isMobile ? RADIO_BLACKOUT_LABEL_LETTER_SPACING_MOBILE : RADIO_BLACKOUT_LABEL_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-label-offset-y-desktop', RADIO_BLACKOUT_LABEL_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-label-offset-y-mobile', RADIO_BLACKOUT_LABEL_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-label-offset-y', isMobile ? RADIO_BLACKOUT_LABEL_OFFSET_Y_MOBILE : RADIO_BLACKOUT_LABEL_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--radio-blackout-gap-label-to-class-desktop', RADIO_BLACKOUT_GAP_LABEL_TO_CLASS_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-gap-label-to-class-mobile', RADIO_BLACKOUT_GAP_LABEL_TO_CLASS_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-gap-label-to-class', isMobile ? RADIO_BLACKOUT_GAP_LABEL_TO_CLASS_MOBILE : RADIO_BLACKOUT_GAP_LABEL_TO_CLASS_DESKTOP);

    document.documentElement.style.setProperty('--radio-blackout-class-font-family', RADIO_BLACKOUT_CLASS_FONT_FAMILY);
    document.documentElement.style.setProperty('--radio-blackout-class-font-size-desktop', RADIO_BLACKOUT_CLASS_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-class-font-size-mobile', RADIO_BLACKOUT_CLASS_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-class-font-size', isMobile ? RADIO_BLACKOUT_CLASS_FONT_SIZE_MOBILE : RADIO_BLACKOUT_CLASS_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-class-line-height', String(RADIO_BLACKOUT_CLASS_LINE_HEIGHT));
    document.documentElement.style.setProperty('--radio-blackout-class-offset-y-desktop', RADIO_BLACKOUT_CLASS_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-class-offset-y-mobile', RADIO_BLACKOUT_CLASS_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-class-offset-y', isMobile ? RADIO_BLACKOUT_CLASS_OFFSET_Y_MOBILE : RADIO_BLACKOUT_CLASS_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--radio-blackout-gap-class-to-value-desktop', RADIO_BLACKOUT_GAP_CLASS_TO_VALUE_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-gap-class-to-value-mobile', RADIO_BLACKOUT_GAP_CLASS_TO_VALUE_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-gap-class-to-value', isMobile ? RADIO_BLACKOUT_GAP_CLASS_TO_VALUE_MOBILE : RADIO_BLACKOUT_GAP_CLASS_TO_VALUE_DESKTOP);

    document.documentElement.style.setProperty('--radio-blackout-value-font-family', RADIO_BLACKOUT_VALUE_FONT_FAMILY);
    document.documentElement.style.setProperty('--radio-blackout-value-font-size-desktop', RADIO_BLACKOUT_VALUE_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-value-font-size-mobile', RADIO_BLACKOUT_VALUE_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-value-font-size', isMobile ? RADIO_BLACKOUT_VALUE_FONT_SIZE_MOBILE : RADIO_BLACKOUT_VALUE_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-value-line-height', String(RADIO_BLACKOUT_VALUE_LINE_HEIGHT));
    document.documentElement.style.setProperty('--radio-blackout-value-letter-spacing-desktop', RADIO_BLACKOUT_VALUE_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-value-letter-spacing-mobile', RADIO_BLACKOUT_VALUE_LETTER_SPACING_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-value-letter-spacing', isMobile ? RADIO_BLACKOUT_VALUE_LETTER_SPACING_MOBILE : RADIO_BLACKOUT_VALUE_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-value-offset-y-desktop', RADIO_BLACKOUT_VALUE_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-value-offset-y-mobile', RADIO_BLACKOUT_VALUE_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-value-offset-y', isMobile ? RADIO_BLACKOUT_VALUE_OFFSET_Y_MOBILE : RADIO_BLACKOUT_VALUE_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--radio-blackout-sublabel-font-family', RADIO_BLACKOUT_SUBLABEL_FONT_FAMILY);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-font-size-desktop', RADIO_BLACKOUT_SUBLABEL_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-font-size-mobile', RADIO_BLACKOUT_SUBLABEL_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-font-size', isMobile ? RADIO_BLACKOUT_SUBLABEL_FONT_SIZE_MOBILE : RADIO_BLACKOUT_SUBLABEL_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-line-height', String(RADIO_BLACKOUT_SUBLABEL_LINE_HEIGHT));
    document.documentElement.style.setProperty('--radio-blackout-sublabel-letter-spacing-desktop', RADIO_BLACKOUT_SUBLABEL_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-letter-spacing-mobile', RADIO_BLACKOUT_SUBLABEL_LETTER_SPACING_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-letter-spacing', isMobile ? RADIO_BLACKOUT_SUBLABEL_LETTER_SPACING_MOBILE : RADIO_BLACKOUT_SUBLABEL_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-margin-top-desktop', RADIO_BLACKOUT_SUBLABEL_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-margin-top-mobile', RADIO_BLACKOUT_SUBLABEL_MARGIN_TOP_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-margin-top', isMobile ? RADIO_BLACKOUT_SUBLABEL_MARGIN_TOP_MOBILE : RADIO_BLACKOUT_SUBLABEL_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-offset-y-desktop', RADIO_BLACKOUT_SUBLABEL_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-offset-y-mobile', RADIO_BLACKOUT_SUBLABEL_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--radio-blackout-sublabel-offset-y', isMobile ? RADIO_BLACKOUT_SUBLABEL_OFFSET_Y_MOBILE : RADIO_BLACKOUT_SUBLABEL_OFFSET_Y_DESKTOP);

    if (typeof updateRadioBlackoutDial === 'function') {
      updateRadioBlackoutDial();
    }

    // Common margins & settings
    document.documentElement.style.setProperty('--sun-image-margin-top-desktop', SUN_IMAGE_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--sun-image-margin-top-mobile', SUN_IMAGE_MARGIN_TOP_MOBILE);
    document.documentElement.style.setProperty('--sun-image-margin-top', isMobile ? SUN_IMAGE_MARGIN_TOP_MOBILE : SUN_IMAGE_MARGIN_TOP_DESKTOP);

    document.documentElement.style.setProperty('--sun-image-margin-bottom-desktop', SUN_IMAGE_MARGIN_BOTTOM_DESKTOP);
    document.documentElement.style.setProperty('--sun-image-margin-bottom-mobile', SUN_IMAGE_MARGIN_BOTTOM_MOBILE);
    document.documentElement.style.setProperty('--sun-image-margin-bottom', isMobile ? SUN_IMAGE_MARGIN_BOTTOM_MOBILE : SUN_IMAGE_MARGIN_BOTTOM_DESKTOP);

    document.documentElement.style.setProperty('--sun-image-offset-y-desktop', SUN_IMAGE_OFFSET_Y_DESKTOP);
    document.documentElement.style.setProperty('--sun-image-offset-y-mobile', SUN_IMAGE_OFFSET_Y_MOBILE);
    document.documentElement.style.setProperty('--sun-image-offset-y', isMobile ? SUN_IMAGE_OFFSET_Y_MOBILE : SUN_IMAGE_OFFSET_Y_DESKTOP);

    document.documentElement.style.setProperty('--sun-image-offset-x-desktop', SUN_IMAGE_OFFSET_X_DESKTOP);
    document.documentElement.style.setProperty('--sun-image-offset-x-mobile', SUN_IMAGE_OFFSET_X_MOBILE);
    document.documentElement.style.setProperty('--sun-image-offset-x', isMobile ? SUN_IMAGE_OFFSET_X_MOBILE : SUN_IMAGE_OFFSET_X_DESKTOP);

    document.documentElement.style.setProperty('--sun-mask-radius-desktop', SUN_MASK_RADIUS_DESKTOP);
    document.documentElement.style.setProperty('--sun-mask-radius-mobile', SUN_MASK_RADIUS_MOBILE);
    document.documentElement.style.setProperty('--sun-mask-radius', isMobile ? SUN_MASK_RADIUS_MOBILE : SUN_MASK_RADIUS_DESKTOP);

    document.documentElement.style.setProperty('--sun-mask-position-y-desktop', SUN_MASK_POSITION_Y_DESKTOP);
    document.documentElement.style.setProperty('--sun-mask-position-y-mobile', SUN_MASK_POSITION_Y_MOBILE);
    document.documentElement.style.setProperty('--sun-mask-position-y', isMobile ? SUN_MASK_POSITION_Y_MOBILE : SUN_MASK_POSITION_Y_DESKTOP);

    document.documentElement.style.setProperty('--sun-image-opacity-desktop', String(SUN_IMAGE_OPACITY_DESKTOP));
    document.documentElement.style.setProperty('--sun-image-opacity-mobile', String(SUN_IMAGE_OPACITY_MOBILE));
    document.documentElement.style.setProperty('--sun-image-opacity', String(isMobile ? SUN_IMAGE_OPACITY_MOBILE : SUN_IMAGE_OPACITY_DESKTOP));

    document.documentElement.style.setProperty('--sun-image-blend-mode-desktop', SUN_IMAGE_BLEND_MODE_DESKTOP);
    document.documentElement.style.setProperty('--sun-image-blend-mode-mobile', SUN_IMAGE_BLEND_MODE_MOBILE);
    document.documentElement.style.setProperty('--sun-image-blend-mode', isMobile ? SUN_IMAGE_BLEND_MODE_MOBILE : SUN_IMAGE_BLEND_MODE_DESKTOP);

    document.documentElement.style.setProperty('--sun-label-font-size-desktop', SUN_LABEL_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--sun-label-font-size-mobile', SUN_LABEL_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--sun-label-font-size', isMobile ? SUN_LABEL_FONT_SIZE_MOBILE : SUN_LABEL_FONT_SIZE_DESKTOP);

    document.documentElement.style.setProperty('--sun-label-margin-top-desktop', SUN_LABEL_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--sun-label-margin-top-mobile', SUN_LABEL_MARGIN_TOP_MOBILE);
    document.documentElement.style.setProperty('--sun-label-margin-top', isMobile ? SUN_LABEL_MARGIN_TOP_MOBILE : SUN_LABEL_MARGIN_TOP_DESKTOP);

    const isEarthLabelMarginAutoDesktop = !EARTH_LABEL_MARGIN_TOP_DESKTOP || EARTH_LABEL_MARGIN_TOP_DESKTOP === 'auto';
    const isEarthLabelMarginAutoMobile = !EARTH_LABEL_MARGIN_TOP_MOBILE || EARTH_LABEL_MARGIN_TOP_MOBILE === 'auto';
    const earthLabelMarginDesktop = isEarthLabelMarginAutoDesktop
      ? 'calc(((var(--sun-image-width-desktop) - var(--earth-image-width-desktop)) / 2) + var(--sun-label-margin-top-desktop))'
      : EARTH_LABEL_MARGIN_TOP_DESKTOP;
    const earthLabelMarginMobile = isEarthLabelMarginAutoMobile
      ? 'calc(((var(--sun-image-width-mobile) - var(--earth-image-width-mobile)) / 2) + var(--sun-label-margin-top-mobile))'
      : EARTH_LABEL_MARGIN_TOP_MOBILE;
    const earthLabelMarginActive = isMobile ? earthLabelMarginMobile : earthLabelMarginDesktop;

    document.documentElement.style.setProperty('--earth-label-margin-top-desktop', earthLabelMarginDesktop);
    document.documentElement.style.setProperty('--earth-label-margin-top-mobile', earthLabelMarginMobile);
    document.documentElement.style.setProperty('--earth-label-margin-top', earthLabelMarginActive);

    document.documentElement.style.setProperty('--sun-label-letter-spacing-desktop', SUN_LABEL_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--sun-label-letter-spacing-mobile', SUN_LABEL_LETTER_SPACING_MOBILE);
    document.documentElement.style.setProperty('--sun-label-letter-spacing', isMobile ? SUN_LABEL_LETTER_SPACING_MOBILE : SUN_LABEL_LETTER_SPACING_DESKTOP);

    document.documentElement.style.setProperty('--sun-label-offset-x-desktop', SUN_LABEL_OFFSET_X_DESKTOP);
    document.documentElement.style.setProperty('--sun-label-offset-x-mobile', SUN_LABEL_OFFSET_X_MOBILE);
    document.documentElement.style.setProperty('--sun-label-offset-x', isMobile ? SUN_LABEL_OFFSET_X_MOBILE : SUN_LABEL_OFFSET_X_DESKTOP);

    document.documentElement.style.setProperty('--sun-label-left-offset-x-desktop', SUN_LABEL_LEFT_OFFSET_X_DESKTOP);
    document.documentElement.style.setProperty('--sun-label-left-offset-x-mobile', SUN_LABEL_LEFT_OFFSET_X_MOBILE);
    document.documentElement.style.setProperty('--sun-label-left-offset-x', isMobile ? SUN_LABEL_LEFT_OFFSET_X_MOBILE : SUN_LABEL_LEFT_OFFSET_X_DESKTOP);

    document.documentElement.style.setProperty('--sun-label-right-offset-x-desktop', SUN_LABEL_RIGHT_OFFSET_X_DESKTOP);
    document.documentElement.style.setProperty('--sun-label-right-offset-x-mobile', SUN_LABEL_RIGHT_OFFSET_X_MOBILE);
    document.documentElement.style.setProperty('--sun-label-right-offset-x', isMobile ? SUN_LABEL_RIGHT_OFFSET_X_MOBILE : SUN_LABEL_RIGHT_OFFSET_X_DESKTOP);

    document.documentElement.style.setProperty('--sun-label-font-family', SUN_LABEL_FONT_FAMILY);
    document.documentElement.style.setProperty('--sun-label-color', SUN_LABEL_COLOR);
    document.documentElement.style.setProperty('--sun-label-opacity', SUN_LABEL_OPACITY);
    document.documentElement.style.setProperty('--sun-label-text-transform', SUN_LABEL_TEXT_TRANSFORM);

    document.documentElement.style.setProperty('--sun-animation-fps-desktop', String(SUN_ANIMATION_FPS_DESKTOP));
    document.documentElement.style.setProperty('--sun-animation-fps-mobile', String(SUN_ANIMATION_FPS_MOBILE));
    document.documentElement.style.setProperty('--sun-animation-fps', String(isMobile ? SUN_ANIMATION_FPS_MOBILE : SUN_ANIMATION_FPS_DESKTOP));

    document.documentElement.style.setProperty('--sun-animation-crossfade-duration-desktop', `${SUN_ANIMATION_CROSSFADE_MS_DESKTOP}ms`);
    document.documentElement.style.setProperty('--sun-animation-crossfade-duration-mobile', `${SUN_ANIMATION_CROSSFADE_MS_MOBILE}ms`);
    document.documentElement.style.setProperty('--sun-animation-crossfade-duration', `${isMobile ? SUN_ANIMATION_CROSSFADE_MS_MOBILE : SUN_ANIMATION_CROSSFADE_MS_DESKTOP}ms`);

    document.documentElement.style.setProperty('--sun-sizzle-crossfade-duration-desktop', `${SUN_SIZZLE_CROSSFADE_MS_DESKTOP}ms`);
    document.documentElement.style.setProperty('--sun-sizzle-crossfade-duration-mobile', `${SUN_SIZZLE_CROSSFADE_MS_MOBILE}ms`);
    document.documentElement.style.setProperty('--sun-sizzle-crossfade-duration', `${isMobile ? SUN_SIZZLE_CROSSFADE_MS_MOBILE : SUN_SIZZLE_CROSSFADE_MS_DESKTOP}ms`);

    document.documentElement.style.setProperty('--sun-animation-ease-enabled', SUN_ANIMATION_EASE_ENABLED ? '1' : '0');
    document.documentElement.style.setProperty('--sun-animation-ease-frames-desktop', String(SUN_ANIMATION_EASE_FRAMES_DESKTOP));
    document.documentElement.style.setProperty('--sun-animation-ease-frames-mobile', String(SUN_ANIMATION_EASE_FRAMES_MOBILE));
    document.documentElement.style.setProperty('--sun-animation-ease-frames', String(isMobile ? SUN_ANIMATION_EASE_FRAMES_MOBILE : SUN_ANIMATION_EASE_FRAMES_DESKTOP));
    document.documentElement.style.setProperty('--sun-animation-ease-max-delay-desktop', `${SUN_ANIMATION_EASE_MAX_DELAY_MS_DESKTOP}ms`);
    document.documentElement.style.setProperty('--sun-animation-ease-max-delay-mobile', `${SUN_ANIMATION_EASE_MAX_DELAY_MS_MOBILE}ms`);
    document.documentElement.style.setProperty('--sun-animation-ease-max-delay', `${isMobile ? SUN_ANIMATION_EASE_MAX_DELAY_MS_MOBILE : SUN_ANIMATION_EASE_MAX_DELAY_MS_DESKTOP}ms`);

    document.documentElement.style.setProperty('--sun-animation-days', String(SUN_ANIMATION_DAYS));
    document.documentElement.style.setProperty('--sun-sizzle-fps-desktop', String(SUN_SIZZLE_FPS_DESKTOP));
    document.documentElement.style.setProperty('--sun-sizzle-fps-mobile', String(SUN_SIZZLE_FPS_MOBILE));
    document.documentElement.style.setProperty('--sun-sizzle-fps', String(isMobile ? SUN_SIZZLE_FPS_MOBILE : SUN_SIZZLE_FPS_DESKTOP));
    document.documentElement.style.setProperty('--sun-sizzle-frame-count', String(SUN_SIZZLE_FRAME_COUNT));
    document.documentElement.style.setProperty('--sun-sizzle-frame-step', String(SUN_SIZZLE_FRAME_STEP));
    document.documentElement.style.setProperty('--sun-sizzle-fetch-length', String(SUN_SIZZLE_FETCH_LENGTH));
  }

  // Initialize World Clocks, Earth Image, and Celestial Duo configurations in proper dependency order
  applyWorldClocksConfig();
  applyEarthImageConfig();
  applySunImageConfig();

  window.addEventListener('resize', () => {
    applyWorldClocksConfig();
    applyEarthImageConfig();
    applySunImageConfig();
  });

  // --- EDITABLE: Location Switcher Config (Positioned above Weather Last Updated) ---
  const LOCATION_SWITCHER_CONFIG = [
    { name: 'Tulsa', lat: 36.10336, lon: -95.92734 },
    { name: 'Traverse City', lat: 44.76306, lon: -85.62063 }
    // Future locations can easily be added here
  ];

  const LOCATION_GROUP_MARGIN_TOP = '2vw';        // EDITABLE: Top offset pushing the Location group down below grid/earth
  const LOCATION_GROUP_MARGIN_BOTTOM = '2vw';     // EDITABLE: Space below the Location group (above Weather Last Updated)
  const LOCATION_ITEM_MARGIN_TOP = '-2vw';       // EDITABLE: Space above each individual city entry
  const LOCATION_ITEM_MARGIN_BOTTOM = '0.5vw';    // EDITABLE: Space below each individual city entry
  const LOCATION_TYPESIZE = '5vw';                // EDITABLE: Font size (matches top city word size)
  const LOCATION_LETTER_SPACING = '-0.05vw';      // EDITABLE: Kerning / letter spacing (matches top city word)
  const LOCATION_FONT_FAMILY = "'light', sans-serif"; // EDITABLE: Font family / style (matches top city word)
  const LOCATION_ACTIVE_COLOR = '#ffffff';        // EDITABLE: Color for currently selected active location
  const LOCATION_ACTIVE_OPACITY = '1.0';          // EDITABLE: Opacity for active location
  const LOCATION_INACTIVE_COLOR = 'rgba(255, 255, 255, 0.45)'; // EDITABLE: Color for inactive location
  const LOCATION_INACTIVE_OPACITY = '0.45';      // EDITABLE: Opacity for inactive location
  const LOCATION_HOVER_OPACITY = '0.85';         // EDITABLE: Hover opacity for inactive locations

  const LAST_UPDATED_MARGIN_TOP = LOCATION_GROUP_MARGIN_BOTTOM; // EDITABLE: Top offset pushing App Last Updated note below location switcher

  // ==========================================
  // --- EDITABLE: Passive Versioning Config (JCV) ---
  // ==========================================
  const VERSION_NUMBER = '1202';                  // EDITABLE: Auto-incremented on dist build by passive-versioning plugin
  const VERSION_PREFIX = 'Version ';              // EDITABLE: Prefix text before number (e.g. 'Version ' for 'Version 1000')

  // Keep browser tab title synchronized with the current app version
  if (typeof document !== 'undefined') {
    document.title = `Weather ${VERSION_NUMBER}`;
  }

  // Font style & size (default style/size of "Tulsa" / "Traverse City", which is 5vw)
  const VERSION_FONT_SIZE_DESKTOP = '5vw';         // EDITABLE Desktop: Font size (matches Tulsa/Traverse City 5vw)
  const VERSION_FONT_SIZE_MOBILE  = '5vw';         // EDITABLE Mobile: Font size
  const VERSION_FONT_FAMILY       = "'light', sans-serif"; // EDITABLE: Font family (matches Tulsa/Traverse City)
  const VERSION_LETTER_SPACING_DESKTOP = '-0.05vw';// EDITABLE Desktop: Kerning / letter spacing (matches Tulsa/Traverse City)
  const VERSION_LETTER_SPACING_MOBILE  = '-0.05vw';// EDITABLE Mobile: Kerning / letter spacing

  // Space above and below (JCV editable attributes)
  const VERSION_MARGIN_TOP_DESKTOP    = '0vw';   // EDITABLE Desktop: Space ABOVE version (gap below F/C row)
  const VERSION_MARGIN_TOP_MOBILE     = '1vw';     // EDITABLE Mobile: Space ABOVE version
  const VERSION_MARGIN_BOTTOM_DESKTOP = '1.5vw';   // EDITABLE Desktop: Space BELOW version (gap above Weather last updated)
  const VERSION_MARGIN_BOTTOM_MOBILE  = '2vw';     // EDITABLE Mobile: Space BELOW version

  // Color & Opacity (uses current temperature color by default)
  const VERSION_COLOR_OVERRIDE = '';               // EDITABLE: Custom color override (leave '' to use current temperature color)
  const VERSION_OPACITY        = '1.0';            // EDITABLE: Opacity

  // Store the current temperature for use by countdown updates
  let currentTempForDots = null;

  function initDotsCountdown(currentTemp) {
    // Store temperature for use by countdown updates
    if (typeof currentTemp === 'number' && !Number.isNaN(currentTemp)) {
      currentTempForDots = currentTemp;
    }
    
    // Add styles for the pulse animation if not already present
    if (!document.getElementById('refresh-dots-style')) {
      const style = document.createElement('style');
      style.id = 'refresh-dots-style';
      style.textContent = `
        @keyframes refresh-dot-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.6); opacity: 0.6; }
        }
        .refresh-dot.pulsing {
          animation: refresh-dot-pulse 1s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }

    let container = document.getElementById('refresh-spacer-container');
    const colors = getDotsColors(currentTemp);
    
    // Hot-reload fix: if DOTS_COUNT is changed, clear out the old dots so they instantly rebuild!
    const currentDots = container ? container.querySelectorAll('.refresh-dot').length : 0;
    if (container && currentDots !== DOTS_COUNT) {
      container.querySelectorAll('.refresh-dot').forEach(d => d.remove());
    }

    if (!container) {
      container = document.createElement('div');
      container.id = 'refresh-spacer-container';
      container.style.display = 'flex';
      container.style.justifyContent = 'flex-start';  // Align left to make room on the right
      container.style.paddingLeft = '0.2vw'; // Keep left edge perfectly aligned with sun/moon rows below it
      container.style.boxSizing = 'border-box';
      container.style.alignItems = 'center';
      container.style.gap = DOT_GAP;
      container.style.margin = '3vw 0 2.75vw'; // Top and bottom spacing, 0 on sides
      container.style.flexWrap = 'nowrap';
    }

    // ALWAYS apply width to support live hot-reloading tweaks
    container.style.width = `calc(100vw - ${REFRESH_DOTS_RIGHT_GAP_VW}vw)`;
    container.style.position = 'relative'; // ALWAYS ensure it's relative to hold the buttons
    
    // Removed dot generation to hide the dot timer line
    
    // --- Append format buttons ---
    let btnContainer = document.getElementById('temp-format-buttons');
    if (!btnContainer) {
      btnContainer = document.createElement('div');
      btnContainer.id = 'temp-format-buttons';
      
      const btn1 = document.createElement('button');
      btn1.id = 'btn-format-fc';
      btn1.className = 'temp-btn active-mode'; // Default active mode
      
      const btn2 = document.createElement('button');
      btn2.id = 'btn-format-both';
      btn2.className = 'temp-btn';
      btn2.textContent = 'F&C';
      
      // Simple toggle logic for the mode colors
      btn1.addEventListener('click', () => {
        const wasActive = btn1.classList.contains('active-mode');
        btn1.classList.add('active-mode');
        btn2.classList.remove('active-mode');
        
        if (wasActive) {
          // Toggle between F and C if already active
          displayUnit = displayUnit === 'F' ? 'C' : 'F';
        } else {
          // Switching from F&C back to F/C defaults to F
          displayUnit = 'F';
        }
        
        if (lastWeatherData) {
          updateFields(lastWeatherData);
          updateHourlyForecast(lastWeatherData);
          updateOverlappingBarChart(lastWeatherData);
          updateDewpointDial(lastWeatherData);
          setTimeout(() => updateTempPointer(lastWeatherData), 50);
          setTimeout(() => updateTempPointer(lastWeatherData), 850);
          setTimeout(() => updateTempPointer(lastWeatherData), 1650);
        }
        if (window.Weather && window.Weather.refreshDotColors) {
          window.Weather.refreshDotColors();
        }
      });
      
      btn2.addEventListener('click', () => {
        if (displayUnit === 'BOTH') {
          displayUnit = 'F';
          btn2.classList.remove('active-mode');
          btn1.classList.add('active-mode');
        } else {
          displayUnit = 'BOTH';
          btn2.classList.add('active-mode');
          btn1.classList.remove('active-mode');
        }
        
        if (lastWeatherData) {
          updateFields(lastWeatherData);
          updateHourlyForecast(lastWeatherData);
          updateOverlappingBarChart(lastWeatherData);
          updateDewpointDial(lastWeatherData);
          setTimeout(() => updateTempPointer(lastWeatherData), 50);
          setTimeout(() => updateTempPointer(lastWeatherData), 850);
          setTimeout(() => updateTempPointer(lastWeatherData), 1650);
        }
        if (window.Weather && window.Weather.refreshDotColors) {
          window.Weather.refreshDotColors();
        }
      });
      
      btnContainer.appendChild(btn1);
      btnContainer.appendChild(btn2);
    }

    // Position/Append format buttons below location switcher in mainContainer
    const locSwitcher = document.getElementById('weather-location-switcher');
    const versionEl = document.getElementById('weather-version');
    const lastUpdatedEl = document.getElementById('weather-last-updated');
    const targetParent = document.querySelector('main.content') || document.querySelector('main') || document.body;
    
    if (locSwitcher && locSwitcher.parentNode === targetParent) {
      if (locSwitcher.nextSibling !== btnContainer) {
        targetParent.insertBefore(btnContainer, locSwitcher.nextSibling);
      }
    } else if (versionEl && versionEl.parentNode === targetParent) {
      targetParent.insertBefore(btnContainer, versionEl);
    } else if (lastUpdatedEl && lastUpdatedEl.parentNode === targetParent) {
      targetParent.insertBefore(btnContainer, lastUpdatedEl);
    } else {
      if (btnContainer.parentNode !== targetParent) {
        targetParent.appendChild(btnContainer);
      }
    }
    
    // Update Button Styles (for live hot-reloading)--
    btnContainer.style.position = 'relative';
    btnContainer.style.zIndex = '9999'; // FORCE ABOVE ALL OTHER OVERLAYS
    btnContainer.style.left = 'auto';
    btnContainer.style.top = 'auto';
    btnContainer.style.marginTop = '2vw';
    btnContainer.style.transform = 'none';
    btnContainer.style.display = 'flex';
    btnContainer.style.justifyContent = 'center';
    btnContainer.style.alignItems = 'center';
    btnContainer.style.gap = TEMP_BTN_GAP;
    btnContainer.style.width = '100%';
    btnContainer.style.paddingBottom = '0vw'; // Padding handled cleanly by version margin-top
    
    const btns = btnContainer.querySelectorAll('.temp-btn');
    if (btns.length >= 2) {
      if (!btns[0].id) btns[0].id = 'btn-format-fc';
      if (!btns[1].id) btns[1].id = 'btn-format-both';
    }

    btns.forEach(btn => {
      btn.style.backgroundColor = 'transparent'; // see through
      btn.style.border = 'none';
      btn.style.borderRadius = TEMP_BTN_BORDER_RADIUS;
      btn.style.fontSize = TEMP_BTN_FONT_SIZE;
      btn.style.fontFamily = TEMP_BTN_FONT_FAMILY;
      btn.style.padding = TEMP_BTN_PADDING;
      btn.style.cursor = 'pointer';
      btn.style.outline = 'none';
      btn.style.whiteSpace = 'nowrap';
    });
    
    const btnFC = btnContainer.querySelector('#btn-format-fc');
    if (btnFC) {
      if (btnFC.classList.contains('active-mode')) {
        if (displayUnit === 'F') {
          btnFC.innerHTML = `<span style="color: ${colors.active}; font-size: inherit; font-family: inherit;">F</span><span style="color: white; font-size: inherit; font-family: inherit;">/C</span>`;
        } else {
          btnFC.innerHTML = `<span style="color: white; font-size: inherit; font-family: inherit;">F/</span><span style="color: ${colors.active}; font-size: inherit; font-family: inherit;">C</span>`;
        }
      } else {
        btnFC.innerHTML = `<span style="color: white; font-size: inherit; font-family: inherit;">F/C</span>`;
      }
    }
    
    const btnBoth = btnContainer.querySelector('#btn-format-both');
    if (btnBoth) {
      const activeColor = btnBoth.classList.contains('active-mode') ? colors.active : 'white';
      btnBoth.innerHTML = `<span style="color: ${activeColor}; font-size: inherit; font-family: inherit;">F&C</span>`;
    }
    
    // Ensure it's placed right below the daily weather summary (if it exists),
    // otherwise below the duplicate line (or description line).
    const summaryEl = document.getElementById('daily-weather-summary');
    const dupEl = document.getElementById('weather-description-duplicate');
    const descEl = document.getElementById('weather-description');
    
    // We want dots to go AFTER the summary line, if it exists. Otherwise after the duplicate line (or description line).
    const targetEl = summaryEl || dupEl || descEl;
    if (targetEl && targetEl.parentNode && targetEl.nextSibling !== container) {
      targetEl.parentNode.insertBefore(container, targetEl.nextSibling);
    }
  }

  // Helper to robustly get the active and inactive dot colors based on the current temperature
  function getDotsColors(currentTemp) {
    let active = DOT_COLOR_ACTIVE;
    let inactive = DOT_COLOR_INACTIVE;
    
    let color = null;
    
    // 1. Use directly passed temperature (most reliable)
    if (typeof currentTemp === 'number' && !Number.isNaN(currentTemp)) {
      color = tempToColor(currentTemp);
      /* eslint-disable */console.log(...oo_oo(`2266558813_5129_6_5129_81_4`,'[Dots] Using passed temperature:', currentTemp, '°F →', color));
    }
    // 2. Try CSS variable (set when current temperature is displayed)
    else {
      const rootColor = document.documentElement.style.getPropertyValue('--temp-color');
      if (rootColor && rootColor.trim() !== '') {
        color = rootColor.trim();
        /* eslint-disable */console.log(...oo_oo(`2266558813_5136_8_5136_74_4`,'[Dots] Using --temp-color from CSS variable:', color));
      } else {
        // 3. Fallback to calculating from stored temperature
        try {
          const lastTempStr = localStorage.getItem('weather_last_temp_raw');
          if (lastTempStr !== null) {
            const temp = parseFloat(lastTempStr);
            if (!Number.isNaN(temp)) {
              color = tempToColor(temp);
              /* eslint-disable */console.log(...oo_oo(`2266558813_5145_14_5145_97_4`,'[Dots] Calculated color from localStorage temp:', temp, '°F →', color));
            }
          }
        } catch(e) {
          /* eslint-disable */console.log(...oo_oo(`2266558813_5149_10_5149_72_4`,'[Dots] Error reading temp from localStorage:', e));
        }
      }
    }
    
    if (color) {
      active = color;
      // Parse HSL to create matching inactive color with 15% opacity
      const parsed = parseHslString(color);
      if (parsed) {
        inactive = `hsla(${parsed[0]}, ${parsed[1]}%, ${parsed[2]}%, 0.15)`;
      }
    } else {
      /* eslint-disable */console.log(...oo_oo(`2266558813_5162_6_5162_79_4`,'[Dots] No temperature color found, using defaults:', active));
    }
    
    return { active, inactive };
  }

  // Create and insert the 8-cell clock grid container dynamically
  function updateClockGridRow(data) {
    const containerId = 'clock-grid-container';
    let container = document.getElementById(containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'clockGridContainer';
      
      for (let i = 0; i < 8; i++) {
        const item = document.createElement('div');
        item.className = `clockGridItem clockGridItem-${i}`;
        
        let innerHtml = '';
        if (i === 1) {
          // Cell #2: Moon phase circle area only (no SVG countdown circle)
          innerHtml = `
            <svg class="clock-timer-svg grid-moon-track-svg" viewBox="0 0 100 100" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
            </svg>
            <div class="moon-phase-display grid-moon-phase" role="img" aria-label="Moon Phase"></div>
          `;
        } else if (i === 2) {
          // Cell #3: Wind direction gauge with standard countdown circle track and progress, a wind hand matching clock style, and wind speed number centered
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="gust-grad-8" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="var(--temp-color)" stop-opacity="0.62" />
                  <stop offset="100%" stop-color="var(--temp-color)" stop-opacity="0" />
                </linearGradient>
              </defs>
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
              <circle class="gust-progress" cx="50" cy="50" r="46" fill="none" stroke="url(#gust-grad-8)" />
              <circle class="gust-dot" r="1.75" />
            </svg>
            <div class="clock-face">
              <div class="clock-hand clock-hand-wind-direction"></div>
              <div class="clock-center-dot"></div>
            </div>
            <div class="grid-wind-speed-text"></div>
          `;
        } else if (i === 3) {
          // Cell #4: Humidity display with starting at bottom (6 o'clock) 0% to 100% (clockwise)
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
            </svg>
            <div class="grid-humidity-text"></div>
          `;
        } else if (i === 4) {
          // Cell #5: Dew point (Td) display with starting at bottom (6 o'clock) 0 to 100 degrees (clockwise)
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
            </svg>
            <div class="grid-dewpoint-text"></div>
          `;
        } else if (i === 7) {
          // Cell #8: Barometric pressure display with radius 46 matching standard clock circles
          innerHtml = `
            <div class="barometric-pressure-display grid-barometric-pressure">
              <svg class="barometric-gauge-svg" viewBox="0 0 100 100">
                <circle class="barometric-track" cx="50" cy="50" r="46" fill="none" />
                <circle class="barometric-fill" cx="50" cy="50" r="46" fill="none" />
                <line class="barometric-needle" x1="50" y1="50" x2="50" y2="15" stroke-linecap="round" />
              </svg>
              <div class="barometric-text"></div>
            </div>
          `;
        } else if (i === 5) {
          // Cell #6: Sun dial showing daytime period
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
              <circle class="celestial-dot" cx="50" cy="4" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
            </svg>
            <div class="grid-sun-text"></div>
          `;
        } else if (i === 6) {
          // Cell #7: Moon dial showing moonrise period
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
              <circle class="celestial-dot" cx="50" cy="4" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
            </svg>
            <div class="grid-moon-text"></div>
          `;
        } else {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
            </svg>
          `;
          
          // Duplicate the main clock face (hands and center dot) in the first cell on the left
          if (i === 0) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', handleTimeDialReset);
            innerHtml += `
              <div class="clock-face">
                <div class="clock-hour-hand"></div>
                <div class="clock-minute-hand"></div>
                <div class="clock-second-hand"></div>
                <div class="clock-center-dot"></div>
              </div>
            `;
          }
        }
        
        item.innerHTML = innerHtml;
        container.appendChild(item);
      }
      
      // Insert right below the refresh spacer container
      const refreshSpacer = document.getElementById('refresh-spacer-container');
      if (refreshSpacer && refreshSpacer.parentNode) {
        refreshSpacer.parentNode.insertBefore(container, refreshSpacer.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(container);
      }

      // Add labels container right after the clock grid
      const labelsContainerId = 'clock-grid-labels-container';
      let labelsContainer = document.getElementById(labelsContainerId);
      if (!labelsContainer) {
        labelsContainer = document.createElement('div');
        labelsContainer.id = labelsContainerId;
        labelsContainer.className = 'clockGridLabelsContainer';

        for (let i = 0; i < 8; i++) {
          const item = document.createElement('div');
          item.className = `clockGridLabel clockGridLabel-${i}`;
          // Extract active tempColor if data available
          if (data && data.current && typeof data.current.temp === 'number') {
             const tempColorLocal = tempToColor(data.current.temp);
             if(tempColorLocal) {
                item.style.color = tempColorLocal;
             }
          }
          
          let titleText = CLOCK_GRID_LABELS[i] || '';
          
          // If this is the "PHASE" dial (index 1), replace the title with the moon phase name
          if (i === 1 && data && data.daily && data.daily[0] && typeof data.daily[0].moon_phase === 'number') {
             titleText = getMoonPhaseName(data.daily[0].moon_phase);
          }
          
          // If this is the "WIND" dial (index 2), replace the title with "Gust [X] mph" or base wind speed
          if (i === 2 && data && data.current) {
             const windSpeed = data.current.wind_speed || 0;
             const rawWindGust = data.current.wind_gust || windSpeed;
             if (rawWindGust - windSpeed >= 5) {
                titleText = `${Math.round(rawWindGust)} mph Gusts`;
             } else {
                titleText = `${Math.round(windSpeed)} mph`;
             }
          }
          
          // If this is the "SUN" dial (index 5), show the OPPOSITE event of what's inside the dial
          if (i === 5 && data && data.daily && data.daily[0]) {
             const now = Date.now() / 1000;
             const sunrise = data.daily[0].sunrise;
             const sunset = data.daily[0].sunset;
             let oppEventTime = null;
             let oppEventLabel = '';
             
             if (typeof sunrise === 'number' && typeof sunset === 'number') {
                if (now < sunrise) {
                   oppEventTime = sunset;
                   oppEventLabel = 'Sunset';
                } else if (now < sunset) {
                   oppEventTime = data.daily[1]?.sunrise || (sunrise + 86400);
                   oppEventLabel = 'Sunrise';
                } else {
                   oppEventTime = data.daily[1]?.sunset || (sunset + 86400);
                   oppEventLabel = 'Sunset';
                }
                
                const oppDate = new Date(oppEventTime * 1000);
                let oppHours = oppDate.getHours();
                const oppMinutes = oppDate.getMinutes();
                const oppAmPm = oppHours >= 12 ? 'p' : 'a';
                oppHours = oppHours % 12 || 12;
                const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
                
                titleText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
             }
          }
          
          // If this is the "MOON" dial (index 6, cell #7), show the OPPOSITE event of what's inside the dial
          if (i === 6 && data && data.daily && data.daily[0]) {
             const now = Date.now() / 1000;
             const moonrise = data.daily[0].moonrise;
             const moonset = data.daily[0].moonset;
             let oppEventTime = null;
             let oppEventLabel = '';
             
             if (typeof moonrise === 'number' && typeof moonset === 'number') {
                if (moonrise < moonset) {
                   if (now < moonrise) {
                      oppEventTime = moonset;
                      oppEventLabel = 'Moonset';
                   } else if (now < moonset) {
                      oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                      oppEventLabel = 'Moonrise';
                   } else {
                      oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                      oppEventLabel = 'Moonset';
                   }
                } else {
                   if (now < moonset) {
                      oppEventTime = moonrise;
                      oppEventLabel = 'Moonrise';
                   } else if (now < moonrise) {
                      oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                      oppEventLabel = 'Moonset';
                   } else {
                      oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                      oppEventLabel = 'Moonrise';
                   }
                }
                
                const oppDate = new Date(oppEventTime * 1000);
                let oppHours = oppDate.getHours();
                const oppMinutes = oppDate.getMinutes();
                const oppAmPm = oppHours >= 12 ? 'p' : 'a';
                oppHours = oppHours % 12 || 12;
                const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
                
                titleText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
             }
          }
          
          item.innerHTML = `
            <span class="label-title label-title-${i}" id="clock-grid-val-${i}">${titleText}</span>
          `;
          labelsContainer.appendChild(item);
        }

        container.parentNode.insertBefore(labelsContainer, container.nextSibling);
      } else {
        // If container already exists but we're re-running this loop, update the colors directly
        if (data && data.current && typeof data.current.temp === 'number') {
          const tempColorLocal = tempToColor(data.current.temp);
          if(tempColorLocal) {
            const labels = labelsContainer.querySelectorAll('.clockGridLabel');
            labels.forEach(label => label.style.color = tempColorLocal);
          }
        }
        
        // Also update the phase text in case it changed overnight
        const phaseTitle = labelsContainer.querySelector('.label-title-1');
        if (phaseTitle && data && data.daily && data.daily[0] && typeof data.daily[0].moon_phase === 'number') {
           phaseTitle.innerText = getMoonPhaseName(data.daily[0].moon_phase);
        }
        
        // Also update the wind gust text live
        const windTitle = labelsContainer.querySelector('.label-title-2');
        if (windTitle && data && data.current) {
           const windSpeed = data.current.wind_speed || 0;
           const rawWindGust = data.current.wind_gust || windSpeed;
           if (rawWindGust - windSpeed >= 5) {
              windTitle.innerText = `${Math.round(rawWindGust)} mph Gusts`;
           } else {
              windTitle.innerText = `${Math.round(windSpeed)} mph`;
           }
        }
        
        // Also update the sun opposite event text live
        const sunTitle = labelsContainer.querySelector('.label-title-5');
        if (sunTitle && data && data.daily && data.daily[0]) {
           const now = Date.now() / 1000;
           const sunrise = data.daily[0].sunrise;
           const sunset = data.daily[0].sunset;
           
           if (typeof sunrise === 'number' && typeof sunset === 'number') {
              let oppEventTime = null;
              let oppEventLabel = '';
              
              if (now < sunrise) {
                 oppEventTime = sunset;
                 oppEventLabel = 'Sunset';
              } else if (now < sunset) {
                 oppEventTime = data.daily[1]?.sunrise || (sunrise + 86400);
                 oppEventLabel = 'Sunrise';
              } else {
                 oppEventTime = data.daily[1]?.sunset || (sunset + 86400);
                 oppEventLabel = 'Sunset';
              }
              
              const oppDate = new Date(oppEventTime * 1000);
              let oppHours = oppDate.getHours();
              const oppMinutes = oppDate.getMinutes();
              const oppAmPm = oppHours >= 12 ? 'p' : 'a';
              oppHours = oppHours % 12 || 12;
              const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
              
              sunTitle.innerText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
           }
        }
        
        // Also update the moon opposite event text live
        const moonTitle = labelsContainer.querySelector('.label-title-6');
        if (moonTitle && data && data.daily && data.daily[0]) {
           const now = Date.now() / 1000;
           const moonrise = data.daily[0].moonrise;
           const moonset = data.daily[0].moonset;
           
           if (typeof moonrise === 'number' && typeof moonset === 'number') {
              let oppEventTime = null;
              let oppEventLabel = '';
              
              if (moonrise < moonset) {
                 if (now < moonrise) {
                    oppEventTime = moonset;
                    oppEventLabel = 'Moonset';
                 } else if (now < moonset) {
                    oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                    oppEventLabel = 'Moonrise';
                 } else {
                    oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                    oppEventLabel = 'Moonset';
                 }
              } else {
                 if (now < moonset) {
                    oppEventTime = moonrise;
                    oppEventLabel = 'Moonrise';
                 } else if (now < moonrise) {
                    oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                    oppEventLabel = 'Moonset';
                 } else {
                    oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                    oppEventLabel = 'Moonrise';
                 }
              }
              
              const oppDate = new Date(oppEventTime * 1000);
              let oppHours = oppDate.getHours();
              const oppMinutes = oppDate.getMinutes();
              const oppAmPm = oppHours >= 12 ? 'p' : 'a';
              oppHours = oppHours % 12 || 12;
              const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
              
              moonTitle.innerText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
           }
        }
      }
    }

    // --- 7-cell grid layout & labels ---
    const indices7 = [0, 2, 7, 3, 5, 6, 1];
    const containerId7 = 'clock-grid-container-7';
    let container7 = document.getElementById(containerId7);

    if (!container7) {
      container7 = document.createElement('div');
      container7.id = containerId7;
      container7.className = 'clockGridContainer7';

      for (let j = 0; j < 7; j++) {
        const i = indices7[j];
        const item = document.createElement('div');
        item.className = `clockGridItem clockGridItem7 clockGridItem-${i} clockGridItem7-${j}`;

        let innerHtml = '';
        if (i === 1) {
          innerHtml = `
            <svg class="clock-timer-svg grid-moon-track-svg" viewBox="0 0 100 100" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
            </svg>
            <div class="moon-phase-display grid-moon-phase" role="img" aria-label="Moon Phase"></div>
          `;
        } else if (i === 2) {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="gust-grad-7" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="var(--temp-color)" stop-opacity="0.62" />
                  <stop offset="100%" stop-color="var(--temp-color)" stop-opacity="0" />
                </linearGradient>
              </defs>
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
              <circle class="gust-progress" cx="50" cy="50" r="46" fill="none" stroke="url(#gust-grad-7)" />
              <circle class="gust-dot" r="1.75" />
            </svg>
            <div class="clock-face">
              <div class="clock-hand clock-hand-wind-direction"></div>
              <div class="clock-center-dot"></div>
            </div>
            <div class="grid-wind-speed-text"></div>
          `;
        } else if (i === 3) {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
            </svg>
            <div class="grid-humidity-text"></div>
          `;
        } else if (i === 7) {
          innerHtml = `
            <div class="barometric-pressure-display grid-barometric-pressure">
              <svg class="barometric-gauge-svg" viewBox="0 0 100 100">
                <circle class="barometric-track" cx="50" cy="50" r="46" fill="none" />
                <circle class="barometric-fill" cx="50" cy="50" r="46" fill="none" />
                <line class="barometric-needle" x1="50" y1="50" x2="50" y2="15" stroke-linecap="round" />
              </svg>
              <div class="barometric-text"></div>
            </div>
          `;
        } else if (i === 5) {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
              <circle class="celestial-dot" cx="50" cy="4" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
            </svg>
            <div class="grid-sun-text"></div>
          `;
        } else if (i === 6) {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
              <circle class="celestial-dot" cx="50" cy="4" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
            </svg>
            <div class="grid-moon-text"></div>
          `;
        } else {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
            </svg>
          `;
          if (i === 0) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', handleTimeDialReset);
            innerHtml += `
              <div class="clock-face">
                <div class="clock-hour-hand"></div>
                <div class="clock-minute-hand"></div>
                <div class="clock-second-hand"></div>
                <div class="clock-center-dot"></div>
              </div>
            `;
          }
        }

        item.innerHTML = innerHtml;
        container7.appendChild(item);
      }

      const labelsContainer8 = document.getElementById('clock-grid-labels-container');
      if (labelsContainer8 && labelsContainer8.parentNode) {
        labelsContainer8.parentNode.insertBefore(container7, labelsContainer8.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(container7);
      }
    }

    const labelsContainerId7 = 'clock-grid-labels-container-7';
    let labelsContainer7 = document.getElementById(labelsContainerId7);
    if (!labelsContainer7) {
      labelsContainer7 = document.createElement('div');
      labelsContainer7.id = labelsContainerId7;
      labelsContainer7.className = 'clockGridLabelsContainer7';

      for (let j = 0; j < 7; j++) {
        const i = indices7[j];
        const item = document.createElement('div');
        item.className = `clockGridLabel clockGridLabel7 clockGridLabel7-${j}`;
        
        if (data && data.current && typeof data.current.temp === 'number') {
           const tempColorLocal = tempToColor(data.current.temp);
           if(tempColorLocal) {
              item.style.color = tempColorLocal;
           }
        }

        let titleText = CLOCK_GRID_LABELS[i] || '';

        if (i === 1 && data && data.daily && data.daily[0] && typeof data.daily[0].moon_phase === 'number') {
           titleText = getMoonPhaseName(data.daily[0].moon_phase);
        }
        
        if (i === 2 && data && data.current) {
           const windSpeed = data.current.wind_speed || 0;
           const rawWindGust = data.current.wind_gust || windSpeed;
           if (rawWindGust - windSpeed >= 5) {
              titleText = `${Math.round(rawWindGust)} mph Gusts`;
           } else {
              titleText = `${Math.round(windSpeed)} mph`;
           }
        }

        if (i === 3 && data && data.current && typeof data.current.dew_point === 'number') {
           const dewF = Math.round(data.current.dew_point);
           if (displayUnit === 'BOTH') {
              const dewC = Math.round((dewF - 32) * 5 / 9);
              titleText = `Dew Pt ${dewF}${formatSlash()}${dewC}°`;
           } else {
              const dewDisplay = displayUnit === 'C' ? Math.round((dewF - 32) * 5 / 9) : dewF;
              titleText = `Dew Pt ${dewDisplay}°`;
           }
        }
        
        if (i === 5 && data && data.daily && data.daily[0]) {
           const now = Date.now() / 1000;
           const sunrise = data.daily[0].sunrise;
           const sunset = data.daily[0].sunset;
           let oppEventTime = null;
           let oppEventLabel = '';
           
           if (typeof sunrise === 'number' && typeof sunset === 'number') {
              if (now < sunrise) {
                 oppEventTime = sunset;
                 oppEventLabel = 'Sunset';
              } else if (now < sunset) {
                 oppEventTime = data.daily[1]?.sunrise || (sunrise + 86400);
                 oppEventLabel = 'Sunrise';
              } else {
                 oppEventTime = data.daily[1]?.sunset || (sunset + 86400);
                 oppEventLabel = 'Sunset';
              }
              
              const oppDate = new Date(oppEventTime * 1000);
              let oppHours = oppDate.getHours();
              const oppMinutes = oppDate.getMinutes();
              const oppAmPm = oppHours >= 12 ? 'p' : 'a';
              oppHours = oppHours % 12 || 12;
              const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
              
              titleText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
           }
        }
        
        if (i === 6 && data && data.daily && data.daily[0]) {
           const now = Date.now() / 1000;
           const moonrise = data.daily[0].moonrise;
           const moonset = data.daily[0].moonset;
           let oppEventTime = null;
           let oppEventLabel = '';
           
           if (typeof moonrise === 'number' && typeof moonset === 'number') {
              if (moonrise < moonset) {
                 if (now < moonrise) {
                    oppEventTime = moonset;
                    oppEventLabel = 'Moonset';
                 } else if (now < moonset) {
                    oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                    oppEventLabel = 'Moonrise';
                 } else {
                    oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                    oppEventLabel = 'Moonset';
                 }
              } else {
                 if (now < moonset) {
                    oppEventTime = moonrise;
                    oppEventLabel = 'Moonrise';
                 } else if (now < moonrise) {
                    oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                    oppEventLabel = 'Moonset';
                 } else {
                    oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                    oppEventLabel = 'Moonrise';
                 }
              }
              
              const oppDate = new Date(oppEventTime * 1000);
              let oppHours = oppDate.getHours();
              const oppMinutes = oppDate.getMinutes();
              const oppAmPm = oppHours >= 12 ? 'p' : 'a';
              oppHours = oppHours % 12 || 12;
              const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
              
              titleText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
           }
        }

        item.innerHTML = `
          <span class="label-title label-title-${i}" id="clock-grid-val-7-${j}">${titleText}</span>
        `;
        labelsContainer7.appendChild(item);
      }

      container7.parentNode.insertBefore(labelsContainer7, container7.nextSibling);
    } else {
      if (data && data.current && typeof data.current.temp === 'number') {
        const tempColorLocal = tempToColor(data.current.temp);
        if (tempColorLocal) {
          const labels = labelsContainer7.querySelectorAll('.clockGridLabel7');
          labels.forEach(label => label.style.color = tempColorLocal);
        }
      }

      const phaseTitle = labelsContainer7.querySelector('.label-title-1');
      if (phaseTitle && data && data.daily && data.daily[0] && typeof data.daily[0].moon_phase === 'number') {
         phaseTitle.innerText = getMoonPhaseName(data.daily[0].moon_phase);
      }
      
      const windTitle = labelsContainer7.querySelector('.label-title-2');
      if (windTitle && data && data.current) {
         const windSpeed = data.current.wind_speed || 0;
         const rawWindGust = data.current.wind_gust || windSpeed;
         if (rawWindGust - windSpeed >= 5) {
            windTitle.innerText = `${Math.round(rawWindGust)} mph Gusts`;
         } else {
            windTitle.innerText = `${Math.round(windSpeed)} mph`;
         }
      }

      const humidityTitle = labelsContainer7.querySelector('.label-title-3');
      if (humidityTitle && data && data.current && typeof data.current.dew_point === 'number') {
         const dewF = Math.round(data.current.dew_point);
         if (displayUnit === 'BOTH') {
            const dewC = Math.round((dewF - 32) * 5 / 9);
            humidityTitle.innerHTML = `Dew Pt ${dewF}${formatSlash()}${dewC}°`;
         } else {
            const dewDisplay = displayUnit === 'C' ? Math.round((dewF - 32) * 5 / 9) : dewF;
            humidityTitle.innerHTML = `Dew Pt ${dewDisplay}°`;
         }
      }
      
      const sunTitle = labelsContainer7.querySelector('.label-title-5');
      if (sunTitle && data && data.daily && data.daily[0]) {
         const now = Date.now() / 1000;
         const sunrise = data.daily[0].sunrise;
         const sunset = data.daily[0].sunset;
         
         if (typeof sunrise === 'number' && typeof sunset === 'number') {
            let oppEventTime = null;
            let oppEventLabel = '';
            
            if (now < sunrise) {
               oppEventTime = sunset;
               oppEventLabel = 'Sunset';
            } else if (now < sunset) {
               oppEventTime = data.daily[1]?.sunrise || (sunrise + 86400);
               oppEventLabel = 'Sunrise';
            } else {
               oppEventTime = data.daily[1]?.sunset || (sunset + 86400);
               oppEventLabel = 'Sunset';
            }
            
            const oppDate = new Date(oppEventTime * 1000);
            let oppHours = oppDate.getHours();
            const oppMinutes = oppDate.getMinutes();
            const oppAmPm = oppHours >= 12 ? 'p' : 'a';
            oppHours = oppHours % 12 || 12;
            const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
            
            sunTitle.innerText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
         }
      }
      
      const moonTitle = labelsContainer7.querySelector('.label-title-6');
      if (moonTitle && data && data.daily && data.daily[0]) {
         const now = Date.now() / 1000;
         const moonrise = data.daily[0].moonrise;
         const moonset = data.daily[0].moonset;
         
         if (typeof moonrise === 'number' && typeof moonset === 'number') {
            let oppEventTime = null;
            let oppEventLabel = '';
            
            if (moonrise < moonset) {
               if (now < moonrise) {
                  oppEventTime = moonset;
                  oppEventLabel = 'Moonset';
               } else if (now < moonset) {
                  oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                  oppEventLabel = 'Moonrise';
               } else {
                  oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                  oppEventLabel = 'Moonset';
               }
            } else {
               if (now < moonset) {
                  oppEventTime = moonrise;
                  oppEventLabel = 'Moonrise';
               } else if (now < moonrise) {
                  oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                  oppEventLabel = 'Moonset';
               } else {
                  oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                  oppEventLabel = 'Moonrise';
               }
            }
            
            const oppDate = new Date(oppEventTime * 1000);
            let oppHours = oppDate.getHours();
            const oppMinutes = oppDate.getMinutes();
            const oppAmPm = oppHours >= 12 ? 'p' : 'a';
            oppHours = oppHours % 12 || 12;
            const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
            
            moonTitle.innerText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
         }
      }
    }

    // --- 4-cell grid layout & labels (Row 1: 0-3) ---
    const indices4_1 = [0, 2, 1, 3];
    const containerId4_1 = 'clock-grid-container-4-1';
    let container4_1 = document.getElementById(containerId4_1);

    if (!container4_1) {
      container4_1 = document.createElement('div');
      container4_1.id = containerId4_1;
      container4_1.className = 'clockGridContainer4';

      for (let j = 0; j < 4; j++) {
        const i = indices4_1[j];
        const item = document.createElement('div');
        item.className = `clockGridItem clockGridItem4 clockGridItem-${i} clockGridItem4-1-${j}`;

        let innerHtml = '';
        if (i === 1) {
          innerHtml = `
            <svg class="clock-timer-svg grid-moon-track-svg" viewBox="0 0 100 100" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
            </svg>
            <div class="moon-phase-display grid-moon-phase" role="img" aria-label="Moon Phase"></div>
          `;
        } else if (i === 2) {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="gust-grad-4" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="var(--temp-color)" stop-opacity="0.62" />
                  <stop offset="100%" stop-color="var(--temp-color)" stop-opacity="0" />
                </linearGradient>
              </defs>
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
              <circle class="gust-progress" cx="50" cy="50" r="46" fill="none" stroke="url(#gust-grad-4)" />
              <circle class="gust-dot" r="1.75" />
            </svg>
            <div class="clock-face">
              <div class="clock-hand clock-hand-wind-direction"></div>
              <div class="clock-center-dot"></div>
            </div>
            <div class="grid-wind-speed-text"></div>
          `;
        } else if (i === 3) {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
            </svg>
            <div class="grid-humidity-text"></div>
          `;
        } else {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
            </svg>
          `;
          if (i === 0) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', handleTimeDialReset);
            innerHtml += `
              <div class="clock-face">
                <div class="clock-hour-hand"></div>
                <div class="clock-minute-hand"></div>
                <div class="clock-second-hand"></div>
                <div class="clock-center-dot"></div>
              </div>
            `;
          }
        }

        item.innerHTML = innerHtml;
        container4_1.appendChild(item);
      }

      const labelsContainer7 = document.getElementById('clock-grid-labels-container-7');
      if (labelsContainer7 && labelsContainer7.parentNode) {
        labelsContainer7.parentNode.insertBefore(container4_1, labelsContainer7.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(container4_1);
      }
    }

    const labelsContainerId4_1 = 'clock-grid-labels-container-4-1';
    let labelsContainer4_1 = document.getElementById(labelsContainerId4_1);
    if (!labelsContainer4_1) {
      labelsContainer4_1 = document.createElement('div');
      labelsContainer4_1.id = labelsContainerId4_1;
      labelsContainer4_1.className = 'clockGridLabelsContainer4';

      for (let j = 0; j < 4; j++) {
        const i = indices4_1[j];
        const item = document.createElement('div');
        item.className = `clockGridLabel clockGridLabel4 clockGridLabel4-1-${j}`;
        
        if (data && data.current && typeof data.current.temp === 'number') {
           const tempColorLocal = tempToColor(data.current.temp);
           if(tempColorLocal) {
              item.style.color = tempColorLocal;
           }
        }

        let titleText = CLOCK_GRID_LABELS[i] || '';

        if (i === 1 && data && data.daily && data.daily[0] && typeof data.daily[0].moon_phase === 'number') {
           titleText = getMoonPhaseName(data.daily[0].moon_phase);
        }
        
        if (i === 2 && data && data.current) {
           const windSpeed = data.current.wind_speed || 0;
           const rawWindGust = data.current.wind_gust || windSpeed;
           if (rawWindGust - windSpeed >= 5) {
              titleText = `${Math.round(rawWindGust)} mph Gusts`;
           } else {
              titleText = `${Math.round(windSpeed)} mph`;
           }
        }

        item.innerHTML = `
          <span class="label-title label-title-${i}" id="clock-grid-val-4-1-${j}">${titleText}</span>
        `;
        labelsContainer4_1.appendChild(item);
      }

      container4_1.parentNode.insertBefore(labelsContainer4_1, container4_1.nextSibling);
    } else {
      if (data && data.current && typeof data.current.temp === 'number') {
        const tempColorLocal = tempToColor(data.current.temp);
        if (tempColorLocal) {
          const labels = labelsContainer4_1.querySelectorAll('.clockGridLabel4');
          labels.forEach(label => label.style.color = tempColorLocal);
        }
      }

      const phaseTitle = labelsContainer4_1.querySelector('.label-title-1');
      if (phaseTitle && data && data.daily && data.daily[0] && typeof data.daily[0].moon_phase === 'number') {
         phaseTitle.innerText = getMoonPhaseName(data.daily[0].moon_phase);
      }
      
      const windTitle = labelsContainer4_1.querySelector('.label-title-2');
      if (windTitle && data && data.current) {
         const windSpeed = data.current.wind_speed || 0;
         const rawWindGust = data.current.wind_gust || windSpeed;
         if (rawWindGust - windSpeed >= 5) {
            windTitle.innerText = `${Math.round(rawWindGust)} mph Gusts`;
         } else {
            windTitle.innerText = `${Math.round(windSpeed)} mph`;
         }
      }
    }

    // --- 4-cell grid layout & labels (Row 2: 4-7) ---
    const indices4_2 = [4, 5, 6, 7];
    const containerId4_2 = 'clock-grid-container-4-2';
    let container4_2 = document.getElementById(containerId4_2);

    if (!container4_2) {
      container4_2 = document.createElement('div');
      container4_2.id = containerId4_2;
      container4_2.className = 'clockGridContainer4';

      for (let j = 0; j < 4; j++) {
        const i = indices4_2[j];
        const item = document.createElement('div');
        item.className = `clockGridItem clockGridItem4 clockGridItem-${i} clockGridItem4-2-${j}`;

        let innerHtml = '';
        if (i === 7) {
          innerHtml = `
            <div class="barometric-pressure-display grid-barometric-pressure">
              <svg class="barometric-gauge-svg" viewBox="0 0 100 100">
                <circle class="barometric-track" cx="50" cy="50" r="46" fill="none" />
                <circle class="barometric-fill" cx="50" cy="50" r="46" fill="none" />
                <line class="barometric-needle" x1="50" y1="50" x2="50" y2="15" stroke-linecap="round" />
              </svg>
              <div class="barometric-text"></div>
            </div>
          `;
        } else if (i === 5) {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
              <circle class="celestial-dot" cx="50" cy="4" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
            </svg>
            <div class="grid-sun-text"></div>
          `;
        } else if (i === 6) {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
              <circle class="celestial-dot" cx="50" cy="4" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
            </svg>
            <div class="grid-moon-text"></div>
          `;
        } else {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="46" fill="none" />
            </svg>
            <div class="grid-dewpoint-text"></div>
          `;
        }

        item.innerHTML = innerHtml;
        container4_2.appendChild(item);
      }

      if (labelsContainer4_1 && labelsContainer4_1.parentNode) {
        labelsContainer4_1.parentNode.insertBefore(container4_2, labelsContainer4_1.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(container4_2);
      }
    }

    const labelsContainerId4_2 = 'clock-grid-labels-container-4-2';
    let labelsContainer4_2 = document.getElementById(labelsContainerId4_2);
    if (!labelsContainer4_2) {
      labelsContainer4_2 = document.createElement('div');
      labelsContainer4_2.id = labelsContainerId4_2;
      labelsContainer4_2.className = 'clockGridLabelsContainer4';

      for (let j = 0; j < 4; j++) {
        const i = indices4_2[j];
        const item = document.createElement('div');
        item.className = `clockGridLabel clockGridLabel4 clockGridLabel4-2-${j}`;
        
        if (data && data.current && typeof data.current.temp === 'number') {
           const tempColorLocal = tempToColor(data.current.temp);
           if(tempColorLocal) {
              item.style.color = tempColorLocal;
           }
        }

        let titleText = CLOCK_GRID_LABELS[i] || '';

        if (i === 5 && data && data.daily && data.daily[0]) {
           const now = Date.now() / 1000;
           const sunrise = data.daily[0].sunrise;
           const sunset = data.daily[0].sunset;
           let oppEventTime = null;
           let oppEventLabel = '';
           
           if (typeof sunrise === 'number' && typeof sunset === 'number') {
              if (now < sunrise) {
                 oppEventTime = sunset;
                 oppEventLabel = 'Sunset';
              } else if (now < sunset) {
                 oppEventTime = data.daily[1]?.sunrise || (sunrise + 86400);
                 oppEventLabel = 'Sunrise';
              } else {
                 oppEventTime = data.daily[1]?.sunset || (sunset + 86400);
                 oppEventLabel = 'Sunset';
              }
              
              const oppDate = new Date(oppEventTime * 1000);
              let oppHours = oppDate.getHours();
              const oppMinutes = oppDate.getMinutes();
              const oppAmPm = oppHours >= 12 ? 'p' : 'a';
              oppHours = oppHours % 12 || 12;
              const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
              
              titleText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
           }
        }
        
        if (i === 6 && data && data.daily && data.daily[0]) {
           const now = Date.now() / 1000;
           const moonrise = data.daily[0].moonrise;
           const moonset = data.daily[0].moonset;
           let oppEventTime = null;
           let oppEventLabel = '';
           
           if (typeof moonrise === 'number' && typeof moonset === 'number') {
              if (moonrise < moonset) {
                 if (now < moonrise) {
                    oppEventTime = moonset;
                    oppEventLabel = 'Moonset';
                 } else if (now < moonset) {
                    oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                    oppEventLabel = 'Moonrise';
                 } else {
                    oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                    oppEventLabel = 'Moonset';
                 }
              } else {
                 if (now < moonset) {
                    oppEventTime = moonrise;
                    oppEventLabel = 'Moonrise';
                 } else if (now < moonrise) {
                    oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                    oppEventLabel = 'Moonset';
                 } else {
                    oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                    oppEventLabel = 'Moonrise';
                 }
              }
              
              const oppDate = new Date(oppEventTime * 1000);
              let oppHours = oppDate.getHours();
              const oppMinutes = oppDate.getMinutes();
              const oppAmPm = oppHours >= 12 ? 'p' : 'a';
              oppHours = oppHours % 12 || 12;
              const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
              
              titleText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
           }
        }

        item.innerHTML = `
          <span class="label-title label-title-${i}" id="clock-grid-val-4-2-${j}">${titleText}</span>
        `;
        labelsContainer4_2.appendChild(item);
      }

      container4_2.parentNode.insertBefore(labelsContainer4_2, container4_2.nextSibling);
    } else {
      if (data && data.current && typeof data.current.temp === 'number') {
        const tempColorLocal = tempToColor(data.current.temp);
        if (tempColorLocal) {
          const labels = labelsContainer4_2.querySelectorAll('.clockGridLabel4');
          labels.forEach(label => label.style.color = tempColorLocal);
        }
      }

      const sunTitle = labelsContainer4_2.querySelector('.label-title-5');
      if (sunTitle && data && data.daily && data.daily[0]) {
         const now = Date.now() / 1000;
         const sunrise = data.daily[0].sunrise;
         const sunset = data.daily[0].sunset;
         
         if (typeof sunrise === 'number' && typeof sunset === 'number') {
            let oppEventTime = null;
            let oppEventLabel = '';
            
            if (now < sunrise) {
               oppEventTime = sunset;
               oppEventLabel = 'Sunset';
            } else if (now < sunset) {
               oppEventTime = data.daily[1]?.sunrise || (sunrise + 86400);
               oppEventLabel = 'Sunrise';
            } else {
               oppEventTime = data.daily[1]?.sunset || (sunset + 86400);
               oppEventLabel = 'Sunset';
            }
            
            const oppDate = new Date(oppEventTime * 1000);
            let oppHours = oppDate.getHours();
            const oppMinutes = oppDate.getMinutes();
            const oppAmPm = oppHours >= 12 ? 'p' : 'a';
            oppHours = oppHours % 12 || 12;
            const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
            
            sunTitle.innerText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
         }
      }
      
      const moonTitle = labelsContainer4_2.querySelector('.label-title-6');
      if (moonTitle && data && data.daily && data.daily[0]) {
         const now = Date.now() / 1000;
         const moonrise = data.daily[0].moonrise;
         const moonset = data.daily[0].moonset;
         
         if (typeof moonrise === 'number' && typeof moonset === 'number') {
            let oppEventTime = null;
            let oppEventLabel = '';
            
            if (moonrise < moonset) {
               if (now < moonrise) {
                  oppEventTime = moonset;
                  oppEventLabel = 'Moonset';
               } else if (now < moonset) {
                  oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                  oppEventLabel = 'Moonrise';
               } else {
                  oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                  oppEventLabel = 'Moonset';
               }
            } else {
               if (now < moonset) {
                  oppEventTime = moonrise;
                  oppEventLabel = 'Moonrise';
               } else if (now < moonrise) {
                  oppEventTime = data.daily[1]?.moonset || (moonset + 86400);
                  oppEventLabel = 'Moonset';
               } else {
                  oppEventTime = data.daily[1]?.moonrise || (moonrise + 86400);
                  oppEventLabel = 'Moonrise';
               }
            }
            
            const oppDate = new Date(oppEventTime * 1000);
            let oppHours = oppDate.getHours();
            const oppMinutes = oppDate.getMinutes();
            const oppAmPm = oppHours >= 12 ? 'p' : 'a';
            oppHours = oppHours % 12 || 12;
            const oppMinutesStr = oppMinutes < 10 ? '0' + oppMinutes : oppMinutes;
            
            moonTitle.innerText = `${oppEventLabel} ${oppHours}:${oppMinutesStr}${oppAmPm}`;
         }
      }
    }
    requestAnimationFrame(updateStarfieldMask);
  }

  // Update the humidity dial in grid cell #4 (index 3)
  function updateHumidityDial(data) {
    const humidity = data?.current?.humidity;
    if (typeof humidity !== 'number') return;
    
    const currentTemp = data?.current?.temp || null;
    const tempColor = currentTemp !== null ? tempToColor(currentTemp) : null;
    const activeColor = getDotsColors(currentTemp).active;
    const finalColor = tempColor || activeColor;
    
    let trendHtml = '';
    const humidityRounded = Math.round(humidity);
    const humidityTrend = getPersistentTrendDirection('weather_trend_humidity', humidityRounded);
    let iconClass = '';
    if (humidityTrend === 'up') {
      iconClass = "fa-angle-up";
    } else if (humidityTrend === 'down') {
      iconClass = "fa-angle-down";
    }
    
    if (iconClass) {
      trendHtml = `<div style="position: absolute; top: ${BAROMETRIC_TREND_TOP_POS}; width: 100%; text-align: center; font-size: ${BAROMETRIC_TREND_FONT_SIZE};"><i class="fa-solid ${iconClass}"></i></div>`;
    }
    
    const gridHumidityProgressEls = document.querySelectorAll('.clockGridItem-3 .countdown-progress');
    const gridHumidityTextEls = document.querySelectorAll('.clockGridItem-3 .grid-humidity-text');
    const radius = 46;
    const circumference = 2 * Math.PI * radius; // ~289.0265
    
    const currentHumidityAvg = getDynamicHumidityAverage(data?.current?.dt);
    gridHumidityProgressEls.forEach(gridHumidityProgressEl => {
      if (finalColor) {
        gridHumidityProgressEl.style.stroke = finalColor;
      }
    });

    const getRadius = (el) => 46;
    animateGauge(gridHumidityProgressEls, humidity, prevHumidity, HUMIDITY_DIAL_MIN, currentHumidityAvg, HUMIDITY_DIAL_MAX, getRadius);
    prevHumidity = humidity;
    
    gridHumidityTextEls.forEach(gridHumidityTextEl => {
      gridHumidityTextEl.innerHTML = `${trendHtml}${Math.round(humidity)}%<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">RH</span>`;
      if (finalColor) {
        gridHumidityTextEl.style.color = finalColor;
      }
    });
  }

  // Update the dewpoint dial in grid cell #5 (index 4)
  function updateDewpointDial(data) {
    const dewpoint = data?.current?.dew_point || null;
    const currentTemp = (data?.current?.temp !== undefined) ? data.current.temp : null;
    const tempColor = currentTemp !== null ? tempToColor(currentTemp) : null;
    const dewpointColor = dewpoint !== null ? tempToColor(dewpoint) : 'hsl(120, 80%, 40%)';
    const finalColor = tempColor || dewpointColor;
    
    const gridDewpointProgressEls = document.querySelectorAll('.clockGridItem-4 .countdown-progress');
    const gridDewpointTextEls = document.querySelectorAll('.clockGridItem-4 .grid-dewpoint-text');
    const radius = 46;
    const circumference = 2 * Math.PI * radius; // ~289.0265
    
    gridDewpointProgressEls.forEach(gridDewpointProgressEl => {
      if (finalColor) {
        gridDewpointProgressEl.style.stroke = finalColor;
      }
    });

    if (dewpoint !== null) {
      const getRadius = (el) => 46;
      animateGauge(gridDewpointProgressEls, dewpoint, prevDewpoint, DEWPOINT_DIAL_MIN, DEWPOINT_DIAL_AVG, DEWPOINT_DIAL_MAX, getRadius);
      prevDewpoint = dewpoint;
    } else {
      gridDewpointProgressEls.forEach(gridDewpointProgressEl => {
        gridDewpointProgressEl.style.strokeDashoffset = circumference;
      });
      prevDewpoint = null;
    }
    
    let trendHtml = '';
    if (dewpoint !== null) {
      const dewF = Math.round(dewpoint);
      const dewTrend = getPersistentTrendDirection('weather_trend_dewpoint', dewF);
      let iconClass = '';
      if (dewTrend === 'up') {
        iconClass = "fa-angle-up";
      } else if (dewTrend === 'down') {
        iconClass = "fa-angle-down";
      }
      if (iconClass) {
        trendHtml = `<div style="position: absolute; top: ${BAROMETRIC_TREND_TOP_POS}; width: 100%; text-align: center; font-size: ${BAROMETRIC_TREND_FONT_SIZE};"><i class="fa-solid ${iconClass}"></i></div>`;
      }
    }

    gridDewpointTextEls.forEach(gridDewpointTextEl => {
      if (dewpoint !== null) {
        const dewF = Math.round(dewpoint);
        let displayStr = '';
        const degSuffix = '°';
        if (displayUnit === 'BOTH') {
          const dewC = Math.round((dewF - 32) * 5 / 9);
          displayStr = `${dewF}${formatSlash()}${dewC}${degSuffix}`;
        } else {
          const dewDisplay = displayUnit === 'C' ? Math.round((dewF - 32) * 5 / 9) : dewF;
          displayStr = `${dewDisplay}${degSuffix}`;
        }
        gridDewpointTextEl.innerHTML = `${trendHtml}${displayStr}<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Td</span>`;
      } else {
        gridDewpointTextEl.innerHTML = `--<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Td</span>`;
      }
      if (finalColor) {
        gridDewpointTextEl.style.color = finalColor;
      }
    });
  }








  // --- Daily Weather Summary Line Config (DUAL Desktop & Mobile) ---
  const DAILY_SUMMARY_WIDTH_DESKTOP = '45vw';            // EDITABLE Desktop: Centered block width in vw (e.g. '40vw', '50vw')
  const DAILY_SUMMARY_WIDTH_MOBILE = '55vw';             // EDITABLE Mobile: Centered block width in vw (e.g. '70vw', '80vw')

  const DAILY_SUMMARY_FONT_SIZE_DESKTOP = '3.6vw';       // EDITABLE Desktop: Font size (e.g. '1.6vw', '2vw', '3.6vw')
  const DAILY_SUMMARY_FONT_SIZE_MOBILE = '4vw';          // EDITABLE Mobile: Font size (e.g. '4vw', '5vw', '3.5vw')

  const DAILY_SUMMARY_LETTER_SPACING_DESKTOP = '-0.05em';// EDITABLE Desktop: Kerning matching dial labels
  const DAILY_SUMMARY_LETTER_SPACING_MOBILE = '0vw';  // EDITABLE Mobile: Kerning matching top text lines

  const DAILY_SUMMARY_LINE_HEIGHT_DESKTOP = '1';         // EDITABLE Desktop: Line height / leading
  const DAILY_SUMMARY_LINE_HEIGHT_MOBILE = '1.2';        // EDITABLE Mobile: Line height / leading

  const DAILY_SUMMARY_MARGIN_TOP_DESKTOP = '2.2vw';       // EDITABLE Desktop: Space ABOVE summary line (match DERIVED_DESC_MARGIN_BOTTOM_DESKTOP)
  const DAILY_SUMMARY_MARGIN_TOP_MOBILE = '3.0vw';        // EDITABLE Mobile: Space ABOVE summary line (match DERIVED_DESC_MARGIN_BOTTOM_MOBILE)

  const DAILY_SUMMARY_MARGIN_BOTTOM_DESKTOP = '-3vw';  // EDITABLE Desktop: Space BELOW summary line (match CLOCK_GRID_MARGIN_TOP_DESKTOP)
  const DAILY_SUMMARY_MARGIN_BOTTOM_MOBILE = '3.0vw';      // EDITABLE Mobile: Space BELOW summary line (match CLOCK_GRID_MARGIN_TOP_MOBILE)

  // Helper to polish machine-generated OpenWeather summaries into natural, smooth English
  function formatNaturalSummary(text) {
    if (!text || typeof text !== 'string') return '';
    let s = text.trim();

    // Fix singular 'clear sky' -> 'clear skies'
    s = s.replace(/\bclear sky\b/gi, 'clear skies');

    // Fix clunky 'overcast clouds' -> 'overcast skies'
    s = s.replace(/\bovercast clouds\b/gi, 'overcast skies');

    // Fix robotic 'There will be' -> 'Expect'
    s = s.replace(/^There will be\b/i, 'Expect');

    // Ensure trailing period
    
    if (s && !/[.!?]$/.test(s)) {
      s += '.';
    }

    return s;
  }

  // Create and update daily weather summary line between Sweltering and the first dial row
  function updateDailySummary(data) {
    let summaryText = formatNaturalSummary(data?.daily?.[0]?.summary || '');
    
    let el = document.getElementById('daily-weather-summary');

    if (!el) {
      el = document.createElement('div');
      el.id = 'daily-weather-summary';
      el.className = 'daily-weather-summary';

      el.style.textAlign = 'center';
      el.style.fontFamily = "'light', sans-serif";
      el.style.textTransform = 'none';
      el.style.boxSizing = 'border-box';
      el.style.pointerEvents = 'none';
      el.style.textWrap = 'balance';
    }

    // Determine current layout (Mobile <= 767px vs Desktop)
    const isMobile = window.innerWidth <= 767;

    const width = isMobile ? DAILY_SUMMARY_WIDTH_MOBILE : DAILY_SUMMARY_WIDTH_DESKTOP;
    const fontSize = isMobile ? DAILY_SUMMARY_FONT_SIZE_MOBILE : DAILY_SUMMARY_FONT_SIZE_DESKTOP;
    const letterSpacing = isMobile ? DAILY_SUMMARY_LETTER_SPACING_MOBILE : DAILY_SUMMARY_LETTER_SPACING_DESKTOP;
    const lineHeight = isMobile ? DAILY_SUMMARY_LINE_HEIGHT_MOBILE : DAILY_SUMMARY_LINE_HEIGHT_DESKTOP;
    const marginTop = isMobile ? DAILY_SUMMARY_MARGIN_TOP_MOBILE : DAILY_SUMMARY_MARGIN_TOP_DESKTOP;
    const marginBottom = isMobile ? DAILY_SUMMARY_MARGIN_BOTTOM_MOBILE : DAILY_SUMMARY_MARGIN_BOTTOM_DESKTOP;

    // Apply DUAL properties dynamically (100% controlled by JS constants)
    el.style.width = width;
    el.style.maxWidth = width;
    el.style.fontSize = fontSize;
    el.style.letterSpacing = letterSpacing;
    el.style.lineHeight = lineHeight;
    el.style.margin = `${marginTop} auto ${marginBottom}`;

    // Apply font-family override for 100-109 temperature range
    const tempVal = data?.current?.temp ?? lastWeatherData?.current?.temp;
    const is100s = typeof tempVal === 'number' && tempVal >= 100 && tempVal < 110;
    const summaryFont = is100s ? "'medium', sans-serif" : "'light', sans-serif";
    el.style.setProperty('--daily-summary-font-family', summaryFont);

    // Position directly between Sweltering (#weather-description-duplicate or #weather-description) and the first dial row
    const swelteringTarget = document.getElementById('weather-description-duplicate') ||
                             document.getElementById('weather-description');

    const firstDialRow = document.getElementById('clock-grid-container') ||
                         document.querySelector('.clockGridContainer7') ||
                         document.querySelector('.clockGridContainer4') ||
                         document.querySelector('.clockGridContainer') ||
                         document.getElementById('refresh-spacer-container');

    if (swelteringTarget && swelteringTarget.parentNode) {
      if (el.previousSibling !== swelteringTarget) {
        swelteringTarget.parentNode.insertBefore(el, swelteringTarget.nextSibling);
      }
    } else if (firstDialRow && firstDialRow.parentNode) {
      if (el.nextSibling !== firstDialRow) {
        firstDialRow.parentNode.insertBefore(el, firstDialRow);
      }
    } else {
      (document.querySelector('main.content') || document.body).appendChild(el);
    }

    if (summaryText) {
      el.textContent = summaryText;
      el.style.display = 'block';

      // Calculate layout push dynamically (including margins)
      const marginTopVal = parseFloat(isMobile ? DAILY_SUMMARY_MARGIN_TOP_MOBILE : DAILY_SUMMARY_MARGIN_TOP_DESKTOP) || 0;
      const marginBottomVal = parseFloat(isMobile ? DAILY_SUMMARY_MARGIN_BOTTOM_MOBILE : DAILY_SUMMARY_MARGIN_BOTTOM_DESKTOP) || 0;
      const vwToPx = window.innerWidth / 100;
      const marginTopPx = marginTopVal * vwToPx;
      const marginBottomPx = marginBottomVal * vwToPx;
      const pushPx = el.offsetHeight + marginTopPx + marginBottomPx;
      
      document.documentElement.style.setProperty('--daily-summary-push', `${pushPx}px`);
    } else {
      el.style.display = 'none';
      document.documentElement.style.setProperty('--daily-summary-push', '0px');
    }

    requestAnimationFrame(() => {
      updateLowerGradientPosition();
    });

    // Apply color associated strictly with current temperature + 10
    const currentTemp = data?.current?.temp;
    if (typeof currentTemp === 'number') {
      const summaryColor = tempToColor(currentTemp + 10);
      if (summaryColor) {
        el.style.color = summaryColor;
      }
    }
  }

  // Update the sun dial in grid cell #6 (index 5)
  function updateSunDial(data) {
    const gridSunProgressEls = document.querySelectorAll('.clockGridItem-5 .countdown-progress');
    const gridSunTextEls = document.querySelectorAll('.clockGridItem-5 .grid-sun-text');
    
    // Get sunrise/sunset times (Unix timestamps)
    const today = data?.daily?.[0];
    const sunrise = today?.sunrise;
    const sunset = today?.sunset;
    const currentTemp = (data?.current?.temp !== undefined) ? data.current.temp : null;
    const tempColor = currentTemp !== null ? tempToColor(currentTemp) : null;
    const celestialColor = currentTemp !== null ? (tempToColor(currentTemp + 10) || tempColor) : null;
    
    if (typeof sunrise !== 'number' || typeof sunset !== 'number') {
      /* eslint-disable */console.log(...oo_oo(`2266558813_6564_6_6564_62_4`,'Sun dial: sunrise/sunset data unavailable'));
      const circumference = 2 * Math.PI * 46;
      gridSunProgressEls.forEach(gridSunProgressEl => {
        gridSunProgressEl.style.strokeDashoffset = circumference; // hide progress
      });
      gridSunTextEls.forEach(gridSunTextEl => {
        gridSunTextEl.innerHTML = `<span style="display: inline-block; transform: translateY(var(--sunmoon-top-label-y, 0vw)); font-size: var(--clock-inner-label-size); font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Sun</span><br>--<br><span style="display: inline-block; transform: translateY(var(--sunmoon-bottom-label-y, 0vw)); font-size: var(--clock-inner-label-size); font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Day</span>`;
      });
      return;
    }
    
    // Get midnight of current day in local time
    const nowDate = new Date();
    const midnightToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime() / 1000;
    
    const sunriseSec = sunrise - midnightToday;
    const sunsetSec = sunset - midnightToday;
    
    // Normalize fractions to 0..1 representing 24 hours
    const fSunrise = Math.max(0, Math.min(1, sunriseSec / 86400));
    const fSunset = Math.max(0, Math.min(1, sunsetSec / 86400));
    
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    
    const length = (fSunset - fSunrise) * circumference;
    const offset = fSunrise * circumference;
    
    gridSunProgressEls.forEach(gridSunProgressEl => {
      gridSunProgressEl.style.strokeDasharray = `${length} ${circumference}`;
      gridSunProgressEl.style.strokeDashoffset = -offset;
      if (tempColor) {
        gridSunProgressEl.style.stroke = tempColor;
      }
    });
    
    const celestialDotEls = document.querySelectorAll('.clockGridItem-5 .celestial-dot');
    // Current time fraction over 24h
    const nowSec = (Date.now() / 1000) - midnightToday;
    const fNow = Math.max(0, Math.min(1, nowSec / 86400));
    const angleRad = fNow * 2 * Math.PI;
    const cx = 50 + radius * Math.cos(angleRad);
    const cy = 50 + radius * Math.sin(angleRad);
    const isUp = fNow >= fSunrise && fNow <= fSunset;

    if (lastSunIsUp !== null && isUp !== lastSunIsUp) {
      celestialDotEls.forEach(el => {
        el.classList.add('celestial-spin');
        setTimeout(() => el.classList.remove('celestial-spin'), 1200);
      });
    }
    lastSunIsUp = isUp;

    celestialDotEls.forEach(celestialDotEl => {
      celestialDotEl.setAttribute('cx', cx.toFixed(3));
      celestialDotEl.setAttribute('cy', cy.toFixed(3));
      celestialDotEl.style.display = 'block';
      celestialDotEl.setAttribute('r', String(CLOCK_GRID_CELESTIAL_DOT_RADIUS));
      celestialDotEl.style.fill = isUp ? (celestialColor || 'white') : '#333333';
      celestialDotEl.style.opacity = '1';
      celestialDotEl.style.strokeWidth = 'var(--grid-celestial-dot-stroke-width)';
      if (celestialColor) {
        celestialDotEl.style.stroke = isUp ? celestialColor : '#333333';
      }
    });
    
    // Calculate the next sun event (sunrise or sunset)
    const now = Date.now() / 1000;
    let nextEventTime = null;
    let nextEventLabel = '';
    
    if (now < sunrise) {
      nextEventTime = sunrise;
      nextEventLabel = 'Rise';
    } else if (now < sunset) {
      nextEventTime = sunset;
      nextEventLabel = 'Set';
    } else {
      nextEventTime = data?.daily?.[1]?.sunrise || (sunrise + 86400);
      nextEventLabel = 'Rise';
    }
    
    const eventDate = new Date(nextEventTime * 1000);
    let hours = eventDate.getHours();
    const minutes = eventDate.getMinutes();
    const ampm = hours >= 12 ? 'p' : 'a';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    const formattedTime = `${hours}:${minutesStr}<span style="font-size: 0.67em; font-family: 'medium', sans-serif;">${ampm}</span>`;
    
    gridSunTextEls.forEach(gridSunTextEl => {
      gridSunTextEl.innerHTML = `<span style="display: inline-block; transform: translateY(var(--sunmoon-top-label-y, 0vw)); font-size: var(--clock-inner-label-size); font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Sun</span><br>${formattedTime}<br><span style="display: inline-block; transform: translateY(var(--sunmoon-bottom-label-y, 0vw)); font-size: var(--clock-inner-label-size); font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">${nextEventLabel}</span>`;
      if (tempColor) {
        gridSunTextEl.style.color = tempColor;
      }
    });
  }

  // Update the moon dial in grid cell #7 (index 6)
  function updateMoonDial(data) {
    const gridMoonProgressEls = document.querySelectorAll('.clockGridItem-6 .countdown-progress');
    const gridMoonTextEls = document.querySelectorAll('.clockGridItem-6 .grid-moon-text');
    
    // Get moonrise/moonset times (Unix timestamps)
    const today = data?.daily?.[0];
    const moonrise = today?.moonrise;
    const moonset = today?.moonset;
    const currentTemp = (data?.current?.temp !== undefined) ? data.current.temp : null;
    const tempColor = currentTemp !== null ? tempToColor(currentTemp) : null;
    const celestialColor = currentTemp !== null ? (tempToColor(currentTemp + 10) || tempColor) : null;
    
    if (typeof moonrise !== 'number' || typeof moonset !== 'number') {
      /* eslint-disable */console.log(...oo_oo(`2266558813_6678_6_6678_65_4`,'Moon dial: moonrise/moonset data unavailable'));
      const circumference = 2 * Math.PI * 46;
      gridMoonProgressEls.forEach(gridMoonProgressEl => {
        gridMoonProgressEl.style.strokeDashoffset = circumference; // hide progress
      });
      gridMoonTextEls.forEach(gridMoonTextEl => {
        gridMoonTextEl.innerHTML = `<span style="display: inline-block; transform: translateY(var(--sunmoon-top-label-y, 0vw)); font-size: var(--clock-inner-label-size); font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Moon</span><br>--<br><span style="display: inline-block; transform: translateY(var(--sunmoon-bottom-label-y, 0vw)); font-size: var(--clock-inner-label-size); font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Moon</span>`;
      });
      return;
    }
    
    // Get midnight of current day in local time
    const nowDate = new Date();
    const midnightToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime() / 1000;
    
    const moonriseSec = moonrise - midnightToday;
    const moonsetSec = moonset - midnightToday;
    
    // Normalize fractions to 0..1 representing 24 hours
    const fMoonrise = Math.max(0, Math.min(1, moonriseSec / 86400));
    const fMoonset = Math.max(0, Math.min(1, moonsetSec / 86400));
    
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    
    gridMoonProgressEls.forEach(gridMoonProgressEl => {
      if (moonrise < moonset) {
        // Simple case: moon is up within the same calendar day
        const length = (fMoonset - fMoonrise) * circumference;
        const offset = fMoonrise * circumference;
        
        gridMoonProgressEl.style.strokeDasharray = `${length} ${circumference}`;
        gridMoonProgressEl.style.strokeDashoffset = -offset;
      } else {
        // Crossing midnight: moon is up from 00:00 to fMoonset, and from fMoonrise to 24:00
        const L1 = fMoonset * circumference;
        const G1 = (fMoonrise - fMoonset) * circumference;
        const L2 = (1.0 - fMoonrise) * circumference;
        
        gridMoonProgressEl.style.strokeDasharray = `${L1} ${G1} ${L2} ${circumference}`;
        gridMoonProgressEl.style.strokeDashoffset = 0;
      }
      
      if (tempColor) {
        gridMoonProgressEl.style.stroke = tempColor;
      }
    });
    
    const celestialDotEls = document.querySelectorAll('.clockGridItem-6 .celestial-dot');
    // Current time fraction over 24h
    const nowSec = (Date.now() / 1000) - midnightToday;
    const fNow = Math.max(0, Math.min(1, nowSec / 86400));
    const angleRad = fNow * 2 * Math.PI;
    const cx = 50 + radius * Math.cos(angleRad);
    const cy = 50 + radius * Math.sin(angleRad);
    
    // Determine if the moon is "up" based on whether fNow is amidst the moonrise/moonset span(s)
    let isUp = false;
    if (moonrise < moonset) {
      isUp = fNow >= fMoonrise && fNow <= fMoonset;
    } else {
      isUp = fNow <= fMoonset || fNow >= fMoonrise;
    }

    if (lastMoonIsUp !== null && isUp !== lastMoonIsUp) {
      celestialDotEls.forEach(el => {
        el.classList.add('celestial-spin');
        setTimeout(() => el.classList.remove('celestial-spin'), 1200);
      });
    }
    lastMoonIsUp = isUp;

    celestialDotEls.forEach(celestialDotEl => {
      celestialDotEl.setAttribute('cx', cx.toFixed(3));
      celestialDotEl.setAttribute('cy', cy.toFixed(3));
      celestialDotEl.style.display = 'block';
      celestialDotEl.setAttribute('r', String(CLOCK_GRID_CELESTIAL_DOT_RADIUS));
      celestialDotEl.style.fill = isUp ? (celestialColor || 'white') : '#333333';
      celestialDotEl.style.opacity = '1';
      celestialDotEl.style.strokeWidth = 'var(--grid-celestial-dot-stroke-width)';
      if (celestialColor) {
        celestialDotEl.style.stroke = isUp ? celestialColor : '#333333';
      }
    });
    
    // Calculate the next moon event (moonrise or moonset)
    const now = Date.now() / 1000;
    let nextEventTime = null;
    let nextEventLabel = '';
    
    if (moonrise < moonset) {
      if (now < moonrise) {
        nextEventTime = moonrise;
        nextEventLabel = 'Rise';
      } else if (now < moonset) {
        nextEventTime = moonset;
        nextEventLabel = 'Set';
      } else {
        nextEventTime = data?.daily?.[1]?.moonrise || (moonrise + 86400);
        nextEventLabel = 'Rise';
      }
    } else {
      if (now < moonset) {
        nextEventTime = moonset;
        nextEventLabel = 'Set';
      } else if (now < moonrise) {
        nextEventTime = moonrise;
        nextEventLabel = 'Rise';
      } else {
        nextEventTime = data?.daily?.[1]?.moonset || (moonset + 86400);
        nextEventLabel = 'Set';
      }
    }
    
    const eventDate = new Date(nextEventTime * 1000);
    let hours = eventDate.getHours();
    const minutes = eventDate.getMinutes();
    const ampm = hours >= 12 ? 'p' : 'a';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    const formattedTime = `${hours}:${minutesStr}<span style="font-size: 0.67em; font-family: 'medium', sans-serif;">${ampm}</span>`;
    
    gridMoonTextEls.forEach(gridMoonTextEl => {
      gridMoonTextEl.innerHTML = `<span style="display: inline-block; transform: translateY(var(--sunmoon-top-label-y, 0vw)); font-size: var(--clock-inner-label-size); font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Moon</span><br>${formattedTime}<br><span style="display: inline-block; transform: translateY(var(--sunmoon-bottom-label-y, 0vw)); font-size: var(--clock-inner-label-size); font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">${nextEventLabel}</span>`;
      if (tempColor) {
        gridMoonTextEl.style.color = tempColor;
      }
    });
  }

  // Create and update the wind dots row (pill + 60 dots)
  function updateWindDotsRow(data) {
    const windSpeed = data?.current?.wind_speed || 0;
    const rawWindGust = data?.current?.wind_gust || windSpeed;
    const windGust = (rawWindGust - windSpeed >= 5) ? rawWindGust : windSpeed;
    const currentTemp = data?.current?.temp || null;
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_6817_4_6817_196_4`,`%c[WIND TEST] Raw API Speed: ${data?.current?.wind_speed} mph | Raw API Gust: ${data?.current?.wind_gust} mph`, 'background: #222; color: #00ffff; font-size: 16px; padding: 4px;'));
    
    const wrapperId = 'wind-dots-wrapper';
    let wrapper = document.getElementById(wrapperId);
    
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = wrapperId;
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.width = '100vw';
      wrapper.style.margin = `${WIND_MARGIN_TOP} 0 ${WIND_MARGIN_BOTTOM}`;
      wrapper.style.padding = '0';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.position = 'relative'; // For absolute positioning of label
      
      // The Dots Container (flush left and right, full width)
      const dotsContainer = document.createElement('div');
      dotsContainer.id = 'wind-dots-container';
      dotsContainer.style.display = 'flex';
      dotsContainer.style.justifyContent = 'space-between'; // Flush left and right
      dotsContainer.style.alignItems = 'center';
      dotsContainer.style.gap = '0'; // No gap, space-between handles spacing
      dotsContainer.style.flexWrap = 'nowrap';
      dotsContainer.style.width = '100%';
      
      // The Label positioned at transition between wind speed and gust
      const pill = document.createElement('div');
      pill.id = 'wind-dots-pill';
      pill.style.position = 'absolute';
      pill.style.top = `calc(100% + ${WIND_LABEL_OFFSET_Y})`;
      pill.style.fontSize = WIND_LABEL_FONT_SIZE; // EDITABLE: Font size for wind label
      pill.style.fontFamily = "'light', sans-serif"; // EDITABLE: Font family
      pill.style.fontWeight = 'normal'; // EDITABLE: Font weight
      pill.style.whiteSpace = 'nowrap';
      pill.style.textAlign = 'center';
      pill.style.pointerEvents = 'none';
      pill.style.zIndex = '5';
      // Position will be set dynamically based on speedCount
      
      for (let i = 0; i < WIND_DOTS_COUNT; i++) {
        const dot = document.createElement('div');
        dot.className = 'wind-speed-dot';
        dot.style.width = WIND_DOT_SIZE;
        dot.style.height = WIND_DOT_SIZE;
        dot.style.borderRadius = '50%';
        // Allow shrinking slightly if screen is too narrow to fit literal 1.2vw calculations
        dot.style.flexShrink = '1';
        dot.style.transition = 'background-color 0.3s ease';
        dotsContainer.appendChild(dot);
      }
      
      wrapper.appendChild(dotsContainer);
      wrapper.appendChild(pill);
      
      // Insert right below the clock grid container (or fallback to refresh spacer container)
      const clockGrid = document.getElementById('clock-grid-container');
      const refreshSpacer = document.getElementById('refresh-spacer-container');
      const targetAnchor = clockGrid || refreshSpacer;
      if (targetAnchor && targetAnchor.parentNode) {
        targetAnchor.parentNode.insertBefore(wrapper, targetAnchor.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(wrapper);
      }
    }
    
    // Determine persistent trend arrow for wind dots row
    let trendIconHtml = '';
    const windSpeedRounded = Math.round(windSpeed);
    const windTrend = getPersistentTrendDirection('weather_trend_wind', windSpeedRounded);
    let iconClass = '';
    if (windTrend === 'up') {
      iconClass = "fa-angle-up";
    } else if (windTrend === 'down') {
      iconClass = "fa-angle-down";
    }

    if (iconClass) {
      trendIconHtml = ` <i class="fa-solid ${iconClass}" style="opacity: 0.8; font-size: 0.8em; vertical-align: middle;"></i>`;
    }
    
    // Update Pill Text
    const pill = document.getElementById('wind-dots-pill');
    if (pill) {
      pill.innerHTML = `<span style="font-family: 'bold', sans-serif; font-size: inherit; color: inherit;">${Math.round(windSpeed)}</span>&nbsp;mph${trendIconHtml}`;
    }
    
    // Determine colors to create an overlapping "tail" effect
    const activeColor = 'hsl(195, 100%, 70%)';         // Solid light blue for base wind speed
    const gustColor = 'hsla(195, 100%, 50%, 0.6)';     // Translucent light blue for gusts
    const inactiveColor = 'hsla(195, 100%, 50%, 0.15)'; // Very faint light blue for inactive dots
    
    // Apply the active color to the label
    if (pill) {
      pill.style.color = activeColor;
    }
    
    // Update Dots with gust visualization
    const dotsContainer = document.getElementById('wind-dots-container');
    if (dotsContainer) {
      const dots = dotsContainer.children;
      // Calculate proportion based on WIND_MAX_MPH scale and actual dots available
      const speedCount = Math.round((Math.min(windSpeed, WIND_MAX_MPH) / WIND_MAX_MPH) * dots.length);
      const gustCount = Math.round((Math.min(windGust, WIND_MAX_MPH) / WIND_MAX_MPH) * dots.length);
      
      // Log gust information
      if (windGust > windSpeed) {
        /* eslint-disable */console.log(...oo_oo(`2266558813_6925_8_6925_201_4`,`Wind: ${Math.round(windSpeed)} mph, Gusts: ${Math.round(windGust)} mph (${Math.round(windGust - windSpeed)} mph additional) - ${speedCount} to ${gustCount} of ${dots.length} dots`));
      } else {
        /* eslint-disable */console.log(...oo_oo(`2266558813_6927_8_6927_115_4`,`Wind: ${Math.round(windSpeed)} mph, No gusts detected - ${speedCount} of ${dots.length} dots`));
      }
      
      for (let i = 0; i < dots.length; i++) {
        if (i < speedCount) {
          // Base wind speed: solid light blue
          dots[i].style.backgroundColor = activeColor;
        } else if (i < gustCount) {
          // Gust range: translucent light blue (looks like a fading tail)
          dots[i].style.backgroundColor = gustColor;
        } else {
          // Inactive: very faint light blue
          dots[i].style.backgroundColor = inactiveColor;
        }
      }
      
      // Position mph label and wind direction arrow at the transition between speed and gust
      const pill = document.getElementById('wind-dots-pill');
      const windArrow = document.getElementById('wind-direction-arrow');
      
      if (dots.length > 0) {
        const dotIndex = Math.max(0, Math.min(speedCount > 0 ? speedCount - 1 : 0, dots.length - 1));
        const transitionDot = dots[dotIndex]; // Last solid-colored dot (or first if 0 mph)
        if (transitionDot) {
          const dotRect = transitionDot.getBoundingClientRect();
          const containerRect = wrapper.getBoundingClientRect();
          const dotCenter = dotRect.left + dotRect.width / 2;
          const leftPos = ((dotCenter - containerRect.left) / window.innerWidth * 100);
          
          // Position mph label
          if (pill) {
            // Prevent the label from going off-screen at very low (or very high) wind speeds
            const pillWidthVw = (pill.getBoundingClientRect().width / window.innerWidth) * 100;
            const safeLeftPos = Math.max((pillWidthVw / 2) + 2, Math.min(100 - (pillWidthVw / 2) - 2, leftPos));
            
            pill.style.left = `${safeLeftPos}vw`;
            pill.style.transform = 'translateX(-50%)';
          }
          
          // Position wind arrow
          if (windArrow) {
            const leftPosAbsolute = dotCenter; // Absolute position from viewport left
            const topPos = containerRect.bottom + (window.innerHeight * 0.01); // 1vw below dots
            windArrow.style.position = 'fixed';
            windArrow.style.left = `${leftPosAbsolute}px`;
            windArrow.style.top = `${topPos}px`;
            windArrow.style.transform = 'translate(-50%, 0)'; // Center horizontally on the dot
          }
        }
      }
    }
  }

  // Create and update the humidity dots row (pill + 100 dots for RH %)
  function updateHumidityDotsRow(data) {
    const humidity = data?.current?.humidity || 0;
    const currentTemp = (data?.current?.temp !== undefined) ? data.current.temp : null;
    const tempColor = currentTemp !== null ? tempToColor(currentTemp) : null;
    
    const wrapperId = 'humidity-dots-wrapper';
    let wrapper = document.getElementById(wrapperId);
    
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = wrapperId;
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.width = '100vw';
      wrapper.style.margin = `${HUMIDITY_MARGIN_TOP} 0 ${HUMIDITY_MARGIN_BOTTOM}`;
      wrapper.style.padding = '0';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.position = 'relative'; // For absolute positioning of label
      
      // The Dots Container (flush left and right, full width representing 0-100%)
      const dotsContainer = document.createElement('div');
      dotsContainer.id = 'humidity-dots-container';
      dotsContainer.style.display = 'flex';
      dotsContainer.style.justifyContent = 'space-between'; // Flush left and right
      dotsContainer.style.alignItems = 'center';
      dotsContainer.style.gap = '0'; // No gap, space-between handles spacing
      dotsContainer.style.flexWrap = 'nowrap';
      dotsContainer.style.width = '100%';
      
      // The Label positioned at current humidity %
      const pill = document.createElement('div');
      pill.id = 'humidity-dots-pill';
      pill.style.position = 'absolute';
      pill.style.top = `calc(100% + ${HUMIDITY_LABEL_OFFSET_Y})`;
      pill.style.fontSize = HUMIDITY_LABEL_FONT_SIZE; // EDITABLE: Font size for humidity label
      pill.style.fontFamily = "'light', sans-serif"; // EDITABLE: Font family
      pill.style.fontWeight = 'normal'; // EDITABLE: Font weight
      pill.style.whiteSpace = 'nowrap';
      pill.style.textAlign = 'center';
      pill.style.pointerEvents = 'none';
      pill.style.zIndex = '5';
      // Position will be set dynamically based on humidity percentage
      
      for (let i = 0; i < HUMIDITY_DOTS_COUNT; i++) {
        const dot = document.createElement('div');
        dot.className = 'humidity-dot';
        dot.style.width = HUMIDITY_DOT_SIZE;
        dot.style.height = HUMIDITY_DOT_SIZE;
        dot.style.borderRadius = '50%';
        dot.style.flexShrink = '1';
        dot.style.transition = 'background-color 0.3s ease';
        dotsContainer.appendChild(dot);
      }
      
      wrapper.appendChild(dotsContainer);
      wrapper.appendChild(pill);
      
      // Insert right below the wind dots wrapper
      const windWrapper = document.getElementById('wind-dots-wrapper');
      if (windWrapper && windWrapper.parentNode) {
        windWrapper.parentNode.insertBefore(wrapper, windWrapper.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(wrapper);
      }
    }
    
    // Determine persistent trend arrow for humidity dots row
    let trendIconHtml = '';
    const humidityRounded = Math.round(humidity);
    const humidityTrend = getPersistentTrendDirection('weather_trend_humidity', humidityRounded);
    let iconClass = '';
    if (humidityTrend === 'up') {
      iconClass = "fa-angle-up";
    } else if (humidityTrend === 'down') {
      iconClass = "fa-angle-down";
    }

    if (iconClass) {
      trendIconHtml = ` <i class="fa-solid ${iconClass}" style="opacity: 0.8; font-size: 0.8em; vertical-align: middle;"></i>`;
    }
    
    // Update Pill Text
    const pill = document.getElementById('humidity-dots-pill');
    if (pill) {
      pill.innerHTML = `<span style="font-family: 'bold', sans-serif; font-size: inherit; color: inherit;">${Math.round(humidity)}</span>% RH${trendIconHtml}`;
    }
    
    // Determine colors based on humidity % mapped to TEMP_COLORS
    let activeColor = tempToColor(humidity) || 'hsl(120, 80%, 40%)';
    let inactiveColor = 'hsla(120, 80%, 40%, 0.15)';
    
    const parsed = parseHslString(activeColor);
    if (parsed) {
      inactiveColor = `hsla(${parsed[0]}, ${parsed[1]}%, ${parsed[2]}%, 0.15)`;
    }
    
    // Apply the active color to the label
    if (pill) {
      pill.style.color = activeColor;
    }
    
    // Update Dots
    const dotsContainer = document.getElementById('humidity-dots-container');
    if (dotsContainer) {
      const dots = dotsContainer.children;
      // Calculate proportion: if 41% humidity and 60 dots, light up 41% of 60 = ~25 dots
      const activeCount = Math.round((humidity / 100) * dots.length);
      
      /* eslint-disable */console.log(...oo_oo(`2266558813_7090_6_7090_99_4`,`Humidity: ${Math.round(humidity)}% (${activeCount} of ${dots.length} dots lit)`));
      
      for (let i = 0; i < dots.length; i++) {
        const isActive = i < activeCount;
        dots[i].style.backgroundColor = isActive ? activeColor : inactiveColor;
      }
      
      // Position humidity label at the current humidity percentage
      const pill = document.getElementById('humidity-dots-pill');
      
      if (activeCount > 0 && activeCount <= dots.length) {
        const currentDot = dots[activeCount - 1]; // Last active dot (at current humidity %)
        if (currentDot) {
          const dotRect = currentDot.getBoundingClientRect();
          const containerRect = wrapper.getBoundingClientRect();
          const dotCenter = dotRect.left + dotRect.width / 2;
          const leftPos = ((dotCenter - containerRect.left) / window.innerWidth * 100);
          
          // Position humidity label
          if (pill) {
            // Prevent the label from going off-screen at very low (or very high) values
            const pillWidthVw = (pill.getBoundingClientRect().width / window.innerWidth) * 100;
            const safeLeftPos = Math.max((pillWidthVw / 2) + 2, Math.min(100 - (pillWidthVw / 2) - 2, leftPos));
            
            pill.style.left = `${safeLeftPos}vw`;
            pill.style.transform = 'translateX(-50%)';
          }
        }
      }
    }

    // Update the humidity progress and text in grid cell #4 (0 to 100% scale)
    const gridHumidityProgressEl = document.querySelector('.clockGridItem-3 .countdown-progress');
    const gridHumidityTextEl = document.querySelector('.clockGridItem-3 .grid-humidity-text');
    const radius = 46;
    const circumference = 2 * Math.PI * radius; // ~289.0265
    const finalColor = tempColor || activeColor;
    
    if (gridHumidityProgressEl) {
      const percent = Math.max(0, Math.min(1, humidity / 100));
      const dashOffset = circumference * (1 - percent);
      gridHumidityProgressEl.style.strokeDashoffset = dashOffset;
      if (finalColor) {
        gridHumidityProgressEl.style.stroke = finalColor;
      }
    }
    
    if (gridHumidityTextEl) {
      gridHumidityTextEl.innerHTML = `${Math.round(humidity)}%<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">RH</span>`;
      if (finalColor) {
        gridHumidityTextEl.style.color = finalColor;
      }
    }
  }

  // Create and update the dewpoint dots row (61 dots representing 20° to 80°)
  function updateDewpointDotsRow(data) {
    const dewpoint = data?.current?.dew_point || null;
    
    const wrapperId = 'dewpoint-dots-wrapper';
    let wrapper = document.getElementById(wrapperId);
    
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = wrapperId;
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.width = '100vw';
      wrapper.style.margin = `${DEWPOINT_MARGIN_TOP} 0 ${DEWPOINT_MARGIN_BOTTOM}`; // EDITABLE: Top/bottom margins
      wrapper.style.padding = '0';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.position = 'relative'; // For absolute positioning of label
      
      // The Dots Container (flush left and right, full width)
      const dotsContainer = document.createElement('div');
      dotsContainer.id = 'dewpoint-dots-container';
      dotsContainer.style.display = 'flex';
      dotsContainer.style.justifyContent = 'space-between'; // Flush left and right
      dotsContainer.style.alignItems = 'center';
      dotsContainer.style.gap = '0'; // No gap, space-between handles spacing
      dotsContainer.style.flexWrap = 'nowrap';
      dotsContainer.style.width = '100%';
      
      // The Label positioned at current dewpoint
      const pill = document.createElement('div');
      pill.id = 'dewpoint-dots-pill';
      pill.style.position = 'absolute';
      pill.style.top = `calc(100% + ${DEWPOINT_LABEL_OFFSET_Y})`;
      pill.style.fontSize = DEWPOINT_LABEL_FONT_SIZE; // EDITABLE: Font size for dewpoint label
      pill.style.fontFamily = "'light', sans-serif"; // EDITABLE: Font family
      pill.style.fontWeight = 'normal'; // EDITABLE: Font weight
      pill.style.whiteSpace = 'nowrap';
      pill.style.textAlign = 'center';
      pill.style.pointerEvents = 'none';
      pill.style.zIndex = '5';
      // Position will be set dynamically based on dewpoint temperature
      
      for (let i = 0; i < DEWPOINT_DOTS_COUNT; i++) {
        const dot = document.createElement('div');
        dot.className = 'dewpoint-dot';
        dot.style.width = DEWPOINT_DOT_SIZE;
        dot.style.height = DEWPOINT_DOT_SIZE;
        dot.style.borderRadius = '50%';
        dot.style.flexShrink = '1';
        dot.style.transition = 'background-color 0.3s ease';
        dotsContainer.appendChild(dot);
      }
      
      wrapper.appendChild(dotsContainer);
      wrapper.appendChild(pill);
      
      // Insert right below the humidity dots wrapper
      const humidityWrapper = document.getElementById('humidity-dots-wrapper');
      if (humidityWrapper && humidityWrapper.parentNode) {
        humidityWrapper.parentNode.insertBefore(wrapper, humidityWrapper.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(wrapper);
      }
    }
    
    // Determine color based on the dewpoint temperature
    let dewpointColor = 'hsl(120, 80%, 40%)'; // Default green if no dewpoint available
    let inactiveColor = 'hsla(120, 80%, 40%, 0.15)';
    
    if (typeof dewpoint === 'number') {
      const activeColor = tempToColor(dewpoint);
      if (activeColor) {
        dewpointColor = activeColor;
        // Parse the color to create inactive version
        const parsed = parseHslString(activeColor);
        if (parsed) {
          const [h, s, l] = parsed;
          inactiveColor = `hsla(${h}, ${s}%, ${l}%, 0.15)`;
        }
      }
    }
    
    // Determine persistent trend arrow for dewpoint dots row
    let trendIconHtml = '';
    if (dewpoint !== null) {
      const dewF = Math.round(dewpoint);
      const dewTrend = getPersistentTrendDirection('weather_trend_dewpoint', dewF);
      let iconClass = '';
      if (dewTrend === 'up') {
        iconClass = "fa-angle-up";
      } else if (dewTrend === 'down') {
        iconClass = "fa-angle-down";
      }

      if (iconClass) {
        trendIconHtml = ` <i class="fa-solid ${iconClass}" style="opacity: 0.8; font-size: 0.8em; vertical-align: middle;"></i>`;
      }
    }
    
    // Update Pill Text
    const pill = document.getElementById('dewpoint-dots-pill');
    if (pill && dewpoint !== null) {
      const dewpointF = Math.round(dewpoint);
      if (displayUnit === 'BOTH') {
        const dewpointC = Math.round((dewpointF - 32) * 5 / 9);
        pill.innerHTML = `<span class="fc-mode-text" style="font-family: 'bold', sans-serif; font-size: inherit; color: inherit;">${dewpointF}${formatSlash()}${dewpointC}°</span> Td${trendIconHtml}`;
      } else {
        const dewpointDisplay = displayUnit === 'C' ? Math.round((dewpointF - 32) * 5 / 9) : dewpointF;
        pill.innerHTML = `<span class="fc-mode-text" style="font-family: 'bold', sans-serif; font-size: inherit; color: inherit;">${dewpointDisplay}°</span> Td${trendIconHtml}`;
      }
      pill.style.color = dewpointColor;
    } else if (pill) {
      pill.innerHTML = `<span class="fc-mode-text" style="font-family: 'bold', sans-serif; font-size: inherit; color: inherit;">--</span> Td`;
      pill.style.color = dewpointColor;
    }
    
    // Update Dots
    const dotsContainer = document.getElementById('dewpoint-dots-container');
    if (dotsContainer && dewpoint !== null) {
      const dots = dotsContainer.children;
      
      // Calculate which dot index corresponds to the current dewpoint
      // Dots represent temperatures from DEWPOINT_MIN_TEMP to DEWPOINT_MAX_TEMP
      const tempRange = DEWPOINT_MAX_TEMP - DEWPOINT_MIN_TEMP;
      const dewpointF = dewpoint;
      
      // Clamp dewpoint to our range
      const clampedDewpoint = Math.max(DEWPOINT_MIN_TEMP, Math.min(DEWPOINT_MAX_TEMP, dewpointF));
      
      // Calculate the dot index (0-based)
      const dewpointPosition = (clampedDewpoint - DEWPOINT_MIN_TEMP) / tempRange;
      const activeDotIndex = Math.round(dewpointPosition * (dots.length - 1));
      
      /* eslint-disable */console.log(...oo_oo(`2266558813_7279_6_7279_99_4`,`Dewpoint: ${Math.round(dewpointF)}°F (dot ${activeDotIndex} of ${dots.length})`));
      
      for (let i = 0; i < dots.length; i++) {
        // Light up dots from the start up to the current dewpoint
        const isActive = i <= activeDotIndex;
        dots[i].style.backgroundColor = isActive ? dewpointColor : inactiveColor;
      }
      
      // Position dewpoint label at the current dewpoint
      if (activeDotIndex >= 0 && activeDotIndex < dots.length) {
        const currentDot = dots[activeDotIndex];
        if (currentDot) {
          const dotRect = currentDot.getBoundingClientRect();
          const containerRect = wrapper.getBoundingClientRect();
          const dotCenter = dotRect.left + dotRect.width / 2;
          const leftPos = ((dotCenter - containerRect.left) / window.innerWidth * 100);
          
          // Position dewpoint label
          if (pill) {
            // Prevent the label from going off-screen at very low (or very high) values
            const pillWidthVw = (pill.getBoundingClientRect().width / window.innerWidth) * 100;
            const safeLeftPos = Math.max((pillWidthVw / 2) + 2, Math.min(100 - (pillWidthVw / 2) - 2, leftPos));
            
            pill.style.left = `${safeLeftPos}vw`;
            pill.style.transform = 'translateX(-50%)';
          }
        }
      }
    } else if (dotsContainer) {
      // No dewpoint data available, show all dots as inactive
      const dots = dotsContainer.children;
      for (let i = 0; i < dots.length; i++) {
        dots[i].style.backgroundColor = inactiveColor;
      }
    }

    // Update the dewpoint progress and text inside grid cell #5 (0 to 100° scale)
    const gridDewpointProgressEl = document.querySelector('.clockGridItem-4 .countdown-progress');
    const gridDewpointTextEl = document.querySelector('.clockGridItem-4 .grid-dewpoint-text');
    const radius = 46;
    const circumference = 2 * Math.PI * radius; // ~289.0265
    
    // Get current temperature color
    const currentTemp = (data?.current?.temp !== undefined) ? data.current.temp : null;
    const tempColor = currentTemp !== null ? tempToColor(currentTemp) : null;
    const finalColor = tempColor || dewpointColor;
    
    if (gridDewpointProgressEl) {
      if (dewpoint !== null) {
        const percent = Math.max(0, Math.min(1, dewpoint / 100));
        const dashOffset = circumference * (1 - percent);
        gridDewpointProgressEl.style.strokeDashoffset = dashOffset;
        if (finalColor) {
          gridDewpointProgressEl.style.stroke = finalColor;
        }
      } else {
        gridDewpointProgressEl.style.strokeDashoffset = circumference;
      }
    }
    
    if (gridDewpointTextEl) {
      if (dewpoint !== null) {
        const dewF = Math.round(dewpoint);
        let displayStr = '';
        const degSuffix = '°';
        if (displayUnit === 'BOTH') {
          const dewC = Math.round((dewF - 32) * 5 / 9);
          displayStr = `${dewF}${formatSlash()}${dewC}${degSuffix}`;
        } else {
          const dewDisplay = displayUnit === 'C' ? Math.round((dewF - 32) * 5 / 9) : dewF;
          displayStr = `${dewDisplay}${degSuffix}`;
        }
        gridDewpointTextEl.innerHTML = `${displayStr}<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Td</span>`;
      } else {
        gridDewpointTextEl.innerHTML = `--<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Td</span>`;
      }
      if (finalColor) {
        gridDewpointTextEl.style.color = finalColor;
      }
    }
  }

  // Create and update the sun position dots row (72 dots representing 24 hours)
  function updateSunDotsRow(data) {
    const wrapperId = 'sun-dots-wrapper';
    let wrapper = document.getElementById(wrapperId);
    
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = wrapperId;
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.width = '100vw';
      wrapper.style.margin = `${SUN_MARGIN_TOP} 0 ${SUN_MARGIN_BOTTOM}`;
      wrapper.style.padding = '0';
      wrapper.style.boxSizing = 'border-box';
      
      // The Dots Container (no pill for this row)
      const dotsContainer = document.createElement('div');
      dotsContainer.id = 'sun-dots-container';
      dotsContainer.style.display = 'flex';
      dotsContainer.style.justifyContent = 'center';
      dotsContainer.style.alignItems = 'center';
      dotsContainer.style.gap = SUN_DOT_GAP;
      dotsContainer.style.flexWrap = 'nowrap';
      
      for (let i = 0; i < SUN_DOTS_COUNT; i++) {
        const dot = document.createElement('div');
        dot.className = 'sun-position-dot';
        dot.style.width = SUN_DOT_SIZE;
        dot.style.height = SUN_DOT_SIZE;
        dot.style.borderRadius = '50%';
        dot.style.flexShrink = '1';
        dot.style.transition = 'all 0.5s ease';
        dotsContainer.appendChild(dot);
      }
      
      wrapper.appendChild(dotsContainer);
      
      // Insert right below the dewpoint dots wrapper
      const dewpointWrapper = document.getElementById('dewpoint-dots-wrapper');
      if (dewpointWrapper && dewpointWrapper.parentNode) {
        dewpointWrapper.parentNode.insertBefore(wrapper, dewpointWrapper.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(wrapper);
      }
    }
    
    // Get sunrise/sunset times (Unix timestamps)
    const today = data?.daily?.[0];
    const sunrise = today?.sunrise;
    const sunset = today?.sunset;
    
    if (typeof sunrise !== 'number' || typeof sunset !== 'number') {
      /* eslint-disable */console.log(...oo_oo(`2266558813_7414_6_7414_66_4`,'Sun position: sunrise/sunset data unavailable'));
      return;
    }
    
    // Calculate current time position
    const now = Date.now() / 1000; // Current time in Unix seconds
    
    // Get midnight of current day in local time
    const nowDate = new Date();
    const midnightToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime() / 1000;
    const midnightTomorrow = midnightToday + 86400; // 24 hours later
    
    // Calculate which dot represents the current time (0-71)
    const secondsSinceMidnight = now - midnightToday;
    const currentDotIndex = Math.floor((secondsSinceMidnight / 86400) * SUN_DOTS_COUNT);
    
    // Define colors (gold yellow for day, dim for night)
    const dayColor = 'hsl(45, 100%, 50%)';     // Gold yellow (from 70s range)
    const nightColor = 'hsla(45, 100%, 50%, 0.15)'; // Dim version
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_7434_4_7434_173_4`,`Sun position: sunrise=${new Date(sunrise*1000).toLocaleTimeString()}, sunset=${new Date(sunset*1000).toLocaleTimeString()}, current dot=${currentDotIndex}`));
    
    // Calculate dot indices for sunrise and sunset
    const sunriseDotIndex = Math.floor(((sunrise - midnightToday) / 86400) * SUN_DOTS_COUNT);
    const sunsetDotIndex = Math.floor(((sunset - midnightToday) / 86400) * SUN_DOTS_COUNT);
    
    // Update Dots
    const dotsContainer = document.getElementById('sun-dots-container');
    if (dotsContainer) {
      const dots = dotsContainer.children;
      
      for (let i = 0; i < dots.length; i++) {
        // Calculate the time this dot represents (in Unix seconds)
        const dotTime = midnightToday + (i / SUN_DOTS_COUNT) * 86400;
        
        // Determine if this dot is during daytime (between sunrise and sunset)
        const isDaytime = dotTime >= sunrise && dotTime < sunset;
        
        // Apply color based on day/night
        dots[i].style.backgroundColor = isDaytime ? dayColor : nightColor;
        
        // Make the current dot 250% bigger
        if (i === currentDotIndex) {
          dots[i].style.width = `calc(${SUN_DOT_SIZE} * ${SUN_CURRENT_DOT_SCALE})`;
          dots[i].style.height = `calc(${SUN_DOT_SIZE} * ${SUN_CURRENT_DOT_SCALE})`;
          dots[i].style.zIndex = '10'; // Ensure it's on top
        } else {
          dots[i].style.width = SUN_DOT_SIZE;
          dots[i].style.height = SUN_DOT_SIZE;
          dots[i].style.zIndex = '1';
        }
      }
      
      // Add or update time labels for sunrise and sunset
      let sunriseLabel = document.getElementById('sunrise-time-label');
      let sunsetLabel = document.getElementById('sunset-time-label');
      
      if (!sunriseLabel) {
        sunriseLabel = document.createElement('div');
        sunriseLabel.id = 'sunrise-time-label';
        sunriseLabel.style.position = 'absolute';
        sunriseLabel.style.fontSize = SUN_LABEL_FONT_SIZE;
        sunriseLabel.style.fontFamily = "'bold', sans-serif";
        sunriseLabel.style.fontWeight = '300'; // EDITABLE: Light font weight for am/pm
        sunriseLabel.style.color = dayColor;
        sunriseLabel.style.textShadow = '0 0.2vw 0.4vw rgba(0, 0, 0, 0.5)'; // EDITABLE: Shadow
        sunriseLabel.style.pointerEvents = 'none';
        sunriseLabel.style.whiteSpace = 'nowrap';
        sunriseLabel.style.zIndex = '5';
        wrapper.style.position = 'relative'; // Ensure wrapper is positioning context
        wrapper.appendChild(sunriseLabel);
      }
      
      if (!sunsetLabel) {
        sunsetLabel = document.createElement('div');
        sunsetLabel.id = 'sunset-time-label';
        sunsetLabel.style.position = 'absolute';
        sunsetLabel.style.fontSize = SUN_LABEL_FONT_SIZE;
        sunsetLabel.style.fontFamily = "'bold', sans-serif";
        sunsetLabel.style.fontWeight = '300'; // EDITABLE: Light font weight for am/pm
        sunsetLabel.style.color = dayColor;
        sunsetLabel.style.textShadow = '0 0.2vw 0.4vw rgba(0, 0, 0, 0.5)'; // EDITABLE: Shadow
        sunsetLabel.style.pointerEvents = 'none';
        sunsetLabel.style.whiteSpace = 'nowrap';
        sunsetLabel.style.zIndex = '5';
        wrapper.appendChild(sunsetLabel);
      }
      
      // Format and position sunrise label
      if (sunrise === 0) {
        if (sunriseLabel) sunriseLabel.style.display = 'none';
      } else {
        sunriseLabel.style.display = 'block';
        const sunriseTime = new Date(sunrise * 1000);
        let sunriseFormatted = sunriseTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
        // Wrap am/pm in lighter span
        sunriseFormatted = sunriseFormatted.replace(/(am|pm)$/, '<span style="font-family: light !important; opacity: 0.8 !important; color: inherit !important; font-size: inherit !important;">$1</span>');
        sunriseLabel.innerHTML = sunriseFormatted;
        
        /* eslint-disable */console.log(...oo_oo(`2266558813_7513_8_7513_98_4`,`Creating sunrise label: ${sunriseFormatted} at dot index ${sunriseDotIndex}`));
        
        // Position sunrise label CENTERED UNDER the first bright dot (transition dot)
        const safeDotIndex = Math.max(0, Math.min(SUN_DOTS_COUNT - 1, sunriseDotIndex));
        const firstBrightDot = dots[safeDotIndex];
        if (firstBrightDot) {
          const dotRect = firstBrightDot.getBoundingClientRect();
          const containerRect = wrapper.getBoundingClientRect();
          const dotCenter = dotRect.left + dotRect.width / 2;
          const leftPos = ((dotCenter - containerRect.left) / window.innerWidth * 100);
          // Prevent label from bleeding off-screen
          const labelWidthVw = (sunriseLabel.getBoundingClientRect().width / window.innerWidth) * 100;
          const safeLeftPos = Math.max((labelWidthVw / 2) + 2, Math.min(100 - (labelWidthVw / 2) - 2, leftPos));
          
          sunriseLabel.style.left = `${safeLeftPos}vw`;
          sunriseLabel.style.right = 'auto';
          sunriseLabel.style.top = `calc(100% + ${SUN_LABEL_OFFSET_Y})`;
          sunriseLabel.style.transform = 'translateX(-50%)';
          /* eslint-disable */console.log(...oo_oo(`2266558813_7531_10_7531_90_4`,`Sunrise label positioned centered under dot at left: ${leftPos}vw`));
        }
      }
      
      // Format and position sunset label
      if (sunset === 0) {
        if (sunsetLabel) sunsetLabel.style.display = 'none';
      } else {
        sunsetLabel.style.display = 'block';
        const sunsetTime = new Date(sunset * 1000);
        let sunsetFormatted = sunsetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
        // Wrap am/pm in lighter span
        sunsetFormatted = sunsetFormatted.replace(/(am|pm)$/, '<span style="font-family: light !important; opacity: 0.8 !important; color: inherit !important; font-size: inherit !important;">$1</span>');
        sunsetLabel.innerHTML = sunsetFormatted;
        
        /* eslint-disable */console.log(...oo_oo(`2266558813_7546_8_7546_95_4`,`Creating sunset label: ${sunsetFormatted} at dot index ${sunsetDotIndex}`));
        
        // Position sunset label CENTERED UNDER the last bright dot (transition dot)
        const safeDotIndex = Math.max(0, Math.min(SUN_DOTS_COUNT - 1, sunsetDotIndex));
        const lastBrightDot = dots[safeDotIndex];
        if (lastBrightDot) {
          const dotRect = lastBrightDot.getBoundingClientRect();
          const containerRect = wrapper.getBoundingClientRect();
          const dotCenter = dotRect.left + dotRect.width / 2;
          const leftPos = ((dotCenter - containerRect.left) / window.innerWidth * 100);
          // Prevent label from bleeding off-screen
          const labelWidthVw = (sunsetLabel.getBoundingClientRect().width / window.innerWidth) * 100;
          const safeLeftPos = Math.max((labelWidthVw / 2) + 2, Math.min(100 - (labelWidthVw / 2) - 2, leftPos));
          
          sunsetLabel.style.left = `${safeLeftPos}vw`;
          sunsetLabel.style.right = 'auto';
          sunsetLabel.style.top = `calc(100% + ${SUN_LABEL_OFFSET_Y})`;
          sunsetLabel.style.transform = 'translateX(-50%)';
          /* eslint-disable */console.log(...oo_oo(`2266558813_7564_10_7564_89_4`,`Sunset label positioned centered under dot at left: ${leftPos}vw`));
        }
      }
    }
  }

  // Create and update the moon rise/set dots row (72 dots representing 24 hours)
  function updateMoonDotsRow(data) {
    const wrapperId = 'moon-dots-wrapper';
    let wrapper = document.getElementById(wrapperId);
    
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = wrapperId;
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.width = '100vw';
      wrapper.style.margin = `${MOON_MARGIN_TOP} 0 ${MOON_MARGIN_BOTTOM}`;
      wrapper.style.padding = '0';
      wrapper.style.boxSizing = 'border-box';
      
      // The Dots Container (no pill for this row)
      const dotsContainer = document.createElement('div');
      dotsContainer.id = 'moon-dots-container';
      dotsContainer.style.display = 'flex';
      dotsContainer.style.justifyContent = 'center';
      dotsContainer.style.alignItems = 'center';
      dotsContainer.style.gap = MOON_DOT_GAP;
      dotsContainer.style.flexWrap = 'nowrap';
      
      for (let i = 0; i < MOON_DOTS_COUNT; i++) {
        const dot = document.createElement('div');
        dot.className = 'moon-position-dot';
        dot.style.width = MOON_DOT_SIZE;
        dot.style.height = MOON_DOT_SIZE;
        dot.style.borderRadius = '50%';
        dot.style.flexShrink = '1';
        dot.style.transition = 'all 0.5s ease';
        dotsContainer.appendChild(dot);
      }
      
      wrapper.appendChild(dotsContainer);
      
      // Insert right below the sun dots wrapper
      const sunWrapper = document.getElementById('sun-dots-wrapper');
      if (sunWrapper && sunWrapper.parentNode) {
        sunWrapper.parentNode.insertBefore(wrapper, sunWrapper.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(wrapper);
      }
    }
    
    // Get moonrise/moonset times (Unix timestamps)
    const today = data?.daily?.[0];
    const moonrise = today?.moonrise;
    const moonset = today?.moonset;
    
    if (typeof moonrise !== 'number' || typeof moonset !== 'number') {
      /* eslint-disable */console.log(...oo_oo(`2266558813_7623_6_7623_69_4`,'Moon position: moonrise/moonset data unavailable'));
      return;
    }
    
    // Calculate current time position
    const now = Date.now() / 1000; // Current time in Unix seconds
    
    // Get midnight of current day in local time
    const nowDate = new Date();
    const midnightToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime() / 1000;
    const midnightTomorrow = midnightToday + 86400; // 24 hours later
    
    // Calculate which dot represents the current time (0-71)
    const secondsSinceMidnight = now - midnightToday;
    const currentDotIndex = Math.floor((secondsSinceMidnight / 86400) * MOON_DOTS_COUNT);
    
    // Define colors (light blue from wind gauge for moon risen, dim for moon down)
    const moonUpColor = 'hsl(195, 100%, 70%)';      // Solid light blue (from wind gauge)
    const moonDownColor = 'hsla(195, 100%, 50%, 0.15)'; // Dim light blue
    const currentMoonColor = 'hsl(195, 100%, 85%)'; // Brighter blue for current dot
    
    // Determine if moon is currently up
    let isMoonUp = false;
    if (moonrise < moonset) {
      // Moonrise is before moonset on the same day
      isMoonUp = now >= moonrise && now < moonset;
    } else {
      // Moonrise is after moonset (moon rises late night, sets next morning)
      isMoonUp = now >= moonrise || now < moonset;
    }
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_7654_4_7654_215_4`,`Moon position: moonrise=${new Date(moonrise*1000).toLocaleTimeString()}, moonset=${new Date(moonset*1000).toLocaleTimeString()}, current dot=${currentDotIndex}, moon is ${isMoonUp ? 'UP' : 'DOWN'}`));
    
    // Calculate dot indices for moonrise and moonset
    const moonriseDotIndex = Math.floor(((moonrise - midnightToday) / 86400) * MOON_DOTS_COUNT);
    const moonsetDotIndex = Math.floor(((moonset - midnightToday) / 86400) * MOON_DOTS_COUNT);
    
    // Update Dots
    const dotsContainer = document.getElementById('moon-dots-container');
    if (dotsContainer) {
      const dots = dotsContainer.children;
      
      for (let i = 0; i < dots.length; i++) {
        // Calculate the time this dot represents (in Unix seconds)
        const dotTime = midnightToday + (i / MOON_DOTS_COUNT) * 86400;
        
        // Determine if moon is up at this time
        let isMoonUpAtThisTime = false;
        if (moonrise < moonset) {
          // Moonrise is before moonset on the same day
          isMoonUpAtThisTime = dotTime >= moonrise && dotTime < moonset;
        } else {
          // Moonrise is after moonset (moon rises late night, sets next morning)
          isMoonUpAtThisTime = dotTime >= moonrise || dotTime < moonset;
        }
        
        // Apply color based on moon up/down
        dots[i].style.backgroundColor = isMoonUpAtThisTime ? moonUpColor : moonDownColor;
        
        // Make the current dot 250% bigger (always, regardless of moon up/down)
        if (i === currentDotIndex) {
          dots[i].style.width = `calc(${MOON_DOT_SIZE} * ${MOON_CURRENT_DOT_SCALE})`;
          dots[i].style.height = `calc(${MOON_DOT_SIZE} * ${MOON_CURRENT_DOT_SCALE})`;
          // Use brighter blue if moon is up, otherwise keep the dim color
          if (isMoonUp) {
            dots[i].style.backgroundColor = currentMoonColor; // Brighter blue for current dot when moon is up
          }
          dots[i].style.zIndex = '10'; // Ensure it's on top
        } else {
          dots[i].style.width = MOON_DOT_SIZE;
          dots[i].style.height = MOON_DOT_SIZE;
          dots[i].style.zIndex = '1';
        }
      }
      
      // Add or update time labels for moonrise and moonset
      let moonriseLabel = document.getElementById('moonrise-time-label');
      let moonsetLabel = document.getElementById('moonset-time-label');
      
      if (!moonriseLabel) {
        moonriseLabel = document.createElement('div');
        moonriseLabel.id = 'moonrise-time-label';
        moonriseLabel.style.position = 'absolute';
        moonriseLabel.style.fontSize = MOON_LABEL_FONT_SIZE;
        moonriseLabel.style.fontFamily = "'bold', sans-serif";
        moonriseLabel.style.fontWeight = '300'; // EDITABLE: Light font weight for am/pm
        moonriseLabel.style.color = moonUpColor;
        moonriseLabel.style.textShadow = '0 0.2vw 0.4vw rgba(0, 0, 0, 0.5)'; // EDITABLE: Shadow
        moonriseLabel.style.pointerEvents = 'none';
        moonriseLabel.style.whiteSpace = 'nowrap';
        moonriseLabel.style.zIndex = '5';
        wrapper.style.position = 'relative'; // Ensure wrapper is positioning context
        wrapper.appendChild(moonriseLabel);
      }
      
      if (!moonsetLabel) {
        moonsetLabel = document.createElement('div');
        moonsetLabel.id = 'moonset-time-label';
        moonsetLabel.style.position = 'absolute';
        moonsetLabel.style.fontSize = MOON_LABEL_FONT_SIZE;
        moonsetLabel.style.fontFamily = "'bold', sans-serif";
        moonsetLabel.style.fontWeight = '300'; // EDITABLE: Light font weight for am/pm
        moonsetLabel.style.color = moonUpColor;
        moonsetLabel.style.textShadow = '0 0.2vw 0.4vw rgba(0, 0, 0, 0.5)'; // EDITABLE: Shadow
        moonsetLabel.style.pointerEvents = 'none';
        moonsetLabel.style.whiteSpace = 'nowrap';
        moonsetLabel.style.zIndex = '5';
        wrapper.appendChild(moonsetLabel);
      }
      
      // Format and position moonrise label
      {
        if (moonriseLabel) moonriseLabel.style.display = 'block';
        const moonriseTime = new Date(moonrise * 1000);
        let moonriseFormatted = moonriseTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
        // Wrap am/pm in lighter span
        moonriseFormatted = moonriseFormatted.replace(/(am|pm)$/, '<span style="font-family: light !important; opacity: 0.8 !important; color: inherit !important; font-size: inherit !important;">$1</span>');
        if (moonrise === 0) moonriseFormatted = '12:00 <span style="font-family: light !important; opacity: 0.8 !important; color: inherit !important; font-size: inherit !important;">am</span>';
        moonriseLabel.innerHTML = moonriseFormatted;
        
        /* eslint-disable */console.log(...oo_oo(`2266558813_7743_8_7743_101_4`,`Creating moonrise label: ${moonriseFormatted} at dot index ${moonriseDotIndex}`));
        
        // Position moonrise label CENTERED UNDER the first bright dot (transition dot)
        const safeDotIndex = moonrise === 0 ? 0 : Math.max(0, Math.min(MOON_DOTS_COUNT - 1, moonriseDotIndex));
        const firstBrightDot = dots[safeDotIndex];
        if (firstBrightDot) {
          const dotRect = firstBrightDot.getBoundingClientRect();
          const containerRect = wrapper.getBoundingClientRect();
          const dotCenter = dotRect.left + dotRect.width / 2;
          const leftPos = ((dotCenter - containerRect.left) / window.innerWidth * 100);
          // Prevent label from bleeding off-screen
          const labelWidthVw = (moonriseLabel.getBoundingClientRect().width / window.innerWidth) * 100;
          const safeLeftPos = Math.max((labelWidthVw / 2) + 2, Math.min(100 - (labelWidthVw / 2) - 2, leftPos));
          
          moonriseLabel.style.left = `${safeLeftPos}vw`;
          moonriseLabel.style.right = 'auto';
          moonriseLabel.style.top = `calc(100% + ${MOON_LABEL_OFFSET_Y})`;
          moonriseLabel.style.transform = 'translateX(-50%)';
          /* eslint-disable */console.log(...oo_oo(`2266558813_7761_10_7761_91_4`,`Moonrise label positioned centered under dot at left: ${leftPos}vw`));
        }
      }
      
      // Format and position moonset label
      {
        if (moonsetLabel) moonsetLabel.style.display = 'block';
        const moonsetTime = new Date(moonset * 1000);
        let moonsetFormatted = moonsetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
        // Wrap am/pm in lighter span
        moonsetFormatted = moonsetFormatted.replace(/(am|pm)$/, '<span style="font-family: light !important; opacity: 0.8 !important; color: inherit !important; font-size: inherit !important;">$1</span>');
        if (moonset === 0) moonsetFormatted = '11:59 <span style="font-family: light !important; opacity: 0.8 !important; color: inherit !important; font-size: inherit !important;">pm</span>';
        moonsetLabel.innerHTML = moonsetFormatted;
        
        /* eslint-disable */console.log(...oo_oo(`2266558813_7775_8_7775_98_4`,`Creating moonset label: ${moonsetFormatted} at dot index ${moonsetDotIndex}`));
        
        // Position moonset label CENTERED UNDER the last bright dot (transition dot)
        const safeDotIndex = moonset === 0 ? MOON_DOTS_COUNT - 1 : Math.max(0, Math.min(MOON_DOTS_COUNT - 1, moonsetDotIndex));
        const lastBrightDot = dots[safeDotIndex];
        if (lastBrightDot) {
          const dotRect = lastBrightDot.getBoundingClientRect();
          const containerRect = wrapper.getBoundingClientRect();
          const dotCenter = dotRect.left + dotRect.width / 2;
          const leftPos = ((dotCenter - containerRect.left) / window.innerWidth * 100);
          // Prevent label from bleeding off-screen
          const labelWidthVw = (moonsetLabel.getBoundingClientRect().width / window.innerWidth) * 100;
          const safeLeftPos = Math.max((labelWidthVw / 2) + 2, Math.min(100 - (labelWidthVw / 2) - 2, leftPos));
          
          moonsetLabel.style.left = `${safeLeftPos}vw`;
          moonsetLabel.style.right = 'auto';
          moonsetLabel.style.top = `calc(100% + ${MOON_LABEL_OFFSET_Y})`;
          moonsetLabel.style.transform = 'translateX(-50%)';
          /* eslint-disable */console.log(...oo_oo(`2266558813_7793_10_7793_90_4`,`Moonset label positioned centered under dot at left: ${leftPos}vw`));
        }
      }
    }
  }

  // update a small "last-updated" indicator in the DOM (creates it if missing)
  function updateLastUpdated(date) {
    const container = document.querySelector('main') || document.body;
    const id = 'weather-last-updated';
    let span = document.getElementById(id);
    
    // Format date to have lowercase am/pm and NO SECONDS
    const text = date ? date.toLocaleString('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).replace(' PM', ' pm').replace(' AM', ' am') : '';
    
    // Safely grab the timestamp injected by Vite during the build process
    const appBuildDate = typeof __APP_BUILD_DATE__ !== 'undefined' ? __APP_BUILD_DATE__ : 'Local Dev Mode';

    // Render or update the Location Switcher directly below Earth image / spacer
    updateLocationSwitcherDisplay();

    const mainContainer = document.querySelector('main.content') || document.querySelector('main') || document.body;

    // Position F/C format buttons directly BELOW location switcher in mainContainer
    const btnContainer = document.getElementById('temp-format-buttons');
    const locSwitcher = document.getElementById('weather-location-switcher');
    if (btnContainer && locSwitcher && locSwitcher.parentNode === mainContainer) {
      if (locSwitcher.nextSibling !== btnContainer) {
        mainContainer.insertBefore(btnContainer, locSwitcher.nextSibling);
      }
    } else if (btnContainer && btnContainer.parentNode !== mainContainer) {
      mainContainer.appendChild(btnContainer);
    }

    // Render or update the Version indicator directly BELOW format buttons in mainContainer
    updateVersionDisplay();
    const versionEl = document.getElementById('weather-version');
    const versionAnchor = (btnContainer && btnContainer.parentNode === mainContainer) ? btnContainer :
                          ((locSwitcher && locSwitcher.parentNode === mainContainer) ? locSwitcher : null);
    if (versionEl && versionAnchor && versionAnchor.parentNode === mainContainer) {
      if (versionAnchor.nextSibling !== versionEl) {
        mainContainer.insertBefore(versionEl, versionAnchor.nextSibling);
      }
    } else if (versionEl && versionEl.parentNode !== mainContainer) {
      mainContainer.appendChild(versionEl);
    }

    if (span) {
      span.innerHTML = `Weather last updated: ${text}<br>App last updated: ${appBuildDate}<br>Radar data from RainViewer • Weather data from OpenWeather`;
      span.style.fontSize = '1.6875vw';
      span.style.color = 'white';
      span.style.opacity = '1';
      span.style.marginTop = '0vw';
    } else {
      span = document.createElement('div');
      span.id = id;
      span.innerHTML = `Weather last updated: ${text}<br>App last updated: ${appBuildDate}<br>Radar data from RainViewer • Weather data from OpenWeather`;
      span.style.position = 'relative'; // Normal document flow
      span.style.margin = `0 auto 0`;
      span.style.paddingBottom = '4vw';
      span.style.width = '100%';
      span.style.fontSize = '1.6875vw'; // 75% of 2.25vw
      span.style.fontFamily = "'light', sans-serif";
      span.style.color = 'white';
      span.style.opacity = '0'; // Start invisible to prevent initialization flash
      span.style.transition = 'opacity 1s ease'; // Smooth fade in
      span.style.lineHeight = '1.5';
      span.style.textAlign = 'center';
      span.style.pointerEvents = 'none';
      span.style.zIndex = '10';
    }

    // Position #weather-last-updated at the VERY BOTTOM below version / format buttons / location switcher in mainContainer
    const bottomTarget = (versionEl && versionEl.parentNode === mainContainer) ? versionEl :
                         ((btnContainer && btnContainer.parentNode === mainContainer) ? btnContainer :
                         ((locSwitcher && locSwitcher.parentNode === mainContainer) ? locSwitcher : null));
    if (bottomTarget && bottomTarget.parentNode === mainContainer) {
      if (bottomTarget.nextSibling !== span) {
        mainContainer.insertBefore(span, bottomTarget.nextSibling);
      }
    } else if (span.parentNode !== mainContainer) {
      mainContainer.appendChild(span);
    }
  }

  // Render and update location switcher items (Tulsa, Traverse City, etc.) above Last Updated text
  function updateLocationSwitcherDisplay() {
    const id = 'weather-location-switcher';
    let container = document.getElementById(id);
    const lastUpdatedEl = document.getElementById('weather-last-updated');
    const mainContainer = document.querySelector('main.content') || document.querySelector('main') || document.body;

    if (!container) {
      container = document.createElement('div');
      container.id = id;
      container.style.position = 'relative';
      container.style.width = '100%';
      container.style.textAlign = 'center';
      container.style.zIndex = '15';
      container.style.opacity = '1';
      container.style.transition = 'opacity 1s ease';
    } else {
      container.style.opacity = '1';
    }

    // Determine active location font family for 100-109 temperature range
    const tempVal = lastWeatherData?.current?.temp;
    const is100s = typeof tempVal === 'number' && tempVal >= 100 && tempVal < 110;
    const activeLocationFont = is100s ? "'medium', sans-serif" : LOCATION_FONT_FAMILY;

    // Set CSS custom properties for CSS accessibility
    document.documentElement.style.setProperty('--location-group-margin-top', LOCATION_GROUP_MARGIN_TOP);
    document.documentElement.style.setProperty('--location-group-margin-bottom', LOCATION_GROUP_MARGIN_BOTTOM);
    document.documentElement.style.setProperty('--location-item-margin-top', LOCATION_ITEM_MARGIN_TOP);
    document.documentElement.style.setProperty('--location-item-margin-bottom', LOCATION_ITEM_MARGIN_BOTTOM);
    document.documentElement.style.setProperty('--location-typesize', LOCATION_TYPESIZE);
    document.documentElement.style.setProperty('--location-letter-spacing', LOCATION_LETTER_SPACING);
    document.documentElement.style.setProperty('--location-font-family', activeLocationFont);
    document.documentElement.style.setProperty('--location-active-color', LOCATION_ACTIVE_COLOR);
    document.documentElement.style.setProperty('--location-inactive-color', LOCATION_INACTIVE_COLOR);

    // Ensure container is inserted directly in mainContainer, below the celestial row spacer (#sun-image-spacer) or #suns-row-wrapper
    const sunSpacer = document.getElementById('sun-image-spacer');
    const sunsRow = document.getElementById('suns-row-wrapper');
    const singleSunCol = document.querySelector('.sun-column.single-mode');
    const earthSpacer = document.getElementById('earth-image-spacer');
    const earthContainer = document.getElementById('earth-image-container');
    const worldClocks = document.getElementById('world-clocks-row-wrapper');

    let rowAnchor = null;
    if (sunSpacer && sunSpacer.parentNode === mainContainer) {
      rowAnchor = sunSpacer;
    } else if (sunsRow && sunsRow.parentNode === mainContainer) {
      rowAnchor = sunsRow;
    } else if (singleSunCol && singleSunCol.parentNode === mainContainer) {
      rowAnchor = singleSunCol;
    } else if (earthSpacer && earthSpacer.parentNode === mainContainer) {
      rowAnchor = earthSpacer;
    } else if (earthContainer && earthContainer.parentNode === mainContainer) {
      rowAnchor = earthContainer;
    } else if (worldClocks && worldClocks.parentNode === mainContainer) {
      rowAnchor = worldClocks;
    }

    if (rowAnchor && rowAnchor.parentNode === mainContainer) {
      if (rowAnchor.nextSibling !== container) {
        mainContainer.insertBefore(container, rowAnchor.nextSibling);
      }
    } else if (container.parentNode !== mainContainer) {
      mainContainer.appendChild(container);
    }

    container.style.marginTop = LOCATION_GROUP_MARGIN_TOP;
    container.style.marginBottom = LOCATION_GROUP_MARGIN_BOTTOM;

    // Clear and build location items for high future-proof flexibility
    container.innerHTML = '';
    LOCATION_SWITCHER_CONFIG.forEach(loc => {
      const cityEl = document.createElement('div');
      cityEl.className = 'location-switcher-item';
      cityEl.textContent = loc.name;

      // Check if location matches current lat/lon
      const isActive = Math.abs(LAT - loc.lat) < 0.1 && Math.abs(LON - loc.lon) < 0.1;

      cityEl.style.fontSize = LOCATION_TYPESIZE;
      cityEl.style.fontFamily = activeLocationFont;
      cityEl.style.letterSpacing = LOCATION_LETTER_SPACING;
      cityEl.style.marginTop = LOCATION_ITEM_MARGIN_TOP;
      cityEl.style.marginBottom = LOCATION_ITEM_MARGIN_BOTTOM;
      cityEl.style.cursor = 'pointer';
      cityEl.style.transition = 'all 0.25s ease';
      cityEl.style.color = isActive ? LOCATION_ACTIVE_COLOR : LOCATION_INACTIVE_COLOR;
      cityEl.style.opacity = isActive ? LOCATION_ACTIVE_OPACITY : LOCATION_INACTIVE_OPACITY;

      cityEl.addEventListener('mouseenter', () => {
        const currentlyActive = Math.abs(LAT - loc.lat) < 0.1 && Math.abs(LON - loc.lon) < 0.1;
        if (!currentlyActive) {
          cityEl.style.opacity = LOCATION_HOVER_OPACITY;
          cityEl.style.color = 'white';
        }
      });

      cityEl.addEventListener('mouseleave', () => {
        const currentlyActive = Math.abs(LAT - loc.lat) < 0.1 && Math.abs(LON - loc.lon) < 0.1;
        if (!currentlyActive) {
          cityEl.style.opacity = LOCATION_INACTIVE_OPACITY;
          cityEl.style.color = LOCATION_INACTIVE_COLOR;
        }
      });

      cityEl.addEventListener('click', () => {
        /* eslint-disable */console.log(...oo_oo(`2266558813_7963_8_7963_85_4`,`📍 Switching location to: ${loc.name} (${loc.lat}, ${loc.lon})`));
        LAT = loc.lat;
        LON = loc.lon;
        getLocalWeather(); // Re-fetch weather data & update display
      });

      container.appendChild(cityEl);
    });
  }

  // Helper to render and update the passive version number indicator (positioned between F/C and Last Updated)
  function updateVersionDisplay(temp = null) {
    const id = 'weather-version';
    let el = document.getElementById(id);
    const mainContainer = document.querySelector('main') || document.body;

    const isMobile = window.innerWidth <= 767;
    const versionFontSize = isMobile ? VERSION_FONT_SIZE_MOBILE : VERSION_FONT_SIZE_DESKTOP;
    const versionMarginTop = isMobile ? VERSION_MARGIN_TOP_MOBILE : VERSION_MARGIN_TOP_DESKTOP;
    const versionMarginBottom = isMobile ? VERSION_MARGIN_BOTTOM_MOBILE : VERSION_MARGIN_BOTTOM_DESKTOP;
    const versionLetterSpacing = isMobile ? VERSION_LETTER_SPACING_MOBILE : VERSION_LETTER_SPACING_DESKTOP;

    // Set CSS custom properties on documentElement for styling & JCV responsiveness
    document.documentElement.style.setProperty('--weather-version-font-size-desktop', VERSION_FONT_SIZE_DESKTOP);
    document.documentElement.style.setProperty('--weather-version-font-size-mobile', VERSION_FONT_SIZE_MOBILE);
    document.documentElement.style.setProperty('--weather-version-margin-top-desktop', VERSION_MARGIN_TOP_DESKTOP);
    document.documentElement.style.setProperty('--weather-version-margin-top-mobile', VERSION_MARGIN_TOP_MOBILE);
    document.documentElement.style.setProperty('--weather-version-margin-bottom-desktop', VERSION_MARGIN_BOTTOM_DESKTOP);
    document.documentElement.style.setProperty('--weather-version-margin-bottom-mobile', VERSION_MARGIN_BOTTOM_MOBILE);
    document.documentElement.style.setProperty('--weather-version-letter-spacing-desktop', VERSION_LETTER_SPACING_DESKTOP);
    document.documentElement.style.setProperty('--weather-version-letter-spacing-mobile', VERSION_LETTER_SPACING_MOBILE);
    document.documentElement.style.setProperty('--weather-version-font-family', VERSION_FONT_FAMILY);

    // Determine current temperature color
    let tempVal = (typeof temp === 'number' && !Number.isNaN(temp)) ? temp : (lastWeatherData?.current?.temp ?? currentTempForDots);
    if (typeof tempVal !== 'number' || Number.isNaN(tempVal)) {
      try {
        const stored = localStorage.getItem('weather_last_temp_raw');
        if (stored !== null) {
          const parsed = parseFloat(stored);
          if (!Number.isNaN(parsed)) tempVal = parsed;
        }
      } catch (e) {}
    }

    let color = VERSION_COLOR_OVERRIDE;
    if (!color) {
      if (typeof tempVal === 'number' && !Number.isNaN(tempVal)) {
        color = tempToColor(tempVal);
      } else {
        const rootColor = document.documentElement.style.getPropertyValue('--temp-color');
        if (rootColor && rootColor.trim() !== '') {
          color = rootColor.trim();
        } else {
          color = 'white';
        }
      }
    }
    document.documentElement.style.setProperty('--weather-version-color', color);

    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'weather-version';
      el.style.position = 'relative';
      el.style.width = '100%';
      el.style.textAlign = 'center';
      el.style.zIndex = '15';
      el.style.pointerEvents = 'none';
      el.style.transition = 'color 0.5s ease, opacity 1s ease';
    }

    el.textContent = `${VERSION_PREFIX}${VERSION_NUMBER}`;
    if (typeof document !== 'undefined') {
      document.title = `Weather ${VERSION_NUMBER}`;
    }
    el.style.fontFamily = VERSION_FONT_FAMILY;
    el.style.fontSize = versionFontSize;
    el.style.letterSpacing = versionLetterSpacing;
    el.style.marginTop = versionMarginTop;
    el.style.marginBottom = versionMarginBottom;
    el.style.color = color;
    el.style.opacity = VERSION_OPACITY;

    // Position correctly in DOM: after #temp-format-buttons (or #weather-location-switcher) in mainContainer
    const btnContainer = document.getElementById('temp-format-buttons');
    const locSwitcher = document.getElementById('weather-location-switcher');
    const lastUpdatedEl = document.getElementById('weather-last-updated');
    const anchor = (btnContainer && btnContainer.parentNode === mainContainer) ? btnContainer :
                   ((locSwitcher && locSwitcher.parentNode === mainContainer) ? locSwitcher : null);

    if (anchor && anchor.parentNode === mainContainer) {
      if (anchor.nextSibling !== el) {
        mainContainer.insertBefore(el, anchor.nextSibling);
      }
    } else if (lastUpdatedEl && lastUpdatedEl.parentNode === mainContainer) {
      if (lastUpdatedEl.previousSibling !== el) {
        mainContainer.insertBefore(el, lastUpdatedEl);
      }
    } else if (el.parentNode !== mainContainer) {
      mainContainer.appendChild(el);
    }
  }

  // Helper to persistently record missing assets to a To-Do list
  function recordMissingAsset(imgPath) {
    let missing = [];
    try {
      const stored = localStorage.getItem('missing_assets_todo');
      if (stored) missing = JSON.parse(stored);
    } catch (e) {}
    
    if (!missing.includes(imgPath)) {
      missing.push(imgPath);
      localStorage.setItem('missing_assets_todo', JSON.stringify(missing));
      console.warn(`%c✨ NEW TO-DO ADDED: '${imgPath}' is missing!`, 'color: #ffaa00; font-size: 13px; font-weight: bold;');
    }
    
    updateMissingAssetsDisplay();
  }

  // Display the To-Do list at the very bottom of the page (tap to clear)
  function updateMissingAssetsDisplay() {
    const id = 'weather-missing-assets';
    let el = document.getElementById(id);
    let missing = [];
    try {
      const stored = localStorage.getItem('missing_assets_todo');
      if (stored) missing = JSON.parse(stored);
    } catch(e) {}

    if (missing.length === 0) {
      if (el) el.remove();
      const lastUpdated = document.getElementById('weather-last-updated');
      if (lastUpdated) {
        lastUpdated.style.marginBottom = '0';
        lastUpdated.style.paddingBottom = '4vw'; // Restore full 4vw bottom gap if list is cleared
      }
      return;
    }

    if (!el) {
      const container = document.querySelector('main.content') || document.body;
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'relative'; // Normal document flow
      el.style.margin = '0 auto'; 
      el.style.paddingBottom = '4vw'; // Use padding to prevent margin collapse
      el.style.width = '100%';
    el.style.fontSize = '2.25vw';
    el.style.fontFamily = "'light', sans-serif";
      el.style.color = 'white';
      el.style.opacity = '0.5';
      el.style.textAlign = 'center';
      el.style.zIndex = '10';
      el.style.cursor = 'pointer'; 
      el.style.pointerEvents = 'auto'; 
      
      el.addEventListener('click', () => {
        if (confirm('Clear the missing graphics To-Do list?')) {
          localStorage.removeItem('missing_assets_todo');
          updateMissingAssetsDisplay();
        }
      });
      
      // Ensure To-Do list goes BELOW Earth but ABOVE Last Updated text
      const lastUpdated = document.getElementById('weather-last-updated');
      if (lastUpdated && lastUpdated.parentNode) {
        lastUpdated.parentNode.insertBefore(el, lastUpdated);
      } else {
        container.appendChild(el);
      }
    }
    
    const lastUpdated = document.getElementById('weather-last-updated');
    if (lastUpdated) {
      lastUpdated.style.marginBottom = '0';
      lastUpdated.style.paddingBottom = '2vw'; // Shrink gap to 2vw when list is present
    }

    const cleanNames = missing.map(m => m.replace('img/', ''));
    el.textContent = `To-Do (Tap to clear): ${cleanNames.join(', ')}`;
  }

  /* --- Helper functions for dynamic text coloring --- */
  // Pre-calculated average image luminance map (0-255 scale) for instant 0-latency lookup
  const IMAGE_LUMINANCE_MAP = {
    'dark-desc-broken-clouds.jpg': 38.1,
    'dark-desc-clear-sky.jpg': 20.3,
    'dark-desc-light-rain.jpg': 46.0,
    'dark-desc-moderate-rain.jpg': 26.4,
    'dark-desc-overcast-clouds.jpg': 75.2,
    'desc-broken-clouds.jpg': 201.1,
    'desc-clear-sky.jpg': 141.9,
    'desc-few-clouds.jpg': 152.2,
    'desc-fog.jpg': 194.8,
    'desc-haze.jpg': 194.8,
    'desc-heavy-intensity-rain.jpg': 61.8,
    'desc-light-rain.jpg': 139.2,
    'desc-mist.jpg': 194.8,
    'desc-moderate-rain.jpg': 130.8,
    'desc-overcast-clouds.jpg': 179.8,
    'desc-rem.jpg': 142.0,
    'desc-scattered-clouds.jpg': 171.6,
    'desc-thunderstorm-with-heavy-rain.jpg': 61.8,
    'desc-thunderstorm-with-rain.jpg': 130.8,
    'desc-thunderstorm.jpg': 90.0,
    'desc-very-heavy-rain.jpg': 61.8
  };

  const dynamicLuminanceCache = {};

  // Dynamically analyze luminance of unlisted/custom images via offscreen canvas
  function analyzeImageLuminance(imagePath, filename) {
    if (IMAGE_LUMINANCE_MAP[filename] !== undefined || dynamicLuminanceCache[filename] !== undefined) {
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 32, 32);
        const imgData = ctx.getImageData(0, 0, 32, 32).data;
        let totalLum = 0;
        const count = imgData.length / 4;
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          totalLum += (0.299 * r + 0.587 * g + 0.114 * b);
        }
        const avgLum = totalLum / count;
        dynamicLuminanceCache[filename] = avgLum;
        /* eslint-disable */console.log(...oo_oo(`2266558813_8197_8_8197_136_4`,`📸 Dynamic image luminance for ${filename}: ${avgLum.toFixed(1)} / 255 => ${avgLum > 115 ? 'DEEP BLUE' : 'WHITE'}`));
        updateSimpleMonthColors();
      } catch (e) {
        /* CORS or canvas read error fallback */
      }
    };
    img.onerror = () => {
      // If dark version fails to load for a new condition, fall back to analyzing day version
      if (filename.startsWith('dark-') && currentBaseFileName && filename !== currentBaseFileName) {
        analyzeImageLuminance(`img/${currentBaseFileName}`, currentBaseFileName);
      }
    };
    img.src = imagePath;
  }

  function getCurrentTextColor() {
    if (!currentBaseFileName) {
      return 'white';
    }

    let activeFileName = currentBaseFileName;
    if (currentIsNight) {
      activeFileName = WEATHER_CIRCLES_NIGHT_IMAGE_FORCE_CLEAR ? 'dark-desc-clear-sky.jpg' : ('dark-' + currentBaseFileName);
    }

    let lum = IMAGE_LUMINANCE_MAP[activeFileName];
    if (lum === undefined) {
      lum = dynamicLuminanceCache[activeFileName];
    }

    if (lum === undefined) {
      // If not in map or cache, attempt dynamic analysis and check day fallback in the meantime
      const imgPath = currentIsNight ? (WEATHER_CIRCLES_NIGHT_IMAGE_FORCE_CLEAR ? WEATHER_CIRCLES_NIGHT_IMAGE : `img/dark-${currentBaseFileName}`) : `img/${currentBaseFileName}`;
      analyzeImageLuminance(imgPath, activeFileName);
      lum = IMAGE_LUMINANCE_MAP[currentBaseFileName];
    }

    // Threshold 115 / 255 (~45% lightness):
    // If average brightness is light (> 115), choose deep blue ('rgb(33, 57, 157)')
    // If average brightness is dark (<= 115), choose white ('white')
    if (lum !== undefined && lum > 115) {
      return 'rgb(33, 57, 157)';
    }

    return 'white';
  }

  function updateSimpleMonthColors() {
    const color = getCurrentTextColor();
    
    const el = document.getElementById('simple-month');
    if (el) {
      el.style.color = color;
    }
    
    const elLeft = document.getElementById('simple-month-left');
    if (elLeft) {
      elLeft.style.color = color;
    }
  }

  function handleTimeDialReset(e) {
    e.stopPropagation();
    /* eslint-disable */console.log(...oo_oo(`2266558813_8260_4_8260_82_4`,'🔄 Time dial clicked - resetting API timer & forcing refresh...'));
    
    stopAutoRefresh();
    getLocalWeather();
    triggerClockHandsSpinAnimation();
    if (CELESTIAL_ROTATION_ON_REFRESH && typeof window.triggerCelestialRotations === 'function') {
      window.triggerCelestialRotations();
    }
    startAutoRefresh(currentRefreshMs, autoRefreshAligned);
    
    const targets = document.querySelectorAll('.clockGridItem-0, #analog-clock');
    targets.forEach(target => {
      const applyTransition = (opacityVal) => {
        target.style.setProperty('transition', 'opacity 0.5s ease-out', 'important');
        target.style.setProperty('opacity', opacityVal, 'important');
      };
      
      requestAnimationFrame(() => applyTransition('0.15'));
      setTimeout(() => {
        requestAnimationFrame(() => applyTransition('1.0'));
      }, 500);
    });
  }

  function createSimpleMonthIfMissing() {
    if (!document.getElementById('simple-month')) {
      const el = document.createElement('div');
      el.id = 'simple-month';
      el.className = 'simple-month';
      el.setAttribute('aria-hidden', 'true');
      
      // Place it perfectly centered over the top right side-scrolling graphic
      el.style.position = 'absolute';
      el.style.top = '0';
      el.style.left = '0';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.display = 'flex';
      el.style.justifyContent = 'center';
      el.style.alignItems = 'center';
      el.style.gap = '0'; // Gap removed here, space is now handled via margin on the month span
      el.style.color = getCurrentTextColor();
      el.style.fontSize = '5.20vw'; // Made 25% bigger (from 4.16vw)
      el.style.zIndex = '10';
      el.style.textShadow = 'none';
      
      // Disable pointer events on clock text overlay so click propagates to parent circle
      el.style.pointerEvents = 'none';
      
      const descImage = document.getElementById('weather-desc-image');
      if (descImage) {
        descImage.appendChild(el);
        
        // Attach click listener to parent container (covers both radar & image modes)
        descImage.style.cursor = 'pointer';
        descImage.style.pointerEvents = 'auto';
        descImage.addEventListener('click', (e) => {
          e.stopPropagation();
          SHOW_DOPPLER_RADAR_RIGHT = !SHOW_DOPPLER_RADAR_RIGHT;
          USER_DOPPLER_OVERRIDE_RIGHT = SHOW_DOPPLER_RADAR_RIGHT;
          rightRadarHovered = false; // Reset hover state on click to prevent immediate peek inversion
          /* eslint-disable */console.log(...oo_oo(`2266558813_8318_10_8318_200_4`,`🔄 Right circle clicked. Manual Override: ${SHOW_DOPPLER_RADAR_RIGHT ? 'FORCING DOPPLER' : 'FORCING TIME'} (Natural state is: ${AUTO_DOPPLER_RADAR_RIGHT ? 'DOPPLER' : 'TIME'})`));
          
          if (rightDopplerOverrideTimerId) {
            clearTimeout(rightDopplerOverrideTimerId);
          }
          
          rightDopplerOverrideTimerId = setTimeout(() => {
            USER_DOPPLER_OVERRIDE_RIGHT = null;
            SHOW_DOPPLER_RADAR_RIGHT = AUTO_DOPPLER_RADAR_RIGHT;
            rightDopplerOverrideTimerId = null;
            /* eslint-disable */console.log(...oo_oo(`2266558813_8328_12_8328_136_4`,`⏳ Right circle override expired. Reverting to natural state: ${AUTO_DOPPLER_RADAR_RIGHT ? 'DOPPLER' : 'TIME'}`));
            updateWeatherDescription(lastWeatherData || {});
          }, DOPPLER_OVERRIDE_DURATION_MS);
          
          updateWeatherDescription(lastWeatherData || {});
        });
      } else {
        (document.querySelector('main.content') || document.body).appendChild(el);
      }
    }

    if (!document.getElementById('simple-month-left')) {
      const elLeft = document.createElement('div');
      elLeft.id = 'simple-month-left';
      elLeft.className = 'simple-month';
      elLeft.setAttribute('aria-hidden', 'true');
      
      // Place it perfectly centered over the top left side-scrolling graphic
      elLeft.style.position = 'absolute';
      elLeft.style.top = '0';
      elLeft.style.left = '0';
      elLeft.style.width = '100%';
      elLeft.style.height = '100%';
      elLeft.style.display = 'flex';
      elLeft.style.justifyContent = 'center';
      elLeft.style.alignItems = 'center';
      elLeft.style.gap = '0';
      elLeft.style.color = getCurrentTextColor();
      elLeft.style.fontSize = 'var(--left-time-size, 5.59vw)'; // Made 4% smaller (from 5.82vw)
      elLeft.style.zIndex = '10';
      elLeft.style.textShadow = 'none';
      
      // Disable pointer events on clock text overlay so click propagates to parent circle
      elLeft.style.pointerEvents = 'none';
      
      const descImageLeft = document.getElementById('weather-desc-image-left');
      if (descImageLeft) {
        descImageLeft.appendChild(elLeft);
        
        // Attach click listener to parent container (covers both radar & image modes)
        descImageLeft.style.cursor = 'pointer';
        descImageLeft.style.pointerEvents = 'auto';
        descImageLeft.addEventListener('click', (e) => {
          e.stopPropagation();
          SHOW_DOPPLER_RADAR_LEFT = !SHOW_DOPPLER_RADAR_LEFT;
          USER_DOPPLER_OVERRIDE_LEFT = SHOW_DOPPLER_RADAR_LEFT;
          leftRadarHovered = false; // Reset hover state on click to prevent immediate peek inversion
          /* eslint-disable */console.log(...oo_oo(`2266558813_8375_10_8375_197_4`,`🔄 Left circle clicked. Manual Override: ${SHOW_DOPPLER_RADAR_LEFT ? 'FORCING DOPPLER' : 'FORCING TIME'} (Natural state is: ${AUTO_DOPPLER_RADAR_LEFT ? 'DOPPLER' : 'TIME'})`));
          
          if (leftDopplerOverrideTimerId) {
            clearTimeout(leftDopplerOverrideTimerId);
          }
          
          leftDopplerOverrideTimerId = setTimeout(() => {
            USER_DOPPLER_OVERRIDE_LEFT = null;
            SHOW_DOPPLER_RADAR_LEFT = AUTO_DOPPLER_RADAR_LEFT;
            leftDopplerOverrideTimerId = null;
            /* eslint-disable */console.log(...oo_oo(`2266558813_8385_12_8385_134_4`,`⏳ Left circle override expired. Reverting to natural state: ${AUTO_DOPPLER_RADAR_LEFT ? 'DOPPLER' : 'TIME'}`));
            updateWeatherDescription(lastWeatherData || {});
          }, DOPPLER_OVERRIDE_DURATION_MS);
          
          updateWeatherDescription(lastWeatherData || {});
        });
      }
    }
  }

  let lastSimpleMonthStr = '';

  function updateSimpleMonthContent() {
    try {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      let month = '';
      let day = 1;
      let dayOfWeek = '';
      if (typeof Temporal !== 'undefined' && Temporal.Now && Temporal.Now.plainDateISO) {
        const pd = Temporal.Now.plainDateISO();
        month = months[(pd.month || 1) - 1] || '';
        day = pd.day || 1;
        dayOfWeek = days[pd.dayOfWeek % 7] || '';
      } else {
        const d = new Date();
        month = months[d.getMonth()];
        day = d.getDate();
        dayOfWeek = days[d.getDay()];
      }
      
      const newStr = `${month} ${day} ${dayOfWeek}`;
      const color = getCurrentTextColor();
      
      const el = document.getElementById('simple-month');
      if (el) {
        el.style.color = color;
      }
      
      if (newStr === lastSimpleMonthStr) return; // Only update DOM if the date actually rolled over
      lastSimpleMonthStr = newStr;
      
      if (el) {
        el.innerHTML = `<span style="font-family: 'light', sans-serif; font-weight: normal; color: inherit; letter-spacing: -0.06em; margin-right: 0.18em;">${month}</span><span style="font-family: 'bold', sans-serif; font-weight: normal; color: inherit; letter-spacing: -0.06em; margin-right: 0.18em;">${day}</span><span style="font-family: 'light', sans-serif; font-weight: normal; color: inherit; letter-spacing: -0.06em;">${dayOfWeek}</span>`;
      }
      // Left circle date update removed as it now displays the current digital time with seconds instead.
    } catch (e) { /* noop */ }
  }

  function updateSimpleMonthColor(temp) {
    // Intentionally leaving the simple-month text WHITE as requested.
    // The color replacement logic is removed.

    // Also update the animated background to complement the current temp color
    try { setAnimatedGradientFromTemp(temp); } catch (e) { /* noop */ }
  }

  // Ensure the month element exists early and its text is set
  createSimpleMonthIfMissing();
  updateSimpleMonthContent();

  // Add reset listener to analog clock if it exists
  const mainClock = document.getElementById('analog-clock');
  if (mainClock) {
    mainClock.style.cursor = 'pointer';
    mainClock.addEventListener('click', handleTimeDialReset);
  }

  /* --- World Clocks Row (Pacific, Mountain, Central, Eastern, UK) --- */
  const WORLD_CLOCK_ZONES = [
    { id: 'pacific', name: 'Pacific', timeZone: 'America/Los_Angeles' },
    { id: 'mountain', name: 'Mountain', timeZone: 'America/Denver' },
    { id: 'central', name: 'Central', timeZone: 'America/Chicago' },
    { id: 'eastern', name: 'Eastern', timeZone: 'America/New_York' },
    { id: 'uk', name: 'UK', timeZone: 'Europe/London' }
  ];

  function getUserTimezoneZoneId() {
    if (WORLD_CLOCK_USER_TIMEZONE_OVERRIDE) {
      return WORLD_CLOCK_USER_TIMEZONE_OVERRIDE;
    }
    let userTz = '';
    try {
      userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (e) {
      userTz = '';
    }

    // Direct and common regional matches for the 5 zones:
    if (/Chicago|Menominee|Winnipeg|Rainy_River|Rankin_Inlet|Resolute|Matamoros|Ojinaga|Monterrey|Mexico_City|Central/i.test(userTz)) {
      return 'central';
    }
    if (/New_York|Detroit|Louisville|Monticello|Indianapolis|Vincennes|Winamac|Marengo|Petersburg|Vevay|Toronto|Montreal|Iqaluit|Nassau|Havana|Eastern/i.test(userTz)) {
      return 'eastern';
    }
    if (/Denver|Phoenix|Boise|Edmonton|Cambridge_Bay|Yellowknife|Inuvik|Chihuahua|Hermosillo|Mountain/i.test(userTz)) {
      return 'mountain';
    }
    if (/Los_Angeles|Vancouver|Tijuana|Dawson|Whitehorse|Pacific/i.test(userTz)) {
      return 'pacific';
    }
    if (/London|Belfast|Guernsey|Jersey|Isle_of_Man|Dublin/i.test(userTz)) {
      return 'uk';
    }

    // Fallback: match by current local wall-clock hour & minute against zones
    try {
      const now = new Date();
      const userHour = now.getHours();
      const userMinute = now.getMinutes();
      for (const zone of WORLD_CLOCK_ZONES) {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone.timeZone, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
        const zH = parseInt(parts.find(p => p.type === 'hour')?.value, 10) % 24;
        const zM = parseInt(parts.find(p => p.type === 'minute')?.value, 10);
        if (zH === userHour && Math.abs(zM - userMinute) <= 1) {
          return zone.id;
        }
      }
    } catch (e) {}

    // Fallback if weather data has timezone
    if (window.lastWeatherData && window.lastWeatherData.timezone) {
      const weatherTz = window.lastWeatherData.timezone;
      if (/Chicago|Central/i.test(weatherTz)) return 'central';
      if (/New_York|Detroit|Eastern/i.test(weatherTz)) return 'eastern';
      if (/Denver|Mountain/i.test(weatherTz)) return 'mountain';
      if (/Los_Angeles|Pacific/i.test(weatherTz)) return 'pacific';
      if (/London/i.test(weatherTz)) return 'uk';
    }

    return null;
  }

  const worldClockFormatters = WORLD_CLOCK_ZONES.map(z => {
    const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: z.timeZone, hour: 'numeric', hour12: false });
    const timeFormatter = new Intl.DateTimeFormat('en-US', { timeZone: z.timeZone, hour: 'numeric', minute: '2-digit', hour12: true });
    return {
      id: z.id,
      name: z.name,
      timeZone: z.timeZone,
      formatter: hourFormatter,
      hourFormatter,
      timeFormatter
    };
  });

  const celestialClockFormatters = [
    {
      id: 'celestial-left',
      dialId: 'world-clock-dial-celestial-left',
      timeId: 'world-clock-time-celestial-left',
      getTimeZone: () => CELESTIAL_DIAL_LEFT_TIMEZONE,
      matchZoneId: 'pacific'
    },
    {
      id: 'celestial-right',
      dialId: 'world-clock-dial-celestial-right',
      timeId: 'world-clock-time-celestial-right',
      getTimeZone: () => CELESTIAL_DIAL_RIGHT_TIMEZONE,
      matchZoneId: 'uk'
    }
  ];

  /* --- Solar Flare Scale Dial Component --- */
  const SOLAR_FLARE_TEST_LEVELS = [
    { class: 'A', value: 1.5 },
    { class: 'B', value: 3.2 },
    { class: 'C', value: 2.8 },
    { class: 'M', value: 4.5 },
    { class: 'X', value: 2.1 }
  ];
  let currentSolarFlareTestIndex = 2; // Default C 2.8 (matches screenshot)
  let activeSolarFlareState = (SOLAR_FLARE_MODE === 'live') ? null : { class: SOLAR_FLARE_CLASS_MANUAL, value: SOLAR_FLARE_VALUE_MANUAL };
  let liveSolarFlareData = null;
  let solarFlareLiveTimer = null;

  function formatImpactSublabelHtml(arrowDir, text) {
    const iconClass = (arrowDir === 'down') ? 'fa-solid fa-arrow-down' : 'fa-solid fa-arrow-up';
    if (text.includes('<br>')) {
      const parts = text.split('<br>');
      return `<span style="white-space: nowrap;"><i class="${iconClass}" aria-hidden="true"></i> ${parts[0]}</span><br><span>${parts.slice(1).join('<br>')}</span>`;
    }
    const words = text.split(' ');
    if (words.length > 1) {
      const first = words[0];
      const rest = words.slice(1).join(' ');
      return `<span style="white-space: nowrap;"><i class="${iconClass}" aria-hidden="true"></i> ${first}</span> ${rest}`;
    }
    return `<i class="${iconClass}" aria-hidden="true"></i> ${text}`;
  }

  function getSolarFlareImpact(flareClass) {
    const upper = String(flareClass || 'B').toUpperCase();
    switch (upper) {
      case 'A': return { arrow: SOLAR_FLARE_IMPACT_LEVEL_A_ARROW, text: SOLAR_FLARE_IMPACT_LEVEL_A_TEXT };
      case 'B': return { arrow: SOLAR_FLARE_IMPACT_LEVEL_B_ARROW, text: SOLAR_FLARE_IMPACT_LEVEL_B_TEXT };
      case 'C': return { arrow: SOLAR_FLARE_IMPACT_LEVEL_C_ARROW, text: SOLAR_FLARE_IMPACT_LEVEL_C_TEXT };
      case 'M': return { arrow: SOLAR_FLARE_IMPACT_LEVEL_M_ARROW, text: SOLAR_FLARE_IMPACT_LEVEL_M_TEXT };
      case 'X': return { arrow: SOLAR_FLARE_IMPACT_LEVEL_X_ARROW, text: SOLAR_FLARE_IMPACT_LEVEL_X_TEXT };
      default:  return { arrow: 'down', text: 'Nominal Activity' };
    }
  }

  function getSolarFlareLabels(flareClass) {
    const upper = String(flareClass || 'C').toUpperCase();
    switch (upper) {
      case 'A': return { line1: SOLAR_FLARE_LABEL_A_LINE1, line2: SOLAR_FLARE_LABEL_A_LINE2 };
      case 'B': return { line1: SOLAR_FLARE_LABEL_B_LINE1, line2: SOLAR_FLARE_LABEL_B_LINE2 };
      case 'C': return { line1: SOLAR_FLARE_LABEL_C_LINE1, line2: SOLAR_FLARE_LABEL_C_LINE2 };
      case 'M': return { line1: SOLAR_FLARE_LABEL_M_LINE1, line2: SOLAR_FLARE_LABEL_M_LINE2 };
      case 'X': return { line1: SOLAR_FLARE_LABEL_X_LINE1, line2: SOLAR_FLARE_LABEL_X_LINE2 };
      default:  return { line1: 'SOLAR', line2: 'FLARE' };
    }
  }

  function getSolarFlareLevelColor(flareClass) {
    if (SOLAR_FLARE_COLOR_OVERRIDE !== null && SOLAR_FLARE_COLOR_OVERRIDE !== undefined) {
      if (typeof SOLAR_FLARE_COLOR_OVERRIDE === 'number') {
        return tempToColor(SOLAR_FLARE_COLOR_OVERRIDE) || 'hsl(30, 100%, 50%)';
      }
      return SOLAR_FLARE_COLOR_OVERRIDE;
    }
    const upper = String(flareClass || 'C').toUpperCase();
    let setting;
    switch (upper) {
      case 'A': setting = SOLAR_FLARE_COLOR_LEVEL_A; break;
      case 'B': setting = SOLAR_FLARE_COLOR_LEVEL_B; break;
      case 'C': setting = SOLAR_FLARE_COLOR_LEVEL_C; break;
      case 'M': setting = SOLAR_FLARE_COLOR_LEVEL_M; break;
      case 'X': setting = SOLAR_FLARE_COLOR_LEVEL_X; break;
      default:  setting = SOLAR_FLARE_COLOR_LEVEL_C; break;
    }
    if (typeof setting === 'number') {
      return tempToColor(setting) || 'hsl(30, 100%, 50%)';
    }
    return setting || 'hsl(30, 100%, 50%)';
  }

  function calculateSolarFlareFraction(flareClass, flareValue) {
    const cls = String(flareClass || 'C').toUpperCase();
    const val = parseFloat(flareValue) || 1.0;

    // 5 Class buckets across 360 degrees (0.0 to 1.0)
    const ranges = {
      A: { min: 0.00, max: 0.20 },
      B: { min: 0.20, max: 0.40 },
      C: { min: 0.40, max: 0.60 },
      M: { min: 0.60, max: 0.80 },
      X: { min: 0.80, max: 1.00 }
    };
    const range = ranges[cls] || ranges['C'];
    // intra-class: 1.0 to 10.0 maps from range.min to range.max
    const normalized = Math.max(0, Math.min(1.0, (val - 1.0) / 9.0));
    return range.min + (normalized * (range.max - range.min));
  }

  function updateSolarFlareDial() {
    const dial = document.getElementById('solar-flare-dial');
    if (!dial) return;

    let flareClass = 'C';
    let flareValue = 2.8;

    if (activeSolarFlareState) {
      flareClass = activeSolarFlareState.class;
      flareValue = activeSolarFlareState.value;
    } else if (SOLAR_FLARE_MODE === 'live' && liveSolarFlareData) {
      flareClass = liveSolarFlareData.class;
      flareValue = liveSolarFlareData.value;
    } else {
      flareClass = SOLAR_FLARE_CLASS_MANUAL;
      flareValue = SOLAR_FLARE_VALUE_MANUAL;
    }

    const labels = getSolarFlareLabels(flareClass);
    const color = getSolarFlareLevelColor(flareClass);
    const fraction = calculateSolarFlareFraction(flareClass, flareValue);

    // Circumference for r=46 is 2 * PI * 46 = 289.027
    const circumference = 289.027;
    const strokeOffset = circumference * (1 - fraction);

    const line1El = dial.querySelector('.solar-flare-label-line1');
    const line2El = dial.querySelector('.solar-flare-label-line2');
    const classEl = dial.querySelector('.solar-flare-class');
    const valueEl = dial.querySelector('.solar-flare-value');

    if (line1El && line1El.textContent !== labels.line1) line1El.textContent = labels.line1;
    if (line2El && line2El.textContent !== labels.line2) line2El.textContent = labels.line2;
    if (classEl && classEl.textContent !== flareClass) classEl.textContent = flareClass;
    const displayVal = (typeof flareValue === 'number') ? flareValue.toFixed(1) : String(flareValue);
    if (valueEl && valueEl.textContent !== displayVal) valueEl.textContent = displayVal;

    dial.style.setProperty('--solar-flare-current-color', color);
    dial.style.setProperty('--solar-flare-stroke-offset', strokeOffset.toFixed(2));

    if (SOLAR_FLARE_SUBLABEL_ENABLED) {
      const sublabelEl = document.getElementById('solar-flare-sublabel');
      if (sublabelEl) {
        if (SOLAR_FLARE_SUBLABEL_MODE === 'dynamic') {
          const impact = getSolarFlareImpact(flareClass);
          sublabelEl.innerHTML = formatImpactSublabelHtml(impact.arrow, impact.text);
        }
        if (SOLAR_FLARE_SUBLABEL_COLOR === 'auto') {
          sublabelEl.style.color = color;
        }
      }
    }
  }

  function handleSolarFlareDialClick(e) {
    if (e) e.stopPropagation();
    if (SOLAR_FLARE_MODE === 'live') {
      if (!SOLAR_FLARE_CLICK_CYCLES_CLASSES) {
        fetchLiveSolarFlareData();
        return;
      }
      currentSolarFlareTestIndex = (currentSolarFlareTestIndex + 1) % (SOLAR_FLARE_TEST_LEVELS.length + 1);
      if (currentSolarFlareTestIndex === SOLAR_FLARE_TEST_LEVELS.length) {
        // Return to live feed
        activeSolarFlareState = null;
        if (liveSolarFlareData) updateSolarFlareDial();
        fetchLiveSolarFlareData();
      } else {
        activeSolarFlareState = SOLAR_FLARE_TEST_LEVELS[currentSolarFlareTestIndex];
        updateSolarFlareDial();
      }
      return;
    }
    if (!SOLAR_FLARE_CLICK_CYCLES_CLASSES) return;
    currentSolarFlareTestIndex = (currentSolarFlareTestIndex + 1) % SOLAR_FLARE_TEST_LEVELS.length;
    activeSolarFlareState = SOLAR_FLARE_TEST_LEVELS[currentSolarFlareTestIndex];
    updateSolarFlareDial();
  }

  async function fetchLiveSolarFlareData() {
    if (SOLAR_FLARE_MODE !== 'live') return;
    try {
      const response = await fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return;
      const primaryReadings = data.filter(d => d.energy === '0.1-0.8nm' && typeof d.flux === 'number');
      const latest = primaryReadings[primaryReadings.length - 1];
      if (!latest) return;
      const flux = latest.flux;
      let cls = 'A';
      let val = 1.0;
      if (flux < 1e-7) {
        cls = 'A';
        val = flux / 1e-8;
      } else if (flux < 1e-6) {
        cls = 'B';
        val = flux / 1e-7;
      } else if (flux < 1e-5) {
        cls = 'C';
        val = flux / 1e-6;
      } else if (flux < 1e-4) {
        cls = 'M';
        val = flux / 1e-5;
      } else {
        cls = 'X';
        val = flux / 1e-4;
      }
      liveSolarFlareData = {
        class: cls,
        value: parseFloat(val.toFixed(1))
      };
      updateSolarFlareDial();
    } catch (err) {
      console.warn('Unable to fetch live solar flare data from NOAA SWPC:', err);
    }
  }

  function buildSolarFlareColumn() {
    const isMobile = window.innerWidth <= 767;
    const col = document.createElement('div');
    col.className = 'world-clock-column celestial-clock-column celestial-clock-column-left solar-flare-column';
    col.id = 'celestial-clock-left';

    const dial = document.createElement('div');
    dial.className = 'world-clock-dial celestial-clock-dial solar-flare-dial';
    dial.id = 'solar-flare-dial';
    const titleText = (SOLAR_FLARE_MODE === 'live') ? 'Live Solar Flare (NOAA SWPC GOES satellite)' : 'Solar Flare Scale (Click to test levels)';
    dial.setAttribute('title', titleText);

    const initialClass = (SOLAR_FLARE_MODE === 'live' && liveSolarFlareData)
      ? liveSolarFlareData.class
      : (activeSolarFlareState?.class || SOLAR_FLARE_CLASS_MANUAL);
    const initialVal = (SOLAR_FLARE_MODE === 'live' && liveSolarFlareData)
      ? liveSolarFlareData.value
      : (activeSolarFlareState?.value || SOLAR_FLARE_VALUE_MANUAL);
    const labels = getSolarFlareLabels(initialClass);
    const displayVal = (typeof initialVal === 'number') ? initialVal.toFixed(1) : String(initialVal);

    dial.innerHTML = `
      <svg class="solar-flare-svg clock-timer-svg" viewBox="0 0 100 100">
        <circle class="solar-flare-track countdown-track" cx="50" cy="50" r="46" fill="none" />
        <circle class="solar-flare-progress countdown-progress" cx="50" cy="50" r="46" fill="none" />
      </svg>
      <div class="solar-flare-content">
        <div class="solar-flare-label">
          <span class="solar-flare-label-line1">${labels.line1}</span>
          <span class="solar-flare-label-line2">${labels.line2}</span>
        </div>
        <div class="solar-flare-class">${initialClass}</div>
        <div class="solar-flare-value">${displayVal}</div>
      </div>
    `;

    if (SOLAR_FLARE_CLICK_CYCLES_CLASSES) {
      dial.addEventListener('click', handleSolarFlareDialClick);
    }

    col.appendChild(dial);

    if (SOLAR_FLARE_SUBLABEL_ENABLED) {
      const sublabel = document.createElement('div');
      sublabel.className = 'world-clock-label celestial-clock-label solar-flare-sublabel';
      sublabel.id = 'solar-flare-sublabel';
      const impact = getSolarFlareImpact(initialClass);
      const innerContent = (SOLAR_FLARE_SUBLABEL_MODE === 'dynamic')
        ? formatImpactSublabelHtml(impact.arrow, impact.text)
        : (isMobile ? SOLAR_FLARE_SUBLABEL_TEXT_MOBILE : SOLAR_FLARE_SUBLABEL_TEXT_DESKTOP);
      sublabel.innerHTML = innerContent;
      if (SOLAR_FLARE_SUBLABEL_COLOR === 'auto') {
        sublabel.style.color = getSolarFlareLevelColor(initialClass);
      }
      col.appendChild(sublabel);
    }

    if (SOLAR_FLARE_MODE === 'live' && !solarFlareLiveTimer) {
      fetchLiveSolarFlareData();
      solarFlareLiveTimer = setInterval(fetchLiveSolarFlareData, SOLAR_FLARE_AUTO_REFRESH_MS);
    }

    requestAnimationFrame(() => {
      updateSolarFlareDial();
    });

    return col;
  }

  /* --- Radio Blackout (R-Scale) Dial Component --- */
  const RADIO_BLACKOUT_TEST_LEVELS = [
    { class: 'R0', value: 0.2 },
    { class: 'R1', value: 1.5 },
    { class: 'R2', value: 2.8 },
    { class: 'R3', value: 6.5 },
    { class: 'R4', value: 16.0 },
    { class: 'R5', value: 32.0 }
  ];
  let currentRadioBlackoutTestIndex = 2; // Default R2 2.8 (matches mockup)
  let activeRadioBlackoutState = (RADIO_BLACKOUT_MODE === 'live') ? null : { class: RADIO_BLACKOUT_CLASS_MANUAL, value: RADIO_BLACKOUT_VALUE_MANUAL };
  let liveRadioBlackoutData = null;
  let radioBlackoutLiveTimer = null;

  function getRadioBlackoutImpact(rClass) {
    const upper = String(rClass || 'R0').toUpperCase();
    switch (upper) {
      case 'R0': return { arrow: RADIO_BLACKOUT_IMPACT_LEVEL_R0_ARROW, text: RADIO_BLACKOUT_IMPACT_LEVEL_R0_TEXT };
      case 'R1': return { arrow: RADIO_BLACKOUT_IMPACT_LEVEL_R1_ARROW, text: RADIO_BLACKOUT_IMPACT_LEVEL_R1_TEXT };
      case 'R2': return { arrow: RADIO_BLACKOUT_IMPACT_LEVEL_R2_ARROW, text: RADIO_BLACKOUT_IMPACT_LEVEL_R2_TEXT };
      case 'R3': return { arrow: RADIO_BLACKOUT_IMPACT_LEVEL_R3_ARROW, text: RADIO_BLACKOUT_IMPACT_LEVEL_R3_TEXT };
      case 'R4': return { arrow: RADIO_BLACKOUT_IMPACT_LEVEL_R4_ARROW, text: RADIO_BLACKOUT_IMPACT_LEVEL_R4_TEXT };
      case 'R5': return { arrow: RADIO_BLACKOUT_IMPACT_LEVEL_R5_ARROW, text: RADIO_BLACKOUT_IMPACT_LEVEL_R5_TEXT };
      default:   return { arrow: 'down', text: 'All Bands Clear' };
    }
  }

  function getRadioBlackoutLabels(rClass) {
    const upper = String(rClass || 'R0').toUpperCase();
    switch (upper) {
      case 'R0': return { line1: RADIO_BLACKOUT_LABEL_R0_LINE1, line2: RADIO_BLACKOUT_LABEL_R0_LINE2 };
      case 'R1': return { line1: RADIO_BLACKOUT_LABEL_R1_LINE1, line2: RADIO_BLACKOUT_LABEL_R1_LINE2 };
      case 'R2': return { line1: RADIO_BLACKOUT_LABEL_R2_LINE1, line2: RADIO_BLACKOUT_LABEL_R2_LINE2 };
      case 'R3': return { line1: RADIO_BLACKOUT_LABEL_R3_LINE1, line2: RADIO_BLACKOUT_LABEL_R3_LINE2 };
      case 'R4': return { line1: RADIO_BLACKOUT_LABEL_R4_LINE1, line2: RADIO_BLACKOUT_LABEL_R4_LINE2 };
      case 'R5': return { line1: RADIO_BLACKOUT_LABEL_R5_LINE1, line2: RADIO_BLACKOUT_LABEL_R5_LINE2 };
      default:   return { line1: 'RADIO', line2: 'BLACKOUT' };
    }
  }

  function getRadioBlackoutLevelColor(rClass) {
    if (RADIO_BLACKOUT_COLOR_OVERRIDE !== null && RADIO_BLACKOUT_COLOR_OVERRIDE !== undefined) {
      if (typeof RADIO_BLACKOUT_COLOR_OVERRIDE === 'number') {
        return tempToColor(RADIO_BLACKOUT_COLOR_OVERRIDE) || 'hsl(30, 100%, 50%)';
      }
      return RADIO_BLACKOUT_COLOR_OVERRIDE;
    }
    const upper = String(rClass || 'R0').toUpperCase();
    let setting;
    switch (upper) {
      case 'R0': setting = RADIO_BLACKOUT_COLOR_LEVEL_R0; break;
      case 'R1': setting = RADIO_BLACKOUT_COLOR_LEVEL_R1; break;
      case 'R2': setting = RADIO_BLACKOUT_COLOR_LEVEL_R2; break;
      case 'R3': setting = RADIO_BLACKOUT_COLOR_LEVEL_R3; break;
      case 'R4': setting = RADIO_BLACKOUT_COLOR_LEVEL_R4; break;
      case 'R5': setting = RADIO_BLACKOUT_COLOR_LEVEL_R5; break;
      default:   setting = RADIO_BLACKOUT_COLOR_LEVEL_R0; break;
    }
    if (typeof setting === 'number') {
      return tempToColor(setting) || 'hsl(30, 100%, 50%)';
    }
    return setting || 'hsl(30, 100%, 50%)';
  }

  function calculateRadioBlackoutFraction(rClass, rValue) {
    const cls = String(rClass || 'R0').toUpperCase();
    const val = parseFloat(rValue) || 0.0;

    // 6 scale ranges across 360 degrees [0.0 to 1.0]
    // R2 at 2.8db lands at ~0.40 (144 deg from 6 o'clock = 10:48 on clock face, matching mockup)
    const ranges = {
      R0: { min: 0.00, max: 0.16, valMin: 0.0, valMax: 1.0 },
      R1: { min: 0.16, max: 0.33, valMin: 1.0, valMax: 2.5 },
      R2: { min: 0.33, max: 0.50, valMin: 2.0, valMax: 4.0 },
      R3: { min: 0.50, max: 0.67, valMin: 4.0, valMax: 15.0 },
      R4: { min: 0.67, max: 0.84, valMin: 15.0, valMax: 25.0 },
      R5: { min: 0.84, max: 1.00, valMin: 25.0, valMax: 40.0 }
    };
    const range = ranges[cls] || ranges['R2'];
    const span = range.valMax - range.valMin;
    const normalized = span > 0 ? Math.max(0, Math.min(1.0, (val - range.valMin) / span)) : 0.5;
    return range.min + (normalized * (range.max - range.min));
  }

  function formatRadioBlackoutValue(rValue) {
    if (typeof rValue !== 'number') {
      const parsed = parseFloat(rValue);
      if (isNaN(parsed)) return `${rValue}${RADIO_BLACKOUT_UNIT}`;
      rValue = parsed;
    }
    let formatted;
    if (RADIO_BLACKOUT_TWO_SIG_DIGITS) {
      if (rValue >= 10) {
        // e.g. 16, 32 (two significant digits, avoids crowding inside circular dial)
        formatted = Math.round(rValue).toString();
      } else {
        // e.g. 2.8, 0.1 (two significant digits / 1 decimal place)
        formatted = rValue.toFixed(1);
      }
    } else {
      formatted = rValue.toFixed(1);
    }
    return `${formatted}${RADIO_BLACKOUT_UNIT}`;
  }

  function updateRadioBlackoutDial() {
    const dial = document.getElementById('radio-blackout-dial');
    if (!dial) return;

    let rClass = 'R2';
    let rValue = 2.8;

    if (activeRadioBlackoutState) {
      rClass = activeRadioBlackoutState.class;
      rValue = activeRadioBlackoutState.value;
    } else if (RADIO_BLACKOUT_MODE === 'live' && liveRadioBlackoutData) {
      rClass = liveRadioBlackoutData.class;
      rValue = liveRadioBlackoutData.value;
    } else {
      rClass = RADIO_BLACKOUT_CLASS_MANUAL;
      rValue = RADIO_BLACKOUT_VALUE_MANUAL;
    }

    const labels = getRadioBlackoutLabels(rClass);
    const color = getRadioBlackoutLevelColor(rClass);
    const fraction = calculateRadioBlackoutFraction(rClass, rValue);

    // Circumference for r=46 is 2 * PI * 46 = 289.027
    const circumference = 289.027;
    const strokeOffset = circumference * (1 - fraction);

    const line1El = dial.querySelector('.radio-blackout-label-line1');
    const line2El = dial.querySelector('.radio-blackout-label-line2');
    const classEl = dial.querySelector('.radio-blackout-class');
    const valueEl = dial.querySelector('.radio-blackout-value');

    if (line1El && line1El.textContent !== labels.line1) line1El.textContent = labels.line1;
    if (line2El && line2El.textContent !== labels.line2) line2El.textContent = labels.line2;
    if (classEl && classEl.textContent !== rClass) classEl.textContent = rClass;
    const displayVal = formatRadioBlackoutValue(rValue);
    if (valueEl && valueEl.textContent !== displayVal) valueEl.textContent = displayVal;

    dial.style.setProperty('--radio-blackout-current-color', color);
    dial.style.setProperty('--radio-blackout-stroke-offset', strokeOffset.toFixed(2));

    if (RADIO_BLACKOUT_SUBLABEL_ENABLED) {
      const sublabelEl = document.getElementById('radio-blackout-sublabel');
      if (sublabelEl) {
        if (RADIO_BLACKOUT_SUBLABEL_MODE === 'dynamic') {
          const impact = getRadioBlackoutImpact(rClass);
          sublabelEl.innerHTML = formatImpactSublabelHtml(impact.arrow, impact.text);
        }
        if (RADIO_BLACKOUT_SUBLABEL_COLOR === 'auto') {
          sublabelEl.style.color = color;
        }
      }
    }
  }

  function handleRadioBlackoutDialClick(e) {
    if (e) e.stopPropagation();
    if (RADIO_BLACKOUT_MODE === 'live') {
      if (!RADIO_BLACKOUT_CLICK_CYCLES_CLASSES) {
        fetchLiveRadioBlackoutData();
        return;
      }
      currentRadioBlackoutTestIndex = (currentRadioBlackoutTestIndex + 1) % (RADIO_BLACKOUT_TEST_LEVELS.length + 1);
      if (currentRadioBlackoutTestIndex === RADIO_BLACKOUT_TEST_LEVELS.length) {
        // Return to live feed
        activeRadioBlackoutState = null;
        if (liveRadioBlackoutData) updateRadioBlackoutDial();
        fetchLiveRadioBlackoutData();
      } else {
        activeRadioBlackoutState = RADIO_BLACKOUT_TEST_LEVELS[currentRadioBlackoutTestIndex];
        updateRadioBlackoutDial();
      }
      return;
    }
    if (!RADIO_BLACKOUT_CLICK_CYCLES_CLASSES) return;
    currentRadioBlackoutTestIndex = (currentRadioBlackoutTestIndex + 1) % RADIO_BLACKOUT_TEST_LEVELS.length;
    activeRadioBlackoutState = RADIO_BLACKOUT_TEST_LEVELS[currentRadioBlackoutTestIndex];
    updateRadioBlackoutDial();
  }

  async function fetchLiveRadioBlackoutData() {
    if (RADIO_BLACKOUT_MODE !== 'live') return;
    try {
      const response = await fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return;
      const primaryReadings = data.filter(d => d.energy === '0.1-0.8nm' && typeof d.flux === 'number');
      const latest = primaryReadings[primaryReadings.length - 1];
      if (!latest) return;
      const flux = latest.flux;

      let cls = 'R0';
      let val = 0.2;

      if (flux < 1e-5) {
        cls = 'R0';
        val = Math.max(0.1, Math.min(0.9, (flux / 1e-5) * 0.8 + 0.1));
      } else if (flux < 5e-5) {
        cls = 'R1';
        val = 1.0 + ((flux - 1e-5) / 4e-5) * 1.5;
      } else if (flux < 1e-4) {
        cls = 'R2';
        val = 2.5 + ((flux - 5e-5) / 5e-5) * 2.5;
      } else if (flux < 1e-3) {
        cls = 'R3';
        val = 5.0 + ((flux - 1e-4) / 9e-4) * 10.0;
      } else if (flux < 2e-3) {
        cls = 'R4';
        val = 15.0 + ((flux - 1e-3) / 1e-3) * 10.0;
      } else {
        cls = 'R5';
        val = 25.0 + Math.min(15.0, ((flux - 2e-3) / 1e-3) * 10.0);
      }

      liveRadioBlackoutData = {
        class: cls,
        value: parseFloat(val.toFixed(1))
      };
      updateRadioBlackoutDial();
    } catch (err) {
      console.warn('Unable to fetch live radio blackout data from NOAA SWPC:', err);
    }
  }

  function buildRadioBlackoutColumn() {
    const isMobile = window.innerWidth <= 767;
    const col = document.createElement('div');
    col.className = 'world-clock-column celestial-clock-column celestial-clock-column-right radio-blackout-column';
    col.id = 'celestial-clock-right';

    const dial = document.createElement('div');
    dial.className = 'world-clock-dial celestial-clock-dial radio-blackout-dial';
    dial.id = 'radio-blackout-dial';
    const titleText = (RADIO_BLACKOUT_MODE === 'live') ? 'Live Radio Blackout Scale (NOAA SWPC R-Scale)' : 'Radio Blackout Scale (Click to test levels)';
    dial.setAttribute('title', titleText);

    const initialClass = (RADIO_BLACKOUT_MODE === 'live' && liveRadioBlackoutData)
      ? liveRadioBlackoutData.class
      : (activeRadioBlackoutState?.class || RADIO_BLACKOUT_CLASS_MANUAL);
    const initialVal = (RADIO_BLACKOUT_MODE === 'live' && liveRadioBlackoutData)
      ? liveRadioBlackoutData.value
      : (activeRadioBlackoutState?.value || RADIO_BLACKOUT_VALUE_MANUAL);
    const labels = getRadioBlackoutLabels(initialClass);
    const displayVal = formatRadioBlackoutValue(initialVal);

    dial.innerHTML = `
      <svg class="radio-blackout-svg clock-timer-svg" viewBox="0 0 100 100">
        <circle class="radio-blackout-track countdown-track" cx="50" cy="50" r="46" fill="none" />
        <circle class="radio-blackout-progress countdown-progress" cx="50" cy="50" r="46" fill="none" />
      </svg>
      <div class="radio-blackout-content">
        <div class="radio-blackout-label">
          <span class="radio-blackout-label-line1">${labels.line1}</span>
          <span class="radio-blackout-label-line2">${labels.line2}</span>
        </div>
        <div class="radio-blackout-class">${initialClass}</div>
        <div class="radio-blackout-value">${displayVal}</div>
      </div>
    `;

    if (RADIO_BLACKOUT_CLICK_CYCLES_CLASSES) {
      dial.addEventListener('click', handleRadioBlackoutDialClick);
    }

    col.appendChild(dial);

    if (RADIO_BLACKOUT_SUBLABEL_ENABLED) {
      const sublabel = document.createElement('div');
      sublabel.className = 'world-clock-label celestial-clock-label radio-blackout-sublabel';
      sublabel.id = 'radio-blackout-sublabel';
      const impact = getRadioBlackoutImpact(initialClass);
      const innerContent = (RADIO_BLACKOUT_SUBLABEL_MODE === 'dynamic')
        ? formatImpactSublabelHtml(impact.arrow, impact.text)
        : (isMobile ? RADIO_BLACKOUT_SUBLABEL_TEXT_MOBILE : RADIO_BLACKOUT_SUBLABEL_TEXT_DESKTOP);
      sublabel.innerHTML = innerContent;
      if (RADIO_BLACKOUT_SUBLABEL_COLOR === 'auto') {
        sublabel.style.color = getRadioBlackoutLevelColor(initialClass);
      }
      col.appendChild(sublabel);
    }

    if (RADIO_BLACKOUT_MODE === 'live' && !radioBlackoutLiveTimer) {
      fetchLiveRadioBlackoutData();
      radioBlackoutLiveTimer = setInterval(fetchLiveRadioBlackoutData, RADIO_BLACKOUT_AUTO_REFRESH_MS);
    }

    requestAnimationFrame(() => {
      updateRadioBlackoutDial();
    });

    return col;
  }

  function buildWorldClockColumn(zoneConfig) {
    const {
      id,
      colId,
      dialId,
      labelId,
      timeId,
      name,
      timeZone,
      showTime = WORLD_CLOCK_LABEL_SHOW_TIME,
      isCelestial = false
    } = zoneConfig;

    const col = document.createElement('div');
    col.className = isCelestial
      ? `world-clock-column celestial-clock-column celestial-clock-column-${id}`
      : `world-clock-column world-clock-column-${id}`;
    col.id = colId || (isCelestial ? `celestial-clock-${id}` : `world-clock-${id}`);

    // Dial container based on the clock dial (subtle outer track circle, but no 5-min countdown ring)
    const dial = document.createElement('div');
    dial.className = isCelestial ? 'world-clock-dial celestial-clock-dial' : 'world-clock-dial';
    dial.id = dialId || `world-clock-dial-${id}`;
    dial.setAttribute('data-timezone', timeZone);
    dial.setAttribute('title', `${name} Time`);
    dial.style.cursor = 'pointer';
    dial.addEventListener('click', handleTimeDialReset);

    dial.innerHTML = `
      <svg class="clock-timer-svg" viewBox="0 0 100 100">
        <circle class="countdown-track" cx="50" cy="50" r="46" fill="none" />
      </svg>
      <div class="clock-face">
        <div class="clock-hour-hand"></div>
        <div class="clock-minute-hand"></div>
        <div class="clock-second-hand"></div>
        <div class="clock-center-dot"></div>
      </div>
    `;

    col.appendChild(dial);

    if (WORLD_CLOCK_LABEL_ENABLED) {
      const label = document.createElement('div');
      label.className = isCelestial ? 'world-clock-label celestial-clock-label' : 'world-clock-label';
      label.id = labelId || `world-clock-label-${id}`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'world-clock-name';
      nameSpan.textContent = name;
      label.appendChild(nameSpan);

      if (showTime) {
        const spacerSpan = document.createElement('span');
        spacerSpan.className = 'world-clock-spacer';
        spacerSpan.innerHTML = '&nbsp;'.repeat(WORLD_CLOCK_LABEL_SPACES || 2);
        label.appendChild(spacerSpan);

        const timeSpan = document.createElement('span');
        timeSpan.className = 'world-clock-time';
        timeSpan.id = timeId || `world-clock-time-${id}`;
        timeSpan.textContent = '';
        label.appendChild(timeSpan);
      }

      col.appendChild(label);
    }

    return col;
  }

  function createWorldClocksIfMissing() {
    if (!WORLD_CLOCKS_ENABLED) {
      const existing = document.getElementById('world-clocks-row-wrapper');
      if (existing) existing.remove();
      return;
    }
    const existingWrapper = document.getElementById('world-clocks-row-wrapper');
    if (existingWrapper) {
      // Hot-reload guard: ensure spacer and time spans exist inside existing labels
      if (WORLD_CLOCK_LABEL_SHOW_TIME) {
        const spacesHtml = '&nbsp;'.repeat(WORLD_CLOCK_LABEL_SPACES || 2);
        WORLD_CLOCK_ZONES.forEach(zone => {
          const label = document.getElementById(`world-clock-label-${zone.id}`);
          if (label) {
            label.innerHTML = `
              <span class="world-clock-name">${zone.name}</span><span class="world-clock-spacer">${spacesHtml}</span><span class="world-clock-time" id="world-clock-time-${zone.id}"></span>
            `;
          }
        });
      }
      updateWorldClockHands();
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'world-clocks-row-wrapper';
    wrapper.className = 'world-clocks-row-wrapper';

    WORLD_CLOCK_ZONES.forEach(zone => {
      const col = buildWorldClockColumn({
        id: zone.id,
        name: zone.name,
        timeZone: zone.timeZone,
        showTime: WORLD_CLOCK_LABEL_SHOW_TIME,
        isCelestial: false
      });
      wrapper.appendChild(col);
    });

    // Placement: "the row is just above the two suns row"
    const sunsRow = document.getElementById('suns-row-wrapper') || document.querySelector('.sun-column.single-mode');
    if (sunsRow && sunsRow.parentNode) {
      sunsRow.parentNode.insertBefore(wrapper, sunsRow);
    } else {
      const earthContainer = document.getElementById('earth-image-container');
      const locSwitcher = document.getElementById('weather-location-switcher');
      const missingAssets = document.getElementById('weather-missing-assets');
      const lastUpdated = document.getElementById('weather-last-updated');
      const secondGauge = document.querySelector('.second-gauge-container');

      if (earthContainer && earthContainer.parentNode) {
        earthContainer.parentNode.insertBefore(wrapper, earthContainer);
      } else if (locSwitcher && locSwitcher.parentNode) {
        locSwitcher.parentNode.insertBefore(wrapper, locSwitcher);
      } else if (missingAssets && missingAssets.parentNode) {
        missingAssets.parentNode.insertBefore(wrapper, missingAssets);
      } else if (lastUpdated && lastUpdated.parentNode) {
        lastUpdated.parentNode.insertBefore(wrapper, lastUpdated);
      } else if (secondGauge && secondGauge.parentNode) {
        secondGauge.parentNode.insertBefore(wrapper, secondGauge.nextSibling);
      } else {
        const parent = document.querySelector('main') || document.body;
        parent.appendChild(wrapper);
      }
    }

    updateWorldClockHands();

    requestAnimationFrame(() => {
      wrapper.style.opacity = '1';
    });
  }

  function updateWorldClockHands() {
    const wrapper = document.getElementById('world-clocks-row-wrapper');
    const hasCelestialRow = !!document.getElementById('suns-row-wrapper');
    if (!wrapper && !hasCelestialRow) return;

    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();

    const minuteRotation = (minutes * 6) + (seconds * 0.1);
    const secondRotation = (seconds * 6) + (milliseconds * 0.006);

    let handsColor = null;
    let currentTempColor = null;
    if (window.lastWeatherData && window.lastWeatherData.current && typeof window.lastWeatherData.current.temp === 'number') {
      currentTempColor = tempToColor(window.lastWeatherData.current.temp);
    } else {
      currentTempColor = document.documentElement.style.getPropertyValue('--temp-color') || null;
    }

    if (WORLD_CLOCK_HANDS_COLOR_MODE === 'temp') {
      handsColor = currentTempColor;
    } else if (WORLD_CLOCK_HANDS_COLOR_MODE && WORLD_CLOCK_HANDS_COLOR_MODE !== 'white') {
      handsColor = WORLD_CLOCK_HANDS_COLOR_MODE;
    }

    // Update Dial Tracks: user's timezone gets current temperature color
    const userZoneId = getUserTimezoneZoneId();
    const isMobile = window.innerWidth <= 767;
    const userTrackSetting = isMobile ? WORLD_CLOCK_USER_TIMEZONE_TRACK_COLOR_MOBILE : WORLD_CLOCK_USER_TIMEZONE_TRACK_COLOR_DESKTOP;
    const resolvedUserTrackColor = (userTrackSetting === 'temp') ? (currentTempColor || 'rgba(255, 255, 255, 0.4)') : userTrackSetting;

    WORLD_CLOCK_ZONES.forEach(zone => {
      const dial = document.getElementById(`world-clock-dial-${zone.id}`);
      if (!dial) return;
      const trackCircle = dial.querySelector('.countdown-track');
      const isUserZone = (zone.id === userZoneId);

      if (isUserZone) {
        dial.classList.add('is-user-timezone');
        dial.style.setProperty('--world-clock-track-color', resolvedUserTrackColor);
        if (trackCircle) trackCircle.style.stroke = resolvedUserTrackColor;
      } else {
        dial.classList.remove('is-user-timezone');
        dial.style.removeProperty('--world-clock-track-color');
        if (trackCircle) trackCircle.style.stroke = '';
      }
    });

    worldClockFormatters.forEach(({ id, formatter, timeFormatter }) => {
      const dial = document.getElementById(`world-clock-dial-${id}`);
      if (!dial) return;

      const rawH = parseInt(formatter.format(now), 10);
      const hours = isNaN(rawH) ? 0 : rawH % 12;
      const hourRotation = (hours * 30) + (minutes * 0.5);

      dial.style.setProperty('--hour-rotation', `${hourRotation}deg`);
      dial.style.setProperty('--minute-rotation', `${minuteRotation}deg`);
      dial.style.setProperty('--second-rotation', `${secondRotation}deg`);

      if (handsColor) {
        dial.style.setProperty('--world-clock-hands-color', handsColor);
      }

      const hourHand = dial.querySelector('.clock-hour-hand');
      const minuteHand = dial.querySelector('.clock-minute-hand');
      const secondHand = dial.querySelector('.clock-second-hand');
      const centerDot = dial.querySelector('.clock-center-dot');

      if (hourHand) {
        if (!isClockSpinning) {
          hourHand.style.transform = `translateX(-50%) rotate(${hourRotation}deg)`;
        }
        if (handsColor) hourHand.style.backgroundColor = handsColor;
      }
      if (minuteHand) {
        if (!isClockSpinning) {
          minuteHand.style.transform = `translateX(-50%) rotate(${minuteRotation}deg)`;
        }
        if (handsColor) minuteHand.style.backgroundColor = handsColor;
      }
      if (secondHand) {
        secondHand.style.transform = `translateX(-50%) rotate(${secondRotation}deg)`;
      }
      if (centerDot && handsColor) {
        centerDot.style.backgroundColor = handsColor;
      }

      // Update dynamic time text under dial (e.g. Line 2 "6:51a")
      if (WORLD_CLOCK_LABEL_SHOW_TIME) {
        const timeSpan = document.getElementById(`world-clock-time-${id}`);
        if (timeSpan && timeFormatter) {
          const parts = timeFormatter.formatToParts(now);
          let h = '', m = '', dayPeriod = 'a';
          for (const p of parts) {
            if (p.type === 'hour') h = p.value;
            else if (p.type === 'minute') m = p.value;
            else if (p.type === 'dayPeriod') dayPeriod = p.value.toLowerCase();
          }
          const ampm = dayPeriod.startsWith('p') ? 'p' : 'a';
          const formattedTime = `${h}:${m}${ampm}`;
          if (timeSpan.textContent !== formattedTime) {
            timeSpan.textContent = formattedTime;
          }
        }
      }
    });

    // Update Flanking Celestial Row Dials (Pacific & UK duplicates)
    if (CELESTIAL_DIALS_ENABLED) {
      celestialClockFormatters.forEach(({ dialId, timeId, getTimeZone, matchZoneId }) => {
        const dial = document.getElementById(dialId);
        if (!dial) return;

        const tz = getTimeZone();
        const isUserZone = (matchZoneId === userZoneId);

        const trackCircle = dial.querySelector('.countdown-track');
        if (isUserZone) {
          dial.classList.add('is-user-timezone');
          dial.style.setProperty('--world-clock-track-color', resolvedUserTrackColor);
          if (trackCircle) trackCircle.style.stroke = resolvedUserTrackColor;
        } else {
          dial.classList.remove('is-user-timezone');
          dial.style.removeProperty('--world-clock-track-color');
          if (trackCircle) trackCircle.style.stroke = '';
        }

        let rawH = 0;
        try {
          const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(now);
          rawH = parseInt(parts.find(p => p.type === 'hour')?.value, 10);
        } catch (e) {
          rawH = now.getHours();
        }
        const hours = isNaN(rawH) ? 0 : rawH % 12;
        const hourRotation = (hours * 30) + (minutes * 0.5);

        dial.style.setProperty('--hour-rotation', `${hourRotation}deg`);
        dial.style.setProperty('--minute-rotation', `${minuteRotation}deg`);
        dial.style.setProperty('--second-rotation', `${secondRotation}deg`);

        if (handsColor) {
          dial.style.setProperty('--world-clock-hands-color', handsColor);
        }

        const hourHand = dial.querySelector('.clock-hour-hand');
        const minuteHand = dial.querySelector('.clock-minute-hand');
        const secondHand = dial.querySelector('.clock-second-hand');
        const centerDot = dial.querySelector('.clock-center-dot');

        if (hourHand) {
          if (!isClockSpinning) {
            hourHand.style.transform = `translateX(-50%) rotate(${hourRotation}deg)`;
          }
          if (handsColor) hourHand.style.backgroundColor = handsColor;
        }
        if (minuteHand) {
          if (!isClockSpinning) {
            minuteHand.style.transform = `translateX(-50%) rotate(${minuteRotation}deg)`;
          }
          if (handsColor) minuteHand.style.backgroundColor = handsColor;
        }
        if (secondHand) {
          secondHand.style.transform = `translateX(-50%) rotate(${secondRotation}deg)`;
        }
        if (centerDot && handsColor) {
          centerDot.style.backgroundColor = handsColor;
        }

        if (WORLD_CLOCK_LABEL_SHOW_TIME) {
          const timeSpan = document.getElementById(timeId);
          if (timeSpan) {
            try {
              const timeFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });
              const parts = timeFormatter.formatToParts(now);
              let h = '', m = '', dayPeriod = 'a';
              for (const p of parts) {
                if (p.type === 'hour') h = p.value;
                else if (p.type === 'minute') m = p.value;
                else if (p.type === 'dayPeriod') dayPeriod = p.value.toLowerCase();
              }
              const ampm = dayPeriod.startsWith('p') ? 'p' : 'a';
              const formattedTime = `${h}:${m}${ampm}`;
              if (timeSpan.textContent !== formattedTime) {
                timeSpan.textContent = formattedTime;
              }
            } catch (e) {}
          }
        }
      });
      if (SOLAR_FLARE_DIAL_ENABLED && typeof updateSolarFlareDial === 'function') {
        updateSolarFlareDial();
      }
    }
  }

  let sunAnimationTimeoutId = null;
  let earthAnimationTimeoutId = null;

  function triggerCelestialRotations() {
    if (typeof window.triggerSunRotation === 'function') window.triggerSunRotation();
    if (typeof window.triggerEarthRotation === 'function') window.triggerEarthRotation();
  }
  window.triggerCelestialRotations = triggerCelestialRotations;

  function createSunImageIfMissing() {
    const existingSunsRow = document.getElementById('suns-row-wrapper');
    if (existingSunsRow) {
      const leftCol = document.getElementById('celestial-clock-left');
      const hasSolarDial = !!document.getElementById('solar-flare-dial');
      const needsRebuild = CELESTIAL_DIALS_ENABLED && (!leftCol || (SOLAR_FLARE_DIAL_ENABLED && !hasSolarDial) || (!SOLAR_FLARE_DIAL_ENABLED && hasSolarDial));
      if (needsRebuild) {
        existingSunsRow.remove();
        const existingSpacer = document.getElementById('sun-image-spacer');
        if (existingSpacer) existingSpacer.remove();
      } else {
        return;
      }
    }
    if (document.getElementById('sun-image-container')) return;

    // Helper to build a styled circular sun element with dual buffer
    function buildSunCircle(containerId, imgId, initialUrl, altText) {
      const c = document.createElement('div');
      c.id = containerId;
      c.className = 'sun-image-container';
      c.style.width = 'var(--sun-image-width, 34vw)';
      c.style.height = 'var(--sun-image-width, 34vw)';
      c.style.marginTop = 'var(--sun-image-container-margin-top, 0vw)';
      c.style.borderRadius = '50%';
      c.style.overflow = 'hidden';
      c.style.clipPath = 'circle(var(--sun-mask-radius, 49.5%) at 50% var(--sun-mask-position-y, 50%))';
      c.style.WebkitClipPath = 'circle(var(--sun-mask-radius, 49.5%) at 50% var(--sun-mask-position-y, 50%))';
      c.style.position = 'relative';
      c.style.opacity = '0';
      c.style.transition = 'opacity 1s ease';
      c.style.mixBlendMode = 'var(--sun-image-blend-mode, lighten)';
      c.style.backgroundColor = 'transparent';
      c.style.flexShrink = '0';
      c.style.webkitBackfaceVisibility = 'hidden';
      c.style.backfaceVisibility = 'hidden';
      c.style.webkitTransform = 'translate3d(0, 0, 0)';
      c.style.transform = 'translate3d(0, 0, 0)';
      c.style.webkitMaskImage = '-webkit-radial-gradient(white, black)';

      const durVar = '--sun-animation-crossfade-duration, 60ms';

      const im = document.createElement('img');
      im.id = imgId;
      im.className = 'sun-image sun-image-layer-a';
      im.src = initialUrl;
      im.alt = altText;
      im.style.width = 'var(--sun-image-inner-scale, 36.7vw)';
      im.style.height = 'var(--sun-image-inner-scale, 36.7vw)';
      im.style.position = 'absolute';
      im.style.top = 'calc(50% + var(--sun-image-offset-y, 0vw))';
      im.style.left = 'calc(50% + var(--sun-image-offset-x, 0vw))';
      im.style.transform = 'translate3d(-50%, -50%, 0)';
      im.style.webkitTransform = 'translate3d(-50%, -50%, 0)';
      im.style.webkitBackfaceVisibility = 'hidden';
      im.style.backfaceVisibility = 'hidden';
      im.style.willChange = 'opacity';
      im.style.objectFit = 'cover';
      im.style.display = 'block';
      im.style.mixBlendMode = 'var(--sun-image-blend-mode, lighten)';
      im.style.zIndex = '1';
      im.style.opacity = '1';
      im.style.transition = `opacity var(${durVar}) ease-in-out`;

      const imB = document.createElement('img');
      imB.id = imgId + '-b';
      imB.className = 'sun-image sun-image-layer-b';
      imB.src = initialUrl;
      imB.alt = altText + ' Buffer';
      imB.style.width = 'var(--sun-image-inner-scale, 36.7vw)';
      imB.style.height = 'var(--sun-image-inner-scale, 36.7vw)';
      imB.style.position = 'absolute';
      imB.style.top = 'calc(50% + var(--sun-image-offset-y, 0vw))';
      imB.style.left = 'calc(50% + var(--sun-image-offset-x, 0vw))';
      imB.style.transform = 'translate3d(-50%, -50%, 0)';
      imB.style.webkitTransform = 'translate3d(-50%, -50%, 0)';
      imB.style.webkitBackfaceVisibility = 'hidden';
      imB.style.backfaceVisibility = 'hidden';
      imB.style.willChange = 'opacity';
      imB.style.objectFit = 'cover';
      imB.style.display = 'block';
      imB.style.mixBlendMode = 'var(--sun-image-blend-mode, lighten)';
      imB.style.zIndex = '2';
      imB.style.opacity = '0';
      imB.style.transition = `opacity var(${durVar}) ease-in-out`;

      c.appendChild(im);
      c.appendChild(imB);

      return { container: c, img: im, imgB: imB };
    }

    // Helper to build a styled circular Earth element with dual buffer
    function buildEarthCircle(containerId, imgId, initialUrl, altText) {
      const c = document.createElement('div');
      c.id = containerId;
      c.className = 'sun-image-container earth-image-container';
      c.style.width = 'var(--earth-image-width, 24vw)';
      c.style.height = 'var(--earth-image-width, 24vw)';
      c.style.marginTop = 'var(--earth-image-container-margin-top, 0vw)';
      c.style.borderRadius = '50%';
      c.style.position = 'relative';
      c.style.opacity = '0';
      c.style.transition = 'opacity 1s ease';
      c.style.mixBlendMode = 'lighten';
      c.style.backgroundColor = 'transparent';
      c.style.flexShrink = '0';
      c.style.webkitBackfaceVisibility = 'hidden';
      c.style.backfaceVisibility = 'hidden';
      c.style.webkitTransform = 'translate3d(0, 0, 0)';
      c.style.transform = 'translate3d(0, 0, 0)';

      const durVar = '--earth-animation-crossfade-duration, 70ms';

      const imA = document.createElement('img');
      imA.id = imgId;
      imA.className = 'earth-image earth-layer-a';
      imA.src = initialUrl;
      imA.alt = altText;
      imA.style.width = 'var(--earth-image-inner-scale, 23.2vw)';
      imA.style.height = 'var(--earth-image-inner-scale, 23.2vw)';
      imA.style.position = 'absolute';
      imA.style.top = 'calc(50% + var(--earth-image-offset-y, 0vw))';
      imA.style.left = 'calc(50% + var(--earth-image-offset-x, 0vw))';
      imA.style.transform = 'translate3d(-50%, -45.5%, 0)';
      imA.style.webkitTransform = 'translate3d(-50%, -45.5%, 0)';
      imA.style.clipPath = 'circle(var(--earth-mask-radius, 45.2%) at 50% var(--earth-mask-position-y, 45.5%))';
      imA.style.WebkitClipPath = 'circle(var(--earth-mask-radius, 45.2%) at 50% var(--earth-mask-position-y, 45.5%))';
      imA.style.webkitBackfaceVisibility = 'hidden';
      imA.style.backfaceVisibility = 'hidden';
      imA.style.willChange = 'opacity';
      imA.style.objectFit = 'cover';
      imA.style.display = 'block';
      imA.style.mixBlendMode = 'lighten';
      imA.style.filter = 'blur(var(--earth-image-blur, 0.8px))';
      imA.style.zIndex = '1';
      imA.style.opacity = '1';
      imA.style.transition = `opacity var(${durVar}) ease-in-out`;

      const imB = document.createElement('img');
      imB.id = imgId + '-b';
      imB.className = 'earth-image earth-layer-b';
      imB.src = initialUrl;
      imB.alt = altText + ' Buffer';
      imB.style.width = 'var(--earth-image-inner-scale, 23.2vw)';
      imB.style.height = 'var(--earth-image-inner-scale, 23.2vw)';
      imB.style.position = 'absolute';
      imB.style.top = 'calc(50% + var(--earth-image-offset-y, 0vw))';
      imB.style.left = 'calc(50% + var(--earth-image-offset-x, 0vw))';
      imB.style.transform = 'translate3d(-50%, -45.5%, 0)';
      imB.style.webkitTransform = 'translate3d(-50%, -45.5%, 0)';
      imB.style.clipPath = 'circle(var(--earth-mask-radius, 45.2%) at 50% var(--earth-mask-position-y, 45.5%))';
      imB.style.WebkitClipPath = 'circle(var(--earth-mask-radius, 45.2%) at 50% var(--earth-mask-position-y, 45.5%))';
      imB.style.webkitBackfaceVisibility = 'hidden';
      imB.style.backfaceVisibility = 'hidden';
      imB.style.willChange = 'opacity';
      imB.style.objectFit = 'cover';
      imB.style.display = 'block';
      imB.style.mixBlendMode = 'lighten';
      imB.style.filter = 'blur(var(--earth-image-blur, 0.8px))';
      imB.style.zIndex = '2';
      imB.style.opacity = '0';
      imB.style.transition = `opacity var(${durVar}) ease-in-out`;

      c.appendChild(imA);
      c.appendChild(imB);

      return { container: c, img: imA, imgB: imB };
    }

    // Helper to build a vertical column containing circle and its centered label
    function buildCelestialColumn(colId, circleObj, labelText, labelId) {
      const col = document.createElement('div');
      col.id = colId;
      col.className = 'sun-column';
      col.style.display = 'flex';
      col.style.flexDirection = 'column';
      col.style.alignItems = 'center';
      col.style.justifyContent = 'flex-start';
      col.style.width = colId === 'sun-col-right' ? 'var(--earth-image-width, var(--sun-image-width, 34vw))' : 'var(--sun-image-width, 34vw)';
      col.style.position = 'relative';
      col.style.flexShrink = '0';
      col.style.backgroundColor = 'transparent';
      col.style.mixBlendMode = 'var(--sun-image-blend-mode, lighten)';

      col.appendChild(circleObj.container);

      if (SUN_LABEL_ENABLED && labelText) {
        const isLeft = colId === 'sun-col-left';
        const lbl = document.createElement('div');
        lbl.id = labelId;
        lbl.className = 'sun-label';
        lbl.textContent = labelText;
        lbl.style.width = '100%';
        lbl.style.maxWidth = '100%';
        lbl.style.display = 'block';
        lbl.style.fontFamily = "var(--sun-label-font-family, 'light', sans-serif)";
        lbl.style.fontSize = 'var(--sun-label-font-size, 2.0vw)';
        lbl.style.letterSpacing = 'var(--sun-label-letter-spacing, 0.08vw)';
        lbl.style.paddingLeft = 'var(--sun-label-letter-spacing, 0.08vw)';
        lbl.style.color = 'var(--sun-label-color, #ffffff)';
        lbl.style.opacity = 'var(--sun-label-opacity, 0.70)';
        lbl.style.textTransform = 'var(--sun-label-text-transform, none)';
        lbl.style.marginTop = isLeft
          ? 'var(--sun-label-margin-top, 0.8vw)'
          : 'var(--earth-label-margin-top, var(--sun-label-margin-top, 0.8vw))';
        lbl.style.textAlign = 'center';
        lbl.style.whiteSpace = 'nowrap';
        lbl.style.userSelect = 'none';
        lbl.style.lineHeight = '1.2';
        lbl.style.boxSizing = 'border-box';
        lbl.style.transform = `translateX(calc(var(--sun-label-offset-x, 0vw) + var(--sun-label-${isLeft ? 'left' : 'right'}-offset-x, 0vw)))`;
        col.appendChild(lbl);
      }

      return col;
    }

    // Left Circle: Sun Live (GOES-19 SUVI Fe195 Å)
    const leftSun = buildSunCircle(
      'sun-image-container',
      'sun-image',
      SUN_IMAGE_URL,
      'Live Sunspot & Coronal 27-Day Rotation Animation from GOES-19 SUVI Fe195'
    );
    const leftCol = buildCelestialColumn('sun-col-left', leftSun, SUN_LABEL_LEFT_TEXT, 'sun-label-left');

    // Right Circle: Earth Live (NOAA GOES-19 GeoColor Full Disk)
    const rightEarth = buildEarthCircle(
      'earth-image-container',
      'earth-image',
      EARTH_IMAGE_URL,
      'Live Earth GeoColor Full Disk from NOAA GOES-19 Satellite'
    );
    const rightCol = buildCelestialColumn('sun-col-right', rightEarth, SUN_LABEL_RIGHT_TEXT, 'sun-label-right');
    rightCol.classList.add('earth-column');

    let mainWrapper = null;

    if (SUN_DUO_MODE) {
      mainWrapper = document.createElement('div');
      mainWrapper.id = 'suns-row-wrapper';
      mainWrapper.className = 'suns-row-wrapper';
      mainWrapper.style.display = 'flex';
      mainWrapper.style.flexDirection = 'row';
      mainWrapper.style.justifyContent = 'flex-start';
      mainWrapper.style.alignItems = 'flex-start';
      mainWrapper.style.width = 'var(--world-clocks-width, 95vw)';
      mainWrapper.style.gap = '0'; // Controlled individually via left and right gap margins on all 4 objects
      mainWrapper.style.margin = 'var(--celestial-row-margin-top, var(--sun-image-margin-top, 0vw)) auto 0';
      mainWrapper.style.backgroundColor = 'transparent';
      mainWrapper.style.mixBlendMode = 'var(--sun-image-blend-mode, lighten)';
      mainWrapper.style.opacity = '0';
      mainWrapper.style.transition = 'opacity 1s ease';

      // 1. Left dial in celestial row: Solar Flare Scale dial (or duplicate Pacific dial)
      if (CELESTIAL_DIALS_ENABLED) {
        if (SOLAR_FLARE_DIAL_ENABLED) {
          const leftDial = buildSolarFlareColumn();
          mainWrapper.appendChild(leftDial);
        } else {
          const isMobile = window.innerWidth <= 767;
          const leftDial = buildWorldClockColumn({
            id: 'left',
            colId: 'celestial-clock-left',
            dialId: 'world-clock-dial-celestial-left',
            labelId: 'world-clock-label-celestial-left',
            timeId: 'world-clock-time-celestial-left',
            name: isMobile ? CELESTIAL_DIAL_LEFT_NAME_MOBILE : CELESTIAL_DIAL_LEFT_NAME_DESKTOP,
            timeZone: CELESTIAL_DIAL_LEFT_TIMEZONE,
            showTime: CELESTIAL_DIAL_LEFT_SHOW_TIME,
            isCelestial: true
          });
          mainWrapper.appendChild(leftDial);
        }
      }

      // 2. Big Sun column (150% size, vertically centered with other 3 circles)
      mainWrapper.appendChild(leftCol);

      // 3. Earth column (vertically centered with other 3 circles)
      mainWrapper.appendChild(rightCol);

      // 4. Duplicate 5th timezone dial (UK) or Radio Blackout dial on the right
      if (CELESTIAL_DIALS_ENABLED) {
        if (RADIO_BLACKOUT_DIAL_ENABLED) {
          const rightDial = buildRadioBlackoutColumn();
          mainWrapper.appendChild(rightDial);
        } else {
          const isMobile = window.innerWidth <= 767;
          const rightDial = buildWorldClockColumn({
            id: 'right',
            colId: 'celestial-clock-right',
            dialId: 'world-clock-dial-celestial-right',
            labelId: 'world-clock-label-celestial-right',
            timeId: 'world-clock-time-celestial-right',
            name: isMobile ? CELESTIAL_DIAL_RIGHT_NAME_MOBILE : CELESTIAL_DIAL_RIGHT_NAME_DESKTOP,
            timeZone: CELESTIAL_DIAL_RIGHT_TIMEZONE,
            showTime: CELESTIAL_DIAL_RIGHT_SHOW_TIME,
            isCelestial: true
          });
          mainWrapper.appendChild(rightDial);
        }
      }
    } else {
      leftCol.classList.add('single-mode');
      leftCol.style.margin = 'var(--celestial-row-margin-top, var(--sun-image-margin-top, 2vw)) auto 0';
      mainWrapper = leftCol;
    }

    // Interactivity: On-demand single cycle rotation when clicked or touched
    if (CELESTIAL_ROTATION_ON_CLICK) {
      leftCol.style.cursor = 'pointer';
      leftCol.setAttribute('role', 'button');
      leftCol.setAttribute('title', 'Click or tap to rotate Sun');
      leftCol.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.triggerSunRotation === 'function') window.triggerSunRotation();
      });

      rightCol.style.cursor = 'pointer';
      rightCol.setAttribute('role', 'button');
      rightCol.setAttribute('title', 'Click or tap to rotate Earth');
      rightCol.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.triggerEarthRotation === 'function') window.triggerEarthRotation();
      });
    }

    // Dedicated spacer below the duo row
    const spacer = document.createElement('div');
    spacer.id = 'sun-image-spacer';
    spacer.className = 'sun-image-spacer';
    spacer.style.height = 'var(--celestial-row-margin-bottom, var(--sun-image-margin-bottom, 2vw))';
    spacer.style.width = '100%';

    // Position directly below World Clocks (or above Cities Location Switcher / Last Updated)
    const worldClocks = document.getElementById('world-clocks-row-wrapper');
    const locSwitcher = document.getElementById('weather-location-switcher');
    const missingAssets = document.getElementById('weather-missing-assets');
    const lastUpdated = document.getElementById('weather-last-updated');
    const secondGauge = document.querySelector('.second-gauge-container');
    const mainContainer = document.querySelector('main.content') || document.querySelector('main') || document.body;

    if (worldClocks && worldClocks.parentNode === mainContainer) {
      mainContainer.insertBefore(mainWrapper, worldClocks.nextSibling);
      mainContainer.insertBefore(spacer, mainWrapper.nextSibling);
    } else if (locSwitcher && locSwitcher.parentNode === mainContainer) {
      mainContainer.insertBefore(mainWrapper, locSwitcher);
      mainContainer.insertBefore(spacer, locSwitcher);
    } else if (missingAssets && missingAssets.parentNode === mainContainer) {
      mainContainer.insertBefore(mainWrapper, missingAssets);
      mainContainer.insertBefore(spacer, missingAssets);
    } else if (lastUpdated && lastUpdated.parentNode === mainContainer) {
      mainContainer.insertBefore(mainWrapper, lastUpdated);
      mainContainer.insertBefore(spacer, lastUpdated);
    } else if (secondGauge && secondGauge.parentNode === mainContainer) {
      mainContainer.insertBefore(mainWrapper, secondGauge.nextSibling);
      mainContainer.insertBefore(spacer, mainWrapper.nextSibling);
    } else {
      mainContainer.appendChild(mainWrapper);
      mainContainer.appendChild(spacer);
    }

    // Ensure cities location switcher, F/C buttons, version #, and last updated are directly in mainContainer below celestial spacer
    if (locSwitcher) {
      mainContainer.insertBefore(locSwitcher, spacer.nextSibling);
      const btnContainer = document.getElementById('temp-format-buttons');
      if (btnContainer) mainContainer.insertBefore(btnContainer, locSwitcher.nextSibling);
      const versionEl = document.getElementById('weather-version');
      if (versionEl) mainContainer.insertBefore(versionEl, (btnContainer || locSwitcher).nextSibling);
      if (lastUpdated) mainContainer.insertBefore(lastUpdated, (versionEl || btnContainer || locSwitcher).nextSibling);
    }

    // Clean up any stray standalone Earth container or spacer
    const oldEarthSpacer = document.getElementById('earth-image-spacer');
    if (oldEarthSpacer) oldEarthSpacer.remove();

    // Immediately synchronize world clocks and celestial flanking dials
    updateWorldClockHands();

    // =========================================================================
    // --- Left Sun: 27-Day Solar Rotation Engine (Single Cycle On-Demand) ---
    // =========================================================================
    let sunPreloadedImages = [];
    let isSunRotating = false;
    let sunFrameIndex = 0;
    let sunActiveLayer = 'a';

    if (SUN_ANIMATION_ENABLED && Array.isArray(SUN_ANIMATION_FRAMES) && SUN_ANIMATION_FRAMES.length > 0) {
      const framesPerDay = SUN_ANIMATION_FRAMES.length > 27 ? 2 : 1;
      const targetCount = Math.max(1, Math.min(SUN_ANIMATION_FRAMES.length, Math.round(SUN_ANIMATION_DAYS * framesPerDay + 1)));
      const activeFrameNames = SUN_ANIMATION_FRAMES.slice(-targetCount);
      const frameUrls = activeFrameNames.map(name => {
        let fn = name;
        if (SUN_ANIMATION_RESOLUTION === '300x300' && fn.includes('600x600')) {
          fn = fn.replace('600x600', '300x300');
        }
        if (fn === 'latest.jpg') {
          const resFile = SUN_ANIMATION_RESOLUTION === '300x300' ? '300x300.jpg' : '600x600.jpg';
          return `${SUN_IMAGE_BASE_URL}${resFile}?t=${Date.now()}`;
        }
        return SUN_IMAGE_BASE_URL + fn;
      });

      sunPreloadedImages = frameUrls.map((url) => {
        const pImg = new Image();
        pImg.src = url;
        return pImg;
      });

      // Default: Live sizzling sun displayed on Layer A
      if (leftSun && leftSun.img) {
        leftSun.img.src = SUN_SIZZLE_FRAMES_SEED[SUN_SIZZLE_FRAMES_SEED.length - 1] || SUN_IMAGE_URL;
        leftSun.img.style.zIndex = '1';
        leftSun.img.style.opacity = '1';
      }
      if (leftSun && leftSun.imgB) {
        leftSun.imgB.src = SUN_SIZZLE_FRAMES_SEED[SUN_SIZZLE_FRAMES_SEED.length - 1] || SUN_IMAGE_URL;
        leftSun.imgB.style.zIndex = '2';
        leftSun.imgB.style.opacity = '0';
      }

      function runSunCycleStep() {
        if (!isSunRotating || sunPreloadedImages.length <= 1) {
          isSunRotating = false;
          const sunLabel = document.getElementById('sun-label-left');
          if (sunLabel) sunLabel.textContent = SUN_LABEL_LEFT_DEFAULT_TEXT;
          return;
        }

        const totalFrames = sunPreloadedImages.length;
        const nextIdx = sunFrameIndex + 1;

        if (nextIdx >= totalFrames) {
          isSunRotating = false;
          sunAnimationTimeoutId = null;
          const sunLabel = document.getElementById('sun-label-left');
          if (sunLabel) sunLabel.textContent = SUN_LABEL_LEFT_DEFAULT_TEXT;
          if (SUN_SIZZLE_ENABLED && typeof startSunSizzleLoop === 'function') {
            startSunSizzleLoop();
          }
          return;
        }

        const nextImg = sunPreloadedImages[nextIdx];
        if (!nextImg || (!nextImg.complete && nextImg.naturalWidth === 0)) {
          sunAnimationTimeoutId = setTimeout(runSunCycleStep, 40);
          return;
        }

        const isLastFrame = nextIdx === totalFrames - 1;
        const isMobile = window.innerWidth <= 767;
        const fps = isMobile ? SUN_ANIMATION_FPS_MOBILE : SUN_ANIMATION_FPS_DESKTOP;
        const cruiseDelay = Math.max(20, Math.round(1000 / Math.max(1, fps)));

        let delay = cruiseDelay;
        if (SUN_ANIMATION_EASE_ENABLED && totalFrames > 10) {
          const easeFrames = isMobile ? SUN_ANIMATION_EASE_FRAMES_MOBILE : SUN_ANIMATION_EASE_FRAMES_DESKTOP;
          const maxDelay = isMobile ? SUN_ANIMATION_EASE_MAX_DELAY_MS_MOBILE : SUN_ANIMATION_EASE_MAX_DELAY_MS_DESKTOP;

          let factorIn = 0;
          if (nextIdx < easeFrames) {
            const progIn = nextIdx / easeFrames;
            factorIn = 0.5 * (1 + Math.cos(Math.PI * progIn));
          }

          let factorOut = 0;
          const distEnd = (totalFrames - 1) - nextIdx;
          if (distEnd >= 0 && distEnd < easeFrames) {
            const progOut = distEnd / easeFrames;
            factorOut = 0.5 * (1 + Math.cos(Math.PI * progOut));
          }

          const factor = Math.max(factorIn, factorOut);
          delay = Math.round(cruiseDelay + (maxDelay - cruiseDelay) * factor);
        }

        const baseFade = isMobile ? SUN_ANIMATION_CROSSFADE_MS_MOBILE : SUN_ANIMATION_CROSSFADE_MS_DESKTOP;
        const dynamicFade = SUN_ANIMATION_EASE_ENABLED
          ? Math.min(Math.round(delay * 0.65), Math.round(baseFade * 2.0))
          : Math.min(baseFade, Math.round(delay * 0.65));

        if (leftSun) {
          if (leftSun.img) leftSun.img.style.transitionDuration = `${dynamicFade}ms`;
          if (leftSun.imgB) leftSun.imgB.style.transitionDuration = `${dynamicFade}ms`;
        }

        if (SUN_ANIMATION_CROSSFADE_ENABLED && leftSun && leftSun.imgB) {
          if (sunActiveLayer === 'a') {
            leftSun.imgB.style.zIndex = '2';
            leftSun.img.style.zIndex = '1';
            leftSun.imgB.style.opacity = '1';
            leftSun.img.style.opacity = '0';
            sunActiveLayer = 'b';
            sunFrameIndex = nextIdx;

            if (!isLastFrame) {
              const cueIdx = nextIdx + 1;
              const cueImg = sunPreloadedImages[cueIdx];
              if (cueImg && cueImg.src) {
                setTimeout(() => {
                  if (leftSun && leftSun.img && sunActiveLayer === 'b') {
                    leftSun.img.src = cueImg.src;
                    if (leftSun.img.decode) leftSun.img.decode().catch(() => {});
                  }
                }, dynamicFade + 10);
              }
            }
          } else {
            leftSun.img.style.zIndex = '2';
            leftSun.imgB.style.zIndex = '1';
            leftSun.img.style.opacity = '1';
            leftSun.imgB.style.opacity = '0';
            sunActiveLayer = 'a';
            sunFrameIndex = nextIdx;

            if (!isLastFrame) {
              const cueIdx = nextIdx + 1;
              const cueImg = sunPreloadedImages[cueIdx];
              if (cueImg && cueImg.src) {
                setTimeout(() => {
                  if (leftSun && leftSun.imgB && sunActiveLayer === 'a') {
                    leftSun.imgB.src = cueImg.src;
                    if (leftSun.imgB.decode) leftSun.imgB.decode().catch(() => {});
                  }
                }, dynamicFade + 10);
              }
            }
          }
        } else if (leftSun && leftSun.img) {
          sunFrameIndex = nextIdx;
          if (nextImg && nextImg.src) leftSun.img.src = nextImg.src;
        }

        if (isLastFrame) {
          setTimeout(() => {
            isSunRotating = false;
            sunAnimationTimeoutId = null;
            const sunLabel = document.getElementById('sun-label-left');
            if (sunLabel) sunLabel.textContent = SUN_LABEL_LEFT_DEFAULT_TEXT;
            if (SUN_SIZZLE_ENABLED && typeof startSunSizzleLoop === 'function') {
              startSunSizzleLoop();
            }
          }, dynamicFade + 50);
        } else {
          sunAnimationTimeoutId = setTimeout(runSunCycleStep, delay);
        }
      }

      function triggerSunRotation() {
        if (isSunRotating || sunPreloadedImages.length <= 1) return;
        if (sunSizzleTimeoutId) {
          clearTimeout(sunSizzleTimeoutId);
          sunSizzleTimeoutId = null;
        }
        isSunRotating = true;
        sunFrameIndex = 0;
        sunActiveLayer = 'a';

        const sunLabel = document.getElementById('sun-label-left');
        if (sunLabel) sunLabel.textContent = SUN_LABEL_LEFT_ROTATING_TEXT;

        if (leftSun && leftSun.img) {
          leftSun.img.style.transitionDuration = '0ms';
          leftSun.img.src = sunPreloadedImages[0].src;
          leftSun.img.style.zIndex = '1';
          leftSun.img.style.opacity = '1';
        }
        if (leftSun && leftSun.imgB && sunPreloadedImages.length > 1) {
          leftSun.imgB.style.transitionDuration = '0ms';
          leftSun.imgB.src = sunPreloadedImages[1].src;
          leftSun.imgB.style.zIndex = '2';
          leftSun.imgB.style.opacity = '0';
        }

        const isMobile = window.innerWidth <= 767;
        const initFps = isMobile ? SUN_ANIMATION_FPS_MOBILE : SUN_ANIMATION_FPS_DESKTOP;
        const initDelay = Math.max(20, Math.round(1000 / Math.max(1, initFps)));
        if (sunAnimationTimeoutId) clearTimeout(sunAnimationTimeoutId);
        sunAnimationTimeoutId = setTimeout(runSunCycleStep, initDelay);
      }

      window.triggerSunRotation = triggerSunRotation;

      // =========================================================================
      // --- Left Sun: Sizzle Engine (Live Condition: Boiling Flare Activity) ---
      // =========================================================================
      let sunSizzleTimeoutId = null;
      let preloadedSizzleImages = [];
      let sizzleIndex = 0;
      let sizzleDirection = 1; // 1 = forward, -1 = backward
      let sizzleActiveLayer = 'a'; // 'a' or 'b' for dual-buffer smooth cross-dissolve
      let currentSizzleUrls = [...SUN_SIZZLE_FRAMES_SEED];

      function getNextSizzleStep(curIdx, curDir, total) {
        if (total <= 1) return { idx: 0, dir: 1, isEnd: true };
        if (SUN_SIZZLE_PLAYBACK_MODE === 'pingpong') {
          let newDir = curDir;
          let nextIdx = curIdx;
          let isEnd = false;
          if (newDir === 1) {
            if (curIdx >= total - 1) {
              newDir = -1;
              nextIdx = total - 2;
              isEnd = true;
            } else {
              nextIdx = curIdx + 1;
            }
          } else {
            if (curIdx <= 0) {
              newDir = 1;
              nextIdx = 1;
              isEnd = true;
            } else {
              nextIdx = curIdx - 1;
            }
          }
          return { idx: Math.max(0, Math.min(total - 1, nextIdx)), dir: newDir, isEnd };
        } else {
          const isEnd = curIdx >= total - 1;
          const nextIdx = (curIdx + 1) % total;
          return { idx: nextIdx, dir: 1, isEnd };
        }
      }

      function runSunSizzleStep() {
        if (!SUN_SIZZLE_ENABLED || isSunRotating || preloadedSizzleImages.length <= 1) return;

        const totalFrames = preloadedSizzleImages.length;
        if (totalFrames <= 1) return;

        const step = getNextSizzleStep(sizzleIndex, sizzleDirection, totalFrames);
        const nextImg = preloadedSizzleImages[step.idx];
        if (!nextImg || (!nextImg.complete && nextImg.naturalWidth === 0)) {
          sunSizzleTimeoutId = setTimeout(runSunSizzleStep, 40);
          return;
        }

        const isMobile = window.innerWidth <= 767;
        const fps = isMobile ? SUN_SIZZLE_FPS_MOBILE : SUN_SIZZLE_FPS_DESKTOP;
        let delay = Math.max(30, Math.round(1000 / Math.max(1, fps)));
        if (step.isEnd && SUN_SIZZLE_PAUSE_END_MS > 0) delay += SUN_SIZZLE_PAUSE_END_MS;

        const sizzleFade = isMobile ? SUN_SIZZLE_CROSSFADE_MS_MOBILE : SUN_SIZZLE_CROSSFADE_MS_DESKTOP;
        const fadeDuration = Math.min(sizzleFade, Math.round(delay * 0.65));

        if (leftSun && leftSun.imgB) {
          if (leftSun.img) leftSun.img.style.transitionDuration = `${fadeDuration}ms`;
          if (leftSun.imgB) leftSun.imgB.style.transitionDuration = `${fadeDuration}ms`;

          if (sizzleActiveLayer === 'a') {
            leftSun.imgB.src = nextImg.src;
            leftSun.imgB.style.zIndex = '2';
            leftSun.img.style.zIndex = '1';
            leftSun.imgB.style.opacity = '1';
            leftSun.img.style.opacity = '0';
            sizzleActiveLayer = 'b';
            sizzleIndex = step.idx;
            sizzleDirection = step.dir;

            const cueStep = getNextSizzleStep(sizzleIndex, sizzleDirection, totalFrames);
            const cueImg = preloadedSizzleImages[cueStep.idx];
            if (cueImg && cueImg.src) {
              setTimeout(() => {
                if (leftSun && leftSun.img && sizzleActiveLayer === 'b') {
                  leftSun.img.src = cueImg.src;
                  if (leftSun.img.decode) leftSun.img.decode().catch(() => {});
                }
              }, fadeDuration + 10);
            }
          } else {
            leftSun.img.src = nextImg.src;
            leftSun.img.style.zIndex = '2';
            leftSun.imgB.style.zIndex = '1';
            leftSun.img.style.opacity = '1';
            leftSun.imgB.style.opacity = '0';
            sizzleActiveLayer = 'a';
            sizzleIndex = step.idx;
            sizzleDirection = step.dir;

            const cueStep = getNextSizzleStep(sizzleIndex, sizzleDirection, totalFrames);
            const cueImg = preloadedSizzleImages[cueStep.idx];
            if (cueImg && cueImg.src) {
              setTimeout(() => {
                if (leftSun && leftSun.imgB && sizzleActiveLayer === 'a') {
                  leftSun.imgB.src = cueImg.src;
                  if (leftSun.imgB.decode) leftSun.imgB.decode().catch(() => {});
                }
              }, fadeDuration + 10);
            }
          }
        } else if (leftSun && leftSun.img) {
          sizzleIndex = step.idx;
          sizzleDirection = step.dir;
          if (nextImg && nextImg.src) leftSun.img.src = nextImg.src;
        }

        sunSizzleTimeoutId = setTimeout(runSunSizzleStep, delay);
      }

      function startSunSizzleLoop() {
        if (!SUN_SIZZLE_ENABLED || isSunRotating || preloadedSizzleImages.length <= 1) return;
        if (sunSizzleTimeoutId) clearTimeout(sunSizzleTimeoutId);
        sizzleActiveLayer = 'a';
        if (leftSun && leftSun.img && preloadedSizzleImages[sizzleIndex]) {
          leftSun.img.style.transitionDuration = '0ms';
          leftSun.img.src = preloadedSizzleImages[sizzleIndex].src;
          leftSun.img.style.zIndex = '1';
          leftSun.img.style.opacity = '1';
        }
        if (leftSun && leftSun.imgB) {
          leftSun.imgB.style.transitionDuration = '0ms';
          leftSun.imgB.style.zIndex = '2';
          leftSun.imgB.style.opacity = '0';
        }
        const isMobile = window.innerWidth <= 767;
        const fps = isMobile ? SUN_SIZZLE_FPS_MOBILE : SUN_SIZZLE_FPS_DESKTOP;
        const initDelay = Math.max(30, Math.round(1000 / Math.max(1, fps)));
        sunSizzleTimeoutId = setTimeout(runSunSizzleStep, initDelay);
      }

      function setupSizzleFrames(urls, isInitial = false) {
        const uniqueUrls = Array.from(new Set(urls)).sort();
        if (uniqueUrls.length === 0) return;

        const steppedUrls = SUN_SIZZLE_FRAME_STEP > 1
          ? uniqueUrls.filter((_, idx) => (uniqueUrls.length - 1 - idx) % SUN_SIZZLE_FRAME_STEP === 0)
          : uniqueUrls;

        const frameLimit = Math.max(2, Math.min(steppedUrls.length, SUN_SIZZLE_FRAME_COUNT));
        const selectedUrls = steppedUrls.slice(-frameLimit).map(u => {
          if (SUN_ANIMATION_RESOLUTION === '300x300') {
            return u.replace('600x600', '300x300');
          }
          return u;
        });

        if (isInitial || preloadedSizzleImages.length === 0) {
          preloadedSizzleImages = selectedUrls.map(u => {
            const imgObj = new Image();
            imgObj.src = u;
            return imgObj;
          });
          sizzleIndex = 0;
          sizzleDirection = 1;
          sizzleActiveLayer = 'a';

          if (leftSun && leftSun.img && preloadedSizzleImages[0]) {
            leftSun.img.src = preloadedSizzleImages[0].src;
            leftSun.img.style.zIndex = '1';
            leftSun.img.style.opacity = '1';
          }
          if (leftSun && leftSun.imgB && preloadedSizzleImages.length > 1) {
            leftSun.imgB.src = preloadedSizzleImages[1].src;
            leftSun.imgB.style.zIndex = '2';
            leftSun.imgB.style.opacity = '0';
          }

          if (!sunSizzleTimeoutId && !isSunRotating && preloadedSizzleImages.length > 1) {
            const isMobile = window.innerWidth <= 767;
            const fps = isMobile ? SUN_SIZZLE_FPS_MOBILE : SUN_SIZZLE_FPS_DESKTOP;
            const initDelay = Math.max(30, Math.round(1000 / Math.max(1, fps)));
            sunSizzleTimeoutId = setTimeout(runSunSizzleStep, initDelay);
          }
        } else {
          // Seamless hot-swap: Preload new batch in background so running loop never stutters
          let loaded = 0;
          const newImages = selectedUrls.map(u => {
            const imgObj = new Image();
            imgObj.onload = () => { loaded++; };
            imgObj.onerror = () => { loaded++; };
            imgObj.src = u;
            return imgObj;
          });

          const swapWhenReady = () => {
            if (loaded >= Math.min(8, selectedUrls.length)) {
              preloadedSizzleImages = newImages;
              sizzleIndex = Math.max(0, Math.min(preloadedSizzleImages.length - 1, sizzleIndex));
            } else {
              setTimeout(swapWhenReady, 100);
            }
          };
          swapWhenReady();
        }
      }

      if (SUN_SIZZLE_ENABLED && Array.isArray(currentSizzleUrls) && currentSizzleUrls.length > 0) {
        setupSizzleFrames(currentSizzleUrls, true);
      }

      // Auto-fetch freshest live frames from NOAA STAR SUVI Fe195
      async function refreshLiveSizzleFrames() {
        try {
          const band = SUN_SIZZLE_BAND || 'Fe195';
          const length = Math.max(60, Math.min(300, SUN_SIZZLE_FETCH_LENGTH || 240));
          const res = await fetch(`https://www.star.nesdis.noaa.gov/goes/SUVI_band.php?sat=G19&band=${band}&length=${length}&_t=${Date.now()}`, {
            cache: 'no-store'
          });
          if (!res.ok) throw new Error(`SUVI HTTP status ${res.status}`);
          const html = await res.text();
          const regex = new RegExp(`src=['"](https:\\/\\/cdn\\.star\\.nesdis\\.noaa\\.gov\\/GOES19\\/SUVI\\/FD\\/${band}\\/[0-9]+_GOES19-SUVI-${band}-600x600\\.jpg)['"]`, 'g');
          const matches = [...html.matchAll(regex)];
          if (matches && matches.length >= 2) {
            const rawUrls = matches.map(m => m[1]);
            currentSizzleUrls = rawUrls;
            setupSizzleFrames(currentSizzleUrls, false);
            return;
          }
        } catch (err) {
          console.warn('Auto-refresh of SUVI frames skipped (using active frames):', err);
        }
      }

      setTimeout(refreshLiveSizzleFrames, 2500);
      setInterval(refreshLiveSizzleFrames, SUN_SIZZLE_AUTO_REFRESH_MS);
    }

    // =========================================================================
    // --- Right Earth: GeoColor Rotation Engine (Single Cycle On-Demand) ---
    // =========================================================================
    let earthPreloadedImages = [];
    let isEarthRotating = false;
    let earthFrameIndex = 0;
    let earthActiveLayer = 'a';

    const isDayNight = EARTH_ANIMATION_MODE === 'daynight';
    const earthFetchLength = isDayNight ? EARTH_DAYNIGHT_FETCH_LENGTH : EARTH_WEATHER_FETCH_LENGTH;
    const earthFrameStep = Math.max(1, Math.round(isDayNight ? EARTH_DAYNIGHT_FRAME_STEP : EARTH_WEATHER_FRAME_STEP));
    const earthFrameCount = isDayNight ? EARTH_DAYNIGHT_FRAME_COUNT : EARTH_WEATHER_FRAME_COUNT;
    const earthFps = isDayNight ? EARTH_DAYNIGHT_FPS : EARTH_WEATHER_FPS;
    const earthResSize = EARTH_ANIMATION_RESOLUTION === '339x339' ? '339x339' : '678x678';

    function setupEarthPreload(rawUrls) {
      const uniqueUrls = Array.from(new Set(rawUrls)).sort();
      if (uniqueUrls.length === 0) return;

      const steppedUrls = earthFrameStep > 1
        ? uniqueUrls.filter((_, idx) => (uniqueUrls.length - 1 - idx) % earthFrameStep === 0)
        : uniqueUrls;

      const frameLimit = Math.max(2, Math.min(steppedUrls.length, earthFrameCount));
      const selectedUrls = steppedUrls.slice(-frameLimit).map(u => u.replace('1808x1808', earthResSize));

      earthPreloadedImages = selectedUrls.map(url => {
        const img = new Image();
        img.src = url;
        return img;
      });
    }

    // Seed frames loaded immediately
    if (Array.isArray(EARTH_FRAMES_SEED) && EARTH_FRAMES_SEED.length > 0) {
      setupEarthPreload(EARTH_FRAMES_SEED);
    }

    // Default: Static live Earth displayed on Layer A
    if (rightEarth && rightEarth.img) {
      rightEarth.img.src = EARTH_IMAGE_URL;
      rightEarth.img.style.zIndex = '1';
      rightEarth.img.style.opacity = '1';
    }
    if (rightEarth && rightEarth.imgB) {
      rightEarth.imgB.src = EARTH_IMAGE_URL;
      rightEarth.imgB.style.zIndex = '2';
      rightEarth.imgB.style.opacity = '0';
    }

    function runEarthCycleStep() {
      if (!isEarthRotating || earthPreloadedImages.length <= 1) {
        isEarthRotating = false;
        const earthLabel = document.getElementById('sun-label-right');
        if (earthLabel) earthLabel.textContent = SUN_LABEL_RIGHT_DEFAULT_TEXT;
        return;
      }

      const totalFrames = earthPreloadedImages.length;
      const nextIdx = earthFrameIndex + 1;

      if (nextIdx >= totalFrames) {
        isEarthRotating = false;
        earthAnimationTimeoutId = null;
        const earthLabel = document.getElementById('sun-label-right');
        if (earthLabel) earthLabel.textContent = SUN_LABEL_RIGHT_DEFAULT_TEXT;
        return;
      }

      const nextImg = earthPreloadedImages[nextIdx];
      if (!nextImg || (!nextImg.complete && nextImg.naturalWidth === 0)) {
        earthAnimationTimeoutId = setTimeout(runEarthCycleStep, 40);
        return;
      }

      const isLastFrame = nextIdx === totalFrames - 1;
      const delay = Math.round(1000 / Math.max(1, earthFps));
      const isMobile = window.innerWidth <= 767;
      const crossfadeDuration = isMobile ? EARTH_ANIMATION_CROSSFADE_MS_MOBILE : EARTH_ANIMATION_CROSSFADE_MS_DESKTOP;
      const fadeDuration = Math.min(crossfadeDuration, Math.round(delay * 0.65));

      if (rightEarth) {
        if (rightEarth.img) rightEarth.img.style.transitionDuration = `${fadeDuration}ms`;
        if (rightEarth.imgB) rightEarth.imgB.style.transitionDuration = `${fadeDuration}ms`;
      }

      if (EARTH_ANIMATION_CROSSFADE_ENABLED && rightEarth && rightEarth.imgB) {
        if (earthActiveLayer === 'a') {
          rightEarth.imgB.style.zIndex = '2';
          rightEarth.img.style.zIndex = '1';
          rightEarth.imgB.style.opacity = '1';
          rightEarth.img.style.opacity = '0';
          earthActiveLayer = 'b';
          earthFrameIndex = nextIdx;

          if (!isLastFrame) {
            const cueIdx = nextIdx + 1;
            const cueImg = earthPreloadedImages[cueIdx];
            if (cueImg && cueImg.src) {
              setTimeout(() => {
                if (rightEarth && rightEarth.img && earthActiveLayer === 'b') {
                  rightEarth.img.src = cueImg.src;
                  if (rightEarth.img.decode) rightEarth.img.decode().catch(() => {});
                }
              }, fadeDuration + 10);
            }
          }
        } else {
          rightEarth.img.style.zIndex = '2';
          rightEarth.imgB.style.zIndex = '1';
          rightEarth.img.style.opacity = '1';
          rightEarth.imgB.style.opacity = '0';
          earthActiveLayer = 'a';
          earthFrameIndex = nextIdx;

          if (!isLastFrame) {
            const cueIdx = nextIdx + 1;
            const cueImg = earthPreloadedImages[cueIdx];
            if (cueImg && cueImg.src) {
              setTimeout(() => {
                if (rightEarth && rightEarth.imgB && earthActiveLayer === 'a') {
                  rightEarth.imgB.src = cueImg.src;
                  if (rightEarth.imgB.decode) rightEarth.imgB.decode().catch(() => {});
                }
              }, fadeDuration + 10);
            }
          }
        }
      } else if (rightEarth && rightEarth.img) {
        earthFrameIndex = nextIdx;
        if (nextImg && nextImg.src) rightEarth.img.src = nextImg.src;
      }

      if (isLastFrame) {
        setTimeout(() => {
          isEarthRotating = false;
          earthAnimationTimeoutId = null;
          const earthLabel = document.getElementById('sun-label-right');
          if (earthLabel) earthLabel.textContent = SUN_LABEL_RIGHT_DEFAULT_TEXT;
        }, fadeDuration + 50);
      } else {
        earthAnimationTimeoutId = setTimeout(runEarthCycleStep, delay);
      }
    }

    function triggerEarthRotation() {
      if (isEarthRotating || earthPreloadedImages.length <= 1) return;
      isEarthRotating = true;
      earthFrameIndex = 0;
      earthActiveLayer = 'a';

      const earthLabel = document.getElementById('sun-label-right');
      if (earthLabel) earthLabel.textContent = SUN_LABEL_RIGHT_ROTATING_TEXT;

      if (rightEarth && rightEarth.img) {
        rightEarth.img.style.transitionDuration = '0ms';
        rightEarth.img.src = earthPreloadedImages[0].src;
        rightEarth.img.style.zIndex = '1';
        rightEarth.img.style.opacity = '1';
      }
      if (rightEarth && rightEarth.imgB && earthPreloadedImages.length > 1) {
        rightEarth.imgB.style.transitionDuration = '0ms';
        rightEarth.imgB.src = earthPreloadedImages[1].src;
        rightEarth.imgB.style.zIndex = '2';
        rightEarth.imgB.style.opacity = '0';
      }

      const initDelay = Math.round(1000 / Math.max(1, earthFps));
      if (earthAnimationTimeoutId) clearTimeout(earthAnimationTimeoutId);
      earthAnimationTimeoutId = setTimeout(runEarthCycleStep, initDelay);
    }

    window.triggerEarthRotation = triggerEarthRotation;

    async function refreshLiveEarthFrames() {
      try {
        const url = `https://www.star.nesdis.noaa.gov/goes/fulldisk_band.php?sat=G19&band=GEOCOLOR&length=${earthFetchLength}&_t=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`NOAA Earth HTTP ${res.status}`);
        const html = await res.text();
        const matches = [...html.matchAll(/'(https:\/\/cdn\.star\.nesdis\.noaa\.gov\/GOES19\/ABI\/FD\/GEOCOLOR\/[0-9]+_GOES19-ABI-FD-GEOCOLOR-1808x1808\.jpg)'/g)];
        if (matches && matches.length >= 2) {
          const rawUrls = matches.map(m => m[1]);
          setupEarthPreload(rawUrls);
        }
      } catch (err) {
        console.warn('Auto-refresh of Earth satellite frames skipped:', err);
      }
    }

    setTimeout(refreshLiveEarthFrames, 2000);
    setInterval(refreshLiveEarthFrames, EARTH_ANIMATION_AUTO_REFRESH_MS);

    // Initial load trigger (default false: stays static live until clicked or 5-min refresh)
    if (CELESTIAL_ROTATE_ON_INITIAL_LOAD) {
      setTimeout(() => {
        triggerCelestialRotations();
      }, 1500);
    }
  }

  function createEarthImageIfMissing() {
    // Earth is integrated side-by-side with Sun in the duo row
    createSunImageIfMissing();
  }

  /* --- Animated background helpers (subtle, complementary pair) ---
    - Derives two soft background colors from the temp color (HSL) and sets
      the CSS custom property `--gradient` which `body.animated-gradient::before`
      already consumes.
    - Defaults: complementary pair, subtle saturation/lightness, low hue variance.
    - Keep this small and easy to tweak.
  */

  function parseHslString(hsl) {
    if (!hsl || typeof hsl !== 'string') return null;
    const m = hsl.match(/hsl\(\s*([\d\.]+)\s*,\s*([\d\.]+)%\s*,\s*([\d\.]+)%\s*\)/i);
    if (!m) return null;
    return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function deriveComplementaryPairFromHsl(h, s, l, opts = {}) {
    // opts: {variance: number, soften: number, alpha: number, lightDelta: number}
    // Produce a pair that is clearly related to the complementary hue, but with
    // slightly more perceptible difference: wider hue variance by default and a
    // small lightness delta so the two colors read as a pair yet remain subtle.
    const variance = (typeof opts.variance === 'number') ? opts.variance : 72; // larger hue spread (degrees)
    const soften = (typeof opts.soften === 'number') ? opts.soften : 0.6; // reduce saturation for backgrounds
    const alpha = (typeof opts.alpha === 'number') ? opts.alpha : 1;
    const lightDelta = (typeof opts.lightDelta === 'number') ? opts.lightDelta : 0.92; // make second slightly darker

    h = ((h % 360) + 360) % 360;
    const comp = (h + 180) % 360; // complementary hue

    // Both hues are variations around the complementary hue
    const h1 = (comp - variance / 2 + 360) % 360;
    const h2 = (comp + variance / 2) % 360;

    // Use similar saturation but allow second color to be a touch darker
    const sCommon = clamp(s * soften, 6, 78);
    const lCommon = clamp(l * 1.08, 34, 92);
    const l2 = clamp(lCommon * lightDelta, 28, 92);

    const c1 = `hsla(${h1.toFixed(1)}, ${sCommon.toFixed(1)}%, ${lCommon.toFixed(1)}%, ${alpha})`;
    const c2 = `hsla(${h2.toFixed(1)}, ${sCommon.toFixed(1)}%, ${l2.toFixed(1)}%, ${alpha})`;
    return [c1, c2];
  }

  // Derive a pair of darker variations based on the source HSL (same hue family)
  // opts: { darken1, darken2, soften, alpha, hueShift }
  function deriveDarkerPairFromHsl(h, s, l, opts = {}) {
    // make defaults much darker: lower multiplicative factors produce darker shades
    // Make defaults much darker and increase contrast between the two shades.
    // darken1 (lighter of the pair) and darken2 (darker of the pair) are multiplicative
    // factors applied to the source lightness. Smaller values -> darker colors.
    // Increase contrast defaults: slightly darker lighter-shade, much darker darker-shade,
    // keep saturation high, and widen hue shift for stronger separation.
    const darken1 = (typeof opts.darken1 === 'number') ? opts.darken1 : 0.38;
    const darken2 = (typeof opts.darken2 === 'number') ? opts.darken2 : 0.08;
    // keep saturation near original to preserve vividness
    const soften = (typeof opts.soften === 'number') ? opts.soften : 1.0;
    const alpha = (typeof opts.alpha === 'number') ? opts.alpha : 1;

    // Use a random hue in the red-purple-blue range (240 to 370 modulo 360)
    // Spans from Blue (240) -> Violet -> Magenta -> Red -> Red-Orange (10)
    const minHue = 240;
    const maxHue = 370;
    const randomHue = (minHue + Math.floor(Math.random() * (maxHue - minHue + 1))) % 360;

    // allow boosting saturation for the background shades
    const saturate = (typeof opts.saturate === 'number') ? opts.saturate : 1.25; // 25% more saturation by default
    const sCommon = clamp(s * soften * saturate, 6, 100);
    // Compute initial lightness values
    let l1 = clamp(l * darken1, 5, 92);
    let l2 = clamp(l * darken2, 5, 92);
    // Enforce a minimum lightness delta so the two shades are perceptually distinct
    const minDelta = (typeof opts.minDelta === 'number') ? opts.minDelta : 18; // percentage points
    if (Math.abs(l1 - l2) < minDelta) {
      // Ensure l1 is the lighter of the pair; if not, swap
      if (l1 < l2) {
        const tmp = l1; l1 = l2; l2 = tmp;
      }
      // Lower l2 to guarantee separation while keeping within bounds
      l2 = clamp(l1 - minDelta, 5, 92);
    }

    const c1 = `hsla(${randomHue.toFixed(1)}, ${sCommon.toFixed(1)}%, ${l1.toFixed(1)}%, ${alpha})`;
    const c2 = `hsla(${randomHue.toFixed(1)}, ${sCommon.toFixed(1)}%, ${l2.toFixed(1)}%, ${alpha})`;
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_8612_4_8612_90_4`,`🎨 Background Gradient: Hue=${randomHue}° | Color1=${c1} | Color2=${c2}`));
    
    return [c1, c2];
  }

  // Compute a midpoint HSL color between two hsla(...) strings.
  function midpointHslColor(c1, c2) {
    const p1 = parseHslString(c1);
    const p2 = parseHslString(c2);
    if (!p1 && !p2) return null;
    if (!p1) return c2;
    if (!p2) return c1;
    let [h1, s1, l1] = p1;
    let [h2, s2, l2] = p2;
    // Interpolate hue on the shortest path around the circle
    let dh = h2 - h1;
    if (Math.abs(dh) > 180) {
      if (dh > 0) h1 += 360;
      else h2 += 360;
    }
    const hMid = ((h1 + h2) / 2) % 360;
    const sMid = (s1 + s2) / 2;
    const lMid = (l1 + l2) / 2;
    return `hsl(${hMid.toFixed(1)}, ${sMid.toFixed(1)}%, ${lMid.toFixed(1)}%)`;
  }

  function setAnimatedGradientFromTemp(temp, opts = {}) {
    // opts: {type: 'linear'|'conic', variance, soften, alpha}
    // Default to linear subtle gradient (user requested linear)
    const type = opts.type || 'linear';
    const alpha = (typeof opts.alpha === 'number') ? opts.alpha : 1;
    // ensure we have a color
    const base = (typeof temp === 'number') ? tempToColor(temp) : null;
    let cols = null;
    if (base) {
      const parsed = parseHslString(base);
      if (parsed) {
        // By default derive two darker shades of the temp color (easily configurable via opts)
        cols = deriveDarkerPairFromHsl(parsed[0], parsed[1], parsed[2], opts);
        // If caller explicitly requests complementary behavior, allow it
        if (opts.mode === 'complementary') cols = deriveComplementaryPairFromHsl(parsed[0], parsed[1], parsed[2], opts);
      }
    }

    // fallback neutral pair
    if (!cols) cols = ['hsla(220, 12%, 92%, 1)', 'hsla(280, 10%, 88%, 1)'];

    // subtle linear gradient by default, full 0%..100% so colors remain similar
    let gradient = '';
    // allow angle override (use vertical/"to bottom" by default)
    const angle = (typeof opts.angle === 'string' || typeof opts.angle === 'number') ? opts.angle : '180deg';
    if (type === 'linear') {
      gradient = `linear-gradient(${angle}, ${cols[0]} 0%, ${cols[1]} 100%)`;
    } else {
      // keep conic available but more restrained
      gradient = `conic-gradient(from 0deg, ${cols[0]} 0%, ${cols[1]} 45%, ${cols[0]} 75%)`;
    }

    // apply the CSS variable used by the pseudo-element
    document.documentElement.style.setProperty('--gradient', gradient);
    // Store the lighter color (cols[0]) for use in banners/overlays
    document.documentElement.style.setProperty('--gradient-light', cols[0]);
    // Store the darker color (cols[1]) for reference
    document.documentElement.style.setProperty('--gradient-dark', cols[1]);
    document.body.classList.add('animated-gradient');

    // Use a dedicated fixed background layer to prevent iOS Safari black-screen bounce glitches.
    let bg = document.getElementById('fixed-bg');
    if (!bg) {
        bg = document.createElement('div');
        bg.id = 'fixed-bg';
        bg.style.position = 'fixed';
        bg.style.top = '0';
        bg.style.left = '0';
        bg.style.right = '0';
        bg.style.bottom = '0';
        bg.style.zIndex = '-9999';
        bg.style.pointerEvents = 'none';
        document.body.insertBefore(bg, document.body.firstChild);
    }
    bg.style.backgroundImage = gradient;
    
    // Remove buggy background styles from the body
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundAttachment = 'scroll';

    // Set the iOS overscroll areas (bounce areas) to permanent black
    document.documentElement.style.backgroundColor = 'black';
    document.body.style.backgroundColor = 'transparent'; // Let HTML black show through bounce, but keep gradient visible
    
    // Update the iOS Safari status bar (safe area) to match the top of the gradient
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = 'black';
  }

  // Expose a small API so you can change behavior interactively: e.g. from console
  if (!window.Weather) window.Weather = {};
  window.Weather.setAnimatedGradientFromTemp = (temp, opts) => setAnimatedGradientFromTemp(temp, opts);
  window.Weather.deriveComplementaryPairFromHsl = deriveComplementaryPairFromHsl;

  // If we have a previously stored current temp (from last session/run), reapply the gradient
  try {
    const last = localStorage.getItem('weather_last_temp_raw');
    if (last != null) {
      const lastTemp = Number(last);
      if (!Number.isNaN(lastTemp)) setAnimatedGradientFromTemp(lastTemp, { variance: 72 });
    }
  } catch (e) { /* noop */ }
  /* Create or update the next-7-days highs dots (placed under the timestamp)
    Shows the next 7 days (tomorrow..+7) and displays a white, bold temperature label inside each dot */
  function updateDaysHighs(data) {
    const containerId = 'weather-days-highs';
    let container = document.getElementById(containerId);
    // If missing, create it right after the last-updated element
    if (!container) {
      const last = document.getElementById('weather-last-updated');
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'days-highs';
      if (last && last.parentNode) last.parentNode.insertBefore(container, last.nextSibling);
      else (document.querySelector('main.content') || document.body).appendChild(container);
    }

    // Gather next 7 days highs (skip current day)
    const highs = (data.daily || []).slice(1, 8).map(d => (d && d.temp && (typeof d.temp.max === 'number')) ? d.temp.max : null);

    // Ensure exactly 7 dot elements exist
    for (let i = 0; i < 7; i++) {
      const temp = highs[i] != null ? highs[i] : null;
      let dot = container.children[i];
      if (!dot) {
        dot = document.createElement('div');
        dot.className = 'days-highs__dot';

        // inner label for temperature
        const label = document.createElement('span');
        label.className = 'days-highs__dot-label';
        dot.appendChild(label);

        // peak triangle (hidden by default) — will be shown for the warmest day(s)
        const peak = document.createElement('span');
        peak.className = 'days-highs__peak';
        dot.appendChild(peak);

        container.appendChild(dot);
      }

      const label = dot.querySelector('.days-highs__dot-label');
      const peakEl = dot.querySelector('.days-highs__peak');
      if (temp != null) {
        const rounded = Math.round(temp);
        dot.style.backgroundColor = tempToColor(temp) || 'rgba(255,255,255,0.08)';
        label.innerHTML = `<span class="fc-mode-text">${rounded}</span>`;
        dot.title = `High: ${rounded}°`;
        dot.setAttribute('aria-label', dot.title);

        // initialize peak color (hidden by default)
        if (peakEl) {
          peakEl.style.borderTopColor = 'rgba(0,0,0,0)';
          peakEl.classList.remove('days-highs__peak--visible');
        }
      } else {
        dot.style.backgroundColor = 'rgba(255,255,255,0.08)';
        label.textContent = '--';
        dot.title = 'No data';
        dot.setAttribute('aria-label', dot.title);
        if (peakEl) {
          peakEl.style.borderTopColor = 'rgba(0,0,0,0)';
          peakEl.classList.remove('days-highs__peak--visible');
        }
      }
    }

    // Remove any extra elements beyond 7
    while (container.children.length > 7) container.removeChild(container.lastChild);

    // Determine the warmest high value and show peaks for any matching days
    const validHighs = highs.map(h => (typeof h === 'number' ? h : -Infinity));
    const maxHigh = Math.max(...validHighs);
    if (Number.isFinite(maxHigh)) {
      for (let i = 0; i < 7; i++) {
        const dot = container.children[i];
        const peak = dot && dot.querySelector ? dot.querySelector('.days-highs__peak') : null;
        const t = highs[i];
        if (peak) {
          if (typeof t === 'number' && Math.round(t) === Math.round(maxHigh)) {
            const rounded = Math.round(t);
            const color = tempToColor(t) || 'rgba(255,255,255,0.9)';
            peak.style.borderTopColor = color;
            peak.title = `Warmest: ${rounded}°`;
            peak.classList.add('days-highs__peak--visible');
          } else {
            peak.style.borderTopColor = 'rgba(0,0,0,0)';
            peak.title = '';
            peak.classList.remove('days-highs__peak--visible');
          }
        }
      }
    } else {
      // hide all peaks if no valid highs
      for (let i = 0; i < 7; i++) {
        const dot = container.children[i];
        const peak = dot && dot.querySelector ? dot.querySelector('.days-highs__peak') : null;
        if (peak) {
          peak.style.borderTopColor = 'rgba(0,0,0,0)';
          peak.classList.remove('days-highs__peak--visible');
        }
      }
    }
  }

  function updateDaysRain(data) {
    const containerId = 'weather-days-rain';
    let container = document.getElementById(containerId);
    // If missing, create it right after the highs container
    if (!container) {
      const highs = document.getElementById('weather-days-highs');
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'days-highs days-rain';
      if (highs && highs.parentNode) highs.parentNode.insertBefore(container, highs.nextSibling);
      else (document.querySelector('main.content') || document.body).appendChild(container);
    }

    // Derive brighter color from current temperature (same as wind gust bar)
    let brighterColor = null;
    const currentTemp = data?.current?.temp || null;
    if (currentTemp !== null) {
      const tempColor = tempToColor(currentTemp);
      if (tempColor) {
        const parsed = parseHslString(tempColor);
        if (parsed) {
          const [h, s, l] = parsed;
          const brighterL = Math.min(l + 18, 92);
          brighterColor = `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${brighterL.toFixed(1)}%)`;
        }
      }
    }

    // Gather next 7 days rain probability and rain amount (skip current day)
    const rainData = (data.daily || []).slice(1, 8).map((d, index) => {
      const date = new Date(d.dt * 1000);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
      return {
        pop: (d && typeof d.pop === 'number') ? d.pop : 0,
        rain: (d && d.rain) ? d.rain : 0,
        date: dayName,
        dt: d.dt
      };
    });
    
    // Debug: log rain probabilities with dates
    /* eslint-disable */console.log(...oo_oo(`2266558813_8869_4_8869_54_4`,'Rain probabilities for next 7 days:'));
    rainData.forEach((d, i) => {
      /* eslint-disable */console.log(...oo_oo(`2266558813_8871_6_8871_95_4`,`  ${d.date}: ${(d.pop * 100).toFixed(0)}% (${(d.rain / 25.4).toFixed(2)}")`));
    });

    // Ensure exactly 7 dot elements exist
    for (let i = 0; i < 7; i++) {
      const { pop, rain } = rainData[i] || { pop: 0, rain: 0 };
      let dot = container.children[i];
      if (!dot) {
        dot = document.createElement('div');
        dot.className = 'days-highs__dot days-rain__dot';

        // inner label for rain amount
        const label = document.createElement('span');
        label.className = 'days-rain__dot-label';
        dot.appendChild(label);

        container.appendChild(dot);
      }

      const label = dot.querySelector('.days-rain__dot-label');
      
      // Set visual intensity based on rain probability using background alpha,
      // so the text itself can remain fully opaque.
      // Use brighter temp color (same as wind gust bar) instead of white
      const opacity = pop; // pop is already 0-1
      dot.style.opacity = '1';
      if (brighterColor) {
        // Extract HSL values and apply as HSLA with opacity
        const hslMatch = brighterColor.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
        if (hslMatch) {
          dot.style.backgroundColor = `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${opacity.toFixed(2)})`;
        } else {
          dot.style.backgroundColor = `rgba(255, 255, 255, ${opacity.toFixed(2)})`;
        }
      } else {
        dot.style.backgroundColor = `rgba(255, 255, 255, ${opacity.toFixed(2)})`;
      }
      
      // Display rain amount in inches (API returns mm, convert to inches: mm / 25.4)
      const rainMm = typeof rain === 'number' ? rain : 0;
      const rainInches = rainMm / 25.4;
      if (label) {
        // Format without leading zero (e.g., ".15" instead of "0.15")
        const formatted = rainInches >= MIN_RAIN_DISPLAY_THRESHOLD ? rainInches.toFixed(2).replace(/^0\./, '.') : '';
        label.textContent = formatted ? `${formatted} "` : '';
        
        // Set text color based on opacity: high opacity (bright) = black text, low opacity (faint) = white text
        // Threshold around 0.5 opacity. Text itself is always fully opaque.
        label.style.color = opacity > 0.5 ? '#000' : '#fff';
        label.style.textShadow = opacity > 0.5 ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.65), 0 4px 10px rgba(0, 0, 0, 0.3)';
      }
      
      const percent = Math.round(pop * 100);
      dot.title = `${percent}% chance, ${rainInches.toFixed(2).replace(/^0\./, '.')}" rain`;
      dot.setAttribute('aria-label', dot.title);
    }

    // Remove any extra elements beyond 7
    while (container.children.length > 7) container.removeChild(container.lastChild);
  }

  // Update the rainItem elements in the rainContainer with rain percentage and opacity
  function updateRainItems(data) {
    const rainItems = document.querySelectorAll('.rainItem');
    if (!rainItems.length) return;

    // Get next 7-8 days rain probability (includes today as index 0)
    const dailyData = data.daily || [];

    rainItems.forEach((item, index) => {
      const dayData = dailyData[index];
      if (!dayData) return;

      // Get rain probability (0-1 scale)
      const pop = (typeof dayData.pop === 'number') ? dayData.pop : 0;
      
      // Get rain amount in mm and convert to inches
      const rainMm = (dayData && dayData.rain) ? dayData.rain : 0;
      const rainInches = rainMm / 25.4;
      const formattedRain = rainInches.toFixed(2);
      
      // Convert probability to percentage for display
      const percent = Math.round(pop * 100);
      
      // Set the text content to show rain amount in inches (only if > threshold)
      if (percent > 0 && rainInches >= MIN_RAIN_DISPLAY_THRESHOLD) {
        // Format without leading zero (e.g., ".15" instead of "0.15")
        const formatted = formattedRain.replace(/^0\./, '.');
        
        // Wrap text in a span so we can counter-scale it when cell stretches
        if (!item.querySelector('.rain-text')) {
          item.innerHTML = `<span class="rain-text">${formatted}"</span>`;
        } else {
          item.querySelector('.rain-text').textContent = `${formatted}"`;
        }
      } else {
        item.textContent = '';
      }
      
      // Only show cell if there's actual rain amount predicted that meets the threshold
      // Hide cell completely if under threshold, regardless of percentage
      item.style.display = '';  // Ensure it takes up space in the layout
      if (rainInches >= MIN_RAIN_DISPLAY_THRESHOLD) {
        item.style.visibility = 'visible';  // Show cell
        item.style.opacity = pop.toFixed(2);
      } else {
        item.style.visibility = 'hidden';  // Hide cell completely when under threshold but keep space
        item.style.opacity = '0';
      }
      
      // Set height based on rain amount (only grow if > 1 inch)
      // Cells grow downward from fixed top position
      if (rainInches > 1) {
        item.style.transformOrigin = 'top';
        item.style.transform = `scaleY(${rainInches.toFixed(2)})`;
        
        // Counter-scale the text so it doesn't stretch
        const textEl = item.querySelector('.rain-text');
        if (textEl) {
          textEl.style.transformOrigin = 'top';
          textEl.style.transform = `scaleY(${(1 / rainInches).toFixed(3)})`;
        }
      } else {
        item.style.transformOrigin = 'top';
        item.style.transform = 'scaleY(1)';
        
        // Reset text scale
        const textEl = item.querySelector('.rain-text');
        if (textEl) {
          textEl.style.transformOrigin = 'top';
          textEl.style.transform = 'scaleY(1)';
        }
      }
      
      // Add title for accessibility
      item.title = `${percent}% chance of rain${rainInches > 0 ? `, ${rainInches.toFixed(2)}" predicted` : ''}`;
    });
  }

  function updateDaysDates(data) {
    const containerId = 'weather-days-dates';
    let container = document.getElementById(containerId);
    // If missing, create it right after the lows container
    if (!container) {
      const lows = document.getElementById('weather-days-lows');
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'days-dates';
      if (lows && lows.parentNode) lows.parentNode.insertBefore(container, lows.nextSibling);
      else (document.querySelector('main.content') || document.body).appendChild(container);
    }

    // Get next 7 days dates
    const days = ['s', 'm', 't', 'w', 't', 'f', 's']; // Day abbreviations
    const dailyData = (data.daily || []).slice(1, 8);

    // Ensure exactly 7 label elements exist
    for (let i = 0; i < 7; i++) {
      let label = container.children[i];
      if (!label) {
        label = document.createElement('div');
        label.className = 'days-dates__label';
        container.appendChild(label);
      }

      // Get date from timestamp
      const dailyItem = dailyData[i];
      if (dailyItem && dailyItem.dt) {
        const date = new Date(dailyItem.dt * 1000);
        const dayOfWeek = days[date.getDay()];
        const dateNum = date.getDate();
        
        label.innerHTML = `<span class="day-abbr">${dayOfWeek}</span><span class="date-num">${dateNum}</span>`;
        label.title = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      } else {
        label.innerHTML = `<span class="day-abbr">-</span><span class="date-num">-</span>`;
      }
    }

    // Remove any extra elements beyond 7
    while (container.children.length > 7) container.removeChild(container.lastChild);
  }

  function updateDaysLows(data) {
    const containerId = 'weather-days-lows';
    let container = document.getElementById(containerId);
    // If missing, create it right after the dates container
    if (!container) {
      const dates = document.getElementById('weather-days-dates');
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'days-highs days-lows';
      if (dates && dates.parentNode) dates.parentNode.insertBefore(container, dates.nextSibling);
      else (document.querySelector('main.content') || document.body).appendChild(container);
    }

    // Gather next 7 days lows (skip current day)
    const lows = (data.daily || []).slice(1, 8).map(d => (d && d.temp && (typeof d.temp.min === 'number')) ? d.temp.min : null);

    // Ensure exactly 7 dot elements exist
    for (let i = 0; i < 7; i++) {
      const temp = lows[i] != null ? lows[i] : null;
      let dot = container.children[i];
      if (!dot) {
        dot = document.createElement('div');
        dot.className = 'days-highs__dot days-lows__dot';

        // inner label for temperature
        const label = document.createElement('span');
        label.className = 'days-lows__dot-label';
        dot.appendChild(label);

        // valley triangle (hidden by default) — will be shown for the coldest day(s)
        const valley = document.createElement('span');
        valley.className = 'days-lows__valley';
        dot.appendChild(valley);

        container.appendChild(dot);
      }

      const label = dot.querySelector('.days-lows__dot-label');
      const valleyEl = dot.querySelector('.days-lows__valley');
      if (temp != null) {
        const rounded = Math.round(temp);
        dot.style.backgroundColor = tempToColor(temp) || 'rgba(255,255,255,0.06)';
        label.innerHTML = `<span class="fc-mode-text">${rounded}</span>`;
        dot.title = `Low: ${rounded}°`;
        dot.setAttribute('aria-label', dot.title);

        // initialize valley color (hidden by default)
        if (valleyEl) {
          valleyEl.style.borderBottomColor = 'rgba(0,0,0,0)';
          valleyEl.classList.remove('days-lows__valley--visible');
        }
      } else {
        dot.style.backgroundColor = 'rgba(255,255,255,0.06)';
        label.textContent = '--';
        dot.title = 'No data';
        dot.setAttribute('aria-label', dot.title);
        if (valleyEl) {
          valleyEl.style.borderBottomColor = 'rgba(0,0,0,0)';
          valleyEl.classList.remove('days-lows__valley--visible');
        }
      }
    }

    // Remove any extra elements beyond 7
    while (container.children.length > 7) container.removeChild(container.lastChild);

    // Determine the coldest low value and show valleys for any matching days
    const validLows = lows.map(h => (typeof h === 'number' ? h : Infinity));
    const minLow = Math.min(...validLows);
    if (Number.isFinite(minLow)) {
      for (let i = 0; i < 7; i++) {
        const dot = container.children[i];
        const valley = dot && dot.querySelector ? dot.querySelector('.days-lows__valley') : null;
        const t = lows[i];
        if (valley) {
          if (typeof t === 'number' && Math.round(t) === Math.round(minLow)) {
            const rounded = Math.round(t);
            const color = tempToColor(t) || 'rgba(255,255,255,0.9)';
            valley.style.borderBottomColor = color;
            valley.title = `Coldest: ${rounded}°`;
            valley.classList.add('days-lows__valley--visible');
          } else {
            valley.style.borderBottomColor = 'rgba(0,0,0,0)';
            valley.title = '';
            valley.classList.remove('days-lows__valley--visible');
          }
        }
      }
    } else {
      // hide all valleys if no valid lows
      for (let i = 0; i < 7; i++) {
        const dot = container.children[i];
        const valley = dot && dot.querySelector ? dot.querySelector('.days-lows__valley') : null;
        if (valley) {
          valley.style.borderBottomColor = 'rgba(0,0,0,0)';
          valley.classList.remove('days-lows__valley--visible');
        }
      }
    }
  }

  // Create and update the 24-hour forecast row
  function updateHourlyForecast(data) {
    const containerId = 'hourly-forecast-wrapper';
    let wrapper = document.getElementById(containerId);
    
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = containerId;
      wrapper.className = 'hourly-forecast-wrapper';
      
      wrapper.style.marginTop = HOURLY_MARGIN_TOP;
      wrapper.style.marginBottom = HOURLY_MARGIN_BOTTOM;
      
      const dualContainer = document.querySelector('.dualContainer');
      if (dualContainer) {
        dualContainer.style.removeProperty('margin-top'); // Restore original CSS margin since it's back on top
      }
      
      // Insert below the daily forecast (after rain spacer or rain container)
      const rainSpacer = document.getElementById('rain-spacer') || document.querySelector('.rainContainer') || dualContainer;
      if (rainSpacer && rainSpacer.parentNode) {
        rainSpacer.parentNode.insertBefore(wrapper, rainSpacer.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(wrapper);
      }
    }
    
    wrapper.innerHTML = '';
    
    const hourlyData = (data.hourly || []).slice(0, 24);
    if (hourlyData.length === 0) return;
    
    const temps = hourlyData.map(h => h.temp).filter(t => typeof t === 'number');
    const hourlyMax = Math.max(...temps);
    const hourlyMin = Math.min(...temps);
    const range = hourlyMax - hourlyMin;
    
    const barsContainer = document.createElement('div');
    barsContainer.className = 'hourly-bars-container';
    
    const imagesWrapper = document.createElement('div');
    imagesWrapper.className = 'hourly-images-wrapper';

    const imagesContainer = document.createElement('div');
    imagesContainer.className = 'hourly-images-container';

    let gradientsContainer = null;
    if (HOURLY_GRADIENTS_ENABLED) {
      gradientsContainer = document.createElement('div');
      gradientsContainer.className = 'hourly-gradients-container';
    }
    
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'hourly-labels-container';
    
    const rainContainer = document.createElement('div');
    rainContainer.className = 'hourly-rain-container';
    
    hourlyData.forEach((hour, index) => {
      // Extract live API data
      let pop = typeof hour.pop === 'number' ? hour.pop : 0;
      let rainMm = (hour.rain && typeof hour.rain === 'object' && hour.rain['1h']) ? hour.rain['1h'] : (typeof hour.rain === 'number' ? hour.rain : 0);
      
      // STAGE 1: Override with fake passing storm if testing is enabled
      if (TEST_HOURLY_RAIN) {
          if (index > 4 && index < 15) {
            pop = Math.sin((index - 4) / 10 * Math.PI); // Creates a smooth bell curve from 0 to 1
            rainMm = pop * 4.5; // Maxes out around 0.17 inches
          } else {
            pop = 0;
            rainMm = 0;
          }
      }

      const tempF = typeof hour.temp === 'number' ? Math.round(hour.temp) : 0;
      const tempDisplay = displayUnit === 'C' ? Math.round((tempF - 32) * 5 / 9) : tempF;
      const ratio = range > 0 ? (tempF - hourlyMin) / range : 0.5;
      
      // Dynamically select the minimum height based on the current mode
      const minHeightVW = displayUnit === 'BOTH' ? DUAL_HOURLY_MIN_HEIGHT_VW : HOURLY_MIN_HEIGHT_VW;

      // 1. Bar
      const bar = document.createElement('div');
      bar.className = 'hourly-bar';
      bar.style.height = `calc(${minHeightVW}vw + (100% - ${minHeightVW}vw) * ${ratio})`;
      bar.style.backgroundColor = tempToColor(tempF) || 'gray';
      bar.style.fontSize = HOURLY_TEMP_FONT_SIZE;
      bar.style.color = HOURLY_TEMP_COLOR;
      bar.style.borderRadius = HOURLY_BAR_BORDER_RADIUS;
      
      if (displayUnit === 'BOTH') {
        const tempC = Math.round((tempF - 32) * 5 / 9);
        const colorStyle = tempF >= 100 ? 'color: hsl(30, 100%, 50%) !important;' : '';
        const scaleStyle = tempF >= 100 ? `transform: scaleX(0.7) !important; transform-origin: center; ${colorStyle}` : '';
        bar.innerHTML = `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; display: inline-flex !important; flex-direction: column; align-items: center; justify-content: center; gap: ${DUAL_HOURLY_ROW_GAP}; font-size: ${DUAL_HOURLY_FONT_SIZE} !important; line-height: ${DUAL_HOURLY_LINE_HEIGHT} !important; position: relative; top: ${DUAL_HOURLY_TOP_OFFSET}; left: ${DUAL_HOURLY_LEFT_OFFSET}; ${scaleStyle}"><span style="font-size: ${DUAL_HOURLY_FONT_SIZE} !important;">${tempF}</span><span style="font-size: ${DUAL_HOURLY_FONT_SIZE} !important;">${tempC}</span></span>`;
      } else {
        bar.style.paddingLeft = '0';
        const colorStyle = tempF >= 100 ? 'color: hsl(30, 100%, 50%) !important;' : '';
        const scaleStyle = tempF >= 100 ? `transform: scaleX(0.7) !important; transform-origin: center; display: block !important; width: 100% !important; text-align: center !important; position: relative !important; left: -0.3vw !important; ${colorStyle}` : 'display: block !important; width: 100% !important; text-align: center !important;';
        bar.innerHTML = `<span class="fc-mode-text" style="font-family: 'bold', sans-serif; font-size: ${HOURLY_TEMP_FONT_SIZE} !important; ${scaleStyle}">${tempDisplay}</span>`;
      }
      
      barsContainer.appendChild(bar);
      
      // 2. Image
      const imgCell = document.createElement('div');
      imgCell.className = 'hourly-image';
      imgCell.style.borderRadius = HOURLY_IMAGE_BORDER_RADIUS;
      
      // Side-scrolling animation
      const randomDelay = -Math.random() * WEATHER_IMAGE_SCROLL_SPEED_S;
      imgCell.style.setProperty('animation', `scroll-weather-bg ${WEATHER_IMAGE_SCROLL_SPEED_S}s linear infinite`, 'important');
      imgCell.style.setProperty('animation-delay', `${randomDelay}s`, 'important');

      if (hour.weather && hour.weather[0]) {
          const desc = hour.weather[0].description;
          const baseFileName = 'desc-' + desc.toLowerCase().replace(/\s+/g, '-') + '.jpg';
          const imgPath = 'img/' + baseFileName;
          
          const imgPreload = new Image();
          imgPreload.onload = () => { imgCell.style.backgroundImage = `url('${imgPath}')`; };
          imgPreload.onerror = () => {
            imgCell.style.backgroundImage = `url('img/desc-rem.jpg')`;
            recordMissingAsset(imgPath);
          };
          imgPreload.src = imgPath;
      } else {
          imgCell.style.backgroundImage = `url('img/desc-rem.jpg')`;
      }
      imagesContainer.appendChild(imgCell);

      // 2b. Hourly Reflection Gradient Tinge Cell (Duplicate cell overlapping top of image)
      if (HOURLY_GRADIENTS_ENABLED && gradientsContainer) {
        const gradCell = document.createElement('div');
        gradCell.className = `hourly-gradient-cell hourly-gradient-cell-${index}`;
        gradCell.style.borderRadius = HOURLY_IMAGE_BORDER_RADIUS;

        const hourColor = tempToColor(tempF);
        if (hourColor) {
          const isMobile = window.innerWidth <= 767;
          const topA = isMobile ? HOURLY_GRADIENT_OPACITY_TOP_MOBILE : HOURLY_GRADIENT_OPACITY_TOP_DESKTOP;
          const midA = isMobile ? HOURLY_GRADIENT_OPACITY_MID_MOBILE : HOURLY_GRADIENT_OPACITY_MID_DESKTOP;
          const botA = isMobile ? HOURLY_GRADIENT_OPACITY_BOTTOM_MOBILE : HOURLY_GRADIENT_OPACITY_BOTTOM_DESKTOP;

          const hsl = parseHslString(hourColor);
          if (hsl) {
            const [h, s, l] = hsl;
            gradCell.style.setProperty('--hourly-cell-gradient-top', `hsla(${h}, ${s}%, ${l}%, ${topA})`);
            gradCell.style.setProperty('--hourly-cell-gradient-mid', `hsla(${h}, ${s}%, ${l}%, ${midA})`);
            gradCell.style.setProperty('--hourly-cell-gradient-bottom', `hsla(${h}, ${s}%, ${l}%, ${botA})`);
          } else {
            gradCell.style.setProperty('--hourly-cell-gradient-top', `color-mix(in srgb, ${hourColor} ${Math.round(topA * 100)}%, transparent)`);
            gradCell.style.setProperty('--hourly-cell-gradient-mid', `color-mix(in srgb, ${hourColor} ${Math.round(midA * 100)}%, transparent)`);
            gradCell.style.setProperty('--hourly-cell-gradient-bottom', `color-mix(in srgb, ${hourColor} ${Math.round(botA * 100)}%, transparent)`);
          }
          gradCell.title = `Hour ${index + 1}: ${tempF}°`;
        }
        gradientsContainer.appendChild(gradCell);
      }
      
      // 3. Label
      const label = document.createElement('div');
      label.className = 'hourly-label';
      
      const isNightLabel = hour.weather && hour.weather[0] && hour.weather[0].icon.includes('n');
      const labelColor = isNightLabel ? 'hsl(195, 90%, 45%)' : HOURLY_LABEL_COLOR;
      label.style.setProperty('color', labelColor, 'important');
      
      const dateObj = new Date(hour.dt * 1000);
      let hr = dateObj.getHours();
      hr = hr % 12 || 12;
      
      label.innerHTML = `<span class="time-hour" style="font-family: 'bold', sans-serif; font-size: inherit !important; color: inherit !important;">${hr}</span>`;
      labelsContainer.appendChild(label);
      
      // 4. Rain Cell
      const rainCell = document.createElement('div');
      rainCell.className = 'hourly-rain-cell';
      rainCell.style.fontSize = HOURLY_RAIN_FONT_SIZE;
      rainCell.style.color = '#ffffff'; // Strictly enforce white color inline
      
      const rainInches = rainMm / 25.4;
      const formatted = rainInches.toFixed(2);
      
      if (rainInches >= MIN_RAIN_DISPLAY_THRESHOLD) {
          // Opacity is based on PoP (with a minimum of 0.15 so it's readable)
          rainCell.style.opacity = Math.max(0.15, pop);
          rainCell.innerHTML = `<span class="rain-text">${formatted.replace(/^0\./, '.')}"</span>`;
      } else {
          // Completely hide cells under the threshold to keep the UI clean
          rainCell.style.opacity = 0;
      }
      rainContainer.appendChild(rainCell);
    });
    
    imagesWrapper.appendChild(imagesContainer);
    if (gradientsContainer) {
      imagesWrapper.appendChild(gradientsContainer);
    }

    wrapper.appendChild(barsContainer);
    wrapper.appendChild(imagesWrapper);
    wrapper.appendChild(labelsContainer);
    wrapper.appendChild(rainContainer);

    updateLowerGradientPosition();
    requestAnimationFrame(() => {
      updateLowerGradientPosition();
      initHourlyResizeObserver();
    });
  }

  // Update hourly reflection gradient colors on resize or data change
  function updateHourlyGradients(data) {
    const gradContainer = document.querySelector('.hourly-gradients-container');
    if (!gradContainer) return;
    if (!HOURLY_GRADIENTS_ENABLED) {
      gradContainer.style.display = 'none';
      return;
    }
    gradContainer.style.display = '';
    const gradCells = gradContainer.querySelectorAll('.hourly-gradient-cell');
    const hourlyData = (data?.hourly || []).slice(0, 24);
    const isMobile = window.innerWidth <= 767;
    const topA = isMobile ? HOURLY_GRADIENT_OPACITY_TOP_MOBILE : HOURLY_GRADIENT_OPACITY_TOP_DESKTOP;
    const midA = isMobile ? HOURLY_GRADIENT_OPACITY_MID_MOBILE : HOURLY_GRADIENT_OPACITY_MID_DESKTOP;
    const botA = isMobile ? HOURLY_GRADIENT_OPACITY_BOTTOM_MOBILE : HOURLY_GRADIENT_OPACITY_BOTTOM_DESKTOP;

    gradCells.forEach((gradCell, index) => {
      const hour = hourlyData[index];
      if (!hour) return;
      const tempF = typeof hour.temp === 'number' ? Math.round(hour.temp) : 0;
      const hourColor = tempToColor(tempF);
      if (!hourColor) return;

      const hsl = parseHslString(hourColor);
      if (hsl) {
        const [h, s, l] = hsl;
        gradCell.style.setProperty('--hourly-cell-gradient-top', `hsla(${h}, ${s}%, ${l}%, ${topA})`);
        gradCell.style.setProperty('--hourly-cell-gradient-mid', `hsla(${h}, ${s}%, ${l}%, ${midA})`);
        gradCell.style.setProperty('--hourly-cell-gradient-bottom', `hsla(${h}, ${s}%, ${l}%, ${botA})`);
      } else {
        gradCell.style.setProperty('--hourly-cell-gradient-top', `color-mix(in srgb, ${hourColor} ${Math.round(topA * 100)}%, transparent)`);
        gradCell.style.setProperty('--hourly-cell-gradient-mid', `color-mix(in srgb, ${hourColor} ${Math.round(midA * 100)}%, transparent)`);
        gradCell.style.setProperty('--hourly-cell-gradient-bottom', `color-mix(in srgb, ${hourColor} ${Math.round(botA * 100)}%, transparent)`);
      }
    });
  }

  // Update the overlapping bar chart (hiItem and loItem)
  function updateOverlappingBarChart(data) {
    // --- EDITABLE: Font size and line-height exclusively for F&C Dual Temp mode on the 8-day bars ---
    const DUAL_BAR_FONT_SIZE = '4vw'; // Shrunk from default so it fits the F/C text nicely
    const DUAL_BAR_LINE_HEIGHT = '0'; // Tighter line height for the dual numbers
    const DUAL_BAR_TOP_OFFSET = '-0.3vw'; // EDITABLE: Nudge F/C text up (negative) or down (positive)

    const hiItems = document.querySelectorAll('.hiItem');
    const loItems = document.querySelectorAll('.loItem');
    if (!hiItems.length || !loItems.length) return;

    // Safely find or create the day container and items
    let dayContainer = document.querySelector('.dayContainer:not(.forecast-images-container):not(.forecast-gradients-container):not(.forecast-images-wrapper)');
    let dayItems = document.querySelectorAll('.dayItem:not(.forecast-image-cell):not(.forecast-gradient-cell)');
    if (!dayContainer && dayItems.length === 0) {
      const dualContainer = document.querySelector('.dualContainer');
      if (dualContainer && dualContainer.parentNode) {
        dayContainer = document.createElement('div');
        dayContainer.className = 'dayContainer';
        // Insert directly after the dualContainer
        dualContainer.parentNode.insertBefore(dayContainer, dualContainer.nextSibling);

        for (let i = 0; i < 8; i++) {
          const el = document.createElement('div');
          el.className = 'dayItem';
          dayContainer.appendChild(el);
        }
        dayItems = document.querySelectorAll('.dayItem');
      }
    }
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const dailyData = data.daily || [];

    // The API returns today (index 0) + 7 days = 8 days total.
    hiItems.forEach((item, index) => {
      const dayData = dailyData[index];
      if (!dayData || !dayData.temp) return;

      const hiTempF = Math.round(dayData.temp.max);
      const loTempF = Math.round(dayData.temp.min);

      const isPhone = window.innerWidth < 768;
      const closeThreshold = isPhone ? CLOSE_HI_LO_DIFF_THRESHOLD_MOBILE : CLOSE_HI_LO_DIFF_THRESHOLD_DESKTOP;
      const isCloseHiLo = (hiTempF - loTempF) <= closeThreshold;
      const loItem = loItems[index];

      if (isCloseHiLo) {
        item.classList.add('close-hi-lo');
        if (loItem) loItem.classList.add('close-hi-lo');
      } else {
        item.classList.remove('close-hi-lo');
        if (loItem) loItem.classList.remove('close-hi-lo');
      }
      
      const hiTempDisplay = displayUnit === 'C' ? Math.round((hiTempF - 32) * 5 / 9) : hiTempF;
      const loTempDisplay = displayUnit === 'C' ? Math.round((loTempF - 32) * 5 / 9) : loTempF;

      // Calculate height percentages based on dynamic temp range
      // Map temps to ratio: tempRangeMin = 0.0, tempRangeMax = 1.0
      const range = tempRangeMax - tempRangeMin;
      const hiRatio = range > 0 ? (hiTempF - tempRangeMin) / range : 0.5;
      const loRatio = range > 0 ? (loTempF - tempRangeMin) / range : 0.5;

      // Check for High temperature change animation (Index 0 to 7)
      const shouldAnimateHigh = prevHighTemps[index] !== null && prevHighTemps[index] !== hiTempF;

      if (shouldAnimateHigh) {
        // Stage 1: Animate height DOWN to the level of the corresponding "low" cell
        const oldHiTemp = prevHighTemps[index];
        const oldHiRatio = range > 0 ? (oldHiTemp - tempRangeMin) / range : 0.5;
        const oldHeightStr = `calc(${MIN_TEMP_BAR_HEIGHT_VW}vw + (100% - ${MIN_TEMP_BAR_HEIGHT_VW}vw) * ${oldHiRatio})`;
        const loHeightStr = `calc(${MIN_TEMP_BAR_HEIGHT_VW}vw + (100% - ${MIN_TEMP_BAR_HEIGHT_VW}vw) * ${loRatio})`;
        const targetHeightStr = `calc(${MIN_TEMP_BAR_HEIGHT_VW}vw + (100% - ${MIN_TEMP_BAR_HEIGHT_VW}vw) * ${hiRatio})`;

        // Instantly set to old height and bring high bar to front during animation so text is visible on top
        item.style.height = oldHeightStr;
        item.style.zIndex = '10'; // Bring in front of low bar (which is z-index 2)
        item.classList.add('animating-change');
        
        const setHiItemContent = (el, isDay0, html) => {
          if (isDay0) {
            const linesEl = el.querySelector('#day0-temp-lines');
            el.innerHTML = html;
            if (linesEl) {
              el.insertBefore(linesEl, el.firstChild);
            }
          } else {
            el.innerHTML = html;
          }
        };

        // Populate the OLD temperature text initially
        const oldHiTempDisplay = displayUnit === 'C' ? Math.round((oldHiTemp - 32) * 5 / 9) : oldHiTemp;
        if (displayUnit === 'BOTH') {
          const oldHiTempC = Math.round((oldHiTemp - 32) * 5 / 9);
          const colorStyle = oldHiTemp >= 100 ? 'color: hsl(30, 100%, 50%) !important;' : 'color: var(--theBrown);';
          setHiItemContent(item, index === 0, `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; font-size: ${DUAL_BAR_FONT_SIZE} !important; line-height: ${DUAL_BAR_LINE_HEIGHT} !important; position: relative; z-index: var(--hi-bar-text-z-index, 25); top: ${DUAL_BAR_TOP_OFFSET}; ${colorStyle}">${oldHiTemp}${formatSlash()}${oldHiTempC}</span>`);
        } else {
          const colorStyle = oldHiTemp >= 100 ? 'style="color: hsl(30, 100%, 50%) !important; position: relative; z-index: var(--hi-bar-text-z-index, 25);"' : 'style="color: var(--theBrown); position: relative; z-index: var(--hi-bar-text-z-index, 25);"';
          setHiItemContent(item, index === 0, `<span ${colorStyle}>${oldHiTempDisplay}°</span>`);
        }
        item.style.backgroundColor = tempToColor(oldHiTemp) || '';
        item.style.opacity = '1';

        // Force reflow
        void item.offsetHeight;

        // Step 1: Animate height down to the low cell height (using setTimeout to ensure transition is registered)
        setTimeout(() => {
          item.style.height = loHeightStr;
          if (index === 0 && DAY0_LINES_ANIMATE_WITH_BAR) {
            animateDay0TempLinesDown();
          }
        }, 20);

        // Step 2: After 800ms, update the temp text/colors and animate back UP to the new temperature
        setTimeout(() => {
          // Update colors to match the new high temperature
          item.style.backgroundColor = tempToColor(hiTempF) || '';
          
          if (displayUnit === 'BOTH') {
            const hiTempC = Math.round((hiTempF - 32) * 5 / 9);
            const colorStyle = hiTempF >= 100 ? 'color: hsl(30, 100%, 50%) !important;' : 'color: var(--theBrown);';
            setHiItemContent(item, index === 0, `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; font-size: ${DUAL_BAR_FONT_SIZE} !important; line-height: ${DUAL_BAR_LINE_HEIGHT} !important; position: relative; z-index: var(--hi-bar-text-z-index, 25); top: ${DUAL_BAR_TOP_OFFSET}; ${colorStyle}">${hiTempF}${formatSlash()}${hiTempC}</span>`);
          } else {
            const colorStyle = hiTempF >= 100 ? 'style="color: hsl(30, 100%, 50%) !important; position: relative; z-index: var(--hi-bar-text-z-index, 25);"' : 'style="color: var(--theBrown); position: relative; z-index: var(--hi-bar-text-z-index, 25);"';
            setHiItemContent(item, index === 0, `<span ${colorStyle}>${hiTempDisplay}°</span>`);
          }
          
          // Animate back up to the new high cell height
          item.style.height = targetHeightStr;
          if (index === 0 && DAY0_LINES_ANIMATE_WITH_BAR) {
            animateDay0TempLinesUp(data);
          }

          // Clean up transition property and restore z-index after completion (another 800ms)
          setTimeout(() => {
            item.classList.remove('animating-change');
            item.style.zIndex = ''; // Restore default (underneath low bar)
            if (index === 0) {
              if (DAY0_LINES_ANIMATE_WITH_BAR) {
                finishDay0TempLinesAnimation(data);
              }
              updateTempPointer(data);
            }
          }, 800);
        }, 820);

      } else {
        // Normal update (non-animated)
        item.style.height = `calc(${MIN_TEMP_BAR_HEIGHT_VW}vw + (100% - ${MIN_TEMP_BAR_HEIGHT_VW}vw) * ${hiRatio})`;
        const setHiItemContent = (el, isDay0, html) => {
          if (isDay0) {
            const linesEl = el.querySelector('#day0-temp-lines');
            el.innerHTML = html;
            if (linesEl) {
              el.insertBefore(linesEl, el.firstChild);
            }
          } else {
            el.innerHTML = html;
          }
        };
        if (displayUnit === 'BOTH') {
          const hiTempC = Math.round((hiTempF - 32) * 5 / 9);
          const colorStyle = hiTempF >= 100 ? 'color: hsl(30, 100%, 50%) !important;' : 'color: var(--theBrown);';
          setHiItemContent(item, index === 0, `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; font-size: ${DUAL_BAR_FONT_SIZE} !important; line-height: ${DUAL_BAR_LINE_HEIGHT} !important; position: relative; z-index: var(--hi-bar-text-z-index, 25); top: ${DUAL_BAR_TOP_OFFSET}; ${colorStyle}">${hiTempF}${formatSlash()}${hiTempC}</span>`);
        } else {
          const colorStyle = hiTempF >= 100 ? 'style="color: hsl(30, 100%, 50%) !important; position: relative; z-index: var(--hi-bar-text-z-index, 25);"' : 'style="color: var(--theBrown); position: relative; z-index: var(--hi-bar-text-z-index, 25);"';
          setHiItemContent(item, index === 0, `<span ${colorStyle}>${hiTempDisplay}°</span>`);
        }
        item.style.backgroundColor = tempToColor(hiTempF) || '';
        item.style.opacity = '1';
        if (index === 0) {
          updateDay0TempLines(data);
        }
      }

      // Track the high temp
      prevHighTemps[index] = hiTempF;

      // Set height, text, and color for Low bars
      if (loItem) {
        const loTextZIndex = isCloseHiLo ? (isPhone ? LO_BAR_CLOSE_TEXT_Z_INDEX_MOBILE : LO_BAR_CLOSE_TEXT_Z_INDEX_DESKTOP) : 10;
        const shouldAnimateLow = prevLowTemps[index] !== null && prevLowTemps[index] !== loTempF;

        if (shouldAnimateLow) {
          // Stage 1: Animate height DOWN to nothing (0px)
          const oldLoTemp = prevLowTemps[index];
          const oldLoRatio = range > 0 ? (oldLoTemp - tempRangeMin) / range : 0.5;
          const oldLoHeightStr = `calc(${MIN_TEMP_BAR_HEIGHT_VW}vw + (100% - ${MIN_TEMP_BAR_HEIGHT_VW}vw) * ${oldLoRatio})`;
          const targetLoHeightStr = `calc(${MIN_TEMP_BAR_HEIGHT_VW}vw + (100% - ${MIN_TEMP_BAR_HEIGHT_VW}vw) * ${loRatio})`;

          // Instantly set to old height, set overflow to hidden to mask the text, and lift to z-index (on top of high bar)
          loItem.style.height = oldLoHeightStr;
          loItem.style.zIndex = isCloseHiLo ? String(LO_BAR_CLOSE_Z_INDEX_DESKTOP) : '11';
          loItem.style.overflow = 'hidden';
          loItem.classList.add('animating-change');

          // Populate the OLD temperature text initially
          const oldLoTempDisplay = displayUnit === 'C' ? Math.round((oldLoTemp - 32) * 5 / 9) : oldLoTemp;
          if (displayUnit === 'BOTH') {
            const oldLoTempC = Math.round((oldLoTemp - 32) * 5 / 9);
            const colorStyle = oldLoTemp >= 100 ? 'color: hsl(30, 100%, 50%) !important;' : 'color: var(--theBrown);';
            loItem.innerHTML = `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; font-size: ${DUAL_BAR_FONT_SIZE} !important; line-height: ${DUAL_BAR_LINE_HEIGHT} !important; position: relative; z-index: ${loTextZIndex}; top: ${DUAL_BAR_TOP_OFFSET}; ${colorStyle}">${oldLoTemp}${formatSlash()}${oldLoTempC}</span>`;
          } else {
            const colorStyle = oldLoTemp >= 100 ? `style="color: hsl(30, 100%, 50%) !important; position: relative; z-index: ${loTextZIndex};"` : `style="color: var(--theBrown); position: relative; z-index: ${loTextZIndex};"`;
            loItem.innerHTML = `<span ${colorStyle}>${oldLoTempDisplay}°</span>`;
          }
          loItem.style.backgroundColor = tempToColor(oldLoTemp) || '';
          loItem.style.opacity = '1';

          // Force reflow
          void loItem.offsetHeight;

          // Step 1: Animate height down to 0px (masking the text)
          setTimeout(() => {
            loItem.style.height = '0px';
          }, 20);

          // Step 2: After 800ms, update the temp text/colors and animate back UP to the new temperature
          setTimeout(() => {
            loItem.style.backgroundColor = tempToColor(loTempF) || '';

            if (displayUnit === 'BOTH') {
              const loTempC = Math.round((loTempF - 32) * 5 / 9);
              const colorStyle = loTempF >= 100 ? 'color: hsl(30, 100%, 50%) !important;' : 'color: var(--theBrown);';
              loItem.innerHTML = `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; font-size: ${DUAL_BAR_FONT_SIZE} !important; line-height: ${DUAL_BAR_LINE_HEIGHT} !important; position: relative; z-index: ${loTextZIndex}; top: ${DUAL_BAR_TOP_OFFSET}; ${colorStyle}">${loTempF}${formatSlash()}${loTempC}</span>`;
            } else {
              const colorStyle = loTempF >= 100 ? `style="color: hsl(30, 100%, 50%) !important; position: relative; z-index: ${loTextZIndex};"` : `style="color: var(--theBrown); position: relative; z-index: ${loTextZIndex};"`;
              loItem.innerHTML = `<span ${colorStyle}>${loTempDisplay}°</span>`;
            }

            // Animate back up to the new low cell height
            loItem.style.height = targetLoHeightStr;

            // Clean up transition property, overflow and z-index after completion
            setTimeout(() => {
              loItem.classList.remove('animating-change');
              loItem.style.zIndex = '';
              loItem.style.overflow = '';
              if (index === 0) {
                updateTempPointer(data);
              }
            }, 800);
          }, 820);

        } else {
          // Normal update (non-animated)
          loItem.style.height = `calc(${MIN_TEMP_BAR_HEIGHT_VW}vw + (100% - ${MIN_TEMP_BAR_HEIGHT_VW}vw) * ${loRatio})`;
          
          if (displayUnit === 'BOTH') {
            const loTempC = Math.round((loTempF - 32) * 5 / 9);
            const colorStyle = loTempF >= 100 ? 'color: hsl(30, 100%, 50%) !important;' : 'color: var(--theBrown);';
            loItem.innerHTML = `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; font-size: ${DUAL_BAR_FONT_SIZE} !important; line-height: ${DUAL_BAR_LINE_HEIGHT} !important; position: relative; z-index: ${loTextZIndex}; top: ${DUAL_BAR_TOP_OFFSET}; ${colorStyle}">${loTempF}${formatSlash()}${loTempC}</span>`;
          } else {
            const colorStyle = loTempF >= 100 ? `style="color: hsl(30, 100%, 50%) !important; position: relative; z-index: ${loTextZIndex};"` : `style="color: var(--theBrown); position: relative; z-index: ${loTextZIndex};"`;
            loItem.innerHTML = `<span ${colorStyle}>${loTempDisplay}°</span>`;
          }
          loItem.style.backgroundColor = tempToColor(loTempF) || '';
          loItem.style.opacity = '1';
        }
      }

      // Track the low temp
      prevLowTemps[index] = loTempF;

      // Set text for Day items
      if (dayItems[index] && dayData.dt) {
        const dateObj = new Date(dayData.dt * 1000);
        dayItems[index].innerHTML = `<span class="day-letter" style="font-size: ${DAY_LETTER_FONT_SIZE}; font-family: 'light', sans-serif; opacity: 1; font-weight: normal; color: white;">${dayNames[dateObj.getDay()]}</span> <span style="font-family: 'bold', sans-serif;">${dateObj.getDate()}</span>`;
      }
    });
  }

  // EDITABLE: Update the temperature pointer position based on current temp
  function updateTempPointer(data) {
    const pointer = document.getElementById('temp-pointer');
    if (!pointer) return;

    const currentTemp = data?.current?.temp;
    const hiTemp = data?.daily?.[0]?.temp?.max;
    const loTemp = data?.daily?.[0]?.temp?.min;

    // Guard: Need all three values to position the pointer
    if (typeof currentTemp !== 'number' || typeof hiTemp !== 'number' || typeof loTemp !== 'number') {
      pointer.style.opacity = '0'; // Hide if data unavailable
      return;
    }

    // Get the first hi/lo cell elements (today's cells)
    const hiItem = document.querySelector('.hiItem-0');
    const loItem = document.querySelector('.loItem-0');
    if (!hiItem || !loItem) {
      pointer.style.opacity = '0';
      return;
    }

    // Get the container to calculate position relative to
    const dualContainer = document.querySelector('.dualContainer');
    if (!dualContainer) {
      pointer.style.opacity = '0';
      return;
    }

    // Temporarily disable transition for immediate positioning
    const hadTransition = pointer.style.transition;
    pointer.style.transition = 'none';
    
    // Force layout recalculation to ensure we get accurate measurements
    void hiItem.offsetHeight;
    void loItem.offsetHeight;
    void dualContainer.offsetHeight;

    // Calculate the vertical position of hi and lo items
    const containerRect = dualContainer.getBoundingClientRect();
    const hiRect = hiItem.getBoundingClientRect();
    const loRect = loItem.getBoundingClientRect();

    // The pointer should be positioned between the TOP of the lo bar and the TOP of the hi bar
    // Top of hi bar = where today's high temp is positioned
    // Top of lo bar = where today's low temp is positioned
    const hiTop = hiRect.top;
    const loTop = loRect.top;
    const barRange = loTop - hiTop; // Distance between the two tops (lo is below hi)

    // Calculate where current temp falls between today's lo and hi
    // If currentTemp = hiTemp, ratio = 1.0 (at hiTop)
    // If currentTemp = loTemp, ratio = 0.0 (at loTop)
    const tempRange = hiTemp - loTemp;
    let ratio = tempRange > 0 ? (currentTemp - loTemp) / tempRange : 0.5;
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_9604_4_9604_98_4`,`🎯 TEMP POINTER CALC - Current: ${currentTemp}°, Lo: ${loTemp}°, Hi: ${hiTemp}°`));
    /* eslint-disable */console.log(...oo_oo(`2266558813_9605_4_9605_99_4`,`🎯 TEMP POINTER CALC - Temp Range: ${tempRange}°, Raw Ratio: ${ratio.toFixed(4)}`));
    /* eslint-disable */console.log(...oo_oo(`2266558813_9606_4_9606_107_4`,`🎯 TEMP POINTER CALC - (${currentTemp} - ${loTemp}) / ${tempRange} = ${ratio.toFixed(4)}`));
    
    // Clamp ratio to 0-1 range (current temp might be outside hi/lo range)
    ratio = Math.max(0, Math.min(1, ratio));
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_9611_4_9611_76_4`,`🎯 TEMP POINTER CALC - Clamped Ratio: ${ratio.toFixed(4)}`));

    // Calculate position: start from loTop, move up by ratio * barRange
    // Check if bars are actively in the "dip down, dip back up" animation
    const isAnimating = hiItem.classList.contains('animating-change') || loItem.classList.contains('animating-change');
    const isDipCorrupted = (tempRange >= 3 && barRange <= 5);

    let pointerY;
    if (!isAnimating && !isDipCorrupted && barRange > 0) {
      // Normal state: Bars are at rest, calculate directly from rendered element tops
      // ratio = 0.0 means at loTop (today's low), ratio = 1.0 means at hiTop (today's high)
      pointerY = (loTop - containerRect.top) - (ratio * barRange);
    } else {
      // Animating or collapsed state: Calculate target position mathematically to prevent the pointer
      // from being dragged down to ~77° while the high bar dips down to the low bar
      const range = tempRangeMax - tempRangeMin;
      const clampedTemp = Math.max(loTemp, Math.min(hiTemp, currentTemp));
      const currentRatio = range > 0 ? (clampedTemp - tempRangeMin) / range : 0.5;
      const clampedRatio = Math.max(0, Math.min(1, currentRatio));

      const hiContainer = document.querySelector('.hiContainer');
      let availableHeight = 0;
      if (hiContainer) {
        const hiContainerStyle = window.getComputedStyle(hiContainer);
        const paddingTop = parseFloat(hiContainerStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(hiContainerStyle.paddingBottom) || 0;
        availableHeight = hiContainer.clientHeight - paddingTop - paddingBottom;
      }
      if (availableHeight <= 0) {
        availableHeight = containerRect.height;
      }

      const minBarHeightPx = window.innerWidth * (MIN_TEMP_BAR_HEIGHT_VW / 100);
      const fullScalePx = Math.max(0, availableHeight - minBarHeightPx);
      const targetBarHeight = minBarHeightPx + fullScalePx * clampedRatio;
      const baselineY = (hiRect.bottom || loRect.bottom) - containerRect.top;
      pointerY = baselineY - targetBarHeight;
    }

    // Position the pointer
    // EDITABLE: Position pointer so its RIGHT edge aligns with right edge of today's temperature bar
    // Calculate width dynamically from configuration to avoid offsetWidth issues
    const isMobile = window.innerWidth <= 767;
    const widthStr = isMobile ? TEMP_POINTER_WIDTH_MOBILE : TEMP_POINTER_WIDTH_DESKTOP;
    const vwVal = parseFloat(widthStr) || 1.732;
    const pointerWidth = window.innerWidth * (vwVal / 100);
    const pointerLeft = (hiRect.right - containerRect.left) - pointerWidth;
    
    // Apply dynamic temp color to pointer if configured
    if (TEMP_POINTER_USE_CURRENT_COLOR) {
      const pointerColor = tempToColor(currentTemp);
      pointer.style.setProperty('--temp-pointer-color', pointerColor || TEMP_POINTER_DEFAULT_COLOR);
    } else {
      pointer.style.setProperty('--temp-pointer-color', TEMP_POINTER_DEFAULT_COLOR);
    }

    // Set position relative to dualContainer (center the pointer vertically on the calculated Y position)
    pointer.style.left = `${pointerLeft}px`;
    pointer.style.top = `${pointerY}px`;
    pointer.style.transform = 'translateY(-50%)'; // Center on the temp position
    pointer.style.opacity = '1'; // Show the pointer
    
    // Re-enable transition after a frame
    requestAnimationFrame(() => {
      pointer.style.transition = hadTransition || 'top 0.5s ease-out, opacity 0.3s ease';
    });

    /* eslint-disable */console.log(...oo_oo(`2266558813_9645_4_9645_235_4`,`Temp pointer: current=${currentTemp}°, today's range=${loTemp}°-${hiTemp}°, ratio=${ratio.toFixed(2)}, Y=${pointerY.toFixed(1)}px, hiTop=${hiTop.toFixed(1)}, loTop=${loTop.toFixed(1)}, barRange=${barRange.toFixed(1)}`));
    /* eslint-disable */console.log(...oo_oo(`2266558813_9646_4_9646_116_4`,`🎯 VISIBLE TEMPS - Hi Bar displays: ${hiItem.textContent}, Lo Bar displays: ${loItem.textContent}`));

    // Update Day 0 high box 10-degree horizontal lines
    updateDay0TempLines(data);
  }

  // EDITABLE: Update horizontal lines depicting every 10° on Day 0 high temperature box
  function updateDay0TempLines(data) {
    let linesContainer = document.getElementById('day0-temp-lines');
    if (!DAY0_LINES_ENABLED) {
      if (linesContainer) linesContainer.innerHTML = '';
      return;
    }

    const currentTemp = data?.current?.temp;
    const hiTemp = data?.daily?.[0]?.temp?.max;
    const loTemp = data?.daily?.[0]?.temp?.min;

    if (typeof currentTemp !== 'number' || typeof hiTemp !== 'number' || typeof loTemp !== 'number') {
      if (linesContainer) linesContainer.innerHTML = '';
      return;
    }

    const hiItem = document.querySelector('.hiItem-0');
    const loItem = document.querySelector('.loItem-0');
    const dualContainer = document.querySelector('.dualContainer');
    if (!hiItem || !loItem || !dualContainer) return;

    if (hiItem.classList.contains('animating-change') && DAY0_LINES_ANIMATE_WITH_BAR) {
      return; // Do not interrupt active up/down animation
    }

    if (!linesContainer) {
      linesContainer = document.createElement('div');
      linesContainer.id = 'day0-temp-lines';
      linesContainer.className = 'day0-temp-lines';
      hiItem.insertBefore(linesContainer, hiItem.firstChild);
    } else if (!hiItem.contains(linesContainer)) {
      hiItem.insertBefore(linesContainer, hiItem.firstChild);
    }

    const containerRect = dualContainer.getBoundingClientRect();
    const hiRect = hiItem.getBoundingClientRect();
    const loRect = loItem.getBoundingClientRect();

    const hiTop = hiRect.top;
    const loTop = loRect.top;
    let barRange = loTop - hiTop;
    const tempRange = hiTemp - loTemp;

    if (tempRange <= 0) {
      linesContainer.innerHTML = '';
      return;
    }

    // Mathematical fallback if DOM layout measurements are not yet settled (barRange <= 0)
    if (barRange <= 0 || containerRect.height <= 0) {
      const range = tempRangeMax - tempRangeMin;
      const hiRatio = range > 0 ? (hiTemp - tempRangeMin) / range : 0.5;
      const loRatio = range > 0 ? (loTemp - tempRangeMin) / range : 0.5;
      const minHeightPx = window.innerWidth * (MIN_TEMP_BAR_HEIGHT_VW / 100);
      const availableH = (containerRect.height || (window.innerWidth * 0.35)) - minHeightPx;
      const targetHiHeight = minHeightPx + availableH * hiRatio;
      const loHeight = minHeightPx + availableH * loRatio;
      barRange = Math.max(1, targetHiHeight - loHeight);
    }

    const isMobile = window.innerWidth <= 767;
    const lineHeight = isMobile ? DAY0_LINES_HEIGHT_MOBILE : DAY0_LINES_HEIGHT_DESKTOP;
    const lineOpacity = isMobile ? DAY0_LINES_OPACITY_MOBILE : DAY0_LINES_OPACITY_DESKTOP;

    // The color of the horizontal line
    let defaultLineColor;
    if (DAY0_LINES_CUSTOM_COLOR) {
      defaultLineColor = DAY0_LINES_CUSTOM_COLOR;
    } else if (DAY0_LINES_COLOR_MODE === 'current_minus_10') {
      defaultLineColor = tempToColor(currentTemp - 10) || 'white';
    } else if (DAY0_LINES_COLOR_MODE === 'current_plus_10') {
      defaultLineColor = tempToColor(currentTemp + 10) || 'white';
    } else {
      defaultLineColor = tempToColor(currentTemp) || 'white';
    }

    // Depict every 10 degrees within today's range (e.g. 80, 90, 100)
    const isCelsius = displayUnit === 'C';
    const displayLo = isCelsius ? (loTemp - 32) * 5 / 9 : loTemp;
    const displayHi = isCelsius ? (hiTemp - 32) * 5 / 9 : hiTemp;

    const startStep = Math.ceil(displayLo / 10) * 10;
    const endStep = Math.floor(displayHi / 10) * 10;

    const targetSteps = [];
    for (let s = startStep; s <= endStep; s += 10) {
      targetSteps.push(s);
    }

    // Reuse or recreate line elements
    let lineElements = Array.from(linesContainer.querySelectorAll('.day0-temp-line'));
    if (lineElements.length !== targetSteps.length) {
      linesContainer.innerHTML = '';
      lineElements = targetSteps.map(deg => {
        const line = document.createElement('div');
        line.className = `day0-temp-line day0-temp-line-${deg}`;
        linesContainer.appendChild(line);
        return line;
      });
    }

    targetSteps.forEach((deg, i) => {
      const line = lineElements[i];
      if (!line) return;

      const tempF = isCelsius ? (deg * 9 / 5) + 32 : deg;
      const ratio = Math.max(0, Math.min(1, (tempF - loTemp) / tempRange));
      const lineY = (1 - ratio) * barRange;

      let lineColor = defaultLineColor;
      if (DAY0_LINES_COLOR_MODE === 'line_temp') {
        lineColor = tempToColor(tempF) || defaultLineColor;
      } else if (DAY0_LINES_COLOR_MODE === 'line_temp_minus_10') {
        lineColor = tempToColor(tempF - 10) || defaultLineColor;
      } else if (DAY0_LINES_COLOR_MODE === 'line_temp_plus_10') {
        lineColor = tempToColor(tempF + 10) || defaultLineColor;
      }

      line.classList.remove('animating-change');
      line.style.left = '0';
      line.style.width = '100%';
      line.style.top = `${lineY}px`;
      line.style.height = lineHeight;
      line.style.transform = 'translateY(-50%)';
      line.style.backgroundColor = lineColor;
      line.style.opacity = String(lineOpacity);
      line.style.setProperty('opacity', String(lineOpacity));
      line.setAttribute('data-temp', deg);
      line.title = `${deg}°`;
    });

    // Ensure the temperature text span in hiItem sits above the lines
    const span = hiItem.querySelector('span');
    if (span) {
      span.style.position = 'relative';
      span.style.zIndex = 'var(--hi-bar-text-z-index, 25)';
    }
  }

  // EDITABLE: Animate Day 0 10° lines down to low cell top during bar dip animation
  function animateDay0TempLinesDown() {
    if (!DAY0_LINES_ENABLED || !DAY0_LINES_ANIMATE_WITH_BAR) return;
    const linesContainer = document.getElementById('day0-temp-lines');
    const hiItem = document.querySelector('.hiItem-0');
    const loItem = document.querySelector('.loItem-0');
    if (!linesContainer || !hiItem || !loItem) return;

    const loRect = loItem.getBoundingClientRect();
    const hiRect = hiItem.getBoundingClientRect();
    const collapseY = Math.max(0, loRect.top - hiRect.top);

    const lines = linesContainer.querySelectorAll('.day0-temp-line');
    lines.forEach(line => {
      line.classList.add('animating-change');
      line.style.top = `${collapseY}px`;
      line.style.opacity = '0';
    });
  }

  // EDITABLE: Animate Day 0 10° lines expanding up from low cell top in sync with bar rising
  function animateDay0TempLinesUp(data) {
    if (!DAY0_LINES_ENABLED || !DAY0_LINES_ANIMATE_WITH_BAR) return;
    let linesContainer = document.getElementById('day0-temp-lines');
    const hiItem = document.querySelector('.hiItem-0');
    const loItem = document.querySelector('.loItem-0');
    const dualContainer = document.querySelector('.dualContainer');
    if (!hiItem || !loItem || !dualContainer) return;

    const currentTemp = data?.current?.temp;
    const hiTemp = data?.daily?.[0]?.temp?.max;
    const loTemp = data?.daily?.[0]?.temp?.min;
    if (typeof currentTemp !== 'number' || typeof hiTemp !== 'number' || typeof loTemp !== 'number') return;

    if (!linesContainer) {
      updateDay0TempLines(data);
      return;
    }
    if (!hiItem.contains(linesContainer)) {
      hiItem.insertBefore(linesContainer, hiItem.firstChild);
    }

    const containerRect = dualContainer.getBoundingClientRect();
    const loRect = loItem.getBoundingClientRect();
    const hiRect = hiItem.getBoundingClientRect();

    const tempRange = hiTemp - loTemp;
    if (tempRange <= 0) return;

    const range = tempRangeMax - tempRangeMin;
    const hiRatio = range > 0 ? (hiTemp - tempRangeMin) / range : 0.5;
    const loRatio = range > 0 ? (loTemp - tempRangeMin) / range : 0.5;
    const minHeightPx = window.innerWidth * (MIN_TEMP_BAR_HEIGHT_VW / 100);
    const availableH = containerRect.height - minHeightPx;
    const targetHiHeight = minHeightPx + availableH * hiRatio;
    const loHeight = minHeightPx + availableH * loRatio;
    const targetBarRange = Math.max(1, targetHiHeight - loHeight);

    const isMobile = window.innerWidth <= 767;
    const lineHeight = isMobile ? DAY0_LINES_HEIGHT_MOBILE : DAY0_LINES_HEIGHT_DESKTOP;

    let defaultLineColor;
    if (DAY0_LINES_CUSTOM_COLOR) {
      defaultLineColor = DAY0_LINES_CUSTOM_COLOR;
    } else if (DAY0_LINES_COLOR_MODE === 'current_minus_10') {
      defaultLineColor = tempToColor(currentTemp - 10) || 'white';
    } else if (DAY0_LINES_COLOR_MODE === 'current_plus_10') {
      defaultLineColor = tempToColor(currentTemp + 10) || 'white';
    } else {
      defaultLineColor = tempToColor(currentTemp) || 'white';
    }

    const isCelsius = displayUnit === 'C';
    const displayLo = isCelsius ? (loTemp - 32) * 5 / 9 : loTemp;
    const displayHi = isCelsius ? (hiTemp - 32) * 5 / 9 : hiTemp;
    const startStep = Math.ceil(displayLo / 10) * 10;
    const endStep = Math.floor(displayHi / 10) * 10;
    const targetSteps = [];
    for (let s = startStep; s <= endStep; s += 10) {
      targetSteps.push(s);
    }

    // Rebuild line elements if count changed
    let lineElements = Array.from(linesContainer.querySelectorAll('.day0-temp-line'));
    if (lineElements.length !== targetSteps.length) {
      linesContainer.innerHTML = '';
      lineElements = targetSteps.map(deg => {
        const line = document.createElement('div');
        line.className = `day0-temp-line day0-temp-line-${deg}`;
        linesContainer.appendChild(line);
        return line;
      });
    }

    // Prepare lines at collapse position first without animation
    targetSteps.forEach((deg, i) => {
      const line = lineElements[i];
      if (!line) return;
      line.classList.remove('animating-change');
      line.style.left = '0';
      line.style.width = '100%';
      line.style.height = lineHeight;
      line.style.transform = 'translateY(-50%)';
      line.style.top = `${targetBarRange}px`;
      line.style.opacity = '0';

      const tempF = isCelsius ? (deg * 9 / 5) + 32 : deg;
      let lineColor = defaultLineColor;
      if (DAY0_LINES_COLOR_MODE === 'line_temp') {
        lineColor = tempToColor(tempF) || defaultLineColor;
      } else if (DAY0_LINES_COLOR_MODE === 'line_temp_minus_10') {
        lineColor = tempToColor(tempF - 10) || defaultLineColor;
      } else if (DAY0_LINES_COLOR_MODE === 'line_temp_plus_10') {
        lineColor = tempToColor(tempF + 10) || defaultLineColor;
      }
      line.style.backgroundColor = lineColor;
      line.setAttribute('data-temp', deg);
      line.title = `${deg}°`;
    });

    // Force reflow so starting positions are registered before transitioning
    void linesContainer.offsetHeight;

    // Transition to target positions
    targetSteps.forEach((deg, i) => {
      const line = lineElements[i];
      if (!line) return;

      const tempF = isCelsius ? (deg * 9 / 5) + 32 : deg;
      const ratio = Math.max(0, Math.min(1, (tempF - loTemp) / tempRange));
      const targetLineY = (1 - ratio) * targetBarRange;

      const lineOpacity = isMobile ? DAY0_LINES_OPACITY_MOBILE : DAY0_LINES_OPACITY_DESKTOP;
      line.classList.add('animating-change');
      line.style.top = `${targetLineY}px`;
      line.style.opacity = String(lineOpacity);
      line.style.setProperty('opacity', String(lineOpacity));
    });
  }

  // EDITABLE: Cleanup after animation completes
  function finishDay0TempLinesAnimation(data) {
    const linesContainer = document.getElementById('day0-temp-lines');
    if (linesContainer) {
      linesContainer.querySelectorAll('.day0-temp-line').forEach(line => {
        line.classList.remove('animating-change');
      });
    }
    updateDay0TempLines(data);
  }

  // Create and update the 8 side-scrolling image cells for the 8-day forecast
  // and the duplicate row of low-temperature reflection gradient cells
  function updateForecastImages(data) {
    let wrapper = document.querySelector('.forecast-images-wrapper');
    let container = document.querySelector('.forecast-images-container');
    let gradContainer = document.querySelector('.forecast-gradients-container');
    
    if (!wrapper || !container) {
      const dayContainer = document.querySelector('.dayContainer:not(.forecast-images-container):not(.forecast-gradients-container):not(.forecast-images-wrapper)');
      if (dayContainer && dayContainer.parentNode) {
        if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.className = 'forecast-images-wrapper';
        }

        if (!container) {
          container = document.createElement('div');
          container.className = 'forecast-images-container';
          
          for (let i = 0; i < 8; i++) {
            const cell = document.createElement('div');
            cell.className = 'forecast-image-cell dayItem';
            cell.style.aspectRatio = '1 / 1';
            cell.style.borderRadius = '1vw';
            cell.style.backgroundImage = "url('img/desc-rem.jpg')";
            cell.style.backgroundSize = 'auto 100%';
            cell.style.backgroundRepeat = 'repeat-x';
            cell.style.backgroundPosition = '0 center';
            const randomDelay = -Math.random() * WEATHER_IMAGE_SCROLL_SPEED_S;
            cell.style.setProperty('animation', `scroll-weather-bg ${WEATHER_IMAGE_SCROLL_SPEED_S}s linear infinite`, 'important');
            cell.style.setProperty('animation-delay', `${randomDelay}s`, 'important');
            cell.style.overflow = 'hidden';
            container.appendChild(cell);
          }
        }
        if (!container.parentNode || container.parentNode !== wrapper) {
          wrapper.appendChild(container);
        }

        if (FORECAST_GRADIENTS_ENABLED && !gradContainer) {
          gradContainer = document.createElement('div');
          gradContainer.className = 'forecast-gradients-container';
          for (let i = 0; i < 8; i++) {
            const gradCell = document.createElement('div');
            gradCell.className = `forecast-gradient-cell forecast-gradient-cell-${i}`;
            gradContainer.appendChild(gradCell);
          }
          wrapper.appendChild(gradContainer);
        }
        
        if (!wrapper.parentNode) {
          dayContainer.parentNode.insertBefore(wrapper, dayContainer);
        }
      }
    } else if (FORECAST_GRADIENTS_ENABLED && !gradContainer && wrapper) {
      gradContainer = document.createElement('div');
      gradContainer.className = 'forecast-gradients-container';
      for (let i = 0; i < 8; i++) {
        const gradCell = document.createElement('div');
        gradCell.className = `forecast-gradient-cell forecast-gradient-cell-${i}`;
        gradContainer.appendChild(gradCell);
      }
      wrapper.appendChild(gradContainer);
    }
    
    if (!container) return;
    
    // Update the images mapping from API description
    const cells = container.querySelectorAll('.forecast-image-cell');
    const dailyData = data?.daily || [];
    
    // Console report: 8-day descriptions from API
    /* eslint-disable */console.log(...oo_oo(`2266558813_9692_4_9692_62_4`,'📅 === 8-Day DAILY Weather Descriptions ==='));
    dailyData.slice(0, 8).forEach((day, index) => {
      const description = day?.weather?.[0]?.description || 'N/A';
      /* eslint-disable */console.log(...oo_oo(`2266558813_9695_6_9695_56_4`,`   Day ${index + 1}: ${description}`));
    });
    /* eslint-disable */console.log(...oo_oo(`2266558813_9697_4_9697_61_4`,'=========================================='));
    
    cells.forEach((cell, index) => {
      const dayData = dailyData[index];
      if (!dayData || !dayData.weather || !dayData.weather[0]) return;
      
      const description = dayData.weather[0].description;
      const fileName = 'desc-' + description.toLowerCase().replace(/\s+/g, '-') + '.jpg';
      const imgPath = 'img/' + fileName;
      const fallbackPath = 'img/desc-rem.jpg';
      
      const imgPreload = new Image();
      imgPreload.onload = () => {
        cell.style.backgroundImage = `url('${imgPath}')`;
      };
      imgPreload.onerror = () => {
        cell.style.backgroundImage = `url('${fallbackPath}')`;
        recordMissingAsset(imgPath);
      };
      imgPreload.src = imgPath;
    });

    // Update the 8-day low temp reflection gradient tinges
    if (gradContainer) {
      if (FORECAST_GRADIENTS_ENABLED) {
        gradContainer.style.display = '';
        const gradCells = gradContainer.querySelectorAll('.forecast-gradient-cell');
        const isMobile = window.innerWidth <= 767;
        const topA = isMobile ? FORECAST_GRADIENT_OPACITY_TOP_MOBILE : FORECAST_GRADIENT_OPACITY_TOP_DESKTOP;
        const midA = isMobile ? FORECAST_GRADIENT_OPACITY_MID_MOBILE : FORECAST_GRADIENT_OPACITY_MID_DESKTOP;
        const botA = isMobile ? FORECAST_GRADIENT_OPACITY_BOTTOM_MOBILE : FORECAST_GRADIENT_OPACITY_BOTTOM_DESKTOP;

        gradCells.forEach((gradCell, index) => {
          const dayData = dailyData[index];
          const loTemp = dayData?.temp?.min;
          if (typeof loTemp !== 'number') return;
          const loTempF = Math.round(loTemp);
          const loColor = tempToColor(loTempF);
          if (!loColor) return;

          const hsl = parseHslString(loColor);
          if (hsl) {
            const [h, s, l] = hsl;
            gradCell.style.setProperty('--cell-gradient-top', `hsla(${h}, ${s}%, ${l}%, ${topA})`);
            gradCell.style.setProperty('--cell-gradient-mid', `hsla(${h}, ${s}%, ${l}%, ${midA})`);
            gradCell.style.setProperty('--cell-gradient-bottom', `hsla(${h}, ${s}%, ${l}%, ${botA})`);
          } else {
            gradCell.style.setProperty('--cell-gradient-top', `color-mix(in srgb, ${loColor} ${Math.round(topA * 100)}%, transparent)`);
            gradCell.style.setProperty('--cell-gradient-mid', `color-mix(in srgb, ${loColor} ${Math.round(midA * 100)}%, transparent)`);
            gradCell.style.setProperty('--cell-gradient-bottom', `color-mix(in srgb, ${loColor} ${Math.round(botA * 100)}%, transparent)`);
          }
          gradCell.title = `Day ${index + 1} Low: ${loTempF}°`;
        });
      } else {
        gradContainer.style.display = 'none';
      }
    }
  }

  // Ensure the wind / humidity gauges sit directly under the 7-day dates row
  function placeGaugesBelowDaysDates() {
    try {
      const dates = document.getElementById('weather-days-dates');
      if (!dates || !dates.parentNode) return;

      const parent = dates.parentNode;
      const windGauge = document.querySelector('.wind-gauge-container');
      const secondGauge = document.querySelector('.second-gauge-container');

      if (!windGauge && !secondGauge) return;

      // Insert gauges immediately after the dates row: dates -> wind -> second
      const afterDates = dates.nextSibling;
      if (secondGauge) parent.insertBefore(secondGauge, afterDates);
      if (windGauge) parent.insertBefore(windGauge, secondGauge || afterDates);
    } catch (e) {
      console.warn('Unable to reposition gauges under dates row:', e);
    }
  }

  // Fetch and display the city name from OpenWeather Reverse Geocoding API
  async function updateCityDisplay(lat, lon, data = null) {
    const id = 'weather-city-name';
    let el = document.getElementById(id);
    
    // --- EDITABLE: City Name Display Attributes (Desktop & Mobile) ---
    const CITY_FONT_SIZE_DESKTOP = '5vw';          // EDITABLE Desktop: City name font size
    const CITY_FONT_SIZE_MOBILE = '5vw';           // EDITABLE Mobile: City name font size
    const CITY_FONT_FAMILY = "'light', sans-serif";// EDITABLE: Base font family (e.g., 'light', 'bold', 'Weather')
    const CITY_MARGIN_TOP_DESKTOP = '2vw';         // EDITABLE Desktop: Space ABOVE the city name
    const CITY_MARGIN_TOP_MOBILE = '2vw';          // EDITABLE Mobile: Space ABOVE the city name
    const CITY_MARGIN_BOTTOM_DESKTOP = '-1.5vw';   // EDITABLE Desktop: Space BELOW the city name
    const CITY_MARGIN_BOTTOM_MOBILE = '0vw';    // EDITABLE Mobile: Space BELOW the city name
    const CITY_LETTER_SPACING_DESKTOP = '-0.05vw'; // EDITABLE Desktop: Gap between letters
    const CITY_LETTER_SPACING_MOBILE = '-0.05vw';  // EDITABLE Mobile: Gap between letters

    const isMobile = window.innerWidth <= 767;
    const cityFontSize = isMobile ? CITY_FONT_SIZE_MOBILE : CITY_FONT_SIZE_DESKTOP;
    const cityMarginTop = isMobile ? CITY_MARGIN_TOP_MOBILE : CITY_MARGIN_TOP_DESKTOP;
    const cityMarginBottom = isMobile ? CITY_MARGIN_BOTTOM_MOBILE : CITY_MARGIN_BOTTOM_DESKTOP;
    const cityLetterSpacing = isMobile ? CITY_LETTER_SPACING_MOBILE : CITY_LETTER_SPACING_DESKTOP;

    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.textAlign = 'center';
      el.style.color = 'white';
      el.style.opacity = '0.85';
      
      // Find a good place to insert it (just above the feels-like line)
      const feelsLike = document.getElementById('weather-feels-like');
      if (feelsLike && feelsLike.parentNode) {
        feelsLike.parentNode.insertBefore(el, feelsLike);
      } else {
        // Fallbacks
        const target = document.querySelector('.container__high') || document.querySelector('.weather__temp');
        if (target && target.parentNode) {
          target.parentNode.insertBefore(el, target);
        } else {
          // Ensure it gets pushed by alerts by placing it at the bottom, not the very top
          (document.querySelector('main.content') || document.body).appendChild(el);
        }
      }
    }
    
    // Apply editable styles every time to support hot-reloading tweaks (or 'medium' for 100-109 temp range)
    const tempVal = data?.current?.temp ?? lastWeatherData?.current?.temp;
    const is100s = typeof tempVal === 'number' && tempVal >= 100 && tempVal < 110;
    el.style.fontFamily = is100s ? "'medium', sans-serif" : CITY_FONT_FAMILY;
    el.style.fontSize = cityFontSize;
    el.style.marginTop = cityMarginTop;
    el.style.marginBottom = cityMarginBottom;
    el.style.letterSpacing = cityLetterSpacing;
    el.style.transform = 'translateX(var(--middle-text-x-offset, 0vw))';

    // Apply color associated strictly with current temperature + 10
    if (data && data.current && typeof data.current.temp === 'number') {
      const currentTemp = data.current.temp;
      const cityColor = tempToColor(currentTemp + 10);
      if (cityColor) {
        el.style.color = cityColor;
      }
    } else {
      el.style.color = 'white';
    }

    // Only fetch if coordinates have changed to save API calls
    if (currentCityLat === lat && currentCityLon === lon) return;

    // Helper to format fallback coordinates: e.g., "36.15° N, 95.99° W"
    const setFallbackLocation = () => {
      const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
      const lonStr = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
      el.textContent = `${latStr}, ${lonStr}`;
    };

    try {
      const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data && data.length > 0 && data[0].name) {
        el.textContent = data[0].name; // Just the city name (e.g., "Tulsa")
      } else {
        // No city found for these coordinates
        setFallbackLocation();
      }
      currentCityLat = lat;
      currentCityLon = lon;
    } catch (e) {
      /* eslint-disable */console.error(...oo_tx(`2266558813_9831_6_9831_51_11`,'Error fetching city name:', e));
      setFallbackLocation();
    }
  }

  // Fetch nearest NWS radar station ID based on coordinates from the NWS Points API
  async function updateRadarStation(lat, lon) {
    try {
      const res = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
      if (!res.ok) throw new Error(`NWS API error: ${res.status}`);
      const data = await res.json();
      
      const stationUrl = data.properties?.radarStation;
      if (stationUrl) {
        const parts = stationUrl.split('/');
        const stationId = parts[parts.length - 1]; // e.g. "KINX"
        if (stationId && stationId.length === 4) {
          currentRadarStation = stationId.toUpperCase();
          /* eslint-disable */console.log(...oo_oo(`2266558813_9849_10_9849_82_4`,`📡 Dynamic Radar Station resolved: ${currentRadarStation}`));
        }
      }
    } catch (e) {
      console.warn('Unable to resolve NWS radar station for coordinates, falling back to KINX:', e);
    }
  }

  function startRadarLoop(framesRight, framesLeft) {
    if (radarLoopIntervalId) {
      clearInterval(radarLoopIntervalId);
    }
    if (radarSweepIntervalId) {
      clearInterval(radarSweepIntervalId);
      radarSweepIntervalId = null;
    }
    const currentLoopToken = ++radarLoopCounter;

    let speed = RADAR_LOOP_SPEED_MS;
    const descImageEl = document.getElementById('weather-desc-image');
    if (descImageEl) {
      const computedSpeed = getComputedStyle(descImageEl).getPropertyValue('--radar-loop-speed').trim();
      if (computedSpeed) {
        const parsed = parseFloat(computedSpeed);
        if (!isNaN(parsed) && parsed > 0) {
          speed = computedSpeed.endsWith('ms') ? parsed : parsed * 1000;
        }
      }
    }

    currentRadarFrameIndex = 0;
    if (framesRight) {
      framesRight.forEach((frame, idx) => {
        frame.style.opacity = idx === 0 ? '1' : '0';
      });
    }
    if (framesLeft) {
      framesLeft.forEach((frame, idx) => {
        frame.style.opacity = idx === 0 ? '1' : '0';
      });
    }

    const totalFrames = (framesRight && framesRight.length) || (framesLeft && framesLeft.length) || RADAR_FRAME_COUNT;
    const sweepDuration = totalFrames * speed;
    const sweepStartTime = Date.now();

    // Set the duration CSS variable
    document.documentElement.style.setProperty('--radar-sweep-duration', `${sweepDuration}ms`);

    // Synchronize and reset the GPU-accelerated CSS keyframe animation
    document.querySelectorAll('.radar-sweep-line').forEach(line => {
      line.style.animation = 'none';
      void line.offsetWidth; // Force WebKit reflow to guarantee animation starts from 0 degrees
      line.style.animation = ''; // Fallback to stylesheet rule to start animation cleanly
    });

    // Run a low-frequency timer (every 50ms) to handle active frame opacity changes
    radarSweepIntervalId = setInterval(() => {
      if (currentLoopToken !== radarLoopCounter) {
        clearInterval(radarSweepIntervalId);
        return;
      }
      
      const elapsed = Date.now() - sweepStartTime;
      const progress = (elapsed % sweepDuration) / sweepDuration;
      const frameIndex = Math.floor(progress * totalFrames);
      
      // Update opacity changes only when the frame index actually rolls over
      if (frameIndex !== currentRadarFrameIndex) {
        currentRadarFrameIndex = frameIndex;
        
        if (framesRight) {
          framesRight.forEach((frame, idx) => {
            if (idx === currentRadarFrameIndex) {
              frame.style.zIndex = '5';
              frame.style.transitionDuration = `${RADAR_FADE_DURATION_MS}ms`;
              frame.style.opacity = '1';
            } else {
              const isLastFrameFading = (idx === totalFrames - 1) && (currentRadarFrameIndex < Math.ceil(RADAR_LAST_FRAME_FADE_MS / RADAR_LOOP_SPEED_MS));
              const isPrevFrame = (idx === (currentRadarFrameIndex - 1 + totalFrames) % totalFrames);
              
              if (isLastFrameFading || isPrevFrame) {
                frame.style.zIndex = '10';
              } else {
                frame.style.zIndex = '1';
              }
              
              if (idx === totalFrames - 1) {
                frame.style.transitionDuration = `${RADAR_LAST_FRAME_FADE_MS}ms`;
              } else {
                frame.style.transitionDuration = `${RADAR_FADE_DURATION_MS}ms`;
              }
              frame.style.opacity = '0';
            }
          });
        }
        if (framesLeft) {
          framesLeft.forEach((frame, idx) => {
            if (idx === currentRadarFrameIndex) {
              frame.style.zIndex = '5';
              frame.style.transitionDuration = `${RADAR_FADE_DURATION_MS}ms`;
              frame.style.opacity = '1';
            } else {
              const isLastFrameFading = (idx === totalFrames - 1) && (currentRadarFrameIndex < Math.ceil(RADAR_LAST_FRAME_FADE_MS / RADAR_LOOP_SPEED_MS));
              const isPrevFrame = (idx === (currentRadarFrameIndex - 1 + totalFrames) % totalFrames);
              
              if (isLastFrameFading || isPrevFrame) {
                frame.style.zIndex = '10';
              } else {
                frame.style.zIndex = '1';
              }
              
              if (idx === totalFrames - 1) {
                frame.style.transitionDuration = `${RADAR_LAST_FRAME_FADE_MS}ms`;
              } else {
                frame.style.transitionDuration = `${RADAR_FADE_DURATION_MS}ms`;
              }
              frame.style.opacity = '0';
            }
          });
        }
      }
    }, 50);
  }

  /**
   * Checks the latest radar image for precipitation color activity.
   * Returns a promise resolving to true if precipitation exceeds the threshold, or false.
   */
  async function checkRadarPrecipitationActivity(zoomLevel) {
    if (!latestRainViewerData || !latestRainViewerData.radar || !latestRainViewerData.radar.past || latestRainViewerData.radar.past.length === 0) {
      /* eslint-disable */console.log(...oo_oo(`2266558813_9980_6_9980_81_4`,'📡 RainViewer: No RainViewer data cached, fallback to false.'));
      return false;
    }

    return new Promise(async (resolve) => {
      try {
        const pastFrames = latestRainViewerData.radar.past;
        const latestFrame = pastFrames[pastFrames.length - 1];
        const host = latestRainViewerData.host || 'https://tilecache.rainviewer.com';
        const path = latestFrame.path;

        // Calculate coordinates and offsets dynamically to center the RainViewer map on LAT/LON
        const coords = getTileCoords(LAT, LON, zoomLevel);
        const x0 = Math.floor(coords.x);
        const y0 = Math.floor(coords.y);
        const dX = coords.x - x0;
        const dY = coords.y - y0;
        
        const x_start = (dX < 0.5) ? x0 - 1 : x0;
        const y_start = (dY < 0.5) ? y0 - 1 : y0;
        const dX_new = coords.x - x_start;
        const dY_new = coords.y - y_start;
        
        const gridLeftPct = (0.5 - dX_new) * 100;
        const gridTopPct = (0.5 - dY_new) * 100;

        const tileUrls = [
          `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomLevel}/${x_start}/${y_start}/${RAINVIEWER_COLOR_SCHEME}/0_0.png?cors=true`,
          `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomLevel}/${x_start+1}/${y_start}/${RAINVIEWER_COLOR_SCHEME}/0_0.png?cors=true`,
          `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomLevel}/${x_start}/${y_start+1}/${RAINVIEWER_COLOR_SCHEME}/0_0.png?cors=true`,
          `${host}${path}/${RAINVIEWER_TILE_SIZE}/${zoomLevel}/${x_start+1}/${y_start+1}/${RAINVIEWER_COLOR_SCHEME}/0_0.png?cors=true`
        ];

        // Load all 4 images using fetch and Object URLs to bypass Safari CORS/cache issues
        const loadImage = async (url) => {
          try {
            const res = await fetch(url);
            if (!res.ok) {
              // 404 is standard for no-rain tiles
              /* eslint-disable */console.log(...oo_oo(`2266558813_10019_14_10019_101_4`,`📡 RainViewer Info: Empty or missing tile (status ${res.status}): ${url}`));
              return null;
            }
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            
            return new Promise((resolveImg) => {
              const img = new Image();
              img.onload = () => resolveImg({ img, objectUrl });
              img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolveImg(null);
              };
              img.src = objectUrl;
            });
          } catch (e) {
            /* eslint-disable */console.log(...oo_oo(`2266558813_10035_12_10035_104_4`,`📡 RainViewer Fetch Info: Failed to fetch tile (treating as empty): ${url}`, e));
            return null;
          }
        };

        // Safety timeout for loading the tiles (6 seconds)
        const timeoutId = setTimeout(() => {
          /* eslint-disable */console.error(...oo_tx(`2266558813_10042_10_10042_62_11`,'❌ RainViewer pixel check timed out.'));
          resolve(false);
        }, 6000);

        const results = await Promise.all(tileUrls.map(loadImage));
        clearTimeout(timeoutId);

        // Perform offscreen drawing
        const canvas = document.createElement('canvas');
        const size = 128; // downscale for scanning performance
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(false);
          return;
        }

        // Draw the 2x2 grid onto the canvas matching the exact layout of the widget (skipping empty tiles)
        const gridLeft = (gridLeftPct / 100) * size;
        const gridTop = (gridTopPct / 100) * size;
        const tileSize = size;

        if (results[0]) ctx.drawImage(results[0].img, gridLeft, gridTop, tileSize, tileSize);
        if (results[1]) ctx.drawImage(results[1].img, gridLeft + tileSize, gridTop, tileSize, tileSize);
        if (results[2]) ctx.drawImage(results[2].img, gridLeft, gridTop + tileSize, tileSize, tileSize);
        if (results[3]) ctx.drawImage(results[3].img, gridLeft + tileSize, gridTop + tileSize, tileSize, tileSize);

        // Revoke the temporary Object URLs immediately to avoid memory leaks
        results.forEach(res => {
          if (res && res.objectUrl) {
            URL.revokeObjectURL(res.objectUrl);
          }
        });

        // Scan pixels within the circular viewport (centered at size/2, size/2 with radius size/2)
        const imgData = ctx.getImageData(0, 0, size, size);
        const pixels = imgData.data;
        const radius = size / 2;
        const cx = size / 2;
        const cy = size / 2;

        const rootStyle = getComputedStyle(document.documentElement);
        const mR_val = parseFloat(rootStyle.getPropertyValue('--radar-matrix-r').trim() || '3.0');
        const mG_val = parseFloat(rootStyle.getPropertyValue('--radar-matrix-g').trim() || '0.0');
        const mB_val = parseFloat(rootStyle.getPropertyValue('--radar-matrix-b').trim() || '-5.0');
        const mOffset_val = parseFloat(rootStyle.getPropertyValue('--radar-matrix-offset').trim() || '-0.6');

        let precipitationPixelCount = 0;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            // Check if pixel is within the circular bounds
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= radius * radius) {
              const idx = (y * size + x) * 4;
              const r_val = pixels[idx] / 255;
              const g_val = pixels[idx + 1] / 255;
              const b_val = pixels[idx + 2] / 255;
              const a_val = pixels[idx + 3] / 255;
              
              // Apply the exact SVG "remove-blue-haze" filter matrix and transfer math in JS
              // to only count pixels that are visible to the user (isolating yellow/orange/red storm cores)
              const a_prime = mR_val * r_val + mG_val * g_val + mB_val * b_val + 1.0 * a_val + mOffset_val;
              const a_double_prime = a_prime * 10.0 - 4.0;
              
              if (a_double_prime > 0.1) {
                precipitationPixelCount++;
              }
            }
          }
        }

        // Read threshold dynamically from CSS variables, falling back to JS constants
        let threshold = 300;
        if (zoomLevel === RAINVIEWER_ZOOM_LEFT) {
          const cssVal = rootStyle.getPropertyValue('--radar-threshold-left').trim();
          threshold = cssVal ? parseInt(cssVal, 10) : RAINVIEWER_PRECIPITATION_PIXEL_THRESHOLD_LEFT;
        } else {
          const cssVal = rootStyle.getPropertyValue('--radar-threshold-right').trim();
          threshold = cssVal ? parseInt(cssVal, 10) : RAINVIEWER_PRECIPITATION_PIXEL_THRESHOLD_RIGHT;
        }

        /* eslint-disable */console.log(...oo_oo(`2266558813_10126_8_10126_151_4`,`📡 RainViewer Pixel Check (Zoom ${zoomLevel} Circle): Found ${precipitationPixelCount} active pixels (Threshold is ${threshold})`));
        
        if (!window.RadarDebug) {
          window.RadarDebug = { leftCount: 0, rightCount: 0, leftActive: false, rightActive: false, lastError: 'None', thresholdLeft: 0, thresholdRight: 0 };
        }
        if (zoomLevel === RAINVIEWER_ZOOM_LEFT) {
          window.RadarDebug.leftCount = precipitationPixelCount;
          window.RadarDebug.leftActive = precipitationPixelCount >= threshold;
          window.RadarDebug.thresholdLeft = threshold;
        } else {
          window.RadarDebug.rightCount = precipitationPixelCount;
          window.RadarDebug.rightActive = precipitationPixelCount >= threshold;
          window.RadarDebug.thresholdRight = threshold;
        }

        resolve(precipitationPixelCount >= threshold);
      } catch (e) {
        /* eslint-disable */console.error(...oo_tx(`2266558813_10143_8_10143_76_11`,'❌ RainViewer pixel check failed during analysis:', e));
        if (!window.RadarDebug) {
          window.RadarDebug = { leftCount: 0, rightCount: 0, leftActive: false, rightActive: false, lastError: 'None', thresholdLeft: 0, thresholdRight: 0 };
        }
        window.RadarDebug.lastError = e.message || String(e);
        resolve(false);
      }
    });
  }

  /**
   * Helper check: Checks if precipitation is active right now or if a weather alert is present.
   */
  function isPrecipitationActiveNow(data) {
    if (!data) return false;
    
    // 1. Current weather condition ID indicates rain/storm/snow (OpenWeather codes: 2xx = Storm, 3xx = Drizzle, 5xx = Rain, 6xx = Snow)
    const currentId = data.current?.weather?.[0]?.id;
    if (currentId && (currentId >= 200 && currentId < 700)) {
      /* eslint-disable */console.log(...oo_oo(`2266558813_10162_6_10162_98_4`,`🌧️ activeNow Check: Current weather ID ${currentId} indicates precipitation.`));
      return true;
    }

    // 2. Current rain/snow volume > 0.01mm
    const currentRain = data.current?.rain?.['1h'] || data.current?.rain || 0;
    const currentSnow = data.current?.snow?.['1h'] || data.current?.snow || 0;
    if (currentRain > 0.01 || currentSnow > 0.01) {
      /* eslint-disable */console.log(...oo_oo(`2266558813_10170_6_10170_71_4`,`🌧️ activeNow Check: Current rain/snow volume > 0.`));
      return true;
    }

    // 3. Active weather alerts (e.g. Tornado, Severe Thunderstorm watch/warning)
    if (data.alerts && data.alerts.length > 0) {
      const activePrecipAlert = data.alerts.some(alert => {
        const event = (alert.event || '').toLowerCase();
        return event.includes('thunderstorm') ||
               event.includes('tornado') ||
               event.includes('flood') ||
               event.includes('storm') ||
               event.includes('winter') ||
               event.includes('blizzard') ||
               event.includes('snow') ||
               event.includes('rain') ||
               event.includes('squall') ||
               event.includes('hail');
      });
      if (activePrecipAlert) {
        /* eslint-disable */console.log(...oo_oo(`2266558813_10190_8_10190_94_4`,`🌧️ activeNow Check: Active storm/precipitation weather alert detected.`));
        return true;
      }
    }

    return false;
  }

  async function determineRadarStatus(data) {
    if (FORCE_DOPPLER_RADAR) {
      /* eslint-disable */console.log(...oo_oo(`2266558813_10200_6_10200_70_4`,`📡 Dynamic Radar: FORCE_DOPPLER_RADAR is enabled.`));
      return { left: true, right: true };
    }
    
    // Check Left Circle (Zoom 6)
    const leftActive = await checkRadarPrecipitationActivity(RAINVIEWER_ZOOM_LEFT);
    
    // Check Right Circle (Zoom 7)
    const rightActive = await checkRadarPrecipitationActivity(RAINVIEWER_ZOOM_RIGHT);
    
    // Fallback checks (current precipitation active now)
    const activeNow = isPrecipitationActiveNow(data);
    
    let fallbackHourly = false;
    // Check hourly forecast for the next 3 hours (hours 0, 1, 2)
    const hourly = data.hourly || [];
    for (let i = 0; i < Math.min(3, hourly.length); i++) {
      const hour = hourly[i];
      const hourId = hour.weather?.[0]?.id;
      const hourPop = hour.pop || 0;
      const hourRain = hour.rain?.['1h'] || hour.rain || 0;
      const hourSnow = hour.snow?.['1h'] || hour.snow || 0;

      if (hourId && (hourId >= 200 && hourId < 700) && (hourPop > 0.30 || hourRain > 0.1 || hourSnow > 0.1)) {
        fallbackHourly = true;
        break;
      }
    }
    
    const finalLeft = leftActive || activeNow || fallbackHourly;
    const finalRight = rightActive || activeNow || fallbackHourly;
    
    if (!window.RadarDebug) {
      window.RadarDebug = { leftCount: 0, rightCount: 0, leftActive: false, rightActive: false, lastError: 'None', thresholdLeft: 0, thresholdRight: 0 };
    }
    window.RadarDebug.activeNow = activeNow;
    window.RadarDebug.fallbackHourly = fallbackHourly;
    
    return { left: finalLeft, right: finalRight };
  }

  // Expose diagnostic tool to browser console
  window.testRadar = async () => {
    /* eslint-disable */console.log(...oo_oo(`2266558813_10243_4_10243_54_4`,"🔍 Running radar diagnostic test..."));
    if (!currentRadarStation) {
      /* eslint-disable */console.error(...oo_tx(`2266558813_10245_6_10245_64_11`,"❌ No radar station is currently resolved."));
      return;
    }
    const rawUrl = `https://radar.weather.gov/ridge/standard/${currentRadarStation}_0.gif?t=${Date.now()}`;
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}`;
    
    /* eslint-disable */console.log(...oo_oo(`2266558813_10251_4_10251_66_4`,`📡 Fetching radar image from proxy: ${proxyUrl}`));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 80;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          /* eslint-disable */console.error(...oo_tx(`2266558813_10263_10_10263_61_11`,"❌ Failed to get 2D canvas context."));
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const pixels = imgData.data;
        
        let precipPixels = 0;
        let baseMapPixels = 0;
        const colorsSample = [];
        
        const getHsl = (r, g, b) => {
          r /= 255; g /= 255; b /= 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;
          if (max === min) {
            h = s = 0;
          } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
          }
          return [h * 360, s * 100, l * 100];
        };

        for (let y = 10; y < 68; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];
            
            if (a < 50) continue;
            
            const [h, s, l] = getHsl(r, g, b);
            
            if (s > 45 && l > 20 && l < 85) {
              precipPixels++;
              if (colorsSample.length < 5) {
                colorsSample.push({ rgb: `rgb(${r},${g},${b})`, hsl: `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)` });
              }
            } else {
              baseMapPixels++;
            }
          }
        }
        
        /* eslint-disable */console.log(...oo_oo(`2266558813_10316_8_10316_72_4`,`📊 DIAGNOSTIC RESULTS for ${currentRadarStation}:`));
        /* eslint-disable */console.log(...oo_oo(`2266558813_10317_8_10317_59_4`,`   - Cropped Area Size: 4,640 pixels`));
        /* eslint-disable */console.log(...oo_oo(`2266558813_10318_8_10318_74_4`,`   - Base Map / Background pixels: ${baseMapPixels}`));
        /* eslint-disable */console.log(...oo_oo(`2266558813_10319_8_10319_72_4`,`   - Precipitation / Echo pixels: ${precipPixels}`));
        /* eslint-disable */console.log(...oo_oo(`2266558813_10320_8_10320_88_4`,`   - Configured Threshold: ${RADAR_PRECIPITATION_PIXEL_THRESHOLD}`));
        /* eslint-disable */console.log(...oo_oo(`2266558813_10321_8_10321_146_4`,`   - Decision: ${precipPixels >= RADAR_PRECIPITATION_PIXEL_THRESHOLD ? "🔴 TRIGGER RADAR MODE" : "🟢 SHOW SCROLLING MONTH"}`));
        if (colorsSample.length > 0) {
          /* eslint-disable */console.log(...oo_oo(`2266558813_10323_10_10323_78_4`,`   - Sample Precipitation Colors found:`, colorsSample));
        }
      } catch (e) {
        /* eslint-disable */console.error(...oo_tx(`2266558813_10326_8_10326_57_11`,"❌ Diagnostic analysis failed:", e));
      }
    };
    img.onerror = (e) => /* eslint-disable */console.error(...oo_tx(`2266558813_10329_25_10329_90_11`,"❌ Failed to load radar image for diagnostics:", e));
    img.src = proxyUrl;
  };



  async function getLocalWeather() {

  // 1. GUARD: Stop if hidden
  if (document.visibilityState === 'hidden') {
      /* eslint-disable */console.log(...oo_oo(`2266558813_10339_6_10339_75_4`,"Tab hidden, skipping weather update to save API calls."));
      return; // <--- THIS IS CRITICAL. It stops the function here.
  }
  // If visible, the code just continues downwards...

    // quick guard for missing API key
    if (!API_KEY || API_KEY.includes('YOUR_PASTED_KEY_HERE')) {
      console.warn('OpenWeather API key is missing. Set API_KEY in js/weather.js or call Weather.setApiKey(yourKey).');
      setPlaceholders();
      return;
    }

    setLoading(true);

    try {
      if (radarLoopIntervalId) {
        clearInterval(radarLoopIntervalId);
        radarLoopIntervalId = null;
      }
      if (radarSweepIntervalId) {
        clearInterval(radarSweepIntervalId);
        radarSweepIntervalId = null;
      }
      // Resolve the local NWS radar station ID dynamically for coordinates
      await updateRadarStation(LAT, LON);

      // Fetch RainViewer map data asynchronously
      try {
        /* eslint-disable */console.log(...oo_oo(`2266558813_10367_8_10367_54_4`,'Fetching RainViewer map data...'));
        const rvRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (rvRes.ok) {
          latestRainViewerData = await rvRes.json();
          /* eslint-disable */console.log(...oo_oo(`2266558813_10371_10_10371_66_4`,'RainViewer map data fetched successfully.'));
        } else {
          console.warn(`RainViewer API returned status: ${rvRes.status}`);
        }
      } catch (e) {
        console.warn('Failed to fetch RainViewer map data:', e);
      }

      // We removed the double-fetch block! The OneCall API fetches what it needs directly.
      const url = getUrl();
      /* eslint-disable */console.log(...oo_oo(`2266558813_10381_6_10381_66_4`,`Fetching weather for LAT: ${LAT}, LON: ${LON}`));
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();

      // Determine if radar mode should be active based on canvas check and/or OpenWeather data
      try {
        const radarStatus = await determineRadarStatus(data);
        AUTO_DOPPLER_RADAR_LEFT = radarStatus.left;
        AUTO_DOPPLER_RADAR_RIGHT = radarStatus.right;
        SHOW_DOPPLER_RADAR_LEFT = USER_DOPPLER_OVERRIDE_LEFT !== null ? USER_DOPPLER_OVERRIDE_LEFT : AUTO_DOPPLER_RADAR_LEFT;
        SHOW_DOPPLER_RADAR_RIGHT = USER_DOPPLER_OVERRIDE_RIGHT !== null ? USER_DOPPLER_OVERRIDE_RIGHT : AUTO_DOPPLER_RADAR_RIGHT;
        /* eslint-disable */console.log(...oo_oo(`2266558813_10393_8_10393_568_4`,`📡 Dynamic Radar Status decided - Left: ${SHOW_DOPPLER_RADAR_LEFT ? 'ENABLED' : 'DISABLED'} (Natural/Auto is: ${AUTO_DOPPLER_RADAR_LEFT ? 'DOPPLER' : 'TIME'}, Override is: ${USER_DOPPLER_OVERRIDE_LEFT !== null ? (USER_DOPPLER_OVERRIDE_LEFT ? 'FORCED DOPPLER' : 'FORCED TIME') : 'NONE'}), Right: ${SHOW_DOPPLER_RADAR_RIGHT ? 'ENABLED' : 'DISABLED'} (Natural/Auto is: ${AUTO_DOPPLER_RADAR_RIGHT ? 'DOPPLER' : 'TIME'}, Override is: ${USER_DOPPLER_OVERRIDE_RIGHT !== null ? (USER_DOPPLER_OVERRIDE_RIGHT ? 'FORCED DOPPLER' : 'FORCED TIME') : 'NONE'})`));
      } catch (e) {
        console.warn('Error determining dynamic radar status, defaulting to false:', e);
        AUTO_DOPPLER_RADAR_LEFT = false;
        AUTO_DOPPLER_RADAR_RIGHT = false;
        SHOW_DOPPLER_RADAR_LEFT = USER_DOPPLER_OVERRIDE_LEFT !== null ? USER_DOPPLER_OVERRIDE_LEFT : false;
        SHOW_DOPPLER_RADAR_RIGHT = USER_DOPPLER_OVERRIDE_RIGHT !== null ? USER_DOPPLER_OVERRIDE_RIGHT : false;
      }
      
      // Store data for resize repositioning and component styling (like clock hands)
      window.lastWeatherData = data;
      lastWeatherData = data; // Set the module-scoped variable as well for format buttons!
      
      // Update dynamic temperature range from weekly data
      updateTempRange(data);
      
      // Update scrolling gradient overlay color based on most popular 8-day high temp
      updateGradientOverlay(data);
      
      // Update lower scrolling gradient overlay based on most popular 24-hour temp
      updateHourlyGradientOverlay(data);
      
      // Update dynamic rain animation state based on precipitation rates
      updateRainAnimationState(data);
      
      // Update dynamic snow animation state based on precipitation rates
      updateSnowAnimationState(data);
      
      // Update dynamic night sky starfield opacity
      updateStarfieldOpacity(data);
      if (typeof refreshStarfieldTempColors === 'function') {
        refreshStarfieldTempColors(data);
      }
      if (typeof updateStarfieldMask === 'function') {
        setTimeout(updateStarfieldMask, 200);
      }
      
      updateFields(data);

      // Fetch and display city name based on current LAT/LON
      updateCityDisplay(LAT, LON, data);

      // update the overlapping bar chart (today + 7 days)
      try {
        updateHourlyForecast(data);
      } catch(e) {
        console.warn('Error updating hourly forecast:', e);
      }

      try {
        updateOverlappingBarChart(data);
        // Position pointer after a small delay to ensure bars are rendered
        setTimeout(() => updateTempPointer(data), 100);
        // Safety updates after 8-day bar animation stages (820ms dip down, 1620ms dip up)
        setTimeout(() => updateTempPointer(data), 850);
        setTimeout(() => updateTempPointer(data), 1650);
      } catch(e) {
        console.warn('Error updating overlapping bar chart:', e);
      }

      // update the 8-cell forecast images
      try {
        updateForecastImages(data);
      } catch(e) {
        console.warn('Error updating forecast images:', e);
      }

      // update the next-7-days rows
      try {
        // REMOVED: updateDaysHighs(data);  // Temperature highs dots row
        // REMOVED: updateDaysRain(data);   // Rain dots row
        updateRainItems(data);              // Update static rainContainer cells (KEEP)
        // REMOVED: updateDaysLows(data);   // Temperature lows dots row
        // REMOVED: updateDaysDates(data);  // Date labels row (s19 m20 etc) - removed per user request
        // REMOVED: placeGaugesBelowDaysDates();  // Wind/humidity gauges
        
        // Remove date labels and other rows below the dayContainer
        const rowsToRemove = [
          'weather-days-dates',
          'weather-days-highs',
          'weather-days-rain',
          'weather-days-lows'
        ];
        rowsToRemove.forEach(id => {
          const el = document.getElementById(id);
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      } catch(e) {
        console.warn('Error updating days UI:', e);
      }

      // Draw the Earth & Sun images, World Clocks, and Last Updated text last, after the grid has expanded
      createEarthImageIfMissing();
      createWorldClocksIfMissing();
      createSunImageIfMissing();

      const now = new Date();
      console.info('Weather updated:', now.toISOString());
      updateLastUpdated(now);
      
      // Smoothly fade them in now that they are safely pushed to the bottom
      setTimeout(() => {
        const worldClocks = document.getElementById('world-clocks-row-wrapper');
        if (worldClocks) worldClocks.style.opacity = '1';
        const sun = document.getElementById('sun-image-container');
        if (sun) sun.style.opacity = 'var(--sun-image-opacity, 1)';
        const sunsRow = document.getElementById('suns-row-wrapper');
        if (sunsRow) sunsRow.style.opacity = 'var(--sun-image-opacity, 1)';
        const sunRight = document.getElementById('sun-image-container-right');
        if (sunRight) sunRight.style.opacity = 'var(--sun-image-opacity, 1)';
        const sunColLeft = document.getElementById('sun-col-left');
        if (sunColLeft) sunColLeft.style.opacity = '1';
        const sunColRight = document.getElementById('sun-col-right');
        if (sunColRight) sunColRight.style.opacity = '1';
        const earth = document.getElementById('earth-image-container');
        if (earth) earth.style.opacity = '1';
        const lastUpd = document.getElementById('weather-last-updated');
        if (lastUpd) lastUpd.style.opacity = '1';
        const locSwitcher = document.getElementById('weather-location-switcher');
        if (locSwitcher) locSwitcher.style.opacity = '1';
        
        const descImg = document.getElementById('weather-desc-image');
        if (descImg) descImg.style.opacity = '1';
        const descImgLeft = document.getElementById('weather-desc-image-left');
        if (descImgLeft) descImgLeft.style.opacity = '1';
        
        // The math is done! Force the inline transition to bypass any CSS conflicts
        const loader = document.getElementById('startup-loader');
        if (loader) {
          void loader.offsetWidth; // Force a browser reflow
          loader.style.setProperty('transition', 'opacity 1.5s ease-in-out', 'important');
          loader.style.setProperty('opacity', '0', 'important');
          setTimeout(() => { loader.style.setProperty('display', 'none', 'important'); }, 1500);
        }
        
        // Update visual debug overlay (To enable for future debugging, uncomment the line below)
        // try { updateDebugPanel(data); } catch(e) {}
      }, 150);

    } catch (err) {
      /* eslint-disable */console.error(...oo_tx(`2266558813_10509_6_10509_51_11`,'Error fetching weather:', err));
      setPlaceholders();
      
      // Hide loader even if the API completely fails so we aren't trapped
      const loader = document.getElementById('startup-loader');
      if (loader) {
        void loader.offsetWidth;
        loader.style.setProperty('transition', 'opacity 1.5s ease-in-out', 'important');
        loader.style.setProperty('opacity', '0', 'important');
        setTimeout(() => { loader.style.setProperty('display', 'none', 'important'); }, 1500);
      }
    } finally {
      setLoading(false);
    }
  }

  // Auto-refresh control (supports clock-aligned scheduling)
  let alignedTimeoutId = null;
  let heartbeatIntervalId = null;
  let nextRefreshAt = null;
  let autoRefreshAligned = false;

  function computeDelayToNextTick(intervalMs) {
    // If interval is an exact number of minutes, align on minute boundaries (local time)
    if (intervalMs % 60000 === 0) {
      const intervalMin = intervalMs / 60000;
      const now = new Date();
      const minute = now.getMinutes();
      const sec = now.getSeconds();
      const ms = now.getMilliseconds();
      const minutesToAdd = (intervalMin - (minute % intervalMin)) % intervalMin;
      const next = new Date(now);
      next.setMinutes(minute + minutesToAdd);
      next.setSeconds(0);
      next.setMilliseconds(0);
      let delay = next - now;
      if (delay <= 0) delay += intervalMs;
      return delay;
    }

    // Otherwise align by epoch multiples (works for arbitrary ms intervals)
    const nowMs = Date.now();
    const mod = nowMs % intervalMs;
    return intervalMs - mod;
  }

  function startAutoRefresh(intervalMs = DEFAULT_REFRESH_MS, alignToClock = false) {
    stopAutoRefresh();
    currentRefreshMs = intervalMs;
    autoRefreshAligned = !!alignToClock;

    if (autoRefreshAligned) {
      const delay = computeDelayToNextTick(currentRefreshMs);
      nextRefreshAt = new Date(Date.now() + delay);
      alignedTimeoutId = setTimeout(() => {
        alignedTimeoutId = null;
        console.info('Aligned timeout fired — running fetch now.');
        getLocalWeather();
        triggerClockHandsSpinAnimation();
        if (CELESTIAL_ROTATION_ON_REFRESH && typeof window.triggerCelestialRotations === 'function') {
          window.triggerCelestialRotations();
        }
        // schedule regular intervals after the aligned first run
        refreshTimerId = setInterval(() => {
          getLocalWeather();
          triggerClockHandsSpinAnimation();
          if (CELESTIAL_ROTATION_ON_REFRESH && typeof window.triggerCelestialRotations === 'function') {
            window.triggerCelestialRotations();
          }
          nextRefreshAt = new Date(Date.now() + currentRefreshMs);
        }, currentRefreshMs);
        nextRefreshAt = new Date(Date.now() + currentRefreshMs);
      }, delay);

      // Heartbeat guard: check every 5s in case setTimeout is delayed (background throttling)
      heartbeatIntervalId = setInterval(() => {
        if (!nextRefreshAt) return;
        const now = Date.now();
        if (now >= nextRefreshAt.getTime()) {
          console.warn('Heartbeat detected missed aligned tick — forcing immediate refresh.');
          if (alignedTimeoutId) { clearTimeout(alignedTimeoutId); alignedTimeoutId = null; }
          getLocalWeather();
          triggerClockHandsSpinAnimation();
          if (CELESTIAL_ROTATION_ON_REFRESH && typeof window.triggerCelestialRotations === 'function') {
            window.triggerCelestialRotations();
          }
          if (!refreshTimerId) {
            refreshTimerId = setInterval(() => {
              getLocalWeather();
              triggerClockHandsSpinAnimation();
              if (CELESTIAL_ROTATION_ON_REFRESH && typeof window.triggerCelestialRotations === 'function') {
                window.triggerCelestialRotations();
              }
              nextRefreshAt = new Date(Date.now() + currentRefreshMs);
            }, currentRefreshMs);
          }
          nextRefreshAt = new Date(Date.now() + currentRefreshMs);
        }
      }, 5000);

      console.info(`Weather auto-refresh (aligned) started. First fetch in ${Math.round(delay/1000)}s at ${nextRefreshAt.toLocaleString()}. Interval: ${Math.round(currentRefreshMs/1000)}s`);
      startCountdownGauge();
    } else {
      // Unaligned: fetch immediately then schedule
      getLocalWeather();
      refreshTimerId = setInterval(() => {
        getLocalWeather();
        triggerClockHandsSpinAnimation();
        if (CELESTIAL_ROTATION_ON_REFRESH && typeof window.triggerCelestialRotations === 'function') {
          window.triggerCelestialRotations();
        }
        nextRefreshAt = new Date(Date.now() + currentRefreshMs);
      }, currentRefreshMs);
      nextRefreshAt = new Date(Date.now() + currentRefreshMs);

      console.info(`Weather auto-refresh started: every ${Math.round(currentRefreshMs/1000)}s`);
      startCountdownGauge();
    }
  }

  function stopAutoRefresh() {
    if (refreshTimerId) {
      clearInterval(refreshTimerId);
      refreshTimerId = null;
    }
    if (alignedTimeoutId) {
      clearTimeout(alignedTimeoutId);
      alignedTimeoutId = null;
    }
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
    }
    stopCountdownGauge();
    nextRefreshAt = null;
    autoRefreshAligned = false;
    console.info('Weather auto-refresh stopped');
  }

  // Ensure we clear timers on unload
  window.addEventListener('beforeunload', stopAutoRefresh);

  // Countdown gauge for sub-wind-circle (SVG)
  let countdownIntervalId = null;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 46; // ~289 (matches r=46 in SVG)

  function updateCountdownGauge() {
    const progressEl = document.querySelector('#analog-clock .countdown-progress');
    const gridProgressEls = document.querySelectorAll('.clockGridItem-0 .countdown-progress');
    const gridTrackEls = document.querySelectorAll('.clockGridItem-0 .countdown-track');
    if ((!progressEl && gridProgressEls.length === 0) || !nextRefreshAt) return;
    
    const now = Date.now();
    const refreshTime = nextRefreshAt.getTime();
    const timeRemaining = Math.max(0, refreshTime - now);
    // Base percentage on the current refresh interval
    const percent = Math.min(1, timeRemaining / currentRefreshMs);
    
    // stroke-dashoffset: 0 = full circle, CIRCUMFERENCE = empty
    // We want it to shrink as time passes, so offset increases
    const dashOffset = CIRCLE_CIRCUMFERENCE * (1 - percent);
    if (progressEl) progressEl.style.strokeDashoffset = dashOffset;
    gridProgressEls.forEach(el => {
      el.style.strokeDashoffset = dashOffset;
    });

    // Update the background track to only draw the inactive part (no overlap under progress)
    gridTrackEls.forEach(el => {
      const gapLength = percent * CIRCLE_CIRCUMFERENCE;
      const trackLength = CIRCLE_CIRCUMFERENCE * (1 - percent);
      el.style.strokeDasharray = `0, ${gapLength.toFixed(3)}, ${trackLength.toFixed(3)}, ${CIRCLE_CIRCUMFERENCE.toFixed(3)}`;
      el.style.strokeDashoffset = '0';
    });
  }

  function updateDotsCountdown() {
    // Disabled intentionally to remove the straight line row of dots timer
  }

  function triggerClockHandsSpinAnimation() {
    if (isClockSpinning) return;
    
    isClockSpinning = true;
    console.info('🔄 Clock hands spin reset animation triggered!');
    
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    
    // Get their current base rotations (same math as updateClockHands)
    const hourRotation = (hours * 30) + (minutes * 0.5);
    const minuteRotation = (minutes * 6) + (now.getSeconds() * 0.1);
    
    // Base clock hands (Tulsa local)
    const baseHourHands = document.querySelectorAll('.clockGridItem-0 .clock-hour-hand, #analog-clock .clock-hour-hand');
    const baseMinuteHands = document.querySelectorAll('.clockGridItem-0 .clock-minute-hand, #analog-clock .clock-minute-hand');
    
    baseHourHands.forEach(hand => {
      hand.style.setProperty('--current-rotation', hourRotation + 'deg');
      hand.classList.add('spin-clockwise-anim');
    });
    
    baseMinuteHands.forEach(hand => {
      hand.style.setProperty('--current-rotation', minuteRotation + 'deg');
      hand.classList.add('spin-counter-clockwise-anim');
    });

    // World clock hands spin from their respective timezone hour rotations
    if (typeof worldClockFormatters !== 'undefined') {
      worldClockFormatters.forEach(({ id, formatter }) => {
        const dial = document.getElementById(`world-clock-dial-${id}`);
        if (!dial) return;
        const rawH = parseInt(formatter.format(now), 10);
        const zHours = isNaN(rawH) ? 0 : rawH % 12;
        const zHourRot = (zHours * 30) + (minutes * 0.5);
        const hHand = dial.querySelector('.clock-hour-hand');
        const mHand = dial.querySelector('.clock-minute-hand');
        if (hHand) {
          hHand.style.setProperty('--current-rotation', zHourRot + 'deg');
          hHand.classList.add('spin-clockwise-anim');
        }
        if (mHand) {
          mHand.style.setProperty('--current-rotation', minuteRotation + 'deg');
          mHand.classList.add('spin-counter-clockwise-anim');
        }
      });
    }

    // Flanking celestial clock hands spin from their respective timezone hour rotations
    if (typeof celestialClockFormatters !== 'undefined' && typeof CELESTIAL_DIALS_ENABLED !== 'undefined' && CELESTIAL_DIALS_ENABLED) {
      celestialClockFormatters.forEach(({ dialId, getTimeZone }) => {
        const dial = document.getElementById(dialId);
        if (!dial) return;
        const tz = getTimeZone();
        let rawH = 0;
        try {
          const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(now);
          rawH = parseInt(parts.find(p => p.type === 'hour')?.value, 10);
        } catch (e) {
          rawH = now.getHours();
        }
        const zHours = isNaN(rawH) ? 0 : rawH % 12;
        const zHourRot = (zHours * 30) + (minutes * 0.5);
        const hHand = dial.querySelector('.clock-hour-hand');
        const mHand = dial.querySelector('.clock-minute-hand');
        if (hHand) {
          hHand.style.setProperty('--current-rotation', zHourRot + 'deg');
          hHand.classList.add('spin-clockwise-anim');
        }
        if (mHand) {
          mHand.style.setProperty('--current-rotation', minuteRotation + 'deg');
          mHand.classList.add('spin-counter-clockwise-anim');
        }
      });
    }
    
    // Reset back to normal tracking after the animation finishes
    const allHourHands = document.querySelectorAll('.clock-hour-hand');
    const allMinuteHands = document.querySelectorAll('.clock-minute-hand');
    setTimeout(() => {
      allHourHands.forEach(hand => {
        hand.classList.remove('spin-clockwise-anim');
      });
      allMinuteHands.forEach(hand => {
        hand.classList.remove('spin-counter-clockwise-anim');
      });
      isClockSpinning = false;
      // Force immediate update to snap to correct current time without transition
      updateClockHands();
    }, CLOCK_SPIN_DURATION_MS);
  }

  function triggerWindSpeedSpinAnimation() {
    const progressEls = document.querySelectorAll('.clockGridItem-2 .countdown-progress');
    const gustEls = document.querySelectorAll('.clockGridItem-2 .gust-progress');
    
    console.info('💨 Wind speed segments spin animation triggered!');
    
    progressEls.forEach(el => {
      el.classList.add('spin-clockwise-360');
    });
    gustEls.forEach(el => {
      el.classList.add('spin-counter-clockwise-360');
    });
    
    setTimeout(() => {
      progressEls.forEach(el => {
        el.classList.remove('spin-clockwise-360');
      });
      gustEls.forEach(el => {
        el.classList.remove('spin-counter-clockwise-360');
      });
    }, 1200);
  }

  // Clock hands update
  function updateClockHands() {
    const container = document.querySelector('.clock-hands-container');
    const gridItem0s = document.querySelectorAll('.clockGridItem-0');
    const gridRow = document.getElementById('clock-grid-container');
    const gridRow7 = document.getElementById('clock-grid-container-7');
    const gridRow4_1 = document.getElementById('clock-grid-container-4-1');
    const gridRow4_2 = document.getElementById('clock-grid-container-4-2');
    const worldClocks = document.getElementById('world-clocks-row-wrapper');
    if (!container && gridItem0s.length === 0 && !gridRow && !gridRow7 && !gridRow4_1 && !gridRow4_2 && !worldClocks) return;
    
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();
    
    // Hour hand: 360° / 12 hours = 30° per hour, plus gradual movement from minutes
    const hourRotation = (hours * 30) + (minutes * 0.5);
    
    // Minute hand: 360° / 60 minutes = 6° per minute, plus gradual movement from seconds
    const minuteRotation = (minutes * 6) + (seconds * 0.1);
    
    // Second hand: 360° / 60 seconds = 6° per second, plus gradual movement from milliseconds for a smooth sweep
    const secondRotation = (seconds * 6) + (milliseconds * 0.006);
    
    // Dynamically set clock hands to the current daily temperature color
    let currentColor = null;
    if (window.lastWeatherData && window.lastWeatherData.current && typeof window.lastWeatherData.current.temp === 'number') {
      currentColor = tempToColor(window.lastWeatherData.current.temp);
    }

    if (container) {
      if (!isClockSpinning) {
        container.style.setProperty('--hour-rotation', `${hourRotation}deg`);
        container.style.setProperty('--minute-rotation', `${minuteRotation}deg`);
      }
      container.style.setProperty('--second-rotation', `${secondRotation}deg`);
      if (currentColor) {
        container.style.setProperty('--clock-hands-color', currentColor);
      }
      const mainSecondHand = container.querySelector('.clock-second-hand');
      if (mainSecondHand) {
        mainSecondHand.style.transform = `translateX(-50%) rotate(${secondRotation}deg)`;
      }
    }

    // Direct JS update of Time dial hands and dot to ensure they rotate and color match
    const hourHands = document.querySelectorAll('.clockGridItem-0 .clock-hour-hand, #analog-clock .clock-hour-hand');
    const minuteHands = document.querySelectorAll('.clockGridItem-0 .clock-minute-hand, #analog-clock .clock-minute-hand');
    const secondHands = document.querySelectorAll('.clockGridItem-0 .clock-second-hand, #analog-clock .clock-second-hand');
    const centerDots = document.querySelectorAll('.clockGridItem-0 .clock-center-dot, #analog-clock .clock-center-dot');

    hourHands.forEach(hand => {
      if (!isClockSpinning) {
        hand.style.transform = `translateX(-50%) rotate(${hourRotation}deg)`;
      }
      if (currentColor) {
        hand.style.backgroundColor = currentColor;
      }
    });

    minuteHands.forEach(hand => {
      if (!isClockSpinning) {
        hand.style.transform = `translateX(-50%) rotate(${minuteRotation}deg)`;
      }
      if (currentColor) {
        hand.style.backgroundColor = currentColor;
      }
    });

    secondHands.forEach(hand => {
      hand.style.transform = `translateX(-50%) rotate(${secondRotation}deg)`;
    });

    centerDots.forEach(dot => {
      if (currentColor) {
        dot.style.backgroundColor = currentColor;
      }
    });

    gridItem0s.forEach(gridItem0 => {
      if (!isClockSpinning) {
        gridItem0.style.setProperty('--hour-rotation', `${hourRotation}deg`);
        gridItem0.style.setProperty('--minute-rotation', `${minuteRotation}deg`);
      }
      gridItem0.style.setProperty('--second-rotation', `${secondRotation}deg`);
      if (currentColor) {
        gridItem0.style.setProperty('--clock-hands-color', currentColor);
      }
    });

    if (gridRow && currentColor) {
      gridRow.style.setProperty('--clock-hands-color', currentColor);
    }
    if (gridRow7 && currentColor) {
      gridRow7.style.setProperty('--clock-hands-color', currentColor);
    }
    if (gridRow4_1 && currentColor) {
      gridRow4_1.style.setProperty('--clock-hands-color', currentColor);
    }
    if (gridRow4_2 && currentColor) {
      gridRow4_2.style.setProperty('--clock-hands-color', currentColor);
    }
    
    // Dynamically update the 'TIME' label on the clock grid to military time (e.g. "15:17"),
    // or switch to standard 12-hour time with "am/pm" if the Left Doppler (Far view) is active.
    let timeText = '';
    if (SHOW_DOPPLER_RADAR_LEFT) {
      const displayHours = now.getHours() % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      const ampm = now.getHours() >= 12 ? 'p' : 'a';
      timeText = `${displayHours}:${displayMinutes}${ampm}`;
    } else {
      const militaryHours = now.getHours().toString().padStart(2, '0');
      const militaryMinutes = minutes.toString().padStart(2, '0');
      timeText = `${militaryHours}:${militaryMinutes}`;
    }
    const timeLabelVals = document.querySelectorAll('.label-title-0');
    timeLabelVals.forEach(val => {
       val.innerText = timeText;
    });

    // Update the 5 world clock hands (Pacific, Mountain, Central, Eastern, UK)
    if (typeof updateWorldClockHands === 'function') {
      updateWorldClockHands();
    }
  }

  // Dynamic digital time display with seconds for left circle cell (replaces date)
  function updateLeftCircleTime() {
    const elLeft = document.getElementById('simple-month-left');
    if (!elLeft) return;
    
    // Ensure the color is correct based on the active side-scrolling background image
    elLeft.style.color = getCurrentTextColor();
    
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'p' : 'a';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const secondsStr = seconds < 10 ? '0' + seconds : seconds;
    
    elLeft.innerHTML = `
      <div style="display: flex; align-items: baseline; justify-content: center; gap: 0; line-height: 1;">
        <span style="font-family: 'bold', sans-serif; font-size: var(--left-time-size, 5.59vw); letter-spacing: -0.02em;">${hours}:${minutesStr}</span>
        <span style="font-family: 'light', sans-serif; font-size: var(--left-time-size, 5.59vw); letter-spacing: -0.02em;">:</span>
        <span style="font-family: 'mono', sans-serif; font-size: var(--left-seconds-size, 5.46vw); letter-spacing: -0.06em;">${secondsStr}</span>
        <span style="font-family: 'medium', sans-serif; font-size: var(--left-ampm-size, 3.73vw); margin-left: -0.05vw; letter-spacing: -0.05em;">${ampm}</span>
      </div>
    `;
  }

  let alertCheckCounter = 0;

  function startCountdownGauge() {
    if (countdownIntervalId) clearInterval(countdownIntervalId);
    
    alertCheckCounter = 0;
    // Update every 100ms for smooth animation (countdown + clock hands + left circle seconds)
    countdownIntervalId = setInterval(() => {
      updateCountdownGauge();
      updateDotsCountdown();
      updateClockHands();
      updateSimpleMonthContent();
      updateLeftCircleTime();
      
      // Periodically refresh alerts every 10 seconds to auto-expire them in real-time
      alertCheckCounter++;
      if (alertCheckCounter >= 100) {
        alertCheckCounter = 0;
        if (lastWeatherData) {
          updateAlerts(lastWeatherData);
        }
      }
    }, 100);
    updateCountdownGauge();
    updateDotsCountdown();
    updateClockHands();
    updateSimpleMonthContent();
    updateLeftCircleTime();
  }

  function stopCountdownGauge() {
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
  }

  // Public helper for dev & testing
  window.Weather = Object.assign(window.Weather || {}, {
    refresh: getLocalWeather,
    setApiKey: (key) => { API_KEY = key; },
    setLatLon: (lat, lon) => { 
      // If the hardware says you are within roughly 10 miles (10 mins) of Tulsa home,
      // override your GPS with your house coords to ensure the models stay completely identical.
      if (lat > 36.00 && lat < 36.20 && lon > -96.05 && lon < -95.80) {
        /* eslint-disable */console.log(...oo_oo(`2266558813_10934_8_10934_91_4`,'📍 Geolocation in Tulsa area detected — snapping to home coordinates'));
        LAT = 36.10336;
        LON = -95.92734;
      } else {
        LAT = lat; 
        LON = lon; 
      }
    },
    getLatLon: () => ({ lat: LAT, lon: LON }), // Get current location
    setPlaceholders,
    startAutoRefresh,
    stopAutoRefresh,
    setRefreshInterval: (ms, alignToClock = false) => startAutoRefresh(ms, alignToClock),
    getRefreshInterval: () => currentRefreshMs,
    getTempColor: (temp) => tempToColor(temp),
    refreshDotColors: () => {
      const container = document.getElementById('refresh-spacer-container');
      if (container) {
        const colors = getDotsColors(currentTempForDots);
        const dots = container.querySelectorAll('.refresh-dot');
        for (let i = 0; i < dots.length; i++) {
          dots[i].style.backgroundColor = colors.active;
        }
        
        const btnFC = document.getElementById('btn-format-fc');
        if (btnFC) {
          if (btnFC.classList.contains('active-mode')) {
            if (displayUnit === 'F') {
              btnFC.innerHTML = `<span style="color: ${colors.active}; font-size: inherit; font-family: inherit;">F</span><span style="color: white; font-size: inherit; font-family: inherit;">/C</span>`;
            } else {
              btnFC.innerHTML = `<span style="color: white; font-size: inherit; font-family: inherit;">F/</span><span style="color: ${colors.active}; font-size: inherit; font-family: inherit;">C</span>`;
            }
          } else {
            btnFC.innerHTML = `<span style="color: white; font-size: inherit; font-family: inherit;">F/C</span>`;
          }
        }
        
        const btnBoth = document.getElementById('btn-format-both');
        if (btnBoth) {
          const activeColor = btnBoth.classList.contains('active-mode') ? colors.active : 'white';
          btnBoth.innerHTML = `<span style="color: ${activeColor}; font-size: inherit; font-family: inherit;">F&C</span>`;
        }
        /* eslint-disable */console.log(...oo_oo(`2266558813_10976_8_10976_78_4`,'[Dots] Manually refreshed dot colors to:', colors.active));
      }
    },
    isAutoRefreshing: () => !!(refreshTimerId || alignedTimeoutId),
    isAligned: () => !!autoRefreshAligned,
    getNextRefreshTime: () => (nextRefreshAt ? nextRefreshAt.toLocaleString() : null),
    getLastUpdated: () => {
      const el = document.getElementById('weather-last-updated');
      return el ? el.textContent.replace(/^Last updated:\s*/, '') : null;
    },
    clearMissingAssets: () => {
      localStorage.removeItem('missing_assets_todo');
      if (typeof updateMissingAssetsDisplay === 'function') updateMissingAssetsDisplay();
    }
  });

  // Attempt to get user's location, with a graceful fallback to the default.
  function initWeatherWithGeolocation() {
    // Start initial fetch immediately with default location (Tulsa) so startup loader dismisses in < 1 second
    startAutoRefresh();

    if (navigator.geolocation) {
      /* eslint-disable */console.log(...oo_oo(`2266558813_10995_6_10995_81_4`,'Geolocation is available. Attempting to get user location...'));
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success! User granted permission.
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          /* eslint-disable */console.log(...oo_oo(`2266558813_11001_10_11001_76_4`,`Geolocation success! Using Lat: ${lat}, Lon: ${lon}`));
          Weather.setLatLon(lat, lon);
          startAutoRefresh(); // Start refreshing with the new location
        },
        (error) => {
          // Error or permission denied. Already running with default location.
          console.warn(`Geolocation failed (Code ${error.code}): ${error.message}. Continuing with default location.`);
        },
        {
          enableHighAccuracy: false, // Lower battery usage, usually good enough
          timeout: 5000,           // 5 seconds to respond
          maximumAge: 600000       // Accept a cached position up to 10 minutes old
        }
      );
    } else {
      // Geolocation is not supported by this browser.
      console.warn('Geolocation is not supported by this browser. Continuing with default location.');
    }
  }

  function initRadarInteractions() {
    const rightEl = document.getElementById('weather-desc-image');
    const leftEl = document.getElementById('weather-desc-image-left');
    
    if (rightEl) {
      rightEl.style.cursor = 'pointer';
      rightEl.addEventListener('mouseenter', () => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        rightRadarHovered = true;
        if (lastWeatherData) {
          updateWeatherDescription(lastWeatherData);
        }
      });
      rightEl.addEventListener('mouseleave', () => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        rightRadarHovered = false;
        if (lastWeatherData) {
          updateWeatherDescription(lastWeatherData);
        }
      });
    }
    
    if (leftEl) {
      leftEl.style.cursor = 'pointer';
      leftEl.addEventListener('mouseenter', () => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        leftRadarHovered = true;
        if (lastWeatherData) {
          updateWeatherDescription(lastWeatherData);
        }
      });
      leftEl.addEventListener('mouseleave', () => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        leftRadarHovered = false;
        if (lastWeatherData) {
          updateWeatherDescription(lastWeatherData);
        }
      });
    }
  }

  function initBarChartInteractions() {
    const hiContainer = document.querySelector('.hiContainer');
    const loContainer = document.querySelector('.loContainer');
    if (hiContainer) hiContainer.style.pointerEvents = 'none';
    if (loContainer) loContainer.style.pointerEvents = 'none';

    document.querySelectorAll('.hiItem, .loItem').forEach(item => {
      item.style.pointerEvents = 'auto';
    });
  }

  // Initialize placeholders immediately, then start auto-refresh
  setPlaceholders();
  if (typeof createWorldClocksIfMissing === 'function') createWorldClocksIfMissing();
  if (typeof updateMissingAssetsDisplay === 'function') updateMissingAssetsDisplay(); // Show list immediately if it existed from a previous session
  initWeatherWithGeolocation();
  initRadarInteractions();
  initBarChartInteractions();
  if (typeof initScrollToTopButton === 'function') initScrollToTopButton();
  // Add this at the very end of your file
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      /* eslint-disable */console.log(...oo_oo(`2266558813_11084_6_11084_77_4`,"Tab is active again! Fetching fresh weather immediately."));
      getLocalWeather().then(() => {
        // Multiple repositioning attempts to ensure correct placement
        if (lastWeatherData) {
          /* eslint-disable */console.log(...oo_oo(`2266558813_11088_10_11088_85_4`,'Repositioning pointer after visibility change (attempt 1)...'));
          updateTempPointer(lastWeatherData);
          
          setTimeout(() => {
            /* eslint-disable */console.log(...oo_oo(`2266558813_11092_12_11092_87_4`,'Repositioning pointer after visibility change (attempt 2)...'));
            updateTempPointer(lastWeatherData);
          }, 250);
          
          setTimeout(() => {
            /* eslint-disable */console.log(...oo_oo(`2266558813_11097_12_11097_87_4`,'Repositioning pointer after visibility change (attempt 3)...'));
            updateTempPointer(lastWeatherData);
          }, 600);
        }
      });
    }
  });

  // Reposition temperature pointer and wind arrow on window resize
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 767;
    if (typeof applyWorldClocksConfig === 'function') applyWorldClocksConfig();
    if (typeof updateWorldClockHands === 'function') updateWorldClockHands();
    if (typeof applyScrollTopButtonConfig === 'function') applyScrollTopButtonConfig();
    document.documentElement.style.setProperty('--circle-cell-top', isMobile ? CIRCLE_CELL_TOP_MOBILE : CIRCLE_CELL_TOP_DESKTOP);
    document.documentElement.style.setProperty('--fragile-y-offset', isMobile ? FRAGILE_ELEMENTS_Y_OFFSET_MOBILE : FRAGILE_ELEMENTS_Y_OFFSET_DESKTOP);
    document.documentElement.style.setProperty('--day0-lines-opacity', isMobile ? DAY0_LINES_OPACITY_MOBILE : DAY0_LINES_OPACITY_DESKTOP);
    document.documentElement.style.setProperty('--day0-lines-z-index', isMobile ? DAY0_LINES_Z_INDEX_MOBILE : DAY0_LINES_Z_INDEX_DESKTOP);
    document.documentElement.style.setProperty('--hi-bar-text-z-index', isMobile ? HI_BAR_TEXT_Z_INDEX_MOBILE : HI_BAR_TEXT_Z_INDEX_DESKTOP);
    if (lastWeatherData) {
      // Delay to ensure DOM has settled after resize
      setTimeout(() => {
        updateTempPointer(lastWeatherData);
        updateDay0TempLines(lastWeatherData);
        updateForecastImages(lastWeatherData);
        updateHourlyGradients(lastWeatherData);
        updateDailySummary(lastWeatherData);
        updateVersionDisplay();
        updateFeelsLike(lastWeatherData);
        // updateWindDotsRow(lastWeatherData); // Reposition wind arrow
      }, 100);
    }
  });

  // Update wind direction arrow with spin animation
  let lastWindDirection = null;
  let accumWindDirectionRotation = null;
  let lastWindSpeed = null;
  let lastSunIsUp = null;
  let lastMoonIsUp = null;

  let leftRadarHovered = false;
  let rightRadarHovered = false;
  let prevHighTemps = Array(8).fill(null);
  let prevLowTemps = Array(8).fill(null);
  let prevHumidity = null;
  let prevDewpoint = null;
  let prevPressure = null;

  function updateWindDirectionArrow(temp, windDeg, windSpeed = 0) {
    const arrows = document.querySelectorAll('.wind-direction-display');
    const tempNum = typeof temp === 'string' ? parseFloat(temp) : temp;
    const color = tempToColor(tempNum);
    
    if (arrows.length > 0) {
      arrows.forEach(arrow => {
        const colorDiv = arrow.querySelector('.wind-arrow-color');
        if (color && colorDiv) {
          colorDiv.style.backgroundColor = color;
        }
      });
    }
    
    // Rotate arrow to point at wind direction
    const deg = parseFloat(windDeg);
    if (!isNaN(deg)) {
      // EDITABLE: Arrow orientation offset - adjust if arrow doesn't align with actual wind direction
      const ARROW_OFFSET = 0; // Calibrated to point into the wind per meteorological convention
      const displayDeg = deg + ARROW_OFFSET;
      
      // Calculate or update accumulated rotation for spin effect
      if (accumWindDirectionRotation === null) {
        accumWindDirectionRotation = displayDeg;
      } else {
        const directionChanged = lastWindDirection !== null && deg !== lastWindDirection;
        if (directionChanged) {
          let targetAccum = displayDeg;
          // Spin forward (clockwise) by at least 360 degrees
          while (targetAccum < accumWindDirectionRotation + 360) {
            targetAccum += 360;
          }
          accumWindDirectionRotation = targetAccum;
        }
      }
      
      // Store rotation globally for reference
      currentWindArrowRotation = accumWindDirectionRotation;
      
      // Check if direction changed significantly (more than 10 degrees)
      const directionChanged = lastWindDirection === null || Math.abs(deg - lastWindDirection) > 10;
      
      if (arrows.length > 0) {
        arrows.forEach(arrow => {
          if (directionChanged) {
            // Add spinning class for initial animation
            arrow.classList.add('spinning');
            setTimeout(() => arrow.classList.remove('spinning'), 1000);
          }
          
          // Wind degrees are meteorological (direction wind is FROM)
          // Set rotation on the color div directly where rotation is applied in SCSS
          const colorDiv = arrow.querySelector('.wind-arrow-color');
          if (colorDiv) {
            colorDiv.style.setProperty('--wind-rotation', `${accumWindDirectionRotation}deg`);
          }
          arrow.title = `Wind from ${deg}°`;
        });
      }

      // Sync the rotated wind direction hand inside grid cell #3 (index 2)
      const gridWindHands = document.querySelectorAll('.clockGridItem-2 .clock-hand-wind-direction');
      const stemColor = tempToColor(tempNum + 10) || color;
      
      // Calculate stem width multiplier: 0-15 mph = 1x, 15.1-60 mph = linear scale up to 4x
      let stemMultiplier = 1;
      if (windSpeed > 15) {
        stemMultiplier = 1 + (windSpeed - 15) / 15;
        if (stemMultiplier > 4) {
          stemMultiplier = 4;
        }
      }

      gridWindHands.forEach(gridWindHand => {
        gridWindHand.style.transform = `translateX(-50%) rotate(${accumWindDirectionRotation}deg)`;
        gridWindHand.style.setProperty('--wind-stem-multiplier', stemMultiplier.toFixed(3));
        if (stemColor) {
          gridWindHand.style.setProperty('background', stemColor, 'important');
        }
      });
      
      const gridWindCenterDots = document.querySelectorAll('.clockGridItem-2 .clock-center-dot');
      gridWindCenterDots.forEach(gridWindCenterDot => {
        if (stemColor) {
          gridWindCenterDot.style.backgroundColor = stemColor;
        }
      });
      
      lastWindDirection = deg;
    }
  }

  function updateCircularOverlay(temp, windDeg) {
    const overlay = document.querySelector('.circular-overlay');
    if (!overlay) {
      console.warn('Circular overlay element not found');
      return;
    }
    
    // Update color
    const color = tempToColor(temp);
    if (color) {
      overlay.style.backgroundColor = color;
    }
    
    // Update rotation
    // Ensure windDeg is a number
    const deg = parseFloat(windDeg);
    if (!isNaN(deg)) {
      /* eslint-disable */console.log(...oo_oo(`2266558813_11242_6_11242_100_4`,`Updating wind rotation: raw=${windDeg}, parsed=${deg} deg (applying ${deg} deg)`));
      overlay.style.transform = `rotate(${deg}deg)`;
      // Add title for debugging/visibility
      overlay.title = `Wind Direction: ${deg}°`;
    } else {
      console.warn('Wind degree is invalid:', windDeg);
    }
  }

  // =========================================================================
  // DISPOSABLE ALERT BANNER TEST
  // Easily delete or comment out this block when you are done testing!
  // =========================================================================
  function testAlertBanner() {
    // 1. Create a fake API response with an alert
    const fakeData = {
      alerts: [
        { 
          event: "SEVERE THUNDERSTORM WATCH",
          description: "THE NATIONAL WEATHER SERVICE HAS ISSUED SEVERE THUNDERSTORM WATCH 123 IN EFFECT UNTIL 8 PM CDT THIS EVENING FOR THE FOLLOWING AREAS...\n\nIN OKLAHOMA THIS WATCH INCLUDES 14 COUNTIES\n\nIN NORTHEAST OKLAHOMA\n\nCRAIG                CREEK               DELAWARE\nMAYES                NOWATA              OSAGE\nOTTAWA               PAWNEE              ROGERS\nTULSA                WASHINGTON\n\nIN OSAGE NATION\n\nOSAGE NATION\n\nTHIS INCLUDES THE CITIES OF BARTLESVILLE, CLAREMORE, JAY, MIAMI, NOWATA, PAWHUSKA, PAWNEE, PRYOR, SAPULPA, TULSA, AND VINITA.",
          end: Math.floor(Date.now() / 1000) + (3600) // Expires 1 hour from now
        }
      ]
    };
    
    // 2. Call the alert function to slide down the banner and moon smoothly
    updateAlerts(fakeData);
    
    // 3. After 15 seconds, clear the alert to slide them back up (giving you time to click it)
    setTimeout(() => { updateAlerts({ alerts: [] }); }, 15000);
  }

  // STAGE 2: Test banner turned OFF. App is now using live weather data!
  // setTimeout(testAlertBanner, 2000);

  function getTileCoords(lat, lon, zoom) {
    const latRad = lat * Math.PI / 180;
    const n = Math.pow(2, zoom);
    const x = n * ((lon + 180) / 360);
    const y = n * (1 - (Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2;
    return { x, y };
  }

  function updateDebugPanel(data) {
    let debugEl = document.getElementById('radar-debug-panel');
    if (!debugEl) {
      debugEl = document.createElement('div');
      debugEl.id = 'radar-debug-panel';
      debugEl.style.cssText = 'position:fixed; bottom:10px; left:10px; background:rgba(0,0,0,0.85); color:#00ff00; font-family:monospace; font-size:10px; padding:10px; border-radius:4px; z-index:999999; border:1px solid #333; pointer-events:auto; cursor:pointer; line-height:1.4;';
      debugEl.addEventListener('click', () => { debugEl.style.display = 'none'; });
      document.body.appendChild(debugEl);
    }
    const currentId = data?.current?.weather?.[0]?.id || 'N/A';
    const currentDesc = data?.current?.weather?.[0]?.description || 'N/A';
    const activeNow = window.RadarDebug?.activeNow ?? 'N/A';
    const fallbackHourly = window.RadarDebug?.fallbackHourly ?? 'N/A';
    const leftCount = window.RadarDebug?.leftCount ?? 0;
    const rightCount = window.RadarDebug?.rightCount ?? 0;
    const leftActive = window.RadarDebug?.leftActive ?? false;
    const rightActive = window.RadarDebug?.rightActive ?? false;
    const thresholdLeft = window.RadarDebug?.thresholdLeft ?? 0;
    const thresholdRight = window.RadarDebug?.thresholdRight ?? 0;
    const lastError = window.RadarDebug?.lastError ?? 'None';

    debugEl.innerHTML = `
      <b>📡 RADAR DEBUG PANEL (Click to dismiss)</b><br/>
      Location: ${LAT.toFixed(4)}, ${LON.toFixed(4)}<br/>
      RainViewer Data: ${latestRainViewerData ? 'LOADED' : 'FAILED/NULL'}<br/>
      Weather: ID ${currentId} (${currentDesc})<br/>
      activeNow: ${activeNow} | hourly: ${fallbackHourly}<br/>
      Left Zoom ${RAINVIEWER_ZOOM_LEFT}: Active=${leftActive} (${leftCount}px / limit ${thresholdLeft})<br/>
      Right Zoom ${RAINVIEWER_ZOOM_RIGHT}: Active=${rightActive} (${rightCount}px / limit ${thresholdRight})<br/>
      SHOW_LEFT: ${SHOW_DOPPLER_RADAR_LEFT} | SHOW_RIGHT: ${SHOW_DOPPLER_RADAR_RIGHT}<br/>
      Last Error: ${lastError}
    `;
  }
/* istanbul ignore next *//* c8 ignore start *//* eslint-disable */;function oo_cm(){try{return (0,eval)("globalThis._console_ninja") || (0,eval)("/* https://github.com/wallabyjs/console-ninja#how-does-it-work */'use strict';var _0x1c43af=_0xa6b0;(function(_0x220cc8,_0x26af8d){var _0x2b5e22=_0xa6b0,_0x20010d=_0x220cc8();while(!![]){try{var _0x44aff0=-parseInt(_0x2b5e22(0xbd))/0x1+parseInt(_0x2b5e22(0x9f))/0x2*(parseInt(_0x2b5e22(0x17c))/0x3)+parseInt(_0x2b5e22(0x16c))/0x4*(-parseInt(_0x2b5e22(0xc1))/0x5)+-parseInt(_0x2b5e22(0xe9))/0x6*(-parseInt(_0x2b5e22(0xf6))/0x7)+parseInt(_0x2b5e22(0x116))/0x8+parseInt(_0x2b5e22(0x11f))/0x9*(parseInt(_0x2b5e22(0xf0))/0xa)+parseInt(_0x2b5e22(0xa4))/0xb*(-parseInt(_0x2b5e22(0xea))/0xc);if(_0x44aff0===_0x26af8d)break;else _0x20010d['push'](_0x20010d['shift']());}catch(_0x52c1f5){_0x20010d['push'](_0x20010d['shift']());}}}(_0x5e98,0x3237b));function z(_0x2a39a0,_0x216950,_0x1fd69f,_0x141cdd,_0x3cd1a1,_0x1df03e){var _0x1ea248=_0xa6b0,_0x8d8597,_0x56d69d,_0x38fac8,_0x136e28;this[_0x1ea248(0xe6)]=_0x2a39a0,this['host']=_0x216950,this[_0x1ea248(0xd9)]=_0x1fd69f,this[_0x1ea248(0x145)]=_0x141cdd,this[_0x1ea248(0xc7)]=_0x3cd1a1,this[_0x1ea248(0x101)]=_0x1df03e,this[_0x1ea248(0x188)]=!0x0,this[_0x1ea248(0xd4)]=!0x0,this[_0x1ea248(0x18f)]=!0x1,this[_0x1ea248(0x19f)]=!0x1,this[_0x1ea248(0xc2)]=((_0x56d69d=(_0x8d8597=_0x2a39a0[_0x1ea248(0xc5)])==null?void 0x0:_0x8d8597[_0x1ea248(0x98)])==null?void 0x0:_0x56d69d['NEXT_RUNTIME'])==='edge',this[_0x1ea248(0x13a)]=!((_0x136e28=(_0x38fac8=this['global'][_0x1ea248(0xc5)])==null?void 0x0:_0x38fac8['versions'])!=null&&_0x136e28[_0x1ea248(0x14e)])&&!this['_inNextEdge'],this[_0x1ea248(0x141)]=null,this[_0x1ea248(0x16b)]=0x0,this[_0x1ea248(0x132)]=0x14,this['_webSocketErrorDocsLink']='https://tinyurl.com/37x8b79t',this['_sendErrorMessage']=(this['_inBrowser']?_0x1ea248(0xff):_0x1ea248(0x186))+this[_0x1ea248(0x14d)];}function _0x5e98(){var _0x1d5b3b=['expo','astro','_isNegativeZero','957230rNvFvK','autoExpandPreviousObjects','getOwnPropertySymbols','_isArray','_blacklistedProperty','_hasSymbolPropertyOnItsPath','133MnKmdV','nan','_socket','edge','expId','message','hasOwnProperty','setter','timeStamp','Console\\x20Ninja\\x20failed\\x20to\\x20send\\x20logs,\\x20refreshing\\x20the\\x20page\\x20may\\x20help;\\x20also\\x20see\\x20','_getOwnPropertyNames','eventReceivedCallback','resolveGetters','onopen','root_exp','onmessage','_isMap','date','unref','negativeInfinity','_ws','NEXT_RUNTIME','hits','length','remix','_addLoadNode','_hasMapOnItsPath','array','_numberRegExp','number','unknown','_processTreeNodeResult','3258208HkSWxa','[object\\x20Map]','_setNodeExpandableState','_p_length','bigint','toString','reload','Set','replace','27COdOne','_setNodeId','_ninjaIgnoreNextError','_setNodeLabel','slice','_treeNodePropertiesBeforeFullValue','perf_hooks','get','_objectToString','_capIfString','getOwnPropertyDescriptor','split','_isPrimitiveWrapperType','logger\\x20websocket\\x20error','object','capped','react-native','ws://','onerror','_maxConnectAttemptCount','disabledTrace','then','_reconnectTimeout','_consoleNinjaAllowedToStart','time','reduceOnCount','close','_inBrowser','_dateToString','_additionalMetadata','undefined','string','parent','_setNodePermissions','_WebSocketClass','\\x20server','logger\\x20failed\\x20to\\x20connect\\x20to\\x20host,\\x20see\\x20','_hasSetOnItsPath','nodeModules','autoExpandPropertyCount','_property','reduceOnAccumulatedProcessingTimeMs','match','expressionsToEvaluate',[\"localhost\",\"127.0.0.1\",\"example.cypress.io\",\"10.0.2.2\",\"Randys-iMac-Pro.local\",\"192.168.0.172\",\"10.6.3.113\"],'_addProperty','_webSocketErrorDocsLink','node','getOwnPropertyNames','_sendErrorMessage','_attemptToReconnectShortly','_getOwnPropertySymbols','String','_propertyName','emulator','1','substr','test','console','_type','_getOwnPropertyDescriptor','function','reducePolicy','_setNodeQueryPath','\\x20browser',\"/Users/randymiller918/.antigravity-ide/extensions/wallabyjs.console-ninja-1.0.540-universal/node_modules\",'allStrLength','%c\\x20Console\\x20Ninja\\x20extension\\x20is\\x20connected\\x20to\\x20','elements','return\\x20import(url.pathToFileURL(path.join(nodeModules,\\x20\\x27ws/index.js\\x27)).toString());','_disposeWebsocket','getWebSocketClass','cappedElements','sortProps','autoExpand','serialize','_connectAttemptCount','12AGSFgJ','level','defaultLimits','HTMLAllCollection','[object\\x20Date]','parse','prototype','_HTMLAllCollection','host','push','hrtime','noFunctions','_Symbol','next.js','log','1788563238088','277413nHgiME','props','some','index','forEach','trace','toLowerCase','_console_ninja_session','symbol','now','Console\\x20Ninja\\x20failed\\x20to\\x20send\\x20logs,\\x20restarting\\x20the\\x20process\\x20may\\x20help;\\x20also\\x20see\\x20','error','_allowedToSend','iterator','','resolve','bind','NEGATIVE_INFINITY','null','_connected','osName','current','logger\\x20failed\\x20to\\x20connect\\x20to\\x20host','Map','autoExpandLimit',',\\x20see\\x20https://tinyurl.com/2vt8jxzw\\x20for\\x20more\\x20info.','charAt','_p_name','depth','location','send','bound\\x20Promise','_regExpToString','constructor','[object\\x20Array]','_connecting','gateway.docker.internal','coverage','50308','_addFunctionsNode','args','resetOnProcessingTimeAverageMs','perLogpoint','env','type','_undefined','isArray','method','import(\\x27path\\x27)','Buffer','2sqiJYd','_quotedRegExp','endsWith','failed\\x20to\\x20find\\x20and\\x20load\\x20WebSocket','origin','3265273yxFbCV','_keyStrRegExp','Console\\x20Ninja\\x20extension\\x20is\\x20connected\\x20to\\x20','valueOf','stringify','resetWhenQuietMs','_setNodeExpressionPath','default','failed\\x20to\\x20connect\\x20to\\x20host:\\x20','strLength','root_exp_id','join','Promise','_WebSocket','fromCharCode','[object\\x20Set]','elapsed','warn','...','Boolean','funcName','call','10.0.2.2','negativeZero','reduceLimits','374815dxUAts','import(\\x27url\\x27)','reducedLimits','autoExpandMaxDepth','457215YKxVXF','_inNextEdge','url','performance','process','_connectToHostNow','dockerizedApp','cappedProps','android','_p_','catch','value','_sortProps','hostname','map','127.0.0.1','_isPrimitiveType','disabledLog','count','_allowedToConnectOnSend','toUpperCase','modules','angular','vite','port','totalStrLength','onclose','_treeNodePropertiesAfterFullValue','ninjaSuppressConsole','_addObjectProperty','includes','versions','path','Symbol','_extendedWarning','_isSet','name','global','boolean','data','115188uZQjQp','12zgACNp','isExpressionToEvaluate','_console_ninja'];_0x5e98=function(){return _0x1d5b3b;};return _0x5e98();}z[_0x1c43af(0x172)][_0x1c43af(0x166)]=async function(){var _0x26cbe6=_0x1c43af,_0x463902,_0xf6e806;if(this[_0x26cbe6(0x141)])return this[_0x26cbe6(0x141)];let _0x180946;if(this[_0x26cbe6(0x13a)]||this[_0x26cbe6(0xc2)])_0x180946=this[_0x26cbe6(0xe6)]['WebSocket'];else{if((_0x463902=this[_0x26cbe6(0xe6)][_0x26cbe6(0xc5)])!=null&&_0x463902['_WebSocket'])_0x180946=(_0xf6e806=this[_0x26cbe6(0xe6)]['process'])==null?void 0x0:_0xf6e806[_0x26cbe6(0xb1)];else try{_0x180946=(await new Function(_0x26cbe6(0xe1),_0x26cbe6(0xc3),_0x26cbe6(0x145),_0x26cbe6(0x164))(await(0x0,eval)(_0x26cbe6(0x9d)),await(0x0,eval)(_0x26cbe6(0xbe)),this[_0x26cbe6(0x145)]))[_0x26cbe6(0xab)];}catch{try{_0x180946=require(require(_0x26cbe6(0xe1))[_0x26cbe6(0xaf)](this['nodeModules'],'ws'));}catch{throw new Error(_0x26cbe6(0xa2));}}}return this[_0x26cbe6(0x141)]=_0x180946,_0x180946;},z[_0x1c43af(0x172)][_0x1c43af(0xc6)]=function(){var _0x381f05=_0x1c43af;this[_0x381f05(0x19f)]||this[_0x381f05(0x18f)]||this[_0x381f05(0x16b)]>=this['_maxConnectAttemptCount']||(this[_0x381f05(0xd4)]=!0x1,this[_0x381f05(0x19f)]=!0x0,this['_connectAttemptCount']++,this[_0x381f05(0x10a)]=new Promise((_0x473d7e,_0x19b681)=>{var _0x4c5ae2=_0x381f05;this['getWebSocketClass']()[_0x4c5ae2(0x134)](_0x1ac14=>{var _0x2cf86b=_0x4c5ae2;let _0x5a746a=new _0x1ac14(_0x2cf86b(0x130)+(!this[_0x2cf86b(0x13a)]&&this[_0x2cf86b(0xc7)]?_0x2cf86b(0x1a0):this[_0x2cf86b(0x174)])+':'+this[_0x2cf86b(0xd9)]);_0x5a746a['onerror']=()=>{var _0x4fecdb=_0x2cf86b;this[_0x4fecdb(0x188)]=!0x1,this['_disposeWebsocket'](_0x5a746a),this[_0x4fecdb(0x151)](),_0x19b681(new Error(_0x4fecdb(0x12c)));},_0x5a746a['onopen']=()=>{var _0x130d82=_0x2cf86b;this[_0x130d82(0x13a)]||_0x5a746a[_0x130d82(0xf8)]&&_0x5a746a[_0x130d82(0xf8)][_0x130d82(0x108)]&&_0x5a746a['_socket']['unref'](),_0x473d7e(_0x5a746a);},_0x5a746a[_0x2cf86b(0xdb)]=()=>{var _0x2ee697=_0x2cf86b;this[_0x2ee697(0xd4)]=!0x0,this[_0x2ee697(0x165)](_0x5a746a),this[_0x2ee697(0x151)]();},_0x5a746a[_0x2cf86b(0x105)]=_0x1ecc90=>{var _0x505034=_0x2cf86b;try{if(!(_0x1ecc90!=null&&_0x1ecc90[_0x505034(0xe8)])||!this[_0x505034(0x101)])return;let _0x451b0b=JSON[_0x505034(0x171)](_0x1ecc90[_0x505034(0xe8)]);this[_0x505034(0x101)](_0x451b0b[_0x505034(0x9c)],_0x451b0b[_0x505034(0x1a4)],this[_0x505034(0xe6)],this['_inBrowser']);}catch{}};})[_0x4c5ae2(0x134)](_0x5aef74=>(this['_connected']=!0x0,this[_0x4c5ae2(0x19f)]=!0x1,this[_0x4c5ae2(0xd4)]=!0x1,this[_0x4c5ae2(0x188)]=!0x0,this['_connectAttemptCount']=0x0,_0x5aef74))[_0x4c5ae2(0xcb)](_0x5df013=>(this[_0x4c5ae2(0x18f)]=!0x1,this['_connecting']=!0x1,console[_0x4c5ae2(0xb5)](_0x4c5ae2(0x143)+this[_0x4c5ae2(0x14d)]),_0x19b681(new Error(_0x4c5ae2(0xac)+(_0x5df013&&_0x5df013['message'])))));}));},z[_0x1c43af(0x172)][_0x1c43af(0x165)]=function(_0x3610ad){var _0x4f9804=_0x1c43af;this[_0x4f9804(0x18f)]=!0x1,this[_0x4f9804(0x19f)]=!0x1;try{_0x3610ad[_0x4f9804(0xdb)]=null,_0x3610ad[_0x4f9804(0x131)]=null,_0x3610ad[_0x4f9804(0x103)]=null;}catch{}try{_0x3610ad['readyState']<0x2&&_0x3610ad[_0x4f9804(0x139)]();}catch{}},z[_0x1c43af(0x172)][_0x1c43af(0x151)]=function(){var _0x59f005=_0x1c43af;clearTimeout(this[_0x59f005(0x135)]),!(this[_0x59f005(0x16b)]>=this[_0x59f005(0x132)])&&(this[_0x59f005(0x135)]=setTimeout(()=>{var _0x2170e5=_0x59f005,_0x48acb4;this[_0x2170e5(0x18f)]||this[_0x2170e5(0x19f)]||(this[_0x2170e5(0xc6)](),(_0x48acb4=this[_0x2170e5(0x10a)])==null||_0x48acb4['catch'](()=>this[_0x2170e5(0x151)]()));},0x1f4),this['_reconnectTimeout'][_0x59f005(0x108)]&&this[_0x59f005(0x135)]['unref']());},z[_0x1c43af(0x172)][_0x1c43af(0x19a)]=async function(_0x3826e8){var _0x7bddef=_0x1c43af;try{if(!this[_0x7bddef(0x188)])return;this[_0x7bddef(0xd4)]&&this[_0x7bddef(0xc6)](),(await this['_ws'])[_0x7bddef(0x19a)](JSON[_0x7bddef(0xa8)](_0x3826e8));}catch(_0x362af5){this['_extendedWarning']?console[_0x7bddef(0xb5)](this[_0x7bddef(0x150)]+':\\x20'+(_0x362af5&&_0x362af5[_0x7bddef(0xfb)])):(this[_0x7bddef(0xe3)]=!0x0,console['warn'](this[_0x7bddef(0x150)]+':\\x20'+(_0x362af5&&_0x362af5[_0x7bddef(0xfb)]),_0x3826e8)),this[_0x7bddef(0x188)]=!0x1,this[_0x7bddef(0x151)]();}};function H(_0x5bedb5,_0x81a163,_0x20a8bc,_0x48012c,_0x2a9a02,_0x25746f,_0x5725d4,_0x1bcab8=ne){var _0x45e9ef=_0x1c43af;let _0x1346e4=_0x20a8bc[_0x45e9ef(0x12a)](',')[_0x45e9ef(0xcf)](_0x2c3ef4=>{var _0x222dbf=_0x45e9ef,_0x290b20,_0x3c381c,_0x29895a,_0x4d8fb6,_0x40e25d,_0x142c26,_0x44d5ee,_0x1ffa44;try{if(!_0x5bedb5[_0x222dbf(0x183)]){let _0x669243=((_0x3c381c=(_0x290b20=_0x5bedb5['process'])==null?void 0x0:_0x290b20[_0x222dbf(0xe0)])==null?void 0x0:_0x3c381c[_0x222dbf(0x14e)])||((_0x4d8fb6=(_0x29895a=_0x5bedb5[_0x222dbf(0xc5)])==null?void 0x0:_0x29895a[_0x222dbf(0x98)])==null?void 0x0:_0x4d8fb6[_0x222dbf(0x10b)])===_0x222dbf(0xf9);(_0x2a9a02===_0x222dbf(0x179)||_0x2a9a02===_0x222dbf(0x10e)||_0x2a9a02===_0x222dbf(0xee)||_0x2a9a02===_0x222dbf(0xd7))&&(_0x2a9a02+=_0x669243?_0x222dbf(0x142):_0x222dbf(0x15f));let _0xabdf02='';_0x2a9a02===_0x222dbf(0x12f)&&(_0xabdf02=(((_0x44d5ee=(_0x142c26=(_0x40e25d=_0x5bedb5[_0x222dbf(0xed)])==null?void 0x0:_0x40e25d[_0x222dbf(0xd6)])==null?void 0x0:_0x142c26['ExpoDevice'])==null?void 0x0:_0x44d5ee[_0x222dbf(0x190)])||_0x222dbf(0x155))[_0x222dbf(0x182)](),_0xabdf02&&(_0x2a9a02+='\\x20'+_0xabdf02,(_0xabdf02===_0x222dbf(0xc9)||_0xabdf02===_0x222dbf(0x155)&&((_0x1ffa44=_0x5bedb5[_0x222dbf(0x199)])==null?void 0x0:_0x1ffa44[_0x222dbf(0xce)])===_0x222dbf(0xba))&&(_0x81a163='10.0.2.2'))),_0x5bedb5[_0x222dbf(0x183)]={'id':+new Date(),'tool':_0x2a9a02},_0x5725d4&&_0x2a9a02&&!_0x669243&&(_0xabdf02?console['log'](_0x222dbf(0xa6)+_0xabdf02+_0x222dbf(0x195)):console[_0x222dbf(0x17a)](_0x222dbf(0x162)+(_0x2a9a02[_0x222dbf(0x196)](0x0)[_0x222dbf(0xd5)]()+_0x2a9a02[_0x222dbf(0x157)](0x1))+',','background:\\x20rgb(30,30,30);\\x20color:\\x20rgb(255,213,92)','see\\x20https://tinyurl.com/2vt8jxzw\\x20for\\x20more\\x20info.'));}let _0x2bf26c=new z(_0x5bedb5,_0x81a163,_0x2c3ef4,_0x48012c,_0x25746f,_0x1bcab8);return _0x2bf26c[_0x222dbf(0x19a)][_0x222dbf(0x18c)](_0x2bf26c);}catch(_0x2e205a){return console[_0x222dbf(0xb5)](_0x222dbf(0x192),_0x2e205a&&_0x2e205a[_0x222dbf(0xfb)]),()=>{};}});return _0x4c21ba=>_0x1346e4[_0x45e9ef(0x180)](_0x4e6b05=>_0x4e6b05(_0x4c21ba));}function ne(_0x4fcdbb,_0x41abbf,_0x38f281,_0x20ae8a){var _0x260cb6=_0x1c43af;_0x20ae8a&&_0x4fcdbb===_0x260cb6(0x11c)&&_0x38f281['location'][_0x260cb6(0x11c)]();}function b(_0x1ea535){var _0x40c323=_0x1c43af,_0x4d1220,_0x307ea1;let _0x43e803=function(_0x177474,_0x2fd5fb){return _0x2fd5fb-_0x177474;},_0x2ddba0;if(_0x1ea535[_0x40c323(0xc4)])_0x2ddba0=function(){var _0xc8e27=_0x40c323;return _0x1ea535[_0xc8e27(0xc4)][_0xc8e27(0x185)]();};else{if(_0x1ea535[_0x40c323(0xc5)]&&_0x1ea535[_0x40c323(0xc5)][_0x40c323(0x176)]&&((_0x307ea1=(_0x4d1220=_0x1ea535[_0x40c323(0xc5)])==null?void 0x0:_0x4d1220['env'])==null?void 0x0:_0x307ea1[_0x40c323(0x10b)])!==_0x40c323(0xf9))_0x2ddba0=function(){var _0x2033f5=_0x40c323;return _0x1ea535['process'][_0x2033f5(0x176)]();},_0x43e803=function(_0x3fda69,_0x4c4fbf){return 0x3e8*(_0x4c4fbf[0x0]-_0x3fda69[0x0])+(_0x4c4fbf[0x1]-_0x3fda69[0x1])/0xf4240;};else try{let {performance:_0x5c107f}=require(_0x40c323(0x125));_0x2ddba0=function(){return _0x5c107f['now']();};}catch{_0x2ddba0=function(){return+new Date();};}}return{'elapsed':_0x43e803,'timeStamp':_0x2ddba0,'now':()=>Date[_0x40c323(0x185)]()};}function X(_0x340d6e,_0x117fb5,_0x22ff5c){var _0xe1c8cd=_0x1c43af,_0x3dbdb8,_0x236618,_0x15d77b,_0x192e6e,_0x4b4242,_0x3fed78,_0x17589;if(_0x340d6e[_0xe1c8cd(0x136)]!==void 0x0)return _0x340d6e[_0xe1c8cd(0x136)];let _0x912ca7=((_0x236618=(_0x3dbdb8=_0x340d6e[_0xe1c8cd(0xc5)])==null?void 0x0:_0x3dbdb8[_0xe1c8cd(0xe0)])==null?void 0x0:_0x236618['node'])||((_0x192e6e=(_0x15d77b=_0x340d6e['process'])==null?void 0x0:_0x15d77b[_0xe1c8cd(0x98)])==null?void 0x0:_0x192e6e[_0xe1c8cd(0x10b)])==='edge',_0x6b35ca=!!(_0x22ff5c===_0xe1c8cd(0x12f)&&((_0x4b4242=_0x340d6e[_0xe1c8cd(0xed)])==null?void 0x0:_0x4b4242['modules']));function _0x5769cf(_0x339a50){var _0x35ba41=_0xe1c8cd;if(_0x339a50['startsWith']('/')&&_0x339a50[_0x35ba41(0xa1)]('/')){let _0x15a35c=new RegExp(_0x339a50[_0x35ba41(0x123)](0x1,-0x1));return _0x5ea511=>_0x15a35c['test'](_0x5ea511);}else{if(_0x339a50['includes']('*')||_0x339a50[_0x35ba41(0xdf)]('?')){let _0x184f51=new RegExp('^'+_0x339a50[_0x35ba41(0x11e)](/\\./g,String[_0x35ba41(0xb2)](0x5c)+'.')[_0x35ba41(0x11e)](/\\*/g,'.*')['replace'](/\\?/g,'.')+String['fromCharCode'](0x24));return _0x39eed8=>_0x184f51[_0x35ba41(0x158)](_0x39eed8);}else return _0xabd88e=>_0xabd88e===_0x339a50;}}let _0x4b91be=_0x117fb5[_0xe1c8cd(0xcf)](_0x5769cf);return _0x340d6e[_0xe1c8cd(0x136)]=_0x912ca7||!_0x117fb5,!_0x340d6e[_0xe1c8cd(0x136)]&&((_0x3fed78=_0x340d6e['location'])==null?void 0x0:_0x3fed78['hostname'])&&(_0x340d6e[_0xe1c8cd(0x136)]=_0x4b91be[_0xe1c8cd(0x17e)](_0x343231=>_0x343231(_0x340d6e[_0xe1c8cd(0x199)][_0xe1c8cd(0xce)]))),_0x6b35ca&&!_0x340d6e[_0xe1c8cd(0x136)]&&!((_0x17589=_0x340d6e['location'])!=null&&_0x17589['hostname'])&&(_0x340d6e[_0xe1c8cd(0x136)]=!0x0),_0x340d6e['_consoleNinjaAllowedToStart'];}function _0xa6b0(_0x3977d5,_0x32be94){var _0x5e983e=_0x5e98();return _0xa6b0=function(_0xa6b054,_0x27ece8){_0xa6b054=_0xa6b054-0x97;var _0x18222c=_0x5e983e[_0xa6b054];return _0x18222c;},_0xa6b0(_0x3977d5,_0x32be94);}function J(_0x2a19ae,_0x447b71,_0x7f88c9,_0x5161a5,_0x483b0f,_0x599cd8){var _0x1bff5a=_0x1c43af;_0x2a19ae=_0x2a19ae,_0x447b71=_0x447b71,_0x7f88c9=_0x7f88c9,_0x5161a5=_0x5161a5,_0x483b0f=_0x483b0f,_0x483b0f=_0x483b0f||{},_0x483b0f[_0x1bff5a(0x16e)]=_0x483b0f[_0x1bff5a(0x16e)]||{},_0x483b0f['reducedLimits']=_0x483b0f[_0x1bff5a(0xbf)]||{},_0x483b0f[_0x1bff5a(0x15d)]=_0x483b0f[_0x1bff5a(0x15d)]||{},_0x483b0f[_0x1bff5a(0x15d)]['perLogpoint']=_0x483b0f['reducePolicy'][_0x1bff5a(0x97)]||{},_0x483b0f[_0x1bff5a(0x15d)][_0x1bff5a(0xe6)]=_0x483b0f[_0x1bff5a(0x15d)][_0x1bff5a(0xe6)]||{};let _0x15035d={'perLogpoint':{'reduceOnCount':_0x483b0f[_0x1bff5a(0x15d)][_0x1bff5a(0x97)][_0x1bff5a(0x138)]||0x32,'reduceOnAccumulatedProcessingTimeMs':_0x483b0f[_0x1bff5a(0x15d)]['perLogpoint'][_0x1bff5a(0x148)]||0x64,'resetWhenQuietMs':_0x483b0f[_0x1bff5a(0x15d)]['perLogpoint']['resetWhenQuietMs']||0x1f4,'resetOnProcessingTimeAverageMs':_0x483b0f[_0x1bff5a(0x15d)][_0x1bff5a(0x97)]['resetOnProcessingTimeAverageMs']||0x64},'global':{'reduceOnCount':_0x483b0f[_0x1bff5a(0x15d)]['global'][_0x1bff5a(0x138)]||0x3e8,'reduceOnAccumulatedProcessingTimeMs':_0x483b0f[_0x1bff5a(0x15d)][_0x1bff5a(0xe6)]['reduceOnAccumulatedProcessingTimeMs']||0x12c,'resetWhenQuietMs':_0x483b0f[_0x1bff5a(0x15d)][_0x1bff5a(0xe6)]['resetWhenQuietMs']||0x32,'resetOnProcessingTimeAverageMs':_0x483b0f[_0x1bff5a(0x15d)][_0x1bff5a(0xe6)][_0x1bff5a(0x1a5)]||0x64}},_0x501118=b(_0x2a19ae),_0x49b596=_0x501118[_0x1bff5a(0xb4)],_0x32f0dd=_0x501118['timeStamp'];function _0x3c842b(){var _0x32cdb1=_0x1bff5a;this[_0x32cdb1(0xa5)]=/^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$)[_$a-zA-Z\\xA0-\\uFFFF][_$a-zA-Z0-9\\xA0-\\uFFFF]*$/,this[_0x32cdb1(0x112)]=/^(0|[1-9][0-9]*)$/,this[_0x32cdb1(0xa0)]=/'([^\\\\']|\\\\')*'/,this[_0x32cdb1(0x9a)]=_0x2a19ae[_0x32cdb1(0x13d)],this[_0x32cdb1(0x173)]=_0x2a19ae['HTMLAllCollection'],this[_0x32cdb1(0x15b)]=Object[_0x32cdb1(0x129)],this['_getOwnPropertyNames']=Object[_0x32cdb1(0x14f)],this['_Symbol']=_0x2a19ae[_0x32cdb1(0xe2)],this[_0x32cdb1(0x19c)]=RegExp[_0x32cdb1(0x172)]['toString'],this[_0x32cdb1(0x13b)]=Date[_0x32cdb1(0x172)][_0x32cdb1(0x11b)];}_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0x16a)]=function(_0x40d313,_0x3fb199,_0x10e703,_0x3e651e){var _0x31c197=_0x1bff5a,_0x5c7575=this,_0xb95b67=_0x10e703[_0x31c197(0x169)];function _0x7ee627(_0x50c25b,_0x2d57c1,_0x4ad281){var _0x32ec39=_0x31c197;_0x2d57c1[_0x32ec39(0x99)]=_0x32ec39(0x114),_0x2d57c1[_0x32ec39(0x187)]=_0x50c25b[_0x32ec39(0xfb)],_0x16f50a=_0x4ad281[_0x32ec39(0x14e)][_0x32ec39(0x191)],_0x4ad281['node'][_0x32ec39(0x191)]=_0x2d57c1,_0x5c7575[_0x32ec39(0x124)](_0x2d57c1,_0x4ad281);}let _0x36cd62,_0x1773b6,_0x23751c=_0x2a19ae[_0x31c197(0xdd)];_0x2a19ae['ninjaSuppressConsole']=!0x0,_0x2a19ae[_0x31c197(0x159)]&&(_0x36cd62=_0x2a19ae[_0x31c197(0x159)][_0x31c197(0x187)],_0x1773b6=_0x2a19ae['console'][_0x31c197(0xb5)],_0x36cd62&&(_0x2a19ae[_0x31c197(0x159)][_0x31c197(0x187)]=function(){}),_0x1773b6&&(_0x2a19ae[_0x31c197(0x159)][_0x31c197(0xb5)]=function(){}));try{try{_0x10e703[_0x31c197(0x16d)]++,_0x10e703[_0x31c197(0x169)]&&_0x10e703[_0x31c197(0xf1)]['push'](_0x3fb199);var _0x25e0f3,_0x4eb4e8,_0x18d4fe,_0x37ccc9,_0x30d81d=[],_0x56445b=[],_0x302c18,_0x5830a7=this[_0x31c197(0x15a)](_0x3fb199),_0x2a7b73=_0x5830a7===_0x31c197(0x111),_0x8efbaa=!0x1,_0x5670c1=_0x5830a7===_0x31c197(0x15c),_0x2c17b4=this['_isPrimitiveType'](_0x5830a7),_0xb70796=this['_isPrimitiveWrapperType'](_0x5830a7),_0x3c20b2=_0x2c17b4||_0xb70796,_0x36f42e={},_0x552b6b=0x0,_0x22e716=!0x1,_0x16f50a,_0x1394aa=/^(([1-9]{1}[0-9]*)|0)$/;if(_0x10e703[_0x31c197(0x198)]){if(_0x2a7b73){if(_0x4eb4e8=_0x3fb199[_0x31c197(0x10d)],_0x4eb4e8>_0x10e703[_0x31c197(0x163)]){for(_0x18d4fe=0x0,_0x37ccc9=_0x10e703[_0x31c197(0x163)],_0x25e0f3=_0x18d4fe;_0x25e0f3<_0x37ccc9;_0x25e0f3++)_0x56445b[_0x31c197(0x175)](_0x5c7575[_0x31c197(0x14c)](_0x30d81d,_0x3fb199,_0x5830a7,_0x25e0f3,_0x10e703));_0x40d313[_0x31c197(0x167)]=!0x0;}else{for(_0x18d4fe=0x0,_0x37ccc9=_0x4eb4e8,_0x25e0f3=_0x18d4fe;_0x25e0f3<_0x37ccc9;_0x25e0f3++)_0x56445b[_0x31c197(0x175)](_0x5c7575[_0x31c197(0x14c)](_0x30d81d,_0x3fb199,_0x5830a7,_0x25e0f3,_0x10e703));}_0x10e703[_0x31c197(0x146)]+=_0x56445b[_0x31c197(0x10d)];}if(!(_0x5830a7==='null'||_0x5830a7==='undefined')&&!_0x2c17b4&&_0x5830a7!==_0x31c197(0x153)&&_0x5830a7!==_0x31c197(0x9e)&&_0x5830a7!==_0x31c197(0x11a)){var _0x718615=_0x3e651e[_0x31c197(0x17d)]||_0x10e703[_0x31c197(0x17d)];if(this[_0x31c197(0xe4)](_0x3fb199)?(_0x25e0f3=0x0,_0x3fb199[_0x31c197(0x180)](function(_0x5367ff){var _0x157c73=_0x31c197;if(_0x552b6b++,_0x10e703[_0x157c73(0x146)]++,_0x552b6b>_0x718615){_0x22e716=!0x0;return;}if(!_0x10e703[_0x157c73(0xeb)]&&_0x10e703[_0x157c73(0x169)]&&_0x10e703[_0x157c73(0x146)]>_0x10e703['autoExpandLimit']){_0x22e716=!0x0;return;}_0x56445b[_0x157c73(0x175)](_0x5c7575['_addProperty'](_0x30d81d,_0x3fb199,_0x157c73(0x11d),_0x25e0f3++,_0x10e703,function(_0x4b87c0){return function(){return _0x4b87c0;};}(_0x5367ff)));})):this['_isMap'](_0x3fb199)&&_0x3fb199['forEach'](function(_0x4f6586,_0x1127ce){var _0x1f1731=_0x31c197;if(_0x552b6b++,_0x10e703[_0x1f1731(0x146)]++,_0x552b6b>_0x718615){_0x22e716=!0x0;return;}if(!_0x10e703['isExpressionToEvaluate']&&_0x10e703[_0x1f1731(0x169)]&&_0x10e703[_0x1f1731(0x146)]>_0x10e703['autoExpandLimit']){_0x22e716=!0x0;return;}var _0x5c22c1=_0x1127ce[_0x1f1731(0x11b)]();_0x5c22c1[_0x1f1731(0x10d)]>0x64&&(_0x5c22c1=_0x5c22c1[_0x1f1731(0x123)](0x0,0x64)+_0x1f1731(0xb6)),_0x56445b[_0x1f1731(0x175)](_0x5c7575[_0x1f1731(0x14c)](_0x30d81d,_0x3fb199,'Map',_0x5c22c1,_0x10e703,function(_0x310ba3){return function(){return _0x310ba3;};}(_0x4f6586)));}),!_0x8efbaa){try{for(_0x302c18 in _0x3fb199)if(!(_0x2a7b73&&_0x1394aa[_0x31c197(0x158)](_0x302c18))&&!this[_0x31c197(0xf4)](_0x3fb199,_0x302c18,_0x10e703)){if(_0x552b6b++,_0x10e703[_0x31c197(0x146)]++,_0x552b6b>_0x718615){_0x22e716=!0x0;break;}if(!_0x10e703[_0x31c197(0xeb)]&&_0x10e703['autoExpand']&&_0x10e703[_0x31c197(0x146)]>_0x10e703[_0x31c197(0x194)]){_0x22e716=!0x0;break;}_0x56445b['push'](_0x5c7575['_addObjectProperty'](_0x30d81d,_0x36f42e,_0x3fb199,_0x5830a7,_0x302c18,_0x10e703));}}catch{}if(_0x36f42e[_0x31c197(0x119)]=!0x0,_0x5670c1&&(_0x36f42e[_0x31c197(0x197)]=!0x0),!_0x22e716){var _0xf18844=[]['concat'](this[_0x31c197(0x100)](_0x3fb199))['concat'](this[_0x31c197(0x152)](_0x3fb199));for(_0x25e0f3=0x0,_0x4eb4e8=_0xf18844[_0x31c197(0x10d)];_0x25e0f3<_0x4eb4e8;_0x25e0f3++)if(_0x302c18=_0xf18844[_0x25e0f3],!(_0x2a7b73&&_0x1394aa[_0x31c197(0x158)](_0x302c18['toString']()))&&!this[_0x31c197(0xf4)](_0x3fb199,_0x302c18,_0x10e703)&&!_0x36f42e[typeof _0x302c18!=_0x31c197(0x184)?_0x31c197(0xca)+_0x302c18[_0x31c197(0x11b)]():_0x302c18]){if(_0x552b6b++,_0x10e703[_0x31c197(0x146)]++,_0x552b6b>_0x718615){_0x22e716=!0x0;break;}if(!_0x10e703[_0x31c197(0xeb)]&&_0x10e703['autoExpand']&&_0x10e703[_0x31c197(0x146)]>_0x10e703['autoExpandLimit']){_0x22e716=!0x0;break;}_0x56445b['push'](_0x5c7575[_0x31c197(0xde)](_0x30d81d,_0x36f42e,_0x3fb199,_0x5830a7,_0x302c18,_0x10e703));}}}}}if(_0x40d313[_0x31c197(0x99)]=_0x5830a7,_0x3c20b2?(_0x40d313['value']=_0x3fb199[_0x31c197(0xa7)](),this[_0x31c197(0x128)](_0x5830a7,_0x40d313,_0x10e703,_0x3e651e)):_0x5830a7===_0x31c197(0x107)?_0x40d313[_0x31c197(0xcc)]=this['_dateToString'][_0x31c197(0xb9)](_0x3fb199):_0x5830a7===_0x31c197(0x11a)?_0x40d313[_0x31c197(0xcc)]=_0x3fb199[_0x31c197(0x11b)]():_0x5830a7==='RegExp'?_0x40d313['value']=this[_0x31c197(0x19c)][_0x31c197(0xb9)](_0x3fb199):_0x5830a7===_0x31c197(0x184)&&this[_0x31c197(0x178)]?_0x40d313[_0x31c197(0xcc)]=this[_0x31c197(0x178)][_0x31c197(0x172)][_0x31c197(0x11b)]['call'](_0x3fb199):!_0x10e703[_0x31c197(0x198)]&&!(_0x5830a7===_0x31c197(0x18e)||_0x5830a7===_0x31c197(0x13d))&&(delete _0x40d313[_0x31c197(0xcc)],_0x40d313['capped']=!0x0),_0x22e716&&(_0x40d313[_0x31c197(0xc8)]=!0x0),_0x16f50a=_0x10e703[_0x31c197(0x14e)]['current'],_0x10e703[_0x31c197(0x14e)][_0x31c197(0x191)]=_0x40d313,this['_treeNodePropertiesBeforeFullValue'](_0x40d313,_0x10e703),_0x56445b['length']){for(_0x25e0f3=0x0,_0x4eb4e8=_0x56445b[_0x31c197(0x10d)];_0x25e0f3<_0x4eb4e8;_0x25e0f3++)_0x56445b[_0x25e0f3](_0x25e0f3);}_0x30d81d[_0x31c197(0x10d)]&&(_0x40d313['props']=_0x30d81d);}catch(_0x48a3c4){_0x7ee627(_0x48a3c4,_0x40d313,_0x10e703);}this['_additionalMetadata'](_0x3fb199,_0x40d313),this[_0x31c197(0xdc)](_0x40d313,_0x10e703),_0x10e703[_0x31c197(0x14e)]['current']=_0x16f50a,_0x10e703[_0x31c197(0x16d)]--,_0x10e703[_0x31c197(0x169)]=_0xb95b67,_0x10e703[_0x31c197(0x169)]&&_0x10e703['autoExpandPreviousObjects']['pop']();}finally{_0x36cd62&&(_0x2a19ae[_0x31c197(0x159)][_0x31c197(0x187)]=_0x36cd62),_0x1773b6&&(_0x2a19ae['console']['warn']=_0x1773b6),_0x2a19ae[_0x31c197(0xdd)]=_0x23751c;}return _0x40d313;},_0x3c842b['prototype'][_0x1bff5a(0x152)]=function(_0x5568c0){var _0x950ed8=_0x1bff5a;return Object[_0x950ed8(0xf2)]?Object[_0x950ed8(0xf2)](_0x5568c0):[];},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0xe4)]=function(_0x5cff31){var _0x5294c9=_0x1bff5a;return!!(_0x5cff31&&_0x2a19ae[_0x5294c9(0x11d)]&&this['_objectToString'](_0x5cff31)===_0x5294c9(0xb3)&&_0x5cff31[_0x5294c9(0x180)]);},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0xf4)]=function(_0x176394,_0x32608a,_0xd5d805){var _0x4c84a9=_0x1bff5a;if(!_0xd5d805['resolveGetters']){let _0x75bbab=this['_getOwnPropertyDescriptor'](_0x176394,_0x32608a);if(_0x75bbab&&_0x75bbab[_0x4c84a9(0x126)])return!0x0;}return _0xd5d805[_0x4c84a9(0x177)]?typeof _0x176394[_0x32608a]=='function':!0x1;},_0x3c842b['prototype'][_0x1bff5a(0x15a)]=function(_0x2dedf1){var _0x14c6b0=_0x1bff5a,_0x5f049e='';return _0x5f049e=typeof _0x2dedf1,_0x5f049e===_0x14c6b0(0x12d)?this[_0x14c6b0(0x127)](_0x2dedf1)===_0x14c6b0(0x19e)?_0x5f049e=_0x14c6b0(0x111):this[_0x14c6b0(0x127)](_0x2dedf1)===_0x14c6b0(0x170)?_0x5f049e=_0x14c6b0(0x107):this[_0x14c6b0(0x127)](_0x2dedf1)==='[object\\x20BigInt]'?_0x5f049e=_0x14c6b0(0x11a):_0x2dedf1===null?_0x5f049e=_0x14c6b0(0x18e):_0x2dedf1[_0x14c6b0(0x19d)]&&(_0x5f049e=_0x2dedf1[_0x14c6b0(0x19d)][_0x14c6b0(0xe5)]||_0x5f049e):_0x5f049e===_0x14c6b0(0x13d)&&this[_0x14c6b0(0x173)]&&_0x2dedf1 instanceof this[_0x14c6b0(0x173)]&&(_0x5f049e=_0x14c6b0(0x16f)),_0x5f049e;},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0x127)]=function(_0x26fd83){var _0x2cc9cb=_0x1bff5a;return Object[_0x2cc9cb(0x172)][_0x2cc9cb(0x11b)][_0x2cc9cb(0xb9)](_0x26fd83);},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0xd1)]=function(_0x33c047){var _0x1aed3d=_0x1bff5a;return _0x33c047===_0x1aed3d(0xe7)||_0x33c047===_0x1aed3d(0x13e)||_0x33c047===_0x1aed3d(0x113);},_0x3c842b['prototype'][_0x1bff5a(0x12b)]=function(_0x9c26bc){var _0x3445a7=_0x1bff5a;return _0x9c26bc===_0x3445a7(0xb7)||_0x9c26bc===_0x3445a7(0x153)||_0x9c26bc==='Number';},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0x14c)]=function(_0x39d72b,_0x222394,_0x39ca3a,_0x3315a9,_0x2af968,_0x5ca931){var _0x13303e=this;return function(_0x3b0a04){var _0xfd957=_0xa6b0,_0x1e9977=_0x2af968['node']['current'],_0x416967=_0x2af968['node']['index'],_0x278cad=_0x2af968[_0xfd957(0x14e)][_0xfd957(0x13f)];_0x2af968['node']['parent']=_0x1e9977,_0x2af968[_0xfd957(0x14e)][_0xfd957(0x17f)]=typeof _0x3315a9==_0xfd957(0x113)?_0x3315a9:_0x3b0a04,_0x39d72b[_0xfd957(0x175)](_0x13303e[_0xfd957(0x147)](_0x222394,_0x39ca3a,_0x3315a9,_0x2af968,_0x5ca931)),_0x2af968[_0xfd957(0x14e)]['parent']=_0x278cad,_0x2af968[_0xfd957(0x14e)][_0xfd957(0x17f)]=_0x416967;};},_0x3c842b['prototype'][_0x1bff5a(0xde)]=function(_0x1ac5b3,_0x4e5a09,_0x41a166,_0x5aef46,_0x28ffe1,_0xa4d180,_0xaf189c){var _0x416fff=_0x1bff5a,_0x5079ab=this;return _0x4e5a09[typeof _0x28ffe1!=_0x416fff(0x184)?_0x416fff(0xca)+_0x28ffe1[_0x416fff(0x11b)]():_0x28ffe1]=!0x0,function(_0x193c6b){var _0x8b0c8=_0x416fff,_0x4e890c=_0xa4d180[_0x8b0c8(0x14e)][_0x8b0c8(0x191)],_0x1de07b=_0xa4d180[_0x8b0c8(0x14e)]['index'],_0x4c6e05=_0xa4d180[_0x8b0c8(0x14e)][_0x8b0c8(0x13f)];_0xa4d180[_0x8b0c8(0x14e)][_0x8b0c8(0x13f)]=_0x4e890c,_0xa4d180['node']['index']=_0x193c6b,_0x1ac5b3['push'](_0x5079ab['_property'](_0x41a166,_0x5aef46,_0x28ffe1,_0xa4d180,_0xaf189c)),_0xa4d180['node']['parent']=_0x4c6e05,_0xa4d180[_0x8b0c8(0x14e)][_0x8b0c8(0x17f)]=_0x1de07b;};},_0x3c842b['prototype'][_0x1bff5a(0x147)]=function(_0x3fc911,_0x53af0b,_0x1daee9,_0x1aaecf,_0x3c6648){var _0x24ab9f=_0x1bff5a,_0x1044ef=this;_0x3c6648||(_0x3c6648=function(_0x5aebf0,_0xe2bf62){return _0x5aebf0[_0xe2bf62];});var _0x3ba706=_0x1daee9[_0x24ab9f(0x11b)](),_0x147ad8=_0x1aaecf[_0x24ab9f(0x14a)]||{},_0x564175=_0x1aaecf[_0x24ab9f(0x198)],_0x4c8e20=_0x1aaecf['isExpressionToEvaluate'];try{var _0xa14fb7=this[_0x24ab9f(0x106)](_0x3fc911),_0xf1a445=_0x3ba706;_0xa14fb7&&_0xf1a445[0x0]==='\\x27'&&(_0xf1a445=_0xf1a445[_0x24ab9f(0x157)](0x1,_0xf1a445[_0x24ab9f(0x10d)]-0x2));var _0x83dd31=_0x1aaecf[_0x24ab9f(0x14a)]=_0x147ad8[_0x24ab9f(0xca)+_0xf1a445];_0x83dd31&&(_0x1aaecf[_0x24ab9f(0x198)]=_0x1aaecf[_0x24ab9f(0x198)]+0x1),_0x1aaecf['isExpressionToEvaluate']=!!_0x83dd31;var _0x1718af=typeof _0x1daee9==_0x24ab9f(0x184),_0x3e3cf6={'name':_0x1718af||_0xa14fb7?_0x3ba706:this[_0x24ab9f(0x154)](_0x3ba706)};if(_0x1718af&&(_0x3e3cf6[_0x24ab9f(0x184)]=!0x0),!(_0x53af0b===_0x24ab9f(0x111)||_0x53af0b==='Error')){var _0x270121=this[_0x24ab9f(0x15b)](_0x3fc911,_0x1daee9);if(_0x270121&&(_0x270121['set']&&(_0x3e3cf6[_0x24ab9f(0xfd)]=!0x0),_0x270121['get']&&!_0x83dd31&&!_0x1aaecf[_0x24ab9f(0x102)]))return _0x3e3cf6['getter']=!0x0,this['_processTreeNodeResult'](_0x3e3cf6,_0x1aaecf),_0x3e3cf6;}var _0x75d602;try{_0x75d602=_0x3c6648(_0x3fc911,_0x1daee9);}catch(_0x13aa60){return _0x3e3cf6={'name':_0x3ba706,'type':_0x24ab9f(0x114),'error':_0x13aa60[_0x24ab9f(0xfb)]},this['_processTreeNodeResult'](_0x3e3cf6,_0x1aaecf),_0x3e3cf6;}var _0x74802c=this['_type'](_0x75d602),_0x3e9d1f=this['_isPrimitiveType'](_0x74802c);if(_0x3e3cf6[_0x24ab9f(0x99)]=_0x74802c,_0x3e9d1f)this[_0x24ab9f(0x115)](_0x3e3cf6,_0x1aaecf,_0x75d602,function(){var _0x58307e=_0x24ab9f;_0x3e3cf6[_0x58307e(0xcc)]=_0x75d602['valueOf'](),!_0x83dd31&&_0x1044ef[_0x58307e(0x128)](_0x74802c,_0x3e3cf6,_0x1aaecf,{});});else{var _0xf56525=_0x1aaecf['autoExpand']&&_0x1aaecf[_0x24ab9f(0x16d)]<_0x1aaecf[_0x24ab9f(0xc0)]&&_0x1aaecf['autoExpandPreviousObjects']['indexOf'](_0x75d602)<0x0&&_0x74802c!==_0x24ab9f(0x15c)&&_0x1aaecf[_0x24ab9f(0x146)]<_0x1aaecf['autoExpandLimit'];_0xf56525||_0x1aaecf['level']<_0x564175||_0x83dd31?this[_0x24ab9f(0x16a)](_0x3e3cf6,_0x75d602,_0x1aaecf,_0x83dd31||{}):this[_0x24ab9f(0x115)](_0x3e3cf6,_0x1aaecf,_0x75d602,function(){var _0x393a95=_0x24ab9f;_0x74802c===_0x393a95(0x18e)||_0x74802c===_0x393a95(0x13d)||(delete _0x3e3cf6[_0x393a95(0xcc)],_0x3e3cf6[_0x393a95(0x12e)]=!0x0);});}return _0x3e3cf6;}finally{_0x1aaecf[_0x24ab9f(0x14a)]=_0x147ad8,_0x1aaecf['depth']=_0x564175,_0x1aaecf[_0x24ab9f(0xeb)]=_0x4c8e20;}},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0x128)]=function(_0x56d3fe,_0x3888bc,_0x5eecce,_0x4702b6){var _0x2683b4=_0x1bff5a,_0x25341f=_0x4702b6[_0x2683b4(0xad)]||_0x5eecce[_0x2683b4(0xad)];if((_0x56d3fe==='string'||_0x56d3fe===_0x2683b4(0x153))&&_0x3888bc[_0x2683b4(0xcc)]){let _0x49128b=_0x3888bc[_0x2683b4(0xcc)][_0x2683b4(0x10d)];_0x5eecce[_0x2683b4(0x161)]+=_0x49128b,_0x5eecce[_0x2683b4(0x161)]>_0x5eecce[_0x2683b4(0xda)]?(_0x3888bc[_0x2683b4(0x12e)]='',delete _0x3888bc[_0x2683b4(0xcc)]):_0x49128b>_0x25341f&&(_0x3888bc['capped']=_0x3888bc['value'][_0x2683b4(0x157)](0x0,_0x25341f),delete _0x3888bc[_0x2683b4(0xcc)]);}},_0x3c842b[_0x1bff5a(0x172)]['_isMap']=function(_0x23ed93){var _0x32ae70=_0x1bff5a;return!!(_0x23ed93&&_0x2a19ae[_0x32ae70(0x193)]&&this[_0x32ae70(0x127)](_0x23ed93)===_0x32ae70(0x117)&&_0x23ed93[_0x32ae70(0x180)]);},_0x3c842b['prototype'][_0x1bff5a(0x154)]=function(_0x539e6b){var _0x3e9eb6=_0x1bff5a;if(_0x539e6b['match'](/^\\d+$/))return _0x539e6b;var _0x268203;try{_0x268203=JSON[_0x3e9eb6(0xa8)](''+_0x539e6b);}catch{_0x268203='\\x22'+this['_objectToString'](_0x539e6b)+'\\x22';}return _0x268203[_0x3e9eb6(0x149)](/^\"([a-zA-Z_][a-zA-Z_0-9]*)\"$/)?_0x268203=_0x268203['substr'](0x1,_0x268203[_0x3e9eb6(0x10d)]-0x2):_0x268203=_0x268203['replace'](/'/g,'\\x5c\\x27')[_0x3e9eb6(0x11e)](/\\\\\"/g,'\\x22')[_0x3e9eb6(0x11e)](/(^\"|\"$)/g,'\\x27'),_0x268203;},_0x3c842b['prototype'][_0x1bff5a(0x115)]=function(_0x1b22e6,_0x139c74,_0x26c1fb,_0x18f60b){var _0x59810d=_0x1bff5a;this[_0x59810d(0x124)](_0x1b22e6,_0x139c74),_0x18f60b&&_0x18f60b(),this[_0x59810d(0x13c)](_0x26c1fb,_0x1b22e6),this[_0x59810d(0xdc)](_0x1b22e6,_0x139c74);},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0x124)]=function(_0x3de57f,_0x633f7e){var _0x3b15c7=_0x1bff5a;this[_0x3b15c7(0x120)](_0x3de57f,_0x633f7e),this['_setNodeQueryPath'](_0x3de57f,_0x633f7e),this[_0x3b15c7(0xaa)](_0x3de57f,_0x633f7e),this[_0x3b15c7(0x140)](_0x3de57f,_0x633f7e);},_0x3c842b['prototype'][_0x1bff5a(0x120)]=function(_0x212392,_0x5350c2){},_0x3c842b['prototype'][_0x1bff5a(0x15e)]=function(_0x254f19,_0xb65cfa){},_0x3c842b[_0x1bff5a(0x172)]['_setNodeLabel']=function(_0x5174e1,_0x4a4537){},_0x3c842b[_0x1bff5a(0x172)]['_isUndefined']=function(_0x4b9a4e){var _0x29d539=_0x1bff5a;return _0x4b9a4e===this[_0x29d539(0x9a)];},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0xdc)]=function(_0x112fbe,_0xc2b2f8){var _0x13069a=_0x1bff5a;this[_0x13069a(0x122)](_0x112fbe,_0xc2b2f8),this[_0x13069a(0x118)](_0x112fbe),_0xc2b2f8[_0x13069a(0x168)]&&this[_0x13069a(0xcd)](_0x112fbe),this[_0x13069a(0x1a3)](_0x112fbe,_0xc2b2f8),this['_addLoadNode'](_0x112fbe,_0xc2b2f8),this['_cleanNode'](_0x112fbe);},_0x3c842b[_0x1bff5a(0x172)]['_additionalMetadata']=function(_0x480177,_0x5bf51c){var _0x36c251=_0x1bff5a;try{_0x480177&&typeof _0x480177[_0x36c251(0x10d)]==_0x36c251(0x113)&&(_0x5bf51c[_0x36c251(0x10d)]=_0x480177[_0x36c251(0x10d)]);}catch{}if(_0x5bf51c[_0x36c251(0x99)]===_0x36c251(0x113)||_0x5bf51c[_0x36c251(0x99)]==='Number'){if(isNaN(_0x5bf51c[_0x36c251(0xcc)]))_0x5bf51c[_0x36c251(0xf7)]=!0x0,delete _0x5bf51c[_0x36c251(0xcc)];else switch(_0x5bf51c['value']){case Number['POSITIVE_INFINITY']:_0x5bf51c['positiveInfinity']=!0x0,delete _0x5bf51c[_0x36c251(0xcc)];break;case Number[_0x36c251(0x18d)]:_0x5bf51c[_0x36c251(0x109)]=!0x0,delete _0x5bf51c[_0x36c251(0xcc)];break;case 0x0:this[_0x36c251(0xef)](_0x5bf51c[_0x36c251(0xcc)])&&(_0x5bf51c[_0x36c251(0xbb)]=!0x0);break;}}else _0x5bf51c[_0x36c251(0x99)]===_0x36c251(0x15c)&&typeof _0x480177[_0x36c251(0xe5)]==_0x36c251(0x13e)&&_0x480177[_0x36c251(0xe5)]&&_0x5bf51c[_0x36c251(0xe5)]&&_0x480177['name']!==_0x5bf51c[_0x36c251(0xe5)]&&(_0x5bf51c[_0x36c251(0xb8)]=_0x480177['name']);},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0xef)]=function(_0x5f59c6){var _0x3d7094=_0x1bff5a;return 0x1/_0x5f59c6===Number[_0x3d7094(0x18d)];},_0x3c842b[_0x1bff5a(0x172)]['_sortProps']=function(_0x341845){var _0xf1b50d=_0x1bff5a;!_0x341845['props']||!_0x341845[_0xf1b50d(0x17d)][_0xf1b50d(0x10d)]||_0x341845[_0xf1b50d(0x99)]===_0xf1b50d(0x111)||_0x341845['type']===_0xf1b50d(0x193)||_0x341845[_0xf1b50d(0x99)]===_0xf1b50d(0x11d)||_0x341845[_0xf1b50d(0x17d)]['sort'](function(_0x18e25d,_0x2e5ca7){var _0x5d8ea4=_0xf1b50d,_0x2086c0=_0x18e25d[_0x5d8ea4(0xe5)]['toLowerCase'](),_0x11bbd3=_0x2e5ca7[_0x5d8ea4(0xe5)]['toLowerCase']();return _0x2086c0<_0x11bbd3?-0x1:_0x2086c0>_0x11bbd3?0x1:0x0;});},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0x1a3)]=function(_0x54949b,_0x4cb346){var _0x5e9777=_0x1bff5a;if(!(_0x4cb346[_0x5e9777(0x177)]||!_0x54949b[_0x5e9777(0x17d)]||!_0x54949b['props'][_0x5e9777(0x10d)])){for(var _0x4f6972=[],_0x78d8a8=[],_0x20bd98=0x0,_0x5628f1=_0x54949b['props'][_0x5e9777(0x10d)];_0x20bd98<_0x5628f1;_0x20bd98++){var _0x5c1147=_0x54949b[_0x5e9777(0x17d)][_0x20bd98];_0x5c1147[_0x5e9777(0x99)]===_0x5e9777(0x15c)?_0x4f6972[_0x5e9777(0x175)](_0x5c1147):_0x78d8a8[_0x5e9777(0x175)](_0x5c1147);}if(!(!_0x78d8a8['length']||_0x4f6972[_0x5e9777(0x10d)]<=0x1)){_0x54949b[_0x5e9777(0x17d)]=_0x78d8a8;var _0x1ffed3={'functionsNode':!0x0,'props':_0x4f6972};this[_0x5e9777(0x120)](_0x1ffed3,_0x4cb346),this[_0x5e9777(0x122)](_0x1ffed3,_0x4cb346),this[_0x5e9777(0x118)](_0x1ffed3),this['_setNodePermissions'](_0x1ffed3,_0x4cb346),_0x1ffed3['id']+='\\x20f',_0x54949b[_0x5e9777(0x17d)]['unshift'](_0x1ffed3);}}},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0x10f)]=function(_0x3e2ffa,_0x7cf6a2){},_0x3c842b['prototype'][_0x1bff5a(0x118)]=function(_0x25a8d7){},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0xf3)]=function(_0x1726d6){var _0x4469e7=_0x1bff5a;return Array[_0x4469e7(0x9b)](_0x1726d6)||typeof _0x1726d6==_0x4469e7(0x12d)&&this[_0x4469e7(0x127)](_0x1726d6)===_0x4469e7(0x19e);},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0x140)]=function(_0x4c1d3c,_0x349781){},_0x3c842b['prototype']['_cleanNode']=function(_0x4d21c1){var _0xd58577=_0x1bff5a;delete _0x4d21c1[_0xd58577(0xf5)],delete _0x4d21c1[_0xd58577(0x144)],delete _0x4d21c1[_0xd58577(0x110)];},_0x3c842b[_0x1bff5a(0x172)][_0x1bff5a(0xaa)]=function(_0x43e4e6,_0x3cf6da){};let _0x22e9d1=new _0x3c842b(),_0x31d042={'props':_0x483b0f[_0x1bff5a(0x16e)][_0x1bff5a(0x17d)]||0x64,'elements':_0x483b0f[_0x1bff5a(0x16e)][_0x1bff5a(0x163)]||0x64,'strLength':_0x483b0f[_0x1bff5a(0x16e)][_0x1bff5a(0xad)]||0x400*0x32,'totalStrLength':_0x483b0f['defaultLimits'][_0x1bff5a(0xda)]||0x400*0x32,'autoExpandLimit':_0x483b0f[_0x1bff5a(0x16e)][_0x1bff5a(0x194)]||0x1388,'autoExpandMaxDepth':_0x483b0f['defaultLimits'][_0x1bff5a(0xc0)]||0xa},_0x5134cc={'props':_0x483b0f[_0x1bff5a(0xbf)][_0x1bff5a(0x17d)]||0x5,'elements':_0x483b0f[_0x1bff5a(0xbf)][_0x1bff5a(0x163)]||0x5,'strLength':_0x483b0f[_0x1bff5a(0xbf)][_0x1bff5a(0xad)]||0x100,'totalStrLength':_0x483b0f['reducedLimits'][_0x1bff5a(0xda)]||0x100*0x3,'autoExpandLimit':_0x483b0f[_0x1bff5a(0xbf)][_0x1bff5a(0x194)]||0x1e,'autoExpandMaxDepth':_0x483b0f[_0x1bff5a(0xbf)]['autoExpandMaxDepth']||0x2};if(_0x599cd8){let _0x10c22a=_0x22e9d1[_0x1bff5a(0x16a)][_0x1bff5a(0x18c)](_0x22e9d1);_0x22e9d1[_0x1bff5a(0x16a)]=function(_0x63dc8a,_0xf87bc8,_0xed8b,_0x3030e4){return _0x10c22a(_0x63dc8a,_0x599cd8(_0xf87bc8),_0xed8b,_0x3030e4);};}function _0x36e6e0(_0x4b7ae2,_0x7448e6,_0x1e6871,_0x13e959,_0x54bcfa,_0x5e46fe){var _0x55e03f=_0x1bff5a;let _0x581fa4,_0x572fc2;try{_0x572fc2=_0x32f0dd(),_0x581fa4=_0x7f88c9[_0x7448e6],!_0x581fa4||_0x572fc2-_0x581fa4['ts']>_0x15035d['perLogpoint'][_0x55e03f(0xa9)]&&_0x581fa4['count']&&_0x581fa4[_0x55e03f(0x137)]/_0x581fa4[_0x55e03f(0xd3)]<_0x15035d['perLogpoint']['resetOnProcessingTimeAverageMs']?(_0x7f88c9[_0x7448e6]=_0x581fa4={'count':0x0,'time':0x0,'ts':_0x572fc2},_0x7f88c9[_0x55e03f(0x10c)]={}):_0x572fc2-_0x7f88c9[_0x55e03f(0x10c)]['ts']>_0x15035d[_0x55e03f(0xe6)][_0x55e03f(0xa9)]&&_0x7f88c9[_0x55e03f(0x10c)][_0x55e03f(0xd3)]&&_0x7f88c9[_0x55e03f(0x10c)][_0x55e03f(0x137)]/_0x7f88c9[_0x55e03f(0x10c)]['count']<_0x15035d[_0x55e03f(0xe6)][_0x55e03f(0x1a5)]&&(_0x7f88c9[_0x55e03f(0x10c)]={});let _0x592aa0=[],_0x201cd8=_0x581fa4['reduceLimits']||_0x7f88c9[_0x55e03f(0x10c)][_0x55e03f(0xbc)]?_0x5134cc:_0x31d042,_0x1c3b41=_0x440706=>{var _0x380ff0=_0x55e03f;let _0x2fbc49={};return _0x2fbc49['props']=_0x440706['props'],_0x2fbc49['elements']=_0x440706[_0x380ff0(0x163)],_0x2fbc49['strLength']=_0x440706['strLength'],_0x2fbc49[_0x380ff0(0xda)]=_0x440706[_0x380ff0(0xda)],_0x2fbc49[_0x380ff0(0x194)]=_0x440706[_0x380ff0(0x194)],_0x2fbc49[_0x380ff0(0xc0)]=_0x440706[_0x380ff0(0xc0)],_0x2fbc49[_0x380ff0(0x168)]=!0x1,_0x2fbc49[_0x380ff0(0x177)]=!_0x447b71,_0x2fbc49[_0x380ff0(0x198)]=0x1,_0x2fbc49['level']=0x0,_0x2fbc49[_0x380ff0(0xfa)]=_0x380ff0(0xae),_0x2fbc49['rootExpression']=_0x380ff0(0x104),_0x2fbc49[_0x380ff0(0x169)]=!0x0,_0x2fbc49[_0x380ff0(0xf1)]=[],_0x2fbc49['autoExpandPropertyCount']=0x0,_0x2fbc49[_0x380ff0(0x102)]=_0x483b0f[_0x380ff0(0x102)],_0x2fbc49[_0x380ff0(0x161)]=0x0,_0x2fbc49[_0x380ff0(0x14e)]={'current':void 0x0,'parent':void 0x0,'index':0x0},_0x2fbc49;};for(var _0x34cb46=0x0;_0x34cb46<_0x54bcfa['length'];_0x34cb46++)_0x592aa0[_0x55e03f(0x175)](_0x22e9d1[_0x55e03f(0x16a)]({'timeNode':_0x4b7ae2==='time'||void 0x0},_0x54bcfa[_0x34cb46],_0x1c3b41(_0x201cd8),{}));if(_0x4b7ae2==='trace'||_0x4b7ae2===_0x55e03f(0x187)){let _0x38f028=Error['stackTraceLimit'];try{Error['stackTraceLimit']=0x1/0x0,_0x592aa0[_0x55e03f(0x175)](_0x22e9d1[_0x55e03f(0x16a)]({'stackNode':!0x0},new Error()['stack'],_0x1c3b41(_0x201cd8),{'strLength':0x1/0x0}));}finally{Error['stackTraceLimit']=_0x38f028;}}return{'method':_0x55e03f(0x17a),'version':_0x5161a5,'args':[{'ts':_0x1e6871,'session':_0x13e959,'args':_0x592aa0,'id':_0x7448e6,'context':_0x5e46fe}]};}catch(_0x38023d){return{'method':_0x55e03f(0x17a),'version':_0x5161a5,'args':[{'ts':_0x1e6871,'session':_0x13e959,'args':[{'type':_0x55e03f(0x114),'error':_0x38023d&&_0x38023d['message']}],'id':_0x7448e6,'context':_0x5e46fe}]};}finally{try{if(_0x581fa4&&_0x572fc2){let _0x4a1dc5=_0x32f0dd();_0x581fa4['count']++,_0x581fa4['time']+=_0x49b596(_0x572fc2,_0x4a1dc5),_0x581fa4['ts']=_0x4a1dc5,_0x7f88c9['hits'][_0x55e03f(0xd3)]++,_0x7f88c9['hits'][_0x55e03f(0x137)]+=_0x49b596(_0x572fc2,_0x4a1dc5),_0x7f88c9[_0x55e03f(0x10c)]['ts']=_0x4a1dc5,(_0x581fa4[_0x55e03f(0xd3)]>_0x15035d['perLogpoint'][_0x55e03f(0x138)]||_0x581fa4['time']>_0x15035d['perLogpoint'][_0x55e03f(0x148)])&&(_0x581fa4['reduceLimits']=!0x0),(_0x7f88c9[_0x55e03f(0x10c)][_0x55e03f(0xd3)]>_0x15035d[_0x55e03f(0xe6)]['reduceOnCount']||_0x7f88c9[_0x55e03f(0x10c)][_0x55e03f(0x137)]>_0x15035d['global'][_0x55e03f(0x148)])&&(_0x7f88c9['hits'][_0x55e03f(0xbc)]=!0x0);}}catch{}}}return _0x36e6e0;}function G(_0x4bcced){var _0x3ca5c0=_0x1c43af;if(_0x4bcced&&typeof _0x4bcced==_0x3ca5c0(0x12d)&&_0x4bcced[_0x3ca5c0(0x19d)])switch(_0x4bcced[_0x3ca5c0(0x19d)][_0x3ca5c0(0xe5)]){case _0x3ca5c0(0xb0):return _0x4bcced[_0x3ca5c0(0xfc)](Symbol[_0x3ca5c0(0x189)])?Promise[_0x3ca5c0(0x18b)]():_0x4bcced;case _0x3ca5c0(0x19b):return Promise['resolve']();}return _0x4bcced;}((_0x48d785,_0x3c846c,_0x54e7b9,_0x233cc4,_0x4d1fbe,_0x5efe0f,_0xeb603e,_0x2e7e15,_0x351bad,_0x341637,_0x3428c5,_0x343bd6)=>{var _0x1125dc=_0x1c43af;if(_0x48d785[_0x1125dc(0xec)])return _0x48d785['_console_ninja'];let _0x3cd4f6={'consoleLog':()=>{},'consoleTrace':()=>{},'consoleTime':()=>{},'consoleTimeEnd':()=>{},'autoLog':()=>{},'autoLogMany':()=>{},'autoTraceMany':()=>{},'coverage':()=>{},'autoTrace':()=>{},'autoTime':()=>{},'autoTimeEnd':()=>{}};if(!X(_0x48d785,_0x2e7e15,_0x4d1fbe))return _0x48d785[_0x1125dc(0xec)]=_0x3cd4f6,_0x48d785[_0x1125dc(0xec)];let _0xaf0d67=b(_0x48d785),_0x281f2e=_0xaf0d67[_0x1125dc(0xb4)],_0xae8681=_0xaf0d67[_0x1125dc(0xfe)],_0x4e0fc5=_0xaf0d67['now'],_0xa2e8a7={'hits':{},'ts':{}},_0x91e1f5=J(_0x48d785,_0x351bad,_0xa2e8a7,_0x5efe0f,_0x343bd6,_0x4d1fbe===_0x1125dc(0x179)?G:void 0x0),_0x536854=(_0x530578,_0x31dfad,_0x4c757a,_0x143a26,_0x88e3a8,_0x4bf8d3)=>{var _0x348500=_0x1125dc;let _0x3306b6=_0x48d785['_console_ninja'];try{return _0x48d785[_0x348500(0xec)]=_0x3cd4f6,_0x91e1f5(_0x530578,_0x31dfad,_0x4c757a,_0x143a26,_0x88e3a8,_0x4bf8d3);}finally{_0x48d785[_0x348500(0xec)]=_0x3306b6;}},_0x11e42f=_0x3660d4=>{_0xa2e8a7['ts'][_0x3660d4]=_0xae8681();},_0x308a38=(_0x227f0b,_0x4baf5a)=>{var _0x286c56=_0x1125dc;let _0x459036=_0xa2e8a7['ts'][_0x4baf5a];if(delete _0xa2e8a7['ts'][_0x4baf5a],_0x459036){let _0xaca72e=_0x281f2e(_0x459036,_0xae8681());_0x223f4e(_0x536854(_0x286c56(0x137),_0x227f0b,_0x4e0fc5(),_0x3b9616,[_0xaca72e],_0x4baf5a));}},_0x11c122=_0x2d5a87=>{var _0x28fe2c=_0x1125dc,_0x1c2128;return _0x4d1fbe===_0x28fe2c(0x179)&&_0x48d785[_0x28fe2c(0xa3)]&&((_0x1c2128=_0x2d5a87==null?void 0x0:_0x2d5a87[_0x28fe2c(0x1a4)])==null?void 0x0:_0x1c2128[_0x28fe2c(0x10d)])&&(_0x2d5a87[_0x28fe2c(0x1a4)][0x0][_0x28fe2c(0xa3)]=_0x48d785['origin']),_0x2d5a87;};_0x48d785['_console_ninja']={'consoleLog':(_0x535a72,_0x3d708e)=>{var _0xee4f6a=_0x1125dc;_0x48d785['console'][_0xee4f6a(0x17a)][_0xee4f6a(0xe5)]!==_0xee4f6a(0xd2)&&_0x223f4e(_0x536854(_0xee4f6a(0x17a),_0x535a72,_0x4e0fc5(),_0x3b9616,_0x3d708e));},'consoleTrace':(_0x3cb025,_0x49aa51)=>{var _0x2f4b5c=_0x1125dc,_0x4599c8,_0x3c6c91;_0x48d785[_0x2f4b5c(0x159)][_0x2f4b5c(0x17a)][_0x2f4b5c(0xe5)]!==_0x2f4b5c(0x133)&&((_0x3c6c91=(_0x4599c8=_0x48d785[_0x2f4b5c(0xc5)])==null?void 0x0:_0x4599c8[_0x2f4b5c(0xe0)])!=null&&_0x3c6c91[_0x2f4b5c(0x14e)]&&(_0x48d785['_ninjaIgnoreNextError']=!0x0),_0x223f4e(_0x11c122(_0x536854(_0x2f4b5c(0x181),_0x3cb025,_0x4e0fc5(),_0x3b9616,_0x49aa51))));},'consoleError':(_0x1bcfbb,_0x5dfcc2)=>{var _0x5127a8=_0x1125dc;_0x48d785[_0x5127a8(0x121)]=!0x0,_0x223f4e(_0x11c122(_0x536854(_0x5127a8(0x187),_0x1bcfbb,_0x4e0fc5(),_0x3b9616,_0x5dfcc2)));},'consoleTime':_0x1240c5=>{_0x11e42f(_0x1240c5);},'consoleTimeEnd':(_0x45b15f,_0xedf120)=>{_0x308a38(_0xedf120,_0x45b15f);},'autoLog':(_0x476380,_0x430396)=>{var _0x381ac9=_0x1125dc;_0x223f4e(_0x536854(_0x381ac9(0x17a),_0x430396,_0x4e0fc5(),_0x3b9616,[_0x476380]));},'autoLogMany':(_0x496baf,_0x2de83e)=>{_0x223f4e(_0x536854('log',_0x496baf,_0x4e0fc5(),_0x3b9616,_0x2de83e));},'autoTrace':(_0x580506,_0xdd93fb)=>{var _0x545a58=_0x1125dc;_0x223f4e(_0x11c122(_0x536854(_0x545a58(0x181),_0xdd93fb,_0x4e0fc5(),_0x3b9616,[_0x580506])));},'autoTraceMany':(_0x35b68e,_0x1bf390)=>{var _0x53bd89=_0x1125dc;_0x223f4e(_0x11c122(_0x536854(_0x53bd89(0x181),_0x35b68e,_0x4e0fc5(),_0x3b9616,_0x1bf390)));},'autoTime':(_0x1f9f08,_0x36b878,_0x2bba7b)=>{_0x11e42f(_0x2bba7b);},'autoTimeEnd':(_0x5b5318,_0x42dbfa,_0x2fdc68)=>{_0x308a38(_0x42dbfa,_0x2fdc68);},'coverage':_0x3c7d3b=>{var _0x2e75e3=_0x1125dc;_0x223f4e({'method':_0x2e75e3(0x1a1),'version':_0x5efe0f,'args':[{'id':_0x3c7d3b}]});}};let _0x223f4e=H(_0x48d785,_0x3c846c,_0x54e7b9,_0x233cc4,_0x4d1fbe,_0x341637,_0x3428c5),_0x3b9616=_0x48d785[_0x1125dc(0x183)];return _0x48d785[_0x1125dc(0xec)];})(globalThis,_0x1c43af(0xd0),_0x1c43af(0x1a2),_0x1c43af(0x160),_0x1c43af(0xd8),'1.0.0',_0x1c43af(0x17b),_0x1c43af(0x14b),_0x1c43af(0x18a),'',_0x1c43af(0x156),{\"resolveGetters\":false,\"defaultLimits\":{\"props\":100,\"elements\":100,\"strLength\":51200,\"totalStrLength\":51200,\"autoExpandLimit\":5000,\"autoExpandMaxDepth\":10},\"reducedLimits\":{\"props\":5,\"elements\":5,\"strLength\":256,\"totalStrLength\":768,\"autoExpandLimit\":30,\"autoExpandMaxDepth\":2},\"reducePolicy\":{\"perLogpoint\":{\"reduceOnCount\":50,\"reduceOnAccumulatedProcessingTimeMs\":100,\"resetWhenQuietMs\":500,\"resetOnProcessingTimeAverageMs\":100},\"global\":{\"reduceOnCount\":1000,\"reduceOnAccumulatedProcessingTimeMs\":300,\"resetWhenQuietMs\":50,\"resetOnProcessingTimeAverageMs\":100}}});");}catch(e){}};/* istanbul ignore next */function oo_oo(/**@type{any}**/i,/**@type{any}**/...v){try{oo_cm().consoleLog(i, v);}catch(e){} return v};/* istanbul ignore next */function oo_tr(/**@type{any}**/i,/**@type{any}**/...v){try{oo_cm().consoleTrace(i, v);}catch(e){} return v};/* istanbul ignore next */function oo_tx(/**@type{any}**/i,/**@type{any}**/...v){try{oo_cm().consoleError(i, v);}catch(e){} return v};/* istanbul ignore next */function oo_ts(/**@type{any}**/v){try{oo_cm().consoleTime(v);}catch(e){} return v;};/* istanbul ignore next */function oo_te(/**@type{any}**/v, /**@type{any}**/i){try{oo_cm().consoleTimeEnd(v, i);}catch(e){} return v;};/*eslint unicorn/no-abusive-eslint-disable:,eslint-comments/disable-enable-pair:,eslint-comments/no-unlimited-disable:,eslint-comments/no-aggregating-enable:,eslint-comments/no-duplicate-disable:,eslint-comments/no-unused-disable:,eslint-comments/no-unused-enable:,*/