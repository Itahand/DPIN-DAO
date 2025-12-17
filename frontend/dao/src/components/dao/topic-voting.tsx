"use client";

import { useFlowCurrentUser, useFlowMutate } from "@onflow/react-sdk";
import { useState } from "react";
import * as fcl from "@onflow/fcl";

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
}

export function TopicVoting({ topicId, topic }: TopicVotingProps) {
  const { user } = useFlowCurrentUser();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [newOption, setNewOption] = useState("");

  const { mutate: voteMutate, isPending: isVotingPending } = useFlowMutate();
  const { mutate: addOptionMutate, isPending: isAddingOptionPending } = useFlowMutate();

  const handleVote = async () => {
    if (selectedOption === null) {
      alert("Please select an option");
      return;
    }

    if (!user?.loggedIn) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      voteMutate({
        cadence: `
          import DAO from 0xded84803994b06e4
          
          transaction(topicId: UInt64, option: UInt64) {
            let arsenalRef: auth(DAO.ArsenalActions) &DAO.Arsenal
            
            prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue, UnpublishCapability) &Account) {
              if signer.storage.borrow<&DAO.Arsenal>(from: DAO.ArsenalStoragePath) != nil {
                self.arsenalRef = signer.storage.borrow<auth(DAO.ArsenalActions) &DAO.Arsenal>(from: DAO.ArsenalStoragePath)!
              } else {
                let arsenal <- DAO.createArsenal(parentAccount: signer)
                signer.storage.save(<-arsenal, to: DAO.ArsenalStoragePath)
                let oldLink = signer.capabilities.unpublish(DAO.ArsenalPublicPath)
                let collectionCap = signer.capabilities.storage.issue<&DAO.Arsenal>(DAO.ArsenalStoragePath)
                signer.capabilities.publish(collectionCap, at: DAO.ArsenalPublicPath)
              }
              let arsenalRef = signer.storage.borrow<auth(DAO.ArsenalActions) &DAO.Arsenal>(from: DAO.ArsenalStoragePath)!
              self.arsenalRef = arsenalRef
            }
            
            execute {
              self.arsenalRef.voteTopic(topicId: topicId, option: option)
            }
          }
        `,
        args: (arg, t) => [
          arg(topicId, t.UInt64),
          arg(selectedOption!, t.UInt64),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });
      setSelectedOption(null);
    } catch (error) {
      console.error("Vote failed:", error);
      alert("Failed to vote. You may have already voted.");
    }
  };

  const handleAddOption = async () => {
    if (!newOption.trim()) {
      alert("Please enter an option");
      return;
    }

    if (!topic.allowAnyoneAddOptions) {
      alert("This topic does not allow adding options");
      return;
    }

    try {
      addOptionMutate({
        cadence: `
          import DAO from 0xded84803994b06e4
          
          transaction(topicId: UInt64, option: String) {
            let arsenalRef: auth(DAO.ArsenalActions) &DAO.Arsenal
            
            prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue, UnpublishCapability) &Account) {
              if signer.storage.borrow<&DAO.Arsenal>(from: DAO.ArsenalStoragePath) != nil {
                self.arsenalRef = signer.storage.borrow<auth(DAO.ArsenalActions) &DAO.Arsenal>(from: DAO.ArsenalStoragePath)!
              } else {
                let arsenal <- DAO.createArsenal(parentAccount: signer)
                signer.storage.save(<-arsenal, to: DAO.ArsenalStoragePath)
                let oldLink = signer.capabilities.unpublish(DAO.ArsenalPublicPath)
                let collectionCap = signer.capabilities.storage.issue<&DAO.Arsenal>(DAO.ArsenalStoragePath)
                signer.capabilities.publish(collectionCap, at: DAO.ArsenalPublicPath)
              }
              let arsenalRef = signer.storage.borrow<auth(DAO.ArsenalActions) &DAO.Arsenal>(from: DAO.ArsenalStoragePath)!
              self.arsenalRef = arsenalRef
            }
            
            execute {
              self.arsenalRef.addOption(topicId: topicId, option: option)
            }
          }
        `,
        args: (arg, t) => [
          arg(topicId, t.UInt64),
          arg(newOption, t.String),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });
      setNewOption("");
    } catch (error) {
      console.error("Add option failed:", error);
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
            disabled={isVotingPending || selectedOption === null}
            className="w-full px-6 py-3 rounded-lg bg-[#00ef8b] text-black font-semibold hover:bg-[#00d97a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVotingPending ? "Voting..." : "Submit Vote"}
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
              disabled={isAddingOptionPending || !newOption.trim()}
              className="px-4 py-2 rounded-lg bg-black/10 dark:bg-white/10 text-black dark:text-white font-semibold hover:bg-black/20 dark:hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingOptionPending ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
