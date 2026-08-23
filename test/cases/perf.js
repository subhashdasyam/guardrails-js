// Paired cases for the performance pack.
//
// Every one of these reports as perf, which is the quiet channel. They are
// advice, not defects to stop the world for.

export default [
  {
    rule: 'PERF-N01',
    fire: `app.get('/f', (req, res) => {
      const body = fs.readFileSync(FILE, 'utf8');
      res.send(body);
    });`,
    safe: [
      `app.get('/f', async (req, res) => {
        const body = await fs.promises.readFile(FILE, 'utf8');
        res.send(body);
      });`,
      `const config = fs.readFileSync(CONFIG_PATH, 'utf8');`,
    ],
  },

  {
    rule: 'PERF-N02',
    fire: `app.post('/login', (req, res) => {
      const ok = bcrypt.compareSync(req.body.password, user.hash);
      res.json({ ok });
    });`,
    safe: [
      `app.post('/login', async (req, res) => {
        const ok = await bcrypt.compare(req.body.password, user.hash);
        res.json({ ok });
      });`,
      `const seed = crypto.scryptSync(MASTER, SALT, 32);`,
    ],
  },

  {
    rule: 'PERF-N06',
    fire: `for (const id of ids) {
      const result = await callService(id);
      out.push(result);
    }`,
    safe: [
      `const out = await Promise.all(ids.map((id) => callService(id)));`,
      `for (const id of ids) {
        out.push(transform(id));
      }`,
    ],
  },

  {
    rule: 'PERF-N07',
    fire: `const results = await Promise.all(items.map((item) => process(item)));`,
    safe: [
      `const limit = pLimit(10);
       const results = await Promise.all(items.map((item) => limit(() => process(item))));`,
      `const [user, org] = await Promise.all([loadUser(id), loadOrg(id)]);`,
    ],
  },

  {
    rule: 'PERF-N08',
    fire: `for (const chunk of chunks) {
      destination.write(chunk);
    }`,
    safe: [
      `await pipeline(source, destination);`,
      `for (const chunk of chunks) {
        if (!destination.write(chunk)) await once(destination, 'drain');
      }`,
    ],
  },

  {
    rule: 'PERF-N10',
    fire: `items.forEach(async (item) => {
      await save(item);
    });`,
    safe: [
      `for (const item of items) {
        await save(item);
      }`,
      `items.forEach((item) => track(item));`,
    ],
  },

  {
    rule: 'PERF-N12',
    fire: `const responseCache = new Map();

    export function remember(key, value) {
      responseCache.set(key, value);
    }`,
    safe: [
      `const responseCache = new LRUCache({ max: 500 });

       export function remember(key, value) {
         responseCache.set(key, value);
       }`,
      `const responseCache = new Map();

       export function remember(key, value) {
         responseCache.set(key, value);
         if (responseCache.size > 500) responseCache.delete(responseCache.keys().next().value);
       }`,
    ],
  },

  {
    rule: 'PERF-N17',
    fire: `for (const order of orders) {
      const customer = await db.customer.findUnique({ where: { id: order.customerId } });
      order.customer = customer;
    }`,
    safe: [
      `const customers = await db.customer.findMany({ where: { id: { in: ids } } });`,
      `for (const order of orders) {
        order.total = computeTotal(order);
      }`,
    ],
  },

  {
    rule: 'REACT-04',
    file: 'src/List.tsx',
    fire: `const Row = memo(function Row({ options }) { return <li>{options.mode}</li>; });

    export function List({ mode, limit }) {
      return <Row options={{ mode, limit }} />;
    }`,
    safe: [
      `const Row = memo(function Row({ options }) { return <li>{options.mode}</li>; });

       export function List({ mode, limit }) {
         const options = useMemo(() => ({ mode, limit }), [mode, limit]);
         return <Row options={options} />;
       }`,
      `export function List({ mode, limit }) {
         return <Row options={{ mode, limit }} />;
       }`,
    ],
  },

  {
    rule: 'REACT-05',
    file: 'src/List.tsx',
    fire: `export function List({ items }) {
      return <ul>{items.map((item, i) => <li key={i}>{item.label}</li>)}</ul>;
    }`,
    safe: [
      `export function List({ items }) {
        return <ul>{items.map((item) => <li key={item.id}>{item.label}</li>)}</ul>;
      }`,
      `export function Table({ rows }) {
        return (
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        );
      }`,
    ],
  },

  {
    rule: 'REACT-07',
    file: 'src/Total.tsx',
    fire: `useEffect(() => {
      setTotal(items.reduce((sum, item) => sum + item.price, 0));
    }, [items]);`,
    safe: [
      `const total = items.reduce((sum, item) => sum + item.price, 0);`,
      `useEffect(() => {
        setTotal(await fetchTotal(items));
      }, [items]);`,
    ],
  },

  {
    rule: 'VUE-04',
    file: 'src/List.vue',
    fire: `<template>
  <li v-for="item in items" v-if="item.visible" :key="item.id">{{ item.label }}</li>
</template>

<script setup>
const props = defineProps({ items: Array });
</script>`,
    safe: [
      `<template>
  <li v-for="item in visible" :key="item.id">{{ item.label }}</li>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ items: Array });
const visible = computed(() => props.items.filter((item) => item.visible));
</script>`,
      `<template>
  <li v-if="ready">ready</li>
</template>

<script setup>
const ready = true;
</script>`,
    ],
  },

  {
    rule: 'VUE-07',
    file: 'src/Plain.vue',
    fire: `<template>
  <li v-for="item in items">{{ item.label }}</li>
</template>

<script setup>
const props = defineProps({ items: Array });
</script>`,
    safe: [
      `<template>
  <li v-for="item in items" :key="item.id">{{ item.label }}</li>
</template>

<script setup>
const props = defineProps({ items: Array });
</script>`,
      `<template>
  <li>one item only</li>
</template>

<script setup>
const nothing = 1;
</script>`,
    ],
  },
];
