/**
 * Compact top-left overlay: site title, one-line subtitle (hidden below md)
 * and an "About & sources" popover. Pointer events are enabled only on the
 * box itself so the globe stays interactive around it.
 */
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]';

export default function Header() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Close the popover on an outside pointer press while it is open.
  useEffect(() => {
    if (!aboutOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = detailsRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) el.open = false;
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [aboutOpen]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDetailsElement>) => {
    if (e.key === 'Escape' && detailsRef.current?.open) {
      detailsRef.current.open = false;
      detailsRef.current.querySelector('summary')?.focus();
    }
  };

  return (
    <header className="pointer-events-none absolute left-0 top-0 z-20 p-3 md:p-4">
      <div className="pointer-events-auto w-[min(calc(100vw_-_24px),420px)] rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 md:px-4 md:py-3 md:backdrop-blur-md">
        <h1 className="text-[15px] font-semibold leading-tight tracking-tight text-[var(--color-text)] md:text-[17px]">
          Middle East Crisis: A Sourced 3D Timeline
        </h1>
        <p className="mt-1 hidden text-[13px] leading-snug text-[var(--color-muted)] md:block">
          1917 &ndash; 2026 &middot; every event cited &middot; terminology kept neutral
        </p>
        <details
          ref={detailsRef}
          data-testid="about"
          className="relative"
          onToggle={(e) => setAboutOpen(e.currentTarget.open)}
          onKeyDown={onKeyDown}
        >
          <summary
            className={`-ml-1 mt-0.5 inline-flex min-h-11 cursor-pointer select-none list-none items-center gap-1 rounded-md px-1 text-[13px] text-[var(--color-muted)] hover:text-[var(--color-text)] md:mt-1 md:min-h-7 ${FOCUS} [&::-webkit-details-marker]:hidden`}
          >
            About &amp; sources
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform [details[open]_&]:rotate-180"
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </summary>
          <div className="absolute left-0 top-full z-30 mt-2 w-[min(calc(100vw_-_32px),380px)] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-[14px] leading-relaxed text-[var(--color-text)] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <p>
              This site traces the Israeli&ndash;Palestinian and wider Arab&ndash;Israeli conflict from the Balfour
              Declaration of 2 November 1917 to 9 September 2026 as a scrubbable timeline on a 3D globe, with
              mandates, partition lines, armistice lines and control zones drawn for each era. Every event cites at
              least two independent sources, and summaries use descriptive rather than partisan terminology.
              Casualty figures are always attributed to the body that reported them and, where sources disagree,
              are shown side by side rather than merged. Events that could not be confirmed against two sources are
              marked unverified and hidden by default, and hand-drawn boundaries are marked approximate.
            </p>
            <p className="mt-3 text-[12px] text-[var(--color-muted)]">
              Full methodology, sourcing rules and boundary provenance are documented in the project README.
            </p>
          </div>
        </details>
      </div>
    </header>
  );
}
