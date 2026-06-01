/**
 * TechStore Kasir — script.js
 * Seluruh logika transaksi: keranjang, kalkulasi, struk, UI
 */

'use strict';

/* ═══════════════════════════════════════
   STATE
═══════════════════════════════════════ */
let cart      = [];   // Array of { id, nama, harga, qty }
let idCounter = 0;

/* ═══════════════════════════════════════
   DOM REFERENCES
═══════════════════════════════════════ */
const elClock         = document.getElementById('clock');
const elDate          = document.getElementById('date');
const inpNama         = document.getElementById('inpNama');
const inpHarga        = document.getElementById('inpHarga');
const inpQty          = document.getElementById('inpQty');
const inpBayar        = document.getElementById('inpBayar');
const cartBody        = document.getElementById('cartBody');
const badgeCount      = document.getElementById('badgeCount');
const sumItems        = document.getElementById('sumItems');
const sumQty          = document.getElementById('sumQty');
const sumTotal        = document.getElementById('sumTotal');
const kembalianBox    = document.getElementById('kembalianBox');
const kembalianLabel  = document.getElementById('kembalianLabel');
const kembalianVal    = document.getElementById('kembalianVal');
const modalOverlay    = document.getElementById('modalOverlay');
const strukContent    = document.getElementById('strukContent');
const toastEl         = document.getElementById('toast');

