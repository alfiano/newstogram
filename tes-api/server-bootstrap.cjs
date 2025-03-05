// server-bootstrap.cjs
// Muat variabel lingkungan dari .env (gunakan dotenv)
require('dotenv').config();

import('./api/app.js')
  .then(({ default: app }) => {
    // Jangan memanggil app.listen() karena LSNode sudah mengaturnya.
    // Ekspor app agar LSNode dapat menggunakannya.
    module.exports = app;
    console.log("Aplikasi berhasil dimuat. LSNode akan memulai server.");
  })
  .catch((err) => {
    console.error("Gagal memuat aplikasi:", err);
    process.exit(1);
  });
