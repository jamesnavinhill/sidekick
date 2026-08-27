import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 p-4">
      <div className="w-full max-w-sm space-y-6 bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-800">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome Back</h1>
          <p className="text-zinc-400 text-sm">Enter your email to sign in securely.</p>
        </div>
        <form
          action={async (formData) => {
            "use server"
            await signIn("resend", formData)
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="sr-only">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="name@example.com" 
              required 
              className="bg-zinc-950 border-zinc-800 text-zinc-50 focus-visible:ring-zinc-700"
            />
          </div>
          <Button type="submit" className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
            Send Login Link
          </Button>
        </form>
      </div>
    </div>
  )
}
