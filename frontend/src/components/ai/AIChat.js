import { useState } from 'react';
import useAIAssistant from '../../hooks/useAIAssistant';

export default function AIChat({ onResponse }) {
  const [message, setMessage] = useState('');
  const { sendQuery, isLoading, error } = useAIAssistant();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    try {
      const result = await sendQuery(message);
      console.log('AI Response:', result); // Debug log
      if (result?.success) {
        setMessage('');
        // Pass the full response data to parent
        onResponse?.(result);
      }
    } catch (err) {
      console.error('Error sending query:', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="ai-chat">
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
  );
}
