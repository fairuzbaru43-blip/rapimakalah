import test from 'node:test';
import assert from 'node:assert/strict';
import viteConfig from '../vite.config.js';

function proxyRequestHandler() {
  let handler;
  viteConfig.server.proxy['/api'].configure({
    on(event, callback) {
      assert.equal(event, 'proxyReq');
      handler = callback;
    }
  });
  return handler;
}

test('Vite proxy forwards a same-origin API request with the upstream origin', () => {
  const handler = proxyRequestHandler();
  let forwardedOrigin;
  handler({ setHeader: (name, value) => { forwardedOrigin = [name, value]; } }, {
    headers: { origin: 'http://localhost:5173', host: 'localhost:5173' }
  });
  assert.deepEqual(forwardedOrigin, ['origin', 'http://127.0.0.1:3001']);
});

test('Vite proxy does not rewrite a cross-origin API request', () => {
  const handler = proxyRequestHandler();
  let rewritten = false;
  handler({ setHeader: () => { rewritten = true; } }, {
    headers: { origin: 'http://attacker.example', host: 'localhost:5173' }
  });
  assert.equal(rewritten, false);
});
