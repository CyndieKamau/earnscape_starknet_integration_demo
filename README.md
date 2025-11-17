# Earnscape - Starknet Rewards Demo

> **Demo app showcasing Privy embedded Starknet wallets with gasless transactions via AVNU Paymaster**

A React Native mobile rewards application that enables users to claim and withdraw EARN tokens (ERC20) on Starknet Sepolia testnet. Features embedded Starknet wallets via Privy SDK and gasless transactions.

## ⚠️ Current Status

**5 out of 6 core features are fully functional:**

- ✅ User Authentication (Privy)
- ✅ Wallet Creation (Embedded Starknet wallets)
- ✅ Token Claiming (Backend-signed, gasless)
- ✅ Account Deployment (User-signed, gasless)
- ✅ Balance Checking
- ⚠️ **Token Withdrawal (Debug Mode)** - Privy signing integration being resolved

The withdrawal functionality is in debug mode with detailed logging to help diagnose a Privy RPC signing issue. All other features work perfectly.

---



## Architecture

```
┌─────────────────┐
│  Mobile App     │  React Native + Expo
│  (Expo Go)      │  Privy Authentication
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  Express.js     │  JWT Auth
│  Backend API    │  Privy Wallet Integration
└────────┬────────┘
         │
         │ Starknet.js
         │
┌────────▼────────┐
│  Starknet       │  Sepolia Testnet
│  Blockchain     │  AVNU Paymaster (Gasless)
└─────────────────┘
```

**Components:**
- **Frontend:** React Native app with Privy authentication
- **Backend:** Express.js API handling wallet operations and transaction signing
- **Blockchain:** Starknet Sepolia with EarnToken (ERC20) and EarnStarkManager contracts

---

## Features

### User Flow

1. **Login** → Authenticate via Privy (email/social)
2. **Auto-Wallet** → Embedded Starknet wallet created automatically
3. **Claim** → Get EARN tokens (backend signs, gasless)
4. **Deploy** → Deploy account on-chain (user signs, gasless via paymaster)
5. **Balance** → Check token balance
6. **Withdraw** → ⚠️ Send tokens to external address (in debug)

### Key Technical Features

- **Privy Embedded Wallets** - No seed phrases, seamless onboarding
- **Gasless Transactions** - AVNU paymaster sponsors all gas fees
- **Hybrid Custody** - Backend signs claims, user signs withdrawals
- **Mobile First** - React Native with Expo Go support
- **Starknet Ready** - Uses Argent X v0.5.0 account contracts

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React Native + Expo | Latest |
| Mobile Testing | Expo Go | Latest |
| Backend | Express.js + TypeScript | 4.x |
| Authentication | Privy SDK | v1.32.5 |
| Blockchain SDK | Starknet.js | v8.5.3 |
| Account Contract | Argent X | v0.5.0 |
| Network | Starknet Sepolia | Testnet |
| RPC Provider | Alchemy | - |
| Paymaster | AVNU | Sepolia |
| Smart Contracts | EarnToken (ERC20), EarnStarkManager | Custom |

---

## Prerequisites

Before you begin, ensure you have:

### Software Requirements

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Expo CLI** (install globally)
  ```bash
  npm install -g expo-cli
  ```

### Mobile Testing Options

Choose one:

1. **Expo Go App** (Recommended for quick testing) 📱
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Simulators/Emulators**
   - iOS Simulator (macOS only)
   - Android Emulator (requires Android Studio)

### Required Accounts

You'll need API keys from these services:

1. **Privy** - Authentication & embedded wallets
   - Sign up: https://dashboard.privy.io
   - Get: App ID, App Secret, Wallet Auth Private Key

2. **Alchemy** - Starknet RPC provider
   - Sign up: https://alchemy.com
   - Create Starknet Sepolia app
   - Get: RPC URL with API key

3. **AVNU** - Paymaster for gasless transactions
   - Sign up: https://avnu.fi
   - Get: Paymaster API key

### Knowledge Prerequisites

- Basic understanding of React Native
- Familiarity with REST APIs
- Basic blockchain concepts (addresses, transactions)
- Understanding of Starknet (helpful but not required)

---

##  Quick Start

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/earnscape.git
cd earnscape
```

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your API keys (see Backend README for details)
nano .env

# Start the server
npm run dev
```

**Expected output:**
```
✅ hello-account initialized: 0x...
✅ Contracts initialized
  - EarnToken: 0x...
  - EarnManager: 0x...
Server running on port 4000
```

If you see this, your backend is ready! ✅

👉 **See [backend/README.md](./backend/README.md) for detailed setup instructions**

---

### Step 3: Frontend Setup

```bash
cd ../mobile-app

# Install dependencies
npm install

# ⚠️ CRITICAL: Configure your IP address
# Edit lib/api.ts and change the IP to your computer's local IP
```

**Find your local IP:**

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

