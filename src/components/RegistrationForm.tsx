import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { Lang } from '../i18n/index';
import msT from '../i18n/ms.json';
import enT from '../i18n/en.json';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  fullName: string;
  position: string;
  email: string;
  phone: string;
  orgName: string;
  orgType: string;
  ssmNumber: string;
  venueName: string;
  venueAddress: string;
  state: string;
  capacity: string;
  screenSetup: string;
  matchesPlanned: string[];
  estimatedAudience: string;
  chargesEntry: string;
  sellsFnb: string;
  sponsorshipInterest: string;
  notes: string;
  consentPdpa: boolean;
  consentCompliance: boolean;
}

interface Props {
  lang: Lang;
}

// ─── Translation helper ───────────────────────────────────────────────────────

function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const translations = lang === 'en' ? enT : msT;
  const parts = key.split('.');
  let val: unknown = translations;
  for (const p of parts) {
    if (val == null || typeof val !== 'object') return key;
    val = (val as Record<string, unknown>)[p];
  }
  let result = typeof val === 'string' ? val : key;
  if (vars) {
    result = Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      result,
    );
  }
  return result;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 8;

const STATES_MS = [
  'johor','kedah','kelantan','melaka','negeri-sembilan','pahang',
  'perak','perlis','pulau-pinang','sabah','sarawak','selangor',
  'terengganu','kuala-lumpur','labuan','putrajaya',
] as const;

const ORG_TYPES = ['fnb','hotel','mall','fanzone','corporate','community','government','other'] as const;
const MATCHES = ['all','group','r32','r16','quarters','semis','final','specific'] as const;
const CAPACITIES = ['under-50','50-200','200-500','500-2000','2000+'] as const;

// ─── Field components ─────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string;
  required?: boolean;
  error?: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label class="form-label">
        {label}{required && <span class="required"> *</span>}
      </label>
      {children}
      {error && <p class="form-error">{error}</p>}
    </div>
  );
}

function Input({ error, ...props }: preact.JSX.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input class={`form-input${error ? ' error' : ''}`} {...props} />;
}

function Select({ error, children, ...props }: preact.JSX.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <select class={`form-input${error ? ' error' : ''}`} style={{ cursor: 'pointer' }} {...props}>
      {children}
    </select>
  );
}

