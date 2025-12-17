import "FlowTransactionScheduler"
import "FlowToken"
import "FungibleToken"

/// Schedule an increment of the Counter with a relative delay in seconds
transaction(
    delaySeconds: UFix64,
    priority: UInt8,
    executionEffort: UInt64,
    transactionData: AnyStruct?
) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let future = getCurrentBlock().timestamp + delaySeconds

        let pr = priority == 0
            ? FlowTransactionScheduler.Priority.High
            : priority == 1
                ? FlowTransactionScheduler.Priority.Medium
                : FlowTransactionScheduler.Priority.Low

        let est = FlowTransactionScheduler.estimate(
            data: transactionData,
            timestamp: future,
            priority: pr,
            executionEffort: executionEffort
        )

        assert(
            est.timestamp != nil || pr == FlowTransactionScheduler.Priority.Low,
            message: est.error ?? "estimation failed"
        )

        let vaultRef = signer.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("missing FlowToken vault")
        let fees <- vaultRef.withdraw(amount: est.flowFee ?? 0.0) as! @FlowToken.Vault
        let storagePath = StoragePath(identifier: "\(signer.address)/DAO_Handler")!
        let handlerCap = signer.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(storagePath)

        let receipt <- FlowTransactionScheduler.schedule(
            handlerCap: handlerCap,
            data: transactionData,
            timestamp: future,
            priority: pr,
            executionEffort: executionEffort,
            fees: <-fees
        )

        // Store receipt
        let receiptIdentifier = "\(signer.address)/DAO_Receipts/\(receipt.id)"
        let receiptStoragePath = StoragePath(identifier: receiptIdentifier)!
        signer.storage.save(<-receipt, to: receiptStoragePath)
    }
}
