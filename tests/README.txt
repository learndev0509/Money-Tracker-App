Browser tests (Playwright, Chromium). From this folder:
  npm init -y && npm i playwright && npx playwright install chromium
  node features.test.js && node welcome.test.js && node round2.test.js && node round3.test.js && node safety.test.js && node ui.test.js && node fuel.test.js && node secure.test.js
Each prints PASS/FAIL lines; screenshots land in tests/shots.
secure.test.js serves the app from a fake https://money.test origin (Playwright route) and attaches Chromium's virtual
authenticator with PRF, so Face ID enrol/unlock, the service-worker precache and budget notifications run headless.
