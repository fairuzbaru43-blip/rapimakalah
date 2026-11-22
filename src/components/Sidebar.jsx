import { Files, LayoutDashboard, PenLine, PanelsTopLeft, Settings, Plus, BookOpen, LogOut, UserRound } from 'lucide-react';

const items = [
  { id: 'dashboard', label: 'Ringkasan', Icon: LayoutDashboard },
  { id: 'documents', label: 'Dokumen', Icon: Files },
  { id: 'workspace', label: 'Menulis', Icon: PenLine },
  { id: 'templates', label: 'Template', Icon: PanelsTopLeft },
  { id: 'settings', label: 'Pengaturan', Icon: Settings }
];

export default function Sidebar({ page, onNavigate, onNew, user, onLogout }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate('dashboard')} aria-label="Ke ringkasan">
        <span className="brand-mark"><BookOpen size={20} /></span>
        <span>RapiMakalah <small>PRO</small></span>
      </button>
      <div className="nav-caption">RUANG KERJA</div>
      <nav className="side-nav">
        {items.map(({ id, label, Icon }) => (
          <button key={id} className={'nav-item ' + (page === id ? 'active' : '')} onClick={() => onNavigate(id)}>
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
  );
}
