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

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have at least a header and one data row" }, { status: 400 })
    }

    // Parse CSV (simple implementation)
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const customers = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim())
      const customer: any = { user_id: user.id, source: "csv" }

      headers.forEach((header, index) => {
        if (values[index]) {
          customer[header] = values[index]
        }
      })

      if (customer.name) {
        customers.push(customer)
      }
    }

    if (customers.length === 0) {
      return NextResponse.json({ error: "No valid customers found in CSV" }, { status: 400 })
    }

    // Insert customers into database
    const { data, error } = await supabase.from("customers").insert(customers).select()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to import customers" }, { status: 500 })
    }

    return NextResponse.json({ customers: data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
