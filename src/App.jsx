import { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useNavigate, useParams } from 'react-router';
import { Activity, ArrowLeft, ArrowRight, CalendarDays, Camera, Check, ChevronRight, CirclePlus, Dumbbell, Ellipsis, Flame, Pause, Play, Plus, Search, Settings2, SkipForward, Sparkles, Timer, Trash2, TrendingUp, X } from 'lucide-react';

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
const readWorkouts = () => { try { return JSON.parse(localStorage.getItem('gym-workouts')) || []; } catch { return []; } };
const uid = () => Math.random().toString(36).slice(2, 9);
const REST_OPTIONS = [30, 45, 60, 90, 120, 180, 300];
async function compressPhoto(file) {
  if (!file?.type.startsWith('image/')) throw new Error('Scegli un file immagine');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
    const scale = Math.min(1, 900 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.68));
    if (!blob || blob.size > 350000) throw new Error('Foto troppo grande');
    return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
  } finally { URL.revokeObjectURL(url); }
}

function App() {
  const [plans, setPlans] = useState(readPlans);
  const [workouts, setWorkouts] = useState(readWorkouts);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const navigate = useNavigate();
  useEffect(() => { localStorage.setItem('gym-plans', JSON.stringify(plans)); }, [plans]);
  useEffect(() => { localStorage.setItem('gym-workouts', JSON.stringify(workouts)); }, [workouts]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  function createPlan(name, restSeconds) {
    const p = { id: uid(), name, focus: 'Nuova scheda', days: 'Da programmare', color: 'lime', restSeconds: Number(restSeconds) || 90, exercises: [] };
    setPlans((old) => [p, ...old]); setShowNew(false); navigate(`/schede/${p.id}`);
  }
  function updatePlan(id, updater) { setPlans((old) => old.map((p) => p.id === id ? updater(p) : p).filter(Boolean)); }
  function startWorkout(plan) {
    const previous = workouts.find((w) => w.planId === plan.id && w.finishedAt);
    const workout = { id: uid(), planId: plan.id, planName: plan.name, restSeconds: Number(plan.restSeconds) || 90, startedAt: new Date().toISOString(), finishedAt: null, exercises: plan.exercises.map((exercise) => { const old = previous?.exercises.find((e) => e.id === exercise.id || e.name === exercise.name); return { id: exercise.id, name: exercise.name, notes: exercise.notes || '', photo: exercise.photo || '', sets: Array.from({ length: Math.max(1, Number(exercise.sets) || 1) }, (_, i) => { const last = old?.sets[i] || old?.sets.at(-1); return { reps: String(last?.reps || exercise.reps || '10'), kg: String(last?.kg ?? exercise.kg ?? 0), done: false }; }) }; }) };
    setWorkouts((old) => [workout, ...old]); navigate(`/allenamento/${workout.id}`);
  }
  function importBackup(data) {
    setPlans((current) => { const merged = new Map(current.map((p) => [p.id, p])); data.plans.forEach((p) => merged.set(p.id, p)); return [...merged.values()]; });
    setWorkouts((current) => { const merged = new Map(current.map((w) => [w.id, w])); (data.workouts || []).forEach((w) => merged.set(w.id, w)); return [...merged.values()]; });
  }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}><span className="brand-mark"><Dumbbell size={18}/></span><span>FORMA<span className="brand-dot">.</span></span></a><button className="avatar" onClick={() => setToast('Il tuo spazio di allenamento')}>D</button></header>
    <main className="main-content"><Routes>
      <Route path="/" element={<Home plans={plans} workouts={workouts} onResume={(w) => navigate(`/allenamento/${w.id}`)} onNew={() => setShowNew(true)} onOpen={(p) => navigate(`/schede/${p.id}`)} onToast={setToast}/>} />
      <Route path="/schede" element={<Library plans={plans} search={search} setSearch={setSearch} onNew={() => setShowNew(true)} onOpen={(p) => navigate(`/schede/${p.id}`)} />} />
      <Route path="/schede/:id" element={<PlanEditor plans={plans} updatePlan={updatePlan} onStart={startWorkout} onBack={() => navigate('/schede')} onToast={setToast}/>} />
      <Route path="/allenamento/:id" element={<WorkoutSession workouts={workouts} setWorkouts={setWorkouts} onBack={() => navigate('/schede')}/>} />
      <Route path="/profilo" element={<Profile plans={plans} workouts={workouts} onToast={setToast} onImport={importBackup}/>} />
      <Route path="*" element={<Home plans={plans} workouts={workouts} onResume={(w) => navigate(`/allenamento/${w.id}`)} onNew={() => setShowNew(true)} onOpen={(p) => navigate(`/schede/${p.id}`)} onToast={setToast}/>} />
    </Routes></main>
    <nav className="bottom-nav"><NavLink to="/" end><Activity size={19}/><span>Oggi</span></NavLink><NavLink to="/schede"><Dumbbell size={19}/><span>Schede</span></NavLink><NavLink to="/profilo"><Settings2 size={19}/><span>Profilo</span></NavLink></nav>
    {showNew && <NewPlan onClose={() => setShowNew(false)} onCreate={createPlan}/>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function Home({ plans, workouts, onResume, onNew, onOpen, onToast }) {
  const [day] = useState(new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()));
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const featured = plans.find((plan) => plan.id === selectedPlanId) || plans[0];
  const activeWorkout = workouts.find((w) => !w.finishedAt);
  return <>
    <div className="greeting"><div><p className="eyebrow">{day}</p><h1>Pronto a<br/>fare progressi<span className="brand-dot">.</span></h1></div><span className="streak"><Flame size={17} fill="currentColor"/> 3</span></div>
    <section className="next-card"><div className="next-top"><span className="pill pill-dark"><span className="live-dot"/> SCEGLI LA SCHEDA</span><button className="icon-button light" onClick={() => onToast('Settimana aggiornata')} aria-label="Altre opzioni"><Ellipsis size={20}/></button></div><div className="home-plan-picker"><label htmlFor="home-plan-select">Allenamento</label><select id="home-plan-select" value={featured?.id || ''} onChange={(event) => setSelectedPlanId(event.target.value)} disabled={!plans.length}>{plans.length ? plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>) : <option value="">Nessuna scheda</option>}</select></div><div className="next-title"><div><p className="muted-light">{featured?.days || 'Inizia da qui'}</p><h2>{featured?.name || 'Crea la tua scheda'}</h2></div><div className="hero-icon"><Dumbbell size={24}/></div></div><div className="next-meta"><span><Dumbbell size={15}/>{featured?.exercises.length || 0} esercizi</span><span>·</span><span><CalendarDays size={15}/>45–60 min</span></div><button className="button button-lime full" onClick={() => featured ? onOpen(featured) : onNew()}>{featured ? 'Apri scheda' : 'Crea scheda'}<ArrowRight size={17}/></button><div className="card-glow"/></section>
    {activeWorkout && <button className="resume-workout" onClick={() => onResume(activeWorkout)}><span className="live-dot"/><span><strong>Allenamento in corso</strong><small>{activeWorkout.planName} · riprendi da dove eri</small></span><ArrowRight size={17}/></button>}
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

function ExerciseNotesPhoto({ exercise, onUpdate, onToast }) {
  const picker = useRef(null);
  async function choosePhoto(file) {
    if (!file) return;
    try { onUpdate({ photo: await compressPhoto(file) }); onToast('Foto salvata'); }
    catch { onToast('Non riesco a leggere la foto: prova con un’altra immagine'); }
    if (picker.current) picker.current.value = '';
  }
  return <div className="exercise-extra">
    <label className="exercise-notes"><span>NOTE</span><textarea rows="2" value={exercise.notes || ''} onChange={(e) => onUpdate({ notes: e.target.value })} placeholder="Tecnica, presa o promemoria…"/></label>
    <div className="exercise-photo-area">{exercise.photo && <div className="exercise-photo"><img src={exercise.photo} alt={`Foto ${exercise.name}`} loading="lazy"/><button type="button" className="photo-remove" aria-label="Rimuovi foto" onClick={() => onUpdate({ photo: '' })}><X size={15}/></button></div>}<button type="button" className="photo-add" onClick={() => picker.current?.click()}><Camera size={16}/><span>{exercise.photo ? 'Cambia foto' : 'Aggiungi foto'}</span></button><input ref={picker} className="hidden-file" type="file" accept="image/*" onChange={(e) => choosePhoto(e.target.files?.[0])}/></div>
  </div>;
}

function PlanEditor({ plans, updatePlan, onStart, onBack, onToast }) {
  const { id } = useParams(); const nav = useNavigate();
  const plan = plans.find((p) => p.id === id);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(plan?.name || '');
  const [addOpen, setAddOpen] = useState(false);
  useEffect(() => setNameDraft(plan?.name || ''), [plan?.name]);
  if (!plan) return <div className="empty"><h3>Scheda non trovata</h3><button className="button button-lime" onClick={onBack}>Torna alle schede</button></div>;
  const totalSets = plan.exercises.reduce((n, e) => n + Number(e.sets || 0), 0);
  const saveName = () => { if (nameDraft.trim()) updatePlan(id, (p) => ({...p, name: nameDraft.trim()})); setEditingName(false); };
  const addExercise = (name) => { updatePlan(id, (p) => ({...p, exercises: [...p.exercises, { id: uid(), name, sets: 3, reps: '10', kg: 0, notes: '', photo: '' }]})); setAddOpen(false); onToast('Esercizio aggiunto'); };
  const changeExercise = (eid, key, val) => updatePlan(id, (p) => ({...p, exercises: p.exercises.map((e) => e.id === eid ? {...e, [key]: val} : e)}));
  const removeExercise = (eid) => updatePlan(id, (p) => ({...p, exercises: p.exercises.filter((e) => e.id !== eid)}));
  const deletePlan = () => { if (!window.confirm(`Eliminare la scheda “${plan.name}”?`)) return; updatePlan(id, () => null); nav('/schede'); };
  return <><div className="editor-top"><button className="back-button" onClick={onBack}><ArrowLeft size={19}/><span>Schede</span></button><button className="icon-button" onClick={deletePlan} aria-label="Elimina scheda"><Trash2 size={18}/></button></div><div className="editor-heading"><p className="eyebrow">{plan.days.toUpperCase()} <span>·</span> {plan.exercises.length} ESERCIZI</p>{editingName ? <form className="name-form" onSubmit={(e) => {e.preventDefault(); saveName();}}><input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}/><button className="icon-button"><Check size={18}/></button></form> : <button className="title-edit" onClick={() => setEditingName(true)}><h1>{plan.name}<span className="brand-dot">.</span></h1><span>Rinomina</span></button>}<p className="editor-focus">{plan.focus}</p></div><div className="editor-summary"><div><span>VOLUME TOTALE</span><strong>{totalSets} <small>serie</small></strong></div><div><span>TEMPO STIMATO</span><strong>{Math.max(30, plan.exercises.length * 12)} <small>min</small></strong></div><div><span>ESERCIZI</span><strong>{plan.exercises.length.toString().padStart(2,'0')}</strong></div></div><label className="rest-setting"><span><Timer size={15}/> Recupero tra le serie</span><select value={Number(plan.restSeconds) || 90} onChange={(e) => updatePlan(id, (p) => ({ ...p, restSeconds: Number(e.target.value) }))}>{REST_OPTIONS.map((seconds) => <option key={seconds} value={seconds}>{seconds >= 60 ? `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ''}` : `${seconds} s`}</option>)}</select></label><div className="section-head exercise-head"><div><p className="eyebrow">IL TUO ALLENAMENTO</p><h2>Esercizi</h2></div><button className="text-action" onClick={() => setAddOpen(true)}><CirclePlus size={17}/> Aggiungi</button></div><div className="exercise-list">{plan.exercises.map((e, i) => <article className="exercise-card" key={e.id}><div className="exercise-card-top"><span className="exercise-index">{String(i + 1).padStart(2,'0')}</span><strong>{e.name}</strong><button className="mini-delete" onClick={() => removeExercise(e.id)} aria-label={`Rimuovi ${e.name}`}><X size={17}/></button></div><div className="exercise-fields"><NumberField label="SERIE" value={e.sets} onChange={(v) => changeExercise(e.id,'sets',v)} suffix="×"/><NumberField label="RIPETIZIONI" value={e.reps} onChange={(v) => changeExercise(e.id,'reps',v)} suffix="rep"/><NumberField label="CARICO" value={e.kg} onChange={(v) => changeExercise(e.id,'kg',v)} suffix="kg"/></div><ExerciseNotesPhoto exercise={e} onUpdate={(patch) => updatePlan(id, (p) => ({ ...p, exercises: p.exercises.map((item) => item.id === e.id ? { ...item, ...patch } : item) }))} onToast={onToast}/></article>)}</div>{plan.exercises.length === 0 && <div className="empty compact"><Dumbbell size={24}/><h3>Parti dal primo esercizio</h3><p>Aggiungi gli esercizi, poi imposta serie, ripetizioni e carico.</p></div>}<button className="button button-outline full add-exercise-bottom" onClick={() => setAddOpen(true)}><Plus size={17}/> Aggiungi esercizio</button><button className="button button-lime full start-workout" onClick={() => onStart(plan)}>Inizia allenamento <ArrowRight size={17}/></button>{addOpen && <AddExercise onClose={() => setAddOpen(false)} onAdd={addExercise}/>}</>;
}

