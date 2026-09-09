import { Suspense, lazy } from 'react';
import Header from './ui/Header';
import SidePanel from './ui/SidePanel';
import Timeline from './ui/Timeline';

// The three.js scene is the heaviest chunk; load it after the shell paints.
const Globe = lazy(() => import('./scene/Globe'));
const EventMarkers = lazy(() => import('./scene/EventMarkers'));

export default function App() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-muted)]" data-testid="globe-loading">
            Loading globe…
          </div>
        }
      >
        <Globe>
          <EventMarkers />
        </Globe>
      </Suspense>
      <Header />
      <SidePanel />
      <Timeline />
    </div>
  );
}
