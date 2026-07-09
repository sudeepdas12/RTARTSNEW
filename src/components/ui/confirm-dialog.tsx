import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
}

const iconMap = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
};

const buttonStyles = {
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  warning: "bg-amber-600 text-white hover:bg-amber-700",
  info: "bg-primary text-primary-foreground hover:bg-primary/90",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const Icon = iconMap[variant];

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className={cn(
              "grid h-10 w-10 place-items-center rounded-full",
              variant === "danger" && "bg-destructive/10 text-destructive",
              variant === "warning" && "bg-amber-100 text-amber-600",
              variant === "info" && "bg-primary/10 text-primary"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogPrimitive.Title className="text-lg font-semibold">{title}</AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel
              className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              {cancelLabel}
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              className={cn("inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium", buttonStyles[variant])}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}