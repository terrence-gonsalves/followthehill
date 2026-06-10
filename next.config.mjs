/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.ourcommons.ca",
        pathname: "/Content/Parliamentarians/Images/**",
      },
    ],
  },
}

export default nextConfig
