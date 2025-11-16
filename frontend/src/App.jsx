import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Users, Zap } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Generate from './pages/Generate';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/generate" element={<Generate />} />
          </Routes>
        </main>
      </div>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

function Sidebar() {
  const nav = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/accounts', icon: Users, label: 'Accounts' },
    { path: '/generate', icon: Zap, label: 'Generate' }
  ];

  return (
    <div className="w-64 bg-gray-900 text-white">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Whisk Auto</h1>
      </div>
      <nav className="mt-6">
        {nav.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center px-6 py-3 hover:bg-gray-800 transition"
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}