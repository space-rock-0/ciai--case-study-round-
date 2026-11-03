import fs from 'node:fs';
import {loadSources} from './io.mjs';
import {requireValid, save} from './core.mjs';
import {sha256, readJSON, verifyReview, liveReview, SPEC_PATH, LIVE_PATH} from './llm.mjs';

export function sourceFingerprint(dir = 'data/raw') {
  return sha256(['tv_weekly.csv', 'digital_email_monthly.csv', 'sales_monthly.csv']
    .map(name => name + '\n' + fs.readFileSync(`${dir}/${name}`, 'utf8')).join('\n'));
}

export function parseReviewArgs(args) {
  const out = {mode: 'replay', dir: 'data/raw', specPath: SPEC_PATH};
  const flags = {'--spec': 'specPath', '--review': 'reviewPath', '--data': 'dir', '--model': 'model'};
  if (args.includes('--live') && args.includes('--replay')) throw Error('Choose --live or --replay, not both');
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--live') out.mode = 'live';
    else if (arg === '--replay') out.mode = 'replay';
    else if (Object.hasOwn(flags, arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw Error(`Missing value for ${arg}`);
      out[flags[arg]] = value;
    } else if (!arg.startsWith('-') && i === 0) out.dir = arg;
    else throw Error(`Unknown review option: ${arg}`);
  }
  if (out.mode === 'live' && out.reviewPath) throw Error('--review is for replay; omit it for --live');
  return out;
}

export async function refreshGate({dir = 'data/raw', specPath = SPEC_PATH, reviewPath,
  mode = 'replay', model, persist = true, liveOptions = {}} = {}) {
  if (!['live', 'replay'].includes(mode)) throw Error('Unknown review mode');
  const started = new Date().toISOString();
  try {
    const config = readJSON('config.json'), {weeks, rows} = loadSources(dir);
    const validation = requireValid(weeks, rows, config);
    let llm;
    if (mode === 'live') {
      llm = await liveReview(fs.readFileSync(specPath, 'utf8'), validation, {...liveOptions, ...(model ? {model} : {})});
      if (persist) save(LIVE_PATH, llm);
    } else llm = verifyReview(validation, {specPath, reviewPath, persist: false});
    const output = {...validation, inputDirectory: dir, sourceSha256: sourceFingerprint(dir), started,
      at: new Date().toISOString(), llm: {mode: llm.mode, route: llm.route,
        specSha256: llm.specSha256, providerModelIdentifier: llm.providerModelIdentifier,
        unresolvedCount: llm.verification.filter(v => v.passed === null).length,
        checkedCount: llm.verification.filter(v => v.passed === true).length},
      decisionScope: 'Synthetic pipeline gate passed. Unresolved vendor facts still require human confirmation before real-client use.'};
    if (persist) {
      save('outputs/llm_review.json', llm);
      save('outputs/refresh_validation.json', output);
      save('outputs/llm_review_attempt.json', {started, completed: output.at, mode, passed: true,
        specSha256: llm.specSha256, responseId: llm.responseId ?? null});
    }
    return {validation, llm, output};
  } catch (error) {
    if (persist) {
      if (error.audit) save('outputs/llm_rejected_review.json', error.audit);
      const failure = {passed: false, inputDirectory: dir, mode, started, at: new Date().toISOString(), error: error.message};
      save('outputs/refresh_validation.json', failure);
      save('outputs/llm_review_attempt.json', failure);
    }
    throw error;
  }
}
