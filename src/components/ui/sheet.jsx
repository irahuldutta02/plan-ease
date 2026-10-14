"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * A bottom sheet on phones and a centred dialog from `md:` up.
 * `footer` stays pinned below the scrolling body (thumb-zone actions).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  tall = false,
}) {
  const desktop = useMediaQuery("(min-width: 768px)");

  const header = (Title, Description) => (
    <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 md:pt-5">
      <div className="min-w-0">
        <Title className="text-lg font-semibold tracking-tight">{title}</Title>
        {description ? (
          <Description className="mt-1 text-sm text-muted-foreground">
            {description}
          </Description>
        ) : (
          <Description className="sr-only">{title}</Description>
        )}
      </div>
      {desktop && (
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon" aria-label="Close">
            <X className="size-5" aria-hidden="true" />
          </Button>
        </Dialog.Close>
      )}
    </div>
  );

  const body = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
      {footer && (
        <div className="flex gap-3 border-t border-border bg-card px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {footer}
        </div>
      )}
    </>
  );

  if (desktop) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className={cn(
              "fixed top-1/2 left-1/2 z-50 flex max-h-[85dvh] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl bg-card pb-2 text-card-foreground shadow-card",
              tall && "h-[85dvh]",
            )}
          >
            {header(Dialog.Title, Dialog.Description)}
            {body}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-card text-card-foreground outline-none",
            tall && "h-[92dvh]",
          )}
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-border"
          />
          {header(Drawer.Title, Drawer.Description)}
          {body}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Confirmation as a sheet: used for reset and delete. */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="h-1" />
    </Sheet>
  );
}
