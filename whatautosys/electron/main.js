const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const BACKEND_PORT = 3001;
const FRONTEND_PORT = 5173;
const LICENSE_SECRET = 'whatautosys-v2-secret-key-2025';

let mainWindow = null;
let backendProcess = null;

// ==================== LICENSE VALIDATION ====================

function getHWID() {
    const os = require('os');
    const cpus = os.cpus();
    const networkInterfaces = os.networkInterfaces();

    let macAddress = '';
    for (const iface of Object.values(networkInterfaces)) {
        for (const config of iface) {
            if (!config.internal && config.mac !== '00:00:00:00:00:00') {
                macAddress = config.mac;
                break;
            }
        }
        if (macAddress) break;
    }

    const raw = `${cpus[0]?.model || 'cpu'}-${os.hostname()}-${macAddress}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

function validateLicense() {
    const licensePath = path.join(app.getPath('userData'), 'license.key');

    // Also check in app directory for portable installations
    const portableLicensePath = path.join(__dirname, '..', 'license.key');

    let licenseFile = null;

    if (fs.existsSync(licensePath)) {
        licenseFile = licensePath;
    } else if (fs.existsSync(portableLicensePath)) {
        licenseFile = portableLicensePath;
    }

    if (!licenseFile) {
        return { valid: false, error: 'NO_LICENSE', message: 'Aucune licence trouvée' };
    }

    try {
        const encryptedData = fs.readFileSync(licenseFile, 'utf8');
        const licenseData = decryptLicense(encryptedData);

        if (!licenseData) {
            return { valid: false, error: 'INVALID_FORMAT', message: 'Format de licence invalide' };
        }

        // Verify HWID
        const currentHWID = getHWID();
        if (licenseData.hwid !== currentHWID) {
            return {
                valid: false,
                error: 'HWID_MISMATCH',
                message: 'Cette licence n\'est pas valide pour cette machine',
                expectedHWID: licenseData.hwid,
                currentHWID: currentHWID
            };
        }

        // Check expiration
        const expiresAt = new Date(licenseData.expiresAt);
        if (expiresAt < new Date()) {
            return {
                valid: false,
                error: 'EXPIRED',
                message: 'Licence expirée',
                expiredAt: licenseData.expiresAt
            };
        }

        return {
            valid: true,
            license: {
                plan: licenseData.plan || 'premium',
                expiresAt: licenseData.expiresAt,
                apiKey: licenseData.apiKey
            }
        };

    } catch (error) {
        return { valid: false, error: 'READ_ERROR', message: error.message };
    }
}

function decryptLicense(encryptedData) {
    try {
        // Get HWID to use as decryption key (same as encryption)
        const hwid = getHWID();
        const keyBytes = Buffer.from(hwid, 'utf8');

        // Decode base64
        const encryptedBytes = Buffer.from(encryptedData, 'base64');

        // XOR decrypt (reverse of admin tool's encryption)
        const decryptedBytes = Buffer.alloc(encryptedBytes.length);
        for (let i = 0; i < encryptedBytes.length; i++) {
            decryptedBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
        }

        const decrypted = decryptedBytes.toString('utf8');
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('License decryption error:', error);
        return null;
    }
}

// ==================== WINDOW CREATION ====================

function createWindow(licenseData = null) {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        frame: false,
        transparent: false,
        backgroundColor: '#0f0f23',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        icon: path.join(__dirname, '../assets/icon.png')
    });

    // Store license data for backend
    if (licenseData) {
        global.licenseData = licenseData;
    }

    if (isDev) {
        mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createActivationWindow() {
    const activationWindow = new BrowserWindow({
        width: 500,
        height: 400,
        resizable: false,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const hwid = getHWID();

    // Create activation HTML inline
    const activationHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-app-region: drag;
        }
        .container {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.1);
          -webkit-app-region: no-drag;
        }
        h1 { font-size: 24px; margin-bottom: 10px; }
        .subtitle { color: #888; margin-bottom: 30px; }
        .hwid-box {
          background: rgba(0,0,0,0.3);
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-family: monospace;
          font-size: 12px;
          word-break: break-all;
          cursor: pointer;
          transition: all 0.3s;
        }
        .hwid-box:hover { background: rgba(0,0,0,0.5); }
        .hwid-label { color: #888; font-size: 12px; margin-bottom: 5px; }
        .drop-zone {
          border: 2px dashed rgba(255,255,255,0.2);
          padding: 30px;
          border-radius: 10px;
          margin-top: 20px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .drop-zone:hover, .drop-zone.dragover {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
        }
        .drop-zone p { color: #888; }
        .error { color: #ef4444; margin-top: 15px; font-size: 14px; }
        .success { color: #22c55e; margin-top: 15px; font-size: 14px; }
        .close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          color: #888;
          font-size: 20px;
          cursor: pointer;
          -webkit-app-region: no-drag;
        }
        .close-btn:hover { color: #fff; }
      </style>
    </head>
    <body>
      <button class="close-btn" onclick="window.close()">✕</button>
      <div class="container">
        <h1>🔐 Activation WhatAutosys</h1>
        <p class="subtitle">Entrez votre fichier de licence</p>
        
        <div class="hwid-label">Votre HWID (cliquez pour copier)</div>
        <div class="hwid-box" onclick="copyHWID()" id="hwid">${hwid}</div>
        
        <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
          <p>📄 Glissez votre fichier license.key ici<br>ou cliquez pour sélectionner</p>
          <input type="file" id="fileInput" accept=".key" style="display:none" onchange="handleFile(this.files[0])">
        </div>
        
        <div id="message"></div>
      </div>
      
      <script>
        const { ipcRenderer, clipboard } = require('electron');
        
        function copyHWID() {
          clipboard.writeText('${hwid}');
          document.getElementById('hwid').style.background = 'rgba(34, 197, 94, 0.3)';
          setTimeout(() => {
            document.getElementById('hwid').style.background = 'rgba(0,0,0,0.3)';
          }, 1000);
        }
        
        const dropZone = document.getElementById('dropZone');
        dropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropZone.classList.remove('dragover');
          if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
        
        function handleFile(file) {
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            ipcRenderer.send('activate-license', e.target.result);
          };
          reader.readAsText(file);
        }
        
        ipcRenderer.on('activation-result', (event, result) => {
          const msgEl = document.getElementById('message');
          if (result.success) {
            msgEl.className = 'success';
            msgEl.textContent = '✓ Licence activée ! Redémarrage...';
          } else {
            msgEl.className = 'error';
            msgEl.textContent = '✗ ' + result.message;
          }
        });
      </script>
    </body>
    </html>
  `;

    activationWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(activationHTML)}`);

    return activationWindow;
}

// ==================== IPC HANDLERS ====================

ipcMain.on('activate-license', (event, licenseContent) => {
    try {
        const licensePath = path.join(app.getPath('userData'), 'license.key');
        fs.writeFileSync(licensePath, licenseContent);

        const validation = validateLicense();
        if (validation.valid) {
            event.reply('activation-result', { success: true });
            setTimeout(() => {
                app.relaunch();
                app.exit(0);
            }, 1500);
        } else {
            fs.unlinkSync(licensePath);
            event.reply('activation-result', { success: false, message: validation.message });
        }
    } catch (error) {
        event.reply('activation-result', { success: false, message: error.message });
    }
});

ipcMain.on('get-hwid', (event) => {
    event.returnValue = getHWID();
});

ipcMain.on('get-license', (event) => {
    const validation = validateLicense();
    event.returnValue = validation.valid ? validation.license : null;
});

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});
ipcMain.on('window-close', () => mainWindow?.close());

// ==================== APP LIFECYCLE ====================

app.whenReady().then(() => {
    const validation = validateLicense();

    if (validation.valid) {
        createWindow(validation.license);
    } else {
        console.log('License validation failed:', validation.error);
        createActivationWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        const validation = validateLicense();
        if (validation.valid) {
            createWindow(validation.license);
        }
    }
});

// Handle app quit
app.on('before-quit', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});
