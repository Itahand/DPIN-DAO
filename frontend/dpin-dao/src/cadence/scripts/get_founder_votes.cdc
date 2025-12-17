import "DAO"

// SCRIPT TO GET THE VOTES FOR THE FOUNDERS TOPIC

access(all) fun main(): {Address: UInt64} {
    let votes = DAO.getFounderVotes()
    return votes  
}
