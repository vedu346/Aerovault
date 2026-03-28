import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Navbar from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Plane, CreditCard, Activity, Shield, Ticket, PlusCircle } from "lucide-react"
import { 
    DeleteUserButton, 
    UpdateUserRoleSelect, 
    CancelBookingButton, 
    BookingDetailsDialog,
    DeleteFlightButton,
    FlightManagementDialog
} from "@/components/admin/admin-management"
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDashboard() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch all data in parallel
    const [
        allUsersResponse,
        flightsResponse,
        allBookingsResponse,
        passengersResponse,
        airlinesResponse,
    ] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('flights').select('*, company:flight_companies(company_name)', { count: 'exact' }).order('created_at', { ascending: false }),
        supabase.from('bookings').select(`
            *,
            user:users(email, role),
            flight:flights(flight_number, source, destination, departure_time, price, company:flight_companies(company_name))
        `).order('booking_date', { ascending: false }),
        supabase.from('passengers').select('*', { count: 'exact' }),
        supabase.from('users').select('*, company:flight_companies(company_name)').eq('role', 'airline_admin'),
    ])

    const allUsersList = allUsersResponse.data || []
    const flightsList = flightsResponse.data || []
    const allBookings = allBookingsResponse.data || []
    const airlinesList = airlinesResponse.data || []
    const passengerCount = passengersResponse.count || 0
    const flightCount = flightsResponse.count || 0
    const userCount = allUsersList.length

    // Revenue from confirmed bookings
    const totalRevenueAmount = allBookings
        .filter((b: any) => b.status === 'confirmed')
        .reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0)
    const formattedRevenue = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalRevenueAmount)
    const confirmedBookings = allBookings.filter((b: any) => b.status === 'confirmed').length
    const totalBookings = allBookings.length

    return (
        <div className="relative min-h-screen z-0 overflow-hidden">
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-20"
                style={{ backgroundImage: "url('/images/hero-bg-2.jpg')" }}
            />
            <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80 -z-10" />

            <Navbar />
            <main className="relative max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-24 z-10">
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-3xl font-extrabold text-white mb-8 tracking-tight drop-shadow-lg">Admin Dashboard</h1>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                        <Card className="hover:shadow-lg transition-all border-white/40 bg-white/70 backdrop-blur-md overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-3 text-slate-100 group-hover:text-purple-500 transition-colors">
                                <Shield size={24} />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Total Users</CardTitle>
                                <p className="text-[20px] font-bold text-slate-900 tabular-nums">{userCount}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="text-[13px] text-slate-400 font-medium">Platform Accounts</div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-lg transition-all border-white/40 bg-white/70 backdrop-blur-md overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-3 text-slate-100 group-hover:text-blue-500 transition-colors">
                                <Users size={24} />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Passengers</CardTitle>
                                <p className="text-[20px] font-bold text-slate-900 tabular-nums">{passengerCount}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="text-[13px] text-slate-400 font-medium">Total Travelers</div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-lg transition-all border-white/40 bg-white/70 backdrop-blur-md overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-3 text-slate-100 group-hover:text-indigo-500 transition-colors">
                                <Plane size={24} />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Flights</CardTitle>
                                <p className="text-[20px] font-bold text-slate-900 tabular-nums">{flightCount}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="text-[13px] text-slate-400 font-medium">Active Scheduled</div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-lg transition-all border-white/40 bg-white/70 backdrop-blur-md overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-3 text-slate-100 group-hover:text-amber-500 transition-colors">
                                <Ticket size={24} />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Bookings</CardTitle>
                                <p className="text-[20px] font-bold text-slate-900 tabular-nums">{totalBookings}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="text-[13px] text-slate-400 font-medium">{confirmedBookings} confirmed</div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-lg transition-all border-white/40 bg-white/70 backdrop-blur-md overflow-hidden relative group col-span-2 md:col-span-1">
                            <div className="absolute top-0 right-0 p-3 text-slate-100 group-hover:text-emerald-500 transition-colors">
                                <CreditCard size={24} />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Revenue</CardTitle>
                                <p className="text-[20px] font-bold text-emerald-600 tabular-nums">{formattedRevenue}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="text-[13px] text-slate-400 font-medium">Settled Income</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Management Tabs */}
                    <Tabs defaultValue="bookings" className="space-y-6">
                        <TabsList className="bg-white/10 backdrop-blur-md p-1 border border-white/20 flex-wrap h-auto gap-1">
                            <TabsTrigger value="bookings" className="font-medium text-white/80 data-[state=active]:bg-white data-[state=active]:text-slate-900">All Bookings</TabsTrigger>
                            <TabsTrigger value="accounts" className="font-medium text-white/80 data-[state=active]:bg-white data-[state=active]:text-slate-900">User Accounts</TabsTrigger>
                            <TabsTrigger value="flights" className="font-medium text-white/80 data-[state=active]:bg-white data-[state=active]:text-slate-900">All Flights</TabsTrigger>
                            <TabsTrigger value="airlines" className="font-medium text-white/80 data-[state=active]:bg-white data-[state=active]:text-slate-900">Airlines</TabsTrigger>
                        </TabsList>

                        {/* ALL BOOKINGS TAB - shows which user booked which flight */}
                        <TabsContent value="bookings">
                            <Card className="shadow-2xl border-white/20 bg-white/95 backdrop-blur-xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                        <Activity className="text-blue-600" /> All Bookings ({totalBookings})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {allBookings.length > 0 ? (
                                        <div className="">
                                            <table className="w-full table-fixed divide-y divide-slate-200">
                                                <thead className="bg-slate-50/80 border-b border-slate-200">
                                                    <tr>
                                                        <th className="w-[22%] px-3 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase tracking-wider">User / Passengers</th>
                                                        <th className="w-[7%] px-3 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Flight</th>
                                                        <th className="w-[14%] px-3 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                                                        <th className="w-[13%] px-3 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Airline</th>
                                                        <th className="w-[16%] px-3 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Departure</th>
                                                        <th className="w-[9%] px-3 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                                                        <th className="w-[9%] px-3 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                                        <th className="w-[10%] px-3 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-100">
                                                    {allBookings.map((booking: any) => (
                                                        <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="px-3 py-2 overflow-hidden">
                                                                <BookingDetailsDialog bookingId={booking.id} passengerCount={booking.seats}>
                                                                    <div className="flex flex-col">
                                                                        <div className="font-medium text-indigo-600 hover:text-indigo-800 underline-offset-4 hover:underline truncate text-[14px]" title={booking.user?.email}>
                                                                            {booking.user?.email || 'Unknown'}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                                            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-tight leading-none">{booking.user?.role}</span>
                                                                            <span className="h-1 w-1 rounded-full bg-slate-200" />
                                                                            <span className="text-[11px] text-indigo-500 font-semibold">{booking.seats} Passenger{booking.seats > 1 ? 's' : ''}</span>
                                                                        </div>
                                                                    </div>
                                                                </BookingDetailsDialog>
                                                            </td>
                                                            <td className="px-3 py-2 font-semibold text-indigo-600 text-[14px]">{booking.flight?.flight_number || 'N/A'}</td>
                                                            <td className="px-3 py-2 text-slate-700 text-[14px] leading-snug font-medium truncate" title={`${booking.flight?.source} → ${booking.flight?.destination}`}>
                                                                {booking.flight?.source} → {booking.flight?.destination}
                                                            </td>
                                                            <td className="px-3 py-2 text-slate-600 text-[14px] font-medium truncate" title={booking.flight?.company?.company_name}>
                                                                {booking.flight?.company?.company_name || 'N/A'}
                                                            </td>
                                                            <td className="px-3 py-2 text-slate-500 text-[13px] font-medium leading-tight">
                                                                {booking.flight?.departure_time ? new Date(booking.flight.departure_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                                            </td>
                                                            <td className="px-3 py-2 font-semibold text-emerald-700 text-[14px]">₹{Number(booking.total_price).toLocaleString()}</td>
                                                            <td className="px-3 py-2">
                                                                <span className={`px-2 py-0.5 inline-flex text-[11px] font-semibold rounded-full border ${
                                                                    booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                    booking.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                    'bg-amber-50 text-amber-700 border-amber-100'
                                                                }`}>
                                                                    {booking.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-right">
                                                                <div className="flex gap-1.5 justify-end items-center flex-nowrap min-w-max">
                                                                    {booking.status === 'confirmed' && (
                                                                        <CancelBookingButton bookingId={booking.id} />
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-16 text-center text-slate-500 font-medium">No bookings found in the system.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ALL USER ACCOUNTS TAB */}
                        <TabsContent value="accounts">
                            <Card className="shadow-2xl border-white/20 bg-white/95 backdrop-blur-xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                        <Shield className="text-purple-600" /> All User Accounts ({userCount})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {allUsersList.length > 0 ? (
                                        <div className="">
                                            <table className="w-full table-fixed divide-y divide-slate-200">
                                                <thead className="bg-slate-50/80 border-b border-slate-200">
                                                    <tr>
                                                        <th className="w-[35%] px-3 py-3 text-left text-[14px] font-semibold text-slate-500 uppercase tracking-wider">User Account</th>
                                                        <th className="w-[20%] px-3 py-3 text-left text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                                        <th className="w-[30%] px-3 py-3 text-left text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                                                        <th className="w-[15%] px-3 py-3 text-right text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-100">
                                                    {allUsersList.map((usr: any) => (
                                                        <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="px-3 py-2.5 overflow-hidden">
                                                                <div className="font-semibold text-slate-900 truncate text-[16px]" title={usr.email}>{usr.email}</div>
                                                                <div className="text-[13px] text-slate-400 font-medium uppercase tracking-tight leading-none mt-1">ID: {usr.id.substring(0, 8)}</div>
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <UpdateUserRoleSelect userId={usr.id} currentRole={usr.role} />
                                                            </td>
                                                            <td className="px-3 py-2.5 text-slate-500 text-[14px] font-medium leading-tight">
                                                                {new Date(usr.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right">
                                                                <DeleteUserButton userId={usr.id} email={usr.email} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-16 text-center text-slate-500 font-medium">No user accounts found.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ALL FLIGHTS TAB */}
                        <TabsContent value="flights">
                            <Card className="shadow-2xl border-white/20 bg-white/95 backdrop-blur-xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between text-xl font-bold">
                                        <div className="flex items-center gap-2">
                                            <Plane className="text-indigo-600" /> All Flights ({flightCount})
                                        </div>
                                        <FlightManagementDialog airlines={airlinesList} />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {flightsList.length > 0 ? (
                                        <div className="">
                                            <table className="w-full table-fixed divide-y divide-slate-200">
                                                <thead className="bg-slate-50/80 border-b border-slate-200">
                                                    <tr>
                                                        <th className="w-[12%] px-3 py-3 text-left text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Flight</th>
                                                        <th className="w-[20%] px-3 py-3 text-left text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                                                        <th className="w-[18%] px-3 py-3 text-left text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Airline</th>
                                                        <th className="w-[18%] px-3 py-3 text-left text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Departure</th>
                                                        <th className="w-[12%] px-3 py-3 text-left text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                                                        <th className="w-[10%] px-3 py-3 text-left text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Seats</th>
                                                        <th className="w-[10%] px-3 py-3 text-right text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-100">
                                                    {flightsList.map((f: any) => (
                                                        <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="px-3 py-2.5 font-bold text-indigo-600 text-[16px]">{f.flight_number}</td>
                                                            <td className="px-3 py-2.5 text-slate-700 text-[15px] leading-snug font-semibold truncate" title={`${f.source} → ${f.destination}`}>
                                                                {f.source} → {f.destination}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-slate-600 text-[15px] font-medium truncate" title={f.company?.company_name}>
                                                                {f.company?.company_name || 'N/A'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-slate-500 text-[14px] font-medium leading-tight">
                                                                {new Date(f.departure_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                            </td>
                                                            <td className="px-3 py-2.5 font-bold text-emerald-700 text-[16px]">₹{Number(f.price).toLocaleString()}</td>
                                                            <td className="px-3 py-2.5">
                                                                <span className="text-slate-600 font-bold text-[15px]">{f.remaining_seats}</span>
                                                                <span className="text-slate-400 text-[13px] ml-1">/ {f.total_seats}</span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right">
                                                                <div className="flex justify-end gap-1.5 items-center min-w-max">
                                                                    <FlightManagementDialog flight={f} airlines={airlinesList} />
                                                                    <DeleteFlightButton flightId={f.id} flightNumber={f.flight_number} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center text-slate-500">No flights found.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* AIRLINES TAB */}
                        <TabsContent value="airlines">
                            <Card className="shadow-2xl border-white/20 bg-white/95 backdrop-blur-xl">
                                <CardHeader>
                                    <CardTitle className="text-xl font-bold">Registered Airlines ({airlinesList.length})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {airlinesList.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {airlinesList.filter((a: any) => a.airline_id).map((a: any) => {
                                                const airlineBookings = allBookings.filter((b: any) => b.flight?.company?.company_name === a.company?.company_name)
                                                const airlineRevenue = airlineBookings.filter((b: any) => b.status === 'confirmed').reduce((sum: number, b: any) => sum + Number(b.total_price || 0), 0)
                                                return (
                                                    <div key={a.id} className="group p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-500 hover:shadow-xl transition-all relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -z-10 group-hover:bg-indigo-100 transition-colors" />
                                                        <p className="font-bold text-[18px] text-slate-900 truncate" title={a.company?.company_name}>{a.company?.company_name || 'No Company'}</p>
                                                        <p className="text-[14px] text-slate-400 font-medium truncate mt-1">{a.email}</p>
                                                        <div className="mt-6 flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] text-slate-400 font-semibold uppercase tracking-wider">Bookings</span>
                                                                <span className="text-[18px] text-slate-900 font-bold tabular-nums">{airlineBookings.length}</span>
                                                            </div>
                                                            <div className="flex flex-col text-right">
                                                                <span className="text-[13px] text-slate-400 font-semibold uppercase tracking-wider">Revenue</span>
                                                                <span className="text-[18px] text-emerald-600 font-bold tabular-nums">₹{airlineRevenue.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-slate-500">No airlines registered.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    )
}
