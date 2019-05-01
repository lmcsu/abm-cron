// идентификаторы юнитов крона
const CRON_SECONDS_ID = 0;
const CRON_MINUTES_ID = 1;
const CRON_HOURS_ID = 2;
const CRON_DATES_ID = 3;
const CRON_MONTHS_ID = 4;
const CRON_DAYS_ID = 5;
const CRON_YEARS_ID = 6;

// юниты крона
const CRON_UNITS = [
    { // секунды
        min: 0,
        max: 59,
        defaultValue: '0',
    },
    { // минуты
        min: 0,
        max: 59,
        defaultValue: '0',
    },
    { // часы
        min: 0,
        max: 23,
        defaultValue: '0',
    },
    { // дни месяца
        min: 1,
        max: 31,
        defaultValue: '*',
    },
    { // месяцы
        min: 1,
        max: 12,
        defaultValue: '*',
        alt: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
        lengths: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    },
    { // дни недели
        min: 0,
        max: 6,
        defaultValue: '*',
        alt: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        sundayFix: true,
    },
    { // годы
        min: 1970,
        max: 2099,
        defaultValue: '*',
    },
];

// порядковые юниты
const CRON_UNITS_ORDERED = [
    CRON_SECONDS_ID,
    CRON_MINUTES_ID,
    CRON_HOURS_ID,
    CRON_DATES_ID,
    CRON_MONTHS_ID,
    CRON_YEARS_ID,
];

// функция конвертирует state в Date
const stateToDate = (state) => {
    const date = new Date(0);
    date.setUTCFullYear(state[CRON_YEARS_ID]);
    date.setUTCMonth(state[CRON_MONTHS_ID] - 1);
    date.setUTCDate(state[CRON_DATES_ID]);
    date.setUTCHours(state[CRON_HOURS_ID]);
    date.setUTCMinutes(state[CRON_MINUTES_ID]);
    date.setUTCSeconds(state[CRON_SECONDS_ID]);
    return date;
};

// функция конвертирует Date в state
const dateToState = (date) => {
    return [
        date.getUTCSeconds(),
        date.getUTCMinutes(),
        date.getUTCHours(),
        date.getUTCDate(),
        date.getUTCMonth() + 1,
        date.getUTCDay(),
        date.getUTCFullYear(),
    ];
};

