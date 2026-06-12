import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getSession } from './lib/session';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Matches from './pages/Matches';
import Browse from './pages/Browse';
import Dashboard from './pages/Dashboard';
import EventCreate from './pages/EventCreate';

function RequireSession({ children }: { children: React.ReactNode }) {
  const session = getSession();
  return session ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/event/create" element={<EventCreate />} />
        <Route path="/dashboard/:eventId" element={<Dashboard />} />
        <Route
          path="/matches"
          element={
            <RequireSession>
              <Matches />
            </RequireSession>
          }
        />
        <Route
          path="/browse"
          element={
            <RequireSession>
              <Browse />
            </RequireSession>
          }
        />
        {/* Legacy redirect */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
