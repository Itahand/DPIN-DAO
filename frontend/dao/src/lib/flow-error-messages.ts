export function humanizeDaoTxError(message: string): string {
  const m = message || "";

  // DAO.createArsenal() panics when HybridCustody manager missing.
  // Per product requirement, show this exact guidance.
  if (m.includes("manager not found")) {
    return "Your account is not the parent of ANY Dapper Wallet account";
  }

  // Preserve existing UX mappings
  if (m.includes("No Pinnacle Collection")) {
    return "Unable to create Arsenal. You need a Pinnacle Collection with at least 10 NFTs in a child account.";
  }

  if (m.toLowerCase().includes("already voted")) {
    return "You have already voted on this topic.";
  }

  if (m.includes("You are NOT a Founder") || m.includes("NOT a Founder")) {
    return "Only founders can perform this action.";
  }

  if (m.includes("Must have at least two options")) {
    return "Please provide at least 2 options for the topic.";
  }

  if (m.includes("Topic is closed")) {
    return "This topic is closed.";
  }

  if (m.includes("does not allow")) {
    return "This topic does not allow adding new options.";
  }

  return m;
}
