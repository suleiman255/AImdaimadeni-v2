import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Dashboard stats API called")
    const supabase = await createClient()
    console.log("[v0] Supabase client created")

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("[v0] Auth check - User:", user?.id, "Error:", authError)

    if (authError || !user) {
      console.log("[v0] Authentication failed:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated, fetching data for user:", user.id)

    // Get customer stats
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, created_at")
      .eq("user_id", user.id)

    console.log("[v0] Customers query result:", { count: customers?.length, error: customersError })

    if (customersError) {
      console.error("Customers error:", customersError)
      return NextResponse.json({ error: "Failed to fetch customer stats" }, { status: 500 })
    }

    // Get payment stats
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("id, amount, status, created_at")
      .eq("user_id", user.id)

    console.log("[v0] Payments query result:", { count: payments?.length, error: paymentsError })

    if (paymentsError) {
      console.error("Payments error:", paymentsError)
      return NextResponse.json({ error: "Failed to fetch payment stats" }, { status: 500 })
    }

    // Get follow-up stats
    const { data: followups, error: followupsError } = await supabase
      .from("followups")
      .select("id, status, scheduled_date, created_at")
      .eq("user_id", user.id)

    console.log("[v0] Followups query result:", { count: followups?.length, error: followupsError })

    if (followupsError) {
      console.error("Followups error:", followupsError)
      return NextResponse.json({ error: "Failed to fetch followup stats" }, { status: 500 })
    }

    // Calculate customer stats
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentCustomers = customers.filter((c) => new Date(c.created_at) > thirtyDaysAgo)

    // Calculate payment stats
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
    const paidPayments = payments.filter((p) => p.status === "paid")
    const paidAmount = paidPayments.reduce((sum, p) => sum + p.amount, 0)
    const overduePayments = payments.filter((p) => p.status === "overdue")
    const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0)
    const pendingPayments = payments.filter((p) => p.status === "pending")
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0)

    // Calculate follow-up stats
    const scheduledFollowups = followups.filter((f) => f.status === "scheduled")
    const completedFollowups = followups.filter((f) => f.status === "completed")
    const overdueFollowups = followups.filter((f) => f.status === "scheduled" && new Date(f.scheduled_date) < now)
    const completionRate = followups.length > 0 ? (completedFollowups.length / followups.length) * 100 : 0

    const formatCurrency = (amount: number) => {
      return `TSh ${amount.toLocaleString("en-TZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }

    // Generate recent activity
    const recentActivity = []

    // Add recent customers
    customers.slice(-3).forEach((customer) => {
      recentActivity.push({
        id: `customer-${customer.id}`,
        type: "customer" as const,
        description: "New customer added",
        timestamp: customer.created_at,
      })
    })

    // Add recent payments
    payments.slice(-3).forEach((payment) => {
      recentActivity.push({
        id: `payment-${payment.id}`,
        type: "payment" as const,
        description: `Payment ${payment.status} - ${formatCurrency(payment.amount)}`,
        timestamp: payment.created_at,
      })
    })

    // Add recent follow-ups
    followups.slice(-3).forEach((followup) => {
      recentActivity.push({
        id: `followup-${followup.id}`,
        type: "followup" as const,
        description: `Follow-up ${followup.status}`,
        timestamp: followup.created_at,
      })
    })

    // Sort by timestamp and take most recent
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const stats = {
      customers: {
        total: customers.length,
        recent: recentCustomers.length,
      },
      payments: {
        total: payments.length,
        totalAmount,
        paid: paidPayments.length,
        paidAmount,
        overdue: overduePayments.length,
        overdueAmount,
        pending: pendingPayments.length,
        pendingAmount,
      },
      followups: {
        total: followups.length,
        scheduled: scheduledFollowups.length,
        overdue: overdueFollowups.length,
        completed: completedFollowups.length,
        completionRate,
      },
      recentActivity: recentActivity.slice(0, 10),
    }

    console.log("[v0] Returning dashboard stats successfully")
    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
