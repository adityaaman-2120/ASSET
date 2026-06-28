import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AnalyzePage from './pages/AnalyzePage'
import ConfirmPage from './pages/ConfirmPage'
import ResultPage from './pages/ResultPage'
import QuestionnairePage from './pages/QuestionnairePage'
import QuestionnaireResultPage from './pages/QuestionnaireResultPage'
import PortfolioDetailPage from './pages/PortfolioDetailPage'

export default function App() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const isAuth = pathname.startsWith('/auth/')

  // Cream background + ink text everywhere
  const bgStyle = { background: '#F4E1C1', color: '#0d2b2b' }

  // Auth pages and landing render their own full-screen layout; app pages get centered wrapper
  const mainClass = isLanding || isAuth
    ? 'flex-1'
    : 'flex-1 mx-auto max-w-6xl w-full px-6 py-8'

  return (
    <div className="min-h-screen flex flex-col" style={bgStyle}>
      <Navbar />
      <main className={mainClass}>
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analyze" element={<AnalyzePage />} />
              <Route path="/analyze/confirm" element={<ConfirmPage />} />
              <Route path="/analyze/result/:portfolioId" element={<ResultPage />} />
              <Route path="/questionnaire" element={<QuestionnairePage />} />
              <Route path="/questionnaire/result" element={<QuestionnaireResultPage />} />
              <Route path="/portfolio/:portfolioId" element={<PortfolioDetailPage />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
