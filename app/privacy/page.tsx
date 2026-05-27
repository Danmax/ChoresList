import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | ChoresList",
  description: "Privacy policy for ChoresList.",
};

const sections = [
  {
    title: "Information We Collect",
    body: [
      "ChoresList collects information you provide when creating and using a household account, including parent email addresses, family member names, ages, avatars, chores, task assignments, wish list items, events, rewards, and app settings.",
      "If you choose to upload task completion photos or event images, those files are stored so the app can show them back to your household.",
      "If you connect Google Calendar, ChoresList stores the connection details needed to create, update, and remove synced calendar events.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use household information to provide the app features, including chore tracking, points, allowance calculations, reports, kid device pairing, wish lists, family calendar events, and parent controls.",
      "We use contact information for account access, confirmations, password resets, and optional household notifications.",
      "We use uploaded images only to support the feature where they were uploaded, such as task proof photos or event flyers.",
    ],
  },
  {
    title: "Children's Privacy",
    body: [
      "ChoresList is intended to be managed by parents or guardians for their household. Parents control family member profiles, kid device pairing, uploaded photos, and household privacy settings.",
      "Parents should only enter information they are comfortable using for household chore and calendar management.",
    ],
  },
  {
    title: "Location and Weather",
    body: [
      "The weather widget may ask for browser location access. Location is used by the browser to request a local forecast and is not required to use ChoresList.",
      "Weather forecast data may be cached in the browser for a short time to avoid repeated location prompts and forecast requests.",
    ],
  },
  {
    title: "Sharing and Third Parties",
    body: [
      "ChoresList does not sell household personal information.",
      "Some features rely on service providers, such as hosting, database storage, email delivery, image processing, Google Calendar sync, AI-assisted chore instructions, and weather forecast data. These providers process information only as needed to support app functionality.",
    ],
  },
  {
    title: "Data Choices",
    body: [
      "Parents can update household settings, disable optional privacy-related features, revoke paired devices, remove uploaded photos where supported, and delete household data from within the app.",
      "If you need help accessing, correcting, or deleting information, contact the app operator for your ChoresList deployment.",
    ],
  },
  {
    title: "Security",
    body: [
      "ChoresList uses account authentication, parent controls, paired-device sessions, and server-side authorization checks to protect household data.",
      "No system can guarantee perfect security, so parents should use strong account credentials and only pair trusted devices.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update this policy as ChoresList changes. The effective date will be updated when material changes are made.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-black text-violet-600 hover:text-violet-700">
          Back to ChoresList
        </Link>

        <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black uppercase text-violet-500">Effective May 27, 2026</p>
          <h1 className="mt-2 text-4xl font-black text-slate-800">Privacy Policy</h1>
          <p className="mt-3 text-base font-semibold leading-7 text-slate-500">
            This policy explains what ChoresList collects, how it is used, and the choices parents have for their household data.
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
