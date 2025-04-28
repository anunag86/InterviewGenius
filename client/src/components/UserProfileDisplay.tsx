import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useLocation } from "wouter";

const UserProfileDisplay = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated || !user) {
    return null;
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.displayName?.substring(0, 2).toUpperCase() || "U";
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 p-1 px-2 h-auto">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profilePictureUrl} alt={user.displayName || ""} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline">{user.displayName}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => window.open(user.linkedinProfileUrl, "_blank")}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>LinkedIn Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLocation("/history")}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Interview History</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfileDisplay;