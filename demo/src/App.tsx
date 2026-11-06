import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Reconciliations from './pages/Reconciliations';
import ReconciliationWorkspace from './pages/ReconciliationWorkspace';
import ExceptionQueue from './pages/ExceptionQueue';
import ImportEngine from './pages/ImportEngine';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#1E1E38',
            border: '1px solid #3D3D60',
            color: '#F1F5F9',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reconciliations" element={<Reconciliations />} />
          <Route path="reconciliations/:id" element={<ReconciliationWorkspace />} />
          <Route path="exceptions" element={<ExceptionQueue />} />
          <Route path="import" element={<ImportEngine />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-text-secondary">
      <span className="text-6xl font-bold text-border-strong">404</span>
      <p className="text-lg">Page not found</p>
      <a href="/dashboard" className="btn-primary">Return to Dashboard</a>
    </div>
  );
}
