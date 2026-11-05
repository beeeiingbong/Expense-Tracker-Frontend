# Expense Tracker – React Native (Expo) frontend

Five screens, glassmorphic, light/dark toggle. Uses your existing backend exactly as documented – no API changes.

| # | Screen | File | Endpoints used |
|---|--------|------|----------------|
| 1 | Sign in / Sign up (mobile + emailed OTP) | `src/screens/AuthScreen.js` | `otp/request`, `otp/verify` |
| 2 | Insights (monthly + yearly charts) | `src/screens/AnalyticsScreen.js` | `analytics/budget-performance`, `analytics/annual-summary`, `incomes` |
| 3 | Budgets (+ monthly income at top) | `src/screens/BudgetsScreen.js` | `categories`, `budgets`, `budgets/batch`, `incomes` |
| 4 | Spending (red/green per category) | `src/screens/SpendingScreen.js` | `analytics/budget-performance`, `expenses` |
| 5 | SMS review (human approval) | `src/screens/SmsScreen.js` | `sms/ingest`, `sms/validate`, `sms/pending`, `sms/:id/approve`, `sms/:id/reject` |

## 1. Create the project and install

```bash
npx create-expo-app@latest expense-tracker --template blank
cd expense-tracker

npx expo install expo-blur expo-linear-gradient expo-secure-store expo-device expo-haptics \
  expo-font expo-status-bar expo-dev-client react-native-svg react-native-safe-area-context \
  react-native-screens @react-native-async-storage/async-storage \
  @react-navigation/native @react-navigation/bottom-tabs \
  @expo-google-fonts/sora @expo-google-fonts/manrope @expo/vector-icons

npm install react-native-get-sms-android      # Android SMS reading
```

Copy `App.js`, `src/`, `app.json` and `.env.example` from this folder over the new project
(rename `.env.example` to `.env` and set your backend URL; change the bundle id / package in `app.json`).

## 2. Point the app at your backend

`localhost` does not work on a phone. In `.env`:

```
EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:5000
```

(Android emulator: `http://10.0.2.2:5000`. Your phone and computer must be on the same Wi-Fi.)

## 3. Run

- **Everything except SMS reading:** `npx expo start` and open in Expo Go.
- **With SMS reading (Android):** needs a development build because of the native module:
  ```bash
  npx expo prebuild
  npx expo run:android
  ```
  On iOS, the SMS tab lets you paste a message instead (iOS does not allow reading SMS).

## How sessions work

Access + refresh tokens are kept in the device's secure storage. Every request sends the bearer token; if the API
returns 401, the app calls `POST /api/auth/refresh` once, stores the new tokens and retries the request.
If the refresh token is no longer valid, the app returns to sign-in. Users stay signed in across restarts.

## How SMS import works

1. On open (and via "Scan messages"), the app reads the Android inbox since the last scan.
2. A **filter on the phone** keeps only named-sender (bank/UPI) messages that look like debits. OTPs, personal chats
   and promos never leave the device.
3. Matches are sent to `POST /api/sms/ingest` with `autoApprove: false`, so they sit in the pending queue.
4. In the SMS tab you can change the category / payment mode, then **Approve** (becomes an expense) or **Ignore**.

Note: Google Play restricts `READ_SMS` to specific app types. It's fine for personal / sideloaded builds, but a
Play Store release would need to qualify for the exception (or use a different approach).

## Theme

Toggle with the sun/moon button in the top-right of every screen. The choice is remembered.
Colours and fonts live in `src/theme/index.js` and `src/components/ui.js` (Sora for headings and numbers, Manrope for text).
