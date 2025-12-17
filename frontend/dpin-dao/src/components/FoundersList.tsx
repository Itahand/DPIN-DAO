import { useFlowQuery } from '@onflow/react-sdk';
import { useEffect } from 'react';

// Import Cadence scripts
const GET_FOUNDERS_SCRIPT = `
import "DAO"

access(all) fun main(): {UInt64: Address} {
    let founders = DAO.getAllFounders() 
    return founders   
}
`;

const GET_FOUNDER_VOTES_SCRIPT = `
import "DAO"

access(all) fun main(): {Address: UInt64} {
    let votes = DAO.getFounderVotes()
    return votes  
}
`;

const GET_UNCLAIMED_FOUNDERS_SCRIPT = `
import "DAO"

access(all) fun main(): [Address] {
    let unclaimedFounders = DAO.getUnclaimedFounders()
    return unclaimedFounders
}
`;

export function FoundersList() {
  const { data: founders, isLoading: foundersLoading, error: foundersError, refetch: refetchFounders } = useFlowQuery({
    cadence: GET_FOUNDERS_SCRIPT,
    args: (arg, t) => [],
  });

  const { data: founderVotes, isLoading: votesLoading, error: votesError, refetch: refetchVotes } = useFlowQuery({
    cadence: GET_FOUNDER_VOTES_SCRIPT,
    args: (arg, t) => [],
  });

  const { data: unclaimedFounders, isLoading: unclaimedLoading, error: unclaimedError, refetch: refetchUnclaimed } = useFlowQuery({
    cadence: GET_UNCLAIMED_FOUNDERS_SCRIPT,
    args: (arg, t) => [],
  });

  useEffect(() => {
    // Refetch every 10 seconds to get latest data
    const interval = setInterval(() => {
      refetchFounders();
      refetchVotes();
      refetchUnclaimed();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchFounders, refetchVotes, refetchUnclaimed]);

  const isLoading = foundersLoading || votesLoading || unclaimedLoading;
  const hasError = foundersError || votesError || unclaimedError;

  if (isLoading) {
    return (
      <div className="founders-container">
        <h2>Founders</h2>
        <p>Loading founders data...</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="founders-container">
        <h2>Founders</h2>
        <p className="error">
          Error loading founders: {foundersError?.message || votesError?.message || unclaimedError?.message}
        </p>
      </div>
    );
  }

  const foundersMap = (founders as { [key: string]: string }) || {};
  const votesMap = (founderVotes as { [key: string]: number }) || {};
  const unclaimedList = (unclaimedFounders as string[]) || [];

  // Convert founders map to array and sort by founder ID
  const foundersArray = Object.entries(foundersMap)
    .map(([id, address]) => ({
      id: parseInt(id),
      address,
      votes: votesMap[address] || 0,
    }))
    .sort((a, b) => a.id - b.id);

  return (
    <div className="founders-container">
      <h2>DAO Founders</h2>
      
      {foundersArray.length === 0 ? (
        <p>No founders have been selected yet.</p>
      ) : (
        <div className="founders-list">
          <h3>Current Founders ({foundersArray.length})</h3>
          <div className="founders-grid">
            {foundersArray.map((founder) => (
              <div key={founder.id} className="founder-card">
                <div className="founder-id">Founder #{founder.id}</div>
                <div className="founder-address">{founder.address}</div>
                <div className="founder-votes">
                  <span className="vote-count">{founder.votes} votes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unclaimedList.length > 0 && (
        <div className="unclaimed-founders">
          <h3>Unclaimed Founders ({unclaimedList.length})</h3>
          <p className="info">
            These addresses have been selected as founders but haven't claimed their Founder resource yet.
          </p>
          <ul>
            {unclaimedList.map((address, index) => (
              <li key={index} className="unclaimed-address">{address}</li>
            ))}
          </ul>
        </div>
      )}

      {votesMap && Object.keys(votesMap).length > 0 && (
        <div className="founder-votes-section">
          <h3>Founder Vote Counts</h3>
          <div className="votes-list">
            {Object.entries(votesMap)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([address, votes]) => (
                <div key={address} className="vote-item">
                  <span className="address">{address}</span>
                  <span className="vote-count">{votes as number} votes</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
