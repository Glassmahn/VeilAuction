"use client"

import { useMemo } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor"
import type { Wallet as AnchorWallet } from "@coral-xyz/anchor"

const VEIL_PROGRAM_ID = process.env.NEXT_PUBLIC_VEIL_AUCTION_PROGRAM_ID || "DKhS1u3qVR5WytmuVT1mc6cZnj5QiybXnRWBr7x2yaae"

const IDL = {
  version: "0.1.0",
  name: "veil_auction",
  address: VEIL_PROGRAM_ID,
  instructions: [
    {
      name: "createAuction",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
        { name: "signPdaAccount", isMut: true, isSigner: false },
        { name: "mxeAccount", isMut: false, isSigner: false },
        { name: "mempoolAccount", isMut: true, isSigner: false },
        { name: "executingPool", isMut: true, isSigner: false },
        { name: "computationAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: false, isSigner: false },
        { name: "clusterAccount", isMut: true, isSigner: false },
        { name: "poolAccount", isMut: true, isSigner: false },
        { name: "clockAccount", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "computationOffset", type: "u64" },
        { name: "auctionType", type: { defined: "AuctionType" } },
        { name: "minBid", type: "u64" },
        { name: "duration", type: "i64" },
      ],
    },
    {
      name: "placeBid",
      accounts: [
        { name: "bidder", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
        { name: "signPdaAccount", isMut: true, isSigner: false },
        { name: "mxeAccount", isMut: false, isSigner: false },
        { name: "mempoolAccount", isMut: true, isSigner: false },
        { name: "executingPool", isMut: true, isSigner: false },
        { name: "computationAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: false, isSigner: false },
        { name: "clusterAccount", isMut: true, isSigner: false },
        { name: "poolAccount", isMut: true, isSigner: false },
        { name: "clockAccount", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "computationOffset", type: "u64" },
        { name: "encryptedBidderLo", type: { array: ["u8", 32] } },
        { name: "encryptedBidderHi", type: { array: ["u8", 32] } },
        { name: "encryptedAmount", type: { array: ["u8", 32] } },
        { name: "bidderPubkey", type: { array: ["u8", 32] } },
        { name: "nonce", type: "u128" },
      ],
    },
    {
      name: "closeAuction",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
      ],
      args: [],
    },
    {
      name: "determineWinnerFirstPrice",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
        { name: "signPdaAccount", isMut: true, isSigner: false },
        { name: "mxeAccount", isMut: false, isSigner: false },
        { name: "mempoolAccount", isMut: true, isSigner: false },
        { name: "executingPool", isMut: true, isSigner: false },
        { name: "computationAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: false, isSigner: false },
        { name: "clusterAccount", isMut: true, isSigner: false },
        { name: "poolAccount", isMut: true, isSigner: false },
        { name: "clockAccount", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "computationOffset", type: "u64" },
      ],
    },
    {
      name: "determineWinnerVickrey",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
        { name: "signPdaAccount", isMut: true, isSigner: false },
        { name: "mxeAccount", isMut: false, isSigner: false },
        { name: "mempoolAccount", isMut: true, isSigner: false },
        { name: "executingPool", isMut: true, isSigner: false },
        { name: "computationAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: false, isSigner: false },
        { name: "clusterAccount", isMut: true, isSigner: false },
        { name: "poolAccount", isMut: true, isSigner: false },
        { name: "clockAccount", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "computationOffset", type: "u64" },
      ],
    },
    {
      name: "initAuctionStateCompDef",
      accounts: [
        { name: "payer", isMut: true, isSigner: true },
        { name: "mxeAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: true, isSigner: false },
        { name: "addressLookupTable", isMut: true, isSigner: false },
        { name: "lutProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "initPlaceBidCompDef",
      accounts: [
        { name: "payer", isMut: true, isSigner: true },
        { name: "mxeAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: true, isSigner: false },
        { name: "addressLookupTable", isMut: true, isSigner: false },
        { name: "lutProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "initDetermineWinnerFirstPriceCompDef",
      accounts: [
        { name: "payer", isMut: true, isSigner: true },
        { name: "mxeAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: true, isSigner: false },
        { name: "addressLookupTable", isMut: true, isSigner: false },
        { name: "lutProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "initDetermineWinnerVickreyCompDef",
      accounts: [
        { name: "payer", isMut: true, isSigner: true },
        { name: "mxeAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: true, isSigner: false },
        { name: "addressLookupTable", isMut: true, isSigner: false },
        { name: "lutProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Auction",
      type: {
        kind: "struct",
        fields: [
          { name: "bump", type: "u8" },
          { name: "authority", type: "publicKey" },
          { name: "auctionType", type: { defined: "AuctionType" } },
          { name: "status", type: { defined: "AuctionStatus" } },
          { name: "minBid", type: "u64" },
          { name: "endTime", type: "i64" },
          { name: "bidCount", type: "u16" },
          { name: "stateNonce", type: "u128" },
          { name: "encryptedState", type: { array: [{ array: ["u8", 32] }, 5] } },
        ],
      },
    },
  ],
  types: [
    {
      name: "AuctionType",
      type: { kind: "enum", variants: [{ name: "FirstPrice" }, { name: "Vickrey" }] },
    },
    {
      name: "AuctionStatus",
      type: { kind: "enum", variants: [{ name: "Open" }, { name: "Closed" }, { name: "Resolved" }] },
    },
  ],
  events: [
    { name: "AuctionCreatedEvent", fields: [
      { name: "auction", type: "publicKey" },
      { name: "authority", type: "publicKey" },
      { name: "auctionType", type: { defined: "AuctionType" } },
      { name: "minBid", type: "u64" },
      { name: "endTime", type: "i64" },
    ]},
    { name: "BidPlacedEvent", fields: [
      { name: "auction", type: "publicKey" },
      { name: "bidCount", type: "u16" },
    ]},
    { name: "AuctionClosedEvent", fields: [
      { name: "auction", type: "publicKey" },
      { name: "bidCount", type: "u16" },
    ]},
    { name: "AuctionResolvedEvent", fields: [
      { name: "auction", type: "publicKey" },
      { name: "winner", type: { array: ["u8", 32] } },
      { name: "paymentAmount", type: "u64" },
      { name: "auctionType", type: { defined: "AuctionType" } },
    ]},
  ],
}

export function useVeilAuction() {
  const { connection } = useConnection()
  const { publicKey, signTransaction, signAllTransactions, wallet, connected } = useWallet()

  const { program, provider } = useMemo(() => {
    if (!wallet || !wallet.adapter || !signTransaction || !publicKey) {
      return { program: null, provider: null }
    }

    const anchorWallet: AnchorWallet = {
      publicKey,
      signTransaction: signTransaction as any,
      signAllTransactions: signAllTransactions as any,
    } as unknown as AnchorWallet

    const prov = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions())
    const p = new Program(IDL as any, prov as any)
    ;(p as any).programId = new PublicKey(VEIL_PROGRAM_ID)
    return { program: p, provider: prov }
  }, [connection, wallet, publicKey, signTransaction, signAllTransactions])

  return { program, provider, connected }
}

export { IDL, VEIL_PROGRAM_ID }
