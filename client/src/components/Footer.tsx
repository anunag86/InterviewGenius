import { Link } from "wouter";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-50 border-t py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
                PrepTalk
              </span>
            </Link>
            <p className="text-sm text-gray-500 mt-1">
              AI-powered interview preparation
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <Link href="/" className="text-gray-600 hover:text-blue-600 text-sm">
              Home
            </Link>
            <Link href="/privacy" className="text-gray-600 hover:text-blue-600 text-sm">
              Privacy Policy
            </Link>
            <a 
              href="mailto:support@preptalk.ai" 
              className="text-gray-600 hover:text-blue-600 text-sm"
            >
              Contact
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} PrepTalk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;