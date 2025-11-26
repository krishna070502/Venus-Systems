#!/bin/bash

# Quick Setup Script for Audit Logging
# This will help you set up the audit log system

echo "🔍 Setting up Audit Logging System..."
echo ""
echo "📋 Step 1: Run the SQL Migration"
echo "================================"
echo ""
echo "1. Open your browser and go to:"
echo "   https://rwbrcenqafknsqvxgvqq.supabase.co"
echo ""
echo "2. Click on 'SQL Editor' in the left sidebar"
echo ""
echo "3. Click 'New Query'"
echo ""
echo "4. Copy and paste the ENTIRE contents of this file:"
echo "   supabase/migrations/003_audit_logs.sql"
echo ""
echo "5. Click 'Run' or press Cmd/Ctrl + Enter"
echo ""
echo "You should see: ✅ Success"
echo ""
echo "================================"
echo ""
echo "After running the migration, the system will automatically log:"
echo "  ✓ Role changes (even 1 letter changes)"
echo "  ✓ Permission changes"
echo "  ✓ User profile updates"
echo "  ✓ Role assignments"
echo "  ✓ Permission assignments"
echo "  ✓ All deletions"
echo ""
echo "View logs at: http://localhost:3001/admin/logs"
echo ""
echo "Press Enter when you've run the migration..."
read

echo ""
echo "🔄 Restarting backend to apply changes..."
cd "$(dirname "$0")/backend"
pkill -f uvicorn
sleep 1
source venv/bin/activate
python -m uvicorn app.main:app --reload &

echo ""
echo "✅ Setup complete!"
echo ""
echo "Try it out:"
echo "1. Go to http://localhost:3001/admin/roles"
echo "2. Edit a role description (change even 1 letter)"
echo "3. Go to http://localhost:3001/admin/logs"
echo "4. You'll see the exact change logged!"
echo ""
