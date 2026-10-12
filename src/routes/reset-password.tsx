import { useState } from "react"
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { toast } from "sonner"

import { auth } from "@/lib/auth"
import { api } from "@/lib/api"
import { usePageTitle } from "@/hooks/usePageTitle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/reset-password")({
    beforeLoad() {
        if (auth.isAuthenticated()) {
            throw redirect({ to: "/" })
        }
    },
    validateSearch: (search: Record<string, unknown>): { email?: string } => {
        const email = typeof search.email === "string" ? search.email : ""
        return email ? { email } : {}
    },
    component: ResetPasswordPage,
})

const schema = z
    .object({
        email: z.string().trim().email("Enter a valid email address"),
        otp: z.string().trim().min(1, "Enter the code"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        password_confirmation: z.string().min(1, "Confirm your password"),
    })
    .refine((values) => values.password === values.password_confirmation, {
        message: "Passwords do not match",
        path: ["password_confirmation"],
    })

type FormValues = z.infer<typeof schema>

function ResetPasswordPage() {
    usePageTitle("Reset password")

    const router = useRouter()
    const { email = "" } = Route.useSearch()
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: standardSchemaResolver(schema),
        defaultValues: {
            email,
            otp: "",
            password: "",
            password_confirmation: "",
        },
    })

    async function onSubmit(values: FormValues) {
        setServerError(null)
        try {
            const message = await api.resetPassword({
                email: values.email.trim(),
                otp: values.otp.trim(),
                password: values.password,
                password_confirmation: values.password_confirmation,
            })
            toast.success(message)
            await router.navigate({ to: "/login" })
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Could not reset the password. Please try again."
            setServerError(message)
        }
    }

    return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-12">
                <div className="flex flex-col items-center gap-3">
                    <img src="/gada_logo.png" alt="Logo" className="w-48" />
                </div>

                <Card>
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl">Reset password</CardTitle>
                        <CardDescription>
                            Enter the code we sent and choose a new password.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    aria-invalid={!!errors.email}
                                    {...register("email")}
                                />
                                {errors.email && (
                                    <p className="text-destructive text-xs">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="otp">Code</Label>
                                <Input
                                    id="otp"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    placeholder="123456"
                                    aria-invalid={!!errors.otp}
                                    {...register("otp")}
                                />
                                {errors.otp && (
                                    <p className="text-destructive text-xs">{errors.otp.message}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password">New password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        className="pr-10"
                                        aria-invalid={!!errors.password}
                                        {...register("password")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((value) => !value)}
                                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeOffIcon className="size-4" />
                                        ) : (
                                            <EyeIcon className="size-4" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-destructive text-xs">{errors.password.message}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password_confirmation">Confirm password</Label>
                                <div className="relative">
                                    <Input
                                        id="password_confirmation"
                                        type={showConfirmPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        className="pr-10"
                                        aria-invalid={!!errors.password_confirmation}
                                        {...register("password_confirmation")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((value) => !value)}
                                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOffIcon className="size-4" />
                                        ) : (
                                            <EyeIcon className="size-4" />
                                        )}
                                    </button>
                                </div>
                                {errors.password_confirmation && (
                                    <p className="text-destructive text-xs">
                                        {errors.password_confirmation.message}
                                    </p>
                                )}
                            </div>

                            {serverError && (
                                <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                                    {serverError}
                                </p>
                            )}

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Updating password…" : "Update password"}
                            </Button>

                            <p className="text-muted-foreground text-center text-sm">
                                <Link
                                    to="/forgot-password"
                                    search={{ email: watch("email") || email }}
                                    className="text-primary font-medium underline-offset-4 hover:underline"
                                >
                                    Send a new code
                                </Link>
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
