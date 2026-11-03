import fs from 'node:fs';
import {refreshGate, parseReviewArgs, sourceFingerprint} from '../src/refresh.mjs';
import {readJSON} from '../src/llm.mjs';
import {render} from '../src/report.mjs';

try {
  const options = parseReviewArgs(process.argv.slice(2));
  console.log(options.mode === 'live'
    ? 'Requesting one live specification review from OpenAI. The API key will not be printed or saved.'
    : 'Replaying a genuine saved review; no network call.');
  const {llm, validation, output} = await refreshGate(options);
  const manifest = fs.existsSync('outputs/run_manifest.json') ? readJSON('outputs/run_manifest.json') : null;
  if (manifest?.sourceSha256 === sourceFingerprint(options.dir) && fs.existsSync('outputs/model_results.json')) {
    render(readJSON('outputs/model_results.json'), validation, llm);
    console.log('Report and submission memo updated from the existing matching model run.');
  } else console.log('Review saved. Run the model pipeline before rendering results for these source files.');
  console.log(`Review accepted: ${llm.route}; ${validation.checks.length} source checks passed; ${output.llm.unresolvedCount} vendor questions remain unresolved.`);
  console.log('Evidence: outputs/llm_review.json; current refresh: outputs/refresh_validation.json');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
