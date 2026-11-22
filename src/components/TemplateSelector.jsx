import { GraduationCap } from 'lucide-react';

export const templateOptions = [
  { value: 'college', label: 'Makalah kuliah', detail: 'TNR 12 pt · spasi 1,5' },
  { value: 'school', label: 'Makalah sekolah', detail: 'Format akademik umum' },
  { value: 'simple', label: 'Dokumen sederhana', detail: 'Tata letak ringkas' },
  { value: 'lab', label: 'Laporan praktikum', detail: 'Format laporan praktikum' },
  { value: 'research', label: 'Laporan penelitian', detail: 'Struktur penelitian' },
  { value: 'scientific', label: 'Karya tulis ilmiah', detail: 'Heading dan daftar rujukan' },
  { value: 'proposal', label: 'Proposal', detail: 'Format naskah proposal' },
  { value: 'custom', label: 'Format custom', detail: 'Atur sendiri semua parameter' }
];

export default function TemplateSelector({ value, onChange }) {
  return (
    <label className="field-label">Template pedoman
      <span className="select-with-icon"><GraduationCap size={16} /><select value={value} onChange={(event) => onChange(event.target.value)}>
        {templateOptions.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.detail}</option>)}
      </select></span>
    </label>
  );
}
