import { X } from 'lucide-react';
import { Dialog as D, DropdownMenu as DM, Switch as SW, Tabs as T, Tooltip as TT } from 'radix-ui';
import * as React from 'react';
import { cn } from '../lib/cn';

/* ------------------------------ Dialog / Modal ------------------------------ */
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof D.Content> {
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

/** No celular abre como "folha" a partir da base; no desktop, centralizado. Nunca maior que a tela. */
export function DialogContent({
  title,
  description,
  size = 'md',
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-[#06101c]/55 backdrop-blur-[2px] data-[state=open]:animate-[rf-fade_150ms_ease-out]" />
      <D.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-xl border bg-card text-card-foreground shadow-xl outline-none',
          'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-3xl',
          'data-[state=open]:animate-[rf-rise_180ms_ease-out]',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <D.Title className="text-lg font-bold leading-snug">{title}</D.Title>
            {description ? (
              <D.Description className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close
            className="-mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          {children}
        </div>
      </D.Content>
    </D.Portal>
  );
}
export const Modal = Dialog;
export const ModalContent = DialogContent;

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

/* --------------------------------- Drawer ---------------------------------- */
export const Drawer = D.Root;
export const DrawerTrigger = D.Trigger;

export function DrawerContent({
  title,
  description,
  side = 'right',
  className,
  children,
  ...props
}: DialogContentProps & { side?: 'right' | 'left' | 'bottom' }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-[#06101c]/55" />
      <D.Content
        className={cn(
          'fixed z-50 flex flex-col bg-card text-card-foreground shadow-xl outline-none',
          side === 'right' && 'inset-y-0 right-0 w-[min(92vw,26rem)] border-l',
          side === 'left' && 'inset-y-0 left-0 w-[min(86vw,20rem)] border-r',
          side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t',
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <D.Title className="truncate text-lg font-bold">{title}</D.Title>
            {description ? (
              <D.Description className="text-sm text-muted-foreground">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close
            className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </D.Content>
    </D.Portal>
  );
}

/* ---------------------------------- Tabs ----------------------------------- */
export const Tabs = T.Root;
export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof T.List>) {
  return (
    <T.List
      className={cn(
        'flex w-full max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 [scrollbar-width:none]',
        className,
      )}
      {...props}
    />
  );
}
export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        'inline-flex min-h-10 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}
export const TabsContent = T.Content;

/* ------------------------------ Dropdown menu ------------------------------ */
export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;
export function DropdownMenuContent({
  className,
  align = 'end',
  ...props
}: React.ComponentPropsWithoutRef<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-48 rounded-lg border bg-card p-1 text-card-foreground shadow-lg',
          className,
        )}
        {...props}
      />
    </DM.Portal>
  );
}
export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DM.Item>) {
  return (
    <DM.Item
      className={cn(
        'flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm outline-none data-[highlighted]:bg-muted [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DM.Label>) {
  return (
    <DM.Label
      className={cn('px-2.5 py-1.5 text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  );
}
export const DropdownMenuSeparator = () => <DM.Separator className="my-1 h-px bg-border" />;

/* --------------------------------- Tooltip --------------------------------- */
export const TooltipProvider = TT.Provider;
export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <TT.Root>
      <TT.Trigger asChild>{children}</TT.Trigger>
      <TT.Portal>
        <TT.Content
          sideOffset={6}
          className="z-50 max-w-64 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background"
        >
          {content}
        </TT.Content>
      </TT.Portal>
    </TT.Root>
  );
}

/* --------------------------------- Switch ---------------------------------- */
export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SW.Root> {
  label: string;
  description?: string;
}
export function Switch({ label, description, id, className, ...props }: SwitchProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2', className)}>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </label>
      <SW.Root
        id={id}
        className="relative h-7 w-12 shrink-0 cursor-pointer rounded-full bg-input transition-colors data-[state=checked]:bg-primary"
        {...props}
      >
        <SW.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[1.375rem]" />
      </SW.Root>
    </div>
  );
}
