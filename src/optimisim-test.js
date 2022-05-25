const fs = require('fs');
const { wrap, defaultMakeCacheKey } = require("optimism");

// const fib = wrap((n) => {
//   if (n < 2) {
//     return n;
//   }

//   return fib(n - 1) + fib(n - 2);
// });

// for (let i = 0; i < 30; i++) {
//     console.time(`n = ${i}`);
//     fib(i);
//     console.timeEnd(`n = ${i}`);
//     i++;
// }


