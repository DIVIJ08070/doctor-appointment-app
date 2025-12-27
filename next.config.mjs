import withPWA from "next-pwa";

const nextConfig = {
  reactStrictMode: true,
  turbopack: {}
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true
})(nextConfig);