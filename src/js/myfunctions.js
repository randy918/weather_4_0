//todo   function a(toAlert)
//todo   function c(toConsole)
//todo   function cr(toConsole)
//todo   function r(min, max)  Random integers, can be just 'max'
//todo   function getTime()--works! it is 72519.1414 format
//todo   function getCompleteDate()
//todo   function getMinute()
//todo   function getHour()
//todo   function getHour00()
//todo   function get24Hour()
//todo   function get24Hour00()
//todo   function getDay()
//todo   function getDay00()
//todo   function getMonth()
//todo   function getMonth00()
//todo   function getYear()
//todo   function getYear00()
//todo   function t()    eternal timestamp long number
//todo   function placeText(myIdClass, text)   unsure if it works?
//todo   function placeText2(myIdClass, text)   unsure if it works?
//todo   function getText(myIdClass)....brings whole line incl. tags
//todo   function getInnerText(myIdClass)
//todo   function getOuterText(myIdClass)
//todo   function addClass(myIdClass, newClass)
//todo   function removeClass(myIdClass, removeClass)
//todo   function changeBackgroundColor(myIdClass, color)
//todo   function changeTypeColor(myIdClass, color)
//todo   function changeTypeSize(myIdClass, size)
//todo   function addCSSText(myIdClass, text)

function a(toAlert) {
  alert(toAlert);
}

function c(toConsole) {
  console.log(toConsole);
}
function cw(toConsole) {
  console.warn(toConsole);
}
function ce(toConsole) {
  console.error(toConsole);
}

function cr(toConsole) {
  var styles = [
    // 'font-size: 30px',
    "color: red",
  ].join(";");
  console.log(`%c` + toConsole, styles);
}

function r(min, max) {
  // 2.0, accepts single value for 1-x
  if (max === undefined) {
    max = min;
    min = 1;
  }
  const randomNumber = min - 1 + Math.ceil(Math.random() * (max + 1 - min));
  return randomNumber;
}
// may not be a real function
function getTime() {
  var today = new Date();
  var codeMonth = today.getMonth() + 1;
  var codeDay = today.getDate();
  if (codeDay < 10) {
    codeDay = "0" + codeDay;
  }
  var codeMinute = today.getMinutes();
  var codeHour = today.getHours();
  if (codeMinute < 10) {
    codeMinute = "0" + codeMinute;
  }
  if (codeHour < 10) {
    codeHour = "0" + codeHour;
  }
  var codeYear = today.getFullYear() - 2000;
  var dateTime =
    codeMonth + "" + codeDay + "" + codeYear + "." + codeHour + "" + codeMinute;
  // document.getElementById(`timeStamp`).innerHTML = dateTime;
  t = setTimeout(function () {
    getTime();
  }, 30000);
  return dateTime;
}

function getCompleteDate() {
  const today = new Date();
  return today;
}

function getMinute() {
  const today = new Date();
  const codeMinute = today.getMinutes();
  if (codeMinute < 10) {
    codeMinute = "0" + codeMinute;
  }
  return codeMinute;
}

function getMinute00() {
  const today = new Date();
  let codeMinute = today.getMinutes();
  if (codeMinute < 10) {
    codeMinute = "0" + codeMinute;
  }
  return codeMinute;
}

function getHour() {
  const today = new Date();
  let codeHour = today.getHours();
  if (codeHour > 12) {
    codeHour = codeHour - 12;
  }
  return codeHour;
}

function getAmPm() {
  let amPm = "am";
  const today = new Date();
  let codeHour = today.getHours();
  if (codeHour > 12) {
    amPm = "pm";
  }
  return amPm;
}

function getHour00() {
  const today = new Date();
  const codeHour = today.getHours();
  if (codeHour > 12) {
    codeHour = codeHour - 12;
  }
  if (codeHour < 10) {
    codeHour = "0" + codeHour;
  }
  return codeHour;
}

function get24Hour() {
  const today = new Date();
  const codeHour = today.getHours();
  return codeHour;
}

