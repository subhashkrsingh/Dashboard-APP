import { useSyncExternalStore } from "react";

export type AlertSeverity = "info" | "warning" | "danger";

export interface MarketAlert {
  id: string;
  message: string;
  severity: AlertSeverity;
  timestamp: number;
  read: boolean;
}

interface AlertStoreSnapshot {
  alerts: MarketAlert[];
}

type AlertListener = () => void;

const MAX_ALERTS = 10;
const ALERT_TTL_MS = 5 * 60 * 1000;

const listeners = new Set<AlertListener>();
let alerts: MarketAlert[] = [];

function emitChange() {
  listeners.forEach(listener => listener());
}

function buildAlertKey(message: string, severity: AlertSeverity) {
  return `${severity}:${message.trim().toLowerCase()}`;
}

function pruneExpiredAlerts(now = Date.now()) {
  const nextAlerts = alerts.filter(alert => now - alert.timestamp < ALERT_TTL_MS);
  const didChange = nextAlerts.length !== alerts.length;
  alerts = nextAlerts;
  return didChange;
}

function getSnapshot(): AlertStoreSnapshot {
  const didPrune = pruneExpiredAlerts();
  if (didPrune) {
    queueMicrotask(emitChange);
  }

  return { alerts };
}

function subscribe(listener: AlertListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function addAlert(alert: Omit<MarketAlert, "id" | "timestamp" | "read"> & Partial<Pick<MarketAlert, "id" | "timestamp" | "read">>) {
  const now = Date.now();
  const message = String(alert.message || "").trim();

  if (!message) {
    return;
  }

  pruneExpiredAlerts(now);

  const severity = alert.severity;
  const id = alert.id || buildAlertKey(message, severity);
  const existingIndex = alerts.findIndex(existing => existing.id === id);

  if (existingIndex >= 0) {
    const existing = alerts[existingIndex];
    alerts = [
      {
        ...existing,
        message,
        severity,
        timestamp: alert.timestamp ?? now,
        read: alert.read ?? false
      },
      ...alerts.filter((_, index) => index !== existingIndex)
    ].slice(0, MAX_ALERTS);
    emitChange();
    return;
  }

  alerts = [
    {
      id,
      message,
      severity,
      timestamp: alert.timestamp ?? now,
      read: alert.read ?? false
    },
    ...alerts
  ].slice(0, MAX_ALERTS);
  emitChange();
}

export function removeAlert(id: string) {
  const nextAlerts = alerts.filter(alert => alert.id !== id);
  if (nextAlerts.length === alerts.length) {
    return;
  }

  alerts = nextAlerts;
  emitChange();
}

export function markAsRead(id: string) {
  let didChange = false;
  alerts = alerts.map(alert => {
    if (alert.id !== id || alert.read) {
      return alert;
    }

    didChange = true;
    return {
      ...alert,
      read: true
    };
  });

  if (didChange) {
    emitChange();
  }
}

export function clearAlerts() {
  if (alerts.length === 0) {
    return;
  }

  alerts = [];
  emitChange();
}

export function pruneAlerts() {
  if (pruneExpiredAlerts()) {
    emitChange();
  }
}

export function useAlertStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export { MAX_ALERTS, ALERT_TTL_MS };
