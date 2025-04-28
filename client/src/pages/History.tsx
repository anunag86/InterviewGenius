import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface HistoryItem {
  id: string;
  jobTitle: string;
  company: string;
  createdAt: string;
  expiresAt: string;
}

const History = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/interview/history");
        
        if (!response.ok) {
          throw new Error("Failed to fetch interview history");
        }
        
        const data = await response.json();
        setHistory(data.interviews || []);
      } catch (error) {
        console.error("Error fetching history:", error);
        setError("Failed to load your interview history. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
            Interview History
          </h1>
          <p className="text-gray-600">
            Access your past interview preparations for the last 30 days.
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center my-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h3 className="text-xl font-semibold mb-2">No interview history found</h3>
                <p className="text-gray-600 mb-6">
                  You haven't created any interview preparations in the last 30 days.
                </p>
                <Button onClick={() => setLocation("/")}>
                  Create New Preparation
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {history.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{item.jobTitle}</CardTitle>
                  <CardDescription>{item.company}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">
                        Created: {formatDate(item.createdAt)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Expires: {formatDate(item.expiresAt)}
                      </p>
                    </div>
                    <Button
                      onClick={() => setLocation(`/interview/${item.id}`)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      View Preparation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default History;