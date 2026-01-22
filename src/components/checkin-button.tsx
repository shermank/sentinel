"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";

export function CheckInButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/checkin", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Check-in confirmed",
          description: "Your status has been updated. Stay safe!",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to check in",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleCheckIn} disabled={loading} size="lg">
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="mr-2 h-4 w-4" />
      )}
      I&apos;m OK
    </Button>
  );
}
