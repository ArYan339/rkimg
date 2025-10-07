
import React from 'react';

interface SectionCardProps {
    step?: number;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({ step, title, subtitle, children }) => {
    return (
        <div className="relative bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">
                {step && <span className="text-yellow-500 font-bold">{step}. </span>}
                <span className="text-slate-800">{title}</span>
                {subtitle && <span className="text-sm font-normal text-slate-500 ml-2">{subtitle}</span>}
            </h2>
            {children}
        </div>
    );
};
