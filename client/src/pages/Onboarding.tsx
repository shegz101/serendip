import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
import { TextArea, Input } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';
import { saveSession, generateTag } from '../lib/session';
import { api } from '../lib/api';
import type { Role, Intent, SerendipEvent } from '../lib/types';

const ROLES: Role[] = ['Founder', 'Engineer', 'Designer', 'Recruiter', 'VC', 'Speaker', 'Other'];
const INTENTS: Intent[] = [
  'Hiring', 'Job hunting', 'Find a co-founder', 'Raise money',
  'Get feedback', 'Learn', 'Meet potential customers', 'Share knowledge',
];
const PROFILE_STEPS = ['Who are you?', 'Why are you here?', 'What can you give?', 'What do you need?'];
const PROFILE_HINTS = [
  'Quick intro — no passwords, ever.',
  'Pick everything that applies. This is your intent profile.',
  'What unique value can you offer someone today?',
  'Be specific — the more specific, the better the match.',
];

const THEME_BORDERS: Record<string, string> = {
  JavaScript: 'border-yellow-500/30 hover:border-yellow-400/50',
  React: 'border-cyan-500/30 hover:border-cyan-400/50',
  Hackathon: 'border-brand-500/30 hover:border-brand-400/50',
};

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: '12px',
  padding: '10px 14px',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledEventId = searchParams.get('eventId');

  const [selectedEvent, setSelectedEvent] = useState<SerendipEvent | null>(null);
  const [events, setEvents] = useState<SerendipEvent[]>([]);
  const [eventCode, setEventCode] = useState('');
  const [eventCodeError, setEventCodeError] = useState('');
  const [eventCodeLoading, setEventCodeLoading] = useState(false);

  useEffect(() => {
    if (prefilledEventId) {
      api.getEvent(prefilledEventId).then(setSelectedEvent).catch(() => {});
    } else {
      api.listEvents().then(setEvents).catch(() => {});
    }
  }, [prefilledEventId]);

  const hasEventStep = !prefilledEventId;
  const STEPS = hasEventStep ? ['Choose your event', ...PROFILE_STEPS] : PROFILE_STEPS;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const TIME_SLOTS = ['Morning (9–12)', 'Midday (12–14)', 'Afternoon (14–17)', 'Evening (17+)', 'Anytime'];

  const [form, setForm] = useState({
    name: '',
    company: '',
    role: '' as Role | '',
    intent: [] as Intent[],
    available_times: [] as string[],
    give_text: '',
    need_text: '',
  });

  const toggleTime = (slot: string) =>
    setForm((f) => ({
      ...f,
      available_times: f.available_times.includes(slot)
        ? f.available_times.filter((t) => t !== slot)
        : [...f.available_times, slot],
    }));

  const set = (key: keyof typeof form, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const profileStep = hasEventStep ? step - 1 : step;
  const isLastStep = step === STEPS.length - 1;

  const canProceed = () => {
    if (hasEventStep && step === 0) return !!selectedEvent;
    if (profileStep === 0) return !!(form.name.trim() && form.role);
    if (profileStep === 1) return form.intent.length > 0;
    if (profileStep === 2) return form.give_text.trim().length >= 5;
    if (profileStep === 3) return form.need_text.trim().length >= 5;
    return true;
  };

  const handleCodeLookup = async () => {
    if (!eventCode.trim()) return;
    setEventCodeLoading(true);
    setEventCodeError('');
    try {
      const event = await api.getEventByCode(eventCode.trim().toUpperCase());
      setSelectedEvent(event);
    } catch {
      setEventCodeError('Event not found. Double-check the code.');
    } finally {
      setEventCodeLoading(false);
    }
  };

  const handleNext = async () => {
    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }
    if (!selectedEvent) {
      setError('No event selected. Please go back and choose an event.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const tag = generateTag(form.name);
      const attendee = await api.register({
        event_id: selectedEvent.id,
        name: form.name,
        company: form.company || 'Independent',
        role: form.role as Role,
        bio: '',
        intent: form.intent,
        give_text: form.give_text,
        need_text: form.need_text,
        available_times: form.available_times,
        tag,
      });
      saveSession({
        userId: attendee.id,
        eventId: selectedEvent.id,
        tag,
        name: form.name,
        eventName: selectedEvent.name,
      });
      navigate('/matches');
    } catch (e: unknown) {
      setError((e as Error).message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-brand-500/10 blur-[100px]" />
      </div>

      <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow-sm">
          <span className="text-white text-sm font-bold">S</span>
        </div>
        <span className="font-bold text-lg">Serendip</span>
      </button>

      {selectedEvent && (
        <div className="mb-5 flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/25 bg-brand-500/8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-spark animate-pulse" />
          <span className="text-xs text-brand-300 font-medium">{selectedEvent.name}</span>
        </div>
      )}

      <div className="w-full max-w-md relative z-10">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-brand-400' : i < step ? 'w-4 bg-brand-600' : 'w-4 bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="glass-card p-8 shadow-card animate-fade-up">
          <div className="section-label mb-2">{`Step ${step + 1} of ${STEPS.length}`}</div>
          <h2 className="text-2xl font-bold mb-1">{STEPS[step]}</h2>
          <p className="text-white/40 text-sm mb-8">
            {hasEventStep && step === 0
              ? "Pick the event you're attending right now."
              : PROFILE_HINTS[profileStep]}
          </p>

          {/* ── Event selection step ── */}
          {hasEventStep && step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-white/60 mb-2 font-medium">Have a join code?</label>
                <div className="flex gap-2">
                  <Input
                    value={eventCode}
                    onChange={(e) => {
                      setEventCode((e.value ?? '').toUpperCase());
                      setEventCodeError('');
                      if (selectedEvent) setSelectedEvent(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCodeLookup()}
                    placeholder="e.g. JSNAT26"
                    style={{
                      ...inputStyle,
                      flex: 1,
                      fontFamily: 'monospace',
                      letterSpacing: '0.12em',
                    }}
                  />
                  <button
                    onClick={handleCodeLookup}
                    disabled={eventCodeLoading || !eventCode.trim()}
                    className="btn-primary px-4 text-sm whitespace-nowrap"
                  >
                    {eventCodeLoading ? '…' : 'Find'}
                  </button>
                </div>
                {eventCodeError && (
                  <p className="text-xs text-danger mt-1.5">{eventCodeError}</p>
                )}
              </div>

              {selectedEvent && (
                <div className="flex items-center gap-3 bg-brand-500/10 border border-brand-500/25 rounded-xl px-4 py-3 animate-fade-in">
                  <span className="text-brand-400 text-lg">✓</span>
                  <div>
                    <div className="text-sm font-semibold">{selectedEvent.name}</div>
                    <div className="text-xs text-white/40">{selectedEvent.location}</div>
                  </div>
                </div>
              )}

              {events.length > 0 && (
                <div>
                  <div className="text-xs text-white/30 mb-3 text-center">— or pick from active events —</div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {events.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => { setSelectedEvent(ev); setEventCode(''); setEventCodeError(''); }}
                        className={`w-full text-left glass-card p-3 border transition-all duration-150 ${
                          selectedEvent?.id === ev.id
                            ? 'border-brand-500/40 bg-brand-500/5'
                            : (THEME_BORDERS[ev.theme || ''] || 'border-white/10 hover:border-white/20')
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{ev.name}</div>
                            <div className="text-xs text-white/40 mt-0.5">
                              {ev.location} · {ev.join_code}
                            </div>
                          </div>
                          <div className="text-xs text-white/30 text-right flex-shrink-0">
                            {ev.attendeeCount ?? 0} joined
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Profile steps ── */}
          {profileStep === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-white/60 mb-2 font-medium">Your name</label>
                <Input
                  value={form.name}
                  onChange={(e) => set('name', e.value)}
                  placeholder="e.g. Maya Chen"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2 font-medium">Company / affiliation</label>
                <Input
                  value={form.company}
                  onChange={(e) => set('company', e.value)}
                  placeholder="e.g. Vercel, Freelance, Stealth"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2 font-medium">Your role</label>
                <DropDownList
                  data={ROLES}
                  value={form.role || null}
                  onChange={(e) => set('role', e.value)}
                  defaultItem="Select your role"
                  style={{ width: '100%', borderRadius: '12px' }}
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2 font-medium">
                  When are you free to meet? <span className="text-white/30 font-normal">(pick all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const active = form.available_times.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleTime(slot)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150 ${
                          active
                            ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                            : 'bg-white/[0.04] border-white/10 text-white/45 hover:border-white/25'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {profileStep === 1 && (
            <div>
              <label className="block text-sm text-white/60 mb-2 font-medium">Why are you at this event?</label>
              <MultiSelect
                data={INTENTS}
                value={form.intent}
                onChange={(e) => set('intent', e.value)}
                placeholder="Select all that apply..."
                style={{ width: '100%', borderRadius: '12px' }}
              />
              {form.intent.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {form.intent.map((i) => (
                    <span key={i} className="tag">{i}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {profileStep === 2 && (
            <div>
              <label className="block text-sm text-white/60 mb-2 font-medium">One thing you can give</label>
              <TextArea
                value={form.give_text}
                onChange={(e) => set('give_text', e.value)}
                placeholder={`"I can intro you to anyone at Vercel"\n"I review pitch decks and give real feedback"\n"5 years of auth infra experience"`}
                rows={4}
                style={{ ...inputStyle, resize: 'none' }}
              />
              <p className="text-xs text-white/25 mt-2">Min 5 characters · Be as specific as possible</p>
            </div>
          )}

          {profileStep === 3 && (
            <div>
              <label className="block text-sm text-white/60 mb-2 font-medium">One thing you need</label>
              <TextArea
                value={form.need_text}
                onChange={(e) => set('need_text', e.value)}
                placeholder={`"I need a technical co-founder (auth infra background)"\n"Looking for seed investors who understand dev tools"\n"Introductions to engineering leaders at scale-ups"`}
                rows={4}
                style={{ ...inputStyle, resize: 'none' }}
              />
              <p className="text-xs text-white/25 mt-2">Min 5 characters · Specificity = better matches</p>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-danger bg-danger/10 px-4 py-3 rounded-xl">{error}</p>
          )}

          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="btn-ghost px-5 py-2.5 text-sm"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}
            <Button
              themeColor="primary"
              onClick={handleNext}
              disabled={!canProceed() || loading}
              style={{ borderRadius: '12px', padding: '10px 28px', fontWeight: 600 }}
            >
              {loading ? 'Setting up…' : isLastStep ? 'Find my matches →' : 'Next →'}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          No account needed. Your unique tag is generated automatically.
        </p>
      </div>
    </div>
  );
}
