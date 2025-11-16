import Project from '../models/Project.js';
import Account from '../models/Account.js';
import { projectQueue } from '../config/queue.js';

class ProjectController {
  async getAll(req, res) {
    try {
      const projects = await Project.find().sort({ createdAt: -1 });
      res.json({ success: true, data: projects });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const project = await Project.findOne({ projectId: req.params.id });
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      res.json({ success: true, data: project });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createProjects(req, res) {
    try {
      const { accountIds, projectsPerAccount } = req.body;
      
      const jobs = [];
      for (const accountId of accountIds) {
        const account = await Account.findOne({ accountId });
        if (!account) continue;

        const job = await projectQueue.add({
          accountId,
          projectsPerAccount: projectsPerAccount || 3
        });
        jobs.push(job.id);
      }

      res.json({ 
        success: true, 
        message: `${jobs.length} project creation jobs queued`,
        jobIds: jobs
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const project = await Project.findOneAndDelete({ projectId: req.params.id });
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new ProjectController();