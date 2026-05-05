import { PublicKey } from "@solana/web3.js"

export enum AuctionType {
  FirstPrice = "FirstPrice",
  Vickrey = "Vickrey",
}

export enum AuctionStatus {
  Open = "Open",
  Closed = "Closed",
  Resolved = "Resolved",
}

export interface AuctionAccount {
  authority: PublicKey
  auctionType: AuctionType
  status: AuctionStatus
  minBid: number
  endTime: number
  bidCount: number
  stateNonce: string
  encryptedState: number[][]
}

export interface AuctionResult {
  winner: PublicKey
  paymentAmount: number
  auctionType: AuctionType
}

export const VEIL_PROGRAM_ID = "VeiLAUcTi0nS3a1aN4ucti0nP1atform77777777777"

export const AUCTION_ACCOUNT_SIZE = 8 + 1 + 32 + 1 + 1 + 8 + 8 + 2 + 16 + (32 * 5)
