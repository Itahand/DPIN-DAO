"use client";

import { useFlowCurrentUser, useFlowMutate, useFlowQuery } from "@onflow/react-sdk";
import { useState } from "react";
import * as fcl from "@onflow/fcl";

export function CreateTopic() {
  const { user } = useFlowCurrentUser();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowAnyoneAddOptions, setAllowAnyoneAddOptions] = useState(false);

  const { data: founders, isLoading: foundersLoading, error: foundersError } = useFlowQuery({
    cadence: `
      import DAO from 0xded84803994b06e4
      
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

  const { mutate, isPending } = useFlowMutate();

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
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (!description.trim()) {
      alert("Please enter a description");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      alert("Please provide at least 2 options");
      return;
    }

    try {
      mutate({
        cadence: `
          import DAO from 0xded84803994b06e4
          
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
      setTitle("");
      setDescription("");
      setOptions(["", ""]);
      setAllowAnyoneAddOptions(false);
    } catch (error) {
      console.error("Create topic failed:", error);
      alert("Failed to create topic. Make sure you are a founder.");
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

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full px-6 py-3 rounded-lg bg-[#00ef8b] text-black font-semibold hover:bg-[#00d97a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Creating..." : "Create Topic"}
      </button>
    </div>
  );
}
