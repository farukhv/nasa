// Installs the web app's dependencies when they are missing or out of date, so that
// `npm run dev` works straight after `git clone` with no separate install step.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_NODE = [20, 19];
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < MIN_NODE[0] || (major === MIN_NODE[0] && minor < MIN_NODE[1])) {
  console.error(`Martian Map needs Node.js ${MIN_NODE.join('.')} or newer (found ${process.versions.node}). Install a current LTS from https://nodejs.org and run the command again.`);
  process.exit(1);
}

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const lock = join(app, 'package-lock.json');
const stamp = join(app, 'node_modules', '.deps-stamp');
const wanted = createHash('sha256').update(readFileSync(lock)).digest('hex');
const installed = existsSync(stamp) ? readFileSync(stamp, 'utf8').trim() : '';

if (installed === wanted) process.exit(0);

console.log(installed ? 'Dependencies changed, updating…' : 'First run: installing dependencies (about a minute)…');
const run = args => spawnSync('npm', args, { cwd: app, stdio: 'inherit', shell: true }).status === 0;
if (!run(['ci', '--no-audit', '--no-fund']) && !run(['install', '--no-audit', '--no-fund'])) {
  console.error('Dependency installation failed. Check your internet connection and run the command again.');
  process.exit(1);
}
mkdirSync(dirname(stamp), { recursive: true });
writeFileSync(stamp, wanted);
