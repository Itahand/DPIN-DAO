// get unclaimed founders
import "DAO"

access(all) fun main(): [Address] {
    let unclaimedFounders = DAO.getUnclaimedFounders()
    return unclaimedFounders
}

