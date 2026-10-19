import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useStore, applyAppearance } from '@/lib/store';
import { ACCENTS } from '@/lib/types';

/** First open. Three small questions, then it is theirs. */
export default function Welcome() {
  const setProfile = useStore((s) => s.setProfile);
  const profile = useStore((s) => s.profile);
  const [name, setName] = useState('');
  const [spaceName, setSpaceName] = useState('');
  const [accent, setAccent] = useState(profile.accent);
  const [step, setStep] = useState(0);

  const finish = () => {
    const n = name.trim();
    const patch = {
      name: n,
      spaceName: spaceName.trim() || (n ? `${n}'s space` : 'My space'),
      accent,
      onboarded: true,
    };
    setProfile(patch);
    applyAppearance({ ...profile, ...patch });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm fade-in" key={step}>
        {step === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(1);
            }}
          >
            <p className="font-serif italic text-[20px] text-ink-2">Hi.</p>
            <h1 className="mt-2 text-[28px] font-medium tracking-tight">What should this call you?</h1>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-6 w-full h-12 px-4 rounded-xl bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[17px]"
            />
            <Next label={name.trim() ? 'Next' : 'Skip'} />
          </form>
        )}

        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
          >
            <h1 className="text-[28px] font-medium tracking-tight">Name this space.</h1>
            <p className="mt-2 text-[15px] text-ink-2">It is yours. There is no logo on it.</p>
            <input
              autoFocus
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              placeholder={name.trim() ? `${name.trim()}'s space` : 'My space'}
              className="mt-6 w-full h-12 px-4 rounded-xl bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[17px]"
            />
            <Next label="Next" />
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              finish();
            }}
          >
            <h1 className="text-[28px] font-medium tracking-tight">Pick a color.</h1>
            <p className="mt-2 text-[15px] text-ink-2">Just one. You can change it later.</p>
            <div className="mt-6 flex gap-3 flex-wrap">
              {ACCENTS.map((a) => (
                <button
                  key={a.hex}
                  type="button"
                  aria-label={a.name}
                  aria-pressed={accent === a.hex}
                  onClick={() => {
                    setAccent(a.hex);
                    document.documentElement.style.setProperty('--accent', a.hex);
                  }}
                  className={`w-11 h-11 rounded-full border-2 transition-transform ${accent === a.hex ? 'border-ink scale-110' : 'border-transparent'}`}
                  style={{ background: a.hex }}
                />
              ))}
            </div>
            <Next label="Start" />
          </form>
        )}
      </div>
    </div>
  );
}

function Next({ label }: { label: string }) {
  return (
    <button type="submit" className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ink text-paper text-[15px] font-medium">
      {label} <ArrowRight size={16} />
    </button>
  );
}
