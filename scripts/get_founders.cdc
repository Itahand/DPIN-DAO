import "DAO"

// SCRIPT TO GET THE VOTES FOR THE FOUNDERS TOPIC

access(all) fun main(): {UInt64: Address} {
        let founders = DAO.getAllFounders() 
        return founders   
} 