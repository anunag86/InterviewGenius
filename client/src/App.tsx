import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import History from "@/pages/History";
import InterviewDetail from "@/pages/InterviewDetail";
import PrivacyPolicy from "@/pages/PrivacyPolicy"; // Added import for PrivacyPolicy

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/history" component={History} />
      <Route path="/interview/:id" component={InterviewDetail} />
      <Route path="/privacy" component={PrivacyPolicy} /> {/* Added PrivacyPolicy route */}
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

// Added PrivacyPolicy component (placeholder - replace with actual content)
const PrivacyPolicy = () => {
  return (
    <div>
      <h1>Privacy Policy</h1>
      <p>
        At PreTalk, we value your privacy. We use third-party APIs like LinkedIn and
        Google to collect only basic profile information (name, email address) for
        authentication purposes. We use your work experience details from your resume
        and your public LinkedIn profile to provide valuable advice. We do not sell,
        trade, or rent your personal information to others. For questions about your
        data, please use our application's feedback page. This page was updated
        today.
      </p>
      <p>PreTalk Team</p>
    </div>
  );
};


// Example Footer component (placeholder - replace with your actual Footer)
const Footer = () => {
  return (
    <footer>
      <a href="/privacy">Privacy Policy</a>
    </footer>
  );
};

//Example of how to include the footer (replace with actual usage)
// function MyComponent() {
//   return (
//     <div>
//       <Footer />
//     </div>
//   )
// }