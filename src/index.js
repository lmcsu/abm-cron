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

// функция парсинга cron-выражения
const parseExpression = (str) => {
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
            if (typeof altMap[num] !== 'undefined') {
                result = altMap[num];
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

// функция поиска последнего совпадения времени спарсенного cron-выражения
const lastRun = (exp, from = null) => {
    // если from не задан, тогда берём текущее время
    if (from === null) {
        from = (new Date()).getTime();
    }

    // переменные
    let current = new Date(from); // текущая дата
    let state; // текущее состояние

    // функция обновления состояния согласно дате
    const updateState = () => {
        state = [
            current.getUTCSeconds(),
            current.getUTCMinutes(),
            current.getUTCHours(),
            current.getUTCDate(),
            current.getUTCMonth() + 1,
            current.getUTCDay(),
            current.getUTCFullYear(),
        ];
    };

    // функция проверки, подходит ли текущее значение юнита
    const compared = (unitId) => exp[unitId].indexOf(state[unitId]) !== -1;

    // функция отрезает лишнее от текущего времени
    const cutTime = (unitId = -1) => {
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
        }

        // отнимаем одну секунду, чтобы сбросить все значения на максимальные
        // (хорошо, что в js отсутсвуют вещи вроде leap seconds)
        current = new Date(current.getTime() - 1000);

        // обновляем состояние
        updateState();
    };

    // функция подбирает ближайший подходящий день
    const findDay = () => {
        for (let y = state[CRON_YEARS_ID]; y >= CRON_UNITS[CRON_YEARS_ID].min; y--) {
            if (compared(CRON_YEARS_ID)) {
                for (let m = state[CRON_MONTHS_ID]; m >= 1; m--) {
                    if (compared(CRON_MONTHS_ID)) {
                        for (let d = state[CRON_DATES_ID]; d >= 1; d--) {
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
    };

    // функция подбирает ближайшее подходящее время
    const findTime = () => {
        for (let h = state[CRON_HOURS_ID]; h >= CRON_UNITS[CRON_HOURS_ID].min; h--) {
            if (compared(CRON_HOURS_ID)) {
                for (let m = state[CRON_MINUTES_ID]; m >= CRON_UNITS[CRON_MINUTES_ID].min; m--) {
                    if (compared(CRON_MINUTES_ID)) {
                        for (let s = state[CRON_SECONDS_ID]; s >= CRON_UNITS[CRON_SECONDS_ID].min; s--) {
                            if (compared(CRON_SECONDS_ID)) {
                                return true;
                            }
                            // вычитаем всего лишь одну секунду
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
    };

    // ищем подходящий день
    updateState();
    if (!findDay()) {
        // если дня не существует
        return false;
    }

    // если время ещё не наступило, пытаемся продолжить искать со вчерашнего дня
    if (!findTime()) {
        if (!findDay()) {
            // если дня не существует
            return false;
        }
        findTime();
    }

    // возвращаем количество времени, прошедшее с найденной текущей даты
    return from - current.getTime();
};

module.exports = {
    parseExpression,
    lastRun,
};
