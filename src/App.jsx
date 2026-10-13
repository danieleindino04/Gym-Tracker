import { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useNavigate, useParams } from 'react-router';
import { Activity, ArrowLeft, ArrowRight, Camera, Check, ChevronRight, CirclePlus, Dumbbell, Moon, Pause, Play, Plus, Search, Settings2, SkipForward, Sun, Timer, Trash2, X } from 'lucide-react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

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

function normalizePlan(plan, index = 0) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return null;
  return {
    ...plan,
    id: String(plan.id ?? `plan-${index}`),
    name: String(plan.name || 'Scheda senza nome'),
    focus: String(plan.focus || ''),
    days: String(plan.days || ''),
    exercises: (Array.isArray(plan.exercises) ? plan.exercises : []).filter((exercise) => exercise && typeof exercise === 'object').map((exercise, exerciseIndex) => ({
      ...exercise,
      id: String(exercise.id ?? `exercise-${exerciseIndex}`),
      name: String(exercise.name || 'Esercizio'),
      sets: Math.max(1, Number(exercise.sets) || 1),
      reps: String(exercise.reps ?? '10'),
      kg: exercise.kg ?? 0,
      notes: String(exercise.notes || ''),
      photo: typeof exercise.photo === 'string' ? exercise.photo : '',
    })),
  };
}
function normalizeWorkout(workout, index = 0) {
  if (!workout || typeof workout !== 'object' || Array.isArray(workout)) return null;
  return {
    ...workout,
    id: String(workout.id ?? `workout-${index}`),
    planId: String(workout.planId ?? ''),
    planName: String(workout.planName || 'Allenamento'),
    exercises: (Array.isArray(workout.exercises) ? workout.exercises : []).filter((exercise) => exercise && typeof exercise === 'object').map((exercise, exerciseIndex) => ({
      ...exercise,
      id: String(exercise.id ?? `exercise-${exerciseIndex}`),
      name: String(exercise.name || 'Esercizio'),
      notes: String(exercise.notes || ''),
      sets: (Array.isArray(exercise.sets) ? exercise.sets : []).filter((set) => set && typeof set === 'object').map((set) => ({
        ...set,
        reps: String(set.reps ?? '10'),
        kg: String(set.kg ?? 0),
        done: Boolean(set.done),
      })),
    })),
  };
}
const readPlans = () => { try { const value = JSON.parse(localStorage.getItem('gym-plans')); return Array.isArray(value) ? value.map(normalizePlan).filter(Boolean) : starter; } catch { return starter; } };
const readWorkouts = () => { try { const value = JSON.parse(localStorage.getItem('gym-workouts')); return Array.isArray(value) ? value.map(normalizeWorkout).filter(Boolean) : []; } catch { return []; } };
const uid = () => Math.random().toString(36).slice(2, 9);
const REST_OPTIONS = [30, 45, 60, 90, 120, 180, 300];
const stableStringify = (value) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
function pickInProgressWorkout(workouts, plans, planId) {
  return workouts.map((workout, index) => ({ workout, index, plan: plans.find((item) => item.id === workout.planId) }))
    .filter(({ workout }) => !workout.finishedAt && (!planId || workout.planId === planId))
    .map((entry) => ({ ...entry, score: entry.workout.exercises.reduce((total, exercise) => {
      const planned = entry.plan?.exercises.find((item) => item.id === exercise.id || item.name === exercise.name);
      return total + (exercise.sets || []).reduce((sum, set) => sum + (set.done ? 100 : 0) + (String(set.kg ?? '') !== String(planned?.kg ?? 0) ? 1 : 0) + (String(set.reps ?? '') !== String(planned?.reps || '10') ? 1 : 0), 0);
    }, 0) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.workout;
}
async function compressImageBlob(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
    let scale = Math.min(1, 480 / Math.max(image.width, image.height)); let quality = 0.55;
    for (let attempt = 0; attempt < 10; attempt++) {
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const compressed = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (compressed && compressed.size <= 32000) return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(compressed); });
      scale *= 0.88; quality = Math.max(0.32, quality - 0.04);
    }
    throw new Error('Non riesco a ridurre la foto');
  } finally { URL.revokeObjectURL(url); }
}
async function compressPhoto(file) { if (!file?.type.startsWith('image/')) throw new Error('Scegli un file immagine'); return compressImageBlob(file); }
async function compactStoredPhoto(photo) { try { const blob = await fetch(photo).then((response) => response.blob()); if (blob.size <= 38000) return photo; return await compressImageBlob(blob); } catch { return photo; } }

