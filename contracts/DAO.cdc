// MADE BY: NoahOverflow

import "FlowTransactionScheduler" 
import "FungibleToken"
import "FlowToken"

access(all)
contract DAO {
    access(self) var currentTopicId: UInt64

    access(all) event Closed(topicId: UInt64)

    access(all) entitlement vote

    access(all)
    resource Topic {

        access(all) let votes: {UInt64: [Address]}
        access(all) var closed: Bool

        init() {

            self.votes = {}
            self.closed = false
        }

        access(vote)
        fun vote(option: UInt64, voter: Address) {
            pre {
                self.closed == false: "Topic is closed"
                self.votes[option]!.contains(voter) == false: "Voter has already voted"
            }
            if (self.votes[option] == nil) {
                self.votes[option] = []
            }
            self.votes[option]!.append(voter)
        }

        access(all)
        view fun getVotes(option: UInt64): UInt64 {
            let length = self.votes[option]!.length
            return UInt64(length)
        }

        access(contract)
        fun close() {
            self.closed = true
            emit Closed(topicId: DAO.currentTopicId)
        }
    }

    // -----------------------------------------------------------------------
    /// Handler resource that implements the Scheduled Transaction interface
    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler {
        access(FlowTransactionScheduler.Execute) fun executeTransaction(id: UInt64, data: AnyStruct?) {

            // Get current open topic
            let identifier = "\(DAO.account.address)/Topics/\(DAO.currentTopicId)"
            let storagePath = StoragePath(identifier: identifier)!
            let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
            ?? panic("Unable to borrow reference to the topic")
            // Close the topic
            topic.close()
            // Increment the current topic id
            DAO.currentTopicId = DAO.currentTopicId + 1
            // Create new topic
            let newIdentifier = "\(DAO.account.address)/Topics/\(DAO.currentTopicId)"
            let newStoragePath = StoragePath(identifier: newIdentifier)!
            let newTopic <- create Topic()
            DAO.account.storage.save(<- newTopic, to: newStoragePath)


            // Determine delay for the next transaction 
            // Let's do a 5 days
            var delay: UFix64 = 5.0 * 24.0 * 60.0 * 60.0
                let future = getCurrentBlock().timestamp + delay
                let priority = FlowTransactionScheduler.Priority.Medium
                let executionEffort: UInt64 = 1000

                let estimate = FlowTransactionScheduler.estimate(
                    data: data,
                    timestamp: future,
                    priority: priority,
                    executionEffort: executionEffort
                )       

                assert(
                    estimate.timestamp != nil || priority == FlowTransactionScheduler.Priority.Low,
                    message: estimate.error ?? "estimation failed"
                ) 

            // Withdraw FLOW fees from this resource's ownner account vault
            let vaultRef = DAO.account.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)!
            let fees <- vaultRef.withdraw(amount: estimate.flowFee ?? 0.0) as! @FlowToken.Vault 

            // Issue a capability to the handler stored in this contract account
            let handlerCap = DAO.account.capabilities.storage
                    .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(/storage/DAOHandler)

            let receipt <- FlowTransactionScheduler.schedule(
                handlerCap: handlerCap,
                data: data,
                timestamp: future,
                priority: priority,
                executionEffort: executionEffort,
                fees: <-fees
            )

            // store receipt in the contract account storage
            let receiptIdentifier = "\(DAO.account.address)/Receipts/\(receipt.id)"
            let receiptStoragePath = StoragePath(identifier: receiptIdentifier)!
            DAO.account.storage.save(<-receipt, to: receiptStoragePath)
            
        }
        
    }

    init() {
        self.currentTopicId = 0
        let identifier = "\(DAO.account.address)/Topics/\(self.currentTopicId)"
        let storagePath = StoragePath(identifier: identifier)!

        // create the first Topic resource
        let topicZero <- create Topic()
        DAO.account.storage.save(<- topicZero, to: storagePath)
    }
}