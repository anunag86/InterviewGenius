import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const NotFound = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200">404</h1>
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Button 
          onClick={() => setLocation("/")}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Go Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;