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
