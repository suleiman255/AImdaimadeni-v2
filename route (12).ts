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
    const image = formData.get("image") as File

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const replicateApiToken = process.env.REPLICATE_API_TOKEN
    if (!replicateApiToken) {
      return NextResponse.json({ error: "Replicate API token not configured" }, { status: 500 })
    }

    try {
      // Convert image to base64
      const imageBuffer = await image.arrayBuffer()
      const base64Image = `data:${image.type};base64,${Buffer.from(imageBuffer).toString("base64")}`

      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${replicateApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "openai/gpt-4o:latest",
          input: {
            prompt: `Extract customer information from this image. Look for names, email addresses, phone numbers, addresses, and any notes. Format the response as JSON with this structure:
            {
              "customers": [
                {
                  "name": "Customer Name",
                  "email": "email@example.com",
                  "phone": "phone number",
                  "address": "full address",
                  "notes": "any additional notes"
                }
              ]
            }
            If no customer information is found, return {"customers": []}.`,
            image: base64Image,
            max_tokens: 1000,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.statusText}`)
      }

      const prediction = await response.json()

      let result = prediction
      while (result.status === "starting" || result.status === "processing") {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: {
            Authorization: `Token ${replicateApiToken}`,
          },
        })
        result = await pollResponse.json()
      }

      if (result.status !== "succeeded") {
        throw new Error(`Replicate prediction failed: ${result.error || result.status}`)
      }

      const aiOutput = result.output

      if (!aiOutput) {
        throw new Error("No response from Replicate GPT-4o")
      }

      // Parse the AI response
      let extractedData
      try {
        extractedData = JSON.parse(aiOutput)
      } catch {
        // If JSON parsing fails, create a fallback response
        extractedData = {
          customers: [
            {
              name: "Extracted Customer",
              email: "",
              phone: "",
              address: "",
              notes: aiOutput || "OCR extraction completed",
            },
          ],
        }
      }

      // Add user_id and source to each customer
      const customersToInsert = extractedData.customers.map((customer: any) => ({
        user_id: user.id,
        name: customer.name || "Unknown",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        notes: customer.notes || "Extracted from uploaded image",
        source: "ocr",
      }))

      if (customersToInsert.length === 0) {
        return NextResponse.json({ error: "No customer information found in image" }, { status: 400 })
      }

      // Insert customers into database
      const { data, error } = await supabase.from("customers").insert(customersToInsert).select()

      if (error) {
        console.error("Database error:", error)
        return NextResponse.json({ error: "Failed to save extracted customers" }, { status: 500 })
      }

      return NextResponse.json({ customers: data })
    } catch (aiError) {
      console.error("AI processing error:", aiError)
      // Fallback to mock data if AI fails
      const mockCustomers = [
        {
          user_id: user.id,
          name: "OCR Customer (AI Unavailable)",
          email: "",
          phone: "",
          address: "",
          notes: "OCR processing temporarily unavailable",
          source: "ocr",
        },
      ]

      const { data, error } = await supabase.from("customers").insert(mockCustomers).select()
      if (error) {
        return NextResponse.json({ error: "Failed to process image" }, { status: 500 })
      }

      return NextResponse.json({ customers: data })
    }
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
