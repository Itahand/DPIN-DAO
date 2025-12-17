import { useFlowQuery } from '@onflow/react-sdk';
import { useEffect } from 'react';

// Import Cadence script
const GET_TOPICS_SCRIPT = `
import "DAO"

access(all) fun main(): [DAO.TopicInfo] {
    let topicInfos = DAO.getLatestTopics()
    return topicInfos
}
`;

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

export function TopicsList() {
  const { data: topics, isLoading, error, refetch } = useFlowQuery({
    cadence: GET_TOPICS_SCRIPT,
    args: (arg, t) => [],
  });

  useEffect(() => {
    // Refetch every 10 seconds to get latest topics
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="topics-container">
        <h2>Topics</h2>
        <p>Loading topics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="topics-container">
        <h2>Topics</h2>
        <p className="error">Error loading topics: {error.message}</p>
      </div>
    );
  }

  const topicsList = (topics as TopicInfo[]) || [];

  return (
    <div className="topics-container">
      <h2>DAO Topics</h2>
      {topicsList.length === 0 ? (
        <p>No topics found.</p>
      ) : (
        <div className="topics-grid">
          {topicsList.map((topic, index) => (
            <div key={index} className="topic-card">
              <h3>{topic.title}</h3>
              <p className="topic-description">{topic.description}</p>
              <div className="topic-meta">
                <span className={`status ${topic.closed ? 'closed' : 'open'}`}>
                  {topic.closed ? 'Closed' : 'Open'}
                </span>
                {topic.isFoundersTopic && (
                  <span className="badge founders">Founders Topic</span>
                )}
              </div>
              <div className="topic-options">
                <h4>Options:</h4>
                {topic.isFoundersTopic ? (
                  <ul>
                    {topic.addressOptions.map((address, idx) => {
                      const voteCount = topic.votes[idx]?.length || 0;
                      return (
                        <li key={idx}>
                          <span className="address">{address}</span>
                          <span className="vote-count">{voteCount} votes</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul>
                    {topic.stringOptions.map((option, idx) => {
                      const voteCount = topic.votes[idx]?.length || 0;
                      return (
                        <li key={idx}>
                          <span className="option">{option}</span>
                          <span className="vote-count">{voteCount} votes</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="topic-proposer">
                <small>Proposed by: {topic.proposer}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
