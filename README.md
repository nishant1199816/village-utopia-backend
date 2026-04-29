# Village Utopia — Backend API

Node.js + Express + PostgreSQL + Prisma

---

## Quick Start (Local)

```bash
# 1. Clone & install
npm install

# 2. Setup env
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, RAZORPAY keys, SMTP details

# 3. Push schema to DB
npm run db:push

# 4. Seed rooms data
npm run db:seed

# 5. Run dev server
npm run dev
# → http://localhost:3001
```

---

## API Routes

### Auth
| Method | Endpoint          | Auth     | Description          |
|--------|-------------------|----------|----------------------|
| POST   | /api/auth/register | —       | Create account        |
| POST   | /api/auth/login    | —       | Login → get JWT token |
| GET    | /api/auth/me       | Bearer  | Get current user      |

### Rooms
| Method | Endpoint                              | Description                   |
|--------|---------------------------------------|-------------------------------|
| GET    | /api/rooms                            | List all rooms (filter by type/guests/dates) |
| GET    | /api/rooms/:slug                      | Get single room details        |
| GET    | /api/rooms/:id/availability           | Check if available for dates   |
| GET    | /api/rooms/:id/blocked-months         | Get blocked dates for calendar |

### Bookings
| Method | Endpoint                       | Auth     | Description                |
|--------|--------------------------------|----------|----------------------------|
| POST   | /api/bookings/create-order     | Optional | Create Razorpay order       |
| POST   | /api/bookings/verify-payment   | Optional | Verify Razorpay signature   |
| POST   | /api/bookings/offline          | Optional | Cash/offline booking        |
| GET    | /api/bookings/my               | Required | My booking history          |
| GET    | /api/bookings/:id              | Optional | Get booking by ID           |
| POST   | /api/bookings/:id/cancel       | Required | Cancel booking              |

---

## Deploy on Render.com

1. Push this folder to GitHub
2. Render → New → Web Service → connect repo
3. Build command: `npm install && npx prisma generate && npm run db:push`
4. Start command: `npm start`
5. Add all env variables from `.env.example`
6. Free PostgreSQL database: Render → New → PostgreSQL → copy Internal URL → set as `DATABASE_URL`

---

## Frontend Integration

In your React frontend (`src/pages/BookingPage.jsx`), replace the `handlePayment` function:

```javascript
const handlePayment = async () => {
  // 1. Create order on backend
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      roomId, checkin: checkIn.toISOString().split('T')[0],
      checkout: checkOut.toISOString().split('T')[0],
      guests, guestName: form.name, guestEmail: form.email,
      guestPhone: form.phone, specialRequests: form.special,
      addons, paymentType: payType.toUpperCase(),
    }),
  })
  const data = await res.json()
  if (!res.ok) return alert(data.error)

  // 2. Open Razorpay
  const rzp = new window.Razorpay({
    key:      data.razorpayKeyId,
    amount:   data.amount * 100,
    currency: 'INR',
    order_id: data.razorpayOrderId,
    name:     'Village Utopia Cottages',
    handler: async (response) => {
      // 3. Verify on backend
      const vRes = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...response, bookingId: data.bookingId }),
      })
      const vData = await vRes.json()
      if (vData.success) navigate(`/booking/success?ref=${vData.bookingRef}`)
    },
    prefill: { name: form.name, email: form.email, contact: form.phone },
    theme: { color: '#C9A96E' },
  })
  rzp.open()
}
```

Also add to `index.html`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

And to `.env` in frontend:
```
VITE_API_URL=https://your-backend.onrender.com
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
```
