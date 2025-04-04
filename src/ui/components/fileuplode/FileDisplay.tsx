import { useContext, useEffect, useState } from 'react';
import { FileContext } from '../FileContext';
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { X } from 'lucide-react'; 
interface ThumbnailData {
    path: string;
    thumbnailUrl: string | null;
}

function FileDisplay() {
    const { selectedFiles, selectedFile, setSelectedFile, setSelectedFileMetadata, setSelectedFiles } = useContext(FileContext);
    const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);

    useEffect(() => {
        const loadThumbnails = async () => {
            const newThumbnails = await Promise.all(
                selectedFiles.map(async (file) => {
                    const thumbnailPath = await window.electron.generateThumbnail(file);
                    return {
                        path: file,
                        thumbnailUrl: typeof thumbnailPath === 'string' ? `local-file:///${thumbnailPath.replace(/\\/g, '/')}` : null,
                    };
                })
            );
            setThumbnails(newThumbnails);
        };

        loadThumbnails();
    }, [selectedFiles]);

    const handleFileSelect = async (file: string) => {
        console.log('Selected file:', file);
        
        setSelectedFile(file);
        
        try {
            const metadata = await window.electron.getFileMetadata(file);
            console.log('Loaded metadata:', metadata);
            
            setSelectedFileMetadata(metadata ? {
                title: metadata.title || '',
                description: metadata.description || '',
                keywords: metadata.keywords || []
            } : {
                title: '',
                description: '',
                keywords: []
            });
        } catch (error) {
            console.error('Failed to load metadata:', error);
            setSelectedFileMetadata({
                title: '',
                description: '',
                keywords: []
            });
            toast.error('Failed to load metadata');
        }
    };

    const handleRemoveFile = (filePath: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent triggering the thumbnail click
        
        // Remove from selected files
        const newSelectedFiles = selectedFiles.filter(file => file !== filePath);
        setSelectedFiles(newSelectedFiles);

        // If the removed file was selected, clear the selection
        if (selectedFile === filePath) {
            setSelectedFile(null);
            setSelectedFileMetadata({
                title: '',
                description: '',
                keywords: []
            });
        }

        toast.success('File removed');
    };

    return (
        <ScrollArea className=" p-4 flex flex-col justify-center select-none">
            <div className="flex flex-row gap-2">
                {thumbnails.length > 0 ? (
                    thumbnails.map((item, index) => (
                        <div
                            key={index}
                            onClick={() => handleFileSelect(item.path)}
                            className={cn(
                                "group relative w-[180px] h-[120px]",
                                "rounded-md overflow-hidden",
                                "border",
                                selectedFile === item.path ? "border-blue-500" : "border-zinc-700/50",
                                "hover:border-blue-500",
                                "transition-all duration-200",
                                "cursor-pointer",
                                "flex-shrink-0"
                            )}
                        >
                            <div className="absolute inset-0 flex items-center justify-center">
                                <img
                                    src={item.thumbnailUrl || ''}
                                    alt={`Thumbnail for ${item.path}`}
                                    className={cn(
                                        "w-full h-full object-cover",
                                        "group-hover:brightness-90 transition-all"
                                    )}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = 'placeholder-image-url.jpg';
                                    }}
                                />
                            </div>
                            {/* Remove button - appears on hover */}
                            <button
                                onClick={(e) => handleRemoveFile(item.path, e)}
                                className={cn(
                                    "absolute top-1 right-1",
                                    "size-6 rounded-full",
                                    "bg-black/60 hover:bg-black/80",
                                    "flex items-center justify-center",
                                    "opacity-0 group-hover:opacity-100",
                                    "transition-opacity duration-200",
                                    "text-white",
                                    "z-10"
                                )}
                            >
                                <X className="size-4" />
                            </button>
                            <div className={cn(
                                "absolute bottom-0 left-0 right-0",
                                "bg-gradient-to-t from-black/80 to-transparent",
                                "p-2",
                                "transition-opacity duration-200"
                            )}>
                                <p className="text-xs text-white truncate">
                                    {item.path.split('\\').pop()}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-background/5 flex items-center justify-center h-30 min-w-[200px] rounded-md border border-zinc-800/50">
                        <p className="text-zinc-500">Imge thumbnails</p>
                    </div>
                )}
            </div>

                <ScrollBar orientation="horizontal" />

        </ScrollArea>
    );
}

export default FileDisplay;
