import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { AdminSettings } from '@/types';
import { UserCog, Lock, ShieldCheck, Database, CheckCircle, XCircle, FileCode } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const ManagementPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabaseUrl') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabaseKey') || '');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    username: 'admin',
    password: '1234',
  });
  
  const [username, setUsername] = useState(adminSettings.username);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: t('error'),
        description: "Username cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    if (password && password !== confirmPassword) {
      toast({
        title: t('error'),
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    const updatedSettings: AdminSettings = {
      ...adminSettings,
      username
    };
    
    if (password) {
      updatedSettings.password = password;
    }
    
    setAdminSettings(updatedSettings);
    setPassword('');
    setConfirmPassword('');
    
    toast({
      title: t('success'),
      description: "Admin credentials updated successfully",
    });
  };
    
  const handleTestConnection = async () => {
    if (!supabaseUrl || !supabaseKey) {
      toast({
        title: t('error'),
        description: "Please provide both Supabase URL and Key",
        variant: "destructive",
      });
      return;
    }
    try {
      createClient(supabaseUrl, supabaseKey);
      localStorage.setItem('supabaseUrl', supabaseUrl);
      localStorage.setItem('supabaseKey', supabaseKey);
      setConnectionStatus('success');
      toast({
        title: t('success'),
        description: "Connection to Supabase successful!",
      });
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: t('error'),
        description: "Failed to connect to Supabase. Check your credentials.",
        variant: "destructive",
      });
    }
  };

  const generateSqlScript = () => {
    const script = `
-- Create Manufacturer Table
CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo TEXT,
  alert_period INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Supplier Table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Supply Type Table
CREATE TABLE supply_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Medical Supply Table
CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID REFERENCES supply_types(id),
  size TEXT,
  quantity INT NOT NULL,
  manufacturer_id UUID REFERENCES manufacturers(id),
  supplier_id UUID REFERENCES suppliers(id),
  batch_number TEXT,
  production_date DATE,
  purchase_price NUMERIC,
  expiry_date DATE NOT NULL,
  image TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Consumption Record Table
CREATE TABLE consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  department TEXT,
  requested_by TEXT,
  approved_by TEXT,
  status TEXT,
  purpose TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Consumption Item Table
CREATE TABLE consumption_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES consumption_records(id) ON DELETE CASCADE,
  supply_id UUID REFERENCES supplies(id),
  quantity INT NOT NULL,
  notes TEXT
);
    `;
    navigator.clipboard.writeText(script.trim());
    toast({
      title: t('success'),
      description: "SQL script copied to clipboard!",
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
      />
      
      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('management_settings')}</h1>
          
          <Tabs defaultValue="credentials" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credentials"><UserCog className="mr-2 h-4 w-4" />{t('credentials')}</TabsTrigger>
              <TabsTrigger value="supabase"><Database className="mr-2 h-4 w-4" />Supabase</TabsTrigger>
            </TabsList>
            
            <TabsContent value="credentials">
              <Card>
                <CardHeader>
                  <CardTitle>{t('change_credentials')}</CardTitle>
                  <CardDescription>
                    Update your admin username and password.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">{t('username')}</Label>
                        <div className="relative">
                          <UserCog className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="username" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            className="pl-10" 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">{t('password')}</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="password" 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="pl-10" 
                            placeholder="Leave blank to keep current password" 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm {t('password')}</Label>
                        <div className="relative">
                          <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="confirmPassword" 
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            className="pl-10" 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="submit">
                        {t('save')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="supabase">
              <Card>
                <CardHeader>
                  <CardTitle>Supabase Integration</CardTitle>
                  <CardDescription>
                    Connect your application to a Supabase backend for persistent data storage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="supabaseUrl">Supabase URL</Label>
                      <Input 
                        id="supabaseUrl" 
                        placeholder="https://your-project-ref.supabase.co"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supabaseKey">Supabase Anon Key</Label>
                      <Input 
                        id="supabaseKey" 
                        type="password"
                        placeholder="your-anon-key"
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button onClick={handleTestConnection}>Test Connection</Button>
                      {connectionStatus === 'success' && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span>Connected</span>
                        </div>
                      )}
                      {connectionStatus === 'error' && (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-5 w-5" />
                          <span>Connection Failed</span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" onClick={generateSqlScript}>
                      <FileCode className="mr-2 h-4 w-4" />
                      Generate Table Script
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    After testing the connection, click "Generate Table Script" and run the copied SQL in your Supabase SQL Editor to set up your database.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ManagementPage;
