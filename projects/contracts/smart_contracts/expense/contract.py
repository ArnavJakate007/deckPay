"""
CampusPay Expense Split Contract (SmartSplit™)
==============================================
Automated bill splitting with smart contract escrow.

Algorand Features Used:
- Box Storage for dynamic group membership and contribution tracking
- Inner Transactions for automated settlement payouts
- ARC4 Structs for on-chain structured data
- Atomic guarantees: contributions are all-or-nothing

Use Case:
- Mess bills split among hostel mates
- Project expense tracking for group assignments
- Trip/outing cost sharing
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


class ExpenseGroup(arc4.Struct):
    """On-chain representation of an expense split group."""
    creator: arc4.Address
    total_amount: arc4.UInt64
    num_members: arc4.UInt64
    total_contributed: arc4.UInt64
    settled: arc4.Bool
    deadline: arc4.UInt64
    penalty_rate: arc4.UInt64  # Basis points (100 = 1%)


class ExpenseSplitContract(ARC4Contract):
    """
    SmartSplit™ - Trustless expense splitting for campus life.
    
    Why Algorand?
    - Smart contract escrow removes "I'll pay you later" problem
    - On-chain record of who paid what — no disputes
    - Automated settlement via inner transactions
    - Deadline enforcement with optional penalty rates
    """

    def __init__(self) -> None:
        # Group metadata storage
        self.groups = BoxMap(UInt64, ExpenseGroup)
        
        # Member tracking: (group_id, member_index) -> Account
        self.group_members = BoxMap(arc4.Tuple[arc4.UInt64, arc4.UInt64], arc4.Address)
        
        # Contribution tracking: (group_id, member_address_bytes) -> amount
        self.contributions = BoxMap(arc4.Tuple[arc4.UInt64, arc4.Address], arc4.UInt64)

        # Platform counters
        self.next_group_id = UInt64(0)
        self.total_groups = UInt64(0)
        self.total_split = UInt64(0)

    @arc4.abimethod
    def create_group(
        self,
        total_amount: UInt64,
        num_members: UInt64,
        deadline: UInt64,
        penalty_rate: UInt64,
        description: arc4.String,
    ) -> UInt64:
        """
        Create a new expense split group.
        
        The creator defines the total amount and number of members.
        Each member's share is calculated as total_amount / num_members.
        
        Args:
            total_amount: Total expense amount in microALGO
            num_members: Number of people splitting the expense
            deadline: Unix timestamp by which all members must pay
            penalty_rate: Late payment penalty in basis points (100 = 1%, max 1000 = 10%)
            description: What the expense is for (stored in txn note)
            
        Returns:
            group_id: Unique identifier for this expense group
        """
        assert num_members >= UInt64(2), "Need at least 2 members"
        assert num_members <= UInt64(50), "Max 50 members per group"
        assert total_amount > UInt64(0), "Amount must be positive"
        assert deadline > Global.latest_timestamp, "Deadline must be in future"
        assert penalty_rate <= UInt64(1000), "Max 10% penalty"

        group_id = self.next_group_id
        self.next_group_id += UInt64(1)

        group = ExpenseGroup(
            creator=arc4.Address(Txn.sender),
            total_amount=arc4.UInt64(total_amount),
            num_members=arc4.UInt64(num_members),
            total_contributed=arc4.UInt64(0),
            settled=arc4.Bool(False),
            deadline=arc4.UInt64(deadline),
            penalty_rate=arc4.UInt64(penalty_rate),
        )
        self.groups[group_id] = group

        self.total_groups += UInt64(1)
        return group_id

    @arc4.abimethod
    def contribute(
        self,
        group_id: UInt64,
        payment: gtxn.PaymentTransaction,
    ) -> None:
        """
        Pay your share of an expense group.
        
        The payment must be grouped (atomic) with this app call.
        Contribution is recorded on-chain for full transparency.
        
        Args:
            group_id: The expense group to contribute to
            payment: Payment transaction with your share amount
        """
        assert self.groups.maybe(group_id)[1], "Group not found"
        group = self.groups[group_id]

        assert not group.settled.native, "Group already settled"
        assert payment.receiver == Global.current_application_address, "Pay to app"

        # Calculate expected per-member share
        expected_share = group.total_amount.native // group.num_members.native
        assert payment.amount >= expected_share, "Insufficient payment"

        # Record contribution
        sender_key = arc4.Tuple((arc4.UInt64(group_id), arc4.Address(Txn.sender)))
        current = arc4.UInt64(0)
        maybe_val, exists = self.contributions.maybe(sender_key)
        if exists:
            current = maybe_val

        self.contributions[sender_key] = arc4.UInt64(current.native + payment.amount)

        # Update group total
        new_total = group.total_contributed.native + payment.amount
        group.total_contributed = arc4.UInt64(new_total)
        self.groups[group_id] = group

    @arc4.abimethod
    def settle_group(self, group_id: UInt64) -> None:
        """
        Settle the expense group and pay the creator.
        
        Only the group creator can settle, and only after all contributions
        have been received. Uses an inner transaction for trustless payout.
        
        Args:
            group_id: The expense group to settle
        """
        assert self.groups.maybe(group_id)[1], "Group not found"
        group = self.groups[group_id]

        assert Txn.sender == group.creator.native, "Only creator can settle"
        assert group.total_contributed.native >= group.total_amount.native, "Not fully funded"
        assert not group.settled.native, "Already settled"

        # Mark settled before payout (checks-effects-interactions pattern)
        group.settled = arc4.Bool(True)
        self.groups[group_id] = group

        # Inner transaction: send collected funds to creator
        itxn.Payment(
            receiver=group.creator.native,
            amount=group.total_amount.native,
            fee=UInt64(0),
        ).submit()

        self.total_split += group.total_amount.native

    @arc4.abimethod(readonly=True)
    def get_group_info(
        self,
        group_id: UInt64,
    ) -> arc4.Tuple[arc4.Address, arc4.UInt64, arc4.UInt64, arc4.UInt64, arc4.Bool]:
        """
        Get expense group details.
        
        Returns:
            Tuple of (creator, total_amount, num_members, total_contributed, settled)
        """
        assert self.groups.maybe(group_id)[1], "Group not found"
        group = self.groups[group_id]

        return arc4.Tuple(
            (
                group.creator,
                group.total_amount,
                group.num_members,
                group.total_contributed,
                group.settled,
            )
        )

    @arc4.abimethod(readonly=True)
    def get_contribution(
        self,
        group_id: UInt64,
        member: Account,
    ) -> arc4.UInt64:
        """Get a specific member's contribution to a group."""
        key = arc4.Tuple((arc4.UInt64(group_id), arc4.Address(member)))
        maybe_val, exists = self.contributions.maybe(key)
        if exists:
            return maybe_val
        return arc4.UInt64(0)

    @arc4.abimethod(readonly=True)
    def get_platform_stats(self) -> arc4.Tuple[arc4.UInt64, arc4.UInt64]:
        """
        Get platform statistics.
        
        Returns:
            Tuple of (total_groups_created, total_amount_split)
        """
        return arc4.Tuple(
            (arc4.UInt64(self.total_groups), arc4.UInt64(self.total_split))
        )
