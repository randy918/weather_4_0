# Workspace Rules - Doppler Radar Presentation

When displaying RainViewer Doppler radar data in this workspace, follow these constraints:

1. **Separated Stacking Contexts (HUD style)**:
   - Apply `mix-blend-mode: lighten;` directly to the parent circular container (e.g. `#weather-desc-image.radar-mode`), keeping its background transparent (`background-color: transparent; background-image: none; animation: none;`). This blends the radar map features and echoes smoothly over the dark purple page background.
   - Separate the base map tiles (CartoDB dark matter) and RainViewer echoes into two elements: a static `.radar-map-bg` (at `z-index: 1`) and the animating `.radar-frame` (at `z-index: 2`), ensuring the base map roads and text remain perfectly sharp and crisp.

2. **Approved Clean Storm Core Isolation Filter**:
   - Apply the following SVG filter ONLY to the animating `.radar-frame` layer to isolate yellow, orange, red, and pink/violet storm cores and remove all ground clutter/noise, blue haze, and green halos:
     ```xml
     <filter id="remove-blue-haze" color-interpolation-filters="sRGB">
       <feColorMatrix type="matrix" values="
         1   0   0   0   0
         0   1   0   0   0
         0   0   1   0   0
         3.0 3.0 -5.0 1.0 -0.1
       "/>
       <feComponentTransfer>
         <feFuncA type="linear" slope="10" intercept="-4"/>
       </feComponentTransfer>
     </filter>
     ```

3. **No Dilation/Morphology**:
   - Avoid using `<feMorphology>` dilate/erode or other pixel-expanding filters on the radar layers, as they cause blocky, aliased, pixelated shapes and distort color channels (causing colors like white/pink to swallow red/yellow).

4. **Subtle Map Details**:
   - Set the `.radar-map-bg` opacity to a subtle level (e.g. `0.15`) so that base map county lines and labels remain perfectly sharp and readable, but are faint enough not to clutter the screen or distract from the storm cores.

5. **Smooth Sweep Line (iPad/Safari optimization)**:
   - Always animate the `.radar-sweep-line` rotation using CSS `@keyframes` rather than high-frequency JS timers (`requestAnimationFrame` or short `setInterval` intervals). This keeps animation on the GPU compositor thread and prevents WebKit from throttling the rotation to a freeze during idle periods.
   - Set a solid color background on the `.radar-sweep-line` (rather than a linear-gradient) to prevent subpixel antialiasing distortion or wobblying during WebKit rotation.
   - Synchronize the CSS animation inline in JS when initiating the loop by resetting it (e.g., toggling `style.animation = 'none'`, forcing offsetWidth reflow, and setting `style.animation = ...` with the correct duration).

6. **Preserve Radar Sizing, Zoom, and Offsets**:
   - Never alter the zoom constants (`RAINVIEWER_ZOOM_LEFT`, `RAINVIEWER_ZOOM_RIGHT`, `RADAR_ZOOM_LEFT`, `RADAR_ZOOM_RIGHT`) or circle coverage diameters (e.g., `RADAR_INNER_CIRCLE_DIAMETER`), as these are calibrated to ensure the coordinate ratios and maps line up perfectly.

7. **Mundane & Readable Coding Style**:
   - Keep JS, CSS, and HTML simple, direct, and readable.
   - Avoid over-engineering, complex abstractions, or unnecessary hidden logic.
   - Use straightforward JS constants, CSS variables, and clean DOM manipulation that the user can easily read, tweak, and edit manually.
   - Never run `git commit` or modifying Git commands automatically; leave file changes uncommitted on disk for the user to review and commit on their timeline.

8. **Dual Desktop & Mobile Config Constants**:
   - Whenever creating or updating UI layout & typography parameters, ALWAYS provide explicit `_DESKTOP` and `_MOBILE` constant pairs (e.g. `FEATURE_WIDTH_DESKTOP`, `FEATURE_WIDTH_MOBILE`, `FEATURE_FONT_SIZE_DESKTOP`, `FEATURE_FONT_SIZE_MOBILE`).
   - This allows the user to easily read, tweak, and edit separate numbers for desktop and mobile right in the JS/CSS config section.
