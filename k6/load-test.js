// Test de montée en charge — Helpdesk API
// Exécution : k6 run k6/load-test.js
// ou avec un BASE_URL custom : k6 run -e BASE_URL=http://app:3000 k6/load-test.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const ticketsDuration = new Trend('tickets_list_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // montée à 10 VUs
    { duration: '1m', target: 50 },   // montée à 50 VUs
    { duration: '1m', target: 100 },   // palier à 100 VUs
    { duration: '1m', target: 200 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 }, 
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% des requêtes sous 500ms
    http_req_failed: ['rate<0.01'],     // taux d'erreur < 1%
    errors: ['rate<0.05'],
  },
};

export function setup() {
  // Login avec les comptes seed
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'user@helpdesk.io',
    password: 'Password123!',
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status !== 200) {
    throw new Error(`Setup failed — login returned ${res.status}: ${res.body}`);
  }
  return { token: res.json('token') };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  group('Healthcheck', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, { 'health 200': (r) => r.status === 200 }) || errorRate.add(1);
  });

  group('List tickets', () => {
    const res = http.get(`${BASE_URL}/api/tickets`, { headers });
    ticketsDuration.add(res.timings.duration);
    check(res, {
      'tickets 200': (r) => r.status === 200,
      'has tickets array': (r) => Array.isArray(r.json('tickets')),
    }) || errorRate.add(1);
  });

  group('Create ticket', () => {
    const payload = JSON.stringify({
      title: `Load test ticket ${__VU}-${__ITER}`,
      description: 'This ticket was created by k6 load test for performance measurement.',
      priority: 'LOW',
    });
    const res = http.post(`${BASE_URL}/api/tickets`, payload, { headers });
    check(res, { 'create 201': (r) => r.status === 201 }) || errorRate.add(1);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'k6-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const m = data.metrics;
  return `
========================================
  k6 LOAD TEST — HELPDESK
========================================
  Requests:      ${m.http_reqs.values.count}
  Failed:        ${(m.http_req_failed.values.rate * 100).toFixed(2)}%
  p(95) latency: ${m.http_req_duration.values['p(95)'].toFixed(0)} ms
  avg latency:   ${m.http_req_duration.values.avg.toFixed(0)} ms
  Iterations:    ${m.iterations.values.count}
========================================
`;
}
