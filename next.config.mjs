/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the dev server's internal assets (_next/*) and HMR to be requested
  // from the LAN IP, so phones on the same Wi-Fi can load the app in dev.
  // Next 16 blocks cross-origin dev requests by default (returns 403).
  // Wildcards cover DHCP IP changes across common home subnets.
  allowedDevOrigins: ["192.168.1.*", "192.168.5.*", "192.168.0.*", "10.0.0.*"],
};

export default nextConfig;
