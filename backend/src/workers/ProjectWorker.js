import { projectQueue } from '../config/queue.js';
import Account from '../models/Account.js';
import Project from '../models/Project.js';
import Job from '../models/Job.js';
import { ProjectManager } from '../utils/project-manager.js';
import { io } from '../app.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

projectQueue.process(async (job) => {
  const { accountId, projectsPerAccount } = job.data;

  const jobRecord = await Job.create({
    jobType: 'CREATE_PROJECT',
    status: 'processing',
    data: job.data,
    accountId
  });

  try {
    const account = await Account.findOne({ accountId });
    if (!account) throw new Error('Account not found');
    if (!account.sessionCookie) throw new Error('Session cookie not found');

    const manager = new ProjectManager(account.sessionCookie);
    const created = [];

    for (let i = 0; i < projectsPerAccount; i++) {
      const index = account.projects.length + 1;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const projectName = `Whisk Auto - ${account.email} - P${index} - ${timestamp}`;

      try {
        const workflowId = await manager.createProject(projectName);

        const project = await Project.create({
          projectId: workflowId,
          accountId,
          projectName,
          workflowId
        });

        account.projects.push(workflowId);
        created.push(workflowId);

        const progress = Math.round(((i + 1) / projectsPerAccount) * 100);
        job.progress(progress);
        io.emit('job:progress', { jobId: jobRecord._id, progress });

        await delay(1000);
      } catch (error) {
        console.error(`Failed to create project ${index}: ${error.message}`);
      }
    }

    await account.save();

    jobRecord.status = 'completed';
    jobRecord.progress = 100;
    jobRecord.result = { created, count: created.length };
    await jobRecord.save();

    io.emit('job:completed', { jobId: jobRecord._id, result: jobRecord.result });
    return { success: true, created };
  } catch (error) {
    jobRecord.status = 'failed';
    jobRecord.error = error.message;
    await jobRecord.save();

    io.emit('job:failed', { jobId: jobRecord._id, error: error.message });
    throw error;
  }
});

console.log('✓ ProjectWorker started');