import "DAO" 
 
transaction(firstOption: Address, secondOption: Address, thirdOption: Address) {
 
    let arsenalRef: auth(DAO.ArsenalActions) &DAO.Arsenal
  

    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue, UnpublishCapability) &Account) {
//<&Capability<auth(Mneme.Editions) &Mneme.Edition>>


        if signer.storage.borrow<&DAO.Arsenal>(from: DAO.ArsenalStoragePath) != nil {
                self.arsenalRef = signer.storage.borrow<auth(DAO.ArsenalActions) &DAO.Arsenal>(from: DAO.ArsenalStoragePath)!
            } else {
            let arsenal <- DAO.createArsenal(parentAccount: signer)
            // save it to the account
            signer.storage.save(<-arsenal, to: DAO.ArsenalStoragePath)
            // the old "unlink"
            let oldLink = signer.capabilities.unpublish(DAO.ArsenalPublicPath)
            // create a public capability for the arsenal
            let collectionCap = signer.capabilities.storage.issue<&DAO.Arsenal>(DAO.ArsenalStoragePath)
            signer.capabilities.publish(collectionCap, at: DAO.ArsenalPublicPath)
        }
            // get the arsenal reference
            let arsenalRef = signer.storage.borrow<auth(DAO.ArsenalActions) &DAO.Arsenal>(from: DAO.ArsenalStoragePath)!
            self.arsenalRef = arsenalRef
    }

    execute {
        let options = [firstOption, secondOption, thirdOption]
        self.arsenalRef.voteFounder(options: options)
        
    }
}

 
 
