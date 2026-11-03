import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, CircleHelp, FileText, GraduationCap, LayoutDashboard, Menu, MessageSquare, Sparkles, Target, TrendingUp, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AcademicWorkspace } from './AcademicWorkspace';
import { StudyMaterials } from './StudyMaterials';
import { Assistant } from './Assistant';
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
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [attempt, setAttempt] = useState(0);
  const [help, setHelp] = useState(false);
  function navigate(name: string) { location.hash = slug(name); setPage(name); setMenu(false); }
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
  return <div className="app">
    {menu && <button className="scrim" aria-label="Close navigation" onClick={() => setMenu(false)}/>}
    <aside className={menu ? 'sidebar open' : 'sidebar'}>
      <a className="brand" href="#overview" onClick={() => navigate('Overview')}><span className="brand-icon"><GraduationCap size={25}/></span>StudyMate<span className="ai">AI</span></a>
      <div className="workspace"><span className="avatar small">S</span><div>Student workspace<small>Local prototype</small></div><ChevronRight size={15}/></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation">{navigation.map(({ name, icon: Icon }) => <button key={name} className={page === name ? 'nav-item active' : 'nav-item'} aria-current={page === name ? 'page' : undefined} onClick={() => navigate(name)}><Icon size={19}/>{name}{name === 'Mistake to mastery' && <span className="new-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="local-card"><span className="local-icon"><Sparkles size={18}/></span><strong>Your learning, connected.</strong><p>One place for your notes, practice, and progress.</p><span>Built for a little progress, every day.</span></div><button className="help-button" onClick={() => setHelp(true)}><CircleHelp size={18}/>Getting started<ArrowRight size={15}/></button><div className="profile"><span className="avatar">S</span><div>Student<small>Personal workspace</small></div><span className="version">v0.3</span></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenu(true)}><Menu size={21}/></button><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div><div className="top-right"><span className="prototype">PHASE 03</span><span className="avatar small">S</span></div></header>
      <main id="main-content"><div className="page-heading"><div><p className="eyebrow">YOUR PERSONAL LEARNING SPACE</p><h1>{page === 'Overview' ? 'A little progress, every day.' : page}</h1><p className="subtitle">{page === 'Overview' ? 'Pick up where you left off. Your next breakthrough is closer than you think.' : 'Your study workspace is taking shape, one phase at a time.'}</p></div><button className="secondary" onClick={() => navigate('Revision planner')}><CalendarDays size={17}/>Study planner<ArrowRight size={15}/></button></div>
      <div className="demo-banner"><span><Sparkles size={16}/><strong>Your workspace, saved locally</strong><span>Phase 3 · your syllabus and study materials</span></span><button onClick={() => setHelp(true)}>Development roadmap<ArrowRight size={14}/></button></div>
      {page === 'Overview' ? <AcademicWorkspace key="overview" overview onOpen={() => navigate('My subjects')}/> : page === 'My subjects' ? <AcademicWorkspace key="subjects"/> : page === 'Study materials' ? <StudyMaterials/> : page === 'AI assistant' ? <Assistant/> : <><section className="phase-panel panel"><span className="phase-icon"><active.icon size={30}/></span><p className="eyebrow">PLANNED FOR PHASE {active.phase}</p><h2>{page === 'AI assistant' ? 'Answers grounded in your own notes.' : page === 'Mistake to mastery' ? 'Make every mistake a learning opportunity.' : `Your ${page.toLowerCase()}, all in one place.`}</h2><p>{page === 'AI assistant' ? 'Document retrieval, local embeddings, and Ollama setup will arrive in Phase 4. No model is connected yet.' : 'This navigation destination is ready. Creating and storing records will be implemented in the corresponding development phase.'}</p><button className="secondary" onClick={() => setHelp(true)}>View development roadmap<ArrowRight size={16}/></button></section></>}
      <footer><span>StudyMate AI <span className="footer-dot">·</span> Made for meaningful progress</span><div className="connection" role="status"><i className={health}/>{health === 'online' ? 'Backend & database connected' : health === 'checking' ? 'Checking backend…' : 'Backend unavailable'}{health === 'offline' && <button onClick={() => setAttempt(a => a + 1)}>Retry</button>}</div></footer>
      </main></div>
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="modal panel" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if(e.key === 'Escape') setHelp(false); }}><button autoFocus className="icon-button modal-close" aria-label="Close getting started" onClick={() => setHelp(false)}><X size={20}/></button><span className="phase-icon"><GraduationCap size={30}/></span><h2 id="help-title">Welcome to StudyMate AI</h2><p>Phase 3 is ready. Organize your syllabus in My subjects and upload PDF, PPTX, or TXT notes in Study materials. Dashboard counts use your saved SQLite records; completion is self-reported, not a mastery score.</p><ol>{navigation.filter(n => n.phase > 3).map(n => <li key={n.name}><span>Phase {n.phase}</span>{n.name}</li>)}</ol><p>The backend status is live. Start FastAPI to connect SQLite. See README.md for setup and verification commands.</p><button className="primary" onClick={() => setHelp(false)}>Let’s explore<ArrowRight size={16}/></button></section></div>}
    </div>;
}
function slug(value: string) { return value.toLowerCase().replaceAll(' ', '-'); }
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
