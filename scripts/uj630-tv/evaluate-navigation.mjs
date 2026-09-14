import fs from 'node:fs';
import path from 'node:path';
const policy = JSON.parse(fs.readFileSync(new URL('./acceptance-policy.json', import.meta.url)));
const [inputDirectory, outputFile] = process.argv.slice(2);
if (!inputDirectory || !outputFile) throw Error('Usage: evaluate-navigation.mjs historical-evidence-directory new-report.json');
const runs = [1, 2, 3].map(run => {
  const name = `candidate42-service-restarted-${run}.json`;
  const data = JSON.parse(fs.readFileSync(path.join(inputDirectory, name)));
  const frames = data.summary.frameMs;
  return {run, source: name, frames, pass: frames.p95 <= policy.frameP95MaxMs && frames.p99 <= policy.frameP99MaxMs && frames.max <= policy.frameMaxMs};
});
const report = {createdAt: new Date().toISOString(), policy, scope: 'Re-evaluation of historical candidate42 measurements under the newly authorized threshold; no new benchmark of the Ghibli package.', runs, allRunsPass: runs.every(r => r.pass)};
fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify({allRunsPass: report.allRunsPass, p99Ms: runs.map(r => r.frames.p99), thresholdMs: policy.frameP99MaxMs}));
if (!report.allRunsPass) process.exitCode = 1;
