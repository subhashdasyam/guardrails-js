// Paired cases for the auth, crypto, and access control packs.

export default [
  {
    rule: 'JWT-01',
    fire: `const claims = jwt.verify(token, publicKey);`,
    safe: [
      `const claims = jwt.verify(token, publicKey, { algorithms: ['RS256'], issuer, audience });`,
      `const claims = jwt.verify(token, publicKey, { algorithms: ['ES256'] });`,
      `const ok = signature.verify(payload, key);`,
    ],
  },

  {
    rule: 'JWT-02',
    fire: `const claims = jwt.decode(token);
    if (claims.isAdmin) grantAccess();`,
    safe: [
      `const claims = jwt.verify(token, key, { algorithms: ['RS256'] });
       if (claims.isAdmin) grantAccess();`,
      `const preview = jwt.decode(token);
       const claims = jwt.verify(token, key, { algorithms: ['RS256'] });
       log(preview.kid, claims.sub);`,
    ],
  },

  {
    rule: 'JWT-03',
    fire: `const claims = jwt.verify(token, key, { algorithms: ['none', 'HS256'] });`,
    safe: [
      `const claims = jwt.verify(token, key, { algorithms: ['RS256'] });`,
      `const alignment = ['none', 'left', 'right'];`,
    ],
  },

  {
    rule: 'AUTH-01',
    fire: `const token = jwt.sign({ sub: user.id }, 'keyboard-cat-2024');`,
    safe: [
      `const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET);`,
      `const mac = crypto.createHmac('sha256', signingKey).update(body).digest('hex');`,
    ],
  },

  {
    rule: 'AUTH-02',
    fire: `const resetToken = Math.random().toString(36).slice(2);`,
    safe: [
      `const resetToken = crypto.randomBytes(32).toString('hex');`,
      `const jitter = Math.random() * 100;`,
      `const shuffled = items.sort(() => Math.random() - 0.5);`,
    ],
  },

  {
    rule: 'CRYPTO-01',
    fire: `const cipher = crypto.createCipher('aes-256-cbc', password);`,
    safe: [
      `const cipher = crypto.createCipheriv('aes-256-gcm', key, crypto.randomBytes(12));`,
      `const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);`,
    ],
  },

  {
    rule: 'CRYPTO-02',
    fire: `const cipher = crypto.createCipheriv('aes-128-ecb', key, iv);`,
    safe: [
      `const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);`,
      `const layout = 'ecb';`,
    ],
  },

  {
    rule: 'PASS-01',
    fire: `const stored = crypto.createHash('sha256').update(password).digest('hex');`,
    safe: [
      `const stored = await argon2.hash(password);`,
      `const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');`,
    ],
  },

  {
    rule: 'PASS-02',
    fire: `const stored = bcrypt.hashSync(password, 4);`,
    safe: [`const stored = await bcrypt.hash(password, 12);`, `const stored = await argon2.hash(password);`],
  },

  {
    rule: 'TIMING-01',
    fire: `if (providedToken === expectedToken) { grant(); }`,
    safe: [
      `if (crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken))) { grant(); }`,
      `if (kind === 'token') { handleToken(); }`,
    ],
  },

  {
    rule: 'COOKIE-01',
    fire: `res.cookie('sid', sessionId);`,
    safe: [
      `res.cookie('sid', sessionId, { httpOnly: true, secure: true, sameSite: 'lax' });`,
      `res.cookie('theme', 'dark');`,
    ],
  },

  {
    rule: 'SESSION-01',
    fire: `app.post('/login', async (req, res) => {
      const user = await authenticate(req.body);
      req.session.userId = user.id;
      res.json({ ok: true });
    });`,
    safe: [
      `app.post('/login', async (req, res) => {
        const user = await authenticate(req.body);
        req.session.regenerate((err) => {
          if (err) return res.sendStatus(500);
          req.session.userId = user.id;
          res.json({ ok: true });
        });
      });`,
      `req.session.cart = items;`,
    ],
  },

  {
    rule: 'CSRF-01',
    fire: `res.cookie('sid', sessionId, { httpOnly: true });
    app.post('/transfer', async (req, res) => { await transfer(req.body); res.sendStatus(204); });`,
    safe: [
      `app.use(csurf({ cookie: true }));
       res.cookie('sid', sessionId, { httpOnly: true });
       app.post('/transfer', async (req, res) => { await transfer(req.body); res.sendStatus(204); });`,
      `app.post('/transfer', requireBearer, async (req, res) => { await transfer(req.body); res.sendStatus(204); });`,
    ],
  },

  {
    rule: 'IDOR-01',
    fire: `app.get('/invoices/:id', async (req, res) => {
      const invoice = await Invoice.findById(req.params.id);
      res.json(invoice);
    });`,
    safe: [
      `app.get('/invoices/:id', async (req, res) => {
        const invoice = await Invoice.findOne({ where: { id: req.params.id, orgId: req.user.orgId } });
        res.json(invoice);
      });`,
      `const invoice = await Invoice.findById(internalJobId);`,
    ],
  },

  {
    rule: 'MASS-01',
    fire: `app.post('/users', async (req, res) => {
      const user = new User(req.body);
      await user.save();
      res.sendStatus(201);
    });`,
    safe: [
      `const user = new User({ email: input.email, displayName: input.displayName });`,
      `const parsed = new URL(req.body.url);`,
      `const when = new Date(req.body.startsAt);`,
    ],
  },

  {
    rule: 'AUTHZ-01',
    fire: `app.get('/me', requireAuth, meHandler);
    app.post('/admin/purge', purgeHandler);`,
    safe: [
      `app.get('/me', requireAuth, meHandler);
       app.post('/admin/purge', requireAuth, requireRole('admin'), purgeHandler);`,
      `app.get('/me', requireAuth, meHandler);
       app.post('/notes', createNote);`,
    ],
  },
];
