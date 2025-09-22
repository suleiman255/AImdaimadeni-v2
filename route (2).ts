import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Phone number formatting function
function formatPhoneNumber(phoneNumber: string): string {
  let formatted = phoneNumber.trim()

  // Remove any non-digit characters except + at the start
  formatted = formatted.replace(/[^\d+]/g, "")

  if (formatted.startsWith("+255")) {
    formatted = formatted.replace("+", "")
  } else if (formatted.startsWith("0")) {
    formatted = "255" + formatted.slice(1)
  }

  return formatted
}

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
    const { phoneNumber, message, followupId } = body

    if (!phoneNumber || !message) {
      return NextResponse.json({ error: "Phone number and message are required" }, { status: 400 })
    }

    // Format the phone number
    const formattedNumber = formatPhoneNumber(phoneNumber)

    // Validate the formatted number (should start with 255 and be appropriate length)
    if (!formattedNumber.startsWith("255") || formattedNumber.length < 12) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("nextsms_username, nextsms_password, nextsms_sender_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: "Profile not found. Please configure your settings first.",
        },
        { status: 404 },
      )
    }

    const { nextsms_username: username, nextsms_password: password, nextsms_sender_id: senderId } = profile

    if (!username || !password) {
      return NextResponse.json(
        {
          error: "NextSMS credentials not configured. Please add your NextSMS username and password in Settings.",
        },
        { status: 400 },
      )
    }

    // Create Basic Auth token
    const credentials = `${username}:${password}`
    const token = Buffer.from(credentials).toString("base64")

    try {
      // Call NextSMS API
      const smsResponse = await fetch("https://messaging-service.co.tz/api/sms/v1/text/single", {
        method: "POST",
        headers: {
          Authorization: `Basic ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: senderId || "MyApp",
          to: formattedNumber,
          text: message,
        }),
      })

      const smsData = await smsResponse.json()

      // Update follow-up status if followupId is provided
      if (followupId) {
        const { error: updateError } = await supabase
          .from("followups")
          .update({
            status: "sent",
            completed_date: new Date().toISOString(),
          })
          .eq("id", followupId)
          .eq("user_id", user.id)

        if (updateError) {
          console.error("Failed to update follow-up status:", updateError)
        }
      }

      if (smsResponse.ok) {
        return NextResponse.json({
          success: true,
          message: "SMS sent successfully",
          data: smsData,
          formattedNumber,
        })
      } else {
        return NextResponse.json(
          {
            error: "Failed to send SMS",
            details: smsData,
          },
          { status: smsResponse.status },
        )
      }
    } catch (smsError: any) {
      console.error("SMS API error:", smsError)
      return NextResponse.json(
        {
          error: "Failed to send SMS",
          details: smsError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
