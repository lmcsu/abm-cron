# abm-cron

A tiny library that parses Cron-like expressions and finds how many time has passed after the previous execution.

## Install

```
$ npm install abm-cron
```

## Usage

```js
const Cron = require('abm-cron');

const expr = Cron.parseExpression('30 19 * * *');
console.log(expr);
// => returns arrays of all possible values

const sinceLastRun = Cron.lastRun(expr);
console.log(sinceLastRun);
// => returns milliseconds passed from the previous execution
```
