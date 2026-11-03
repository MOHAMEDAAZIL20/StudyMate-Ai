import { useEffect, useState } from 'react';
import { api } from './api';
import type { Workspace } from './api';
type Answer = { answer: string; sources: { citation: number; document_id: number; name: string; section: string; text: string }[] };
type Turn = Answer & { question: string };
export function Assistant() {
  const [workspace, setWorkspace] = useState<Workspace>();
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Record<string, Turn[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ready: boolean; message: string; chat_model: string; embedding_model: string }>();
  async function refresh() { try { setError(''); const [w, s] = await Promise.all([api<Workspace>('/workspace'), api<typeof status>('/ai/status')]); setWorkspace(w); setStatus(s); } catch { setError('Could not connect to the backend. Start FastAPI and retry.'); } }
  useEffect(() => { void refresh(); }, []);
  async function send() {
    setBusy(true); setError('');
    try { const result = await api<Answer>('/ai/ask', 'POST', { subject_id: Number(subject), question }); setTurns(old => ({ ...old, [subject]: [...(old[subject] ?? []), { ...result, question }] })); setQuestion(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Request failed.'); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h2>Ask your study materials</h2><p className="empty-copy">Answers use documents in the selected subject. Check the source excerpts; AI can make mistakes. Each question should be self-contained. Chat history lasts while this page is open.</p><p role="status">{status?.message ?? 'Checking local AI…'}</p><button className="secondary" disabled={busy} onClick={() => void refresh()}>Check connection</button>{status && !status.ready && <div className="error-message"><p>Install Ollama from <a href="https://ollama.com/download/windows" target="_blank" rel="noreferrer">the official Windows download</a>, then run:</p><pre>{`ollama pull ${status.embedding_model}\nollama pull ${status.chat_model}\nollama serve`}</pre><p>If Ollama is already running, skip serve. Models download once; inference stays local.</p></div>}<label className="field">Subject<select value={subject} disabled={busy} onChange={e => { setSubject(e.target.value); setQuestion(''); }}><option value="">Choose a subject</option>{workspace?.subjects.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>{(turns[subject] ?? []).map((turn, i) => <article className="text-section" key={i}><h3>{turn.question}</h3><pre>{turn.answer}</pre>{turn.sources.map(source => <details key={source.citation}><summary>[{source.citation}] {source.name} · {source.section}</summary><pre>{source.text}</pre><a href={`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/documents/${source.document_id}/original`}>Download original</a></details>)}</article>)}{error && <p role="alert" className="error-message">{error}</p>}<form onSubmit={e => { e.preventDefault(); void send(); }}><label className="field">Your question<textarea rows={4} maxLength={2000} required value={question} disabled={busy} onChange={e => setQuestion(e.target.value)}/></label><button className="primary" disabled={busy || !subject || !question.trim() || !status?.ready}>{busy ? 'Reading your materials…' : 'Ask StudyMate'}</button>{busy && <p role="status">First use builds local embeddings and can take several minutes.</p>}</form></section>;
}
