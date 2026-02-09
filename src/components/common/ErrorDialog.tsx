import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface ErrorDetails {
    title: string;
    message: string;
    technicalDetails?: {
        code?: string;
        hint?: string;
        details?: string;
        timestamp?: string;
        operation?: string;
        [key: string]: any;
    };
}

interface ErrorDialogProps {
    error: ErrorDetails | null;
    isOpen: boolean;
    onClose: () => void;
    onRetry?: () => void;
}

/**
 * Enhanced error dialog with full error details and copy functionality
 * Designed for mobile-first debugging without console access
 */
export function ErrorDialog({ error, isOpen, onClose, onRetry }: ErrorDialogProps) {
    const { toast } = useToast();
    const { t } = useLanguage();

    if (!error) return null;

    const formatTechnicalDetails = (): string => {
        if (!error.technicalDetails) return '';

        const lines = [
            `Error: ${error.message}`,
            `Timestamp: ${error.technicalDetails.timestamp || new Date().toISOString()}`,
            error.technicalDetails.operation && `Operation: ${error.technicalDetails.operation}`,
            error.technicalDetails.code && `Code: ${error.technicalDetails.code}`,
            error.technicalDetails.hint && `Hint: ${error.technicalDetails.hint}`,
            error.technicalDetails.details && `Details: ${error.technicalDetails.details}`,
            '',
            '--- Full Error Object ---',
            JSON.stringify(error.technicalDetails, null, 2)
        ];

        return lines.filter(Boolean).join('\n');
    };

    const handleCopy = async () => {
        const text = formatTechnicalDetails();
        try {
            await navigator.clipboard.writeText(text);
            toast({
                title: t('copied'),
                description: t('error_details_copied'),
                duration: 2000,
            });
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);

            toast({
                title: t('copied'),
                description: t('error_details_copied'),
                duration: 2000,
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <DialogTitle className="text-destructive">{error.title}</DialogTitle>
                    </div>
                    <DialogDescription className="text-base mt-2">
                        {error.message}
                    </DialogDescription>
                </DialogHeader>

                {error.technicalDetails && (
                    <div className="space-y-4">
                        {/* Quick Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {error.technicalDetails.code && (
                                <div>
                                    <span className="font-semibold text-muted-foreground">Error Code:</span>
                                    <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                                        {error.technicalDetails.code}
                                    </p>
                                </div>
                            )}
                            {error.technicalDetails.operation && (
                                <div>
                                    <span className="font-semibold text-muted-foreground">Operation:</span>
                                    <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                                        {error.technicalDetails.operation}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Hint/Solution */}
                        {error.technicalDetails.hint && (
                            <Alert>
                                <AlertDescription className="text-sm">
                                    <span className="font-semibold">Suggestion: </span>
                                    {error.technicalDetails.hint}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Full Technical Details */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-semibold text-muted-foreground">
                                    {t('technical_details')}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="gap-2"
                                >
                                    <Copy className="h-4 w-4" />
                                    {t('copy_error')}
                                </Button>
                            </div>
                            <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-60 border">
                                {formatTechnicalDetails()}
                            </pre>
                        </div>

                        {/* Additional Details */}
                        {error.technicalDetails.details && (
                            <div className="text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 rounded">
                                <p className="font-semibold text-amber-900 dark:text-amber-400 mb-1">
                                    {t('additional_info')}:
                                </p>
                                <p className="text-amber-800 dark:text-amber-300">
                                    {error.technicalDetails.details}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        {t('close')}
                    </Button>
                    {onRetry && (
                        <Button onClick={onRetry} className="w-full sm:w-auto">
                            {t('retry')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Helper function to extract detailed error information from any error type
 */
export function parseErrorDetails(
    error: any,
    operation: string,
    userMessage?: string
): ErrorDetails {
    // Default fallback
    const details: ErrorDetails = {
        title: 'Error',
        message: userMessage || 'An unexpected error occurred',
        technicalDetails: {
            timestamp: new Date().toISOString(),
            operation,
        },
    };

    // Parse Supabase errors
    if (error?.code) {
        details.technicalDetails!.code = error.code;

        // Common Supabase error codes with helpful messages
        const errorHints: Record<string, string> = {
            '23505': 'Duplicate entry. This voucher number or item already exists in the database.',
            '23503': 'Referenced data not found. Check if supplier, product, or store still exists.',
            '42501': 'Permission denied. Your session may have expired or you lack necessary permissions.',
            'PGRST116': 'Record not found. The draft or voucher may have been deleted.',
            '22P02': 'Invalid data format. Check date formats and numeric values.',
            '23502': 'Required field is missing. Check all mandatory fields are filled.',
            '42P01': 'Database table not found. Database migration may be required.',
        };

        details.technicalDetails!.hint = errorHints[error.code] || 'Unknown database error code.';
    }

    // Supabase message and details
    if (error?.message) {
        details.message = error.message;
    }
    if (error?.details) {
        details.technicalDetails!.details = error.details;
    }
    if (error?.hint) {
        details.technicalDetails!.hint = error.hint;
    }

    // Network/timeout errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
        details.title = 'Network Error';
        details.message = 'Cannot connect to server. Check your internet connection.';
        details.technicalDetails!.hint = 'Verify internet connection and try again. If using VPN, try disconnecting it.';
    }

    // Session/Auth errors
    if (error?.message?.toLowerCase().includes('jwt') ||
        error?.message?.toLowerCase().includes('session') ||
        error?.message?.toLowerCase().includes('auth')) {
        details.title = 'Authentication Error';
        details.message = 'Your session has expired or is invalid.';
        details.technicalDetails!.hint = 'Please log in again to continue. Your work has been saved as a draft.';
        details.technicalDetails!.code = 'AUTH_EXPIRED';
    }

    // Timeout errors
    if (error?.message?.toLowerCase().includes('timeout')) {
        details.title = 'Timeout Error';
        details.message = 'The operation took too long and timed out.';
        details.technicalDetails!.hint = 'Try saving in smaller batches or check your internet speed.';
    }

    // Payload size errors
    if (error?.message?.toLowerCase().includes('payload') ||
        error?.message?.toLowerCase().includes('too large')) {
        details.title = 'Data Size Error';
        details.message = 'The invoice is too large to save at once.';
        details.technicalDetails!.hint = 'Try reducing the number of items or save in multiple smaller invoices.';
    }

    // Store full error object for debugging
    details.technicalDetails = {
        ...details.technicalDetails,
        ...error,
    };

    return details;
}
