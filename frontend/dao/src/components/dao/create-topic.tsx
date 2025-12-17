"use client";

import { useFlowCurrentUser, useFlowMutate, useFlowQuery } from "@onflow/react-sdk";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
import { humanizeDaoTxError } from "../../lib/flow-error-messages";

interface CreateTopicProps {
  onTopicCreated?: () => void;
}

export function CreateTopic({ onTopicCreated }: CreateTopicProps) {
  const { user } = useFlowCurrentUser();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowAnyoneAddOptions, setAllowAnyoneAddOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const { data: founders, isLoading: foundersLoading, error: foundersError } = useFlowQuery({
    cadence: `
      import DAO from 0x4414755a2180da53
      
      access(all) fun main(): {UInt64: Address} {
        log("Fetching founders for CreateTopic component")
        let founders = DAO.getAllFounders()
        log("Found ".concat(founders.length.toString()).concat(" founders"))
        return founders
      }
    `,
    args: (arg, t) => [],
  });

  console.log("CreateTopic - foundersLoading:", foundersLoading);
  console.log("CreateTopic - foundersError:", foundersError);
  console.log("CreateTopic - founders data:", founders);

  const { mutate, isPending, data: txId } = useFlowMutate({
    mutation: {
      onSuccess: (transactionId) => {
        console.log("Create topic transaction submitted! Transaction ID:", transactionId);
        setPendingTxId(transactionId);
        setError(null);
        // Don't clear forms or show success yet - wait for sealing
      },
      onError: (error) => {
        console.error("Create topic failed:", error);
        setPendingTxId(null);
        let errorMessage = error instanceof Error ? error.message : String(error);

        setError(humanizeDaoTxError(errorMessage));
        setSuccess(null);
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

    try {
      unsub = fcl.tx(pendingTxId).subscribe((s: any) => {
        if (cancelled) return;
        const status: number | undefined = s?.status;
        const statusMessages: Record<number, string> = {
          1: "Topic creation pending...",
          2: "Topic creation finalized...",
          3: "Topic creation executed, waiting for seal...",
          4: "Topic creation sealed. Verifying...",
        };
        if (typeof status === "number") {
          setProcessingMessage(statusMessages[status] || "Processing topic creation...");
        }
      });
    } catch (e) {
      console.error("Failed to subscribe to create topic tx status:", e);
      setProcessingMessage("Processing topic creation...");
    }

    (async () => {
      try {
        const sealed: any = await fcl.tx(pendingTxId).onceSealed();
        if (cancelled) return;

        const statusCode: number | undefined = sealed?.statusCode;
        const errorMessage: string | undefined = sealed?.errorMessage;

        if (statusCode && statusCode !== 0) {
          setError(humanizeDaoTxError(errorMessage || "Topic creation failed (sealed)."));
          setSuccess(null);
          setProcessingMessage(null);
          setPendingTxId(null);
          return;
        }

        setSuccess("Topic created successfully! Transaction ID: " + pendingTxId);
        setError(null);
        setProcessingMessage(null);
        setTitle("");
        setDescription("");
        setOptions(["", ""]);
        setAllowAnyoneAddOptions(false);
        setPendingTxId(null);
        if (onTopicCreated) onTopicCreated();
        setTimeout(() => setSuccess(null), 5000);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
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
  }, [pendingTxId, onTopicCreated]);

  const isFounder = user?.loggedIn && founders
    ? Object.values(founders).includes(user.addr)
    : false;

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    setProcessingMessage(null);

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      setError("Please provide at least 2 options");
      return;
    }

    try {
      mutate({
        cadence: `
          import DAO from 0x4414755a2180da53
          
          transaction(title: String, description: String, initialOptions: [String], allowAnyoneAddOptions: Bool) {
            let founderRef: auth(DAO.FounderActions) &DAO.Arsenal
            
            prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue, UnpublishCapability) &Account) {
              let founderRef = signer.storage.borrow<auth(DAO.FounderActions) &DAO.Arsenal>(from: DAO.ArsenalStoragePath)!
              self.founderRef = founderRef
            }
            
            execute {
              self.founderRef.proposeTopic(
                title: title,
                description: description,
                initialOptions: initialOptions,
                allowAnyoneAddOptions: allowAnyoneAddOptions
              )
            }
          }
        `,
        args: (arg, t) => [
          arg(title, t.String),
          arg(description, t.String),
          arg(options.filter((opt) => opt.trim()), t.Array(t.String)),
          arg(allowAnyoneAddOptions, t.Bool),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });
    } catch (error) {
      console.error("Create topic failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(humanizeDaoTxError(errorMessage));
    }
  };

  if (!user?.loggedIn) {
    return null;
  }

  if (!isFounder) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-[rgb(241,245,249)] dark:bg-white/[0.04] p-6 sm:p-8">
        <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
          Create Topic
        </h3>
        <p className="text-sm text-black/60 dark:text-white/60">
          Only founders can create topics. You are not a founder.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-[rgb(241,245,249)] dark:bg-white/[0.04] p-6 sm:p-8">
      <h3 className="text-xl font-semibold text-black dark:text-white mb-4">
        Create New Topic
      </h3>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter topic title..."
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter topic description..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-2">
            Options (minimum 2)
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}...`}
                  className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="px-3 py-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addOption}
              className="w-full px-4 py-2 rounded-lg bg-black/10 dark:bg-white/10 text-black dark:text-white font-semibold hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
            >
              + Add Option
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowAddOptions"
            checked={allowAnyoneAddOptions}
            onChange={(e) => setAllowAnyoneAddOptions(e.target.checked)}
            className="w-4 h-4 rounded border-black/20 dark:border-white/20"
          />
          <label
            htmlFor="allowAddOptions"
            className="text-sm text-black dark:text-white"
          >
            Allow anyone to add options
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-500 dark:text-red-400">
            {error}
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
        onClick={handleSubmit}
        disabled={isPending || pendingTxId !== null}
        className="w-full px-6 py-3 rounded-lg bg-[#00ef8b] text-black font-semibold hover:bg-[#00d97a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Submitting..." : pendingTxId ? "Waiting for confirmation..." : "Create Topic"}
      </button>
    </div>
  );
}

