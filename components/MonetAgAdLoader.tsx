'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'hms_visit_data';
const FIRST_VISIT_DELAY_MS = 90_000; // 90 seconds on first visit
const RETURN_VISIT_DELAY_MS = 15_000; // 15 seconds on return visits

interface VisitData {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

function getVisitData(): VisitData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as VisitData;
  } catch {
    return null;
  }
}

function updateVisitData(): VisitData {
  const now = Date.now();
  const existing = getVisitData();

  const updated: VisitData = existing
    ? { count: existing.count + 1, firstSeen: existing.firstSeen, lastSeen: now }
    : { count: 1, firstSeen: now, lastSeen: now };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage full or unavailable — continue without persistence
  }

  return updated;
}

function loadMonetag() {
  if (document.querySelector('script[data-zone="211924"]')) return;

  const script = document.createElement('script');
  script.src = 'https://quge5.com/88/tag.min.js';
  script.dataset.zone = '211924';
  script.async = true;
  script.dataset.cfasync = 'false';
  document.head.appendChild(script);
}

export default function MonetAgAdLoader() {
  useEffect(() => {
    const visit = updateVisitData();
    const isFirstVisit = visit.count <= 1;
    const delay = isFirstVisit ? FIRST_VISIT_DELAY_MS : RETURN_VISIT_DELAY_MS;

    const timer = setTimeout(loadMonetag, delay);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
