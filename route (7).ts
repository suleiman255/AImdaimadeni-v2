import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const { customer_name, followup_type, payment_amount, payment_due_date, method } = body

    const replicateApiKey = process.env.REPLICATE_API_TOKEN

    if (replicateApiKey) {
      try {
        let prompt = `Generate a professional ${followup_type.replace("_", " ")} message for a customer named ${customer_name}.`

        if (payment_amount) {
          prompt += ` The payment amount is $${payment_amount}.`
        }
        if (payment_due_date) {
          prompt += ` The payment due date is ${new Date(payment_due_date).toLocaleDateString()}.`
        }

        prompt += ` The message will be sent via ${method}.`

        if (method === "sms") {
          prompt += " Keep it concise for SMS (under 160 characters)."
        } else if (method === "email") {
          prompt += " Format as a professional email with proper greeting and closing."
        }

        prompt += " Be friendly, professional, and helpful. Do not include placeholder information."

        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            Authorization: `Token ${replicateApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4", // GPT-4o model
            input: {
              prompt: prompt,
              max_tokens: method === "sms" ? 160 : 500,
              temperature: 0.7,
            },
          }),
        })

        if (response.ok) {
          const prediction = await response.json()

          // Poll for completion
          let result = prediction
          let attempts = 0
          while (result.status !== "succeeded" && result.status !== "failed" && attempts < 30) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
            const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
              headers: {
                Authorization: `Token ${replicateApiKey}`,
              },
            })
            result = await statusResponse.json()
            attempts++
          }

          if (result.status === "succeeded" && result.output) {
            return NextResponse.json({ message: result.output })
          }
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError)
        // Fall through to template messages
      }
    }

    // Fallback to template messages if AI is unavailable
    let message = ""

    switch (followup_type) {
      case "payment_reminder":
        message = `Hi ${customer_name},

I hope this message finds you well. This is a friendly reminder that your payment of $${payment_amount} is due on ${payment_due_date ? new Date(payment_due_date).toLocaleDateString() : "soon"}.

If you have already made this payment, please disregard this message. If you have any questions or need to discuss payment arrangements, please don't hesitate to reach out.

Thank you for your business!

Best regards,
Your Team`
        break

      case "overdue_notice":
        message = `Hi ${customer_name},

We hope you're doing well. We wanted to reach out regarding your overdue payment of $${payment_amount}.

We understand that sometimes circumstances can make it challenging to meet payment deadlines. We're here to work with you to find a solution that works for both of us.

Please contact us at your earliest convenience to discuss this matter.

Best regards,
Your Team`
        break

      case "general_followup":
        message = `Hi ${customer_name},

I wanted to follow up with you to see how everything is going and if there's anything we can help you with.

Your satisfaction is important to us, and we're always here to support you in any way we can.

Please feel free to reach out if you have any questions or concerns.

Best regards,
Your Team`
        break

      default:
        message = `Hi ${customer_name},

We wanted to reach out to you. Please let us know if you need any assistance.

Best regards,
Your Team`
    }

    // Adjust message based on method
    if (method === "sms") {
      // Shorten for SMS
      message = message.split("\n\n")[0] + "\n\nPlease call us if you have questions. Thanks!"
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
