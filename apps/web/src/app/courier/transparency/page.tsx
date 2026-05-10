export default function TransparencyPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">How your pay is calculated</h1>
      <p className="mt-2 text-sm text-gray-600">
        We believe couriers deserve clear, honest pay calculations. Every offer shows you exactly why
        it was offered to you and how your earnings are made up.
      </p>
      <div className="card mt-4 space-y-3 text-sm">
        <div>
          <div className="font-semibold">Base fee</div>
          <p className="text-gray-600">A flat amount per accepted delivery.</p>
        </div>
        <div>
          <div className="font-semibold">Distance pay</div>
          <p className="text-gray-600">Distance from pickup to drop-off, with a per-km rate.</p>
        </div>
        <div>
          <div className="font-semibold">Waiting pay</div>
          <p className="text-gray-600">If a restaurant takes longer than expected to hand over the order.</p>
        </div>
        <div>
          <div className="font-semibold">Bonuses</div>
          <p className="text-gray-600">Surge & quest bonuses during peak hours, weather, or hotspots.</p>
        </div>
        <div>
          <div className="font-semibold">Tips</div>
          <p className="text-gray-600">Customer tips go 100% to you with no platform cut.</p>
        </div>
        <div>
          <div className="font-semibold">Fairness rotation</div>
          <p className="text-gray-600">
            We boost couriers who haven't received jobs recently so high earners do not crowd the queue.
          </p>
        </div>
      </div>
      <div className="card mt-4 text-sm">
        <div className="font-semibold">Need to appeal a decision?</div>
        <p className="mt-1 text-gray-600">
          Open a support ticket and our team will respond within 24 hours. We will explain any
          deactivation, low-acceptance flag, or hold on payouts.
        </p>
      </div>
    </div>
  );
}
