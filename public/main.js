// Gmail-like Bulk Email Composer
class EmailComposer {
  constructor() {
    this.initializeElements();
    this.attachEventListeners();
    this.loadEmailStats();
  }

  initializeElements() {
    this.form = document.getElementById('uploadForm');
    this.fileInput = document.getElementById('file');
    this.fileLabel = document.getElementById('fileLabel');
    this.fileUploadArea = this.fileInput.closest('.file-upload-area');
    this.progressDiv = document.getElementById('progress');
    this.progressFill = document.getElementById('progressFill');
    this.resultDiv = document.getElementById('result');
    this.resultsCard = document.getElementById('resultsCard'); 
    this.downloadLink = document.getElementById('downloadLink');
    this.emailStats = document.getElementById('emailStats');
    this.sendInfo = document.getElementById('sendInfo');
    this.subjectInput = document.getElementById('subject');
  }

  attachEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.updateSendInfo();
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.fileLabel.textContent = file.name;
      this.fileUploadArea.classList.add('has-file');
      this.updateSendInfo();
    } else {
      this.fileLabel.textContent = 'Choose XLSX file with email addresses';
      this.fileUploadArea.classList.remove('has-file');
    }
  }

  updateSendInfo() {
    const hasFile = this.fileInput.files.length > 0;
    if (hasFile) {
      this.sendInfo.textContent = 'Ready to send bulk emails';
    } else {
      this.sendInfo.textContent = 'Missing: file';
    }
  }

  async loadEmailStats() {
    try {
      const response = await fetch('/api/email-stats');
      const stats = await response.json();
      
      const remainingClass = stats.remainingToday > 50 ? 'success' : 
                           stats.remainingToday > 20 ? '' : 'warning';
      
      this.emailStats.innerHTML = `
        <span class="stats-item ${remainingClass}">
          ${stats.remainingToday}/${stats.dailyLimit} emails remaining today
        </span>
        <span class="stats-item">
          ${stats.dailyCount} sent today
        </span>
      `;
    } catch (error) {
      this.emailStats.innerHTML = '<span class="stats-item">Unable to load email stats</span>';
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    this.resultDiv.style.display = 'none';
    this.resultsCard.style.display = 'block';
    this.progressDiv.textContent = '';
    this.progressFill.style.width = '0%';

    if (!this.fileInput.files.length) {
      this.showError('Please select an Excel file with email addresses.');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.fileInput.files[0]);
    // Use entered subject or default
    const subject = this.subjectInput && this.subjectInput.value.trim() ? this.subjectInput.value.trim() : 'SVP Media Solutions';
    formData.append('subject', subject);

    this.progressDiv.textContent = 'Uploading file and processing emails...';
    this.progressFill.style.width = '20%';

    try {
      const response = await fetch('/api/send-bulk-email', {
        method: 'POST',
        body: formData
      });

      if (response.status === 429) {
        const errorData = await response.json();
        this.showError(errorData.message);
        await this.loadEmailStats();
        return;
      }

      if (response.ok) {
        this.progressDiv.textContent = 'Emails processed successfully! Preparing results...';
        this.progressFill.style.width = '100%';
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        this.downloadLink.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : 'bulk-email-results.xlsx';
        this.downloadLink.download = filename;
        
        this.resultDiv.style.display = 'block';
        this.progressDiv.textContent = 'Bulk email campaign completed! Download your results below.';
        
        await this.loadEmailStats();
        
      } else {
        const errorData = await response.json();
        this.showError(errorData.message || 'An unexpected error occurred.');
        console.error('Bulk email error:', errorData);
      }
    } catch (error) {
      console.error('Email sending error:', error);
      this.showError('Network error: ' + error.message);
    }
  }

  showError(message) {
    this.progressDiv.textContent = `Error: ${message}`;
    this.progressDiv.style.color = '#d93025';
    this.progressFill.style.width = '0%';
    this.resultDiv.style.display = 'none';
    
    setTimeout(() => {
      this.progressDiv.style.color = '';
    }, 5000);
  }
}

// Initialize the email composer
document.addEventListener('DOMContentLoaded', () => {
  new EmailComposer();
});