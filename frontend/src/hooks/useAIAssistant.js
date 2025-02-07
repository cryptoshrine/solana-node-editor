import { useState } from 'react';
import axios from 'axios';

export default function useAIAssistant() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendQuery = async (query, nodes = []) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Sending query:', { query, nodes }); // Debug log
      
      const response = await axios.post('/api/ai/generate', {
        prompt: query,
        nodes
      });

      console.log('Raw API response:', response.data); // Debug log

      // Ensure we have the expected data structure
      if (!response.data || (!response.data.nodes && !response.data.connections)) {
        console.warn('Unexpected response structure:', response.data);
        throw new Error('Invalid response format from AI service');
      }

      const result = {
        success: true,
        nodes: response.data.nodes || [],
        connections: response.data.connections || []
      };

      console.log('Processed result:', result); // Debug log
      return result;
    } catch (error) {
      console.error('Full error:', error); // Debug log
      setError(error.response?.data?.error || error.message || 'AI service error');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  return { sendQuery, isLoading, error };
}
