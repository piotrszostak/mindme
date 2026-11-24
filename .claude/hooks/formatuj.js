// Formatuje Prettierem plik zmieniony przez Claude'a (hook PostToolUse), tylko w zakresie `npm run format`.
'use strict';
const fs = require('fs'),
  path = require('path'),
  { spawnSync } = require('child_process');

let input = '';
process.stdin.on('data', d => (input += d));
process.stdin.on('end', () => {
  let file = '';
  try {
    file = String(JSON.parse(input).tool_input.file_path || '');
  } catch (e) {
    process.exit(0);
  }
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const abs = path.resolve(root, file);
  const rel = path.relative(root, abs).split(path.sep).join('/');
  const inScope =
    /^(www|types|tests)\//.test(rel) || ['playwright.config.js', 'tsconfig.json', 'tsconfig.sw.json'].includes(rel);
  const bin = path.join(root, 'node_modules', '.bin', 'prettier');
  if (!file || !inScope || !fs.existsSync(abs) || !fs.existsSync(bin)) process.exit(0);
  const r = spawnSync(bin, ['--write', '--ignore-unknown', '--log-level', 'warn', rel], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) {
    process.stderr.write(`Prettier nie sformatował ${rel}:\n${(r.stderr || r.stdout || '').slice(0, 1500)}\n`);
    process.exit(2);
  }
  process.exit(0);
});
