import os
import re

css_path = '/Users/randymiller918/APPS/weather_4_0/src/css/index.scss'
js_path = '/Users/randymiller918/APPS/weather_4_0/src/js/weather.js'

with open(css_path, 'r') as f:
    css_content = f.read()

# Extract radio blackout css
match = re.search(r'// Radio Blackout \(R-Scale\) Dial in Celestial Row \(JCV\)(.*?)^\.radio-blackout-sublabel \{.*?^\}', css_content, re.MULTILINE | re.DOTALL)
if match:
    radio_css = match.group(0)
    g_css = radio_css.replace('Radio Blackout (R-Scale)', 'Geomagnetic Storm (G-Scale)')
    g_css = g_css.replace('radio-blackout', 'geomagnetic-storm')
    g_css = g_css.replace('radioBlackout', 'geomagneticStorm')
    
    # Append to css
    with open(css_path, 'a') as f:
        f.write('\n\n' + g_css + '\n')
    print("Added G-Scale CSS")
else:
    print("Could not find radio blackout css")

# Now JS
with open(js_path, 'r') as f:
    js_content = f.read()

# 1. We need to add configs. We can find the radio blackout configs and duplicate them.
# 2. We need to duplicate the buildRadioBlackoutColumn and updateRadioBlackoutDial functions.
# Let's do this manually in JS using replace_file_content or a robust script.

