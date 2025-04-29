import { useState } from "react";
import { useLocation } from "wouter";
import InterviewForm from "@/components/InterviewForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Home = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  
  const handleSubmit = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      
      // Submit the form to the API without any LinkedIn URL
      // (LinkedIn integration has been removed)
      const response = await fetch("/api/interview/generate", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate interview");
      }
      
      const data = await response.json();
      setLocation(`/interview/${data.id}`);
    } catch (error) {
      console.error("Error submitting form:", error);
      // Error handling would go here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
            Prepare for your next interview with AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your resume and provide a job link to get personalized interview preparation, questions, and talking points.
          </p>
        </div>
        
        <div className="mb-12">
          <InterviewForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 my-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-3 text-blue-700">Job Analysis</h3>
            <p className="text-gray-600">
              Our AI analyzes the job posting to understand requirements, company culture, and key skill needs.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-3 text-purple-600">Profile Matching</h3>
            <p className="text-gray-600">
              We match your resume and LinkedIn profile to the job requirements to identify strengths and gaps.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-3 text-blue-700">Interview Preparation</h3>
            <p className="text-gray-600">
              Get personalized interview questions, talking points, and practice tools for your specific job.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;