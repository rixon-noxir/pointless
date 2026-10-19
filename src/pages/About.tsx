import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

/** The only page in the app that carries a name. Everywhere else is the person's own. */
export default function About() {
  return (
    <div className="fade-in max-w-md">
      <Link to="/you" className="inline-flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink">
        <ArrowLeft size={16} /> Back
      </Link>

      <h1 className="mt-10 text-[40px] leading-none font-medium tracking-tight">
        the pointless app
      </h1>
      <p className="mt-3 font-serif italic text-[22px] text-ink-2">Created for you. Catered for you.</p>

      <div className="mt-10 space-y-5 text-[16px] leading-relaxed text-ink-2">
        <p>
          A place for your tasks, notes, links and reminders that does not ask you to organize anything first. You drop
          things in. It sorts them. What you keep reaching for floats up. What you leave alone quietly steps aside.
        </p>
        <p>
          It is built for brains that get overwhelmed by a blank workspace with forty features. One box. One list. One open
          space to think and draw. Less time hunting for the thing. Less noise in your head. A phone that feels a little
          easier to carry.
        </p>
        <p>
          Everything stays on your device. No account, no cloud, no one watching. The only place you will see our name is
          this page.
        </p>
      </div>

      <div className="rule mt-10 pb-2" />
      <p className="mt-4 text-[14px] text-ink-3">
        From the{' '}
        <a href="https://churchofpointless.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-dashed hover:text-ink">
          Church of Pointless ↗
        </a>
        . Version 0.1.
      </p>
    </div>
  );
}
