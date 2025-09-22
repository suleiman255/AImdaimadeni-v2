"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Mic, FileText, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  notes: string
  source: string
  created_at: string
}

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Manual customer form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  })

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, source: "manual" }),
      })

      if (!response.ok) throw new Error("Failed to add customer")

      const newCustomer = await response.json()
      setCustomers([...customers, newCustomer])
      setFormData({ name: "", email: "", phone: "", address: "", notes: "" })

      toast({
        title: "Customer added",
        description: "Customer has been successfully added to your database.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add customer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/customers/csv-upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to upload CSV")

      const result = await response.json()
      setCustomers([...customers, ...result.customers])

      toast({
        title: "CSV uploaded",
        description: `Successfully imported ${result.customers.length} customers.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload CSV. Please check the format and try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const formData = new FormData()
    formData.append("image", file)

    try {
      const response = await fetch("/api/customers/ocr-upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to process image")

      const result = await response.json()
      setCustomers([...customers, ...result.customers])

      toast({
        title: "Image processed",
        description: `Successfully extracted ${result.customers.length} customers from image.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startVoiceRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/wav" })
        const formData = new FormData()
        formData.append("audio", audioBlob, "recording.wav")

        setIsLoading(true)
        try {
          const response = await fetch("/api/customers/voice-upload", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) throw new Error("Failed to process voice recording")

          const result = await response.json()
          setCustomers([...customers, ...result.customers])

          toast({
            title: "Voice processed",
            description: `Successfully extracted ${result.customers.length} customers from voice recording.`,
          })
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to process voice recording. Please try again.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      setIsRecording(true)
      mediaRecorder.start()

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop()
          setIsRecording(false)
        }
      }, 30000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1">
          <TabsTrigger value="manual" className="text-xs sm:text-sm px-2 py-2">
            Manual
          </TabsTrigger>
          <TabsTrigger value="csv" className="text-xs sm:text-sm px-2 py-2">
            CSV
          </TabsTrigger>
          <TabsTrigger value="ocr" className="text-xs sm:text-sm px-2 py-2">
            OCR
          </TabsTrigger>
          <TabsTrigger value="voice" className="text-xs sm:text-sm px-2 py-2">
            Voice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Add Customer Manually</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Enter customer information directly into the form
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="email" className="text-xs sm:text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="phone" className="text-xs sm:text-sm">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="address" className="text-xs sm:text-sm">
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="notes" className="text-xs sm:text-sm">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="text-sm min-h-[80px] sm:min-h-[100px]"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  {isLoading ? "Adding..." : "Add Customer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Upload CSV File</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Upload a CSV file with customer data. Expected columns: name, email, phone, address, notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    Click to upload or drag and drop your CSV file
                  </p>
                  <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="text-xs sm:text-sm"
                  >
                    {isLoading ? "Processing..." : "Choose File"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ocr">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Upload Image for OCR</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Upload an image containing customer information. AI will extract the data automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center">
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    Upload an image with customer information
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("image-upload")?.click()}
                    disabled={isLoading}
                    className="text-xs sm:text-sm"
                  >
                    {isLoading ? "Processing..." : "Choose Image"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Voice Input</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Record customer information using voice input. AI will transcribe and structure the data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center">
                  <Mic
                    className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 ${isRecording ? "text-red-500" : "text-muted-foreground"}`}
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    {isRecording ? "Recording... Speak customer information" : "Click to start recording"}
                  </p>
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={startVoiceRecording}
                    disabled={isLoading}
                    className="text-xs sm:text-sm"
                  >
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {customers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Recent Customers</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {customers.length} customer{customers.length !== 1 ? "s" : ""} added
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {customers.slice(0, 5).map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{customer.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{customer.email}</p>
                  </div>
                  <span className="text-xs bg-secondary px-2 py-1 rounded ml-2 flex-shrink-0">{customer.source}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
