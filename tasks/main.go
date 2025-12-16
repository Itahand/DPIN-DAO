package main

import (
	"fmt"

	//if you imports this with .  you do not have to repeat overflow everywhere
	. "github.com/bjartek/overflow/v2"
	"github.com/fatih/color"
)

// ReadFile reads a text file and returns an array of paragraphs

func main() {
	o := Overflow(
		WithGlobalPrintOptions(),
		// WithNetwork("testnet"),
	)

	fmt.Println("Testing Contract")

	color.Blue("Mneme Contract testing")

	color.Green("Setup bob account for ArtDrop collection")
	// Vote on the founders topic
	o.Tx("DAO/founder_vote",
		WithSigner("account"),
		WithArg("firstOption", "bob"),
		WithArg("secondOption", "alice"),
		WithArg("thirdOption", "account"),
	).Print()
	// Fetch the votes for the founders topic
	o.Script("get_founder_votes").Print()
	// Bob votes
	o.Tx("DAO/founder_vote",
		WithSigner("bob"),
		WithArg("firstOption", "account"),
		WithArg("secondOption", "alice"),
		WithArg("thirdOption", "tito"),
	).Print()
	o.Script("get_founder_votes").Print()

}
