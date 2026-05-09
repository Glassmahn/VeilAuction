"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey, Transaction } from "@solana/web3.js"
import { useAuctions } from "@/hooks/use-auctions"
import { AuctionStatus } from "@/lib/veil-types"
import { storeBidMetadata } from "@/lib/bid-vault"
import { toast } from "sonner"

function truncateAddress(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

async function signAndSend(
  txBase64: string,
  signTransaction: ((tx: Transaction) => Promise<Transaction>) | undefined,
  connection: { sendRawTransaction: (tx: Buffer, opts?: any) => Promise<string> }
): Promise<string> {
  if (!signTransaction) throw new Error("Wallet does not support transaction signing")
  const txBytes = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0))
  const tx = Transaction.from(txBytes)
  const signedTx = await signTransaction(tx)
  return connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: true,
    preflightCommitment: "confirmed",
  })
}

export default function AuctionDetailPage() {
  const params = useParams()
  const auctionId = params.id as string
  const { connected, publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const { auctions, loading, refetch } = useAuctions()
  const [bidAmount, setBidAmount] = useState("")
  const [isBidding, setIsBidding] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [isReclaiming, setIsReclaiming] = useState(false)
  const [timeLeft, setTimeLeft] = useState("")

  const auction = auctions.find((a) => a.pda.toBase58() === auctionId)
  const isAuthority = connected && publicKey && auction ?
    publicKey.toBase58() === auction.data.authority.toBase58() : false

  useEffect(() => {
    const interval = setInterval(() => {
      if (!auction) return
      const diff = auction.data.endTime - Math.floor(Date.now() / 1000)
      if (diff <= 0) {
        setTimeLeft("Ended")
        return
      }
      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [auction])

  const handlePlaceBid = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!auction) {
      toast.error("Auction not found")
      return
    }
    if (!bidAmount || Number(bidAmount) <= 0) {
      toast.error("Please enter a valid bid amount")
      return
    }
    if (!signTransaction) {
      toast.error("Wallet does not support transaction signing")
      return
    }

    setIsBidding(true)
    try {
      const bidAmountLamports = Math.floor(Number(bidAmount) * 1e9)

      toast.info("Building encrypted bid transaction...")

      const res = await fetch("/api/auctions/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidder: publicKey.toBase58(),
          auctionPda: auctionId,
          bidAmountLamports,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to build bid transaction")
      }

      toast.info("Transaction built. Signing with your wallet...")

      const signature = await signAndSend(data.txBase64, signTransaction, connection)

      if (data.encryptionMetadata) {
        storeBidMetadata(auctionId, signature, data.encryptionMetadata)
      }

      toast.success("Bid encrypted and submitted!", {
        description: `Signature: ${signature.slice(0, 16)}...`,
      })
      toast.info("Your bid amount will remain hidden until auction closes")
      setBidAmount("")
      await refetch()
    } catch (error: any) {
      console.error("Place bid error:", error)
      const msg = error.message || "Failed to place bid"
      const retryable = error.retryable !== false
      toast.error(msg, {
        description: retryable ? "Arcium MPC nodes may be busy. Try again in a moment." : undefined,
      })
    } finally {
      setIsBidding(false)
    }
  }

  const handleCloseAuction = useCallback(async () => {
    if (!connected || !publicKey || !auction) return
    setIsClosing(true)
    try {
      toast.info("Building close auction transaction...")

      const res = await fetch("/api/auctions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authority: publicKey.toBase58(),
          auctionPda: auctionId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to build close transaction")

      const signature = await signAndSend(data.txBase64, signTransaction, connection)

      toast.success("Auction closed!", {
        description: `Signature: ${signature.slice(0, 16)}...`,
      })
      await refetch()
    } catch (error: any) {
      console.error("Close auction error:", error)
      toast.error(error.message || "Failed to close auction")
    } finally {
      setIsClosing(false)
    }
  }, [connected, publicKey, auction, auctionId, signTransaction, connection, refetch])

  const handleClaimWinnings = useCallback(async () => {
    if (!connected || !publicKey || !auction) return
    setIsClaiming(true)
    try {
      toast.info("Building claim transaction...")
      const res = await fetch("/api/auctions/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authority: publicKey.toBase58(),
          auctionPda: auctionId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to build claim transaction")
      const signature = await signAndSend(data.txBase64, signTransaction, connection)
      toast.success("Winnings claimed!", { description: `Signature: ${signature.slice(0, 16)}...` })
      await refetch()
    } catch (error: any) {
      console.error("Claim error:", error)
      toast.error(error.message || "Failed to claim winnings")
    } finally {
      setIsClaiming(false)
    }
  }, [connected, publicKey, auction, auctionId, signTransaction, connection, refetch])

  const handleReclaimBid = useCallback(async () => {
    if (!connected || !publicKey || !auction) return
    setIsReclaiming(true)
    try {
      toast.info("Building reclaim transaction...")
      const res = await fetch("/api/auctions/reclaim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidder: publicKey.toBase58(),
          auctionPda: auctionId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to build reclaim transaction")
      const signature = await signAndSend(data.txBase64, signTransaction, connection)
      toast.success("Bid reclaimed!", { description: `Signature: ${signature.slice(0, 16)}...` })
      await refetch()
    } catch (error: any) {
      console.error("Reclaim error:", error)
      toast.error(error.message || "Failed to reclaim bid")
    } finally {
      setIsReclaiming(false)
    }
  }, [connected, publicKey, auction, auctionId, signTransaction, connection, refetch])

  const handleResolveAuction = useCallback(async () => {
    if (!connected || !publicKey || !auction) return
    setIsResolving(true)
    try {
      const auctionType = auction.data.auctionType === "FirstPrice" ? "first-price" : "vickrey"

      toast.info("Building resolve auction transaction...")

      const res = await fetch("/api/auctions/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authority: publicKey.toBase58(),
          auctionPda: auctionId,
          auctionType,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to build resolve transaction")

      toast.info("Transaction built. Signing with your wallet...")

      const signature = await signAndSend(data.txBase64, signTransaction, connection)

      toast.success("Winner determination submitted!", {
        description: `Signature: ${signature.slice(0, 16)}...`,
      })
      toast.info("MPC computation will finalize in ~30-60 seconds")
      await refetch()
    } catch (error: any) {
      console.error("Resolve auction error:", error)
      toast.error(error.message || "Failed to resolve auction")
    } finally {
      setIsResolving(false)
    }
  }, [connected, publicKey, auction, auctionId, signTransaction, connection, refetch])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <Card className="border-border/40 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">Auction not found</p>
          <p className="mt-2 text-sm text-muted-foreground/60">
            The auction PDA {truncateAddress(auctionId)} does not exist on chain
          </p>
        </Card>
      </div>
    )
  }

  const statusLabel = auction.data.status === AuctionStatus.Open ? "Open" :
    auction.data.status === AuctionStatus.Closed ? "Closed" : "Resolved"
  const statusColor = auction.data.status === AuctionStatus.Open ? "bg-green-500/10 text-green-600 border-green-500/20" :
    auction.data.status === AuctionStatus.Closed ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
    "bg-blue-500/10 text-blue-600 border-blue-500/20"

  const isEnded = timeLeft === "Ended"

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Badge variant="outline" className={`mb-3 ${statusColor}`}>
          {statusLabel}
        </Badge>
        <h2 className="text-3xl font-bold text-foreground">
          Auction {truncateAddress(auctionId)}
        </h2>
        <p className="mt-2 text-muted-foreground">
          Sealed-bid {auction.data.auctionType === "FirstPrice" ? "first-price" : "Vickrey"} auction
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-border/40 bg-card/50 p-6 backdrop-blur-sm">
            <div className="flex h-64 items-center justify-center rounded-lg bg-gradient-to-br from-secondary to-muted/50">
              <svg viewBox="0 0 120 120" className="h-32 w-32">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#d4a574" strokeWidth="2" opacity="0.8" />
                <circle cx="60" cy="60" r="38" fill="none" stroke="#a09080" strokeWidth="1" opacity="0.5" />
                <text x="60" y="66" textAnchor="middle" fill="#d4a574" fontSize="18" fontWeight="600">
                  VA
                </text>
              </svg>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Min Bid</p>
                <p className="text-sm font-medium text-foreground">{auction.data.minBid} lamports</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Type</p>
                <p className="text-sm font-medium text-foreground">
                  {auction.data.auctionType === "FirstPrice" ? "First-Price" : "Vickrey"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Bids</p>
                <p className="text-sm font-medium text-foreground">{auction.data.bidCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Seller</p>
                <p className="text-sm font-medium text-foreground">{truncateAddress(auction.data.authority.toBase58())}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {auction.data.status === AuctionStatus.Open && (
            <Card className="border-border/40 bg-card/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Place Bid</h3>
              <div className="mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-xs text-muted-foreground">Encrypted via Arcium MPC</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bid-amount">Bid Amount (SOL)</Label>
                  <Input
                    id="bid-amount"
                    type="number"
                    placeholder="Enter your bid"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="border-border/50 bg-input/50"
                  />
                </div>
                <Button
                  onClick={handlePlaceBid}
                  disabled={!connected || isBidding}
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                >
                  {isBidding ? "Encrypting & Submitting..." : "Place Encrypted Bid"}
                </Button>
                {!connected && (
                  <p className="text-center text-xs text-muted-foreground">
                    Connect wallet to place bids
                  </p>
                )}
              </div>
            </Card>
          )}

          {isAuthority && auction.data.status === AuctionStatus.Open && isEnded && (
            <Card className="border-border/40 bg-card/50 p-6 backdrop-blur-sm mt-4">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Auction Controls</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Auction has ended. Close it to proceed to winner determination.
              </p>
              <Button
                onClick={handleCloseAuction}
                disabled={isClosing}
                variant="outline"
                className="w-full"
              >
                {isClosing ? "Closing..." : "Close Auction"}
              </Button>
            </Card>
          )}

          {isAuthority && auction.data.status === AuctionStatus.Closed && (
            <Card className="border-border/40 bg-card/50 p-6 backdrop-blur-sm mt-4">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Resolve Auction</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Determine the winner and reveal the result via MPC computation.
              </p>
              <Button
                onClick={handleResolveAuction}
                disabled={isResolving}
                className="w-full bg-foreground text-background hover:bg-foreground/90"
              >
                {isResolving ? "Resolving..." : `Determine Winner (${auction.data.auctionType === "FirstPrice" ? "First-Price" : "Vickrey"})`}
              </Button>
            </Card>
          )}

          {isAuthority && auction.data.status === AuctionStatus.Resolved && (
            <Card className="border-border/40 bg-card/50 p-6 backdrop-blur-sm mt-4">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Claim Winnings</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Winner determined. Claim the winning bid amount from escrow.
              </p>
              <Button
                onClick={handleClaimWinnings}
                disabled={isClaiming}
                className="w-full bg-green-600 text-background hover:bg-green-600/90"
              >
                {isClaiming ? "Claiming..." : "Claim Winnings"}
              </Button>
            </Card>
          )}

          {connected && !isAuthority && auction.data.status === AuctionStatus.Resolved && (
            <Card className="border-border/40 bg-card/50 p-6 backdrop-blur-sm mt-4">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Reclaim Bid</h3>
              <p className="text-xs text-muted-foreground mb-4">
                This auction is resolved. If you didn't win, reclaim your bid from escrow.
              </p>
              <Button
                onClick={handleReclaimBid}
                disabled={isReclaiming}
                variant="outline"
                className="w-full"
              >
                {isReclaiming ? "Reclaiming..." : "Reclaim My Bid"}
              </Button>
            </Card>
          )}

          <Card className="mt-4 border-border/40 bg-card/50 p-6 backdrop-blur-sm">
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Time Remaining</p>
                <p className="text-xl font-bold text-foreground">{timeLeft}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">End Time</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(auction.data.endTime * 1000).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="border-border/40 bg-card/50 p-6 backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-semibold text-foreground">How Bidding Works</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Encrypt Your Bid</p>
                <p className="text-xs text-muted-foreground">
                  Your bid is encrypted locally using X25519 + MXE before submission
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">MPC Comparison</p>
                <p className="text-xs text-muted-foreground">
                  Arcium nodes compare encrypted bids without revealing individual values
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Winner Revealed</p>
                <p className="text-xs text-muted-foreground">
                  Only winner and payment amount are revealed when auction closes
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
