import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

// Reading the SMS inbox is only possible on Android, and needs a development build
// (not Expo Go) because it relies on a native module.
let Native = null;
try {
  const m = require('react-native-get-sms-android');
  const cand = m?.default ?? m;
  if (cand && typeof cand.list === 'function') Native = cand;
} catch {}

export const smsReadingSupported = Platform.OS === 'android' && !!Native;

const SEEN_KEY = 'sms_seen_ids';
export const LAST_SCAN_KEY = 'sms_last_scan';

export async function hasSmsPermission() {
  if (Platform.OS !== 'android') return false;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
}

export async function requestSmsPermission() {
  if (Platform.OS !== 'android') return false;
  const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: 'Read bank messages',
    message: 'Allow access to your messages so payment alerts can be found and sent to you for review. Nothing is added without your approval.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

function readInbox(minDate, maxCount = 400) {
  return new Promise((resolve, reject) => {
    Native.list(
      JSON.stringify({ box: 'inbox', minDate, maxCount }),
      (err) => reject(new Error(String(err))),
      (_count, list) => {
        try { resolve(JSON.parse(list)); } catch (e) { reject(e); }
      }
    );
  });
}

// Quick on-device filter so personal messages never leave the phone: we only upload
// messages that come from a named sender (bank/UPI header) and look like a debit.
const DEBIT = /(debited|spent|paid|payment of|purchase|withdrawn|sent rs|sent inr|txn of|transaction of|used for)/i;
const AMOUNT = /(rs\.?|inr|₹)\s?[\d,]+(\.\d+)?/i;
const SKIP = /(otp|one time password|verification code|credited to|will be debited|is due|due on|offer|cashback|loan|pre-approved)/i;

export function looksLikePayment(sms) {
  const body = sms.body || '';
  const sender = sms.address || '';
  if (!/[a-z]/i.test(sender)) return false; // phone numbers = people, not banks
  return DEBIT.test(body) && AMOUNT.test(body) && !SKIP.test(body);
}

// DLT sender headers look like "AX-HDFCBK"; the API example uses the bare "HDFCBK".
const cleanSender = (s) => String(s || '').replace(/^[A-Za-z]{2}-/, '');

async function loadSeen() {
  try { return new Set(JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) || '[]')); } catch { return new Set(); }
}
async function saveSeen(set) {
  const arr = Array.from(set).slice(-3000);
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(arr)).catch(() => {});
}

// Finds new payment messages and queues them on the server for human review.
// autoApprove is always false: nothing becomes an expense until the user approves it.
export async function scanInbox({ onProgress } = {}) {
  const last = Number(await AsyncStorage.getItem(LAST_SCAN_KEY)) || Date.now() - 30 * 24 * 3600 * 1000;
  const startedAt = Date.now();
  const inbox = await readInbox(last - 5 * 60 * 1000);
  const seen = await loadSeen();
  const candidates = inbox.filter((m) => !seen.has(String(m._id)) && looksLikePayment(m));

  let queued = 0, skipped = 0;
  for (let i = 0; i < candidates.length; i++) {
    const m = candidates[i];
    onProgress && onProgress({ done: i, total: candidates.length });
    try {
      await api.sms.ingest({
        sender: cleanSender(m.address),
        rawBody: m.body,
        receivedAt: new Date(Number(m.date) || Date.now()).toISOString(),
        autoApprove: false,
      });
      queued++;
      seen.add(String(m._id));
    } catch (e) {
      if (e.status && e.status >= 400 && e.status < 500 && e.status !== 401) {
        skipped++; // not parseable / duplicate: don't retry it every scan
        seen.add(String(m._id));
      } else {
        await saveSeen(seen);
        throw e; // network or auth trouble: stop and let the caller report it
      }
    }
  }
  await saveSeen(seen);
  await AsyncStorage.setItem(LAST_SCAN_KEY, String(startedAt));
  return { checked: inbox.length, found: candidates.length, queued, skipped };
}
