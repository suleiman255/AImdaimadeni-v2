interface ReplicateResponse {
  output?: any
  error?: string
}

export class ReplicateClient {
  private apiToken: string
  private baseUrl = "https://api.replicate.com/v1"

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  async runPrediction(model: string, input: any): Promise<ReplicateResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: model,
          input: input,
        }),
      })

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.statusText}`)
      }

      const prediction = await response.json()

      // Poll for completion
      return await this.waitForCompletion(prediction.id)
    } catch (error) {
      console.error("Replicate API error:", error)
      return { error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  private async waitForCompletion(predictionId: string): Promise<ReplicateResponse> {
    const maxAttempts = 60 // 5 minutes max
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
          headers: {
            Authorization: `Token ${this.apiToken}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to get prediction status: ${response.statusText}`)
        }

        const prediction = await response.json()

        if (prediction.status === "succeeded") {
          return { output: prediction.output }
        } else if (prediction.status === "failed") {
          return { error: prediction.error || "Prediction failed" }
        }

        // Wait 5 seconds before next attempt
        await new Promise((resolve) => setTimeout(resolve, 5000))
        attempts++
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Unknown error" }
      }
    }

    return { error: "Prediction timed out" }
  }
}

// Helper function to convert file to base64 data URL
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
