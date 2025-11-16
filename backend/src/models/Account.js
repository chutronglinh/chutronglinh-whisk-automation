import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: String,
  recoveryEmail: String,
  twoFASecret: String,
  phone: String,
  sessionCookie: String,
  cookies: [{
    name: String,
    value: String,
    domain: String,
    path: String,
    expires: Number,
    httpOnly: Boolean,
    secure: Boolean
  }],
  status: {
    type: String,
    enum: ['active', 'pending', 'login-required', 'processing', 'blocked', 'error'],
    default: 'login-required'
  },
  source: {
    type: String,
    enum: ['manual', 'csv-import', 'api'],
    default: 'manual'
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lastLogin: Date,
  lastCookieUpdate: Date,
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  metadata: {
    userAgent: String,
    profilePath: String,
    profileReady: Boolean,
    cookieExtracted: Boolean,
    cookieValidated: Boolean,
    proxyUsed: String
  }
}, { 
  timestamps: true 
});

// Index cho queries
accountSchema.index({ status: 1 });
accountSchema.index({ source: 1 });
accountSchema.index({ email: 1, status: 1 });

const Account = mongoose.model('Account', accountSchema);

export default Account;