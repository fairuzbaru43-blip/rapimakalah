import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, FileDown, FileText, X } from 'lucide-react';
import fileSaver from 'file-saver';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import DialogModal from './components/DialogModal.jsx';
import Workspace from './components/Workspace.jsx';
import FormattingPanel from './components/FormattingPanel.jsx';
import InspectionPanel, { inspectDocument } from './components/InspectionPanel.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documents from './pages/Documents.jsx';
import Templates from './pages/Templates.jsx';
import SettingsPage from './pages/Settings.jsx';
import { AuthPage, LandingPage } from './pages/PublicPages.jsx';
import { parseDocument, plainTextToHtml } from './services/documentParser.js';
import { defaultMetadata, defaultSettings, formatDocument, estimatePageCount } from './services/documentFormatter.js';
import { listDocuments, listLocalDocuments, makeId, removeDocument, saveDocument, setAccountStorageEnabled } from './services/storage.js';
import { validateDocumentFile } from './services/uploadValidation.js';
import { apiRequest, getCurrentUser, getDocumentVersions } from './services/api.js';

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
const { saveAs } = fileSaver;

function mergeSettings(value) {
  return {
    ...defaultSettings, ...(value || {}),
    rules: { ...defaultSettings.rules, ...((value || {}).rules || {}) },
    typography: { ...defaultSettings.typography, ...((value || {}).typography || {}) },
    paper: { ...defaultSettings.paper, ...((value || {}).paper || {}) },
    headings: { ...defaultSettings.headings, ...((value || {}).headings || {}) },
    numbering: { ...defaultSettings.numbering, ...((value || {}).numbering || {}) }
  };
}

function mergeMetadata(value) {
  return { ...defaultMetadata, ...(value || {}), members: Array.isArray(value && value.members) ? value.members : [] };
}

function normalizeDocument(item) {
  return {
    ...item,
    title: item.title || 'Dokumen tanpa judul',
    sourceHtml: item.sourceHtml || '',
    settings: mergeSettings(item.settings),
    metadata: mergeMetadata(item.metadata)
  };
}

function filename(value, extension) {
  const clean = String(value || 'Makalah').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return (clean || 'Makalah') + extension;
}

function dataUrlBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = (parts[0].match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const binary = atob(parts[1] || '');
  return new Blob([Uint8Array.from(binary, (char) => char.charCodeAt(0))], { type: mime });
}

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authScreen, setAuthScreen] = useState('landing');
  const [authServiceError, setAuthServiceError] = useState('');
  const [historyDocument, setHistoryDocument] = useState(null);
  const [documentVersions, setDocumentVersions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [panel, setPanel] = useState('format');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mode, setMode] = useState('write');
  const [previewPage, setPreviewPage] = useState(0);
  const [dark, setDark] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [dialog, setDialog] = useState(null);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [inspectionRun, setInspectionRun] = useState(0);
  const uploadInput = useRef(null);
  const toastTimer = useRef(null);
  const dialogResolver = useRef(null);
  const dialogSequence = useRef(0);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((user) => {
      if (!cancelled) setAuthUser(user);
    }).catch((error) => {
      if (!cancelled) setAuthServiceError('Layanan akun belum dapat dihubungi: ' + error.message);
    }).finally(() => {
      if (!cancelled) setAuthReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authReady) return undefined;
    setAccountStorageEnabled(Boolean(authUser));
    if (!authUser) {
      setDocuments([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    listDocuments().then((found) => {
      if (!cancelled) { setDocuments(found.map(normalizeDocument)); setLoading(false); }
    }).catch((error) => {
      if (!cancelled) {
        setLoading(false);
        setToastMessage('Dokumen akun gagal dimuat: ' + error.message);
      }
    });
    return () => { cancelled = true; };
  }, [authReady, authUser]);

  useEffect(() => {
    if (!historyDocument) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setHistoryDocument(null);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [historyDocument]);

  useEffect(() => {
    if (page !== 'workspace') setMobilePanelOpen(false);
  }, [page]);

  const notify = useCallback((message) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(''), 2800);
  }, []);

  const requestDialog = useCallback((options) => new Promise((resolve) => {
    if (dialogResolver.current) {
      resolve(null);
      return;
    }
    dialogResolver.current = resolve;
    dialogSequence.current += 1;
    setDialog({ ...options, id: dialogSequence.current });
  }), []);

  const resolveDialog = useCallback((result) => {
    const resolve = dialogResolver.current;
    if (!resolve) return;
    dialogResolver.current = null;
    setDialog(null);
    resolve(result);
  }, []);

  function finishAuthentication(user) {
    setAuthUser(user);
    setAuthServiceError('');
    setAuthScreen('landing');
    setPage('dashboard');
  }

  async function logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      setAccountStorageEnabled(false);
      setAuthUser(null);
      setActiveDoc(null);
      setDocuments([]);
      setPage('dashboard');
      setAuthScreen('landing');
    } catch (error) {
      notify('Logout gagal: ' + error.message);
    }
  }

  const updateActive = useCallback((changes) => {
    setActiveDoc((current) => current ? { ...current, ...changes, updatedAt: new Date().toISOString() } : current);
  }, []);

  useEffect(() => {
    if (!activeDoc || loading) return undefined;
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const saved = await saveDocument(activeDoc);
        setDocuments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
        setSaveStatus('saved');
      } catch (error) {
        setSaveStatus('error');
        notify('Penyimpanan akun gagal. ' + error.message);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [activeDoc, loading, notify]);

  const parsedSource = useMemo(() => parseDocument(activeDoc ? activeDoc.sourceHtml : ''), [activeDoc && activeDoc.sourceHtml]);
  const processedIsCurrent = Boolean(activeDoc && activeDoc.formattedHtml &&
    activeDoc.formattedSource === activeDoc.sourceHtml &&
    JSON.stringify(activeDoc.formattedSettings) === JSON.stringify(activeDoc.settings) &&
    JSON.stringify(activeDoc.formattedMetadata) === JSON.stringify(activeDoc.metadata));
  const analysis = useMemo(() => {
    const parsed = processedIsCurrent ? parseDocument(activeDoc.formattedHtml) : parsedSource;
    return { ...parsed.analysis, blocks: parsed.blocks, pageCount: estimatePageCount(parsed.blocks, activeDoc ? activeDoc.settings : defaultSettings) };
  }, [activeDoc, parsedSource, processedIsCurrent]);
  const issues = useMemo(() => activeDoc
    ? inspectDocument(parsedSource.blocks, activeDoc.settings, activeDoc.metadata, activeDoc.sourceHtml)
    : [], [activeDoc, parsedSource, inspectionRun]);

  function recheckDocument() {
    setInspectionRun((run) => run + 1);
    notify('Pemeriksaan dokumen diperbarui.');
  }

  async function persistActiveDocument() {
    if (!activeDoc) return true;
    try {
      const saved = await saveDocument(activeDoc);
      setDocuments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      return true;
    } catch (error) {
      notify('Dokumen aktif gagal disimpan: ' + error.message);
      return false;
    }
  }

  async function startDocument() {
    if (!(await persistActiveDocument())) return;
    const now = new Date().toISOString();
    const created = {
      id: makeId(), title: 'Makalah baru', sourceHtml: '',
      settings: mergeSettings(defaultSettings), metadata: mergeMetadata({}),
      createdAt: now, updatedAt: now
    };
    setActiveDoc(created);
    setPage('workspace');
    setPanel('format');
    setMode('write');
    setPreviewPage(0);
  }

  async function openDocument(item) {
    if (!(await persistActiveDocument())) return;
    setActiveDoc(normalizeDocument(item));
    setPage('workspace');
    setPanel('format');
    setMode('write');
    setPreviewPage(0);
  }

  async function handleFile(file) {
    try {
      if (!(await persistActiveDocument())) return;
      const validation = validateDocumentFile(file);
      if (!validation.valid) { notify(validation.message); return; }
      let sourceHtml = '';
      let importInfo = '';
      const extension = validation.extension;
      if (extension === 'docx') {
        const { readDocx } = await import('./services/docxReader.js');
        const result = await readDocx(file);
        sourceHtml = result.html;
        importInfo = result.mediaCount ? result.mediaCount + ' gambar diperiksa dari file.' : '';
        if (result.messages.length) importInfo += (importInfo ? ' ' : '') + result.messages.length + ' catatan konversi.';
      } else if (extension === 'txt') {
        sourceHtml = plainTextToHtml(await file.text());
      } else if (extension === 'html' || extension === 'htm') {
        sourceHtml = await file.text();
      } else {
        notify('Jenis file belum didukung. Pilih DOCX, TXT, atau HTML.');
        return;
      }
      const parsed = parseDocument(sourceHtml);
      if (!parsed.blocks.length) { notify('Isi dokumen tidak dapat dibaca atau masih kosong.'); return; }
      sourceHtml = parsed.html;
      const originalDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const title = file.name.replace(/\.[^.]+$/, '');
      const created = {
        id: makeId(), title, originalName: file.name, originalDataUrl,
        sourceHtml, settings: mergeSettings(defaultSettings),
        metadata: mergeMetadata({ title }), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      await saveDocument(created);
      setDocuments((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setActiveDoc(created);
      setPage('workspace');
      setMode('write');
      setPanel('format');
      setPreviewPage(0);
      notify('Dokumen berhasil dibuka.' + (importInfo ? ' ' + importInfo : ''));
    } catch (error) {
      notify('File tidak dapat dibuka: ' + (error && error.message ? error.message : 'format file tidak sesuai.'));
    }
  }

  async function insertImage(file) {
    if (!activeDoc) return;
    if (!file || file.size > 5 * 1024 * 1024) { notify('Ukuran gambar maksimal 5 MB.'); return; }
    if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.type || '')) {
      notify('Format gambar yang didukung: PNG, JPG, GIF, atau WebP.');
      return;
    }
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const image = '<p><img src="' + source + '" alt="' + String(file.name).replace(/[&<"]/g, '') + '" /></p>';
    const editor = document.querySelector('.rich-editor');
    if (editor) {
      editor.focus();
      document.execCommand('insertHTML', false, image);
      updateActive({ sourceHtml: editor.innerHTML, formattedAt: null });
    } else updateActive({ sourceHtml: activeDoc.sourceHtml + image, formattedAt: null });
  }

  async function applyFormatting() {
    if (!activeDoc || applying) return;
    const initial = parseDocument(activeDoc.sourceHtml);
    if (!initial.blocks.length) { notify('Tambahkan atau unggah isi makalah sebelum menerapkan formatting.'); return; }
    setApplying(true);
    try {
      setProgress(8); setProgressLabel('Memvalidasi naskah');
      await wait(90);
      setProgress(24);
      const result = formatDocument(activeDoc.sourceHtml, activeDoc.settings, activeDoc.metadata);
      setProgressLabel('Menganalisis struktur dan aturan');
      await wait(90);
      setProgress(52);
      setProgressLabel('Membentuk pratinjau dokumen');
      await wait(90);
      const formattedSettings = mergeSettings(activeDoc.settings);
      const formattedMetadata = mergeMetadata(activeDoc.metadata);
      const { createDocxBlob } = await import('./services/docxGenerator.js');
      const blob = await createDocxBlob({
        blocks: initial.blocks, settings: formattedSettings, metadata: formattedMetadata,
        addGeneratedCover: result.coverAdded
      });
      setProgress(86);
      setProgressLabel('Menyiapkan file Word');
      await wait(80);
      const saved = {
        ...activeDoc, formattedHtml: result.html, formattedSource: activeDoc.sourceHtml,
        formattedSettings, formattedMetadata, formattedAt: new Date().toISOString(),
        formatWarnings: result.warnings, formattedSize: blob.size
      };
      await saveDocument(saved);
      setActiveDoc(saved);
      setDocuments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setMode('preview');
      setPanel('check');
      setProgress(100);
      setProgressLabel('Formatting selesai');
      notify('Formatting selesai. Dokumen Word siap diunduh (' + Math.max(1, Math.round(blob.size / 1024)) + ' KB).');
    } catch (error) {
      notify('Formatting gagal: ' + (error && error.message ? error.message : 'terjadi kesalahan saat membuat DOCX.'));
    } finally {
      setTimeout(() => { setApplying(false); setProgress(0); setProgressLabel(''); }, 450);
    }
  }

  async function downloadResult(item = activeDoc) {
    if (!item) return;
    try {
      const doc = normalizeDocument(item);
      if (!doc.sourceHtml.trim()) { notify('Dokumen ini belum memiliki isi untuk diunduh.'); return; }
      let result;
      let settings;
      let metadata;
      if (doc.formattedHtml && doc.formattedSource === doc.sourceHtml &&
          JSON.stringify(doc.formattedSettings) === JSON.stringify(doc.settings) &&
          JSON.stringify(doc.formattedMetadata) === JSON.stringify(doc.metadata)) {
        settings = mergeSettings(doc.formattedSettings || doc.settings);
        metadata = mergeMetadata(doc.formattedMetadata || doc.metadata);
        result = parseDocument(doc.sourceHtml);
      } else {
        settings = mergeSettings(doc.settings);
        metadata = mergeMetadata(doc.metadata);
        const formatted = formatDocument(doc.sourceHtml, settings, metadata);
        result = { blocks: parseDocument(doc.sourceHtml).blocks, html: formatted.html, coverAdded: formatted.coverAdded };
        doc.formattedHtml = formatted.html;
        doc.formattedSource = doc.sourceHtml;
        doc.formattedSettings = settings;
        doc.formattedMetadata = metadata;
        doc.formattedAt = new Date().toISOString();
        if (doc.id === (activeDoc && activeDoc.id)) setActiveDoc(doc);
        await saveDocument(doc);
      }
      const { createDocxBlob } = await import('./services/docxGenerator.js');
      const blob = await createDocxBlob({
        blocks: result.blocks, settings, metadata,
        addGeneratedCover: Boolean(settings.rules.cover && !parseDocument(doc.sourceHtml).analysis.hasCover)
      });
      doc.formattedSize = blob.size;
      saveAs(blob, filename(doc.title, '.docx'));
      setDocuments((current) => [doc, ...current.filter((entry) => entry.id !== doc.id)]);
      notify('File DOCX berhasil diunduh.');
    } catch (error) {
      notify('Gagal membuat DOCX: ' + (error && error.message ? error.message : 'periksa isi dokumen.'));
    }
  }

  function downloadPdf() {
    if (!activeDoc || !activeDoc.sourceHtml.trim()) {
      notify('Tambahkan isi dokumen sebelum menyimpan PDF.');
      return;
    }
    setMode('preview');
    notify('Pilih “Simpan sebagai PDF” pada dialog cetak browser.');
    window.setTimeout(() => window.print(), 120);
  }

  function downloadOriginal(item) {
    if (item.originalDataUrl) {
      saveAs(dataUrlBlob(item.originalDataUrl), item.originalName || filename(item.title, '.docx'));
      return;
    }
    const parsed = new DOMParser().parseFromString(item.sourceHtml || '', 'text/html');
    const plain = parsed.body.innerText || '';
    const blob = new Blob([plain], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, filename(item.title, '.txt'));
  }

  async function renameDocument(item = activeDoc) {
    if (!item) return;
    const next = await requestDialog({
      type: 'form',
      title: 'Ganti nama dokumen',
      description: 'Gunakan nama yang mudah dikenali di arsip dokumen Anda.',
      inputLabel: 'Nama dokumen',
      initialValue: item.title || '',
      confirmText: 'Simpan nama'
    });
    if (typeof next !== 'string' || !next.trim()) return;
    const renamed = { ...item, title: next.trim(), updatedAt: new Date().toISOString() };
    if (activeDoc && item.id === activeDoc.id) setActiveDoc(renamed);
    setDocuments((current) => current.map((entry) => entry.id === item.id ? renamed : entry));
    saveDocument(renamed).catch((error) => notify('Nama dokumen tidak dapat disimpan: ' + error.message));
  }

  async function deleteDocument(item) {
    const confirmed = await requestDialog({
      type: 'delete',
      title: 'Hapus dokumen?',
      description: '“' + item.title + '” akan dihapus dari akun Anda. Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus dokumen'
    });
    if (!confirmed) return;
    try {
      await removeDocument(item.id);
      setDocuments((current) => current.filter((entry) => entry.id !== item.id));
      if (activeDoc && activeDoc.id === item.id) { setActiveDoc(null); setPage('documents'); }
      notify('Dokumen dihapus dari akun Anda.');
    } catch (error) {
      notify('Dokumen gagal dihapus: ' + error.message);
    }
  }

  async function duplicateDocument(item) {
    const duplicate = { ...item, id: makeId(), title: (item.title || 'Dokumen') + ' (salinan)', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
      const saved = await saveDocument(duplicate);
      setDocuments((current) => [saved, ...current]);
      notify('Salinan dokumen dibuat.');
    } catch (error) {
      notify('Salinan dokumen gagal disimpan: ' + error.message);
    }
  }

  async function clearDocuments() {
    const confirmed = await requestDialog({
      type: 'delete',
      title: 'Hapus semua dokumen?',
      description: 'Semua dokumen dan riwayat versi di akun Anda akan dihapus. Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus semua'
    });
    if (!confirmed) return;
    try {
      await Promise.all(documents.map((item) => removeDocument(item.id)));
      setDocuments([]);
      setActiveDoc(null);
      setPage('dashboard');
      notify('Semua dokumen akun dihapus.');
    } catch (error) {
      notify('Sebagian dokumen gagal dihapus: ' + error.message);
    }
  }

  async function showHistory(item) {
    setHistoryDocument(item);
    setHistoryLoading(true);
    setDocumentVersions([]);
    try {
      setDocumentVersions(await getDocumentVersions(item.id));
    } catch (error) {
      notify('Riwayat dokumen gagal dimuat: ' + error.message);
      setHistoryDocument(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function restoreVersion(version) {
    if (!historyDocument || !version.snapshot) return;
    try {
      const restored = await saveDocument({
        ...version.snapshot,
        id: historyDocument.id,
        title: historyDocument.title,
        updatedAt: new Date().toISOString()
      });
      setDocuments((current) => [restored, ...current.filter((item) => item.id !== restored.id)]);
      if (activeDoc && activeDoc.id === restored.id) setActiveDoc(restored);
      setHistoryDocument(null);
      notify('Versi dokumen berhasil dipulihkan.');
    } catch (error) {
      notify('Versi dokumen gagal dipulihkan: ' + error.message);
    }
  }

  async function importLocalDocuments() {
    try {
      const localDocuments = await listLocalDocuments();
      if (!localDocuments.length) {
        notify('Tidak ada dokumen lokal untuk diimpor.');
        return;
      }
      const importedIds = new Set(documents.map((item) => item.legacyLocalId).filter(Boolean));
      const pendingDocuments = localDocuments.filter((item) => !importedIds.has(item.id));
      if (!pendingDocuments.length) {
        notify('Semua dokumen lokal sudah pernah diimpor.');
        return;
      }
      const confirmed = await requestDialog({
        type: 'confirm',
        title: 'Impor dokumen lokal?',
        description: pendingDocuments.length + ' dokumen dari penyimpanan browser akan disalin ke akun ini. Dokumen lokal asli tidak dihapus.',
        confirmText: 'Impor dokumen'
      });
      if (!confirmed) return;
      const imported = [];
      for (const item of pendingDocuments) {
        try {
          imported.push(await saveDocument({
            ...item,
            id: makeId(),
            legacyLocalId: item.id,
            title: item.title || 'Dokumen tanpa judul',
            updatedAt: new Date().toISOString()
          }));
        } catch (error) {
          if (imported.length) setDocuments((current) => [...imported, ...current]);
          notify(imported.length
            ? imported.length + ' dari ' + pendingDocuments.length + ' dokumen diimpor sebelum proses gagal: ' + error.message
            : 'Impor dokumen lokal gagal: ' + error.message);
          return;
        }
      }
      if (imported.length) setDocuments((current) => [...imported, ...current]);
      notify(imported.length + ' dokumen berhasil diimpor.');
    } catch (error) {
      notify('Impor dokumen lokal gagal: ' + error.message);
    }
  }

  function applyTemplate(value) {
    const presets = {
      college: { size: 12, lineSpacing: 1.5, left: 4, right: 3, top: 3, bottom: 3 },
      school: { size: 12, lineSpacing: 1.5, left: 4, right: 3, top: 3, bottom: 3 },
      simple: { size: 11, lineSpacing: 1.15, left: 2.5, right: 2.5, top: 2.5, bottom: 2.5 },
      lab: { size: 12, lineSpacing: 1.5, left: 3.5, right: 3, top: 3, bottom: 3 },
      research: { size: 12, lineSpacing: 2, left: 4, right: 3, top: 4, bottom: 3 },
      scientific: { size: 12, lineSpacing: 1.5, left: 3.5, right: 3, top: 3, bottom: 3 },
      proposal: { size: 12, lineSpacing: 1.5, left: 4, right: 3, top: 3, bottom: 3 }
    };
    if (!activeDoc) { notify('Pilih dokumen untuk menerapkan template.'); return; }
    const preset = presets[value];
    if (!preset) { updateActive({ settings: { ...activeDoc.settings, template: value } }); return; }
    updateActive({
      settings: { ...activeDoc.settings, template: value,
        typography: { ...activeDoc.settings.typography, size: preset.size, lineSpacing: preset.lineSpacing },
        paper: { ...activeDoc.settings.paper, left: preset.left, right: preset.right, top: preset.top, bottom: preset.bottom } }
    });
    setPage('workspace');
    notify('Template diterapkan pada dokumen aktif.');
  }

  const pageCount = activeDoc ? Math.max(1, estimatePageCount(analysis.blocks, activeDoc.settings)) : 1;
  const statusText = loading ? 'Memuat dokumen…' : activeDoc
    ? saveStatus === 'saving' ? 'Menyimpan…' : saveStatus === 'error' ? 'Gagal menyimpan' : 'Tersimpan otomatis'
    : 'Penyimpanan akun';
  const currentSize = activeDoc ? (activeDoc.formattedSize || new TextEncoder().encode(activeDoc.sourceHtml || '').byteLength) : 0;
  const sizeLabel = currentSize >= 1024 * 1024
    ? (currentSize / (1024 * 1024)).toFixed(1) + ' MB'
    : Math.max(1, Math.ceil(currentSize / 1024)) + ' KB';

  if (!authReady) {
    return <main className="auth-loading"><span className="auth-loading-mark"><BookOpen size={22} /></span><p>Menyiapkan ruang kerja…</p></main>;
  }
  if (!authUser) {
    if (authScreen === 'landing') {
      return <LandingPage onLogin={() => setAuthScreen('login')} onRegister={() => setAuthScreen('register')} serviceError={authServiceError} />;
    }
    return <AuthPage
      mode={authScreen}
      onAuthenticated={finishAuthentication}
      onLanding={(screen) => setAuthScreen(screen || 'landing')}
      serviceError={authServiceError}
    />;
  }

  return (
    <div className={['app-shell ', (dark ? 'theme-dark' : '')].join('')}>
      <Sidebar page={page} onNavigate={setPage} onNew={startDocument} user={authUser} onLogout={logout} />
      <main className="main-area">
        <Header page={page} document={activeDoc} status={saveStatus}
          onUpload={() => uploadInput.current && uploadInput.current.click()}
          onDownload={() => downloadResult()} onPdf={downloadPdf} onRename={() => renameDocument()} />
        <input ref={uploadInput} className="visually-hidden" type="file" accept=".docx,.txt,.html,.htm,text/plain,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => { const file = event.target.files && event.target.files[0]; if (file) handleFile(file); event.target.value = ''; }} />
        {page === 'dashboard' && <Dashboard documents={documents} loading={loading} onNew={startDocument} onUpload={handleFile} onOpen={openDocument} onViewAll={() => setPage('documents')} />}
        {page === 'documents' && <Documents documents={documents} onOpen={openDocument} onRename={renameDocument}
          onDelete={deleteDocument} onDuplicate={duplicateDocument} onDownload={downloadResult} onHistory={showHistory} />}
        {page === 'templates' && <Templates selected={activeDoc ? activeDoc.settings.template : 'college'} onSelect={applyTemplate} />}
        {page === 'settings' && <SettingsPage user={authUser} dark={dark} onTheme={() => setDark((value) => !value)} onClear={clearDocuments} onImportLocal={importLocalDocuments} onLogout={logout} onTemplates={() => setPage('templates')} />}
        {page === 'workspace' && activeDoc && <>
          <div className="document-titlebar">
            <div className="document-title-wrap"><span className="document-icon"><FileText size={18} /></span><div>
              <input className="document-title-input" aria-label="Nama dokumen" value={activeDoc.title} onChange={(event) => updateActive({ title: event.target.value })} />
              <small>{analysis.wordCount.toLocaleString('id-ID')} kata · {pageCount} halaman · {sizeLabel} · {statusText}</small>
            </div></div>
            <button className="source-download" onClick={() => downloadOriginal(activeDoc)}><FileDown size={15} /> Unduh naskah asli</button>
          </div>
          <div className="workspace-layout">
            <Workspace document={activeDoc} settings={activeDoc.settings} sourceHtml={activeDoc.sourceHtml}
              onSourceChange={(value) => updateActive({ sourceHtml: parseDocument(value).html, formattedAt: null })}
              onImage={insertImage} analysis={analysis} onSection={(text) => {
                setMode('write');
                setTimeout(() => {
                  const editor = document.querySelector('.rich-editor');
                  if (!editor) return;
                  const node = Array.from(editor.querySelectorAll('h1,h2,h3,p')).find((element) => (element.innerText || '').trim() === text);
                  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 80);
              }}
              onCheck={() => { setPanel('check'); setMobilePanelOpen(true); }} onTogglePanel={() => setMobilePanelOpen((open) => !open)}
              previewPage={previewPage} onPreviewPage={(value) => { setPreviewPage(value); setMode('preview'); }}
              onPageCount={() => {}} issues={issues} mode={mode} onMode={setMode} />
            {mobilePanelOpen && <button className="mobile-panel-scrim" aria-label="Tutup pengaturan dokumen" onClick={() => setMobilePanelOpen(false)} />}
            <div className={'right-panel-shell ' + (mobilePanelOpen ? 'mobile-panel-open' : '')}>
              <div className="mobile-panel-heading"><strong>{panel === 'format' ? 'Atur dokumen' : 'Pemeriksaan'}</strong><button className="icon-button" aria-label="Tutup pengaturan" onClick={() => setMobilePanelOpen(false)}><X size={19} /></button></div>
              <div className="right-panel-tabs">
                <button className={panel === 'format' ? 'active' : ''} onClick={() => setPanel('format')}>Formatting</button>
                <button className={panel === 'check' ? 'active' : ''} onClick={() => setPanel('check')}>Pemeriksaan <span>{issues.length}</span></button>
              </div>
              {panel === 'format'
                ? <FormattingPanel settings={activeDoc.settings} metadata={activeDoc.metadata}
                    onSettings={(settings) => updateActive({ settings, formattedAt: null })}
                    onMetadata={(metadata) => updateActive({ metadata, formattedAt: null })}
                    onApply={async () => { await applyFormatting(); setMobilePanelOpen(false); }} applying={applying} progress={progress} onToast={notify} />
                : <InspectionPanel issues={issues} onRecheck={recheckDocument}
                    onFix={(issue) => {
                      if (['numbering', 'fonts', 'font-sizes'].includes(issue.id)) { setPanel('format'); setMobilePanelOpen(true); }
                      else {
                        setMode('write');
                        const editor = document.querySelector('.rich-editor');
                        if (editor) editor.focus();
                        notify('Tinjau naskah di editor lalu periksa ulang.');
                      }
                    }} />}
            </div>
          </div>
          {applying && <div className="processing-status"><span className="processing-spinner" />{progressLabel}<b>{progress}%</b></div>}
        </>}
        {page === 'workspace' && !activeDoc && <div className="blank-workspace"><FileText size={30} /><h2>Pilih dokumen untuk mulai</h2><p>Buka dokumen tersimpan atau mulai dengan naskah baru.</p><button className="button button-primary" onClick={startDocument}>Buat dokumen baru</button></div>}
      </main>
      {historyDocument && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setHistoryDocument(null);
      }}>
        <section className="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
          <button className="modal-close" aria-label="Tutup riwayat" onClick={() => setHistoryDocument(null)}><X size={16} /></button>
          <strong id="history-title">Riwayat · {historyDocument.title}</strong>
          <p>Versi tersimpan saat naskah berubah atau formatting selesai.</p>
          {historyLoading ? <p>Memuat riwayat…</p> : documentVersions.length
            ? <div className="history-list">{documentVersions.map((version) => <article key={version.id}>
              <div><strong>{version.versionType === 'created' ? 'Dokumen dibuat' : version.versionType === 'formatted' ? 'Formatting selesai' : 'Naskah diperbarui'}</strong>
                <small>{new Date(version.createdAt).toLocaleString('id-ID')}</small></div>
              <button className="button button-secondary" onClick={() => restoreVersion(version)}>Pulihkan</button>
            </article>)}</div>
            : <p>Belum ada riwayat versi yang tersimpan.</p>}
        </section>
      </div>}
      {dialog && <DialogModal key={dialog.id} dialog={dialog} onResolve={resolveDialog} />}
      <div className={'toast-message ' + (toastMessage ? 'show' : '')} role="status">{toastMessage}</div>
    </div>
  );
}
