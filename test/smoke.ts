// Quick smoke test — run with: npx tsx test/smoke.ts
import { Connection, PublicKey } from "@solana/web3.js"
import { getArciumEnv, getMXEAccAddress } from "@arcium-hq/client"

async function main() {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://solana-devnet.api.onfinality.io/public"
  const conn = new Connection(rpc, "confirmed")

  const programId = new PublicKey("zTkNvsczL8Uvg97KDFKo1PTnPSi8RdAKryyd7d3f2H4")
  const mxe = getMXEAccAddress(programId)

  console.log("Program ID:", programId.toBase58())
  console.log("MXE account:", mxe)
  console.log("RPC:", rpc)

  const slot = await conn.getSlot()
  console.log("Slot:", slot)

  const mxeInfo = await conn.getAccountInfo(new PublicKey(mxe))
  if (mxeInfo) {
    console.log("MXE account exists! Data length:", mxeInfo.data.length)
  } else {
    console.log("MXE account NOT found yet (may need initialization)")
  }

  const bal = await conn.getBalance(new PublicKey("2Lrp72WR894kEETV7vh4SCSxg2354WMXU3JpF3UQSUjD"))
  console.log("Deployer balance:", bal / 1e9, "SOL")

  console.log("Smoke test passed!")
}

main().catch(console.error)
