# Ninja Van API Node.js

Proyek ini adalah aplikasi layanan backend sederhana yang bertujuan untuk mengelola pesanan dan berkomunikasi dengan API Ninja Van. Aplikasi ini dibangun menggunakan Express.js dan MySQL sebagai database penyimpanan informasi pesanan.

## Penggunaan

Anda dapat menggunakan proyek ini dengan mengikuti langkah-langkah berikut:

1. **Instalasi**: Pastikan Anda telah menginstal dependensi dengan menjalankan `npm install`.

2. **Konfigurasi**: Sesuaikan konfigurasi dalam kode proyek sesuai kebutuhan.

3. **Menjalankan Aplikasi**: Jalankan aplikasi dengan `node app.js`. Aplikasi akan berjalan di `http://localhost:3000`.

4. **Endpoint**: Gunakan endpoint-endpoint berikut:

   - `GET /orders`: Untuk mendapatkan data pesanan.
   - `GET /download-waybill/:trackingNumber`: Untuk mengunduh Waybill dengan nomor pelacakan tertentu.
   - `DELETE /cancel-order/:trackingNumber`: Untuk membatalkan pesanan.
   - `POST /createOrder`: Untuk membuat pesanan baru dengan data yang dikirim dari frontend.
   - `GET /vieworder/:trackingNumber`: Untuk melihat detail pesanan berdasarkan nomor pelacakan.

## Kontribusi

Anda dapat berkontribusi pada proyek ini dengan mengirim *pull request* atau melaporkan masalah yang Anda temui.

## Lisensi

Proyek ini menggunakan lisensi [MIT](LICENSE).
