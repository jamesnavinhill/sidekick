import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MainClient } from "./MainClient"

export default async function Page() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/auth/signin")
  }

  return <MainClient />
}
