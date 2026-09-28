import { useEffect, useState } from 'react'
import { Activity, ArrowRight, Check, CircleAlert, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { getHealth, predictRisk } from './api/client'

const initialForm = {
  job_role: '', country: '', work_environment: 'Hybrid', work_hours_per_week: '45',
  sleep_hours_per_night: '7', meetings_per_day: '4', stress_score: '5',
  job_burnout_score: '5', depression_score: '5', anxiety_score: '5',
  job_satisfaction_score: '7', salary_usd: '85000',
}
const sampleForm = {
  ...initialForm, job_role: 'Product Designer', country: 'United States', work_environment: 'Remote',
  work_hours_per_week: '58', sleep_hours_per_night: '5', meetings_per_day: '7', stress_score: '8',
  job_burnout_score: '8', depression_score: '14', anxiety_score: '12', job_satisfaction_score: '3', salary_usd: '110000',
}
const fields = {
  context: [
    ['job_role', 'Job role', 'e.g. Software Engineer', 'text'], ['country', 'Country', 'e.g. United States', 'text'],
    ['work_environment', 'Work environment', '', 'select'], ['work_hours_per_week', 'Weekly work hours', '10–100 hours', 'number', 10, 100, 1],
    ['meetings_per_day', 'Meetings per day', '0–20 meetings', 'number', 0, 20, 1], ['salary_usd', 'Annual salary (USD)', '$15,000–$500,000', 'number', 15000, 500000, 1000],
  ],
  wellbeing: [
    ['sleep_hours_per_night', 'Sleep per night', '2–14 hours', 'number', 2, 14, 0.5], ['stress_score', 'Stress score', '1 = low · 10 = high', 'number', 1, 10, 1],
    ['job_burnout_score', 'Burnout score', '1 = low · 10 = high', 'number', 1, 10, 1], ['depression_score', 'Depression score', 'PHQ-9 scale · 0–27', 'number', 0, 27, 1],
    ['anxiety_score', 'Anxiety score', 'GAD-7 scale · 0–21', 'number', 0, 21, 1], ['job_satisfaction_score', 'Job satisfaction', '1 = low · 10 = high', 'number', 1, 10, 1],
  ],
}

function App() {
  const [form, setForm] = useState(initialForm)
  const [audience, setAudience] = useState('employee')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [service, setService] = useState('checking')
  const isManager = audience === 'manager'

  useEffect(() => { getHealth().then(() => setService('online')).catch(() => setService('offline')) }, [])
  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); if (error) setError('') }
  function resetForm(nextForm = initialForm) { setForm(nextForm); setResult(null); setError('') }
  async function handleSubmit(event) {
    event.preventDefault(); setLoading(true); setError(''); setResult(null)
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, ['job_role', 'country', 'work_environment'].includes(key) ? value : Number(value)]))
      setResult(await predictRisk(payload))
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }
  const intro = isManager ? 'A private, structured view for workload conversations and thoughtful retention planning.' : 'A quiet check-in on the conditions that shape energy, focus, and sustainable work.'

  return <main className="min-h-screen overflow-hidden bg-[#f7f4ee] text-[#172320]"><div className="mx-auto max-w-360 px-5 py-5 sm:px-8 lg:px-12 lg:py-8">
    <header className="flex items-center justify-between border-b border-[#d8ded8] pb-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123e38] text-[#f5c49b] shadow-[4px_4px_0_#d9a57e]"><Sparkles size={19} /></div><div><p className="font-display text-lg font-semibold">Morrow</p><p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#718078]">Work wellbeing studio</p></div></div><div className="flex items-center gap-2 text-xs font-semibold text-[#718078]" aria-label={`Service status: ${service}`}><span className={`h-2 w-2 rounded-full ${service === 'online' ? 'bg-[#23836f]' : service === 'offline' ? 'bg-[#c76b5e]' : 'animate-pulse bg-[#d9a57e]'}`} />{service === 'online' ? 'Model ready' : service === 'offline' ? 'Model offline' : 'Connecting'}</div></header>
    <section className="grid gap-8 pb-8 pt-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end lg:pt-14"><div className="max-w-3xl"><p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#c76b5e]"><span className="h-px w-7 bg-[#c76b5e]" /> Burnout signal check</p><h1 className="font-display max-w-3xl text-5xl font-medium leading-[0.96] tracking-[-0.055em] text-[#123e38] sm:text-7xl">Make room for the conversation before it becomes a resignation.</h1><p className="mt-6 max-w-2xl text-base leading-7 text-[#5d6b65] sm:text-lg">{intro} Morrow turns a handful of work and wellbeing signals into a starting point for a more human next step.</p></div><div className="border-l-2 border-[#d9a57e] pl-5 text-sm leading-6 text-[#5d6b65]"><p className="font-display text-xl leading-6 text-[#123e38]">Decision support, not diagnosis.</p><p className="mt-2">Use the result as a prompt for care, context, and human judgment.</p></div></section>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]"><form onSubmit={handleSubmit} className="rounded-[20px] border border-[#d8ded8] bg-white/70 p-5 shadow-[0_18px_60px_rgba(18,62,56,0.07)] sm:p-8"><div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#e0e5e0] pb-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#718078]">01 / Check-in context</p><h2 className="font-display mt-2 text-3xl text-[#123e38]">Start with the shape of work.</h2></div><div className="flex rounded-full border border-[#d8ded8] bg-[#f7f4ee] p-1 text-xs font-bold" role="group" aria-label="Choose audience"><button type="button" onClick={() => setAudience('employee')} className={`rounded-full px-3 py-2 ${!isManager ? 'bg-[#123e38] text-white' : 'text-[#718078]'}`}>For me</button><button type="button" onClick={() => setAudience('manager')} className={`rounded-full px-3 py-2 ${isManager ? 'bg-[#123e38] text-white' : 'text-[#718078]'}`}>For my team</button></div></div><FieldGroup fields={fields.context} form={form} onChange={updateField} /><div className="mb-8 mt-10 border-b border-[#e0e5e0] pb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#718078]">02 / Personal signals</p><h2 className="font-display mt-2 text-3xl text-[#123e38]">Notice what recovery looks like.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#718078]">These signals are sensitive. Enter only what feels appropriate for this conversation.</p></div><FieldGroup fields={fields.wellbeing} form={form} onChange={updateField} />{error && <div className="mt-7 flex items-start gap-3 rounded-xl border border-[#edc8c2] bg-[#fff4f1] p-4 text-sm text-[#9b4e45]" role="alert"><CircleAlert size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}<div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[#e0e5e0] pt-6"><div className="flex gap-2"><button type="button" onClick={() => resetForm(sampleForm)} className="rounded-full border border-[#b9c9c1] px-4 py-2.5 text-xs font-bold text-[#37655a] hover:bg-[#eef3ee]">Try sample</button><button type="button" onClick={() => resetForm()} className="flex items-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-bold text-[#718078] hover:text-[#123e38]"><RotateCcw size={14} /> Reset</button></div><button disabled={loading} type="submit" className="group flex items-center gap-3 rounded-full bg-[#c76b5e] px-5 py-3 text-sm font-bold text-white shadow-[4px_4px_0_#e4b09f] hover:bg-[#b9594c] disabled:cursor-wait disabled:opacity-60">{loading ? 'Reading signals…' : 'See the signal'}<ArrowRight size={17} className="transition group-hover:translate-x-1" /></button></div></form><aside className="lg:sticky lg:top-6"><ResultPanel result={result} loading={loading} /></aside></div>
    <footer className="mt-10 flex flex-col gap-3 border-t border-[#d8ded8] pt-5 text-xs leading-5 text-[#718078] sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#23836f]" /> No inputs are stored in this browser.</p><p>For conversations and care, never as the sole employment decision.</p></footer>
  </div></main>
}

