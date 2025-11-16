import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  imageId: {
    type: String,
    required: true,
    unique: true
  },
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt'
  },
  accountId: String,
  projectId: String,
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  filename: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  filesize: Number,
  metadata: {
    aspectRatio: String,
    model: String,
    seed: Number
  }
}, {
  timestamps: true
});

export default mongoose.model('Image', imageSchema);