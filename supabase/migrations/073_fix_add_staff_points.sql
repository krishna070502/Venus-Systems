-- Update add_staff_points to include reason_code parameter
CREATE OR REPLACE FUNCTION public.add_staff_points(
    p_user_id UUID,
    p_store_id INTEGER,
    p_points INTEGER,
    p_reason VARCHAR(100),
    p_reason_code VARCHAR(50) DEFAULT NULL,
    p_reason_details TEXT DEFAULT NULL,
    p_ref_id UUID DEFAULT NULL,
    p_ref_type VARCHAR(50) DEFAULT NULL,
    p_effective_date DATE DEFAULT CURRENT_DATE,
    p_weight_handled DECIMAL(10,3) DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
BEGIN
    INSERT INTO public.staff_points (
        user_id, store_id, points_change, reason, reason_code, reason_details,
        ref_id, ref_type, effective_date, created_by, weight_handled
    ) VALUES (
        p_user_id, p_store_id, p_points, p_reason, p_reason_code, p_reason_details,
        p_ref_id, p_ref_type, p_effective_date, auth.uid(), p_weight_handled
    )
    RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.add_staff_points(UUID, INTEGER, INTEGER, VARCHAR, VARCHAR, TEXT, UUID, VARCHAR, DATE, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_staff_points(UUID, INTEGER, INTEGER, VARCHAR, VARCHAR, TEXT, UUID, VARCHAR, DATE, DECIMAL) TO service_role;
