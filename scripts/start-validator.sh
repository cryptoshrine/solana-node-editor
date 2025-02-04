#!/bin/bash
solana-test-validator \
  --reset \
  --ledger test-ledger \
  --rpc-port 8899 \
  --quiet > validator.log 2>&1 &
echo $! > validator.pid