function App() {
  const [plans, setPlans] = useState(readPlans);
  const [workouts, setWorkouts] = useState(readWorkouts);
  const workoutsRef = useRef(workouts);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [darkMode, setDarkMode] = useState(() => { try { return localStorage.getItem('gym-theme') === 'dark'; } catch { return false; } });
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loadedUid, setLoadedUid] = useState('');
  const [authError, setAuthError] = useState('');
  const cloudReadyRef = useRef('');
  const navigate = useNavigate();
  useEffect(() => onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setLoadedUid(''); setAuthLoading(false); setAuthError(''); }), []);
  function saveWorkouts(update) {
    const next = typeof update === 'function' ? update(workoutsRef.current) : update;
    workoutsRef.current = next;
    try { localStorage.setItem('gym-workouts', JSON.stringify(next)); }
    catch { setToast('Spazio esaurito sul dispositivo: libera spazio e riprova'); }
    setWorkouts(next);
  }
  useEffect(() => { const theme = darkMode ? 'dark' : 'light'; document.documentElement.dataset.theme = theme; try { localStorage.setItem('gym-theme', theme); } catch {} }, [darkMode]);
  useEffect(() => { try { localStorage.setItem('gym-plans', JSON.stringify(plans)); } catch { setToast('Spazio foto esaurito sul dispositivo: rimuovi qualche foto e riprova'); } }, [plans]);
  useEffect(() => { workoutsRef.current = workouts; try { localStorage.setItem('gym-workouts', JSON.stringify(workouts)); } catch { setToast('Spazio esaurito sul dispositivo: libera spazio e riprova'); } }, [workouts]);
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    cloudReadyRef.current = '';
    const root = collection(db, 'users', user.uid, 'plans');
    const workoutsRoot = collection(db, 'users', user.uid, 'workouts');
    const photosRoot = collection(db, 'users', user.uid, 'photos');
    (async () => {
      try {
        const [planDocs, workoutDocs, photoDocs] = await Promise.all([getDocs(root), getDocs(workoutsRoot), getDocs(photosRoot)]);
        if (!active) return;
        const photos = Object.fromEntries(photoDocs.docs.map((item) => [item.id, item.data().photo]));
        const remotePlans = planDocs.docs.map((item) => normalizePlan({ ...item.data(), id: item.id })).filter(Boolean).map((plan) => ({ ...plan, exercises: plan.exercises.map((exercise) => ({ ...exercise, photo: photos[`${plan.id}_${exercise.id}`] || exercise.photo || '' })) })).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(({ position, ...plan }) => plan);
        const remoteWorkouts = workoutDocs.docs.map((item) => normalizeWorkout({ ...item.data(), id: item.id })).filter(Boolean).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(({ position, ...workout }) => workout);
        if (localStorage.getItem('forma-firebase-local-migrated') !== 'yes') {
          // First sign-in: merge local data with anything already present remotely.
          const localPlans = readPlans();
          const localWorkouts = readWorkouts();
          const mergedPlans = new Map(localPlans.map((plan) => [String(plan.id), plan]));
          remotePlans.forEach((plan) => mergedPlans.set(String(plan.id), plan));
          const mergedWorkouts = new Map(localWorkouts.map((workout) => [String(workout.id), workout]));
          remoteWorkouts.forEach((workout) => mergedWorkouts.set(String(workout.id), workout));
          setPlans([...mergedPlans.values()]);
          saveWorkouts([...mergedWorkouts.values()]);
          localStorage.setItem('forma-firebase-local-migrated', 'yes');
        } else {
          setPlans(planDocs.empty && workoutDocs.empty ? starter : remotePlans);
          saveWorkouts(planDocs.empty && workoutDocs.empty ? [] : remoteWorkouts);
        }
        cloudReadyRef.current = user.uid;
        setLoadedUid(user.uid);
      } catch (error) {
        if (active) setAuthError(firebaseMessage(error));
      }
    })();
    let latestPlanSnapshot = null;
    function refreshPlans(snapshot) {
      latestPlanSnapshot = snapshot;
      if (!active || cloudReadyRef.current !== user.uid) return;
      getDocs(photosRoot).then((photoSnapshot) => {
        if (!active) return;
        const photos = Object.fromEntries(photoSnapshot.docs.map((item) => [item.id, item.data().photo]));
        const incoming = snapshot.docs.map((item) => normalizePlan({ ...item.data(), id: item.id })).filter(Boolean).map((plan) => ({ ...plan, exercises: plan.exercises.map((exercise) => ({ ...exercise, photo: photos[`${plan.id}_${exercise.id}`] || exercise.photo || '' })) })).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(({ position, ...plan }) => plan);
        setPlans((current) => stableStringify(current) === stableStringify(incoming) ? current : incoming);
      }).catch((error) => setAuthError(firebaseMessage(error)));
    }
    const unsubPlans = onSnapshot(root, refreshPlans, (error) => setAuthError(firebaseMessage(error)));
    const unsubPhotos = onSnapshot(photosRoot, () => { if (latestPlanSnapshot) refreshPlans(latestPlanSnapshot); }, (error) => setAuthError(firebaseMessage(error)));
    const unsubWorkouts = onSnapshot(workoutsRoot, (snapshot) => {
      if (!active || cloudReadyRef.current !== user.uid) return;
      const incoming = snapshot.docs.map((item) => normalizeWorkout({ ...item.data(), id: item.id })).filter(Boolean).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(({ position, ...workout }) => workout);
      setWorkouts((current) => stableStringify(current) === stableStringify(incoming) ? current : incoming);
      workoutsRef.current = incoming;
    }, (error) => setAuthError(firebaseMessage(error)));
    return () => { active = false; cloudReadyRef.current = ''; unsubPlans(); unsubPhotos(); unsubWorkouts(); };
  }, [user?.uid]);
  useEffect(() => {
    if (!user || loadedUid !== user.uid) return undefined;
    const timer = setTimeout(async () => {
      try {
        const planRoot = collection(db, 'users', user.uid, 'plans');
        const workoutRoot = collection(db, 'users', user.uid, 'workouts');
        const photoRoot = collection(db, 'users', user.uid, 'photos');
        const [oldPlans, oldWorkouts, oldPhotos] = await Promise.all([getDocs(planRoot), getDocs(workoutRoot), getDocs(photoRoot)]);
        const planIds = new Set(plans.map((plan) => String(plan.id)));
        const workoutIds = new Set(workouts.map((workout) => String(workout.id)));
        const photoValues = new Map();
        plans.forEach((plan) => (plan.exercises || []).forEach((exercise) => { if (exercise.photo) photoValues.set(`${plan.id}_${exercise.id}`, exercise.photo); }));
        const oldPlanMap = new Map(oldPlans.docs.map((item) => [item.id, item.data()]));
        const oldWorkoutMap = new Map(oldWorkouts.docs.map((item) => [item.id, item.data()]));
        const oldPhotoMap = new Map(oldPhotos.docs.map((item) => [item.id, item.data()]));
        for (const item of oldPlans.docs) if (!planIds.has(item.id)) await deleteDoc(item.ref);
        for (const item of oldWorkouts.docs) if (!workoutIds.has(item.id)) await deleteDoc(item.ref);
        await Promise.all([...photoValues].map(([id, photo]) => {
          const data = { photo };
          return stableStringify(oldPhotoMap.get(id)) === stableStringify(data) ? Promise.resolve() : setDoc(doc(db, 'users', user.uid, 'photos', id), data);
        }));
        await Promise.all([
          ...plans.map((plan, position) => { const { id, ...data } = plan; const remote = { ...data, position, exercises: (data.exercises || []).map(({ photo, ...exercise }) => exercise) }; return stableStringify(oldPlanMap.get(String(id))) === stableStringify(remote) ? Promise.resolve() : setDoc(doc(db, 'users', user.uid, 'plans', String(id)), remote); }),
          ...workouts.map((workout, position) => { const { id, ...data } = workout; const remote = { ...data, position }; return stableStringify(oldWorkoutMap.get(String(id))) === stableStringify(remote) ? Promise.resolve() : setDoc(doc(db, 'users', user.uid, 'workouts', String(id)), remote); }),
        ]);
        for (const item of oldPhotos.docs) if (!photoValues.has(item.id)) await deleteDoc(item.ref);
      } catch (error) { setToast(`Sincronizzazione: ${firebaseMessage(error)}`); }
    }, 700);
    return () => clearTimeout(timer);
  }, [plans, workouts, user?.uid, loadedUid]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const optimized = await Promise.all(plans.map(async (plan) => ({ ...plan, exercises: await Promise.all(plan.exercises.map(async (exercise) => ({ ...exercise, photo: exercise.photo ? await compactStoredPhoto(exercise.photo) : exercise.photo }))) })));
      const cleanedWorkouts = workouts.map((workout) => ({ ...workout, exercises: workout.exercises.map(({ photo, ...exercise }) => exercise) }));
      if (cancelled) return;
      setPlans((current) => current.map((plan) => { const oldPlan = plans.find((item) => item.id === plan.id); const newPlan = optimized.find((item) => item.id === plan.id); if (!oldPlan || !newPlan) return plan; return { ...plan, exercises: plan.exercises.map((exercise) => { const oldExercise = oldPlan.exercises.find((item) => item.id === exercise.id); const newExercise = newPlan.exercises.find((item) => item.id === exercise.id); return oldExercise && newExercise && exercise.photo === oldExercise.photo ? { ...exercise, photo: newExercise.photo } : exercise; }) }; }));
      saveWorkouts((current) => current.map((workout) => { const cleaned = cleanedWorkouts.find((item) => item.id === workout.id); return cleaned ? { ...workout, exercises: workout.exercises.map(({ photo, ...exercise }) => exercise) } : workout; }));
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  function createPlan(name, restSeconds) {
    const p = { id: uid(), name, focus: 'Nuova scheda', days: 'Da programmare', color: 'lime', restSeconds: Number(restSeconds) || 90, exercises: [] };
    setPlans((old) => [p, ...old]); setShowNew(false); navigate(`/schede/${p.id}`);
  }
  function updatePlan(id, updater) { setPlans((old) => old.map((p) => p.id === id ? updater(p) : p).filter(Boolean)); }
  function startWorkout(plan) {
    const inProgress = pickInProgressWorkout(workoutsRef.current, plans, plan.id);
    if (inProgress) { setToast('Riprendo l’allenamento in corso'); navigate(`/allenamento/${inProgress.id}`); return; }
    const previous = workouts.find((w) => w.planId === plan.id && w.finishedAt);
    const workout = { id: uid(), planId: plan.id, planName: plan.name, restSeconds: Number(plan.restSeconds) || 90, startedAt: new Date().toISOString(), finishedAt: null, exercises: plan.exercises.map((exercise) => { const old = previous?.exercises.find((e) => e.id === exercise.id || e.name === exercise.name); return { id: exercise.id, name: exercise.name, notes: exercise.notes || '', sets: Array.from({ length: Math.max(1, Number(exercise.sets) || 1) }, (_, i) => { const last = old?.sets[i] || old?.sets.at(-1); return { reps: String(last?.reps || exercise.reps || '10'), kg: String(last?.kg ?? exercise.kg ?? 0), done: false }; }) }; }) };
    saveWorkouts((old) => [workout, ...old]); navigate(`/allenamento/${workout.id}`);
  }
  function importBackup(data) {
    setPlans((current) => { const merged = new Map(current.map((p) => [p.id, p])); data.plans.forEach((p) => merged.set(p.id, p)); return [...merged.values()]; });
    saveWorkouts((current) => { const merged = new Map(current.map((w) => [w.id, w])); (data.workouts || []).forEach((w) => merged.set(w.id, w)); return [...merged.values()]; });
  }
  if (authLoading) return <div className="auth-screen"><div className="auth-card"><span className="brand-mark"><Dumbbell size={18}/></span><h1>FORMA<span className="brand-dot">.</span></h1><p>Controllo del tuo account…</p></div></div>;
  if (!user) return <AuthGate error={authError} setError={setAuthError}/>;
  if (loadedUid !== user.uid) return <div className="auth-screen"><div className="auth-card"><span className="brand-mark"><Dumbbell size={18}/></span><h1>FORMA<span className="brand-dot">.</span></h1><p>Sincronizzazione delle tue schede…</p>{authError && <p className="auth-error">{authError}</p>}</div></div>;
  return <div className={`app-shell ${darkMode ? 'dark-mode' : ''}`}>
    <header className="topbar"><a className="brand" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}><span className="brand-mark"><Dumbbell size={18}/></span><span>FORMA<span className="brand-dot">.</span></span></a><button className="avatar" onClick={() => navigate('/profilo')} aria-label="Apri profilo">{(user.displayName || user.email || 'U')[0].toUpperCase()}</button></header>
    <main className="main-content"><Routes>
      <Route path="/" element={<Home userId={user.uid} plans={plans} onStart={startWorkout} onNew={() => setShowNew(true)} onOpen={(p) => navigate(`/schede/${p.id}`)} onToast={setToast}/>} />
      <Route path="/schede" element={<Library plans={plans} search={search} setSearch={setSearch} onNew={() => setShowNew(true)} onOpen={(p) => navigate(`/schede/${p.id}`)} />} />
      <Route path="/schede/:id" element={<PlanEditor plans={plans} updatePlan={updatePlan} onStart={startWorkout} onBack={() => navigate('/schede')} onToast={setToast}/>} />
      <Route path="/allenamento/:id" element={<WorkoutSession plans={plans} workouts={workouts} setWorkouts={saveWorkouts} onBack={() => navigate('/schede')}/>} />
      <Route path="/profilo" element={<Profile plans={plans} workouts={workouts} onToast={setToast} onImport={importBackup} darkMode={darkMode} onToggleDarkMode={setDarkMode} user={user} onLogout={() => signOut(auth)}/>} />
      <Route path="*" element={<Home userId={user.uid} plans={plans} onStart={startWorkout} onNew={() => setShowNew(true)} onOpen={(p) => navigate(`/schede/${p.id}`)} onToast={setToast}/>} />
    </Routes></main>
    <nav className="bottom-nav"><NavLink to="/" end><Activity size={19}/><span>Oggi</span></NavLink><NavLink to="/schede"><Dumbbell size={19}/><span>Schede</span></NavLink><NavLink to="/profilo"><Settings2 size={19}/><span>Profilo</span></NavLink></nav>
    {showNew && <NewPlan onClose={() => setShowNew(false)} onCreate={createPlan}/>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function Home({ userId, plans, onStart, onNew, onOpen }) {
  const [day] = useState(new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()));
  const orderedPlans = [...plans].sort((a, b) => { const aDay = Number(a.name.match(/giorno\s*(\d+)/i)?.[1] ?? Number.MAX_SAFE_INTEGER); const bDay = Number(b.name.match(/giorno\s*(\d+)/i)?.[1] ?? Number.MAX_SAFE_INTEGER); return aDay - bDay; });
  const [selectedPlanId, setSelectedPlanId] = useState(orderedPlans[0]?.id || '');
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState([]);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customExercises, setCustomExercises] = useState([]);
  const [hiddenRecommended, setHiddenRecommended] = useState([]);
  const [favoriteSettingsLoaded, setFavoriteSettingsLoaded] = useState(false);
  const [ptEmail, setPtEmail] = useState('');
  const featured = plans.find((plan) => plan.id === selectedPlanId) || plans[0];
  useEffect(() => {
    setFavoriteSettingsLoaded(false);
    const settingsRef = doc(db, 'users', userId, 'settings', 'home-exercises');
    return onSnapshot(settingsRef, (snapshot) => {
      const settings = snapshot.data() || {};
      setCustomExercises(Array.isArray(settings.customExercises) ? settings.customExercises.filter((name) => typeof name === 'string') : []);
      setHiddenRecommended(Array.isArray(settings.hiddenRecommended) ? settings.hiddenRecommended.filter((key) => typeof key === 'string') : []);
      setFavoriteSettingsLoaded(true);
    }, () => setFavoriteSettingsLoaded(true));
  }, [userId]);
  useEffect(() => {
    if (!favoriteSettingsLoaded) return;
    setDoc(doc(db, 'users', userId, 'settings', 'home-exercises'), { customExercises, hiddenRecommended }, { merge: true }).catch(() => {});
  }, [userId, favoriteSettingsLoaded, customExercises, hiddenRecommended]);
  const recommendedExercises = (featured?.exercises || []).filter((exercise) => !hiddenRecommended.includes(`${featured.id}:${exercise.id}`));
  const selectableExercises = [...new Map([
    ...recommendedExercises,
    ...customExercises.map((name) => ({ id: `custom-${name.trim().toLowerCase()}`, name, photo: null })),
  ].map((exercise) => [exercise.name.trim().toLowerCase(), exercise])).values()];
  const selectedFavorites = selectableExercises.filter((exercise) => selectedFavoriteIds.includes(exercise.id));
  const validPtEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ptEmail.trim());
  function addCustomExercise(event) {
    event.preventDefault();
    const name = customExerciseName.trim();
    if (!name || selectableExercises.some((exercise) => exercise.name.trim().toLowerCase() === name.toLowerCase())) return;
    const id = `custom-${name.toLowerCase()}`;
    setCustomExercises((current) => [...current, name]);
    setSelectedFavoriteIds((current) => [...current, id]);
    setCustomExerciseName('');
  }
  function removeExercise(exercise) {
    setSelectedFavoriteIds((current) => current.filter((id) => id !== exercise.id));
    if (String(exercise.id).startsWith('custom-')) {
      setCustomExercises((current) => current.filter((name) => `custom-${name.trim().toLowerCase()}` !== exercise.id));
    } else if (featured) {
      setHiddenRecommended((current) => [...new Set([...current, `${featured.id}:${exercise.id}`])]);
    }
  }
  function tellTrainer() {
    if (!selectedFavorites.length || !validPtEmail) return;
    const names = selectedFavorites.map((exercise) => exercise.name);
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: ptEmail.trim(),
      su: names.length === 1 ? `Un esercizio che preferisco: ${names[0]}` : 'I miei esercizi preferiti',
      body: `Ciao, volevo condividere con te questi esercizi che preferisco:\n\n${names.map((name) => `• ${name}`).join('\n')}`,
    });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank', 'noopener,noreferrer');
  }
  return <>
    <div className="greeting"><div><p className="eyebrow">{day}</p><h1 className="quote-line">Se qualcosa sta in mezzo fra te ed il successo, spostalo</h1></div></div>
    <section className="next-card"><div className="next-top"><span className="pill pill-dark"><span className="live-dot"/> SCEGLI LA SCHEDA</span></div><div className="home-plan-picker"><span className="home-plan-label">Le tue schede</span><div className="home-plan-grid">{orderedPlans.length ? orderedPlans.map((plan) => <button key={plan.id} type="button" className={`home-plan-tile${featured?.id === plan.id ? ' selected' : ''}`} aria-pressed={featured?.id === plan.id} onClick={() => setSelectedPlanId(plan.id)}><span className="home-plan-tile-icon"><Dumbbell size={19}/></span><strong>{plan.name}</strong><span className="home-plan-tile-count">{plan.exercises.length} esercizi</span></button>) : <p className="home-plan-empty">Crea una scheda per iniziare.</p>}</div></div><button className="button button-lime full" onClick={() => featured ? onStart(featured) : onNew()}>{featured ? 'INIZIA ALLENAMENTO' : 'Crea scheda'}<ArrowRight size={17}/></button><div className="card-glow"/></section>
    <section className="favorites-section">
      <div className="section-head"><div><p className="eyebrow">LA TUA SELEZIONE</p><h2>Esercizi preferiti da selezionare</h2></div></div>
      {selectableExercises.length ? <div className="favorites-grid">{selectableExercises.map((exercise) => { const selected = selectedFavoriteIds.includes(exercise.id); return <div className="favorite-exercise-item" key={exercise.id}><button type="button" className={selected ? 'favorite-exercise selected' : 'favorite-exercise'} aria-pressed={selected} onClick={() => setSelectedFavoriteIds((current) => selected ? current.filter((id) => id !== exercise.id) : [...current, exercise.id])}><span className="favorite-thumb">{exercise.photo ? <img src={exercise.photo} alt="" /> : <Dumbbell size={16}/>}</span><span>{exercise.name}</span>{selected && <Check size={15}/>}</button><button type="button" className="favorite-delete" aria-label={`Elimina ${exercise.name}`} title={`Elimina ${exercise.name}`} onClick={() => removeExercise(exercise)}><Trash2 size={14}/></button></div>; })}</div> : <p className="favorites-empty">Nessun esercizio: aggiungine uno qui sotto.</p>}
      <form className="favorite-add" onSubmit={addCustomExercise}><label className="input-label">AGGIUNGI UN ESERCIZIO<input value={customExerciseName} onChange={(event) => setCustomExerciseName(event.target.value)} aria-label="Nome dell'esercizio"/></label><button type="submit" className="favorite-add-button" aria-label="Aggiungi esercizio" disabled={!customExerciseName.trim()}><Plus size={19}/></button></form>
      {selectedFavorites.length > 0 && <div className="favorite-share"><label className="input-label">EMAIL DEL TUO PT<input type="email" value={ptEmail} onChange={(event) => setPtEmail(event.target.value)}/></label><button type="button" className="button button-lime full" disabled={!validPtEmail} onClick={tellTrainer}>Fallo sapere al tuo PT <ArrowRight size={17}/></button><p>Si aprirà una bozza email da controllare e inviare.</p></div>}
    </section>
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
   return <><div className="editor-top"><button className="back-button" onClick={onBack}><ArrowLeft size={19}/><span>Schede</span></button><button className="icon-button" onClick={deletePlan} aria-label="Elimina scheda"><Trash2 size={18}/></button></div><div className="editor-heading"><p className="eyebrow">{plan.days.toUpperCase()} <span>·</span> {plan.exercises.length} ESERCIZI</p>{editingName ? <form className="name-form" onSubmit={(e) => {e.preventDefault(); saveName();}}><input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}/><button className="icon-button"><Check size={18}/></button></form> : <button className="title-edit" onClick={() => setEditingName(true)}><h1>{plan.name}<span className="brand-dot">.</span></h1><span>Rinomina</span></button>}<p className="editor-focus">{plan.focus}</p></div><button className="button button-lime full start-workout start-workout-top" onClick={() => onStart(plan)}>Inizia allenamento <ArrowRight size={17}/></button><div className="editor-summary"><div><span>VOLUME TOTALE</span><strong>{totalSets} <small>serie</small></strong></div><div><span>TEMPO STIMATO</span><strong>{Math.max(30, plan.exercises.length * 12)} <small>min</small></strong></div><div><span>ESERCIZI</span><strong>{plan.exercises.length.toString().padStart(2,'0')}</strong></div></div><label className="rest-setting"><span><Timer size={15}/> Recupero tra le serie</span><select value={Number(plan.restSeconds) || 90} onChange={(e) => updatePlan(id, (p) => ({ ...p, restSeconds: Number(e.target.value) }))}>{REST_OPTIONS.map((seconds) => <option key={seconds} value={seconds}>{seconds >= 60 ? `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ''}` : `${seconds} s`}</option>)}</select></label><div className="section-head exercise-head"><div><p className="eyebrow">IL TUO ALLENAMENTO</p><h2>Esercizi</h2></div><button className="text-action" onClick={() => setAddOpen(true)}><CirclePlus size={17}/> Aggiungi</button></div><div className="exercise-list">{plan.exercises.map((e, i) => <article className="exercise-card" key={e.id}><div className="exercise-card-top"><span className="exercise-index">{String(i + 1).padStart(2,'0')}</span><strong>{e.name}</strong><button className="mini-delete" onClick={() => removeExercise(e.id)} aria-label={`Rimuovi ${e.name}`}><X size={17}/></button></div><div className="exercise-fields"><NumberField label="SERIE" value={e.sets} onChange={(v) => changeExercise(e.id,'sets',v)} suffix="×"/><NumberField label="RIPETIZIONI" value={e.reps} onChange={(v) => changeExercise(e.id,'reps',v)} suffix="rep"/><NumberField label="CARICO" value={e.kg} onChange={(v) => changeExercise(e.id,'kg',v)} suffix="kg"/></div><ExerciseNotesPhoto exercise={e} onUpdate={(patch) => updatePlan(id, (p) => ({ ...p, exercises: p.exercises.map((item) => item.id === e.id ? { ...item, ...patch } : item) }))} onToast={onToast}/></article>)}</div>{plan.exercises.length === 0 && <div className="empty compact"><Dumbbell size={24}/><h3>Parti dal primo esercizio</h3><p>Aggiungi gli esercizi, poi imposta serie, ripetizioni e carico.</p></div>}<button className="button button-outline full add-exercise-bottom" onClick={() => setAddOpen(true)}><Plus size={17}/> Aggiungi esercizio</button>{addOpen && <AddExercise onClose={() => setAddOpen(false)} onAdd={addExercise}/>}</>;
}

