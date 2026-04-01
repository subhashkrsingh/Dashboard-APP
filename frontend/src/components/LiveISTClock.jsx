import { memo, useEffect, useState } from "react";

import { Badge } from "./ui/Badge";

const DEFAULT_LABEL = "IST --:--:--";

function formatISTTime(date) {
  try {
    return `IST ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata"
    })}`;
  } catch {
    return DEFAULT_LABEL;
  }
}

function LiveISTClock({ fallbackTime }) {
  const [clockLabel, setClockLabel] = useState(() =>
    fallbackTime ? `IST ${fallbackTime}` : DEFAULT_LABEL
  );

  useEffect(() => {
    const updateClock = () => {
      setClockLabel(formatISTTime(new Date()));
    };

    updateClock();

    const intervalId = window.setInterval(updateClock, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <Badge tone="neutral">
      <span className="inline-flex min-w-[104px] justify-center tabular-nums">{clockLabel}</span>
    </Badge>
  );
}

export default memo(LiveISTClock);
