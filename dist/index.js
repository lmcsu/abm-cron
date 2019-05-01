"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

// идентификаторы юнитов крона
var CRON_SECONDS_ID = 0;
var CRON_MINUTES_ID = 1;
var CRON_HOURS_ID = 2;
var CRON_DATES_ID = 3;
var CRON_MONTHS_ID = 4;
var CRON_DAYS_ID = 5;
var CRON_YEARS_ID = 6; // юниты крона

var CRON_UNITS = [{
  // секунды
  min: 0,
  max: 59,
  defaultValue: '0'
}, {
  // минуты
  min: 0,
  max: 59,
  defaultValue: '0'
}, {
  // часы
  min: 0,
  max: 23,
  defaultValue: '0'
}, {
  // дни месяца
  min: 1,
  max: 31,
  defaultValue: '*'
}, {
  // месяцы
  min: 1,
  max: 12,
  defaultValue: '*',
  alt: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  lengths: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
}, {
  // дни недели
  min: 0,
  max: 6,
  defaultValue: '*',
  alt: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  sundayFix: true
}, {
  // годы
  min: 1970,
  max: 2099,
  defaultValue: '*'
}]; // порядковые юниты

var CRON_UNITS_ORDERED = [CRON_SECONDS_ID, CRON_MINUTES_ID, CRON_HOURS_ID, CRON_DATES_ID, CRON_MONTHS_ID, CRON_YEARS_ID]; // функция конвертирует state в Date

var stateToDate = function stateToDate(state) {
  var date = new Date(0);
  date.setUTCFullYear(state[CRON_YEARS_ID]);
  date.setUTCMonth(state[CRON_MONTHS_ID] - 1);
  date.setUTCDate(state[CRON_DATES_ID]);
  date.setUTCHours(state[CRON_HOURS_ID]);
  date.setUTCMinutes(state[CRON_MINUTES_ID]);
  date.setUTCSeconds(state[CRON_SECONDS_ID]);
  return date;
}; // функция конвертирует Date в state


var dateToState = function dateToState(date) {
  return [date.getUTCSeconds(), date.getUTCMinutes(), date.getUTCHours(), date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCDay(), date.getUTCFullYear()];
}; // функция парсинга cron-выражения


var parse = function parse(str) {
  // заполнение массива по диапазону значений
  var fillRange = function fillRange(from, to) {
    var result = [];

    for (var i = from; i <= to; i++) {
      result.push(i);
    }

    return result;
  }; // функция парсинга частей значений


  var parseChunk = function parseChunk(chunk, unitId) {
    var unit = CRON_UNITS[unitId]; // разбиваем строку по знаку приращения

    var pair = chunk.split('/');

    if (pair.length > 2) {
      throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u043F\u0440\u0438\u0440\u0430\u0449\u0435\u043D\u0438\u0435 \"".concat(chunk, "\""));
    }

    var value = pair[0] === '*' ? unit.min + '-' + unit.max : pair[0];
    var step = pair.length > 1 ? parseInt(pair[1], 10) : null;

    if (step !== null && (isNaN(step) || step < 1)) {
      throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043A\u043E\u044D\u0444\u0444\u0438\u0446\u0438\u0435\u043D\u0442 \u043F\u0440\u0438\u0440\u0430\u0449\u0435\u043D\u0438\u044F \"".concat(pair[1], "\""));
    } // подготавливаем карту для альтернативных значений


    var altMap = {};

    if (unit.alt) {
      for (var i = 0; i < unit.alt.length; i++) {
        altMap[unit.alt[i]] = i + unit.min;
      }
    } // функция для считывания значения


    var parseNumber = function parseNumber(num) {
      var result = num;
      var alt = num.toUpperCase();

      if (typeof altMap[alt] !== 'undefined') {
        result = altMap[alt];
      }

      result = parseInt(result, 10);

      if (isNaN(result)) {
        throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \"".concat(num, "\""));
      }

      return result;
    }; // считываем диапазоны, либо сами значения


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
        throw new Error("\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430 \u043C\u0435\u043D\u044C\u0448\u0435, \u0447\u0435\u043C \u043C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0435 \"".concat(value, "\""));
      }

      parsed = fillRange(minRange, maxRange);
    } else {
      throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \"".concat(value, "\""));
    } // приращение


    if (step !== null) {
      // если нет диапазона, заполняем до максимума
      if (maxRange === null) {
        parsed = fillRange(minRange, unit.max);
      } // вычищаем значения, не подходящие по шагу


      parsed = parsed.filter(function (v) {
        return (v - minRange) % step === 0;
      });
    } // если дни недели, фиксим воскресенье


    if (unit.sundayFix) {
      parsed = parsed.map(function (v) {
        return v === 7 ? 0 : v;
      });
    }

    return parsed;
  }; // функция парсинга значений


  var parseValue = function parseValue(value, unitId) {
    var _ref;

    var unit = CRON_UNITS[unitId];
    var result = value.split(',').map(function (chunk) {
      var r = [unit.min];

      try {
        r = parseChunk(chunk, unitId);
      } catch (e) {
        console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430 \"".concat(value, "\": ").concat(e.message));
      }

      return r;
    }); // объединяем массивы

    result = (_ref = []).concat.apply(_ref, _toConsumableArray(result)); // удаляем дубли

    var unique = [];
    result.forEach(function (i) {
      if (unique.indexOf(i) < 0) {
        unique.push(i);
      }
    });
    result = unique; // сортируем

    result = result.sort(function (a, b) {
      return a - b;
    }); // проверяем, выходит ли за пределы возможных значений

    var minValue = result[0];
    var maxValue = result[result.length - 1];
    var outOfRange = null;

    if (minValue < unit.min) {
      outOfRange = minValue;
    } else if (maxValue > unit.max) {
      outOfRange = maxValue;
    }

    if (outOfRange !== null) {
      console.error("\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0445 \"".concat(outOfRange, "\" \u0432 \"").concat(value, "\""));
    }

    return result;
  }; // разделяем значения по пробелам


  var values = str.replace(/\s+/g, ' ').trim().split(' '); // если недостаточно значений, прибавляем дефолтные

  for (var i = CRON_UNITS.length - 1 - values.length - 1; i >= 0; i--) {
    values.unshift(CRON_UNITS[i].defaultValue);
  } // добавляем год, если нету


  if (values.length === CRON_UNITS.length - 1) {
    values.push(CRON_UNITS[CRON_YEARS_ID].defaultValue);
  } // парсим значения и возвращаем массивы


  return values.map(function (value, unitId) {
    return parseValue(value, unitId);
  });
}; // функция поиска ближайшего совпадения времени спарсенного cron-выражения


