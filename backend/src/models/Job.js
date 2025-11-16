import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  jobType: {
    type: String,
    enum: ['SETUP_PROFILE', 'EXTRACT_COOKIE', 'CREATE_PROJECT', 'GENERATE_IMAGE'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: Number,
    default: 0
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  result: mongoose.Schema.Types.Mixed,
  error: String,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  accountId: String,
  projectId: String,
  promptId: String,
  startedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

export default mongoose.model('Job', jobSchema);