function WorkoutSession({ plans, workouts, setWorkouts, onBack, onToast }) {
  const { id } = useParams(); const nav = useNavigate(); const [now, setNow] = useState(Date.now());
  const [photoPreview, setPhotoPreview] = useState(null);
  const firstExerciseRef = useRef(null);
  const workout = workouts.find((w) => w.id === id);
  const allSets = workout?.exercises.flatMap((e) => e.sets || []) || [];
  const doneSets = allSets.filter((s) => s.done).length;
  const finished = Boolean(workout?.finishedAt);
  const remaining = workout?.restUntil ? Math.max(0, Math.ceil((workout.restUntil - now) / 1000)) : (workout?.restPausedSeconds || 0);
  const restActive = !finished && Boolean(workout?.restAfter && (workout.restUntil || workout.restPausedSeconds));
  function patchWorkout(patch) { setWorkouts((old) => old.map((w) => w.id === id ? { ...w, ...patch } : w)); }
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!workout?.restUntil) return; const delay = workout.restUntil - Date.now(); const timer = window.setTimeout(() => { patchWorkout({ restUntil: null, restPausedSeconds: 0, restAfter: null }); if (navigator.vibrate) navigator.vibrate([100, 80, 100]); }, Math.max(0, delay)); return () => window.clearTimeout(timer); }, [id, workout?.restUntil]);
  useEffect(() => { if (workout && !workout.finishedAt) firstExerciseRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); }, [id]);
  useEffect(() => { if (!photoPreview) return; const closeOnEscape = (event) => { if (event.key === 'Escape') setPhotoPreview(null); }; window.addEventListener('keydown', closeOnEscape); return () => window.removeEventListener('keydown', closeOnEscape); }, [photoPreview]);
  if (!workout) return <div className="empty"><h3>Allenamento non trovato</h3><button className="button button-lime" onClick={onBack}>Torna alle schede</button></div>;
  function changeSet(eid, index, patch) { setWorkouts((old) => old.map((w) => w.id === id ? { ...w, exercises: w.exercises.map((e) => e.id === eid ? { ...e, sets: e.sets.map((s, i) => i === index ? { ...s, ...patch } : s) } : e) } : w)); }
  function toggleSet(ei, si) {
    setWorkouts((old) => old.map((current) => {
      if (current.id !== id) return current;
      const exercise = current.exercises[ei];
      if (!exercise?.sets[si]) return current;
      const wasDone = exercise.sets[si].done;
      const nextSets = exercise.sets.map((set, index) => index === si ? { ...set, done: !set.done } : set);
      const next = { ...current, exercises: current.exercises.map((item, index) => index === ei ? { ...item, sets: nextSets } : item) };
      const isLastSet = ei === current.exercises.length - 1 && si === exercise.sets.length - 1;
      if (!wasDone && !isLastSet) { const seconds = Number(current.restSeconds) || 90; next.restUntil = Date.now() + seconds * 1000; next.restPausedSeconds = 0; next.restDurationSeconds = seconds; next.restAfter = { exerciseId: exercise.id, setIndex: si }; }
      else if (wasDone && current.restAfter?.exerciseId === exercise.id && current.restAfter?.setIndex === si) { next.restUntil = null; next.restPausedSeconds = 0; next.restAfter = null; }
      return next;
    }));
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
    <div className="session-progress"><div><span>PROGRESSO</span><strong>{doneSets}<small> / {allSets.length} serie</small></strong></div><div className="progress-track progress-segments" role="progressbar" aria-label="Progresso allenamento" aria-valuemin={0} aria-valuemax={allSets.length} aria-valuenow={doneSets} style={{ gridTemplateColumns: `repeat(${Math.max(1, allSets.length)}, minmax(0, 1fr))` }}>{allSets.map((set, index) => <span key={index} className={set.done ? 'complete' : ''}/>)}</div></div>
    <div className="exercise-list session-exercises">{workout.exercises.map((exercise, ei) => { const photo = exercise.photo || plans.find((plan) => plan.id === workout.planId)?.exercises.find((item) => item.id === exercise.id)?.photo; return <article ref={ei === 0 ? firstExerciseRef : undefined} className="exercise-card session-card" key={`${exercise.id}-${ei}`}>
      <div className="exercise-card-top"><span className="exercise-index">{String(ei + 1).padStart(2,'0')}</span><strong>{exercise.name}</strong><span className="session-set-count">{exercise.sets.length} serie</span></div>
      {photo && <button type="button" className="session-photo-button" onClick={() => setPhotoPreview({ src: photo, name: exercise.name })} aria-label={`Apri foto di ${exercise.name}`}><img className="session-exercise-photo" src={photo} alt={`Foto ${exercise.name}`} loading="lazy"/><span>Tocca per ingrandire</span></button>}{exercise.notes && <p className="session-exercise-note">{exercise.notes}</p>}
      <div className="session-columns"><span>SERIE</span><span>RIPETIZIONI</span><span>KG</span><span>FATTA</span></div>
      {exercise.sets.map((set, si) => <div className="set-row-wrap" key={si}>
        <div className={`session-set ${set.done ? 'set-complete' : ''}`}><span className="set-number">{String(si + 1).padStart(2,'0')}</span><input aria-label={`Ripetizioni serie ${si + 1} ${exercise.name}`} inputMode="decimal" value={set.reps} disabled={finished} onChange={(e) => changeSet(exercise.id, si, { reps: e.target.value })}/><input aria-label={`Chilogrammi serie ${si + 1} ${exercise.name}`} inputMode="decimal" value={set.kg} disabled={finished} onChange={(e) => changeSet(exercise.id, si, { kg: e.target.value })}/><button className={`set-check ${set.done ? 'checked' : ''}`} disabled={finished} aria-pressed={set.done} style={{ backgroundColor: set.done ? '#c9ef58' : '#fff', borderColor: set.done ? '#c9ef58' : '#dfe3d6' }} onClick={() => toggleSet(ei, si)} aria-label={set.done ? 'Segna serie da completare' : 'Segna serie completata'}>{set.done ? <Check size={14}/> : <span className="set-check-circle"/>}<span className="set-check-label">{set.done ? 'Fatta' : 'Segna'}</span></button></div>
        {restActive && workout.restAfter?.exerciseId === exercise.id && workout.restAfter?.setIndex === si && <div className="rest-inline"><Timer size={15}/><span className="rest-inline-label">Recupero</span><strong className="rest-inline-time">{mmss}</strong><div className="rest-inline-track"><span style={{ width: `${Math.max(0, Math.min(100, remaining / restTotal * 100))}%` }}/></div><button onClick={addRest} aria-label="Aggiungi 15 secondi">+15</button><button onClick={pauseOrResume} aria-label={workout.restUntil ? 'Pausa recupero' : 'Riprendi recupero'}>{workout.restUntil ? <Pause size={14}/> : <Play size={14}/>}</button><button onClick={skipRest} aria-label="Salta recupero"><SkipForward size={14}/></button></div>}
      </div>)}
    </article>; })}</div>
    {!finished ? <button className="button button-lime full finish-workout" onClick={finish}>Termina allenamento <Check size={17}/></button> : <button className="button button-outline full finish-workout" onClick={() => nav('/profilo')}>Vai allo storico</button>}
    {photoPreview && <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`Foto ${photoPreview.name}`} onClick={() => setPhotoPreview(null)}><button type="button" className="photo-lightbox-close" aria-label="Chiudi foto" onClick={() => setPhotoPreview(null)}><X size={22}/></button><img src={photoPreview.src} alt={`Foto ingrandita ${photoPreview.name}`} onClick={(event) => event.stopPropagation()}/><span>{photoPreview.name}</span></div>}
  </>;
}

