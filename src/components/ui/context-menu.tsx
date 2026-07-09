import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";

export function ContextMenu({ children, items }: { children: React.ReactNode; items: { label: string; icon?: React.ReactNode; onClick: () => void; disabled?: boolean; separator?: boolean }[] }) {
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="z-50 min-w-48 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {items.map((item, idx) => (
            <div key={idx}>
              {item.separator && <ContextMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />}
              <ContextMenuPrimitive.Item
                disabled={item.disabled}
                className={cn(
                  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                )}
                onClick={item.onClick}
              >
                {item.icon}
                {item.label}
              </ContextMenuPrimitive.Item>
            </div>
          ))}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}