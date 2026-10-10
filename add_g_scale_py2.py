import re

js_path = '/Users/randymiller918/APPS/weather_4_0/src/js/weather.js'
with open(js_path, 'r') as f:
    js_content = f.read()

# Helper to replace cases
def replace_all(t):
    t = t.replace('Radio Blackout', 'Geomagnetic Storm')
    t = t.replace('radio-blackout', 'geomagnetic-storm')
    t = t.replace('radioBlackout', 'geomagneticStorm')
    t = t.replace('RADIO_BLACKOUT', 'GEOMAGNETIC_STORM')
    t = t.replace('R-Scale', 'G-Scale')
    t = t.replace('R_Scale', 'G_Scale')
    for i in range(6):
        t = t.replace(f'R{i}', f'G{i}')
        t = t.replace(f'r{i}', f'g{i}')
        t = t.replace(f"'R{i}'", f"'G{i}'")
        t = t.replace(f'"R{i}"', f'"G{i}"')
    t = t.replace('RADIO', 'GEOMAG')
    t = t.replace('BLACKOUT', 'STORM')
    return t

# 1. Config Block
# Search for RADIO BLACKOUT config block
r_config_match = re.search(r'(// =+[\s\n]*// 3B\. RADIO BLACKOUT.*?)(?=// =+[\s\n]*// 4\.)', js_content, re.DOTALL)
if r_config_match:
    r_config = r_config_match.group(1)
    g_config = replace_all(r_config)
    g_config = g_config.replace('3B.', '3C.')
    g_config = g_config.replace('db', 'Kp')
    js_content = js_content.replace(r_config, r_config + '\n\n' + g_config)

# 2. Props block
r_prop_match = re.search(r'(// --- Radio Blackout Dial \(JCV\) ---.*?)(?=// --- Sun & Earth Sizing Config \(JCV\) ---)', js_content, re.DOTALL)
if r_prop_match:
    r_prop = r_prop_match.group(1)
    g_prop = replace_all(r_prop)
    js_content = js_content.replace(r_prop, r_prop + '\n' + g_prop)

# 3. Component Block
r_func_match = re.search(r'(/\* --- Radio Blackout \(R-Scale\) Dial Component --- \*/.*?)(?=/\* --- Dial Refresh Cycle --- \*/)', js_content, re.DOTALL)
if r_func_match:
    r_func = r_func_match.group(1)
    g_func = replace_all(r_func)
    
    g_func = g_func.replace('pk_r_cls', 'pk_g_cls')
    g_func = g_func.replace('pk_r_val', 'pk_g_val')
    
    # Kp range updates
    g_func = g_func.replace('value: 0.2', 'value: 0.0')
    g_func = g_func.replace('value: 1.5', 'value: 5.0')
    g_func = g_func.replace('value: 2.8', 'value: 6.0')
    g_func = g_func.replace('value: 6.5', 'value: 7.0')
    g_func = g_func.replace('value: 16.0', 'value: 8.0')
    g_func = g_func.replace('value: 32.0', 'value: 9.0')
    
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
    js_content = js_content.replace(r_func, r_func + '\n' + g_func)

with open(js_path, 'w') as f:
    f.write(js_content)

