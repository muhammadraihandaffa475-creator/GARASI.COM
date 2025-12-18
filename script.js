// Mengambil data dari LocalStorage saat halaman dimuat
let cars = JSON.parse(localStorage.getItem('carData')) || [];

const form = document.getElementById('carForm');
const tableBody = document.getElementById('carTableBody');
const emptyState = document.getElementById('emptyState');
const alertCountBadge = document.getElementById('alertCount');
const searchInput = document.getElementById('searchInput');
const btnSave = document.getElementById('btnSave');
const btnCancel = document.getElementById('btnCancel');
const serviceIntervalInput = document.getElementById('serviceInterval');

// Fungsi untuk menyimpan ke LocalStorage
function saveData() {
    localStorage.setItem('carData', JSON.stringify(cars));
    renderTable();
}

// Fungsi Helper untuk Pindah Tab
function switchTab(tabId) {
    const triggerEl = document.querySelector(tabId);
    const tab = new bootstrap.Tab(triggerEl);
    tab.show();
}

// Validasi Real-time: Paksa input maksimal 12
serviceIntervalInput.addEventListener('input', function() {
    if (parseInt(this.value) > 12) this.value = 12;
    if (parseInt(this.value) < 1 && this.value !== '') this.value = 1;
});

// Fungsi menambahkan mobil
form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = document.getElementById('carId').value;
    const name = document.getElementById('carName').value;
    const lastDate = document.getElementById('lastServiceDate').value;
    const interval = parseInt(document.getElementById('serviceInterval').value);

    if (interval < 1 || interval > 12) {
        showNotification('Interval harus 1-12 bulan!', 'error');
        return;
    }

    if (id) {
        // Mode Edit
        const carIndex = cars.findIndex(c => c.id == id);
        if (carIndex > -1) {
            cars[carIndex].name = name;
            cars[carIndex].lastService = lastDate;
            cars[carIndex].interval = interval;
            showNotification('Data mobil berhasil diperbarui!', 'success');
            switchTab('#list-tab'); // Kembali ke list setelah edit
        }
        cancelEdit(); // Reset form
    } else {
        // Mode Tambah Baru
        const newCar = {
            id: Date.now(), // ID unik berdasarkan waktu
            name: name,
            lastService: lastDate,
            interval: interval
        };
        cars.push(newCar);
        form.reset();
        document.getElementById('serviceInterval').value = 6; 
        showNotification('Data mobil berhasil ditambahkan!', 'success');
        switchTab('#list-tab'); // Kembali ke list setelah tambah
    }

    saveData();
});

// Fungsi menghitung tanggal servis berikutnya
function getNextServiceDate(lastDate, intervalMonths) {
    const date = new Date(lastDate);
    date.setMonth(date.getMonth() + intervalMonths);
    return date;
}

