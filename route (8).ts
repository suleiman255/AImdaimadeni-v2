import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { status, completed_date } = body

    // Update follow-up status
    const { data, error } = await supabase
      .from("followups")
      .update({
        status,
        completed_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user can only update their own follow-ups
      .select(`
        *,
        customer:customers(id, name, email),
        payment:payments(id, amount, status, due_date, invoice_number)
      `)
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update follow-up" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
