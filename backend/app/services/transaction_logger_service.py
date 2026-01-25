"""
Business Transaction Logging Service
=====================================
Dedicated service for logging all business operations (sales, purchases,
expenses, transfers, settlements, processing) for accountability and audit trails.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from decimal import Decimal
from fastapi import Request
import logging

from app.services.supabase_client import supabase_client

logger = logging.getLogger(__name__)


class TransactionType:
    """Transaction type constants"""
    SALE = "SALE"
    PURCHASE = "PURCHASE"
    EXPENSE = "EXPENSE"
    TRANSFER = "TRANSFER"
    SETTLEMENT = "SETTLEMENT"
    PROCESSING = "PROCESSING"


class TransactionAction:
    """Action type constants"""
    CREATE = "CREATE"
    COMMIT = "COMMIT"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    CANCEL = "CANCEL"
    VOID = "VOID"
    LOCK = "LOCK"
    SUBMIT = "SUBMIT"
    RECEIVE = "RECEIVE"


class TransactionLogger:
    """Service for logging all business transactions"""
    
    @staticmethod
    async def log_transaction(
        user_id: str,
        transaction_type: str,
        action: str,
        store_id: Optional[int] = None,
        resource_id: Optional[str] = None,
        amount: Optional[Decimal] = None,
        quantity: Optional[Decimal] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Log a business transaction event.
        
        Args:
            user_id: ID of the user performing the action
            transaction_type: Type of transaction (SALE, PURCHASE, etc.)
            action: Type of action (CREATE, COMMIT, APPROVE, etc.)
            store_id: ID of the store where the transaction occurred
            resource_id: ID of the affected resource (sale_id, purchase_id, etc.)
            amount: Monetary value (if applicable)
            quantity: Quantity/weight (if applicable)
            metadata: Additional context (items, notes, etc.)
            request: FastAPI Request object for IP/user-agent extraction
        
        Returns:
            The created log entry or None if logging failed
        """
        try:
            # Extract request metadata
            ip_address = None
            user_agent = None
            
            if request:
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent")
            
            log_entry = {
                "user_id": user_id,
                "store_id": store_id,
                "transaction_type": transaction_type,
                "action": action,
                "resource_id": str(resource_id) if resource_id else None,
                "amount": float(amount) if amount is not None else None,
                "quantity": float(quantity) if quantity is not None else None,
                "metadata": metadata or {},
                "ip_address": ip_address,
                "user_agent": user_agent,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = supabase_client.table("business_transaction_logs").insert(log_entry).execute()
            
            if hasattr(result, 'data') and len(result.data) > 0:
                logger.info(
                    f"Transaction logged: {transaction_type}/{action} | "
                    f"User: {user_id} | Store: {store_id} | Resource: {resource_id}"
                )
                return result.data[0]
            else:
                logger.warning(f"Transaction log insert returned no data: {transaction_type}/{action}")
                return None
                
        except Exception as e:
            # Critical: Fail silently to not block the main transaction
            logger.error(f"Failed to log transaction: {str(e)}")
            return None
    
    @staticmethod
    async def log_sale(
        user_id: str,
        store_id: int,
        sale_id: str,
        total_amount: Decimal,
        total_weight: Optional[Decimal] = None,
        payment_method: Optional[str] = None,
        sale_type: Optional[str] = None,
        items_count: Optional[int] = None,
        request: Optional[Request] = None
    ) -> Optional[Dict[str, Any]]:
        """Convenience method for logging sales"""
        return await TransactionLogger.log_transaction(
            user_id=user_id,
            transaction_type=TransactionType.SALE,
            action=TransactionAction.CREATE,
            store_id=store_id,
            resource_id=sale_id,
            amount=total_amount,
            quantity=total_weight,
            metadata={
                "payment_method": payment_method,
                "sale_type": sale_type,
                "items_count": items_count
            },
            request=request
        )
    
    @staticmethod
    async def log_purchase(
        user_id: str,
        store_id: int,
        purchase_id: str,
        action: str,
        total_amount: Optional[Decimal] = None,
        total_weight: Optional[Decimal] = None,
        supplier_id: Optional[str] = None,
        bird_type: Optional[str] = None,
        request: Optional[Request] = None
    ) -> Optional[Dict[str, Any]]:
        """Convenience method for logging purchases"""
        return await TransactionLogger.log_transaction(
            user_id=user_id,
            transaction_type=TransactionType.PURCHASE,
            action=action,
            store_id=store_id,
            resource_id=purchase_id,
            amount=total_amount,
            quantity=total_weight,
            metadata={
                "supplier_id": str(supplier_id) if supplier_id else None,
                "bird_type": bird_type
            },
            request=request
        )
    
    @staticmethod
    async def log_expense(
        user_id: str,
        store_id: int,
        expense_id: str,
        action: str,
        amount: Optional[Decimal] = None,
        expense_notes: Optional[str] = None,
        request: Optional[Request] = None
    ) -> Optional[Dict[str, Any]]:
        """Convenience method for logging expense actions"""
        return await TransactionLogger.log_transaction(
            user_id=user_id,
            transaction_type=TransactionType.EXPENSE,
            action=action,
            store_id=store_id,
            resource_id=expense_id,
            amount=amount,
            metadata={"notes": expense_notes},
            request=request
        )
    
    @staticmethod
    async def log_transfer(
        user_id: str,
        transfer_id: str,
        action: str,
        from_store_id: Optional[int] = None,
        to_store_id: Optional[int] = None,
        quantity: Optional[Decimal] = None,
        bird_type: Optional[str] = None,
        inventory_type: Optional[str] = None,
        request: Optional[Request] = None
    ) -> Optional[Dict[str, Any]]:
        """Convenience method for logging transfers"""
        # Use from_store as the primary store_id for logging
        return await TransactionLogger.log_transaction(
            user_id=user_id,
            transaction_type=TransactionType.TRANSFER,
            action=action,
            store_id=from_store_id,
            resource_id=transfer_id,
            quantity=quantity,
            metadata={
                "from_store_id": from_store_id,
                "to_store_id": to_store_id,
                "bird_type": bird_type,
                "inventory_type": inventory_type
            },
            request=request
        )
    
    @staticmethod
    async def log_settlement(
        user_id: str,
        store_id: int,
        settlement_id: str,
        action: str,
        declared_cash: Optional[Decimal] = None,
        declared_sales: Optional[Decimal] = None,
        expense_amount: Optional[Decimal] = None,
        settlement_date: Optional[str] = None,
        request: Optional[Request] = None
    ) -> Optional[Dict[str, Any]]:
        """Convenience method for logging settlements"""
        return await TransactionLogger.log_transaction(
            user_id=user_id,
            transaction_type=TransactionType.SETTLEMENT,
            action=action,
            store_id=store_id,
            resource_id=settlement_id,
            amount=declared_cash,
            metadata={
                "declared_sales": float(declared_sales) if declared_sales else None,
                "expense_amount": float(expense_amount) if expense_amount else None,
                "settlement_date": settlement_date
            },
            request=request
        )
    
    @staticmethod
    async def log_processing(
        user_id: str,
        store_id: int,
        processing_id: str,
        input_weight: Decimal,
        output_weight: Decimal,
        wastage_weight: Decimal,
        bird_type: Optional[str] = None,
        output_type: Optional[str] = None,
        request: Optional[Request] = None
    ) -> Optional[Dict[str, Any]]:
        """Convenience method for logging processing entries"""
        return await TransactionLogger.log_transaction(
            user_id=user_id,
            transaction_type=TransactionType.PROCESSING,
            action=TransactionAction.CREATE,
            store_id=store_id,
            resource_id=processing_id,
            quantity=input_weight,
            metadata={
                "input_weight": float(input_weight),
                "output_weight": float(output_weight),
                "wastage_weight": float(wastage_weight),
                "bird_type": bird_type,
                "output_type": output_type
            },
            request=request
        )


# Global instance
transaction_logger = TransactionLogger()
