"use client"

import React, { FC, useMemo, useState, useEffect } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { clusterApiUrl } from "@solana/web3.js"
import type { WalletAdapter } from "@solana/wallet-adapter-base"

const VEIL_AUCTION_PROGRAM_ID = "DKhS1u3qVR5WytmuVT1mc6cZnj5QiybXnRWBr7x2yaae"

export { VEIL_AUCTION_PROGRAM_ID }

function getWallets(): WalletAdapter[] {
  if (typeof window === "undefined") return []
  try {
    const { PhantomWalletAdapter } = require("@solana/wallet-adapter-phantom")
    const { SolflareWalletAdapter } = require("@solana/wallet-adapter-solflare")
    return [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
  } catch {
    return []
  }
}

export function SolanaProviders({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<WalletAdapter[]>([])
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network), [network])

  useEffect(() => {
    setWallets(getWallets())
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={() => {}}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export function WalletButton() {
  return (
    <WalletMultiButton className="wallet-button" />
  )
}
