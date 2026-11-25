/* global process, console */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), 'public', 'admin', 'admin-ui.js');
let code = readFileSync(file, 'utf8');
const before = (code.match(/\.jsxDEV\(/g) || []).length;
code = code.replace(/\.jsxDEV\(/g, '.jsx(');
writeFileSync(file, code);
console.log(`Stripped ${before} jsxDEV calls.`);
