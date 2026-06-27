import React from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Shield, Cpu, BarChart3, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Button from '../components/Button'
import Card from '../components/Card'

export default function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div className="relative isolate overflow-hidden min-h-[85vh] flex flex-col justify-center">
      {/* Background decorations */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#00D4FF] to-[#7C3AED] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12 lg:flex lg:items-center lg:gap-x-10">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
          <div className="flex">
            <div className="relative rounded-full px-3 py-1 text-xs leading-6 text-slate-400 ring-1 ring-slate-800 hover:ring-slate-700 bg-slate-900/40">
              Introducing Quantitative AI Optimization.{' '}
              <Link to={isAuthenticated ? "/analyze" : "/auth/login"} className="font-semibold text-[#00D4FF] hover:underline">
                <span className="absolute inset-0" aria-hidden="true" />
                Analyze goal <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-6xl bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Automated Quantitative Portfolio Orchestration
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-400">
            Design, optimize, and stress-test your investment strategies. Leveraging XGBoost return predictions, Kelly position sizing, and LLM risk managers, ASSETS delivers institutional-grade portfolio design for Indian Equities.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Link to={isAuthenticated ? '/dashboard' : '/auth/login'}>
              <Button variant="primary" className="px-6 py-3 text-base">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to={isAuthenticated ? '/questionnaire' : '/auth/login'} className="text-sm font-semibold leading-6 text-slate-300 hover:text-white transition-colors">
              Try Preset Questionnaire <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card className="hover:border-slate-700 transition-all">
              <Cpu className="h-8 w-8 text-[#00D4FF] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Predictive AI</h3>
              <p className="text-sm text-slate-400">
                Walk-forward XGBoost model predicts forward returns on Nifty constituents based on technical indicators.
              </p>
            </Card>

            <Card className="hover:border-slate-700 transition-all">
              <BarChart3 className="h-8 w-8 text-[#7C3AED] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Portfolio Optimizer</h3>
              <p className="text-sm text-slate-400">
                Mean-variance optimizer combined with Kelly position sizing maps constraints and maximizes Sharpe ratio.
              </p>
            </Card>

            <Card className="hover:border-slate-700 transition-all">
              <Shield className="h-8 w-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Historical Stress Tests</h3>
              <p className="text-sm text-slate-400">
                Instantly simulate performance across major market regimes: 2008 Financial Crash, COVID-19, and 2022 corrections.
              </p>
            </Card>

            <Card className="hover:border-slate-700 transition-all">
              <TrendingUp className="h-8 w-8 text-[#00D4FF] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">SHAP Explainability</h3>
              <p className="text-sm text-slate-400">
                Demystify black-box machine learning models with TreeSHAP explanations explaining every allocation decision.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