function NumberField({label, value, onChange, suffix}) { return <label className="number-field"><span>{label}</span><div><input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}/><small>{suffix}</small></div></label>; }

function AddExercise({onClose,onAdd}) { const [value,setValue] = useState(''); const [filter,setFilter] = useState(''); const popular = ['Panca piana bilanciere','Squat bilanciere','Stacco da terra','Lat machine','Rematore manubrio','Shoulder press','Leg press','Curl manubri','Plank']; const results = popular.filter((x) => x.toLowerCase().includes(filter.toLowerCase())); return <div className="modal-backdrop" onMouseDown={(e) => {if(e.target === e.currentTarget) onClose();}}><div className="sheet-modal"><div className="modal-handle"/><div className="modal-head"><div><p className="eyebrow">PERSONALIZZA LA SCHEDA</p><h2>Aggiungi esercizio</h2></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><label className="searchbox modal-search"><Search size={17}/><input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Cerca o scrivi un esercizio"/></label>{filter && !popular.some((x) => x.toLowerCase() === filter.toLowerCase()) && <button className="exercise-choice custom-choice" onClick={() => onAdd(filter)}><span className="choice-plus"><Plus size={17}/></span><span><strong>Aggiungi “{filter}”</strong><small>Esercizio personalizzato</small></span><ChevronRight size={17}/></button>}<p className="choice-label">PIÙ UTILIZZATI</p><div className="choice-list">{results.map((x) => <button className="exercise-choice" key={x} onClick={() => onAdd(x)}><span className="choice-plus"><Plus size={17}/></span><span><strong>{x}</strong><small>Forza e ipertrofia</small></span><ChevronRight size={17}/></button>)}</div><button className="button button-lime full modal-done" onClick={onClose}>Fatto</button></div></div>; }

function NewPlan({onClose,onCreate}) { const [name,setName]=useState(''); const [restSeconds,setRestSeconds]=useState(90); return <div className="modal-backdrop" onMouseDown={(e) => {if(e.target === e.currentTarget) onClose();}}><form className="sheet-modal new-modal" onSubmit={(e) => {e.preventDefault(); if(name.trim()) onCreate(name.trim(),restSeconds);}}><div className="modal-handle"/><div className="modal-head"><div><p className="eyebrow">NUOVO PROGRAMMA</p><h2>Crea una scheda</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={19}/></button></div><p className="modal-description">Dai un nome al tuo allenamento e imposta il recupero tra le serie.</p><label className="input-label">NOME DELLA SCHEDA<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Push day" maxLength={32}/></label><label className="input-label rest-select-label">RECUPERO TRA LE SERIE<select value={restSeconds} onChange={(e) => setRestSeconds(Number(e.target.value))}>{REST_OPTIONS.map((seconds) => <option key={seconds} value={seconds}>{seconds >= 60 ? `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ''}` : `${seconds} s`}</option>)}</select></label><button className="button button-lime full modal-done" disabled={!name.trim()}>Crea scheda <ArrowRight size={17}/></button></form></div>; }

function firebaseMessage(error) {
  const code = error?.code || '';
  if (code.includes('permission-denied')) return 'Firestore: controlla che le regole di sicurezza siano pubblicate.';
  if (code.includes('auth/operation-not-allowed')) return 'Metodo di accesso non abilitato in Firebase Authentication.';
  if (code.includes('auth/unauthorized-domain')) return 'Aggiungi il dominio dell’app ai domini autorizzati Firebase.';
  if (code.includes('auth/popup-closed-by-user')) return 'Accesso Google annullato.';
  if (code.includes('auth/popup-blocked')) return 'Popup bloccato: consenti i popup o riprova da Safari.';
  if (code.includes('auth/email-already-in-use')) return 'Questa email ha già un account: accedi invece di registrarti.';
  if (code.includes('auth/invalid-credential')) return 'Email o password non corretti.';
  if (code.includes('auth/weak-password')) return 'Scegli una password di almeno 6 caratteri.';
  if (code.includes('auth/invalid-email')) return 'Inserisci un indirizzo email valido.';
  if (code.includes('auth/user-not-found')) return 'Nessun account trovato con questa email.';
  if (code.includes('auth/network-request-failed') || code.includes('unavailable')) return 'Connessione assente o servizio Firebase momentaneamente non disponibile.';
  return error?.message || 'Si è verificato un errore con Firebase.';
}

function AuthGate({error,setError}) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { if (register) await createUserWithEmailAndPassword(auth, email.trim(), password); else await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch (err) { setError(firebaseMessage(err)); }
    finally { setBusy(false); }
  }
  async function google() {
    setBusy(true); setError('');
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); }
    catch (err) {
      if (err?.code === 'auth/popup-blocked') { try { await signInWithRedirect(auth, provider); return; } catch (redirectError) { setError(firebaseMessage(redirectError)); } }
      else setError(firebaseMessage(err));
    }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!email.trim()) { setError('Inserisci la tua email per ricevere il link di recupero.'); setResetMessage(''); return; }
    setBusy(true); setError(''); setResetMessage('');
    try { await sendPasswordResetEmail(auth, email.trim()); setResetMessage('Se l’indirizzo è associato a un account, riceverai un’email con le istruzioni.'); }
    catch (err) { setError(firebaseMessage(err)); }
    finally { setBusy(false); }
  }
  return <div className="auth-screen"><section className="auth-card"><span className="brand-mark"><Dumbbell size={18}/></span><p className="eyebrow">IL TUO ALLENAMENTO, OVUNQUE</p><h1>FORMA<span className="brand-dot">.</span></h1><p className="auth-subtitle">Accedi per ritrovare schede, pesi e storico su tutti i tuoi dispositivi.</p><button className="button button-outline full google-signin" disabled={busy} onClick={google}><span className="google-g">G</span>Continua con Google</button><div className="auth-divider"><span/>oppure con email<span/></div><form onSubmit={submit} className="auth-form"><label className="input-label">EMAIL<input type="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); setResetMessage(''); }}/></label><label className="input-label">PASSWORD<input type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)}/></label>{!register && <button type="button" className="forgot-password" disabled={busy} onClick={resetPassword}>Password dimenticata?</button>}<button className="button button-lime full" disabled={busy}>{busy ? 'Attendi…' : register ? 'Crea account' : 'Accedi'}<ArrowRight size={17}/></button></form>{resetMessage && <p role="status" className="auth-success">{resetMessage}</p>}{error && <p role="alert" className="auth-error">{error}</p>}<button className="auth-switch" disabled={busy} onClick={() => { setRegister(!register); setError(''); setResetMessage(''); }}>{register ? 'Hai già un account? Accedi' : 'È la prima volta? Crea un account'}</button></section></div>;
}

