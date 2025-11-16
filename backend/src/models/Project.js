import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true
  },
  accountId: {
    type: String,
    required: true,
    ref: 'Account'
  },
  projectName: {
    type: String,
    required: true
  },
  workflowId: {
    type: String,
    required: true
  },
  imageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('Project', projectSchema);