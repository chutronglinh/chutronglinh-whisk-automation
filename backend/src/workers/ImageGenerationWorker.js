import { imageGenerationQueue } from '../services/QueueService.js';
import Account from '../models/Account.js';
import Project from '../models/Project.js';
import Prompt from '../models/Prompt.js';
import GeneratedImage from '../models/GeneratedImage.js';
import WhiskApiService from '../services/WhiskApiService.js';
import mongoose from 'mongoose';
import fs from 'fs-extra';
import path from 'path';

// Connect to MongoDB
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whisk-automation')
    .then(() => console.log('[IMAGE WORKER] ✓ MongoDB connected'))
    .catch(err => console.error('[IMAGE WORKER] ✗ MongoDB error:', err));
}

console.log('[IMAGE WORKER] Started and ready to generate images');

// Ensure output directory exists
const OUTPUT_PATH = process.env.OUTPUT_PATH || '/opt/whisk-automation/data/output/images';
fs.ensureDirSync(OUTPUT_PATH);
console.log(`[IMAGE WORKER] Output path: ${OUTPUT_PATH}`);

/**
 * Generate filename for image
 * @param {string} accountId 
 * @param {string} promptId 
 * @param {number} index 
 * @returns {string}
 */
const generateFilename = (accountId, promptId, index) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${timestamp}_acc${accountId.slice(-6)}_prm${promptId.slice(-6)}_img${index}.jpg`;
};

/**
 * Process image generation job
 * @param {Object} job - Bull job
 */
const processImageGeneration = async (job) => {
  const { accountId, projectId, promptId, prompt, metadata } = job.data;
  
  console.log(`[IMAGE GEN] Job ${job.id} started`);
  console.log(`[IMAGE GEN] Account: ${accountId}`);
  console.log(`[IMAGE GEN] Prompt: ${prompt.substring(0, 50)}...`);

  const startTime = Date.now();
  let account, project, promptDoc;
  let generatedImageRecord;

  try {
    // Update progress
    job.progress(10);

    // Get account
    account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.sessionCookie) {
      throw new Error('Account does not have session cookie');
    }

    // Get project
    project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Get prompt if exists
    if (promptId) {
      promptDoc = await Prompt.findById(promptId);
    }

    console.log(`[IMAGE GEN] Account: ${account.email}`);
    console.log(`[IMAGE GEN] Project: ${project.name} (${project.workflowId})`);

    job.progress(20);

    // Get access token
    console.log(`[IMAGE GEN] Getting access token...`);
    const tokenResult = await WhiskApiService.getAccessToken(account.sessionCookie);

    if (!tokenResult.valid) {
      throw new Error(`Failed to get access token: ${tokenResult.error}`);
    }

    console.log(`[IMAGE GEN] Access token obtained`);
    job.progress(30);

    // Prepare generation options
    const options = {
      imageModel: metadata?.imageModel || process.env.IMAGE_MODEL || 'IMAGEN_3_5',
      aspectRatio: metadata?.aspectRatio || process.env.DEFAULT_ASPECT_RATIO || 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      mediaCategory: metadata?.mediaCategory || process.env.MEDIA_CATEGORY || 'MEDIA_CATEGORY_BOARD',
      seed: metadata?.seed || null
    };

    console.log(`[IMAGE GEN] Options:`, options);

    // Generate image
    console.log(`[IMAGE GEN] Calling Whisk API...`);
    const response = await WhiskApiService.generateImage(
      tokenResult.accessToken,
      project.workflowId,
      prompt,
      options
    );

    job.progress(60);

    // Extract images
    const base64Images = WhiskApiService.extractImages(response);
    console.log(`[IMAGE GEN] Generated ${base64Images.length} image(s)`);

    job.progress(70);

    // Save images to disk
    const savedImages = [];

    for (let i = 0; i < base64Images.length; i++) {
      const filename = generateFilename(accountId, promptId || 'custom', i + 1);
      const filepath = path.join(OUTPUT_PATH, filename);

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Images[i], 'base64');

      // Save to disk
      await fs.writeFile(filepath, buffer);

      console.log(`[IMAGE GEN] Saved: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);

      // Create database record
      generatedImageRecord = await GeneratedImage.create({
        accountId: account._id,
        projectId: project._id,
        promptId: promptId || null,
        workflowId: project.workflowId,
        prompt: prompt,
        imageUrl: `/output/images/${filename}`,
        filename: filename,
        metadata: {
          imageModel: options.imageModel,
          aspectRatio: options.aspectRatio,
          mediaCategory: options.mediaCategory,
          seed: options.seed,
          tool: 'BACKBONE',
          sessionId: WhiskApiService.generateSessionId(),
          generationTime: Date.now() - startTime
        },
        status: 'success',
        generatedAt: new Date()
      });

      savedImages.push({
        id: generatedImageRecord._id.toString(),
        filename: filename,
        url: `/output/images/${filename}`,
        size: buffer.length
      });
    }

    job.progress(90);

    // Update prompt usage
    if (promptDoc) {
      await Prompt.findByIdAndUpdate(promptId, {
        $inc: { generationCount: base64Images.length },
        lastUsed: new Date()
      });
    }

    // Update project stats
    await project.incrementImageCount();

    job.progress(100);

    const totalTime = Date.now() - startTime;
    console.log(`[IMAGE GEN] Job ${job.id} completed in ${(totalTime / 1000).toFixed(2)}s`);

    return {
      success: true,
      accountEmail: account.email,
      projectName: project.name,
      prompt: prompt.substring(0, 100),
      images: savedImages,
      totalTime: totalTime
    };

  } catch (error) {
    console.error(`[IMAGE GEN] Job ${job.id} error:`, error.message);

    // Update database with error
    if (generatedImageRecord) {
      await GeneratedImage.findByIdAndUpdate(generatedImageRecord._id, {
        status: 'failed',
        error: error.message
      });
    } else {
      // Create failed record
      try {
        await GeneratedImage.create({
          accountId: accountId,
          projectId: projectId,
          promptId: promptId || null,
          workflowId: project?.workflowId || 'unknown',
          prompt: prompt,
          imageUrl: '',
          filename: '',
          status: 'failed',
          error: error.message,
          generatedAt: new Date()
        });
      } catch (dbError) {
        console.error(`[IMAGE GEN] Failed to create error record:`, dbError.message);
      }
    }

    // Update account status if auth issue
    if (error.message.includes('Authentication') || 
        error.message.includes('access token')) {
      try {
        await Account.findByIdAndUpdate(accountId, {
          status: 'error',
          'metadata.lastError': error.message,
          'metadata.lastErrorAt': new Date()
        });
      } catch (dbError) {
        console.error(`[IMAGE GEN] Failed to update account:`, dbError.message);
      }
    }

    throw error;
  }
};

// Process queue
const concurrency = parseInt(process.env.IMAGE_GENERATION_CONCURRENCY || '1');
imageGenerationQueue.process(concurrency, processImageGeneration);

// Queue events
imageGenerationQueue.on('completed', (job, result) => {
  console.log(`[IMAGE QUEUE] Job ${job.id} completed`);
  console.log(`[IMAGE QUEUE] Account: ${result.accountEmail}`);
  console.log(`[IMAGE QUEUE] Images: ${result.images.length}`);
  console.log(`[IMAGE QUEUE] Time: ${(result.totalTime / 1000).toFixed(2)}s`);
});

imageGenerationQueue.on('failed', (job, error) => {
  console.error(`[IMAGE QUEUE] Job ${job.id} failed:`, error.message);
});

imageGenerationQueue.on('error', (error) => {
  console.error('[IMAGE QUEUE] Queue error:', error);
});

imageGenerationQueue.on('stalled', (job) => {
  console.warn(`[IMAGE QUEUE] Job ${job.id} stalled`);
});

export default imageGenerationQueue;