function Textarea({ error, ...props }: preact.JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return <textarea class={`form-input${error ? ' error' : ''}`} rows={4} {...props} />;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total, lang }: { step: number; total: number; lang: Lang }) {
  const pct = Math.round(((step) / total) * 100);
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-eyebrow)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
          {t(lang, 'form.progress', { current: step, total })}
        </span>
        <span style={{ fontFamily: 'var(--font-eyebrow)', fontSize: '0.65rem', color: 'var(--color-gold)' }}>{pct}%</span>
      </div>
      <div style={{ height: '3px', background: 'var(--color-navy-light)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-gold)', transition: 'width 0.4s ease', borderRadius: '2px' }} />
      </div>
    </div>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ lang, onNext }: { lang: Lang; onNext: () => void }) {
  return (
    <div class="step-animate-enter" style={{ textAlign: 'center', padding: '2rem 0' }}>
      <div style={{ marginBottom: '1.5rem', color: 'var(--color-gold)' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.75rem', color: 'var(--color-white)' }}>
        {t(lang, 'form.step1.headline')}
      </h2>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', marginBottom: '2.5rem', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
        {t(lang, 'form.step1.subhead')}
      </p>
      <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', margin: '0 auto 2.5rem', maxWidth: '340px', letterSpacing: '0.02em', opacity: 0.7 }}>
        {t(lang, 'form.step1.feesNote')}
      </p>
      <button onClick={onNext} class="btn-primary" style={{ margin: '0 auto' }}>
        {t(lang, 'form.step1.cta')}
      </button>
    </div>
  );
}

// ─── Step 2: About You ────────────────────────────────────────────────────────

function StepAboutYou({ lang, data, onNext, onBack }: { lang: Lang; data: Partial<FormData>; onNext: (d: Partial<FormData>) => void; onBack: () => void }) {
  const [fields, setFields] = useState({ fullName: data.fullName ?? '', position: data.position ?? '', email: data.email ?? '', phone: data.phone ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fields.fullName.trim()) e.fullName = t(lang, 'form.required');
    if (!fields.position.trim()) e.position = t(lang, 'form.required');
    if (!fields.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) e.email = t(lang, 'form.required');
    if (!fields.phone.trim() || !/^[+\d\s\-()\[\]]{7,20}$/.test(fields.phone)) e.phone = t(lang, 'form.required');
    return e;
  };

  const handleNext = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onNext(fields);
  };

  const set = (k: keyof typeof fields) => (e: Event) => {
    setFields(f => ({ ...f, [k]: (e.target as HTMLInputElement).value }));
    setErrors(er => { const n = { ...er }; delete n[k]; return n; });
  };

  useKeyEnter(handleNext);

  return (
    <div class="step-animate-enter">
      <h2 class="step-heading">{t(lang, 'form.step2.heading')}</h2>
      <Field label={t(lang, 'form.step2.fullName')} required error={errors.fullName}>
        <Input type="text" value={fields.fullName} onInput={set('fullName')} error={errors.fullName} autoComplete="name" autoFocus />
      </Field>
      <Field label={t(lang, 'form.step2.position')} required error={errors.position}>
        <Input type="text" value={fields.position} onInput={set('position')} error={errors.position} />
      </Field>
      <Field label={t(lang, 'form.step2.email')} required error={errors.email}>
        <Input type="email" value={fields.email} onInput={set('email')} error={errors.email} autoComplete="email" />
      </Field>
      <Field label={t(lang, 'form.step2.phone')} required error={errors.phone}>
        <Input type="tel" value={fields.phone} onInput={set('phone')} error={errors.phone} placeholder="+60 12 345 6789" autoComplete="tel" />
      </Field>
      <StepNav lang={lang} onNext={handleNext} onBack={onBack} />
    </div>
  );
}

// ─── Step 3: Organisation ─────────────────────────────────────────────────────

function StepOrganisation({ lang, data, onNext, onBack }: { lang: Lang; data: Partial<FormData>; onNext: (d: Partial<FormData>) => void; onBack: () => void }) {
  const [fields, setFields] = useState({ orgName: data.orgName ?? '', orgType: data.orgType ?? '', ssmNumber: data.ssmNumber ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fields.orgName.trim()) e.orgName = t(lang, 'form.required');
    if (!fields.orgType) e.orgType = t(lang, 'form.required');
    return e;
  };

  const handleNext = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onNext(fields);
  };

  const set = (k: keyof typeof fields) => (e: Event) => {
    setFields(f => ({ ...f, [k]: (e.target as HTMLInputElement | HTMLSelectElement).value }));
    setErrors(er => { const n = { ...er }; delete n[k]; return n; });
  };

  useKeyEnter(handleNext);

  return (
    <div class="step-animate-enter">
      <h2 class="step-heading">{t(lang, 'form.step3.heading')}</h2>
      <Field label={t(lang, 'form.step3.orgName')} required error={errors.orgName}>
        <Input type="text" value={fields.orgName} onInput={set('orgName')} error={errors.orgName} autoFocus />
      </Field>
      <Field label={t(lang, 'form.step3.orgType')} required error={errors.orgType}>
        <Select value={fields.orgType} onChange={set('orgType')} error={errors.orgType}>
          <option value="">{t(lang, 'form.selectPlaceholder')}</option>
          {ORG_TYPES.map(k => (
            <option key={k} value={k}>{t(lang, `form.step3.orgTypes.${k}`)}</option>
          ))}
        </Select>
      </Field>
      <Field label={t(lang, 'form.step3.ssmNumber')}>
        <Input type="text" value={fields.ssmNumber} onInput={set('ssmNumber')} />
      </Field>
      <StepNav lang={lang} onNext={handleNext} onBack={onBack} />
    </div>
  );
}

// ─── Step 4: Venue ────────────────────────────────────────────────────────────

