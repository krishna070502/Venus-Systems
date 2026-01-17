-- Add expense_status to daily_settlements
-- Values: 'SUBMITTED', 'APPROVED', 'REJECTED'

ALTER TABLE daily_settlements 
ADD COLUMN IF NOT EXISTS expense_status TEXT DEFAULT 'SUBMITTED';

-- If there's an existing check constraint on status, we'll leave it as is 
-- and just use this new column for granular control.

-- Default existing APPROVED settlements to have APPROVED expenses
UPDATE daily_settlements 
SET expense_status = 'APPROVED' 
WHERE status IN ('APPROVED', 'LOCKED');
