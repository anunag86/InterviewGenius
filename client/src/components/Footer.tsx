import { Link } from "wouter";
import FeedbackDialog from "./FeedbackDialog";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-12 rounded-t-lg shadow-sm">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <span className="text-primary text-xl font-bold mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </span>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">PrepTalk</span>
          </div>
          
          <div className="flex items-center mb-4 md:mb-0">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 border border-border shadow-sm">
                <img 
                  src="/images/author.jpg" 
                  alt="Anunag Jayanti" 
                  className="h-full w-full object-cover" 
                />
              </div>
              <div className="text-sm">
                <p className="font-medium text-foreground">Anunag Jayanti</p>
                <a 
                  href="https://www.linkedin.com/in/anunagjayanti/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors duration-200 text-xs"
                >
                  LinkedIn Profile
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-6">
            <FeedbackDialog />
            
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} PrepTalk. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
