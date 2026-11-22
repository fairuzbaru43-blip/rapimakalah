import { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, Bold, ImagePlus, Italic, List, ListOrdered, Redo2, Underline, Undo2, Heading1, Heading2 } from 'lucide-react';
import { parseDocument } from '../services/documentParser.js';

function ToolButton({ label, children, onClick, active = false }) {
  return <button type="button" className={'editor-tool ' + (active ? 'selected' : '')} title={label} aria-label={label}
    onMouseDown={(event) => event.preventDefault()} onClick={onClick}>{children}</button>;
}

export default function DocumentEditor({ html, onChange, onImage, wordCount, charCount, paragraphCount }) {
  const editor = useRef(null);
  const imageInput = useRef(null);
  const [font, setFont] = useState('Times New Roman');
  const [size, setSize] = useState('12');

  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== html) editor.current.innerHTML = html || '';
  }, [html]);

  function command(name, value) {
    editor.current && editor.current.focus();
    document.execCommand(name, false, value);
    if (editor.current) onChange(editor.current.innerHTML);
  }

  function applyFontSize(value) {
    const root = editor.current;
    const selection = window.getSelection();
    if (!root || !selection || !selection.rangeCount || selection.isCollapsed ||
        !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = Number(value) + 'pt';
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.addRange(nextRange);
    onChange(root.innerHTML);
  }

  return (
    <section className="writing-pane">
      <div className="editor-toolbar">
        <div className="tool-group">
          <select aria-label="Jenis huruf" value={font} onChange={(event) => { setFont(event.target.value); command('fontName', event.target.value); }}>
            <option>Times New Roman</option><option>Arial</option><option>Calibri</option><option>Cambria</option>
          </select>
          <select aria-label="Ukuran huruf" value={size} onChange={(event) => { setSize(event.target.value); applyFontSize(event.target.value); }}>
            <option value="10">10 pt</option><option value="11">11 pt</option><option value="12">12 pt</option><option value="14">14 pt</option><option value="16">16 pt</option>
          </select>
        </div>
        <span className="toolbar-divider" />
        <div className="tool-group">
          <ToolButton label="Judul bagian" onClick={() => command('formatBlock', 'h1')}><Heading1 size={17} /></ToolButton>
          <ToolButton label="Subjudul" onClick={() => command('formatBlock', 'h2')}><Heading2 size={17} /></ToolButton>
          <ToolButton label="Tebal" onClick={() => command('bold')}><Bold size={16} /></ToolButton>
          <ToolButton label="Miring" onClick={() => command('italic')}><Italic size={16} /></ToolButton>
          <ToolButton label="Garis bawah" onClick={() => command('underline')}><Underline size={16} /></ToolButton>
        </div>
        <span className="toolbar-divider" />
        <div className="tool-group">
          <ToolButton label="Rata kiri" onClick={() => command('justifyLeft')}><AlignLeft size={16} /></ToolButton>
          <ToolButton label="Rata tengah" onClick={() => command('justifyCenter')}><AlignCenter size={16} /></ToolButton>
          <ToolButton label="Rata kanan kiri" onClick={() => command('justifyFull')}><AlignJustify size={16} /></ToolButton>
          <ToolButton label="Daftar bullet" onClick={() => command('insertUnorderedList')}><List size={16} /></ToolButton>
          <ToolButton label="Daftar bernomor" onClick={() => command('insertOrderedList')}><ListOrdered size={16} /></ToolButton>
          <ToolButton label="Sisipkan gambar" onClick={() => imageInput.current && imageInput.current.click()}><ImagePlus size={16} /></ToolButton>
          <ToolButton label="Urungkan" onClick={() => command('undo')}><Undo2 size={16} /></ToolButton>
          <ToolButton label="Ulangi" onClick={() => command('redo')}><Redo2 size={16} /></ToolButton>
        </div>
        <input ref={imageInput} type="file" className="visually-hidden" accept="image/*" onChange={async (event) => {
          const file = event.target.files && event.target.files[0];
          if (file) await onImage(file);
          event.target.value = '';
        }} />
      </div>
      <div className="editor-scroll">
        <div className="editor-paper">
          <div ref={editor} className="rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label="Isi makalah" aria-multiline="true"
            data-placeholder="Tempel atau tulis makalah Anda di sini. Sistem akan mengenali BAB, subbab, paragraf, daftar, tabel, dan gambar."
            onInput={(event) => onChange(event.currentTarget.innerHTML)}
            onPaste={(event) => {
              const items = Array.from(event.clipboardData.items || []);
              const image = items.find((item) => item.type.startsWith('image/'));
              if (image) {
                const file = image.getAsFile();
                if (file) { event.preventDefault(); onImage(file); }
                return;
              }
              const html = event.clipboardData.getData('text/html');
              if (html) {
                event.preventDefault();
                command('insertHTML', parseDocument(html).html);
                return;
              }
              const text = event.clipboardData.getData('text/plain');
              if (text) {
                event.preventDefault();
                command('insertHTML', parseDocument(text).html);
              }
            }} />
        </div>
      </div>
      <div className="editor-status">
        <span>{wordCount.toLocaleString('id-ID')} kata <i /> {charCount.toLocaleString('id-ID')} karakter <i /> {paragraphCount} paragraf</span>
        <span>Editor naskah asli</span>
      </div>
    </section>
  );
}
