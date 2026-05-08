import { Connection, PublicKey } from "@solana/web3.js"

const ENDPOINTS = [
  "https://api.devnet.solana.com",
  "https://solana-devnet.api.onfinality.io/public",
  "https://solana-devnet.gateway.tatum.io/",
]

async function main() {
  for (const ep of ENDPOINTS) {
    try {
      const conn = new Connection(ep, "confirmed")
      const slot = await conn.getSlot()
      const bal = await conn.getBalance(new PublicKey("2Lrp72WR894kEETV7vh4SCSxg2354WMXU3JpF3UQSUjD"))
      console.log(`${ep}: slot=${slot} balance=${bal/1e9} SOL ✓`)
    } catch (e: any) {
      console.log(`${ep}: FAILED - ${e.message?.slice(0,80) || e}`)
    }
  }
}
main()
