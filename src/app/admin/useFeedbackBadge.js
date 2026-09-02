"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "feedback_last_seen_id";

// Quiet unread counter for feedback: polls the inbox, compares the newest id to
// the last id the staff has seen (stored locally). No sound, no flashing —
// deliberately less urgent than the call bell. Clears when they open the tab.
export function useFeedbackBadge({ onFeedbackPage, intervalMs = 10000 } = {}) {
  const [unread, setUnread] = useState(0);

  // When viewing the Feedback page, mark everything as seen.
  useEffect(() => {
    if (!onFeedbackPage) return;
    let alive = true;
    fetch("/api/feedback")
      .then((r) => (r.ok ? r.json() : { feedback: [] }))
      .then((d) => {
        if (!alive) return;
        const maxId = (d.feedback || []).reduce((m, f) => Math.max(m, f.id), 0);
        localStorage.setItem(SEEN_KEY, String(maxId));
        setUnread(0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [onFeedbackPage]);

  useEffect(() => {
    if (onFeedbackPage) return; // page effect owns the count while viewing
    let alive = true;
    async function poll() {
      const d = await fetch("/api/feedback")
        .then((r) => (r.ok ? r.json() : { feedback: [] }))
        .catch(() => ({ feedback: [] }));
      if (!alive) return;
      const seen = Number(localStorage.getItem(SEEN_KEY) || 0);
      setUnread((d.feedback || []).filter((f) => f.id > seen).length);
    }
    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [onFeedbackPage, intervalMs]);

  return unread;
}