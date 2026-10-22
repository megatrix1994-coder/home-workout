import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { HomePage } from './pages/HomePage';
import { MusclesPage } from './pages/MusclesPage';
import { WorkoutBuilderPage } from './pages/WorkoutBuilderPage';
import { WorkoutPage } from './pages/WorkoutPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/workouts/new" element={<WorkoutBuilderPage />} />
        <Route path="/workouts/:id" element={<WorkoutPage />} />
        <Route path="/muscles" element={<MusclesPage />} />
        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/exercises/:slug" element={<ExerciseDetailPage />} />
      </Route>
    </Routes>
  );
}
