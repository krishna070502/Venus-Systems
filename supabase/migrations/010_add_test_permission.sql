-- Add test.run permission
INSERT INTO public.permissions (key, description) 
VALUES ('test.run', 'Can access and run system tests')
ON CONFLICT (key) DO NOTHING;

-- Assign test.run permission to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key = 'test.run'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Verify the permission was created
SELECT p.key, p.description, r.name as assigned_to_role
FROM public.permissions p
LEFT JOIN public.role_permissions rp ON p.id = rp.permission_id
LEFT JOIN public.roles r ON rp.role_id = r.id
WHERE p.key = 'test.run';
