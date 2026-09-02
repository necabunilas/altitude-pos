import Footer from "@/app/Footer";

// Wraps every /admin page so the footer (socials + developer credit) shows
// on the staff app too, below the page content.
export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <div className="flex-1">{children}</div>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}