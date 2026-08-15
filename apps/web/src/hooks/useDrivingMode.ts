"use client";

import { useEffect, useState } from "react";
import { DRIVING_SPEED_MPS } from "@/lib/geo";

export function useDrivingMode(speedMps?: number | null) {
  const [passengerMode, setPassengerMode] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    setMoving(typeof speedMps === "number" && speedMps >= DRIVING_SPEED_MPS);
  }, [speedMps]);

  const denseInputsLocked = moving && !passengerMode;

  return {
    passengerMode,
    setPassengerMode,
    moving,
    denseInputsLocked,
  };
}
