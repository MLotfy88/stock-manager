import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SearchSpotlightProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (query: string) => void;
    placeholder?: string;
    recentSearches?: string[];
}

export const SearchSpotlight: React.FC<SearchSpotlightProps> = ({
    isOpen,
    onClose,
    onSearch,
    placeholder = 'ابحث عن أي شيء...',
    recentSearches = [],
}) => {
    const [query, setQuery] = React.useState('');

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="max-w-lg mx-auto mt-20 md:mt-32"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-border/50">
                    <div className="flex items-center gap-3 p-4 border-b border-border/50">
                        <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onSearch(query)}
                            placeholder={placeholder}
                            className="flex-1 bg-transparent outline-none text-lg"
                            autoFocus
                        />
                        <kbd className="hidden md:inline-flex px-2 py-1 text-xs bg-muted rounded">ESC</kbd>
                    </div>

                    {recentSearches.length > 0 && (
                        <div className="p-3">
                            <p className="text-xs text-muted-foreground mb-2">عمليات البحث الأخيرة</p>
                            <div className="space-y-1">
                                {recentSearches.slice(0, 5).map((search, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onSearch(search)}
                                        className="w-full text-right px-3 py-2 rounded-lg hover:bg-muted text-sm"
                                    >
                                        {search}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SearchSpotlight;
