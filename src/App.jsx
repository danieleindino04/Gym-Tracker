import { useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useNavigate, useParams } from 'react-router';
import { Activity, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, CirclePlus, Dumbbell, Ellipsis, Flame, Plus, Search, Settings2, Sparkles, Trash2, TrendingUp, X } from 'lucide-react';

const starter = [
  { id: 'a', name: 'Upper body', focus: 'Petto · schiena · spalle', color: 'lime', days: 'Lunedì', exercises: [
    { id: 'a1', name: 'Panca piana bilanciere', sets: 4, reps: '8–10', kg: 60 }, { id: 'a2', name: 'Rematore manubrio', sets: 3, reps: '10', kg: 22 }, { id: 'a3', name: 'Shoulder press', sets: 3, reps: '10–12', kg: 16 }, { id: 'a4', name: 'Lat machine', sets: 3, reps: '12', kg: 45 },
  ] },
  { id: 'b', name: 'Lower body', focus: 'Gambe · glutei · core', color: 'orange', days: 'Mercoledì', exercises: [
    { id: 'b1', name: 'Squat bilanciere', sets: 4, reps: '8', kg: 70 }, { id: 'b2', name: 'Romanian deadlift', sets: 3, reps: '10', kg: 50 }, { id: 'b3', name: 'Leg press', sets: 3, reps: '12', kg: 100 },
  ] },
  { id: 'c', name: 'Full body', focus: 'Total body · forza', color: 'blue', days: 'Venerdì', exercises: [
    { id: 'c1', name: 'Stacco da terra', sets: 4, reps: '6', kg: 80 }, { id: 'c2', name: 'Panca inclinata', sets: 3, reps: '10', kg: 45 }, { id: 'c3', name: 'Goblet squat', sets: 3, reps: '12', kg: 20 },
  ] },
];

const readPlans = () => { try { return JSON.parse(localStorage.getItem('gym-plans')) || starter; } catch { return starter; } };
const uid = () => Math.random().toString(36).slice(2, 9);

