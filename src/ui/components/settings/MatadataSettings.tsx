import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

import { toast } from "sonner";

// Default values
const DEFAULT_SETTINGS = {
  visualTheme: null,
  titleLimit: 150,
  descriptionLimit: 150,
  keywordLimit: 25,
};

function MatadataSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Load saved settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await window.electron.getSettings("metadata");
        const savedOutputDirectory = await window.electron.getSettings("outputDirectory");
        
        if (!savedSettings) {
          await window.electron.saveSettings("metadata", DEFAULT_SETTINGS);
          setSettings(DEFAULT_SETTINGS);
        } else {
          const validatedSettings = {
            ...DEFAULT_SETTINGS,
            ...savedSettings,
            titleLimit: Number(savedSettings.titleLimit) || DEFAULT_SETTINGS.titleLimit,
            descriptionLimit: Number(savedSettings.descriptionLimit) || DEFAULT_SETTINGS.descriptionLimit,
            keywordLimit: Number(savedSettings.keywordLimit) || DEFAULT_SETTINGS.keywordLimit,
          };
          setSettings(validatedSettings);
        }

        // Set the saved output directory if it exists
        if (savedOutputDirectory) {
          setSelectedFilePath(savedOutputDirectory);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings!");
      }
    };
    loadSettings();
  }, []);

  const handleReset = async () => {
    try {
      await window.electron.saveSettings("metadata", DEFAULT_SETTINGS);
      setSettings(DEFAULT_SETTINGS);
      toast.success("Settings reset successfully!", {
        style: {
          background: "black",
          color: "white",
          border: "1px solid #343333",
        },
      });
    } catch (error) {
      console.error("Failed to reset settings:", error);
      toast.error("Failed to reset settings!");
    }
  };

  const handleSave = async () => {
    try {
      // Ensure all values are numbers
      const settingsToSave = {
        ...settings,
        titleLimit: Number(settings.titleLimit),
        descriptionLimit: Number(settings.descriptionLimit),
        keywordLimit: Number(settings.keywordLimit),
      };
      
      await window.electron.saveSettings("metadata", settingsToSave);
      toast.success("Settings saved successfully!", {
        style: {
          background: "black",
          color: "white",
          border: "1px solid #343333",
        },
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings!");
    }
  };

  const [selectedFilePath, setSelectedFilePath] = useState("");

  const handleFileSelect = async () => {
    try {
      console.log('Opening directory dialog...'); // Debug log
      const directories = await window.electron.openDirectoryDialog();
      console.log('Selected directories:', directories); // Debug log
      
      if (directories && Array.isArray(directories) && directories.length > 0) {
        const selectedPath = directories[0];
        setSelectedFilePath(selectedPath);
        
        // Save the output directory path to electron store
        await window.electron.saveSettings("outputDirectory", selectedPath);
        
        toast.success('Directory selected successfully!');
      } else {
        console.log('No directory selected or invalid response'); // Debug log
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      toast.error(`Failed to select directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 text-gray-400">
      <h2 className="text-2xl font-bold text-gray-400">Metadata Settings</h2>
      <div className="w-full max-w-md flex flex-col gap-4">
        <div>
          <div className="flex gap-3 p-2">
            <h4>Title Limits</h4>
            <span className="text-s">(In characters)</span>
          </div>
          <Input
            className="border-background/20"
            type="number"
            value={settings.titleLimit}
            onChange={(e) =>
              setSettings({
                ...settings,
                titleLimit: parseInt(e.target.value),
              })
            }
            min="5"
            max="200"
          />
        </div>
        <div>
          <div className="flex gap-3 p-2">
            <h4>Description Limits</h4>
            <span className="text-s">(In characters)</span>
          </div>
          <Input
            className="border-background/20"
            type="number"
            value={settings.descriptionLimit}
            onChange={(e) =>
              setSettings({
                ...settings,
                descriptionLimit: parseInt(e.target.value),
              })
            }
            min="5"
            max="200"
          />
        </div>
        <div>
          <h4 className="p-2">Keyword Limits</h4>
          <Input
            className="border-background/20"
            type="number"
            value={settings.keywordLimit}
            onChange={(e) =>
              setSettings({
                ...settings,
                keywordLimit: parseInt(e.target.value),
              })
            }
            min="5"
            max="49"
          />
        </div>
        <div className="flex w-full justify-between gap-4">
          <Button className="flex-1 bg-gray-300 hover:bg-gray-900 hover:text-white text-black" onClick={handleSave}>
            Save
          </Button>
          <Button className="flex-1 " onClick={handleReset}>
            Reset
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="p-2">Select Output Directory</h4>
          <div className="flex gap-2">
            <Input
              className="border-background/20 flex-grow"
              type="text"
              value={selectedFilePath}
              readOnly
              placeholder="No directory selected"
            />
            <Button
              className="w-30"
              onClick={handleFileSelect}
            >
              Browse
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MatadataSettings;
