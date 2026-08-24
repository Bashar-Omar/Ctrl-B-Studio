import { Studio } from "@/components/studio";

export const dynamic = "force-dynamic";

export default function Page() {
  const egpRate = Number(process.env.USD_TO_EGP_RATE || "50");
  return <Studio egpRate={Number.isFinite(egpRate) ? egpRate : 50} />;
}
