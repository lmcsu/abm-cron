(function () {
    // cron units ids
    const CRON_SECONDS_ID = 0;
    const CRON_MINUTES_ID = 1;
    const CRON_HOURS_ID = 2;
    const CRON_DATES_ID = 3;
    const CRON_MONTHS_ID = 4;
    const CRON_DAYS_ID = 5;
    const CRON_YEARS_ID = 6;

    // cron units
    const CRON_UNITS = [
        { // seconds
            min: 0,
            max: 59,
            defaultValue: '0',
        },
        { // minutes
            min: 0,
            max: 59,
            defaultValue: '0',
        },
        { // hours
            min: 0,
            max: 23,
            defaultValue: '0',
        },
        { // dates / month days
            min: 1,
            max: 31,
            defaultValue: '*',
        },
        { // months
            min: 1,
            max: 12,
            defaultValue: '*',
            alt: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
            lengths: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        },
        { // days / week days
            min: 0,
            max: 6,
            defaultValue: '*',
            alt: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
            sundayFix: true,
        },
        { // years
            min: 1970,
            max: 2099,
            defaultValue: '*',
        },
    ];

    // list of units for counting, excluding week days because they don't affect the other units
    const CRON_UNITS_ORDERED = [
        CRON_SECONDS_ID,
        CRON_MINUTES_ID,
        CRON_HOURS_ID,
        CRON_DATES_ID,
        CRON_MONTHS_ID,
        CRON_YEARS_ID,
    ];

    // converting state to Date
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

    // converting Date to state
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

    // cron expression parser
    const parse = (str) => {
        // filling array by range of values
        const fillRange = (from, to) => {
            const result = [];
            for (let i = from; i <= to; i++) {
                result.push(i);
            }
            return result;
        };

        // single item parsing
        const parseItem = (item, unitId) => {
            const unit = CRON_UNITS[unitId];

            // splitting string by the increment symbol
            const pair = item.split('/');
            if (pair.length > 2) {
                throw new Error(`Incorrect incrementation "${item}"`);
            }
            const value = pair[0] === '*' ? unit.min + '-' + unit.max : pair[0];
            const step = pair.length > 1 ? parseInt(pair[1], 10) : null;
            if (step !== null && (isNaN(step) || step < 1)) {
                throw new Error(`Incorrect increment value "${pair[1]}"`);
            }

            // preparing map for alternative values
            const altMap = {};
            if (unit.alt) {
                for (let i = 0; i < unit.alt.length; i++) {
                    altMap[unit.alt[i]] = i + unit.min;
                }
            }

            // parsing single value/number
            const parseNumber = (num) => {
                let result = num;
                const alt = num.toUpperCase();
                if (typeof altMap[alt] !== 'undefined') {
                    result = altMap[alt];
                }
                result = parseInt(result, 10);
                if (isNaN(result)) {
                    throw new Error(`Incorrect value "${num}"`);
                }
                return result;
            };

            // parsing ranges/values
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
                    throw new Error(`The max value is less than the min value in range "${value}"`);
                }
                parsed = fillRange(minRange, maxRange);
            } else {
                throw new Error(`Incorrect range "${value}"`);
            }

            // increment
            if (step !== null) {
                // if there's no range, then filling array to the max value
                if (maxRange === null) {
                    parsed = fillRange(minRange, unit.max);
                }

                // removing values that don't fit the increment step
                parsed = parsed.filter((v) => (v - minRange) % step === 0);
            }

            // if week days, trying to fix sunday
            if (unit.sundayFix) {
                parsed = parsed.map((v) => {
                    return v === 7 ? 0 : v;
                });
            }

            return parsed;
        };

        // value parsing
        const parseValue = (value, unitId) => {
            const unit = CRON_UNITS[unitId];

            let result = value.split(',')
                .map((item) => {
                    let r = [unit.min];
                    try {
                        r = parseItem(item, unitId);
                    } catch (e) {
                        console.error(`Parse error "${value}": ${e.message}`);
                    }
                    return r;
                });

            // merging arrays
            result = [].concat(...result);

            // removing duplicates
            const unique = [];
            result.forEach((i) => {
                if (unique.indexOf(i) < 0) {
                    unique.push(i);
                }
            });
            result = unique;

            // sorting
            result = result.sort((a, b) => a - b);

            // out of bounds checking
            const minValue = result[0];
            const maxValue = result[result.length - 1];
            let outOfRange = null;
            if (minValue < unit.min) {
                outOfRange = minValue;
            } else if (maxValue > unit.max) {
                outOfRange = maxValue;
            }
            if (outOfRange !== null) {
                console.error(`Value is out of bounds "${outOfRange}" in "${value}"`);
            }

            return result;
        };

        // splitting values by spaces
        const values = str.replace(/\s+/g, ' ')
            .trim()
            .split(' ');

        // if there's no enough values, adding defaults
        for (let i = (CRON_UNITS.length - 1) - values.length - 1; i >= 0; i--) {
            values.unshift(CRON_UNITS[i].defaultValue);
        }

        // adding years, if not defined
        if (values.length === CRON_UNITS.length - 1) {
            values.push(CRON_UNITS[CRON_YEARS_ID].defaultValue);
        }

        // parsing values and returning arrays
        return values.map((value, unitId) => parseValue(value, unitId));
    };

    // the function finds the nearest time of run of parsed expression
    const nearestRun = (exp, timestamp = null, backward = true) => {
        // filling state
        const current = timestamp === null ? new Date() : new Date(timestamp); // start date
        const state = dateToState(current);

        // setting day of week, according to values in state
        const setDayOfWeek = () => {
            const date = new Date();
            date.setUTCFullYear(state[CRON_YEARS_ID]);
            date.setUTCMonth(state[CRON_MONTHS_ID] - 1);
            date.setUTCDate(state[CRON_DATES_ID]);
            state[CRON_DAYS_ID] = date.getDay();
        };

        // checking if year is leap year
        const isLeapYear = (year) => ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);

        // returns the max month length
        const getMonthMaxLength = (month, year) => {
            let result = CRON_UNITS[CRON_MONTHS_ID].lengths[month - CRON_UNITS[CRON_MONTHS_ID].min];
            if (month === 2 && isLeapYear(year)) {
                result++;
            }
            return result;
        };

        // checking if current unit value fits the expression
        const compared = (unitId) => exp[unitId].indexOf(state[unitId]) !== -1;

        // fixing state values if they are out of their bounds
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

        // adding one to given unit in state
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

        // searching values in state
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

        // seeking for nearest time that fits the expression
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

        // seeking for nearest date that fits the expression
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

        // seeking the date
        if (!findDate()) {
            // if no date found
            return false;
        }

        // if the time has not come yet, trying to seek from the next day
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
    };

    // finds milliseconds before or after the nearest run
    const nearestRunTime = (exp, timestamp = null, backward = true) => {
        const current = timestamp === null ? new Date() : new Date(timestamp); // start date

        // getting state
        const state = nearestRun(exp, timestamp, backward);
        if (state === false) {
            return false;
        }

        const foundDate = stateToDate(state);

        return Math.abs(foundDate.getTime() - current.getTime());
    };

    // finds the lats time of run of parsed expression
    const lastRun = (exp, timestamp = null) => {
        const state = nearestRun(exp, timestamp, true);

        return state === false ? false : stateToDate(state);
    };

    // finds the next time of run of parsed expression
    const nextRun = (exp, timestamp = null) => {
        const state = nearestRun(exp, timestamp, false);

        return state === false ? false : stateToDate(state);
    };

    // finds milliseconds after the last run
    const lastRunElapsed = (exp, timestamp = null) => {
        return nearestRunTime(exp, timestamp, true);
    };

    // finds milliseconds before the next run
    const nextRunRemains = (exp, timestamp = null) => {
        return nearestRunTime(exp, timestamp, false);
    };

    // checking if given timestamp fits given parsed expression
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

    // exporting
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports.parse = parse;
        module.exports.lastRun = lastRun;
        module.exports.nextRun = nextRun;
        module.exports.lastRunElapsed = lastRunElapsed;
        module.exports.nextRunRemains = nextRunRemains;
        module.exports.fits = fits;
    } else {
        window.abmCron = {
            parse,
            lastRun,
            nextRun,
            lastRunElapsed,
            nextRunRemains,
            fits,
        };
    }
})();
