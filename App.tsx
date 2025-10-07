
import React, { useState, useEffect, useCallback } from 'react';
import { Modality } from '@google/genai';
import type { AspectRatio, HistoryItem } from './types';
import { ASPECT_RATIOS, SAMPLE_PROMPTS } from './constants';
import { fileToBase64, createThumbnail, getAiClient } from './services/geminiService';
import { SectionCard } from './components/SectionCard';
import { Accordion } from './components/Accordion';
import { FileUploader } from './components/FileUploader';
import { WandIcon, SpinnerIcon, RefreshIcon, TrashIcon, ImageIcon, CheckIcon, DownloadIcon, UpscaleIcon } from './components/Icons';

const App: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isUpscaled, setIsUpscaled] = useState(false);
    const [isUpscaling, setIsUpscaling] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('gemini-image-history');
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (e) {
            console.error("Failed to load history from localStorage", e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('gemini-image-history', JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history to localStorage", e);
        }
    }, [history]);
    
    const handleError = (e: any, context: 'general' | 'upscaling' = 'general') => {
        console.error(e);
        if (e.message && e.message.toLowerCase().includes('api key')) {
             setError('Configuration Error: The Gemini API Key is missing or invalid. Please ensure it is configured correctly in your environment.');
        } else {
            const prefix = context === 'upscaling' ? 'An error occurred during upscaling: ' : 'An error occurred: ';
            setError(`${prefix}${e.message || 'Please try again.'}`);
        }
    };

    const runGeneration = async (promptToUse: string, fileToUse: File | null, aspectRatioToUse: AspectRatio) => {
        if (!promptToUse && !fileToUse) {
            setError('Please provide a prompt or an image to edit.');
            return;
        }
        if (fileToUse && !promptToUse) {
            setError('Please provide a prompt to describe your desired edits.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResultImage(null);
        setIsUpscaled(false);

        try {
            const ai = getAiClient();
            let newImageBase64: string;

            if (fileToUse) {
                setLoadingMessage('Editing image...');
                const { base64, mimeType } = await fileToBase64(fileToUse);
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                      parts: [
                        { inlineData: { data: base64, mimeType } },
                        { text: promptToUse },
                      ],
                    },
                    config: {
                        responseModalities: [Modality.IMAGE, Modality.TEXT],
                    },
                });

                const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
                if (imagePart?.inlineData) {
                    newImageBase64 = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                } else {
                    throw new Error('API did not return an edited image.');
                }
            } else {
                setLoadingMessage('Generating image...');
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: promptToUse,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: aspectRatioToUse,
                    },
                });

                if (response.generatedImages && response.generatedImages.length > 0) {
                    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
                    newImageBase64 = `data:image/jpeg;base64,${base64ImageBytes}`;
                } else {
                    throw new Error('API did not return an image.');
                }
            }

            setResultImage(newImageBase64);
            const thumbnailUrl = await createThumbnail(newImageBase64);
            const newHistoryItem: HistoryItem = {
                id: Date.now().toString(),
                prompt: promptToUse,
                imageUrl: thumbnailUrl,
                timestamp: Date.now(),
            };
            setHistory(prev => [newHistoryItem, ...prev.slice(0, 4)]);

        } catch (e: any) {
            handleError(e);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleUpscale = async () => {
        if (!resultImage) return;
    
        setIsUpscaling(true);
        setError(null);
    
        try {
            const ai = getAiClient();
            const mimeType = resultImage.split(';')[0].split(':')[1];
            const base64 = resultImage.split(',')[1];
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                  parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Upscale this image, enhancing details and sharpening the result to make it higher resolution." },
                  ],
                },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
    
            const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
            if (imagePart?.inlineData) {
                const upscaledImageBase64 = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setResultImage(upscaledImageBase64);
                setIsUpscaled(true);
            } else {
                throw new Error('API did not return an upscaled image.');
            }
        } catch (e: any) {
            handleError(e, 'upscaling');
        } finally {
            setIsUpscaling(false);
        }
    };

    const handleFileChange = useCallback((file: File | null) => {
        if (file) {
            setUploadedFile(file);
            const previewUrl = URL.createObjectURL(file);
            setUploadedFilePreview(previewUrl);
        } else {
            setUploadedFile(null);
            if(uploadedFilePreview) {
                URL.revokeObjectURL(uploadedFilePreview);
            }
            setUploadedFilePreview(null);
        }
    }, [uploadedFilePreview]);

    const handleGenerate = () => runGeneration(prompt, uploadedFile, aspectRatio);

    const handleRegenerate = (item: HistoryItem) => {
        setPrompt(item.prompt);
        handleFileChange(null);
        runGeneration(item.prompt, null, aspectRatio);
    };

    const handleSamplePromptClick = (sample: string) => {
        setPrompt(sample);
    };
    
    const clearHistory = () => {
        setHistory([]);
    };
    
    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        const filename = prompt
            ? prompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 50) + '.jpg'
            : `gemini-image-${Date.now()}.jpg`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen font-sans text-slate-800">
            <main className="max-w-2xl mx-auto p-4 md:p-8 flex flex-col gap-8">
                <header className="text-center py-4">
                    <div className="flex justify-center items-center gap-4">
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
                            Gemini Image Studio
                        </h1>
                    </div>
                    <p className="text-slate-500 mt-2">
                        Create & Edit images with the Power of AI
                    </p>
                </header>

                <SectionCard step={1} title="Craft Your Prompt">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A photorealistic image of a knight in shining armor..."
                        className="w-full h-28 p-3 bg-slate-100 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all placeholder-slate-400"
                        disabled={isLoading}
                    />
                </SectionCard>

                <Accordion title="Or, Try a Sample Prompt">
                   {Object.entries(SAMPLE_PROMPTS).map(([category, prompts]) => (
                        <div key={category}>
                            <h4 className="text-yellow-600 font-semibold mt-2 mb-1 px-4">{category}</h4>
                            <ul className="text-sm">
                                {prompts.map((p, i) => (
                                    <li key={i}>
                                      <button onClick={() => handleSamplePromptClick(p)} className="w-full text-left px-4 py-2 hover:bg-yellow-100/50 rounded-md transition-colors text-slate-700">
                                          {p}
                                      </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                   ))}
                </Accordion>
                
                <SectionCard title="History">
                     {history.length > 0 && (
                        <button onClick={clearHistory} className="absolute top-4 right-4 text-xs bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full flex items-center gap-1 transition-colors">
                            <TrashIcon className="h-3 w-3" /> Clear All
                        </button>
                    )}
                    {history.length === 0 ? (
                         <p className="text-slate-500 text-center py-4">Your generation history will appear here.</p>
                    ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {history.map(item => (
                                <div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                                    <img src={item.imageUrl} alt={item.prompt} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                                    <div className="flex-grow overflow-hidden">
                                        <p className="truncate text-sm text-slate-700">{item.prompt}</p>
                                        <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRegenerate(item)}
                                        className="flex-shrink-0 p-2 rounded-full bg-slate-200 hover:bg-yellow-400 text-slate-600 hover:text-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Re-generate this prompt"
                                        aria-label="Re-generate this prompt"
                                        disabled={isLoading}
                                    >
                                        <RefreshIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>


                <SectionCard step={2} title="Generation Settings">
                    <label className="block text-sm font-medium text-slate-600 mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-5 gap-2">
                        {ASPECT_RATIOS.map(ratio => (
                            <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`py-2 px-4 rounded-lg font-semibold transition-all duration-200 border ${
                                    aspectRatio === ratio
                                        ? 'bg-yellow-400 text-slate-900 font-bold shadow-lg shadow-yellow-400/30 border-yellow-400'
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                                disabled={!!uploadedFile || isLoading}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                    {uploadedFile && <p className="text-xs text-slate-500 mt-2">Aspect ratio is determined by the uploaded image for editing.</p>}
                </SectionCard>

                <SectionCard step={3} title="Upload an Image" subtitle="(Optional - for editing)">
                    <FileUploader onFileChange={handleFileChange} uploadedFilePreview={uploadedFilePreview} />
                </SectionCard>

                <div className="mt-4">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || isUpscaling}
                        className="w-full flex items-center justify-center gap-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-4 px-6 rounded-lg text-lg transition-all duration-300 shadow-lg shadow-yellow-400/30 transform hover:scale-105"
                    >
                        {isLoading ? <SpinnerIcon /> : <WandIcon />}
                        {isLoading ? loadingMessage : 'Generate'}
                    </button>
                </div>

                <SectionCard step={4} title="Result">
                    <div className="min-h-[200px] flex items-center justify-center bg-slate-100 rounded-lg p-4">
                        {isLoading ? (
                            <div className="text-center text-slate-600">
                                <SpinnerIcon className="mx-auto mb-4 h-8 w-8"/>
                                <p>{loadingMessage}</p>
                            </div>
                        ) : error ? (
                            <p className="text-red-600 text-center">{error}</p>
                        ) : resultImage ? (
                            <div className="relative flex flex-col items-center gap-4 w-full">
                                <img src={resultImage} alt={prompt} className="rounded-lg max-w-full h-auto shadow-2xl shadow-slate-400/30" />
                                {isUpscaling && (
                                     <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                                        <SpinnerIcon className="h-8 w-8 mb-4"/>
                                        <p className="text-slate-600">Upscaling image...</p>
                                     </div>
                                )}
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full pt-2">
                                    <button
                                        onClick={handleDownload}
                                        disabled={isUpscaling}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <DownloadIcon className="h-5 w-5" />
                                        <span>Download</span>
                                    </button>
                                    {!isUpscaled ? (
                                        <button
                                            onClick={handleUpscale}
                                            disabled={isUpscaling}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <UpscaleIcon className="h-5 w-5" />
                                            <span>Upscale</span>
                                        </button>
                                    ) : (
                                        <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-100 text-green-800 font-bold py-2 px-4 rounded-lg">
                                            <CheckIcon className="h-5 w-5" />
                                            <span>Upscaled</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                             <div className="text-center text-slate-500">
                                <ImageIcon className="mx-auto mb-2 h-10 w-10"/>
                                <p>Your generated image will appear here.</p>
                             </div>
                        )}
                    </div>
                </SectionCard>

            </main>
        </div>
    );
};

export default App;
