import { UserProfile } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

interface UserProfileDisplayProps {
  compact?: boolean;
}

const UserProfileDisplay = ({ compact = false }: UserProfileDisplayProps) => {
  const { user, logout, isLoading } = useAuth();

  if (!user) {
    return (
      <Link href="/login">
        <Button variant="outline" size={compact ? "sm" : "default"}>
          Sign In
        </Button>
      </Link>
    );
  }

  const userInitials = user.displayName
    ? user.displayName
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage src={user.profilePictureUrl} alt={user.displayName || "User"} />
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => logout()}
          disabled={isLoading}
          className="text-xs"
        >
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-10 w-10 border border-border">
        <AvatarImage src={user.profilePictureUrl} alt={user.displayName || "User"} />
        <AvatarFallback>{userInitials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col">
        <span className="font-medium text-sm">{user.displayName}</span>
        <a 
          href={user.linkedinProfileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary"
        >
          View LinkedIn Profile
        </a>
      </div>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => logout()}
        disabled={isLoading}
      >
        Sign Out
      </Button>
    </div>
  );
};

export default UserProfileDisplay;