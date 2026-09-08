/*
  admin.js
  --------
  Panel khusus PEMILIK ALUN-ALUN untuk memantau semua toko & pesanan
  lintas penjual, tanpa perlu login sebagai penjual tertentu.
  Bergantung pada: state & go() dari app.js, sGet/sSet/sList/sDel dari storage.js,
  fungsi bantu dari utils.js, dan BUYER_SITE_URL/SELLER_SITE_URL dari site-config.js.

  Catatan keamanan: ini akun tunggal (bukan multi-user), passwordnya disimpan
  di dokumen Firestore "admin:owner". Sama seperti akun penjual, ini masih
  level prototipe -- lihat README untuk saran mengunci Firestore Rules
  sebelum dipakai sungguhan, karena akun ini punya akses paling besar
  (bisa menghapus toko mana pun).
*/

/* ---------- login / setup awal ---------- */
async function renderAdminAuth(){
  const app = document.getElementById('app');
  const existing = await sGet('admin:owner', true);

  if(!existing){
    app.innerHTML = `
    <div class="hero">
      <div class="lamp">🛡️</div>
      <h1>Setup Admin</h1>
      <p>Belum ada akun admin untuk alun-alun ini. Buat password admin sekali di awal.</p>
    </div>
    <div class="content">
      <div class="card">
        <div class="field"><label>Buat password admin</label><input id="apNew" type="password" placeholder="minimal 6 karakter"></div>
        <div class="field"><label>Ulangi password</label><input id="apNew2" type="password" placeholder="ulangi password"></div>
        <button class="btn btn-primary" onclick="setupAdmin()">Buat Akun Admin</button>
        <p id="setupMsg" class="muted" style="margin-top:8px;"></p>
      </div>
    </div>`;
    return;
  }

  app.innerHTML = `
  <div class="hero">
    <div class="lamp">🛡️</div>
    <h1>Panel Admin</h1>
    <p>Masuk untuk memantau seluruh toko dan pesanan di alun-alun.</p>
  </div>
  <div class="content">
    <div class="card">
      <div class="field"><label>Password admin</label><input id="apLogin" type="password" placeholder="••••••"></div>
      <button class="btn btn-primary" onclick="doAdminLogin()">Masuk</button>
      <p id="loginMsg" class="muted" style="margin-top:8px;"></p>
    </div>
  </div>`;
}

async function setupAdmin(){
  const p1 = document.getElementById('apNew').value;
  const p2 = document.getElementById('apNew2').value;
  const msg = document.getElementById('setupMsg');
  if(!p1 || p1.length < 6){ msg.textContent = 'Password minimal 6 karakter.'; return; }
  if(p1 !== p2){ msg.textContent = 'Password tidak sama.'; return; }
  await sSet('admin:owner', {password:p1, createdAt:Date.now()}, true);
  await sSet('session', 'owner', false);
  go('admin-dash', {adminTab:'ringkasan'});
}

async function doAdminLogin(){
  const p = document.getElementById('apLogin').value;
  const msg = document.getElementById('loginMsg');
  const acc = await sGet('admin:owner', true);
  if(!acc || acc.password !== p){ msg.textContent = 'Password salah.'; return; }
  await sSet('session', 'owner', false);
  go('admin-dash', {adminTab:'ringkasan'});
}

async function doAdminLogout(){
  await sDel('session', false);
  go('admin-auth');
}

