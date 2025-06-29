const { app, BrowserWindow, globalShortcut, ipcMain, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;
let isHidden = true;
let lastKeyTime = 0;
const DOUBLE_TAP_INTERVAL = 500;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'hiddenInset',
    alwaysOnTop: true,
    skipTaskbar: true
  });

  mainWindow.loadFile('src/renderer_clean.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('blur', () => {
    if (!mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
      isHidden = true;
    }
  });
}

function toggleWindow() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    
    if (isHidden || !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
      isHidden = false;
    } else {
      mainWindow.hide();
      isHidden = true;
    }
  } catch (error) {
    console.error('Error in toggleWindow:', error);
    createWindow();
  }
}

function registerGlobalShortcuts() {
  // Only register if not already registered
  if (process.platform === 'darwin') {
    if (!globalShortcut.isRegistered('Option+M')) {
      const registered = globalShortcut.register('Option+M', toggleWindow);
      if (!registered) {
        console.log('Failed to register global shortcut');
      }
    }
  } else {
    if (!globalShortcut.isRegistered('Alt+M')) {
      const registered = globalShortcut.register('Alt+M', toggleWindow);
      if (!registered) {
        console.log('Failed to register global shortcut');
      }
    }
  }
}

app.whenReady().then(() => {
  createWindow();
  registerGlobalShortcuts();
  
  // Hide dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC handlers
ipcMain.handle('process-with-ai', async (event, text, instruction) => {
  try {
    // This is a placeholder for AI integration
    // In a real implementation, you would call Claude or GPT API here
    const response = await processWithAI(text, instruction);
    return response;
  } catch (error) {
    console.error('AI processing error:', error);
    return `Error processing with AI: ${error.message}`;
  }
});

const AIService = require('./ai-service');
const aiService = new AIService();

async function processWithAI(text, instruction) {
  return await aiService.processText(text, instruction);
}

// File management
const fs = require('fs');
const os = require('os');

// Create attachments directory
const attachmentsDir = path.join(os.homedir(), '.memo-app', 'attachments');
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

// IPC handler for saving files
ipcMain.handle('save-file', async (event, { fileBuffer, fileName, memoId }) => {
  try {
    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const memoDir = path.join(attachmentsDir, memoId);
    
    // Create memo directory if it doesn't exist
    if (!fs.existsSync(memoDir)) {
      fs.mkdirSync(memoDir, { recursive: true });
    }
    
    const filePath = path.join(memoDir, fileId + '_' + fileName);
    
    // Convert ArrayBuffer to Buffer and save
    const buffer = Buffer.from(fileBuffer);
    fs.writeFileSync(filePath, buffer);
    
    return fileId;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
});

// IPC handler for loading files
ipcMain.handle('load-file', async (event, { fileId, memoId }) => {
  try {
    const memoDir = path.join(attachmentsDir, memoId);
    const files = fs.readdirSync(memoDir);
    const targetFile = files.find(f => f.startsWith(fileId + '_'));
    
    if (targetFile) {
      const filePath = path.join(memoDir, targetFile);
      const buffer = fs.readFileSync(filePath);
      return buffer;
    } else {
      throw new Error('File not found');
    }
  } catch (error) {
    console.error('Error loading file:', error);
    throw error;
  }
});

// IPC handler for opening files
ipcMain.handle('open-file', async (event, { fileId, memoId }) => {
  try {
    const memoDir = path.join(attachmentsDir, memoId);
    
    if (!fs.existsSync(memoDir)) {
      throw new Error('Memo directory not found');
    }
    
    const files = fs.readdirSync(memoDir);
    const targetFile = files.find(f => f.startsWith(fileId + '_'));
    
    if (targetFile) {
      const filePath = path.join(memoDir, targetFile);
      console.log('Opening file:', filePath);
      const result = await shell.openPath(filePath);
      if (result) {
        console.error('Error opening file with default app:', result);
      }
    } else {
      throw new Error('File not found in directory');
    }
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
});