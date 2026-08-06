import "./globals.css";

export const metadata = {
  title: "MargeX",
  description: "Gestion de marges et fournisseurs pour dropshippers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