/* ---------- dashboard ---------- */
async function renderAdminDash(){
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="topbar">
    <div style="flex:1;"><h2>🛡️ Panel Admin</h2><div class="sub">Pantau semua toko &amp; pesanan</div></div>
    <button class="btn btn-sm btn-outline" onclick="doAdminLogout()">Keluar</button>
  </div>
  <div class="content" id="adminContent"></div>
  <div class="tabbar">
    <button id="a-ringkasan" onclick="switchAdminTab('ringkasan')">📊 Ringkasan</button>
    <button id="a-toko" onclick="switchAdminTab('toko')">🏮 Toko</button>
    <button id="a-pesanan" onclick="switchAdminTab('pesanan')">🧾 Pesanan</button>
    <button id="a-setting" onclick="switchAdminTab('setting')">⚙️ Pengaturan</button>
  </div>`;
  switchAdminTab(state.adminTab || 'ringkasan');
}

function switchAdminTab(tab){
  state.adminTab = tab;
  ['ringkasan','toko','pesanan','setting'].forEach(t => {
    const b = document.getElementById('a-' + t);
    if(b) b.className = t === tab ? 'active' : '';
  });
  if(tab === 'ringkasan') renderAdminRingkasan();
  else if(tab === 'toko') renderAdminToko();
  else if(tab === 'pesanan') renderAdminPesanan();
  else renderAdminSetting();
}

/* ---- tab: ringkasan ---- */
async function renderAdminRingkasan(){
  const el = document.getElementById('adminContent');
  el.innerHTML = '<div class="empty">Memuat ringkasan…</div>';
  const storeKeys = await sList('store:', true);
  const stores = (await Promise.all(storeKeys.map(k => sGet(k, true)))).filter(Boolean);
  const orderKeys = await sList('order:', true);
  const orders = (await Promise.all(orderKeys.map(k => sGet(k, true)))).filter(Boolean);
  const selesai = orders.filter(o => o.status === 'selesai');
  const berjalan = orders.length - selesai.length;
  const pendapatan = selesai.reduce((a,o) => a + o.total, 0);
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === todayStr);

  el.innerHTML = `
  <div class="card"><div class="muted">Jumlah toko terdaftar</div><h3>${stores.length}</h3></div>
  <div class="card"><div class="muted">Pesanan hari ini</div><h3>${todayOrders.length}</h3></div>
  <div class="card"><div class="muted">Pesanan sedang berjalan</div><h3>${berjalan}</h3></div>
  <div class="card"><div class="muted">Total pesanan (semua waktu)</div><h3>${orders.length}</h3></div>
  <div class="card"><div class="muted">Total pendapatan seluruh toko (pesanan selesai)</div><h3>${rupiah(pendapatan)}</h3></div>
  <div class="card">
    <h3>Tautan Cepat</h3>
    <div class="stack">
      <a href="${BUYER_SITE_URL}" target="_blank" class="btn btn-outline" style="text-align:center;text-decoration:none;">Buka Web Pembeli</a>
      <a href="${SELLER_SITE_URL}" target="_blank" class="btn btn-outline" style="text-align:center;text-decoration:none;">Buka Web Penjual</a>
    </div>
  </div>`;
}

/* ---- tab: toko ---- */
async function renderAdminToko(){
  const el = document.getElementById('adminContent');
  el.innerHTML = '<div class="empty">Memuat toko…</div>';
  const storeKeys = await sList('store:', true);
  const stores = (await Promise.all(storeKeys.map(k => sGet(k, true)))).filter(Boolean);
  if(stores.length === 0){ el.innerHTML = '<div class="empty">Belum ada toko terdaftar.</div>'; return; }
  const rows = await Promise.all(stores.map(async s => {
    const menuKeys = await sList('menu:' + s.id + ':', true);
    return {...s, menuCount: menuKeys.length};
  }));
  el.innerHTML = rows.map(s => `
    <div class="card">
      <div class="row" style="align-items:flex-start;">
        <div>
          <h3 style="margin-bottom:2px;">${escapeHtml(s.name)}</h3>
          <p class="muted" style="margin:0;">${escapeHtml(s.desc || 'Belum ada deskripsi')}</p>
        </div>
        <span class="badge badge-diproses">${s.menuCount} menu</span>
      </div>
      <div class="row" style="margin-top:10px;">
        <span class="muted">Meja rujukan: ${s.nearTable || '- belum diisi -'}</span>
        <button class="linklike" style="color:var(--chili);" onclick="deleteToko('${s.id}')">Hapus toko</button>
      </div>
    </div>`).join('');
}

async function deleteToko(storeId){
  if(!confirm('Hapus toko ini beserta seluruh menunya? Riwayat pesanan lama tidak akan ikut terhapus, tapi tindakan ini tidak bisa dibatalkan.')) return;
  const store = await sGet('store:' + storeId, true);
  const menuKeys = await sList('menu:' + storeId + ':', true);
  for(const k of menuKeys){ await sDel(k, true); }
  await sDel('store:' + storeId, true);
  if(store && store.ownerUsername){ await sDel('seller:' + store.ownerUsername, true); }
  renderAdminToko();
}

/* ---- tab: pesanan (lintas semua toko) ---- */
async function renderAdminPesanan(){
  const el = document.getElementById('adminContent');
  el.innerHTML = '<div class="empty">Memuat pesanan…</div>';
  const orderKeys = await sList('order:', true);
  let orders = (await Promise.all(orderKeys.map(k => sGet(k, true)))).filter(Boolean);
  orders.sort((a,b) => b.createdAt - a.createdAt);
  if(orders.length === 0){ el.innerHTML = '<div class="empty">Belum ada pesanan.</div>'; return; }
  const shown = orders.slice(0, 50);
  el.innerHTML = shown.map(o => `
    <div class="card">
      <div class="row">
        <div><strong>${escapeHtml(o.storeName)}</strong> <span class="muted">· Meja ${o.table}</span></div>
        <span class="badge badge-${o.status}">${STATUS_LABEL[o.status]}</span>
      </div>
      <div class="row" style="margin-top:6px;">
        <span class="muted">${new Date(o.createdAt).toLocaleString('id-ID')}</span>
        <strong>${rupiah(o.total)}</strong>
      </div>
    </div>`).join('') + (orders.length > 50
      ? `<p class="muted" style="text-align:center;">Menampilkan 50 pesanan terbaru dari total ${orders.length}.</p>`
      : '');
}

/* ---- tab: pengaturan ---- */
async function renderAdminSetting(){
  const el = document.getElementById('adminContent');
  const cfg = await sGet('config:totalTables', true);
  el.innerHTML = `
  <div class="card">
    <h3>Jumlah Meja di Alun-Alun</h3>
    <p class="muted">Dipakai untuk denah lokasi & pengurutan toko terdekat di seluruh sistem.</p>
    <div class="field"><label>Jumlah meja</label><input id="setTotal" type="number" min="1" max="50" value="${cfg?.total || 16}"></div>
    <button class="btn btn-primary" onclick="saveTotalTables()">Simpan</button>
    <p id="totalMsg" class="muted" style="margin-top:8px;"></p>
  </div>
  <div class="card">
    <h3>Ganti Password Admin</h3>
    <div class="field"><label>Password baru</label><input id="newAdminPass" type="password" placeholder="minimal 6 karakter"></div>
    <button class="btn btn-outline" onclick="changeAdminPassword()">Simpan Password Baru</button>
    <p id="passMsg" class="muted" style="margin-top:8px;"></p>
  </div>`;
}

async function saveTotalTables(){
  const n = Number(document.getElementById('setTotal').value) || 16;
  await sSet('config:totalTables', {total:n}, true);
  document.getElementById('totalMsg').textContent = 'Tersimpan.';
}

async function changeAdminPassword(){
  const p = document.getElementById('newAdminPass').value;
  const msg = document.getElementById('passMsg');
  if(!p || p.length < 6){ msg.textContent = 'Password minimal 6 karakter.'; return; }
  const acc = await sGet('admin:owner', true) || {};
  acc.password = p;
  await sSet('admin:owner', acc, true);
  msg.textContent = 'Password admin diperbarui.';
}
