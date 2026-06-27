import { Routes, Route } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import ProfileSummary from './pages/ProfileSummary'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route path="/summary" element={<ProfileSummary />} />
    </Routes>
  )
}
