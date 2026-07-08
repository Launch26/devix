/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
};

if (process.env.NODE_ENV === 'development') {
  nextConfig.rewrites = async () => {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
    ];
  };
}

export default nextConfig;
