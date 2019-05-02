# abm-cron

![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/lmcsu/abm-cron.svg)
![npm bundle size](https://img.shields.io/bundlephobia/min/abm-cron.svg)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/abm-cron.svg)

A compact library that parses cron-like expressions and finds its nearest time of run.
Without any external dependencies.

## Install

#### Node.js
```bash
$ npm install abm-cron
```
```js
const abmCron = require('abm-cron');
````
#### Browser
```html
<script src="<your_path>/abm-cron.min.js"></script>
```

## Usage examples

```js
// returns arrays of all possible values
const expr = abmCron.parse('0 30 19 10-20 mar-sep MON-wed 2000,2050');
console.log(expr);
// =>
// [
//    [ 0 ],
//    [ 30 ],
//    [ 19 ],
//    [ 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 ],
//    [ 3, 4, 5, 6, 7, 8, 9 ],
//    [ 1, 2, 3 ],
//    [ 2000, 2050 ]
// ]

// returns the date of the last run
const lastRun = abmCron.lastRun(expr);
console.log(lastRun);
// => 2000-09-20T19:30:00.000Z

// returns the date of the next run
const nextRun = abmCron.nextRun(expr);
console.log(nextRun);
// => 2050-03-14T19:30:00.000Z

// returns milliseconds passed from the previous run
const lastRunElapsed = abmCron.lastRunElapsed(expr);
console.log(lastRunElapsed);
// ~> 586979507253

// returns milliseconds remain until the next run
const nextRunRemains = abmCron.nextRunRemains(expr);
console.log(nextRunRemains);
// ~> 974441292747

// returns true if timestamp fits expression
const fits = abmCron.fits(expr, 2530899000000);
console.log(fits);
// => true
```
