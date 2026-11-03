# The Two Calendars

A complete, offline FDE case submission: calendar reconciliation, an inspectable marketing mix model, uncertainty, a budget-neutral counterfactual and a refresh gate. All money and sales are synthetic. No account recommendation can be validated without actual client data.

**Start with [the decision report](outputs/report.html) or [the submission memo](outputs/SUBMISSION.md).** The HTML is self-contained: double-click it to open in Chrome; no server or network is required. Linked evidence files are included in the submission folder.

The [decision workspace](frontend/index.html) is a separate, interactive front end for presenting the solution. Run `node scripts/build_frontend.mjs` after `node scripts/run_pipeline.mjs` to refresh it from the saved model and validation outputs. The budget-split selector shows the precomputed scenarios; it does not refit the model in the browser.

## Run

Requires **Node.js 18+**, with no packages to install. Tested on the exact version saved in `outputs/run_manifest.json`. Python was unavailable in the implementation environment, so the suggested Python structure was replaced with an equivalent dependency-free JavaScript project.

```sh
node scripts/run_pipeline.mjs --seed 42 --bootstrap 200
node --test tests/*.test.mjs
node scripts/validate_refresh.mjs data/raw
node scripts/robustness.mjs
node scripts/verify_artifacts.mjs
node scripts/reproduce.mjs
```

Run from the project root. The main pipeline creates all required folders and overwrites its generated outputs. `scripts/robustness.mjs` creates a separate robustness file and does not overwrite the seed-42 study. Tests inspect the generated results as well as isolated analytical fixtures. A fuller bootstrap uses `--bootstrap 1000`; values below 20 are rejected. Same seed and settings reproduce the numerical results; execution timestamps differ.

## Finding

For seed 42, correcting the TV calendar reduces the equal digital/email transfer's predicted three-month gain from **1.31% to 1.11%**. Both models support the defined action in this synthetic experiment. The corrected estimate is **+28.00 revenue units**, with a model-based 95% interval of **+16.74 to +45.44** (**+0.66% to +1.81%**). The known true synthetic lift is **+31.75 units**. These final intervals refit the full finite adstock/saturation search in every bootstrap draw.

Channel attribution is much less precise than the scenario effect: the corrected TV contribution interval spans roughly **6.8%–75.1%** of observed sales. Do not claim precise causal channel shares from this model. Fixed robustness seeds 17, 83 and 101 are retained without selection: correction improves mean share error in one and worsens it in two. This illustrates weak identification and sampling/model sensitivity, not a reason to leave dates incorrect.

## What is included

| Requirement | Implementation | Evidence |
|---|---|---|
| At least 2 years with known effects | 60 analysis months, 12 warm-up months, complete boundary weeks | `data/raw/`, `outputs/truth.json`, `outputs/config.json` |
| Reproduce and fix error | Whole-week-to-Monday-month versus equal daily apportionment | `src/core.mjs`, `data/processed/`, `outputs/calendar_differences.csv` |
| Adstock + saturation on both versions | Additive constrained monthly MMM, independently selected transforms | `src/model.mjs`, `outputs/model_results.json` |
| Before/after uncertainty | 200 paired circular residual block-bootstrap draws, nonlinear search refitted | `outputs/bootstrap_draws.json`, HTML chart and paired-change table |
| Evaluate 15% reallocation | Three-month, budget-neutral 0/25/50/75/100% digital splits | `outputs/scenarios.csv`, saved common schedule and true benchmarks |
| Refresh protection | Source schemas, frequency, coverage, joins, units and conservation | `scripts/validate_refresh.mjs`, `outputs/refresh_validation.json` |
| Genuine LLM review + verification | Live OpenAI API review, bound replay, retained provenance and independent verification | `specs/llm_review_original.json`, `outputs/llm_review.json`, `src/llm.mjs` |
| Tests and runnable generator | Node built-in tests and one-command seeded generation/fit/report | `tests/`, `scripts/run_pipeline.mjs` |
| HTML before/after | Embedded SVG, computed numbers, accessible table alternatives | `outputs/report.html` |

