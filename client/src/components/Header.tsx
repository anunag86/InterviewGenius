import { Link } from "wouter";
import UserProfileDisplay from "./UserProfileDisplay";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const { user } = useAuth();
  
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
          
          <div className="flex items-center">
            <nav className="mr-6">
              <ul className="flex space-x-4">
                <li>
                  <Link href="/" className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                    Home
                  </Link>
                </li>
                {user && (
                  <li>
                    <Link href="/history" className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                      History
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
            
            <UserProfileDisplay compact />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
