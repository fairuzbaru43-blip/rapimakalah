import { Files, LayoutDashboard, PanelsTopLeft, Settings, Plus, BookOpen, LogOut, UserRound } from 'lucide-react';

const items = [
  { id: 'dashboard', label: 'Ringkasan', Icon: LayoutDashboard },
  { id: 'documents', label: 'Dokumen', Icon: Files },
  { id: 'templates', label: 'Template', Icon: PanelsTopLeft },
  { id: 'settings', label: 'Pengaturan', Icon: Settings }
];

export default function Sidebar({ page, onNavigate, onNew, user, onLogout }) {
  return (
    <>
      <aside className="sidebar desktop-sidebar">
        <button className="brand" onClick={() => onNavigate('dashboard')} aria-label="Ke ringkasan">
          <span className="brand-mark"><BookOpen size={20} /></span>
          <span>RapiMakalah <small>PRO</small></span>
        </button>
        <div className="nav-caption">RUANG KERJA</div>
        <nav className="side-nav" aria-label="Navigasi ruang kerja">
          {items.map(({ id, label, Icon }) => (
            <button key={id} title={label} aria-current={page === id ? 'page' : undefined} className={'nav-item ' + (page === id ? 'active' : '')} onClick={() => onNavigate(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="new-document" onClick={onNew}><Plus size={17} /> Dokumen baru</button>
        <div className="sidebar-note">
          <span className="note-mark"><Files size={16} /></span>
          <div><strong>Tersimpan di akun</strong><p>Dokumen hanya dapat diakses akun Anda.</p></div>
        </div>
        <div className="sidebar-account">
          <span className="account-avatar"><UserRound size={15} /></span>
          <span className="account-name"><strong>{user?.name}</strong><small>{user?.email}</small></span>
          <button className="icon-button" title="Keluar" onClick={onLogout}><LogOut size={15} /></button>
        </div>
        <div className="sidebar-version">RapiMakalah Pro <span>1.0</span></div>
      </aside>
      <nav className="mobile-nav" aria-label="Navigasi utama">
        <button className={'mobile-nav-item ' + (page === 'dashboard' ? 'active' : '')} aria-current={page === 'dashboard' ? 'page' : undefined} onClick={() => onNavigate('dashboard')}>
          <LayoutDashboard size={20} /><span>Beranda</span>
        </button>
        <button className="mobile-nav-create" aria-label="Buat makalah baru" onClick={onNew}>
          <span><Plus size={22} /></span><small>Buat</small>
        </button>
        <button className={'mobile-nav-item ' + (page === 'documents' ? 'active' : '')} aria-current={page === 'documents' ? 'page' : undefined} onClick={() => onNavigate('documents')}>
          <Files size={20} /><span>Dokumen</span>
        </button>
        <button className={'mobile-nav-item ' + (page === 'settings' ? 'active' : '')} aria-current={page === 'settings' ? 'page' : undefined} onClick={() => onNavigate('settings')}>
          <UserRound size={20} /><span>Profil</span>
        </button>
      </nav>
    </>
  );
}
