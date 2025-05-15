const { useState, useEffect, useRef } = React;
const { 
    AppBar, 
    Toolbar, 
    Typography, 
    IconButton, 
    TextField, 
    Button, 
    Paper,
    CircularProgress
} = MaterialUI;

function ChatApp() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(generateSessionId());
    const messagesEndRef = useRef(null);

    // Générer un ID de session unique
    function generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9);
    }

    // Faire défiler vers le dernier message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Envoyer un message
    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = {
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: input,
                    sessionId: sessionId
                })
            });

            const data = await response.json();

            if (response.ok) {
                const botMessage = {
                    role: 'bot',
                    content: data.response,
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, botMessage]);
            } else {
                throw new Error(data.error || 'Erreur lors de l\'envoi du message');
            }
        } catch (error) {
            console.error('Erreur:', error);
            const errorMessage = {
                role: 'bot',
                content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Gérer la touche Entrée
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Formater la date
    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    return (
        <div className="chat-container">
            <AppBar position="static" color="primary">
                <Toolbar>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        AICOS Chatbot
                    </Typography>
                    <IconButton color="inherit" onClick={() => setSessionId(generateSessionId())}>
                        <span className="material-icons">refresh</span>
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Paper className="chat-messages" elevation={3}>
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.role}`}>
                        <div className="message-content">
                            {message.content}
                        </div>
                        <div className="message-time">
                            {formatDate(message.timestamp)}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </Paper>

            <div className="chat-input">
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Tapez votre message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                >
                    {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Envoyer'}
                </Button>
            </div>
        </div>
    );
}

// Rendre l'application
ReactDOM.render(
    <ChatApp />,
    document.getElementById('root')
); 