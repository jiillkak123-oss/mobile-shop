# Report Generation & Email System Setup Guide

## 🎯 Features Implemented

### 1. **Report Generation**
Generate comprehensive business reports in multiple formats:
- **Sales Report**: Overview of all sales transactions with totals and averages
- **Orders Report**: Detailed order information and status breakdown
- **Revenue Report**: Daily revenue breakdown for analytics
- **Products Report**: Top-selling products ranked by quantity
- **Users Report**: Customer and user ordering information

**Supported Formats:**
- CSV (Excel-compatible spreadsheet)
- TXT (Plain text, universal format)

### 2. **Email System**
Send formatted emails to customers and stakeholders with:
- Professional HTML formatting
- Branding integration
- Support for reports and announcements

---

## 🔧 Backend Setup

### Step 1: Install Dependencies
```bash
cd backend
npm install nodemailer
```

### Step 2: Configure Email Settings

Edit `backend/.env` file and add your email configuration:

```env
# Email Configuration for Report & Email Features
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

#### For Gmail Users:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. **Generate an App Password**:
   - Click "App passwords" 
   - Select "Mail" and "Windows Computer" (or your device)
   - Copy the generated 16-character password
   - Paste it in `EMAIL_PASSWORD` in `.env`

4. **Use this in your `.env`:**
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

#### For Other Email Providers:

Replace `gmail` with your provider:
- `yahoo` - Yahoo Mail
- `outlook` - Outlook/Hotmail
- `aol` - AOL Mail
- Custom transporter config [See Nodemailer Docs](https://nodemailer.com/smtp/well-known/)

### Step 3: Restart Backend Server
```bash
npm start
```

---

## 💻 Frontend Usage

### Accessing Report & Email Features

1. **Admin Dashboard** → Quick Actions (bottom of page) or Via Navbar
2. Two main buttons:
   - 📊 **Generate Report** - Create business reports
   - 📧 **Send Email** - Send emails to customers

### Using Report Generation

1. Click **"Generate Report"** button
2. Select report type from dropdown:
   - 📈 Sales Report
   - 📦 Orders Report  
   - 💰 Revenue Report
   - 🎁 Products Report
   - 👥 Users Report
3. Choose date range (start and end dates)
4. Select export format (CSV or TXT)
5. Click **"Generate & Download"**
6. Report will automatically download to your computer

### Using Email System

1. Click **"Send Email"** button
2. Fill in form:
   - **Recipient**: Enter customer/user email address
   - **Subject**: Email title/heading
   - **Message**: Email body content (supports line breaks)
3. Click **"Send Email"**
4. Confirmation message will appear when sent

---

## 📊 Report Details

### Sales Report
```
Total Sales: $X,XXX.XX
Total Orders: N
Average Order Value: $XXX.XX

Details:
- Order ID
- Customer Name  
- Number of Items
- Total Amount
- Order Date
```

### Orders Report
```
Total Orders: N
Status Summary:
- Pending: N
- Processing: N
- Shipped: N
- Completed: N

Details per order with status breakdown
```

### Revenue Report
```
Total Revenue: $X,XXX.XX

Revenue by Day:
- Date: $Amount
- Date: $Amount
```

### Products Report
```
Top Products Sold (Top 20):
- Product Name: Quantity sold
- Product Name: Quantity sold
```

### Users Report
```
New Ordering Users: N
Total Orders: N

User Details:
- Name (Email)
```

---

## API Endpoints

### Generate Report
```
GET /api/admin/report
Query Parameters:
  - type: sales|orders|revenue|products|users
  - startDate: YYYY-MM-DD
  - endDate: YYYY-MM-DD  
  - format: csv|txt

Headers:
  - Authorization: Bearer <admin-token>

Response: Binary file download (CSV or TXT)
```

### Send Email
```
POST /api/admin/send-email
Headers:
  - Authorization: Bearer <admin-token>
  - Content-Type: application/json

Body:
{
  "recipient": "user@example.com",
  "subject": "Email Subject",
  "message": "Email body content"
}

Response: {
  "message": "Email sent successfully",
  "recipient": "user@example.com"
}
```

---

## 🔒 Security Notes

- All endpoints require admin authentication token
- Emails are sent from your configured email account
- Reports generate data based on date range filters
- No sensitive information in plaintext logs

---

## ⚠️ Troubleshooting

### Email Not Sending?

1. **Check .env configuration:**
   ```bash
   echo $EMAIL_USER
   echo $EMAIL_PASSWORD
   ```

2. **For Gmail:**
   - Verify App Password (not your regular password)
   - Check 2-Step Verification is enabled
   - Try adding this to .env: `NODE_TLS_REJECT_UNAUTHORIZED=0`

3. **Check console logs:**
   ```
   Look for "Email transporter ready" on server startup
   ```

4. **Test email settings:**
   - Try sending a test email to verify configuration
   - Check spam/promotions folder

### Report Not Generating?

1. **Verify date range:**
   - Start date must be before end date
   - Ensure you have orders/data in that range

2. **Check admin token:**
   - Ensure you're logged in as admin
   - Token must not be expired

3. **Browser console:**
   - Check for any errors in browser developer tools (F12)
   - Look at Network tab for API response

---

## 📝 Example Use Cases

### Marketing Campaign
1. Generate Sales Report for last month
2. Write promotional email mentioning top products
3. Send email to all customers with special offers

### Financial Reporting
1. Generate Revenue Report for Q1
2. Generate Orders Report for status analysis
3. Export both as CSV for Excel analysis

### Product Analytics
1. Generate Products Report weekly
2. Identify trending items
3. Adjust inventory based on sales data

### Customer Communication
1. Send order confirmation/updates via email
2. Send promotional announcements
3. Send monthly newsletters with metrics

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review browser console for error messages
3. Check server logs for backend errors
4. Verify email credentials are correct

---

## 🎉 Features Ready!

Your admin dashboard now has:
- ✅ Multi-format report generation
- ✅ Email sending capability
- ✅ Professional report formatting
- ✅ Date-range filtering
- ✅ Secure authentication

Start generating reports and communicating with customers!
