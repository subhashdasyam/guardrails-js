// Paired cases for the resource exhaustion pack.

export default [
  {
    rule: 'REDOS-01',
    fire: `const VALID = /^(a+)+$/;`,
    safe: [`const SLUG = /^[a-z0-9-]+$/;`, `const PHONE = /^\\d{3}-\\d{4}$/;`],
  },

  {
    rule: 'BODY-01',
    fire: `app.use(express.json());`,
    safe: [`app.use(express.json({ limit: '1mb' }));`, `app.use(cors());`],
  },

  {
    rule: 'UPLOAD-01',
    fire: `const upload = multer({ dest: 'uploads/' });`,
    safe: [
      `const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024, files: 3 } });`,
      `const storage = multer.memoryStorage();`,
    ],
  },

  {
    rule: 'ZIP-01',
    fire: `for (const entry of zip.getEntries()) {
      fs.writeFileSync(path.join(outDir, entry.entryName), entry.getData());
    }`,
    safe: [
      `for (const entry of zip.getEntries()) {
        const out = path.resolve(outDir, entry.entryName);
        if (!out.startsWith(outDir + path.sep)) throw new Error('unsafe entry');
        fs.writeFileSync(out, entry.getData());
      }`,
      `fs.writeFileSync(path.join(outDir, 'manifest.json'), body);`,
    ],
  },

  {
    rule: 'RATE-01',
    fire: `app.post('/login', async (req, res) => { await checkPassword(req.body); res.sendStatus(200); });`,
    safe: [
      `const limiter = rateLimit({ windowMs: 900000, limit: 10 });
       app.post('/login', limiter, async (req, res) => { await checkPassword(req.body); res.sendStatus(200); });`,
      `app.post('/notes', async (req, res) => { await createNote(req.body); res.sendStatus(201); });`,
    ],
  },
];
