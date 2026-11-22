import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import reactPlugin from '@vitejs/plugin-react';
import 'fake-indexeddb/auto';
import { defaultMetadata, defaultSettings, estimatePageCount, formatDocument } from '../src/services/documentFormatter.js';
import { parseDocument, plainTextToHtml } from '../src/services/documentParser.js';
import { createDocxBlob } from '../src/services/docxGenerator.js';
import { readDocx } from '../src/services/docxReader.js';
import { listDocuments, removeDocument, saveDocument, setAccountStorageEnabled } from '../src/services/storage.js';
import { MAX_DOCUMENT_UPLOAD_BYTES, validateDocumentFile } from '../src/services/uploadValidation.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const browserLikeWindow = new JSDOM('').window;
globalThis.DOMParser = browserLikeWindow.DOMParser;
globalThis.document = browserLikeWindow.document;
globalThis.HTMLAnchorElement = browserLikeWindow.HTMLAnchorElement;
globalThis.window = globalThis;

const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/K8sAAAAASUVORK5CYII=';
const sampleHtml = [
  '<p>MAKALAH</p><p class="cover-title"><strong>Teknologi Informasi</strong></p>',
  '<h1>KATA PENGANTAR</h1><p>Pengantar naskah ini.</p><p>Takeran, 2026</p><p>Penulis</p>',
  '<h1>DAFTAR ISI</h1><p>BAB I PENDAHULUAN</p>',
  '<h1>BAB I PENDAHULUAN</h1><h2>A. Latar Belakang</h2><p>Isi bab pertama.</p>',
  '<ol><li>Butir satu</li><li>Butir dua</li></ol>',
  '<table><tr><th>Aspek</th><th>Nilai</th></tr><tr><td>Contoh</td><td>Baik</td></tr></table>',
  '<p><img src="' + pixel + '" alt="Ilustrasi"></p>',
  '<h1>BAB II PEMBAHASAN</h1><p>Isi bab kedua.</p><h1>DAFTAR PUSTAKA</h1><p>Sumber contoh.</p>'
].join('');

function settingsFor(overrides = {}) {
  return {
    ...structuredClone(defaultSettings),
    ...overrides,
    rules: { ...defaultSettings.rules, ...(overrides.rules || {}) },
    paper: { ...defaultSettings.paper, ...(overrides.paper || {}) },
    typography: { ...defaultSettings.typography, ...(overrides.typography || {}) },
    numbering: { ...defaultSettings.numbering, ...(overrides.numbering || {}) }
  };
}

async function xmlFrom(blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml').async('string');
  return { zip, xml };
}

test('parser recognizes chapters, subheadings, lists, tables, images, and front matter', () => {
  const parsed = parseDocument(sampleHtml);
  assert.equal(parsed.analysis.hasCover, true);
  assert.equal(parsed.analysis.hasPreface, true);
  assert.equal(parsed.analysis.hasToc, true);
  assert.equal(parsed.analysis.hasReferences, true);
  assert.equal(parsed.analysis.chapterCount, 2);
  assert.equal(parsed.analysis.tableCount, 1);
  assert.equal(parsed.analysis.imageCount, 1);
  assert.equal(parsed.analysis.listCount, 1);
  assert.ok(parsed.blocks.some((block) => block.text === 'A. Latar Belakang' && block.type === 'heading2'));
});

test('plain text keeps its paragraph breaks and detects BAB headings', () => {
  const source = 'BAB I PENDAHULUAN\n\nParagraf pertama.\nLanjutan paragraf.\n\nBAB II PEMBAHASAN\n\nIsi kedua.';
  const parsed = parseDocument(plainTextToHtml(source));
  assert.equal(parsed.analysis.chapterCount, 2);
  assert.equal(parsed.analysis.paragraphCount, 2);
  assert.match(parsed.blocks[1].html, /<br/i);
});

