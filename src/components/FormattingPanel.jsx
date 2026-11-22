import { useRef, useState } from 'react';
import { ChevronDown, ImagePlus, Plus, Trash2, WandSparkles, X } from 'lucide-react';
import TemplateSelector from './TemplateSelector.jsx';

const ruleLabels = [
  ['margins', 'Margin halaman'], ['font', 'Jenis font'], ['fontSize', 'Ukuran teks'],
  ['lineSpacing', 'Spasi baris'], ['indentation', 'Indentasi paragraf'], ['alignment', 'Perataan teks'],
  ['headings', 'Heading BAB dan subbab'], ['paragraphSpacing', 'Jarak antarparagraf'],
  ['pageNumbers', 'Penomoran halaman'], ['toc', 'Sisipkan daftar isi'],
  ['cover', 'Buat cover otomatis'], ['preface', 'Tanda tangan kata pengantar']
];

function Field({ label, children }) {
  return <label className="field-label">{label}{children}</label>;
}

export default function FormattingPanel({ settings, metadata, onSettings, onMetadata, onApply, applying, progress = 0, onToast }) {
  const [membersOpen, setMembersOpen] = useState(false);
  const coverImageInput = useRef(null);
  function updateGroup(group, key, value) {
    onSettings({ ...settings, [group]: { ...settings[group], [key]: value } });
  }
  function updateRule(key, value) {
    onSettings({ ...settings, rules: { ...settings.rules, [key]: value } });
  }
  function setMeta(key, value) { onMetadata({ ...metadata, [key]: value }); }
  function changeTemplate(value) {
    const presets = {
      college: { size: 12, lineSpacing: 1.5, left: 4, top: 3, bottom: 3, right: 3 },
      school: { size: 12, lineSpacing: 1.5, left: 4, top: 3, bottom: 3, right: 3 },
      simple: { size: 11, lineSpacing: 1.15, left: 2.5, top: 2.5, bottom: 2.5, right: 2.5 },
      lab: { size: 12, lineSpacing: 1.5, left: 3.5, top: 3, bottom: 3, right: 3 },
      research: { size: 12, lineSpacing: 2, left: 4, top: 4, bottom: 3, right: 3 },
      scientific: { size: 12, lineSpacing: 1.5, left: 3.5, top: 3, bottom: 3, right: 3 },
      proposal: { size: 12, lineSpacing: 1.5, left: 4, top: 3, bottom: 3, right: 3 }
    };
    if (!presets[value]) {
      onSettings({ ...settings, template: value });
      return;
    }
    const preset = presets[value];
    onSettings({
      ...settings, template: value,
      typography: { ...settings.typography, size: preset.size, lineSpacing: preset.lineSpacing },
      paper: { ...settings.paper, left: preset.left, right: preset.right, top: preset.top, bottom: preset.bottom }
    });
    onToast('Preset diterapkan ke pengaturan. Pilih Terapkan formatting untuk memperbarui dokumen.');
  }
  const activeRules = Object.values(settings.rules).filter(Boolean).length;

  return (
    <aside className="formatting-pane">
      <div className="panel-heading"><div><h2>Pengaturan format</h2><p>Atur tampilan dokumen akhir.</p></div><span className="active-rule-count">{activeRules} aktif</span></div>
      <div className="format-scroll">
        <details className="format-section" open>
          <summary><span>Template pedoman</span><ChevronDown size={15} /></summary>
          <TemplateSelector value={settings.template} onChange={changeTemplate} />
        </details>
        <details className="format-section" open>
          <summary><span>Aturan yang diterapkan</span><ChevronDown size={15} /></summary>
          <div className="rule-checkboxes">
            {ruleLabels.map(([key, label]) => <label key={key} className="toggle-row"><span>{label}</span><input type="checkbox" checked={Boolean(settings.rules[key])} onChange={(event) => updateRule(key, event.target.checked)} /><i /></label>)}
          </div>
        </details>
        <details className="format-section" open>
          <summary><span>Data dokumen</span><ChevronDown size={15} /></summary>
          <div className="form-grid">
            <Field label="Judul"><input value={metadata.title} onChange={(event) => setMeta('title', event.target.value)} placeholder="Judul makalah" /></Field>
            <Field label="Logo atau foto sampul">
              <input ref={coverImageInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                const file = event.target.files && event.target.files[0];
                event.target.value = '';
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) { onToast('Ukuran gambar sampul maksimal 5 MB.'); return; }
                const reader = new FileReader();
                reader.onload = () => setMeta('coverImage', reader.result);
                reader.onerror = () => onToast('Gambar sampul tidak dapat dibaca.');
                reader.readAsDataURL(file);
              }} />
              {metadata.coverImage
                ? <div className="cover-image-control"><img src={metadata.coverImage} alt="Logo cover" /><span>Gambar siap digunakan</span><button type="button" className="icon-button danger-icon" aria-label="Hapus logo sampul" onClick={() => setMeta('coverImage', '')}><X size={14} /></button></div>
                : <button type="button" className="cover-image-button" onClick={() => coverImageInput.current && coverImageInput.current.click()}><ImagePlus size={15} /> Pilih gambar</button>}
            </Field>
            <Field label="Mata pelajaran / mata kuliah"><input value={metadata.course} onChange={(event) => setMeta('course', event.target.value)} placeholder="Contoh: Bahasa Indonesia" /></Field>
            <Field label="Nama guru / dosen"><input value={metadata.teacher} onChange={(event) => setMeta('teacher', event.target.value)} placeholder="Nama pembimbing" /></Field>
            <Field label="Nama penulis"><input value={metadata.author} onChange={(event) => setMeta('author', event.target.value)} placeholder="Nama penulis utama" /></Field>
            <div className="field-pair">
              <Field label="Kelas"><input value={metadata.className} onChange={(event) => setMeta('className', event.target.value)} placeholder="Kelas" /></Field>
              <Field label="Program studi"><input value={metadata.program} onChange={(event) => setMeta('program', event.target.value)} placeholder="Program studi" /></Field>
            </div>
            <div className="field-pair">
              <Field label="Departemen"><input value={metadata.department} onChange={(event) => setMeta('department', event.target.value)} placeholder="Departemen" /></Field>
              <Field label="Fakultas"><input value={metadata.faculty} onChange={(event) => setMeta('faculty', event.target.value)} placeholder="Fakultas" /></Field>
            </div>
            <Field label="Institusi"><input value={metadata.institution} onChange={(event) => setMeta('institution', event.target.value)} placeholder="Sekolah atau universitas" /></Field>
            <div className="field-pair">
              <Field label="Kota"><input value={metadata.city} onChange={(event) => setMeta('city', event.target.value)} placeholder="Kota" /></Field>
              <Field label="Tahun"><input value={metadata.year} onChange={(event) => setMeta('year', event.target.value)} placeholder="2026" /></Field>
            </div>
            <button className="subtle-button" onClick={() => setMembersOpen((open) => !open)}>{membersOpen ? 'Sembunyikan anggota' : 'Kelola anggota kelompok'} <span>{metadata.members.length}</span></button>
            {membersOpen && <div className="members-list">
              {metadata.members.map((member, index) => <div className="member-row" key={member.id}>
                <input value={member.name} placeholder="Nama anggota" onChange={(event) => setMeta('members', metadata.members.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
                <input value={member.idNumber} placeholder="NIM / nomor" onChange={(event) => setMeta('members', metadata.members.map((item, i) => i === index ? { ...item, idNumber: event.target.value } : item))} />
                <button className="icon-button danger-icon" aria-label="Hapus anggota" onClick={() => setMeta('members', metadata.members.filter((_, i) => i !== index))}><Trash2 size={14} /></button>
              </div>)}
              <button className="subtle-button" onClick={() => setMeta('members', [...metadata.members, { name: '', idNumber: '', id: Date.now() }])}><Plus size={14} /> Tambah anggota</button>
            </div>}
          </div>
        </details>
        <details className="format-section" open>
          <summary><span>Tipografi isi</span><ChevronDown size={15} /></summary>
          <div className="field-pair">
            <Field label="Font"><select value={settings.typography.font} onChange={(event) => updateGroup('typography', 'font', event.target.value)}><option>Times New Roman</option><option>Arial</option><option>Calibri</option><option>Cambria</option></select></Field>
            <Field label="Ukuran (pt)"><input type="number" min="8" max="24" value={settings.typography.size} onChange={(event) => updateGroup('typography', 'size', Number(event.target.value))} /></Field>
          </div>
          <div className="field-pair">
            <Field label="Spasi baris"><select value={settings.typography.lineSpacing} onChange={(event) => updateGroup('typography', 'lineSpacing', Number(event.target.value))}><option value="1">1,0</option><option value="1.15">1,15</option><option value="1.5">1,5</option><option value="2">2,0</option></select></Field>
            <Field label="Indentasi (cm)"><input type="number" min="0" max="5" step="0.25" value={settings.typography.indent} onChange={(event) => updateGroup('typography', 'indent', Number(event.target.value))} /></Field>
          </div>
          <div className="field-pair">
            <Field label="Perataan"><select value={settings.typography.alignment} onChange={(event) => updateGroup('typography', 'alignment', event.target.value)}><option value="justify">Rata kiri kanan</option><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></Field>
            <Field label="Jarak sesudah (pt)"><input type="number" min="0" max="36" value={settings.typography.after} onChange={(event) => updateGroup('typography', 'after', Number(event.target.value))} /></Field>
          </div>
        </details>
        <details className="format-section">
          <summary><span>Kertas dan margin</span><ChevronDown size={15} /></summary>
          <div className="field-pair">
            <Field label="Ukuran kertas"><select value={settings.paper.size} onChange={(event) => updateGroup('paper', 'size', event.target.value)}><option>A4</option><option>A5</option><option>Letter</option><option>Legal</option><option>F4</option></select></Field>
            <Field label="Orientasi"><select value={settings.paper.orientation} onChange={(event) => updateGroup('paper', 'orientation', event.target.value)}><option value="portrait">Potret</option><option value="landscape">Lanskap</option></select></Field>
          </div>
          <div className="field-pair">
            <Field label="Atas (cm)"><input type="number" min="0" step="0.25" value={settings.paper.top} onChange={(event) => updateGroup('paper', 'top', Number(event.target.value))} /></Field>
            <Field label="Bawah (cm)"><input type="number" min="0" step="0.25" value={settings.paper.bottom} onChange={(event) => updateGroup('paper', 'bottom', Number(event.target.value))} /></Field>
          </div>
          <div className="field-pair">
            <Field label="Kiri (cm)"><input type="number" min="0" step="0.25" value={settings.paper.left} onChange={(event) => updateGroup('paper', 'left', Number(event.target.value))} /></Field>
            <Field label="Kanan (cm)"><input type="number" min="0" step="0.25" value={settings.paper.right} onChange={(event) => updateGroup('paper', 'right', Number(event.target.value))} /></Field>
          </div>
        </details>
        <details className="format-section">
          <summary><span>Heading BAB dan subbab</span><ChevronDown size={15} /></summary>
          <div className="field-pair">
            <Field label="Ukuran BAB (pt)"><input type="number" min="10" max="24" value={settings.headings.chapterSize} onChange={(event) => updateGroup('headings', 'chapterSize', Number(event.target.value))} /></Field>
            <Field label="Subbab (pt)"><input type="number" min="10" max="20" value={settings.headings.subheadingSize} onChange={(event) => updateGroup('headings', 'subheadingSize', Number(event.target.value))} /></Field>
          </div>
          <Field label="Perataan BAB"><select value={settings.headings.chapterAlignment} onChange={(event) => updateGroup('headings', 'chapterAlignment', event.target.value)}><option value="center">Tengah</option><option value="left">Kiri</option></select></Field>
          <label className="toggle-row"><span>Judul BAB tebal dan kapital</span><input type="checkbox" checked={settings.headings.boldChapter && settings.headings.uppercaseChapter} onChange={(event) => updateGroup('headings', 'boldChapter', event.target.checked)} /><i /></label>
          <label className="toggle-row"><span>Subbab tebal</span><input type="checkbox" checked={settings.headings.boldSubheading} onChange={(event) => updateGroup('headings', 'boldSubheading', event.target.checked)} /><i /></label>
        </details>
        <details className="format-section">
          <summary><span>Penomoran halaman</span><ChevronDown size={15} /></summary>
          <label className="toggle-row"><span>Aktifkan nomor halaman</span><input type="checkbox" checked={settings.numbering.enabled} onChange={(event) => updateGroup('numbering', 'enabled', event.target.checked)} /><i /></label>
          <label className="toggle-row"><span>Bagian awal angka Romawi</span><input type="checkbox" checked={settings.numbering.frontRoman} onChange={(event) => updateGroup('numbering', 'frontRoman', event.target.checked)} /><i /></label>
          <label className="toggle-row"><span>Cover tanpa nomor</span><input type="checkbox" checked={settings.numbering.coverWithoutNumber} onChange={(event) => updateGroup('numbering', 'coverWithoutNumber', event.target.checked)} /><i /></label>
          <Field label="Posisi nomor"><select value={settings.numbering.position} onChange={(event) => updateGroup('numbering', 'position', event.target.value)}><option value="center">Bawah · tengah</option><option value="right">Bawah · kanan</option></select></Field>
        </details>
        <details className="format-section">
          <summary><span>Daftar isi</span><ChevronDown size={15} /></summary>
          <Field label="Kedalaman heading"><select value={settings.tocDepth} onChange={(event) => onSettings({ ...settings, tocDepth: Number(event.target.value) })}><option value="1">BAB saja</option><option value="2">BAB dan subbab</option><option value="3">Sampai sub-subbab</option></select></Field>
          <p className="panel-help">Daftar isi ditambahkan sebagai field Word yang dapat diperbarui dari Microsoft Word.</p>
        </details>
        <div className="apply-footer">
          <button className="apply-button" onClick={onApply} disabled={applying}><WandSparkles size={17} />{applying ? 'Memproses dokumen…' : 'Terapkan formatting'}</button>
          {applying && <div className="apply-progress"><span style={{ width: progress + '%' }} /></div>}
        </div>
      </div>
    </aside>
  );
}
