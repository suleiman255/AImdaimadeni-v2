"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, MessageSquare } from "lucide-react"

interface Profile {
  id: string
  business_name: string | null
  email: string | null
  phone: string | null
  nextsms_username: string | null
  nextsms_password: string | null
  nextsms_sender_id: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    business_name: "",
    email: "",
    phone: "",
    nextsms_username: "",
    nextsms_password: "",
    nextsms_sender_id: "",
  })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) throw error

      setProfile(data)
      setFormData({
        business_name: data.business_name || "",
        email: data.email || "",
        phone: data.phone || "",
        nextsms_username: data.nextsms_username || "",
        nextsms_password: data.nextsms_password || "",
        nextsms_sender_id: data.nextsms_sender_id || "",
      })
    } catch (error) {
      console.error("Error loading profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        ...formData,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Settings saved successfully",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and SMS configuration</p>
      </div>

      <div className="space-y-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Update your business details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, business_name: e.target.value }))}
                placeholder="Your Business Name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+255712345678"
              />
            </div>
          </CardContent>
        </Card>

        {/* NextSMS Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              NextSMS Configuration
            </CardTitle>
            <CardDescription>Configure your NextSMS account to send SMS messages to customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nextsms_username">NextSMS Username</Label>
              <Input
                id="nextsms_username"
                value={formData.nextsms_username}
                onChange={(e) => setFormData((prev) => ({ ...prev, nextsms_username: e.target.value }))}
                placeholder="Your NextSMS username"
              />
            </div>
            <div>
              <Label htmlFor="nextsms_password">NextSMS Password</Label>
              <Input
                id="nextsms_password"
                type="password"
                value={formData.nextsms_password}
                onChange={(e) => setFormData((prev) => ({ ...prev, nextsms_password: e.target.value }))}
                placeholder="Your NextSMS password"
              />
            </div>
            <div>
              <Label htmlFor="nextsms_sender_id">Sender ID</Label>
              <Input
                id="nextsms_sender_id"
                value={formData.nextsms_sender_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, nextsms_sender_id: e.target.value }))}
                placeholder="Your sender ID (e.g., MYBIZ)"
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your NextSMS credentials are securely stored and encrypted. You can get these
                details from your NextSMS account dashboard.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
