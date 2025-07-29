import express from 'express';
import { createTransport } from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import XLSX from 'xlsx';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.com'] // Replace with your frontend domain
    : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Create transporter with better error handling
let transporter = null;

const createEmailTransporter = () => {
  try {
    // Validate required environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing required environment variables: EMAIL_USER or EMAIL_PASS');
      return null;
    }

    const newTransporter = createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      debug: process.env.DEBUG === 'true',
      logger: process.env.DEBUG === 'true'
    });
    
    console.log('Email transporter created successfully');
    return newTransporter;
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
};

// Initialize transporter
transporter = createEmailTransporter();

// Multer setup for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    console.log('Received email request:', req.body);
    
    const { name, email, phone, company, service, message } = req.body;

    // Enhanced validation
    const requiredFields = { name, email, phone, message };
    const missingFields = Object.keys(requiredFields).filter(field => !requiredFields[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if transporter is available
    if (!transporter) {
      console.error('Email transporter not initialized');
      return res.status(500).json({
        success: false,
        message: 'Email service is not configured properly'
      });
    }

    // Email template with better formatting
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      subject: `New Contact Form Submission${service ? ` - ${service}` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #007bff; margin-top: 0;">Contact Information:</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
            <p><strong>Company:</strong> ${company || 'Not provided'}</p>
            ${service ? `<p><strong>Service Interest:</strong> ${service}</p>` : ''}
          </div>
          
          <div style="background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px;">
            <h3 style="color: #007bff; margin-top: 0;">Message:</h3>
            <p style="line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          <p style="color: #6c757d; font-size: 12px; text-align: center;">
            This email was sent from your website contact form at ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      text: `
New Contact Form Submission

Contact Information:
Name: ${name}
Email: ${email}
Phone: ${phone}
Company: ${company || 'Not provided'}
${service ? `Service Interest: ${service}` : ''}

Message:
${message}

---
Sent from your website contact form at ${new Date().toLocaleString()}
      `
    };

    console.log('Attempting to send email...');
    
    // Send email with timeout
    const result = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout')), 30000)
      )
    ]);
    
    console.log('Email sent successfully:', result.messageId);
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Email service connection failed. Please try again later.';
    } else if (error.message === 'Email timeout') {
      errorMessage = 'Email request timed out. Please try again.';
    } else {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage 
    });
  }
});

// Daily email tracking
let dailyEmailCount = 0;
let lastResetDate = new Date().toDateString();
const DAILY_EMAIL_LIMIT = 150;

// Function to reset daily count
const resetDailyCountIfNeeded = () => {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyEmailCount = 0;
    lastResetDate = today;
    console.log('Daily email count reset');
  }
};

// Get daily email stats endpoint
app.get('/api/email-stats', (req, res) => {
  resetDailyCountIfNeeded();
  res.json({
    dailyCount: dailyEmailCount,
    dailyLimit: DAILY_EMAIL_LIMIT,
    remainingToday: Math.max(0, DAILY_EMAIL_LIMIT - dailyEmailCount),
    resetDate: lastResetDate
  });
});

// Bulk email endpoint
app.post('/api/send-bulk-email', upload.single('file'), async (req, res) => {
  try {
    resetDailyCountIfNeeded();
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { subject, body, footer } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'Subject and body are required.' });
    }
    
    // Parse XLSX file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (!jsonData.length) {
      return res.status(400).json({ success: false, message: 'No data found in file' });
    }
    
    // Find email column (case-insensitive)
    const emailCol = Object.keys(jsonData[0]).find(
      key => key.toLowerCase().includes('email')
    );
    if (!emailCol) {
      return res.status(400).json({ success: false, message: 'No email column found in file' });
    }
    
    // Check daily limit
    const remainingEmails = DAILY_EMAIL_LIMIT - dailyEmailCount;
    if (remainingEmails <= 0) {
      return res.status(429).json({ 
        success: false, 
        message: `Daily email limit of ${DAILY_EMAIL_LIMIT} reached. Please try again tomorrow.`,
        dailyCount: dailyEmailCount,
        dailyLimit: DAILY_EMAIL_LIMIT
      });
    }
    
    // Limit emails to remaining daily allowance
    const maxEmailsToProcess = Math.min(jsonData.length, remainingEmails);
    const rows = jsonData.slice(0, maxEmailsToProcess);
    const results = [];
    let sentCount = 0, failedCount = 0, skippedCount = 0;
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const toEmail = row[emailCol];
      
      // Skip if we've hit the daily limit
      if (dailyEmailCount >= DAILY_EMAIL_LIMIT && i >= maxEmailsToProcess) {
        results.push({ 
          ...row, 
          status: 'Skipped - Daily Limit Reached', 
          notes: `Daily limit of ${DAILY_EMAIL_LIMIT} emails exceeded` 
        });
        skippedCount++;
        continue;
      }
      
      if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
        results.push({ 
          ...row, 
          status: 'Failed', 
          notes: 'Invalid email format' 
        });
        failedCount++;
        continue;
      }
      
      // Only process if within daily limit
      if (i < maxEmailsToProcess) {
        // Compose email content with better formatting
        const htmlContent = `
        <div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 640px; margin: 0 auto; line-height: 1.6; color: #333;">
        
          <!-- Logo Header -->
          <div style="text-align: center; padding: 30px 0 20px;">
            <img src="cid:footerlogo" alt="Company Logo" style="height: 40px;">
          </div>
        
          <!-- Main Content -->
          <div style="padding: 0 20px 20px; font-size: 15px; line-height: 1.7; color: #444;">
            ${body.replace(/\n/g, '<br>')}
          </div>
        
          <!-- Subtle Divider -->
          <div style="border-top: 1px solid #f0f0f0; margin: 0 20px;"></div>
        
          <!-- Footer with Logo -->
          <div style="padding: 25px 20px 10px; display: flex; align-items: flex-start;">
            <div style="margin-right: 15px;">
               <img src="cid:footerlogo" alt="Company Logo" style="height: 40px;">
            </div>
            <div style="flex: 1; font-size: 13px; line-height: 1.5; color: #666;">
              ${footer && footer.trim() ? footer.replace(/\n/g, '<br>') : ''}
              <div style="margin-top: 10px; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} Company Name. All rights reserved.
              </div>
            </div>
          </div>
        </div>
`;
        const textContent = `${body}\n\n${footer || ''}`;
        
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: toEmail,
          subject: subject,
          html: htmlContent,
          text: textContent,
          attachments: [
            {
              filename: 'logo.png',
              path: path.join(__dirname, 'public', 'logo.png'),
              cid: 'footerlogo'
            }
          ]
        };
        
        try {
          if (!transporter) throw new Error('Transporter not initialized');
          const result = await transporter.sendMail(mailOptions);
          results.push({ 
            ...row, 
            status: 'Sent Successfully', 
            notes: `Message ID: ${result.messageId}`,
            sentAt: new Date().toISOString()
          });
          sentCount++;
          dailyEmailCount++;
        } catch (err) {
          results.push({ 
            ...row, 
            status: 'Failed', 
            notes: err.message,
            failedAt: new Date().toISOString()
          });
          failedCount++;
        }
      }
    }
    
    // Generate enhanced XLSX with results
    const resultSheet = XLSX.utils.json_to_sheet(results);
    const resultWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(resultWb, resultSheet, 'Email Results');
    
    // Add summary sheet
    const summary = [
      { Metric: 'Total Emails in File', Value: jsonData.length },
      { Metric: 'Emails Sent Successfully', Value: sentCount },
      { Metric: 'Failed Emails', Value: failedCount },
      { Metric: 'Skipped (Daily Limit)', Value: skippedCount },
      { Metric: 'Daily Emails Used Today', Value: dailyEmailCount },
      { Metric: 'Daily Limit', Value: DAILY_EMAIL_LIMIT },
      { Metric: 'Remaining Today', Value: Math.max(0, DAILY_EMAIL_LIMIT - dailyEmailCount) },
      { Metric: 'Processing Date', Value: new Date().toLocaleString() }
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(resultWb, summarySheet, 'Summary');
    
    const resultBuffer = XLSX.write(resultWb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for file download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    res.setHeader('Content-Disposition', `attachment; filename="bulk-email-results-${timestamp}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(resultBuffer);
    
    console.log(`Bulk email completed: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped. Daily count: ${dailyEmailCount}/${DAILY_EMAIL_LIMIT}`);
    
  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Serve static files (frontend)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Serve sample XLSX template
app.get('/sample-template.xlsx', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sample-template.xlsx'));
});

// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/test',
      'POST /api/send-email'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/test`);
  console.log(`📤 Email endpoint: http://localhost:${PORT}/api/send-email`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (!transporter) {
    console.warn('⚠️  Email transporter not initialized - check environment variables');
  } else {
    console.log('✅ Email transporter initialized successfully');
  }
}); 