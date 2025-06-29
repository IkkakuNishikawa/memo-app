const { ipcRenderer } = require('electron');

class MemoApp {
  constructor() {
    this.isRecording = false;
    this.recognition = null;
    this.currentMemoId = null;
    this.currentView = 'editor';
    this.initializeElements();
    this.setupEventListeners();
    this.setupSpeechRecognition();
    this.loadCurrentMemo();
  }

  initializeElements() {
    this.voiceBtn = document.getElementById('voiceBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.listBtn = document.getElementById('listBtn');
    this.backBtn = document.getElementById('backBtn');
    this.newMemoBtn = document.getElementById('newMemoBtn');
    this.saveBtn = document.getElementById('saveBtn');
    this.memoText = document.getElementById('memoText');
    this.aiInstruction = document.getElementById('aiInstruction');
    this.processBtn = document.getElementById('processBtn');
    this.status = document.getElementById('status');
    this.aiStatus = document.getElementById('aiStatus');
    this.memoEditor = document.getElementById('memoEditor');
    this.memoList = document.getElementById('memoList');
    this.memoListContainer = document.getElementById('memoListContainer');
    this.deleteConfirmation = document.getElementById('deleteConfirmation');
    this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    this.memoToDelete = null;
    
    // File attachment elements
    this.fileInput = document.getElementById('fileInput');
    this.fileDropZone = document.getElementById('fileDropZone');
    this.attachedFiles = document.getElementById('attachedFiles');
    this.attachedFilesList = [];
  }

  setupEventListeners() {
    this.voiceBtn.addEventListener('click', () => {
      this.toggleVoiceRecording();
    });

    this.clearBtn.addEventListener('click', () => {
      this.memoText.value = '';
      this.updateStatus('クリアしました');
    });

    this.listBtn.addEventListener('click', () => {
      this.showMemoList();
    });

    this.backBtn.addEventListener('click', () => {
      this.showMemoEditor();
    });

    this.newMemoBtn.addEventListener('click', () => {
      this.createNewMemo();
    });

    this.saveBtn.addEventListener('click', () => {
      this.saveMemo();
    });

    this.processBtn.addEventListener('click', () => {
      this.processWithAI();
    });

    this.cancelDeleteBtn.addEventListener('click', () => {
      this.hideDeleteConfirmation();
    });

    this.confirmDeleteBtn.addEventListener('click', () => {
      this.deleteMemo();
    });

    // Auto-save functionality
    this.memoText.addEventListener('input', () => {
      this.autoSave();
    });

    // Focus on text area when window is shown
    this.memoText.focus();

    // File attachment event listeners
    this.setupFileEventListeners();
  }

  setupFileEventListeners() {
    // File input change
    this.fileInput.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files);
    });

    // File select button click
    const fileSelectBtn = document.querySelector('.file-select-btn');
    fileSelectBtn.addEventListener('click', () => {
      this.fileInput.click();
    });

    // Drag and drop events
    this.fileDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.fileDropZone.classList.add('drag-over');
    });

    this.fileDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.fileDropZone.classList.remove('drag-over');
    });

    this.fileDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.fileDropZone.classList.remove('drag-over');
      this.handleFileSelect(e.dataTransfer.files);
    });
  }

  handleFileSelect(files) {
    Array.from(files).forEach(file => {
      this.addAttachedFile(file);
    });
  }

  addAttachedFile(file) {
    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const fileData = {
      id: fileId,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type
    };

    this.attachedFilesList.push(fileData);
    this.renderAttachedFiles();
    this.updateStatus(`ファイル "${file.name}" を添付しました`);
  }

  removeAttachedFile(fileId) {
    this.attachedFilesList = this.attachedFilesList.filter(f => f.id !== fileId);
    this.renderAttachedFiles();
    this.updateStatus('ファイルを削除しました');
  }

  renderAttachedFiles() {
    this.attachedFiles.innerHTML = '';

    this.attachedFilesList.forEach(fileData => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      
      const fileIcon = this.getFileIcon(fileData.type);
      const fileSize = this.formatFileSize(fileData.size);

      fileItem.innerHTML = `
        <div class="file-info">
          <span class="file-icon">${fileIcon}</span>
          <span class="file-name">${fileData.name}</span>
        </div>
        <span class="file-size">${fileSize}</span>
        ${fileData.saved ? `<button class="file-open" data-file-id="${fileData.id}">開く</button>` : ''}
        <button class="file-remove" data-file-id="${fileData.id}">×</button>
      `;

      const removeBtn = fileItem.querySelector('.file-remove');
      removeBtn.addEventListener('click', () => {
        this.removeAttachedFile(fileData.id);
      });

      const openBtn = fileItem.querySelector('.file-open');
      if (openBtn) {
        openBtn.addEventListener('click', () => {
          this.openAttachedFile(fileData.id);
        });
      }

      this.attachedFiles.appendChild(fileItem);
    });
  }

  getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📋';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📎';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async openAttachedFile(fileId) {
    try {
      await ipcRenderer.invoke('open-file', {
        fileId: fileId,
        memoId: this.currentMemoId
      });
    } catch (error) {
      console.error('Error opening file:', error);
      this.updateStatus('ファイルを開けませんでした');
    }
  }

  setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'ja-JP';

      this.recognition.onstart = () => {
        this.updateStatus('音声認識中...');
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          const currentText = this.memoText.value;
          this.memoText.value = currentText + finalTranscript + '\n';
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.updateStatus(`音声認識エラー: ${event.error}`);
        this.stopRecording();
      };

      this.recognition.onend = () => {
        this.stopRecording();
      };
    } else {
      this.voiceBtn.disabled = true;
      this.voiceBtn.textContent = '音声認識未対応';
      this.updateStatus('音声認識がサポートされていません');
    }
  }

  loadCurrentMemo() {
    const currentMemoId = localStorage.getItem('currentMemoId');
    if (currentMemoId) {
      this.loadMemo(currentMemoId);
    }
  }

  createNewMemo() {
    this.currentMemoId = null;
    this.memoText.value = '';
    this.aiInstruction.value = '';
    this.attachedFilesList = [];
    this.renderAttachedFiles();
    this.updateStatus('新規メモを作成しました');
    this.memoText.focus();
  }

  async saveMemo() {
    const content = this.memoText.value.trim();
    if (!content) {
      this.updateStatus('メモが空です');
      return;
    }

    const memoId = this.currentMemoId || this.generateMemoId();
    
    // Save attached files
    const attachedFileIds = [];
    for (const fileData of this.attachedFilesList) {
      // Skip already saved files
      if (fileData.saved) {
        attachedFileIds.push({
          id: fileData.id,
          name: fileData.name,
          size: fileData.size,
          type: fileData.type
        });
        continue;
      }

      try {
        // Convert file to ArrayBuffer for IPC
        const arrayBuffer = await fileData.file.arrayBuffer();
        const savedFileId = await ipcRenderer.invoke('save-file', {
          fileBuffer: arrayBuffer,
          fileName: fileData.name,
          memoId: memoId
        });
        
        // Mark as saved and update the file data
        fileData.id = savedFileId;
        fileData.saved = true;
        
        attachedFileIds.push({
          id: savedFileId,
          name: fileData.name,
          size: fileData.size,
          type: fileData.type
        });
      } catch (error) {
        console.error('Error saving file:', error);
        this.updateStatus(`ファイル保存エラー: ${fileData.name}`);
      }
    }

    const memo = {
      id: memoId,
      content: content,
      attachedFiles: attachedFileIds,
      createdAt: this.currentMemoId ? this.getMemoById(memoId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveMemoToStorage(memo);
    this.currentMemoId = memoId;
    localStorage.setItem('currentMemoId', memoId);
    
    // Update file display after saving
    this.renderAttachedFiles();
    
    this.updateStatus('メモを保存しました');
  }

  loadMemo(memoId) {
    const memo = this.getMemoById(memoId);
    if (memo) {
      this.currentMemoId = memoId;
      this.memoText.value = memo.content;
      
      // Load attached files
      this.attachedFilesList = [];
      if (memo.attachedFiles && memo.attachedFiles.length > 0) {
        memo.attachedFiles.forEach(file => {
          this.attachedFilesList.push({
            id: file.id,
            name: file.name,
            size: file.size,
            type: file.type,
            saved: true
          });
        });
      }
      this.renderAttachedFiles();
      
      localStorage.setItem('currentMemoId', memoId);
    }
  }

  showMemoList() {
    this.currentView = 'list';
    this.memoEditor.classList.add('hidden');
    this.memoList.classList.add('active');
    this.renderMemoList();
  }

  showMemoEditor() {
    this.currentView = 'editor';
    this.memoList.classList.remove('active');
    this.memoEditor.classList.remove('hidden');
    this.memoText.focus();
  }

  renderMemoList() {
    const memos = this.getAllMemos();
    this.memoListContainer.innerHTML = '';

    if (memos.length === 0) {
      this.memoListContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">保存されたメモがありません</div>';
      return;
    }

    memos.forEach(memo => {
      const memoItem = document.createElement('div');
      memoItem.className = 'memo-item';
      
      const preview = memo.content.length > 100 ? memo.content.substring(0, 100) + '...' : memo.content;
      const createdDate = new Date(memo.createdAt).toLocaleDateString('ja-JP');
      const updatedDate = new Date(memo.updatedAt).toLocaleDateString('ja-JP');
      
      memoItem.innerHTML = `
        <div class="memo-item-header">
          <div class="memo-preview" style="flex: 1; margin-right: 10px;">${preview}</div>
          <div class="memo-actions">
            <button class="btn btn-danger delete-memo-btn" data-memo-id="${memo.id}">🗑️</button>
          </div>
        </div>
        <div class="memo-meta">
          <span>作成: ${createdDate}</span>
          <span>更新: ${updatedDate}</span>
        </div>
      `;
      
      const deleteBtn = memoItem.querySelector('.delete-memo-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showDeleteConfirmation(memo.id);
      });
      
      memoItem.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-memo-btn')) {
          this.loadMemo(memo.id);
          this.showMemoEditor();
        }
      });
      
      this.memoListContainer.appendChild(memoItem);
    });
  }

  generateMemoId() {
    return 'memo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  saveMemoToStorage(memo) {
    const memos = this.getAllMemos();
    const existingIndex = memos.findIndex(m => m.id === memo.id);
    
    if (existingIndex >= 0) {
      memos[existingIndex] = memo;
    } else {
      memos.push(memo);
    }
    
    localStorage.setItem('savedMemos', JSON.stringify(memos));
  }

  getMemoById(memoId) {
    const memos = this.getAllMemos();
    return memos.find(m => m.id === memoId);
  }

  getAllMemos() {
    const saved = localStorage.getItem('savedMemos');
    return saved ? JSON.parse(saved) : [];
  }

  toggleVoiceRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording() {
    if (this.recognition) {
      this.isRecording = true;
      this.voiceBtn.classList.add('recording');
      this.voiceBtn.textContent = '🛑 停止';
      this.recognition.start();
    }
  }

  stopRecording() {
    if (this.recognition && this.isRecording) {
      this.isRecording = false;
      this.voiceBtn.classList.remove('recording');
      this.voiceBtn.textContent = '🎤 音声入力';
      this.recognition.stop();
      this.updateStatus('音声入力を停止しました');
    }
  }

  async processWithAI() {
    const text = this.memoText.value.trim();
    const instruction = this.aiInstruction.value.trim();

    if (!text) {
      this.updateAIStatus('メモが空です');
      return;
    }

    if (!instruction) {
      this.updateAIStatus('指示を入力してください');
      return;
    }

    this.updateAIStatus('AI処理中...');
    this.processBtn.disabled = true;

    try {
      const result = await ipcRenderer.invoke('process-with-ai', text, instruction);
      
      // Replace or append the result
      if (instruction.includes('置換') || instruction.includes('replace')) {
        this.memoText.value = result;
      } else {
        this.memoText.value += '\n\n--- AI処理結果 ---\n' + result;
      }
      
      this.updateAIStatus('AI処理完了');
      
    } catch (error) {
      console.error('AI processing error:', error);
      this.updateAIStatus(`エラー: ${error.message}`);
    } finally {
      this.processBtn.disabled = false;
    }
  }

  updateStatus(message) {
    this.status.textContent = message;
    setTimeout(() => {
      this.status.textContent = '準備完了';
    }, 3000);
  }

  updateAIStatus(message) {
    this.aiStatus.textContent = message;
  }

  autoSave() {
    const content = this.memoText.value.trim();
    if (!content) return;

    // Debounce auto-save to avoid too frequent saves
    clearTimeout(this.autoSaveTimeout);
    this.autoSaveTimeout = setTimeout(() => {
      if (this.currentMemoId) {
        // Update existing memo
        const memo = {
          id: this.currentMemoId,
          content: content,
          createdAt: this.getMemoById(this.currentMemoId)?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.saveMemoToStorage(memo);
      } else {
        // Create new memo if content is substantial (more than 10 characters)
        if (content.length > 10) {
          const memoId = this.generateMemoId();
          const memo = {
            id: memoId,
            content: content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          this.saveMemoToStorage(memo);
          this.currentMemoId = memoId;
          localStorage.setItem('currentMemoId', memoId);
        }
      }
    }, 1000); // Auto-save after 1 second of inactivity
  }

  showDeleteConfirmation(memoId) {
    this.memoToDelete = memoId;
    this.deleteConfirmation.classList.add('show');
  }

  hideDeleteConfirmation() {
    this.memoToDelete = null;
    this.deleteConfirmation.classList.remove('show');
  }

  deleteMemo() {
    if (!this.memoToDelete) return;

    const memos = this.getAllMemos();
    const filteredMemos = memos.filter(m => m.id !== this.memoToDelete);
    localStorage.setItem('savedMemos', JSON.stringify(filteredMemos));

    // If the deleted memo is currently loaded, clear the editor
    if (this.currentMemoId === this.memoToDelete) {
      this.currentMemoId = null;
      this.memoText.value = '';
      localStorage.removeItem('currentMemoId');
    }

    this.hideDeleteConfirmation();
    this.renderMemoList();
    this.updateStatus('メモを削除しました');
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MemoApp();
});