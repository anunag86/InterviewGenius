import { Link } from "wouter";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-12 rounded-t-lg shadow-sm">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <span className="text-primary text-xl font-bold mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">InterviewPrepAI</span>
          </div>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors duration-200">
              <span className="sr-only">Privacy</span>
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors duration-200">
              <span className="sr-only">Terms</span>
              Terms of Service
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors duration-200">
              <span className="sr-only">Contact</span>
              Contact Us
            </Link>
          </div>
          <div className="mt-4 md:mt-0 text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} InterviewPrepAI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