function WorkoutSession({ workouts, setWorkouts, onBack, onToast }) {
  const { id } = useParams(); const nav = useNavigate(); const [now, setNow] = useState(Date.now());
  const [photoPreview, setPhotoPreview] = useState(null);
  const workout = workouts.find((w) => w.id === id);
  const allSets = workout?.exercises.flatMap((e) => e.sets || []) || [];
  const doneSets = allSets.filter((s) => s.done).length;
  const finished = Boolean(workout?.finishedAt);
  const remaining = workout?.restUntil ? Math.max(0, Math.ceil((workout.restUntil - now) / 1000)) : (workout?.restPausedSeconds || 0);
  const restActive = !finished && Boolean(workout?.restAfter && (workout.restUntil || workout.restPausedSeconds));
  function patchWorkout(patch) { setWorkouts((old) => old.map((w) => w.id === id ? { ...w, ...patch } : w)); }
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!workout?.restUntil) return; const delay = workout.restUntil - Date.now(); const timer = window.setTimeout(() => { patchWorkout({ restUntil: null, restPausedSeconds: 0, restAfter: null }); if (navigator.vibrate) navigator.vibrate([100, 80, 100]); }, Math.max(0, delay)); return () => window.clearTimeout(timer); }, [id, workout?.restUntil]);
  useEffect(() => { if (!photoPreview) return; const closeOnEscape = (event) => { if (event.key === 'Escape') setPhotoPreview(null); }; window.addEventListener('keydown', closeOnEscape); return () => window.removeEventListener('keydown', closeOnEscape); }, [photoPreview]);
  if (!workout) return <div className="empty"><h3>Allenamento non trovato</h3><button className="button button-lime" onClick={onBack}>Torna alle schede</button></div>;
  function changeSet(eid, index, patch) { setWorkouts((old) => old.map((w) => w.id === id ? { ...w, exercises: w.exercises.map((e) => e.id === eid ? { ...e, sets: e.sets.map((s, i) => i === index ? { ...s, ...patch } : s) } : e) } : w)); }
  function toggleSet(ei, si) {
    const exercise = workout.exercises[ei]; const nextSets = exercise.sets.map((set, i) => i === si ? { ...set, done: !set.done } : set);
    const next = { ...workout, exercises: workout.exercises.map((item, i) => i === ei ? { ...item, sets: nextSets } : item) };
    const isLastSet = ei === workout.exercises.length - 1 && si === exercise.sets.length - 1;
    if (nextSets[si].done && !exercise.sets[si].done && !isLastSet) { const seconds = Number(workout.restSeconds) || 90; next.restUntil = Date.now() + seconds * 1000; next.restPausedSeconds = 0; next.restDurationSeconds = seconds; next.restAfter = { exerciseId: exercise.id, setIndex: si }; }
    else if (!nextSets[si].done && workout.restAfter?.exerciseId === exercise.id && workout.restAfter?.setIndex === si) { next.restUntil = null; next.restPausedSeconds = 0; next.restAfter = null; }
    setWorkouts((old) => old.map((w) => w.id === id ? next : w));
  }
  function pauseOrResume() {
    if (workout.restUntil) patchWorkout({ restUntil: null, restPausedSeconds: remaining });
    else patchWorkout({ restUntil: Date.now() + remaining * 1000, restPausedSeconds: 0 });
  }
  function addRest() { if (workout.restUntil) patchWorkout({ restUntil: workout.restUntil + 15_000 }); else patchWorkout({ restPausedSeconds: remaining + 15 }); }
  function skipRest() { patchWorkout({ restUntil: null, restPausedSeconds: 0, restAfter: null }); }
  function finish() {
    if (doneSets < allSets.length && !window.confirm(`Hai completato ${doneSets} serie su ${allSets.length}. Terminare comunque l’allenamento?`)) return;
    setWorkouts((old) => old.map((w) => w.id === id ? { ...w, finishedAt: new Date().toISOString(), restUntil: null, restPausedSeconds: 0, restAfter: null } : w));
  }
  const dateText = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(workout.startedAt));
  const mmss = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  const restTotal = Number(workout.restDurationSeconds) || Number(workout.restSeconds) || 90;
  return <>
    <div className="editor-top"><button className="back-button" onClick={() => finished ? nav('/profilo') : onBack()}><ArrowLeft size={19}/><span>{finished ? 'Profilo' : 'Scheda'}</span></button>{finished && <span className="pill session-done-pill"><Check size={12}/> COMPLETATO</span>}</div>
    <div className="editor-heading"><p className="eyebrow">{finished ? 'ALLENAMENTO SALVATO' : 'SESSIONE IN CORSO'} <span>·</span> {dateText}</p><h1>{workout.planName}<span className="brand-dot">.</span></h1><p className="editor-focus">{finished ? 'Sessione archiviata nello storico.' : 'Registra ripetizioni e carico per ogni serie.'}</p></div>
    <div className="session-progress"><div><span>PROGRESSO</span><strong>{doneSets}<small> / {allSets.length} serie</small></strong></div><div className="progress-track"><span style={{ width: `${allSets.length ? (doneSets / allSets.length) * 100 : 0}%` }}/></div></div>
    <div className="exercise-list session-exercises">{workout.exercises.map((exercise, ei) => <article className="exercise-card session-card" key={`${exercise.id}-${ei}`}>
      <div className="exercise-card-top"><span className="exercise-index">{String(ei + 1).padStart(2,'0')}</span><strong>{exercise.name}</strong><span className="session-set-count">{exercise.sets.length} serie</span></div>
      {exercise.photo && <button type="button" className="session-photo-button" onClick={() => setPhotoPreview({ src: exercise.photo, name: exercise.name })} aria-label={`Apri foto di ${exercise.name}`}><img className="session-exercise-photo" src={exercise.photo} alt={`Foto ${exercise.name}`} loading="lazy"/><span>Tocca per ingrandire</span></button>}{exercise.notes && <p className="session-exercise-note">{exercise.notes}</p>}
      <div className="session-columns"><span>SERIE</span><span>RIPETIZIONI</span><span>KG</span><span>FATTA</span></div>
      {exercise.sets.map((set, si) => <div className="set-row-wrap" key={si}>
        <div className={`session-set ${set.done ? 'set-complete' : ''}`}><span className="set-number">{String(si + 1).padStart(2,'0')}</span><input aria-label={`Ripetizioni serie ${si + 1} ${exercise.name}`} inputMode="decimal" value={set.reps} disabled={finished} onChange={(e) => changeSet(exercise.id, si, { reps: e.target.value })}/><input aria-label={`Chilogrammi serie ${si + 1} ${exercise.name}`} inputMode="decimal" value={set.kg} disabled={finished} onChange={(e) => changeSet(exercise.id, si, { kg: e.target.value })}/><button className={`set-check ${set.done ? 'checked' : ''}`} disabled={finished} onClick={() => toggleSet(ei, si)} aria-label={set.done ? 'Segna serie da completare' : 'Segna serie completata'}>{set.done && <Check size={15}/>}</button></div>
        {restActive && workout.restAfter?.exerciseId === exercise.id && workout.restAfter?.setIndex === si && <div className="rest-inline"><Timer size={15}/><span className="rest-inline-label">Recupero</span><strong className="rest-inline-time">{mmss}</strong><div className="rest-inline-track"><span style={{ width: `${Math.max(0, Math.min(100, remaining / restTotal * 100))}%` }}/></div><button onClick={addRest} aria-label="Aggiungi 15 secondi">+15</button><button onClick={pauseOrResume} aria-label={workout.restUntil ? 'Pausa recupero' : 'Riprendi recupero'}>{workout.restUntil ? <Pause size={14}/> : <Play size={14}/>}</button><button onClick={skipRest} aria-label="Salta recupero"><SkipForward size={14}/></button></div>}
      </div>)}
    </article>)}</div>
    {!finished ? <button className="button button-lime full finish-workout" onClick={finish}>Termina allenamento <Check size={17}/></button> : <button className="button button-outline full finish-workout" onClick={() => nav('/profilo')}>Vai allo storico</button>}
    {photoPreview && <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`Foto ${photoPreview.name}`} onClick={() => setPhotoPreview(null)}><button type="button" className="photo-lightbox-close" aria-label="Chiudi foto" onClick={() => setPhotoPreview(null)}><X size={22}/></button><img src={photoPreview.src} alt={`Foto ingrandita ${photoPreview.name}`} onClick={(event) => event.stopPropagation()}/><span>{photoPreview.name}</span></div>}
  </>;
}

