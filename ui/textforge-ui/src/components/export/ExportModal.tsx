import { useEffect, useState } from 'react';
import { exportManuscript } from '../../api/export';
import { Icon } from '../ui/Icon';
import { useToast } from '../../contexts/ToastContext';

interface Props {
  seriesTitle: string;
  onClose: () => void;
}

export function ExportModal({ seriesTitle, onClose }: Props) {
  const { showToast } = useToast();
  const [format, setFormat] = useState<'pdf' | 'epub'>('pdf');
  const [title, setTitle] = useState(seriesTitle);
  const [author, setAuthor] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportManuscript({ format, title: title.trim() || seriesTitle, author: author.trim() });
      if (result.cancelled) return;
      showToast(`Exported to ${result.outputPath}`);
      onClose();
    } catch (err: unknown) {
      showToast((err as { message?: string })?.message ?? 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="vs-modal-overlay" onMouseDown={onClose}>
      <div className="vs-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="vs-modal-header">
          <div className="vs-modal-title">Export Manuscript</div>
          <button className="vs-icon-btn" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="vs-modal-body">
          <div className="vs-form">
            <label className="vs-form-label">Format</label>
            <div className="export-format-row">
              <button
                className={`export-fmt-btn${format === 'pdf' ? ' active' : ''}`}
                onClick={() => setFormat('pdf')}
              >
                PDF
              </button>
              <button
                className={`export-fmt-btn${format === 'epub' ? ' active' : ''}`}
                onClick={() => setFormat('epub')}
              >
                EPUB
              </button>
            </div>

            <label className="vs-form-label">Title</label>
            <input
              className="vs-form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={seriesTitle}
            />

            <label className="vs-form-label">Author</label>
            <input
              className="vs-form-input"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Author name"
            />

            <p className="vs-form-msg">
              A save dialog will open to choose where to save the file.
            </p>
          </div>
        </div>

        <div className="vs-modal-footer">
          <button className="vs-btn secondary" onClick={onClose}>Cancel</button>
          <button
            className="vs-btn primary"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            <Icon name="download" size={13} />
            {exporting ? 'Exporting…' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
