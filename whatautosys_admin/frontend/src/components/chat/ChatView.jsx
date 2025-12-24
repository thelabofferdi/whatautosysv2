import { useState, useEffect, useRef } from 'react';
import { Search, Send, Sparkles, MoreVertical, Phone, User, Paperclip, Mic } from 'lucide-react';

export default function ChatView({ conversations, selectedChat, onSelectChat, socket }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);

    // Load messages when chat is selected
    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat.jid);
        }
    }, [selectedChat]);

    // Listen for new messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message) => {
            if (selectedChat && message.jid === selectedChat.jid) {
                setMessages(prev => [...prev, {
                    id: message.id,
                    content: message.content,
                    fromMe: message.fromMe,
                    timestamp: message.timestamp
                }]);

                // Get new suggestions for incoming messages
                if (!message.fromMe) {
                    loadSuggestions();
                }
            }
        };

        socket.on('message:new', handleNewMessage);
        socket.on('message:sent', handleNewMessage);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('message:sent', handleNewMessage);
        };
    }, [socket, selectedChat]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async (jid) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/whatsapp/messages/${encodeURIComponent(jid)}`);
            const data = await res.json();
            setMessages(data.map(m => ({
                id: m.id,
                content: m.content,
                fromMe: m.from_me === 1,
                timestamp: m.timestamp
            })));

            // Load suggestions
            loadSuggestions();
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSuggestions = async () => {
        if (!selectedChat) return;

        try {
            const res = await fetch('/api/ai/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationHistory: messages.slice(-10),
                    contactInfo: { name: selectedChat.name }
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuggestions(data.suggestions);
            }
        } catch (error) {
            console.error('Error loading suggestions:', error);
        }
    };

    const sendMessage = async (text = inputMessage) => {
        if (!text.trim() || !selectedChat) return;

        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jid: selectedChat.jid,
                    message: text
                })
            });

            if (res.ok) {
                setInputMessage('');
                setSuggestions([]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const useSuggestion = (suggestion) => {
        setInputMessage(suggestion.text);
    };

    const sendSuggestion = (suggestion) => {
        sendMessage(suggestion.text);
    };

    const filteredConversations = conversations.filter(c =>
        !searchQuery ||
        (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(searchQuery))
    );

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div className="content-panel" style={{
            display: 'flex',
            flexDirection: 'row',
            height: '100%',
            width: '100%',
            padding: 0,
            overflow: 'hidden',
            background: 'var(--bg-glass)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)'
        }}>
            {/* Chat List */}
            <div className="chat-list" style={{
                width: '340px',
                minWidth: '340px',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid var(--border-color)',
                flexShrink: 0,
                background: 'rgba(28, 25, 23, 0.4)'
            }}>
                <div className="chat-list-header" style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ position: 'relative' }}>
                        <Search
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }}
                        />
                        <input
                            type="text"
                            className="input"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>
                </div>

                <div className="chat-list-items" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {filteredConversations.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                            <User size={40} style={{ opacity: 0.3, marginBottom: '12px', margin: '0 auto' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                Aucune conversation
                            </p>
                        </div>
                    ) : (
                        filteredConversations.map(chat => (
                            <div
                                key={chat.jid}
                                className={`chat-item ${selectedChat?.jid === chat.jid ? 'active' : ''}`}
                                onClick={() => onSelectChat(chat)}
                                style={{ display: 'flex', alignItems: 'center' }} // Reinforce flex
                            >
                                <div className="chat-avatar">
                                    {getInitials(chat.name || chat.push_name)}
                                </div>
                                <div className="chat-info" style={{ flex: 1, minWidth: 0 }}>
                                    <div className="chat-name">{chat.name || chat.push_name || chat.phone}</div>
                                    <div className="chat-preview">{chat.last_message || 'Aucun message'}</div>
                                </div>
                                <div className="chat-meta">
                                    <span className="chat-time">{formatTime(chat.last_message_at)}</span>
                                    {chat.unread_count > 0 && (
                                        <span className="chat-unread">{chat.unread_count}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="chat-window" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!selectedChat ? (
                    <div className="empty-state" style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px'
                        }}>
                            <Send size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                        </div>
                        <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Sélectionnez une conversation</h3>
                        <p>Choisissez un contact pour commencer</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="chat-header" style={{ flexShrink: 0 }}>
                            <div className="chat-avatar" style={{ width: '40px', height: '40px', fontSize: '14px' }}>
                                {getInitials(selectedChat.name || selectedChat.push_name)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>
                                    {selectedChat.name || selectedChat.push_name || selectedChat.phone}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {selectedChat.phone}
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-icon">
                                <Phone size={18} />
                            </button>
                            <button className="btn btn-ghost btn-icon">
                                <MoreVertical size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {isLoading ? (
                                <div className="loading-overlay" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="spinner" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                                    <p style={{ color: 'var(--text-muted)' }}>Aucun message</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => (
                                    <div key={msg.id || index} className={`message ${msg.fromMe ? 'outgoing' : 'incoming'}`}>
                                        <div>{msg.content}</div>
                                        <div className="message-time">{formatTime(msg.timestamp)}</div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Co-Pilot Suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="copilot-suggestions" style={{ flexShrink: 0 }}>
                                <div className="copilot-header">
                                    <Sparkles size={14} />
                                    <span>Suggestions IA (Co-Pilot)</span>
                                    <button
                                        onClick={() => setShowSuggestions(false)}
                                        style={{
                                            marginLeft: 'auto',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="copilot-suggestions-list">
                                    {suggestions.map((suggestion, index) => (
                                        <div
                                            key={suggestion.id || index}
                                            className="copilot-suggestion"
                                            onClick={() => useSuggestion(suggestion)}
                                            onDoubleClick={() => sendSuggestion(suggestion)}
                                        >
                                            {suggestion.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="chat-input-container" style={{ flexShrink: 0 }}>
                            <button className="btn btn-ghost btn-icon">
                                <Paperclip size={18} />
                            </button>
                            <textarea
                                className="chat-input"
                                placeholder="Écrivez votre message..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                rows={1}
                            />
                            <button className="btn btn-ghost btn-icon">
                                <Mic size={18} />
                            </button>
                            <button
                                className="btn btn-primary btn-icon"
                                onClick={() => sendMessage()}
                                disabled={!inputMessage.trim()}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
