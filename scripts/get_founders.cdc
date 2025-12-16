import "DAO"

// SCRIPT TO GET THE VOTES FOR THE FOUNDERS TOPIC

access(all) fun main(): [Address] {
        let votes = DAO.getAllFounders() 
        return votes  
}
