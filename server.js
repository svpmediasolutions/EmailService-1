import express from 'express';
import { createTransport } from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

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