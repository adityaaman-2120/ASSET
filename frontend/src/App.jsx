import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

// Import Pages
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
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-[#F9FAFB] flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-8">
        <ErrorBoundary>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />

            {/* Protected routes */}
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
