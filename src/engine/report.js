// Turning findings into something Claude will act on, and into a file you can
// read later.

import fs from 'node:fs';
import path from 'node:path';

const LOUD = new Set(['critical', 'high']);

export function splitBySeverity(findings) {
  const loud = [];
  const quiet = [];
  for (const finding of findings) {
    if (LOUD.has(finding.severity) && !finding.downgraded) loud.push(finding);
    else quiet.push(finding);
  }
  return { loud, quiet };
}

function formatOne(finding, index) {
  const labels = [finding.severity.toUpperCase()];
  if (finding.owasp2025) labels.push(`OWASP ${finding.owasp2025}:2025`);
  if (finding.cwe?.length) labels.push(finding.cwe.join(', '));

  const lines = [
    `${index}. ${finding.ruleId} [${labels.join(' | ')}] line ${finding.line}`,
    `   ${finding.message}`,
  ];

  if (finding.evidence) lines.push(`   found: ${finding.evidence}`);
  if (finding.fix) {
    const fix = finding.fix.split('\n');
    lines.push(`   fix: ${fix[0]}`);
    for (const extra of fix.slice(1)) lines.push(`        ${extra}`);
  }
  if (finding.downgraded) {
    lines.push('   (raised before and still here, so this is the last time it is flagged)');
  }

  return lines.join('\n');
}

/**
 * Text for the loud channel. This goes on stderr with exit code 2, which is how
 * Claude Code hands a message back to Claude without stopping the turn.
 */
export function formatLoud(findings, relativePath) {
  const header = `guardrails-js found ${findings.length} issue${
    findings.length === 1 ? '' : 's'
  } in ${relativePath} that need fixing before you move on:`;

  const body = findings.map((finding, i) => formatOne(finding, i + 1)).join('\n\n');

  return `${header}\n\n${body}\n\nRewrite the affected lines. Do not add a comment saying it is fine.`;
}

/** Text for the quiet channel, delivered as additionalContext. */
export function formatQuiet(findings, relativePath) {
  const header = `guardrails-js notes on ${relativePath} (worth fixing, not urgent):`;
  const body = findings.map((finding, i) => formatOne(finding, i + 1)).join('\n\n');
  return `${header}\n\n${body}`;
}

function stamp(finding) {
  const labels = [finding.severity];
  if (finding.owasp2025) labels.push(`OWASP ${finding.owasp2025}:2025`);
  if (finding.cwe?.length) labels.push(finding.cwe.join(' '));
  if (finding.api) labels.push(`API ${finding.api}`);
  return labels.join(' | ');
}

/**
 * Append to the session report. Written through a temp file and renamed,
 * because several hooks can be writing at the same moment.
 */
export function appendReport(projectRoot, relativePath, findings) {
  if (findings.length === 0) return;

  const dir = path.join(projectRoot, '.claude');
  const file = path.join(dir, 'guardrails-js-report.md');

  const blocks = [`\n## ${relativePath}\n`];
  for (const finding of findings) {
    blocks.push(
      [
        `### ${finding.ruleId} line ${finding.line}`,
        '',
        `- severity: ${stamp(finding)}`,
        `- ${finding.message}`,
        finding.evidence ? `- found: \`${finding.evidence.replace(/`/g, "'")}\`` : null,
        finding.fix ? `- fix:\n\n\`\`\`js\n${finding.fix}\n\`\`\`` : null,
        '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  try {
    fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        '# guardrails-js report\n\nWritten by the guardrails-js plugin as Claude edits files.\n',
        'utf8',
      );
    }

    fs.appendFileSync(file, blocks.join('\n'), 'utf8');
  } catch {
    // Reporting is a convenience. Never fail the hook over it.
  }
}

export function summaryLine(findings) {
  const counts = {};
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([severity, count]) => `${count} ${severity}`)
    .join(', ');
}
