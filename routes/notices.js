const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, adminOnly } = require('../middleware/auth');

// Storage setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// 🔹 GET: All notices (Active only, sorted by isNew first, then by createdAt - newest first)
router.get('/', async (req, res) => {
  try {
    const notices = await Notice.find({ isArchived: false }).sort({ isNew: -1, createdAt: -1 });
    
    if (!req.header('x-auth-token')) {
      return res.json(notices);
    }

    const token = req.header('x-auth-token');
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await User.findById(decoded.id);
      
      const noticesWithUserStatus = notices.map(notice => {
        const noticeObj = notice.toObject();
        noticeObj.isNewForUser = !user.viewedNotices.includes(notice._id);
        return noticeObj;
      });
      
      return res.json(noticesWithUserStatus);
    } catch (err) {
      return res.json(notices);
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notices', error: err.message });
  }
});

// 🔹 GET: New notices only (for notifications)
router.get('/new-only', async (req, res) => {
  try {
    const notices = await Notice.find({ isArchived: false, isNew: true }).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch new notices', error: err.message });
  }
});

// 🔹 GET: Archived notices (Admin only)
router.get('/archived', [auth, adminOnly], async (req, res) => {
  try {
    const notices = await Notice.find({ isArchived: true }).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch archived notices', error: err.message });
  }
});

// 🔹 GET: Get a single notice by ID
router.get('/:id', async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }
    
    // If archived, only admins can see it
    if (notice.isArchived) {
      const token = req.header('x-auth-token');
      if (!token) {
        return res.status(404).json({ message: 'Notice not found' });
      }
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User.findById(decoded.id);
        if (!user || user.role !== 'admin') {
          return res.status(404).json({ message: 'Notice not found' });
        }
      } catch (err) {
        return res.status(404).json({ message: 'Notice not found' });
      }
    }
    
    if (!req.header('x-auth-token')) {
      return res.json(notice);
    }

    const token = req.header('x-auth-token');
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await User.findById(decoded.id);
      
      const noticeObj = notice.toObject();
      noticeObj.isNewForUser = !user.viewedNotices.includes(notice._id);
      return res.json(noticeObj);
    } catch (err) {
      return res.json(notice);
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notice', error: err.message });
  }
});

// 🔹 POST: Add a new notice (Admin only)
router.post('/', [auth, adminOnly, upload.single('image')], async (req, res) => {
  try {
    const { title, description, category, postedBy } = req.body;

    if (!title || !description || !category || !postedBy) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const newNotice = new Notice({
      title,
      description,
      category,
      postedBy,
      imageUrl,
      isNew: true,
      isArchived: false
    });

    await newNotice.save();
    res.status(201).json({ message: '✅ Notice posted successfully', notice: newNotice });
  } catch (err) {
    console.error('❌ Failed to post notice:', err);
    res.status(500).json({ message: 'Failed to create notice', error: err.message });
  }
});

// 🔹 PUT: Update a notice (Admin only)
router.put('/:id', [auth, adminOnly, upload.single('image')], async (req, res) => {
  try {
    const { title, description, category, postedBy, isArchived } = req.body;

    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Update fields
    if (title) notice.title = title;
    if (description) notice.description = description;
    if (category) notice.category = category;
    if (postedBy) notice.postedBy = postedBy;
    if (isArchived !== undefined) notice.isArchived = isArchived;

    // Update image if a new one is uploaded
    if (req.file) {
      if (notice.imageUrl) {
        const oldImagePath = path.join(__dirname, '../', notice.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      notice.imageUrl = `/uploads/${req.file.filename}`;
    }

    await notice.save();
    res.json({ message: '✅ Notice updated successfully', notice });
  } catch (err) {
    console.error('❌ Failed to update notice:', err);
    res.status(500).json({ message: 'Failed to update notice', error: err.message });
  }
});

// 🔹 PATCH: Mark notice as viewed (Student/Admin)
router.patch('/:id/view', auth, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });

    const user = await User.findById(req.user.id);
    if (!user.viewedNotices.includes(notice._id)) {
      user.viewedNotices.push(notice._id);
      await user.save();
    }

    res.json({ message: 'Notice marked as viewed', notice, isNewForUser: false });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notice', error: err.message });
  }
});

// 🔹 PATCH: Archive/Unarchive notice (Admin only)
router.patch('/:id/archive', [auth, adminOnly], async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });

    notice.isArchived = !notice.isArchived;
    // If archiving, it's no longer "new"
    if (notice.isArchived) notice.isNew = false;
    
    await notice.save();
    res.json({ message: `Notice ${notice.isArchived ? 'archived' : 'unarchived'} successfully`, notice });
  } catch (err) {
    res.status(500).json({ message: 'Error archiving notice', error: err.message });
  }
});

// 🔹 DELETE: Delete a notice (Admin only)
router.delete('/:id', [auth, adminOnly], async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    if (notice.imageUrl) {
      const imagePath = path.join(__dirname, '../', notice.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: '✅ Notice deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete notice:', err);
    res.status(500).json({ message: 'Failed to delete notice', error: err.message });
  }
});

module.exports = router;
