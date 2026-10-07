<?php
echo "<h3>🤖 SKY ROBOT MANUAL TRIGGER</h3>";
echo "<p>Running Python script now...</p>";
echo "<div style='background: #111; color: #0f0; padding: 20px; font-family: monospace; border-radius: 8px;'>";

// Execute the python script and capture ALL output (including errors)
$output = shell_exec('/usr/bin/python3 sky_robot.py 2>&1');

echo "<pre>$output</pre>";
echo "</div>";
echo "<p>✅ Finished!</p>";
?>
