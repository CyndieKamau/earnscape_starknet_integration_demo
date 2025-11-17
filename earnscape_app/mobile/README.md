# Frontend - Earnscape Mobile App

React Native mobile application for Earnscape rewards platform. Built with Expo and featuring Privy authentication for seamless Web3 onboarding.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Testing with Expo Go](#testing-with-expo-go)
- [App Features](#app-features)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Earnscape mobile app provides:
- Seamless login via Privy (email/social)
- Automatic embedded Starknet wallet creation
- Token claiming interface
- Account deployment
- Balance checking
- Token withdrawal (⚠️ in debug)
- Transaction history

No seed phrases, no complex wallet setup - just login and start earning!

---

## Tech Stack

- **Framework:** React Native with Expo
- **Language:** TypeScript
- **Authentication:** Privy SDK v1.32.5
- **State Management:** React Hooks
- **Navigation:** Expo Router
- **HTTP Client:** Axios
- **UI Components:** React Native components + custom styling

---

## Installation

### 1. Prerequisites

Ensure you have:
- Node.js v18+ installed
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- **Expo Go app** on your phone:
  - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
  - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 2. Install Dependencies

```bash
cd mobile-app
npm install
```

### 3. Verify Installation

```bash
# Check for node_modules
ls node_modules/

# Should include @privy-io/expo, expo, react-native, etc.
```

---

## 🔧 Configuration

### ⚠️ CRITICAL: Configure Backend URL

You **MUST** update the IP address in `lib/api.ts` to match your computer's local IP.

#### Step 1: Find Your Local IP

**macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
Output example:
```
inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255
```
Your IP: `192.168.1.100`

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.  
Example: `192.168.1.100`

**Linux:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

#### Step 2: Update api.ts

Open `lib/api.ts` and find these lines:

```typescript
// 1️⃣ Detect the backend base URL
// - iOS simulator can use localhost
// - Android emulator uses 10.0.2.2
// - Physical device: replace with your computer's LAN IP (e.g. 192.168.x.x)
const LOCAL_BASE_URL =
  Platform.OS === "ios"
    ? "http://localhost:4000"
    : "http://10.0.2.2:4000";

// 👇 replace with your actual LAN IP if testing on real phone
const LAN_BASE_URL = "http://172.19.115.98:4000";  // ⚠️ CHANGE THIS!

// Toggle this depending on environment
const BASE_URL = __DEV__ ? LAN_BASE_URL : "http://172.19.115.98:4000";
```

**Change to:**
```typescript
const LAN_BASE_URL = "http://YOUR_LOCAL_IP:4000";  // ✅ Your IP here!
```

Example:
```typescript
const LAN_BASE_URL = "http://192.168.1.100:4000";
```

#### Why This Matters

| Testing Method | IP to Use |
|----------------|-----------|
| iOS Simulator | `localhost:4000` or `127.0.0.1:4000` |
| Android Emulator | `10.0.2.2:4000` |
| **Expo Go on Phone** | **Your computer's LAN IP** (e.g., `192.168.1.100:4000`) |

**Important:** Your phone and computer **MUST** be on the same WiFi network!

### Privy Configuration

If you have a Privy configuration file (e.g., `privy-config.ts`), ensure your `PRIVY_APP_ID` is set correctly:

```typescript
export const PRIVY_APP_ID = "your_privy_app_id";
```

This should match the `PRIVY_APP_ID` in your backend `.env` file.

---

## Running the App

### Start the Development Server

```bash
npx expo start
```

### Expected Output

```
› Metro waiting on exp://192.168.1.100:8081

› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press ? │ show all commands
```

You should see:
1. A QR code in your terminal
2. Metro bundler running
3. Your local IP address in the exp:// URL

---

## Testing with Expo Go

### Setup

1. **Install Expo Go** on your phone (see [Installation](#installation))
2. **Connect to WiFi** - Same network as your computer!
3. **Start Backend** - Ensure it's running on your computer

### Testing on iOS

1. Open your **Camera app**
2. Point at the QR code in terminal
3. Tap the notification that appears
4. Wait for app to build (1-2 minutes first time)
5. Expo Go opens automatically

### Testing on Android

1. Open **Expo Go app**
2. Tap **"Scan QR Code"**
3. Point at the QR code in terminal
4. Wait for app to build
5. App opens automatically

### First Launch

The first time you run the app:
- Metro will bundle JavaScript (~1-2 minutes)
- You'll see "Building JavaScript bundle" progress
- App opens when ready
- Subsequent launches are faster

### Quick Reload

If you make code changes:
- Shake your phone
- Tap "Reload" in the menu
- Or press `r` in terminal

---

## App Features

### 1. Login Screen ✅

**Location:** Initial screen when not authenticated

**Features:**
- Privy authentication
- Email login
- Social login (Google, Twitter, etc.)
- No password required

**How to Test:**
1. Open app
2. Tap "Login with Email"
3. Enter your email
4. Check email for code
5. Enter code
6. Logged in!


---

### 2. Claim Tokens ✅

**Location:** Claim button on dashboard

**Features:**
- Enter amount to claim
- Instant transaction (backend signs)
- Gasless (no fees)
- Balance updates automatically

**How to Test:**
1. Tap "Claim Tokens"
2. Enter amount (e.g., "10")
3. Tap "Claim"
4. See success message
5. Wait 30 seconds
6. Balance updates

**Backend Logs:**
```
🎁 Processing claim...
✅ EARN transfer successful: 0x...
```

---

### 3. Deploy Account ✅

**Location:** Deploy button on dashboard

**Features:**
- One-time account deployment
- User signs transaction via Privy
- Gasless (paymaster pays)
- Enables withdrawals

**How to Test:**
1. Claim tokens first (need balance)
2. Tap "Deploy Account"
3. Confirm deployment
4. Wait 1-2 minutes
5. See transaction hash
6. Check on Voyager

**Backend Logs:**
```
🚀 Deploying Starknet account...
✅ Transaction executed (gasless): 0x...
```

**Verify:**
- Visit: https://sepolia.voyager.online/
- Paste your address
- See deployed account

---

### 4. Check Balance ✅

**Location:** Balance display on dashboard

**Features:**
- Real-time EARN balance
- Refresh button
- Shows in human-readable format

**How to Test:**
1. Tap "Refresh Balance"
2. See updated amount
3. Matches Voyager balance

---

### 5. Withdraw Tokens ⚠️

**Location:** Withdraw button on dashboard

**Status:** Debug Mode (signing issue)

**Features:**
- Send tokens to external address
- User signs transaction
- Gasless (paymaster pays)
- Currently shows debug logs

**How to Test:**
1. Deploy account first
2. Claim some tokens
3. Tap "Withdraw"
4. Enter recipient address
5. Enter amount
6. Tap "Confirm"
7. Check backend logs for debug output

**Expected (Debug):**
```
💸 Processing withdrawal...
❌ Invalid auth token
```

This is the known issue being resolved. All other features work!

---

### 6. Transaction History

**Location:** History tab (if implemented)

**Shows:**
- Past claims
- Deployments
- Withdrawals
- Transaction links to Voyager

---

## 🗂️ Project Structure
```
mobile-app/
├── app/                        # Expo Router pages
│   ├── (tabs)/                # Tab navigation screens
│   │   ├── _layout.tsx        # Tab layout
│   │   ├── claim.tsx          # Claim tokens screen
│   │   ├── history.tsx        # Transaction history
│   │   ├── index.tsx          # Home/Dashboard
│   │   ├── profile.tsx        # User profile
│   │   └── withdraw.tsx       # Withdraw tokens (debug)
│   ├── auth/                  # Authentication screens
│   │   ├── _layout.tsx        # Auth layout
│   │   └── sign-in.tsx        # Login screen
│   ├── _layout.tsx            # Root layout
│   └── global.css             # Global styles
│
├── assets/                     # Images, fonts, etc.
│
├── constants/                  # App constants
│   └── rewards.ts             # Reward configurations
│
├── lib/                        # Utilities
│   ├── api.ts                 # ⚠️ Backend API client (CONFIGURE IP!)
│   └── global-provider.tsx    # Global context provider
│
├── node_modules/               # Dependencies (auto-generated)
│
├── .env                        # Environment variables (create this)
├── .gitignore                  # Git ignore rules
├── app.json                    # Expo configuration
├── babel.config.js             # Babel configuration
├── entrypoint.js              # App entry point
├── eslint.config.js           # ESLint configuration
├── expo-env.d.ts              # Expo TypeScript definitions
├── metro.config.js            # Metro bundler config
├── nativewind-env.d.ts        # NativeWind TypeScript definitions
├── package.json               # Dependencies & scripts
├── package-lock.json          # Dependency lock file
├── README.md                  # This file
├── tailwind.config.js         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

### Key Files

**`lib/api.ts`** ⚠️ **MUST CONFIGURE**
- Backend API client
- Configure your IP address here
- Axios instance with auth headers

**`app/(tabs)/index.tsx`**
- Main dashboard
- Shows wallet, balance, actions

**`app/(tabs)/claim.tsx`**
- Token claiming interface
- Backend-signed transactions

**`app/(tabs)/withdraw.tsx`**
- Token withdrawal (⚠️ debug mode)
- User-signed transactions via Privy

**`app/(tabs)/history.tsx`**
- Transaction history view

**`app/(tabs)/profile.tsx`**
- User profile and settings

**`app/auth/sign-in.tsx`**
- Privy authentication screen
- Email/social login

**`lib/global-provider.tsx`**
- Global state management
- Context provider for app-wide state

**`constants/rewards.ts`**
- Reward configurations
- Token amounts, rules, etc.

**`app.json`**
- Expo configuration
- iOS/Android settings
- Privy plugin configuration

### Key Files

**`lib/api.ts`** ⚠️ **MUST CONFIGURE**
- Backend API client
- Configure your IP address here
- Axios instance with auth headers

**`app/(tabs)/index.tsx`**
- Main dashboard
- Shows wallet, balance, actions

**`hooks/useWallet.ts`**
- Wallet state management
- Create, deploy, fetch wallet

**`hooks/useAuth.ts`**
- Privy authentication
- Token management
- Login/logout

---

## 🐛 Troubleshooting

### App Won't Connect to Backend

**Symptoms:**
- "Network request failed"
- "Unable to connect"
- Timeout errors

**Solutions:**

✅ **Check 1: IP Address**
```typescript
// In lib/api.ts, did you change this?
const LAN_BASE_URL = "http://YOUR_IP:4000";
```

✅ **Check 2: Same WiFi**
- Phone and computer on same network?
- Not on guest network?
- Not using VPN?

✅ **Check 3: Backend Running**
```bash
# On your computer
curl http://YOUR_IP:4000/health

# Should return:
# {"status":"ok","timestamp":"..."}
```

✅ **Check 4: Firewall**
- Is firewall blocking port 4000?
- Try temporarily disabling firewall
- Or allow port 4000 in firewall settings

✅ **Check 5: Test Connection**
```bash
# On your computer, find your IP
ifconfig | grep "inet "

# Test from another device on same network
curl http://YOUR_IP:4000/health
```

---

### QR Code Won't Scan

**Symptoms:**
- Camera doesn't detect QR
- Nothing happens when scanning
- "Unable to load exp://" error

**Solutions:**

✅ **iPhone:**
- Use native Camera app (not Expo Go)
- Point at QR code
- Tap notification that appears
- Opens in Expo Go automatically

✅ **Android:**
- Open Expo Go app first
- Tap "Scan QR Code" button
- Point at QR code in terminal
- App loads automatically

✅ **Manual Entry:**
```
1. Look at terminal output
2. Find line like: exp://192.168.1.100:8081
3. Open Expo Go
4. Tap "Enter URL manually"
5. Paste the exp:// URL
```

✅ **Restart Expo:**
```bash
# Clear cache and restart
npx expo start --clear
```

✅ **Try Tunnel:**
```bash
# If local network has issues
npx expo start --tunnel
```

---

### App Shows Blank White Screen

**Symptoms:**
- App opens but nothing shows
- White or black screen
- No UI elements

**Solutions:**

✅ **Check Metro Bundler:**
```
Look at terminal - is Metro running?
Should see: "Metro waiting on..."
```

✅ **Reload App:**
```
1. Shake phone
2. Tap "Reload"
```

✅ **Or reload from terminal:**
```bash
# Press 'r' in terminal
r
```

✅ **Clear Cache:**
```bash
npx expo start --clear
```

✅ **Check for Errors:**
```
Look at terminal for red error messages
Common issues:
- Missing dependencies
- Syntax errors
- Import errors
```

✅ **Reinstall Dependencies:**
```bash
rm -rf node_modules
npm install
npx expo start
```

---

### Login Not Working

**Symptoms:**
- Login button does nothing
- Privy screen doesn't show
- "Unable to authenticate"

**Solutions:**

✅ **Check Privy Config:**
```typescript
// Verify PRIVY_APP_ID is set
// Should match backend .env
```

✅ **Check Internet:**
- Phone has internet?
- Can access other websites?

✅ **Try Different Method:**
- If email doesn't work, try social login
- If social doesn't work, try email

✅ **Check Privy Dashboard:**
- Go to https://dashboard.privy.io
- Check app status
- Verify domain allowlist

---

### "Account Not Deployed" Error

**Symptoms:**
- Can't withdraw
- Error says "account not deployed"

**Solution:**
```
1. Deploy account first!
2. Tap "Deploy Account" button
3. Wait 1-2 minutes
4. Check Voyager for confirmation
5. Then try withdrawal
```

---

### Balance Not Updating

**Symptoms:**
- Claimed tokens but balance is 0
- Old balance shown

**Solutions:**

✅ **Wait for Confirmation:**
- Sepolia can be slow (30-60 seconds)
- Wait before checking balance

✅ **Manual Refresh:**
```
Tap "Refresh Balance" button
```

✅ **Check Backend Logs:**
```
Look for:
✅ EARN transfer successful: 0x...
```

✅ **Verify on Voyager:**
```
1. Copy your address
2. Go to https://sepolia.voyager.online/
3. Paste address
4. Check token balance
```

---

### Metro Bundler Issues

**Error:** "Metro bundler failed to start"

**Solutions:**

✅ **Kill Existing Process:**
```bash
# Find process using port 8081
lsof -i :8081

# Kill it
kill -9 <PID>

# Restart Expo
npx expo start
```

✅ **Clear Cache:**
```bash
npx expo start --clear
```

✅ **Reset Everything:**
```bash
# Clear watchman
watchman watch-del-all

# Clear Metro cache
rm -rf node_modules/.cache

# Clear Expo cache
expo start --clear
```

---

### iOS Simulator Issues

**Error:** "Unable to boot simulator"

**Solutions:**

✅ **Open Xcode:**
```
1. Open Xcode
2. Xcode → Preferences → Locations
3. Ensure Command Line Tools is set
```

✅ **Reset Simulator:**
```
1. Open Simulator app
2. Device → Erase All Content and Settings
```

✅ **From Terminal:**
```bash
# Press 'i' to open iOS simulator
i
```

---

### Android Emulator Issues

**Error:** "No Android emulators found"

**Solutions:**

✅ **Create Emulator:**
```
1. Open Android Studio
2. Tools → AVD Manager
3. Create Virtual Device
4. Select device and system image
5. Finish setup
```

✅ **Start Emulator First:**
```
1. Open Android Studio
2. Start emulator
3. Then press 'a' in Expo terminal
```

---

### JWT/Authentication Errors

**Symptoms:**
- "Unauthorized" errors
- "Invalid token"
- Logged out unexpectedly

**Solutions:**

✅ **Token Expired:**
```
JWT tokens expire after ~1 hour
Solution: Logout and login again
```

✅ **Logout and Login:**
```
1. Tap profile/settings
2. Logout
3. Login again
4. Get fresh token
```

✅ **Check Backend:**
```
Ensure backend PRIVY_APP_SECRET matches
Check backend logs for auth errors
```

---

### Withdrawal Debug Mode

**Symptoms:**
- Withdrawal fails
- "Invalid auth token"
- Backend shows debug logs

**Status:** ⚠️ Known issue

**What to Do:**
```
1. This is expected - feature in debug mode
2. Check backend terminal for detailed logs
3. All other features work correctly
4. Fix coming in next update
```

**Test Other Features:**
- ✅ Claims work
- ✅ Deployment works
- ✅ Balance checking works

---

## Development Tips

### Hot Reload

Code changes reload automatically:
- Save file
- App reloads in 1-2 seconds
- No need to restart Expo

### Debug Menu

Access debug options:
- **iOS:** Cmd+D in simulator, or shake device
- **Android:** Cmd+M in emulator, or shake device

Options:
- Reload
- Debug Remote JS
- Show Performance Monitor
- Show Inspector
- Enable Hot Reloading

### Logs

View console logs:
```bash
# In terminal where Expo is running
# Logs show automatically

# Or open separate terminal:
npx expo start

# Then in another terminal:
npx react-native log-ios     # iOS
npx react-native log-android # Android
```

### Clear Everything

Nuclear option if things are broken:
```bash
# Stop Expo
Ctrl+C

# Clear all caches
rm -rf node_modules
rm -rf .expo
npm cache clean --force
watchman watch-del-all

# Reinstall
npm install

# Start fresh
npx expo start --clear
```

---

## 🧪 Testing Checklist

Use this to verify your setup:

**Initial Setup:**
- [ ] Dependencies installed (`node_modules` exists)
- [ ] IP configured in `lib/api.ts`
- [ ] Backend running on computer
- [ ] Phone on same WiFi as computer
- [ ] Expo Go installed on phone

**App Launch:**
- [ ] `npx expo start` runs without errors
- [ ] QR code appears in terminal
- [ ] Can scan QR code with phone
- [ ] App builds and opens (1-2 min first time)
- [ ] App loads without blank screen

**Authentication:**
- [ ] Can see login screen
- [ ] Can login with email
- [ ] Receive and enter code
- [ ] Successfully authenticated
- [ ] See wallet dashboard

**Wallet Features:**
- [ ] Wallet address shown
- [ ] Can copy address
- [ ] Can claim tokens
- [ ] Backend logs show tx hash
- [ ] Balance updates after claim
- [ ] Can deploy account
- [ ] Deployment succeeds on Voyager
- [ ] Balance refreshes correctly

**Known Issues:**
- [ ] Withdrawal shows debug logs (expected)

---

## 📧 Support

For mobile app issues:

1. Check this troubleshooting guide
2. Verify backend is running and accessible
3. Check Expo terminal for errors
4. Test with curl commands
5. Check backend README for API details
6. Open GitHub issue with:
   - Phone model and OS version
   - Expo CLI version
   - Error messages
   - Screenshots if helpful

