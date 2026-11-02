import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, CircleHelp, FileText, GraduationCap, LayoutDashboard, Menu, MessageSquare, MoreHorizontal, RefreshCw, Search, Sparkles, Target, TrendingUp, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { documents, subjects } from './demo';
import './styles.css';

const navigation: { name: string; icon: LucideIcon; phase: number }[] = [
  { name: 'Overview', icon: LayoutDashboard, phase: 1 }, { name: 'My subjects', icon: BookOpen, phase: 2 },
  { name: 'Study materials', icon: FileText, phase: 3 }, { name: 'AI assistant', icon: MessageSquare, phase: 4 },
  { name: 'Practice quizzes', icon: Target, phase: 5 }, { name: 'Mistake to mastery', icon: TrendingUp, phase: 6 },
  { name: 'Revision planner', icon: CalendarDays, phase: 7 },
];
function App() {
  const [page, setPage] = useState(() => navigation.find(n => '#' + slug(n.name) === location.hash)?.name ?? 'Overview');
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [attempt, setAttempt] = useState(0);
  const [help, setHelp] = useState(false);
  function navigate(name: string) { location.hash = slug(name); setPage(name); setMenu(false); setQuery(''); }
  useEffect(() => { const sync = () => setPage(navigation.find(n => '#' + slug(n.name) === location.hash)?.name ?? 'Overview'); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync); }, []);
  useEffect(() => {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 5000);
    setHealth('checking');
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/health`, { signal: controller.signal })
      .then(async r => { if (!r.ok) throw Error(); const data = await r.json(); if (data.status !== 'ok' || data.database !== 'connected') throw Error(); setHealth('online'); })
      .catch(() => { if (!controller.signal.aborted || !disposed) setHealth('offline'); });
    let disposed = false;
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  const active = navigation.find(n => n.name === page)!;
  const filtered = subjects.filter(s => `${s.name} ${s.code}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="app">
    {menu && <button className="scrim" aria-label="Close navigation" onClick={() => setMenu(false)}/>}
    <aside className={menu ? 'sidebar open' : 'sidebar'}>
      <a className="brand" href="#overview" onClick={() => navigate('Overview')}><span className="brand-icon"><GraduationCap size={25}/></span>StudyMate<span className="ai">AI</span></a>
      <div className="workspace"><span className="avatar small">S</span><div>Student workspace<small>Local prototype</small></div><ChevronRight size={15}/></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation">{navigation.map(({ name, icon: Icon }) => <button key={name} className={page === name ? 'nav-item active' : 'nav-item'} aria-current={page === name ? 'page' : undefined} onClick={() => navigate(name)}><Icon size={19}/>{name}{name === 'Mistake to mastery' && <span className="new-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="local-card"><span className="local-icon"><Sparkles size={18}/></span><strong>Your learning, connected.</strong><p>One place for your notes, practice, and progress.</p><span>Built for a little progress, every day.</span></div><button className="help-button" onClick={() => setHelp(true)}><CircleHelp size={18}/>Getting started<ArrowRight size={15}/></button><div className="profile"><span className="avatar">S</span><div>Student<small>Personal workspace</small></div><span className="version">v0.1</span></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenu(true)}><Menu size={21}/></button><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div><div className="top-right"><span className="prototype">PHASE 01</span><span className="avatar small">S</span></div></header>
      <main id="main-content"><div className="page-heading"><div><p className="eyebrow">YOUR PERSONAL LEARNING SPACE</p><h1>{page === 'Overview' ? 'A little progress, every day.' : page}</h1><p className="subtitle">{page === 'Overview' ? 'Pick up where you left off. Your next breakthrough is closer than you think.' : 'Your study workspace is taking shape, one phase at a time.'}</p></div><button className="secondary" onClick={() => navigate('Revision planner')}><CalendarDays size={17}/>Study planner<ArrowRight size={15}/></button></div>
      <div className="demo-banner"><span><Sparkles size={16}/><strong>Explore your future workspace</strong><span>Illustrative demo data · no student records yet</span></span><button onClick={() => setHelp(true)}>About this preview<ArrowRight size={14}/></button></div>
      {page === 'Overview' ? <>
        <section className="stats" aria-label="Sample study statistics">{[{ label: 'Active subjects', value: '3', detail: 'Sample semester', icon: BookOpen, color: 'violet' }, { label: 'Topics completed', value: '37', detail: 'of 66 sample topics', icon: Check, color: 'green' }, { label: 'Average quiz score', value: '78%', detail: 'Illustrative performance', icon: Target, color: 'blue' }, { label: 'Topics to revisit', value: '4', detail: 'A chance to grow', icon: RefreshCw, color: 'orange' }].map(s => <article className="stat" key={s.label}><div className="stat-top"><span>{s.label}</span><span className={'stat-icon ' + s.color}><s.icon size={17}/></span></div><strong>{s.value}</strong><small>{s.detail}</small></article>)}</section>
        <div className="dashboard-grid"><div className="primary-column"><section><div className="section-heading"><h2>Continue learning <span className="count">3 subjects</span></h2><button className="text-button" onClick={() => navigate('My subjects')}>All subjects<ArrowRight size={15}/></button></div><div className="subject-list">{subjects.map(s => <SubjectCard key={s.code} subject={s} onClick={() => navigate('My subjects')}/>)}</div></section>
        <section className="materials panel"><div className="section-heading"><h2>Recent materials</h2><button className="text-button" onClick={() => navigate('Study materials')}>View library<ArrowRight size={15}/></button></div>{documents.map(d => <div className="document-row" key={d.name}><span className="file-icon"><FileText size={20}/></span><div><strong>{d.name}</strong><small>{d.subject} <span>· {d.type}</span></small></div><span className="file-date">{d.date}</span></div>)}</section></div>
        <div className="secondary-column"><section className="mastery-card"><div className="mastery-top"><span className="mastery-icon"><TrendingUp size={21}/></span><span>THE BIGGER PICTURE</span></div><h2>Turn mistakes into<br/>your next breakthrough.</h2><p>A wrong answer is a starting point. Find the concepts that need a second look.</p><div className="weak-topic"><span>Normalization</span><span>3 sample misses</span></div><div className="weak-topic"><span>Bayes’ theorem</span><span>2 sample misses</span></div><button onClick={() => navigate('Mistake to mastery')}>Explore mistake to mastery<ArrowRight size={17}/></button></section>
        <section className="panel exams"><div className="section-heading"><h2>On the horizon</h2><CalendarDays size={18}/></div><p className="muted">Sample exam schedule</p>{[{ day: '18', month: 'NOV', name: 'Machine Learning', detail: 'Units 1–3 · Sample exam' }, { day: '24', month: 'NOV', name: 'Database Management', detail: 'Units 1–4 · Sample exam' }].map(e => <div className="exam-row" key={e.day}><div className="date-tile"><strong>{e.day}</strong><span>{e.month}</span></div><div><strong>{e.name}</strong><small>{e.detail}</small></div></div>)}<button className="text-button" onClick={() => navigate('Revision planner')}>Open revision planner<ArrowRight size={15}/></button></section>
        <section className="tip"><span>✦</span><div><strong>Small steps add up.</strong><p>Try recalling a concept before reopening your notes.</p></div></section></div></div>
      </> : <><section className="phase-panel panel"><span className="phase-icon"><active.icon size={30}/></span><p className="eyebrow">PLANNED FOR PHASE {active.phase}</p><h2>{page === 'AI assistant' ? 'Answers grounded in your own notes.' : page === 'Mistake to mastery' ? 'Make every mistake a learning opportunity.' : `Your ${page.toLowerCase()}, all in one place.`}</h2><p>{page === 'AI assistant' ? 'Document retrieval, local embeddings, and Ollama setup will arrive in Phase 4. No model is connected yet.' : 'This navigation destination is ready. Creating and storing records will be implemented in the corresponding development phase.'}</p><button className="secondary" onClick={() => setHelp(true)}>View development roadmap<ArrowRight size={16}/></button></section>{page === 'My subjects' && <section><div className="section-heading"><h2>Sample subjects</h2><label className="search"><Search size={16}/><input aria-label="Search sample subjects" placeholder="Search subjects…" value={query} onChange={e => setQuery(e.target.value)}/></label></div><div className="subject-list">{filtered.map(s => <SubjectCard key={s.code} subject={s}/>)}{!filtered.length && <p className="panel">No sample subjects match “{query}”.</p>}</div></section>}</>}
      <footer><span>StudyMate AI <span className="footer-dot">·</span> Made for meaningful progress</span><div className="connection" role="status"><i className={health}/>{health === 'online' ? 'Backend & database connected' : health === 'checking' ? 'Checking backend…' : 'Backend unavailable'}{health === 'offline' && <button onClick={() => setAttempt(a => a + 1)}>Retry</button>}</div></footer>
      </main></div>
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="modal panel" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if(e.key === 'Escape') setHelp(false); }}><button autoFocus className="icon-button modal-close" aria-label="Close getting started" onClick={() => setHelp(false)}><X size={20}/></button><span className="phase-icon"><GraduationCap size={30}/></span><h2 id="help-title">Welcome to StudyMate AI</h2><p>This local prototype completes Phase 1. All dashboard numbers, documents, and dates are illustrative samples.</p><ol>{navigation.filter(n => n.phase > 1).map(n => <li key={n.name}><span>Phase {n.phase}</span>{n.name}</li>)}</ol><p>The backend status is live. Start FastAPI to connect SQLite. See README.md for setup and verification commands.</p><button className="primary" onClick={() => setHelp(false)}>Let’s explore<ArrowRight size={16}/></button></section></div>}
    </div>;
}
function slug(value: string) { return value.toLowerCase().replaceAll(' ', '-'); }
function SubjectCard({ subject: s, onClick }: { subject: typeof subjects[number]; onClick?: () => void }) {
  return <article className="subject-card"><span className={'subject-icon ' + s.color}>{s.icon}</span><div className="subject-content"><div className="subject-title"><div><span className="subject-code">{s.code}</span><h3>{s.name}</h3></div>{onClick ? <button className="icon-button" aria-label={`Explore ${s.name}`} onClick={onClick}><ArrowRight size={18}/></button> : <MoreHorizontal size={18}/>}</div><p>{s.detail}</p><div className="progress-label"><span>{s.done} of {s.total} topics</span><strong>{Math.round(s.done/s.total*100)}%</strong></div><div className={'progress ' + s.color} role="progressbar" aria-label={`${s.name} sample completion`} aria-valuenow={s.done} aria-valuemin={0} aria-valuemax={s.total}><span style={{ width: `${s.done/s.total*100}%` }}/></div></div></article>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
