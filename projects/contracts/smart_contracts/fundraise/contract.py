"""
CampusPay Fundraising Contract (ClearFund™)
============================================
Transparent fundraising with milestone-based escrow release.

Algorand Features Used:
- Smart Contract Escrow: funds locked until milestones achieved
- Inner Transactions: automated milestone payouts
- Box Storage: campaign data, donor tracking, milestone progress
- On-chain Transparency: every donation and release is publicly verifiable
- Refund Mechanism: donors can reclaim if campaign fails

Use Case:
- NSS/club fundraising campaigns
- Hackathon sponsorships and prize pools
- College infrastructure projects
- Disaster relief and social causes
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


class Campaign(arc4.Struct):
    """On-chain fundraising campaign."""
    creator: arc4.Address
    goal: arc4.UInt64
    raised: arc4.UInt64
    num_milestones: arc4.UInt64
    milestones_released: arc4.UInt64
    deadline: arc4.UInt64
    active: arc4.Bool
    fully_funded: arc4.Bool


class FundraisingContract(ARC4Contract):
    """
    ClearFund™ - Transparent fundraising with milestone-based release.
    
    Why Algorand?
    - Every donation is an on-chain, publicly verifiable transaction
    - Smart contract escrow holds funds until milestones are met
    - Milestone releases require creator action — donors see where money goes
    - Refund mechanism if campaign fails to reach goal by deadline
    - Full audit trail replaces opaque traditional fundraising
    
    How It Works:
    1. Creator defines campaign with goal, deadline, and number of milestones
    2. Donors send ALGO to the contract (tracked per-donor)
    3. Once goal is met, creator can release funds milestone-by-milestone
    4. Each milestone releases (goal / num_milestones) ALGO
    5. If deadline passes without reaching goal, donors can claim refunds
    """

    def __init__(self) -> None:
        self.campaigns = BoxMap(UInt64, Campaign)
        # Track per-donor contributions: (campaign_id, donor) -> amount
        self.donations = BoxMap(arc4.Tuple[arc4.UInt64, arc4.Address], arc4.UInt64)

        self.next_campaign_id = UInt64(0)
        self.total_campaigns = UInt64(0)
        self.total_raised = UInt64(0)

    @arc4.abimethod
    def create_campaign(
        self,
        goal: UInt64,
        num_milestones: UInt64,
        deadline: UInt64,
        title: arc4.String,
        description: arc4.String,
    ) -> UInt64:
        """
        Create a new fundraising campaign.
        
        Args:
            goal: Fundraising target in microALGO
            num_milestones: Number of milestone releases (1-10)
            deadline: Unix timestamp deadline for reaching goal
            title: Campaign title (stored in txn note)
            description: Campaign description (stored in txn note)
            
        Returns:
            campaign_id: Unique campaign identifier
        """
        assert goal > UInt64(0), "Goal must be positive"
        assert num_milestones >= UInt64(1), "At least 1 milestone"
        assert num_milestones <= UInt64(10), "Max 10 milestones"
        assert deadline > Global.latest_timestamp, "Deadline must be in future"

        campaign_id = self.next_campaign_id
        self.next_campaign_id += UInt64(1)

        campaign = Campaign(
            creator=arc4.Address(Txn.sender),
            goal=arc4.UInt64(goal),
            raised=arc4.UInt64(0),
            num_milestones=arc4.UInt64(num_milestones),
            milestones_released=arc4.UInt64(0),
            deadline=arc4.UInt64(deadline),
            active=arc4.Bool(True),
            fully_funded=arc4.Bool(False),
        )
        self.campaigns[campaign_id] = campaign

        self.total_campaigns += UInt64(1)
        return campaign_id

    @arc4.abimethod
    def donate(
        self,
        campaign_id: UInt64,
        payment: gtxn.PaymentTransaction,
    ) -> None:
        """
        Donate to a fundraising campaign.
        
        Donations are tracked per-donor for potential refund claims.
        The payment is grouped atomically with this app call.
        
        Args:
            campaign_id: Campaign to donate to
            payment: Grouped payment transaction
        """
        assert self.campaigns.maybe(campaign_id)[1], "Campaign not found"
        campaign = self.campaigns[campaign_id]

        assert campaign.active.native, "Campaign not active"
        assert payment.receiver == Global.current_application_address, "Pay to app"
        assert payment.amount > UInt64(0), "Amount must be positive"

        # Track donor's contribution
        donor_key = arc4.Tuple((arc4.UInt64(campaign_id), arc4.Address(Txn.sender)))
        current_donation = arc4.UInt64(0)
        maybe_val, exists = self.donations.maybe(donor_key)
        if exists:
            current_donation = maybe_val
        self.donations[donor_key] = arc4.UInt64(current_donation.native + payment.amount)

        # Update campaign raised amount
        new_raised = campaign.raised.native + payment.amount
        campaign.raised = arc4.UInt64(new_raised)

        # Check if fully funded
        if new_raised >= campaign.goal.native:
            campaign.fully_funded = arc4.Bool(True)

        self.campaigns[campaign_id] = campaign
        self.total_raised += payment.amount

    @arc4.abimethod
    def release_milestone(self, campaign_id: UInt64) -> None:
        """
        Release the next milestone's funds to the campaign creator.
        
        Each milestone releases (goal / num_milestones) ALGO.
        Only the creator can trigger releases, and only after goal is met.
        
        Args:
            campaign_id: Campaign to release milestone for
        """
        assert self.campaigns.maybe(campaign_id)[1], "Campaign not found"
        campaign = self.campaigns[campaign_id]

        assert Txn.sender == campaign.creator.native, "Only creator"
        assert campaign.fully_funded.native, "Not fully funded yet"
        assert campaign.milestones_released.native < campaign.num_milestones.native, "All milestones released"

        # Calculate milestone amount
        milestone_amount = campaign.goal.native // campaign.num_milestones.native

        # Release funds via inner transaction
        itxn.Payment(
            receiver=campaign.creator.native,
            amount=milestone_amount,
            fee=UInt64(0),
        ).submit()

        # Update milestone counter
        campaign.milestones_released = arc4.UInt64(
            campaign.milestones_released.native + UInt64(1)
        )

        # Deactivate campaign if all milestones released
        if campaign.milestones_released.native == campaign.num_milestones.native:
            campaign.active = arc4.Bool(False)

        self.campaigns[campaign_id] = campaign

    @arc4.abimethod
    def claim_refund(self, campaign_id: UInt64) -> None:
        """
        Claim a refund if the campaign failed to reach its goal.
        
        Refunds are only available after the deadline has passed
        and the campaign did not reach its funding goal.
        
        Args:
            campaign_id: Campaign to claim refund from
        """
        assert self.campaigns.maybe(campaign_id)[1], "Campaign not found"
        campaign = self.campaigns[campaign_id]

        # Refund only if deadline passed and not fully funded
        assert Global.latest_timestamp > campaign.deadline.native, "Deadline not passed"
        assert not campaign.fully_funded.native, "Campaign was funded, no refund"

        # Get donor's contribution
        donor_key = arc4.Tuple((arc4.UInt64(campaign_id), arc4.Address(Txn.sender)))
        maybe_val, exists = self.donations.maybe(donor_key)
        assert exists, "No donation found"
        refund_amount = maybe_val.native
        assert refund_amount > UInt64(0), "Nothing to refund"

        # Zero out the donation record
        self.donations[donor_key] = arc4.UInt64(0)

        # Refund via inner transaction
        itxn.Payment(
            receiver=Txn.sender,
            amount=refund_amount,
            fee=UInt64(0),
        ).submit()

    @arc4.abimethod(readonly=True)
    def get_campaign_info(
        self,
        campaign_id: UInt64,
    ) -> arc4.Tuple[arc4.Address, arc4.UInt64, arc4.UInt64, arc4.UInt64, arc4.UInt64, arc4.Bool]:
        """
        Get campaign details.
        
        Returns:
            (creator, goal, raised, num_milestones, milestones_released, active)
        """
        assert self.campaigns.maybe(campaign_id)[1], "Campaign not found"
        campaign = self.campaigns[campaign_id]
        return arc4.Tuple(
            (
                campaign.creator,
                campaign.goal,
                campaign.raised,
                campaign.num_milestones,
                campaign.milestones_released,
                campaign.active,
            )
        )

    @arc4.abimethod(readonly=True)
    def get_donation(
        self,
        campaign_id: UInt64,
        donor: Account,
    ) -> arc4.UInt64:
        """Get a donor's total contribution to a campaign."""
        key = arc4.Tuple((arc4.UInt64(campaign_id), arc4.Address(donor)))
        maybe_val, exists = self.donations.maybe(key)
        if exists:
            return maybe_val
        return arc4.UInt64(0)

    @arc4.abimethod(readonly=True)
    def get_platform_stats(self) -> arc4.Tuple[arc4.UInt64, arc4.UInt64]:
        """
        Get platform statistics.
        
        Returns:
            (total_campaigns, total_raised)
        """
        return arc4.Tuple(
            (arc4.UInt64(self.total_campaigns), arc4.UInt64(self.total_raised))
        )
