// Gmail-like Bulk Email Composer with Enhanced Template
class EmailComposer {
  constructor() {
    this.initializeElements();
    this.attachEventListeners();
    this.loadEmailStats();
    this.setupRichTextEditor();
  }

  initializeElements() {
    this.form = document.getElementById('uploadForm');
    this.fileInput = document.getElementById('file');
    this.fileLabel = document.getElementById('fileLabel');
    this.fileUploadArea = this.fileInput.closest('.file-upload-area');
    this.subjectInput = document.getElementById('subject');
    this.bodyEditor = document.getElementById('bodyEditor');
    this.bodyTextarea = document.getElementById('body');
    this.footerInput = document.getElementById('footer');
    this.progressDiv = document.getElementById('progress');
    this.progressFill = document.getElementById('progressFill');
    this.resultDiv = document.getElementById('result');
    this.resultsCard = document.getElementById('resultsCard'); 
    this.downloadLink = document.getElementById('downloadLink');
    this.emailStats = document.getElementById('emailStats');
    this.sendInfo = document.getElementById('sendInfo');
    this.previewBtn = document.getElementById('previewBtn');
    this.previewModal = document.getElementById('previewModal');
    this.closePreview = document.getElementById('closePreview');
  }

  attachEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.bodyEditor.addEventListener('input', () => this.syncEditorContent());
    this.bodyEditor.addEventListener('paste', (e) => this.handlePaste(e));
    this.previewBtn.addEventListener('click', () => this.showPreview());
    this.closePreview.addEventListener('click', () => this.hidePreview());
    this.previewModal.addEventListener('click', (e) => {
      if (e.target === this.previewModal) this.hidePreview();
    });
    this.setupAutoSave();
    this.loadSavedContent();
  }

  setupRichTextEditor() {
    const toolbarBtns = document.querySelectorAll('.toolbar-btn');
    toolbarBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.dataset.command;
        document.execCommand(command, false, null);
        this.syncEditorContent();
        this.updateToolbarState();
      });
    });

    document.addEventListener('selectionchange', () => {
      if (document.activeElement === this.bodyEditor) {
        this.updateToolbarState();
      }
    });
  }

  updateToolbarState() {
    const toolbarBtns = document.querySelectorAll('.toolbar-btn');
    toolbarBtns.forEach(btn => {
      const command = btn.dataset.command;
      if (['bold', 'italic', 'underline'].includes(command)) {
        const isActive = document.queryCommandState(command);
        btn.classList.toggle('active', isActive);
      }
    });
  }

  handlePaste(e) {
    e.preventDefault();
    const text = (e.originalEvent || e).clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    this.syncEditorContent();
  }

  syncEditorContent() {
    this.bodyTextarea.value = this.bodyEditor.innerText;
    this.updateSendInfo();
    this.saveContent();
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
    const hasSubject = this.subjectInput.value.trim().length > 0;
    const hasBody = this.bodyEditor.innerText.trim().length > 0;
    
    if (hasFile && hasSubject && hasBody) {
      this.sendInfo.textContent = 'Ready to send bulk emails';
    } else {
      const missing = [];
      if (!hasFile) missing.push('file');
      if (!hasSubject) missing.push('subject');
      if (!hasBody) missing.push('message');
      this.sendInfo.textContent = `Missing: ${missing.join(', ')}`;
    }
  }

  setupAutoSave() {
    setInterval(() => this.saveContent(), 10000);
    this.subjectInput.addEventListener('input', () => this.saveContent());
    this.footerInput.addEventListener('input', () => this.saveContent());
  }

  saveContent() {
    const content = {
      subject: this.subjectInput.value,
      body: this.bodyEditor.innerHTML,
      bodyText: this.bodyEditor.innerText,
      footer: this.footerInput.value,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('bulkEmailDraft', JSON.stringify(content));
  }

  loadSavedContent() {
    try {
      const saved = localStorage.getItem('bulkEmailDraft');
      if (saved) {
        const content = JSON.parse(saved);
        this.subjectInput.value = content.subject || '';
        this.bodyEditor.innerHTML = content.body || '';
        this.bodyTextarea.value = content.bodyText || '';
        this.footerInput.value = content.footer || '';
        this.updateSendInfo();
      }
    } catch (error) {
      console.warn('Failed to load saved content:', error);
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

  showPreview() {
    const subject = this.subjectInput.value || '(No subject)';
    const body = this.bodyEditor.innerHTML || '(No message)';
    const footer = this.footerInput.value;
    
    document.getElementById('previewSubject').textContent = subject;
    document.getElementById('previewBody').innerHTML = this.generateEmailTemplate(body, footer, true);
    
    this.previewModal.classList.add('show');
  }

  hidePreview() {
    this.previewModal.classList.remove('show');
  }

  generateEmailTemplate(bodyContent, footerContent, isPreview = false) {
    return `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <!-- Email Header -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
          <img src="${'cid:footerlogo'}" alt="Company Logo" style="height: 40px;">
        </div>
        
        <!-- Email Body -->
        <div style="padding: 30px 20px; line-height: 1.6; color: #333;">
          ${bodyContent}
        </div>
        
        <!-- Email Footer -->
        <div style="padding: 20px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <img src="${'cid:footerlogo'}" alt="Logo" style="height: 32px;">
            <div style="flex: 1;">
              ${footerContent || '<span style="color: #999;">No footer text provided</span>'}
          
            </div>
          </div>
        </div>
      </div>
    `;
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
    
    if (!this.subjectInput.value.trim()) {
      this.showError('Please enter an email subject.');
      return;
    }
    
    if (!this.bodyEditor.innerText.trim()) {
      this.showError('Please enter an email message.');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.fileInput.files[0]);
    formData.append('subject', this.subjectInput.value);
    formData.append('body', this.bodyEditor.innerHTML);
    formData.append('footer', this.footerInput.value);

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
        
        localStorage.removeItem('bulkEmailDraft');
        await this.loadEmailStats();
        
      } else {
        const errorData = await response.json();
        this.showError(errorData.message || 'An unexpected error occurred.');
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('uploadForm').dispatchEvent(new Event('submit'));
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    document.getElementById('previewBtn').click();
  }
  
  if (e.key === 'Escape') {
    const previewModal = document.getElementById('previewModal');
    if (previewModal.classList.contains('show')) {
      previewModal.classList.remove('show');
    }
  }
});