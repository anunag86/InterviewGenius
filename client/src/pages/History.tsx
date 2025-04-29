import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getInterviewHistory, InterviewHistoryItem } from "@/lib/openai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { BriefcaseIcon, CalendarIcon, ClockIcon, ChevronRightIcon } from "lucide-react";

const History = () => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [historyItems, setHistoryItems] = useState<InterviewHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const history = await getInterviewHistory();
        setHistoryItems(history);
      } catch (error) {
        console.error("Error fetching history:", error);
        toast({
          title: "Error",
          description: "Failed to load interview history.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [toast]);

  const handleNewPrep = () => {
    setLocation("/");
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return "Unknown";
    }
  };

  const formatExpiryDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const daysLeft = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return `${daysLeft} days left`;
    } catch (error) {
      return "Unknown";
    }
  };

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Your Interview Preparations
            </h1>
            <p className="text-muted-foreground">
              Your previous interview preparations are saved for 30 days
            </p>
          </div>
          <Button onClick={handleNewPrep} className="bg-primary hover:bg-primary/90">
            New Preparation
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))
          ) : historyItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <h3 className="text-xl font-medium text-muted-foreground mb-4">
                No interview preparations yet
              </h3>
              <p className="mb-6 text-muted-foreground">
                Create your first interview preparation to get started
              </p>
              <Button onClick={handleNewPrep} className="bg-primary hover:bg-primary/90">
                Create New Preparation
              </Button>
            </div>
          ) : (
            historyItems.map((item) => (
              <Card key={item.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">{item.jobTitle}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <BriefcaseIcon size={14} />
                    {item.company}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1">
                      <CalendarIcon size={14} />
                      <span>Created {formatTimeAgo(item.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon size={14} />
                      <span>{formatExpiryDate(item.expiresAt)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/interview/${item.id}`}>
                    <Button variant="outline" className="w-full flex items-center justify-between">
                      <span>View Details</span>
                      <ChevronRightIcon size={16} />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default History;