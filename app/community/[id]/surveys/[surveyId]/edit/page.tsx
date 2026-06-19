"use client";

import { useParams } from "next/navigation";
import { SurveyBuilder } from "@/components/community-surveys/survey-builder";

export default function EditSurveyPage() {
  const { id, surveyId } = useParams<{ id: string; surveyId: string }>();
  return <SurveyBuilder groupId={id} surveyId={surveyId} />;
}
