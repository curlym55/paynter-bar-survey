export const metadata = {
  title: 'Paynter Bar — Drink Survey',
  description: 'Help us choose what to stock at the Paynter Bar',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#FFF8F0' }}>
        {children}
      </body>
    </html>
  );
}
