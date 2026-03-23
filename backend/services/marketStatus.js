const MARKET_TIMEZONE = "Asia/Kolkata";
const MARKET_OPEN_MINUTES = 9 * 60 + 15;
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;
const IST_WEEKDAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIMEZONE,
  weekday: "short"
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: MARKET_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function getMarketStatus(now = new Date()) {
  const checkedAt = now.toISOString();
  const forcedStatus = String(process.env.FORCE_MARKET_STATUS || "")
    .trim()
    .toUpperCase();

  if (forcedStatus === "OPEN" || forcedStatus === "CLOSED") {
    return {
      isOpen: forcedStatus === "OPEN",
      label: forcedStatus,
      timezone: MARKET_TIMEZONE,
      checkedAt
    };
  }

  const weekday = weekdayFormatter.format(now);
  const [hour, minute] = timeFormatter
    .format(now)
    .split(":")
    .map(value => Number(value));
  const minutes = hour * 60 + minute;
  const isOpen = IST_WEEKDAYS.has(weekday) && minutes >= MARKET_OPEN_MINUTES && minutes <= MARKET_CLOSE_MINUTES;

  return {
    isOpen,
    label: isOpen ? "OPEN" : "CLOSED",
    timezone: MARKET_TIMEZONE,
    checkedAt
  };
}

module.exports = {
  MARKET_TIMEZONE,
  getMarketStatus
};
