"use client";

import { useFlowCurrentUser, useFlowMutate, useFlowQuery } from "@onflow/react-sdk";
import { useState } from "react";
import * as fcl from "@onflow/fcl";

export function FoundersVoting() {
  const { user } = useFlowCurrentUser();
  const [firstOption, setFirstOption] = useState("");
  const [secondOption, setSecondOption] = useState("");
  const [thirdOption, setThirdOption] = useState("");

  const { data: founderVotes, isLoading: votesLoading, error: votesError } = useFlowQuery({
    cadence: `
      import DAO from 0xded84803994b06e4
      
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
  console.log("FoundersVoting - founderVotes keys:", founderVotes ? Object.keys(founderVotes) : []);
  console.log("FoundersVoting - founderVotes length:", founderVotes ? Object.keys(founderVotes).length : 0);

  const { mutate, isPending } = useFlowMutate();

  const handleVote = async () => {
    if (!firstOption || !secondOption || !thirdOption) {
      alert("Please provide all three addresses");
      return;
    }

    if (!user?.loggedIn) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      mutate({
        cadence: `
          import DAO from 0xded84803994b06e4
          
          transaction(firstOption: Address, secondOption: Address, thirdOption: Address) {
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
              let options = [firstOption, secondOption, thirdOption]
              self.arsenalRef.voteFounder(options: options)
            }
          }
        `,
        args: (arg, t) => [
          arg(firstOption, t.Address),
          arg(secondOption, t.Address),
          arg(thirdOption, t.Address),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });
      setFirstOption("");
      setSecondOption("");
      setThirdOption("");
    } catch (error) {
      console.error("Vote failed:", error);
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
        {!votesLoading && founderVotes && Object.keys(founderVotes).length > 0 && (
          <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
            <h4 className="text-sm font-semibold text-black dark:text-white mb-3">
              Current Votes
            </h4>
            <div className="space-y-2">
              {Object.entries(founderVotes).map(([address, votes]) => (
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

      <button
        onClick={handleVote}
        disabled={isPending}
        className="w-full px-6 py-3 rounded-lg bg-[#00ef8b] text-black font-semibold hover:bg-[#00d97a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Voting..." : "Submit Vote"}
      </button>

      {!votesLoading && founderVotes && Object.keys(founderVotes).length > 0 && (
        <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
          <h4 className="text-sm font-semibold text-black dark:text-white mb-3">
            Current Votes
          </h4>
          <div className="space-y-2">
            {Object.entries(founderVotes).map(([address, votes]) => (
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
      {!votesLoading && founderVotes && Object.keys(founderVotes).length === 0 && (
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
