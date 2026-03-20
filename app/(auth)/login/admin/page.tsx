import Navbar from "@/components/navbar"
import { SingleLoginForm } from "@/components/auth/single-login-form"

export default function AdminLoginPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                <SingleLoginForm
                    role="admin"
                    title="Admin Login"
                    description="Access the admin dashboard"
                />
            </div>
        </div>
    )
}
