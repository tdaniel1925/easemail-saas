'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenantStore } from '@/lib/store';
import { generateTenantId } from '@/lib/utils';
import { Puzzle, ArrowRight, Zap, Shield, Globe } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { tenantId, setTenant } = useTenantStore();

  const handleGetStarted = () => {
    if (!tenantId) {
      const newTenantId = generateTenantId();
      setTenant(newTenantId, 'My Organization');
    }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-brand-900 to-gray-900">
      {/* Header */}
      <header className="px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <Puzzle className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl">BotMakers MCP</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-gray-300 hover:text-white text-sm">
              Features
            </a>
            <a href="#pricing" className="text-gray-300 hover:text-white text-sm">
              Pricing
            </a>
            <button
              onClick={handleGetStarted}
              className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-brand-900/50 border border-brand-500/30 rounded-full px-4 py-1.5 mb-8">
            <Zap className="w-4 h-4 text-brand-400" />
            <span className="text-brand-300 text-sm">25+ integrations available</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Connect AI Agents to
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">
              Your Business Tools
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            One MCP server for all your integrations. Connect Claude, ChatGPT, and custom AI agents
            to Gmail, Slack, HubSpot, Salesforce, and 25+ more tools through a single API.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors flex items-center gap-2"
            >
              Start Free <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#demo"
              className="border border-gray-700 hover:border-gray-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
            >
              View Demo
            </a>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mt-32">
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
            <div className="w-12 h-12 bg-brand-600/20 rounded-xl flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-brand-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">25+ Integrations</h3>
            <p className="text-gray-400">
              Email, CRM, project management, voice AI, legal tools, and more. All through one unified API.
            </p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Easy Setup</h3>
            <p className="text-gray-400">
              Connect apps in seconds with OAuth. No coding required. Just point your AI agent to your MCP URL.
            </p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
            <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Enterprise Ready</h3>
            <p className="text-gray-400">
              Rate limiting, usage tracking, API key management, and audit logs. Built for teams.
            </p>
          </div>
        </div>

        {/* Integration logos placeholder */}
        <div className="mt-32 text-center">
          <p className="text-gray-500 text-sm mb-8">WORKS WITH YOUR FAVORITE TOOLS</p>
          <div className="flex items-center justify-center gap-8 flex-wrap opacity-60">
            {['Gmail', 'Slack', 'HubSpot', 'Notion', 'Salesforce', 'GitHub', 'Stripe'].map((name) => (
              <div key={name} className="text-white font-medium">{name}</div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
