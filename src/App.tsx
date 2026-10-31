/** Main application router with Auth & Device Security Gates */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DeviceProvider, useDevice } from '@/context/DeviceContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SyncProvider } from '@/context/SyncContext';
import { ToastProvider } from '@/context/ToastContext';
import { ToastContainer } from '@/components/ToastContainer';
import { LockScreen } from '@/components/LockScreen';
import { AppLayout } from '@/components/AppLayout';

import { ConsultationsScreen } from '@/screens/ConsultationsScreen';

// Screens
import { SetupScreen }                  from '@/screens/SetupScreen';
import { LoginScreen }                  from '@/screens/LoginScreen';
import { ForgotPasswordScreen }          from '@/screens/ForgotPasswordScreen';
import { DashboardScreen }              from '@/screens/DashboardScreen';
import { PatientsScreen }               from '@/screens/PatientsScreen';
import { PatientRegistrationScreen }    from '@/screens/PatientRegistrationScreen';
import { PatientProfileScreen }         from '@/screens/PatientProfileScreen';
import { ConsultationEditorScreen }     from '@/screens/ConsultationEditorScreen';
import { ConsultationDetailScreen }     from '@/screens/ConsultationDetailScreen';
import { SyncCenterScreen }             from '@/screens/SyncCenterScreen';
import { ConflictResolutionScreen }     from '@/screens/ConflictResolutionScreen';
import { SettingsScreen }               from '@/screens/SettingsScreen';

/** Gate: redirect to /setup if device un-enrolled, or /login if unauthenticated */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading: deviceLoading, isSetupComplete } = useDevice();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  if (deviceLoading || authLoading) return <AppLoader />;
  if (!isSetupComplete) return <Navigate to="/setup" replace />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLoader() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-100 via-sky-100 to-indigo-100 animate-pulse shadow-xl shadow-cyan-950" />
        <p className="text-slate-600 text-sm font-sans tracking-wide">Loading RuralCare Workstation…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* First-time setup & provisioning */}
      <Route path="/setup" element={<SetupScreen />} />

      {/* Clinical Station PIN Login */}
      <Route path="/login" element={<LoginScreen />} />

      {/* Forgot PIN / Password Recovery */}
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />

      {/* Protected routes inside AppLayout */}
      <Route element={
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"              element={<DashboardScreen />} />
        <Route path="/patients"               element={<PatientsScreen />} />
        <Route path="/patients/new"           element={<PatientRegistrationScreen />} />
        <Route path="/patients/:id"           element={<PatientProfileScreen />} />
        <Route path="/patients/:id/edit"      element={<PatientRegistrationScreen />} />
        <Route path="/consultations"          element={<ConsultationsScreen />} />
        <Route path="/consultations/new"      element={<ConsultationEditorScreen />} />
        <Route path="/consultations/:id"      element={<ConsultationDetailScreen />} />
        <Route path="/consultations/:id/edit" element={<ConsultationEditorScreen />} />
        <Route path="/sync"                   element={<SyncCenterScreen />} />
        <Route path="/conflicts/:id"          element={<ConflictResolutionScreen />} />
        <Route path="/settings"               element={<SettingsScreen />} />
        <Route path="*"                       element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <DeviceProvider>
        <AuthProvider>
          <SyncProvider>
            <ToastProvider>
              <AppRoutes />
              <ToastContainer />
              <LockScreen />
            </ToastProvider>
          </SyncProvider>
        </AuthProvider>
      </DeviceProvider>
    </BrowserRouter>
  );
}