var nearestRun = function nearestRun(exp) {
  var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var backward = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  // заполняем state
  var current = timestamp === null ? new Date() : new Date(timestamp); // дата отсчёта

  var state = dateToState(current); // функция устанавливает день недели в state, согласно дате в нём

  var setDayOfWeek = function setDayOfWeek() {
    var date = new Date();
    date.setUTCFullYear(state[CRON_YEARS_ID]);
    date.setUTCMonth(state[CRON_MONTHS_ID] - 1);
    date.setUTCDate(state[CRON_DATES_ID]);
    state[CRON_DAYS_ID] = date.getDay();
  }; // функция проверки, является ли год високосным


  var isLeapYear = function isLeapYear(year) {
    return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
  }; // функция возвращает максимальную длину месяца


  var getMonthMaxLength = function getMonthMaxLength(month, year) {
    var result = CRON_UNITS[CRON_MONTHS_ID].lengths[month - CRON_UNITS[CRON_MONTHS_ID].min];

    if (month === 2 && isLeapYear(year)) {
      result++;
    }

    return result;
  }; // функция проверки, подходит ли текущее значение юнита


  var compared = function compared(unitId) {
    return exp[unitId].indexOf(state[unitId]) !== -1;
  }; // функция фиксит state, если значения в нём выходят за рамки возможных


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
  }; // функция добавляет единицу к указанному значению в state


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
  }; // функция перебора значений state


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
  }; // функция поиска ближайшего подходящего времени


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
  }; // функция поиска ближайшей подходящей даты


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
  }; // ищем подходящий день


  if (!findDate()) {
    // если дня не найдено
    return false;
  } // если время ещё не наступило, продолжаем искать со следующего дня


  if (!findTime()) {
    stateAdd(CRON_DATES_ID);

    if (!stateFixBounds(CRON_DATES_ID)) {
      // если вышли за пределы возможных годов
      return false;
    }

    if (!findDate()) {
      // если дня не найдено
      return false;
    }

    findTime();
  }

  return state;
}; // функция возвращает время до ближайшего запуска


var nearestRunTime = function nearestRunTime(exp) {
  var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var backward = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  var current = timestamp === null ? new Date() : new Date(timestamp); // дата отсчёта
  // получаем state

  var state = nearestRun(exp, timestamp, backward);

  if (state === false) {
    return false;
  }

  var foundDate = stateToDate(state);
  return Math.abs(foundDate.getTime() - current.getTime());
};

var lastRun = function lastRun(exp) {
  var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var state = nearestRun(exp, timestamp, true);
  return state === false ? false : stateToDate(state);
};

var nextRun = function nextRun(exp) {
  var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var state = nearestRun(exp, timestamp, false);
  return state === false ? false : stateToDate(state);
};

var lastRunElapsed = function lastRunElapsed(exp) {
  var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  return nearestRunTime(exp, timestamp, true);
};

var nextRunRemains = function nextRunRemains(exp) {
  var timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  return nearestRunTime(exp, timestamp, false);
};

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
};

module.exports = {
  parse: parse,
  lastRun: lastRun,
  nextRun: nextRun,
  lastRunElapsed: lastRunElapsed,
  nextRunRemains: nextRunRemains,
  fits: fits
};