import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">Task Master</h1>
        <p className="text-xl text-gray-600">
          AI-powered task management and project planning
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">📋 Manage Tasks</h2>
          <p className="text-gray-700 mb-4">
            View, create, and organize your tasks with powerful filtering and status tracking.
          </p>
          <Link
            href="/tasks"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            View Tasks
          </Link>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">🤖 Generate from PRD</h2>
          <p className="text-gray-700 mb-4">
            Submit a Product Requirements Document and let AI generate a complete task breakdown.
          </p>
          <Link
            href="/prd"
            className="inline-block bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Submit PRD
          </Link>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-3xl font-semibold mb-6 text-center">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-semibold mb-2">Task Prioritization</h3>
            <p className="text-gray-600">
              Organize tasks by priority and status to focus on what matters most.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">Complexity Analysis</h3>
            <p className="text-gray-600">
              AI-powered analysis to understand task complexity and get recommendations.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🔗</div>
            <h3 className="font-semibold mb-2">Dependency Tracking</h3>
            <p className="text-gray-600">
              Manage task dependencies to ensure proper execution order.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="font-semibold mb-2">Task Expansion</h3>
            <p className="text-gray-600">
              Automatically generate subtasks with AI to break down complex work.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="font-semibold mb-2">Smart PRD Processing</h3>
            <p className="text-gray-600">
              Convert product requirements into actionable tasks instantly.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">📈</div>
            <h3 className="font-semibold mb-2">Progress Tracking</h3>
            <p className="text-gray-600">
              Monitor task completion and project progress at a glance.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <h3 className="text-2xl font-semibold mb-4">Ready to get started?</h3>
        <div className="space-x-4">
          <Link
            href="/tasks"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 text-lg"
          >
            Manage Tasks
          </Link>
          <Link
            href="/prd"
            className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 text-lg"
          >
            Submit PRD
          </Link>
        </div>
      </div>
    </div>
  );
}
