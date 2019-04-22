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
  alt: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
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
}]; // функция парсинга cron-выражения

var parseExpression = function parseExpression(str) {
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

      if (typeof altMap[num] !== 'undefined') {
        result = altMap[num];
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
}; // функция поиска последнего совпадения времени спарсенного cron-выражения


var lastRun = function lastRun(exp) {
  var from = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  // если from не задан, тогда берём текущее время
  if (from === null) {
    from = new Date().getTime();
  } // переменные


  var current = new Date(from); // текущая дата

  var state; // текущее состояние
  // функция обновления состояния согласно дате

  var updateState = function updateState() {
    state = [current.getUTCSeconds(), current.getUTCMinutes(), current.getUTCHours(), current.getUTCDate(), current.getUTCMonth() + 1, current.getUTCDay(), current.getUTCFullYear()];
  }; // функция проверки, подходит ли текущее значение юнита


  var compared = function compared(unitId) {
    return exp[unitId].indexOf(state[unitId]) !== -1;
  }; // функция отрезает лишнее от текущего времени


  var cutTime = function cutTime() {
    var unitId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : -1;

    if (unitId >= CRON_SECONDS_ID) {
      current.setUTCSeconds(0);
    }

    if (unitId >= CRON_MINUTES_ID) {
      current.setUTCMinutes(0);
    }

    if (unitId >= CRON_HOURS_ID) {
      current.setUTCHours(0);
    }

    if (unitId >= CRON_DAYS_ID) {
      current.setUTCDate(1);
    }

    if (unitId >= CRON_MONTHS_ID) {
      current.setUTCMonth(0);
    } // отнимаем одну секунду, чтобы сбросить все значения на максимальные
    // (хорошо, что в js отсутсвуют вещи вроде leap seconds)


    current = new Date(current.getTime() - 1000); // обновляем состояние

    updateState();
  }; // функция подбирает ближайший подходящий день


  var findDay = function findDay() {
    for (var y = state[CRON_YEARS_ID]; y >= CRON_UNITS[CRON_YEARS_ID].min; y--) {
      if (compared(CRON_YEARS_ID)) {
        for (var m = state[CRON_MONTHS_ID]; m >= 1; m--) {
          if (compared(CRON_MONTHS_ID)) {
            for (var d = state[CRON_DATES_ID]; d >= 1; d--) {
              if (compared(CRON_DATES_ID) && compared(CRON_DAYS_ID)) {
                return true;
              }

              cutTime(CRON_HOURS_ID);
            }
          } else {
            cutTime(CRON_DAYS_ID);
          }
        }
      } else {
        cutTime(CRON_MONTHS_ID);
      }
    }

    return false;
  }; // функция подбирает ближайшее подходящее время


  var findTime = function findTime() {
    for (var h = state[CRON_HOURS_ID]; h >= CRON_UNITS[CRON_HOURS_ID].min; h--) {
      if (compared(CRON_HOURS_ID)) {
        for (var m = state[CRON_MINUTES_ID]; m >= CRON_UNITS[CRON_MINUTES_ID].min; m--) {
          if (compared(CRON_MINUTES_ID)) {
            for (var s = state[CRON_SECONDS_ID]; s >= CRON_UNITS[CRON_SECONDS_ID].min; s--) {
              if (compared(CRON_SECONDS_ID)) {
                return true;
              } // вычитаем всего лишь одну секунду


              cutTime();
            }
          } else {
            cutTime(CRON_SECONDS_ID);
          }
        }
      } else {
        cutTime(CRON_MINUTES_ID);
      }
    }

    return false;
  }; // ищем подходящий день


  updateState();

  if (!findDay()) {
    // если дня не существует
    return false;
  } // если время ещё не наступило, пытаемся продолжить искать со вчерашнего дня


  if (!findTime()) {
    if (!findDay()) {
      // если дня не существует
      return false;
    }

    findTime();
  } // возвращаем количество времени, прошедшее с найденной текущей даты


  return from - current.getTime();
};

module.exports = {
  parseExpression: parseExpression,
  lastRun: lastRun
};