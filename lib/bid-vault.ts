import { BidEncryptionMetadata } from "@/lib/arcium-server"

const STORAGE_KEY = "veil-auction-bid-vault"

export interface StoredBid {
  auctionPda: string
  signature: string
  metadata: BidEncryptionMetadata
  timestamp: number
}

function getVault(): StoredBid[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveVault(vault: StoredBid[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault))
}

export function storeBidMetadata(
  auctionPda: string,
  signature: string,
  metadata: BidEncryptionMetadata
): void {
  const vault = getVault()
  vault.unshift({
    auctionPda,
    signature,
    metadata,
    timestamp: Date.now(),
  })
  saveVault(vault)
}

export function getStoredBids(): StoredBid[] {
  return getVault()
}

export function getStoredBid(auctionPda: string): StoredBid | undefined {
  return getVault().find((b) => b.auctionPda === auctionPda)
}

export function clearBidVault(): void {
  saveVault([])
}
