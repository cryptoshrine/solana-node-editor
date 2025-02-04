#!/bin/bash
# Starts a local Solana test validator with clean state

set -e # Exit on error

VALIDATOR_LOG="validator.log"
PID_FILE="validator.pid"
LEDGER_DIR="test-ledger"

cleanup() {
  if [ -f "$PID_FILE" ]; then
    echo "Cleaning up validator..."
    pkill -F "$PID_FILE" || true
    rm -f "$PID_FILE"
  fi
  rm -rf "$LEDGER_DIR"
}

# Cleanup on script exit
trap cleanup EXIT

# Kill existing validator if running
cleanup

# Clean start
echo "Starting Solana test validator..."
solana-test-validator \
  --reset \
  --ledger "$LEDGER_DIR" \
  --rpc-port 8899 \
  --faucet-port 9900 \
  --log > "$VALIDATOR_LOG" 2>&1 &
  
# Save process ID
echo $! > "$PID_FILE"

# Wait for validator to start
echo "Waiting for validator to start..."
sleep 5

# Check if validator is running
if ! ps -p $(cat "$PID_FILE") > /dev/null; then
  echo "Error: Validator failed to start. Check validator.log for details."
  exit 1
fi

echo "Validator started (PID: $(cat "$PID_FILE"))"
echo "RPC: http://localhost:8899"
echo "Logs: $VALIDATOR_LOG"

# Keep script running and monitor validator
while true; do
  if ! ps -p $(cat "$PID_FILE") > /dev/null; then
    echo "Error: Validator process died. Check validator.log for details."
    exit 1
  fi
  sleep 5
done
