import { useState } from 'react';
import { Database, FolderInput, LogOut, Moon, PanelsTopLeft, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { apiRequest } from '../services/api.js';

export default function Settings({ user, dark, onTheme, onClear, onImportLocal, onLogout, onTemplates }) {
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', passwordConfirmation: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function changePassword(event) {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');
    setSavingPassword(true);
    try {
      const result = await apiRequest('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify(passwords)
      });
      setPasswordMessage(result.message);
      setPasswords({ currentPassword: '', newPassword: '', passwordConfirmation: '' });
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-heading"><div><span className="eyebrow">PREFERENSI</span><h1>Pengaturan</h1><p>Kelola profil, keamanan akun, dan tampilan aplikasi.</p></div></div>
      <div className="settings-page-grid">
        <section className="settings-card"><div className="settings-card-icon"><Sun size={18} /></div><div className="settings-card-title"><h2>Tampilan</h2><p>Pilih tema yang nyaman untuk Anda.</p></div><button className="button button-secondary" onClick={onTheme}>{dark ? <Sun size={16} /> : <Moon size={16} />}{dark ? 'Tema terang' : 'Tema gelap'}</button></section>
        <section className="settings-card"><div className="settings-card-icon"><UserRound size={18} /></div><div className="settings-card-title"><h2>Profil akun</h2><p>{user?.name}<br />{user?.email}</p></div><button className="button button-secondary" onClick={onLogout}><LogOut size={15} /> Keluar</button></section>
        <section className="settings-card mobile-template-link"><div className="settings-card-icon"><PanelsTopLeft size={18} /></div><div className="settings-card-title"><h2>Template dokumen</h2><p>Pilih pedoman format untuk naskah berikutnya.</p></div><button className="button button-secondary" onClick={onTemplates}>Lihat template</button></section>
        <section className="settings-card"><div className="settings-card-icon green"><ShieldCheck size={18} /></div><div className="settings-card-title"><h2>Privasi dokumen</h2><p>Dokumen disimpan di server dan dibatasi berdasarkan akun yang masuk.</p></div><span className="local-badge">Terlindungi</span></section>
        <section className="settings-password-card">
          <div className="settings-card-title"><h2>Ubah password</h2><p>Password baru harus memiliki minimal 10 karakter.</p></div>
          <form onSubmit={changePassword}>
            <label>Password saat ini<input type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label>
            <label>Password baru<input type="password" autoComplete="new-password" minLength="10" maxLength="72" required value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label>
            <label>Konfirmasi password baru<input type="password" autoComplete="new-password" required value={passwords.passwordConfirmation} onChange={(event) => setPasswords({ ...passwords, passwordConfirmation: event.target.value })} /></label>
            {passwordError && <p className="settings-message error" role="alert">{passwordError}</p>}
            {passwordMessage && <p className="settings-message success" role="status">{passwordMessage}</p>}
            <button className="button button-primary" disabled={savingPassword}>{savingPassword ? 'Menyimpan…' : 'Perbarui password'}</button>
          </form>
        </section>
        <section className="settings-card"><div className="settings-card-icon"><FolderInput size={18} /></div><div className="settings-card-title"><h2>Impor dokumen dari browser</h2><p>Pindahkan dokumen lokal versi sebelumnya ke akun ini. Data lokal asli tidak dihapus.</p></div><button className="button button-secondary" onClick={onImportLocal}>Impor dokumen</button></section>
        <section className="settings-card"><div className="settings-card-icon amber"><Database size={18} /></div><div className="settings-card-title"><h2>Hapus seluruh dokumen akun</h2><p>Hapus semua dokumen dan riwayat versi milik akun ini.</p></div><button className="button button-danger" onClick={onClear}>Hapus dokumen</button></section>
      </div>
    </div>
  );
}
