import "DAO"

// SCRIPT TO GET UNCLAIMED FOUNDERS

access(all) fun main(): [Address] {
    let unclaimedFounders = DAO.getUnclaimedFounders()
    return unclaimedFounders
}
