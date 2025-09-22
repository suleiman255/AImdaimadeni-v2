import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { customer_id, payment_id, type, scheduled_date, message, method } = body

    // Insert follow-up into database
    const { data, error } = await supabase
      .from("followups")
      .insert({
        user_id: user.id,
        customer_id,
        payment_id: payment_id || null,
        type,
        scheduled_date,
        message,
        method,
        status: "scheduled",
      })
      .select(`
        *,
        customer:customers(id, name, email),
        payment:payments(id, amount, status, due_date, invoice_number)
      `)
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create follow-up" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    // Get follow-ups for the authenticated user with customer and payment details
    const { data, error } = await supabase
      .from("followups")
      .select(`
        *,
        customer:customers(id, name, email),
        payment:payments(id, amount, status, due_date, invoice_number)
      `)
      .eq("user_id", user.id)
      .order("scheduled_date", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
