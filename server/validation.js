export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateRegistration({ name, email, password, passwordConfirmation }) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = normalizeEmail(email);
  if (cleanName.length < 2 || cleanName.length > 100) {
    return { valid: false, message: 'Nama harus terdiri dari 2 sampai 100 karakter.' };
  }
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { valid: false, message: 'Masukkan alamat email yang valid.' };
  }
  if (typeof password !== 'string' || password.length < 10 || Buffer.byteLength(password, 'utf8') > 72) {
    return { valid: false, message: 'Password harus memiliki minimal 10 karakter dan maksimal 72 byte UTF-8.' };
  }
  if (password !== passwordConfirmation) {
    return { valid: false, message: 'Konfirmasi password tidak sama.' };
  }
  return { valid: true, name: cleanName, email: cleanEmail };
}

export function validateDocument(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    return { valid: false, message: 'Data dokumen tidak valid.' };
  }
  if (typeof document.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(document.id)) {
    return { valid: false, message: 'ID dokumen tidak valid.' };
  }
  if (typeof document.title !== 'string' || document.title.trim().length > 200) {
    return { valid: false, message: 'Judul dokumen maksimal 200 karakter.' };
  }
  if (typeof document.sourceHtml !== 'string') {
    return { valid: false, message: 'Isi dokumen tidak valid.' };
  }
  return { valid: true };
}
