Audit Walkthrough: Venus-System API Consistency
I have completed a comprehensive audit of the backend (FastAPI) and frontend (Next.js) to identify any endpoint mismatches, logic breaks, or potential application breaks.

🔴 Critical Mismatches (Functional Breaks)--- Fixed
1. Missing Settlement Reject Endpoint
The frontend expects a "Reject" capability for settlements, but the backend implementation is incomplete.

Frontend Call: api.poultry.settlements.reject(id) -> POST /api/v1/poultry/settlements/{id}/reject
Backend Router: 
settlements.py
 lacks a corresponding @router.post("/{settlement_id}/reject").
Impact: Any attempt to reject a settlement from the UI will result in a 404 error.
2. SKU Pricing POST Route Mismatch--- Fixed
There is a naming inconsistency in the Store Pricing implementation.

Frontend Call: api.poultry.skus.setPrice(data) -> POST /api/v1/poultry/skus/prices/store
Backend Router: 
skus.py
 defines the endpoint at @router.post("/prices").
Impact: SKU price updates will fail from the frontend.
🟡 Logic & Structural Issues
3. Missing Dashboard Integration
While the backend has a sophisticated 
user_dashboard.py
 router, it is not yet integrated into the frontend API client.

Backend Status: Registered at /api/v1/user/dashboard.
Frontend Status: String user/dashboard is missing from 
client.ts
.
Impact: Dashboard customization features (shortcuts, layout preferences) are unreachable via standard API calls.
4. Fragmented Inventory Logic
The system is currently maintaining two parallel inventory management systems:

Legacy: 
business_management.py
 (/api/v1/business-management/inventory)
Modern: 
skus.py
 and 
inventory_unified.py
 (/api/v1/poultry/skus)
Observation: The 
inventory_unified.py
 correctly provides a compatibility layer, but the frontend 
client.ts
 still points to the old business-management routes for core Shop and Manager functions.
🟢 Verified Consistent Modules
The following modules were audited and found to be correctly synchronized:

Auth & Users: All profile management, session recording, and RBAC checks match.
Payments & Receipts: Financial ledger integration and transaction endpoints are consistent.
Staff Points & Grading: Performance tracking and automated point awarding logic is intact.
Expense Management: The approval/rejection flow for expenses (linked to settlements) is correctly implemented on both sides.
🛠 Next Steps (Recommendation)
As per your instructions, no code was modified. I recommend the following fixes for the next phase:

Implement the 
reject
 endpoint in 
settlements.py
.
Align the SKU pricing POST route in 
skus.py
 or update the frontend client.
Expose the user_dashboard endpoints in the frontend client.