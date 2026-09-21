import { useEffect, useMemo, useRef } from "react"
import { ImageIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

interface ProductImagePickerProps {
    id?: string
    label?: string
    /** The staged file to upload, or null if none has been picked. */
    value: File | null
    onChange: (file: File | null) => void
    /**
     * The product's current image URL (edit mode). Shown until the admin
     * stages a new file; staging one previews it instead, but doesn't
     * touch the existing image server-side until the form is submitted.
     */
    existingImageUrl?: string | null
    disabled?: boolean
}

export function ProductImagePicker({
    id = "image",
    label = "Product Image",
    value,
    onChange,
    existingImageUrl,
    disabled,
}: ProductImagePickerProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    // Object URLs are scoped to a single File and must be revoked, or they
    // leak for the lifetime of the tab. Deriving the URL during render (via
    // useMemo) keeps it in sync with `value` for free; the effect below only
    // handles cleanup of the *previous* URL, never sets state.
    const stagedPreviewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])
    useEffect(() => {
        return () => {
            if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl)
        }
    }, [stagedPreviewUrl])

    const previewUrl = stagedPreviewUrl ?? existingImageUrl ?? null
    const hasStagedFile = value !== null

    const helperText = useMemo(() => {
        if (hasStagedFile) return value!.name
        if (existingImageUrl) return "Current image shown. Choose a new file to replace it."
        return "PNG or JPG, up to 5MB."
    }, [hasStagedFile, value, existingImageUrl])

    function handleFileSelected(file: File | undefined | null) {
        if (!file) {
            onChange(null)
            return
        }
        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file.")
            return
        }
        if (file.size > MAX_FILE_BYTES) {
            toast.error("Image must be 5MB or smaller.")
            return
        }
        onChange(file)
    }

    function handleClearStaged() {
        onChange(null)
        if (inputRef.current) inputRef.current.value = ""
    }

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex items-center gap-4">
                <div
                    className={cn(
                        "bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border"
                    )}
                >
                    {previewUrl ? (
                        <img src={previewUrl} alt="Product preview" className="size-full object-cover" />
                    ) : (
                        <ImageIcon className="text-muted-foreground size-6" />
                    )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            onClick={() => inputRef.current?.click()}
                        >
                            {previewUrl ? "Change Image" : "Choose Image"}
                        </Button>
                        {hasStagedFile && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                disabled={disabled}
                                onClick={handleClearStaged}
                                aria-label="Remove selected image"
                            >
                                <XIcon className="size-4" />
                            </Button>
                        )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">{helperText}</p>
                </div>
            </div>

            <input
                ref={inputRef}
                id={id}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={disabled}
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
        </div>
    )
}
