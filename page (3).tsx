import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CustomerManagement } from "@/components/customer-management"
import { PaymentTracking } from "@/components/payment-tracking"
import { FollowupScheduling } from "@/components/followup-scheduling"
import { DashboardOverview } from "@/components/dashboard-overview"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  console.log("[v0] Dashboard page loading...")

  const supabase = await createClient()
  console.log("[v0] Supabase client created in dashboard")

  const { data, error } = await supabase.auth.getUser()
  console.log("[v0] Dashboard auth check - User:", data?.user?.id, "Error:", error)

  if (error || !data?.user) {
    console.log("[v0] Dashboard auth failed, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[v0] Dashboard authenticated, rendering page")

  return (
    <div className="container mx-auto p-3 sm:p-6 max-w-7xl">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-balance">Customer Follow-up Dashboard</h1>
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </Link>
            <form action="/auth/logout" method="post">
              <button className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 py-2">
              Overview
            </TabsTrigger>
            <TabsTrigger value="customers" className="text-xs sm:text-sm px-2 py-2">
              Customers
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm px-2 py-2">
              Payments
            </TabsTrigger>
            <TabsTrigger value="followups" className="text-xs sm:text-sm px-2 py-2">
              Follow-ups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="customers">
            <CustomerManagement />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentTracking />
          </TabsContent>

          <TabsContent value="followups">
            <FollowupScheduling />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
