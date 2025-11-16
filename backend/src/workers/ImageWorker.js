import fs from 'fs-extra';
import { imageQueue } from '../config/queue.js';
import Account from '../models/Account.js';
import Image from '../models/Image.js';
import Job from '../models/Job.js';
import { getAccessToken } from '../utils/auth-helper.js';
import { ImageGenerator } from '../utils/image-generator.js';
import { io } from '../app.js';

imageQueue.process(async (job) => {
  const { promptId, promptText, accountId, config } = job.data;

  const jobRecord = await Job.create({
    jobType: 'GENERATE_IMAGE',
    status: 'processing',
    data: job.data,
    accountId,
    promptId
  });

  try {
    const account = await Account.findOne({ accountId });
    if (!account) throw new Error('Account not found');
    if (!account.sessionCookie) throw new Error('Session cookie not found');
    if (!account.projects || account.projects.length === 0) {
      throw new Error('No projects found');
    }

    job.progress(20);
    io.emit('job:progress', { jobId: jobRecord._id, progress: 20 });

    // Get access token
    const validation = await getAccessToken(account.sessionCookie);
    if (!validation.valid) throw new Error(`Invalid session: ${validation.error}`);

    job.progress(40);
    io.emit('job:progress', { jobId: jobRecord._id, progress: 40 });

    // Generate images
    const generator = new ImageGenerator(validation.accessToken);
    const workflowId = account.projects[0];

    const imageConfig = {
      imageModel: config?.imageModel || 'IMAGEN_3_5',
      aspectRatio: config?.aspectRatio || 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      mediaCategory: config?.mediaCategory || 'MEDIA_CATEGORY_BOARD',
      seed: config?.seed || null
    };

    const response = await generator.generateImage(workflowId, promptText, imageConfig);

    if (!response.imagePanels || response.imagePanels.length === 0) {
      throw new Error('No image panels in response');
    }

    const images = response.imagePanels[0].generatedImages;
    if (!images || images.length === 0) throw new Error('No images generated');

    job.progress(70);
    io.emit('job:progress', { jobId: jobRecord._id, progress: 70 });

    // Save images
    await fs.ensureDir(process.env.OUTPUT_PATH);
    const savedImages = [];

    for (let idx = 0; idx < images.length; idx++) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${timestamp}_${accountId}_${idx + 1}.jpg`;
      const filepath = `${process.env.OUTPUT_PATH}/${filename}`;

      const buffer = Buffer.from(images[idx].encodedImage, 'base64');
      await fs.writeFile(filepath, buffer);

      const imageRecord = await Image.create({
        imageId: `${timestamp}_${idx}`,
        promptId,
        accountId,
        projectId: workflowId,
        jobId: jobRecord._id,
        filename,
        filepath,
        filesize: buffer.length,
        metadata: imageConfig
      });

      savedImages.push(imageRecord);
    }

    jobRecord.status = 'completed';
    jobRecord.progress = 100;
    jobRecord.result = { images: savedImages.length, files: savedImages.map(i => i.filename) };
    await jobRecord.save();

    io.emit('job:completed', { jobId: jobRecord._id, result: jobRecord.result });
    return { success: true, images: savedImages };
  } catch (error) {
    jobRecord.status = 'failed';
    jobRecord.error = error.message;
    jobRecord.retryCount = (jobRecord.retryCount || 0) + 1;
    await jobRecord.save();

    io.emit('job:failed', { jobId: jobRecord._id, error: error.message });

    if (jobRecord.retryCount < jobRecord.maxRetries) {
      throw error; // Bull will retry
    }
    return { success: false, error: error.message };
  }
});

console.log('✓ ImageWorker started');