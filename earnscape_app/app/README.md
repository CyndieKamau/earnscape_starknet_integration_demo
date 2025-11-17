# Backend - Earnscape API

Express.js backend API for Earnscape rewards application. Handles Privy authentication, Starknet wallet operations, and gasless transactions via AVNU Paymaster.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Smart Contracts](#smart-contracts)
- [Architecture Details](#architecture-details)
- [Troubleshooting](#troubleshooting)

---

## Overview

The backend provides:
- JWT-based authentication via Privy
- Embedded Starknet wallet management
- Token claiming (custodial - backend signs)
- Account deployment (self-custodial - user signs via Privy RPC)
- Token withdrawals (self-custodial - user signs via Privy RPC) ⚠️ *Debug mode*
- Balance checking
- Gasless transactions via AVNU Paymaster

---

## Tech Stack

- **Runtime:** Node.js v18+
- **Framework:** Express.js with TypeScript
- **Authentication:** Privy SDK v1.32.5
- **Blockchain:** Starknet.js v8.5.3
- **Account Contracts:** Argent X v0.5.0
- **Network:** Starknet Sepolia Testnet
- **RPC Provider:** Alchemy
- **Paymaster:** AVNU Sepolia
- **Validation:** Zod

---

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

### 3. Configure Environment Variables

Edit `.env` with your API keys (see [Environment Configuration](#environment-configuration) below)

### 4. Verify ABIs

Ensure contract ABIs are present:
```bash
ls contracts/abis/
# Should show:
# EarnTokenABI.json
# EarnStarkManagerABI.json
```

---

## 🔧 Environment Configuration

### Complete .env File

```bash
# ============================================
# GENERAL CONFIGURATION
# ============================================
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:8081

# ============================================
# PRIVY CONFIGURATION
# ============================================
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
PRIVY_WALLET_AUTH_PRIVATE_KEY=your_wallet_auth_private_key

# ============================================
# STARKNET CONFIGURATION
# ============================================
RPC_URL=https://starknet-sepolia.g.alchemy.com/v0_9/YOUR_ALCHEMY_API_KEY
READY_CLASSHASH=0x073414441639dcd11d1846f287650a00c60c416b9d3ba45d31c651672125b2c2

# ============================================
# SMART CONTRACTS
# ============================================
EARNS_TOKEN_ADDRESS=0x...
EARNS_TOKEN_NAME=EarnToken
EARNS_TOKEN_SYMBOL=EARN
EARNSTARK_MANAGER_ADDRESS=0x...
EARNS_TOKEN_OWNER=0x...
EARNS_TOKEN_OWNER_PRIVATE_KEY=0x...

# ============================================
# PAYMASTER CONFIGURATION
# ============================================
PAYMASTER_URL=https://sepolia.paymaster.avnu.fi
PAYMASTER_MODE=sponsored
PAYMASTER_API_KEY=your_avnu_api_key
```

### Detailed Variable Explanations

#### Privy Configuration

**PRIVY_APP_ID**
- Get from: https://dashboard.privy.io → Settings → App ID
- Format: `cm...` (starts with cm)
- Example: `cmhlapjas006ljp0cszdll46i`

**PRIVY_APP_SECRET**
- Get from: https://dashboard.privy.io → Settings → API Secret
- Format: Long alphanumeric string
- ⚠️ Keep this secret! Never commit to git

**PRIVY_WALLET_AUTH_PRIVATE_KEY**
- Get from: https://dashboard.privy.io → Wallet API → Generate Authorization Key
- Format: PEM format (starts with `MIGHAgEA...`)
- Length: ~184 characters
- Note: Currently not used for withdrawal (JWT-only auth in use)

#### Starknet Configuration

**RPC_URL**
- Provider: Alchemy (recommended)
- Sign up: https://alchemy.com
- Create a "Starknet Sepolia" app
- Format: `https://starknet-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

**READY_CLASSHASH**
- Value: `0x073414441639dcd11d1846f287650a00c60c416b9d3ba45d31c651672125b2c2`
- This is the Argent X v0.5.0 class hash
- ⚠️ **CRITICAL:** Do not change this value!

#### Smart Contracts

**EARNS_TOKEN_ADDRESS**
- Your deployed ERC20 token contract on Sepolia
- Format: `0x...` (66 characters)
- Get from: Your deployment script or Voyager

**EARNSTARK_MANAGER_ADDRESS**
- Your deployed manager contract on Sepolia
- Format: `0x...` (66 characters)
- Handles token distribution

**EARNS_TOKEN_OWNER**
- The "hello-account" address that owns/distributes tokens
- Format: `0x...` (66 characters)
- This account signs all claim transactions

**EARNS_TOKEN_OWNER_PRIVATE_KEY**
- Private key for the hello-account
- Format: `0x...` (66 characters)
- ⚠️ Keep secret! This account holds the token supply

#### Paymaster Configuration

**PAYMASTER_URL**
- Value: `https://sepolia.paymaster.avnu.fi`
- Don't change unless using different paymaster

**PAYMASTER_MODE**
- Value: `sponsored`
- Options: `sponsored` or `default`
- Sponsored = gasless transactions

**PAYMASTER_API_KEY**
- Get from: https://avnu.fi → Dashboard → API Keys
- Format: Alphanumeric string
- Required for sponsored (gasless) mode

---

## Running the Server

### Development Mode

```bash
npm run dev
```

### Expected Output

```
✅ hello-account initialized: 0x1a2b3c4d...
✅ Contracts initialized
  - EarnToken: 0x5e6f7g8h...
  - EarnManager: 0x9i0j1k2l...
Server running on port 4000
```

### Production Mode

```bash
npm run build
npm start
```

### Health Check

Test the server is running:
```bash
curl http://localhost:4000/healthz
```

Expected response:
```json
{
  "status": "ok",
  "env":"development",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 📚 API Endpoints

Base URL: `http://localhost:4000/api`

All endpoints (except health check) require authentication via Privy JWT token in the `Authorization` header.

### Authentication Header Format

```
Authorization: Bearer YOUR_PRIVY_JWT_TOKEN
```

Get the token from Privy login in the mobile app.

 I've consoled logged to capture the token, you'll find it in the frontend logs after signing in:

 ```bash
   anonymous (address at (InternalBytecode.js:1:1874)
 LOG  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LOG  🚀 STARTING AUTH FLOW
 LOG  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LOG  📝 Step 1: Getting Privy identity token...
 LOG  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LOG  🔑 IDENTITY TOKEN FOR TESTING:
 LOG  eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlN1UG9jVkhkODBkUm9vZjZmUmM0OGYyQlRjbXZyME92S3loTlJqUjdWQUEifQ.eyJjciI6IjE3NjMxMzI0MjciLCJsaW5rZWRfYWNjb3VudHMiOiJbe1widHlwZVwiOlwiZW1haWxcIixcImFkZHJlc3NcIjpcImN5bmRpZXdlYjNAZ21haWwuY29tXCIsXCJsdlwiOjE3NjMxNDUyMjR9LHtcImlkXCI6XCJiaHQzOGdicGQwN2VoMHk0cmw3NzNiOTFcIixcInR5cGVcIjpcIndhbGxldFwiLFwiYWRkcmVzc1wiOlwiMHgxY2Q3M2E1NjJiNGFkZGI2NjJjMDc3NzU5ZDU0NmFlNDViNDRlOWIzZGI4YjY1YTBhYWJiMTYyYjEzMDdhZTVcIixcImNoYWluX3R5cGVcIjpcInN0YXJrbmV0XCIsXCJ3YWxsZXRfY2xpZW50X3R5cGVcIjpcInByaXZ5XCIsXCJsdlwiOjE3NjMxMzI0Mjl9XSIsImlzcyI6InByaXZ5LmlvIiwiaWF0IjoxNzYzMTQ1MjI0LCJhdWQiOiJjbWhsYXBqYXMwMDZsanAwY3N6ZGxsNDZpIiwic3ViIjoiZGlkOnByaXZ5OmNtaHl6aXZvcDAwNWxsYTBkN2prbGRnYTAiLCJleHAiOjE3NjMxODEyMjR9.Cn3714rwQAHBwFI4ikUl-QyXLhD7chIbmcxdUb9KawaikMzUzZdKFtS-NYzwCabqNmWpcVPrqcxdTcco9ehIxg
 ```

---

### POST /api/wallet/create

Create a new Privy-managed embedded Starknet wallet for the authenticated user.

**Status:** ✅ Working

**Authentication:** Required

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "walletId": "bht38gbpd07eh0y4rl773b91",
    "address": "0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5",
    "publicKey": "0x7abbde06cf666df13060895cabe9ba763da493a51fe8ce3f5220ac68378a5bd",
    "chainType": "starknet",
    "message": "Starknet wallet created successfully"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/api/wallet/create \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Backend Logs:**
```
🔧 Creating Privy Starknet wallet...
  User ID: did:privy:cm7abc123xyz
✅ Privy wallet created!
  Wallet ID: bht38gbpd07eh0y4rl773b91
  Address: 0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5
  Public Key: 0x7abbde06cf666df13060895cabe9ba763da493a51fe8ce3f5220ac68378a5bd
```

---

### GET /api/wallet/list

List all Starknet wallets for the authenticated user.

**Status:** ✅ Working

**Authentication:** Required

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "id": "bht38gbpd07eh0y4rl773b91",
        "address": "0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5",
        "chainType": "starknet",
        "publicKey": "0x7abbde06cf666df13060895cabe9ba763da493a51fe8ce3f5220ac68378a5bd",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "count": 1
  }
}
```

**cURL Example:**
```bash
curl http://localhost:4000/api/wallet/list \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Backend Logs:**
```
📋 Listing Starknet wallets for user: did:privy:cm7abc123xyz
🔍 Fetching user from Privy...
🔍 Total accounts found: 2
🔍 Total wallet accounts: 2
🔍 Fetching wallet details for: bht38gbpd07eh0y4rl773b91
🔍 Wallet bht38gbpd07eh0y4rl773b91: chainType=starknet
✅ Starknet wallet bht38gbpd07eh0y4rl773b91: address=0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5
✅ Found 1 wallet(s)
```

---

### GET /api/wallet/:walletId

Get detailed information about a specific wallet including deployment status and balance.

**Status:** ✅ Working

**Authentication:** Required

**URL Parameters:**
- `walletId` - The Privy wallet ID

**Response:**
```json
{
  "success": true,
  "data": {
    "walletId": "bht38gbpd07eh0y4rl773b91",
    "address": "0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5",
    "publicKey": "0x7abbde06cf666df13060895cabe9ba763da493a51fe8ce3f5220ac68378a5bd",
    "isDeployed": true,
    "nonce": "0x1",
    "classHash": "0x073414441639dcd11d1846f287650a00c60c416b9d3ba45d31c651672125b2c2",
    "balance": {
      "wei": "10000000000000000000",
      "formatted": "10.00",
      "symbol": "EARN"
    }
  }
}
```

**cURL Example:**
```bash
curl http://localhost:4000/api/wallet/bht38gbpd07eh0y4rl773b91 \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Backend Logs:**
```
🔍 Getting wallet details...
  Wallet ID: bht38gbpd07eh0y4rl773b91
  User ID: did:privy:cm7abc123xyz
✅ Wallet details retrieved
  Address: 0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5
  Deployed: true
  Balance: 10.00 EARN
```

---

### GET /api/wallet/:walletId/balance

Get the EARN token balance for a specific wallet.

**Status:** ✅ Working

**Authentication:** Required

**URL Parameters:**
- `walletId` - The Privy wallet ID

**Response:**
```json
{
  "success": true,
  "data": {
    "walletId": "bht38gbpd07eh0y4rl773b91",
    "address": "0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5",
    "balanceWei": "10000000000000000000",
    "balance": "10.00",
    "symbol": "EARN"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:4000/api/wallet/bht38gbpd07eh0y4rl773b91/balance \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Backend Logs:**
```
💰 Getting balance for wallet: bht38gbpd07eh0y4rl773b91
✅ Balance: 10.00 EARN
```

---

### POST /api/wallet/:walletId/deploy

Deploy the user's Starknet account on-chain. Transaction is gasless (sponsored by paymaster).

**Status:** ✅ Working

**Authentication:** Required

**URL Parameters:**
- `walletId` - The Privy wallet ID

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "walletId": "bht38gbpd07eh0y4rl773b91",
    "address": "0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5",
    "publicKey": "0x7abbde06cf666df13060895cabe9ba763da493a51fe8ce3f5220ac68378a5bd",
    "transactionHash": "0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j",
    "message": "Account deployed successfully! (Gas paid by paymaster)"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/api/wallet/bht38gbpd07eh0y4rl773b91/deploy \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Backend Logs:**
```
🚀 Deploying Starknet account...
  Wallet ID: bht38gbpd07eh0y4rl773b91
  User ID: did:privy:cm7abc123xyz
🗝️ Building Ready account...
  Address: 0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5
  Public Key: 0x7abbde06cf666df13060895cabe9ba763da493a51fe8ce3f5220ac68378a5bd
✅ Account configured with paymaster
📝 Executing paymaster deployment...
🔏 Signing with Privy API (JWT auth)...
  Wallet ID: bht38gbpd07eh0y4rl773b91
  Message hash: 0x1e6ce468efdf30dde6...
✅ Signature received from Privy
✅ Transaction executed (gasless): 0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j
✅ Account deployed successfully!
  Tx Hash: 0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j
```

**Verify on Voyager:**
```
https://sepolia.voyager.online/tx/0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j
```

---

### POST /api/wallet/:walletId/claim

Claim EARN tokens. Transaction is signed by backend's "hello-account" and is gasless.

**Status:** ✅ Working

**Authentication:** Required

**URL Parameters:**
- `walletId` - The Privy wallet ID

**Request Body:**
```json
{
  "amount": "10"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0x7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f",
    "walletId": "bht38gbpd07eh0y4rl773b91",
    "address": "0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5",
    "amount": "10",
    "message": "Rewards claimed! EARN tokens sent to your wallet."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/api/wallet/bht38gbpd07eh0y4rl773b91/claim \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"amount": "10"}'
```

**Backend Logs:**
```
🎁 Processing claim...
  Wallet ID: bht38gbpd07eh0y4rl773b91
  User ID: did:privy:cm7abc123xyz
  Amount: 10 EARN
🚀 Sending EARN tokens to user
  To: 0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5
  Amount (wei): 10000000000000000000
  Signed by: hello-account (0x1a2b3c4d...)
📊 Converting 10 EARN to 10000000000000000000 wei
📄 Requesting paymaster sponsorship (API method)...
  From: 0x1a2b3c4d...
  Calls: 1
✅ Paymaster approved sponsorship
✅ Transaction submitted (paymaster): 0x7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f
✅ EARN transfer successful: 0x7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f
✅ Claim successful
  Tx Hash: 0x7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f
```

---

### POST /api/wallet/:walletId/withdraw

Withdraw EARN tokens to an external address. Transaction is signed by user via Privy and is gasless.

**Status:** ⚠️ Debug Mode (Privy signing integration issue)

**Authentication:** Required

**URL Parameters:**
- `walletId` - The Privy wallet ID

**Request Body:**
```json
{
  "toAddress": "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
  "amount": "5"
}
```

**Expected Response (when working):**
```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "from": "0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5",
    "to": "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    "amount": "5",
    "gasless": true,
    "message": "Withdrawal successful! (User signed, gas paid by paymaster)"
  }
}
```

**Current Response (debug mode):**
```json
{
  "success": false,
  "error": "Failed to process withdrawal",
  "details": "Transaction failed: Failed to sign with Privy: Invalid auth token."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/api/wallet/bht38gbpd07eh0y4rl773b91/withdraw \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "toAddress": "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    "amount": "5"
  }'
```

**Debug Logs:**
```
💸 Processing withdrawal (user signs)...
  Wallet ID: bht38gbpd07eh0y4rl773b91
  User ID: did:privy:cm7abc123xyz
  To: 0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b
  Amount: 5 EARN
🔍 JWT Debug:
  Length: 814
  Starts with: eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
  Format check: ✅ Valid JWT format
  Issued at: 2025-01-15T10:30:00.000Z
  Expires at: 2025-01-15T11:30:00.000Z
  Current time: 2025-01-15T10:45:00.000Z
  Is expired: ✅ NO
🔍 Address Verification:
  Privy address: 0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5
  Calculated address: 0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5
  ✅ Addresses match!
📝 Executing Ready transaction with paymaster...
🗝️ Building Ready account...
  Address: 0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5
  Public Key: 0x7abbde06cf666df13060895cabe9ba763da493a51fe8ce3f5220ac68378a5bd
✅ Account configured with paymaster
  From address: 0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5
  Calls: 1
🔏 Signing with Privy API (JWT auth)...
  Wallet ID: bht38gbpd07eh0y4rl773b91
  Message hash: 0x1e6ce468efdf30dde6...
📤 Sending request to Privy...
📥 Privy response status: 401
📥 Privy response body: {"error": "Invalid auth token."}
❌ Privy API error: {"error": "Invalid auth token."}
❌ Privy signature failed: Error: Invalid auth token.
❌ Paymaster transaction failed: Failed to sign with Privy: Invalid auth token.
❌ Withdrawal error: Error: Transaction failed: Failed to sign with Privy: Invalid auth token.
```

**Note:** This is the known issue being debugged. The JWT validation is correct, but there's an issue with how we're calling Privy's signing endpoint.

---

### POST /api/wallet/:walletId/execute

Execute an arbitrary Starknet transaction. User signs via Privy, gasless via paymaster.

**Status:** ✅ Working

**Authentication:** Required

**URL Parameters:**
- `walletId` - The Privy wallet ID

**Request Body:**
```json
{
  "call": {
    "contractAddress": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    "entrypoint": "approve",
    "calldata": ["0x...", "0x...", "0x..."]
  }
}
```

Or with multiple calls:
```json
{
  "calls": [
    {
      "contractAddress": "0x...",
      "entrypoint": "approve",
      "calldata": ["0x..."]
    },
    {
      "contractAddress": "0x...",
      "entrypoint": "transfer",
      "calldata": ["0x..."]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "walletId": "bht38gbpd07eh0y4rl773b91",
    "address": "0x1cd73a562b4addb662c077759d546ae45b44e9b3db8b65a0aabb162b1307ae5",
    "transactionHash": "0x...",
    "message": "Transaction executed successfully"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/api/wallet/bht38gbpd07eh0y4rl773b91/execute \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "call": {
      "contractAddress": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
      "entrypoint": "approve",
      "calldata": ["0x123...", "0x456...", "0x789..."]
    }
  }'
```

---

## Smart Contracts

### Network Information

**Network:** Starknet Sepolia Testnet  
**Explorer:** https://sepolia.voyager.online/

### Contract Addresses

**EarnToken (ERC20)**
- Address: `[Your deployed address]`
- Symbol: EARN
- Decimals: 18
- ABI: `contracts/abis/EarnTokenABI.json`

**EarnStarkManager**
- Address: `[Your deployed address]`
- Purpose: Manages token distribution
- ABI: `contracts/abis/EarnStarkManagerABI.json`

### Account Contract

**Argent X v0.5.0**
- Class Hash: `0x073414441639dcd11d1846f287650a00c60c416b9d3ba45d31c651672125b2c2`
- Used for all user accounts
- Supports multicall and guardians

---

## Architecture Details

### File Structure

```
backend/
├── src/
│   ├── routes/
│   │   └── wallet.ts           # API endpoint handlers
│   ├── lib/
│   │   ├── privy.ts            # Privy client initialization
│   │   ├── ready.ts            # Ready account deployment & signing
│   │   ├── starknet.ts         # RPC provider & contract setup
│   │   ├── paymaster.ts        # AVNU paymaster integration
│   │   └── rawSigner.ts        # Custom Starknet signer class
│   ├── middleware/
│   │   └── auth.ts             # JWT verification middleware
│   └── config/
│       └── env.ts              # Environment variable validation
├── contracts/
│   └── abis/                   # Smart contract ABIs
│       ├── EarnTokenABI.json
│       └── EarnStarkManagerABI.json
├── .env.example                # Environment template
└── package.json
```

### Key Components

#### `ready.ts` - Account Management
- `computeReadyAddress()` - Calculate deterministic address
- `buildReadyAccount()` - Create account with Privy signer
- `deployReadyAccountWithPaymaster()` - Deploy with gasless tx
- `executeReadyTransactionWithPaymaster()` - Execute with gasless tx
- `rawSign()` - Sign via Privy RPC API (⚠️ debug mode for withdrawals)

#### `paymaster.ts` - Gasless Transactions
- `setupPaymaster()` - Configure AVNU paymaster
- `paymasterExecute()` - Execute with native Starknet.js paymaster
- `sponsoredExecute()` - Legacy API-based method
- `sendEarnsToUserFormatted()` - Token distribution helper

#### `starknet.ts` - Blockchain Interface
- `helloAccount` - Backend account for custodial operations
- `earnToken` - ERC20 contract instance
- `earnManager` - Manager contract instance
- Helper functions for balance checking

#### `auth.ts` - Authentication
- `requirePrivyAuth()` - Verify JWT and extract user info
- `verifyPrivyAuth()` - Non-fatal auth (optional endpoints)

### Authentication Flow

1. User logs in via Privy in mobile app
2. Mobile app receives JWT token
3. JWT sent in Authorization header to backend
4. Backend verifies JWT with Privy SDK
5. Extract userId from JWT claims
6. Proceed with wallet operations

### Custodial vs Self-Custodial

**Custodial (Claims):**
```typescript
// Backend signs with hello-account private key
const result = await sendEarnsToUserFormatted(userAddress, amount);
// User receives tokens without signing
```

**Self-Custodial (Deploy/Withdraw):**
```typescript
// User's JWT passed to Privy RPC for signing
const account = await buildReadyAccount({
  walletId,
  publicKey,
  classHash,
  userJwt  // User's session token
});
// Privy signs with user's embedded wallet
const result = await account.executePaymasterTransaction(...);
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error:** `PRIVY_APP_ID is required`

**Solution:**
1. Ensure `.env` file exists
2. Copy from `.env.example`: `cp .env.example .env`
3. Fill in all required variables
4. Check for typos in variable names

---

**Error:** `Failed to connect to Starknet RPC`

**Solution:**
1. Verify `RPC_URL` format: `https://starknet-sepolia.g.alchemy.com/v2/YOUR_KEY`
2. Test RPC URL in browser or curl
3. Check Alchemy dashboard for API key status
4. Ensure Starknet Sepolia app is created (not Ethereum)

---

**Error:** `Failed to load ABI: EarnTokenABI.json`

**Solution:**
1. Check file exists: `ls contracts/abis/EarnTokenABI.json`
2. Verify JSON is valid (use `jq` or JSON validator)
3. Ensure path is correct from backend root

---

### Contract Initialization Fails

**Error:** `Failed to initialize contracts`

**Solution:**
1. Verify contract addresses are correct
2. Check contracts are deployed on Sepolia
3. Verify on Voyager: https://sepolia.voyager.online/
4. Ensure ABI matches deployed contract

---

### Paymaster Issues

**Error:** `PAYMASTER_API_KEY is required`

**Solution:**
1. Sign up at https://avnu.fi
2. Get API key from dashboard
3. Add to `.env` file
4. Restart backend

---

**Error:** `Paymaster service not available`

**Solution:**
1. Check AVNU status
2. Verify `PAYMASTER_URL` is correct
3. Try again after a few minutes
4. Check API key is valid (not rate limited)

---

### JWT/Authentication Issues

**Error:** `Unauthorized: invalid or expired Privy token`

**Solution:**
1. Token expires after ~1 hour
2. User needs to logout and login again
3. Mobile app should refresh token before requests
4. Check `PRIVY_APP_SECRET` is correct

---

**Error:** `Invalid Privy token: no userId/sub in claims`

**Solution:**
1. Verify token is from Privy (not another service)
2. Check `PRIVY_APP_ID` matches mobile app
3. Ensure user completed Privy authentication flow

---

### Withdrawal Signing Issue (Current Debug)

**Error:** `Invalid auth token` during withdrawal

**Current Status:** ⚠️ Being debugged

**What We Know:**
- JWT is valid (not expired)
- Address calculation is correct
- Deployment works (same signing flow)
- Issue is specific to withdrawal endpoint

**Debug Steps:**
1. Check backend logs for JWT validation output
2. Verify JWT format (should have 3 parts separated by dots)
3. Confirm JWT is not expired
4. Check Privy RPC endpoint response

**Workaround:**
- All other features work correctly
- Use deployment to test user signing flow
- Withdrawals will be fixed in next update

---

### Network/Connection Issues

**Error:** Mobile app can't reach backend

**Solution:**
1. Verify backend is running: `curl http://localhost:4000/health`
2. Check firewall isn't blocking port 4000
3. For Expo Go: Ensure phone and computer on same WiFi
4. Test with curl from different device on same network

---

### Transaction Failures

**Error:** `Account not deployed`

**Solution:**
1. User must deploy account first
2. Call `/api/wallet/:walletId/deploy`
3. Wait for deployment confirmation
4. Verify on Voyager

---

**Error:** `Insufficient balance`

**Solution:**
1. Check balance: `/api/wallet/:walletId/balance`
2. Claim tokens first: `/api/wallet/:walletId/claim`
3. Wait for claim confirmation
4. Verify balance updated

---

**Error:** Transaction pending forever

**Solution:**
1. Sepolia can be slow (30 seconds to 5 minutes)
2. Check transaction on Voyager with tx hash
3. If stuck >10 minutes, may need to retry
4. Check RPC provider status (Alchemy)

---

## 📊 Monitoring & Logs

### Log Levels

The backend uses console logging with emoji indicators:

- ✅ Success operations
- ❌ Errors and failures  
- ⚠️ Warnings
- 🔍 Debug information
- 📝 Informational messages
- 🚀 Transaction submissions
- 💰 Financial operations

### Important Logs to Watch

**Startup:**
```
✅ hello-account initialized: 0x...
✅ Contracts initialized
Server running on port 4000
```

**Successful Claim:**
```
🎁 Processing claim...
✅ EARN transfer successful: 0x...
```

**Successful Deploy:**
```
🚀 Deploying Starknet account...
✅ Transaction executed (gasless): 0x...
```

**Withdrawal Debug:**
```
💸 Processing withdrawal (user signs)...
🔍 JWT Debug: [validation output]
❌ Privy signature failed: Invalid auth token
```

---

## 📧 Support

For issues:
1. Check logs for error details
2. Verify environment configuration
3. Test with curl commands
4. Check Voyager for transaction status
5. Open GitHub issue with logs and error messages



