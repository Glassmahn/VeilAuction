export function classifyArciumError(error: any): { message: string; status: number; retryable: boolean } {
  const msg = error?.message || String(error)

  if (msg.includes("ANCHOR_WALLET") || msg.includes("ANCHOR_PROVIDER_URL")) {
    return {
      message: "Arcium environment not configured. Please check server environment variables.",
      status: 503,
      retryable: false,
    }
  }

  if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
    return {
      message: "Arcium MPC nodes are currently unreachable. Please try again in a moment.",
      status: 503,
      retryable: true,
    }
  }

  if (msg.includes("MXE") || msg.includes("mxe")) {
    return {
      message: "MXE account not initialized. The Arcium cluster may need setup.",
      status: 503,
      retryable: true,
    }
  }

  if (msg.includes("account not found") || msg.includes("AccountNotFound")) {
    return {
      message: "Required Arcium account not found on chain. Cluster may not be initialized.",
      status: 503,
      retryable: true,
    }
  }

  if (msg.includes("SimulationError") || msg.includes("simulation failed")) {
    return {
      message: "Transaction simulation failed. Check auction state and try again.",
      status: 400,
      retryable: false,
    }
  }

  return {
    message: msg.length > 200 ? msg.slice(0, 200) + "..." : msg,
    status: 500,
    retryable: true,
  }
}
