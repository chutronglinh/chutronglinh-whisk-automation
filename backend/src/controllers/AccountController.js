import Account from '../models/Account.js';
import { profileQueue, cookieQueue } from '../config/queue.js';

class AccountController {
  async getAll(req, res) {
    try {
      const accounts = await Account.find().sort({ createdAt: -1 });
      res.json({ success: true, data: accounts });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const account = await Account.findOne({ accountId: req.params.id });
      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }
      res.json({ success: true, data: account });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async create(req, res) {
    try {
      const account = await Account.create(req.body);
      res.status(201).json({ success: true, data: account });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async update(req, res) {
    try {
      const account = await Account.findOneAndUpdate(
        { accountId: req.params.id },
        req.body,
        { new: true }
      );
      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }
      res.json({ success: true, data: account });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const account = await Account.findOneAndDelete({ accountId: req.params.id });
      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }
      res.json({ success: true, message: 'Account deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async importAccounts(req, res) {
    try {
      const { accounts } = req.body;
      const created = await Account.insertMany(accounts);
      res.status(201).json({ success: true, data: created, count: created.length });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async setupProfile(req, res) {
    try {
      const account = await Account.findOne({ accountId: req.params.id });
      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      const job = await profileQueue.add({
        accountId: account.accountId,
        email: account.email
      });

      res.json({ success: true, jobId: job.id, message: 'Profile setup job queued' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async extractCookie(req, res) {
    try {
      const account = await Account.findOne({ accountId: req.params.id });
      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      const job = await cookieQueue.add({
        accountId: account.accountId,
        profilePath: account.profilePath
      });

      res.json({ success: true, jobId: job.id, message: 'Cookie extraction job queued' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new AccountController();