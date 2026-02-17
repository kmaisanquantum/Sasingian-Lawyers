import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute   from './components/ProtectedRoute';

import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import Matters   from './pages/Matters';
import Trust     from './pages/Trust';
import Payroll   from './pages/Payroll';
import Staff     from './pages/Staff';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          }/>
          <Route path="/matters" element={
            <ProtectedRoute><Matters /></ProtectedRoute>
          }/>
          <Route path="/trust" element={
            <ProtectedRoute><Trust /></ProtectedRoute>
          }/>
          <Route path="/payroll" element={
            <ProtectedRoute><Payroll /></ProtectedRoute>
          }/>
          <Route path="/staff" element={
            <ProtectedRoute><Staff /></ProtectedRoute>
          }/>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
