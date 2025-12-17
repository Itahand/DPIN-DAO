"use client";

import { useFlowCurrentUser, useFlowMutate, useFlowQuery } from "@onflow/react-sdk";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
import { humanizeDaoTxError } from "../../lib/flow-error-messages";

export function FoundersVoting() {
  const { user } = useFlowCurrentUser();
  const [firstOption, setFirstOption] = useState("");
  const [secondOption, setSecondOption] = useState("");
  const [thirdOption, setThirdOption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const { data: founderVotes, isLoading: votesLoading, error: votesError, refetch: refetchVotes } = useFlowQuery({
    cadence: `
      import DAO from 0x4414755a2180da53
      
      access(all) fun main(): {Address: UInt64} {
        log("Fetching founder votes from DAO contract")
        let votes = DAO.getFounderVotes()
        log("Found votes for ".concat(votes.length.toString()).concat(" addresses"))
        return votes
      }
    `,
    args: (arg, t) => [],
  });

  console.log("FoundersVoting - votesLoading:", votesLoading);
  console.log("FoundersVoting - votesError:", votesError);
  console.log("FoundersVoting - founderVotes data:", founderVotes);
  const founderVotesObj = (founderVotes ?? {}) as Record<string, unknown>;
  console.log("FoundersVoting - founderVotes keys:", Object.keys(founderVotesObj));
  console.log("FoundersVoting - founderVotes length:", Object.keys(founderVotesObj).length);

  const { mutate, isPending, error: mutateError, data: txId } = useFlowMutate({
    mutation: {
      onSuccess: (transactionId) => {
        console.log("Transaction submitted! Transaction ID:", transactionId);
        setPendingTxId(transactionId);
        setError(null);
        // Don't clear forms or show success yet - wait for sealing
      },
      onError: (error) => {
        console.error("Vote failed:", error);
        setPendingTxId(null);
        let errorMessage = error instanceof Error ? error.message : String(error);

        setError(humanizeDaoTxError(errorMessage));
        setSuccess(null);
        // Clear error message after 15 seconds
        setTimeout(() => setError(null), 15000);
      },
    },
  });

  // Wait for transaction to be sealed and show real failure reason (sealed errorMessage)
  useEffect(() => {
    if (!pendingTxId) {
      setProcessingMessage(null);
      return;
    }

    let unsub: (() => void) | undefined;
    let cancelled = false;

    // Live status updates while we wait (pending/finalized/executed)
    try {
      unsub = fcl.tx(pendingTxId).subscribe((s: any) => {
        if (cancelled) return;
        const status: number | undefined = s?.status;
        const statusMessages: Record<number, string> = {
          1: "Transaction pending...",
          2: "Transaction finalized...",
          3: "Transaction executed, waiting for seal...",
          4: "Transaction sealed. Verifying...",
        };
        if (typeof status === "number") {
          setProcessingMessage(statusMessages[status] || "Processing transaction...");
        }
      });
    } catch (e) {
      console.error("Failed to subscribe to tx status:", e);
      setProcessingMessage("Processing transaction...");
    }

    (async () => {
      try {
        const sealed: any = await fcl.tx(pendingTxId).onceSealed();
        if (cancelled) return;

        // FCL sealed response includes statusCode + errorMessage
        const statusCode: number | undefined = sealed?.statusCode;
        const errorMessage: string | undefined = sealed?.errorMessage;

        if (statusCode && statusCode !== 0) {
          setError(humanizeDaoTxError(errorMessage || "Transaction failed (sealed)."));
          setSuccess(null);
          setProcessingMessage(null);
          setPendingTxId(null);
          return;
        }

        // Success (sealed)
        setSuccess("Vote submitted successfully! Transaction ID: " + pendingTxId);
        setError(null);
        setProcessingMessage(null);
        setFirstOption("");
        setSecondOption("");
        setThirdOption("");
        setPendingTxId(null);
        refetchVotes();
        setTimeout(() => setSuccess(null), 5000);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(humanizeDaoTxError(msg));
        setSuccess(null);
        setProcessingMessage(null);
        setPendingTxId(null);
      }
    })();

    return () => {
      cancelled = true;
      try {
        unsub?.();
      } catch {
        // ignore
      }
    };
  }, [pendingTxId, refetchVotes]);

  const handleVote = async () => {
    setError(null);
    setSuccess(null);
    setProcessingMessage(null);

    if (!firstOption || !secondOption || !thirdOption) {
      setError("Please provide all three addresses");
      return;
    }

    if (!user?.loggedIn) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      mutate({
        cadence: `
          import DAO from 0x4414755a2180da53
          
          transaction(firstOption: Address, secondOption: Address, thirdOption: Address) {
            let arsenalRef: auth(DAO.ArsenalActions) &DAO.Arsenal?
            
            prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue, UnpublishCapability) &Account) {
              if signer.storage.borrow<&DAO.Arsenal>(from: DAO.ArsenalStoragePath) != nil {
                self.arsenalRef = signer.storage.borrow<auth(DAO.ArsenalActions) &DAO.Arsenal>(from: DAO.ArsenalStoragePath)!
              } else {
                let arsenal <- DAO.createArsenal(parentAccount: signer)
                  ?? panic("Unable to create Arsenal")
                signer.storage.save(<-arsenal, to: DAO.ArsenalStoragePath)
                let oldLink = signer.capabilities.unpublish(DAO.ArsenalPublicPath)
                let collectionCap = signer.capabilities.storage.issue<&DAO.Arsenal>(DAO.ArsenalStoragePath)
                signer.capabilities.publish(collectionCap, at: DAO.ArsenalPublicPath)
              }
              let arsenalRef = signer.storage.borrow<auth(DAO.ArsenalActions) &DAO.Arsenal>(from: DAO.ArsenalStoragePath)!
              self.arsenalRef = arsenalRef
            }
            
            execute {
              let options = [firstOption, secondOption, thirdOption]
              self.arsenalRef!.voteFounder(options: options)
            }
          }
        `,
        args: (arg, t) => [
          arg(firstOption, t.Address),
          arg(secondOption, t.Address),
          arg(thirdOption, t.Address),
        ],
        limit: 1000,
      });
    } catch (error) {
      console.error("Vote failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(humanizeDaoTxError(errorMessage));
    }
  };

  // Always show the component, but show login prompt if not logged in
  if (!user?.loggedIn) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-[rgb(241,245,249)] dark:bg-white/[0.04] p-6 sm:p-8">
        <h3 className="text-xl font-semibold text-black dark:text-white mb-4">
          Vote for Founders
        </h3>
        <p className="text-sm text-black/60 dark:text-white/60 mb-6">
          Connect your wallet to vote for founders
        </p>
        {!votesLoading && Object.keys(founderVotesObj).length > 0 && (
          <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
            <h4 className="text-sm font-semibold text-black dark:text-white mb-3">
              Current Votes
            </h4>
            <div className="space-y-2">
              {Object.entries(founderVotesObj).map(([address, votes]) => (
                <div
                  key={address}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-black/60 dark:text-white/60 font-mono">
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </span>
                  <span className="text-black dark:text-white font-semibold">
                    {String(votes)} votes
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-[rgb(241,245,249)] dark:bg-white/[0.04] p-6 sm:p-8">
      <h3 className="text-xl font-semibold text-black dark:text-white mb-4">
        Vote for Founders
      </h3>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Vote for up to 3 addresses to become founders of the DPIN DAO
      </p>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-2">
            First Choice
          </label>
          <input
            type="text"
            value={firstOption}
            onChange={(e) => setFirstOption(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-2">
            Second Choice
          </label>
          <input
            type="text"
            value={secondOption}
            onChange={(e) => setSecondOption(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-2">
            Third Choice
          </label>
          <input
            type="text"
            value={thirdOption}
            onChange={(e) => setThirdOption(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
          />
        </div>
      </div>

      {(error || mutateError) && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-500 dark:text-red-400">
            {error ||
              humanizeDaoTxError(
                mutateError instanceof Error ? mutateError.message : String(mutateError)
              )}
          </p>
        </div>
      )}

      {processingMessage && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-500 dark:text-blue-400">
            {processingMessage}
          </p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-[#00ef8b]/10 border border-[#00ef8b]/20">
          <p className="text-sm text-[#00ef8b] dark:text-[#00d97a]">
            {success}
          </p>
        </div>
      )}

      <button
        onClick={handleVote}
        disabled={isPending || pendingTxId !== null}
        className="w-full px-6 py-3 rounded-lg bg-[#00ef8b] text-black font-semibold hover:bg-[#00d97a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Submitting..." : pendingTxId ? "Waiting for confirmation..." : "Submit Vote"}
      </button>

      {!votesLoading && Object.keys(founderVotesObj).length > 0 && (
        <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
          <h4 className="text-sm font-semibold text-black dark:text-white mb-3">
            Current Votes
          </h4>
          <div className="space-y-2">
            {Object.entries(founderVotesObj).map(([address, votes]) => (
              <div
                key={address}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-black/60 dark:text-white/60 font-mono">
                  {address.slice(0, 8)}...{address.slice(-6)}
                </span>
                <span className="text-black dark:text-white font-semibold">
                  {String(votes)} votes
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!votesLoading && Object.keys(founderVotesObj).length === 0 && (
        <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
          <p className="text-sm text-black/60 dark:text-white/60">
            No votes yet. Be the first to vote!
          </p>
        </div>
      )}
      {votesError && (
        <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
          <p className="text-sm text-red-500 dark:text-red-400">
            Error loading votes: {votesError instanceof Error ? votesError.message : String(votesError)}
          </p>
        </div>
      )}
    </div>
  );
}