**Edit `lib/api.ts`:**
```typescript
// CHANGE THIS:
const LAN_BASE_URL = "http://172.19.115.98:4000";

// TO YOUR IP:
const LAN_BASE_URL = "http://YOUR_LOCAL_IP:4000";
```

**Start Expo:**
```bash
npx expo start
```

👉 **See [mobile-app/README.md](./mobile-app/README.md) for detailed setup instructions**

---

### Step 4: Run on Your Phone with Expo Go

1. **Ensure same WiFi** - Phone and computer must be on the same network ⚠️

2. **Scan QR code** from terminal:
   - **iOS:** Open Camera → Point at QR → Tap notification
   - **Android:** Open Expo Go → "Scan QR Code" → Point at terminal

3. **Wait for build** - First time takes 1-2 minutes

4. **App opens automatically** when ready! 🎉

---

## 📖 Usage Guide

### Step-by-Step Testing Flow

#### 1. Login 
- Open app → See Privy login screen
- Login with email or social provider
- See main wallet dashboard

#### 2. Check Wallet 
- Wallet address displayed automatically
- Copy address for later verification
- Backend logs show wallet creation

#### 3. Claim Tokens 
- Tap "Claim Tokens"
- Enter amount (e.g., "10")
- Tap "Claim"
- Wait ~30 seconds for confirmation
- Balance updates automatically

