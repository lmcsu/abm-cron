"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") { return Array.from(iter); } }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

(function () {
  // cron units ids
  var CRON_SECONDS_ID = 0;
  var CRON_MINUTES_ID = 1;
  var CRON_HOURS_ID = 2;
  var CRON_DATES_ID = 3;
  var CRON_MONTHS_ID = 4;
  var CRON_DAYS_ID = 5;
  var CRON_YEARS_ID = 6; // cron units

  var CRON_UNITS = [{
    // seconds
    min: 0,
    max: 59,
    defaultValue: '0'
  }, {
    // minutes
    min: 0,
    max: 59,
    defaultValue: '0'
  }, {
    // hours
    min: 0,
    max: 23,
    defaultValue: '0'
  }, {
    // dates / month days
    min: 1,
    max: 31,
    defaultValue: '*'
  }, {
    // months
    min: 1,
    max: 12,
    defaultValue: '*',
    alt: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    lengths: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  }, {
    // days / week days
    min: 0,
    max: 6,
    defaultValue: '*',
    alt: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    sundayFix: true
  }, {
    // years
    min: 1970,
    max: 2099,
    defaultValue: '*'
  }]; // list of units for counting, excluding week days because they don't affect the other units

  var CRON_UNITS_ORDERED = [CRON_SECONDS_ID, CRON_MINUTES_ID, CRON_HOURS_ID, CRON_DATES_ID, CRON_MONTHS_ID, CRON_YEARS_ID]; // converting state to Date

  var stateToDate = function stateToDate(state) {
    var date = new Date(0);
    date.setUTCFullYear(state[CRON_YEARS_ID]);
    date.setUTCMonth(state[CRON_MONTHS_ID] - 1);
    date.setUTCDate(state[CRON_DATES_ID]);
    date.setUTCHours(state[CRON_HOURS_ID]);
    date.setUTCMinutes(state[CRON_MINUTES_ID]);
    date.setUTCSeconds(state[CRON_SECONDS_ID]);
    return date;
  }; // converting Date to state


  var dateToState = function dateToState(date) {
    return [date.getUTCSeconds(), date.getUTCMinutes(), date.getUTCHours(), date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCDay(), date.getUTCFullYear()];
  }; // cron expression parser


  var parse = function parse(str) {
    // filling array by range of values
    var fillRange = function fillRange(from, to) {
      var result = [];

      for (var i = from; i <= to; i++) {
        result.push(i);
      }

      return result;
    }; // single item parsing


    var parseItem = function parseItem(item, unitId) {
      var unit = CRON_UNITS[unitId]; // splitting string by the increment symbol

      var pair = item.split('/');

      if (pair.length > 2) {
        throw new Error("Incorrect incrementation \"".concat(item, "\""));
      }

      var value = pair[0] === '*' ? unit.min + '-' + unit.max : pair[0];
      var step = pair.length > 1 ? parseInt(pair[1], 10) : null;

      if (step !== null && (isNaN(step) || step < 1)) {
        throw new Error("Incorrect increment value \"".concat(pair[1], "\""));
      } // preparing map for alternative values


      var altMap = {};

      if (unit.alt) {
        for (var i = 0; i < unit.alt.length; i++) {
          altMap[unit.alt[i]] = i + unit.min;
        }
      } // parsing single value/number


      var parseNumber = function parseNumber(num) {
        var result = num;
        var alt = num.toUpperCase();

        if (typeof altMap[alt] !== 'undefined') {
          result = altMap[alt];
        }

        result = parseInt(result, 10);

        if (isNaN(result)) {
          throw new Error("Incorrect value \"".concat(num, "\""));
        }

        return result;
      }; // parsing ranges/values


      var parsed;
      var minRange = null;
      var maxRange = null;
      var parts = value.split('-');

      if (parts.length > 0) {
        minRange = parseNumber(parts[0]);
      }

      if (parts.length === 1) {
        parsed = [minRange];
      } else if (parts.length === 2) {
        maxRange = parseNumber(parts[1]);

        if (maxRange < minRange) {
          throw new Error("The max value is less than the min value in range \"".concat(value, "\""));
        }

        parsed = fillRange(minRange, maxRange);
      } else {
        throw new Error("Incorrect range \"".concat(value, "\""));
      } // increment


      if (step !== null) {
        // if there's no range, then filling array to the max value
        if (maxRange === null) {
          parsed = fillRange(minRange, unit.max);
        } // removing values that don't fit the increment step


        parsed = parsed.filter(function (v) {
          return (v - minRange) % step === 0;
        });
      } // if week days, trying to fix sunday


      if (unit.sundayFix) {
        var _a = parsed;

        var _f = function _f(v) {
          return v === 7 ? 0 : v;
        };

        var _r = [];

        for (var _i = 0; _i < _a.length; _i++) {
          _r.push(_f(_a[_i], _i, _a));
        }

        parsed = _r;
      }

      return parsed;
    }; // value parsing


    var parseValue = function parseValue(value, unitId) {
      var _ref;

      var unit = CRON_UNITS[unitId];

      var _a2 = value.split(',');

      var _f2 = function _f2(item) {
        var r = [unit.min];

        try {
          r = parseItem(item, unitId);
        } catch (e) {
          console.error("Parse error \"".concat(value, "\": ").concat(e.message));
        }

        return r;
      };

      var _r2 = [];

      for (var _i2 = 0; _i2 < _a2.length; _i2++) {
        _r2.push(_f2(_a2[_i2], _i2, _a2));
      }

      var result = _r2; // merging arrays

      result = (_ref = []).concat.apply(_ref, _toConsumableArray(result)); // removing duplicates

      var unique = [];
      var _a3 = result;

      var _f3 = function _f3(i) {
        if (unique.indexOf(i) < 0) {
          unique.push(i);
        }
      };

      for (var _i3 = 0; _i3 < _a3.length; _i3++) {
        _f3(_a3[_i3], _i3, _a3);
      }

      undefined;
      result = unique; // sorting

      result = result.sort(function (a, b) {
        return a - b;
      }); // out of bounds checking

      var minValue = result[0];
      var maxValue = result[result.length - 1];
      var outOfRange = null;

      if (minValue < unit.min) {
        outOfRange = minValue;
      } else if (maxValue > unit.max) {
        outOfRange = maxValue;
      }

      if (outOfRange !== null) {
        console.error("Value is out of bounds \"".concat(outOfRange, "\" in \"").concat(value, "\""));
      }

      return result;
    }; // splitting values by spaces


    var values = str.replace(/\s+/g, ' ').trim().split(' '); // if there's no enough values, adding defaults

    for (var i = CRON_UNITS.length - 1 - values.length - 1; i >= 0; i--) {
      values.unshift(CRON_UNITS[i].defaultValue);
    } // adding years, if not defined


    if (values.length === CRON_UNITS.length - 1) {
      values.push(CRON_UNITS[CRON_YEARS_ID].defaultValue);
    } // parsing values and returning arrays


    var _a4 = values;

    var _f4 = function _f4(value, unitId) {
      return parseValue(value, unitId);
    };

    var _r4 = [];

    for (var _i4 = 0; _i4 < _a4.length; _i4++) {
      _r4.push(_f4(_a4[_i4], _i4, _a4));
    }

    return _r4;
  }; // the function finds the nearest time of run of parsed expression


  var nearestRun = function nearestRun(exp) {
    var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var backward = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    // filling state
    var current = timestamp === null ? new Date() : new Date(timestamp); // start date

    var state = dateToState(current); // setting day of week, according to values in state

    var setDayOfWeek = function setDayOfWeek() {
      var date = new Date();
      date.setUTCFullYear(state[CRON_YEARS_ID]);
      date.setUTCMonth(state[CRON_MONTHS_ID] - 1);
      date.setUTCDate(state[CRON_DATES_ID]);
      state[CRON_DAYS_ID] = date.getDay();
    }; // checking if year is leap year


    var isLeapYear = function isLeapYear(year) {
      return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
    }; // returns the max month length


    var getMonthMaxLength = function getMonthMaxLength(month, year) {
      var result = CRON_UNITS[CRON_MONTHS_ID].lengths[month - CRON_UNITS[CRON_MONTHS_ID].min];

      if (month === 2 && isLeapYear(year)) {
        result++;
      }

      return result;
    }; // checking if current unit value fits the expression


    var compared = function compared(unitId) {
      return exp[unitId].indexOf(state[unitId]) !== -1;
    }; // fixing state values if they are out of their bounds


    var stateFixBounds = function stateFixBounds() {
      var fromId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : CRON_YEARS_ID;

      for (var i = CRON_UNITS_ORDERED.indexOf(fromId); i < CRON_UNITS_ORDERED.length; i++) {
        var id = CRON_UNITS_ORDERED[i];
        var unit = CRON_UNITS[id];
        var idNext = id === CRON_YEARS_ID ? false : CRON_UNITS_ORDERED[i + 1];
        var min = unit.min;
        var max = id === CRON_DATES_ID ? getMonthMaxLength(state[CRON_MONTHS_ID], state[CRON_YEARS_ID]) : unit.max;
        var isMin = state[id] < min;
        var isMax = state[id] > max;

        if (isMin || isMax) {
          if (id === CRON_YEARS_ID) {
            return false;
          }

          var value = isMin ? max : min;

          if (isMin && id === CRON_DATES_ID) {
            value = 'MAX';
          }

          state[id] = value;

          if (idNext !== false) {
            state[idNext] += isMin ? -1 : 1;
          }
        } else {
          break;
        }
      }

      if (state[CRON_DATES_ID] === 'MAX') {
        state[CRON_DATES_ID] = getMonthMaxLength(state[CRON_MONTHS_ID], state[CRON_YEARS_ID]);
      }

      return true;
    }; // adding one to given unit in state


    var stateAdd = function stateAdd(unitId) {
      state[unitId] += backward ? -1 : 1;

      for (var i = CRON_UNITS_ORDERED.indexOf(unitId) - 1; i >= 0; i--) {
        var id = CRON_UNITS_ORDERED[i];
        var unit = CRON_UNITS[id];
        var value = backward ? unit.max : unit.min;

        if (backward && id === CRON_DATES_ID) {
          value = getMonthMaxLength(state[CRON_MONTHS_ID], state[CRON_YEARS_ID]);
        }

        state[id] = value;
      }

      return true;
    }; // searching values in state


    var stateSearch = function stateSearch(unitId) {
      var searchNext = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var min = CRON_UNITS[unitId].min;
      var max = CRON_UNITS[unitId].max;

      if (!backward && unitId === CRON_DATES_ID) {
        max = getMonthMaxLength(state[CRON_MONTHS_ID], state[CRON_YEARS_ID]);
      }

      var i = state[unitId];
      var isNext = !searchNext;

      while (i >= min && i <= max) {
        if (isNext && compared(unitId)) {
          return true;
        }

        i += backward ? -1 : 1;
        stateAdd(unitId);
        isNext = true;
      }

      return false;
    }; // seeking for nearest time that fits the expression


    var findTime = function findTime() {
      var searchNextHours = false;

      while (stateSearch(CRON_HOURS_ID, searchNextHours)) {
        var searchNextMinutes = false;

        while (stateSearch(CRON_MINUTES_ID, searchNextMinutes)) {
          if (stateSearch(CRON_SECONDS_ID)) {
            return true;
          }

          searchNextMinutes = true;
        }

        searchNextHours = true;
      }

      return false;
    }; // seeking for nearest date that fits the expression


    var findDate = function findDate() {
      var searchNextYears = false;

      while (stateSearch(CRON_YEARS_ID, searchNextYears)) {
        var searchNextMonths = false;

        while (stateSearch(CRON_MONTHS_ID, searchNextMonths)) {
          var searchNextDays = false;

          while (stateSearch(CRON_DATES_ID, searchNextDays)) {
            setDayOfWeek();

            if (compared(CRON_DAYS_ID)) {
              return true;
            }

            searchNextDays = true;
          }

          searchNextMonths = true;
        }

        searchNextYears = true;
      }

      return false;
    }; // seeking the date


    if (!findDate()) {
      // if no date found
      return false;
    } // if the time has not come yet, trying to seek from the next day


    if (!findTime()) {
      stateAdd(CRON_DATES_ID);

      if (!stateFixBounds(CRON_DATES_ID)) {
        // if the year is out of the bounds
        return false;
      }

      if (!findDate()) {
        // if no date found
        return false;
      }

      findTime();
    }

    return state;
  }; // finds milliseconds before or after the nearest run


  var nearestRunTime = function nearestRunTime(exp) {
    var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var backward = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    var current = timestamp === null ? new Date() : new Date(timestamp); // start date
    // getting state

    var state = nearestRun(exp, timestamp, backward);

    if (state === false) {
      return false;
    }

    var foundDate = stateToDate(state);
    return Math.abs(foundDate.getTime() - current.getTime());
  }; // finds the lats time of run of parsed expression


  var lastRun = function lastRun(exp) {
    var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var state = nearestRun(exp, timestamp, true);
    return state === false ? false : stateToDate(state);
  }; // finds the next time of run of parsed expression


  var nextRun = function nextRun(exp) {
    var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var state = nearestRun(exp, timestamp, false);
    return state === false ? false : stateToDate(state);
  }; // finds milliseconds after the last run


  var lastRunElapsed = function lastRunElapsed(exp) {
    var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    return nearestRunTime(exp, timestamp, true);
  }; // finds milliseconds before the next run


  var nextRunRemains = function nextRunRemains(exp) {
    var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    return nearestRunTime(exp, timestamp, false);
  }; // checking if given timestamp fits given parsed expression


  var fits = function fits(exp) {
    var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var state = dateToState(timestamp === null ? new Date() : new Date(timestamp));
    var result = true;

    for (var i = 0; i < state.length; i++) {
      if (exp[i].indexOf(state[i]) === -1) {
        result = false;
        break;
      }
    }

    return result;
  }; // exporting


  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports.parse = parse;
    module.exports.lastRun = lastRun;
    module.exports.nextRun = nextRun;
    module.exports.lastRunElapsed = lastRunElapsed;
    module.exports.nextRunRemains = nextRunRemains;
    module.exports.fits = fits;
  } else {
    window.abmCron = {
      parse: parse,
      lastRun: lastRun,
      nextRun: nextRun,
      lastRunElapsed: lastRunElapsed,
      nextRunRemains: nextRunRemains,
      fits: fits
    };
  }
})();