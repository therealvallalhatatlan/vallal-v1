"use client";

import { useEffect, useMemo, useState } from "react";

const TIME_ZONE = "Europe/Budapest";

function getNow() {
  return new Date();
}

export default function KillSwitchClock() {
  const [now, setNow] = useState<Date>(getNow());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(getNow());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("hu-HU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: TIME_ZONE,
      }),
    []
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("hu-HU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        timeZone: TIME_ZONE,
      }),
    []
  );

  return (
    <div className="space-y-1">
      <p className="text-4xl md:text-4xl font-semibold tracking-tight text-lime-400">
        {timeFormatter.format(now)}
      </p>
      <p className="text-sm md:text-base text-green-300/80 capitalize">{dateFormatter.format(now)} (magyar idő)</p>
    </div>
  );
}
