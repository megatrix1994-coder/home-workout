import { Route, Routes } from 'react-router-dom';
import { RequireAdmin, RequireUser } from './auth';
import { Layout } from './components/Layout';
import { AcceptInvitePage, ResetPasswordPage } from './pages/AccessLinkPages';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MusclesPage } from './pages/MusclesPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NutritionPage } from './pages/NutritionPage';
import { StretchesPage } from './pages/StretchesPage';
import { WorkoutBuilderPage } from './pages/WorkoutBuilderPage';
import { WorkoutPage } from './pages/WorkoutPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/reset/:token" element={<ResetPasswordPage />} />
        <Route element={<RequireUser />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/workouts/new" element={<WorkoutBuilderPage />} />
          <Route path="/workouts/:id" element={<WorkoutPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/muscles" element={<MusclesPage />} />
          <Route path="/stretches" element={<StretchesPage />} />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/exercises/:slug" element={<ExerciseDetailPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