The optional slide deck is omitted; the report and submission memo contain the stakeholder narrative.

## Design and assumptions

- **Calendar:** Explicit `week_start` and `week_end` establish the TV interval. A 4-4-5 reporting label is never treated as a calendar month. The vendor's fiscal anchor, 53-week handling and original label semantics remain unresolved; the project does not claim to reconstruct them. Generated explicit week dates suffice for day/month overlap.
- **Allocation:** TV is divided into seven equal daily amounts because daily delivery is unavailable. All seven days are expanded before cropping. Full-calendar conservation and cropped-window overlap conservation are checked separately. Actual day delivery would replace the equal-sevenths assumption.
- **Units:** TV/digital/email spend use simulated currency thousands; sales use simulated revenue units. This is an explicit synthetic schema, not confirmation of unspecified vendor units. Dates are civil dates with UTC arithmetic, not inferred source timezones.
- **Generator:** Seed 42 is fixed before results. Weekly TV includes independently placed bursts; monthly digital/email vary independently. Monthly sales add known saturated adstock effects, baseline, modest trend, annual sine/cosine and mean-zero noise. No seed or coefficient search was used to engineer reversal. Known effects and parameters are stored outside estimator inputs.
- **Truth:** A channel's true share is its noiseless generated effect divided by total observed sales in the same analysis window. The estimator uses the identical fixed denominator. Media contributions need not sum to 100%. The historical 22/19/11 percentages are context only; the case does not identify the remaining 48%.
- **Model:** `adstock[t] = spend[t] + decay * adstock[t-1]`; `response[t] = adstock[t] / (half + adstock[t])`. Add intercept, linear trend, annual sine/cosine and nonnegative media coefficients. Controls are unconstrained; weak identification can produce negative control components or media shares above 100% in some fits. These are diagnostic warnings, not economic decompositions to accept literally.
- **Search:** 180 reproducible joint transform candidates, search seed 7301, decay 0.05–0.80, half-saturation 0.35–4.0 times mean channel spend in pre-holdout months (including warm-up). The same physical candidate set is used in both calendar versions. Per-candidate constrained least squares enumerates all media active sets. Best training SSE selects the candidate. This is finite search, not an assertion of a continuous global optimum. True generator parameters are not used for fitting.
- **Holdout:** Final 12 analysis months reserved for diagnostics; preceding 48 used for model/transform selection. Final contribution and scenario estimates refit all 60 analysis months, under the same fixed protocol. Controls-only season/trend model provides a predictive baseline. Warm-up initializes adstock but its sales are not fitted.
- **Uncertainty:** Circular 3-month blocks resample centered residuals, leaving designs in chronological order. Both models share bootstrap index draws. Each draw repeats constrained fitting and all 180 transform choices. 200 valid draws per version, zero failures. Draws and selected parameters are saved. Percentile intervals remain approximate and depend on the synthetic response family, finite transform set, error assumptions and selected block length. They do not quantify all causal uncertainty. Support is the fraction of bootstrap draws with positive lift, not a calibrated probability of real-world success.
- **Sensitivity:** Top 20 full-fit transform candidates give a descriptive range, not a confidence interval. Additional fixed seeds expose estimation instability and are not used to select the main result.
- **Scenario:** Repeat the last corrected quarter's physical budgets for a hypothetical three-month planning horizon. Reduce TV by 15%; split the removed budget equally between digital/email in the primary case. Evaluate other splits separately. Baseline and intervention inherit identical within-model historical adstock; both models use the same future schedule. Include within-horizon carryover, exclude an additional tail. No claim that exactly 15% is optimal, or that an average contribution/spend ratio measures marginal return. No client materiality threshold was specified.
- **Decision:** Interval wholly above zero = supported under the model; wholly below zero = revisit; crossing zero = inconclusive. Conclusions apply to the hypothetical synthetic scenario only. The same-family generator is deliberately favorable to model recovery compared with real MMM.

