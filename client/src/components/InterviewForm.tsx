import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  jobUrl: z.string().url("Please enter a valid URL").min(1, "Job posting URL is required"),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").min(1, "LinkedIn profile URL is required"),
});

interface InterviewFormProps {
  onSubmit: (formData: FormData) => void;
  isSubmitting: boolean;
}

const InterviewForm = ({ onSubmit, isSubmitting }: InterviewFormProps) => {
  const { toast } = useToast();
  const { 
    selectedFile, 
    fileInputRef, 
    fileName, 
    handleFileChange, 
    handleDragOver, 
    handleDrop 
  } = useFileUpload([".doc", ".docx"]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobUrl: "",
      linkedinUrl: "",
    },
  });

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    if (!selectedFile) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume document",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("jobUrl", values.jobUrl);
    formData.append("linkedinUrl", values.linkedinUrl);
    formData.append("resume", selectedFile);

    onSubmit(formData);
  };

  return (
    <section className="mb-12 bg-card rounded-xl shadow-sm p-6 md:p-8 border border-border" id="input-form">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">Tell us about the opportunity</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Job Posting URL Input */}
          <FormField
            control={form.control}
            name="jobUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  Job Posting URL
                </FormLabel>
                <FormControl>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <Input
                      {...field}
                      placeholder="https://example.com/job-posting"
                      className="pl-10 py-3 border-border focus:border-primary focus:ring-primary"
                    />
                  </div>
                </FormControl>
                <p className="mt-1 text-xs text-muted-foreground">Enter the full URL of the job posting you're applying for</p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Resume Upload */}
          <div>
            <FormLabel className="block text-sm font-medium text-foreground mb-1">
              Resume Upload
            </FormLabel>
            <div 
              className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-md bg-muted/50 hover:bg-muted transition-colors duration-200"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="space-y-1 text-center">
                <div className="flex text-sm text-foreground">
                  <label htmlFor="resume-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-secondary transition-colors duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                    <span>Upload a file</span>
                    <input 
                      id="resume-upload" 
                      name="resume" 
                      type="file" 
                      className="sr-only" 
                      accept=".doc,.docx" 
                      onChange={handleFileChange}
                      ref={fileInputRef}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Word Document (.doc or .docx)
                </p>
                {fileName && (
                  <div className="text-sm text-foreground mt-2 bg-secondary/20 py-1 px-2 rounded">
                    <span className="font-medium">Selected file:</span> <span>{fileName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LinkedIn URL Input */}
          <FormField
            control={form.control}
            name="linkedinUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  LinkedIn Profile URL
                </FormLabel>
                <FormControl>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v6h4v-6M4 10a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
                      </svg>
                    </div>
                    <Input
                      {...field}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="pl-10 py-3 border-border focus:border-primary focus:ring-primary"
                    />
                  </div>
                </FormControl>
                <p className="mt-1 text-xs text-muted-foreground">Enter your LinkedIn profile URL</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-center pt-4">
            <Button 
              type="submit" 
              className="px-8 py-3 rounded-md shadow-md hover:shadow-lg text-foreground bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : "Generate Interview Prep"}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
};

export default InterviewForm;
