# Email Service

A Node.js email service for handling contact form submissions using Nodemailer and Express.

## Features

- Contact form email processing
- CORS enabled for frontend integration
- Environment variable configuration
- Error handling and logging
- Ready for Render deployment

## Environment Variables

Create a `.env` file or set these in your Render dashboard:

```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_TO=recipient@example.com
PORT=3001
DEBUG=false
```

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use this app password as `EMAIL_PASS`

## Local Development

```bash
npm install
npm run dev
```

## Render Deployment

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Add environment variables in Render dashboard
5. Deploy!

## API Endpoints

- `GET /api/test` - Health check
- `POST /api/send-email` - Send contact form email

### Email Request Format

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Company Name",
  "service": "Web Development",
  "message": "Hello, I'm interested in your services!"
}
```

## Security Notes

- Never commit `.env` files to version control
- Use app passwords for Gmail, not your main password
- Consider rate limiting for production use 