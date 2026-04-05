# Quick Setup Guide - 3rd Party Integrations

## 1. VNPAY Payment Gateway

### Step 1: Signup
- Go to https://vnpayment.vn/
- Create account and verify

### Step 2: Get Credentials
1. Login to VNPAY dashboard
2. Navigate to **API Configuration**
3. Find **Terminal Code (TMN Code)** and **Secret Key**
4. Copy both values

### Step 3: Configure Backend
Edit `backend/.env`:
```
VNPAY_TMN_CODE=TMNCODE_HERE
VNPAY_SECRET_KEY=SECRETKEY_HERE
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_API_URL=https://sandbox.vnpayment.vn/merchant_webapi/merchant_transaction/
```

### Step 4: Test Payment
- Payment page at `/my-bookings`
- Click "Thanh toán VNPAY"
- Test card: **9704 + any 16 digits**
- Example: `9704 0000 0000 0000`
- OTP: Any 6 numbers

---

## 2. Google Maps API

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Create new project (name: "Travel Management")
3. Enable **Maps JavaScript API**

### Step 2: Create API Key
1. Navigate to **Credentials**
2. Click **Create Credentials** → **API Key**
3. Restrict key to browser, add URL: `localhost:5173`
4. Copy the API Key

### Step 3: Configure Frontend
Edit `frontend/.env`:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...YOUR_KEY_HERE
```

### Step 4: Test Maps
- Create or edit tour with location
- Tour detail page shows interactive map
- Try tours with latitude/longitude set

---

## 3. Cloudinary Image Upload

### Step 1: Signup
1. Go to https://cloudinary.com/
2. Create free account

### Step 2: Get API Credentials
1. Go to **Dashboard**
2. Find:
   - **Cloud Name** (under "API Environment variable")
   - **API Key**
   - **API Secret**
3. Copy all three

### Step 3: Configure Backend
Edit `backend/.env`:
```
CLOUDINARY_CLOUD_NAME=xyz123
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=abcdefghijk
```

### Step 4: Test Upload
1. Login as admin
2. Navigate to **Admin → Manage Tours**
3. Create new tour
4. Click **Upload ảnh**
5. Select image from computer
6. Image uploads and displays in preview

---

## Quick Test Workflow

1. **Backend Start**
   ```bash
   cd backend
   npm run dev
   ```

2. **Frontend Start** (new terminal)
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login as Admin**
   - Email: `admin@travel.com`
   - Password: `password`

4. **Create a Tour**
   - Navigate: Admin → Manage Tours → Create new
   - Upload image (Cloudinary)
   - Set latitude/longitude (for Google Maps)
   - Submit

5. **Book as User**
   - Logout / Login as `user@travel.com`
   - Browse tours (see map on detail page)
   - Book tour
   - Pay with VNPAY sandbox

---

## Environment Variables Checklist

### Backend (`backend/.env`)
- [ ] `PORT=5000`
- [ ] `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- [ ] `JWT_SECRET`
- [ ] `VNPAY_TMN_CODE`
- [ ] `VNPAY_SECRET_KEY`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`

### Frontend (`frontend/.env`)
- [ ] `VITE_API_URL=http://localhost:5000/api`
- [ ] `VITE_GOOGLE_MAPS_API_KEY`

---

## Troubleshooting

### Maps not showing?
- Check `VITE_GOOGLE_MAPS_API_KEY` is set
- Verify API key has Maps JavaScript API enabled
- Check browser console for errors

### Upload not working?
- Verify Cloudinary credentials in `.env`
- Ensure `uploads/` folder exists in backend root
- Check multer file size limits

### Payment failing?
- Sandbox URL: https://sandbox.vnpayment.vn/
- Use test card: 9704 + random digits
- Check VNPAY hash signature in logs if fails

### Database errors?
- Ensure MySQL is running
- Run `schema.sql` then `seed.sql`
- Check connection string in `.env`
