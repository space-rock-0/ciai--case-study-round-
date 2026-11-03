import fs from 'node:fs';
import path from 'node:path';
import {createZip, verifyZip} from '../src/zip.mjs';
import {sha256, readJSON} from '../src/llm.mjs';
import {save} from '../src/core.mjs';

const allowlist = ['README.md', 'PROGRESS.md', '.gitignore', 'package.json', 'config.json',
  'scripts',
  'src', 'specs', 'tests', 'data', 'outputs'];
const required = ['outputs/report.html', 'outputs/SUBMISSION.md', 'outputs/llm_review.json',
  'outputs/test_results.tap', 'outputs/bootstrap_draws.json', 'tests/llm.test.mjs', 'scripts/review_spec.mjs'];
const secretPattern = /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/;
const files = [];
function collect(item) {
  const stat = fs.lstatSync(item);
  if (stat.isSymbolicLink()) throw Error('Refusing symlink in submission');
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(item).sort()) collect(path.join(item, name));
  } else {
    const name = item.replaceAll('\\', '/');
    if (/(^|\/)(?:\.env(?:\.|$)|node_modules|\.git)(?:\/|$)/.test(name)) throw Error('Excluded path in package');
    const data = fs.readFileSync(item);
    if (secretPattern.test(data.toString('utf8'))) throw Error(`Secret-like API token detected; refusing to package ${name}`);
    files.push({name, data});
  }
}
const verification = readJSON('outputs/artifact_verification.json');
if (!verification.passed) throw Error('Artifact checks must pass before packaging');
for (const item of allowlist) collect(item);
for (const item of required) if (!files.some(f => f.name === item)) throw Error(`Missing deliverable: ${item}`);
const archive = createZip(files);
verifyZip(archive, files);
fs.mkdirSync('submission', {recursive: true});
const target = 'submission/The_Two_Calendars_Submission.zip';
fs.writeFileSync(target, archive);
const digest = sha256(archive);
fs.writeFileSync('submission/SHA256.txt', `${digest}  The_Two_Calendars_Submission.zip\n`);
save('submission/archive_verification.json', {verifiedAt: new Date().toISOString(), entryCount: files.length,
  archiveBytes: archive.length, requiredFilesPresent: true, forwardSlashEntriesOnly: true,
  secretScanPassed: true, everyEntryByteIdentical: true, sha256: digest,
  llmRoute: readJSON('outputs/llm_review.json').route, entries: files.map(f => f.name)});
console.log(`Packaged ${files.length} verified files (${archive.length} bytes): ${target}`);
