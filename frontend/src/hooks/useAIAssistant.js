import { useState } from 'react';
import axios from 'axios';

export default function useAIAssistant() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendQuery = async (query, nodes) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/ai/generate', {
        prompt: query,
        nodes
      });

      return {
        success: true,
        nodes: response.data.nodes,
        connections: response.data.connections
      };
    } catch (error) {
      setError(error.response?.data?.error || 'AI service error');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  return { sendQuery, isLoading, error };
}
