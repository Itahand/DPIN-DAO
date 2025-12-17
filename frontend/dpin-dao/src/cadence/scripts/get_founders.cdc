import "DAO"

// SCRIPT TO GET THE FOUNDERS

access(all) fun main(): {UInt64: Address} {
    let founders = DAO.getAllFounders() 
    return founders   
}
