import { useEffect, useState } from "react";

export function useResendCooldown() {
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (resendAvailableAt <= now) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [now, resendAvailableAt]);

  const secondsRemaining = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));

  return {
    secondsRemaining,
    startCooldown(seconds = 30) {
      const nextAvailableAt = Date.now() + seconds * 1000;
      setNow(Date.now());
      setResendAvailableAt(nextAvailableAt);
    },
    resetCooldown() {
      setResendAvailableAt(0);
      setNow(Date.now());
    },
  };
}
