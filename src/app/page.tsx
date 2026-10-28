import { redirect } from "next/navigation";
import { DEMO_USER_ID } from "@/mock/seed";

/** "/" → the demo user's dashboard (same URL shape as the live app). */
export default function Home() {
  redirect(`/dashboard/${DEMO_USER_ID}/my_dashboard`);
}
