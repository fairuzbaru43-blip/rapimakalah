const DB_NAME = 'rapimakalah-pro';
const DB_VERSION = 1;
const STORE = 'documents';
let databasePromise;
let useAccountStorage = false;

export function setAccountStorageEnabled(enabled) {
  useAccountStorage = Boolean(enabled);
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB tidak tersedia.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Database lokal gagal dibuka.'));
  });
  return databasePromise;
}

async function withStore(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Penyimpanan lokal gagal.'));
    transaction.onabort = () => reject(transaction.error || new Error('Penyimpanan lokal dibatalkan.'));
  });
}

function localFallback() {
  try { return JSON.parse(localStorage.getItem('rapimakalah-documents') || '[]'); }
  catch { return []; }
}

export async function listDocuments() {
  if (useAccountStorage) {
    const response = await fetch('/api/documents', { credentials: 'same-origin' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Dokumen akun gagal dimuat.');
    return result;
  }
  return listLocalDocuments();
}

export async function listLocalDocuments() {
  try {
    const records = await withStore('readonly', (store) => store.getAll());
    return records.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch {
    return localFallback().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
}

export async function saveDocument(document) {
  const record = { ...document, updatedAt: new Date().toISOString() };
  if (useAccountStorage) {
    const response = await fetch('/api/documents', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Dokumen akun gagal disimpan.');
    return result;
  }
  try {
    await withStore('readwrite', (store) => store.put(record));
  } catch {
    const documents = localFallback().filter((item) => item.id !== record.id);
    documents.unshift(record);
    localStorage.setItem('rapimakalah-documents', JSON.stringify(documents));
  }
  return record;
}

export async function removeDocument(id) {
  if (useAccountStorage) {
    const response = await fetch('/api/documents/' + encodeURIComponent(id), {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    if (response.status === 204) return;
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Dokumen akun gagal dihapus.');
  }
  try { await withStore('readwrite', (store) => store.delete(id)); }
  catch {
    localStorage.setItem('rapimakalah-documents', JSON.stringify(localFallback().filter((item) => item.id !== id)));
  }
}

export function makeId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  if (!window.crypto || !window.crypto.getRandomValues) throw new Error('Browser tidak menyediakan generator ID yang aman.');
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
}
