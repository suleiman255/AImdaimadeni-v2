"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  MessageSquare,
  Bot,
  Send,
  Settings,
  Info,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
}

interface Payment {
  id: string
  customer?: Customer
  amount: number
  status: string
  due_date: string
  invoice_number: string
}

interface Followup {
  id: string
  customer_id: string
  payment_id?: string
  customer?: Customer
  payment?: Payment
  type: "payment_reminder" | "general_followup" | "overdue_notice"
  status: "scheduled" | "sent" | "completed" | "cancelled"
  scheduled_date: string
  completed_date?: string
  message: string
  ai_generated_message?: string
  method: "email" | "phone" | "sms"
  created_at: string
}

export function FollowupScheduling() {
  const [followups, setFollowups] = useState<Followup[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    customer_id: "",
    payment_id: "",
    type: "general_followup" as const,
    scheduled_date: "",
    message: "",
    method: "email" as const,
  })

  useEffect(() => {
    fetchFollowups()
    fetchCustomers()
    fetchPayments()
    checkSmsConfiguration()
  }, [])

  const fetchFollowups = async () => {
    try {
      const response = await fetch("/api/followups")
      if (!response.ok) throw new Error("Failed to fetch followups")
      const data = await response.json()
      setFollowups(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch follow-ups",
        variant: "destructive",
      })
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers")
      if (!response.ok) throw new Error("Failed to fetch customers")
      const data = await response.json()
      setCustomers(data)
    } catch (error) {
      console.error("Failed to fetch customers:", error)
    }
  }

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/payments")
      if (!response.ok) throw new Error("Failed to fetch payments")
      const data = await response.json()
      setPayments(data.filter((p: Payment) => p.status !== "paid"))
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    }
  }

  const generateAIMessage = async () => {
    if (!formData.customer_id) {
      toast({
        title: "Error",
        description: "Please select a customer first",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingAI(true)
    try {
      const customer = customers.find((c) => c.id === formData.customer_id)
      const payment = formData.payment_id ? payments.find((p) => p.id === formData.payment_id) : null

      const response = await fetch("/api/followups/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customer?.name,
          followup_type: formData.type,
          payment_amount: payment?.amount,
          payment_due_date: payment?.due_date,
          method: formData.method,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate AI message")

      const result = await response.json()
      setFormData({ ...formData, message: result.message })

      toast({
        title: "AI message generated",
        description: "Message has been generated and added to the form",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI message. Using template instead.",
        variant: "destructive",
      })

      // Fallback to template message
      const customer = customers.find((c) => c.id === formData.customer_id)
      const templateMessage = getTemplateMessage(formData.type, customer?.name || "Customer")
      setFormData({ ...formData, message: templateMessage })
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const getTemplateMessage = (type: Followup["type"], customerName: string) => {
    switch (type) {
      case "payment_reminder":
        return `Hi ${customerName},\n\nThis is a friendly reminder that your payment is due soon. Please let us know if you have any questions.\n\nBest regards,\nYour Team`
      case "overdue_notice":
        return `Hi ${customerName},\n\nWe noticed that your payment is now overdue. Please contact us to discuss payment options.\n\nBest regards,\nYour Team`
      case "general_followup":
        return `Hi ${customerName},\n\nWe wanted to follow up with you regarding your recent interaction with us. Please let us know if you need any assistance.\n\nBest regards,\nYour Team`
      default:
        return `Hi ${customerName},\n\nWe wanted to reach out to you. Please let us know if you need any assistance.\n\nBest regards,\nYour Team`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to create follow-up")

      const newFollowup = await response.json()
      setFollowups([newFollowup, ...followups])
      setFormData({
        customer_id: "",
        payment_id: "",
        type: "general_followup",
        scheduled_date: "",
        message: "",
        method: "email",
      })
      setIsDialogOpen(false)

      toast({
        title: "Follow-up scheduled",
        description: "Follow-up has been successfully scheduled.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule follow-up. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateFollowupStatus = async (followupId: string, status: Followup["status"]) => {
    try {
      const response = await fetch(`/api/followups/${followupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          completed_date: status === "completed" ? new Date().toISOString() : null,
        }),
      })

      if (!response.ok) throw new Error("Failed to update follow-up")

      const updatedFollowup = await response.json()
      setFollowups(followups.map((f) => (f.id === followupId ? updatedFollowup : f)))

      toast({
        title: "Follow-up updated",
        description: `Follow-up status changed to ${status}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update follow-up status",
        variant: "destructive",
      })
    }
  }

  const sendSMS = async (followup: Followup) => {
    if (!followup.customer) {
      toast({
        title: "Error",
        description: "Customer information not available",
        variant: "destructive",
      })
      return
    }

    // Get customer phone number
    const response = await fetch(`/api/customers`)
    const customers = await response.json()
    const customer = customers.find((c: any) => c.id === followup.customer_id)

    if (!customer?.phone) {
      toast({
        title: "Error",
        description: "Customer phone number not available",
        variant: "destructive",
      })
      return
    }

    try {
      const smsResponse = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: customer.phone,
          message: followup.message,
          followupId: followup.id,
        }),
      })

      const result = await smsResponse.json()

      if (smsResponse.ok) {
        // Update local state
        setFollowups(
          followups.map((f) =>
            f.id === followup.id ? { ...f, status: "sent" as const, completed_date: new Date().toISOString() } : f,
          ),
        )

        toast({
          title: "SMS sent successfully",
          description: `Message sent to ${result.formattedNumber}`,
        })
      } else {
        if (result.error?.includes("NextSMS credentials not configured")) {
          toast({
            title: "SMS not configured",
            description: "Please configure your NextSMS credentials in Settings to send SMS messages.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Failed to send SMS",
            description: result.error || "Unknown error occurred",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send SMS. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = (status: Followup["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "sent":
        return <Mail className="w-4 h-4 text-blue-500" />
      case "scheduled":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "cancelled":
        return <AlertTriangle className="w-4 h-4 text-gray-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: Followup["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "scheduled":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getMethodIcon = (method: Followup["method"]) => {
    switch (method) {
      case "email":
        return <Mail className="w-4 h-4" />
      case "phone":
        return <Phone className="w-4 h-4" />
      case "sms":
        return <MessageSquare className="w-4 h-4" />
      default:
        return <Mail className="w-4 h-4" />
    }
  }

  const scheduledCount = followups.filter((f) => f.status === "scheduled").length
  const completedCount = followups.filter((f) => f.status === "completed").length
  const overdueCount = followups.filter(
    (f) => f.status === "scheduled" && new Date(f.scheduled_date) < new Date(),
  ).length

  const checkSmsConfiguration = async () => {
    try {
      const response = await fetch("/api/profile/sms-status")
      if (response.ok) {
        const data = await response.json()
        setSmsConfigured(data.configured)
      }
    } catch (error) {
      console.error("Failed to check SMS configuration:", error)
      setSmsConfigured(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {smsConfigured === false && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm">
              SMS functionality requires NextSMS credentials. Configure your account to send SMS follow-ups.
            </span>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                <Settings className="h-4 w-4" />
                Configure SMS
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Follow-up Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Follow-ups</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{followups.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{scheduledCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Follow-up Dialog */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Follow-up Scheduling</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              <span className="sm:inline">Schedule Follow-up</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule New Follow-up</DialogTitle>
              <DialogDescription>Create a new follow-up reminder for a customer.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Follow-up Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: Followup["type"]) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_followup">General Follow-up</SelectItem>
                      <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                      <SelectItem value="overdue_notice">Overdue Notice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Method</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(value: Followup["method"]) => setFormData({ ...formData, method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="sms" disabled={smsConfigured === false}>
                        SMS {smsConfigured === false && "(Configure in Settings)"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.type === "payment_reminder" || formData.type === "overdue_notice") && (
                <div className="space-y-2">
                  <Label htmlFor="payment">Related Payment (Optional)</Label>
                  <Select
                    value={formData.payment_id}
                    onValueChange={(value) => setFormData({ ...formData, payment_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a payment" />
                    </SelectTrigger>
                    <SelectContent>
                      {payments
                        .filter((p) => p.customer?.id === formData.customer_id)
                        .map((payment) => (
                          <SelectItem key={payment.id} value={payment.id}>
                            {payment.invoice_number || `$${payment.amount}`} - {payment.status}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="scheduled_date">Scheduled Date & Time *</Label>
                <Input
                  id="scheduled_date"
                  type="datetime-local"
                  required
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message">Message *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateAIMessage}
                    disabled={isGeneratingAI || !formData.customer_id}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    {isGeneratingAI ? "Generating..." : "Generate AI Message"}
                  </Button>
                </div>
                <Textarea
                  id="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Enter your follow-up message..."
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Scheduling..." : "Schedule Follow-up"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Follow-ups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Scheduled Follow-ups</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage and track all customer follow-ups</CardDescription>
        </CardHeader>
        <CardContent>
          {followups.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
              No follow-ups scheduled. Create your first follow-up to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Customer</TableHead>
                    <TableHead className="min-w-[100px]">Type</TableHead>
                    <TableHead className="min-w-[80px]">Method</TableHead>
                    <TableHead className="min-w-[140px]">Scheduled</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followups.map((followup) => (
                    <TableRow key={followup.id}>
                      <TableCell className="font-medium text-sm">
                        {followup.customer?.name || "Unknown Customer"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {followup.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getMethodIcon(followup.method)}
                          <span className="text-xs sm:text-sm">{followup.method}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {new Date(followup.scheduled_date).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(followup.status)} text-xs`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(followup.status)}
                            <span className="hidden sm:inline">{followup.status}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                          {followup.status === "scheduled" && (
                            <>
                              {followup.method === "sms" ? (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => sendSMS(followup)}
                                  disabled={smsConfigured === false}
                                  className="text-xs px-2 py-1 h-7"
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  <span className="hidden sm:inline">Send SMS</span>
                                  <span className="sm:hidden">Send</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateFollowupStatus(followup.id, "sent")}
                                  className="text-xs px-2 py-1 h-7"
                                >
                                  <span className="hidden sm:inline">Mark Sent</span>
                                  <span className="sm:hidden">Sent</span>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateFollowupStatus(followup.id, "completed")}
                                className="text-xs px-2 py-1 h-7"
                              >
                                <span className="hidden sm:inline">Complete</span>
                                <span className="sm:hidden">Done</span>
                              </Button>
                            </>
                          )}
                          {followup.status === "sent" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateFollowupStatus(followup.id, "completed")}
                              className="text-xs px-2 py-1 h-7"
                            >
                              <span className="hidden sm:inline">Mark Complete</span>
                              <span className="sm:hidden">Complete</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
