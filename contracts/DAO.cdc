// MADE BY: NoahOverflow

access(all)
contract DAO {

    access(all) entitlement vote

    access(all)
    resource Topic {

        access(all) let votes: {UInt64: [Address]}
        access(all) var closed: Bool

        init(editionID: UInt64) {

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
        }
    }
}