// Test script for email service
import fetch from 'node-fetch';

const testEmail = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        company: 'Test Company',
        service: 'Web Development',
        message: 'This is a test message from the email service.'
      })
    });

    const result = await response.json();
    console.log('Response:', result);
    
    if (result.success) {
      console.log('✅ Email test successful!');
    } else {
      console.log('❌ Email test failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Test health endpoint first
const testHealth = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/test');
    const result = await response.json();
    console.log('Health check:', result);
    
    if (result.message === 'Server is running!') {
      console.log('✅ Server is healthy!');
      await testEmail();
    } else {
      console.log('❌ Server health check failed');
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
};

testHealth(); 