## LLM evidence and refresh workflow

Requirement 5 is implemented with a real OpenAI Responses API adapter, a genuine saved provider response, exact-specification replay, and independent source checks. The original Codex-context review is retained for clean offline reproduction; it is explicitly distinguished from live API evidence.

**Live execution:** Paste the key into the root `.env` file:

```text
OPENAI_API_KEY=your-api-key-here
```

The file is ignored by Git. Then run:

```sh
node scripts/review_spec.mjs --live
```

This performs one paid API request, validates its result, saves accepted evidence, and updates the report/memo when the source fingerprint matches the existing model run. No package installation is needed. The key is read from the process environment and never written into request bodies, audit artifacts, logs or the submission. Authorization headers are used only for the HTTPS request to `https://api.openai.com/v1/responses`. `store:false`, no tools, no redirects and no automatic retries are configured. This does not promise zero provider-side retention under all account policies.

The default model is `gpt-5.4-mini`. Override explicitly with `--model MODEL` or `OPENAI_MODEL`; model access depends on the API project. The request uses strict JSON Schema output, at most 6,000 output tokens, a 48,000-byte specification limit and a 60-second timeout. The exact served model, response/request identifiers, timestamp, usage, prompt, key-free request body, raw provider response and extracted review are retained. The first live attempt was rejected for a mismatched copied quote; the corrected implementation asks the model to select numbered line IDs and deterministically extracts verbatim source text. Rejected binding/verification responses are retained separately for audit and never accepted as genuine successful evidence.

**On every refresh:**

```sh
node scripts/validate_refresh.mjs data/raw
# Or explicitly perform a new paid review with that refresh:
node scripts/validate_refresh.mjs data/raw --live
# Full seeded study with live review before estimation:
node scripts/run_pipeline.mjs --seed 42 --bootstrap 200 --live
```

Replay performs no API call. It verifies the exact specification SHA-256/input, rechecks evidence references/quotes and re-runs linked validators against current source files. Changed specifications, incompatible grains/calendars, fabricated evidence, malformed responses, refusals, missing credentials, timeouts and provider errors fail closed. A stale saved API review never silently falls back to the original Codex review. Successful live review is saved as `outputs/llm_live_review.json`; the current run's bound evidence is `outputs/llm_review.json`. Provenance tells whether that operation was live or replayed. A specification hash is a change detector, not a cryptographic signature proving provider authenticity.

For a changed specification, run `node scripts/review_spec.mjs --live --spec PATH`. If the new source calendar conflicts with the supported Monday–Sunday/monthly contract, acceptance stops until the implementation and vendor contract are reconciled. Replay a specific genuine bundle with `--review PATH`. The original Codex review is bound to the immutable original-spec hash in `specs/llm_review_original.manifest.json` and is used only when no saved API review exists. Its exact backend model ID was unavailable; the saved API evidence has an actual served-model identifier.

The LLM flags assumptions, not pass/fail results. Independent date arithmetic and data validators check grain, week boundaries, gaps, coverage, joins and conservation. Unresolved semantic facts retain the actual information request rather than pointing to an unrelated passing data check. Passing the synthetic refresh gate is not approval to use unknown vendor units, fiscal anchors, label semantics, timezones or uniform daily delivery as real-client facts.

Source-drop contract:

```text
 tv_weekly.csv                  week_start,week_end,tv
 digital_email_monthly.csv      month,digital,email
 sales_monthly.csv              month,sales
```

The strict lightweight reader supports these controlled unquoted CSV files. It rejects blank values, invalid schemas, duplicates and mismatched month keys. TV weeks must be contiguous Monday–Sunday; monthly coverage must be complete. Spend must be finite/nonnegative; sales may be finite and negative. Configure the expected window and confirmed unit contract in `config.json`. The gate exits nonzero on failure and writes the current failed status, avoiding stale success artifacts. Real-source model estimation still requires a reviewed extension of the synthetic driver, with generator-only truth benchmarks removed.

