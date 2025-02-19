#!/bin/bash

# Set environment variables
export ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"
export ANCHOR_WALLET="/home/cryptoshrine/.config/solana/id.json"

# Run the DAO creation script
npx ts-node tests/create-dao.ts 