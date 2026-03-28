import { Check } from "lucide-react"

interface BookingStepperProps {
    currentStep: number
}

const steps = [
    { id: 1, name: "Passenger Details" },
    { id: 2, name: "Seat Selection" },
    { id: 3, name: "Review & Pay" },
]

export function BookingStepper({ currentStep }: BookingStepperProps) {
    return (
        <nav aria-label="Progress" className="w-full">
            <ol role="list" className="flex flex-row items-center w-full">
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className="relative flex flex-col items-center flex-1">
                        {/* Connecting Line */}
                        {stepIdx !== steps.length - 1 && (
                            <div className="absolute top-4 left-[50%] w-full flex items-center" aria-hidden="true">
                                <div className={`h-0.5 w-full ${step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                            </div>
                        )}
                        
                        {/* Step Circle */}
                        {step.id < currentStep ? (
                            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 z-10 shrink-0">
                                <Check className="h-5 w-5 text-white" aria-hidden="true" />
                                <span className="sr-only">{step.name}</span>
                            </div>
                        ) : step.id === currentStep ? (
                            <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-white z-10 shrink-0" aria-current="step">
                                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden="true" />
                                <span className="sr-only">{step.name}</span>
                            </div>
                        ) : (
                            <div className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white z-10 shrink-0">
                                <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                                <span className="sr-only">{step.name}</span>
                            </div>
                        )}
                        
                        {/* Step Label Centered Below */}
                        <span className={`mt-2 text-xs font-medium whitespace-nowrap ${step.id <= currentStep ? 'text-blue-900' : 'text-gray-500'}`}>
                            {step.name}
                        </span>
                    </li>
                ))}
            </ol>
        </nav>
    )
}
