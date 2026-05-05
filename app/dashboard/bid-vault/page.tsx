"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getStoredBids, clearBidVault } from "@/lib/bid-vault"
import { toast } from "sonner"

function truncateAddress(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

function timeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function lamportsToSol(lamports: number): string {
  return (lamports / 1e9).toFixed(4)
}

export default function BidVaultPage() {
  const [storedBids, setStoredBids] = useState(getStoredBids())
  const [expandedBid, setExpandedBid] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})

  const handleClearVault = () => {
    clearBidVault()
    setStoredBids([])
    toast.success("Bid vault cleared")
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Bid Vault</h2>
            <p className="text-muted-foreground">Your locally stored encryption keys for submitted bids</p>
          </div>
          {storedBids.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearVault}
              className="text-xs text-red-500 border-red-500/20 hover:bg-red-500/10"
            >
              Clear Vault
            </Button>
          )}
        </div>
      </motion.div>

      {storedBids.length === 0 ? (
        <Card className="border-border/40 bg-card/50 p-12 text-center">
          <svg className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-muted-foreground">No stored bids yet</p>
          <p className="mt-2 text-sm text-muted-foreground/60">
            When you place a bid, the encryption key is saved here for verification
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {storedBids.map((bid, index) => (
            <motion.div
              key={`${bid.auctionPda}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                <button
                  className="w-full p-5 flex items-center justify-between text-left"
                  onClick={() => setExpandedBid(expandedBid === bid.auctionPda ? null : bid.auctionPda)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                      <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">
                        Auction {bid.auctionPda ? truncateAddress(bid.auctionPda) : bid.signature.slice(0, 8)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {lamportsToSol(bid.metadata.amount)} SOL bid · {timeAgo(bid.timestamp)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                    {expandedBid === bid.auctionPda ? "Collapse" : "View Keys"}
                  </Badge>
                </button>

                {expandedBid === bid.auctionPda && (
                  <div className="border-t border-border/30 p-5 space-y-4 bg-muted/20">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Bid Amount (plaintext)</p>
                      <p className="text-sm font-mono bg-background/50 p-2 rounded border border-border/30">
                        {bid.metadata.amount} lamports ({lamportsToSol(bid.metadata.amount)} SOL)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">x25519 Secret Key</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono bg-background/50 p-2 rounded border border-border/30 flex-1 truncate">
                          {showSecret[bid.auctionPda] ? bid.metadata.bidderX25519SecretKey : "••••••••••••••••••••••••••••••••"}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs shrink-0"
                          onClick={() => setShowSecret((prev) => ({ ...prev, [bid.auctionPda]: !prev[bid.auctionPda] }))}
                        >
                          {showSecret[bid.auctionPda] ? "Hide" : "Reveal"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(bid.metadata.bidderX25519SecretKey)
                            toast.success("Secret key copied to clipboard")
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Nonce</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono bg-background/50 p-2 rounded border border-border/30 flex-1 truncate">
                          {showSecret[bid.auctionPda] ? bid.metadata.nonce : "••••••••••••••••"}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(bid.metadata.nonce)
                            toast.success("Nonce copied to clipboard")
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Transaction Signature</p>
                      <p className="text-xs font-mono bg-background/50 p-2 rounded border border-border/30">
                        {bid.signature}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground/70">
                      Keep these keys secure. You will need them to verify your bid when the auction closes.
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
