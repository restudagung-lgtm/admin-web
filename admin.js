// ======================================================================
// 🔴 WEB ADMIN    (folder: admin/)
// File: admin.js
// ======================================================================

/*
  admin.js
  --------
  Panel khusus PEMILIK ALUN-ALUN untuk memantau semua toko & pesanan
  lintas penjual, tanpa perlu login sebagai penjual tertentu.
  Bergantung pada: state & go() dari app.js, sGet/sSet/sList/sDel dari storage.js,
  fungsi bantu & ikon dari utils.js, dan BUYER_SITE_URL/SELLER_SITE_URL dari site-config.js.

  Catatan keamanan: ini akun tunggal (bukan multi-user), passwordnya disimpan
  di dokumen Firestore "admin:owner". Level prototipe -- lihat README untuk
  saran mengunci Firestore Rules sebelum dipakai sungguhan, karena akun ini
  punya akses paling besar (bisa menghapus toko mana pun).
*/

/* ---------- login / setup awal ---------- */
async function renderAdminAuth(){
  const app = document.getElementById('app');
  const existing = await sGet('admin:owner', true);

  if(!existing){
    app.innerHTML = `
    <div class="hero-card">
      <div class="ic-circle" style="width:56px;height:56px;border-radius:50%;margin:0 auto 14px;">${ic('shield',28)}</div>
      <h1>Setup Admin</h1>
      <p>Belum ada akun admin untuk alun-alun ini.<br>Buat password admin sekali di awal.</p>
    </div>
    <div class="content">
      <div class="card">
        <div class="field"><label>Buat password admin</label>
          <div class="pwd-wrap">
            <input id="apNew" type="password" placeholder="minimal 6 karakter">
            <button type="button" class="pwd-toggle ic-btn" onclick="togglePwd('apNew', this)">${ic('eye',16)}</button>
          </div>
        </div>
        <div class="field"><label>Ulangi password</label>
          <div class="pwd-wrap">
            <input id="apNew2" type="password" placeholder="ulangi password">
            <button type="button" class="pwd-toggle ic-btn" onclick="togglePwd('apNew2', this)">${ic('eye',16)}</button>
          </div>
        </div>
        <button class="btn btn-primary" onclick="setupAdmin()">Buat Akun Admin</button>
        <p id="setupMsg" class="muted" style="margin-top:8px;"></p>
      </div>
    </div>`;
    mountIcons();
    return;
  }

  app.innerHTML = `
  <div class="hero-card">
    <div class="ic-circle" style="width:56px;height:56px;border-radius:50%;margin:0 auto 14px;">${ic('shield',28)}</div>
    <h1>Panel Admin</h1>
    <p>Masuk untuk memantau seluruh toko dan pesanan di alun-alun.</p>
  </div>
  <div class="content">
    <div class="card">
      <div class="field"><label>Password admin</label>
        <div class="pwd-wrap">
          <input id="apLogin" type="password" placeholder="••••••">
          <button type="button" class="pwd-toggle ic-btn" onclick="togglePwd('apLogin', this)">${ic('eye',16)}</button>
        </div>
      </div>
      <button class="btn btn-primary" onclick="doAdminLogin()">Masuk</button>
      <p id="loginMsg" class="muted" style="margin-top:8px;"></p>
    </div>
  </div>`;
  mountIcons();
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
    <div style="flex:1;"><h2 style="display:flex;align-items:center;gap:8px;">${ic('shield',20)} Panel Admin</h2><div class="sub">Pantau semua toko &amp; pesanan</div></div>
    <button class="btn btn-sm btn-outline" onclick="doAdminLogout()">${ic('log-out',14)} Keluar</button>
  </div>
  <div class="content" id="adminContent"></div>
  <div class="tabbar">
    <button id="a-ringkasan" onclick="switchAdminTab('ringkasan')">${ic('bar-chart-3',20)}<span>Ringkasan</span></button>
    <button id="a-toko" onclick="switchAdminTab('toko')">${ic('store',20)}<span>Toko</span></button>
    <button id="a-pesanan" onclick="switchAdminTab('pesanan')">${ic('receipt',20)}<span>Pesanan</span></button>
    <button id="a-setting" onclick="switchAdminTab('setting')">${ic('settings',20)}<span>Pengaturan</span></button>
  </div>`;
  mountIcons();
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
  el.innerHTML = `<div class="empty">${ic('loader-2',24)} Memuat ringkasan…</div>`;
  mountIcons();
  const storeKeys = await sList('store:', true);
  const stores = (await Promise.all(storeKeys.map(k => sGet(k, true)))).filter(Boolean);
  const orderKeys = await sList('order:', true);
  const orders = (await Promise.all(orderKeys.map(k => sGet(k, true)))).filter(Boolean);
  const selesai = orders.filter(o => o.status === 'selesai');
  const dibatalkan = orders.filter(o => o.status === 'dibatalkan');
  const berjalan = orders.length - selesai.length - dibatalkan.length;
  const pendapatan = selesai.reduce((a,o) => a + o.total, 0);
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === todayStr);

  el.innerHTML = `
  <div class="card"><div class="muted">Jumlah toko terdaftar</div><h3>${stores.length}</h3></div>
  <div class="card"><div class="muted">Pesanan hari ini</div><h3>${todayOrders.length}</h3></div>
  <div class="card"><div class="muted">Pesanan sedang berjalan</div><h3>${berjalan}</h3></div>
  <div class="card"><div class="muted">Dibatalkan pembeli</div><h3>${dibatalkan.length}</h3></div>
  <div class="card"><div class="muted">Total pesanan (semua waktu)</div><h3>${orders.length}</h3></div>
  <div class="card"><div class="muted">Total pendapatan seluruh toko (pesanan selesai)</div><h3>${rupiah(pendapatan)}</h3></div>
  <div class="card">
    <h3>Tautan Cepat</h3>
    <div class="stack" style="margin-top:10px;">
      <a href="${BUYER_SITE_URL}" target="_blank" class="btn btn-outline" style="text-align:center;text-decoration:none;">Buka Web Pembeli</a>
      <a href="${SELLER_SITE_URL}" target="_blank" class="btn btn-outline" style="text-align:center;text-decoration:none;">Buka Web Penjual</a>
    </div>
  </div>`;
  mountIcons();
}

/* ---- tab: toko ---- */
async function renderAdminToko(){
  const el = document.getElementById('adminContent');
  el.innerHTML = `<div class="empty">${ic('loader-2',24)} Memuat toko…</div>`;
  mountIcons();
  const storeKeys = await sList('store:', true);
  const stores = (await Promise.all(storeKeys.map(k => sGet(k, true)))).filter(Boolean);
  if(stores.length === 0){ el.innerHTML = `<div class="empty">${ic('store',30)}<br>Belum ada toko terdaftar.</div>`; mountIcons(); return; }
  const rows = await Promise.all(stores.map(async s => {
    const menuKeys = await sList('menu:' + s.id + ':', true);
    return {...s, menuCount: menuKeys.length};
  }));
  el.innerHTML = rows.map(s => `
    <div class="card">
      <div class="row" style="align-items:flex-start;">
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="store-thumb" style="width:48px;height:48px;${s.photoURL ? `background-image:url('${s.photoURL}')` : ''}">${s.photoURL ? '' : ic('store',20)}</div>
          <div>
            <h3 style="margin-bottom:2px;">${escapeHtml(s.name)}</h3>
            <p class="muted" style="margin:0;">${escapeHtml(s.desc || 'Belum ada deskripsi')}</p>
            <div style="margin-top:2px;">${ratingBadge(s)}</div>
          </div>
        </div>
        <span class="badge badge-diproses">${s.menuCount} menu</span>
      </div>
      <div class="row" style="margin-top:10px;">
        <span class="muted">Meja rujukan: ${s.nearTable || '- belum diisi -'}${s.qrisImage ? ' · QRIS ✓' : ''}</span>
        <button class="ic-btn" style="color:var(--chili);" onclick="deleteToko('${s.id}')">${ic('trash-2',16)}</button>
      </div>
    </div>`).join('');
  mountIcons();
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
  el.innerHTML = `<div class="empty">${ic('loader-2',24)} Memuat pesanan…</div>`;
  mountIcons();
  const orderKeys = await sList('order:', true);
  let orders = (await Promise.all(orderKeys.map(k => sGet(k, true)))).filter(Boolean);
  orders.sort((a,b) => b.createdAt - a.createdAt);
  if(orders.length === 0){ el.innerHTML = `<div class="empty">${ic('receipt',30)}<br>Belum ada pesanan.</div>`; mountIcons(); return; }
  const shown = orders.slice(0, 50);
  el.innerHTML = shown.map(o => {
    const payLabel = o.paymentMethod === 'qris' ? 'QRIS' : 'Tunai';
    const payStatus = o.paymentStatus || (o.paymentMethod === 'qris' ? 'lunas' : 'bayar_ditempat');
    return `
    <div class="card">
      <div class="row">
        <div><strong>${escapeHtml(o.storeName)}</strong> <span class="muted">· Meja ${o.table}</span></div>
        <span class="badge badge-${o.status}">${STATUS_LABEL[o.status]}</span>
      </div>
      <div class="row" style="margin-top:6px;">
        <span class="muted">${new Date(o.createdAt).toLocaleString('id-ID')}</span>
        <strong>${rupiah(o.total)}</strong>
      </div>
      <div class="row" style="margin-top:6px;">
        <span class="badge badge-${payStatus}">${payLabel} ${payStatus === 'lunas' ? '· Lunas' : '· Bayar di tempat'}</span>
      </div>
    </div>`;
  }).join('') + (orders.length > 50
      ? `<p class="muted" style="text-align:center;">Menampilkan 50 pesanan terbaru dari total ${orders.length}.</p>`
      : '');
  mountIcons();
}

/* ---- tab: pengaturan ---- */
async function renderAdminSetting(){
  const el = document.getElementById('adminContent');
  const cfg = await sGet('config:totalTables', true);
  el.innerHTML = `
  <div class="card">
    <h3>Jumlah Meja di Alun-Alun</h3>
    <p class="muted" style="margin:4px 0 10px;">Dipakai untuk denah lokasi & pengurutan toko terdekat di seluruh sistem.</p>
    <div class="field"><label>Jumlah meja</label><input id="setTotal" type="number" min="1" max="50" value="${cfg?.total || 16}"></div>
    <button class="btn btn-primary" onclick="saveTotalTables()">Simpan</button>
    <p id="totalMsg" class="muted" style="margin-top:8px;"></p>
  </div>
  <div class="card">
    <h3>Ganti Password Admin</h3>
    <div class="field" style="margin-top:10px;"><label>Password baru</label>
      <div class="pwd-wrap">
        <input id="newAdminPass" type="password" placeholder="minimal 6 karakter">
        <button type="button" class="pwd-toggle ic-btn" onclick="togglePwd('newAdminPass', this)">${ic('eye',16)}</button>
      </div>
    </div>
    <button class="btn btn-outline" onclick="changeAdminPassword()">Simpan Password Baru</button>
    <p id="passMsg" class="muted" style="margin-top:8px;"></p>
  </div>`;
  mountIcons();
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
