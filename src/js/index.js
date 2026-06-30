
import _ from "https://cdn.jsdelivr.net/npm/underscore@1.13.6/modules/index-all.js";
import "../css/universal.scss";
import "../css/reset.scss";
import "../css/index.scss";
import "./weather.js";
import "./debug-console.js";


document.addEventListener("DOMContentLoaded", function () {
    // Your code here


    //>  ███████████████ OPEN WEATHER API d1a7fcdb2d6f38c6b216b37322444de9

 function r(min, max) {
        // 2.0, accepts single value for 1-x
        if (max === undefined) {
            max = min;
            min = 1;
        }
        const randomNumber = min - 1 + Math.ceil(Math.random() * (max + 1 - min));
        return randomNumber;
    }


    //>  ████████████████████████████████████  BRIGHT BACKGROUND

    // function getBrightRandomRGB() {
    //     const rrr = r(86, 255);
    //     const ggg = r(86, 255);
    //     const bbb = r(86, 255);
    //     const rgbColor = `rgb(${rrr}, ${ggg}, ${bbb})`;
    //     return rgbColor;
    // }

    // document.body.style.backgroundColor = getBrightRandomRGB();

    //>  ████████████████████████████████████  BRIGHT BACKGROUND GRADIENT

    // function getBrightRandomGradientRGB() {
    //     const rrr1 = r(86, 255);
    //     const ggg1 = r(86, 255);
    //     const bbb1 = r(86, 255);
    //     const rrr2 = r(86, 255);
    //     const ggg2 = r(86, 255);
    //     const bbb2 = r(86, 255);
    //     const rgbColor1 = `rgb(${rrr1}, ${ggg1}, ${bbb1})`;
    //     const rgbColor2 = `rgb(${rrr2}, ${ggg2}, ${bbb2})`;
    //     return [rgbColor1, rgbColor2];
    // }
    function getBrightRandomGradientRGB() {
        // Random hue in the red-purple-blue range (240 to 370 modulo 360)
        // Spans from Blue (240) -> Violet -> Magenta -> Red -> Red-Orange (10)
        const minHue = 240;
        const maxHue = 370;
        const hue = (minHue + Math.floor(Math.random() * (maxHue - minHue + 1))) % 360;
        
        // Similar saturation and lightness ranges to maintain dark aesthetic
        const saturation1 = 30 + Math.floor(Math.random() * 20); // 30-50%
        const lightness1 = 12 + Math.floor(Math.random() * 8);   // 12-20% (lighter of pair)
        
        const saturation2 = 30 + Math.floor(Math.random() * 20); // 30-50%
        const lightness2 = 3 + Math.floor(Math.random() * 6);    // 3-9% (darker of pair)
        
        const hslColor1 = `hsl(${hue}, ${saturation1}%, ${lightness1}%)`;
        const hslColor2 = `hsl(${hue}, ${saturation2}%, ${lightness2}%)`;
        
        console.log(`🎨 Body Gradient: Hue=${hue}° | Color1=${hslColor1} | Color2=${hslColor2}`);
        
        return [hslColor1, hslColor2];
    }

    const [color1, color2] = getBrightRandomGradientRGB();
    
    const initialGradient = `linear-gradient(180deg, ${color1}, ${color2})`;
    document.documentElement.style.setProperty('--gradient', initialGradient); // Feed to CSS immediately

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
    bg.style.backgroundImage = initialGradient;
    
    // Remove the buggy fixed attachment from the body so Safari can render overscrolls correctly
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundAttachment = 'scroll';
    
    // Set the iOS overscroll areas (bounce areas) to permanent black
    document.documentElement.style.backgroundColor = 'black';
    document.body.style.backgroundColor = 'transparent'; // Let HTML black show through bounce, but keep gradient visible
    
    // Apply the top color to the iOS Safari status bar (safe area)
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        document.head.appendChild(metaTheme);
    }
    metaTheme.content = 'black';

    //>  ████████████████████████████████████  DARK TITLE

    function getDarkTitleRGB() {
        const rrrt = r(45, 125);
        const gggt = r(45, 125);
        const bbbt = r(45, 125);
        const rgbColort = `rgb(${rrrt}, ${gggt}, ${bbbt})`;
        return rgbColort;
    }

    const colort = getDarkTitleRGB();
    console.table(colort); // Log the color to the console for debugging
    const h1Elements1 = document.querySelectorAll('.h1Dark');
    h1Elements1.forEach(h1 => {
        h1.style.color = colort;
    });
    //>  ████████████████████████████████████  LIGHT TITLE

    function getLightTitleRGB() {
        const rrrl = r(86, 255);
        const gggl = r(86, 255);
        const bbbl = r(86, 255);
        const rgbColorl = `rgb(${rrrl}, ${gggl}, ${bbbl})`;
        return rgbColorl;
    }

    const colorl = getLightTitleRGB();
    console.table(colort); // Log the color to the console for debugging
    const h1Elements2 = document.querySelectorAll('.h1Light');
    h1Elements2.forEach(h1 => {
        h1.style.color = colorl;
    });
    

    //_ ████████████████████████████████████  DATA STRUCTURES 

    //_ ████████████████████████████████████  DATA STRUCTURES 

    //>  ████████████████████████████████████  GENERAL PROGRAM

    //?  ████████████████████████████████████  ASYNC AWAIT














    //>  ████████████████████████████████████  GENERAL PROGRAM


    //>  ████████████████████████████████████  CITY OVERLAY BUTTON - GEOLOCATION

    // Add click handler for the city overlay button to get user's location
    const cityOverlayBtn = document.getElementById('city-overlay-btn');
    if (cityOverlayBtn) {
        cityOverlayBtn.addEventListener('click', () => {
            console.log('🔘 City overlay button clicked - requesting geolocation...');
            
            // Get the text elements
            const cityEl = document.getElementById('weather-city-name');
            const feelsLikeEl = document.getElementById('weather-feels-like');
            const descEl = document.getElementById('weather-description');
            const dupDescEl = document.getElementById('weather-description-duplicate');
            
            // Store their original colors (including all child spans)
            const getElementColors = (el) => {
                if (!el) return null;
                const spans = el.querySelectorAll('span');
                const colors = Array.from(spans).map(span => ({
                    element: span,
                    color: window.getComputedStyle(span).color
                }));
                return {
                    mainColor: window.getComputedStyle(el).color,
                    spanColors: colors
                };
            };
            
            const originalColors = {
                city: getElementColors(cityEl),
                feelsLike: getElementColors(feelsLikeEl),
                desc: getElementColors(descEl),
                dupDesc: getElementColors(dupDescEl)
            };
            
            // Function to fade elements and their children to black
            const fadeToBlack = () => {
                const applyTransition = (el) => {
                    if (!el) return;
                    // Set transition on main element
                    el.style.setProperty('transition', 'color 0.5s ease-out', 'important');
                    el.style.setProperty('color', 'black', 'important');
                    
                    // Set transition on all child spans
                    const spans = el.querySelectorAll('span');
                    spans.forEach(span => {
                        span.style.setProperty('transition', 'color 0.5s ease-out', 'important');
                        span.style.setProperty('color', 'black', 'important');
                    });
                };
                
                // Use requestAnimationFrame to ensure smooth transitions
                requestAnimationFrame(() => {
                    applyTransition(cityEl);
                    applyTransition(feelsLikeEl);
                    applyTransition(descEl);
                    applyTransition(dupDescEl);
                });
            };
            
            // Function to fade back to original colors
            const fadeToOriginal = () => {
                const restoreColors = (el, colorData) => {
                    if (!el || !colorData) return;
                    
                    // Restore main element color
                    el.style.setProperty('transition', 'color 0.5s ease-out', 'important');
                    el.style.setProperty('color', colorData.mainColor, 'important');
                    
                    // Restore span colors
                    colorData.spanColors.forEach(({ element, color }) => {
                        element.style.setProperty('transition', 'color 0.5s ease-out', 'important');
                        element.style.setProperty('color', color, 'important');
                    });
                };
                
                // Use requestAnimationFrame to ensure smooth transitions
                requestAnimationFrame(() => {
                    restoreColors(cityEl, originalColors.city);
                    restoreColors(feelsLikeEl, originalColors.feelsLike);
                    restoreColors(descEl, originalColors.desc);
                    restoreColors(dupDescEl, originalColors.dupDesc);
                });
            };
            
            // Start fading to black
            fadeToBlack();
            
            if (navigator.geolocation) {
                // Get current location before fetching new one
                const currentLocation = window.Weather ? window.Weather.getLatLon() : null;
                const currentLat = currentLocation ? currentLocation.lat : null;
                const currentLon = currentLocation ? currentLocation.lon : null;
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        // Success! User granted permission (or already had it).
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        console.log(`✅ Geolocation success! Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
                        
                        // Check if location is the same (within ~0.01 degrees, about 1km)
                        const isSameLocation = currentLat && currentLon &&
                            Math.abs(lat - currentLat) < 0.01 &&
                            Math.abs(lon - currentLon) < 0.01;
                        
                        if (isSameLocation) {
                            console.log('📍 Already at this location - fading back to original colors');
                            // Fade back to original colors after a brief moment
                            setTimeout(fadeToOriginal, 500);
                        } else {
                            console.log('📍 New location detected - updating weather data');
                            // Update the weather location and refresh
                            if (window.Weather) {
                                window.Weather.setLatLon(lat, lon);
                                window.Weather.refresh();
                                console.log('🌤️  Weather data refreshed with your location');
                            }
                            // Colors will update naturally when new weather data loads
                        }
                    },
                    (error) => {
                        // Error or permission denied - fade back to original
                        console.warn(`❌ Geolocation failed (Code ${error.code}): ${error.message}`);
                        fadeToOriginal();
                        
                        // Provide more specific error messages
                        let errorMsg = 'Unable to get your location.';
                        if (error.code === 1) {
                            errorMsg = 'Location access denied. Please enable location in Settings > Safari > Location Services.';
                        } else if (error.code === 2) {
                            errorMsg = 'Location unavailable. Please check your connection and try again.';
                        } else if (error.code === 3) {
                            errorMsg = 'Location request timed out. Please try again.';
                        }
                        console.log('Full error details:', error);
                        alert(errorMsg);
                    },
                    {
                        enableHighAccuracy: true,  // Get the most accurate location
                        timeout: 30000,            // 30 seconds to respond (tablets can be slower)
                        maximumAge: 5000           // Accept cached position up to 5 seconds old
                    }
                );
            } else {
                console.warn('❌ Geolocation is not supported by this browser.');
                fadeToOriginal();
                alert('Geolocation is not supported by your browser.');
            }
        });
    }


    








})





// console.log(document.documentElement);

//< ████████████████████████████████████  MISC
