
import React, { useCallback, useState } from 'react';
import { UploadIcon, CheckIcon, TrashIcon } from './Icons';

interface FileUploaderProps {
    onFileChange: (file: File | null) => void;
    uploadedFilePreview: string | null;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileChange, uploadedFilePreview }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileChange(e.dataTransfer.files[0]);
        }
    }, [onFileChange]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileChange(e.target.files[0]);
        }
    };
    
    const handleRemoveImage = () => {
        onFileChange(null);
    }

    if (uploadedFilePreview) {
        return (
            <div className="relative group">
                <img src={uploadedFilePreview} alt="Uploaded preview" className="w-full h-auto rounded-lg" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <button onClick={handleRemoveImage} className="bg-red-600 hover:bg-red-500 text-white rounded-full p-3 transition-colors">
                        <TrashIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <label
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-yellow-400 bg-yellow-100' : 'border-slate-300 bg-slate-50 hover:bg-yellow-50'}`}
        >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadIcon className={`w-8 h-8 mb-4 transition-colors ${isDragging ? 'text-yellow-500' : 'text-slate-400'}`} />
                <p className="mb-2 text-sm text-slate-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400">PNG, JPG, WEBP (MAX. 4MB)</p>
            </div>
            <input
                id="dropzone-file"
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/png, image/jpeg, image/webp"
            />
        </label>
    );
};
