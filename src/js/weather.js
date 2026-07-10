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
  let refreshTimerId = null;

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

  // --- CONFIG: Clock Grid (8 Countdown Circles Row) ---
  const CLOCK_GRID_SIZE = '11vw';         // EDITABLE: Width and height of each circle widget
  const CLOCK_GRID_GAP = '1vw';          // EDITABLE: Gap between cells
  const CLOCK_GRID_MARGIN_TOP = '1.5vw';   // EDITABLE: Top margin of the row
  const CLOCK_GRID_MARGIN_BOTTOM = '2vw';// EDITABLE: Bottom margin of the row
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
  document.documentElement.style.setProperty('--clock-grid-margin-top', CLOCK_GRID_MARGIN_TOP);
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

  // Removed lastBarometricPressure as we now use future predictive trend

  // Easily editable animation duration for the alert banner slide (in milliseconds)
  const ALERT_ANIMATION_MS = 1000;

  // --- CONFIG: Doppler Radar Option ---
  // Status of the left and right widgets
  let SHOW_DOPPLER_RADAR_LEFT = false;
  let SHOW_DOPPLER_RADAR_RIGHT = false;

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
  const CIRCLE_CELL_SIZE = '24vw';           // EDITABLE: Diameter of the circles (resizes them)
  const CIRCLE_CELL_TOP = '0vw';            // EDITABLE: Space above the circles (top spacing)
  const CIRCLE_CELL_LEFT = '3vw';           // EDITABLE: Space left of the left circle cell
  const CIRCLE_CELL_RIGHT = '3vw';          // EDITABLE: Space right of the right circle cell
  const CIRCLE_CELL_MARGIN_BOTTOM = '2vw';  // EDITABLE: Space below the circle cells (margin-bottom)
  const WEATHER_IMAGE_BORDER_RADIUS = '50%'; // EDITABLE: Circle shape rounding (keep at 50%)
  const RADAR_CENTER_DOT_SIZE = '1.0vw';      // EDITABLE: Size of the radar center dot (middle dot)

  // Set initial CSS variables for sizing and spacing
  document.documentElement.style.setProperty('--circle-cell-size', CIRCLE_CELL_SIZE);
  document.documentElement.style.setProperty('--circle-cell-top', CIRCLE_CELL_TOP);
  document.documentElement.style.setProperty('--circle-cell-left', CIRCLE_CELL_LEFT);
  document.documentElement.style.setProperty('--circle-cell-right', CIRCLE_CELL_RIGHT);
  document.documentElement.style.setProperty('--circle-cell-margin-bottom', CIRCLE_CELL_MARGIN_BOTTOM);
  document.documentElement.style.setProperty('--radar-center-dot-size', RADAR_CENTER_DOT_SIZE);
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

  // EDITABLE: Adjust the vertical position of the "fragile" top-row elements as a set.
  // This moves the Moon Phase, Wind Arrow, and Weather Description Image together.
  // Use negative values to move UP, positive values to move DOWN (e.g., '-1.5vw' or '2vw').
  const FRAGILE_ELEMENTS_Y_OFFSET = '2vw'; 
  document.documentElement.style.setProperty('--fragile-y-offset', FRAGILE_ELEMENTS_Y_OFFSET);

  // EDITABLE: Scrolling Gradient Overlay configuration (Non-phone version: iPad, desktop)
  const GRADIENT_NON_PHONE = {
    top: '40.5vw',
    height: '45vw',
    midpoint: '70%',
    midOpacity: '0.65',
    lowerTop: '116vw',
    lowerHeight: '38vw',
    lowerMidpoint: '90%',
    lowerMidOpacity: '0.65'
  };

  // EDITABLE: Scrolling Gradient Overlay configuration (Phone version only)
  const GRADIENT_PHONE = {
    top: '80.5vw',
    height: '45vw',
    midpoint: '70%',
    midOpacity: '0.65',
    lowerTop: '158vw',
    lowerHeight: '38vw',
    lowerMidpoint: '90%',
    lowerMidOpacity: '0.65'
  };

  function applyGradientProperties() {
    const isPhone = window.innerWidth < 768;
    const config = isPhone ? GRADIENT_PHONE : GRADIENT_NON_PHONE;
    
    document.documentElement.style.setProperty('--gradient-top', config.top);
    document.documentElement.style.setProperty('--gradient-height', config.height);
    document.documentElement.style.setProperty('--gradient-midpoint', config.midpoint);
    document.documentElement.style.setProperty('--gradient-mid-opacity', config.midOpacity);
    document.documentElement.style.setProperty('--gradient-lower-top', config.lowerTop);
    document.documentElement.style.setProperty('--gradient-lower-height', config.lowerHeight);
    document.documentElement.style.setProperty('--gradient-lower-midpoint', config.lowerMidpoint);
    document.documentElement.style.setProperty('--gradient-lower-mid-opacity', config.lowerMidOpacity);
  }

  // Initial apply
  applyGradientProperties();

  // Re-apply on window resize
  window.addEventListener('resize', applyGradientProperties);

  // EDITABLE: Wind speed text Y-offset adjustment
  const WIND_NUMBER_Y_OFFSET_DESKTOP = '-1vw'; // EDITABLE: Desktop vertical position of main wind number (negative moves UP)
  const WIND_NUMBER_Y_OFFSET_MOBILE = '-2vw';    // EDITABLE: Mobile vertical position of main wind number (negative moves UP)
  
  document.documentElement.style.setProperty('--wind-number-y-offset-desktop', WIND_NUMBER_Y_OFFSET_DESKTOP);
  document.documentElement.style.setProperty('--wind-number-y-offset-mobile', WIND_NUMBER_Y_OFFSET_MOBILE);

  // EDITABLE: Rain forecast banner configuration
  const RAIN_BANNER_HEIGHT_VW = 10; // Height of the rain banner (same as alert banners)
  const RAIN_BANNER_BLUE = 'hsl(205, 100%, 27%)'; // Same blue as rain inches row
  const RAIN_BANNER_FONT_SIZE_HOUR = '2.6vw'; // Font size for hour text (line 1)
  const RAIN_BANNER_FONT_SIZE_PERCENT = '4vw'; // Font size for percent text (line 2)
  const RAIN_BANNER_MIN_OPACITY = 0.3; // Minimum opacity for cells with rain
  const RAIN_BANNER_MAX_OPACITY = 0.95; // Maximum opacity for cells with rain

  // EDITABLE: Minimum height for the 8-day forecast temperature bars
  const MIN_TEMP_BAR_HEIGHT_VW = 5; // The height for the lowest temp of the week
  const DAY_LETTER_FONT_SIZE = 'inherit'; // EDITABLE: Size of the day letters (S, M, T...) under the bars. Try '4.5vw'!

  // EDITABLE: Hourly forecast time labels
  const HOURLY_LABEL_FONT_SIZE = '1.5vw'; // 40% of previous 0.64vw size
  const HOURLY_LABEL_COLOR = '#ffffff'; // Enforce pure white

  // EDITABLE: Hourly forecast section margins
  const HOURLY_MARGIN_TOP = '4vw';    // Gap above the entire 24-hour forecast row (after the daily rows)
  const HOURLY_MARGIN_BOTTOM = '5vw';  // Gap below the 24-hour forecast row

  // EDITABLE: Hourly forecast temperature bars
  const HOURLY_TEMP_FONT_SIZE = '3vw'; // EDITABLE: Set to 3vw to perfectly match F&C dual mode
  const HOURLY_TEMP_COLOR = 'var(--theBrown)'; // Color of the temperature number inside the bar
  const HOURLY_BAR_BORDER_RADIUS = '.5vw 0.5vw 0.5 0.5'; // EDITABLE: Temp bars rounded corners
  const HOURLY_IMAGE_BORDER_RADIUS = '0.5vw';         // EDITABLE: Weather images rounded corners
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

  // EDITABLE: Alert Banner Colors
  // Maps specific alert keywords to their background colors.
  const ALERT_MODAL_LINE_HEIGHT = '3.025vw'; // EDITABLE: Line spacing INSIDE the modal paragraphs
  const ALERT_MODAL_TITLE_LINE_HEIGHT = '.95'; // EDITABLE: Line spacing for the uppercase TITLE inside the modal

  const ALERT_COLORS = {
    "DEFAULT": "rgba(0,0,0, 0.75)", // Default translucent red for anything else
    "DENSE FOG ADVISORY": "rgba(128, 128, 128, 0.85)", // Gray
    "EXTREME HEAT WARNING": "hsl(0, 90%, 35%)", 
    "FLOOD ADVISORY": "hsl(195, 90%, 45%)", // Bright blue-purple
    "FLOOD WATCH": "hsl(195, 90%, 65%)", // Bright blue-purple
    "HEAT ADVISORY": "rgba(250, 38, 38, 0.85)", // Standard red
    "SEVERE THUNDERSTORM WARNING": "rgba(220, 38, 38, 0.85)", // Standard red
    "SEVERE THUNDERSTORM WATCH": "hsl(280, 90%, 50%)", // Bright blue-purple
    "SPECIAL WEATHER STATEMENT": "rgba(100, 130, 160, 0.85)", // Steel blue/gray
    "TORNADO WARNING": "hsl(0, 90%, 35%)", // Dark red
    "TORNADO WATCH": "hsl(0,   90%, 55%)", // Orange
    "WIND ADVISORY": "hsl(220, 90%, 35%)", // Bright blue-purple
  };

  // EDITABLE: Alert Banner Icons
  // Maps specific alert keywords to their SVG icons.
  const ALERT_ICONS = {
    "DEFAULT": "img/default-wat.svg",
    "DENSE FOG ADVISORY": "img/fog-wat.svg",
    "EXTREME HEAT WARNING": "img/heat-wat.svg",
    "FLOOD ADVISORY": "img/flood-wat.svg",
    "FLOOD WATCH": "img/flood-wat.svg",
    "HEAT ADVISORY": "img/heat-wat.svg",
    "SEVERE THUNDERSTORM WARNING": "img/thun-wat.svg",
    "SEVERE THUNDERSTORM WATCH": "img/thun-wat.svg",
    "SPECIAL WEATHER STATEMENT": "img/thun-wat.svg",
    "TORNADO WARNING": "img/thun-wat.svg",
    "TORNADO WATCH": "img/thun-wat.svg",
    "WIND ADVISORY": "img/wind-wat.svg",
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
    return `https://api.openweathermap.org/data/3.0/onecall?lat=${LAT}&lon=${LON}&exclude=minutely&appid=${API_KEY}&units=imperial`;
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
      console.log(`Dynamic temp range updated: ${tempRangeMin}°F - ${tempRangeMax}°F (from weekly data)`);
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
      // Create a transparent version of the popular color (0% alpha) to blend smoothly
      // Assumes tempToColor returns format 'hsl(H, S%, L%)'
      const transparentColor = popularColor.replace('hsl(', 'hsla(').replace(')', ', 0)');
      
      // Create an opacity-adjusted version of the popular color using the CSS variable
      const overlayMidOpacity = getComputedStyle(document.documentElement).getPropertyValue('--gradient-mid-opacity').trim() || '1';
      const midpointColor = popularColor.replace('hsl(', 'hsla(').replace(')', `, ${overlayMidOpacity})`);

      const overlay = document.querySelector('.scrolling-gradient-overlay');
      if (overlay) {
        // Create 3-color gradient: 0% opacity at top, configured setup at midpoint, 0% opacity at bottom
        document.documentElement.style.setProperty('--gradient-overlay-color', popularColor);
        document.documentElement.style.setProperty('--gradient-overlay-transparent', transparentColor);
        overlay.style.background = `linear-gradient(to bottom, ${transparentColor} 0%, ${midpointColor} var(--gradient-midpoint, 50%), ${transparentColor} 100%)`;
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
      // Create a transparent version of the popular color (0% alpha) to blend smoothly
      const transparentColor = popularColor.replace('hsl(', 'hsla(').replace(')', ', 0)');
      
      // Create an opacity-adjusted version of the popular color using the CSS variable
      const overlayMidOpacity = getComputedStyle(document.documentElement).getPropertyValue('--gradient-lower-mid-opacity').trim() || '1';
      const midpointColor = popularColor.replace('hsl(', 'hsla(').replace(')', `, ${overlayMidOpacity})`);

      const overlay = document.querySelector('.scrolling-gradient-overlay-lower');
      if (overlay) {
        // Create 3-color gradient: 0% opacity at top, configured setup at midpoint, 0% opacity at bottom
        document.documentElement.style.setProperty('--gradient-overlay-lower-color', popularColor);
        document.documentElement.style.setProperty('--gradient-overlay-lower-transparent', transparentColor);
        overlay.style.background = `linear-gradient(to bottom, ${transparentColor} 0%, ${midpointColor} var(--gradient-lower-midpoint, 50%), ${transparentColor} 100%)`;
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
    { max: 100, color: 'hsl(0,   90%, 55%)' },   // 90s: red
    { max: Infinity, color: 'rgba(190, 0, 0, 1)' } // 100+: dark red
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
      }
    } else {
      el.style.removeProperty('--temp-color');
      el.style.removeProperty('color');
    }
  }

  function getMoonPhaseName(phase) {
    if (typeof phase !== 'number') return '';
    // Based on standard OpenWeather API moon_phase values (0..1)
    if (phase === 0 || phase === 1) return 'New moon';
    if (phase > 0 && phase < 0.25) return 'Waxing crescent';
    if (phase === 0.25) return 'First quarter';
    if (phase > 0.25 && phase < 0.5) return 'Waxing gibbous';
    if (phase === 0.5) return 'Full moon';
    if (phase > 0.5 && phase < 0.75) return 'Waning gibbous';
    if (phase === 0.75) return 'Last quarter';
    if (phase > 0.75 && phase < 1) return 'Waning crescent';
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
    
    console.log(`Moon phase: ${moonPhase.toFixed(3)}, raw=${rawIndex}, offset=${MOON_IMAGE_OFFSET} -> 2moon${imgIndexStr}.png`);

    const imgEl = document.getElementById('moon-phase-img');
    const gridImgEls = document.querySelectorAll('.grid-moon-phase');
    
    if (imgEl || gridImgEls.length > 0) {
      const moonSrcUrl = `url(img/2moon${imgIndexStr}.png)`;
      
      if (imgEl) {
        imgEl.style.webkitMaskImage = moonSrcUrl;
        imgEl.style.maskImage = moonSrcUrl;
        imgEl.setAttribute('aria-label', `Moon Phase ${imgIndex} (${moonPhase})`);
      }
      gridImgEls.forEach(gridImgEl => {
        gridImgEl.style.webkitMaskImage = moonSrcUrl;
        gridImgEl.style.maskImage = moonSrcUrl;
        gridImgEl.setAttribute('aria-label', `Moon Phase ${imgIndex} (${moonPhase})`);
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
            const key = 'weather_last_temp_raw';
            const lastVal = localStorage.getItem(key);
            if (lastVal !== null) {
              const prev = parseFloat(lastVal);
              if (value > prev) {
                displayText += '▲';
                console.log(`Temp increased: ${prev}° → ${value}° (adding ▲)`);
              } else if (value < prev) {
                displayText += '▼';
                console.log(`Temp decreased: ${prev}° → ${value}° (adding ▼)`);
              } else {
                console.log(`Temp unchanged: ${value}° (no arrow)`);
              }
            } else {
              console.log(`First temp reading: ${value}° (no previous value to compare)`);
            }
            localStorage.setItem(key, value);
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
        console.error(`Error computing field ${f.name}:`, e);
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
    console.log('🧭 RAW API Wind Direction:', windDeg, '° | Wind Speed:', data.current?.wind_speed, 'mph | Full current data:', data.current);
    console.log('🧭 Current Wind Direction:', windDeg, '° (meteorological - direction FROM which wind blows)');
    if ((!windDeg || data.current?.wind_speed === 0) && data.hourly && data.hourly.length > 0) {
      // Find the closest hourly forecast in the future
      const now = Date.now() / 1000;
      const nextHour = data.hourly.find(h => h.dt > now);
      if (nextHour && nextHour.wind_deg) {
          const previousWindDeg = windDeg;
          windDeg = nextHour.wind_deg;
          console.log(`Current wind is calm/0°. Changed from ${previousWindDeg}° to hourly forecast: ${windDeg}°`);
      }
    }

    // Update wind direction arrow
    const windArrow = document.getElementById('wind-direction-arrow');
    const currentWindSpeed = data.current?.wind_speed || 0;
    
    if (windArrow) {
      updateWindDirectionArrow(data.current?.temp, windDeg);
      
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

  // Update the wind gauge with wind speed and gust data
  function updateWindGauge(data) {
    const windSpeed = data?.current?.wind_speed || 0;
    const windGust = data?.current?.wind_gust || windSpeed; // Default to wind_speed if gust not available
    const currentTemp = data?.current?.temp || null;
    
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
      gustTempColor = tempToColor(currentTemp - 10);
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
      gridGustProgressEl.style.strokeDasharray = `${length}, ${circumference}`;
      gridGustProgressEl.style.strokeDashoffset = dashOffset;
      if (gustTempColor) {
        gridGustProgressEl.style.stroke = gustTempColor;
      } else if (tempColor) {
        gridGustProgressEl.style.stroke = tempColor;
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
        <span style="position: relative; display: inline-block;">${Math.round(windSpeed)}</span>
      `;
      
      if (tempColor) {
        gridWindSpeedTextEl.style.color = tempColor;
      }

      if (windSpeed >= 25) {
        gridWindSpeedTextEl.style.setProperty('font-size', 'calc(var(--item-current-size) * 0.70)', 'important');
      } else {
        gridWindSpeedTextEl.style.removeProperty('font-size');
      }
    });
    
    console.log(`Wind updated: Speed ${Math.round(windSpeed)} mph (${speedPercent.toFixed(1)}%), Gust ${Math.round(windGust)} mph (${gustPercent.toFixed(1)}%)`);
  }

  // EDITABLE: Vertical position of the barometric trend arrow above the reading (e.g. "-2vw" or "0px")
  const BAROMETRIC_TREND_TOP_POS = "-3.5vw";
  // EDITABLE: Font size of the barometric trend arrow
  const BAROMETRIC_TREND_FONT_SIZE = "2.4vw";

  // Update the barometric pressure gauge
  function updateBarometricGauge(data) {
    const pressureEls = document.querySelectorAll('.barometric-text');
    const pressureFills = document.querySelectorAll('.barometric-fill');
    // OpenWeather provides pressure in hPa. Typical sea level range is 950 to 1050.
    const pressure = data?.current?.pressure || 1013; 
    
    // Determine trend arrow comparing current to +3 hour forecast
    let trendHtml = '';
    
    if (data?.hourly && data.hourly.length >= 4) {
      if (typeof data.hourly[3].pressure !== 'undefined') {
        const futurePressure = data.hourly[3].pressure;
        const diff = futurePressure - pressure;
        const absDiff = Math.abs(diff);

        let iconClass = '';
        let transformStyle = '';

        if (absDiff >= 6.0) {
          iconClass = diff > 0 ? "fa-angles-up" : "fa-angles-down";
          transformStyle = "";
        } else if (absDiff >= 1.0) {
          iconClass = diff > 0 ? "fa-angle-up" : "fa-angle-down";
          transformStyle = "";
        } else {
          // Steady pressure (less than 1.0hPa change)
          iconClass = "fa-minus";
          transformStyle = "";
        }

        if (iconClass) {
          trendHtml = `<div style="position: absolute; top: ${BAROMETRIC_TREND_TOP_POS}; width: 100%; text-align: center; font-size: ${BAROMETRIC_TREND_FONT_SIZE};"><i class="fa-solid ${iconClass}" style="${transformStyle}"></i></div>`;
        }
      }
    }

    pressureEls.forEach(el => {
      // Scale dynamic inner elements if it's placed inside the smaller grid circle!
      const isGrid = el.closest('.grid-barometric-pressure') !== null;
      const unitFontSize = isGrid ? '1.1vw' : '1.5vw';
      el.innerHTML = `${trendHtml}${Math.round(pressure)}<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">hPa</span>`;
    });

    if (pressureFills.length > 0) {
      // Map pressure range to circle percentage:
      // Minimum realistic ~950 (0%), Maximum ~1050 (100%)
      const minPressure = 950;
      const maxPressure = 1050;
      let percent = (pressure - minPressure) / (maxPressure - minPressure);
      
      // Clamp between 0 and 1
      percent = Math.max(0, Math.min(1, percent));
      
      pressureFills.forEach(fill => {
        const isGrid = fill.closest('.grid-barometric-pressure') !== null;
        const radius = isGrid ? 46 : 45;
        const circumference = 2 * Math.PI * radius; // ~289 or ~283
        const maxStrokeLength = circumference * 0.75; // ~217 or ~212
        const dashOffset = maxStrokeLength * percent;
        
        // Apply fill amount to the dasharray
        fill.style.strokeDasharray = `${dashOffset}, ${circumference}`;
      });
      
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
    
    console.log(`Humidity updated: ${humidity}% (${humidityPercent}%)`);
  }

  // Initialize the alert container and force bulletproof CSS transitions
  function initAlertsContainer() {
    if (document.getElementById('alerts-container')) return;
    
    // Inject bulletproof CSS for animations, scrollbar removal, glass effect, and text pulsing
    const style = document.createElement('style');
    style.id = 'alerts-style';
    style.textContent = `
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
        background-image: url('img/desc-overcast-clouds.jpg');
        background-size: auto 100%;
        background-repeat: repeat-x;
        background-position: center;
        --radar-loop-speed: ${RADAR_LOOP_SPEED_MS}ms;
        --radar-fade-duration: ${RADAR_FADE_DURATION_MS}ms;
        animation: scroll-weather-bg ${WEATHER_IMAGE_SCROLL_SPEED_S}s linear infinite !important;
        border-radius: ${WEATHER_IMAGE_BORDER_RADIUS};
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
        border: ${RADAR_OUTER_STROKE_WIDTH} solid var(--clock-grid-track-color, rgba(255, 255, 255, 0.2));
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
        background-image: url('img/desc-overcast-clouds.jpg');
        background-size: auto 100%;
        background-repeat: repeat-x;
        background-position: center;
        --radar-loop-speed: ${RADAR_LOOP_SPEED_MS}ms;
        --radar-fade-duration: ${RADAR_FADE_DURATION_MS}ms;
        animation: scroll-weather-bg ${WEATHER_IMAGE_SCROLL_SPEED_S}s linear infinite !important;
        border-radius: ${WEATHER_IMAGE_BORDER_RADIUS};
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
        border: ${RADAR_OUTER_STROKE_WIDTH} solid var(--clock-grid-track-color, rgba(255, 255, 255, 0.2));
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
      .radar-map-bg {
        pointer-events: none !important;
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
      #weather-desc-image-left.radar-mode::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: var(--radar-center-dot-size, 0.5vw);
        height: var(--radar-center-dot-size, 0.5vw);
        background-color: var(--clock-grid-track-color, rgba(255, 255, 255, 0.2));
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 100;
        pointer-events: none;
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
  if (document.body) {
    initAlertsContainer();
    // Initialize fragile elements with starting position
    const moon = document.getElementById('moon-phase-img');
    const descImg = document.getElementById('weather-desc-image');
    const descImgLeft = document.getElementById('weather-desc-image-left');
    const windArrow = document.getElementById('wind-direction-arrow');
    const clockHands = document.getElementById('analog-clock');
    const baroGauge = document.getElementById('barometric-pressure-gauge');
    const gradientUpper = document.querySelector('.scrolling-gradient-overlay');
    const gradientLower = document.querySelector('.scrolling-gradient-overlay-lower');
    if (moon) moon.style.setProperty('--alert-push', '0vw');
    if (descImg) descImg.style.setProperty('--alert-push', '0vw');
    if (descImgLeft) descImgLeft.style.setProperty('--alert-push', '0vw');
    if (windArrow) windArrow.style.setProperty('--alert-push', '0vw');
    if (clockHands) clockHands.style.setProperty('--alert-push', '0vw');
    if (baroGauge) baroGauge.style.setProperty('--alert-push', '0vw');
    if (gradientUpper) gradientUpper.style.setProperty('--alert-push', '0vw');
    if (gradientLower) gradientLower.style.setProperty('--alert-push', '0vw');
    setTimeout(() => document.body.classList.add('transitions-ready'), 100);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      initAlertsContainer();
      // Initialize fragile elements with starting position
      const moon = document.getElementById('moon-phase-img');
      const descImg = document.getElementById('weather-desc-image');
      const descImgLeft = document.getElementById('weather-desc-image-left');
      const windArrow = document.getElementById('wind-direction-arrow');
      const clockHands = document.getElementById('analog-clock');
      const baroGauge = document.getElementById('barometric-pressure-gauge');
      const gradientUpper = document.querySelector('.scrolling-gradient-overlay');
      const gradientLower = document.querySelector('.scrolling-gradient-overlay-lower');
      if (moon) moon.style.setProperty('--alert-push', '0vw');
      if (descImg) descImg.style.setProperty('--alert-push', '0vw');
      if (descImgLeft) descImgLeft.style.setProperty('--alert-push', '0vw');
      if (windArrow) windArrow.style.setProperty('--alert-push', '0vw');
      if (clockHands) clockHands.style.setProperty('--alert-push', '0vw');
      if (baroGauge) baroGauge.style.setProperty('--alert-push', '0vw');
      if (gradientUpper) gradientUpper.style.setProperty('--alert-push', '0vw');
      if (gradientLower) gradientLower.style.setProperty('--alert-push', '0vw');
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
    
    console.log(`Fragile elements pushed down by ${totalHeight}vw`);
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
        mask-position: center;
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

  // Create and update dynamic alert banners from OpenWeather API
  function updateAlerts(data) {
    const rawAlerts = data.alerts || [];
    
    // Deduplicate alerts by event name to prevent showing the exact same warning twice
    // (The National Weather Service often issues overlapping polygons for the same storm)
    const alerts = [];
    const seenEvents = new Set();
    rawAlerts.forEach(alert => {
      if (alert && alert.event) {
        // Force uppercase and strip hidden spaces/newlines to guarantee reliable deduplication
        const normalizedEvent = alert.event.toUpperCase().trim();
        if (!seenEvents.has(normalizedEvent)) {
          seenEvents.add(normalizedEvent);
          alerts.push(alert);
        }
      }
    });
    
    const container = document.getElementById('alerts-container');
    
    // Console logging to debug tornado watch
    console.log('🚨 ALERTS DEBUG - Raw alerts array:', alerts);
    console.log('🚨 ALERTS DEBUG - Number of alerts:', alerts.length);
    console.log('🚨 ALERTS DEBUG - Full data.alerts:', data.alerts);
    if (alerts.length > 0) {
      alerts.forEach((alert, index) => {
        console.log(`🚨 Alert ${index + 1}:`, {
          event: alert.event,
          sender_name: alert.sender_name,
          start: alert.start,
          end: alert.end,
          description: alert.description?.substring(0, 100) + '...',
          tags: alert.tags
        });
      });
    } else {
      console.log('🚨 ALERTS DEBUG - No alerts found in API data');
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
      console.log('Alert data:', alert); // Debug: see what properties are available
      
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
      
      const svgIcon = `
        <img src="${bannerIcon}" style="width: ${svgSize}; height: ${svgSize}; flex-shrink: 0;" alt="Alert">
      `;
      
      // Create the content container (sits above background)
      const bannerContent = document.createElement('div');
      bannerContent.className = 'alert-banner-content';

      const textWrapper = document.createElement('div');
      textWrapper.style.display = 'flex';
      textWrapper.style.flexDirection = 'column';
      textWrapper.style.justifyContent = 'center';
      textWrapper.style.alignItems = 'flex-start';

      const text = document.createElement('div');
      text.className = 'alert-text';
      
      // Format: "TORNADO WATCH expires 6:15 am"
      let alertText = alert.event.toUpperCase();
      if (alert.end) {
        const endDate = new Date(alert.end * 1000); // Convert Unix timestamp to Date
        const hours = endDate.getHours();
        const minutes = endDate.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for midnight
        const expiresText = `expires ${displayHours}:${minutes} ${ampm}`;
        alertText += ` <span class="alert-expires">${expiresText}</span>`;
        console.log(`Alert expires at: ${displayHours}:${minutes} ${ampm}`);
      } else {
        console.log('Alert has no end property');
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
      if (moon) moon.style.setProperty('--alert-push', startPushValue);
      if (descImg) descImg.style.setProperty('--alert-push', startPushValue);
      const descImgLeft = document.getElementById('weather-desc-image-left');
      if (descImgLeft) descImgLeft.style.setProperty('--alert-push', startPushValue);
      if (windArrow) windArrow.style.setProperty('--alert-push', startPushValue);
      if (clockHands) clockHands.style.setProperty('--alert-push', startPushValue);
      if (baroGauge) baroGauge.style.setProperty('--alert-push', startPushValue);
      if (gradientUpper) gradientUpper.style.setProperty('--alert-push', startPushValue);
      if (gradientLower) gradientLower.style.setProperty('--alert-push', startPushValue);
      
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

  // --- Feels Like Margin Config ---
  const FEELS_LIKE_TOP_MARGIN = '1vw';    // EDITABLE: Gap ABOVE the whole "feels like" line
  const FEELS_LIKE_BOTTOM_MARGIN = '0vw';   // EDInpm run buildTABLE: Gap BELOW the whole "feels like" line
  const FEELS_LIKE_Y_OFFSET = '0vw';        // EDITABLE: Tight vertical nudge (positive = down, negative = up)
  const FEELS_LIKE_VAL_Y_OFFSET = '0vw';    // EDITABLE: Tight vertical nudge for ONLY the feels-like temp value
  
  const FEELS_LIKE_TEXT_SIZE_DEFAULT = '5vw';   // EDITABLE: Standard size of the feels-like label text (single mode)
  const FEELS_LIKE_TEMP_SIZE_DEFAULT = '7.25vw'; // EDITABLE: ENLARGED size of feels-like temp (single mode) when diff >= 10
  const FEELS_LIKE_TEXT_SIZE_DUAL = '4vw';      // EDITABLE: Standard size of the feels-like label text (dual mode)
  const FEELS_LIKE_TEMP_SIZE_DUAL = '6.25vw';    // EDITABLE: ENLARGED size of feels-like temp (dual mode) when diff >= 10

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

    // Determine active size based on whether feels-like is 10+ degrees away from current temp
    let activeTempSizeDefault = FEELS_LIKE_TEXT_SIZE_DEFAULT;
    let activeTempSizeDual = FEELS_LIKE_TEXT_SIZE_DUAL;
    if (typeof feelsLike === 'number' && typeof currentTemp === 'number') {
      const diff = Math.abs(Math.round(feelsLike) - Math.round(currentTemp));
      if (diff >= 10) {
        activeTempSizeDefault = FEELS_LIKE_TEMP_SIZE_DEFAULT;
        activeTempSizeDual = FEELS_LIKE_TEMP_SIZE_DUAL;
      }
    }
    
    // Always apply styling so hot-reloading works
    el.style.margin = `0 auto ${FEELS_LIKE_BOTTOM_MARGIN}`;
    el.style.paddingTop = FEELS_LIKE_TOP_MARGIN;
    el.style.setProperty('--feels-like-y-offset', FEELS_LIKE_Y_OFFSET);
    el.style.setProperty('--feels-like-val-y-offset', FEELS_LIKE_VAL_Y_OFFSET);
    el.style.setProperty('--feels-like-temp-size-default', activeTempSizeDefault);
    el.style.setProperty('--feels-like-temp-size-dual', activeTempSizeDual);
    el.style.transform = `translateY(var(--feels-like-y-offset, 0vw))`;
    
    if (typeof feelsLike === 'number') {
      // --- EDITABLE: "feels like" text styles ---
      // Default View (Single Temp)
      const FEELS_LIKE_LETTER_SPACING_DEFAULT = '-.225vw';
      const FEELS_LIKE_MARGIN_LEFT_DEFAULT = '.5vw';  // EDITABLE: Space BEFORE "feels like"
      const FEELS_LIKE_MARGIN_RIGHT_DEFAULT = '1.25vw'; // EDITABLE: Space AFTER "feels like"
      
      // F&C View (Dual Temp)
      const FEELS_LIKE_LETTER_SPACING_DUAL = '-.225vw';
      const FEELS_LIKE_MARGIN_LEFT_DUAL = '1vw';  // EDITABLE: Space BEFORE "feels like"
      const FEELS_LIKE_MARGIN_RIGHT_DUAL = '1vw'; // EDITABLE: Space AFTER "feels like"

      const dynamicColor = tempToColor(feelsLike) || 'inherit';
      
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
      
      if (displayUnit === 'BOTH') {
        const feelsLikeHtml = `<span style="font-family: 'light', sans-serif; font-weight: normal; font-size: ${FEELS_LIKE_TEXT_SIZE_DUAL}; letter-spacing: ${FEELS_LIKE_LETTER_SPACING_DUAL}; margin-left: ${FEELS_LIKE_MARGIN_LEFT_DUAL}; margin-right: ${FEELS_LIKE_MARGIN_RIGHT_DUAL}; color: inherit;">feels like</span>`;
        const fF = Math.round(feelsLike);
        const fC = Math.round((feelsLike - 32) * 5 / 9);
        const dualFeels = `<span class="fc-mode-text ${glowClass}" style="${glowStyle} display: inline-block; transform: translateY(var(--feels-like-val-y-offset, 0vw)); font-family: 'boldcond', sans-serif; font-size: var(--feels-like-temp-size-dual, 6.25vw); color: ${dynamicColor} !important; transition: color 0.5s ease;">${fF}${formatSlash()}${fC}</span>`;
        
        if (typeof currentTemp === 'number') {
          const cF = Math.round(currentTemp);
          const cC = Math.round((currentTemp - 32) * 5 / 9);
          const currClr = tempToColor(currentTemp) || 'white';
          el.innerHTML = `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; font-size: 5vw; color: ${currClr} !important;">${cF}${formatSlash()}${cC}</span>${feelsLikeHtml}${dualFeels}`;
        } else {
          el.innerHTML = `${feelsLikeHtml}${dualFeels}`;
        }
      } else {
        const feelsLikeHtml = `<span style="font-family: 'light', sans-serif; font-weight: normal; font-size: ${FEELS_LIKE_TEXT_SIZE_DEFAULT}; letter-spacing: ${FEELS_LIKE_LETTER_SPACING_DEFAULT}; margin-left: ${FEELS_LIKE_MARGIN_LEFT_DEFAULT}; margin-right: ${FEELS_LIKE_MARGIN_RIGHT_DEFAULT}; color: inherit;">feels like</span>`;
        const displayFeelsLike = displayUnit === 'C' ? (feelsLike - 32) * 5 / 9 : feelsLike;
        const displayCurrent = displayUnit === 'C' && typeof currentTemp === 'number' ? (currentTemp - 32) * 5 / 9 : currentTemp;
        const rounded = Math.round(displayFeelsLike);
        if (typeof currentTemp === 'number') {
          const roundedCurrent = Math.round(displayCurrent);
          const currClr = tempToColor(currentTemp) || 'white';
          el.innerHTML = `<span style="font-family: 'bold', sans-serif; font-size: ${FEELS_LIKE_TEXT_SIZE_DEFAULT}; color: ${currClr} !important;">${roundedCurrent}°</span>${feelsLikeHtml}<span class="${glowClass}" style="${glowStyle} display: inline-block; transform: translateY(var(--feels-like-val-y-offset, 0vw)); font-family: 'bold', sans-serif; font-size: var(--feels-like-temp-size-default, 6.25vw); color: ${dynamicColor} !important; transition: color 0.5s ease;">${rounded}°</span>`;
        } else {
          el.innerHTML = `${feelsLikeHtml}<span class="${glowClass}" style="${glowStyle} display: inline-block; transform: translateY(var(--feels-like-val-y-offset, 0vw)); font-family: 'bold', sans-serif; font-size: var(--feels-like-temp-size-default, 6.25vw); color: ${dynamicColor} !important; transition: color 0.5s ease;">${rounded}°</span>`;
        }
      }
      el.style.color = tempToColor(currentTemp) || 'inherit';
      el.style.marginTop = '1.5vw'; // Unconditionally force the larger top margin
    } else {
      el.textContent = '';
    }
  }

  // --- Weather Description Config ---
  // Line 3: The API description (e.g., "Overcast clouds.")
  const DESC_MARGIN_TOP = '-1vw';     // EDITABLE: Space ABOVE the 3rd line
  const DESC_MARGIN_BOTTOM = '1vw';   // EDITABLE: Space BELOW the 3rd line
  
  // Line 4: The custom derived phrase (e.g., "Raw.")
  const DERIVED_DESC_MARGIN_TOP = '-1.5vw';    // EDITABLE: Space ABOVE the 4th line
  const DERIVED_DESC_MARGIN_BOTTOM = '3vw';    // EDITABLE: Space BELOW the 4th line

  // Create and update weather description element
  function updateWeatherDescription(data) {
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
      el.style.margin = `${DESC_MARGIN_TOP} auto ${DESC_MARGIN_BOTTOM}`;
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
      dupEl.style.marginTop = DERIVED_DESC_MARGIN_TOP; 
      dupEl.style.marginBottom = DERIVED_DESC_MARGIN_BOTTOM; 
      
      dupEl.style.color = 'inherit';
      dupEl.style.opacity = '1';
      dupEl.style.textShadow = '0 2px 6px rgba(0, 0, 0, 0.0), 0 4px 12px rgba(0, 0, 0, 0.0)';
      dupEl.style.letterSpacing = '-.225vw';
      dupEl.style.display = 'block'; // Ensure block display for transform centering
      
      if (el && el.parentNode) {
        el.parentNode.insertBefore(dupEl, el.nextSibling);
      }
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
          console.log(`🔍 Derived Phrase Match: "${cond.phrase}" (Temp: ${t}, Wind: ${w}, Hum: ${h})`);
          return cond.phrase + '.';
        }
      }
      console.log(`🔍 Derived Phrase: NO MATCH for Temp: ${t}, Wind: ${w}, Hum: ${h}`);
      return ''; // Fallback if no conditions match
    }
    
    // Console report: Current weather description
    console.log('🌤️ CURRENT Weather Description:', description || 'N/A');
    
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
      el.style.margin = `${DESC_MARGIN_TOP} auto ${DESC_MARGIN_BOTTOM}`; // Apply editable margins
      
      if (dupEl) {
        dupEl.style.fontSize = '5vw';
        dupEl.style.transform = 'none';
        dupEl.style.display = 'block'; // 'block' forces line break
        dupEl.style.width = 'max-content'; 
        dupEl.style.margin = '0 auto';
        dupEl.style.marginTop = DERIVED_DESC_MARGIN_TOP; 
        dupEl.style.marginBottom = DERIVED_DESC_MARGIN_BOTTOM;
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
        const nightImgPath = 'img/dark-' + baseFileName;
        const fallbackPath = 'img/desc-rem.jpg';
        const primaryImgPath = isNight ? nightImgPath : dayImgPath;

        let framesRight = [];
        if (descImageEl) {
          if (SHOW_DOPPLER_RADAR_RIGHT) {
            descImageEl.classList.add('radar-mode');
            descImageEl.style.setProperty('--radar-fade-duration', `${RADAR_FADE_DURATION_MS}ms`);
            framesRight = descImageEl.querySelectorAll('.radar-frame');
            
            // Calculate coordinates and offsets dynamically to center the RainViewer map on LAT/LON for the right circle (Zoom 7)
            const coords = getTileCoords(LAT, LON, RAINVIEWER_ZOOM_RIGHT);
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

            if (framesRight.length !== RADAR_FRAME_COUNT) {
              descImageEl.querySelectorAll('.radar-frame').forEach(f => f.remove());
              descImageEl.querySelectorAll('.radar-sweep-line').forEach(l => l.remove());
              descImageEl.querySelectorAll('.radar-frames-container').forEach(c => c.remove());
              descImageEl.querySelectorAll('.radar-map-bg').forEach(m => m.remove());
              
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
              descImageEl.appendChild(mapBg);

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
              descImageEl.appendChild(framesContainer);
              
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
              descImageEl.appendChild(sweepLine);
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
            }
            
            // Append 25mi and 50mi range rings dynamically if not present
            if (!descImageEl.querySelector('.radar-ring-25-right')) {
              const r25 = document.createElement('div');
              r25.className = 'radar-ring-25-right';
              descImageEl.appendChild(r25);
            }
            if (!descImageEl.querySelector('.radar-ring-50-right')) {
              const r50 = document.createElement('div');
              r50.className = 'radar-ring-50-right';
              descImageEl.appendChild(r50);
            }
          } else {
            descImageEl.classList.remove('radar-mode');
            descImageEl.querySelectorAll('.radar-frame').forEach(f => f.remove());
            descImageEl.querySelectorAll('.radar-sweep-line').forEach(l => l.remove());
            descImageEl.querySelectorAll('.radar-frames-container').forEach(c => c.remove());
            descImageEl.querySelectorAll('.radar-ring-25-right').forEach(r => r.remove());
            descImageEl.querySelectorAll('.radar-ring-50-right').forEach(r => r.remove());
            
            // Set standard background image
            const imgPreload = new Image();
            imgPreload.onload = () => {
              descImageEl.style.backgroundImage = `url('${primaryImgPath}')`;
            };
            imgPreload.onerror = () => {
              if (isNight) {
                const dayPreload = new Image();
                dayPreload.onload = () => { descImageEl.style.backgroundImage = `url('${dayImgPath}')`; };
                dayPreload.onerror = () => { descImageEl.style.backgroundImage = `url('${fallbackPath}')`; };
                dayPreload.src = dayImgPath;
              } else {
                descImageEl.style.backgroundImage = `url('${fallbackPath}')`;
              }
            };
            imgPreload.src = primaryImgPath;
          }
        }

        let framesLeft = [];
        if (descImageLeftEl) {
          if (SHOW_DOPPLER_RADAR_LEFT) {
            descImageLeftEl.classList.add('radar-mode');
            descImageLeftEl.style.setProperty('--radar-fade-duration', `${RADAR_FADE_DURATION_MS}ms`);
            framesLeft = descImageLeftEl.querySelectorAll('.radar-frame');
            
            // Calculate coordinates and offsets dynamically to center the RainViewer map on LAT/LON for the left circle (Zoom 6)
            const coords = getTileCoords(LAT, LON, RAINVIEWER_ZOOM_LEFT);
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

            if (framesLeft.length !== RADAR_FRAME_COUNT) {
              descImageLeftEl.querySelectorAll('.radar-frame').forEach(f => f.remove());
              descImageLeftEl.querySelectorAll('.radar-sweep-line').forEach(l => l.remove());
              descImageLeftEl.querySelectorAll('.radar-frames-container').forEach(c => c.remove());
              descImageLeftEl.querySelectorAll('.radar-map-bg').forEach(m => m.remove());
              
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
              descImageLeftEl.appendChild(mapBg);

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
              descImageLeftEl.appendChild(framesContainer);
              
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
              descImageLeftEl.appendChild(sweepLine);
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
            }
          } else {
            descImageLeftEl.classList.remove('radar-mode');
            descImageLeftEl.querySelectorAll('.radar-frame').forEach(f => f.remove());
            descImageLeftEl.querySelectorAll('.radar-sweep-line').forEach(l => l.remove());
            descImageLeftEl.querySelectorAll('.radar-frames-container').forEach(c => c.remove());
            descImageLeftEl.querySelectorAll('.radar-map-bg').forEach(m => m.remove());
            
            // Set standard background image
            const imgPreload = new Image();
            imgPreload.onload = () => {
              descImageLeftEl.style.backgroundImage = `url('${primaryImgPath}')`;
            };
            imgPreload.onerror = () => {
              if (isNight) {
                const dayPreload = new Image();
                dayPreload.onload = () => { descImageLeftEl.style.backgroundImage = `url('${dayImgPath}')`; };
                dayPreload.onerror = () => { descImageLeftEl.style.backgroundImage = `url('${fallbackPath}')`; };
                dayPreload.src = dayImgPath;
              } else {
                descImageLeftEl.style.backgroundImage = `url('${fallbackPath}')`;
              }
            };
            imgPreload.src = primaryImgPath;
          }
        }

        const timeParam = Math.floor(Date.now() / 1200000);
        
        // Pre-calculate slippy parameters for LEFT (Zoom 6)
        const coordsLeft = getTileCoords(LAT, LON, RAINVIEWER_ZOOM_LEFT);
        const x0Left = Math.floor(coordsLeft.x);
        const y0Left = Math.floor(coordsLeft.y);
        const dXLeft = coordsLeft.x - x0Left;
        const dYLeft = coordsLeft.y - y0Left;
        const x_startLeft = (dXLeft < 0.5) ? x0Left - 1 : x0Left;
        const y_startLeft = (dYLeft < 0.5) ? y0Left - 1 : y0Left;

        // Pre-calculate slippy parameters for RIGHT (Zoom 7)
        const coordsRight = getTileCoords(LAT, LON, RAINVIEWER_ZOOM_RIGHT);
        const x0Right = Math.floor(coordsRight.x);
        const y0Right = Math.floor(coordsRight.y);
        const dXRight = coordsRight.x - x0Right;
        const dYRight = coordsRight.y - y0Right;
        const x_startRight = (dXRight < 0.5) ? x0Right - 1 : x0Right;
        const y_startRight = (dYRight < 0.5) ? y0Right - 1 : y0Right;

        // Set static map backgrounds once (CartoDB dark matter)
        const mapBgLeft = descImageLeftEl ? descImageLeftEl.querySelector('.radar-map-bg') : null;
        if (SHOW_DOPPLER_RADAR_LEFT && mapBgLeft && latestRainViewerData) {
          const baseTilesLeft = [
            `https://basemaps.cartocdn.com/dark_all/${RAINVIEWER_ZOOM_LEFT}/${x_startLeft}/${y_startLeft}.png`,
            `https://basemaps.cartocdn.com/dark_all/${RAINVIEWER_ZOOM_LEFT}/${x_startLeft+1}/${y_startLeft}.png`,
            `https://basemaps.cartocdn.com/dark_all/${RAINVIEWER_ZOOM_LEFT}/${x_startLeft}/${y_startLeft+1}.png`,
            `https://basemaps.cartocdn.com/dark_all/${RAINVIEWER_ZOOM_LEFT}/${x_startLeft+1}/${y_startLeft+1}.png`
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
        if (SHOW_DOPPLER_RADAR_RIGHT && mapBgRight && latestRainViewerData) {
          const baseTilesRight = [
            `https://basemaps.cartocdn.com/dark_all/${RAINVIEWER_ZOOM_RIGHT}/${x_startRight}/${y_startRight}.png`,
            `https://basemaps.cartocdn.com/dark_all/${RAINVIEWER_ZOOM_RIGHT}/${x_startRight+1}/${y_startRight}.png`,
            `https://basemaps.cartocdn.com/dark_all/${RAINVIEWER_ZOOM_RIGHT}/${x_startRight}/${y_startRight+1}.png`,
            `https://basemaps.cartocdn.com/dark_all/${RAINVIEWER_ZOOM_RIGHT}/${x_startRight+1}/${y_startRight+1}.png`
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
          
          // Left circle (RainViewer Zoom 6)
          if (SHOW_DOPPLER_RADAR_LEFT && descImageLeftEl && framesLeft[i]) {
            if (latestRainViewerData && latestRainViewerData.radar && latestRainViewerData.radar.past) {
              const pastFrames = latestRainViewerData.radar.past;
              const frameIndex = pastFrames.length - 1 - frameNum;
              const rvFrame = pastFrames[frameIndex] || pastFrames[pastFrames.length - 1];
              const host = latestRainViewerData.host || 'https://tilecache.rainviewer.com';
              const path = rvFrame.path;
              
              const rvTiles = [
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${RAINVIEWER_ZOOM_LEFT}/${x_startLeft}/${y_startLeft}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${RAINVIEWER_ZOOM_LEFT}/${x_startLeft+1}/${y_startLeft}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${RAINVIEWER_ZOOM_LEFT}/${x_startLeft}/${y_startLeft+1}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${RAINVIEWER_ZOOM_LEFT}/${x_startLeft+1}/${y_startLeft+1}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`
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
              framesLeft[i].style.backgroundSize = `calc(${RADAR_ZOOM_LEFT} * 100%) auto`;
              framesLeft[i].style.backgroundPosition = `calc(50% + ${RADAR_OFFSET_X_LEFT}) calc(50% + ${RADAR_OFFSET_Y_LEFT})`;
            }
          }

          // Right circle (RainViewer Zoom 7)
          if (SHOW_DOPPLER_RADAR_RIGHT && descImageEl && framesRight[i]) {
            if (latestRainViewerData && latestRainViewerData.radar && latestRainViewerData.radar.past) {
              const pastFrames = latestRainViewerData.radar.past;
              const frameIndex = pastFrames.length - 1 - frameNum;
              const rvFrame = pastFrames[frameIndex] || pastFrames[pastFrames.length - 1];
              const host = latestRainViewerData.host || 'https://tilecache.rainviewer.com';
              const path = rvFrame.path;
              
              const rvTiles = [
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${RAINVIEWER_ZOOM_RIGHT}/${x_startRight}/${y_startRight}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${RAINVIEWER_ZOOM_RIGHT}/${x_startRight+1}/${y_startRight}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${RAINVIEWER_ZOOM_RIGHT}/${x_startRight}/${y_startRight+1}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`,
                `${host}${path}/${RAINVIEWER_TILE_SIZE}/${RAINVIEWER_ZOOM_RIGHT}/${x_startRight+1}/${y_startRight+1}/${RAINVIEWER_COLOR_SCHEME}/0_0.png`
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
              framesRight[i].style.backgroundSize = `calc(${RADAR_ZOOM_RIGHT} * 100%) auto`;
              framesRight[i].style.backgroundPosition = `calc(50% + ${RADAR_OFFSET_X_RIGHT}) calc(50% + ${RADAR_OFFSET_Y_RIGHT})`;
            }
          }
        }

        if (SHOW_DOPPLER_RADAR_RIGHT || SHOW_DOPPLER_RADAR_LEFT) {
          startRadarLoop(
            SHOW_DOPPLER_RADAR_RIGHT ? framesRight : null,
            SHOW_DOPPLER_RADAR_LEFT ? framesLeft : null
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

  // --- Earth Image Config ---
  // Settings for the live Earth image from NOAA GOES satellite
  const EARTH_IMAGE_WIDTH = '68vw';  // Width of the container (2% smaller to crop bottom text)
  const EARTH_IMAGE_URL = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/678x678.jpg';
  const EARTH_IMAGE_MARGIN_TOP = '2vw';  // Gap above the Earth image
  const EARTH_IMAGE_MARGIN_BOTTOM = '4vw';  // Gap below the Earth image
  const EARTH_MASK_RADIUS = '49.5%'; // EDITABLE: Shrink circle slightly to hide edge artifacts (49.5% = 99% size)
  const EARTH_MASK_POSITION_Y = '50.25%'; // EDITABLE: Shift mask down to crop exactly 0.5% more from the top only

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

    let container = document.getElementById('refresh-dots-container');
    const colors = getDotsColors(currentTemp);
    
    // Hot-reload fix: if DOTS_COUNT is changed, clear out the old dots so they instantly rebuild!
    const currentDots = container ? container.querySelectorAll('.refresh-dot').length : 0;
    if (container && currentDots !== DOTS_COUNT) {
      container.querySelectorAll('.refresh-dot').forEach(d => d.remove());
    }

    if (!container) {
      container = document.createElement('div');
      container.id = 'refresh-dots-container';
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
        }
        if (window.Weather && window.Weather.refreshDotColors) {
          window.Weather.refreshDotColors();
        }
      });
      
      btnContainer.appendChild(btn1);
      btnContainer.appendChild(btn2);
    }

    // Position/Append formats buttons centered at the very bottom after last updated
    const targetParent = document.querySelector('main.content') || document.body;
    const lastUpdatedEl = document.getElementById('weather-last-updated');
    if (lastUpdatedEl) {
      if (lastUpdatedEl.nextSibling !== btnContainer) {
        lastUpdatedEl.parentNode.insertBefore(btnContainer, lastUpdatedEl.nextSibling);
      }
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
    btnContainer.style.paddingBottom = '6vw'; // Responsive padding to keep a nice gap at the bottom of the page
    
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
    
    // Ensure it's placed right below the weather description (or its duplicate)
    const dupEl = document.getElementById('weather-description-duplicate');
    const descEl = document.getElementById('weather-description');
    
    // We want dots to go AFTER the duplicate line, if it exists. Otherwise after descEl.
    const targetEl = dupEl || descEl;
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
      console.log('[Dots] Using passed temperature:', currentTemp, '°F →', color);
    }
    // 2. Try CSS variable (set when current temperature is displayed)
    else {
      const rootColor = document.documentElement.style.getPropertyValue('--temp-color');
      if (rootColor && rootColor.trim() !== '') {
        color = rootColor.trim();
        console.log('[Dots] Using --temp-color from CSS variable:', color);
      } else {
        // 3. Fallback to calculating from stored temperature
        try {
          const lastTempStr = localStorage.getItem('weather_last_temp_raw');
          if (lastTempStr !== null) {
            const temp = parseFloat(lastTempStr);
            if (!Number.isNaN(temp)) {
              color = tempToColor(temp);
              console.log('[Dots] Calculated color from localStorage temp:', temp, '°F →', color);
            }
          }
        } catch(e) {
          console.log('[Dots] Error reading temp from localStorage:', e);
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
      console.log('[Dots] No temperature color found, using defaults:', active);
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
          innerHtml = `<div class="moon-phase-display grid-moon-phase" role="img" aria-label="Moon Phase"></div>`;
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
              <circle class="countdown-track" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="celestial-dot" cx="50" cy="7.5" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
            </svg>
            <div class="grid-sun-text"></div>
          `;
        } else if (i === 6) {
          // Cell #7: Moon dial showing moonrise period
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="celestial-dot" cx="50" cy="7.5" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
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
                <div class="clock-center-dot"></div>
              </div>
            `;
          }
        }
        
        item.innerHTML = innerHtml;
        container.appendChild(item);
      }
      
      // Insert right below the refresh dots container
      const refreshDots = document.getElementById('refresh-dots-container');
      if (refreshDots && refreshDots.parentNode) {
        refreshDots.parentNode.insertBefore(container, refreshDots.nextSibling);
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
          
          // If this is the "WIND" dial (index 2), replace the title with "Gust [X] mph"
          if (i === 2 && data && data.current) {
             const windSpeed = data.current.wind_speed || 0;
             const windGust = data.current.wind_gust || windSpeed;
             titleText = `Gust ${Math.round(windGust)} mph`;
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
           const windGust = data.current.wind_gust || windSpeed;
           windTitle.innerText = `Gust ${Math.round(windGust)} mph`;
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
    const indices7 = [0, 1, 2, 3, 5, 6, 7];
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
          innerHtml = `<div class="moon-phase-display grid-moon-phase" role="img" aria-label="Moon Phase"></div>`;
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
              <circle class="countdown-track" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="celestial-dot" cx="50" cy="7.5" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
            </svg>
            <div class="grid-sun-text"></div>
          `;
        } else if (i === 6) {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="celestial-dot" cx="50" cy="7.5" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
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
           const windGust = data.current.wind_gust || windSpeed;
           titleText = `Gust ${Math.round(windGust)} mph`;
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
         const windGust = data.current.wind_gust || windSpeed;
         windTitle.innerText = `Gust ${Math.round(windGust)} mph`;
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
    const indices4_1 = [0, 1, 2, 3];
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
          innerHtml = `<div class="moon-phase-display grid-moon-phase" role="img" aria-label="Moon Phase"></div>`;
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
           const windGust = data.current.wind_gust || windSpeed;
           titleText = `Gust ${Math.round(windGust)} mph`;
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
         const windGust = data.current.wind_gust || windSpeed;
         windTitle.innerText = `Gust ${Math.round(windGust)} mph`;
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
              <circle class="countdown-track" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="celestial-dot" cx="50" cy="7.5" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
            </svg>
            <div class="grid-sun-text"></div>
          `;
        } else if (i === 6) {
          innerHtml = `
            <svg class="clock-timer-svg" viewBox="0 0 100 100">
              <circle class="countdown-track" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="countdown-progress" cx="50" cy="50" r="42.5" fill="none" />
              <circle class="celestial-dot" cx="50" cy="7.5" r="1.5" style="display: none; fill: var(--grid-celestial-dot-fill); stroke-width: var(--grid-celestial-dot-stroke-width);" />
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
                    gridMoonRiseTime = moonrise; // Fallback
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
  }

  // Update the humidity dial in grid cell #4 (index 3)
  function updateHumidityDial(data) {
    const humidity = data?.current?.humidity;
    if (typeof humidity !== 'number') return;
    
    const currentTemp = data?.current?.temp || null;
    const tempColor = currentTemp !== null ? tempToColor(currentTemp) : null;
    const activeColor = getDotsColors(currentTemp).active;
    const finalColor = tempColor || activeColor;
    
    const gridHumidityProgressEls = document.querySelectorAll('.clockGridItem-3 .countdown-progress');
    const gridHumidityTextEls = document.querySelectorAll('.clockGridItem-3 .grid-humidity-text');
    const radius = 46;
    const circumference = 2 * Math.PI * radius; // ~289.0265
    
    gridHumidityProgressEls.forEach(gridHumidityProgressEl => {
      const percent = Math.max(0, Math.min(1, humidity / 100));
      const dashOffset = circumference * (1 - percent);
      gridHumidityProgressEl.style.strokeDashoffset = dashOffset;
      if (finalColor) {
        gridHumidityProgressEl.style.stroke = finalColor;
      }
    });
    
    gridHumidityTextEls.forEach(gridHumidityTextEl => {
      gridHumidityTextEl.innerHTML = `${Math.round(humidity)}%<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">RH</span>`;
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
    });
    
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
        gridDewpointTextEl.innerHTML = `${displayStr}<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Td</span>`;
      } else {
        gridDewpointTextEl.innerHTML = `--<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Td</span>`;
      }
      if (finalColor) {
        gridDewpointTextEl.style.color = finalColor;
      }
    });
  }

  // Update the sun dial in grid cell #6 (index 5)
  function updateSunDial(data) {
    const gridSunProgressEls = document.querySelectorAll('.clockGridItem-5 .countdown-progress, .clockGridItem7-4 .countdown-progress');
    const gridSunTextEls = document.querySelectorAll('.clockGridItem-5 .grid-sun-text, .clockGridItem7-4 .grid-sun-text');
    
    // Get sunrise/sunset times (Unix timestamps)
    const today = data?.daily?.[0];
    const sunrise = today?.sunrise;
    const sunset = today?.sunset;
    const currentTemp = (data?.current?.temp !== undefined) ? data.current.temp : null;
    const tempColor = currentTemp !== null ? tempToColor(currentTemp) : null;
    
    if (typeof sunrise !== 'number' || typeof sunset !== 'number') {
      console.log('Sun dial: sunrise/sunset data unavailable');
      const circumference = 2 * Math.PI * 46;
      gridSunProgressEls.forEach(gridSunProgressEl => {
        gridSunProgressEl.style.strokeDashoffset = circumference; // hide progress
      });
      gridSunTextEls.forEach(gridSunTextEl => {
        gridSunTextEl.innerHTML = `--<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Day</span>`;
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
    
    const radius = 42.5;
    const circumference = 2 * Math.PI * radius; // ~289.0265
    
    const length = (fSunset - fSunrise) * circumference;
    const offset = fSunrise * circumference;
    
    gridSunProgressEls.forEach(gridSunProgressEl => {
      gridSunProgressEl.style.strokeDasharray = `${length} ${circumference}`;
      gridSunProgressEl.style.strokeDashoffset = -offset;
      if (tempColor) {
        gridSunProgressEl.style.stroke = tempColor;
      }
    });
    
    const celestialDotEls = document.querySelectorAll('.clockGridItem-5 .celestial-dot, .clockGridItem7-4 .celestial-dot');
    // Current time fraction over 24h
    const nowSec = (Date.now() / 1000) - midnightToday;
    const fNow = Math.max(0, Math.min(1, nowSec / 86400));
    const angleRad = fNow * 2 * Math.PI;
    const cx = 50 + radius * Math.cos(angleRad);
    const cy = 50 + radius * Math.sin(angleRad);
    const isUp = fNow >= fSunrise && fNow <= fSunset;

    celestialDotEls.forEach(celestialDotEl => {
      celestialDotEl.setAttribute('cx', cx.toFixed(3));
      celestialDotEl.setAttribute('cy', cy.toFixed(3));
      celestialDotEl.style.display = 'block';
      celestialDotEl.setAttribute('r', String(CLOCK_GRID_CELESTIAL_DOT_RADIUS));
      celestialDotEl.style.fill = isUp ? (tempColor || 'white') : '#333333';
      celestialDotEl.style.opacity = '1';
      celestialDotEl.style.strokeWidth = 'var(--grid-celestial-dot-stroke-width)';
      if (tempColor) {
        celestialDotEl.style.stroke = tempColor;
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
      gridSunTextEl.innerHTML = `${formattedTime}<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">${nextEventLabel}</span>`;
      if (tempColor) {
        gridSunTextEl.style.color = tempColor;
      }
    });
  }

  // Update the moon dial in grid cell #7 (index 6)
  function updateMoonDial(data) {
    const gridMoonProgressEls = document.querySelectorAll('.clockGridItem-6 .countdown-progress, .clockGridItem7-5 .countdown-progress');
    const gridMoonTextEls = document.querySelectorAll('.clockGridItem-6 .grid-moon-text, .clockGridItem7-5 .grid-moon-text');
    
    // Get moonrise/moonset times (Unix timestamps)
    const today = data?.daily?.[0];
    const moonrise = today?.moonrise;
    const moonset = today?.moonset;
    const currentTemp = (data?.current?.temp !== undefined) ? data.current.temp : null;
    const tempColor = currentTemp !== null ? tempToColor(currentTemp) : null;
    
    if (typeof moonrise !== 'number' || typeof moonset !== 'number') {
      console.log('Moon dial: moonrise/moonset data unavailable');
      const circumference = 2 * Math.PI * 46;
      gridMoonProgressEls.forEach(gridMoonProgressEl => {
        gridMoonProgressEl.style.strokeDashoffset = circumference; // hide progress
      });
      gridMoonTextEls.forEach(gridMoonTextEl => {
        gridMoonTextEl.innerHTML = `--<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">Moon</span>`;
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
    
    const radius = 42.5;
    const circumference = 2 * Math.PI * radius; // ~289.0265
    
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
    
    const celestialDotEls = document.querySelectorAll('.clockGridItem-6 .celestial-dot, .clockGridItem7-5 .celestial-dot');
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

    celestialDotEls.forEach(celestialDotEl => {
      celestialDotEl.setAttribute('cx', cx.toFixed(3));
      celestialDotEl.setAttribute('cy', cy.toFixed(3));
      celestialDotEl.style.display = 'block';
      celestialDotEl.setAttribute('r', String(CLOCK_GRID_CELESTIAL_DOT_RADIUS));
      celestialDotEl.style.fill = isUp ? (tempColor || 'white') : '#333333';
      celestialDotEl.style.opacity = '1';
      celestialDotEl.style.strokeWidth = 'var(--grid-celestial-dot-stroke-width)';
      if (tempColor) {
        celestialDotEl.style.stroke = tempColor;
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
      gridMoonTextEl.innerHTML = `${formattedTime}<br><span style="display: inline-block; transform: translateY(${CLOCK_GRID_INNER_LABEL_Y_OFFSET}); font-size: var(--clock-inner-label-size); opacity: 1; font-family: ${CLOCK_GRID_INNER_LABEL_FONT_FAMILY};">${nextEventLabel}</span>`;
      if (tempColor) {
        gridMoonTextEl.style.color = tempColor;
      }
    });
  }

  // Create and update the wind dots row (pill + 60 dots)
  function updateWindDotsRow(data) {
    const windSpeed = data?.current?.wind_speed || 0;
    const windGust = data?.current?.wind_gust || windSpeed;
    const currentTemp = data?.current?.temp || null;
    
    console.log(`%c[WIND TEST] Raw API Speed: ${data?.current?.wind_speed} mph | Raw API Gust: ${data?.current?.wind_gust} mph`, 'background: #222; color: #00ffff; font-size: 16px; padding: 4px;');
    
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
      
      // Insert right below the clock grid container (or fallback to refresh dots container)
      const clockGrid = document.getElementById('clock-grid-container');
      const refreshDots = document.getElementById('refresh-dots-container');
      const targetAnchor = clockGrid || refreshDots;
      if (targetAnchor && targetAnchor.parentNode) {
        targetAnchor.parentNode.insertBefore(wrapper, targetAnchor.nextSibling);
      } else {
        (document.querySelector('main.content') || document.body).appendChild(wrapper);
      }
    }
    
    // Determine trend arrow comparing current to +3 hour forecast (same as barometer)
    let trendIconHtml = '';
    if (data?.hourly && data.hourly.length >= 4 && typeof data.hourly[3].wind_speed !== 'undefined') {
      const futureWindSpeed = data.hourly[3].wind_speed;
      const diff = futureWindSpeed - windSpeed;
      const absDiff = Math.abs(diff);

      let iconClass = '';
      if (absDiff >= 10) {
        // Appreciable increase/decrease (10+ mph)
        iconClass = diff > 0 ? "fa-angles-up" : "fa-angles-down";
      } else if (absDiff >= 3) {
        // Normal increase/decrease (3 to 9 mph)
        iconClass = diff > 0 ? "fa-angle-up" : "fa-angle-down";
      } else {
        // Steady (less than 3 mph change)
        iconClass = "fa-minus";
      }

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
        console.log(`Wind: ${Math.round(windSpeed)} mph, Gusts: ${Math.round(windGust)} mph (${Math.round(windGust - windSpeed)} mph additional) - ${speedCount} to ${gustCount} of ${dots.length} dots`);
      } else {
        console.log(`Wind: ${Math.round(windSpeed)} mph, No gusts detected - ${speedCount} of ${dots.length} dots`);
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
    
    // Determine trend arrow comparing current to +3 hour forecast
    let trendIconHtml = '';
    if (data?.hourly && data.hourly.length >= 4 && typeof data.hourly[3].humidity !== 'undefined') {
      const futureHumidity = data.hourly[3].humidity;
      const diff = futureHumidity - humidity;
      const absDiff = Math.abs(diff);

      let iconClass = '';
      if (absDiff >= 15) {
        iconClass = diff > 0 ? "fa-angles-up" : "fa-angles-down"; // Appreciable change (15%+)
      } else if (absDiff >= 5) {
        iconClass = diff > 0 ? "fa-angle-up" : "fa-angle-down"; // Normal change (5-14%)
      } else {
        iconClass = "fa-minus"; // Steady
      }

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
      
      console.log(`Humidity: ${Math.round(humidity)}% (${activeCount} of ${dots.length} dots lit)`);
      
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
    
    // Determine trend arrow comparing current to +3 hour forecast
    let trendIconHtml = '';
    if (dewpoint !== null && data?.hourly && data.hourly.length >= 4 && typeof data.hourly[3].dew_point !== 'undefined') {
      const futureDewpoint = data.hourly[3].dew_point;
      const diff = futureDewpoint - dewpoint;
      const absDiff = Math.abs(diff);

      let iconClass = '';
      if (absDiff >= 6) {
        iconClass = diff > 0 ? "fa-angles-up" : "fa-angles-down"; // Appreciable change (6+ degrees)
      } else if (absDiff >= 2) {
        iconClass = diff > 0 ? "fa-angle-up" : "fa-angle-down"; // Normal change (2-5 degrees)
      } else {
        iconClass = "fa-minus"; // Steady
      }

      trendIconHtml = ` <i class="fa-solid ${iconClass}" style="opacity: 0.8; font-size: 0.8em; vertical-align: middle;"></i>`;
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
      
      console.log(`Dewpoint: ${Math.round(dewpointF)}°F (dot ${activeDotIndex} of ${dots.length})`);
      
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
      console.log('Sun position: sunrise/sunset data unavailable');
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
    
    console.log(`Sun position: sunrise=${new Date(sunrise*1000).toLocaleTimeString()}, sunset=${new Date(sunset*1000).toLocaleTimeString()}, current dot=${currentDotIndex}`);
    
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
        
        console.log(`Creating sunrise label: ${sunriseFormatted} at dot index ${sunriseDotIndex}`);
        
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
          console.log(`Sunrise label positioned centered under dot at left: ${leftPos}vw`);
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
        
        console.log(`Creating sunset label: ${sunsetFormatted} at dot index ${sunsetDotIndex}`);
        
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
          console.log(`Sunset label positioned centered under dot at left: ${leftPos}vw`);
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
      console.log('Moon position: moonrise/moonset data unavailable');
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
    
    console.log(`Moon position: moonrise=${new Date(moonrise*1000).toLocaleTimeString()}, moonset=${new Date(moonset*1000).toLocaleTimeString()}, current dot=${currentDotIndex}, moon is ${isMoonUp ? 'UP' : 'DOWN'}`);
    
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
        
        console.log(`Creating moonrise label: ${moonriseFormatted} at dot index ${moonriseDotIndex}`);
        
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
          console.log(`Moonrise label positioned centered under dot at left: ${leftPos}vw`);
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
        
        console.log(`Creating moonset label: ${moonsetFormatted} at dot index ${moonsetDotIndex}`);
        
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
          console.log(`Moonset label positioned centered under dot at left: ${leftPos}vw`);
        }
      }
    }
  }

  // update a small "last-updated" indicator in the DOM (creates it if missing)
  function updateLastUpdated(date) {
    const container = document.querySelector('main.content') || document.body;
    const id = 'weather-last-updated';
    let span = document.getElementById(id);
    
    // Format date to have lowercase am/pm and NO SECONDS
    const text = date ? date.toLocaleString('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).replace(' PM', ' pm').replace(' AM', ' am') : '';
    
    // Safely grab the timestamp injected by Vite during the build process
    const appBuildDate = typeof __APP_BUILD_DATE__ !== 'undefined' ? __APP_BUILD_DATE__ : 'Local Dev Mode';

    if (span) {
      span.innerHTML = `Weather last updated: ${text}<br>App last updated: ${appBuildDate}<br>Radar data from RainViewer • Weather data from OpenWeather`;
      span.style.fontSize = '1.6875vw';
      span.style.color = 'white';
      span.style.opacity = '1';
    } else {
      span = document.createElement('div');
      span.id = id;
      span.innerHTML = `Weather last updated: ${text}<br>App last updated: ${appBuildDate}<br>Radar data from RainViewer • Weather data from OpenWeather`;
      span.style.position = 'relative'; // Normal document flow
      span.style.margin = '0 auto'; // 0 top (earth spacer handles the 4vw above)
      span.style.paddingBottom = '4vw'; // Use padding instead of margin to prevent collapse
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
      container.appendChild(span);
    }

    // Reposition the buttons right below the last-updated element
    const btnContainer = document.getElementById('temp-format-buttons');
    if (btnContainer) {
      if (span.nextSibling !== btnContainer) {
        container.insertBefore(btnContainer, span.nextSibling);
      }
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
  function getCurrentTextColor() {
    const targetImages = [
      'desc-broken-clouds.jpg',
      'desc-clear-sky.jpg',
      'desc-few-clouds.jpg',
      'desc-fog.jpg',
      'desc-haze.jpg',
      'desc-mist.jpg',
      'desc-scattered-clouds.jpg'
    ];
    if (!currentIsNight && currentBaseFileName && targetImages.includes(currentBaseFileName)) {
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
    console.log('🔄 Time dial clicked - resetting API timer & forcing refresh...');
    
    stopAutoRefresh();
    getLocalWeather();
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
          console.log('🔄 Right circle clicked - resetting API timer & forcing refresh...');
          
          const isRadar = descImage.classList.contains('radar-mode');
          if (isRadar) {
            const applyTransition = (opacityVal) => {
              descImage.style.setProperty('transition', 'opacity 0.5s ease-out', 'important');
              descImage.style.setProperty('opacity', opacityVal, 'important');
            };
            requestAnimationFrame(() => applyTransition('0.15'));
            setTimeout(() => {
              requestAnimationFrame(() => applyTransition('1.0'));
            }, 500);
          } else {
            const applyTransition = (color) => {
              el.style.setProperty('transition', 'color 0.5s ease-out', 'important');
              el.style.setProperty('color', color, 'important');
              const spans = el.querySelectorAll('span');
              spans.forEach(span => {
                span.style.setProperty('transition', 'color 0.5s ease-out', 'important');
                span.style.setProperty('color', color, 'important');
              });
            };
            requestAnimationFrame(() => applyTransition('black'));
            setTimeout(() => {
              requestAnimationFrame(() => applyTransition(getCurrentTextColor()));
            }, 500);
          }

          stopAutoRefresh();
          getLocalWeather();
          startAutoRefresh(currentRefreshMs, autoRefreshAligned);
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
      elLeft.style.fontSize = 'var(--left-time-size, 4.37vw)'; // Made 20% bigger (from 3.64vw)
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
          console.log('🔄 Left circle clicked - resetting API timer & forcing refresh...');
          
          const isRadar = descImageLeft.classList.contains('radar-mode');
          if (isRadar) {
            const applyTransition = (opacityVal) => {
              descImageLeft.style.setProperty('transition', 'opacity 0.5s ease-out', 'important');
              descImageLeft.style.setProperty('opacity', opacityVal, 'important');
            };
            requestAnimationFrame(() => applyTransition('0.15'));
            setTimeout(() => {
              requestAnimationFrame(() => applyTransition('1.0'));
            }, 500);
          } else {
            const applyTransition = (color) => {
              elLeft.style.setProperty('transition', 'color 0.5s ease-out', 'important');
              elLeft.style.setProperty('color', color, 'important');
              const spans = elLeft.querySelectorAll('span');
              spans.forEach(span => {
                span.style.setProperty('transition', 'color 0.5s ease-out', 'important');
                span.style.setProperty('color', color, 'important');
              });
            };
            requestAnimationFrame(() => applyTransition('black'));
            setTimeout(() => {
              requestAnimationFrame(() => applyTransition(getCurrentTextColor()));
            }, 500);
          }

          stopAutoRefresh();
          getLocalWeather();
          startAutoRefresh(currentRefreshMs, autoRefreshAligned);
        });
      }
    }
  }

  let lastSimpleMonthStr = '';

  function updateSimpleMonthContent() {
    try {
      const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const days = ['sun','mon','tue','wed','thu','fri','sat'];
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
      
      const newStr = `${month}${day}${dayOfWeek}`;
      const color = getCurrentTextColor();
      
      const el = document.getElementById('simple-month');
      if (el) {
        el.style.color = color;
      }
      
      if (newStr === lastSimpleMonthStr) return; // Only update DOM if the date actually rolled over
      lastSimpleMonthStr = newStr;
      
      if (el) {
        el.innerHTML = `<span style="font-family: 'light', sans-serif; font-weight: normal; color: inherit; letter-spacing: -0.06em;">${month}</span><span style="font-family: 'bold', sans-serif; font-weight: normal; color: inherit;">${day}</span><span style="font-family: 'light', sans-serif; font-weight: normal; color: inherit; letter-spacing: -0.06em;">${dayOfWeek}</span>`;
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

  /* --- Live Earth Image (NOAA GOES satellite) --- */
  function createEarthImageIfMissing() {
    if (document.getElementById('earth-image-container')) return;
    
    const container = document.createElement('div');
    container.id = 'earth-image-container';
    container.style.width = EARTH_IMAGE_WIDTH;
    container.style.height = EARTH_IMAGE_WIDTH;  // Square container
    container.style.margin = `${EARTH_IMAGE_MARGIN_TOP} auto 0`; // Bottom margin handled by dedicated spacer to prevent collapse
    container.style.borderRadius = '50%';  // Make it circular
    container.style.overflow = 'hidden';
    container.style.clipPath = `circle(${EARTH_MASK_RADIUS} at 50% ${EARTH_MASK_POSITION_Y})`; // Strict mask to hide anti-aliasing bleed
    container.style.WebkitClipPath = `circle(${EARTH_MASK_RADIUS} at 50% ${EARTH_MASK_POSITION_Y})`; // For older iOS/Safari
    container.style.position = 'relative';
    container.style.opacity = '0'; // Hide initially to prevent center-screen flashing
    container.style.transition = 'opacity 1s ease'; // Smooth fade in
    container.style.mixBlendMode = 'lighten'; // Force container to blend with the page gradient
    // No background color - allows lighten blend mode to work with page gradient
    
    const img = document.createElement('img');
    img.id = 'earth-image';
    img.src = EARTH_IMAGE_URL;
    img.alt = 'Live Earth from GOES Satellite';
    img.style.width = '115%';
    img.style.height = '115%';
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '50%';
    img.style.transform = 'translateX(-50%)';
    img.style.objectFit = 'cover';
    img.style.mixBlendMode = 'lighten';  // Match Photoshop's "Lighten" blend mode exactly
    img.style.display = 'block';
    
    // Reload image every 5 minutes to get the latest satellite view
    setInterval(() => {
      img.src = EARTH_IMAGE_URL + '?t=' + Date.now();
    }, 5 * 60 * 1000);
    
    container.appendChild(img);
    
    // Dedicated spacer to prevent margin collapse at the bottom of the page
    const spacer = document.createElement('div');
    spacer.id = 'earth-image-spacer';
    spacer.style.height = EARTH_IMAGE_MARGIN_BOTTOM;
    spacer.style.width = '100%';
    
    // Ensure Earth goes ABOVE the Missing Assets To-Do list or Last Updated text
    const missingAssets = document.getElementById('weather-missing-assets');
    const lastUpdated = document.getElementById('weather-last-updated');
    const secondGauge = document.querySelector('.second-gauge-container');
    
    if (missingAssets && missingAssets.parentNode) {
      missingAssets.parentNode.insertBefore(container, missingAssets);
      missingAssets.parentNode.insertBefore(spacer, missingAssets);
    } else if (lastUpdated && lastUpdated.parentNode) {
      lastUpdated.parentNode.insertBefore(container, lastUpdated);
      lastUpdated.parentNode.insertBefore(spacer, lastUpdated);
    } else if (secondGauge && secondGauge.parentNode) {
      secondGauge.parentNode.insertBefore(container, secondGauge.nextSibling);
      secondGauge.parentNode.insertBefore(spacer, container.nextSibling);
    } else {
      const parent = document.querySelector('main.content') || document.body;
      parent.appendChild(container);
      parent.appendChild(spacer);
    }
  }

  // Earth image is now initialized dynamically at the end of getLocalWeather()
  // createEarthImageIfMissing();

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
    
    console.log(`🎨 Background Gradient: Hue=${randomHue}° | Color1=${c1} | Color2=${c2}`);
    
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
    console.log('Rain probabilities for next 7 days:');
    rainData.forEach((d, i) => {
      console.log(`  ${d.date}: ${(d.pop * 100).toFixed(0)}% (${(d.rain / 25.4).toFixed(2)}")`);
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
    
    const imagesContainer = document.createElement('div');
    imagesContainer.className = 'hourly-images-container';
    
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
        bar.innerHTML = `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; display: inline-flex !important; flex-direction: column; align-items: center; justify-content: center; gap: ${DUAL_HOURLY_ROW_GAP}; font-size: ${DUAL_HOURLY_FONT_SIZE} !important; line-height: ${DUAL_HOURLY_LINE_HEIGHT} !important; position: relative; top: ${DUAL_HOURLY_TOP_OFFSET}; left: ${DUAL_HOURLY_LEFT_OFFSET};"><span style="font-size: ${DUAL_HOURLY_FONT_SIZE} !important;">${tempF}</span><span style="font-size: ${DUAL_HOURLY_FONT_SIZE} !important;">${tempC}</span></span>`;
      } else {
        bar.innerHTML = `<span class="fc-mode-text" style="font-family: 'bold', sans-serif; font-size: ${HOURLY_TEMP_FONT_SIZE} !important;">${tempDisplay}</span>`;
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
          const icon = hour.weather[0].icon;
          const isNight = icon.includes('n');
          const baseFileName = 'desc-' + desc.toLowerCase().replace(/\s+/g, '-') + '.jpg';
          const imgPath = 'img/' + baseFileName;
          const nightImgPath = 'img/dark-' + baseFileName;
          const finalPath = isNight ? nightImgPath : imgPath;
          
          const imgPreload = new Image();
          imgPreload.onload = () => { imgCell.style.backgroundImage = `url('${finalPath}')`; };
          imgPreload.onerror = () => {
            const fallback = new Image();
            fallback.onload = () => { imgCell.style.backgroundImage = `url('${imgPath}')`; };
            fallback.onerror = () => { imgCell.style.backgroundImage = `url('img/desc-rem.jpg')`; };
            fallback.src = imgPath;
          };
          imgPreload.src = finalPath;
      } else {
          imgCell.style.backgroundImage = `url('img/desc-rem.jpg')`;
      }
      imagesContainer.appendChild(imgCell);
      
      // 3. Label
      const label = document.createElement('div');
      label.className = 'hourly-label';
      label.style.setProperty('font-size', HOURLY_LABEL_FONT_SIZE, 'important');
      
      const isNightLabel = hour.weather && hour.weather[0] && hour.weather[0].icon.includes('n');
      const labelColor = isNightLabel ? 'hsl(195, 90%, 45%)' : HOURLY_LABEL_COLOR;
      label.style.setProperty('color', labelColor, 'important');
      
      const dateObj = new Date(hour.dt * 1000);
      let hr = dateObj.getHours();
      const ampm = hr >= 12 ? 'p' : 'a';
      hr = hr % 12 || 12;
      
      label.innerHTML = `<span class="time-hour" style="font-family: 'bold', sans-serif; font-size: inherit !important; color: inherit !important;">${hr}</span><span class="time-ampm" style="font-family: 'light', sans-serif; font-size: inherit !important; color: inherit !important;">${ampm}</span>`;
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
    
    wrapper.appendChild(barsContainer);
    wrapper.appendChild(imagesContainer);
    wrapper.appendChild(labelsContainer);
    wrapper.appendChild(rainContainer);
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
    let dayContainer = document.querySelector('.dayContainer:not(.forecast-images-container)');
    let dayItems = document.querySelectorAll('.dayItem:not(.forecast-image-cell)');
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
      
      const hiTempDisplay = displayUnit === 'C' ? Math.round((hiTempF - 32) * 5 / 9) : hiTempF;
      const loTempDisplay = displayUnit === 'C' ? Math.round((loTempF - 32) * 5 / 9) : loTempF;

      // Calculate height percentages based on dynamic temp range
      // Map temps to ratio: tempRangeMin = 0.0, tempRangeMax = 1.0
      const range = tempRangeMax - tempRangeMin;
      const hiRatio = range > 0 ? (hiTempF - tempRangeMin) / range : 0.5;
      const loRatio = range > 0 ? (loTempF - tempRangeMin) / range : 0.5;

      // Set height, text, and color for High bars
      item.style.height = `calc(${MIN_TEMP_BAR_HEIGHT_VW}vw + (100% - ${MIN_TEMP_BAR_HEIGHT_VW}vw) * ${hiRatio})`;
      
      if (displayUnit === 'BOTH') {
        const hiTempC = Math.round((hiTempF - 32) * 5 / 9);
        item.innerHTML = `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; font-size: ${DUAL_BAR_FONT_SIZE} !important; line-height: ${DUAL_BAR_LINE_HEIGHT} !important; position: relative; top: ${DUAL_BAR_TOP_OFFSET};">${hiTempF}${formatSlash()}${hiTempC}</span>`;
      } else {
        item.innerHTML = `${hiTempDisplay}°`;
      }
      item.style.backgroundColor = tempToColor(hiTempF) || '';
      item.style.opacity = '1';

      // Set height, text, and color for Low bars
      if (loItems[index]) {
        loItems[index].style.height = `calc(${MIN_TEMP_BAR_HEIGHT_VW}vw + (100% - ${MIN_TEMP_BAR_HEIGHT_VW}vw) * ${loRatio})`;
        
        if (displayUnit === 'BOTH') {
          const loTempC = Math.round((loTempF - 32) * 5 / 9);
          loItems[index].innerHTML = `<span class="fc-mode-text" style="font-family: 'boldcond', sans-serif; font-size: ${DUAL_BAR_FONT_SIZE} !important; line-height: ${DUAL_BAR_LINE_HEIGHT} !important; position: relative; top: ${DUAL_BAR_TOP_OFFSET};">${loTempF}${formatSlash()}${loTempC}</span>`;
        } else {
          loItems[index].innerHTML = `${loTempDisplay}°`;
        }
        loItems[index].style.backgroundColor = tempToColor(loTempF) || '';
        loItems[index].style.opacity = '1';
      }

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
    
    console.log(`🎯 TEMP POINTER CALC - Current: ${currentTemp}°, Lo: ${loTemp}°, Hi: ${hiTemp}°`);
    console.log(`🎯 TEMP POINTER CALC - Temp Range: ${tempRange}°, Raw Ratio: ${ratio.toFixed(4)}`);
    console.log(`🎯 TEMP POINTER CALC - (${currentTemp} - ${loTemp}) / ${tempRange} = ${ratio.toFixed(4)}`);
    
    // Clamp ratio to 0-1 range (current temp might be outside hi/lo range)
    ratio = Math.max(0, Math.min(1, ratio));
    
    console.log(`🎯 TEMP POINTER CALC - Clamped Ratio: ${ratio.toFixed(4)}`);

    // Calculate position: start from loTop, move up by ratio * barRange
    // ratio = 0.0 means at loTop (today's low), ratio = 1.0 means at hiTop (today's high)
    const pointerY = (loTop - containerRect.top) - (ratio * barRange);

    // Position the pointer
    // EDITABLE: Position pointer so its RIGHT edge aligns with right edge of today's temperature bar
    // Calculate width directly from CSS (1.732vw) to avoid offsetWidth issues
    const pointerWidth = window.innerWidth * 0.01732; // 1.732vw in pixels
    const pointerLeft = (hiRect.right - containerRect.left) - pointerWidth;
    
    // Set position relative to dualContainer (center the pointer vertically on the calculated Y position)
    pointer.style.left = `${pointerLeft}px`;
    pointer.style.top = `${pointerY}px`;
    pointer.style.transform = 'translateY(-50%)'; // Center on the temp position
    pointer.style.opacity = '1'; // Show the pointer
    
    // Re-enable transition after a frame
    requestAnimationFrame(() => {
      pointer.style.transition = hadTransition || 'top 0.5s ease-out, opacity 0.3s ease';
    });

    console.log(`Temp pointer: current=${currentTemp}°, today's range=${loTemp}°-${hiTemp}°, ratio=${ratio.toFixed(2)}, Y=${pointerY.toFixed(1)}px, hiTop=${hiTop.toFixed(1)}, loTop=${loTop.toFixed(1)}, barRange=${barRange.toFixed(1)}`);
    console.log(`🎯 VISIBLE TEMPS - Hi Bar displays: ${hiItem.textContent}, Lo Bar displays: ${loItem.textContent}`);
  }

  // Create and update the 8 side-scrolling image cells for the 8-day forecast
  function updateForecastImages(data) {
    let container = document.querySelector('.forecast-images-container');
    
    if (!container) {
      const dayContainer = document.querySelector('.dayContainer:not(.forecast-images-container)');
      if (dayContainer && dayContainer.parentNode) {
        container = document.createElement('div');
        // Inherit the exact width and gap positioning from dayContainer
        container.className = 'forecast-images-container dayContainer';
        container.style.alignItems = 'center';
        container.style.paddingTop = '1.05vw'; /* EDITABLE: Gap above 8 forecast images (0.25vw base + 0.8vw added) */
        container.style.marginBottom = '-.5vw'; /* EDITABLE: Gap BELOW forecast images (= gap ABOVE day dates row) */
        
        for (let i = 0; i < 8; i++) {
          const cell = document.createElement('div');
          // Inherit the exact column width from dayItem
          cell.className = 'forecast-image-cell dayItem';
          cell.style.aspectRatio = '1 / 1';
          cell.style.borderRadius = '1vw';
          cell.style.backgroundImage = "url('img/desc-rem.jpg')";
          cell.style.backgroundSize = 'auto 100%';
          cell.style.backgroundRepeat = 'repeat-x';
          cell.style.backgroundPosition = '0 center';
          // Random animation delay to start each image at different scroll position
          const randomDelay = -Math.random() * WEATHER_IMAGE_SCROLL_SPEED_S;
          cell.style.setProperty('animation', `scroll-weather-bg ${WEATHER_IMAGE_SCROLL_SPEED_S}s linear infinite`, 'important'); // Endless side-scrolling like upper-right image
          cell.style.setProperty('animation-delay', `${randomDelay}s`, 'important');
          cell.style.overflow = 'hidden';
          container.appendChild(cell);
        }
        
        dayContainer.parentNode.insertBefore(container, dayContainer);
      }
    }
    
    if (!container) return;
    
    // Update the images mapping from API description
    const cells = container.querySelectorAll('.forecast-image-cell');
    const dailyData = data.daily || [];
    
    // Console report: 8-day descriptions from API
    console.log('📅 === 8-Day DAILY Weather Descriptions ===');
    dailyData.slice(0, 8).forEach((day, index) => {
      const description = day?.weather?.[0]?.description || 'N/A';
      console.log(`   Day ${index + 1}: ${description}`);
    });
    console.log('==========================================');
    
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
  async function updateCityDisplay(lat, lon) {
    const id = 'weather-city-name';
    let el = document.getElementById(id);
    
    // --- EDITABLE: City Name Display Attributes ---
    const CITY_FONT_SIZE = '5vw';
    const CITY_FONT_FAMILY = "'light', sans-serif"; // e.g., 'light', 'bold', 'Weather'
    const CITY_MARGIN_TOP = '2vw';    // Space above the city name
    const CITY_MARGIN_BOTTOM = '-4.5vw'; // Space below the city name
    const CITY_LETTER_SPACING = '-0.05vw'; // Gap between letters (e.g., '0.1vw', '-0.05vw', 'normal')

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
    
    // Apply editable styles every time to support hot-reloading tweaks
    el.style.fontFamily = CITY_FONT_FAMILY;
    el.style.fontSize = CITY_FONT_SIZE;
    el.style.marginTop = CITY_MARGIN_TOP;
    el.style.marginBottom = CITY_MARGIN_BOTTOM;
    el.style.letterSpacing = CITY_LETTER_SPACING;

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
      console.error('Error fetching city name:', e);
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
          console.log(`📡 Dynamic Radar Station resolved: ${currentRadarStation}`);
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
      console.log('📡 RainViewer: No RainViewer data cached, fallback to false.');
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
              console.log(`📡 RainViewer Info: Empty or missing tile (status ${res.status}): ${url}`);
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
            console.log(`📡 RainViewer Fetch Info: Failed to fetch tile (treating as empty): ${url}`, e);
            return null;
          }
        };

        // Safety timeout for loading the tiles (6 seconds)
        const timeoutId = setTimeout(() => {
          console.error('❌ RainViewer pixel check timed out.');
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

        console.log(`📡 RainViewer Pixel Check (Zoom ${zoomLevel} Circle): Found ${precipitationPixelCount} active pixels (Threshold is ${threshold})`);
        
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
        console.error('❌ RainViewer pixel check failed during analysis:', e);
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
      console.log(`🌧️ activeNow Check: Current weather ID ${currentId} indicates precipitation.`);
      return true;
    }

    // 2. Current rain/snow volume > 0.01mm
    const currentRain = data.current?.rain?.['1h'] || data.current?.rain || 0;
    const currentSnow = data.current?.snow?.['1h'] || data.current?.snow || 0;
    if (currentRain > 0.01 || currentSnow > 0.01) {
      console.log(`🌧️ activeNow Check: Current rain/snow volume > 0.`);
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
        console.log(`🌧️ activeNow Check: Active storm/precipitation weather alert detected.`);
        return true;
      }
    }

    return false;
  }

  async function determineRadarStatus(data) {
    if (FORCE_DOPPLER_RADAR) {
      console.log(`📡 Dynamic Radar: FORCE_DOPPLER_RADAR is enabled.`);
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
    console.log("🔍 Running radar diagnostic test...");
    if (!currentRadarStation) {
      console.error("❌ No radar station is currently resolved.");
      return;
    }
    const rawUrl = `https://radar.weather.gov/ridge/standard/${currentRadarStation}_0.gif?t=${Date.now()}`;
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}`;
    
    console.log(`📡 Fetching radar image from proxy: ${proxyUrl}`);
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
          console.error("❌ Failed to get 2D canvas context.");
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
        
        console.log(`📊 DIAGNOSTIC RESULTS for ${currentRadarStation}:`);
        console.log(`   - Cropped Area Size: 4,640 pixels`);
        console.log(`   - Base Map / Background pixels: ${baseMapPixels}`);
        console.log(`   - Precipitation / Echo pixels: ${precipPixels}`);
        console.log(`   - Configured Threshold: ${RADAR_PRECIPITATION_PIXEL_THRESHOLD}`);
        console.log(`   - Decision: ${precipPixels >= RADAR_PRECIPITATION_PIXEL_THRESHOLD ? "🔴 TRIGGER RADAR MODE" : "🟢 SHOW SCROLLING MONTH"}`);
        if (colorsSample.length > 0) {
          console.log(`   - Sample Precipitation Colors found:`, colorsSample);
        }
      } catch (e) {
        console.error("❌ Diagnostic analysis failed:", e);
      }
    };
    img.onerror = (e) => console.error("❌ Failed to load radar image for diagnostics:", e);
    img.src = proxyUrl;
  };



  async function getLocalWeather() {

  // 1. GUARD: Stop if hidden
  if (document.visibilityState === 'hidden') {
      console.log("Tab hidden, skipping weather update to save API calls.");
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
        console.log('Fetching RainViewer map data...');
        const rvRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (rvRes.ok) {
          latestRainViewerData = await rvRes.json();
          console.log('RainViewer map data fetched successfully.');
        } else {
          console.warn(`RainViewer API returned status: ${rvRes.status}`);
        }
      } catch (e) {
        console.warn('Failed to fetch RainViewer map data:', e);
      }

      // We removed the double-fetch block! The OneCall API fetches what it needs directly.
      const url = getUrl();
      console.log(`Fetching weather for LAT: ${LAT}, LON: ${LON}`);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();

      // Determine if radar mode should be active based on canvas check and/or OpenWeather data
      try {
        const radarStatus = await determineRadarStatus(data);
        SHOW_DOPPLER_RADAR_LEFT = radarStatus.left;
        SHOW_DOPPLER_RADAR_RIGHT = radarStatus.right;
        console.log(`📡 Dynamic Radar Status decided - Left: ${SHOW_DOPPLER_RADAR_LEFT ? 'ENABLED' : 'DISABLED'}, Right: ${SHOW_DOPPLER_RADAR_RIGHT ? 'ENABLED' : 'DISABLED'}`);
      } catch (e) {
        console.warn('Error determining dynamic radar status, defaulting to false:', e);
        SHOW_DOPPLER_RADAR_LEFT = false;
        SHOW_DOPPLER_RADAR_RIGHT = false;
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
      
      updateFields(data);

      // Fetch and display city name based on current LAT/LON
      updateCityDisplay(LAT, LON);

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

      // Draw the Earth image and Last Updated text last, after the grid has expanded
      createEarthImageIfMissing();

      const now = new Date();
      console.info('Weather updated:', now.toISOString());
      updateLastUpdated(now);
      
      // Smoothly fade them in now that they are safely pushed to the bottom
      setTimeout(() => {
        const earth = document.getElementById('earth-image-container');
        if (earth) earth.style.opacity = '1';
        const lastUpd = document.getElementById('weather-last-updated');
        if (lastUpd) lastUpd.style.opacity = '1';
        
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
        
        // Update visual debug overlay
        try { updateDebugPanel(data); } catch(e) {}
      }, 150);

    } catch (err) {
      console.error('Error fetching weather:', err);
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
        // schedule regular intervals after the aligned first run
        refreshTimerId = setInterval(() => {
          getLocalWeather();
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
          if (!refreshTimerId) {
            refreshTimerId = setInterval(() => {
              getLocalWeather();
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

  // Clock hands update
  function updateClockHands() {
    const container = document.querySelector('.clock-hands-container');
    const gridItem0s = document.querySelectorAll('.clockGridItem-0');
    const gridRow = document.getElementById('clock-grid-container');
    const gridRow7 = document.getElementById('clock-grid-container-7');
    const gridRow4_1 = document.getElementById('clock-grid-container-4-1');
    const gridRow4_2 = document.getElementById('clock-grid-container-4-2');
    if (!container && gridItem0s.length === 0 && !gridRow && !gridRow7 && !gridRow4_1 && !gridRow4_2) return;
    
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Hour hand: 360° / 12 hours = 30° per hour, plus gradual movement from minutes
    const hourRotation = (hours * 30) + (minutes * 0.5);
    
    // Minute hand: 360° / 60 minutes = 6° per minute, plus gradual movement from seconds
    const minuteRotation = (minutes * 6) + (seconds * 0.1);
    
    // Dynamically set clock hands to the current daily temperature color
    let currentColor = null;
    if (window.lastWeatherData && window.lastWeatherData.current && typeof window.lastWeatherData.current.temp === 'number') {
      currentColor = tempToColor(window.lastWeatherData.current.temp);
    }

    if (container) {
      container.style.setProperty('--hour-rotation', `${hourRotation}deg`);
      container.style.setProperty('--minute-rotation', `${minuteRotation}deg`);
      if (currentColor) {
        container.style.setProperty('--clock-hands-color', currentColor);
      }
    }

    // Direct JS update of Time dial hands and dot to ensure they rotate and color match
    const hourHands = document.querySelectorAll('.clockGridItem-0 .clock-hour-hand');
    const minuteHands = document.querySelectorAll('.clockGridItem-0 .clock-minute-hand');
    const centerDots = document.querySelectorAll('.clockGridItem-0 .clock-center-dot');

    hourHands.forEach(hand => {
      hand.style.transform = `translateX(-50%) rotate(${hourRotation}deg)`;
      if (currentColor) {
        hand.style.backgroundColor = currentColor;
      }
    });

    minuteHands.forEach(hand => {
      hand.style.transform = `translateX(-50%) rotate(${minuteRotation}deg)`;
      if (currentColor) {
        hand.style.backgroundColor = currentColor;
      }
    });

    centerDots.forEach(dot => {
      if (currentColor) {
        dot.style.backgroundColor = currentColor;
      }
    });

    gridItem0s.forEach(gridItem0 => {
      gridItem0.style.setProperty('--hour-rotation', `${hourRotation}deg`);
      gridItem0.style.setProperty('--minute-rotation', `${minuteRotation}deg`);
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
        <span style="font-family: 'bold', sans-serif; font-size: var(--left-time-size, 4.37vw); letter-spacing: -0.02em;">${hours}:${minutesStr}</span>
        <span style="font-family: 'light', sans-serif; font-size: var(--left-time-size, 4.37vw); letter-spacing: -0.02em;">:</span>
        <span style="font-family: 'mono', sans-serif; font-size: var(--left-seconds-size, 4.27vw); letter-spacing: -0.06em;">${secondsStr}</span>
        <span style="font-family: 'medium', sans-serif; font-size: var(--left-ampm-size, 2.93vw); margin-left: -0.05vw; letter-spacing: -0.05em;">${ampm}</span>
      </div>
    `;
  }

  function startCountdownGauge() {
    if (countdownIntervalId) clearInterval(countdownIntervalId);
    
    // Update every 100ms for smooth animation (countdown + clock hands + left circle seconds)
    countdownIntervalId = setInterval(() => {
      updateCountdownGauge();
      updateDotsCountdown();
      updateClockHands();
      updateSimpleMonthContent();
      updateLeftCircleTime();
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
  window.Weather = {
    refresh: getLocalWeather,
    setApiKey: (key) => { API_KEY = key; },
    setLatLon: (lat, lon) => { 
      // If the hardware says you are within roughly 10 miles (10 mins) of Tulsa home,
      // override your GPS with your house coords to ensure the models stay completely identical.
      if (lat > 36.00 && lat < 36.20 && lon > -96.05 && lon < -95.80) {
        console.log('📍 Geolocation in Tulsa area detected — snapping to home coordinates');
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
      const container = document.getElementById('refresh-dots-container');
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
        console.log('[Dots] Manually refreshed dot colors to:', colors.active);
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
  };

  // Attempt to get user's location, with a graceful fallback to the default.
  function initWeatherWithGeolocation() {
    if (navigator.geolocation) {
      console.log('Geolocation is available. Attempting to get user location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success! User granted permission.
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          console.log(`Geolocation success! Using Lat: ${lat}, Lon: ${lon}`);
          Weather.setLatLon(lat, lon);
          startAutoRefresh(); // Start refreshing with the new location
        },
        (error) => {
          // Error or permission denied.
          console.warn(`Geolocation failed (Code ${error.code}): ${error.message}. Falling back to default location.`);
          startAutoRefresh(); // Start refreshing with the default Tulsa location
        },
        {
          enableHighAccuracy: false, // Lower battery usage, usually good enough
          timeout: 10000,          // 10 seconds to respond
          maximumAge: 600000       // Accept a cached position up to 10 minutes old
        }
      );
    } else {
      // Geolocation is not supported by this browser.
      console.warn('Geolocation is not supported by this browser. Falling back to default location.');
      startAutoRefresh(); // Start refreshing with the default Tulsa location
    }
  }

  // Initialize placeholders immediately, then start auto-refresh
  setPlaceholders();
  if (typeof updateMissingAssetsDisplay === 'function') updateMissingAssetsDisplay(); // Show list immediately if it existed from a previous session
  initWeatherWithGeolocation();
  // Add this at the very end of your file
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("Tab is active again! Fetching fresh weather immediately.");
      getLocalWeather().then(() => {
        // Multiple repositioning attempts to ensure correct placement
        if (lastWeatherData) {
          console.log('Repositioning pointer after visibility change (attempt 1)...');
          updateTempPointer(lastWeatherData);
          
          setTimeout(() => {
            console.log('Repositioning pointer after visibility change (attempt 2)...');
            updateTempPointer(lastWeatherData);
          }, 250);
          
          setTimeout(() => {
            console.log('Repositioning pointer after visibility change (attempt 3)...');
            updateTempPointer(lastWeatherData);
          }, 600);
        }
      });
    }
  });

  // Reposition temperature pointer and wind arrow on window resize
  window.addEventListener('resize', () => {
    if (lastWeatherData) {
      // Delay to ensure DOM has settled after resize
      setTimeout(() => {
        updateTempPointer(lastWeatherData);
        // updateWindDotsRow(lastWeatherData); // Reposition wind arrow
      }, 100);
    }
  });

  // Update wind direction arrow with spin animation
  let lastWindDirection = null;

  function updateWindDirectionArrow(temp, windDeg) {
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
      const ARROW_OFFSET = -180; // Calibrated so 190° from API shows as 10° on screen
      const displayDeg = deg + ARROW_OFFSET;
      
      // Store rotation globally for reference
      currentWindArrowRotation = displayDeg;
      
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
            colorDiv.style.setProperty('--wind-rotation', `${displayDeg}deg`);
          }
          arrow.title = `Wind from ${deg}°`;
        });
      }

      // Sync the rotated wind direction hand inside grid cell #3 (index 2)
      const gridWindHands = document.querySelectorAll('.clockGridItem-2 .clock-hand-wind-direction');
      const stemColor = tempToColor(tempNum + 10) || color;
      gridWindHands.forEach(gridWindHand => {
        gridWindHand.style.transform = `translateX(-50%) rotate(${displayDeg}deg)`;
        if (stemColor) {
          gridWindHand.style.background = stemColor;
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
      console.log(`Updating wind rotation: raw=${windDeg}, parsed=${deg} deg (applying ${deg + 180} deg)`);
      overlay.style.transform = `rotate(${deg + 180}deg)`;
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