// Fungsi format tanggal ke format Indonesia
function formatDateID(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Fungsi Update Servis (Reset tanggal ke hari ini)
window.updateService = function(id) {
    if(confirm("Apakah mobil ini sudah diservis hari ini?")) {
        const carIndex = cars.findIndex(c => c.id === id);
        if (carIndex > -1) {
            // Set tanggal servis terakhir menjadi hari ini (YYYY-MM-DD)
            cars[carIndex].lastService = new Date().toISOString().split('T')[0];
            saveData();
            showNotification('Status servis berhasil diperbarui!', 'success');
        }
    }
}

// Fungsi Edit Data
window.editCar = function(id) {
    const car = cars.find(c => c.id === id);
    if (car) {
        document.getElementById('carId').value = car.id;
        document.getElementById('carName').value = car.name;
        document.getElementById('lastServiceDate').value = car.lastService;
        document.getElementById('serviceInterval').value = car.interval;
        
        // Ubah tampilan tombol
        btnSave.innerHTML = '<i class="fas fa-sync-alt me-2"></i> Update';
        btnSave.classList.replace('btn-primary', 'btn-warning');
        btnCancel.classList.remove('d-none');
        
        // Pindah ke tab tambah/edit
        switchTab('#add-tab');
    }
}

// Fungsi Batal Edit
window.cancelEdit = function() {
    form.reset();
    document.getElementById('carId').value = '';
    document.getElementById('serviceInterval').value = 6;
    
    btnSave.innerHTML = '<i class="fas fa-save me-2"></i> Simpan';
    btnSave.classList.replace('btn-warning', 'btn-primary');
    btnCancel.classList.add('d-none');
    switchTab('#list-tab'); // Kembali ke list jika batal
}

// Fungsi Hapus Data
window.deleteCar = function(id) {
    if(confirm("Hapus data mobil ini?")) {
        cars = cars.filter(c => c.id !== id);
        saveData();
        showNotification('Data mobil telah dihapus.', 'error');
    }
}

// Event Listener untuk Pencarian
searchInput.addEventListener('input', () => renderTable(false));

// Fungsi Utama Render Tabel
function renderTable(notify = true) {
    tableBody.innerHTML = '';
    let warningCount = 0;
    let carsToNotify = [];
    const today = new Date();
    today.setHours(0,0,0,0); // Reset jam agar perbandingan akurat
    const searchTerm = searchInput.value.toLowerCase();

    // Filter berdasarkan pencarian
    let filteredCars = cars.filter(car => car.name.toLowerCase().includes(searchTerm));

    // Sorting: Urutkan berdasarkan tanggal servis terdekat (Ascending)
    filteredCars.sort((a, b) => {
        const dateA = getNextServiceDate(a.lastService, a.interval);
        const dateB = getNextServiceDate(b.lastService, b.interval);
        return dateA - dateB;
    });

    if (filteredCars.length === 0) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = cars.length > 0 ? '<p class="text-muted">Mobil tidak ditemukan.</p>' : '<p class="text-muted">Belum ada data mobil. Silakan tambahkan di atas.</p>';
    } else {
        emptyState.style.display = 'none';
        
        filteredCars.forEach(car => {
            const nextDate = getNextServiceDate(car.lastService, car.interval);
            
            // Hitung selisih hari
            const diffTime = nextDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            let statusHtml = '';
            let rowClass = '';

            // Logika Peringatan
            if (diffDays < 0) {
                // Sudah lewat tanggal
                statusHtml = `<span class="badge bg-danger status-badge"><i class="fas fa-exclamation-triangle"></i> Telat ${Math.abs(diffDays)} Hari!</span>`;
                rowClass = 'danger-row';
                warningCount++;
                carsToNotify.push(car.name);
            } else if (diffDays <= 14) {
                // Kurang dari 2 minggu (Peringatan)
                statusHtml = `<span class="badge bg-warning text-dark status-badge"><i class="fas fa-clock"></i> Segera (${diffDays} hari lagi)</span>`;
                rowClass = 'warning-row';
                warningCount++;
                carsToNotify.push(car.name);
            } else {
                // Masih aman
                statusHtml = `<span class="badge bg-success bg-opacity-75 status-badge"><i class="fas fa-check-circle"></i> Aman</span>`;
            }

            const row = `
                <tr class="${rowClass}">
                    <td class="fw-bold">${car.name}</td>
                    <td>${formatDateID(car.lastService)}</td>
                    <td>
                        ${formatDateID(nextDate)}
                        <div class="small text-muted">Interval: ${car.interval} Bulan</div>
                    </td>
                    <td>${statusHtml}</td>
                    <td>
                        <button onclick="updateService(${car.id})" class="btn btn-sm btn-outline-primary me-1 rounded-pill" title="Sudah Diservis"><i class="fas fa-tools"></i> Servis</button>
                        <button onclick="editCar(${car.id})" class="btn btn-sm btn-outline-warning me-1 rounded-pill" title="Edit"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteCar(${car.id})" class="btn btn-sm btn-outline-danger rounded-pill" title="Hapus"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // Update badge jumlah peringatan
    if (warningCount > 0) {
        alertCountBadge.textContent = `${warningCount} Perlu Perhatian`;
        alertCountBadge.className = 'badge bg-danger animate__animated animate__pulse animate__infinite';
        if (notify) {
            sendBrowserNotification(warningCount, carsToNotify);
        }
    } else {
        alertCountBadge.textContent = 'Semua Aman';
        alertCountBadge.className = 'badge bg-success';
    }
}

// Fungsi Kirim Notifikasi Browser
function sendBrowserNotification(count, carNames) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        try {
            // Kirim notifikasi
            const notification = new Notification("Peringatan Servis Mobil", {
                body: `Perhatian! Ada ${count} mobil yang perlu diservis:\n${carNames.join(", ")}`,
                icon: "https://cdn-icons-png.flaticon.com/512/1068/1068729.png",
                tag: 'service-notification'
            });
            
            notification.onclick = function() {
                window.focus();
                this.close();
            };
        } catch (e) {
            console.error("Gagal menampilkan notifikasi:", e);
        }
    } else if (Notification.permission !== "denied") {
        // Tampilkan tombol izin jika belum diizinkan/ditolak
        addNotificationButton();
    }
}

// Fungsi Menambah Tombol Izin Notifikasi
function addNotificationButton() {
    if (document.getElementById('btnNotify')) return;

    const badge = document.getElementById('alertCount');
    const header = badge.parentElement;
    
    const btn = document.createElement('button');
    btn.id = 'btnNotify';
    btn.className = 'btn btn-sm btn-warning me-2';
    btn.innerHTML = '<i class="fas fa-bell"></i> Aktifkan Notifikasi';
    btn.onclick = function() {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                renderTable(true); // Render ulang untuk memicu notifikasi
                btn.remove();
            }
        });
    };
    
    // Masukkan tombol sebelum badge
    header.insertBefore(btn, badge);
}

// Fungsi Menampilkan Notifikasi Toast Modern
function showNotification(message, type = 'success') {
    const toastEl = document.getElementById('appToast');
    const toastBody = document.getElementById('toastMessage');
    
    // Set pesan dan ikon
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-trash-alt' : 'fa-info-circle');
    toastBody.innerHTML = `<i class="fas ${icon} me-2"></i> ${message}`;
    
    // Reset warna dan set warna baru
    toastEl.className = 'toast align-items-center text-white border-0';
    if (type === 'success') toastEl.classList.add('bg-success');
    else if (type === 'error') toastEl.classList.add('bg-danger');
    else toastEl.classList.add('bg-primary');
    
    // Tampilkan toast menggunakan Bootstrap API
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// Render awal
renderTable();