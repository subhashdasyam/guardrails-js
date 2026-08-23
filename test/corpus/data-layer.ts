// TypeScript data access written correctly. Near misses on purpose: Prisma raw
// through the tagged template, Mongo with forced scalars, yaml through a v4
// loader, a dynamic import from a fixed map.

import { PrismaClient } from '@prisma/client';
import yaml from 'js-yaml';
import fs from 'node:fs';

type SortKey = 'name' | 'created';

const prisma = new PrismaClient();

const LOADERS: Record<string, () => Promise<unknown>> = {
  csv: () => import('./formats/csv.js'),
  json: () => import('./formats/json.js'),
};

export async function findUser(id: string, orgId: string) {
  return prisma.$queryRaw`SELECT id, email FROM users WHERE id = ${id} AND org_id = ${orgId}`;
}

export async function searchUsers(term: string) {
  return prisma.user.findMany({
    where: { email: { contains: term } },
    take: 50,
  });
}

export async function loadFormat(name: string) {
  const loader = LOADERS[name];
  if (!loader) throw new Error(`unknown format: ${name}`);
  return loader();
}

export function readConfig(file: string) {
  const text = fs.readFileSync(file, 'utf8');
  return yaml.load(text);
}

export async function findByEmail(collection: any, email: unknown) {
  return collection.findOne({ email: String(email) });
}

export async function listOrders(collection: any, orgId: string, sort: SortKey) {
  const column = sort === 'name' ? 'name' : 'created_at';
  return collection
    .find({ orgId })
    .sort({ [column]: 1 })
    .limit(100)
    .toArray();
}

export async function transferFunds(db: any, fromId: string, toId: string, amount: number) {
  return db.transaction(async (trx: any) => {
    await trx.raw('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
    await trx.raw('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
  });
}
