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
    const audio = formData.get("audio") as File

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const replicateApiKey = process.env.REPLICATE_API_TOKEN
    if (!replicateApiKey) {
      return NextResponse.json({ error: "Replicate API key not configured" }, { status: 500 })
    }

    try {
      // Convert audio to base64
      const audioBuffer = await audio.arrayBuffer()
      const base64Audio = `data:${audio.type};base64,${Buffer.from(audioBuffer).toString("base64")}`

      // Use Whisper for transcription
      const transcriptionResponse = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${replicateApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e", // OpenAI Whisper model
          input: {
            audio: base64Audio,
            model: "large-v3",
            translate: false,
            temperature: 0,
            suppress_tokens: "-1",
            logprob_threshold: -1,
            no_speech_threshold: 0.6,
            condition_on_previous_text: true,
            compression_ratio_threshold: 2.4,
            temperature_increment_on_fallback: 0.2,
          },
        }),
      })

      if (!transcriptionResponse.ok) {
        throw new Error(`Whisper API error: ${transcriptionResponse.statusText}`)
      }

      const transcriptionPrediction = await transcriptionResponse.json()

      // Poll for transcription completion
      let transcriptionResult = transcriptionPrediction
      while (transcriptionResult.status !== "succeeded" && transcriptionResult.status !== "failed") {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${transcriptionResult.id}`, {
          headers: {
            Authorization: `Token ${replicateApiKey}`,
          },
        })
        transcriptionResult = await statusResponse.json()
      }

      if (transcriptionResult.status === "failed") {
        throw new Error("Voice transcription failed")
      }

      const transcription = transcriptionResult.output?.transcription || transcriptionResult.output

      // Now use GPT-4o to extract customer information from transcription
      const extractionResponse = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${replicateApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4", // GPT-4o model
          input: {
            prompt: `Extract customer information from this transcribed voice recording: "${transcription}"

            Look for names, email addresses, phone numbers, addresses, and any notes. Format the response as JSON with this structure:
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
          },
        }),
      })

      if (!extractionResponse.ok) {
        throw new Error(`GPT-4o API error: ${extractionResponse.statusText}`)
      }

      const extractionPrediction = await extractionResponse.json()

      // Poll for extraction completion
      let extractionResult = extractionPrediction
      while (extractionResult.status !== "succeeded" && extractionResult.status !== "failed") {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${extractionResult.id}`, {
          headers: {
            Authorization: `Token ${replicateApiKey}`,
          },
        })
        extractionResult = await statusResponse.json()
      }

      if (extractionResult.status === "failed") {
        throw new Error("Customer information extraction failed")
      }

      // Parse the AI response
      let extractedData
      try {
        extractedData = JSON.parse(extractionResult.output)
      } catch {
        // If JSON parsing fails, create a fallback response
        extractedData = {
          customers: [
            {
              name: "Voice Customer",
              email: "",
              phone: "",
              address: "",
              notes: `Transcription: ${transcription}`,
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
        notes: customer.notes || `Voice transcription: ${transcription}`,
        source: "voice",
      }))

      if (customersToInsert.length === 0) {
        return NextResponse.json(
          {
            error: "No customer information found in voice recording",
            transcription: transcription,
          },
          { status: 400 },
        )
      }

      // Insert customers into database
      const { data, error } = await supabase.from("customers").insert(customersToInsert).select()

      if (error) {
        console.error("Database error:", error)
        return NextResponse.json({ error: "Failed to save extracted customers" }, { status: 500 })
      }

      return NextResponse.json({
        customers: data,
        transcription: transcription,
      })
    } catch (aiError) {
      console.error("AI processing error:", aiError)
      // Return error with helpful message
      return NextResponse.json(
        {
          error: "Voice processing failed. Please check your Replicate API configuration.",
          details: aiError instanceof Error ? aiError.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
