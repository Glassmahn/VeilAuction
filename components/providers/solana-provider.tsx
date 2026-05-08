"use client"

import "@solana/wallet-adapter-react-ui/styles.css"
import React, { useMemo, useState } from "react"
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { clusterApiUrl } from "@solana/web3.js"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom"
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare"

const VEIL_AUCTION_PROGRAM_ID = "zTkNvsczL8Uvg97KDFKo1PTnPSi8RdAKryyd7d3f2H4"

export { VEIL_AUCTION_PROGRAM_ID }

export function SolanaProviders({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network), [network])
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export function WalletButton() {
  const { connected, publicKey, select, wallets, wallet, disconnect } = useWallet()
  const [showModal, setShowModal] = useState(false)

  const address = publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : ""

  const available = wallets || []

  return (
    <>
      {connected ? (
        <button
          onClick={disconnect}
          className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium tracking-wider text-accent transition hover:bg-accent/20"
        >
          <span className="h-2 w-2 rounded-full bg-green-400" />
          {address}
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold tracking-wider text-accent-foreground transition hover:bg-accent/90"
        >
          CONNECT WALLET
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-border/40 bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wider text-foreground">SELECT WALLET</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { select("Phantom"); setShowModal(false) }}
                className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/50 p-3 text-left transition hover:border-accent/50 hover:bg-accent/5"
              >
                <div className="h-6 w-6 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">P</div>
                <span className="text-sm font-medium text-foreground">Phantom</span>
              </button>
              <button
                onClick={() => { select("Solflare"); setShowModal(false) }}
                className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/50 p-3 text-left transition hover:border-accent/50 hover:bg-accent/5"
              >
                <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">S</div>
                <span className="text-sm font-medium text-foreground">Solflare</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