function App() {
  const [plans, setPlans] = useState(readPlans);
  const [active, setActive] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const navigate = useNavigate();
  useEffect(() => { localStorage.setItem('gym-plans', JSON.stringify(plans)); }, [plans]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  function createPlan(name) {
    const p = { id: uid(), name, focus: 'Nuova scheda', days: 'Da programmare', color: 'lime', exercises: [] };
    setPlans((old) => [p, ...old]); setShowNew(false); navigate(`/schede/${p.id}`);
  }
  function updatePlan(id, updater) { setPlans((old) => old.map((p) => p.id === id ? updater(p) : p).filter(Boolean)); }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}><span className="brand-mark"><Dumbbell size={18}/></span><span>FORMA<span className="brand-dot">.</span></span></a><button className="avatar" onClick={() => setToast('Il tuo spazio di allenamento')}>D</button></header>
    <main className="main-content"><Routes>
      <Route path="/" element={<Home plans={plans} onNew={() => setShowNew(true)} onOpen={(p) => navigate(`/schede/${p.id}`)} onToast={setToast}/>} />
      <Route path="/schede" element={<Library plans={plans} search={search} setSearch={setSearch} onNew={() => setShowNew(true)} onOpen={(p) => navigate(`/schede/${p.id}`)} />} />
      <Route path="/schede/:id" element={<PlanEditor plans={plans} updatePlan={updatePlan} onBack={() => navigate('/schede')} onToast={setToast}/>} />
      <Route path="/profilo" element={<Profile plans={plans} onToast={setToast}/>} />
      <Route path="*" element={<Home plans={plans} onNew={() => setShowNew(true)} onOpen={(p) => navigate(`/schede/${p.id}`)} onToast={setToast}/>} />
    </Routes></main>
    <nav className="bottom-nav"><NavLink to="/" end><Activity size={19}/><span>Oggi</span></NavLink><NavLink to="/schede"><Dumbbell size={19}/><span>Schede</span></NavLink><NavLink to="/profilo"><Settings2 size={19}/><span>Profilo</span></NavLink></nav>
    {showNew && <NewPlan onClose={() => setShowNew(false)} onCreate={createPlan}/>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function Home({ plans, onNew, onOpen, onToast }) {
  const [day] = useState(new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()));
  const featured = plans[0];
  return <>
    <div className="greeting"><div><p className="eyebrow">{day}</p><h1>Pronto a<br/>fare progressi<span className="brand-dot">.</span></h1></div><span className="streak"><Flame size={17} fill="currentColor"/> 3</span></div>
    <section className="next-card"><div className="next-top"><span className="pill pill-dark"><span className="live-dot"/> PROSSIMO ALLENAMENTO</span><button className="icon-button light" onClick={() => onToast('Settimana aggiornata')} aria-label="Altre opzioni"><Ellipsis size={20}/></button></div><div className="next-title"><div><p className="muted-light">{featured?.days || 'Inizia da qui'}</p><h2>{featured?.name || 'Crea la tua scheda'}</h2></div><div className="hero-icon"><Dumbbell size={24}/></div></div><div className="next-meta"><span><Dumbbell size={15}/>{featured?.exercises.length || 0} esercizi</span><span>·</span><span><CalendarDays size={15}/>45–60 min</span></div><button className="button button-lime full" onClick={() => featured ? onOpen(featured) : onNew()}>{featured ? 'Apri scheda' : 'Crea scheda'}<ArrowRight size={17}/></button><div className="card-glow"/></section>
    <section className="section-head"><div><p className="eyebrow">IL TUO PERCORSO</p><h2>Allenati con metodo</h2></div><TrendingUp size={19} className="section-symbol"/></section>
    <section className="stats-grid"><div className="stat-card"><span className="stat-icon lime-bg"><Activity size={17}/></span><strong>{plans.length.toString().padStart(2, '0')}</strong><span>Schede attive</span><small>Il tuo piano</small></div><div className="stat-card"><span className="stat-icon peach-bg"><Flame size={17}/></span><strong>03</strong><span>Giorni / settimana</span><small>Costanza prima di tutto</small></div></section>
    <section className="section-head recent-head"><div><p className="eyebrow">ORGANIZZATE PER TE</p><h2>Le tue schede</h2></div><a href="/schede" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/schede'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Vedi tutte <ChevronRight size={15}/></a></section>
    <div className="plan-list">{plans.slice(0, 3).map((p, i) => <PlanRow key={p.id} plan={p} index={i} onClick={() => onOpen(p)}/>)}</div>
    <button className="button button-outline full create-inline" onClick={onNew}><Plus size={17}/> Crea una nuova scheda</button>
  </>;
}

function Library({ plans, search, setSearch, onNew, onOpen }) {
  const filtered = plans.filter((p) => `${p.name} ${p.focus}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="page-heading"><p className="eyebrow">IL TUO PROGRAMMA</p><div className="heading-line"><h1>Le schede<span className="brand-dot">.</span></h1><button className="round-add" onClick={onNew}><Plus size={20}/></button></div></div><label className="searchbox"><Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca una scheda"/><span>⌘ K</span></label><div className="library-count">{filtered.length} {filtered.length === 1 ? 'SCHEDA' : 'SCHEDE'} <span>·</span> PIANO SETTIMANALE</div><div className="library-list">{filtered.map((p, i) => <PlanRow key={p.id} plan={p} index={i} onClick={() => onOpen(p)}/>)}</div>{filtered.length === 0 && <div className="empty"><Dumbbell size={26}/><h3>Nessuna scheda trovata</h3><p>Prova un altro nome o crea una nuova scheda.</p><button className="button button-lime" onClick={onNew}>Crea scheda <Plus size={16}/></button></div>}</>;
}

function PlanRow({ plan, index, onClick }) { return <button className="plan-row" onClick={onClick}><span className={`plan-art art-${plan.color || ['lime','orange','blue'][index % 3]}`}><Dumbbell size={21}/><span className="art-number">0{index + 1}</span></span><span className="plan-copy"><strong>{plan.name}</strong><small>{plan.focus}</small><span className="row-meta">{plan.exercises.length} esercizi <i>·</i> {plan.days}</span></span><ChevronRight className="row-arrow" size={18}/></button>; }

function PlanEditor({ plans, updatePlan, onBack, onToast }) {
  const { id } = useParams(); const nav = useNavigate();
  const plan = plans.find((p) => p.id === id);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(plan?.name || '');
  const [addOpen, setAddOpen] = useState(false);
  useEffect(() => setNameDraft(plan?.name || ''), [plan?.name]);
  if (!plan) return <div className="empty"><h3>Scheda non trovata</h3><button className="button button-lime" onClick={onBack}>Torna alle schede</button></div>;
  const totalSets = plan.exercises.reduce((n, e) => n + Number(e.sets || 0), 0);
  const saveName = () => { if (nameDraft.trim()) updatePlan(id, (p) => ({...p, name: nameDraft.trim()})); setEditingName(false); };
  const addExercise = (name) => { updatePlan(id, (p) => ({...p, exercises: [...p.exercises, { id: uid(), name, sets: 3, reps: '10', kg: 0 }]})); setAddOpen(false); onToast('Esercizio aggiunto'); };
  const changeExercise = (eid, key, val) => updatePlan(id, (p) => ({...p, exercises: p.exercises.map((e) => e.id === eid ? {...e, [key]: val} : e)}));
  const removeExercise = (eid) => updatePlan(id, (p) => ({...p, exercises: p.exercises.filter((e) => e.id !== eid)}));
  const deletePlan = () => { if (!window.confirm(`Eliminare la scheda “${plan.name}”?`)) return; updatePlan(id, () => null); nav('/schede'); };
  return <><div className="editor-top"><button className="back-button" onClick={onBack}><ArrowLeft size={19}/><span>Schede</span></button><button className="icon-button" onClick={deletePlan} aria-label="Elimina scheda"><Trash2 size={18}/></button></div><div className="editor-heading"><p className="eyebrow">{plan.days.toUpperCase()} <span>·</span> {plan.exercises.length} ESERCIZI</p>{editingName ? <form className="name-form" onSubmit={(e) => {e.preventDefault(); saveName();}}><input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}/><button className="icon-button"><Check size={18}/></button></form> : <button className="title-edit" onClick={() => setEditingName(true)}><h1>{plan.name}<span className="brand-dot">.</span></h1><span>Rinomina</span></button>}<p className="editor-focus">{plan.focus}</p></div><div className="editor-summary"><div><span>VOLUME TOTALE</span><strong>{totalSets} <small>serie</small></strong></div><div><span>TEMPO STIMATO</span><strong>{Math.max(30, plan.exercises.length * 12)} <small>min</small></strong></div><div><span>ESERCIZI</span><strong>{plan.exercises.length.toString().padStart(2,'0')}</strong></div></div><div className="section-head exercise-head"><div><p className="eyebrow">IL TUO ALLENAMENTO</p><h2>Esercizi</h2></div><button className="text-action" onClick={() => setAddOpen(true)}><CirclePlus size={17}/> Aggiungi</button></div><div className="exercise-list">{plan.exercises.map((e, i) => <article className="exercise-card" key={e.id}><div className="exercise-card-top"><span className="exercise-index">{String(i + 1).padStart(2,'0')}</span><strong>{e.name}</strong><button className="mini-delete" onClick={() => removeExercise(e.id)} aria-label={`Rimuovi ${e.name}`}><X size={17}/></button></div><div className="exercise-fields"><NumberField label="SERIE" value={e.sets} onChange={(v) => changeExercise(e.id,'sets',v)} suffix="×"/><NumberField label="RIPETIZIONI" value={e.reps} onChange={(v) => changeExercise(e.id,'reps',v)} suffix="rep"/><NumberField label="CARICO" value={e.kg} onChange={(v) => changeExercise(e.id,'kg',v)} suffix="kg"/></div></article>)}</div>{plan.exercises.length === 0 && <div className="empty compact"><Dumbbell size={24}/><h3>Parti dal primo esercizio</h3><p>Aggiungi gli esercizi, poi imposta serie, ripetizioni e carico.</p></div>}<button className="button button-outline full add-exercise-bottom" onClick={() => setAddOpen(true)}><Plus size={17}/> Aggiungi esercizio</button><button className="button button-lime full start-workout" onClick={() => onToast('Allenamento iniziato · buon lavoro!')}>Inizia allenamento <ArrowRight size={17}/></button>{addOpen && <AddExercise onClose={() => setAddOpen(false)} onAdd={addExercise}/>}</>;
}

function NumberField({label, value, onChange, suffix}) { return <label className="number-field"><span>{label}</span><div><input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}/><small>{suffix}</small></div></label>; }

function AddExercise({onClose,onAdd}) { const [value,setValue] = useState(''); const [filter,setFilter] = useState(''); const popular = ['Panca piana bilanciere','Squat bilanciere','Stacco da terra','Lat machine','Rematore manubrio','Shoulder press','Leg press','Curl manubri','Plank']; const results = popular.filter((x) => x.toLowerCase().includes(filter.toLowerCase())); return <div className="modal-backdrop" onMouseDown={(e) => {if(e.target === e.currentTarget) onClose();}}><div className="sheet-modal"><div className="modal-handle"/><div className="modal-head"><div><p className="eyebrow">PERSONALIZZA LA SCHEDA</p><h2>Aggiungi esercizio</h2></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><label className="searchbox modal-search"><Search size={17}/><input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Cerca o scrivi un esercizio"/></label>{filter && !popular.some((x) => x.toLowerCase() === filter.toLowerCase()) && <button className="exercise-choice custom-choice" onClick={() => onAdd(filter)}><span className="choice-plus"><Plus size={17}/></span><span><strong>Aggiungi “{filter}”</strong><small>Esercizio personalizzato</small></span><ChevronRight size={17}/></button>}<p className="choice-label">PIÙ UTILIZZATI</p><div className="choice-list">{results.map((x) => <button className="exercise-choice" key={x} onClick={() => onAdd(x)}><span className="choice-plus"><Plus size={17}/></span><span><strong>{x}</strong><small>Forza e ipertrofia</small></span><ChevronRight size={17}/></button>)}</div><button className="button button-lime full modal-done" onClick={onClose}>Fatto</button></div></div>; }

function NewPlan({onClose,onCreate}) { const [name,setName]=useState(''); return <div className="modal-backdrop" onMouseDown={(e) => {if(e.target === e.currentTarget) onClose();}}><form className="sheet-modal new-modal" onSubmit={(e) => {e.preventDefault(); if(name.trim()) onCreate(name.trim());}}><div className="modal-handle"/><div className="modal-head"><div><p className="eyebrow">NUOVO PROGRAMMA</p><h2>Crea una scheda</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={19}/></button></div><p className="modal-description">Dai un nome al tuo allenamento. Potrai aggiungere gli esercizi subito dopo.</p><label className="input-label">NOME DELLA SCHEDA<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Push day" maxLength={32}/></label><button className="button button-lime full modal-done" disabled={!name.trim()}>Crea scheda <ArrowRight size={17}/></button></form></div>; }

function Profile({plans,onToast}) { return <><div className="page-heading"><p className="eyebrow">IL TUO ACCOUNT</p><h1>Profilo<span className="brand-dot">.</span></h1></div><div className="profile-card"><span className="profile-avatar">D</span><div><strong>Il tuo spazio</strong><p>Un allenamento alla volta.</p></div><ChevronRight size={18}/></div><div className="section-head profile-section"><div><p className="eyebrow">I TUOI DATI</p><h2>Panoramica</h2></div></div><div className="profile-stat"><span>Schede create</span><strong>{plans.length}</strong></div><div className="profile-stat"><span>Esercizi programmati</span><strong>{plans.reduce((n,p)=>n+p.exercises.length,0)}</strong></div><div className="profile-note"><Sparkles size={18}/><p><strong>La costanza batte la perfezione.</strong><br/>Le tue schede sono salvate su questo dispositivo.</p></div><button className="button button-outline full" onClick={() => {localStorage.removeItem('gym-plans'); window.location.reload();}}>Ripristina schede di esempio</button><p className="version">FORMA PLANNER · VERSIONE 1.0</p></>; }

export default App;