test('plain text import converts basic Markdown headings, emphasis, and lists safely', () => {
  const source = '# BAB I PENDAHULUAN\n\nIsi **penting** dan *miring*.\n\n- Butir satu\n- <skrip>\n\n1. Langkah satu\n2. Langkah dua';
  const html = plainTextToHtml(source);
  const parsed = parseDocument(html);
  assert.match(html, /<h1>BAB I PENDAHULUAN<\/h1>/);
  assert.match(html, /<strong>penting<\/strong>/);
  assert.match(html, /<em>miring<\/em>/);
  assert.match(html, /<ul>[\s\S]*<\/ul>/);
  assert.match(html, /<ol>[\s\S]*<\/ol>/);
  assert.doesNotMatch(html, /<skrip>/i);
  assert.equal(parsed.analysis.chapterCount, 1);
  assert.equal(parsed.analysis.listCount, 2);
});

test('document upload validation rejects empty, oversized, and unsupported files', () => {
  assert.equal(validateDocumentFile({ name: 'paper.docx', size: 1 }).valid, true);
  assert.equal(validateDocumentFile({ name: 'paper.txt', size: 1 }).valid, true);
  assert.match(validateDocumentFile({ name: 'empty.txt', size: 0 }).message, /kosong/i);
  assert.match(validateDocumentFile({ name: 'large.docx', size: MAX_DOCUMENT_UPLOAD_BYTES + 1 }).message, /25 MB/i);
  assert.match(validateDocumentFile({ name: 'paper.pdf', size: 1 }).message, /belum didukung/i);
});

test('document preview renders page dimensions for portrait and landscape', async () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const server = await createServer({
    root: projectRoot,
    configFile: false,
    plugins: [reactPlugin()],
    server: { middlewareMode: true },
    appType: 'custom'
  });
  try {
    const { default: DocumentPreview } = await server.ssrLoadModule('/src/components/DocumentPreview.jsx');
    const { default: App } = await server.ssrLoadModule('/src/App.jsx');
    const { LandingPage } = await server.ssrLoadModule('/src/pages/PublicPages.jsx');
    const dashboard = renderToStaticMarkup(React.createElement(App));
    assert.match(dashboard, /Menyiapkan ruang kerja/);
    const landing = renderToStaticMarkup(React.createElement(LandingPage, {
      onLogin: () => {}, onRegister: () => {}, serviceError: ''
    }));
    assert.match(landing, /Mulai Sekarang/);
    assert.match(landing, /Daftar gratis/);
    const blocks = parseDocument('<h1>BAB I PENDAHULUAN</h1><p>Isi dokumen.</p>').blocks;
    const render = (settings) => renderToStaticMarkup(React.createElement(DocumentPreview, {
      blocks, settings, title: 'Uji preview', currentPage: 0,
      onPageChange: () => {}, onPageCount: () => {}
    }));
    const portrait = render(settingsFor());
    assert.match(portrait, /width:794px/);
    assert.match(portrait, /min-height:1123px/);
    const landscape = render(settingsFor({ paper: { size: 'A5', orientation: 'landscape' } }));
    assert.match(landscape, /width:794px/);
    assert.match(landscape, /min-height:559px/);
    assert.match(landscape, /A5/);
  } finally {
    await server.close();
  }
});