function StepVenue({ lang, data, onNext, onBack }: { lang: Lang; data: Partial<FormData>; onNext: (d: Partial<FormData>) => void; onBack: () => void }) {
  const [fields, setFields] = useState({
    venueName: data.venueName ?? '',
    venueAddress: data.venueAddress ?? '',
    state: data.state ?? '',
    capacity: data.capacity ?? '',
    screenSetup: data.screenSetup ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fields.venueAddress.trim()) e.venueAddress = t(lang, 'form.required');
    if (!fields.state) e.state = t(lang, 'form.required');
    if (!fields.capacity) e.capacity = t(lang, 'form.required');
    return e;
  };

  const handleNext = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onNext(fields);
  };

  const set = (k: keyof typeof fields) => (e: Event) => {
    setFields(f => ({ ...f, [k]: (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value }));
    setErrors(er => { const n = { ...er }; delete n[k]; return n; });
  };

  return (
    <div class="step-animate-enter">
      <h2 class="step-heading">{t(lang, 'form.step4.heading')}</h2>
      <Field label={t(lang, 'form.step4.venueName')}>
        <Input type="text" value={fields.venueName} onInput={set('venueName')} autoFocus />
      </Field>
      <Field label={t(lang, 'form.step4.venueAddress')} required error={errors.venueAddress}>
        <Textarea value={fields.venueAddress} onInput={set('venueAddress')} error={errors.venueAddress} rows={3} />
      </Field>
      <Field label={t(lang, 'form.step4.state')} required error={errors.state}>
        <Select value={fields.state} onChange={set('state')} error={errors.state}>
          <option value="">{t(lang, 'form.selectPlaceholder')}</option>
          {STATES_MS.map(k => (
            <option key={k} value={k}>{t(lang, `form.step4.states.${k}`)}</option>
          ))}
        </Select>
      </Field>
      <Field label={t(lang, 'form.step4.capacity')} required error={errors.capacity}>
        <Select value={fields.capacity} onChange={set('capacity')} error={errors.capacity}>
          <option value="">{t(lang, 'form.selectPlaceholder')}</option>
          {CAPACITIES.map(k => (
            <option key={k} value={k}>{t(lang, `form.step4.capacities.${k}`)}</option>
          ))}
        </Select>
      </Field>
      <Field label={t(lang, 'form.step4.screenSetup')}>
        <Input type="text" value={fields.screenSetup} onInput={set('screenSetup')} />
      </Field>
      <StepNav lang={lang} onNext={handleNext} onBack={onBack} />
    </div>
  );
}

// ─── Step 5: Viewing plan ─────────────────────────────────────────────────────

