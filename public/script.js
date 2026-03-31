let images = [];
let selectedImage = null;
let dlImage = null;

const gallery = document.getElementById('gallery');
const modalOverlay = document.getElementById('modal-overlay');
const modalPreview = document.getElementById('modal-preview');
const nameInput = document.getElementById('name-input');
const modalError = document.getElementById('modal-error');
const dlOverlay = document.getElementById('dl-overlay');
const dlNameInput = document.getElementById('dl-name-input');
const dlError = document.getElementById('dl-error');
const cancelOverlay = document.getElementById('cancel-overlay');
const cancelNameInput = document.getElementById('cancel-name-input');
const cancelError = document.getElementById('cancel-error');
let cancelImage = null;

async function fetchImages() {
  const res = await fetch('/api/images');
  images = await res.json();
  render();
}

function render() {
  const total = images.length;
  const booked = images.filter(i => i.bookedBy).length;
  document.getElementById('stat-total').textContent = `ทั้งหมด: ${total}`;
  document.getElementById('stat-booked').textContent = `จองแล้ว: ${booked}`;
  document.getElementById('stat-free').textContent = `เหลือ: ${total - booked}`;

  gallery.innerHTML = '';
  for (const img of images) {
    const card = document.createElement('div');
    card.className = 'card ' + (img.bookedBy ? 'booked' : 'available');

    const photo = document.createElement('img');
    photo.src = `/api/photo/${encodeURIComponent(img.name)}`;
    photo.alt = img.name;
    photo.loading = 'lazy';
    card.appendChild(photo);

    if (img.bookedBy) {
      const label = document.createElement('div');
      label.className = 'booked-label';
      label.innerHTML = `
        <span>จองแล้ว</span>
        <strong>${escHtml(img.bookedBy)}</strong>
        <button class="btn-download" data-name="${escHtml(img.name)}">ดาวน์โหลด</button>
        <button class="btn-cancel-booking" data-name="${escHtml(img.name)}">ยกเลิกจอง</button>
      `;
      card.appendChild(label);
      label.querySelector('.btn-download').addEventListener('click', e => {
        e.stopPropagation();
        openDlModal(img.name);
      });
      label.querySelector('.btn-cancel-booking').addEventListener('click', e => {
        e.stopPropagation();
        openCancelModal(img.name);
      });
    } else {
      card.addEventListener('click', () => openBookModal(img.name));
    }

    gallery.appendChild(card);
  }
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Booking modal
function openBookModal(name) {
  selectedImage = name;
  modalPreview.src = `/api/photo/${encodeURIComponent(name)}`;
  nameInput.value = '';
  hideError(modalError);
  modalOverlay.classList.remove('hidden');
  nameInput.focus();
}

function closeBookModal() {
  modalOverlay.classList.add('hidden');
  selectedImage = null;
}

document.getElementById('btn-cancel').addEventListener('click', closeBookModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeBookModal(); });

document.getElementById('btn-confirm').addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!name) { showError(modalError, 'กรุณาพิมพ์ชื่อ'); return; }

  const res = await fetch('/api/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageName: selectedImage, bookedBy: name }),
  });
  const data = await res.json();

  if (data.success) {
    closeBookModal();
    await fetchImages();
  } else {
    showError(modalError, data.message || 'เกิดข้อผิดพลาด');
  }
});

nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-confirm').click(); });

// Download modal
function openDlModal(name) {
  dlImage = name;
  dlNameInput.value = '';
  hideError(dlError);
  dlOverlay.classList.remove('hidden');
  dlNameInput.focus();
}

function closeDlModal() {
  dlOverlay.classList.add('hidden');
  dlImage = null;
}

document.getElementById('dl-btn-cancel').addEventListener('click', closeDlModal);
dlOverlay.addEventListener('click', e => { if (e.target === dlOverlay) closeDlModal(); });

document.getElementById('dl-btn-confirm').addEventListener('click', async () => {
  const name = dlNameInput.value.trim();
  if (!name) { showError(dlError, 'กรุณาพิมพ์ชื่อ'); return; }

  const url = `/api/download/${encodeURIComponent(dlImage)}?name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showError(dlError, data.message || 'ชื่อไม่ถูกต้อง');
    return;
  }

  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = dlImage;
  a.click();
  URL.revokeObjectURL(a.href);
  closeDlModal();
});

dlNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('dl-btn-confirm').click(); });

// Cancel booking modal
function openCancelModal(name) {
  cancelImage = name;
  cancelNameInput.value = '';
  hideError(cancelError);
  cancelOverlay.classList.remove('hidden');
  cancelNameInput.focus();
}

function closeCancelModal() {
  cancelOverlay.classList.add('hidden');
  cancelImage = null;
}

document.getElementById('cancel-btn-cancel').addEventListener('click', closeCancelModal);
cancelOverlay.addEventListener('click', e => { if (e.target === cancelOverlay) closeCancelModal(); });

document.getElementById('cancel-btn-confirm').addEventListener('click', async () => {
  const name = cancelNameInput.value.trim();
  if (!name) { showError(cancelError, 'กรุณาพิมพ์ชื่อ'); return; }

  const res = await fetch(`/api/book/${encodeURIComponent(cancelImage)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancelledBy: name }),
  });
  const data = await res.json();

  if (data.success) {
    closeCancelModal();
    await fetchImages();
  } else {
    showError(cancelError, data.message || 'เกิดข้อผิดพลาด');
  }
});

cancelNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('cancel-btn-confirm').click(); });

function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function hideError(el) { el.classList.add('hidden'); }

// Initial load + poll every 5s
fetchImages();
setInterval(fetchImages, 5000);
