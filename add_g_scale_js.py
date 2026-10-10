import re

js_path = '/Users/randymiller918/APPS/weather_4_0/src/js/weather.js'
with open(js_path, 'r') as f:
    js_content = f.read()

def replace_all_cases(text, old, new):
    t = text.replace(old, new)
    t = t.replace(old.upper(), new.upper())
    t = t.replace(old.lower(), new.lower())
    t = t.replace(old.replace(' ', ''), new.replace(' ', ''))
    t = t.replace('Radio Blackout', 'Geomagnetic Storm')
    t = t.replace('radio-blackout', 'geomagnetic-storm')
    t = t.replace('radioBlackout', 'geomagneticStorm')
    t = t.replace('RADIO_BLACKOUT', 'GEOMAGNETIC_STORM')
    t = t.replace('R-Scale', 'G-Scale')
    t = t.replace('R_Scale', 'G_Scale')
    
    # Scale specific changes (R0->G0, R1->G1...)
    for i in range(6):
        t = t.replace(f'R{i}', f'G{i}')
        t = t.replace(f'r{i}', f'g{i}')
        t = t.replace(f"'R{i}'", f"'G{i}'")
        t = t.replace(f'"R{i}"', f'"G{i}"')

    # Re-fix any RADIO / GEOMAGNETIC specific formatting that broke
    t = t.replace('RADIO', 'GEOMAG')
    t = t.replace('BLACKOUT', 'STORM')
    return t

# 1. Configs
config_match = re.search(r'// ===========================================================================\s*// 3B\. RADIO BLACKOUT \(R-SCALE\) DIAL CONFIGURATION \(JCV\)\s*// ===========================================================================(.*?)(?=\n// ===========================================================================\n// 4\.)', js_content, re.MULTILINE | re.DOTALL)

if config_match:
    r_config = config_match.group(0)
    g_config = replace_all_cases(r_config, 'Radio Blackout', 'Geomagnetic Storm')
    # Change "3B." to "3C."
    g_config = g_config.replace('3B.', '3C.')
    g_config = g_config.replace('RADIO BLACKOUT (R-SCALE)', 'GEOMAGNETIC STORM (G-SCALE)')
    
    # Let's adjust values so they fit G scale
    # G1 is Kp 5, G2 Kp 6, G3 Kp 7, G4 Kp 8, G5 Kp 9
    # Let's just change the unit from db to Kp
    g_config = g_config.replace('db', 'Kp')
    g_config = g_config.replace('30', '120') # Change color hue base from orange to green perhaps
    
    js_content = js_content.replace(r_config, r_config + '\n\n' + g_config)
    print("Configs added.")

# 2. Add to config setProperty function
prop_match = re.search(r'// --- Radio Blackout Dial \(JCV\) ---(.*?)// --- Sun & Earth Sizing Config \(JCV\) ---', js_content, re.MULTILINE | re.DOTALL)
if prop_match:
    r_prop = prop_match.group(0)
    g_prop = replace_all_cases(r_prop, 'Radio Blackout', 'Geomagnetic Storm')
    g_prop = g_prop.replace('radio-blackout', 'geomagnetic-storm')
    g_prop = g_prop.replace('RADIO_BLACKOUT', 'GEOMAGNETIC_STORM')
    
    # We want to insert g_prop right before '// --- Sun & Earth Sizing Config (JCV) ---'
    js_content = js_content.replace('  // --- Sun & Earth Sizing Config (JCV) ---', g_prop + '  // --- Sun & Earth Sizing Config (JCV) ---\n')
    print("Properties added.")

# 3. Add to functions
func_match = re.search(r'/\* --- Radio Blackout \(R-Scale\) Dial Component ---\ \*/(.*?)(?=\n  /\* --- Dial Refresh Cycle --- \*/)', js_content, re.MULTILINE | re.DOTALL)
if func_match:
    r_func = func_match.group(0)
    g_func = replace_all_cases(r_func, 'Radio Blackout', 'Geomagnetic Storm')
    g_func = g_func.replace('radioBlackout', 'geomagneticStorm')
    g_func = g_func.replace('pk_r_cls', 'pk_g_cls')
    g_func = g_func.replace('pk_r_val', 'pk_g_val')
    
    # Adjust mock data for G scale
    g_func = g_func.replace("value: 0.2", "value: 0.0") # G0
    g_func = g_func.replace("value: 1.5", "value: 5.0") # G1
    g_func = g_func.replace("value: 2.8", "value: 6.0") # G2
    g_func = g_func.replace("value: 6.5", "value: 7.0") # G3
    g_func = g_func.replace("value: 16.0", "value: 8.0") # G4
    g_func = g_func.replace("value: 32.0", "value: 9.0") # G5
    g_func = g_func.replace("const val = parseFloat(rValue) || 0.0;", "const val = parseFloat(rValue) || 0.0;")
    # Let's rewrite ranges for Kp [0-9] mapping to G0-G5
    new_ranges = """
    const ranges = {
      G0: { min: 0.00, max: 0.16, valMin: 0.0, valMax: 4.9 },
      G1: { min: 0.16, max: 0.33, valMin: 5.0, valMax: 5.9 },
      G2: { min: 0.33, max: 0.50, valMin: 6.0, valMax: 6.9 },
      G3: { min: 0.50, max: 0.67, valMin: 7.0, valMax: 7.9 },
      G4: { min: 0.67, max: 0.84, valMin: 8.0, valMax: 8.9 },
      G5: { min: 0.84, max: 1.00, valMin: 9.0, valMax: 9.0 }
    };
"""
    g_func = re.sub(r'const ranges = \{.*?\};', new_ranges.strip(), g_func, flags=re.DOTALL)
    
    js_content = js_content.replace(r_func, r_func + '\n\n' + g_func)
    print("Functions added.")

# 4. Inject into the DOM in place of Earth
# We need to change:
#     const rightEarth = buildEarthCircle(
#       'earth-image-container',
#       'earth-image',
#       EARTH_IMAGE_URL,
#       'Live Earth GeoColor Full Disk from NOAA GOES-19 Satellite'
#     );
#     const rightCol = buildCelestialColumn('sun-col-right', rightEarth, SUN_LABEL_RIGHT_TEXT, 'sun-label-right');
#     rightCol.classList.add('earth-column');
# To use G-scale if EARTH_IMAGE_ENABLED is false. Let's just create a new config for it manually after this.
# Instead of doing that in Python, I'll do it manually.

with open(js_path, 'w') as f:
    f.write(js_content)
    print("File saved.")
