import { Routes, Route } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import ProfileSummary from './pages/ProfileSummary'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route path="/summary" element={<ProfileSummary />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}
