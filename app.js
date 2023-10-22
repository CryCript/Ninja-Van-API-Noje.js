const express = require('express');
const axios = require('axios');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');

// EJS
app.set('view engine', 'ejs');

// EJS View
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());

const db = mysql.createPool({
    host: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx',
    user: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx',
    password: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx',
    database: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  const getAccessToken = async () => {
    const client_id = 'xxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const client_secret = 'xxxxxxxxxxxxxxxxxxxxxxxxxxx';

    const config = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const requestData = {
        client_id,
        client_secret,
        grant_type: 'client_credentials',
    };

    try {
        const results = await new Promise((resolve, reject) => {
            const selectQuery = "SELECT * FROM OAuth WHERE id = 1"; // Pilih token dengan ID 1
            db.query(selectQuery, (err, results) => {
                if (err) {
                    reject(err);
                }
                resolve(results);
            });
        });

        if (results.length === 0 || isTokenExpired(results[0].expires)) {
            const response = await axios.post('https://api-sandbox.ninjavan.co/ID/2.0/oauth/access_token', requestData, config);
            const accessToken = response.data.access_token;
            const expires = new Date(response.data.expires * 1000);

            // Perbarui token akses dengan ID 1
            const updateQuery = "UPDATE OAuth SET access_token = ?, expires = ?, expires_in = ?, token_type = ? WHERE id = 1";
            await new Promise((resolve, reject) => {
                db.query(updateQuery, [accessToken, expires, response.data.expires_in, response.data.token_type], (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            console.log('Token akses berhasil diperbarui di database');
            return accessToken;
        } else {
            const accessToken = results[0].access_token;
            console.log('Menggunakan token akses yang sudah ada');
            return accessToken;
        }
    } catch (error) {
        console.error('Gagal mendapatkan atau memperbarui token akses:', error);
        throw error;
    }
};

  const isTokenExpired = (expirationDate) => {
    const now = new Date();
    return now >= expirationDate;
  };

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/orders', (req, res) => {
    const query = 'SELECT * FROM OrderResponse';
  
    db.query(query, (error, results) => {
      if (error) {
        console.error('Gagal mengambil data pesanan:', error);
        res.status(500).json({ error: 'Gagal mengambil data pesanan' });
      } else {
        res.json(results);
      }
    });
  });

  // Download Waybill
app.get('/download-waybill/:trackingNumber', async (req, res) => {
    try {

      const accessToken = await getAccessToken();
  
      const trackingNumber = req.params.trackingNumber;
  
      // URL unduhan Waybill
      const downloadURL = `https://api-sandbox.ninjavan.co/sg/2.0/reports/waybill?tids=${trackingNumber}&h=0&orientation=landscape`;
  
      const headers = {
        Authorization: `Bearer ${accessToken}`
      };
  
      const response = await axios.get(downloadURL, { headers, responseType: 'stream' });
  
      // Set header untuk merespons file PDF
      res.setHeader('Content-disposition', `attachment; filename=Waybill_${trackingNumber}.pdf`);
      res.setHeader('Content-type', 'application/pdf');
  
      // Mengalihkan respons dari Ninja Van API ke respons klien (frontend)
      response.data.pipe(res);
    } catch (error) {
      console.error('Gagal mengunduh Waybill:', error);
      res.status(500).json({ error: 'Gagal mengunduh Waybill' });
    }
  });

// cancel order
app.delete('/cancel-order/:trackingNumber', async (req, res) => {
    try {
        const accessToken = await getAccessToken();

        const trackingNumber = req.params.trackingNumber;

        // URL untuk membatalkan pesanan
        const cancelOrderURL = `https://api-sandbox.ninjavan.co/sg/2.2/orders/${trackingNumber}`;

        const headers = {
            Authorization: `Bearer ${accessToken}`,
        };

        const response = await axios.delete(cancelOrderURL, { headers });

        if (response.status === 200) {
            const responseData = response.data;
        
            const trackingId = responseData.trackingId;
            const status = responseData.status;
            const updatedAt = responseData.updatedAt;
        
            const updateQuery = 'UPDATE OrderResponse SET status = ? WHERE tracking_number = ?';
        
            try {
                await new Promise((resolve, reject) => {
                    db.query(updateQuery, [status, trackingId], (err, results) => {
                        if (err) {
                            console.error('Error updating status in database:', err);
                            reject(err);
                        } else {
                            console.log(`Updated status in the database for tracking number ${trackingId}`);
                            resolve();
                        }
                    });
                });
        
                res.status(200).send({ message: 'Pesanan berhasil dibatalkan' });
            } catch (error) {
                console.error('Gagal mengubah status pesanan:', error);
                res.status(500).send({ error: 'Gagal membatalkan pesanan di database' });
            }
        } else {
            console.error('Gagal membatalkan pesanan:', response.statusText);
            res.status(response.status).send({ error: 'Gagal membatalkan pesanan di API' });
        }        
    } catch (error) {
        console.error('Gagal membatalkan pesanan:', error);
        res.status(500).json({ error: 'Gagal membatalkan pesanan' });
    }
});

app.get('/create', (req, res) => {
    res.render('create');
});

// View Order
app.get('/vieworder/:trackingNumber', async (req, res) => {
    try {
        const trackingNumber = req.params.trackingNumber;
        const query = 'SELECT * FROM OrderResponse WHERE tracking_number = ?';
        db.query(query, [trackingNumber], (error, results) => {
            if (error) {
                console.error('Gagal mengambil data pesanan:', error);
                res.status(500).json({ error: 'Gagal mengambil data pesanan' });
            } else if (results.length === 0) {
                res.status(404).json({ error: 'Data tidak ditemukan' });
            } else {
                const orderData = results[0];
                res.render('vieworder', { orderData });
            }
        });
    } catch (error) {
        console.error('Gagal mengambil data pesanan:', error);
        res.status(500).json({ error: 'Gagal mengambil data pesanan' });
    }
});

// Create order
app.post('/createOrder', async (req, res) => {
    try {
        const accessToken = await getAccessToken();

        const orderData = req.body;

        const headers = {
            Authorization: `Bearer ${accessToken}`,
        };

        const response = await axios.post('https://api-sandbox.ninjavan.co/sg/4.1/orders', orderData, { headers });

        const orderResponse = response.data;

        console.log('Response', orderResponse);

        // Simpan respons ke dalam database
        const columnMapping = {
            requested_tracking_number: 'requested_tracking_number',
            tracking_number: 'tracking_number',
            service_type: 'service_type',
            service_level: 'service_level',
            merchant_order_number: 'reference.merchant_order_number',
            from_name: 'from.name',
            from_phone_number: 'from.phone_number',
            from_email: 'from.email',
            from_address1: 'from.address.address1',
            from_address2: 'from.address.address2',
            from_area: 'from.address.area',
            from_city: 'from.address.city',
            from_state: 'from.address.state',
            from_address_type: 'from.address.address_type',
            from_country: 'from.address.country',
            from_postcode: 'from.address.postcode',
            to_name: 'to.name',
            to_phone_number: 'to.phone_number',
            to_email: 'to.email',
            to_address1: 'to.address.address1',
            to_address2: 'to.address.address2',
            to_area: 'to.address.area',
            to_city: 'to.address.city',
            to_state: 'to.address.state',
            to_address_type: 'to.address.address_type',
            to_country: 'to.address.country',
            to_postcode: 'to.address.postcode',
            is_pickup_required: 'parcel_job.is_pickup_required',
            pickup_service_type: 'parcel_job.pickup_service_type',
            pickup_service_level: 'parcel_job.pickup_service_level',
            pickup_address_id: 'parcel_job.pickup_address_id',
            pickup_date: 'parcel_job.pickup_date',
            pickup_start_time: 'parcel_job.pickup_timeslot.start_time',
            pickup_end_time: 'parcel_job.pickup_timeslot.end_time',
            pickup_timezone: 'parcel_job.pickup_timeslot.timezone',
            pickup_instructions: 'parcel_job.pickup_instructions',
            delivery_start_date: 'parcel_job.delivery_start_date',
            delivery_start_time: 'parcel_job.delivery_timeslot.start_time',
            delivery_end_time: 'parcel_job.delivery_timeslot.end_time',
            delivery_timezone: 'parcel_job.delivery_timeslot.timezone',
            delivery_instructions: 'parcel_job.delivery_instructions',
            allow_weekend_delivery: 'parcel_job.allow_weekend_delivery',
            parcel_weight: 'parcel_job.dimensions.weight',
            item_description: 'parcel_job.items[0].item_description',
            item_quantity: 'parcel_job.items[0].quantity',
            is_dangerous_good: 'parcel_job.items[0].is_dangerous_good',
        };

        const columnNames = Object.keys(columnMapping);
        const columnValues = columnNames.map((columnName) => {
            const path = columnMapping[columnName].split('.');
            let value = orderResponse;
            for (let p of path) {
                if (value && value[p]) {
                    value = value[p];
                } else {
                    value = null;
                    break;
                }
            }
            return value;
        });

        const insertQuery = `
            INSERT INTO OrderResponse (${columnNames.join(', ')}) VALUES (${columnNames.map(() => '?').join(', ')})
        `;

        db.query(insertQuery, columnValues, (error, results) => {
            if (error) {
                console.error('Gagal menyimpan respons ke dalam database:', error);
            }
        });

        res.status(200).json(orderResponse);
    } catch (error) {
        console.error('Gagal membuat pesanan:', error);
        res.status(500).json({ error: 'Gagal membuat pesanan' });
    }
});

app.listen(3000, () => {
  console.log('Server berjalan di port 3000');
});

