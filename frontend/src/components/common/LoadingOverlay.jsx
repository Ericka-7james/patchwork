import { useEffect, useState } from "react";
import "./styles/LoadingOverlay.css";

const DEFAULT_DELAY = 300;

function DelayedLoadingOverlay({ message, delay, fullScreen }) {
  const [shouldShow, setShouldShow] = useState(delay <= 0);

  useEffect(() => {
    if (delay <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldShow(true);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delay]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={`loading-overlay ${
        fullScreen ? "loading-overlay-fullscreen" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-overlay-content">
        <div className="loading-overlay-spinner" aria-hidden="true">
          <img
            src="/PatchWorkLogo.png"
            alt=""
            className="loading-overlay-logo"
          />
        </div>

        <p>{message}</p>
      </div>
    </div>
  );
}

function LoadingOverlay({
  message = "Loading...",
  isLoading = true,
  delay = DEFAULT_DELAY,
  fullScreen = false,
}) {
  if (!isLoading) {
    return null;
  }

  return (
    <DelayedLoadingOverlay
      key={delay}
      message={message}
      delay={delay}
      fullScreen={fullScreen}
    />
  );
}

export default LoadingOverlay;
