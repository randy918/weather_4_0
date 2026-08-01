// ==========================================
// WALLABY DEMO FILE (Safe & Isolated)
// This file does NOT affect weather.js or your real app!
// ==========================================

export function fahrenheitToCelsius(fahrenheit) {
  return ((fahrenheit - 32) * 5) / 9;
}

export function isHeavyRain(inches) {
  return inches >= 0.25;
}

// ------------------------------------------
// WALLABY LIVE INSPECTION DEMO:
// Wallaby will print live output next to //?
// ------------------------------------------
fahrenheitToCelsius(32);  //?
fahrenheitToCelsius(72);  //?
isHeavyRain(0.50);        //?
isHeavyRain(0.01);        //?
