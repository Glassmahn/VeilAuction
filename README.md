# VeilAuction

**Fully confidential sealed-bid auctions on Solana, powered by Arcium MPC.**

VeilAuction is a decentralized auction platform where bids remain 100% encrypted from submission through resolution. No one — not validators, not the auction creator, not even the protocol — can see bid amounts until the auction closes and the winner is computed via multi-party computation (MPC).

## Features

- **Sealed-bid privacy**: Bids are encrypted using Arcium's MPC network. Bid values are never visible on-chain.
- **First-price auctions**: Winner pays exactly their bid amount.
- **Vickrey (second-price) auctions**: Winner pays the second-highest bid amount, incentivizing truthful bidding.
- **SOL-native settlement**: Bids are held in on-chain escrow PDAs and released programmatically after resolution.
- **Trustless winner determination**: The Arcium MPC network computes the winner without ever decrypting individual bids.
- **Bid reclamation**: Non-winning bidders can reclaim their escrowed SOL after auction resolution.

## Architecture

```
┌─────────────┐     Encrypted Bid     ┌──────────────────┐
│   Bidder    │ ─────────────────────► │  VeilAuction     │
│  (Wallet)   │                        │  Solana Program  │
└─────────────┘                        └────────┬─────────┘
                                                │
                                     Queue Computation
                                                │
                                                ▼
                                       ┌───────────────┐
                                       │  Arcium MPC   │
                                       │  Network      │
                                       │  (3+ Nodes)   │
                                       └───────┬───────┘
                                               │
                                    Callback with Result
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │  Auction Resolved│
                                      │  (Winner + Price)│
                                      └──────────────────┘
```

### Smart Contracts

| Component | Description |
|-----------|-------------|
| `programs/veil_auction/src/lib.rs` | Anchor program with auction lifecycle: create, bid, close, resolve, claim, reclaim |
| `encrypted-ixs/src/lib.rs` | Arcis circuits for encrypted bid tracking and winner determination |

### Accounts

| Account | Purpose |
|---------|---------|
| `Auction` | Stores auction metadata, encrypted state, and bid count |
| `BidEscrow` | Holds bidder's SOL in escrow, linked to auction and bidder |

### Circuits

| Circuit | Purpose |
|---------|---------|
| `init_auction_state` | Initializes encrypted auction state (highest bid, highest bidder, second highest, bid count) |
| `place_bid` | Encrypted comparison: updates state if new bid is higher |
| `determine_winner_first_price` | Reveals winner and payment = highest bid |
| `determine_winner_vickrey` | Reveals winner and payment = second-highest bid |

## Tech Stack

- **Solana**: Blockchain runtime, account model, program deployment
- **Anchor v0.32.1**: Solana program framework
- **Arcium**: MPC network for confidential computation
- **Arcis v0.9.6**: Rust framework for writing MPC circuits
- **Next.js 16**: Frontend application
- **@solana/wallet-adapter**: Wallet integration (Phantom, Solflare)
- **@arcium-hq/client**: TypeScript client for Arcium MPC

## Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.82+
- Solana CLI Tools
- Anchor CLI 0.32.1
- Arcium CLI (`curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash`)

### Install

```bash
git clone https://github.com/Glassmahn/VeilAuction.git
cd VeilAuction
yarn install
```

### Build

```bash
# Build circuits and Solana program
arcium build
```

### Test

```bash
# Run integration tests (requires local validator + Arcium cluster)
arcium test
```

### Deploy to Devnet

```bash
# Ensure you have devnet SOL
solana config set --url https://api.devnet.solana.com
solana airdrop 5

# Deploy program and initialize MXE
arcium deploy --cluster-offset 0 --recovery-set-size 3 --keypair-path ~/.config/solana/id.json -u devnet
```

### Run Frontend

```bash
npm run dev
```

## Auction Lifecycle

1. **Create**: Seller creates an auction specifying type (first-price or Vickrey), minimum bid, and duration.
2. **Bid**: Bidders submit encrypted bids via the Arcium MPC network. Bids are never visible on-chain.
3. **Close**: After the auction deadline, the seller closes bidding.
4. **Resolve**: The seller triggers winner determination. Arcium MPC nodes compute the result without decrypting individual bids.
5. **Claim**: The seller claims the winning payment.
6. **Reclaim**: Non-winning bidders reclaim their escrowed SOL.

## Program ID

| Network | Program ID |
|---------|-----------|
| Devnet | `zTkNvsczL8Uvg97KDFKo1PTnPSi8RdAKryyd7d3f2H4` |

## Project Structure

```
VeilAuction/
├── programs/
│   └── veil_auction/
│       └── src/
│           └── lib.rs          # Anchor program
├── encrypted-ixs/
│   └── src/
│       └── lib.rs              # Arcis MPC circuits
├── build/                       # Compiled circuit artifacts (.arcis, .idarc)
├── app/                         # Next.js frontend
├── tests/
│   └── veil_auction.ts          # Integration tests
├── Anchor.toml                  # Anchor configuration
├── Arcium.toml                  # Arcium cluster configuration
├── Cargo.toml                   # Rust workspace
└── deploy-devnet.sh             # Deployment script
```

## License

MIT
