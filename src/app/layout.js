import '@/app/globals.css';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'Leah Operations Hub'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
