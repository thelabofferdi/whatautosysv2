import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Terminal, Sparkles, RefreshCw, Eye, EyeOff } from 'lucide-react';

export default function PlaygroundView() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Bonjour ! Je suis votre agent IA. Testez-moi pour voir comment je réponds à vos prospects.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState(null);
    const [showContext, setShowContext] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare history for API (exclude system/welcome messages if any, keep strictly user/assistant pairs)
            const history = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    from_me: m.role === 'assistant', // Map to backend expected format
                    content: m.content
                }));

            const res = await fetch('/api/ai/playground/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    conversationHistory: history
                })
            });

            const data = await res.json();

            if (data.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
                setDebugInfo(data.debug);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Erreur: " + (data.error || 'Impossible de générer une réponse.') }]);
            }
        } catch (error) {
            console.error('Playground error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Erreur de connexion." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="content-panel" style={{ flexDirection: 'row', padding: 0, overflow: 'hidden', gap: 0 }}>
            {/* Left: Chat Interface */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid var(--border-color)',
                height: '100%',
                position: 'relative'
            }}>
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            borderRadius: '12px',
                            background: 'var(--accent-gradient)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Bot size={24} color="white" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Simulateur IA</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Testez vos prompts et votre base de connaissances</p>
                        </div>
                    </div>
                    <button
                        className="btn btn-ghost"
                        onClick={() => setMessages([{ role: 'assistant', content: 'Simulation réinitialisée. Bonjour !' }])}
                        title="Réinitialiser"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            display: 'flex',
                            gap: '12px',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                        }}>
                            <div style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%',
                                background: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'var(--accent-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                            </div>
                            <div style={{
                                padding: '16px',
                                borderRadius: '16px',
                                background: msg.role === 'user' ? 'var(--input-bg)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${msg.role === 'user' ? 'var(--border-color)' : 'rgba(255,255,255,0.1)'}`,
                                color: 'var(--text-primary)',
                                lineHeight: '1.5',
                                fontSize: '14px',
                                borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                                borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px'
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={16} /></div>
                            <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', alignSelf: 'center' }} />
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            className="input"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder="Écrivez un message comme si vous étiez un client..."
                            disabled={isLoading}
                        />
                        <button className="btn btn-primary" onClick={sendMessage} disabled={isLoading || !input.trim()}>
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Context Inspector */}
            {showContext && (
                <div style={{
                    width: '400px',
                    height: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: '1px solid var(--border-color)'
                }}>
                    <div style={{
                        padding: '20px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Terminal size={18} color="var(--warning)" />
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Debug Context</h3>
                        </div>
                        <button className="btn btn-ghost btn-icon" onClick={() => setShowContext(false)}>
                            <EyeOff size={16} />
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', fontSize: '12px', fontFamily: 'monospace' }}>
                        {debugInfo ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>SYSTEM PROMPT</div>
                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        whiteSpace: 'pre-wrap',
                                        color: '#a1a1aa'
                                    }}>
                                        {debugInfo.systemPrompt}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>MODEL</div>
                                    <div style={{ color: 'var(--accent-primary)' }}>{debugInfo.model}</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>
                                Lancez une conversation pour voir le contexte utilisé par l'IA.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!showContext && (
                <button
                    className="btn btn-secondary"
                    onClick={() => setShowContext(true)}
                    style={{
                        position: 'absolute',
                        right: '20px',
                        top: '20px',
                        zIndex: 10,
                        padding: '8px 12px',
                        fontSize: '12px'
                    }}
                >
                    <Eye size={16} /> Debug
                </button>
            )}
        </div>
    );
}