function StepViewingPlan({ lang, data, onNext, onBack }: { lang: Lang; data: Partial<FormData>; onNext: (d: Partial<FormData>) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string[]>(data.matchesPlanned ?? []);
  const [audience, setAudience] = useState(data.estimatedAudience ?? '');
  const [error, setError] = useState('');

  const toggle = (val: string) => {
    setSelected(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
    setError('');
  };

  const handleNext = () => {
    if (!selected.length) { setError(t(lang, 'form.required')); return; }
    onNext({ matchesPlanned: selected, estimatedAudience: audience });
  };

  return (
    <div class="step-animate-enter">
      <h2 class="step-heading">{t(lang, 'form.step5.heading')}</h2>
      <Field label={t(lang, 'form.step5.matchesPlanned')} required error={error}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
          {MATCHES.map(k => (
            <label key={k} class="form-checkbox-label">
              <input
                type="checkbox"
                checked={selected.includes(k)}
                onChange={() => toggle(k)}
              />
              <span>{t(lang, `form.step5.matches.${k}`)}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label={t(lang, 'form.step5.estimatedAudience')}>
        <Input type="text" value={audience} onInput={(e) => setAudience((e.target as HTMLInputElement).value)} />
      </Field>
      <StepNav lang={lang} onNext={handleNext} onBack={onBack} />
    </div>
  );
}

// ─── Step 6: Commercial ───────────────────────────────────────────────────────

function StepCommercial({ lang, data, onNext, onBack }: { lang: Lang; data: Partial<FormData>; onNext: (d: Partial<FormData>) => void; onBack: () => void }) {
  const [fields, setFields] = useState({
    chargesEntry: data.chargesEntry ?? '',
    sellsFnb: data.sellsFnb ?? '',
    sponsorshipInterest: data.sponsorshipInterest ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fields.chargesEntry) e.chargesEntry = t(lang, 'form.required');
    if (!fields.sellsFnb) e.sellsFnb = t(lang, 'form.required');
    return e;
  };

  const handleNext = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onNext(fields);
  };

  const RadioGroup = ({ name, value, onChange, error: err }: { name: keyof typeof fields; value: string; onChange: (v: string) => void; error?: string }) => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
      {['yes', 'no'].map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: value === opt ? 'var(--color-white)' : 'var(--color-muted)' }}>
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => { onChange(opt); setErrors(er => { const n = { ...er }; delete n[name]; return n; }); }}
            style={{ accentColor: 'var(--color-gold)' }}
          />
          {t(lang, `form.step6.${opt}`)}
        </label>
      ))}
    </div>
  );

  return (
    <div class="step-animate-enter">
      <h2 class="step-heading">{t(lang, 'form.step6.heading')}</h2>
      <Field label={t(lang, 'form.step6.chargesEntry')} required error={errors.chargesEntry}>
        <RadioGroup name="chargesEntry" value={fields.chargesEntry} onChange={v => setFields(f => ({ ...f, chargesEntry: v }))} error={errors.chargesEntry} />
      </Field>
      <Field label={t(lang, 'form.step6.sellsFnb')} required error={errors.sellsFnb}>
        <RadioGroup name="sellsFnb" value={fields.sellsFnb} onChange={v => setFields(f => ({ ...f, sellsFnb: v }))} error={errors.sellsFnb} />
      </Field>
      <Field label={t(lang, 'form.step6.sponsorshipInterest')}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          {['yes', 'no', 'more'].map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: fields.sponsorshipInterest === opt ? 'var(--color-white)' : 'var(--color-muted)' }}>
              <input
                type="radio"
                name="sponsorshipInterest"
                value={opt}
                checked={fields.sponsorshipInterest === opt}
                onChange={() => setFields(f => ({ ...f, sponsorshipInterest: opt }))}
                style={{ accentColor: 'var(--color-gold)' }}
              />
              {t(lang, `form.step6.${opt}`)}
            </label>
          ))}
        </div>
      </Field>
      <StepNav lang={lang} onNext={handleNext} onBack={onBack} />
    </div>
  );
}

// ─── Step 7: Notes ────────────────────────────────────────────────────────────

function StepNotes({ lang, data, onNext, onBack }: { lang: Lang; data: Partial<FormData>; onNext: (d: Partial<FormData>) => void; onBack: () => void }) {
  const [notes, setNotes] = useState(data.notes ?? '');

  return (
    <div class="step-animate-enter">
      <h2 class="step-heading">{t(lang, 'form.step7.heading')}</h2>
      <Field label={t(lang, 'form.step7.notes')}>
        <Textarea value={notes} onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)} rows={5} maxLength={2000} />
      </Field>
      <StepNav lang={lang} onNext={() => onNext({ notes })} onBack={onBack} />
    </div>
  );
}

// ─── Step 8: Consent ──────────────────────────────────────────────────────────