function NumberField({label, value, onChange, suffix}) { return <label className="number-field"><span>{label}</span><div><input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}/><small>{suffix}</small></div></label>; }

function AddExercise({onClose,onAdd}) { const [value,setValue] = useState(''); const [filter,setFilter] = useState(''); const popular = ['Panca piana bilanciere','Squat bilanciere','Stacco da terra','Lat machine','Rematore manubrio','Shoulder press','Leg press','Curl manubri','Plank']; const results = popular.filter((x) => x.toLowerCase().includes(filter.toLowerCase())); return <div className="modal-backdrop" onMouseDown={(e) => {if(e.target === e.currentTarget) onClose();}}><div className="sheet-modal"><div className="modal-handle"/><div className="modal-head"><div><p className="eyebrow">PERSONALIZZA LA SCHEDA</p><h2>Aggiungi esercizio</h2></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><label className="searchbox modal-search"><Search size={17}/><input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Cerca o scrivi un esercizio"/></label>{filter && !popular.some((x) => x.toLowerCase() === filter.toLowerCase()) && <button className="exercise-choice custom-choice" onClick={() => onAdd(filter)}><span className="choice-plus"><Plus size={17}/></span><span><strong>Aggiungi “{filter}”</strong><small>Esercizio personalizzato</small></span><ChevronRight size={17}/></button>}<p className="choice-label">PIÙ UTILIZZATI</p><div className="choice-list">{results.map((x) => <button className="exercise-choice" key={x} onClick={() => onAdd(x)}><span className="choice-plus"><Plus size={17}/></span><span><strong>{x}</strong><small>Forza e ipertrofia</small></span><ChevronRight size={17}/></button>)}</div><button className="button button-lime full modal-done" onClick={onClose}>Fatto</button></div></div>; }

function NewPlan({onClose,onCreate}) { const [name,setName]=useState(''); const [restSeconds,setRestSeconds]=useState(90); return <div className="modal-backdrop" onMouseDown={(e) => {if(e.target === e.currentTarget) onClose();}}><form className="sheet-modal new-modal" onSubmit={(e) => {e.preventDefault(); if(name.trim()) onCreate(name.trim(),restSeconds);}}><div className="modal-handle"/><div className="modal-head"><div><p className="eyebrow">NUOVO PROGRAMMA</p><h2>Crea una scheda</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={19}/></button></div><p className="modal-description">Dai un nome al tuo allenamento e imposta il recupero tra le serie.</p><label className="input-label">NOME DELLA SCHEDA<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Push day" maxLength={32}/></label><label className="input-label rest-select-label">RECUPERO TRA LE SERIE<select value={restSeconds} onChange={(e) => setRestSeconds(Number(e.target.value))}>{REST_OPTIONS.map((seconds) => <option key={seconds} value={seconds}>{seconds >= 60 ? `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ''}` : `${seconds} s`}</option>)}</select></label><button className="button button-lime full modal-done" disabled={!name.trim()}>Crea scheda <ArrowRight size={17}/></button></form></div>; }

function Profile({plans,workouts,onToast,onImport}) {
  const nav = useNavigate();
  const picker = useRef(null);
  function exportPlans() {
    const blob = new Blob([JSON.stringify({ format: 'forma-backup', version: 1, exportedAt: new Date().toISOString(), plans, workouts }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `forma-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); onToast('Backup scaricato');
  }
  async function importPlans(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== 'forma-backup' || !Array.isArray(data.plans) || !data.plans.every((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.exercises))) throw new Error('Formato non valido');
      onImport({ plans: data.plans, workouts: Array.isArray(data.workouts) ? data.workouts : [] }); onToast(`${data.plans.length} schede importate · ${data.workouts?.length || 0} sessioni`);
    } catch { onToast('File non valido: scegli un backup FORMA'); }
    if (picker.current) picker.current.value = '';
  }
  const history = workouts.filter((w) => w.finishedAt).slice(0, 6);
  return <><div className="page-heading"><p className="eyebrow">IL TUO ACCOUNT</p><h1>Profilo<span className="brand-dot">.</span></h1></div><div className="profile-card"><span className="profile-avatar">D</span><div><strong>Il tuo spazio</strong><p>Un allenamento alla volta.</p></div><ChevronRight size={18}/></div><div className="section-head profile-section"><div><p className="eyebrow">I TUOI DATI</p><h2>Panoramica</h2></div></div><div className="profile-stat"><span>Schede create</span><strong>{plans.length}</strong></div><div className="profile-stat"><span>Esercizi programmati</span><strong>{plans.reduce((n,p)=>n+p.exercises.length,0)}</strong></div><div className="section-head history-heading"><div><p className="eyebrow">I TUOI ALLENAMENTI</p><h2>Storico sessioni</h2></div><span className="history-total">{history.length}</span></div>{history.length ? <div className="history-list">{history.map((w) => { const sets = w.exercises.flatMap((e) => e.sets || []); const date = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(w.finishedAt)); return <button key={w.id} className="history-row" onClick={() => nav(`/allenamento/${w.id}`)}><span className="history-icon"><Check size={16}/></span><span className="history-copy"><strong>{w.planName}</strong><small>{date} · {sets.filter((s) => s.done).length}/{sets.length} serie completate</small></span><ChevronRight size={17}/></button>; })}</div> : <p className="history-empty">Le sessioni completate compariranno qui.</p>}<div className="profile-note"><Sparkles size={18}/><p><strong>I pesi e lo storico sono salvati su questo dispositivo.</strong><br/>Il backup include schede e sessioni per trasferirli insieme.</p></div><div className="backup-actions"><button className="button button-lime full" onClick={exportPlans}>Esporta backup <ArrowRight size={16}/></button><button className="button button-outline full" onClick={() => picker.current?.click()}>Importa backup</button><input ref={picker} className="hidden-file" type="file" accept="application/json,.json" onChange={(e) => importPlans(e.target.files?.[0])}/></div><button className="button button-outline full reset-button" onClick={() => {if(window.confirm('Ripristinare le schede di esempio? Le schede attuali verranno sostituite.')) {localStorage.removeItem('gym-plans'); window.location.reload();}}}>Ripristina schede di esempio</button><p className="version">FORMA PLANNER · VERSIONE 1.0</p></>;
}

export default App;
