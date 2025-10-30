#!/usr/bin/env node

/**
 * Script para testar se o backend está respondendo
 * Use: node test-backend.js
 */

import http from 'http';

const tests = [
  { name: 'Backend Health', method: 'GET', path: '/api/auth/health', port: 8080 },
  { name: 'Backend Health (alt)', method: 'GET', path: '/api/health', port: 8080 },
  { name: 'Backend CORS', method: 'OPTIONS', path: '/api/auth/callback', port: 8080 },
];

async function testBackend(testConfig) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: testConfig.port,
      path: testConfig.path,
      method: testConfig.method,
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
        'Origin': 'http://localhost:5173'
      },
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`✅ ${testConfig.name}: ${res.statusCode}`);
        resolve(true);
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${testConfig.name}: ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`⏱️ ${testConfig.name}: TIMEOUT`);
      resolve(false);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testando conexão com backend...\n');
  
  for (const test of tests) {
    await testBackend(test);
  }
  
  console.log('\n💡 Se todos os testes falharem, o backend não está rodando.');
  console.log('   Para subir o backend Java:\n');
  console.log('   1. Abra o projeto backend em sua IDE');
  console.log('   2. Execute a classe main (Spring Boot)');
  console.log('   3. Verifique se está rodando em http://localhost:8080');
}

runTests();