function Profile({plans,workouts,onToast,onImport,darkMode,onToggleDarkMode,user,onLogout}) {
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
  const history = workouts.filter((w) => w.finishedAt).sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
  const recentHistory = history.slice(0, 3);
  return <><div className="page-heading"><p className="eyebrow">IL TUO ACCOUNT</p><h1>Profilo<span className="brand-dot">.</span></h1></div><div className="profile-card"><span className="profile-avatar">{(user.displayName || user.email || 'U')[0].toUpperCase()}</span><div><strong>{user.displayName || 'Il tuo spazio'}</strong><p>{user.email}</p></div><Check size={18}/></div><button className="button button-outline full account-signout" onClick={onLogout}>Esci dall’account</button><button className="theme-toggle" type="button" role="switch" aria-checked={darkMode} onClick={() => onToggleDarkMode(!darkMode)}><span className="theme-toggle-icon">{darkMode ? <Moon size={18}/> : <Sun size={18}/>}</span><span className="theme-toggle-copy"><strong>Tema scuro</strong><small>{darkMode ? 'Attivato' : 'Disattivato'}</small></span><span className={`theme-switch ${darkMode ? 'on' : ''}`}><i/></span></button><div className="section-head profile-section"><div><p className="eyebrow">I TUOI DATI</p><h2>Panoramica</h2></div></div><div className="profile-stat"><span>Schede create</span><strong>{plans.length}</strong></div><div className="profile-stat"><span>Esercizi programmati</span><strong>{plans.reduce((n,p)=>n+p.exercises.length,0)}</strong></div><div className="section-head history-heading"><div><p className="eyebrow">I TUOI ALLENAMENTI</p><h2>Storico sessioni</h2></div><span className="history-total">{history.length}</span></div>{history.length ? <div className="history-list">{recentHistory.map((w) => { const sets = w.exercises.flatMap((e) => e.sets || []); const date = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(w.finishedAt)); return <button key={w.id} className="history-row" onClick={() => nav(`/allenamento/${w.id}`)}><span className="history-icon"><Check size={16}/></span><span className="history-copy"><strong>{w.planName}</strong><small>{date} · {sets.filter((s) => s.done).length}/{sets.length} serie completate</small></span><ChevronRight size={17}/></button>; })}</div> : <p className="history-empty">Le sessioni completate compariranno qui.</p>}<div className="backup-actions"><button className="button button-lime full" onClick={exportPlans}>Esporta backup <ArrowRight size={16}/></button><button className="button button-outline full" onClick={() => picker.current?.click()}>Importa backup</button><input ref={picker} className="hidden-file" type="file" accept="application/json,.json" onChange={(e) => importPlans(e.target.files?.[0])}/></div><p className="version">FORMA PLANNER · VERSIONE 1.0</p></>;
}

export default App;
