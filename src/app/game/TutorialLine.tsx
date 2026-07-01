"use client";

import { useEffect, useState } from "react";
import { dismissTutorial, isTutorialDismissed } from "@/lib/tutorial";

/**
 * One-line guided version of the data model — "I caught a ___ from ___" — shown
 * on check-in. Teaches the capture sentence without anyone realizing it. Default
 * on, dismissible, gone for good once dismissed (spec §3.2).
 */
export default function TutorialLine() {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read client-only dismissal after mount (avoids SSR/hydration mismatch).
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setShow(!isTutorialDismissed());
    setReady(true);
  }, []);

  if (!ready || !show) return null;

  return (
    <div className="tutorial-line">
      <span>
        Log it like a sentence: <strong>&ldquo;I caught a ___ from ___.&rdquo;</strong>
      </span>
      <button
        type="button"
        className="tutorial-dismiss"
        aria-label="Dismiss tutorial"
        onClick={() => {
          dismissTutorial();
          setShow(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
