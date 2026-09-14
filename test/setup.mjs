// Unit/contract tests and microbenchmarks never launch background downloads.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { driverDirectory } from '../src/threat/sqlite.js';
process.env.GUARDRAILS_SQLITE_RUNTIME ||= driverDirectory();
process.env.GUARDRAILS_THREAT_SNAPSHOT ||= path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
process.env.GUARDRAILS_THREAT_MAINTENANCE = 'off';