function get24Hour00() {
  const today = new Date();
  const codeHour = today.getHours();
  if (codeHour < 10) {
    codeHour = "0" + codeHour;
  }
  return codeHour;
}

function getDayVerbal() {
  const today = new Date();
  const codeDay = today.getDay();
  return days[codeDay];
}

function getDay00() {
  const today = new Date();
  const codeDay = today.getDate();
  if (codeDay < 10) {
    codeDay = "0" + codeDay;
  }
  return codeDay;
}

function getDay() {
  const today = new Date();
  const codeDay = today.getDate();
  return codeDay;
}

function getMonthVerbal() {
  const today = new Date();
  const codeMonth = today.getMonth();
  return months[codeMonth];
}

function getMonth00() {
  const today = new Date();
  const codeMonth = today.getMonth() + 1;
  if (codeMonth < 10) {
    codeMonth = "0" + codeMonth;
  }
  return codeMonth;
}

function getMonth() {
  const today = new Date();
  const codeMonth = today.getMonth() + 1;
  return codeMonth;
}

function getYear00() {
  const today = new Date();
  const codeYear = today.getYear() - 100;
  if (codeYear < 10) {
    codeMYear = "0" + codeYear;
  }
  return codeYear;
}

function getYear() {
  const today = new Date();
  const codeYear = today.getYear() + 1900;
  return codeYear;
}

function t() {
  const now = new Date();
  eventTimestamp = now.getTime();
  // c(eventTimestamp);
  return eventTimestamp;
}
//    !  72419.1659 DOM MANIPULATION
//!
//!  placeText   element name, and text to put there--runs loosely?

function placeText(myIdClass, text) {
  const myElement = document.querySelector(myIdClass);
  myElement.innerText = text;
}
//    the function is longer than the original
// $(myIdClass).text(text)   <---works
function placeText2(myIdClass, text) {
  $(myIdClass).text(text);
}
function getText(myIdClass) {
  return document.querySelector(myIdClass);
}

function getInnerText(myIdClass) {
  return document.querySelector(myIdClass).innerHTML;
}

function getOuterText(myIdClass) {
  return document.querySelector(myIdClass).outerHTML;
}

function addClass(myIdClass, newClass) {
  document.querySelector(myIdClass).classList.add(newClass);
}

function removeClass(myIdClass, removeClass) {
  document.querySelector(myIdClass).classList.remove(removeClass);
}
// not sure what this one is for now
function containsClass(myIdClass, containsClass) {
  document.querySelector(myIdClass).classList.contains(containsClass);
}
// above, can switch and toggle  also  mmtuts YOUTUBE 29-31 USING JAVASCRIPT
function changeBackgroundColor(myId, color) {
  document.getElementById(myId).style.background = color;

  // document.querySelector(myIdClass).style.backgroundColor = color;
}

function changeTypeColor(myIdClass, color) {
  document.querySelector(myIdClass).style.color = color;
}

function changeTypeSize(myIdClass, size) {
  document.querySelector(myIdClass).style.fontSize = size;
}

function addCSSText(myIdClass, text) {
  document.querySelector(myIdClass).style.cssText = text;
}

//!  72519.1714    Common Basic VARIABLE ARRAYS
const days = new Array(
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
);
const daysMin3 = new Array(
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat"
);
const daysMin2 = new Array("Su", "Mo", "Tu", "We", "Th", "Fr", "Sa");
const daysMin1 = new Array("S", "M", "T", "W", "T", "F", "S");
const months = new Array(
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
);
const monthsMin = new Array(
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
);

function showDateTimeFormat() {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US").format(today);
  const consoleFunctioningMessage = `
Console functioning:\n${getDayVerbal()}, ${getMonthVerbal()} ${getDay()} at ${getHour()}:${getMinute00()}${getAmPm()}
  `;
  return consoleFunctioningMessage;
}
showDateTimeFormat();

console.log(`%c${showDateTimeFormat()}`, "font-size: 20px; color: gray");

//console.log("%cThis is a default font style", "color: blue; font-size: 20px");
