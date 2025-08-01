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
import { UserCog, Lock, ShieldCheck, Database, CheckCircle, XCircle, FileCode, Loader2 } from 'lucide-react';
import { testSupabaseConnection } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';

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
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [tables, setTables] = useState<string[]>([]);

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
    
    setConnectionStatus('testing');
    setConnectionMessage('');
    setTables([]);

    const result = await testSupabaseConnection(supabaseUrl, supabaseKey);

    if (result.success) {
      setConnectionStatus('success');
      setTables(result.tables || []);
      toast({
        title: t('success'),
        description: "Connection to Supabase successful!",
      });
    } else {
      setConnectionStatus('error');
      setConnectionMessage(result.error || 'An unknown error occurred.');
      toast({
        title: t('error'),
        description: `Connection failed: ${result.error}`,
        variant: "destructive",
      });
    }
  };

  const handleSaveCredentials = () => {
    if (!supabaseUrl || !supabaseKey) {
      toast({
        title: t('error'),
        description: "Please provide both Supabase URL and Key before saving.",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem('supabaseUrl', supabaseUrl);
    localStorage.setItem('supabaseKey', supabaseKey);
    toast({
      title: t('success'),
      description: "Supabase credentials saved successfully!",
    });
    // You might want to reset connection status to encourage re-testing with saved credentials
    setConnectionStatus('idle');
    setTables([]);
    setConnectionMessage('');
  };

  const generateSqlScript = () => {
    const script = `
-- CathLab Stock Manager - Supabase Schema v3
-- This script includes tables, RLS policies, and RPC functions for transactions.

-- Helper Function to Get Table Names
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE(table_name TEXT) AS $$
BEGIN
  RETURN QUERY 
  SELECT c.relname::text FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' AND n.nspname = 'public';
END;
$$ LANGUAGE plpgsql;

-- 1. TABLES
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE supply_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  alert_period INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  contact TEXT,
  phone TEXT,
  email TEXT
);

CREATE TABLE product_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID REFERENCES supply_types(id),
  variant_label TEXT,
  variants JSONB, -- e.g., [{"name": "2x10", "reorder_point": 5}]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_definition_id UUID NOT NULL REFERENCES product_definitions(id),
  variant TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity INT NOT NULL CHECK (quantity >= 0),
  store_id UUID NOT NULL REFERENCES stores(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  supplier_id UUID REFERENCES suppliers(id),
  batch_number TEXT,
  expiry_date DATE NOT NULL,
  purchase_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  department TEXT,
  purpose TEXT,
  requested_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE consumption_record_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumption_record_id UUID NOT NULL REFERENCES consumption_records(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0)
);

-- 2. ROW LEVEL SECURITY (RLS)
-- Enable RLS for all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_record_items ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access
CREATE POLICY "Public read access" ON stores FOR SELECT USING (true);
CREATE POLICY "Public read access" ON supply_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON manufacturers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON product_definitions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON inventory_items FOR SELECT USING (true);
CREATE POLICY "Public read access" ON consumption_records FOR SELECT USING (true);
CREATE POLICY "Public read access" ON consumption_record_items FOR SELECT USING (true);

-- Create policies to allow authenticated users to perform all actions
CREATE POLICY "Allow all for authenticated users" ON stores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON supply_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON manufacturers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON suppliers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON product_definitions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON inventory_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON consumption_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON consumption_record_items FOR ALL USING (auth.role() = 'authenticated');


-- 3. RPC FUNCTIONS FOR TRANSACTIONS

-- Function to create a consumption record and update inventory atomically
CREATE OR REPLACE FUNCTION create_consumption_record(
    p_date DATE,
    p_department TEXT,
    p_purpose TEXT,
    p_requested_by TEXT,
    p_notes TEXT,
    p_items JSONB -- e.g., '[{"inventory_item_id": "uuid", "quantity": 1}]'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    new_record_id UUID;
    item RECORD;
    current_quantity INT;
    new_record JSONB;
BEGIN
    -- Insert the main consumption record
    INSERT INTO consumption_records (date, department, purpose, requested_by, notes)
    VALUES (p_date, p_department, p_purpose, p_requested_by, p_notes)
    RETURNING id INTO new_record_id;

    -- Loop through items and update inventory
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(inventory_item_id UUID, quantity INT)
    LOOP
        -- Check current inventory
        SELECT quantity INTO current_quantity FROM inventory_items WHERE id = item.inventory_item_id;
        
        IF current_quantity IS NULL OR current_quantity < item.quantity THEN
            RAISE EXCEPTION 'insufficient_quantity: Not enough stock for item %', item.inventory_item_id;
        END IF;

        -- Update inventory
        UPDATE inventory_items
        SET quantity = quantity - item.quantity
        WHERE id = item.inventory_item_id;

        -- Insert into consumption_record_items
        INSERT INTO consumption_record_items (consumption_record_id, inventory_item_id, quantity)
        VALUES (new_record_id, item.inventory_item_id, item.quantity);
    END LOOP;

    -- Return the newly created record with its items
    SELECT jsonb_build_object(
        'id', r.id,
        'date', r.date,
        'department', r.department,
        'purpose', r.purpose,
        'requested_by', r.requested_by,
        'notes', r.notes,
        'created_at', r.created_at,
        'items', (SELECT jsonb_agg(jsonb_build_object('id', i.id, 'inventory_item_id', i.inventory_item_id, 'quantity', i.quantity)) FROM consumption_record_items i WHERE i.consumption_record_id = r.id)
    ) INTO new_record
    FROM consumption_records r
    WHERE r.id = new_record_id;

    RETURN new_record;
END;
$$;

-- Function to delete a consumption record and restore inventory atomically
CREATE OR REPLACE FUNCTION delete_consumption_record(p_record_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    item RECORD;
BEGIN
    -- Find all items in the record to be deleted
    FOR item IN SELECT inventory_item_id, quantity FROM consumption_record_items WHERE consumption_record_id = p_record_id
    LOOP
        -- Restore the quantity to the inventory
        UPDATE inventory_items
        SET quantity = quantity + item.quantity
        WHERE id = item.inventory_item_id;
    END LOOP;

    -- Delete the consumption record (items will be deleted by CASCADE)
    DELETE FROM consumption_records WHERE id = p_record_id;
END;
$$;
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
          <h1 className="text-2xl font-bold mb-6">{t('management_settings_nav')}</h1>
          
          <Tabs defaultValue="credentials" className="w-full">
            <div className="md:flex md:space-x-4">
              <TabsList className="grid w-full md:w-auto md:grid-cols-1 md:h-full">
                <TabsTrigger value="credentials"><UserCog className="mr-2 h-4 w-4" />{t('credentials')}</TabsTrigger>
                <TabsTrigger value="supabase"><Database className="mr-2 h-4 w-4" />Supabase</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 mt-4 md:mt-0">
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
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Button onClick={handleSaveCredentials}>
                        Save Credentials
                      </Button>
                      <Button onClick={handleTestConnection} disabled={connectionStatus === 'testing'}>
                        {connectionStatus === 'testing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Test Connection
                      </Button>
                    </div>
                    <Button variant="outline" onClick={generateSqlScript}>
                      <FileCode className="mr-2 h-4 w-4" />
                      Generate Table Script
                    </Button>
                  </div>

                  {connectionStatus === 'success' && (
                    <div className="p-4 border rounded-md bg-green-50 border-green-200 text-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Connection Successful</span>
                      </div>
                      <p className="text-sm mb-2">Successfully connected and found the following tables:</p>
                      <div className="flex flex-wrap gap-2">
                        {tables.map(table => <Badge key={table} variant="outline" className="bg-white">{table}</Badge>)}
                      </div>
                    </div>
                  )}
                  {connectionStatus === 'error' && (
                    <div className="p-4 border rounded-md bg-red-50 border-red-200 text-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-5 w-5" />
                        <span className="font-semibold">Connection Failed</span>
                      </div>
                      <p className="text-sm">{connectionMessage}</p>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    After testing the connection, click "Generate Table Script" and run the copied SQL in your Supabase SQL Editor to set up your database.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ManagementPage;
