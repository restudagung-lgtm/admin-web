/*
  app.js (web admin)
  -------------------
  Web ini berdiri sendiri, hanya untuk pemilik alun-alun.
  Harus dimuat PALING TERAKHIR di index.html.
*/

let state = {
  view: 'admin-auth',
  adminTab: 'ringkasan',
};

function go(view, extra){
  state.view = view;
  Object.assign(state, extra || {});
  render();
}

function render(){
  if(state.view === 'admin-auth') renderAdminAuth();
  else if(state.view === 'admin-dash') renderAdminDash();
  mountIcons();
}

/* ---------- nyalakan aplikasi ---------- */
(async function init(){
  const savedSession = await sGet('session', false);
  if(savedSession === 'owner'){
    const acc = await sGet('admin:owner', true);
    if(acc){ go('admin-dash', {adminTab:'ringkasan'}); return; }
  }
  go('admin-auth');
})();
