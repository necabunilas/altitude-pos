import { listSales } from "@/lib/data";
import { isStaffAuthed } from "@/lib/auth";

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Download all sales in the range as CSV (not paginated).
export async function GET(request) {
  if (!(await isStaffAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;

  const { sales, summary } = await listSales({ from, to, limit: 100000, offset: 0 });

  const header = ["Order #", "Table", "Name", "Closed", "Items", "Total", "Payment", "Ref"];
  const lines = [header.join(",")];
  for (const o of sales) {
    lines.push(
      [
        o.id,
        o.table?.label || "",
        o.customerName || "",
        o.closedAt ? new Date(o.closedAt).toLocaleString("en-PH") : "",
        o.items.reduce((s, i) => s + i.qty, 0),
        (o.totalCents / 100).toFixed(2),
        o.paymentMethod || "",
        o.paymentRef || "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  // Category breakdown (food vs drink) appended for accounting.
  const bd = summary.categoryBreakdown || [];
  if (bd.length) {
    lines.push("");
    lines.push(["Category", "Type", "Units", "Revenue"].join(","));
    for (const c of bd) {
      lines.push(
        [c.category, c.kind === "drink" ? "Drink" : "Food", c.qty, (c.revenueCents / 100).toFixed(2)]
          .map(csvCell)
          .join(",")
      );
    }
    lines.push(["Drinks total", "", "", ((summary.drinkCents || 0) / 100).toFixed(2)].map(csvCell).join(","));
    lines.push(["Food total", "", "", ((summary.foodCents || 0) / 100).toFixed(2)].map(csvCell).join(","));
  }

  const csv = lines.join("\n");
  const name = `sales-${fromStr?.slice(0, 10) || "all"}_to_${toStr?.slice(0, 10) || "all"}.csv`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
    },
  });
}