**Evidence and safe reproduction:**

- `outputs/llm_review.json`: current verification, source hash, accepted review and provenance.
- `outputs/llm_live_review.json`: genuine live API response bundle, if a live run has been accepted.
- `outputs/llm_review_attempt.json`: latest attempt status; `llm_rejected_review.json` only if a later reply was rejected after capture.
- `outputs/refresh_validation.json`: source-gate result, review route and unresolved count.
- `tests/llm.test.mjs`: simulated provider tests, clearly separate from genuine execution evidence.

For packaging after a successful live review, run `node --test --test-reporter=tap tests/*.test.mjs` and `node scripts/verify_artifacts.mjs`, then `node scripts/package_submission.mjs`. The package writer checks every archived byte/CRC, uses portable ZIP paths, follows an explicit allowlist, refuses symlinks and API-key-like tokens, and saves an archive inventory/checksum. It does not require changing PowerShell execution policy. `.env*` files and dependencies are excluded. Keep API credentials in your terminal, not project files or chat; remove the environment variable and revoke a temporary key when finished.

The adapter follows the [official Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) and [GPT-5.4 Mini model documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini).

## Verification and limitations

See `outputs/test_results.tap`, `outputs/artifact_verification.json` and `PROGRESS.md` for actual execution evidence. Boundary fixtures include month/year crossings, leap day, a whole-month week and zero spend. Failure fixtures cover date/grain errors, gaps, duplicates, missing/invalid numeric values, units and failed joins. Model tests recover known noiseless coefficients and verify budget conservation and circular bootstrap blocks.

Chrome visual access succeeded on a later retry after the user opened the report and left it active. Native computer use inspected the opening header/executive introduction, contribution chart with intervals and truth markers, contribution table and scenario table at a 1233 x 678 desktop window. No obvious clipping or layout defects were seen in those sections. This was a limited desktop inspection; full-page, mobile and print layouts remain unchecked. The final API provenance panel and flag-to-validator table were also inspected after live review and offline replay. See outputs/visual_review.json for timestamps, version-specific scopes and reviewed HTML hashes. Earlier blocked attempts remain recorded in PROGRESS.md. Structural/offline, numerical and local-link checks are separate.

The final report includes an action note: notify the account lead and Brand Director promptly, qualify unsupported Q3 claims, reconcile vendor data within two days and review corrected real-account evidence before the presentation in 10 days. No messages were sent.

## Files

- `src/core.mjs`: generator, calendar conversion, seeded random draws, validation and output helpers.
- `src/model.mjs`: design, constrained regression, transform search, forecasts and bootstrap.
- `src/llm.mjs`: live Responses API adapter, strict output schema, evidence extraction and hash-bound replay.
- `src/spec_review.mjs`: compatibility export for the original project layout.
- `src/refresh.mjs`: current-source validation and LLM verification before modeling.
- `scripts/review_spec.mjs`: live/replay review command and matching report refresh.
- `src/report.mjs`: generated HTML and submission memo.
- `src/io.mjs`: strict source loading and one-to-one joins.
- `scripts/run_pipeline.mjs`: complete synthetic experiment.
- `scripts/robustness.mjs`: independent seeds 17/83/101, descriptive results.
- `scripts/validate_refresh.mjs`: disk-based fail-closed refresh gate.
- `scripts/verify_artifacts.mjs`: generated-artifact consistency checks.
- `scripts/reproduce.mjs`: isolated clean run and exact numerical comparison (timestamps excluded).
- `scripts/package_submission.mjs`: portable ZIP, explicit source/evidence allowlist, secret scan, exact-byte verification and checksum.
- `scripts/package_submission.ps1`: legacy convenience wrapper; prefer the Node command when script execution is disabled.

Case facts come from the supplied images; all analytical results come from the included synthetic experiment. Official OpenAI documentation supports the API integration; no public MMM dataset or external sample schema is required.
