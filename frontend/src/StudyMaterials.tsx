import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Download, FileText, Search, Upload, X } from 'lucide-react';
import { api } from './api';
import type { Workspace } from './api';

type Material = { id: number; subject_id: number; unit_id: number | null; name: string; file_type: string; size_bytes: number; status: string; warning: string | null; created_at: string };
type Detail = Material & { text: string; sections: { number: number; label: string; text: string }[] };
const statusLabel = (status: string) => ({ ready: 'Text extracted', needs_ocr: 'Needs OCR', no_text: 'No readable text' }[status] ?? status);
const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Request failed. Check the backend and try again.';

export function StudyMaterials() {
  const [workspace, setWorkspace] = useState<Workspace>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Detail>();
  const [editing, setEditing] = useState<Material>();
  const [removing, setRemoving] = useState<Material>();
  const generation = useRef(0);
  async function load() {
    const current = ++generation.current;
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (subject) params.set('subject_id', subject);
    if (unit) params.set('unit_id', unit);
    try {
      const [w, list] = await Promise.all([api<Workspace>('/workspace'), api<Material[]>(`/documents?${params}`)]);
      if (current === generation.current) { setWorkspace(w); setMaterials(list); }
    } catch (e) { if (current === generation.current) setError(errorMessage(e)); }
    finally { if (current === generation.current) setLoading(false); }
  }
  useEffect(() => { const timer = setTimeout(() => void load(), 200); return () => { clearTimeout(timer); ++generation.current; }; }, [subject, unit, query]);
  async function mutate(action: () => Promise<unknown>, message: string) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); setUploading(false); setEditing(undefined); setRemoving(undefined); setNotice(message); await load(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  async function openPreview(id: number) {
    setBusy(true); setError('');
    try { setPreview(await api<Detail>(`/documents/${id}`)); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  const subjectName = (id: number) => workspace?.subjects.find(s => s.id === id)?.name ?? 'Unknown subject';
  return <section className="material-library"><div className="library-intro panel"><span className="phase-icon"><FileText size={28}/></span><div><h2>Your notes, together at last.</h2><p>Store originals and searchable text from PDFs, PowerPoint slides, and text notes. Image-only content needs OCR; AI indexing arrives in Phase 4.</p></div><button className="primary" disabled={busy || !workspace?.subjects.length} onClick={() => { setError(''); setUploading(true); }}><Upload size={16}/>Upload material</button></div>
    {workspace && !workspace.subjects.length && <div className="panel empty-copy">Create a semester and subject in <a href="#my-subjects">My subjects</a> before uploading.</div>}
    <div className="workspace-toolbar library-filters"><label className="search"><Search size={16}/><input aria-label="Search filenames and extracted text" maxLength={200} placeholder="Search filenames or content…" value={query} onChange={e => setQuery(e.target.value)}/></label><label>Subject<select aria-label="Filter by subject" value={subject} onChange={e => { setSubject(e.target.value); setUnit(''); }}><option value="">All subjects</option>{workspace?.subjects.map(s => <option key={s.id} value={s.id}>{s.name} · {workspace.semesters.find(x => x.id === s.semester_id)?.name}</option>)}</select></label><label>Unit<select aria-label="Filter by unit" value={unit} disabled={!subject} onChange={e => setUnit(e.target.value)}><option value="">All units</option>{workspace?.units.filter(u => u.subject_id === Number(subject)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label></div>
    {error && <p className="error-message" role="alert">{error} <button className="text-button" disabled={busy} onClick={() => void load()}>Retry loading</button></p>}{notice && <p className="success-message" role="status">{notice}</p>}
    {loading && <p role="status">Loading study materials…</p>}
    {!loading && workspace && !materials.length && !error && <div className="panel empty-state"><FileText size={36}/><h2>{query || subject || unit ? 'No matching materials' : 'Your library starts with one upload.'}</h2><p>{query || subject || unit ? 'Try another search or clear the filters.' : 'Add a PDF, PPTX, or TXT file up to 20 MB.'}</p></div>}
    <div className="material-grid">{materials.map(m => <article className="panel material-card" key={m.id}><div className="section-heading"><span className="file-type">{m.file_type.toUpperCase()}</span><span className={m.status === 'ready' ? 'status-badge ready' : 'status-badge warning'}>{statusLabel(m.status)}</span></div><h3>{m.name}</h3><p>{subjectName(m.subject_id)} · {workspace?.units.find(u => u.id === m.unit_id)?.name ?? 'Whole subject'}</p><small>{(m.size_bytes / 1024).toFixed(1)} KB · {new Date(m.created_at.endsWith('Z') || /[+-]\d\d:\d\d$/.test(m.created_at) ? m.created_at : m.created_at + 'Z').toLocaleDateString()}</small>{m.warning && <p className="extraction-warning">{m.warning}</p>}<div className="material-actions"><button className="primary" disabled={busy} onClick={() => void openPreview(m.id)}>Preview text</button><button className="text-button" disabled={busy} onClick={() => { setError(''); setEditing(m); }}>Categorize</button><button className="text-button remove-link" disabled={busy} onClick={() => { setError(''); setRemoving(m); }}>Remove</button></div></article>)}</div>
    {uploading && workspace && <UploadEditor workspace={workspace} busy={busy} error={error} defaultSubject={subject} onClose={() => !busy && setUploading(false)} onSave={(form) => void mutate(() => api('/documents', 'POST', form), 'Material uploaded. Its original and extracted text are saved locally.')}/>}
    {editing && workspace && <CategoryEditor item={editing} workspace={workspace} busy={busy} error={error} onClose={() => !busy && setEditing(undefined)} onSave={(subjectId, unitId) => void mutate(() => api(`/documents/${editing.id}`, 'PUT', { subject_id: subjectId, unit_id: unitId }), 'Categorization saved.')}/>}
    {removing && <MaterialDialog title="Remove this material?" onClose={() => !busy && setRemoving(undefined)}><p>“{removing.name}” and its extracted text will be permanently removed from this workspace. Your syllabus topics will stay saved.</p>{error && <p className="error-message" role="alert">{error}</p>}<div className="unit-buttons"><button className="secondary" disabled={busy} onClick={() => setRemoving(undefined)}>Cancel</button><button className="primary danger" disabled={busy} onClick={() => void mutate(() => api(`/documents/${removing.id}`, 'DELETE'), 'Material removed.')}>{busy ? 'Removing…' : 'Remove material'}</button></div></MaterialDialog>}
    {preview && <MaterialDialog wide title={preview.name} onClose={() => setPreview(undefined)}><div className="section-heading"><span className="status-badge">{statusLabel(preview.status)}</span><a className="secondary" href={`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/documents/${preview.id}/original`} download><Download size={15}/>Download original</a></div>{preview.warning && <p className="extraction-warning">{preview.warning}</p>}<p className="empty-copy">Extracted text preview · PDF pages and PPTX slides retain their original numbering. Layout and images are not reproduced.</p>{preview.sections.length ? preview.sections.map(s => <section className="text-section" key={s.number}><h3>{s.label}</h3><pre>{s.text || 'No selectable text in this section.'}</pre></section>) : <p>No extractable sections found.</p>}</MaterialDialog>}
    </section>;
}

function MaterialDialog({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = ref.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={ref} className={`academic-dialog panel ${wide ? 'preview-dialog' : ''}`} onCancel={e => { e.preventDefault(); onClose(); }}><div className="section-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;
}
function CategoryFields({ workspace, subject, unit, setSubject, setUnit, disabled }: { workspace: Workspace; subject: string; unit: string; setSubject: (s: string) => void; setUnit: (s: string) => void; disabled: boolean }) {
  return <><label className="field">Subject<select required value={subject} disabled={disabled} onChange={e => { setSubject(e.target.value); setUnit(''); }}><option value="">Choose a subject</option>{workspace.subjects.map(s => <option key={s.id} value={s.id}>{s.name} · {workspace.semesters.find(x => x.id === s.semester_id)?.name}</option>)}</select></label><label className="field">Unit (optional)<select value={unit} disabled={disabled || !subject} onChange={e => setUnit(e.target.value)}><option value="">Whole subject</option>{workspace.units.filter(u => u.subject_id === Number(subject)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label></>;
}
function UploadEditor({ workspace, busy, error, defaultSubject, onClose, onSave }: { workspace: Workspace; busy: boolean; error: string; defaultSubject: string; onClose: () => void; onSave: (form: FormData) => void }) {
  const [subject, setSubject] = useState(defaultSubject); const [unit, setUnit] = useState(''); const [file, setFile] = useState<File>(); const [fileError, setFileError] = useState('');
  function submit(e: FormEvent) { e.preventDefault(); if (!file || !subject || fileError) return; const form = new FormData(); form.set('subject_id', subject); if (unit) form.set('unit_id', unit); form.set('file', file); onSave(form); }
  return <MaterialDialog title="Upload study material" onClose={onClose}><form onSubmit={submit}><p>PDF, PPTX, or UTF-8 TXT · up to 20 MB. Selectable text only; scanned PDFs require OCR.</p><CategoryFields {...{ workspace, subject, unit, setSubject, setUnit }} disabled={busy}/><label className="field">Study file<input required type="file" accept=".pdf,.pptx,.txt" disabled={busy} onChange={e => { const selected = e.target.files?.[0]; setFile(selected); setFileError(selected && (!/\.(pdf|pptx|txt)$/i.test(selected.name) || selected.size > 20 * 1024 * 1024 || selected.size === 0) ? 'Choose a nonempty PDF, PPTX, or TXT file up to 20 MB.' : ''); }}/></label>{(fileError || error) && <p role="alert" className="error-message">{fileError || error}</p>}{busy && <p role="status">Uploading and extracting text… Please keep this window open.</p>}<div className="unit-buttons"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="primary" disabled={busy || !file || !subject || !!fileError}>{busy ? 'Processing…' : 'Upload material'}</button></div></form></MaterialDialog>;
}
function CategoryEditor({ item, workspace, busy, error, onClose, onSave }: { item: Material; workspace: Workspace; busy: boolean; error: string; onClose: () => void; onSave: (subject: number, unit: number | null) => void }) {
  const [subject, setSubject] = useState(String(item.subject_id)); const [unit, setUnit] = useState(item.unit_id ? String(item.unit_id) : '');
  return <MaterialDialog title="Categorize material" onClose={onClose}><form onSubmit={e => { e.preventDefault(); onSave(Number(subject), unit ? Number(unit) : null); }}><p>{item.name}</p><CategoryFields {...{ workspace, subject, unit, setSubject, setUnit }} disabled={busy}/>{error && <p role="alert" className="error-message">{error}</p>}<div className="unit-buttons"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="primary" disabled={busy || !subject}>{busy ? 'Saving…' : 'Save category'}</button></div></form></MaterialDialog>;
}

export function RecentMaterials() {
  const [items, setItems] = useState<Material[]>(); const [error, setError] = useState(false);
  useEffect(() => { let active = true; api<Material[]>('/documents').then(result => { if (active) setItems(result.slice(0, 4)); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, []);
  return <section className="panel recent-library"><div className="section-heading"><h2>Recently uploaded</h2><a className="text-button" href="#study-materials">Open library →</a></div>{error ? <p className="empty-copy">Couldn’t load materials. Open the library to retry.</p> : !items ? <p role="status">Loading materials…</p> : !items.length ? <p className="empty-copy">No uploads yet. Your study materials will appear here.</p> : items.map(item => <a className="document-row" key={item.id} href="#study-materials"><span className="file-icon"><FileText size={19}/></span><div><strong>{item.name}</strong><small>{item.file_type.toUpperCase()} · {statusLabel(item.status)}</small></div></a>)}</section>;
}
