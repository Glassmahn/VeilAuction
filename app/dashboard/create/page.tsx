"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { Transaction } from "@solana/web3.js"
import { toast } from "sonner"

export default function CreateAuctionPage() {
  const { connected, publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [title, setTitle] = useState("")
  const [tokenSymbol, setTokenSymbol] = useState("SOL")
  const [tokenAmount, setTokenAmount] = useState("")
  const [auctionType, setAuctionType] = useState<"first-price" | "vickrey">("first-price")
  const [duration, setDuration] = useState("24")
  const [minBid, setMinBid] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!title || !tokenAmount || !minBid) {
      toast.error("Please fill in all fields")
      return
    }

    setIsCreating(true)
    try {
      const minBidLamports = Math.floor(Number(minBid) * 1e9)

      toast.info("Building transaction via Arcium MPC...")

      const res = await fetch("/api/auctions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authority: publicKey.toBase58(),
          auctionType,
          minBid: minBidLamports,
          durationHours: Number(duration),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to build transaction")
      }

      toast.info("Transaction built. Signing with your wallet...")

      const txBytes = Uint8Array.from(atob(data.txBase64), (c) => c.charCodeAt(0))
      const tx = Transaction.from(txBytes)

      if (!signTransaction) {
        throw new Error("Wallet does not support transaction signing")
      }

      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash

      const signedTx = await signTransaction(tx)

      toast.info("Sending transaction to network...")

      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        preflightCommitment: "confirmed",
      })

      toast.success("Auction creation submitted!", {
        description: `Signature: ${signature.slice(0, 16)}...`,
      })
      toast.info("MPC computation will finalize in ~30-60 seconds")
    } catch (error: any) {
      console.error("Create auction error:", error)
      toast.error(error.message || "Failed to create auction")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-foreground">Create Auction</h2>
        <p className="text-muted-foreground">
          Set up a new sealed-bid auction. Bids will be encrypted via Arcium MPC.
        </p>
      </motion.div>

      <Card className="border-border/40 bg-card/50 p-6 backdrop-blur-sm">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Auction Title</Label>
            <Input
              id="title"
              placeholder="e.g. Rare Solana NFT #1234"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-border/50 bg-input/50"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="token-symbol">Token Symbol</Label>
              <Select value={tokenSymbol} onValueChange={setTokenSymbol}>
                <SelectTrigger className="border-border/50 bg-input/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="BONK">BONK</SelectItem>
                  <SelectItem value="JUP">JUP</SelectItem>
                  <SelectItem value="NFT">NFT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-amount">Token Amount</Label>
              <Input
                id="token-amount"
                type="text"
                placeholder="e.g. 1.5"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                className="border-border/50 bg-input/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auction-type">Auction Type</Label>
            <Select value={auctionType} onValueChange={(v) => setAuctionType(v as typeof auctionType)}>
              <SelectTrigger className="border-border/50 bg-input/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first-price">
                  <div>
                    <p className="font-medium">First-Price</p>
                    <p className="text-xs text-muted-foreground">Winner pays their bid amount</p>
                  </div>
                </SelectItem>
                <SelectItem value="vickrey">
                  <div>
                    <p className="font-medium">Vickrey (Second-Price)</p>
                    <p className="text-xs text-muted-foreground">Winner pays second-highest bid</p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="border-border/50 bg-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-bid">Minimum Bid (SOL)</Label>
              <Input
                id="min-bid"
                type="number"
                min="0"
                step="0.001"
                value={minBid}
                onChange={(e) => setMinBid(e.target.value)}
                className="border-border/50 bg-input/50"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleCreate}
              disabled={!connected || isCreating}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {isCreating ? "Creating..." : "Create Auction"}
            </Button>
            {!connected && (
              <p className="text-sm text-muted-foreground self-center">
                Connect wallet to create auctions
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
