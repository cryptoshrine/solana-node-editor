import { useState, useEffect } from 'react';
import { useNodes } from 'reactflow';
import { useAIAssistant } from '../../services/aiService';
import { aiSuggestionProps } from '../../propTypes/aiTypes';


export default function AISuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const nodes = useNodes();
  const { getSuggestions } = useAIAssistant();

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setIsLoading(true);
        const aiSuggestions = await getSuggestions(nodes);
        setSuggestions(aiSuggestions);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [nodes]);

  const applySuggestion = (suggestion) => {
    // TODO: Implement node update logic
    console.log('Applying suggestion:', suggestion);
  };

  if (error) return <div className="ai-error">Error: {error}</div>;

  return (
    <div className="ai-suggestions">
      <h3>AI Suggestions</h3>
      {isLoading ? (
        <div className="loading">Analyzing workflow...</div>
      ) : (
        <ul>
          {suggestions.map((suggestion, index) => (
            <li key={index} onClick={() => applySuggestion(suggestion)}>
              <div className="suggestion-header">
                <span className="badge">{suggestion.type}</span>
                <strong>{suggestion.title}</strong>
              </div>
              <p className="suggestion-reason">{suggestion.reason}</p>
              {suggestion.example && (
                <pre className="code-sample">{suggestion.example}</pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
AISuggestions.propTypes = {
  suggestions: PropTypes.arrayOf(aiSuggestionProps.suggestion),
  onApply: aiSuggestionProps.onApply
};
