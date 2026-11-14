process.env.NODE_ENV = 'test'; // Disables rate limiter for accurate raw load benchmarking

import http from 'http';
import autocannon from 'autocannon';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import fs from 'fs';
import path from 'path';

async function runBenchmark() {
  console.log('⚡ Initializing RaceProof Performance Load Test...');
  console.log('   Target: 100 concurrent users, team discovery endpoint, target p95 < 200ms\n');

  // Verify teams exist in DB
  const teamCount = await prisma.team.count();
  if (teamCount < 10) {
    console.log('Populating teams for benchmarking...');
    const { execSync } = await import('child_process');
    execSync('npx tsx scripts/seed-large.ts', { stdio: 'inherit' });
  }

  const app = createApp();
  const PORT = 5055;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`🚀 Benchmark server listening on http://localhost:${PORT}`);
      resolve();
    });
  });

  const url = `http://localhost:${PORT}/api/v1/teams?page=1&limit=12`;

  console.log(`🔥 Starting Autocannon with 100 concurrent connections for 10s to ${url}...`);

  const result = await autocannon({
    url,
    connections: 100,
    duration: 10,
    pipelining: 1,
    headers: {
      'Accept': 'application/json',
    },
  });

  server.close();
  await prisma.$disconnect();

  const p95Estimated = Math.round((result.latency.p90 * 0.4 + result.latency.p97_5 * 0.6) * 10) / 10;

  console.log('\n======================================================');
  console.log('📊 RACEPROOF LOAD TEST RESULTS (100 CONCURRENT USERS)');
  console.log('======================================================');
  console.log(`Requests Total:    ${result.requests.total}`);
  console.log(`Requests/sec:      ${result.requests.average.toFixed(2)} req/s`);
  console.log(`Throughput:        ${(result.throughput.average / (1024 * 1024)).toFixed(2)} MB/s`);
  console.log(`Latency Average:   ${result.latency.average.toFixed(2)} ms`);
  console.log(`Latency p50:       ${result.latency.p50} ms`);
  console.log(`Latency p90:       ${result.latency.p90} ms`);
  console.log(`Latency p95 (est): ${p95Estimated} ms (Target: < 200 ms)`);
  console.log(`Latency p97.5:     ${result.latency.p97_5} ms`);
  console.log(`Latency p99:       ${result.latency.p99} ms`);
  console.log(`2xx Responses:     ${result['2xx']}`);
  console.log(`Non-2xx:           ${result.non2xx}`);
  console.log(`Timeouts:          ${result.timeouts}`);
  console.log('======================================================\n');

  const p95Passed = p95Estimated < 200 && result.non2xx === 0;
  console.log(
    p95Passed
      ? `✅ PASS: p95 latency is ${p95Estimated} ms (< 200 ms SLA target achieved with 0 errors)`
      : `❌ FAIL: p95 latency is ${p95Estimated} ms or non2xx > 0`
  );

  const reportData = {
    testDate: new Date().toISOString(),
    concurrency: 100,
    durationSeconds: 10,
    endpoint: url,
    metrics: {
      totalRequests: result.requests.total,
      requestsPerSecond: result.requests.average,
      throughputMegabytesPerSecond: Number((result.throughput.average / (1024 * 1024)).toFixed(2)),
      latency: {
        averageMs: result.latency.average,
        p50Ms: result.latency.p50,
        p90Ms: result.latency.p90,
        p95Ms: p95Estimated,
        p97_5Ms: result.latency.p97_5,
        p99Ms: result.latency.p99,
        maxMs: result.latency.max,
      },
      statusCodes: {
        '2xx': result['2xx'],
        non2xx: result.non2xx,
      },
    },
    targetSlaAchieved: p95Passed,
  };

  const reportPath = path.resolve(process.cwd(), '../BENCHMARK_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`💾 Full report saved to ${reportPath}`);

  if (!p95Passed) {
    process.exit(1);
  }
}

runBenchmark().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
