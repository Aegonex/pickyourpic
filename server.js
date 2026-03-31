const express = require('express');
const path = require('path');
const fs = require('fs');
const { getBookings, bookImage, getBooking, cancelBooking } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const IMAGES_DIR = path.join(__dirname, 'src');

app.use(express.json());
app.use(express.static('public'));

// GET /api/photo/:name — serve image file
app.get('/api/photo/:name', (req, res) => {
  const name = req.params.name;
  if (!/^[\w\-. ]+\.(jpg|jpeg)$/i.test(name)) {
    return res.status(400).end();
  }
  const filePath = path.join(IMAGES_DIR, name);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
});

// GET /api/images — all images with booking status
app.get('/api/images', (req, res) => {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => /\.(jpg|jpeg)$/i.test(f));
  const bookings = getBookings();
  const bookingMap = {};
  for (const b of bookings) bookingMap[b.image_name] = b.booked_by;

  const images = files.map(name => ({
    name,
    bookedBy: bookingMap[name] || null,
  }));

  res.json(images);
});

// POST /api/book — book an image
app.post('/api/book', async (req, res) => {
  const { imageName, bookedBy } = req.body;
  if (!imageName || !bookedBy || !bookedBy.trim()) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' });
  }

  const filePath = path.join(IMAGES_DIR, imageName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'ไม่พบรูปภาพ' });
  }

  const result = await bookImage(imageName, bookedBy.trim());
  if (result.success) {
    res.json({ success: true });
  } else {
    res.status(409).json(result);
  }
});

// GET /api/download/:name — download image (only if booker matches)
app.get('/api/download/:name', (req, res) => {
  const imageName = req.params.name;
  const requester = (req.query.name || '').trim();

  const booking = getBooking(imageName);
  if (!booking) {
    return res.status(403).json({ message: 'รูปนี้ยังไม่ถูกจอง' });
  }
  if (booking.booked_by.toLowerCase() !== requester.toLowerCase()) {
    return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ดาวน์โหลดรูปนี้' });
  }

  const filePath = path.join(IMAGES_DIR, imageName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'ไม่พบไฟล์' });
  }

  res.download(filePath, imageName);
});

// DELETE /api/book/:name — cancel booking (must provide booker name)
app.delete('/api/book/:name', async (req, res) => {
  const imageName = req.params.name;
  const requesterName = (req.body.cancelledBy || '').trim();
  if (!requesterName) return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ' });

  const result = await cancelBooking(imageName, requesterName);
  res.status(result.success ? 200 : 403).json(result);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
