import { requireStaff } from "@/lib/auth";
import { listFeedback } from "@/lib/data";
import AdminNav from "../AdminNav";
import Stars from "@/app/Stars";

export const dynamic = "force-dynamic";

function fmtWhen(ts) {
  return new Date(ts).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function FeedbackPage() {
  await requireStaff();
  const feedback = await listFeedback();
  const avg =
    feedback.length > 0
      ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
      : null;

  return (
    <div className="bg-cream">
      <AdminNav />
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <h1 className="font-display text-3xl text-espresso">Feedback</h1>

        {avg != null && (
          <div className="bg-white border border-ink p-4 flex items-center gap-4">
            <div className="text-4xl font-display text-espresso leading-none">
              {avg.toFixed(1)}
            </div>
            <div>
              <Stars value={Math.round(avg)} size="w-5 h-5" />
              <div className="text-xs text-mocha mt-1">
                {feedback.length} review{feedback.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        )}

        {feedback.length === 0 && (
          <p className="text-mocha/70 py-12 text-center">No feedback yet.</p>
        )}

        {feedback.map((f) => {
          const name = f.name?.trim() || "Anonymous";
          const initial = name === "Anonymous" ? "?" : name[0].toUpperCase();
          return (
            <div
              key={f.id}
              className="bg-white border border-ink p-4 flex gap-3"
            >
              <div className="w-10 h-10 shrink-0 rounded-full bg-brass/15 text-brass-dark grid place-items-center font-semibold">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-espresso leading-tight">{name}</div>
                    <Stars value={f.rating} className="mt-0.5" />
                  </div>
                  <div className="text-xs text-mocha/70 text-right whitespace-nowrap">
                    {f.table?.label || "Walk-in"}
                    <br />
                    {fmtWhen(f.createdAt)}
                  </div>
                </div>
                {f.comment && <p className="text-sm text-ink mt-2">{f.comment}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}