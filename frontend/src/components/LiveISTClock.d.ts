import type { JSX } from "react";

export interface LiveISTClockProps {
  fallbackTime?: string;
}

declare function LiveISTClock(props: LiveISTClockProps): JSX.Element;

export default LiveISTClock;
