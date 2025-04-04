import React, { useState, useEffect, useContext } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAnalysisResult } from "@/api/ai-api";
import { toast } from "sonner";
import { batchProcessor } from "@/services/batch-processing/processor";
import { FileContext } from "./FileContext";

interface MetadataInputProps {
  onMetadataChange?: (metadata: AIAnalysisResult) => void;
}

const MetadataInput: React.FC<MetadataInputProps> = ({ onMetadataChange }) => {
  const { selectedFile, selectedFileMetadata, setSelectedFileMetadata } = useContext(FileContext);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [currentKeyword, setCurrentKeyword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [titleCharCount, setTitleCharCount] = useState(0);
  const [descriptionCharCount, setDescriptionCharCount] = useState(0);

  // Add effect to update character counts
  useEffect(() => {
    setTitleCharCount(title.replace(/\s/g, "").length);
    setDescriptionCharCount(description.replace(/\s/g, "").length);
  }, [title, description]);
  
  // Update local state when context metadata changes
  useEffect(() => {
    console.log('Metadata update effect triggered');
    console.log('Current selectedFileMetadata:', selectedFileMetadata);
    
    if (selectedFileMetadata) {
        console.log('Setting metadata values:', {
            title: selectedFileMetadata.title,
            description: selectedFileMetadata.description,
            keywords: selectedFileMetadata.keywords
        });
        
        setTitle(selectedFileMetadata.title || '');
        setDescription(selectedFileMetadata.description || '');
        setKeywords(selectedFileMetadata.keywords || []);
    } else {
        console.log('Clearing metadata values');
        setTitle('');
        setDescription('');
        setKeywords([]);
    }
  }, [selectedFileMetadata]);

  // Add a separate effect for loading metadata when file changes
  useEffect(() => {
    const loadMetadata = async () => {
      if (selectedFile) {
        try {
          console.log('Loading metadata for:', selectedFile);
          const metadata = await window.electron.getFileMetadata(selectedFile);
          console.log('Loaded metadata:', metadata);
          
          if (metadata) {
            const normalizedMetadata = {
              title: metadata.title || '',
              description: metadata.description || '',
              keywords: metadata.keywords || []
            };
            setSelectedFileMetadata(normalizedMetadata);
            
            // Also update local state
            setTitle(normalizedMetadata.title);
            setDescription(normalizedMetadata.description);
            setKeywords(normalizedMetadata.keywords);
          } else {
            // Clear metadata if none exists
            const emptyMetadata = {
              title: '',
              description: '',
              keywords: []
            };
            setSelectedFileMetadata(emptyMetadata);
            setTitle('');
            setDescription('');
            setKeywords([]);
          }
        } catch (error) {
          console.error('Error loading metadata:', error);
          toast.error('Failed to load metadata');
        }
      }
    };

    loadMetadata();
  }, [selectedFile]);

  const updateMetadata = async (newMetadata: AIAnalysisResult) => {
    if (selectedFile) {
      try {
        console.log('Saving metadata:', newMetadata, 'for file:', selectedFile);
        await window.electron.saveFileMetadata(selectedFile, newMetadata);
        setSelectedFileMetadata(newMetadata);
        onMetadataChange?.(newMetadata);
        
        // Verify the save by immediately reading back
        const savedMetadata = await window.electron.getFileMetadata(selectedFile);
        console.log('Verified saved metadata:', savedMetadata);
      } catch (error) {
        console.error('Failed to save metadata:', error);
        toast.error('Failed to save metadata');
      }
    }
  };

  const handleTitleChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    await updateMetadata({
      title: newTitle,
      description,
      keywords
    });
  };

  const handleDescriptionChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    await updateMetadata({
      title,
      description: newDescription,
      keywords
    });
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentKeyword.trim()) {
      e.preventDefault();
      if (!keywords.includes(currentKeyword.trim())) {
        const newKeywords = [...keywords, currentKeyword.trim()];
        setKeywords(newKeywords);
        await updateMetadata({
          title,
          description,
          keywords: newKeywords
        });
      }
      setCurrentKeyword("");
    }
  };

  const removeKeyword = async (keywordToRemove: string) => {
    const newKeywords = keywords.filter((keyword) => keyword !== keywordToRemove);
    setKeywords(newKeywords);
    await updateMetadata({
      title,
      description,
      keywords: newKeywords
    });
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      toast.error('No file selected');
      return;
    }

    try {
      setIsGenerating(true);
      
      const [apiSettings, metadataSettings] = await Promise.all([
        window.electron.getSettings('api'),
        window.electron.getSettings('metadata')
      ]);
      
      if (!apiSettings?.apiKey || !apiSettings?.provider || !apiSettings?.model) {
        toast.error('Please configure API settings first');
        return;
      }

      if (!metadataSettings) {
        toast.error('Please configure metadata settings first');
        return;
      }

      const settings = {
        api: apiSettings,
        metadata: metadataSettings
      };

      const result = await batchProcessor.process(
        [selectedFile],
        settings,
        (status) => console.log('Progress:', status),
        async (result) => {
          if (result.success && result.metadata) {
            const metadata = {
              title: result.metadata.title || '',
              description: result.metadata.description || '',
              keywords: result.metadata.keywords || []
            };
            
            // Save the metadata and update state
            await window.electron.saveFileMetadata(selectedFile, metadata);
            setSelectedFileMetadata(metadata);
            
            // Update UI state
            setTitle(metadata.title);
            setDescription(metadata.description);
            setKeywords(metadata.keywords);
            
            // Notify parent if needed
            onMetadataChange?.(metadata);
          }
        }
      );

      if (result[0].success && result[0].metadata) {
        const validMetadata = {
          title: result[0].metadata.title || '',
          description: result[0].metadata.description || '',
          keywords: result[0].metadata.keywords || []
        };
        
        // Save metadata directly here as well to ensure it's saved
        await window.electron.saveFileMetadata(selectedFile, validMetadata);
        setSelectedFileMetadata(validMetadata);
        toast.success('Metadata generated and saved successfully');
      } else {
        toast.error(`Failed to generate metadata: ${result[0].error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate metadata');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col gap-4 w-full p-4 border-l border-zinc-700/50 overflow-y-auto h-full">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400 select-none">Title</span>
            <span className="text-sm text-zinc-500 select-none">{titleCharCount} characters</span>
          </div>
          <Textarea 
            value={title}
            onChange={handleTitleChange}
            className="w-full bg-background/5 border-zinc-800 text-white" 
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400 select-none">Description</span>
            <span className="text-sm text-zinc-500 select-none">{descriptionCharCount} characters</span>
          </div>
          <Textarea 
            value={description}
            onChange={handleDescriptionChange}
            className="w-full min-h-[100px] bg-background/5 border-zinc-800 text-white" 
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400 select-none">Keywords</span>
            <span className="text-sm text-zinc-400 select-none">
              {keywords.length} keywords
            </span>
          </div>
          <Input
            placeholder="Add keywords (press Enter)"
            value={currentKeyword}
            onChange={(e) => setCurrentKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-background/5 border-zinc-800 text-white"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="relative">
            <div className="min-h-[9rem] max-h-[calc(100vh-20rem)]  rounded-md border border-zinc-800 bg-background/5">
              <div className="flex flex-wrap gap-2 p-2 overflow-y-auto h-[150px]">
                {keywords.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    No keywords
                  </div>
                ) : (
                  keywords.map((keyword, index) => (
                    <Badge
                      key={index}
                      variant="default"
                      className="flex items-center gap-1 bg-background/10"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeKeyword(keyword);
                        }}
                        className="flex items-center justify-center"
                      >
                        <X className="h-3 w-3 !cursor-pointer hover:text-red-400 transition-colors pointer-events-auto" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="absolute right-2 bottom-2 text-xs text-zinc-500">
              {keywords.length > 0 && "Scroll to see more"}
            </div>
          </div>
        </div>
        <div>
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || !selectedFile}
          >
            {isGenerating ? 'Generating...' : 'Generate Metadata'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MetadataInput;




















