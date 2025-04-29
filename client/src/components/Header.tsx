import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const Header = () => {
  // No authentication - all users have full access
  const isAuthenticated = true;

  return (
    <header className="bg-white border-b shadow-sm py-3">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
            PrepTalk
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">
            Home
          </Link>
          <Link href="/history" className="text-gray-700 hover:text-blue-600 font-medium">
            My Interviews
          </Link>
          <Link href="/privacy" className="text-gray-700 hover:text-blue-600 font-medium">
            Privacy
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {/* No authentication UI needed */}
        </div>
      </div>
    </header>
  );
};

export default Header;