import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicSurvey } from "@/components/community-surveys/public-survey";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ token: string }> };

const getSurvey = cache(async (token: string) => {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  return prisma.communitySurvey.findFirst({
    where: { publicToken: token, allowPublicResponses: true, status: { in: ["published", "closed"] } },
    select: { title: true, description: true, surveyType: true },
  });
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const survey = await getSurvey(token);
  if (!survey) return { title: "Public survey | ChoresList" };
  return { title: `${survey.title} | ChoresList`, description: survey.description || `Take this public ${survey.surveyType} on ChoresList.`, robots: { index: false, follow: true } };
}

export default async function PublicSurveyPage({ params }: PageProps) {
  const { token } = await params;
  if (!await getSurvey(token)) notFound();
  return <PublicSurvey token={token} />;
}
