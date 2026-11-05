import { Platform } from 'react-native';

export const APP_NAME = 'Expense Tracker';

// Set EXPO_PUBLIC_API_URL in a .env file (see README). "localhost" does NOT work on a
// real phone or on the Android emulator, so we fall back to the emulator alias.
const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || fallback).replace(/\/$/, '');
