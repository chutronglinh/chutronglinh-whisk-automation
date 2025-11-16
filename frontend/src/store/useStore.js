import { create } from 'zustand';

export const useStore = create((set) => ({
  accounts: [],
  projects: [],
  prompts: [],
  jobs: [],
  images: [],
  stats: null,

  setAccounts: (accounts) => set({ accounts }),
  setProjects: (projects) => set({ projects }),
  setPrompts: (prompts) => set({ prompts }),
  setJobs: (jobs) => set({ jobs }),
  setImages: (images) => set({ images }),
  setStats: (stats) => set({ stats }),

  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJob: (jobId, updates) => set((state) => ({
    jobs: state.jobs.map(j => j._id === jobId ? { ...j, ...updates } : j)
  }))
}));