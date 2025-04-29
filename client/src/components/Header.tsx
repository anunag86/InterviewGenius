import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LuLogOut } from "react-icons/lu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const Header = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check authentication status when component mounts
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(data.isAuthenticated);
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLogout = () => {
    window.location.href = '/auth/logout';
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.username) return "?";
    
    const nameParts = user.username.split(" ");
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 1).toUpperCase();
    } else {
      return (nameParts[0].substring(0, 1) + nameParts[nameParts.length - 1].substring(0, 1)).toUpperCase();
    }
  };

  return (
    <header className="bg-card shadow-sm rounded-b-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="flex items-center cursor-pointer">
            <span className="text-primary text-xl font-bold mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">PrepTalk</h1>
          </Link>
          
          <div className="flex items-center space-x-4">
            <nav>
              <ul className="flex space-x-4">
                <li>
                  <Link href="/" className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                    About
                  </Link>
                </li>
              </ul>
            </nav>
            
            {isAuthenticated && (
              <div className="flex items-center ml-4">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 border border-primary/30">
                    {user?.profilePicture ? (
                      <AvatarImage src={user.profilePicture} alt={user?.username || "User"} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground mx-3">
                    {user?.username}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LuLogOut className="h-4 w-4 mr-1" />
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
