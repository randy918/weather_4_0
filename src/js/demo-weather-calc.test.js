// ==========================================
// WALLABY DEMO TEST FILE (Safe & Isolated)
// ==========================================
import assert from 'node:assert';
import { fahrenheitToCelsius, isHeavyRain } from './demo-weather-calc.js';

// Test 1: Temperature conversion
assert.strictEqual(fahrenheitToCelsius(32), 0);
assert.strictEqual(fahrenheitToCelsius(212), 100);

// Test 2: Rain threshold
assert.strictEqual(isHeavyRain(0.50), true);
assert.strictEqual(isHeavyRain(0.01), false);
