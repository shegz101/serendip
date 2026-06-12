import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, TextArea } from '@progress/kendo-react-inputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Button } from '@progress/kendo-react-buttons';
import { api } from '../lib/api';
import type { SerendipEvent } from '../lib/types';

const THEMES = ['JavaScript', 'React', 'TypeScript', 'Hackathon', 'Startup', 'Design', 'AI/ML', 'Other'];
const DURATION_OPTIONS = [
  { label: '2 hours', value: 2 },
  { label: '4 hours', value: 4 },
  { label: '8 hours', value: 8 },
  { label: '1 day (24h)', value: 24 },
  { label: '2 days (48h)', value: 48 },
  { label: '3 days (72h)', value: 72 },
];

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: '12px',
  padding: '10px 14px',
};

export default function EventCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<SerendipEvent | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: '',
    organiser: '',
    company: '',
    location: '',
    description: '',
    theme: '',
    duration_hours: 24,
  });

  const set = (key: keyof typeof form, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSubmit = form.name.trim() && form.organiser.trim() && form.location.trim();

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const event = await api.createEvent(form);
      setCreated(event);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to create event. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (created) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-brand-500/12 blur-[140px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-spark/5 blur-[100px]" />
        </div>

        <div className="w-full max-w-md animate-fade-up relative z-10">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold mb-2">Event created!</h1>
            <p className="text-white/45 text-sm">{created.name} is live and ready for attendees.</p>
          </div>

          <div className="glass-card p-6 mb-5">
            <div className="section-label mb-3">Share this join code</div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 font-mono text-4xl font-bold tracking-[0.25em] text-brand-300 bg-brand-500/10 rounded-xl py-5 text-center border border-brand-500/20">
                {created.join_code}
              </div>
              <button onClick={copyCode} className="btn-ghost px-4 py-5 text-sm whitespace-nowrap">
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-white/35 text-center">
              Attendees enter this code at serendip.app to join your event.
            </p>
          </div>

          <div className="glass-card p-4 mb-5 flex items-start gap-3">
            <span className="text-lg mt-0.5">📍</span>
            <div className="text-xs text-white/50 leading-relaxed">
              <span className="font-medium text-white/70">{created.location}</span>
              {' · '}{created.duration_hours}h event
              {' · '}<span className="text-brand-400">{created.attendeeCount ?? 0} attendees so far</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/dashboard/${created.id}`)}
              className="btn-primary py-3.5 w-full font-semibold"
            >
              Open organiser dashboard →
            </button>
            <button
              onClick={() => navigate(`/onboarding?eventId=${created.id}`)}
              className="btn-ghost py-3.5 w-full"
            >
              Also join as an attendee
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-white/30 hover:text-white/60 transition-colors text-center py-2"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-brand-500/10 blur-[140px]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow-sm">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-bold">Serendip</span>
        </button>
        <div className="section-label">Create event</div>
        <div className="w-24" />
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="section-label mb-2">For organisers</div>
          <h1 className="text-3xl font-bold mb-2">Create your event</h1>
          <p className="text-white/40 text-sm">
            Attendees join using a unique 6-character code. The event auto-expires when it ends.
          </p>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 space-y-5">
            <div className="section-label">Event details</div>

            <div>
              <label className="block text-sm text-white/60 mb-2 font-medium">
                Event name <span className="text-danger">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.value)}
                placeholder="e.g. JSNation Amsterdam 2026"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-2 font-medium">
                  Your name <span className="text-danger">*</span>
                </label>
                <Input
                  value={form.organiser}
                  onChange={(e) => set('organiser', e.value)}
                  placeholder="e.g. Robin Walsh"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2 font-medium">Company / org</label>
                <Input
                  value={form.company}
                  onChange={(e) => set('company', e.value)}
                  placeholder="e.g. GitNation"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2 font-medium">
                Location <span className="text-danger">*</span>
              </label>
              <Input
                value={form.location}
                onChange={(e) => set('location', e.value)}
                placeholder="e.g. Amsterdam, Netherlands"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2 font-medium">Description</label>
              <TextArea
                value={form.description}
                onChange={(e) => set('description', e.value)}
                placeholder="What's this event about? Who attends?"
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>
          </div>

          <div className="glass-card p-6 space-y-5">
            <div className="section-label">Configuration</div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-2 font-medium">Duration</label>
                <DropDownList
                  data={DURATION_OPTIONS}
                  textField="label"
                  dataItemKey="value"
                  value={DURATION_OPTIONS.find((d) => d.value === form.duration_hours)}
                  onChange={(e) => set('duration_hours', e.value.value)}
                  style={{ width: '100%', borderRadius: '12px' }}
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2 font-medium">Theme</label>
                <DropDownList
                  data={THEMES}
                  value={form.theme || null}
                  onChange={(e) => set('theme', e.value)}
                  defaultItem="Select theme"
                  style={{ width: '100%', borderRadius: '12px' }}
                />
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-xl px-4 py-3 flex items-start gap-3 border border-white/[0.06]">
              <span className="text-xl mt-0.5">⏱</span>
              <div>
                <div className="text-xs font-semibold text-white/70 mb-0.5">Auto-expiry enabled</div>
                <div className="text-xs text-white/35">
                  Your event and all attendee data are automatically deleted when the countdown ends.
                  No manual cleanup needed.
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Button
            themeColor="primary"
            onClick={handleCreate}
            disabled={!canSubmit || loading}
            style={{ width: '100%', borderRadius: '14px', padding: '15px', fontWeight: 700, fontSize: '15px' }}
          >
            {loading ? 'Creating event…' : 'Create event & get join code →'}
          </Button>
        </div>
      </main>
    </div>
  );
}
