import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  if (!cookieStore.get("lr_dev_auth")?.value) {
    redirect("/login");
  }
  redirect("/board");
}
