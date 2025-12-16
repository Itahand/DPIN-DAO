import "DAO"
// Function for a Founder to create a topic
transaction(title: String, description: String, initialOptions: [String], allowAnyoneAddOptions: Bool) {
    let founderRef: auth(DAO.FounderActions) &DAO.Arsenal
    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue, UnpublishCapability) &Account) {


        // get the founder reference
        let founderRef = signer.storage.borrow<auth(DAO.FounderActions) &DAO.Arsenal>(from: DAO.ArsenalStoragePath)!
        self.founderRef = founderRef
    }
    execute {
        let newTopicId =self.founderRef.proposeTopic(
            title: title,
            description: description,
            initialOptions: initialOptions,
            allowAnyoneAddOptions: allowAnyoneAddOptions
            )
         
    }
} 