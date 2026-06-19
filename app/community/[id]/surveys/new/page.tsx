"use client";

import { useParams } from "next/navigation";
import { SurveyBuilder } from "@/components/community-surveys/survey-builder";

export default function NewSurveyPage() {
  const { id } = useParams<{ id: string }>();
  return <SurveyBuilder groupId={id} />;
}
