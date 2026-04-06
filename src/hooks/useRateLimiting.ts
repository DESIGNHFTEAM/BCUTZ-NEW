import { useState, useEffect, useCallback } from 'react';

/**
 * Rate limiting hook to prevent brute force attacks on authentication
 * Uses localStorage to track attempts with exponential backoff
 * Implements account lockout after MAX_ATTEMPTS failed attempts
 */

interface RateLimitState {
  attempts: number;
  lockUntil: number | null;
  lastAttempt: number;
}

const RATE_LIMIT_KEY = 'auth_rate_limit';
const MAX_ATTEMPTS = 5;
const INITIAL_LOCKOUT_MS = 30000; // 30 seconds
const MAX_LOCKOUT_MS = 900000; // 15 minutes
const ATTEMPT_WINDOW_MS = 300000; // 5 minutes

export function useRateLimiting() {
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  const getState = useCallback((): RateLimitState => {
    try {
      const stored = localStorage.getItem(RATE_LIMIT_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parsing errors
    }
    return { attempts: 0, lockUntil: null, lastAttempt: 0 };
  }, []);

  const setState = useCallback((state: RateLimitState) => {
    try {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(RATE_LIMIT_KEY);
      setLockoutRemaining(0);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Countdown timer effect for lockout
  useEffect(() => {
    const state = getState();
    const now = Date.now();
    
    if (state.lockUntil && now < state.lockUntil) {
      setLockoutRemaining(Math.ceil((state.lockUntil - now) / 1000));
      
      const interval = setInterval(() => {
        const currentState = getState();
        const currentNow = Date.now();
        
        if (currentState.lockUntil && currentNow < currentState.lockUntil) {
          setLockoutRemaining(Math.ceil((currentState.lockUntil - currentNow) / 1000));
        } else {
          setLockoutRemaining(0);
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [getState]);

  /**
   * Check if the user is currently rate limited
   * @returns Object with isLimited flag and remaining seconds if limited
   */
  const checkRateLimit = useCallback((): { isLimited: boolean; remainingSeconds: number } => {
    const state = getState();
    const now = Date.now();

    // Check if currently locked out
    if (state.lockUntil && now < state.lockUntil) {
      const remainingSeconds = Math.ceil((state.lockUntil - now) / 1000);
      setLockoutRemaining(remainingSeconds);
      return { isLimited: true, remainingSeconds };
    }

    // Clear lockout if expired
    if (state.lockUntil && now >= state.lockUntil) {
      // Keep attempts count for escalating lockouts, but clear the lock
      setState({ ...state, lockUntil: null });
      setLockoutRemaining(0);
    }

    // Reset attempts if outside the window
    if (now - state.lastAttempt > ATTEMPT_WINDOW_MS) {
      clearState();
    }

    return { isLimited: false, remainingSeconds: 0 };
  }, [getState, setState, clearState]);

  /**
   * Record a failed authentication attempt
   * @returns Object indicating if user is now locked out and for how long
   */
  const recordFailedAttempt = useCallback((): { isLocked: boolean; lockoutSeconds: number; attemptsRemaining: number } => {
    const state = getState();
    const now = Date.now();

    // Reset if outside window
    const newAttempts = now - state.lastAttempt > ATTEMPT_WINDOW_MS ? 1 : state.attempts + 1;
    const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - newAttempts);

    if (newAttempts >= MAX_ATTEMPTS) {
      // Calculate exponential backoff
      const backoffMultiplier = Math.pow(2, Math.floor((newAttempts - MAX_ATTEMPTS) / 2));
      const lockoutMs = Math.min(INITIAL_LOCKOUT_MS * backoffMultiplier, MAX_LOCKOUT_MS);
      const lockUntil = now + lockoutMs;
      const lockoutSeconds = Math.ceil(lockoutMs / 1000);

      setState({
        attempts: newAttempts,
        lockUntil,
        lastAttempt: now,
      });

      setLockoutRemaining(lockoutSeconds);

      return { isLocked: true, lockoutSeconds, attemptsRemaining: 0 };
    }

    setState({
      attempts: newAttempts,
      lockUntil: null,
      lastAttempt: now,
    });

    return { isLocked: false, lockoutSeconds: 0, attemptsRemaining };
  }, [getState, setState]);

  /**
   * Record a successful authentication (clears rate limiting state)
   */
  const recordSuccess = useCallback(() => {
    clearState();
  }, [clearState]);

  /**
   * Get remaining attempts before lockout
   */
  const getRemainingAttempts = useCallback((): number => {
    const state = getState();
    const now = Date.now();

    // Reset if outside window
    if (now - state.lastAttempt > ATTEMPT_WINDOW_MS) {
      return MAX_ATTEMPTS;
    }

    return Math.max(0, MAX_ATTEMPTS - state.attempts);
  }, [getState]);

  /**
   * Format remaining time for display
   */
  const formatRemainingTime = useCallback((seconds: number): string => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSecs = seconds % 60;
      if (remainingSecs > 0) {
        return `${minutes}m ${remainingSecs}s`;
      }
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }, []);

  /**
   * Get the current lockout status for display
   */
  const getLockoutStatus = useCallback((): { 
    isLocked: boolean; 
    remainingSeconds: number; 
    formattedTime: string;
    attemptsUsed: number;
    maxAttempts: number;
  } => {
    const state = getState();
    const now = Date.now();
    
    if (state.lockUntil && now < state.lockUntil) {
      const remainingSeconds = Math.ceil((state.lockUntil - now) / 1000);
      return {
        isLocked: true,
        remainingSeconds,
        formattedTime: formatRemainingTime(remainingSeconds),
        attemptsUsed: state.attempts,
        maxAttempts: MAX_ATTEMPTS,
      };
    }
    
    return {
      isLocked: false,
      remainingSeconds: 0,
      formattedTime: '',
      attemptsUsed: state.attempts,
      maxAttempts: MAX_ATTEMPTS,
    };
  }, [getState, formatRemainingTime]);

  return {
    checkRateLimit,
    recordFailedAttempt,
    recordSuccess,
    getRemainingAttempts,
    formatRemainingTime,
    getLockoutStatus,
    lockoutRemaining,
    maxAttempts: MAX_ATTEMPTS,
  };
}
