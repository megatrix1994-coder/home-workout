import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { HomePage } from './pages/HomePage';
import { MusclesPage } from './pages/MusclesPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/muscles" element={<MusclesPage />} />
        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/exercises/:slug" element={<ExerciseDetailPage />} />
      </Route>
    </Routes>
  );
}
