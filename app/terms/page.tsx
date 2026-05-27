import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | ChoresList",
  description: "Terms of service for ChoresList.",
};

const sections = [
  {
    title: "Use of ChoresList",
    body: [
      "ChoresList is a household chore, allowance, reward, wishlist, and family calendar app. You may use it only for lawful household management purposes.",
      "A parent or guardian is responsible for creating and managing the household account, family member profiles, paired kid devices, uploaded content, and app settings.",
    ],
  },
  {
    title: "Accounts and Security",
    body: [
      "You are responsible for maintaining the confidentiality of parent account credentials, parent PINs, and device pairing codes.",
      "You should revoke access for any paired device that is lost, shared outside the household, or no longer trusted.",
    ],
  },
  {
    title: "Household Content",
    body: [
      "You are responsible for the chores, events, notes, wish list items, uploaded images, and other content entered into ChoresList.",
      "Do not upload or enter content that is unlawful, harmful, abusive, invasive of privacy, or that you do not have the right to use.",
    ],
  },
  {
    title: "Children and Parent Responsibility",
    body: [
      "ChoresList is designed for parent-managed household use. Parents and guardians are responsible for supervising children's use of kid devices and deciding what information is appropriate to enter.",
      "The app's points, allowances, rewards, and tickets are household tools only. They do not create any financial obligation unless the parent or guardian separately chooses to honor them.",
    ],
  },
  {
    title: "Third-Party Services",
    body: [
      "Some features may connect to or request data from third-party services, including Google Calendar, email providers, AI services, image processing libraries, hosting providers, and weather forecast services.",
      "Your use of those connected services may also be governed by their own terms and policies.",
    ],
  },
  {
    title: "Availability and Changes",
    body: [
      "ChoresList may change, add, or remove features over time. The app may also be interrupted for maintenance, updates, outages, or provider issues.",
      "We may update these terms as the app changes. Continued use after changes means you accept the updated terms.",
    ],
  },
  {
    title: "No Warranties",
    body: [
      "ChoresList is provided as is and as available. We do not guarantee that the app will be uninterrupted, error-free, or meet every household need.",
      "You are responsible for reviewing important calendar events, allowance decisions, and task records before relying on them.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, ChoresList and its operators are not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the app.",
      "Nothing in these terms limits rights that cannot be limited under applicable law.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For questions about these terms, contact the app operator for your ChoresList deployment.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-black text-violet-600 hover:text-violet-700">
          Back to ChoresList
        </Link>

        <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black uppercase text-violet-500">Effective May 27, 2026</p>
          <h1 className="mt-2 text-4xl font-black text-slate-800">Terms of Service</h1>
          <p className="mt-3 text-base font-semibold leading-7 text-slate-500">
            These terms describe the rules for using ChoresList and the responsibilities of the parent or guardian managing a household.
          </p>
        </header>

        <div className="mt-6 space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-800">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm font-semibold leading-7 text-slate-500">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