function FieldGroup({ fields: groupFields, form, onChange }) { return <div className="grid gap-5 sm:grid-cols-2">{groupFields.map(([name, label, hint, type, min, max, step]) => <label key={name} className="block"><span className="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold text-[#314740]"><span>{label}</span><span className="text-[10px] font-semibold text-[#91a099]">{hint}</span></span>{type === 'select' ? <select name={name} value={form[name]} onChange={onChange} className="field-input"><option>Hybrid</option><option>Remote</option><option>On-site</option></select> : <input required name={name} type={type} value={form[name]} onChange={onChange} min={min} max={max} step={step} placeholder={hint} className="field-input" />}</label>)}</div> }
function ResultPanel({ result, loading }) {
  if (loading) return <div className="result-shell flex min-h-130 flex-col items-center justify-center text-center"><div className="mb-5 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-[#dcebe5] text-[#23836f]"><Activity size={28} /></div><p className="font-display text-2xl text-[#123e38]">Reading the pattern…</p><p className="mt-2 max-w-xs text-sm leading-6 text-[#718078]">A calibrated signal is on its way. Keep the next conversation human.</p></div>
  if (!result) return <div className="result-shell flex min-h-130 flex-col justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#718078]">Your readout</p><h2 className="font-display mt-3 text-4xl leading-none text-[#123e38]">A clearer next step starts with a clearer picture.</h2><p className="mt-5 text-sm leading-6 text-[#5d6b65]">Complete the check-in to see the model’s calibrated signal, the conditions contributing to it, and a practical action to discuss.</p></div><div className="space-y-3 border-t border-[#d8ded8] pt-5 text-sm text-[#5d6b65]"><p className="flex gap-3"><Check size={17} className="text-[#23836f]" />Private by design</p><p className="flex gap-3"><Check size={17} className="text-[#23836f]" />Built for a thoughtful conversation</p><p className="flex gap-3"><Check size={17} className="text-[#23836f]" />Transparent drivers, not a black box</p></div></div>
  const probability = Math.round(result.calibrated_probability * 100)
  const severe = result.risk_tier === 'Severe Flight Risk'
  const elevated = result.turnover_predicted
  return <div className="result-shell overflow-hidden"><div className={`-mx-6 -mt-6 mb-6 px-6 pb-6 pt-6 ${severe ? 'bg-[#fff0eb]' : elevated ? 'bg-[#fff7e9]' : 'bg-[#e9f3ed]'}`}><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#718078]">Signal readout</p><span className={`rounded-full px-3 py-1 text-[11px] font-bold ${severe ? 'bg-[#c76b5e] text-white' : elevated ? 'bg-[#d9a57e] text-[#5c3a1f]' : 'bg-[#b9d8c9] text-[#205b4b]'}`}>{result.risk_tier}</span></div><div className="mt-8 flex items-end gap-2"><span className="font-display text-7xl leading-none text-[#123e38]">{probability}</span><span className="mb-2 font-display text-2xl text-[#718078]">%</span></div><p className="mt-2 text-sm text-[#5d6b65]">calibrated turnover probability</p></div><div className="space-y-6"><div className="grid grid-cols-2 gap-3"><Metric label="Work / sleep" value={result.work_hours_to_sleep_ratio} /><Metric label="Mental load" value={result.total_mental_load} /></div><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#718078]">Primary drivers</p>{result.primary_risk_drivers.length ? <div className="space-y-2">{result.primary_risk_drivers.map((driver) => <div key={driver.indicator} className="rounded-xl border border-[#e0e5e0] bg-[#fbfcfa] p-3"><div className="flex justify-between gap-3 text-sm font-bold text-[#314740]"><span>{driver.indicator}</span><span className="text-[#c76b5e]">{driver.observed_value}</span></div><p className="mt-1 text-xs leading-5 text-[#718078]">{driver.benchmark_status}</p></div>)}</div> : <p className="rounded-xl bg-[#e9f3ed] p-3 text-sm text-[#37655a]">No primary drivers crossed the model’s review thresholds.</p>}</div><div className="border-l-2 border-[#d9a57e] pl-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#718078]">Suggested next action</p><p className="mt-2 text-sm leading-6 text-[#314740]">{result.recommended_retention_action}</p></div><p className="text-[11px] leading-5 text-[#91a099]">Threshold applied: {result.decision_threshold_applied} · Model: {result.model_used}</p></div></div>
}
function Metric({ label, value }) { return <div className="rounded-xl bg-[#eef3ee] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#718078]">{label}</p><p className="font-display mt-1 text-2xl text-[#123e38]">{value}</p></div> }

export default App