// функция парсинга cron-выражения
const parse = (str) => {
    // заполнение массива по диапазону значений
    const fillRange = (from, to) => {
        const result = [];
        for (let i = from; i <= to; i++) {
            result.push(i);
        }
        return result;
    };

    // функция парсинга частей значений
    const parseChunk = (chunk, unitId) => {
        const unit = CRON_UNITS[unitId];

        // разбиваем строку по знаку приращения
        const pair = chunk.split('/');
        if (pair.length > 2) {
            throw new Error(`Некорректное приращение "${chunk}"`);
        }
        const value = pair[0] === '*' ? unit.min + '-' + unit.max : pair[0];
        const step = pair.length > 1 ? parseInt(pair[1], 10) : null;
        if (step !== null && (isNaN(step) || step < 1)) {
            throw new Error(`Некорректный коэффициент приращения "${pair[1]}"`);
        }

        // подготавливаем карту для альтернативных значений
        const altMap = {};
        if (unit.alt) {
            for (let i = 0; i < unit.alt.length; i++) {
                altMap[unit.alt[i]] = i + unit.min;
            }
        }

        // функция для считывания значения
        const parseNumber = (num) => {
            let result = num;
            const alt = num.toUpperCase();
            if (typeof altMap[alt] !== 'undefined') {
                result = altMap[alt];
            }
            result = parseInt(result, 10);
            if (isNaN(result)) {
                throw new Error(`Некорректное значение "${num}"`);
            }
            return result;
        };

        // считываем диапазоны, либо сами значения
        let parsed;
        let minRange = null;
        let maxRange = null;
        const parts = value.split('-');
        if (parts.length > 0) {
            minRange = parseNumber(parts[0]);
        }
        if (parts.length === 1) {
            parsed = [minRange];
        } else if (parts.length === 2) {
            maxRange = parseNumber(parts[1]);
            if (maxRange < minRange) {
                throw new Error(`Максимальное значение диапазона меньше, чем минимальное "${value}"`);
            }
            parsed = fillRange(minRange, maxRange);
        } else {
            throw new Error(`Некорректный диапазон "${value}"`);
        }

        // приращение
        if (step !== null) {
            // если нет диапазона, заполняем до максимума
            if (maxRange === null) {
                parsed = fillRange(minRange, unit.max);
            }

            // вычищаем значения, не подходящие по шагу
            parsed = parsed.filter((v) => (v - minRange) % step === 0);
        }

        // если дни недели, фиксим воскресенье
        if (unit.sundayFix) {
            parsed = parsed.map((v) => {
                return v === 7 ? 0 : v;
            });
        }

        return parsed;
    };

    // функция парсинга значений
    const parseValue = (value, unitId) => {
        const unit = CRON_UNITS[unitId];

        let result = value.split(',').map((chunk) => {
            let r = [unit.min];
            try {
                r = parseChunk(chunk, unitId);
            } catch (e) {
                console.error(`Ошибка парсинга "${value}": ${e.message}`);
            }
            return r;
        });

        // объединяем массивы
        result = [].concat(...result);

        // удаляем дубли
        const unique = [];
        result.forEach((i) => {
            if (unique.indexOf(i) < 0) {
                unique.push(i);
            }
        });
        result = unique;

        // сортируем
        result = result.sort((a, b) => a - b);

        // проверяем, выходит ли за пределы возможных значений
        const minValue = result[0];
        const maxValue = result[result.length - 1];
        let outOfRange = null;
        if (minValue < unit.min) {
            outOfRange = minValue;
        } else if (maxValue > unit.max) {
            outOfRange = maxValue;
        }
        if (outOfRange !== null) {
            console.error(`Значение выходит за пределы возможных "${outOfRange}" в "${value}"`);
        }

        return result;
    };

    // разделяем значения по пробелам
    const values = str.replace(/\s+/g, ' ').trim().split(' ');

    // если недостаточно значений, прибавляем дефолтные
    for (let i = (CRON_UNITS.length - 1) - values.length - 1; i >= 0; i--) {
        values.unshift(CRON_UNITS[i].defaultValue);
    }

    // добавляем год, если нету
    if (values.length === CRON_UNITS.length - 1) {
        values.push(CRON_UNITS[CRON_YEARS_ID].defaultValue);
    }

    // парсим значения и возвращаем массивы
    return values.map((value, unitId) => parseValue(value, unitId));
};

