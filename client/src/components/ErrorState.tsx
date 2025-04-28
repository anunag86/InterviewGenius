import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

const ErrorState = ({ title, message, onRetry }: ErrorStateProps) => {
  return (
    <div className="w-full flex flex-col items-center justify-center px-6 py-16 rounded-lg bg-red-100 border border-red-200">
      <div className="text-red-500 mb-4">
        <AlertCircle size={48} />
      </div>
      <h2 className="text-xl font-semibold text-red-600 mb-2">{title}</h2>
      <p className="text-center text-red-600/80 mb-6 max-w-md">{message}</p>
      {onRetry && (
        <Button 
          onClick={onRetry}
          variant="destructive"
          className="shadow-sm hover:shadow"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;