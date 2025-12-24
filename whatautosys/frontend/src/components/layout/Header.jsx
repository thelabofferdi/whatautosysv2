import { Wifi, WifiOff } from 'lucide-react';

export default function Header({ whatsappStatus }) {
    // Window control functions (Electron)
    const handleMinimize = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('window-minimize');
        }
    };

    const handleMaximize = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('window-maximize');
        }
    };

    const handleClose = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('window-close');
        }
    };

    return (
        <header className="header">
            {/* Status Pill matching reference */}
            <div className={`status-badge ${whatsappStatus === 'connected' ? 'status-online' : 'status-offline'}`}>
                {whatsappStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{whatsappStatus === 'connected' ? 'En ligne' : 'Hors ligne'}</span>

                <div className="status-lights">
                    <div className="status-light active"></div>
                    <div className={`status-light ${whatsappStatus === 'connected' ? 'active' : ''}`}></div>
                    <div className={`status-light ${whatsappStatus === 'connected' ? 'active' : ''}`}></div>
                </div>
            </div>

            {/* Window Controls */}
            <div className="window-controls">
                <button className="window-btn minimize" onClick={handleMinimize} title="Réduire" />
                <button className="window-btn maximize" onClick={handleMaximize} title="Agrandir" />
                <button className="window-btn close" onClick={handleClose} title="Fermer" />
            </div>
        </header>
    );
}
