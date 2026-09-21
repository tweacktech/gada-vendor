import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
import { useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

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

// ── Route definition ─────────────────────────────────────────────────────────

export const Route = createFileRoute("/login")({
    beforeLoad() {
        if (auth.isAuthenticated()) {
            throw redirect({ to: "/" })
        }
    },
    component: LoginPage,
})

// ── Validation schema ─────────────────────────────────────────────────────────

const schema = z.object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(1, "Password is required"),
})

type FormValues = z.infer<typeof schema>

// ── Component ─────────────────────────────────────────────────────────────────

function LoginPage() {
    usePageTitle("Login")

    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: standardSchemaResolver(schema),
    })

    async function onSubmit(values: FormValues) {
        setServerError(null)
        try {
            await api.login(values.email, values.password)
            await router.navigate({ to: "/" })
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Invalid email or password."
            setServerError(message)
        }
    }

    return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-8">
                {/* Brand */}
                <div className="flex flex-col items-center gap-3">
                    <div className="">
                        <img src="/gadaride-logo.png" alt="Logo" className="w-48" />
                    </div>
                    
                </div>

                <Card>
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl">Welcome back</CardTitle>
                        <CardDescription>
                            Enter your credentials to access the dashboard.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                            {/* Email */}
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    aria-invalid={!!errors.email}
                                    {...register("email")}
                                />
                                {errors.email && (
                                    <p className="text-destructive text-xs">{errors.email.message}</p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="pr-10"
                                        aria-invalid={!!errors.password}
                                        {...register("password")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
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

                            {/* Server-level error */}
                            {serverError && (
                                <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                                    {serverError}
                                </p>
                            )}

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Signing in…" : "Sign in"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
