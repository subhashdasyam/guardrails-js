// Realistic Express service written correctly. Nothing here may fire a rule.
// Deliberately full of near misses: raw SQL that is parameterised, a fetch with
// an allowlist, a path join with containment, exec with a constant.

import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { z } from 'zod';

const app = express();
const ROOT = path.resolve('/srv/uploads');
const ALLOWED_HOSTS = new Set(['api.partner.example', 'cdn.partner.example']);
const SORT_COLUMNS = { name: 'name', created: 'created_at' };

app.use(express.json({ limit: '512kb' }));
app.set('trust proxy', 1);

const CreateUser = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
});

app.get('/users/:id', requireAuth, async (req, res) => {
  const rows = await pool.query('SELECT id, email FROM users WHERE id = $1 AND org_id = $2', [
    req.params.id,
    req.user.orgId,
  ]);
  res.json(rows.rows[0] ?? null);
});

app.get('/users', requireAuth, async (req, res) => {
  const column = SORT_COLUMNS[req.query.sort] ?? 'created_at';
  const rows = await pool.query(`SELECT id, email FROM users ORDER BY ${column} LIMIT 50`);
  res.json(rows.rows);
});

app.post('/users', requireAuth, async (req, res) => {
  const input = CreateUser.parse(req.body);
  const user = await User.create({ email: input.email, displayName: input.displayName });
  res.status(201).json({ id: user.id });
});

app.get('/files/:name', requireAuth, (req, res) => {
  const target = path.resolve(ROOT, req.params.name);
  if (!target.startsWith(ROOT + path.sep)) return res.sendStatus(400);
  return res.sendFile(target);
});

app.post('/proxy', requireAuth, async (req, res) => {
  let parsed;
  try {
    parsed = new URL(req.body.url);
  } catch {
    return res.sendStatus(400);
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return res.sendStatus(400);
  }
  const upstream = await fetch(parsed, { redirect: 'error' });
  return res.type('application/json').send(await upstream.text());
});

app.post('/thumbnail', requireAuth, (req, res) => {
  execFile('/usr/bin/convert', ['-thumbnail', '200x200', safeName(req.body.file)], (err) => {
    if (err) return res.sendStatus(500);
    return res.sendStatus(202);
  });
});

app.get('/session', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('sid', token, { httpOnly: true, secure: true, sameSite: 'lax' });
  res.setHeader('Content-Type', 'application/json');
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  const requestId = crypto.randomUUID();
  logger.error({ err, requestId });
  res.status(500).json({ error: 'Internal error', requestId });
});

export default app;
