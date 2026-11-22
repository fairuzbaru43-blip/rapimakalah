import { useState } from 'react';
import { BookOpenCheck, Check, GraduationCap, Microscope, PenTool, ScrollText } from 'lucide-react';
import { templateOptions } from '../components/TemplateSelector.jsx';

const icons = { college: GraduationCap, school: BookOpenCheck, simple: ScrollText, lab: Microscope, research: Microscope, scientific: BookOpenCheck, proposal: PenTool, custom: PenTool };
export default function Templates({ selected, onSelect }) {
  const [chosen, setChosen] = useState(selected);
  return (
    <div className="page-content">
      <div className="page-heading"><div><span className="eyebrow">FORMAT DOKUMEN</span><h1>Template</h1><p>Pilih pedoman sebagai titik awal, lalu sesuaikan dengan kebutuhan.</p></div></div>
      <div className="template-grid">
        {templateOptions.map((template) => {
          const Icon = icons[template.value] || BookOpenCheck;
          return <button key={template.value} className={'template-card ' + (chosen === template.value ? 'selected' : '')} onClick={() => setChosen(template.value)}>
            <div className="template-card-top"><span className="template-icon"><Icon size={19} /></span>{chosen === template.value && <span className="template-selected"><Check size={13} /> Dipilih</span>}</div>
            <strong>{template.label}</strong><p>{template.detail}</p><div className="template-preview"><i /><i /><b /><i /><i /><i /></div>
          </button>;
        })}
      </div>
      <div className="template-action"><span>Template pilihan: <strong>{templateOptions.find((item) => item.value === chosen)?.label}</strong></span><button className="button button-primary" onClick={() => onSelect(chosen)}>Gunakan template</button></div>
    </div>
  );
}