// функция поиска ближайшего совпадения времени спарсенного cron-выражения
const nearestRun = (exp, timestamp = null, backward = true) => {
    // заполняем state
    const current = timestamp === null ? new Date() : new Date(timestamp); // дата отсчёта
    const state = dateToState(current);

    // функция устанавливает день недели в state, согласно дате в нём
    const setDayOfWeek = () => {
        const date = new Date();
        date.setUTCFullYear(state[CRON_YEARS_ID]);
        date.setUTCMonth(state[CRON_MONTHS_ID] - 1);
        date.setUTCDate(state[CRON_DATES_ID]);
        state[CRON_DAYS_ID] = date.getDay();
    };

    // функция проверки, является ли год високосным
    const isLeapYear = (year) => ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);

    // функция возвращает максимальную длину месяца
    const getMonthMaxLength = (month, year) => {
        let result = CRON_UNITS[CRON_MONTHS_ID].lengths[month - CRON_UNITS[CRON_MONTHS_ID].min];
        if (month === 2 && isLeapYear(year)) {
            result++;
        }
        return result;
    };

    // функция проверки, подходит ли текущее значение юнита
    const compared = (unitId) => exp[unitId].indexOf(state[unitId]) !== -1;

    // функция фиксит state, если значения в нём выходят за рамки возможных
    const stateFixBounds = (fromId = CRON_YEARS_ID) => {
        for (let i = CRON_UNITS_ORDERED.indexOf(fromId); i < CRON_UNITS_ORDERED.length; i++) {
            const id = CRON_UNITS_ORDERED[i];
            const unit = CRON_UNITS[id];
            const idNext = id === CRON_YEARS_ID ? false : CRON_UNITS_ORDERED[i + 1];
            let min = unit.min;
            let max = id === CRON_DATES_ID ?
                getMonthMaxLength(state[CRON_MONTHS_ID], state[CRON_YEARS_ID]) :
                unit.max;
            let isMin = state[id] < min;
            let isMax = state[id] > max;
            if (isMin || isMax) {
                if (id === CRON_YEARS_ID) {
                    return false;
                }
                let value = isMin ? max : min;
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
    };

    // функция добавляет единицу к указанному значению в state
    const stateAdd = (unitId) => {
        state[unitId] += backward ? -1 : 1;

        for (let i = CRON_UNITS_ORDERED.indexOf(unitId) - 1; i >= 0; i--) {
            const id = CRON_UNITS_ORDERED[i];
            const unit = CRON_UNITS[id];
            let value = backward ? unit.max : unit.min;

            if (backward && id === CRON_DATES_ID) {
                value = getMonthMaxLength(state[CRON_MONTHS_ID], state[CRON_YEARS_ID]);
            }

            state[id] = value;
        }

        return true;
    };

    // функция перебора значений state
    const stateSearch = (unitId, searchNext = false) => {
        let min = CRON_UNITS[unitId].min;
        let max = CRON_UNITS[unitId].max;
        if (!backward && unitId === CRON_DATES_ID) {
            max = getMonthMaxLength(state[CRON_MONTHS_ID], state[CRON_YEARS_ID]);
        }
        let i = state[unitId];
        let isNext = !searchNext;
        while (i >= min && i <= max) {
            if (isNext && compared(unitId)) {
                return true;
            }
            i += backward ? -1 : 1;
            stateAdd(unitId);
            isNext = true;
        }
        return false;
    };

    // функция поиска ближайшего подходящего времени
    const findTime = () => {
        let searchNextHours = false;
        while (stateSearch(CRON_HOURS_ID, searchNextHours)) {
            let searchNextMinutes = false;
            while (stateSearch(CRON_MINUTES_ID, searchNextMinutes)) {
                if (stateSearch(CRON_SECONDS_ID)) {
                    return true;
                }
                searchNextMinutes = true;
            }
            searchNextHours = true;
        }
        return false;
    };

    // функция поиска ближайшей подходящей даты
    const findDate = () => {
        let searchNextYears = false;
        while (stateSearch(CRON_YEARS_ID, searchNextYears)) {
            let searchNextMonths = false;
            while (stateSearch(CRON_MONTHS_ID, searchNextMonths)) {
                let searchNextDays = false;
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
    };

    // ищем подходящий день
    if (!findDate()) {
        // если дня не найдено
        return false;
    }

    // если время ещё не наступило, продолжаем искать со следующего дня
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
};

// функция возвращает время до ближайшего запуска
const nearestRunTime = (exp, timestamp = null, backward = true) => {
    const current = timestamp === null ? new Date() : new Date(timestamp); // дата отсчёта

    // получаем state
    const state = nearestRun(exp, timestamp, backward);
    if (state === false) {
        return false;
    }

    const foundDate = stateToDate(state);

    return Math.abs(foundDate.getTime() - current.getTime());
};

const lastRun = (exp, timestamp = null) => {
    const state = nearestRun(exp, timestamp, true);

    return state === false ? false : stateToDate(state);
};

const nextRun = (exp, timestamp = null) => {
    const state = nearestRun(exp, timestamp, false);

    return state === false ? false : stateToDate(state);
};

const lastRunElapsed = (exp, timestamp = null) => {
    return nearestRunTime(exp, timestamp, true);
};

const nextRunRemains = (exp, timestamp = null) => {
    return nearestRunTime(exp, timestamp, false);
};

const fits = (exp, timestamp = null) => {
    const state = dateToState(timestamp === null ? new Date() : new Date(timestamp));
    let result = true;
    for (let i = 0; i < state.length; i++) {
        if (exp[i].indexOf(state[i]) === -1) {
            result = false;
            break;
        }
    }
    return result;
};

module.exports = {
    parse,
    lastRun,
    nextRun,
    lastRunElapsed,
    nextRunRemains,
    fits,
};