#### 4. Deploy Account 
- Tap "Deploy Account"
- Confirm deployment
- Wait 1-2 minutes for Sepolia confirmation
- Transaction hash appears
- Verify on [Voyager](https://sepolia.voyager.online/)

#### 5. Check Balance 
- Tap "Refresh Balance"
- See claimed tokens
- Balance shown in EARN

#### 6. Withdraw Tokens ⚠️
- **In Debug Mode**
- Enter recipient address and amount
- Tap "Withdraw"
- Check backend logs for detailed debug output
- Currently shows "Invalid auth token" - known issue being resolved

---

## Project Structure

```
earnscape/
├── backend/                    # Express.js API
│   ├── src/
│   │   ├── routes/
│   │   │   └── wallet.ts      # API endpoints
│   │   ├── lib/
│   │   │   ├── privy.ts       # Privy client
│   │   │   ├── ready.ts       # Account logic
│   │   │   ├── starknet.ts    # Blockchain
│   │   │   └── paymaster.ts   # AVNU integration
│   │   ├── middleware/
│   │   │   └── auth.ts        # JWT verification
│   │   └── config/
│   │       └── env.ts         # Environment validation
│   ├── contracts/abis/        # Contract ABIs
│   ├── .env.example           # Environment template
│   └── README.md              # Backend docs
│
├── mobile-app/                 # React Native app
│   ├── app/
│   │   └── (tabs)/            # Main screens
│   ├── lib/
│   │   └── api.ts             # ⚠️ CONFIGURE YOUR IP HERE
│   ├── components/
│   └── README.md              # Frontend docs
│
└── README.md                   # This file
```

---

## 🔧 Environment Configuration

### Backend (.env)

```bash
# Privy Configuration
PRIVY_APP_ID=your_app_id
PRIVY_APP_SECRET=your_app_secret
PRIVY_WALLET_AUTH_PRIVATE_KEY=your_private_key

# Starknet Configuration
RPC_URL=https://starknet-sepolia.g.alchemy.com/v2/YOUR_API_KEY
READY_CLASSHASH=0x073414441639dcd11d1846f287650a00c60c416b9d3ba45d31c651672125b2c2

# Smart Contracts
EARNS_TOKEN_ADDRESS=your_token_address
EARNSTARK_MANAGER_ADDRESS=your_manager_address
EARNS_TOKEN_OWNER=your_hello_account_address
EARNS_TOKEN_OWNER_PRIVATE_KEY=your_hello_account_private_key

# Paymaster
PAYMASTER_URL=https://sepolia.paymaster.avnu.fi
PAYMASTER_API_KEY=your_avnu_api_key
PAYMASTER_MODE=sponsored
```

See `.env.example` for detailed explanations of each variable.

---

## Troubleshooting

### Common Issues

#### "Network request failed" in app

**Problem:** App can't connect to backend

**Solutions:**
- Update IP in `mobile-app/lib/api.ts`
- Is backend running? Check terminal for "Server running on port 4000"
- Are phone and computer on same WiFi?
- Is firewall blocking port 4000?

```bash
# Test backend is accessible
curl http://YOUR_IP:4000/healthz
```

It should give this response:

```bash
{"status":"ok","env":"development","timestamp":"2025-11-14T11:33:58.554Z"}
```

#### Can't scan QR code with Expo Go

**Problem:** QR code doesn't work

**Solutions:**
- Phone and computer on same WiFi network?
- Try manually entering the URL from terminal (exp://...)
- Restart Expo: `npx expo start --clear`
- Try tunnel mode: `npx expo start --tunnel`

#### "PRIVY_APP_ID is required"

**Problem:** Backend won't start

**Solutions:**
- Did you create `.env` file? (`cp .env.example .env`)
- Are all variables from `.env.example` present?
- Check for typos in variable names

#### "Invalid auth token" during withdrawal ⚠️

**Problem:** Withdrawal fails

**Solution:** This is the known issue being debugged. Check backend logs for detailed debug output. All other features work correctly.

#### Backend starts but "Failed to initialize contracts"

**Problem:** Contract initialization fails

**Solutions:**
- Verify `EARNS_TOKEN_ADDRESS` is correct
- Verify `EARNSTARK_MANAGER_ADDRESS` is correct
- Check contracts are deployed on Sepolia testnet
- Verify ABI files exist in `backend/contracts/abis/`

#### App shows blank screen on Expo Go

**Problem:** App doesn't load

**Solutions:**
- Check Metro bundler is running (should see in terminal)
- Press 'r' in terminal to reload
- Clear cache: `npx expo start --clear`
- Check for JavaScript errors in terminal

#### "Account not deployed" during withdrawal

**Problem:** Can't withdraw without deployment

**Solution:** 
- Deploy account first using "Deploy Account" button
-  Wait for deployment confirmation (1-2 minutes)
- Verify on Voyager: https://sepolia.voyager.online/

### Get Help

- 📖 Check [Backend README](./backend/README.md) for API details
- 📖 Check [Frontend README](./mobile-app/README.md) for mobile issues
- 🐛 Open an issue on GitHub
- 💬 Include backend logs and error messages

---

## API Documentation

Full API documentation with curl examples: **[backend/README.md](./backend/README.md)**

**Quick Reference:**

- `POST /api/wallet/create` - Create wallet 
- `GET /api/wallet/list` - List wallets 
- `GET /api/wallet/:walletId` - Get wallet details 
- `GET /api/wallet/:walletId/balance` - Get balance 
- `POST /api/wallet/:walletId/deploy` - Deploy account 
- `POST /api/wallet/:walletId/claim` - Claim tokens 
- `POST /api/wallet/:walletId/withdraw` - Withdraw tokens ⚠️
- `POST /api/wallet/:walletId/execute` - Execute transaction 

---

## Smart Contracts

**Network:** Starknet Sepolia Testnet

**Contracts:**
- **EarnToken (ERC20):** `[Your deployed address]`
- **EarnStarkManager:** `[Your deployed address]`

**Account Contract:** Argent X v0.5.0
- **Class Hash:** `0x073414441639dcd11d1846f287650a00c60c416b9d3ba45d31c651672125b2c2`

**Explorer:** `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/YOUR_API_KEY`

**ABIs:** Located in `backend/contracts/abis/`

---

## Testing Checklist

Use this to verify your setup:

- [ ] Backend starts without errors
- [ ] Can access `http://localhost:4000/health`
- [ ] Frontend builds successfully
- [ ] Can scan QR code with Expo Go
- [ ] App opens on phone
- [ ] Can login with Privy
- [ ] Wallet created automatically
- [ ] Can claim tokens (check backend logs for tx hash)
- [ ] Can deploy account (check Voyager for confirmation)
- [ ] Balance updates after claim
- [ ] Can see transaction on Voyager
- [ ] Withdrawal shows debug logs (expected)

---

## Key Technical Details

### Address Calculation

The app uses Privy's embedded wallet addresses directly. Privy generates deterministic Starknet addresses using the Argent X v0.5.0 class hash. The backend independently calculates the same address for verification purposes,


### Custodial vs Self-Custodial

**Custodial (Claims):**
- Backend signs transactions with "hello-account"
- Seamless UX, no user interaction
- Used for reward distribution

**Self-Custodial (Deploy/Withdraw):**
- User signs via Privy RPC API
- User maintains control
- Required for security-sensitive operations

### JWT Authentication

- User's JWT from Privy login
- Passed to Privy's `/rpc` endpoint for signing
- Token expires after ~1 hour
- Withdrawal signing currently in debug mode

### Paymaster Integration

- AVNU paymaster sponsors all gas fees
- User pays $0 in gas
- Works for deploy and withdraw operations
- Configured in "sponsored" mode

---

##  Known Limitations

- ⚠️ **Withdrawal signing in debug mode** - Privy integration being resolved
- Sepolia testnet only (testnet can be slow)
- Requires manual IP configuration in `api.ts`
- No persistent database (state resets on restart)
- Single "hello-account" distributes all tokens
- Phone and computer must be on same WiFi for Expo Go

**Status: 5 out of 6 core features fully functional** ✅

---

## 🗺️ Roadmap

**Completed:**
- ✅ Privy authentication integration
- ✅ Embedded Starknet wallet creation
- ✅ Token claiming system
- ✅ Gasless account deployment
- ✅ Balance checking
- ✅ AVNU paymaster integration

**In Progress:**
- 🔄 User-signed withdrawals (Privy RPC signing)

---

