"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Users, DollarSign, Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react"

interface DashboardStats {
  customers: {
    total: number
    recent: number
  }
  payments: {
    total: number
    totalAmount: number
    paid: number
    paidAmount: number
    overdue: number
    overdueAmount: number
    pending: number
    pendingAmount: number
  }
  followups: {
    total: number
    scheduled: number
    overdue: number
    completed: number
    completionRate: number
  }
  recentActivity: Array<{
    id: string
    type: "customer" | "payment" | "followup"
    description: string
    timestamp: string
  }>
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      console.log("[v0] Fetching dashboard stats...")
      const response = await fetch("/api/dashboard/stats")
      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.log("[v0] Error response:", errorText)
        throw new Error(`Failed to fetch stats: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Dashboard stats received:", data)
      setStats(data)
    } catch (error) {
      console.error("[v0] Failed to fetch dashboard stats:", error)
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `TSh ${amount.toLocaleString("en-TZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse pb-2">
                <div className="h-3 sm:h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 sm:h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-muted-foreground text-sm sm:text-base">Failed to load dashboard statistics</div>
        <Button variant="outline" onClick={fetchDashboardStats} className="bg-transparent">
          Try Again
        </Button>
      </div>
    )
  }

  const paymentCollectionRate = stats.payments.total > 0 ? (stats.payments.paid / stats.payments.total) * 100 : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.customers.total}</div>
            <p className="text-xs text-muted-foreground">+{stats.customers.recent} this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.payments.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.payments.paidAmount)} collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{paymentCollectionRate.toFixed(1)}%</div>
            <Progress value={paymentCollectionRate} className="mt-2 h-1.5 sm:h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Follow-up Rate</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.followups.completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.followups.completed} of {stats.followups.total} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Payment Status</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Overview of payment collection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                <span className="text-xs sm:text-sm">Paid</span>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm sm:text-base">{formatCurrency(stats.payments.paidAmount)}</div>
                <div className="text-xs text-muted-foreground">{stats.payments.paid} payments</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                <span className="text-xs sm:text-sm">Pending</span>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm sm:text-base">{formatCurrency(stats.payments.pendingAmount)}</div>
                <div className="text-xs text-muted-foreground">{stats.payments.pending} payments</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                <span className="text-xs sm:text-sm">Overdue</span>
              </div>
              <div className="text-right">
                <div className="font-medium text-red-600 text-sm sm:text-base">
                  {formatCurrency(stats.payments.overdueAmount)}
                </div>
                <div className="text-xs text-muted-foreground">{stats.payments.overdue} payments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Follow-up Status</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Track your customer outreach</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                <span className="text-xs sm:text-sm">Scheduled</span>
              </div>
              <div className="font-medium text-sm sm:text-base">{stats.followups.scheduled}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                <span className="text-xs sm:text-sm">Completed</span>
              </div>
              <div className="font-medium text-sm sm:text-base">{stats.followups.completed}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                <span className="text-xs sm:text-sm">Overdue</span>
              </div>
              <div className="font-medium text-red-600 text-sm sm:text-base">{stats.followups.overdue}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Latest updates across your customer management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">No recent activity</div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {stats.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex-shrink-0">
                    {activity.type === "customer" && <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />}
                    {activity.type === "payment" && <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />}
                    {activity.type === "followup" && <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Button
              variant="outline"
              className="h-auto p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 bg-transparent"
            >
              <Users className="h-4 w-4 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Add Customer</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 bg-transparent"
            >
              <DollarSign className="h-4 w-4 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Create Payment</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 bg-transparent"
            >
              <Calendar className="h-4 w-4 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Schedule Follow-up</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
