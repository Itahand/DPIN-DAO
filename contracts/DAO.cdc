// MADE BY: NoahOverflow

import "FlowTransactionScheduler" 
import "FungibleToken"
import "FlowToken"
import "HybridCustody"
import "Pinnacle"

access(all)
contract DAO {
    access(self) var currentTopicId: UInt64
    access(self) var currentFounderId: UInt64
    access(self) var foundersTopicId: UInt64
    access(self) var founderVoteCounts: {Address: UInt64}
    access(self) var voters: {Address: Bool}
    access(self) var founders: {UInt64: Address}
    access(self) var unclaimedFounders: @{Address: Founder} 
    // Events
    access(all) event Closed(topicId: UInt64)
    access(all) event TopicProposed(topicId: UInt64, proposer: Address, title: String, allowAnyoneAddOptions: Bool)
    access(all) event TopicScheduled(topicId: UInt64, handlerPath: String)
    access(all) event FounderVoted(voter: Address, options: [Address])
    access(all) event TopicVoted(voter: Address, topicId: UInt64, option: UInt64)
    access(all) event OptionAdded(topicId: UInt64, optionIndex: UInt64, option: String)
    access(all) event FounderClaimed(recipient: Address)
    access(all) event VoteCounted(topicId: UInt64)
    access(all) event FounderDeposited(recipient: Address, founderId: UInt64, path: String)
    // Entitlements
    access(all)entitlement FounderActions
    access(all)entitlement ArsenalActions
    // Storage paths
    access(all) let ArsenalStoragePath: StoragePath
    access(all) let ArsenalPublicPath: PublicPath

    // Founder resource with privileges
    access(all) resource Founder {
        access(all) let id: UInt64
        init() {
            self.id = DAO.currentFounderId
            DAO.currentFounderId = DAO.currentFounderId + 1
        }

        access(FounderActions) fun proposeTopic(title: String, description: String, initialOptions: [String], allowAnyoneAddOptions: Bool) {
            pre {
                title.length > 0: "Title cannot be empty"
                initialOptions.length > 1: "Must have at least two options"
            }
            
            DAO.currentTopicId = DAO.currentTopicId + 1
            let topicId = DAO.currentTopicId
            
            let identifier = "\(DAO.account.address)/DAO_Topics/\(topicId)"
            let storagePath = StoragePath(identifier: identifier)!
            let proposer = DAO.founders[self.id]!
            
            let topic <- create Topic(
                title: title,
                description: description,
                proposer: proposer,
                allowAnyoneAddOptions: allowAnyoneAddOptions
            )
            
            // Add initial options
            var index: UInt64 = 0
            while index < UInt64(initialOptions.length) {
                topic.addStringOption(option: initialOptions[index])
                index = index + 1
            }
            
            DAO.account.storage.save(<-topic, to: storagePath)

            // Schedule vote count for 7 days from this block
            let delay: UFix64 = 7.0 * 24.0 * 60.0 * 60.0
            let future = getCurrentBlock().timestamp + delay
            let priority = FlowTransactionScheduler.Priority.Medium
            let executionEffort: UInt64 = 1000

            // Withdraw FLOW fees from contract account vault
            let vaultRef = DAO.account.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
                ?? panic("Missing FlowToken vault in contract account")
            let fees <- vaultRef.withdraw(amount: 0.0) as! @FlowToken.Vault
            let handlerStoragePath = StoragePath(identifier: "\(DAO.account.address)/DAO_Handler")!
                    let handlerCap = DAO.account.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(storagePath)
            let receipt <- FlowTransactionScheduler.schedule(
            handlerCap: handlerCap,
            data: "",
            timestamp: future,
            priority: priority,
            executionEffort: executionEffort,
            fees: <-fees
        )

        // Store receipt
        let receiptIdentifier = "\(DAO.account.address)/DAO_Receipts/\(receipt.id)"
        let receiptStoragePath = StoragePath(identifier: receiptIdentifier)!
        DAO.account.storage.save(<-receipt, to: receiptStoragePath)
            
        emit TopicProposed(topicId: topicId, proposer: proposer, title: title, allowAnyoneAddOptions: allowAnyoneAddOptions)
        emit TopicScheduled(topicId: topicId, handlerPath: handlerStoragePath.toString())
            
        }

        access(FounderActions) fun addOption(topicId: UInt64, option: String) {
            pre {
                option.length > 0: "Option cannot be empty"
            }
            
            let identifier = "\(DAO.account.address)/DAO_Topics/\(topicId)"
            let storagePath = StoragePath(identifier: identifier)!
            let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
                ?? panic("Topic not found")
            
            topic.addStringOption(option: option)
            
            emit OptionAdded(topicId: topicId, optionIndex: topic.getOptionCount() - 1, option: option)
        }
    }

    access(all) resource Arsenal {
        access(all) let pinnacleAccount: Address
        access(all) var founder: @{UInt64: Founder}
        
        init(pinnacleAccount: Address) {
            self.founder <- {}
            self.pinnacleAccount = pinnacleAccount
        }
        
        access(contract) fun depositFounder(founder: @Founder) {
            self.founder[founder.id] <-! founder
        }
        // function to propose a topic
        access(FounderActions) fun proposeTopic(title: String, description: String, initialOptions: [String], allowAnyoneAddOptions: Bool) {
            pre {
                self.founder.length > 0: "You are NOT a Founder of the DPIN DAO"
            }
            let founderKey = self.founder.keys[0]
            let founder <- self.founder.remove(key: founderKey)!
            founder.proposeTopic(title: title, description: description, initialOptions: initialOptions, allowAnyoneAddOptions: allowAnyoneAddOptions)
            self.founder[founderKey] <-! founder

        }
        // function to vote on a topic
        access(ArsenalActions) fun voteTopic(topicId: UInt64, option: UInt64) {
            let identifier = "\(DAO.account.address)/DAO_Topics/\(topicId)"
            let storagePath = StoragePath(identifier: identifier)!
            let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
                ?? panic("Topic not found")
            
            topic.vote(option: option, voter: self.owner!.address)
        }

        // function to add option (if allowed)
        access(ArsenalActions) fun addOption (topicId: UInt64, option: String) {
            pre {
                option.length > 0: "Option cannot be empty"
            }
            
            let identifier = "\(DAO.account.address)/DAO_Topics/\(topicId)"
            let storagePath = StoragePath(identifier: identifier)!
            let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
                ?? panic("Topic not found")
            
            topic.addStringOption(option: option)
            emit OptionAdded(topicId: topicId, optionIndex: topic.getOptionCount() - 1, option: option)
        }  

        access(ArsenalActions) fun voteFounder(options: [Address])  {
            pre {
                options.length > 0 && options.length <= 3: "Must provide 1-3 options"
                DAO.voters[self.owner!.address] == nil: "You have already voted"
            }
            let identifier = "\(DAO.account.address)/DAO_Topics/0"
            let storagePath = StoragePath(identifier: identifier)!
            let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
                ?? panic("Founders topic not found")
            topic.voteFounder(options: options, voter: self.owner!.address)

            emit FounderVoted(voter: self.owner!.address, options: options)
        }
    }

    access(all)
    resource Topic {
        access(all) var id: UInt64
        access(all) var title: String
        access(all) var description: String
        access(all) var proposer: Address
        access(all) var allowAnyoneAddOptions: Bool
        access(all) var isFoundersTopic: Bool
        
        access(all) var stringOptions: [String]
        access(all) var addressOptions: [Address]
        access(all) var votes: {UInt64: [Address]}
        access(all) var closed: Bool
        access(all) var voters: {Address: Bool}

        init(title: String, description: String, proposer: Address, allowAnyoneAddOptions: Bool) {
            self.id = DAO.currentTopicId
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

            DAO.currentTopicId = DAO.currentTopicId + 1

            // Create and save handler 
            let handlerIdentifier = "\(DAO.account.address)/DAO_Handler/\(self.id)"
            let handlerStoragePath = StoragePath(identifier: handlerIdentifier)!
            let handler <- create Handler(topicId: self.id)
            DAO.account.storage.save(<-handler, to: handlerStoragePath)
            // Issue handler capability to the handler
            let handlerCap = DAO.account.capabilities.storage
                .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(handlerStoragePath)

            // Schedule vote count for 7 days from this block
            let delay: UFix64 = 7.0 * 24.0 * 60.0 * 60.0
            let future = getCurrentBlock().timestamp + delay
            let priority = FlowTransactionScheduler.Priority.Medium
            let executionEffort: UInt64 = 1000
            // Estimate the cost
            let estimate = FlowTransactionScheduler.estimate(
            data: "",
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
            let receipt <- FlowTransactionScheduler.schedule(
            handlerCap: handlerCap,
            data: "",
            timestamp: future,
            priority: priority,
            executionEffort: executionEffort,
            fees: <-fees
            )
        
            // Store receipt
            let receiptIdentifier = "\(DAO.account.address)/DAO_Receipts/\(receipt.id)"
            let receiptStoragePath = StoragePath(identifier: receiptIdentifier)!
            DAO.account.storage.save(<-receipt, to: receiptStoragePath)

            emit TopicScheduled(topicId: self.id, handlerPath: handlerStoragePath.toString())

        }

        access(contract) fun initFoundersTopic() {
            self.title = "Founders"
            self.description = "Vote for the top 5 founders of the DPIN DAO"
            self.proposer = DAO.account.address
            self.allowAnyoneAddOptions = true
            self.isFoundersTopic = true
        }

        access(all) fun addStringOption(option: String) {
            pre {
                self.closed == false: "Topic is closed"
            }
            self.stringOptions.append(option)
            emit OptionAdded(topicId: DAO.currentTopicId, optionIndex: UInt64(self.stringOptions.length - 1), option: option)
        }

        access(all) fun addAddressOption(option: Address) {
            pre {
                self.closed == false: "Topic is closed"
            }
            // Only add the address to the options list if it doesn't exist
            // Vote counting is handled in voteFounder, not here
            if !self.addressOptions.contains(option) {
                self.addressOptions.append(option)
            }
            emit OptionAdded(topicId: DAO.currentTopicId, optionIndex: UInt64(self.addressOptions.length - 1), option: option.toString())
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

        access(all) fun voteFounder(options: [Address], voter: Address) {
            pre {
                self.isFoundersTopic: "This function is only for founders topic"
                options.length > 0 && options.length <= 3: "Must provide 1-3 options"
                DAO.voters[voter] == nil: "You have already voted"
            }
            
            // add each address option and vote for it
            var i: UInt64 = 0
            while i < UInt64(options.length) {
                let address = options[i]
                
                // Find the index of this address in addressOptions
                var optionIndex: UInt64? = nil
                var j: UInt64 = 0
                while j < UInt64(self.addressOptions.length) {
                    if self.addressOptions[j] == address {
                        optionIndex = j
                        break
                    }
                    j = j + 1
                }
                
                // If address not found in options, add it first
                if optionIndex == nil {
                    self.addAddressOption(option: address)
                    optionIndex = UInt64(self.addressOptions.length) - 1
                }
                
                // Initialize votes array for this option if needed
                if self.votes[optionIndex!] == nil {
                    self.votes[optionIndex!] = []
                }
                
                // Vote for the address using its actual index in addressOptions
                self.votes[optionIndex!]!.append(voter)
                
                // Update founderVoteCounts for this address
                if DAO.founderVoteCounts[address] != nil {
                    DAO.founderVoteCounts[address] = DAO.founderVoteCounts[address]! + 1
                } else {
                    DAO.founderVoteCounts[address] = 1
                }
                
                // increment the loop index
                i = i + 1
            }
            
            // Mark voter as having voted (both contract-level and topic-level)
            DAO.voters[voter] = true
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
        // return a list of addresses only
        access(all)
        view fun getAllAddresses(): [Address] {
            return self.addressOptions
        }

        // return TopicInfo struct with all topic data
        access(all)
        fun getTopicInfo(): TopicInfo {
            return TopicInfo(
                title: self.title,
                description: self.description,
                proposer: self.proposer,
                allowAnyoneAddOptions: self.allowAnyoneAddOptions,
                isFoundersTopic: self.isFoundersTopic,
                stringOptions: self.stringOptions,
                addressOptions: self.addressOptions,
                votes: self.votes,
                closed: self.closed,
                voters: self.voters
            )
        }
    }
    // -----------------------------------------------------------------------
    // "##  ##      ##      ##  ##    ##  ##    ##      ##      ####  "
    // "##  ##     ####     ## ##     ##  ##    ##      ##      ##  ##"
    // "##  ##    ##  ##    ####      ##  ##    ##      ##      ##  ##"
    // "######    ######    ## ##     ##  ##    ##      ##      ####  "
    // "##  ##    ##  ##    ##  ##    ##  ##    ##      ##      ## ## "
    // "##  ##    ##  ##    ##  ##    ######    ######  ######  ##  ##"
    // "##  ##    ##  ##    ##  ##    ##  ##    ##      ##      ##  ##"
    // -----------------------------------------------------------------------
    /// Handler resource that implements the Scheduled Transaction interface
    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler {

        access(all) let topicId: UInt64

        init(topicId: UInt64) {
            self.topicId = topicId
        }
        // This is the function executed by the Flow Protocol
        access(FlowTransactionScheduler.Execute) fun executeTransaction(id: UInt64, data: AnyStruct?) {
            let identifier = "\(DAO.account.address)/DAO_Topics/\(self.topicId)"
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
                    
                    // add the recipient address to the founders list
                    DAO.founders[DAO.currentFounderId] = recipientAddress
                    // Mint the Founder resource and send to the recipient
                    let founder <- create Founder()
                    // get a ref to the recipient's Founder's arsenal
                    let account = getAccount(recipientAddress)
                    let arsenal = account.capabilities.borrow<&Arsenal>(DAO.ArsenalPublicPath)
                    // if the arsenal is nil,
                    // save founder resource inside the contract
                    // deposit the founder into the arsenal
                    if arsenal == nil {
                        DAO.unclaimedFounders[recipientAddress] <-! founder
                    } else {
                        arsenal!.depositFounder(founder: <-founder)
                        emit FounderDeposited(recipient: recipientAddress, founderId: DAO.currentFounderId, path: DAO.ArsenalPublicPath.toString())
                    }
                    // increment the loop index
                    i = i + 1
                }
        
        emit Closed(topicId: 0)
            }
            
            emit VoteCounted(topicId: self.topicId)

            // Determine delay for the next transaction (default 3 seconds if none provided)
            var delay: UFix64 = 10.0 // 10 seconds
            if data != nil {
                let t = data!.getType()
                if t.isSubtype(of: Type<UFix64>()) {
                    delay = data as! UFix64
                }
            }

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
            let vaultRef = DAO.account.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
                ?? panic("Missing FlowToken vault in contract account")
            let feesVault <- vaultRef.withdraw(amount: estimate.flowFee ?? 0.0) as! @FlowToken.Vault   
            let handlerStoragePath = StoragePath(identifier: "\(DAO.account.address)/DAO_Handler")!

            // Issue a capability to the handler stored in this contract account
            let handlerCap = DAO.account.capabilities.storage
                .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(handlerStoragePath)

            let receipt: @FlowTransactionScheduler.ScheduledTransaction <- FlowTransactionScheduler.schedule(
                handlerCap: handlerCap,
                data: data,
                timestamp: future,
                priority: priority,
                executionEffort: executionEffort,
                fees: <-feesVault
            )

            log("Loop transaction id: ".concat(receipt.id.toString()).concat(" at ").concat(receipt.timestamp.toString()))
            // Save the receipt to the contract account storage
            let receiptIdentifier = "\(DAO.account.address)/DAO_Receipts/\(receipt.id)"
            let receiptStoragePath = StoragePath(identifier: receiptIdentifier)!
            DAO.account.storage.save(<-receipt, to: receiptStoragePath)
        }
    }
    // Topic Struct to store topic information
    access(all) struct TopicInfo {
        access(all) var title: String
        access(all) var description: String
        access(all) var proposer: Address
        access(all) var allowAnyoneAddOptions: Bool
        access(all) var isFoundersTopic: Bool
        access(all) var stringOptions: [String]
        access(all) var addressOptions: [Address]
        access(all) var votes: {UInt64: [Address]}
        access(all) var closed: Bool
        access(all) var voters: {Address: Bool}
        init(title: String, description: String, proposer: Address, allowAnyoneAddOptions: Bool, isFoundersTopic: Bool, stringOptions: [String], addressOptions: [Address], votes: {UInt64: [Address]}, closed: Bool, voters: {Address: Bool}) {
            self.title = title
            self.description = description
            self.proposer = proposer
            self.allowAnyoneAddOptions = allowAnyoneAddOptions
            self.isFoundersTopic = isFoundersTopic
            self.stringOptions = stringOptions
            self.addressOptions = addressOptions
            self.votes = votes
            self.closed = closed
            self.voters = voters
        }
    }

    // Public function to vote get all votes
    // on FOUNDER TOPICs
    access(all) view fun getFounderVotes(): {Address: UInt64} {
        return DAO.founderVoteCounts
    }
    // Public function to get all founders
    access(all) view fun getAllFounders(): {UInt64: Address} {
        return DAO.founders
    }
    // Public function to get all unclaimed founders
    access(all) view fun getUnclaimedFounders():[Address] {
        return DAO.unclaimedFounders.keys
    }
    // Public function to get the latest topics
    access(all) fun getLatestTopics(): [TopicInfo] {
        // loop through to the latest topics based on the amount of Founder
        // if 5 founders, then get the latest 5 topics
        // then get the topic info for each topic
        // and return the topic info
        var topicInfos: [TopicInfo] = []
        
        // Get the number of founders to determine how many topics to retrieve
        let founderCount = UInt64(DAO.founders.length)
        let topicCount = founderCount
        
        // Calculate the starting topic ID (ensure we don't go below 0)
        // If we want the latest N topics and currentTopicId = M, we want topics from max(0, M-N+1) to M
        var startTopicId: UInt64 = 0
        if DAO.currentTopicId >= topicCount {
            startTopicId = DAO.currentTopicId - topicCount + 1
        }
        
        // Loop through topics from startTopicId to currentTopicId (inclusive)
        var i: UInt64 = startTopicId
        while i <= DAO.currentTopicId {
            let identifier = "\(DAO.account.address)/DAO_Topics/\(i)"
            let storagePath = StoragePath(identifier: identifier)!
            if let topic = DAO.account.storage.borrow<&Topic>(from: storagePath) {
                topicInfos.append(topic.getTopicInfo())
            }
            i = i + 1
        }
        
        return topicInfos
    }

    // Public function to close a FounderTopic and distribute Founder resources
    // The founders topic ID is always 0
     access(all) fun closeFounderTopic() {
        let identifier = "\(DAO.account.address)/DAO_Topics/\(0)"
        let storagePath = StoragePath(identifier: identifier)!
        let topic = DAO.account.storage.borrow<&Topic>(from: storagePath)
            ?? panic("Founders topic not found")
        
        assert(topic.isFoundersTopic, message: "This function can only close FounderTopics")
        assert(topic.closed == false, message: "Topic is already closed")
        
        // Close the topic
        topic.close()
        
        // Distribute Founder resources to top 5 addresses
        let topAddresses = topic.getTopAddresses(count: 5)
        
        var i: UInt64 = 0
        while i < UInt64(topAddresses.length) {
            let recipientAddress = topAddresses[i]
            
            // add the recipient address to the founders list
            DAO.founders[DAO.currentFounderId] = recipientAddress
            // Mint the Founder resource and send to the recipient
            let founder <- create Founder()
            // get a ref to the recipient's Founder's arsenal
            let account = getAccount(recipientAddress)
            let arsenal = account.capabilities.borrow<&Arsenal>(DAO.ArsenalPublicPath)
            // if the arsenal is nil,
            // save founder resource inside the contract
            // deposit the founder into the arsenal
            if arsenal == nil {
                DAO.unclaimedFounders[recipientAddress] <-! founder
            } else {
                arsenal!.depositFounder(founder: <-founder)
                emit FounderDeposited(recipient: recipientAddress, founderId: DAO.currentFounderId, path: DAO.ArsenalPublicPath.toString())
            }
            // increment the loop index
            i = i + 1
        }
        
        emit Closed(topicId: 0)
    } 

    // Public function to create an Arsenal
    access(all) fun createArsenal(parentAccount: &Account): @Arsenal? {
/*         let newArsenal <- create Arsenal(pinnacleAccount: parentAccount.address)
        return <- newArsenal */
        // We need to verify that the parent account is a manager
        // of a Pinnacle Collection owner child account
     let manager = parentAccount.capabilities.borrow<&HybridCustody.Manager>(HybridCustody.ManagerPublicPath)
        ?? panic("manager not found")
        // Get children of the parent account
        var children = manager.getChildAddresses()

        if children.length > 0 {
            var childAddress: Address? = nil
            // loop through each child and look for
            // /public/PinnacleCollection
            var i: UInt64 = 0
            while i < UInt64(children.length) {
                let child = children[i]
                let childAcct = getAccount(child)
                let childManager = childAcct.capabilities.borrow<&Pinnacle.Collection>(Pinnacle.CollectionPublicPath)
                if childManager != nil {
                    let ids = childManager!.getIDs()
                    if ids.length > 9 {
                        let newArsenal <- create Arsenal(pinnacleAccount: child)
                        return <- newArsenal
                    }
                }
                i = i + 1
            }
            panic("No Pinnacle Collection owner child account found with more than 9 NFTs")
        } 
            return nil
    }

    init() {
        self.currentTopicId = 0
        self.currentFounderId = 0
        self.foundersTopicId = 0
        self.founderVoteCounts = {}
        self.unclaimedFounders <- {}
        self.voters = {}
        self.founders = {}
        self.ArsenalStoragePath = StoragePath(identifier: "\(DAO.account.address)/DAO_Arsenal")!
        self.ArsenalPublicPath = PublicPath(identifier: "\(DAO.account.address)/DAO_Arsenal")!
        // Create the Founders topic
        let identifier = "\(DAO.account.address)/DAO_Topics/\(self.currentTopicId)"
        let storagePath = StoragePath(identifier: identifier)!
        let foundersTopic <- create Topic(title: "", description: "", proposer: DAO.account.address, allowAnyoneAddOptions: true)
        foundersTopic.initFoundersTopic()
        DAO.account.storage.save(<-foundersTopic, to: storagePath)

    }
}
