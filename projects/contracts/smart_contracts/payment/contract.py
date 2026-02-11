"""
CampusPay Payment Contract (InstaPay™)
======================================
Handles P2P transfers, deposits, withdrawals with campus verification.

Algorand Features Used:
- Inner Transactions (itxn) for trustless withdrawals
- Box Storage (BoxMap) for user balances and campus verification
- ARC4 ABI methods for type-safe contract interaction
- Micro-transaction efficiency (~0.001 ALGO fee vs 2%+ traditional gateways)

Architecture:
- Users deposit ALGO into the contract, creating an on-chain balance
- P2P transfers happen as balance updates (instant, no settlement delay)
- Withdrawals use inner transactions to send ALGO back to users
- Campus verification provides identity layer for trust
"""

from algopy import (
    ARC4Contract,
    Account,
    BoxMap,
    Global,
    Txn,
    UInt64,
    gtxn,
    itxn,
)
from algopy import arc4


class PaymentContract(ARC4Contract):
    """
    InstaPay™ - WhatsApp-style P2P payments for campus students.
    
    Why Algorand?
    - 4.5s finality vs 2-7 day settlement on traditional rails
    - ~₹0.07 per txn vs ₹15-20 on Razorpay/Paytm
    - Non-custodial: users control their own keys via Pera Wallet
    """

    def __init__(self) -> None:
        # User balances stored in Box Storage for dynamic, scalable data
        self.balances = BoxMap(Account, UInt64)

        # Campus verification layer
        self.campus_verified = BoxMap(Account, arc4.Bool)
        self.campus_id = BoxMap(Account, arc4.String)

        # Platform-wide statistics (stored in global state)
        self.total_volume = UInt64(0)
        self.total_transactions = UInt64(0)
        self.active_users = UInt64(0)

    @arc4.abimethod
    def deposit(self, payment: gtxn.PaymentTransaction) -> None:
        """
        Deposit ALGO into CampusPay wallet.
        
        The payment transaction must be grouped with this app call.
        Funds are held by the contract and tracked via Box Storage.
        
        Args:
            payment: Grouped payment transaction to the app address
        """
        assert payment.receiver == Global.current_application_address, "Payment must be to app"
        assert payment.amount > UInt64(0), "Amount must be positive"

        sender = Txn.sender
        current_balance = self.balances.get(sender, default=UInt64(0))
        self.balances[sender] = current_balance + payment.amount

        # Track if this is a new user
        if current_balance == UInt64(0):
            self.active_users += UInt64(1)

        self.total_volume += payment.amount
        self.total_transactions += UInt64(1)

    @arc4.abimethod
    def send_money(
        self,
        recipient: Account,
        amount: UInt64,
        note: arc4.String,
    ) -> UInt64:
        """
        Send money to another CampusPay user (InstaPay™).
        
        Transfer happens as an internal balance update — instant, no inner txn needed.
        The note is stored on-chain via the ABI call's transaction note field.
        
        Args:
            recipient: Recipient's Algorand account address
            amount: Amount in microALGO (1 ALGO = 1,000,000 microALGO)
            note: Human-readable note (e.g., "Mess bill January")
            
        Returns:
            Transaction counter (unique ID for this transfer)
        """
        sender = Txn.sender

        # Validate sender has sufficient balance
        sender_balance = self.balances.get(sender, default=UInt64(0))
        assert sender_balance >= amount, "Insufficient balance"
        assert amount > UInt64(0), "Amount must be positive"

        # Execute internal transfer
        self.balances[sender] = sender_balance - amount
        recipient_balance = self.balances.get(recipient, default=UInt64(0))
        self.balances[recipient] = recipient_balance + amount

        # Track new recipient if first interaction
        if recipient_balance == UInt64(0):
            self.active_users += UInt64(1)

        self.total_transactions += UInt64(1)
        return self.total_transactions

    @arc4.abimethod
    def withdraw(self, amount: UInt64) -> None:
        """
        Withdraw ALGO from CampusPay to external wallet.
        
        Uses an Algorand Inner Transaction to trustlessly send funds.
        The user doesn't need to trust a centralized operator.
        
        Args:
            amount: Amount to withdraw in microALGO
        """
        sender = Txn.sender
        sender_balance = self.balances.get(sender, default=UInt64(0))
        assert sender_balance >= amount, "Insufficient balance"
        assert amount > UInt64(0), "Amount must be positive"

        self.balances[sender] = sender_balance - amount

        # Inner transaction: contract sends ALGO directly to user
        itxn.Payment(
            receiver=sender,
            amount=amount,
            fee=UInt64(0),
        ).submit()

    @arc4.abimethod
    def verify_campus(
        self,
        user: Account,
        campus: arc4.String,
    ) -> arc4.Bool:
        """
        Verify a user's campus affiliation (admin-only).
        
        In production, this would use a DAO vote or oracle service.
        For the hackathon, only the contract creator can verify.
        
        Args:
            user: Account to verify
            campus: Campus identifier (e.g., "IIT-BOMBAY", "NIT-TRICHY")
            
        Returns:
            True if verification succeeded
        """
        assert Txn.sender == Global.creator_address, "Only creator can verify"

        self.campus_id[user] = campus
        self.campus_verified[user] = arc4.Bool(True)
        return arc4.Bool(True)

    @arc4.abimethod(readonly=True)
    def get_balance(self, user: Account) -> UInt64:
        """Get a user's CampusPay balance in microALGO."""
        return self.balances.get(user, default=UInt64(0))

    @arc4.abimethod(readonly=True)
    def is_verified(self, user: Account) -> arc4.Bool:
        """Check if a user has verified campus affiliation."""
        return self.campus_verified.get(user, default=arc4.Bool(False))

    @arc4.abimethod(readonly=True)
    def get_stats(self) -> arc4.Tuple[arc4.UInt64, arc4.UInt64, arc4.UInt64]:
        """
        Get platform-wide statistics.
        
        Returns:
            Tuple of (total_volume, total_transactions, active_users)
        """
        return arc4.Tuple(
            (
                arc4.UInt64(self.total_volume),
                arc4.UInt64(self.total_transactions),
                arc4.UInt64(self.active_users),
            )
        )
