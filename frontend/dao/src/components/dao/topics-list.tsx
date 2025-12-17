"use client";

import { useEffect, useRef } from "react";
import { useFlowQuery } from "@onflow/react-sdk";
import { TopicVoting } from "./topic-voting";

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

interface TopicsListProps {
  refetchRef?: React.MutableRefObject<(() => void) | null>;
}

export function TopicsList({ refetchRef }: TopicsListProps) {
  const { data: topics, isLoading, error, refetch } = useFlowQuery({
    cadence: `
      import DAO from 0x4414755a2180da53
      
      access(all) fun main(): [DAO.TopicInfo] {
        log("Fetching latest topics from DAO contract")
        let topicInfos = DAO.getLatestTopics()
        log("Found ".concat(topicInfos.length.toString()).concat(" topics"))
        return topicInfos
      }
    `,
    args: (arg, t) => [],
  });

  // Expose refetch function to parent
  useEffect(() => {
    if (refetchRef) {
      refetchRef.current = refetch;
    }
  }, [refetch, refetchRef]);

  console.log("TopicsList - isLoading:", isLoading);
  console.log("TopicsList - error:", error);
  console.log("TopicsList - data:", topics);
  console.log("TopicsList - topics type:", typeof topics);
  console.log("TopicsList - topics is array:", Array.isArray(topics));

  if (error) {
    console.error("Error loading topics:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-[rgb(241,245,249)] dark:bg-white/[0.04] p-6 sm:p-8">
        <p className="text-black/60 dark:text-white/60">Loading topics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-[rgb(241,245,249)] dark:bg-white/[0.04] p-6 sm:p-8">
        <h3 className="text-xl font-semibold text-black dark:text-white mb-4">
          Topics
        </h3>
        <p className="text-sm text-red-500 dark:text-red-400">
          Error loading topics: {error instanceof Error ? error.message : String(error)}
        </p>
        <p className="text-xs text-black/40 dark:text-white/40 mt-2">
          Make sure the DAO contract is deployed at 0x4414755a2180da53 on mainnet
        </p>
      </div>
    );
  }

  const topicsArray = Array.isArray(topics) ? topics as TopicInfo[] : [];
  
  console.log("TopicsList - topicsArray length:", topicsArray.length);
  console.log("TopicsList - topicsArray:", topicsArray);

  // Calculate topic IDs: topics are returned sequentially from startTopicId to currentTopicId
  // Topic 0 is always the founders topic
  const calculateTopicIds = (topics: TopicInfo[]): number[] => {
    if (topics.length === 0) return [];
    
    // Find the founders topic index
    const foundersTopicIndex = topics.findIndex(t => t.isFoundersTopic);
    
    if (foundersTopicIndex === -1) {
      // No founders topic found, calculate from end (assuming latest topics)
      const startId = Math.max(0, topics.length - 1);
      return topics.map((_, i) => startId + i);
    }
    
    // Founders topic is at index foundersTopicIndex, and its ID is 0
    // So the first topic's ID is: 0 - foundersTopicIndex
    const firstTopicId = 0 - foundersTopicIndex;
    return topics.map((_, i) => firstTopicId + i);
  };

  const topicIds = calculateTopicIds(topicsArray);

  if (topicsArray.length === 0) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-[rgb(241,245,249)] dark:bg-white/[0.04] p-6 sm:p-8">
        <h3 className="text-xl font-semibold text-black dark:text-white mb-4">
          Topics
        </h3>
        <p className="text-sm text-black/60 dark:text-white/60">
          No topics yet. Founders can create topics to vote on.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-semibold text-black dark:text-white">
        Topics
      </h2>
      {topicsArray.map((topic, index) => {
        const topicId = topicIds[index];
        return (
        <div
          key={index}
          className="rounded-2xl sm:rounded-3xl bg-[rgb(241,245,249)] dark:bg-white/[0.04] p-6 sm:p-8"
        >
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-semibold text-black dark:text-white">
                {topic.title}
              </h3>
              {topic.closed && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-500">
                  Closed
                </span>
              )}
              {!topic.closed && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#00ef8b]/20 text-[#00ef8b]">
                  Open
                </span>
              )}
            </div>
            <p className="text-sm text-black/60 dark:text-white/60 mb-2">
              {topic.description}
            </p>
            <p className="text-xs text-black/40 dark:text-white/40 font-mono">
              Proposer: {topic.proposer}
            </p>
          </div>

          {topic.isFoundersTopic ? (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-black dark:text-white">
                Address Options:
              </h4>
              {topic.addressOptions.length > 0 ? (
                <div className="space-y-2">
                  {topic.addressOptions.map((address, optIndex) => {
                    const voteCount =
                      topic.votes[optIndex.toString()]?.length || 0;
                    return (
                      <div
                        key={optIndex}
                        className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-black/50"
                      >
                        <span className="text-sm font-mono text-black dark:text-white">
                          {address}
                        </span>
                        <span className="text-sm font-semibold text-black dark:text-white">
                          {voteCount} votes
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-black/60 dark:text-white/60">
                  No addresses voted yet
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-semibold text-black dark:text-white">
                  Options:
                </h4>
                {topic.stringOptions.length > 0 ? (
                  <div className="space-y-2">
                    {topic.stringOptions.map((option, optIndex) => {
                      const voteCount =
                        topic.votes[optIndex.toString()]?.length || 0;
                      return (
                        <div
                          key={optIndex}
                          className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-black/50"
                        >
                          <span className="text-sm text-black dark:text-white">
                            {option}
                          </span>
                          <span className="text-sm font-semibold text-black dark:text-white">
                            {voteCount} votes
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-black/60 dark:text-white/60">
                    No options available
                  </p>
                )}
              </div>

              {!topic.closed && (
                <TopicVoting topicId={topicId} topic={topic} onVoteSuccess={refetch} />
              )}
            </>
          )}
        </div>
        );
      })}
    </div>
  );
}

