const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Read the schema file
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    const { data, error } = await supabase.rpc('exec_sql', { sql: schema });
    
    if (error) {
      console.error('Error setting up database:', error);
      return;
    }
    
    console.log('Database setup completed successfully!');
    
    // Test the setup by trying to create a test user
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@achprocessing.com')
      .single();
    
    if (testError) {
      console.error('Error testing database:', testError);
    } else if (testUser) {
      console.log('✅ Default admin user found:', testUser.id);
    } else {
      console.log('⚠️  Default admin user not found');
    }
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupDatabase();