function StepConsent({ lang, data, onSubmit, onBack, cfToken, onToken }: {
  lang: Lang;
  data: Partial<FormData>;
  onSubmit: () => void;
  onBack: () => void;
  cfToken: string;
  onToken: (t: string) => void;
}) {
  const [pdpa, setPdpa] = useState(data.consentPdpa ?? false);
  const [compliance, setCompliance] = useState(data.consentCompliance ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const widgetRef = useRef<HTMLDivElement>(null);
  const privacyHref = `/${lang}/privacy`;

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (widgetRef.current && (window as any).turnstile) {
        (window as any).turnstile.render(widgetRef.current, {
          sitekey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
          callback: (token: string) => onToken(token),
          'error-callback': () => onToken(''),
          theme: 'dark',
        });
      }
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, []);

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!pdpa) e.pdpa = t(lang, 'form.required');
    if (!compliance) e.compliance = t(lang, 'form.required');
    if (!cfToken) e.turnstile = t(lang, 'form.errorTurnstile');
    if (Object.keys(e).length) { setErrors(e); return; }
    onSubmit();
  };

  return (
    <div class="step-animate-enter">
      <h2 class="step-heading">{t(lang, 'form.step8.heading')}</h2>

      <Field label="" error={errors.pdpa}>
        <label class="form-checkbox-label">
          <input type="checkbox" checked={pdpa} onChange={(e) => { setPdpa((e.target as HTMLInputElement).checked); setErrors(er => ({ ...er, pdpa: '' })); }} />
          <span>
            {t(lang, 'form.step8.consentPdpa')}{' '}
            <a href={privacyHref} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              {t(lang, 'form.step8.privacyLink')}
            </a>
          </span>
        </label>
      </Field>

      <Field label="" error={errors.compliance}>
        <label class="form-checkbox-label">
          <input type="checkbox" checked={compliance} onChange={(e) => { setCompliance((e.target as HTMLInputElement).checked); setErrors(er => ({ ...er, compliance: '' })); }} />
          <span>{t(lang, 'form.step8.consentCompliance')}</span>
        </label>
      </Field>

      {/* Turnstile widget */}
      <div style={{ margin: '1.5rem 0' }}>
        <p style={{ fontFamily: 'var(--font-eyebrow)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Security verification
        </p>
        <div ref={widgetRef} />
        {errors.turnstile && <p class="form-error" style={{ marginTop: '0.5rem' }}>{errors.turnstile}</p>}
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={onBack} class="btn-ghost" style={{ fontSize: '0.75rem' }}>
          {t(lang, 'form.back')}
        </button>
        <button type="button" onClick={handleSubmit} class="btn-primary" style={{ flex: 1 }}>
          {t(lang, 'form.step8.submit')}
        </button>
      </div>
    </div>
  );
}

// ─── Step 9: Success ──────────────────────────────────────────────────────────

function StepSuccess({ lang, referenceId }: { lang: Lang; referenceId: string }) {
  const whatsappNumber = (import.meta.env.PUBLIC_WHATSAPP_NUMBER as string) || '';
  const waMessage = encodeURIComponent(t(lang, 'whatsapp.prefilledMessage'));
  const waHref = `https://wa.me/${whatsappNumber}?text=${waMessage}`;

  return (
    <div class="step-animate-enter" style={{ textAlign: 'center', padding: '2rem 0' }}>
      <div style={{ width: '56px', height: '56px', background: 'var(--color-gold-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--color-gold)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.75rem', color: 'var(--color-white)' }}>
        {t(lang, 'form.step9.headline')}
      </h2>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto 2rem', lineHeight: '1.65' }}>
        {t(lang, 'form.step9.body')}
      </p>
      <div style={{ background: 'var(--color-navy-light)', border: '1px solid var(--color-border-gold)', padding: '1rem 1.5rem', borderRadius: '2px', marginBottom: '2rem', display: 'inline-block' }}>
        <p style={{ fontFamily: 'var(--font-eyebrow)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
          {t(lang, 'form.step9.refLabel')}
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--color-gold)', letterSpacing: '0.05em', fontWeight: 700 }}>
          {referenceId}
        </p>
      </div>
      <div>
        <a href={waHref} target="_blank" rel="noopener noreferrer" class="btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          {t(lang, 'form.step9.whatsappCta')}
        </a>
      </div>
    </div>
  );
}

// ─── Navigation buttons ───────────────────────────────────────────────────────

function StepNav({ lang, onNext, onBack }: { lang: Lang; onNext: () => void; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
      <button type="button" onClick={onBack} class="btn-ghost" style={{ fontSize: '0.75rem' }}>
        {t(lang, 'form.back')}
      </button>
      <button type="button" onClick={onNext} class="btn-primary" style={{ flex: 1 }}>
        {t(lang, 'form.next')}
      </button>
    </div>
  );
}

// ─── Enter key hook ───────────────────────────────────────────────────────────

function useKeyEnter(handler: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) handler();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler]);
}

// ─── Session storage (no PII) ─────────────────────────────────────────────────

const STORAGE_KEY = 'tsa-form-draft';
const PII_FIELDS = ['email', 'phone', 'ssmNumber'] as const;

function saveDraft(step: number, data: Partial<FormData>) {
  try {
    const safe = { ...data };
    for (const f of PII_FIELDS) delete safe[f as keyof FormData];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data: safe }));
  } catch {}
}

