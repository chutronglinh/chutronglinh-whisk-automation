import { useEffect, useState } from 'react';
import { Activity, Users, Folder, Image } from 'lucide-react';
import { accountsAPI, projectsAPI, imagesAPI, jobsAPI } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ accounts: 0, projects: 0, images: 0, jobs: {} });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [accounts, projects, images, jobs] = await Promise.all([
        accountsAPI.getAll(),
        projectsAPI.getAll(),
        imagesAPI.getAll(),
        jobsAPI.getStats()
      ]);

      setStats({
        accounts: accounts.data.data.length,
        projects: projects.data.data.length,
        images: images.data.data.length,
        jobs: jobs.data.data.byStatus || {}
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Users} label="Accounts" value={stats.accounts} color="blue" />
        <StatCard icon={Folder} label="Projects" value={stats.projects} color="green" />
        <StatCard icon={Image} label="Images" value={stats.images} color="purple" />
        <StatCard icon={Activity} label="Jobs Running" value={stats.jobs.processing || 0} color="orange" />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Job Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.jobs.pending || 0}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.jobs.processing || 0}</div>
            <div className="text-sm text-gray-600">Processing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.jobs.completed || 0}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.jobs.failed || 0}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`${colors[color]} p-3 rounded-lg`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
}