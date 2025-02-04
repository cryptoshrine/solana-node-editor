import { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';

export default function useValidatorStatus(interval = 5000) {
  const [status, setStatus] = useState({
    status: 'checking',
    blockHeight: null,
    error: null
  });

  useEffect(() => {
    const connection = new Connection('http://localhost:8899', 'confirmed');
    let intervalId;

    const fetchStatus = async () => {
      try {
        console.log('Fetching validator status...');
        const [slot, version] = await Promise.all([
          connection.getSlot().catch(e => {
            console.error('Error getting slot:', e);
            return null;
          }),
          connection.getVersion().catch(e => {
            console.error('Error getting version:', e);
            return null;
          })
        ]);

        console.log('Validator response:', { slot, version });

        if (slot === null || !version) {
          console.log('Setting validator as stopped due to:', { slot, version });
          setStatus({
            status: 'stopped',
            blockHeight: null,
            error: 'Validator not responding'
          });
          return;
        }

        console.log('Setting validator as running with slot:', slot);
        setStatus({
          status: 'running',
          blockHeight: slot,
          error: null
        });
      } catch (error) {
        console.error('Validator status error:', error);
        setStatus({
          status: 'stopped',
          blockHeight: null,
          error: error.message || 'Validator unavailable'
        });
      }
    };

    // Initial check
    fetchStatus();
    
    // Set up interval
    intervalId = setInterval(fetchStatus, interval);

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [interval]);

  return status;
}
