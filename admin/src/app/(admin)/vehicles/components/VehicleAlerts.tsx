"use client";

type VehicleAlertsProps = {
  error: string;
  message: string;
  onDismissError: () => void;
  onDismissMessage: () => void;
};

export default function VehicleAlerts({
  error,
  message,
  onDismissError,
  onDismissMessage,
}: VehicleAlertsProps) {
  return (
    <>
      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss error"
            className="font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Success Message */}
      {message && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          <span>✓ {message}</span>

          <button
            type="button"
            onClick={onDismissMessage}
            aria-label="Dismiss message"
            className="font-bold"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}