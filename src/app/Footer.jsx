import { RESTAURANT_NAME, SOCIAL, DEVELOPER_NAME } from "@/lib/brand";

// Guest-facing footer: café socials + developer credit.
export default function Footer() {
  return (
    <footer className="mt-8 px-4 py-6 border-t border-sand text-center space-y-3">
      <div className="font-black uppercase tracking-tight text-2xl text-espresso leading-none">
        {RESTAURANT_NAME}
      </div>

      <div className="flex items-center justify-center gap-4">
        <a
          href={SOCIAL.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          className="text-mocha hover:text-brass-dark transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
          </svg>
        </a>
        <a
          href={SOCIAL.instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="text-mocha hover:text-brass-dark transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </div>

      <p className="text-xs text-mocha/70">
        Powered by{" "}
        <span className="font-medium text-brass-dark">{DEVELOPER_NAME}</span>
      </p>
    </footer>
  );
}