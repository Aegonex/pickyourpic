const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'bookings.json');

// Simple in-memory lock to prevent race conditions
let locked = false;
const queue = [];

function acquireLock() {
  return new Promise(resolve => {
    if (!locked) { locked = true; resolve(); }
    else queue.push(resolve);
  });
}

function releaseLock() {
  if (queue.length > 0) {
    const next = queue.shift();
    next();
  } else {
    locked = false;
  }
}

function readDb() {
  if (!fs.existsSync(DB_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return {}; }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function getBookings() {
  const data = readDb();
  return Object.entries(data).map(([image_name, entry]) => ({
    image_name,
    booked_by: entry.booked_by,
    booked_at: entry.booked_at,
  }));
}

async function bookImage(imageName, bookedBy) {
  await acquireLock();
  try {
    const data = readDb();
    if (data[imageName]) return { success: false, message: 'รูปนี้ถูกจองแล้ว' };
    data[imageName] = { booked_by: bookedBy, booked_at: new Date().toISOString() };
    writeDb(data);
    return { success: true };
  } finally {
    releaseLock();
  }
}

function getBooking(imageName) {
  const data = readDb();
  const entry = data[imageName];
  return entry ? { booked_by: entry.booked_by } : null;
}

module.exports = { getBookings, bookImage, getBooking };
