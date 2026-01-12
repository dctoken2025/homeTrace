import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You've Been Invited! | HomeTrace",
  description: "Accept your invitation to connect with your realtor and start your home search journey with HomeTrace.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.svg',
  },
};

export default function AcceptInviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