function loadDraft(): { step: number; data: Partial<FormData> } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearDraft() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

// ─── Main form component ──────────────────────────────────────────────────────

export default function RegistrationForm({ lang }: Props) {
  const draft = loadDraft();
  const [step, setStep] = useState(draft?.step ?? 0);
  const [formData, setFormData] = useState<Partial<FormData>>(draft?.data ?? {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [cfToken, setCfToken] = useState('');

  // Save draft on data/step change (no PII)
  useEffect(() => {
    if (step > 0 && step < TOTAL_STEPS + 1) saveDraft(step, formData);
  }, [step, formData]);

  // Clear draft on tab close
  useEffect(() => {
    const handler = () => clearDraft();
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, []);

  const next = useCallback((stepData: Partial<FormData> = {}) => {
    setFormData(prev => ({ ...prev, ...stepData }));
    setStep(s => s + 1);
    setError('');
  }, []);

  const back = useCallback(() => setStep(s => Math.max(0, s - 1)), []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const payload = {
        ...formData,
        consentPdpa: true,
        consentCompliance: true,
        cfTurnstileToken: cfToken,
        websiteUrl: '',
        lang,
      };

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { ok: boolean; referenceId?: string; code?: string };

      if (!res.ok) {
        if (json.code === 'RATE_LIMITED') setError(t(lang, 'form.errorRateLimit'));
        else setError(t(lang, 'form.errorGeneric'));
        return;
      }

      clearDraft();
      setReferenceId(json.referenceId ?? '');
      setStep(TOTAL_STEPS + 1);
    } catch {
      setError(t(lang, 'form.errorNetwork'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showProgress = step > 0 && step <= TOTAL_STEPS;

  return (
    <section id="register" style={{ padding: '6rem 0', background: 'var(--color-navy)' }}>
      <div class="section-inner">
        {step === 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <p class="eyebrow reveal" style={{ marginBottom: '0.75rem' }}>{t(lang, 'compliance.badge')}</p>
            <h2 class="heading-accent reveal" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
              {t(lang, 'form.sectionHeading')}
            </h2>
          </div>
        )}

        <div style={{ maxWidth: '680px', margin: '0 auto', background: 'var(--color-navy-mid)', border: '1px solid var(--color-border-gold)', padding: 'clamp(1.5rem, 4vw, 2.5rem)', borderRadius: '2px', boxShadow: '0 0 60px rgba(201,168,76,0.04)' }}>
          {showProgress && <ProgressBar step={step} total={TOTAL_STEPS} lang={lang} />}

          {/* Honeypot (hidden) */}
          <input
            type="text"
            name="website_url"
            value=""
            style={{ display: 'none' }}
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
          />

          {step === 0 && <StepWelcome lang={lang} onNext={() => next()} />}
          {step === 1 && <StepAboutYou lang={lang} data={formData} onNext={next} onBack={back} />}
          {step === 2 && <StepOrganisation lang={lang} data={formData} onNext={next} onBack={back} />}
          {step === 3 && <StepVenue lang={lang} data={formData} onNext={next} onBack={back} />}
          {step === 4 && <StepViewingPlan lang={lang} data={formData} onNext={next} onBack={back} />}
          {step === 5 && <StepCommercial lang={lang} data={formData} onNext={next} onBack={back} />}
          {step === 6 && <StepNotes lang={lang} data={formData} onNext={next} onBack={back} />}
          {step === 7 && (
            <StepConsent
              lang={lang}
              data={formData}
              onSubmit={isSubmitting ? () => {} : handleSubmit}
              onBack={back}
              cfToken={cfToken}
              onToken={setCfToken}
            />
          )}
          {step === TOTAL_STEPS + 1 && <StepSuccess lang={lang} referenceId={referenceId} />}

          {isSubmitting && (
            <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
              {t(lang, 'form.step8.submitting')}
            </div>
          )}

          {error && (
            <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '2px', color: '#f87171', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .step-heading {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(1.2rem, 3vw, 1.5rem);
          color: var(--color-white);
          margin-bottom: 1.5rem;
        }
      `}</style>
    </section>
  );
}
