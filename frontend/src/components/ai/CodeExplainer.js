import { useState } from 'react';
import PropTypes from 'prop-types';
import { useAIAssistant } from '../../services/aiService';
import PropTypes from 'prop-types';


export default function CodeExplainer({ code }) {
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { explainCode } = useAIAssistant();

  const handleExplain = async () => {
    try {
      setIsLoading(true);
      const result = await explainCode(code);
      setExplanation(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="code-explainer">
      <button 
        onClick={handleExplain}
        disabled={isLoading}
        className="explain-button"
      >
        {isLoading ? 'Analyzing...' : 'Explain Code'}
      </button>
      
      {error && <div className="error">{error}</div>}
      
      {explanation && (
        <div className="explanation">
          <h4>AI Explanation</h4>
          <div className="explanation-content">
            {explanation.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

CodeExplainer.propTypes = {
  code: PropTypes.string.isRequired,
  explanation: PropTypes.string,
  error: PropTypes.string
};
