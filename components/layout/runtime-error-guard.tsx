"use client";

import { useEffect } from "react";

function isRawEvent(value: unknown): value is Event {
  return typeof Event !== "undefined" && value instanceof Event;
}

export function RuntimeErrorGuard() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Some browser extensions emit top-level errors as raw Event objects.
      if (isRawEvent(event.error)) {
        event.preventDefault();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Next dev overlay renders these as "[object Event]".
      if (isRawEvent(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

