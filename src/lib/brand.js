// Restaurant identity shown on receipts and headers. Override via env.
export const RESTAURANT_NAME =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME || "altitude.cc";
export const RESTAURANT_TAGLINE =
  process.env.NEXT_PUBLIC_RESTAURANT_TAGLINE || "Malaybalay City";
// Short line under the name on the home splash screen.
export const RESTAURANT_DESCRIPTION =
  process.env.NEXT_PUBLIC_RESTAURANT_DESCRIPTION || "Coffee, brewed up high.";

export const SOCIAL = {
  facebook: "https://www.facebook.com/altitudecoffeeph",
  instagram: "https://www.instagram.com/altitude.ph/",
};

// Developer credit shown in the footer (per the development agreement).
export const DEVELOPER_NAME = "nicolausmagnus";

// Registered business details shown on the printed receipt (the official BIR
// Sales Invoice is issued separately by the accredited POS).
export const RECEIPT_BUSINESS = {
  name: process.env.NEXT_PUBLIC_BIZ_NAME || "ALTITUDE.CC",
  proprietor: process.env.NEXT_PUBLIC_BIZ_PROPRIETOR || "",
  vatTin: process.env.NEXT_PUBLIC_BIZ_TIN || "000-000-000-000",
  address: process.env.NEXT_PUBLIC_BIZ_ADDRESS || "Malaybalay City, Bukidnon",
  tel: process.env.NEXT_PUBLIC_BIZ_TEL || "",
};

// VAT rate for the (informational) breakdown; prices are VAT-inclusive.
export const VAT_RATE = 0.12;
