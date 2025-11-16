import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  recoveryEmail: {
    type: String,
    trim: true
  },
  twoFASecret: {
    type: String,
    trim: true
  },
  phone: String,
  cookies: {
    type: Array,
    default: []
  },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'blocked', 'error', 'login-required'],
    default: 'pending'
  },
  source: {
    type: String,
    enum: ['manual', 'csv-import', 'api'],
    default: 'manual'
  },
  lastLogin: Date,
  lastCookieUpdate: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  projects: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project' 
  }],
  metadata: {
    userAgent: String,
    profilePath: String,
    proxyUsed: String
  }
}, { 
  timestamps: true 
});

// CRITICAL: Chỉ định nghĩa index MỘT LẦN
// Email đã có unique: true ở trên, không cần index lại
// accountSchema.index({ email: 1 }); // ← XÓA DÒNG NÀY NẾU CÓ

// Index cho queries
accountSchema.index({ status: 1 });
accountSchema.index({ source: 1 });
accountSchema.index({ email: 1, status: 1 }); // Compound index

const Account = mongoose.model('Account', accountSchema);

export default Account;