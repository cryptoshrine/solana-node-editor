import { useState } from 'react';
import axios from 'axios';

export default function useAIAssistant() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to minimize node data
  const minimizeNodeData = (node) => {
    const { id, type, data } = node;
    return {
      id,
      type,
      data: {
        ...data,
        // Remove any large or unnecessary fields
        __reactFlow: undefined,
        __temp: undefined,
        // Keep only essential metadata
        label: data.label
      }
    };
  };

  const sendQuery = async (query, nodes = []) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Preparing query data...'); // Debug log
      
      // Minimize the node data before sending
      const minimizedNodes = nodes.map(minimizeNodeData);
      console.log('Minimized nodes:', minimizedNodes); // Debug log
      
      const response = await axios.post('/api/ai/generate', {
        prompt: query,
        nodes: minimizedNodes
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
