"use client";

import { useFlowCurrentUser, useFlowMutate } from "@onflow/react-sdk";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
import { humanizeDaoTxError } from "../../lib/flow-error-messages";

interface TopicInfo {
  title: string;
  description: string;
  proposer: string;
  allowAnyoneAddOptions: boolean;
  isFoundersTopic: boolean;
  stringOptions: string[];
  addressOptions: string[];
  votes: { [key: string]: string[] };
  closed: boolean;
  voters: { [key: string]: boolean };
}

interface TopicVotingProps {
  topicId: number;
  topic: TopicInfo;
  onVoteSuccess?: () => void;
}

export function TopicVoting({ topicId, topic, onVoteSuccess }: TopicVotingProps) {
  const { user } = useFlowCurrentUser();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [newOption, setNewOption] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingVoteTxId, setPendingVoteTxId] = useState<string | null>(null);
  const [pendingAddOptionTxId, setPendingAddOptionTxId] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const { mutate: voteMutate, isPending: isVotingPending, data: voteTxId } = useFlowMutate({
    mutation: {
      onSuccess: (transactionId) => {
        console.log("Vote transaction submitted! Transaction ID:", transactionId);
        setPendingVoteTxId(transactionId);
        setError(null);
        // Don't clear forms or show success yet - wait for sealing
      },
      onError: (error) => {
        console.error("Vote failed:", error);
        setPendingVoteTxId(null);
        let errorMessage = error instanceof Error ? error.message : String(error);

        setError(humanizeDaoTxError(errorMessage));
        setSuccess(null);
        setTimeout(() => setError(null), 15000);
      },
    },
  });
  
  const { mutate: addOptionMutate, isPending: isAddingOptionPending, data: addOptionTxId } = useFlowMutate({
    mutation: {
      onSuccess: (transactionId) => {
        console.log("Add option transaction submitted! Transaction ID:", transactionId);
        setPendingAddOptionTxId(transactionId);
        setError(null);
        // Don't clear forms or show success yet - wait for sealing
      },
      onError: (error) => {
        console.error("Add option failed:", error);
        setPendingAddOptionTxId(null);
        let errorMessage = error instanceof Error ? error.message : String(error);

        setError(humanizeDaoTxError(errorMessage));
        setSuccess(null);
        setTimeout(() => setError(null), 15000);
      },
    },
  });

  // Wait for vote transaction to be sealed and show real failure reason
  useEffect(() => {
    if (!pendingVoteTxId) {
      return;
    }

    let unsub: (() => void) | undefined;
    let cancelled = false;

    try {
      unsub = fcl.tx(pendingVoteTxId).subscribe((s: any) => {
        if (cancelled) return;
        const status: number | undefined = s?.status;
        const statusMessages: Record<number, string> = {
          1: "Vote transaction pending...",
          2: "Vote transaction finalized...",
          3: "Vote transaction executed, waiting for seal...",
          4: "Vote transaction sealed. Verifying...",
        };
        if (typeof status === "number") {
          setProcessingMessage(statusMessages[status] || "Processing vote...");
        }
      });
    } catch (e) {
      console.error("Failed to subscribe to vote tx status:", e);
      setProcessingMessage("Processing vote...");
    }

    (async () => {
      try {
        const sealed: any = await fcl.tx(pendingVoteTxId).onceSealed();
        if (cancelled) return;

        const statusCode: number | undefined = sealed?.statusCode;
        const errorMessage: string | undefined = sealed?.errorMessage;

        if (statusCode && statusCode !== 0) {
          setError(humanizeDaoTxError(errorMessage || "Vote transaction failed (sealed)."));
          setSuccess(null);
          setProcessingMessage(null);
          setPendingVoteTxId(null);
          return;
        }

        setSuccess("Vote submitted successfully!");
        setError(null);
        setProcessingMessage(null);
        setSelectedOption(null);
        setPendingVoteTxId(null);
        if (onVoteSuccess) onVoteSuccess();
        setTimeout(() => setSuccess(null), 5000);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(humanizeDaoTxError(msg));
        setSuccess(null);
        setProcessingMessage(null);
        setPendingVoteTxId(null);
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
  }, [pendingVoteTxId, onVoteSuccess]);

  // Wait for add option transaction to be sealed and show real failure reason
  useEffect(() => {
    if (!pendingAddOptionTxId) {
      return;
    }

    let unsub: (() => void) | undefined;
    let cancelled = false;

    try {
      unsub = fcl.tx(pendingAddOptionTxId).subscribe((s: any) => {
        if (cancelled) return;
        const status: number | undefined = s?.status;
        const statusMessages: Record<number, string> = {
          1: "Add option pending...",
          2: "Add option finalized...",
          3: "Add option executed, waiting for seal...",
          4: "Add option sealed. Verifying...",
        };
        if (typeof status === "number") {
          setProcessingMessage(statusMessages[status] || "Processing add option...");
        }
      });
    } catch (e) {
      console.error("Failed to subscribe to add option tx status:", e);
      setProcessingMessage("Processing add option...");
    }

    (async () => {
      try {
        const sealed: any = await fcl.tx(pendingAddOptionTxId).onceSealed();
        if (cancelled) return;

        const statusCode: number | undefined = sealed?.statusCode;
        const errorMessage: string | undefined = sealed?.errorMessage;

        if (statusCode && statusCode !== 0) {
          setError(humanizeDaoTxError(errorMessage || "Add option transaction failed (sealed)."));
          setSuccess(null);
          setProcessingMessage(null);
          setPendingAddOptionTxId(null);
          return;
        }

        setSuccess("Option added successfully!");
        setError(null);
        setProcessingMessage(null);
        setNewOption("");
        setPendingAddOptionTxId(null);
        if (onVoteSuccess) onVoteSuccess();
        setTimeout(() => setSuccess(null), 5000);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(humanizeDaoTxError(msg));
        setSuccess(null);
        setProcessingMessage(null);
        setPendingAddOptionTxId(null);
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
  }, [pendingAddOptionTxId, onVoteSuccess]);

  const handleVote = async () => {
    setError(null);
    setSuccess(null);
    setProcessingMessage(null);

    if (selectedOption === null) {
      setError("Please select an option");
      return;
    }

    if (!user?.loggedIn) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      voteMutate({
        cadence: `
          import DAO from 0x4414755a2180da53
          
          transaction(topicId: UInt64, option: UInt64) {
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
              self.arsenalRef!.voteTopic(topicId: topicId, option: option)
            }
          }
        `,
        args: (arg, t) => [
          arg(topicId, t.UInt64),
          arg(selectedOption!, t.UInt64),
        ],
        limit: 1000,
      });
      // Don't clear fields here - only clear on success (in onSuccess callback)
    } catch (error) {
      console.error("Vote failed:", error);
      // Error is handled by the mutation's onError callback
      // Fields are NOT cleared on error - user can retry
    }
  };

  const handleAddOption = async () => {
    setError(null);
    setSuccess(null);
    setProcessingMessage(null);

    if (!newOption.trim()) {
      setError("Please enter an option");
      return;
    }

    if (!topic.allowAnyoneAddOptions) {
      setError("This topic does not allow adding options");
      return;
    }

    try {
      addOptionMutate({
        cadence: `
          import DAO from 0x4414755a2180da53
          
          transaction(topicId: UInt64, option: String) {
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
              self.arsenalRef!.addOption(topicId: topicId, option: option)
            }
          }
        `,
        args: (arg, t) => [
          arg(topicId, t.UInt64),
          arg(newOption, t.String),
        ],
        limit: 1000,
      });
      // Don't clear fields here - only clear on success (in onSuccess callback)
    } catch (error) {
      console.error("Add option failed:", error);
      // Error is handled by the mutation's onError callback
      // Fields are NOT cleared on error - user can retry
    }
  };

  if (!user?.loggedIn) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-black/5 dark:bg-white/5">
        <p className="text-sm text-black/60 dark:text-white/60">
          Connect your wallet to vote
        </p>
      </div>
    );
  }

  const hasVoted = user.addr && topic.voters[user.addr];

  return (
    <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
      {(error || success || processingMessage) && (
        <div className="mb-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500 dark:text-red-400">
                {error}
              </p>
            </div>
          )}
          {processingMessage && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-500 dark:text-blue-400">
                {processingMessage}
              </p>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-[#00ef8b]/10 border border-[#00ef8b]/20">
              <p className="text-sm text-[#00ef8b] dark:text-[#00d97a]">
                {success}
              </p>
            </div>
          )}
        </div>
      )}

      {hasVoted ? (
        <p className="text-sm text-[#00ef8b] font-semibold">
          ✓ You have already voted on this topic
        </p>
      ) : (
        <>
          <h4 className="text-sm font-semibold text-black dark:text-white mb-3">
            Cast Your Vote
          </h4>
          <div className="space-y-2 mb-4">
            {topic.stringOptions.map((option, index) => (
              <label
                key={index}
                className="flex items-center p-3 rounded-lg bg-white dark:bg-black/50 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                  <input
                  type="radio"
                  name={`topic-${topicId}`}
                  value={index}
                  checked={selectedOption === index}
                  onChange={() => setSelectedOption(index)}
                  className="mr-3"
                />
                <span className="text-sm text-black dark:text-white">
                  {option}
                </span>
              </label>
            ))}
          </div>
          <button
            onClick={handleVote}
            disabled={isVotingPending || selectedOption === null || pendingVoteTxId !== null}
            className="w-full px-6 py-3 rounded-lg bg-[#00ef8b] text-black font-semibold hover:bg-[#00d97a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVotingPending ? "Submitting..." : pendingVoteTxId ? "Waiting for confirmation..." : "Submit Vote"}
          </button>
        </>
      )}

      {topic.allowAnyoneAddOptions && !hasVoted && (
        <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
          <h4 className="text-sm font-semibold text-black dark:text-white mb-2">
            Add New Option
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Enter new option..."
              className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
            />
            <button
              onClick={handleAddOption}
              disabled={isAddingOptionPending || !newOption.trim() || pendingAddOptionTxId !== null}
              className="px-4 py-2 rounded-lg bg-black/10 dark:bg-white/10 text-black dark:text-white font-semibold hover:bg-black/20 dark:hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingOptionPending ? "Submitting..." : pendingAddOptionTxId ? "Waiting..." : "Add"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

