"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Offcanvas({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

function OffcanvasTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />
}

function OffcanvasClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />
}

function OffcanvasPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal {...props} />
}

function OffcanvasOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "fixed inset-0 z-50 bg-black/70",
        className
      )}
      {...props}
    />
  )
}

function OffcanvasContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <OffcanvasPortal>
      <OffcanvasOverlay />
      <DialogPrimitive.Content
        data-slot="offcanvas-content"
        className={cn(
          "bg-black text-white",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "fixed z-50 flex flex-col shadow-lg transition ease-in-out",
          "data-[state=closed]:duration-300 data-[state=open]:duration-500",
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 text-white/70 hover:text-white focus:outline-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </OffcanvasPortal>
  )
}

function OffcanvasHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="offcanvas-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />
  )
}

function OffcanvasFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="offcanvas-footer" className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
  )
}

function OffcanvasTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title data-slot="offcanvas-title" className={cn("text-foreground font-semibold", className)} {...props} />
  )
}

function OffcanvasDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description data-slot="offcanvas-description" className={cn("text-muted-foreground text-sm", className)} {...props} />
  )
}

export {
  Offcanvas,
  OffcanvasTrigger,
  OffcanvasClose,
  OffcanvasContent,
  OffcanvasHeader,
  OffcanvasFooter,
  OffcanvasTitle,
  OffcanvasDescription,
}