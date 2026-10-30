/** Main application router */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DeviceProvider, useDevice } from '@/context/DeviceContext';
import { SyncProvider } from '@/context/SyncContext';
import { AppLayout } from '@/components/AppLayout';

// Screens
import { SetupScreen }                  from '@/screens/SetupScreen';
import { DashboardScreen }              from '@/screens/DashboardScreen';
import { PatientsScreen }               from '@/screens/PatientsScreen';
import { PatientRegistrationScreen }    from '@/screens/PatientRegistrationScreen';
import { PatientProfileScreen }         from '@/screens/PatientProfileScreen';
import { ConsultationEditorScreen }     from '@/screens/ConsultationEditorScreen';
import { ConsultationDetailScreen }     from '@/screens/ConsultationDetailScreen';
import { SyncCenterScreen }             from '@/screens/SyncCenterScreen';
import { ConflictResolutionScreen }     from '@/screens/ConflictResolutionScreen';
import { SettingsScreen }               from '@/screens/SettingsScreen';

/** Gate: redirect to /setup until device is provisioned */
function RequireDevice({ children }: { children: React.ReactNode }) {
  const { isLoading, isSetupComplete } = useDevice();
  if (isLoading) return <AppLoader />;
  if (!isSetupComplete) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

function AppLoader() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-sky-400 animate-pulse" />
        <p className="text-slate-400 text-sm">Loading RuralCare…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Setup — no auth required */}
      <Route path="/setup" element={<SetupScreen />} />

      {/* Protected routes inside AppLayout */}
      <Route element={
        <RequireDevice>
          <AppLayout />
        </RequireDevice>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"            element={<DashboardScreen />} />
        <Route path="/patients"             element={<PatientsScreen />} />
        <Route path="/patients/new"         element={<PatientRegistrationScreen />} />
        <Route path="/patients/:id"         element={<PatientProfileScreen />} />
        <Route path="/patients/:id/edit"    element={<PatientRegistrationScreen />} />
        <Route path="/consultations"        element={<Navigate to="/patients" replace />} />
        <Route path="/consultations/new"    element={<ConsultationEditorScreen />} />
        <Route path="/consultations/:id"    element={<ConsultationDetailScreen />} />
        <Route path="/consultations/:id/edit" element={<ConsultationEditorScreen />} />
        <Route path="/sync"                 element={<SyncCenterScreen />} />
        <Route path="/conflicts/:id"        element={<ConflictResolutionScreen />} />
        <Route path="/settings"             element={<SettingsScreen />} />
        <Route path="*"                     element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

import { ToastProvider } from '@/context/ToastContext';
import { ToastContainer } from '@/components/ToastContainer';

export function App() {
  return (
    <BrowserRouter>
      <DeviceProvider>
        <SyncProvider>
          <ToastProvider>
            <AppRoutes />
            <ToastContainer />
          </ToastProvider>
        </SyncProvider>
      </DeviceProvider>
    </BrowserRouter>
  );
}

