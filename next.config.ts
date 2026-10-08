import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ["pdfkit", "@napi-rs/canvas"],
  // Fontes OFL embutidas no PDF do livro (lidas via fs em runtime).
  outputFileTracingIncludes: {
    "/books/**/*": ["./modules/books/pdf/fonts/**/*"],
    "/api/books/**/*": ["./modules/books/pdf/fonts/**/*"],
  },
  // Leads e Prospecção viraram uma tela só: o Funil.
  async redirects() {
    return [
      { source: "/dashboard/admin/leads", destination: "/dashboard/admin/funil", permanent: true },
      { source: "/dashboard/admin/prospects", destination: "/dashboard/admin/funil", permanent: true },
      // Ganhos virou o Financeiro, sem o hub de um card só (o ?mes= segue junto).
      { source: "/dashboard/earnings", destination: "/dashboard/financial", permanent: false },
      // Documentos virou uma lista só, com a emissão no painel; relatório médico e orientação saíram.
      {
        source: "/dashboard/:section(prescriptions|medical-certificates|exam-requests|referrals|medical-reports|guidance)/:path*",
        destination: "/dashboard/services",
        permanent: false,
      },
      // Modelos virou uma tela só (receitas, exames e relatório).
      { source: "/dashboard/prescription-templates", destination: "/dashboard/templates", permanent: false },
      { source: "/dashboard/report-templates", destination: "/dashboard/templates?aba=relatorio", permanent: false },
      { source: "/dashboard/report-templates/new", destination: "/dashboard/templates/reports/new", permanent: false },
      { source: "/dashboard/report-templates/gerar-com-ia", destination: "/dashboard/templates/reports/generate", permanent: false },
      { source: "/dashboard/report-templates/:id", destination: "/dashboard/templates/reports/:id", permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
