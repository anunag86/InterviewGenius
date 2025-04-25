import * as React from "react";
import { cn } from "@/lib/utils";

// I'm creating a custom tabs component that resembles the design shown in the reference
// This is different from the standard shadcn tabs component

export interface TabProps extends React.HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function TabButton({ className, active, ...props }: TabProps) {
  return (
    <button
      className={cn(
        "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
        active 
          ? "border-indigo-500 text-indigo-600" 
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
        className
      )}
      {...props}
    />
  );
}

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  hidden?: boolean;
}

export function TabPanel({ 
  className, 
  hidden = false, 
  ...props 
}: TabPanelProps) {
  return (
    <div
      className={cn(
        "tab-panel",
        hidden && "hidden",
        className
      )}
      {...props}
    />
  );
}

export function TabsNav({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mb-6 border-b border-gray-200",
        className
      )}
      {...props}
    />
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <nav
      className={cn(
        "-mb-px flex space-x-8",
        className
      )}
      {...props}
    />
  );
}
