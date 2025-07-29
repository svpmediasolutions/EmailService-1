# Render Deployment Guide

## Step 1: Prepare Your Repository

1. Make sure your code is in a Git repository (GitHub, GitLab, etc.)
2. Ensure all files are committed and pushed to your repository

## Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up or log in with your GitHub account
3. Connect your GitHub account if not already connected

## Step 3: Create New Web Service

1. Click "New +" button
2. Select "Web Service"
3. Connect your repository
4. Choose the repository containing this email service

## Step 4: Configure the Service

### Basic Settings:
- **Name**: `email-service` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)

### Build & Deploy Settings:
- **Build Command**: `npm install`
- **Start Command**: `npm start`

## Step 5: Environment Variables

Add these environment variables in the Render dashboard:

### Required Variables:
```
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_TO=recipient@example.com
```

### Optional Variables:
```
PORT=3001
DEBUG=false
NODE_ENV=production
```

## Step 6: Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and your device
   - Copy the generated 16-character password
3. **Use the app password** as `EMAIL_PASS` in Render

## Step 7: Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy your service
3. Wait for the build to complete (usually 2-5 minutes)

## Step 8: Test Your Deployment

Once deployed, test your endpoints:

### Health Check:
```
GET https://your-service-name.onrender.com/api/test
```

### Email Test:
```bash
curl -X POST https://your-service-name.onrender.com/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+1234567890",
    "company": "Test Company",
    "service": "Web Development",
    "message": "Test message"
  }'
```

## Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check that `package.json` exists and is valid
   - Ensure all dependencies are listed

2. **Email Not Sending**:
   - Verify `EMAIL_USER` and `EMAIL_PASS` are correct
   - Check that you're using an app password, not your regular password
   - Ensure 2FA is enabled on your Gmail account

3. **Service Won't Start**:
   - Check the logs in Render dashboard
   - Verify `PORT` environment variable is set correctly
   - Ensure `npm start` script exists in package.json

### Checking Logs:
1. Go to your service in Render dashboard
2. Click on "Logs" tab
3. Check for any error messages

## Security Notes

- Never commit `.env` files to your repository
- Use app passwords for Gmail, not your main password
- Consider adding rate limiting for production use
- Update CORS origins in `server.js` to match your frontend domain

## Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domains"
3. Add your domain and follow the DNS instructions

## Monitoring

- Render provides basic monitoring in the dashboard
- Check the "Metrics" tab for performance data
- Set up alerts for service downtime if needed 