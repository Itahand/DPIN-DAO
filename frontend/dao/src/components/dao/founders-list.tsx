"use client";

import { useFlowQuery } from "@onflow/react-sdk";

export function FoundersList() {
  const { data: founders, isLoading, error: foundersError } = useFlowQuery({
    cadence: `
      import DAO from 0xded84803994b06e4
      
      access(all) fun main(): {UInt64: Address} {
        log("Fetching all founders from DAO contract")
        let founders = DAO.getAllFounders()
        log("Found ".concat(founders.length.toString()).concat(" founders"))
        return founders
      }
    `,
    args: (arg, t) => [],
  });

  const { data: unclaimedFounders, error: unclaimedError } = useFlowQuery({
    cadence: `
      import DAO from 0xded84803994b06e4
      
      access(all) fun main(): [Address] {
        log("Fetching unclaimed founders from DAO contract")
        let unclaimed = DAO.getUnclaimedFounders()
        log("Found ".concat(unclaimed.length.toString()).concat(" unclaimed founders"))
        return unclaimed
      }
    `,
    args: (arg, t) => [],
  });

  console.log("FoundersList - founders isLoading:", isLoading);
  console.log("FoundersList - founders error:", foundersError);
  console.log("FoundersList - founders data:", founders);
  console.log("FoundersList - unclaimedFounders data:", unclaimedFounders);
  console.log("FoundersList - unclaimedFounders error:", unclaimedError);

  const foundersArray = founders && typeof founders === 'object' && !Array.isArray(founders)
    ? Object.entries(founders).map(([id, address]) => ({
        id: parseInt(String(id)),
        address: String(address),
      }))
    : [];

  const unclaimedArray = Array.isArray(unclaimedFounders) 
    ? unclaimedFounders.map(addr => String(addr))
    : [];

  console.log("FoundersList - foundersArray:", foundersArray);
  console.log("FoundersList - unclaimedArray:", unclaimedArray);

  if (isLoading) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-[rgb(241,245,249)] dark:bg-white/[0.04] p-6 sm:p-8">
        <p className="text-black/60 dark:text-white/60">Loading founders...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-[rgb(241,245,249)] dark:bg-white/[0.04] p-6 sm:p-8">
      <h3 className="text-xl font-semibold text-black dark:text-white mb-4">
        Founders
      </h3>

      {foundersArray.length > 0 ? (
        <div className="space-y-3 mb-6">
          {foundersArray
            .sort((a, b) => a.id - b.id)
            .map((founder) => (
              <div
                key={founder.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-black/50"
              >
                <div>
                  <span className="text-sm font-medium text-black/60 dark:text-white/60">
                    Founder #{founder.id}
                  </span>
                  <p className="text-sm font-mono text-black dark:text-white">
                    {founder.address}
                  </p>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-sm text-black/60 dark:text-white/60 mb-6">
          No founders yet. Vote to select founders!
        </p>
      )}

      {unclaimedArray.length > 0 && (
        <div className="pt-6 border-t border-black/10 dark:border-white/10">
          <h4 className="text-sm font-semibold text-black dark:text-white mb-3">
            Unclaimed Founders ({unclaimedArray.length})
          </h4>
          <div className="space-y-2">
            {unclaimedArray.map((address) => (
              <div
                key={address}
                className="text-sm font-mono text-black/60 dark:text-white/60"
              >
                {address}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
