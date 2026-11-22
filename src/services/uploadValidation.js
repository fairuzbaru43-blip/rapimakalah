export const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024;

const supportedExtensions = new Set(['docx', 'txt', 'html', 'htm']);

export function validateDocumentFile(file) {
  if (!file || typeof file.name !== 'string') {
    return { valid: false, message: 'Pilih file dokumen terlebih dahulu.' };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, message: 'File kosong atau ukurannya tidak dapat dibaca.' };
  }
  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return { valid: false, message: 'Ukuran file maksimal 25 MB.' };
  }
  const extension = file.name.split('.').pop().toLowerCase();
  if (!supportedExtensions.has(extension)) {
    return { valid: false, message: 'Jenis file belum didukung. Pilih DOCX, TXT, atau HTML.' };
  }
  return { valid: true, extension };
}
