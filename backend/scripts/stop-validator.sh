#!/bin/bash
# Stops the local Solana test validator

PID_FILE="validator.pid"

if [ -f "$PID_FILE" ]; then
  echo "Stopping validator (PID: $(cat "$PID_FILE"))..."
  pkill -F "$PID_FILE" && rm -f "$PID_FILE"
  echo "Validator stopped"
else
  echo "Validator is not running"
  exit 1
fi