test('pasted HTML is sanitized before it reaches the preview', () => {
  const parsed = parseDocument('<p onclick="alert(1)" style="background:url(javascript:alert(1))">Aman</p><img src="javascript:alert(1)" onerror="alert(2)">');
  assert.doesNotMatch(parsed.html, /onclick|onerror|javascript:|url\(/i);
  assert.match(parsed.html, /Aman/);
});

test('generated cover and table of contents are inserted only when missing', () => {
  const options = settingsFor({ rules: { cover: true, toc: true } });
  const plain = '<h1>BAB I PENDAHULUAN</h1><h2>A. Latar Belakang</h2><p>Isi.</p>';
  const formatted = formatDocument(plain, options, { ...defaultMetadata, title: 'Judul Uji' });
  assert.equal(formatted.coverAdded, true);
  assert.equal(formatted.tocAdded, true);
  assert.match(formatted.html, /cover-title/);
  assert.match(formatted.html, /generated-toc/);

  const existing = formatDocument(sampleHtml, options, { ...defaultMetadata, title: 'Judul Uji' });
  assert.equal(existing.coverAdded, false);
  assert.equal(existing.tocAdded, true);
  assert.equal((existing.html.match(/<h1>DAFTAR ISI<\/h1>/g) || []).length, 1);
});

test('DOCX export contains editable paragraphs, tables, images, a Word TOC, and Roman/Arabic sections', async () => {
  const blocks = parseDocument(sampleHtml).blocks;
  const settings = settingsFor({ rules: { toc: true }, paper: { size: 'A4' } });
  const blob = await createDocxBlob({
    blocks, settings,
    metadata: { ...defaultMetadata, title: 'Makalah Uji', author: 'Penulis Uji' },
    addGeneratedCover: false
  });
  assert.ok(blob.size > 1000);
  const { zip, xml } = await xmlFrom(blob);
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /<w:drawing>/);
  assert.match(xml, /TOC/);
  assert.match(xml, /BAB I PENDAHULUAN/);
  assert.match(xml, /w:pgSz[^>]*w:w="11906"[^>]*w:h="16838"/);
  const documentProperties = await zip.file('word/document.xml').async('string');
  assert.ok(documentProperties.includes('w:sectPr'));
  const settingsXml = await zip.file('word/settings.xml').async('string');
  assert.match(settingsXml, /updateFields/);
  const allFiles = Object.keys(zip.files);
  assert.ok(allFiles.some((path) => path.startsWith('word/media/')));
  const sectionXml = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || [];
  assert.ok(sectionXml.length >= 2);
  const fullPackage = await Promise.all(allFiles.map(async (path) => path.endsWith('.xml') ? zip.file(path).async('string') : ''));
  assert.ok(fullPackage.some((value) => /w:fmt="lowerRoman"/.test(value)));
  assert.ok(fullPackage.some((value) => /w:fmt="decimal"/.test(value)));
});

test('DOCX export forces imported colored text and headings to black', async () => {
  const blocks = parseDocument(
    '<h1 style="color:#ff0000">BAB I PENDAHULUAN</h1><p><span style="color:#0000ff">Teks berwarna</span></p>'
  ).blocks;
  const blob = await createDocxBlob({
    blocks, settings: settingsFor(),
    metadata: { ...defaultMetadata, title: 'Makalah Uji' },
    addGeneratedCover: false
  });
  const { xml } = await xmlFrom(blob);
  const xmlDocument = new DOMParser().parseFromString(xml, 'application/xml');

  ['BAB I PENDAHULUAN', 'Teks berwarna'].forEach((text) => {
    const textNode = Array.from(xmlDocument.getElementsByTagName('w:t'))
      .find((node) => node.textContent === text);
    assert.ok(textNode, 'expected text in DOCX: ' + text);
    const color = textNode.parentElement.getElementsByTagName('w:color')[0];
    assert.equal(color && color.getAttribute('w:val'), '000000');
  });
});

test('cover generation does not add a second cover to an existing cover', async () => {
  const blocks = parseDocument(sampleHtml).blocks;
  const blob = await createDocxBlob({
    blocks, settings: settingsFor(),
    metadata: { ...defaultMetadata, title: 'Teknologi Informasi' },
    addGeneratedCover: false
  });
  const { xml } = await xmlFrom(blob);
  const occurrences = xml.match(/MAKALAH/g) || [];
  assert.equal(occurrences.length, 1);
});

