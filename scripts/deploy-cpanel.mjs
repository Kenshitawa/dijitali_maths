import { spawnSync } from 'node:child_process';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(appRoot, '.env');

function parseEnv(contents) {
  const parsed = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith('#')) continue;

    let value = match[2].trim();
    if (value.length >= 2 && ['"', "'", '`'].includes(value[0]) && value.at(-1) === value[0]) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    parsed[match[1]] = value;
  }
  return parsed;
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with status ${result.status ?? 'unknown'}.`);
  }
}

async function waitForReadiness(appOrigin) {
  const readyUrl = new URL('/api/health/ready', appOrigin);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const response = await globalThis.fetch(readyUrl, {
        signal: globalThis.AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        const body = await response.json();
        if (body.ok === true && body.database === 'ready') return;
      }
    } catch {
      // Passenger may need a short moment to restart after restart.txt is touched.
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, 3_000));
  }
  throw new Error('Deployment was installed, but /api/health/ready did not become healthy within 30 seconds.');
}

async function main() {
  let envContents;
  try {
    envContents = await readFile(envFile, 'utf8');
  } catch {
    throw new Error(`Deployment stopped: create the untracked production .env file in ${appRoot} first.`);
  }

  const env = { ...parseEnv(envContents), ...process.env, NODE_ENV: 'production' };
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  run(npm, ['run', 'check:production-env'], env);
  run(npm, ['ci', '--include=dev'], env);
  run(npm, ['run', 'db:generate:pg'], env);

  const commitDate = spawnSync('git', ['log', '-1', '--format=%cs'], {
    cwd: appRoot,
    encoding: 'utf8',
  });
  env.BUILD_DATE = commitDate.status === 0 ? commitDate.stdout.trim() : new Date().toISOString().slice(0, 10);

  run(npm, ['run', 'build'], env);
  run(npm, ['run', 'db:migrate:pg'], env);
  run(npm, ['prune', '--omit=dev'], env);

  const uploadDir = env.UPLOAD_DIR;
  await mkdir(uploadDir, { recursive: true });
  if (process.platform !== 'win32') await chmod(uploadDir, 0o750);
  await mkdir(path.join(appRoot, 'tmp'), { recursive: true });
  await writeFile(path.join(appRoot, 'tmp', 'restart.txt'), '');

  await waitForReadiness(env.APP_ORIGIN);
  process.stdout.write('Deployment completed and /api/health/ready is healthy.\n');
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'cPanel deployment failed.'}\n`);
  process.exit(1);
});
