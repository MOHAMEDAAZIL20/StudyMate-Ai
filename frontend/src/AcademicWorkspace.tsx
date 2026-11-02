import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, Check, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from './api';
import { RecentMaterials } from './StudyMaterials';
import type { Resource, Semester, Topic, Workspace } from './api';

type Editor = { resource: Resource; item?: Semester; parent?: number };
const labels: Record<Resource, string> = { semesters: 'semester', subjects: 'subject', units: 'unit', topics: 'topic' };

export function AcademicWorkspace({ overview = false, onOpen }: { overview?: boolean; onOpen?: () => void }) {
  const [data, setData] = useState<Workspace>();
  const [semesterId, setSemesterId] = useState<number>();
  const [subjectId, setSubjectId] = useState<number>();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Editor>();
  const [removing, setRemoving] = useState<Editor>();
  const [syllabusUnit, setSyllabusUnit] = useState<number>();
  const [notice, setNotice] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { setData(await api<Workspace>('/workspace')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Backend unavailable. Start FastAPI and retry.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); setEditor(undefined); setRemoving(undefined); setSyllabusUnit(undefined); await load(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Try again.'); return false; }
    finally { setBusy(false); }
  }
  const selectedSemester = data?.semesters.find(s => s.id === semesterId) ?? data?.semesters[0];
  const subjects = data?.subjects.filter(s => s.semester_id === selectedSemester?.id) ?? [];
  const selectedSubject = subjects.find(s => s.id === subjectId) ?? subjects[0];
  const units = data?.units.filter(u => u.subject_id === selectedSubject?.id) ?? [];
  const topicList = data?.topics ?? [];
  const matches = (name: string) => name.toLowerCase().includes(query.toLowerCase());
  function subjectMatches(id: number, name: string) {
    return matches(name) || (data?.units.some(u => u.subject_id === id && (matches(u.name) || topicList.some(t => t.unit_id === u.id && matches(t.name)))) ?? false);
  }
  const actions = (resource: Resource, item: Semester) => <span className="record-actions"><button className="icon-button" aria-label={`Rename ${item.name}`} disabled={busy} onClick={() => setEditor({ resource, item })}><Pencil size={15}/></button><button className="icon-button" aria-label={`Remove ${item.name}`} disabled={busy} onClick={() => setRemoving({ resource, item })}><Trash2 size={15}/></button></span>;
  const alert = error && <div className="error-message" role="alert">{error} <button className="text-button" disabled={busy || loading} onClick={() => void load()}>Retry loading</button></div>;
  if (!data) return <section className="panel">{loading ? <p role="status">Loading your workspace…</p> : <><h2>Couldn’t load your workspace</h2>{alert}</>}</section>;
  if (overview) return <section className="real-overview"><div className="stats">{[
    ['Semesters', data.semesters.length], ['Subjects', data.subjects.length], ['Topics completed', topicList.filter(t => t.completed).length], ['Topics remaining', topicList.filter(t => !t.completed).length],
  ].map(([label, value]) => <article className="stat" key={label}><div className="stat-top">{label}</div><strong>{value}</strong><small>From your saved workspace</small></article>)}</div><section className="panel"><div className="section-heading"><h2>Your subjects</h2><button className="primary" onClick={onOpen}>Manage subjects</button></div>{data.subjects.length ? <div className="overview-subjects">{data.subjects.map(s => {
    const unitIds = data.units.filter(u => u.subject_id === s.id).map(u => u.id);
    const topics = topicList.filter(t => unitIds.includes(t.unit_id));
    const done = topics.filter(t => t.completed).length;
    return <button key={s.id} className="saved-subject" onClick={onOpen}><BookOpen size={22}/><strong>{s.name}</strong><small>{data.semesters.find(x => x.id === s.semester_id)?.name} · {done}/{topics.length} topics complete</small><progress aria-label={`${s.name} completion`} max={topics.length || 1} value={done}/></button>;
  })}</div> : <div className="empty-state"><BookOpen size={32}/><h3>Your learning starts here.</h3><p>Add a semester and your first subject to build your syllabus.</p><button className="primary" onClick={onOpen}>Create your workspace</button></div>}</section><RecentMaterials/><div className="panel future-note"><h2>More learning tools are on the way</h2><p>Upload your notes in Study materials. AI arrives in Phase 4, quizzes in Phase 5, and Mistake-to-Mastery in Phase 6. Exam planning follows in Phase 7.</p></div></section>;
  return <section className="academic-workspace">{alert}{loading && <p role="status">Refreshing workspace…</p>}{notice && <p role="status" className="success-message">{notice}</p>}
    <div className="workspace-toolbar"><label>Semester<select value={selectedSemester?.id ?? ''} disabled={busy} onChange={e => { setSemesterId(Number(e.target.value)); setSubjectId(undefined); }}>{!data.semesters.length && <option value="">No semesters yet</option>}{data.semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{selectedSemester && actions('semesters', selectedSemester)}<button className="secondary" disabled={busy} onClick={() => setEditor({ resource: 'semesters' })}><Plus size={15}/>Add semester</button><label className="search"><Search size={16}/><input aria-label="Search subjects, units and topics in selected semester" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search syllabus…"/></label></div>
    {!selectedSemester ? <div className="panel empty-state"><BookOpen size={36}/><h2>Build your study workspace</h2><p>Start with a semester, then add subjects, units, and topics.</p></div> : <div className="academic-grid"><aside className="panel subject-picker"><div className="section-heading"><h2>Subjects</h2><button className="icon-button" aria-label="Add subject" disabled={busy} onClick={() => setEditor({ resource: 'subjects', parent: selectedSemester.id })}><Plus size={19}/></button></div>{subjects.filter(s => subjectMatches(s.id, s.name)).map(s => <div className={selectedSubject?.id === s.id ? 'subject-choice selected' : 'subject-choice'} key={s.id}><button onClick={() => setSubjectId(s.id)} aria-pressed={selectedSubject?.id === s.id}><BookOpen size={16}/>{s.name}</button>{actions('subjects', s)}</div>)}{!subjects.length && <p className="empty-copy">No subjects yet. Use + to add your first subject.</p>}{subjects.length > 0 && !subjects.some(s => subjectMatches(s.id, s.name)) && <p>No matches in this semester.</p>}</aside>
    <div>{selectedSubject && subjectMatches(selectedSubject.id, selectedSubject.name) ? <><div className="section-heading"><div><p className="eyebrow">YOUR SYLLABUS</p><h2>{selectedSubject.name}</h2></div><button className="primary" disabled={busy} onClick={() => setEditor({ resource: 'units', parent: selectedSubject.id })}><Plus size={15}/>Add unit</button></div>{units.filter(u => matches(selectedSubject.name) || matches(u.name) || topicList.some(t => t.unit_id === u.id && matches(t.name))).map(u => <section className="panel unit-panel" key={u.id}><div className="section-heading"><h3>{u.name}</h3>{actions('units', u)}</div><div className="topic-list">{topicList.filter(t => t.unit_id === u.id && (matches(selectedSubject.name) || matches(u.name) || matches(t.name))).map(t => <div className="topic-row" key={t.id}><label><input type="checkbox" checked={t.completed} disabled={busy} onChange={() => void mutate(() => api(`/topics/${t.id}`, 'PUT', { name: t.name, completed: !t.completed }))}/><span className={t.completed ? 'completed-topic' : ''}>{t.name}</span>{t.completed && <Check size={14}/>}</label>{actions('topics', t)}</div>)}{!topicList.some(t => t.unit_id === u.id) && <p className="empty-copy">No topics yet. Add one or import a syllabus below.</p>}</div><div className="unit-buttons"><button className="secondary" disabled={busy} onClick={() => setEditor({ resource: 'topics', parent: u.id })}><Plus size={14}/>Add topic</button><button className="text-button" disabled={busy} onClick={() => setSyllabusUnit(u.id)}>Import syllabus text</button></div></section>)}{!units.length && <div className="panel empty-state"><h3>Give your syllabus some structure.</h3><p>Add a unit, then list its topics.</p></div>}</> : <div className="panel empty-state"><p>{query ? 'Choose a matching subject from the list.' : 'Add a subject to begin organizing your syllabus.'}</p></div>}</div></div>}
    {editor && <NameEditor key={`${editor.resource}-${editor.item?.id ?? 'new'}`} editor={editor} busy={busy} error={error} onClose={() => !busy && setEditor(undefined)} onSave={name => void mutate(() => {
      const parentKey = { subjects: 'semester_id', units: 'subject_id', topics: 'unit_id', semesters: '' }[editor.resource];
      const body = editor.item ? { name, ...(editor.resource === 'topics' ? { completed: topicList.find(t => t.id === editor.item!.id)?.completed ?? false } : {}) } : { name, ...(parentKey ? { [parentKey]: editor.parent } : {}) };
      return api(`/${editor.resource}${editor.item ? '/' + editor.item.id : ''}`, editor.item ? 'PUT' : 'POST', body);
    })}/>}
    {removing && <Modal title={`Remove ${labels[removing.resource]}?`} onClose={() => !busy && setRemoving(undefined)}><p>“{removing.item?.name}” will be permanently removed. Parents with child items cannot be removed.</p>{error && <p role="alert" className="error-message">{error}</p>}<div className="unit-buttons"><button className="secondary" disabled={busy} onClick={() => setRemoving(undefined)}>Cancel</button><button className="primary danger" disabled={busy} onClick={() => void mutate(() => api(`/${removing.resource}/${removing.item!.id}`, 'DELETE'))}>{busy ? 'Removing…' : 'Remove'}</button></div></Modal>}
    {syllabusUnit !== undefined && <SyllabusEditor busy={busy} error={error} onClose={() => !busy && setSyllabusUnit(undefined)} onSave={async topics => { const ok = await mutate(async () => { const created = await api<Topic[]>(`/units/${syllabusUnit}/syllabus`, 'POST', { topics }); setNotice(`Imported ${created.length} new topics. Existing duplicates were skipped.`); }); if (!ok) setNotice(''); }}/>}</section>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="academic-dialog panel" onCancel={e => { e.preventDefault(); onClose(); }}><h2>{title}</h2>{children}</dialog>;
}
function NameEditor({ editor, busy, error, onClose, onSave }: { editor: Editor; busy: boolean; error: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(editor.item?.name ?? '');
  function submit(e: FormEvent) { e.preventDefault(); if (name.trim()) onSave(name.trim()); }
  return <Modal title={`${editor.item ? 'Rename' : 'Add'} ${labels[editor.resource]}`} onClose={onClose}><form onSubmit={submit}><label className="field">Name<input autoFocus required maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder={`Enter ${labels[editor.resource]} name`}/></label>{error && <p role="alert" className="error-message">{error}</p>}<div className="unit-buttons"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="primary" disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save'}</button></div></form></Modal>;
}
function SyllabusEditor({ busy, error, onClose, onSave }: { busy: boolean; error: string; onClose: () => void; onSave: (topics: string[]) => Promise<void> }) {
  const [text, setText] = useState(''); const [fileError, setFileError] = useState('');
  const topics = text.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
  const invalid = topics.length > 200 || topics.some(t => t.length > 120);
  return <Modal title="Import syllabus topics" onClose={onClose}><p>Paste one topic per line or select a UTF-8 TXT file (up to 100 KB). Review before importing into this unit. PDF/PPTX extraction arrives in Phase 3.</p><label className="field">Text syllabus file<input type="file" accept=".txt,text/plain" disabled={busy} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setFileError(''); if (!file.name.toLowerCase().endsWith('.txt') || file.size > 102400) { setFileError('Choose a TXT file up to 100 KB.'); return; } try { const content = await file.text(); if (content.includes('\u0000') || content.includes('\ufffd')) throw Error(); setText(content); } catch { setFileError('Could not read this file. Use UTF-8 text.'); } }}/></label><label className="field">Topics<textarea autoFocus rows={8} maxLength={102400} value={text} onChange={e => setText(e.target.value)} placeholder={'Introduction to databases\nRelational model\nNormalization'}/></label><small>{topics.length} lines · up to 200 topics, 120 characters each. Duplicates are skipped.</small>{(error || fileError || invalid) && <p role="alert" className="error-message">{fileError || error || 'Too many topics or a topic exceeds 120 characters.'}</p>}<div className="unit-buttons"><button className="secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="primary" disabled={busy || invalid || !topics.length || !!fileError} onClick={() => void onSave(topics)}>{busy ? 'Importing…' : 'Import topics'}</button></div></Modal>;
}
