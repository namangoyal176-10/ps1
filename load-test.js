import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 50 },
    { duration: '20s', target: 100 }, // 100 concurrent users
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must complete below 200ms
    http_req_failed: ['rate<0.01'],    // Error rate below 1%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5000/api/v1';

export default function () {
  const res = http.get(`${BASE_URL}/teams?page=1&limit=12&track=General`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has teams array': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true && Array.isArray(body.data);
    },
    'latency below 200ms': (r) => r.timings.duration < 200,
  });

  sleep(0.1);
}
