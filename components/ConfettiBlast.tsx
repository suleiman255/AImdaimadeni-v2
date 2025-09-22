"use client";

import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

export default function ConfettiBlast({ trigger }: { trigger: boolean }) {
  const { width, height } = useWindowSize();
  const [recycle, setRecycle] = useState(true);

  useEffect(() => {
    if (trigger) {
      const audio = new Audio("/sounds/success.wav");
      audio.play().catch(() => {});

      setRecycle(true);
      const timer = setTimeout(() => setRecycle(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (!trigger) return null;

  return <Confetti width={width} height={height} recycle={recycle} />;
}
