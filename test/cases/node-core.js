// Paired cases for the node-core pack.
//
// Every rule needs one case that must fire and at least two safe lookalikes
// that must not. The safe cases include the exact shape the rule's own `fix`
// recommends, because a rule that flags its own advice is worse than no rule.

export default [
  // SQL-01
  {
    rule: 'SQL-01',
    fire: `app.get('/u', async (req, res) => {
      const rows = await pool.query(\`SELECT * FROM users WHERE id = '\${req.query.id}'\`);
      res.json(rows);
    });`,
    safe: [
      `app.get('/u', async (req, res) => {
        const rows = await pool.query('SELECT * FROM users WHERE id = $1', [req.query.id]);
        res.json(rows);
      });`,
      `const rows = await pool.query('SELECT * FROM users WHERE active = true');`,
      `const rows = await db.query(SQL_BY_ID, [internalId]);`,
    ],
  },

  // SQL-02
  {
    rule: 'SQL-02',
    fire: `const rows = await knex.raw(\`select * from t order by \${req.query.sort}\`);`,
    safe: [
      `const rows = await knex('t').orderBy(ALLOWED_SORT[req.query.sort] ?? 'id');`,
      `const rows = await knex.raw('select * from t order by id');`,
      `const rows = await sequelize.query('SELECT * FROM t WHERE id = :id', { replacements: { id } });`,
    ],
  },

  // SQL-03
  {
    rule: 'SQL-03',
    fire: `const rows = await prisma.$queryRawUnsafe(\`SELECT * FROM users WHERE id = \${id}\`);`,
    safe: [
      'const rows = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;',
      `const rows = await prisma.user.findMany({ where: { id } });`,
      `const rows = await prisma.$queryRawUnsafe('SELECT 1');`,
    ],
  },

  // NOSQL-01
  {
    rule: 'NOSQL-01',
    fire: `app.post('/login', async (req, res) => {
      const user = await User.findOne({ email: req.body.email });
      res.json(user);
    });`,
    safe: [
      `app.post('/login', async (req, res) => {
        const user = await User.findOne({ email: String(req.body.email) });
        res.json(user);
      });`,
      `const user = await User.findOne({ email: session.email });`,
      `app.post('/login', async (req, res) => {
        const input = LoginSchema.parse(req.body);
        const user = await User.findOne({ email: input.email });
        res.json(user);
      });`,
    ],
  },

  // NOSQL-02
  {
    rule: 'NOSQL-02',
    fire: `const docs = await coll.find({ $where: req.body.filter });`,
    safe: [
      `const docs = await coll.find({ status: 'active' });`,
      `const docs = await coll.find({ $where: 'this.active === true' });`,
    ],
  },

  // CMD-01
  {
    rule: 'CMD-01',
    fire: `app.post('/c', (req, res) => { exec('convert ' + req.body.file, cb); });`,
    safe: [
      `app.post('/c', (req, res) => { execFile('/usr/bin/convert', [validated], { shell: false }, cb); });`,
      `exec('git rev-parse HEAD', cb);`,
      `execFile('/bin/ls', ['-la'], cb);`,
    ],
  },

  // CMD-02
  {
    rule: 'CMD-02',
    fire: `spawn(tool, args, { shell: true });`,
    safe: [
      `spawn('/usr/bin/tool', ['--flag', value], { shell: false });`,
      `spawn('/usr/bin/tool', ['--flag']);`,
    ],
  },

  // PATH-01
  {
    rule: 'PATH-01',
    fire: `app.get('/f', (req, res) => { res.sendFile(path.join(root, req.params.name)); });`,
    safe: [
      `app.get('/f', (req, res) => {
        const target = path.resolve(root, req.params.name);
        if (!target.startsWith(root + path.sep)) return res.sendStatus(400);
        res.sendFile(target);
      });`,
      `res.sendFile(path.join(root, 'index.html'));`,
      `const data = fs.readFileSync(CONFIG_PATH, 'utf8');`,
    ],
  },

  // SSTI-01
  {
    rule: 'SSTI-01',
    fire: `app.post('/p', (req, res) => { res.send(ejs.render(req.body.template, data)); });`,
    safe: [
      `res.send(ejs.render(TEMPLATES.invoice, data));`,
      `app.get('/p', (req, res) => res.render('invoice', { name: req.query.name }));`,
    ],
  },

  // HTTP-01
  {
    rule: 'HTTP-01',
    fire: `app.get('/go', (req, res) => { res.redirect(req.query.next); });`,
    safe: [
      `app.get('/go', (req, res) => {
        const next = new URL(req.query.next, base);
        if (next.origin !== base.origin) return res.redirect('/');
        res.redirect(next.toString());
      });`,
      `res.redirect('/dashboard');`,
      `res.setHeader('Content-Type', 'application/json');`,
    ],
  },

  // SSRF-01
  {
    rule: 'SSRF-01',
    fire: `app.get('/p', async (req, res) => { const r = await fetch(req.query.url); res.send(await r.text()); });`,
    safe: [
      `const r = await fetch('https://api.example.com/status');`,
      `const r = await fetch(new URL(path, API_BASE));`,
      `app.get('/p', async (req, res) => {
        if (!isAllowedHost(req.query.url)) return res.sendStatus(400);
        const r = await fetch(req.query.url);
        res.send(await r.text());
      });`,
    ],
  },

  // SSRF-02
  {
    rule: 'SSRF-02',
    fire: `const r = await fetch(req.body.url, { redirect: 'follow' });`,
    safe: [
      `const r = await fetch(req.body.url, { redirect: 'error' });`,
      `const r = await fetch(TRUSTED, { redirect: 'follow' });`,
    ],
  },

  // SSRF-03
  {
    rule: 'SSRF-03',
    fire: `if (!req.query.url.includes('169.254.169.254')) { await fetch(req.query.url); }`,
    safe: [
      `if (ALLOWED_HOSTS.has(new URL(req.query.url).hostname)) { await fetch(req.query.url); }`,
      `if (banner.includes('169.254.169.254')) log('metadata mentioned');`,
    ],
  },

  // DESER-01
  {
    rule: 'DESER-01',
    fire: `const obj = serialize.unserialize(req.cookies.session);`,
    safe: [
      `const obj = JSON.parse(req.cookies.session);`,
      `const obj = SessionSchema.parse(JSON.parse(raw));`,
    ],
  },

  // DESER-02
  {
    rule: 'DESER-02',
    fire: `vm.runInNewContext(req.body.code, sandbox);`,
    safe: [
      `const result = calculators[req.body.kind]?.(req.body.value);`,
      `JSON.parse(req.body.value);`,
    ],
  },

  // DESER-03
  {
    rule: 'DESER-03',
    fire: `app.get('/m', (req, res) => { const m = require(req.query.mod); res.json(m); });`,
    safe: [
      `const m = require('./handlers/csv.js');`,
      `const load = LOADERS[req.query.mod]; if (!load) return res.sendStatus(400);`,
    ],
  },

  // SECRET-01
  {
    rule: 'SECRET-01',
    fire: `const stripe = require('stripe')('sk_live_51H8xKzABCDEFGHIJKLMNOP');`,
    safe: [
      `const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);`,
      `const stripe = require('stripe')('sk_test_your-key-here');`,
      `const publishable = 'pk_live_51H8xKzABCDEFGHIJKLMNOP';`,
    ],
  },

  // TLS-01
  {
    rule: 'TLS-01',
    fire: `const agent = new https.Agent({ rejectUnauthorized: false });`,
    safe: [
      `const agent = new https.Agent({ ca: fs.readFileSync(CA_PATH) });`,
      `const agent = new https.Agent({ rejectUnauthorized: true });`,
    ],
  },

  // CORS-01
  {
    rule: 'CORS-01',
    fire: `app.use(cors({ origin: true, credentials: true }));`,
    safe: [
      `app.use(cors({ origin: (o, cb) => cb(null, ALLOWED.has(o)), credentials: true }));`,
      `app.use(cors({ origin: 'https://app.example.com', credentials: true }));`,
      `app.use(cors());`,
    ],
  },

  // ERR-01
  {
    rule: 'ERR-01',
    fire: `app.use((err, req, res, next) => { res.status(500).json({ error: err.stack }); });`,
    safe: [
      `app.use((err, req, res, next) => {
        logger.error({ err, requestId });
        res.status(500).json({ error: 'Internal error', requestId });
      });`,
      `res.status(200).json({ ok: true });`,
    ],
  },

  // PROXY-01
  {
    rule: 'PROXY-01',
    fire: `app.set('trust proxy', true);`,
    safe: [`app.set('trust proxy', 1);`, `app.set('view engine', 'pug');`],
  },

  // DESER-04 needs a package.json to know the js-yaml major version.
  {
    rule: 'DESER-04',
    pkg: { dependencies: { 'js-yaml': '^3.14.1' } },
    fire: `const config = yaml.load(req.body.config);`,
    safe: [
      `const config = yaml.safeLoad(req.body.config);`,
      `const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));`,
    ],
  },
];
