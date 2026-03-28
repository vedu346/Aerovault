import Navbar from "@/components/navbar"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                <RegisterForm />
            </div>
        </div>
    )
}
