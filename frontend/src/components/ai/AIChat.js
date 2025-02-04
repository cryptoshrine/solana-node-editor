import { useState } from 'react';
import useAIAssistant from '../../hooks/useAIAssistant';

export default function AIChat({ onSend }) {
  const [message, setMessage] = useState('');
  const { sendQuery, isLoading, error } = useAIAssistant();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    try {
      await sendQuery(message);
      setMessage('');
      onSend();
    } catch (err) {
      console.error('Error sending query:', err);
    }
  };

  return (
    <div className="ai-chat">
      <div className="chat-input">
        <input 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
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
  );
}
