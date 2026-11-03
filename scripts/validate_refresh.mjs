import {refreshGate, parseReviewArgs} from '../src/refresh.mjs';
try {
  const {validation, output} = await refreshGate(parseReviewArgs(process.argv.slice(2)));
  console.log(`Refresh accepted: ${validation.checks.length} source checks; genuine LLM review ${output.llm.mode}; exact specification hash matched; ${output.llm.unresolvedCount} vendor questions remain unresolved.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
