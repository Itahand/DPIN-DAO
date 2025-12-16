import "DAO"
 
transaction(firstOption: Address, secondOption: Address, thirdOption: Address) {

    let arsenalRef: auth(DAO.ArsenalActions) &DAO.Arsenal


    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue, UnpublishCapability) &Account) {
//<&Capability<auth(Mneme.Editions) &Mneme.Edition>>

        if signer.storage.borrow<&DAO.Arsenal>(from: /storage/DPIN_DAO_Arsenal) != nil {
            self.arsenalRef = signer.storage.borrow<auth(DAO.ArsenalActions) &DAO.Arsenal>(from: /storage/DPIN_DAO_Arsenal)!
        } else {
            let arsenal <- DAO.createArsenal(parentAccount: signer)
            // save it to the account
            signer.storage.save(<-arsenal, to: /storage/DPIN_DAO_Arsenal)
            // the old "unlink"
            let oldLink = signer.capabilities.unpublish(/public/DPIN_DAO_Arsenal)
            // create a public capability for the arsenal
            let collectionCap = signer.capabilities.storage.issue<&DAO.Arsenal>(/storage/DPIN_DAO_Arsenal)
            signer.capabilities.publish(collectionCap, at: /public/DPIN_DAO_Arsenal)
        }
            // get the arsenal reference
            let arsenalRef = signer.storage.borrow<auth(DAO.ArsenalActions) &DAO.Arsenal>(from: /storage/DPIN_DAO_Arsenal)!
            self.arsenalRef = arsenalRef
    }

    execute {
        let options = [firstOption, secondOption, thirdOption]
        self.arsenalRef.voteFounder(options: options)
        
    }
}

 
 
