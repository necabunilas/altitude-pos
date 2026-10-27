// Feature flags. Off unless the env var is explicitly "1".
// TERMINAL_ENABLED gates the semi-integrated payment-terminal upgrade so it
// stays hidden on the client's deployment until it's ready to turn on.
export const TERMINAL_ENABLED = process.env.NEXT_PUBLIC_TERMINAL_ENABLED === "1";
// CARD_ENABLED offers card as a payment method (guest bill, counter, in-app
// card checkout). Off for now: the café takes cash and QR only.
export const CARD_ENABLED = process.env.NEXT_PUBLIC_CARD_ENABLED === "1";