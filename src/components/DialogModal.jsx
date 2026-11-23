import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, Info, LoaderCircle, PencilLine, X } from 'lucide-react';

const icons = {
  confirm: AlertTriangle,
  delete: AlertTriangle,
  form: PencilLine,
  info: Info,
  loading: LoaderCircle,
  success: CheckCircle2,
  warning: AlertTriangle
};

export default function DialogModal({ dialog, onResolve }) {
  const [value, setValue] = useState(dialog.initialValue || '');
  const inputRef = useRef(null);
  const cancelRef = useRef(null);
  const Icon = icons[dialog.type] || CircleHelp;
  const isForm = dialog.type === 'form';
  const isLoading = dialog.type === 'loading';
  const isDanger = dialog.type === 'delete';

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    const focusTarget = isForm ? inputRef.current : cancelRef.current;
    if (focusTarget) focusTarget.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isLoading) onResolve(null);
      if (event.key === 'Tab') {
        const dialogElement = document.querySelector('.premium-dialog');
        if (!dialogElement) return;
        const focusable = Array.from(dialogElement.querySelectorAll('button:not(:disabled), input:not(:disabled)'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [isForm, isLoading, onResolve]);

  function submit(event) {
    event.preventDefault();
    if (isForm) {
      const trimmed = value.trim();
      if (!trimmed) return;
      onResolve(trimmed);
    } else onResolve(true);
  }

  return (
    <div className="premium-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isLoading) onResolve(null);
    }}>
      <section
        className="premium-dialog"
        role={isDanger ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        {!isLoading && <button className="premium-dialog-close" type="button" aria-label="Tutup dialog" onClick={() => onResolve(null)}><X size={18} /></button>}
        <span className={'premium-dialog-icon ' + (isDanger ? 'danger' : dialog.type || 'confirm')}>
          <Icon size={22} className={isLoading ? 'spin' : ''} />
        </span>
        <h2 id="dialog-title">{dialog.title}</h2>
        <p id="dialog-description">{dialog.description}</p>
        <form onSubmit={submit}>
          {isForm && <label className="premium-dialog-field">
            <span>{dialog.inputLabel || 'Nama dokumen'}</span>
            <input ref={inputRef} value={value} maxLength={120} onChange={(event) => setValue(event.target.value)} />
          </label>}
          {isLoading
            ? <div className="premium-dialog-actions"><span className="dialog-loading-label">{dialog.loadingLabel || 'Mohon tunggu…'}</span></div>
            : <div className="premium-dialog-actions">
              <button ref={cancelRef} className="button button-secondary" type="button" onClick={() => onResolve(null)}>{dialog.cancelText || 'Batal'}</button>
              <button className={'button ' + (isDanger ? 'button-danger' : 'button-primary')} type="submit" disabled={isForm && !value.trim()}>
                {dialog.confirmText || (isForm ? 'Simpan nama' : 'Lanjutkan')}
              </button>
            </div>}
        </form>
      </section>
    </div>
  );
}
