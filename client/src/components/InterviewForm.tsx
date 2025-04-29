import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";

interface InterviewFormProps {
  onSubmit: (formData: FormData) => void;
  isSubmitting: boolean;
}

const InterviewForm = ({ onSubmit, isSubmitting }: InterviewFormProps) => {
  const [jobUrl, setJobUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }
    
    const file = files[0];
    
    // Check file type
    if (
      file.type !== "application/msword" && // .doc
      file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
    ) {
      setFileError("Please upload a Word document (.doc or .docx)");
      setSelectedFile(null);
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setFileError("File size should be less than 10MB");
      setSelectedFile(null);
      return;
    }
    
    setFileError(null);
    setSelectedFile(file);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setFileError("Please upload your resume");
      return;
    }
    
    if (!jobUrl) {
      return;
    }
    
    const formData = new FormData();
    formData.append("jobUrl", jobUrl);
    formData.append("resume", selectedFile);
    
    // Add LinkedIn URL if provided
    if (linkedinUrl) {
      formData.append("linkedinUrl", linkedinUrl);
    }
    
    onSubmit(formData);
  };
  
  return (
    <Card className="border-2 border-blue-100">
      <CardHeader>
        <CardTitle>Create Interview Preparation</CardTitle>
        <CardDescription>
          Upload your resume and provide a job posting URL to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="jobUrl">Job Posting URL</Label>
            <Input
              id="jobUrl"
              placeholder="https://www.example.com/job-posting"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              Link to the job posting on LinkedIn, Indeed, or company website
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn Profile URL (optional)</Label>
            <Input
              id="linkedinUrl"
              placeholder="https://www.linkedin.com/in/yourprofile"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Your LinkedIn profile for enhanced job matching
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="resume">Resume (Word document)</Label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              <input
                id="resume"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
              <label
                htmlFor="resume"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <span className="text-sm font-medium mb-1">
                  {selectedFile ? selectedFile.name : "Upload your resume"}
                </span>
                <span className="text-xs text-gray-500">
                  .doc or .docx format, max 10MB
                </span>
              </label>
            </div>
            {fileError && (
              <p className="text-sm text-red-600">{fileError}</p>
            )}
          </div>
          
          <Button
            type="submit"
            disabled={isSubmitting || !jobUrl || !selectedFile}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Prepare for Interview"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default InterviewForm;