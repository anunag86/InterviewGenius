import { useState, useRef, ChangeEvent } from 'react';

interface UseFileUploadReturn {
  selectedFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  fileName: string;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  clearFile: () => void;
}

export function useFileUpload(acceptedTypes: string[] = []): UseFileUploadReturn {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFileType = (file: File): boolean => {
    if (acceptedTypes.length === 0) return true;
    const fileType = file.name.split('.').pop()?.toLowerCase() || '';
    return acceptedTypes.includes(`.${fileType}`);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!validateFileType(file)) {
        alert(`Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`);
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!validateFileType(file)) {
        alert(`Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`);
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
      
      // Update the file input value to match the dropped file
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    selectedFile,
    fileInputRef,
    fileName,
    handleFileChange,
    handleDragOver,
    handleDrop,
    clearFile
  };
}
