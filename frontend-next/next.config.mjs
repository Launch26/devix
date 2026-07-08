/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
};

if (process.env.NODE_ENV === 'development') {
  nextConfig.rewrites = async () => {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  };
}

export default nextConfig;
