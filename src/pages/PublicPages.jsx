import { useState } from 'react';
import { ArrowRight, BookOpen, Check, FileCheck2, FileText, LayoutTemplate, ShieldCheck, Sparkles } from 'lucide-react';
import { apiRequest } from '../services/api.js';

const features = [
  { Icon: FileText, title: 'Tulis atau impor', text: 'Mulai dari editor, tempel teks, atau unggah dokumen Word.' },
  { Icon: LayoutTemplate, title: 'Atur sesuai pedoman', text: 'Pilih template dan sesuaikan tipografi, margin, heading, serta halaman.' },
  { Icon: FileCheck2, title: 'Periksa lalu unduh', text: 'Tinjau struktur naskah dan hasilkan dokumen DOCX yang dapat diedit.' }
];

export function LandingPage({ onLogin, onRegister, serviceError }) {
  return (
    <div className="public-shell">
      <header className="public-nav">
        <a className="public-brand" href="#beranda"><span><BookOpen size={20} /></span>RapiMakalah</a>
        <nav aria-label="Navigasi utama">
          <a href="#fitur">Fitur</a><a href="#cara-kerja">Cara Kerja</a><a href="#tentang">Tentang</a>
        </nav>
        <div><button className="public-login" onClick={onLogin}>Masuk</button><button className="button button-primary" onClick={onRegister}>Daftar gratis <ArrowRight size={15} /></button></div>
      </header>
      {serviceError && <p className="service-warning" role="status">{serviceError}</p>}
      <main>
        <section className="public-hero" id="beranda">
          <div className="public-hero-copy">
            <span className="eyebrow"><Sparkles size={14} /> ASISTEN FORMAT AKADEMIK</span>
            <h1>Fokus pada ide.<br /><em>Formatnya biar rapi.</em></h1>
            <p>Rapikan makalah dengan satu ruang kerja untuk menulis, memeriksa struktur, mengatur format, dan mengunduh hasil Word.</p>
            <div className="public-hero-actions"><button className="button button-primary" onClick={onRegister}>Mulai Sekarang <ArrowRight size={16} /></button><a href="#cara-kerja">Lihat cara kerja</a></div>
            <div className="public-trust"><ShieldCheck size={15} /> Dokumen tersimpan privat di akun Anda</div>
          </div>
          <div className="public-hero-art" aria-hidden="true"><div className="public-window"><div className="public-window-bar"><i /><i /><i /><span>Workspace</span></div><div className="public-window-content"><aside /><div className="public-paper"><b>MAKALAH</b><strong>Teknologi Informasi</strong><span /><span /><span /><span /><span /><small><Check size={12} /> Format siap</small></div><div className="public-format-card"><Check size={14} /> Margin sesuai</div></div></div></div>
        </section>
        <section className="public-features" id="fitur"><span className="eyebrow">YANG ANDA BUTUHKAN</span><h2>Satu alur, dari naskah hingga siap dikumpulkan.</h2><div className="public-feature-grid">{features.map(({ Icon, title, text }) => <article key={title}><span><Icon size={20} /></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
        <section className="public-steps" id="cara-kerja"><div><span className="eyebrow">CARA KERJA</span><h2>Mulai dari naskah Anda.</h2><p>Impor DOCX atau tulis langsung. Pilih pedoman, tinjau temuan, lalu unduh hasilnya.</p></div><ol><li><b>01</b><span><strong>Masukkan dokumen</strong><small>Unggah DOCX atau tempel teks.</small></span></li><li><b>02</b><span><strong>Atur dan periksa</strong><small>Pilih template dan cek struktur naskah.</small></span></li><li><b>03</b><span><strong>Unduh hasil</strong><small>Ekspor dokumen Word yang bisa diedit.</small></span></li></ol></section>
        <section className="public-faq"><span className="eyebrow">FAQ</span><h2>Pertanyaan umum</h2><details><summary>Format file apa yang dapat digunakan?</summary><p>Anda dapat mengimpor DOCX, TXT, dan HTML. Hasil format dapat diunduh sebagai DOCX atau dicetak menjadi PDF dari browser.</p></details><details><summary>Apakah dokumen saya dapat diakses pengguna lain?</summary><p>Dokumen akun hanya ditampilkan setelah masuk dan setiap permintaan data dibatasi ke pemilik akun di server.</p></details><details><summary>Apakah hasil DOCX langsung mengikuti pedoman kampus?</summary><p>Template menyediakan format awal yang dapat disesuaikan. Periksa kembali pedoman institusi dan hasil akhir di Word atau aplikasi yang kompatibel.</p></details></section>
        <section className="public-cta" id="tentang"><div><h2>Makalah rapi, tanpa repot mengatur satu per satu.</h2><p>Masuk atau buat akun untuk mulai menyimpan dokumen Anda.</p></div><button className="button button-primary" onClick={onRegister}>Buat akun <ArrowRight size={15} /></button></section>
      </main>
      <footer className="public-footer"><a className="public-brand" href="#beranda"><span><BookOpen size={17} /></span>RapiMakalah</a><small>Asisten format dokumen akademik.</small><small>© {new Date().getFullYear()} RapiMakalah</small></footer>
    </div>
  );
}

export function AuthPage({ mode, onAuthenticated, onLanding, serviceError }) {
  const registering = mode === 'register';
  const [values, setValues] = useState({ name: '', email: '', password: '', passwordConfirmation: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(serviceError || '');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (registering && values.password !== values.passwordConfirmation) {
      setError('Konfirmasi password tidak sama.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest('/api/auth/' + (registering ? 'register' : 'login'), {
        method: 'POST',
        body: JSON.stringify(values)
      });
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <button className="auth-back" onClick={onLanding}><BookOpen size={19} /> RapiMakalah <span>Kembali ke beranda</span></button>
      <section className="auth-card">
        <div className="auth-icon"><BookOpen size={21} /></div>
        <span className="eyebrow">{registering ? 'MULAI GRATIS' : 'SELAMAT DATANG KEMBALI'}</span>
        <h1>{registering ? 'Buat akun Anda' : 'Masuk ke akun'}</h1>
        <p>{registering ? 'Simpan dan lanjutkan dokumen Anda kapan saja.' : 'Lanjutkan merapikan dokumen akademik Anda.'}</p>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          {registering && <label>Nama lengkap<input autoComplete="name" required minLength="2" maxLength="100" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></label>}
          <label>Email<input type="email" autoComplete="email" required maxLength="254" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></label>
          <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 10 : 1} maxLength="72" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Sembunyikan' : 'Tampilkan'}</button></div>{registering && <small>Gunakan minimal 10 karakter.</small>}</label>
          {registering && <label>Konfirmasi password<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={values.passwordConfirmation} onChange={(event) => setValues({ ...values, passwordConfirmation: event.target.value })} /></label>}
          <button className="button button-primary auth-submit" disabled={submitting}>{submitting ? 'Memproses…' : registering ? 'Buat akun' : 'Masuk'} <ArrowRight size={15} /></button>
        </form>
        <div className="auth-switch">{registering ? 'Sudah punya akun?' : 'Belum punya akun?'} <button onClick={() => onLanding(registering ? 'login' : 'register')}>{registering ? 'Masuk' : 'Daftar'}</button></div>
      </section>
      <p className="auth-privacy"><ShieldCheck size={14} /> Password dienkripsi sebelum disimpan. Dokumen hanya dapat diakses akun Anda.</p>
    </main>
  );
}
