import { projectQueue } from '../services/QueueService.js';
import Account from '../models/Account.js';
import Project from '../models/Project.js';
import WhiskApiService from '../services/WhiskApiService.js';
import mongoose from 'mongoose';

// Connect to MongoDB
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whisk-automation')
    .then(() => console.log('[PROJECT WORKER] ✓ MongoDB connected'))
    .catch(err => console.error('[PROJECT WORKER] ✗ MongoDB error:', err));
}

console.log('[PROJECT WORKER] Started and ready to create projects');

/**
 * Process project creation job
 * @param {Object} job - Bull job
 * @param {string} job.data.accountId - Account ID
 * @param {string} job.data.projectName - Project name
 */
const processProjectCreation = async (job) => {
  const { accountId, projectName } = job.data;
  
  console.log(`[PROJECT] Starting creation for account ${accountId}`);
  console.log(`[PROJECT] Name: ${projectName}`);

  let account;

  try {
    // Get account
    account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.sessionCookie) {
      throw new Error('Account does not have session cookie');
    }

    console.log(`[PROJECT] Account: ${account.email}`);

    // Create project via Whisk API
    console.log(`[PROJECT] Calling Whisk API...`);
    const workflowId = await WhiskApiService.createProject(
      account.sessionCookie,
      projectName
    );

    console.log(`[PROJECT] WorkflowId created: ${workflowId}`);

    // Save to database
    const project = await Project.create({
      accountId: account._id,
      workflowId: workflowId,
      name: projectName,
      status: 'active',
      metadata: {
        tool: 'BACKBONE',
        sessionId: WhiskApiService.generateSessionId()
      }
    });

    console.log(`[PROJECT] Saved to database: ${project._id}`);

    return {
      success: true,
      projectId: project._id.toString(),
      workflowId: workflowId,
      accountEmail: account.email,
      projectName: projectName
    };

  } catch (error) {
    console.error(`[PROJECT] Error for ${account?.email || accountId}:`, error.message);

    // Update account status if cookie issue
    if (error.message.includes('Authentication failed') || 
        error.message.includes('session')) {
      try {
        await Account.findByIdAndUpdate(accountId, {
          status: 'error',
          metadata: {
            ...account.metadata,
            lastError: error.message,
            lastErrorAt: new Date()
          }
        });
      } catch (dbError) {
        console.error(`[PROJECT] Failed to update account status:`, dbError.message);
      }
    }

    throw error;
  }
};

// Process queue with concurrency 2
projectQueue.process('create-project', 2, processProjectCreation);

// Queue events
projectQueue.on('completed', (job, result) => {
  console.log(`[PROJECT QUEUE] Job ${job.id} completed for ${result.accountEmail}`);
  console.log(`[PROJECT QUEUE] Project: ${result.projectName} (${result.workflowId})`);
});

projectQueue.on('failed', (job, error) => {
  console.error(`[PROJECT QUEUE] Job ${job.id} failed:`, error.message);
});

projectQueue.on('error', (error) => {
  console.error('[PROJECT QUEUE] Queue error:', error);
});

export default projectQueue;