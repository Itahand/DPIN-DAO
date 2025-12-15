// MADE BY: NoahOverflow

import "FlowTransactionScheduler" 
import "FungibleToken"
import "FlowToken"

access(all)
contract DAO {
    access(self) var currentTopicId: UInt64
    access(self) var currentFounderId: UInt64
    access(self) var foundersTopicId: UInt64
    access(self) var founderVoteCounts: {Address: UInt64}
    access(self) var voters: {Address: Bool}

    access(all) event Closed(topicId: UInt64)
    access(all) event TopicProposed(topicId: UInt64, proposer: Address, title: String, allowAnyoneAddOptions: Bool)
    access(all) event OptionAdded(topicId: UInt64, optionIndex: UInt64, option: String)
    access(all) event FounderClaimed(recipient: Address)
    access(all) event VoteCounted(topicId: UInt64)


    // Founder resource with privileges
    access(all) resource Founder {
        access(all) let id: UInt64
        init(id: UInt64) {
            self.id = id
        }

        access(all) fun proposeTopic(title: String, description: String, initialOptions: [String], allowAnyoneAddOptions: Bool): UInt64 {
            pre {
                title.length > 0: "Title cannot be empty"
                initialOptions.length > 1: "Must have at least two options"
            }
            
            DAO.currentTopicId = DAO.currentTopicId + 1
            let topicId = DAO.currentTopicId
            
            let identifier = "\(DAO.account.address)/Topics/\(topicId)"
            let storagePath = StoragePath(identifier: identifier)!
            
            let topic <- create Topic(
                title: title,
                description: description,
                proposer: self.owner!.address,
                allowAnyoneAddOptions: allowAnyoneAddOptions
            )
            
            // Add initial options
            var index: UInt64 = 0
            while index < UInt64(initialOptions.length) {
                topic.addStringOption(option: initialOptions[index])
                index = index + 1
            }
            
            DAO.account.storage.save(<-topic, to: storagePath)
            
            emit TopicProposed(topicId: topicId, proposer: self.owner!.address, title: title, allowAnyoneAddOptions: allowAnyoneAddOptions)
            
            return topicId
        }

        access(all) fun addOption(topicId: UInt64, option: String) {
            pre {
                option.length > 0: "Option cannot be empty"
            }
            
            let identifier = "\(DAO.account.address)/Topics/\(topicId)"
            let storagePath = StoragePath(identifier: identifier)!
            let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
                ?? panic("Topic not found")
            
            topic.addStringOption(option: option)
            
            emit OptionAdded(topicId: topicId, optionIndex: topic.getOptionCount() - 1, option: option)
        }
    }

    access(all) resource FounderArsenal {
        access(all) let founder: @{UInt64: Founder}
        
        init() {
            self.founder <- {}
        }
        
        access(contract) fun depositFounder(founder: @Founder) {
            self.founder[founder.id] <-! founder
        }
        
    }

    access(all)
    resource Topic {
        access(all) var title: String
        access(all) var description: String
        access(all) var proposer: Address
        access(all) var allowAnyoneAddOptions: Bool
        access(all) var isFoundersTopic: Bool
        
        access(all) var stringOptions: [String]
        access(all) var addressOptions: [Address]
        access(all) var votes: {UInt64: [Address]}
        access(all) var closed: Bool
        access(self) var voters: {Address: Bool}

        init(title: String, description: String, proposer: Address, allowAnyoneAddOptions: Bool) {
            self.title = title
            self.description = description
            self.proposer = proposer
            self.allowAnyoneAddOptions = allowAnyoneAddOptions
            self.isFoundersTopic = false
            self.stringOptions = []
            self.addressOptions = []
            self.votes = {}
            self.closed = false
            self.voters = {}
        }

        access(contract) fun initFoundersTopic() {
            self.title = "Founders"
            self.description = "Vote for the top 5 founders of the DAO"
            self.proposer = DAO.account.address
            self.allowAnyoneAddOptions = true
            self.isFoundersTopic = true
        }

        access(all) fun addStringOption(option: String) {
            pre {
                self.closed == false: "Topic is closed"
            }
            self.stringOptions.append(option)
        }

        access(all) fun addAddressOption(option: Address) {
            pre {
                self.closed == false: "Topic is closed"
            }
            // Check if address already exists, if so increment count
            if DAO.founderVoteCounts[option] != nil {
                DAO.founderVoteCounts[option] = DAO.founderVoteCounts[option]! + 1
            } else {
                DAO.founderVoteCounts[option] = 1
                self.addressOptions.append(option)
            }
        }

        access(all) view fun getOptionCount(): UInt64 {
            if self.isFoundersTopic {
                return UInt64(self.addressOptions.length)
            } else {
                return UInt64(self.stringOptions.length)
            }
        }

        access(all) fun vote(option: UInt64, voter: Address) {
            pre {
                self.closed == false: "Topic is closed"
                self.voters[voter] == nil: "Voter has already voted"
                (self.isFoundersTopic && option < UInt64(self.addressOptions.length)) || 
                (!self.isFoundersTopic && option < UInt64(self.stringOptions.length)): "Invalid option index"
            }
            
            if self.votes[option] == nil {
                self.votes[option] = []
            }
            self.votes[option]!.append(voter)
            self.voters[voter] = true
        }

        access(all)
        view fun getVotes(option: UInt64): UInt64 {
            if self.votes[option] == nil {
                return 0
            }
            return UInt64(self.votes[option]!.length)
        }

        access(all)
        view fun getAllVotes(): {UInt64: UInt64} {
            let result: {UInt64: UInt64} = {}
            let optionCount = self.getOptionCount()
            var i: UInt64 = 0
            while i < optionCount {
                result[i] = self.getVotes(option: i)
                i = i + 1
            }
            return result
        }

        access(contract)
        fun close() {
            self.closed = true
            emit Closed(topicId: DAO.currentTopicId)
        }

        access(contract)
        fun getTopAddresses(count: UInt64): [Address] {
            pre {
                self.isFoundersTopic: "This function is only for founders topic"
            }
            
            // Create arrays for addresses and vote counts
            var addresses: [Address] = []
            var voteCounts: [UInt64] = []
            var i: UInt64 = 0
            while i < UInt64(self.addressOptions.length) {
                let address = self.addressOptions[i]
                let voteCount = self.getVotes(option: i)
                addresses.append(address)
                voteCounts.append(voteCount)
                i = i + 1
            }
            
            // Sort by vote count (descending) - simple bubble sort
            var swapped = true
            while swapped {
                swapped = false
                var k: Int = 0
                while k < addresses.length - 1 {
                    if voteCounts[k] < voteCounts[k + 1] {
                        // Swap addresses
                        let tempAddr = addresses[k]
                        addresses[k] = addresses[k + 1]
                        addresses[k + 1] = tempAddr
                        // Swap vote counts
                        let tempCount = voteCounts[k]
                        voteCounts[k] = voteCounts[k + 1]
                        voteCounts[k + 1] = tempCount
                        swapped = true
                    }
                    k = k + 1
                }
            }
            
            // Return top N addresses
            var result: [Address] = []
            var j: UInt64 = 0
            while j < count && j < UInt64(addresses.length) {
                result.append(addresses[j])
                j = j + 1
            }
            
            return result
        }
    }

    // -----------------------------------------------------------------------
    /// Handler resource that implements the Scheduled Transaction interface
    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler {
        access(FlowTransactionScheduler.Execute) fun executeTransaction(id: UInt64, data: AnyStruct?) {
            // Get the topic to count votes for
            let topicId = data as? UInt64 ?? DAO.foundersTopicId
            
            let identifier = "\(DAO.account.address)/Topics/\(topicId)"
            let storagePath = StoragePath(identifier: identifier)!
            let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
                ?? panic("Unable to borrow reference to the topic")
            
            // Close the topic
            topic.close()
            
            // If this is the founders topic, distribute Founder resources
            if topic.isFoundersTopic {
                let topAddresses = topic.getTopAddresses(count: 5)
                
                // Distribute Founder resources to top 5 addresses
                var i: UInt64 = 0
                while i < UInt64(topAddresses.length) {
                    let recipientAddress = topAddresses[i]
                    
                    // Mint the Founder resource and send
                    // to the recipient
                    let founder <- create Founder(id: DAO.currentFounderId)
                    // get a ref to the recipient's Founder's arsenal
                    let account = getAccount(recipientAddress)
                    let arsenal = account.capabilities.borrow<&FounderArsenal>(/public/FounderArsenal)
                    // deposit the founder into the arsenal
                    arsenal!.depositFounder(founder: <-founder)
                    // increment the current founder id
                    DAO.currentFounderId = DAO.currentFounderId + 1
                    // increment the loop index
                    i = i + 1
                }
            }
            
            emit VoteCounted(topicId: topicId)
        }
    }

    // Public function to vote on founders topic
    access(all) fun voteFounder(voter: Address, options: [Address]) {
        pre {
            options.length > 0 && options.length <= 3: "Must provide 1-3 options"
            DAO.voters[voter] == nil: "You have already voted"
        }
        
        let identifier = "\(DAO.account.address)/Topics/\(self.foundersTopicId)"
        let storagePath = StoragePath(identifier: identifier)!
        let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
            ?? panic("Founders topic not found")
        
        // Add each address option and vote for it
        var i: UInt64 = 0
        while i < UInt64(options.length) {
            let address = options[i]
            // Check if address already exists in options
            var optionIndex: UInt64? = nil
            var j: UInt64 = 0
            while j < UInt64(topic.addressOptions.length) {
                if topic.addressOptions[j] == address {
                    optionIndex = j
                    break
                }
                j = j + 1
            }
            
            // If not found, add it
            if optionIndex == nil {
                topic.addAddressOption(option: address)
                optionIndex = UInt64(topic.addressOptions.length) - 1
            } else {
                // Increment vote count for existing address
                DAO.founderVoteCounts[address] = DAO.founderVoteCounts[address]! + 1
            }
            
            // Vote for this option
            topic.vote(option: optionIndex!, voter: voter)
            i = i + 1
        }
        
        DAO.voters[voter] = true
    }

    // Public function to vote on regular topic
    access(all) fun voteTopic(voter: Address, topicId: UInt64, option: UInt64) {
        let identifier = "\(DAO.account.address)/Topics/\(topicId)"
        let storagePath = StoragePath(identifier: identifier)!
        let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
            ?? panic("Topic not found")
        
        topic.vote(option: option, voter: voter)
    }

    // Public function to add option (if allowed)
    access(all) fun addOption(proposer: Address, topicId: UInt64, option: String) {
        pre {
            option.length > 0: "Option cannot be empty"
        }
        
        let identifier = "\(DAO.account.address)/Topics/\(topicId)"
        let storagePath = StoragePath(identifier: identifier)!
        let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
            ?? panic("Topic not found")
        
        topic.addStringOption(option: option)
        emit OptionAdded(topicId: topicId, optionIndex: topic.getOptionCount() - 1, option: option)
    }


    init() {
        self.currentTopicId = 0
        self.currentFounderId = 0
        self.foundersTopicId = 0
        self.founderVoteCounts = {}
        self.voters = {}
        
        // Create the Founders topic
        let identifier = "\(DAO.account.address)/Topics/\(self.foundersTopicId)"
        let storagePath = StoragePath(identifier: identifier)!
        let foundersTopic <- create Topic(title: "", description: "", proposer: DAO.account.address, allowAnyoneAddOptions: true)
        foundersTopic.initFoundersTopic()
        DAO.account.storage.save(<-foundersTopic, to: storagePath)
        
        // Schedule vote count for 7 days
        let delay: UFix64 = 7.0 * 24.0 * 60.0 * 60.0
        let future = getCurrentBlock().timestamp + delay
        let priority = FlowTransactionScheduler.Priority.Medium
        let executionEffort: UInt64 = 2000
        
        let estimate = FlowTransactionScheduler.estimate(
            data: self.foundersTopicId,
            timestamp: future,
            priority: priority,
            executionEffort: executionEffort
        )
        
        assert(
            estimate.timestamp != nil || priority == FlowTransactionScheduler.Priority.Low,
            message: estimate.error ?? "estimation failed"
        )
        
        // Withdraw FLOW fees from contract account vault
        let vaultRef = DAO.account.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Missing FlowToken vault in contract account")
        let fees <- vaultRef.withdraw(amount: estimate.flowFee ?? 0.0) as! @FlowToken.Vault
        
        // Create and save handler if not exists
        let handlerIdentifier = "\(DAO.account.address)/DAOHandler"
        let handlerStoragePath = StoragePath(identifier: handlerIdentifier)!
        if DAO.account.storage.borrow<&Handler>(from: handlerStoragePath) == nil {
            let handler <- create Handler()
            DAO.account.storage.save(<-handler, to: handlerStoragePath)
        }
        
        // Issue handler capability
        let handlerCap = DAO.account.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(handlerStoragePath)
        
        let receipt <- FlowTransactionScheduler.schedule(
            handlerCap: handlerCap,
            data: self.foundersTopicId,
            timestamp: future,
            priority: priority,
            executionEffort: executionEffort,
            fees: <-fees
        )
        
        // Store receipt
        let receiptIdentifier = "\(DAO.account.address)/Receipts/\(receipt.id)"
        let receiptStoragePath = StoragePath(identifier: receiptIdentifier)!
        DAO.account.storage.save(<-receipt, to: receiptStoragePath)
    }
}
