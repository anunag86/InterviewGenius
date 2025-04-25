import { Link } from "wouter";

const Header = () => {
  return (
    <header className="bg-card shadow-sm rounded-b-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <span className="text-primary text-xl font-bold mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <Link href="/">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer">InterviewPrepAI</h1>
            </Link>
          </div>
          <nav>
            <ul className="flex space-x-4">
              <li>
                <Link href="/" className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                  About
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
