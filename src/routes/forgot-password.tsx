import { useState } from "react"
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
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

export const Route = createFileRoute("/forgot-password")({
    beforeLoad() {
        if (auth.isAuthenticated()) {
            throw redirect({ to: "/" })
        }
    },
    validateSearch: (search: Record<string, unknown>): { email?: string } => {
        const email = typeof search.email === "string" ? search.email : ""
        return email ? { email } : {}
    },
    component: ForgotPasswordPage,
})

const schema = z.object({
    email: z.string().trim().email("Enter a valid email address"),
})

type FormValues = z.infer<typeof schema>

function ForgotPasswordPage() {
    usePageTitle("Forgot password")

    const router = useRouter()
    const { email = "" } = Route.useSearch()
    const [serverError, setServerError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: standardSchemaResolver(schema),
        defaultValues: { email },
    })

    async function onSubmit(values: FormValues) {
        setServerError(null)
        try {
            const message = await api.forgetPassword({ email: values.email.trim() })
            toast.success(message)
            await router.navigate({
                to: "/reset-password",
                search: { email: values.email.trim() },
            })
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Could not send a reset code. Please try again."
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
                        <CardTitle className="text-xl">Forgot password</CardTitle>
                        <CardDescription>
                            Enter your email and we will send a code by SMS and email.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

                            {serverError && (
                                <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                                    {serverError}
                                </p>
                            )}

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Sending code…" : "Send code"}
                            </Button>

                            <p className="text-muted-foreground text-center text-sm">
                                <Link
                                    to="/login"
                                    className="text-primary font-medium underline-offset-4 hover:underline"
                                >
                                    Back to login
                                </Link>
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
