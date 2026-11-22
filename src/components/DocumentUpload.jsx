import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';

export default function DocumentUpload({ onFile, compact = false }) {
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  function dropFile(event) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) onFile(file);
  }
  return (
    <>
      <input ref={input} className="visually-hidden" type="file" accept=".docx,.txt,.html,.htm,text/plain,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => {
        const file = event.target.files && event.target.files[0];
        if (file) onFile(file);
        event.target.value = '';
      }} />
      <button className={(compact ? 'button button-secondary upload-compact' : 'upload-tile') + (dragging ? ' drag-over' : '')}
        onClick={() => input.current && input.current.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
        onDrop={dropFile}>
        <FileUp size={compact ? 16 : 21} />
        {compact ? <span>Unggah</span> : <span><strong>Unggah dokumen</strong><small>DOCX, TXT, atau HTML · maksimal 25 MB</small></span>}
      </button>
    </>
  );
}
