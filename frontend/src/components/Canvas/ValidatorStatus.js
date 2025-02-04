import React, { useState } from 'react';
import useValidatorStatus from '../../hooks/useValidatorStatus';

export default function ValidatorStatus() {
  const { status, blockHeight, error } = useValidatorStatus();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const getStatusDisplay = () => {
    switch (status) {
      case 'running':
        return `Local Validator (Block #${blockHeight})`;
      case 'checking':
        return 'Checking Validator Status...';
      case 'stopped':
        return 'Validator Not Running';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <div className="validator-status">
      <div className="status-indicator">
        <span 
          className={`status-dot ${status === 'running' ? 'active' : 'inactive'}`}
          title={error || `Status: ${status}`}
        />
        <span className="status-text">
          {getStatusDisplay()}
        </span>
        {error && (
          <span className="status-error" title={error}>
            ×
          </span>
        )}
        <button 
          className="close-button"
          onClick={() => setIsVisible(false)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
