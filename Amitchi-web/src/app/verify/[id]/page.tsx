import { Metadata } from "next";
import { getAcademicVerificationData } from "@/domains/academics/actions/verification.actions";
import { VerificationClient } from "./verification-client";

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Vérification d'authenticité - ${id} | EDUT Academic Portal`,
    description: "Portail officiel de vérification d'authenticité des diplômes et attestations LMD conforme aux normes CAMES et UNESCO",
  };
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { id } = await params;
  const data = await getAcademicVerificationData(id);

  return <VerificationClient data={data} rawId={id} />;
}
