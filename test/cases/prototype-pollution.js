// Paired cases for the prototype pollution pack.

export default [
  {
    rule: 'PP-01',
    fire: `function merge(target, source) {
      for (const key in source) {
        if (typeof source[key] === 'object' && source[key] !== null) {
          target[key] = merge(target[key] || {}, source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    }`,
    safe: [
      `function merge(target, source) {
        for (const key in source) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
          target[key] = source[key];
        }
        return target;
      }`,
      `function copyKeys(target, source) {
        for (const key in source) {
          target[key] = source[key];
        }
        return target;
      }`,
    ],
  },

  {
    rule: 'PP-02',
    fire: `Object.assign(appConfig, req.body);`,
    safe: [`const merged = Object.assign({}, req.body);`, `Object.assign(appConfig, defaults);`],
  },

  {
    rule: 'PP-03',
    fire: `_.merge(appConfig, req.body);`,
    safe: [`_.merge(appConfig, defaults);`, `_.merge({}, base, overrides);`],
  },

  {
    rule: 'PP-04',
    fire: `store[req.body.key] = req.body.value;`,
    safe: [
      `const store = Object.create(null);
       store[req.body.key] = req.body.value;`,
      `results[index] = value;`,
    ],
  },
];
