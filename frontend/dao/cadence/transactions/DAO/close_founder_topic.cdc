import "DAO"

transaction {
    prepare(signer: &Account) {
        DAO.closeFounderTopic()
    }
    execute {
    }
}
