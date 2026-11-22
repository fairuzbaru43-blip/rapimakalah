import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDocument, validateRegistration } from '../server/validation.js';

test('registration validation normalizes email and enforces password confirmation', () => {
  const valid = validateRegistration({
    name: '  Penulis Makalah ',
    email: '  STUDENT@example.com ',
    password: 'a-secure-password',
    passwordConfirmation: 'a-secure-password'
  });
  assert.deepEqual(valid, { valid: true, name: 'Penulis Makalah', email: 'student@example.com' });
  assert.match(validateRegistration({
    name: 'Penulis',
    email: 'student@example.com',
    password: 'short',
    passwordConfirmation: 'short'
  }).message, /minimal 10/);
  assert.match(validateRegistration({
    name: 'Penulis',
    email: 'student@example.com',
    password: 'a-secure-password',
    passwordConfirmation: 'different-password'
  }).message, /tidak sama/);
  assert.match(validateRegistration({
    name: 'Penulis',
    email: 'student@example.com',
    password: '12345678901234567890123456789012345678901234567890123456789012345678901234567890',
    passwordConfirmation: '12345678901234567890123456789012345678901234567890123456789012345678901234567890'
  }).message, /minimal 10/);
});

test('document validation rejects non-UUID IDs and accepts a valid document record', () => {
  const document = { id: 'not-an-uuid', title: 'Makalah', sourceHtml: '<p>Isi</p>' };
  assert.match(validateDocument(document).message, /ID dokumen/);
  document.id = 'b0b09d1c-4c0e-4d81-9822-6f9e3cc1594e';
  assert.deepEqual(validateDocument(document), { valid: true });
  assert.match(validateDocument({ ...document, sourceHtml: null }).message, /Isi dokumen/);
});
