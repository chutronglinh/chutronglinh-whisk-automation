import mongoose from 'mongoose';

const promptSchema = new mongoose.Schema({
  promptText: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'general'
  },
  tags: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Prompt', promptSchema);