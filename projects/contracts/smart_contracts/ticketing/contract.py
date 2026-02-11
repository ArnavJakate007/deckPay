"""
CampusPay Event Ticketing Contract (FairTicket™)
================================================
Anti-scalping NFT ticket system for college fests and events.

Algorand Features Used:
- Algorand Standard Assets (ASA) as NFT tickets
- Asset Freeze for soulbound (non-transferable) tickets
- Inner Transactions for NFT creation and transfer
- Box Storage for event and ticket metadata
- Clawback authority for post-event cleanup

Why NFTs for Tickets?
- Each ticket is a unique, verifiable digital asset
- Frozen ASAs can't be transferred = anti-scalping
- On-chain proof of purchase and attendance
- QR code at entry verifies ownership via Algorand Indexer
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


class Event(arc4.Struct):
    """On-chain event information."""
    organizer: arc4.Address
    price: arc4.UInt64
    max_tickets: arc4.UInt64
    sold: arc4.UInt64
    transferable: arc4.Bool
    start_time: arc4.UInt64
    end_time: arc4.UInt64


class Ticket(arc4.Struct):
    """On-chain ticket metadata linked to an ASA."""
    event_id: arc4.UInt64
    owner: arc4.Address
    ticket_number: arc4.UInt64
    used: arc4.Bool
    purchase_time: arc4.UInt64


class EventTicketingContract(ARC4Contract):
    """
    FairTicket™ - Anti-scalping NFT tickets for college fests.
    
    Why Algorand?
    - ASAs (Algorand Standard Assets) are native, first-class NFTs
    - Freeze capability makes tickets soulbound (non-transferable)
    - ~₹0.07 to mint a ticket vs ₹50+ on Ethereum
    - 4.5s finality means instant ticket delivery
    - Clawback allows organizers to revoke fraudulent tickets
    
    Anti-Scalping Mechanism:
    1. Ticket ASA is created with freeze=True
    2. Asset is frozen immediately after transfer to buyer
    3. Frozen assets cannot be transferred by the holder
    4. Only the contract (clawback authority) can move them
    """

    def __init__(self) -> None:
        self.events = BoxMap(UInt64, Event)
        self.tickets = BoxMap(UInt64, Ticket)  # ASA ID -> Ticket info

        self.next_event_id = UInt64(0)
        self.total_tickets_sold = UInt64(0)

    @arc4.abimethod
    def create_event(
        self,
        name: arc4.String,
        price: UInt64,
        max_tickets: UInt64,
        transferable: arc4.Bool,
        start_time: UInt64,
        end_time: UInt64,
        description: arc4.String,
    ) -> UInt64:
        """
        Create a new ticketed event.
        
        Args:
            name: Event name (e.g., "IIT Bombay Mood Indigo 2026")
            price: Ticket price in microALGO
            max_tickets: Maximum tickets available (1 to 100,000)
            transferable: If False, tickets are soulbound (anti-scalping)
            start_time: Event start Unix timestamp
            end_time: Event end Unix timestamp
            description: Event description (stored in txn note)
            
        Returns:
            event_id: Unique event identifier
        """
        assert max_tickets > UInt64(0), "Must have at least 1 ticket"
        assert max_tickets <= UInt64(100000), "Max 100,000 tickets"
        assert end_time > start_time, "End must be after start"

        event_id = self.next_event_id
        self.next_event_id += UInt64(1)

        event = Event(
            organizer=arc4.Address(Txn.sender),
            price=arc4.UInt64(price),
            max_tickets=arc4.UInt64(max_tickets),
            sold=arc4.UInt64(0),
            transferable=transferable,
            start_time=arc4.UInt64(start_time),
            end_time=arc4.UInt64(end_time),
        )
        self.events[event_id] = event
        return event_id

    @arc4.abimethod
    def buy_ticket(
        self,
        event_id: UInt64,
        payment: gtxn.PaymentTransaction,
    ) -> UInt64:
        """
        Purchase an event ticket (minted as an NFT ASA).
        
        The ticket is created as an Algorand Standard Asset with:
        - total=1 (unique NFT)
        - decimals=0 (indivisible)
        - freeze/clawback set to contract address (for anti-scalping)
        
        If the event is non-transferable, the ASA is frozen after
        transfer, making it a soulbound token.
        
        Args:
            event_id: Event to buy ticket for
            payment: Grouped payment transaction for the ticket price
            
        Returns:
            asset_id: The minted NFT ticket's ASA ID
        """
        assert self.events.maybe(event_id)[1], "Event not found"
        event = self.events[event_id]

        assert event.sold.native < event.max_tickets.native, "Sold out!"
        assert payment.amount == event.price.native, "Incorrect payment amount"
        assert payment.receiver == Global.current_application_address, "Pay to app"

        ticket_number = event.sold.native

        # Mint NFT ticket as an Algorand Standard Asset
        # Contract retains manager/freeze/clawback authority
        created = itxn.AssetConfig(
            asset_name=b"CampusPay Ticket",
            unit_name=b"CPTIX",
            total=UInt64(1),
            decimals=UInt64(0),
            default_frozen=False,
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
            fee=UInt64(0),
        ).submit()

        asset_id = created.created_asset.id

        # Transfer NFT to buyer
        itxn.AssetTransfer(
            xfer_asset=asset_id,
            asset_receiver=Txn.sender,
            asset_amount=UInt64(1),
            fee=UInt64(0),
        ).submit()

        # If non-transferable, freeze the asset (soulbound)
        if not event.transferable.native:
            itxn.AssetFreeze(
                freeze_asset=asset_id,
                freeze_account=Txn.sender,
                frozen=True,
                fee=UInt64(0),
            ).submit()

        # Store ticket metadata on-chain
        ticket = Ticket(
            event_id=arc4.UInt64(event_id),
            owner=arc4.Address(Txn.sender),
            ticket_number=arc4.UInt64(ticket_number),
            used=arc4.Bool(False),
            purchase_time=arc4.UInt64(Global.latest_timestamp),
        )
        self.tickets[asset_id] = ticket

        # Update event sold count
        event.sold = arc4.UInt64(ticket_number + UInt64(1))
        self.events[event_id] = event

        self.total_tickets_sold += UInt64(1)
        return asset_id

    @arc4.abimethod(readonly=True)
    def verify_ticket(
        self,
        asset_id: UInt64,
    ) -> arc4.Tuple[arc4.Address, arc4.Bool]:
        """
        Verify ticket ownership and validity (for event entry).
        
        Returns:
            Tuple of (ticket_owner, is_valid)
        """
        assert self.tickets.maybe(asset_id)[1], "Ticket not found"
        ticket = self.tickets[asset_id]
        is_valid = arc4.Bool(not ticket.used.native)
        return arc4.Tuple((ticket.owner, is_valid))

    @arc4.abimethod
    def use_ticket(self, asset_id: UInt64) -> None:
        """
        Mark a ticket as used at event entry.
        Only the event organizer can mark tickets as used.
        
        Args:
            asset_id: The NFT ticket's ASA ID
        """
        assert self.tickets.maybe(asset_id)[1], "Ticket not found"
        ticket = self.tickets[asset_id]

        assert self.events.maybe(ticket.event_id.native)[1], "Event not found"
        event = self.events[ticket.event_id.native]

        assert Txn.sender == event.organizer.native, "Only organizer can mark used"
        assert not ticket.used.native, "Ticket already used"

        ticket.used = arc4.Bool(True)
        self.tickets[asset_id] = ticket

    @arc4.abimethod
    def withdraw_sales(self, event_id: UInt64) -> None:
        """
        Withdraw ticket sales revenue to the organizer.
        
        Args:
            event_id: Event whose sales to withdraw
        """
        assert self.events.maybe(event_id)[1], "Event not found"
        event = self.events[event_id]

        assert Txn.sender == event.organizer.native, "Only organizer"

        revenue = event.price.native * event.sold.native
        assert revenue > UInt64(0), "No revenue to withdraw"

        itxn.Payment(
            receiver=Txn.sender,
            amount=revenue,
            fee=UInt64(0),
        ).submit()

    @arc4.abimethod(readonly=True)
    def get_event_info(
        self,
        event_id: UInt64,
    ) -> arc4.Tuple[arc4.Address, arc4.UInt64, arc4.UInt64, arc4.UInt64, arc4.Bool]:
        """
        Get event details.
        
        Returns:
            (organizer, price, max_tickets, sold, transferable)
        """
        assert self.events.maybe(event_id)[1], "Event not found"
        event = self.events[event_id]
        return arc4.Tuple(
            (event.organizer, event.price, event.max_tickets, event.sold, event.transferable)
        )
