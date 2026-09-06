import { redirect } from "next/navigation";

export default function FlashcardsRedirectPage() {
  redirect("/dashboard/library");
}
