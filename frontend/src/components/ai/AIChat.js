import { useState } from 'react';
import useAIAssistant from '../../hooks/useAIAssistant';
import './modal.css';

export default function AIChat({ onResponse }) {
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { sendQuery, isLoading, error } = useAIAssistant();
  const [chatHistory, setChatHistory] = useState([]);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    try {
      // Add user message to history
      setChatHistory(prev => [...prev, { type: 'user', content: message }]);
      
      const result = await sendQuery(message);
      console.log('AI Response:', result);
      
      if (result?.success) {
        // Add AI response to history
        setChatHistory(prev => [...prev, { 
          type: 'ai', 
          content: 'Changes applied successfully.',
          data: result 
        }]);
        setMessage('');
        onResponse?.(result);
      }
    } catch (err) {
      console.error('Error sending query:', err);
      setChatHistory(prev => [...prev, { 
        type: 'error', 
        content: 'Error: ' + (err.message || 'Failed to process request') 
      }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <>
      {/* Floating toggle button */}
      <button className="ai-chat-toggle" onClick={toggleModal} title="Toggle AI Chat">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Modal overlay */}
      <div className={`ai-modal-overlay ${isModalOpen ? 'visible' : ''}`}>
        <div className="ai-modal">
          <div className="ai-modal-header">
            <h2 className="ai-modal-title">AI Assistant</h2>
            <button className="ai-modal-close" onClick={toggleModal}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="ai-modal-body">
            {/* Chat history */}
            <div className="chat-history">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.type}`}>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
            </div>
            
            {/* Input area */}
            <div className="chat-input">
              <input 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask AI for help..."
                disabled={isLoading}
              />
              <button 
                onClick={handleSubmit}
                disabled={isLoading || !message.trim()}
              >
                {isLoading ? 'Processing...' : 'Ask AI'}
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
