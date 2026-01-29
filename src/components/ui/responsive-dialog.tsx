"use client";

import * as React from "react";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface ResponsiveDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ResponsiveDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogTriggerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

interface ResponsiveDialogCloseProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

// Context to share mobile state
const ResponsiveDialogContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
});

const useResponsiveDialog = () => React.useContext(ResponsiveDialogContext);

// Main ResponsiveDialog component
const ResponsiveDialog = ({ children, open, onOpenChange }: ResponsiveDialogProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ResponsiveDialogContext.Provider value={{ isMobile: true }}>
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      </ResponsiveDialogContext.Provider>
    );
  }

  return (
    <ResponsiveDialogContext.Provider value={{ isMobile: false }}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    </ResponsiveDialogContext.Provider>
  );
};

// Content
const ResponsiveDialogContent = ({ children, className }: ResponsiveDialogContentProps) => {
  const { isMobile } = useResponsiveDialog();

  if (isMobile) {
    return (
      <DrawerContent className={cn("max-h-[96vh]", className)}>
        <div className="overflow-y-auto max-h-[calc(96vh-2rem)] pb-safe">
          {children}
        </div>
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={className}>
      {children}
    </DialogContent>
  );
};

// Header
const ResponsiveDialogHeader = ({ children, className }: ResponsiveDialogHeaderProps) => {
  const { isMobile } = useResponsiveDialog();

  if (isMobile) {
    return <DrawerHeader className={className}>{children}</DrawerHeader>;
  }

  return <DialogHeader className={className}>{children}</DialogHeader>;
};

// Footer
const ResponsiveDialogFooter = ({ children, className }: ResponsiveDialogFooterProps) => {
  const { isMobile } = useResponsiveDialog();

  if (isMobile) {
    return <DrawerFooter className={className}>{children}</DrawerFooter>;
  }

  return <DialogFooter className={className}>{children}</DialogFooter>;
};

// Title
const ResponsiveDialogTitle = ({ children, className }: ResponsiveDialogTitleProps) => {
  const { isMobile } = useResponsiveDialog();

  if (isMobile) {
    return <DrawerTitle className={className}>{children}</DrawerTitle>;
  }

  return <DialogTitle className={className}>{children}</DialogTitle>;
};

// Description
const ResponsiveDialogDescription = ({ children, className }: ResponsiveDialogDescriptionProps) => {
  const { isMobile } = useResponsiveDialog();

  if (isMobile) {
    return <DrawerDescription className={className}>{children}</DrawerDescription>;
  }

  return <DialogDescription className={className}>{children}</DialogDescription>;
};

// Trigger
const ResponsiveDialogTrigger = ({ children, className, asChild }: ResponsiveDialogTriggerProps) => {
  const { isMobile } = useResponsiveDialog();

  if (isMobile) {
    return <DrawerTrigger className={className} asChild={asChild}>{children}</DrawerTrigger>;
  }

  return <DialogTrigger className={className} asChild={asChild}>{children}</DialogTrigger>;
};

// Close
const ResponsiveDialogClose = ({ children, className, asChild }: ResponsiveDialogCloseProps) => {
  const { isMobile } = useResponsiveDialog();

  if (isMobile) {
    return <DrawerClose className={className} asChild={asChild}>{children}</DrawerClose>;
  }

  return <DialogClose className={className} asChild={asChild}>{children}</DialogClose>;
};

// Body - a helper for scrollable content area
const ResponsiveDialogBody = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => {
  return (
    <div className={cn("px-4 sm:px-6", className)}>
      {children}
    </div>
  );
};

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogBody,
  useResponsiveDialog,
};
