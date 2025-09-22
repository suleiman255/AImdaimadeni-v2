import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has SMS credentials configured
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("nextsms_username, nextsms_password")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ configured: false })
    }

    const configured = !!(profile?.nextsms_username && profile?.nextsms_password)

    return NextResponse.json({ configured })
  } catch (error) {
    console.error("SMS status check error:", error)
    return NextResponse.json({ configured: false })
  }
}
