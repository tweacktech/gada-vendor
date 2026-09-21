import { useEffect, useState } from "react"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { api, ApiError } from "@/lib/api"
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

export const Route = createFileRoute("/set-password")({
    validateSearch: (search: Record<string, unknown>) => ({
        token: typeof search.token === "string" ? search.token : "",
        email: typeof search.email === "string" ? search.email : "",
    }),
    component: SetPasswordPage,
})

const schema = z
    .object({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirm_password: z.string().min(1, "Please confirm your password"),
    })
    .refine((values) => values.password === values.confirm_password, {
        message: "Passwords do not match",
        path: ["confirm_password"],
    })

type FormValues = z.infer<typeof schema>
type TokenValidationState = "checking" | "valid" | "invalid"

function SetPasswordPage() {
    usePageTitle("Set Password")

    const router = useRouter()
    const { token, email } = Route.useSearch()

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [validationState, setValidationState] = useState<TokenValidationState>("checking")
    const [validationError, setValidationError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: standardSchemaResolver(schema),
    })

    useEffect(() => {
        if (!email || !token) {
            setValidationState("invalid")
            setValidationError("This password link is incomplete. Please use the full link from your email.")
            return
        }

        let isActive = true

        setValidationState("checking")
        setValidationError(null)

        api.validateSetPasswordToken({ email, token })
            .then(() => {
                if (!isActive) {
                    return
                }
                setValidationState("valid")
            })
            .catch((err) => {
                if (!isActive) {
                    return
                }
                const message =
                    err instanceof ApiError
                        ? err.message
                        : "This link is invalid or has expired."
                setValidationState("invalid")
                setValidationError(message)
            })

        return () => {
            isActive = false
        }
    }, [email, token])

    async function onSubmit(values: FormValues) {
        if (validationState !== "valid") {
            return
        }

        setServerError(null)

        try {
            await api.setPassword({
                email,
                token,
                password: values.password,
                password_confirmation: values.confirm_password,
            })

            toast.success("Password set successfully")
            await router.navigate({ to: "/login" })
        } catch (err) {
            const message =
                err instanceof ApiError
                    ? err.message
                    : "Could not set password. Please try again."
            setServerError(message)
        }
    }

    return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-8">
                <div className="flex flex-col items-center gap-3">
                    <img src="/gadaride-logo.png" alt="Logo" className="w-24" />
                </div>

                <Card>
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl">Set your password</CardTitle>
                        <CardDescription>
                            Create a password for your vendor admin account.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {validationState === "checking" && (
                            <div className="text-muted-foreground flex items-center gap-2 rounded-md border p-3 text-sm">
                                <Loader2Icon className="size-4 animate-spin" />
                                Validating password link...
                            </div>
                        )}

                        {validationState === "invalid" && (
                            <div className="space-y-3">
                                <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                                    {validationError ?? "This link is invalid or has expired."}
                                </p>
                                <Button asChild variant="outline" className="w-full">
                                    <Link to="/login">Back to login</Link>
                                </Button>
                            </div>
                        )}

                        {validationState === "valid" && (
                            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label>Email</Label>
                                    <div className="bg-muted rounded-md px-3 py-2 text-sm font-medium break-all">
                                        {email}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
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

                                <div className="space-y-1.5">
                                    <Label htmlFor="confirm_password">Confirm password</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirm_password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            className="pr-10"
                                            aria-invalid={!!errors.confirm_password}
                                            {...register("confirm_password")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((v) => !v)}
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
                                    {errors.confirm_password && (
                                        <p className="text-destructive text-xs">{errors.confirm_password.message}</p>
                                    )}
                                </div>

                                {serverError && (
                                    <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                                        {serverError}
                                    </p>
                                )}

                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? "Setting password..." : "Set password"}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
