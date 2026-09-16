import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ["pdfkit"],
  // Fontes OFL embutidas no PDF do livro (lidas via fs em runtime).
  outputFileTracingIncludes: {
    "/books/**/*": ["./modules/books/pdf/fonts/**/*"],
    "/api/books/**/*": ["./modules/books/pdf/fonts/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