test('DOCX import reads headings, paragraphs, and tables back into editor HTML', async () => {
  const blocks = parseDocument(sampleHtml).blocks;
  const blob = await createDocxBlob({
    blocks, settings: settingsFor(),
    metadata: { ...defaultMetadata, title: 'Import round trip' },
    addGeneratedCover: false
  });
  const file = new File([blob], 'round-trip.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  const imported = await readDocx(file);
  assert.match(imported.html, /BAB I PENDAHULUAN/);
  assert.match(imported.html, /Takeran, 2026/);
  assert.match(imported.html, /<table/i);
  assert.ok(imported.mediaCount > 0);
});

test('DOCX import rejects a ZIP file without the Word document part', async () => {
  const zip = new JSZip();
  zip.file('readme.txt', 'bukan dokumen Word');
  const archive = await zip.generateAsync({ type: 'nodebuffer' });
  const file = new File([archive], 'invalid.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  await assert.rejects(() => readDocx(file), /tidak berisi dokumen Word yang valid/i);
});

test('long manuscripts paginate beyond twenty pages', () => {
  const source = Array.from({ length: 800 }, (_, index) => '<p>Paragraf panjang nomor ' + index + ' dengan isi makalah untuk pengujian pembagian halaman.</p>').join('');
  const blocks = parseDocument(source).blocks;
  assert.ok(estimatePageCount(blocks, settingsFor()) > 20);
});

test('paper sizes and orientation are written to DOCX section properties', async () => {
  const blocks = parseDocument('<h1>BAB I PENDAHULUAN</h1><p>Isi.</p>').blocks;
  const cases = [
    { size: 'A4', orientation: 'portrait', width: '11906', height: '16838' },
    { size: 'Letter', orientation: 'portrait', width: '12240', height: '15840' },
    { size: 'F4', orientation: 'portrait', width: '11906', height: '18720' },
    { size: 'A4', orientation: 'landscape', width: '16838', height: '11906' }
  ];
  for (const entry of cases) {
    const blob = await createDocxBlob({
      blocks,
      settings: settingsFor({ paper: { size: entry.size, orientation: entry.orientation } }),
      metadata: { ...defaultMetadata, title: 'Ukuran kertas' },
      addGeneratedCover: false
    });
    const { xml } = await xmlFrom(blob);
    assert.match(xml, new RegExp('w:pgSz[^>]*w:w="' + entry.width + '"[^>]*w:h="' + entry.height + '"'));
  }
});

test('exported DOCX preserves the original text while keeping section numbering editable', async () => {
  const blocks = parseDocument(sampleHtml).blocks;
  const blob = await createDocxBlob({
    blocks, settings: settingsFor(),
    metadata: { ...defaultMetadata, title: 'Makalah Uji' },
    addGeneratedCover: false
  });
  const { xml } = await xmlFrom(blob);
  for (const phrase of ['Isi bab pertama.', 'Butir satu', 'Contoh', 'Isi bab kedua.', 'Sumber contoh.']) {
    assert.ok(xml.includes(phrase), 'DOCX harus menyimpan: ' + phrase);
  }
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xmlParts = await Promise.all(Object.keys(zip.files).filter((path) => path.endsWith('.xml'))
    .map((path) => zip.file(path).async('string')));
  assert.ok(xmlParts.some((part) => /PAGE|fldChar|instrText/.test(part)));
});

test('document autosave stores and removes records in IndexedDB', async () => {
  const record = { id: 'test-doc-' + Date.now(), title: 'Uji simpan lokal', sourceHtml: '<p>Isi asli</p>' };
  const saved = await saveDocument(record);
  assert.ok(saved.updatedAt);
  const listed = await listDocuments();
  assert.ok(listed.some((item) => item.id === record.id && item.sourceHtml === record.sourceHtml));
  await removeDocument(record.id);
  assert.ok(!(await listDocuments()).some((item) => item.id === record.id));
});

test('authenticated document storage uses the account API and surfaces API failures', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let shouldFail = false;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (shouldFail) return new Response(JSON.stringify({ error: 'API offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    const body = options.method === 'PUT' ? JSON.parse(options.body) : [{ id: 'account-doc' }];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  setAccountStorageEnabled(true);
  try {
    assert.deepEqual(await listDocuments(), [{ id: 'account-doc' }]);
    await saveDocument({
      id: 'b0b09d1c-4c0e-4d81-9822-6f9e3cc1594e',
      title: 'Makalah',
      sourceHtml: '<p>Isi</p>'
    });
    await removeDocument('b0b09d1c-4c0e-4d81-9822-6f9e3cc1594e');
    assert.deepEqual(calls.map((call) => call.options.method || 'GET'), ['GET', 'PUT', 'DELETE']);
    assert.equal(calls[1].url, '/api/documents');
    shouldFail = true;
    await assert.rejects(() => listDocuments(), /API offline/);
  } finally {
    setAccountStorageEnabled(false);
    globalThis.fetch = originalFetch;
  }
});
