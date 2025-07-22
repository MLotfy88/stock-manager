
import React, { useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { downloadExcelTemplate, handleFileUpload } from '@/data/operations/adminOperations';
import { Button } from '@/components/ui/button';
import { FileDown, FileUp } from 'lucide-react';

const ImportExportPage = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDownloadTemplate = () => {
    const result = downloadExcelTemplate();
    if (result) {
      toast({
        title: t('success'),
        description: t('template_downloaded'),
      });
    } else {
      toast({
        title: t('error'),
        description: t('download_failed'),
        variant: "destructive"
      });
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const result = await handleFileUpload(file);
    
    if (result) {
      toast({
        title: t('success'),
        description: t('data_imported'),
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      toast({
        title: t('error'),
        description: t('import_failed'),
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('import_export_nav')}</h1>
      
      <div className="space-y-8">
        <div className="glass-card p-6 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold">{t('import_data')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('import_description')}
          </p>
          
          <div className="flex flex-wrap gap-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="hover-lift"
            >
              <FileUp className="mr-2 h-4 w-4 import-export-icon" />
              {t('select_file')}
            </Button>
            <Button 
              onClick={handleDownloadTemplate}
              variant="outline"
              className="hover-lift"
            >
              <FileDown className="mr-2 h-4 w-4 import-export-icon" />
              {t('download_template')}
            </Button>
          </div>
        </div>
        
        <div className="glass-card p-6 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold">{t('export_data')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('export_description')}
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => downloadExcelTemplate('excel')}
              className="hover-lift"
            >
              <FileDown className="mr-2 h-4 w-4 import-export-icon" />
              {t('export_as_excel')}
            </Button>
            <Button
              onClick={() => downloadExcelTemplate('csv')}
              variant="outline"
              className="hover-lift"
            >
              <FileDown className="mr-2 h-4 w-4 import-export-icon" />
              {t('export_as_csv')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExportPage;