/* ═══════════════════════════════════════
   CLOCK
═══════════════════════════════════════ */
function updateClock() {
  const now = new Date();
  elClock.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  elDate.textContent  = now.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
updateClock();
setInterval(updateClock, 1000);

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
/** Format angka ke Rupiah */
function fmtRp(n) {
  return 'Rp ' + Math.abs(n).toLocaleString('id-ID');
}

/** Escape HTML untuk keamanan */
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Hitung grand total dari cart */
function getTotal() {
  return cart.reduce((sum, item) => sum + item.harga * item.qty, 0);
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
let toastTimer = null;

function showToast(msg, type = 'info') {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className   = 'toast show' + (type === 'error' ? ' error' : '');
  toastTimer = setTimeout(() => { toastEl.classList.remove('show', 'error'); }, 2800);
}

/* ═══════════════════════════════════════
   TAMBAH ITEM
═══════════════════════════════════════ */
function tambahItem() {
  const nama  = inpNama.value.trim();
  const harga = parseFloat(inpHarga.value);
  const qty   = parseInt(inpQty.value);

  // Validasi
  if (!nama)          return showToast('⚠  Nama barang wajib diisi', 'error');
  if (!harga || harga <= 0) return showToast('⚠  Harga harus lebih dari 0', 'error');
  if (!qty   || qty   <= 0) return showToast('⚠  Jumlah harus lebih dari 0', 'error');

  // Cek duplikat (case-insensitive) → gabung qty
  const existing = cart.find(i => i.nama.toLowerCase() === nama.toLowerCase());
  if (existing) {
    existing.qty += qty;
    showToast(`✔  Qty "${nama}" diperbarui (+${qty})`);
  } else {
    cart.push({ id: ++idCounter, nama, harga, qty });
    showToast(`✔  "${nama}" ditambahkan ke keranjang`);
  }

  // Reset form
  inpNama.value  = '';
  inpHarga.value = '';
  inpQty.value   = 1;
  inpNama.focus();

  renderCart();
  updateSummary();
  hitungKembalian();
}

/* ═══════════════════════════════════════
   HAPUS ITEM
═══════════════════════════════════════ */
function hapusItem(id) {
  const item = cart.find(i => i.id === id);
  cart = cart.filter(i => i.id !== id);
  if (item) showToast(`🗑  "${item.nama}" dihapus`);
  renderCart();
  updateSummary();
  hitungKembalian();
}

/* ═══════════════════════════════════════
   RENDER CART
═══════════════════════════════════════ */
function renderCart() {
  if (cart.length === 0) {
    cartBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-state">
            <img src="assets/icon-cart.svg" alt="" class="empty-icon">
            <p>Keranjang masih kosong</p>
            <small>Tambahkan barang di form atas</small>
          </div>
        </td>
      </tr>`;
    badgeCount.textContent = '0';
    return;
  }

  cartBody.innerHTML = cart.map((item, idx) => {
    const subtotal = item.harga * item.qty;
    return `
      <tr>
        <td class="td-no">${idx + 1}</td>
        <td class="td-name">${escHtml(item.nama)}</td>
        <td class="td-qty">${item.qty}</td>
        <td class="td-price">${fmtRp(item.harga)}</td>
        <td class="td-sub">${fmtRp(subtotal)}</td>
        <td style="text-align:center;">
          <button class="btn-del" onclick="hapusItem(${item.id})" title="Hapus item">✕</button>
        </td>
      </tr>`;
  }).join('');

  badgeCount.textContent = cart.length;
}

/* ═══════════════════════════════════════
   UPDATE SUMMARY
═══════════════════════════════════════ */
function updateSummary() {
  const totalQty   = cart.reduce((s, i) => s + i.qty, 0);
  const totalHarga = getTotal();

  sumItems.textContent = cart.length + ' item';
  sumQty.textContent   = totalQty + ' pcs';
  sumTotal.textContent = fmtRp(totalHarga);
}

/* ═══════════════════════════════════════
   HITUNG KEMBALIAN
═══════════════════════════════════════ */
function hitungKembalian() {
  const total = getTotal();
  const bayar = parseFloat(inpBayar.value) || 0;
  const kemb  = bayar - total;

  if (bayar === 0) {
    kembalianVal.textContent   = 'Rp 0';
    kembalianLabel.textContent = 'Kembalian';
    kembalianBox.classList.remove('kurang');
  } else if (kemb < 0) {
    kembalianVal.textContent   = '− ' + fmtRp(Math.abs(kemb));
    kembalianLabel.textContent = 'Kurang Bayar';
    kembalianBox.classList.add('kurang');
  } else {
    kembalianVal.textContent   = fmtRp(kemb);
    kembalianLabel.textContent = 'Kembalian';
    kembalianBox.classList.remove('kurang');
  }
}

/* ═══════════════════════════════════════
   CETAK STRUK
═══════════════════════════════════════ */
function cetakStruk() {
  if (cart.length === 0) return showToast('⚠  Keranjang masih kosong', 'error');

  const total = getTotal();
  const bayar = parseFloat(inpBayar.value) || 0;

  if (bayar <= 0)    return showToast('⚠  Masukkan uang bayar terlebih dahulu', 'error');
  if (bayar < total) return showToast('⚠  Uang bayar kurang dari total belanja', 'error');

  const kemb  = bayar - total;
  const now   = new Date();

  // Nomor transaksi: TRX-YYMMDD-HHMMSS
  const pad = n => String(n).padStart(2, '0');
  const noTrx = `TRX-${String(now.getFullYear()).slice(2)}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const tglLengkap = now.toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  const jamStr     = now.toLocaleTimeString('id-ID');

  // Build item rows HTML
  const itemRows = cart.map(item => `
    <div class="struk-item-wrap">
      <div class="struk-item-name">${escHtml(item.nama)}</div>
      <div class="struk-item-detail">
        <span>${item.qty} × ${fmtRp(item.harga)}</span>
        <span>${fmtRp(item.harga * item.qty)}</span>
      </div>
    </div>`).join('');

  strukContent.innerHTML = `
    <div class="struk-header">
      <div class="struk-logo">
        <img src="assets/logo.png" alt="TechStore">
      </div>
      <div class="struk-sub">Jl. Elektronik Raya No. 1, Purwokerto</div>
      <div class="struk-sub">Telp: (0281) 123-456 | @techstore.id</div>
    </div>

    <hr class="struk-div">

    <div class="struk-row"><span>No. Transaksi</span><span>${noTrx}</span></div>
    <div class="struk-row"><span>Tanggal</span><span style="text-align:right;max-width:180px;">${tglLengkap}</span></div>
    <div class="struk-row"><span>Jam</span><span>${jamStr}</span></div>
    <div class="struk-row"><span>Total Item</span><span>${cart.length} item (${cart.reduce((s,i)=>s+i.qty,0)} pcs)</span></div>

    <hr class="struk-div">

    <div style="font-size:9px;color:#888;letter-spacing:.1em;margin-bottom:8px;font-family:'Space Mono',monospace;">DAFTAR BARANG</div>
    ${itemRows}

    <hr class="struk-div">

    <div class="struk-total">
      <span>TOTAL</span>
      <span>${fmtRp(total)}</span>
    </div>
    <div class="struk-row" style="margin-top:4px;">
      <span>Uang Bayar</span>
      <span>${fmtRp(bayar)}</span>
    </div>
    <div class="struk-kemb">
      <span>KEMBALIAN</span>
      <span>${fmtRp(kemb)}</span>
    </div>

    <hr class="struk-div">

    <div class="struk-footer">
      <div>Terima kasih telah berbelanja di TechStore!</div>
      <div>Barang yang sudah dibeli tidak dapat dikembalikan.</div>
      <div>Simpan struk ini sebagai bukti pembelian.</div>
      <div class="struk-stars">★ ★ ★ ★ ★</div>
    </div>
  `;

  openModal();
}

/* ═══════════════════════════════════════
   MODAL
═══════════════════════════════════════ */
function openModal() {
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════
   RESET TRANSAKSI
═══════════════════════════════════════ */
function resetTransaksi() {
  if (cart.length === 0 && !inpBayar.value) return;
  if (!confirm('Reset semua data transaksi?\nTindakan ini tidak dapat dibatalkan.')) return;

  cart = [];
  inpNama.value  = '';
  inpHarga.value = '';
  inpQty.value   = 1;
  inpBayar.value = '';

  renderCart();
  updateSummary();
  hitungKembalian();
  showToast('✔  Transaksi berhasil direset');
  inpNama.focus();
}

/* ═══════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════ */

// Tombol Tambah
document.getElementById('btnTambah').addEventListener('click', tambahItem);

// Enter key di form input
[inpNama, inpHarga, inpQty].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') tambahItem(); });
});

// Hitung kembalian on input
inpBayar.addEventListener('input', hitungKembalian);

// Cetak Struk
document.getElementById('btnCetak').addEventListener('click', cetakStruk);

// Reset
document.getElementById('btnReset').addEventListener('click', resetTransaksi);

// Close modal — overlay click
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

// Close modal — tombol tutup
document.getElementById('btnCloseModal').addEventListener('click', closeModal);

// Print
document.getElementById('btnPrint').addEventListener('click', () => window.print());

// ESC key tutup modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
renderCart();
updateSummary();
inpNama.focus();
